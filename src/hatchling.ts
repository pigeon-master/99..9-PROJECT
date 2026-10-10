import * as THREE from 'three'
import { createRoyalCrown } from './royal-crown.ts'
import { dressBaby } from './baby.ts'

// A bare squab: oversized head, thin crooked neck, undeveloped wings and
// sparse wisps of natal down. No adult plumage or clothing.
export function createRoyalHatchling() {
  return createBareHatchling(true)
}

export function createBareHatchling(royal: boolean) {
  const root = new THREE.Group()
  root.name = 'royal-hatchling'
  const torso = new THREE.Group()
  torso.name = 'hatchling-torso'
  torso.position.y = 0.17
  root.add(torso)
  let parent: THREE.Group = torso
  const skin = new THREE.MeshStandardMaterial({ color: '#d89687', roughness: 0.82 })
  const pink = new THREE.MeshStandardMaterial({ color: '#bc716c', roughness: 0.9 })
  const beak = new THREE.MeshStandardMaterial({ color: '#bba08c', roughness: 0.7 })
  const eye = new THREE.MeshStandardMaterial({ color: '#242026', roughness: 0.24 })
  const down = new THREE.MeshStandardMaterial({ color: '#d8c69a', roughness: 1 })
  const sphere = new THREE.SphereGeometry(1, 16, 12)
  function oval(mat: THREE.Material, p: number[], s: number[]) {
    const mesh = new THREE.Mesh(sphere, mat)
    mesh.position.set(...p as [number, number, number]); mesh.scale.set(...s as [number, number, number])
    parent.add(mesh); return mesh
  }
  function strand(mat: THREE.Material, points: number[][], radius: number) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)))
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, radius, 5, false), mat)
    parent.add(mesh); return mesh
  }
  oval(skin, [0, 0.24, 0], [0.12, 0.18, 0.17]).rotation.x = -0.24
  oval(pink, [0, 0.28, 0.15], [0.023, 0.115, 0.023]) // visible keel
  strand(skin, [[0, 0.34, 0.03], [-0.025, 0.43, 0.01], [0.01, 0.51, 0.085], [0, 0.59, 0.1]], 0.047)
  const head = new THREE.Group()
  head.name = 'hatchling-head'
  head.position.set(0, 0.54, 0.085)
  torso.add(head)
  parent = head
  oval(skin, [0, 0.62, 0.12], [0.135, 0.137, 0.135])
  for (const side of [-1, 1]) {
    parent = head
    oval(pink, [side * 0.107, 0.637, 0.187], [0.034, 0.045, 0.044])
    oval(eye, [side * 0.123, 0.642, 0.2], [0.019, 0.027, 0.025])
    parent = torso
    const wing = oval(pink, [side * 0.112, 0.27, 0.005], [0.035, 0.12, 0.095])
    wing.rotation.z = side * 0.22
    wing.name = side < 0 ? 'hatchling-left-wing' : 'hatchling-right-wing'
    parent = root
    const leg = strand(pink, [[side * 0.067, 0.17, 0.015], [side * 0.14, 0.085, 0.055], [side * 0.115, 0.025, 0.15]], 0.018)
    leg.name = 'hatchling-leg'
    for (let toe = -1; toe <= 1; toe++) {
      strand(skin, [[side * 0.115, 0.025, 0.15], [side * 0.12 + toe * 0.025, 0.016, 0.205], [side * 0.12 + toe * 0.047, 0.012, 0.255]], 0.007)
    }
    parent = torso
    // Folds follow the naked wing buds instead of suggesting adult feathers.
    for (let i = 0; i < 3; i++) strand(pink, [[side * 0.12, 0.31 - i * 0.028, 0.07], [side * 0.145, 0.29 - i * 0.028, 0.02], [side * 0.13, 0.27 - i * 0.028, -0.04]], 0.003).name = 'hatchling-wing-fold'
  }
  const upperBeak = new THREE.Group()
  upperBeak.name = 'hatchling-upper-beak'
  upperBeak.position.set(0, 0.59, 0.19)
  parent = upperBeak
  oval(beak, [0, 0, 0.095], [0.046, 0.024, 0.12]).rotation.x = 0.22
  head.add(upperBeak)
  const lowerBeak = new THREE.Group()
  lowerBeak.name = 'hatchling-lower-beak'
  lowerBeak.position.set(0, 0.573, 0.19)
  parent = lowerBeak
  oval(beak, [0, 0, 0.085], [0.045, 0.01, 0.105])
  oval(pink, [0, 0.005, 0.085], [0.037, 0.005, 0.095])
  head.add(lowerBeak)
  parent = head
  oval(skin, [0, 0.625, 0.24], [0.048, 0.025, 0.038])
  parent = torso
  // Deliberately irregular, sparse soft down: plenty of bare skin between hairs.
  for (let i = 0; i < 26; i++) {
    const a = i * 2.39996, y = 0.13 + (i % 9) * 0.027
    const x = Math.cos(a) * 0.11, z = Math.sin(a) * 0.155
    strand(down, [[x, y, z], [x * 1.2, y + 0.025, z * 1.14], [x * 1.28 + 0.008, y + 0.049, z * 1.24]], 0.0018)
  }
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    parent = head
    strand(down, [[side * 0.1, 0.7, 0.09 - i * 0.04], [side * 0.15, 0.74, 0.07 - i * 0.04], [side * 0.17, 0.735, 0.05 - i * 0.04]], 0.0018)
  }
  if (royal) {
    const crown = createRoyalCrown()
    crown.scale.setScalar(0.45)
    crown.position.set(0, 0.72, 0.1)
    crown.rotation.z = 0.08
    head.add(crown)
  }
  // Rotate the face, both jaws, crown and head down together at the neck.
  head.children.forEach(child => { child.position.sub(head.position) })
  // Keep the resting shape unchanged while introducing a hip hinge.
  torso.children.forEach(child => { child.position.y -= 0.17 })
  root.rotation.y = -0.3
  root.traverse(object => { if (object instanceof THREE.Mesh) object.castShadow = object.receiveShadow = true })
  return root
}

