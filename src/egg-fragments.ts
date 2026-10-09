import * as THREE from 'three'

export interface ShellFragment {
  mesh: THREE.Mesh; origin: THREE.Vector3; velocity: THREE.Vector3; spin: THREE.Vector3
  restRotation: THREE.Quaternion; contactAge: number; settled: boolean; bounces: number
  horizontalRange?: { min: number; max: number }
}

// Partition the real shell triangles into adjoining irregular patches.
export function createEggFragments(geometry: THREE.BufferGeometry, material: THREE.Material, impact: THREE.Vector3): ShellFragment[] {
  const source = geometry.index ? geometry.toNonIndexed() : geometry.clone()
  const vertices = source.getAttribute('position')
  const normals = source.getAttribute('normal')
  const seeds = Array.from({ length: 12 }, (_, i) => {
    const y = 1 - (i + 0.5) / 6, a = i * 2.39996
    return new THREE.Vector3(Math.cos(a) * Math.sqrt(1 - y * y), y, Math.sin(a) * Math.sqrt(1 - y * y))
  })
  seeds[0].copy(impact).multiply(new THREE.Vector3(1 / 0.273, 1 / 0.42, 1 / 0.273)).normalize()
  const patches: number[][] = seeds.map(() => [])
  for (let i = 0; i < vertices.count; i += 3) {
    const center = new THREE.Vector3()
    for (let j = 0; j < 3; j++) center.add(new THREE.Vector3().fromBufferAttribute(vertices, i + j))
    center.multiply(new THREE.Vector3(1 / 0.273, 1 / 0.42, 1 / 0.273)).normalize()
    let best = 0
    seeds.forEach((seed, n) => { if (center.dot(seed) > center.dot(seeds[best])) best = n })
    patches[best].push(i)
  }
  const fragments = patches.filter(p => p.length).map(patch => {
    const positions: number[] = [], smoothNormals: number[] = []
    const edges = new Map<string, {a: THREE.Vector3; b: THREE.Vector3; count: number}>()
    const key = (v: THREE.Vector3) => `${v.x.toFixed(5)},${v.y.toFixed(5)},${v.z.toFixed(5)}`
    const add = (p: THREE.Vector3, n: THREE.Vector3) => { positions.push(p.x, p.y, p.z); smoothNormals.push(n.x, n.y, n.z) }
    for (const i of patch) {
      const p = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(vertices, i + j))
      const n = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(normals, i + j))
      for (const j of [0, 1, 2]) add(p[j], n[j])
      for (const j of [2, 1, 0]) add(p[j].clone().multiplyScalar(0.975), n[j].clone().negate())
      for (let j = 0; j < 3; j++) {
        const a = p[j], b = p[(j + 1) % 3], id = [key(a), key(b)].sort().join('|')
        const edge = edges.get(id)
        if (edge) edge.count++
        else edges.set(id, {a, b, count: 1})
      }
    }
    for (const {a, b, count} of edges.values()) if (count === 1) {
      const c = b.clone().multiplyScalar(0.975), d = a.clone().multiplyScalar(0.975)
      const n = b.clone().sub(a).cross(d.clone().sub(a)).normalize()
      for (const p of [a, b, c, a, c, d]) add(p, n)
    }
    const shape = new THREE.BufferGeometry()
    shape.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    shape.setAttribute('normal', new THREE.Float32BufferAttribute(smoothNormals, 3))
    shape.computeBoundingBox()
    const origin = shape.boundingBox!.getCenter(new THREE.Vector3())
    shape.translate(-origin.x, -origin.y, -origin.z)
    const mesh = new THREE.Mesh(shape, material)
    mesh.position.copy(origin)
    return { mesh, origin, velocity: new THREE.Vector3(), spin: new THREE.Vector3(), restRotation: new THREE.Quaternion(), contactAge: 0, settled: false, bounces: 0 }
  })
  source.dispose()
  return fragments
}

const point = new THREE.Vector3()
export function fragmentBottom(fragment: ShellFragment) {
  let bottom = Infinity
  const positions = fragment.mesh.geometry.getAttribute('position')
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i).applyQuaternion(fragment.mesh.quaternion)
    bottom = Math.min(bottom, point.y)
  }
  return bottom
}

export function beginFragmentFall(fragments: ShellFragment[], rotation: THREE.Quaternion) {
  let floor = Infinity
  fragments.forEach((fragment, i) => {
    fragment.mesh.position.copy(fragment.origin).applyQuaternion(rotation)
    fragment.mesh.quaternion.copy(rotation)
    floor = Math.min(floor, fragment.mesh.position.y + fragmentBottom(fragment))
    const angle = i * 2.39996
    fragment.velocity.set(Math.cos(angle) * 0.22, 0.06 + i % 3 * 0.035, Math.sin(angle) * 0.12)
    fragment.spin.set(Math.sin(i * 2) * 1.8, Math.cos(i * 3) * 1.2, Math.cos(i) * 1.5)
    // Alternating concave-up and convex-up poses create a varied resting pile.
    const outward = fragment.origin.clone().normalize()
    fragment.restRotation.setFromUnitVectors(outward, new THREE.Vector3(0, i % 3 === 0 ? -1 : 1, 0))
    fragment.restRotation.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle))
  })
  return floor - 0.065
}

export function updateFragmentFall(fragments: ShellFragment[], floor: number, dt: number) {
  let remaining = Math.min(dt, 0.25)
  while (remaining > 1e-8) {
    const step = Math.min(remaining, 1 / 120)
    remaining -= step
    for (const fragment of fragments) {
      if (fragment.settled) continue
      const mesh = fragment.mesh
      fragment.velocity.y -= 1.8 * step
      mesh.position.addScaledVector(fragment.velocity, step)
      if (fragment.horizontalRange) {
        mesh.position.x = THREE.MathUtils.clamp(mesh.position.x, fragment.horizontalRange.min, fragment.horizontalRange.max)
      }
      if (fragment.bounces === 0) {
        const speed = fragment.spin.length()
        if (speed > 0) mesh.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(fragment.spin.clone().normalize(), speed * step))
      } else {
        fragment.contactAge += step
        mesh.quaternion.slerp(fragment.restRotation, 1 - Math.exp(-8 * step))
        fragment.velocity.x *= Math.exp(-6 * step)
        fragment.velocity.z *= Math.exp(-6 * step)
      }
      const bottom = fragmentBottom(fragment)
      if (mesh.position.y + bottom <= floor) {
        mesh.position.y = floor - bottom
        fragment.velocity.y = fragment.bounces === 0 ? Math.abs(fragment.velocity.y) * 0.17 : 0
        fragment.bounces++
      }
      if (fragment.contactAge > 1.1) {
        mesh.quaternion.copy(fragment.restRotation)
        mesh.position.y = floor - fragmentBottom(fragment)
        fragment.velocity.set(0, 0, 0)
        fragment.settled = true
      }
    }
  }
}
