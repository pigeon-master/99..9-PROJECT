import * as THREE from 'three'
export function createRoyalCrown() {
  const gold = new THREE.MeshStandardMaterial({ color: '#ffdc65', metalness: 0.52, roughness: 0.22, emissive: '#b97708', emissiveIntensity: 0.13 })
  const silver = new THREE.MeshStandardMaterial({ color: '#c6cdd4', metalness: 0.85, roughness: 0.24 })
  const purple = new THREE.MeshStandardMaterial({ color: '#6d268e', metalness: 0.25, roughness: 0.18 })
  function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) {
    const m = new THREE.Mesh(geometry, mat)
    m.position.set(x, y, z)
    parent.add(m)
    return m
  }
  function oval(parent: THREE.Object3D, mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
    const m = mesh(parent, new THREE.SphereGeometry(1, 12, 8), mat, x, y, z)
    m.scale.set(sx, sy, sz)
    return m
  }
  const crown = new THREE.Group()
  crown.name = 'royal-crown'


  mesh(crown, new THREE.CylinderGeometry(0.3, 0.28, 0.12, 16, 1, true), gold, 0, 0.03, 0)
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2, x = Math.sin(a) * 0.27, z = Math.cos(a) * 0.27
    const height = 0.35 + (i % 3) * 0.09
    mesh(crown, new THREE.ConeGeometry(0.045, height, 6), gold, x, height / 2 + 0.07, z)
    oval(crown, gold, x, 0.14, z, 0.055, 0.09, 0.04)
  }
  for (const y of [0.16, 0.34]) {
    oval(crown, gold, 0, y, 0.29, 0.095, 0.09, 0.03)
    oval(crown, purple, 0, y, 0.315, 0.055, 0.054, 0.024)
  }
  for (const side of [-1, 1]) {
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.39, 0), new THREE.Vector3(side * 0.12, 0.95, 0), new THREE.Vector3(side * 0.43, 0.78, 0))
    mesh(crown, new THREE.TubeGeometry(curve, 10, 0.035, 5, false), silver, 0, 0, 0)
  }
  return crown
}