export function createBabyHatchling() {
  const root = createBareHatchling(false)
  root.name = 'baby-hatchling'
  const torso = root.getObjectByName('hatchling-torso')!
  torso.position.y = 0.13
  // Reuse the mother's exact white-button, blue-rim pacifier and mint diaper.
  const pacifier = new THREE.Group()
  dressBaby(new THREE.Group(), pacifier, [], false)
  torso.add(createJuniorDiaper())
  pacifier.name = 'hatchling-pacifier'
  pacifier.children[0].position.set(0, -1.675, -0.975)
  pacifier.scale.setScalar(0.3)
  pacifier.position.set(0, 0.01, 0.22)
  root.getObjectByName('hatchling-upper-beak')!.add(pacifier)
  return root
}

function createJuniorDiaper() {
  const diaper = new THREE.Group()
  diaper.name = 'baby-diaper'
  const cotton = new THREE.MeshStandardMaterial({ color: '#fffdf5', roughness: 0.94, side: THREE.DoubleSide })
  const mint = new THREE.MeshStandardMaterial({ color: '#b1dfd9', roughness: 0.9 })
  const radii = new THREE.Vector3(0.137, 0.195, 0.195)
  const center = new THREE.Vector3(0, 0.07, 0)
  const waistY = 0.105
  const start = Math.acos((waistY - center.y) / radii.y)
  const shape = new THREE.SphereGeometry(1, 48, 32, 0, Math.PI * 2, start, Math.PI - start)
  const holes = [-1, 1].map(side => new THREE.Vector3(side * 0.85, -0.46, 0.25).normalize())
  const position = shape.getAttribute('position')
  const triangles: number[] = []
  const point = new THREE.Vector3(), centroid = new THREE.Vector3()
  const holeAngle = 0.34
  for (let i = 0; i < shape.index!.count; i += 3) {
    centroid.set(0, 0, 0)
    for (let j = 0; j < 3; j++) centroid.add(point.fromBufferAttribute(position, shape.index!.getX(i + j)))
    centroid.normalize()
    if (!holes.some(axis => centroid.dot(axis) > Math.cos(holeAngle))) {
      for (let j = 0; j < 3; j++) triangles.push(shape.index!.getX(i + j))
    }
  }
  shape.setIndex(triangles)
  shape.scale(radii.x, radii.y, radii.z)
  shape.translate(center.x, center.y, center.z)
  const shell = new THREE.Mesh(shape, cotton)
  shell.name = 'junior-diaper-shell'
  shell.castShadow = shell.receiveShadow = true
  diaper.add(shell)
  const seam = (points: THREE.Vector3[], material: THREE.Material, radius: number) => {
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 48, radius, 6, true), material)
    mesh.castShadow = mesh.receiveShadow = true
    diaper.add(mesh)
    return mesh
  }
  seam(Array.from({ length: 48 }, (_, i) => {
    const angle = i / 48 * Math.PI * 2
    return new THREE.Vector3(Math.cos(angle) * radii.x * Math.sin(start), waistY, Math.sin(angle) * radii.z * Math.sin(start))
  }), mint, 0.009)
  holes.forEach((axis, i) => {
    const tangent = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 0, 1)).normalize()
    const bitangent = axis.clone().cross(tangent).normalize()
    const points = Array.from({ length: 48 }, (_, j) => {
      const angle = j / 48 * Math.PI * 2
      return axis.clone().multiplyScalar(Math.cos(holeAngle))
        .addScaledVector(tangent, Math.cos(angle) * Math.sin(holeAngle))
        .addScaledVector(bitangent, Math.sin(angle) * Math.sin(holeAngle)).multiply(radii).add(center)
    })
    seam(points, cotton, 0.006).name = `junior-diaper-leg-opening-${i}`
  })
  return diaper
}

