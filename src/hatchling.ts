import * as THREE from 'three'
import { createRoyalCrown } from './royal-crown.ts'

// A bare squab: oversized head, thin crooked neck, undeveloped wings and
// sparse wisps of natal down. No adult plumage or clothing.
export function createRoyalHatchling() {
  const root = new THREE.Group()
  root.name = 'royal-hatchling'
  const skin = new THREE.MeshStandardMaterial({ color: '#d89687', roughness: 0.82 })
  const pink = new THREE.MeshStandardMaterial({ color: '#bc716c', roughness: 0.9 })
  const beak = new THREE.MeshStandardMaterial({ color: '#bba08c', roughness: 0.7 })
  const eye = new THREE.MeshStandardMaterial({ color: '#242026', roughness: 0.24 })
  const down = new THREE.MeshStandardMaterial({ color: '#d8c69a', roughness: 1 })
  const sphere = new THREE.SphereGeometry(1, 16, 12)
  function oval(mat: THREE.Material, p: number[], s: number[]) {
    const mesh = new THREE.Mesh(sphere, mat)
    mesh.position.set(...p as [number, number, number]); mesh.scale.set(...s as [number, number, number])
    root.add(mesh); return mesh
  }
  function strand(mat: THREE.Material, points: number[][], radius: number) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)))
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, radius, 5, false), mat)
    root.add(mesh); return mesh
  }
  oval(skin, [0, 0.24, 0], [0.12, 0.18, 0.17]).rotation.x = -0.24
  oval(pink, [0, 0.28, 0.15], [0.023, 0.115, 0.023]) // visible keel
  strand(skin, [[0, 0.34, 0.03], [-0.025, 0.43, 0.01], [0.01, 0.51, 0.085], [0, 0.59, 0.1]], 0.047)
  oval(skin, [0, 0.62, 0.12], [0.135, 0.137, 0.135])
  for (const side of [-1, 1]) {
    oval(pink, [side * 0.107, 0.637, 0.187], [0.034, 0.045, 0.044])
    oval(eye, [side * 0.123, 0.642, 0.2], [0.019, 0.027, 0.025])
    oval(pink, [side * 0.112, 0.27, 0.005], [0.035, 0.12, 0.095]).rotation.z = side * 0.22
    strand(pink, [[side * 0.067, 0.17, 0.015], [side * 0.14, 0.085, 0.055], [side * 0.115, 0.025, 0.15]], 0.018)
    for (let toe = -1; toe <= 1; toe++) {
      strand(skin, [[side * 0.115, 0.025, 0.15], [side * 0.12 + toe * 0.025, 0.016, 0.205], [side * 0.12 + toe * 0.047, 0.012, 0.255]], 0.007)
    }
    // Folds follow the naked wing buds instead of suggesting adult feathers.
    for (let i = 0; i < 3; i++) strand(pink, [[side * 0.12, 0.31 - i * 0.028, 0.07], [side * 0.145, 0.29 - i * 0.028, 0.02], [side * 0.13, 0.27 - i * 0.028, -0.04]], 0.003)
  }
  oval(beak, [0, 0.59, 0.285], [0.046, 0.031, 0.12]).rotation.x = 0.22
  oval(pink, [0, 0.573, 0.275], [0.045, 0.009, 0.105])
  oval(skin, [0, 0.625, 0.24], [0.048, 0.025, 0.038])
  // Deliberately irregular, sparse soft down: plenty of bare skin between hairs.
  for (let i = 0; i < 26; i++) {
    const a = i * 2.39996, y = 0.13 + (i % 9) * 0.027
    const x = Math.cos(a) * 0.11, z = Math.sin(a) * 0.155
    strand(down, [[x, y, z], [x * 1.2, y + 0.025, z * 1.14], [x * 1.28 + 0.008, y + 0.049, z * 1.24]], 0.0018)
  }
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    strand(down, [[side * 0.1, 0.7, 0.09 - i * 0.04], [side * 0.15, 0.74, 0.07 - i * 0.04], [side * 0.17, 0.735, 0.05 - i * 0.04]], 0.0018)
  }
  const crown = createRoyalCrown()
  crown.scale.setScalar(0.45)
  crown.position.set(0, 0.72, 0.1)
  crown.rotation.z = 0.08
  root.add(crown)
  root.rotation.y = -0.3
  root.traverse(object => { if (object instanceof THREE.Mesh) object.castShadow = object.receiveShadow = true })
  return root
}
