import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
export function createRoyalCrown() {
  const gold = new THREE.MeshStandardMaterial({ color: '#ffdc65', metalness: 0.52, roughness: 0.22, emissive: '#b97708', emissiveIntensity: 0.13 })
  const silver = new THREE.MeshPhysicalMaterial({ color: '#f3f6fa', metalness: 0.6, roughness: 0.12,
    clearcoat: 1, clearcoatRoughness: 0.08, emissive: '#9da8b5', emissiveIntensity: 0.14 })
  const silverRim = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.25, roughness: 0.15 })
  const purple = new THREE.MeshStandardMaterial({ color: '#6d268e', metalness: 0.25, roughness: 0.18 })
  function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) {
    if (!geometry.index) { const indexed = mergeVertices(geometry); geometry.dispose(); geometry = indexed }
    const m = new THREE.Mesh(geometry, mat)
    m.position.set(x, y, z)
    m.castShadow = m.receiveShadow = true
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


  function tube(parent: THREE.Object3D, points: number[][], radius: number, material = gold) {
    return mesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 16, radius, 6, false), material, 0, 0, 0)
  }
  mesh(crown, new THREE.CylinderGeometry(0.3, 0.28, 0.12, 24, 1, true), gold, 0, 0.03, 0)
  for (const y of [-0.025, 0.095]) {
    const rim = mesh(crown, new THREE.TorusGeometry(y < 0 ? 0.282 : 0.3, 0.013, 6, 32), gold, 0, y, 0)
    rim.rotation.x = Math.PI / 2
  }
  // A continuous, gently convex pointed shell defines the tall triangular silhouette.
  const profile = new THREE.SplineCurve([
    new THREE.Vector2(0.29, 0.08), new THREE.Vector2(0.305, 0.17),
    new THREE.Vector2(0.27, 0.36), new THREE.Vector2(0.205, 0.56),
    new THREE.Vector2(0.12, 0.76), new THREE.Vector2(0.045, 0.91),
    new THREE.Vector2(0.012, 0.975), new THREE.Vector2(0, 0.99),
  ]).getPoints(40)
  mesh(crown, new THREE.LatheGeometry(profile, 32), gold, 0, 0, 0).name = 'royal-crown-tapered-shell'
  const radiusAt = (y: number) => {
    for (let i = 1; i < profile.length; i++) {
      if (profile[i].y >= y) {
        const t = THREE.MathUtils.clamp((y - profile[i - 1].y) / (profile[i].y - profile[i - 1].y), 0, 1)
        return THREE.MathUtils.lerp(profile[i - 1].x, profile[i].x, t)
      }
    }
    return 0
  }
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2
    const onShell = (angle: number, y: number, offset = 0.009) => [Math.sin(angle) * (radiusAt(y) + offset), y, Math.cos(angle) * (radiusAt(y) + offset)]
    tube(crown, [0.1, 0.18, 0.36, 0.56, 0.76, 0.91].map(y => onShell(a, y)), 0.006)
    // Small relief arches follow the tapered surface instead of upright posts.
    for (const y of [0.18, 0.36, 0.54]) {
      tube(crown, [onShell(a, y), onShell(a + Math.PI / 12, y + 0.085), onShell(a + Math.PI / 6, y)], 0.007)
    }
    const height = 0.27 + (i % 3) * 0.17
    const [x, , z] = onShell(a, height, 0.015)
    mesh(crown, new THREE.ConeGeometry(0.018, 0.06, 6), gold, x, height + 0.02, z)
    oval(crown, gold, x, height - 0.025, z, 0.02, 0.028, 0.018)
    oval(crown, gold, Math.sin(a) * 0.296, 0.035, Math.cos(a) * 0.296, 0.025, 0.036, 0.015).rotation.y = a
  }
  // Gilded branching sprigs grow from the existing shell, keeping its taper visible.
  const branches = new THREE.Group(); branches.name = 'royal-crown-gold-branches'; crown.add(branches)
  for (const [tier, y] of [0.24, 0.45, 0.65].entries()) for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + tier * 0.19
    const point = (angle: number, height: number, lift: number) => [Math.sin(angle) * (radiusAt(height) + lift), height, Math.cos(angle) * (radiusAt(height) + lift)]
    tube(branches, [point(a, y - 0.035, 0.007), point(a, y + 0.035, 0.033), point(a, y + 0.12, 0.025)], 0.007)
    const tip = point(a, y + 0.13, 0.026)
    mesh(branches, new THREE.ConeGeometry(0.014, 0.045, 6), gold, ...tip as [number, number, number])
    for (const side of [-1, 1]) {
      const fork = point(a + side * 0.12, y + 0.065, 0.04)
      tube(branches, [point(a, y, 0.02), point(a + side * 0.06, y + 0.03, 0.038), fork], 0.005)
      const leaf = oval(branches, gold, ...fork as [number, number, number], 0.012, 0.025, 0.009)
      leaf.rotation.set(0, a, -side * 0.38)
    }
  }
  function gem(parent: THREE.Object3D, y: number, z: number, radius: number) {
    mesh(parent, new THREE.TorusGeometry(radius + 0.01, 0.009, 6, 20), gold, 0, y, z)
    oval(parent, purple, 0, y, z + 0.004, radius, radius, radius * 0.45)
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2
      oval(parent, gold, Math.cos(a) * (radius + 0.01), y + Math.sin(a) * (radius + 0.01), z + 0.009, 0.006, 0.006, 0.005)
    }
  }
  gem(crown, 0.27, radiusAt(0.27) + 0.016, 0.055)
  // A continuous mast rises from the band to above the silver blades.
  const mast = new THREE.Group(); mast.name = 'royal-crown-central-mast'; crown.add(mast)
  const mastZ = (y: number) => Math.max(0.11, radiusAt(y) + 0.025)
  tube(mast, [0.1, 0.38, 0.57, 0.78, 0.92, 1.01].map(y => [0, y, mastZ(y)]), 0.014)
  for (const [y, radius] of [[0.19, 0.037], [0.38, 0.03], [0.57, 0.025], [0.78, 0.019], [0.92, 0.015]]) {
    oval(mast, gold, 0, y, mastZ(y), radius, 0.024, radius)
  }
  // A separate tiered golden tower stands directly on the apex.
  const tower = new THREE.Group(); tower.name = 'royal-crown-top-tower'; crown.add(tower)
  mesh(tower, new THREE.CylinderGeometry(0.007, 0.019, 0.29, 8), gold, 0, 1.115, 0)
  for (const [y, radius] of [[0.99, 0.026], [1.07, 0.022], [1.15, 0.017], [1.24, 0.011]]) {
    oval(tower, gold, 0, y, 0, radius, 0.018, radius)
  }
  mesh(tower, new THREE.ConeGeometry(0.019, 0.12, 8), gold, 0, 1.3, 0)
  const ornament = new THREE.Group(); ornament.name = 'royal-crown-silver-ornament'; crown.add(ornament)
  // Silver blades mount on either side of the tower's base at the very top.
  oval(ornament, gold, 0, 1, 0.025, 0.044, 0.035, 0.038)
  for (const side of [-1, 1]) {
    const blade = new THREE.Shape()
    blade.moveTo(0, 1)
    blade.bezierCurveTo(side * 0.07, 1.065, side * 0.07, 1.2, side * 0.16, 1.26)
    blade.bezierCurveTo(side * 0.24, 1.325, side * 0.35, 1.31, side * 0.39, 1.25)
    blade.bezierCurveTo(side * 0.27, 1.29, side * 0.2, 1.17, side * 0.145, 1.095)
    blade.bezierCurveTo(side * 0.095, 1.03, side * 0.04, 1, 0, 1)
    const bladeGeometry = new THREE.ExtrudeGeometry(blade, { depth: 0.015, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.004, bevelSegments: 2, curveSegments: 12 })
    const positions = bladeGeometry.getAttribute('position')
    for (let i = 0; i < positions.count; i++) positions.setZ(i, positions.getZ(i) + Math.sin(Math.abs(positions.getX(i)) / 0.39 * Math.PI) * 0.018)
    bladeGeometry.computeVertexNormals()
    mesh(ornament, bladeGeometry, silver, 0, 0, 0.035)
    tube(ornament, [[side * 0.02, 1.02, 0.057], [side * 0.1, 1.19, 0.071], [side * 0.22, 1.292, 0.073], [side * 0.36, 1.275, 0.06]], 0.003, silverRim)
  }
  gem(ornament, 1, 0.068, 0.024)
  return crown
}