function dropPacifier(root: THREE.Group, elapsed: number) {
  const pacifier = root.getObjectByName('hatchling-pacifier')!
  if (elapsed < 0.12 || pacifier.userData.settled) return
  if (!pacifier.userData.dropped) {
    root.updateWorldMatrix(true, true)
    root.attach(pacifier)
    pacifier.userData.dropped = true
    pacifier.userData.start = pacifier.position.clone()
    pacifier.userData.rotation = pacifier.quaternion.clone()
  }
  const age = elapsed - 0.12
  pacifier.position.copy(pacifier.userData.start)
  pacifier.position.z += age * 0.42
  pacifier.position.y += age * 0.06 - 1.5 * age * age
  const resting = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, -0.2))
  pacifier.quaternion.slerpQuaternions(pacifier.userData.rotation, resting, Math.min(1, age / 0.5))
  pacifier.updateWorldMatrix(true, true)
  const inverse = root.matrixWorld.clone().invert()
  const point = new THREE.Vector3()
  let bottom = Infinity
  pacifier.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    object.geometry.computeBoundingBox()
    const bounds = object.geometry.boundingBox!
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
      point.set(x, y, z).applyMatrix4(object.matrixWorld).applyMatrix4(inverse)
      bottom = Math.min(bottom, point.y)
    }
  })
  if (bottom <= 0.012) {
    pacifier.position.y += 0.012 - bottom
    pacifier.userData.settled = true
  }
}

export function updateBabyHatchlingCry(root: THREE.Group, elapsed: number, emitTears = true) {
  const gape = THREE.MathUtils.smoothstep(elapsed, 0, 0.45)
  const torso = root.getObjectByName('hatchling-torso')!
  // Stay seated: a tiny sob shakes the chest, without extending either leg.
  torso.position.y = 0.13
  torso.rotation.x = Math.sin(elapsed * 15) * 0.025 * gape
  const head = root.getObjectByName('hatchling-head')!
  head.rotation.x = -0.38 * gape
  head.rotation.y = Math.sin(elapsed * 19) * 0.045 * gape
  root.getObjectByName('hatchling-upper-beak')!.rotation.x = -0.2 * gape
  root.getObjectByName('hatchling-lower-beak')!.rotation.x = 0.75 * gape
  if (emitTears) dropPacifier(root, elapsed)
  if (!emitTears || elapsed < 0.15) return
  let tears = root.getObjectByName('hatchling-tears') as THREE.Group | undefined
  if (!tears) {
    tears = new THREE.Group()
    tears.name = 'hatchling-tears'
    const geometry = new THREE.SphereGeometry(1, 10, 8)
    const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.1, transparent: true, opacity: 0.24, depthWrite: false })
    for (let i = 0; i < 24; i++) tears.add(new THREE.Mesh(geometry, material))
    root.add(tears)
  }
  root.updateWorldMatrix(true, true)
  const eye = new THREE.Vector3()
  tears.children.forEach((drop, index) => {
    const side = index % 2 === 0 ? -1 : 1
    const time = elapsed - 0.15 - Math.floor(index / 2) * (1.05 / 12)
    drop.visible = time >= 0
    if (!drop.visible) return
    const age = time % 1.05
    eye.set(side * 0.123, 0.102, 0.115)
    root.worldToLocal(head.localToWorld(eye))
    drop.position.copy(eye)
    drop.position.x += side * 0.15 * age
    drop.position.y += 0.08 * age - 0.62 * age * age
    drop.position.z += 0.18 * age
    drop.visible = drop.position.y > 0.03
    const scale = Math.min(1, (1.05 - age) * 5)
    drop.scale.set(0.02 * scale, 0.034 * scale, 0.02 * scale)
  })
}

export function stopBabyHatchlingCry(root: THREE.Group) {
  const tears = root.getObjectByName('hatchling-tears')
  if (!tears) return
  const first = tears.children[0] as THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>
  first.geometry.dispose()
  first.material.dispose()
  tears.removeFromParent()
}

export function updateRoyalHatchlingGreeting(root: THREE.Group, elapsed: number) {
  const t = THREE.MathUtils.smoothstep(elapsed, 0, 0.55)
  // Turn toward a three-quarter view while rising so the stooped waist reads.
  root.rotation.y = -0.3 - 0.5 * t
  const torso = root.getObjectByName('hatchling-torso')!
  // Push up from the feet, retaining an exaggerated stoop at the hip.
  torso.position.y = 0.17 + 0.11 * t
  torso.rotation.x = 0.42 * t
  root.getObjectsByProperty('name', 'hatchling-leg').forEach(leg => { leg.scale.y = 1 + 0.65 * t })
  // Counter the stooped torso so the open beak faces up toward the viewer.
  root.getObjectByName('hatchling-head')!.rotation.x = -0.9 * THREE.MathUtils.smoothstep(elapsed, 0.3, 0.65)
  const gape = THREE.MathUtils.smoothstep(elapsed, 0.55, 0.82)
  root.getObjectByName('hatchling-upper-beak')!.rotation.x = -0.23 * gape
  root.getObjectByName('hatchling-lower-beak')!.rotation.x = 0.65 * gape
}
