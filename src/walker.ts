import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

interface Caster {
  swivel: THREE.Group
  wheel: THREE.Group
  previous: THREE.Vector3
}
export interface BabyWalker { frame: THREE.Group; casters: Caster[]; initialized: boolean }
const wheelRadius = 0.115
const current = new THREE.Vector3()
const delta = new THREE.Vector3()
const inverseRotation = new THREE.Quaternion()
const worldScale = new THREE.Vector3()

export function createBabyWalker(root: THREE.Group): BabyWalker {
  const frame = new THREE.Group()
  frame.name = 'baby-walker'
  root.add(frame)
  const turquoise = new THREE.MeshStandardMaterial({ color: '#62cbd6', roughness: 0.28 })
  const mint = new THREE.MeshStandardMaterial({ color: '#b2eddb', roughness: 0.31 })
  const white = new THREE.MeshStandardMaterial({ color: '#fffdf4', roughness: 0.42 })
  const lime = new THREE.MeshStandardMaterial({ color: '#c7df92', roughness: 0.5 })
  const tire = new THREE.MeshStandardMaterial({ color: '#398a94', roughness: 0.65 })
  const yellow = new THREE.MeshStandardMaterial({ color: '#ffe17c', roughness: 0.4 })
  const pink = new THREE.MeshStandardMaterial({ color: '#eaa0d6', roughness: 0.4 })
  const red = new THREE.MeshStandardMaterial({ color: '#f2776d', roughness: 0.37 })
  const gray = new THREE.MeshStandardMaterial({ color: '#889699', roughness: 0.43 })
  const orange = new THREE.MeshStandardMaterial({ color: '#df9155', roughness: 0.4 })
  const black = new THREE.MeshStandardMaterial({ color: '#293b3e', roughness: 0.4 })
  const mesh = (parent: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material) => {
    const indexed = geometry.index ? geometry : mergeVertices(geometry)
    if (indexed !== geometry) geometry.dispose()
    const object = new THREE.Mesh(indexed, material)
    object.castShadow = object.receiveShadow = true
    parent.add(object)
    return object
  }
  const oval = (parent: THREE.Group, material: THREE.Material, p: number[], s: number[]) => {
    const object = mesh(parent, new THREE.SphereGeometry(1, 12, 8), material)
    object.position.set(p[0], p[1], p[2]); object.scale.set(s[0], s[1], s[2])
    return object
  }
  const tube = (points: THREE.Vector3[], radius: number, material: THREE.Material, closed = false) =>
    mesh(frame, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, closed), closed ? 48 : 16, radius, 6, closed), material)
  const ellipse = (rx: number, rz: number, y: number) => Array.from({ length: 40 }, (_, i) => {
    const a = i / 40 * Math.PI * 2
    return new THREE.Vector3(Math.cos(a) * rx, y, Math.sin(a) * rz)
  })

  tube(ellipse(0.91, 1.08, 0.27), 0.086, turquoise, true)
  // An open tray leaves the pigeon visible through the center.
  const tray = new THREE.Shape()
  tray.absellipse(0, 0, 0.87, 1.00, 0, Math.PI * 2, false)
  const hole = new THREE.Path()
  hole.absellipse(0, -0.10, 0.47, 0.66, 0, Math.PI * 2, true)
  tray.holes.push(hole)
  const trayMesh = mesh(frame, new THREE.ExtrudeGeometry(tray, {
    depth: 0.085, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.025, bevelSegments: 2, curveSegments: 20,
  }), mint)
  trayMesh.rotation.x = -Math.PI / 2
  trayMesh.position.y = 0.88
  tube(ellipse(0.80, 0.92, 0.98), 0.026, turquoise, true)
  for (const side of [-1, 1]) for (const front of [-1, 1]) {
    const lower = new THREE.Vector3(side * 0.69, 0.3, front * 0.64)
    const upper = new THREE.Vector3(side * 0.68, 0.86, front * 0.44)
    tube([lower, lower.clone().lerp(upper, 0.5), upper], 0.033, white)
    oval(frame, lime, [side * 0.69, 0.46, front * 0.585], [0.068, 0.081, 0.071])
  }

  const clothCanvas = document.createElement('canvas')
  clothCanvas.width = clothCanvas.height = 64
  const ctx = clothCanvas.getContext('2d')!
  ctx.fillStyle = '#f5f8df'; ctx.fillRect(0, 0, 64, 64)
  ctx.fillStyle = '#d9e9ac'
  for (let i = 0; i < 8; i++) { ctx.fillRect(i * 8, 0, 4, 64); ctx.fillRect(0, i * 8, 64, 4) }
  ctx.fillStyle = '#c3db8a'
  for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) ctx.fillRect(x * 8, y * 8, 4, 4)
  const texture = new THREE.CanvasTexture(clothCanvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const cloth = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95, side: THREE.DoubleSide })
  const positions: number[] = [], uv: number[] = [], indices: number[] = []
  const topEdge: THREE.Vector3[] = []
  for (let row = 0; row <= 5; row++) for (let i = 0; i <= 24; i++) {
    const a = Math.PI + i / 24 * Math.PI, t = row / 5
    const top = 1.23 - Math.sin(a) * 0.39
    const p = new THREE.Vector3(Math.cos(a) * (0.5 + t * 0.045), 0.91 + (top - 0.91) * t, -0.18 + Math.sin(a) * 0.53)
    positions.push(p.x, p.y, p.z); uv.push(i / 24 * 2, t)
    if (row === 5) topEdge.push(p)
    if (row < 5 && i < 24) { const n = row * 25 + i; indices.push(n, n + 25, n + 1, n + 1, n + 25, n + 26) }
  }
  const cushion = new THREE.BufferGeometry()
  cushion.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  cushion.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  cushion.setIndex(indices); cushion.computeVertexNormals()
  mesh(frame, cushion, cloth)
  tube(topEdge, 0.035, lime)

  // Front play tray: colored bead posts, white handle, buttons and pigeon toy.
  oval(frame, turquoise, [0, 0.976, 0.76], [0.57, 0.055, 0.22])
  for (const side of [-1, 1]) {
    for (let level = 0; level < 3; level++) oval(frame, [turquoise, yellow, pink][level],
      [side * 0.58, 1.02 + level * 0.085, 0.58], [0.074, 0.05, 0.074])
    oval(frame, yellow, [side * 0.58, 1.29, 0.58], [0.05, 0.06, 0.05])
    oval(frame, red, [side * 0.38, 1.044, 0.81], [0.10, 0.035, 0.08])
    oval(frame, yellow, [side * 0.38, 1.075, 0.81], [0.039, 0.008, 0.035])
  }
  tube([new THREE.Vector3(-0.58, 1.28, 0.58), new THREE.Vector3(-0.38, 1.27, 0.72),
    new THREE.Vector3(0, 1.18, 0.78), new THREE.Vector3(0.38, 1.27, 0.72), new THREE.Vector3(0.58, 1.28, 0.58)], 0.022, white)
  oval(frame, lime, [0, 1.04, 0.80], [0.15, 0.04, 0.115])
  oval(frame, gray, [0, 1.19, 0.80], [0.115, 0.14, 0.12])
  for (const side of [-1, 1]) {
    oval(frame, orange, [side * 0.076, 1.22, 0.89], [0.025, 0.038, 0.015])
    oval(frame, black, [side * 0.076, 1.22, 0.903], [0.011, 0.024, 0.007])
  }
  oval(frame, white, [0, 1.175, 0.92], [0.033, 0.021, 0.031])

  const casters: Caster[] = []
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + i / 6 * Math.PI * 2
    const swivel = new THREE.Group()
    swivel.name = `walker-caster-${i}`
    swivel.position.set(Math.cos(a) * 0.87, wheelRadius, Math.sin(a) * 1.04)
    frame.add(swivel)
    oval(swivel, white, [0, 0.067, 0], [0.055, 0.10, 0.047])
    const wheel = new THREE.Group()
    wheel.name = 'rolling-wheels'
    swivel.add(wheel)
    for (const side of [-1, 1]) {
      const disk = mesh(wheel, new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.043, 16), tire)
      disk.rotation.z = Math.PI / 2; disk.position.x = side * 0.064
      const hub = mesh(wheel, new THREE.CylinderGeometry(0.07, 0.07, 0.047, 12), turquoise)
      hub.rotation.z = Math.PI / 2; hub.position.x = side * 0.066
      // Off-center hub marks make rotation visible, even on a solid-color wheel.
      oval(wheel, white, [side * 0.092, 0.043, 0.02], [0.005, 0.016, 0.016])
    }
    casters.push({ swivel, wheel, previous: new THREE.Vector3() })
  }
  return { frame, casters, initialized: false }
}

export function updateBabyWalker(rig: BabyWalker, root: THREE.Group, grounded: boolean, dt: number) {
  root.updateWorldMatrix(true, false)
  root.getWorldQuaternion(inverseRotation).invert()
  root.getWorldScale(worldScale)
  for (const caster of rig.casters) {
    current.copy(caster.swivel.position).applyMatrix4(root.matrixWorld)
    delta.copy(current).sub(caster.previous)
    delta.y = 0
    const distance = delta.length()
    if (rig.initialized && grounded && distance > 0.00001 && distance < 0.5) {
      delta.applyQuaternion(inverseRotation)
      const heading = Math.atan2(delta.x, delta.z)
      const turn = Math.atan2(Math.sin(heading - caster.swivel.rotation.y), Math.cos(heading - caster.swivel.rotation.y))
      caster.swivel.rotation.y += turn * Math.min(1, dt * 18)
      caster.wheel.rotation.x = (caster.wheel.rotation.x + distance / (wheelRadius * worldScale.x)) % (Math.PI * 2)
    }
    caster.previous.copy(current)
  }
  rig.initialized = true
}
