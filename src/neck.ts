import * as THREE from 'three'

const rings = 16
const sides = 12
const start = new THREE.Vector3(0, 1.14, 0.34)
const end = new THREE.Vector3()
const control1 = new THREE.Vector3()
const control2 = new THREE.Vector3()
const point = new THREE.Vector3()
const tangent = new THREE.Vector3()
const normal = new THREE.Vector3()
const binormal = new THREE.Vector3()
const axis = new THREE.Vector3(1, 0, 0)
const curve = new THREE.CubicBezierCurve3()

export function createFlexibleNeck(material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, sides, rings, true), material)
  const positions = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
  positions.setUsage(THREE.DynamicDrawUsage)
  mesh.castShadow = mesh.receiveShadow = true
  mesh.frustumCulled = false
  return mesh
}

export function updateFlexibleNeck(mesh: THREE.Mesh, head: THREE.Group) {
  // Both ends remain embedded in their parent anatomy in body-local space.
  head.updateMatrix()
  end.set(0, 1.65, 0.49).applyMatrix4(head.matrix)
  control1.copy(start).add(new THREE.Vector3(0, 0.25, 0.1))
  control2.copy(end).add(new THREE.Vector3(0, 0.08, -0.12))
  curve.v0.copy(start); curve.v1.copy(control1); curve.v2.copy(control2); curve.v3.copy(end)
  const positions = mesh.geometry.getAttribute('position')
  for (let ring = 0; ring <= rings; ring++) {
    const t = ring / rings
    curve.getPoint(t, point)
    curve.getTangent(t, tangent)
    normal.crossVectors(axis, tangent).normalize()
    binormal.crossVectors(tangent, normal).normalize()
    const radius = THREE.MathUtils.lerp(0.245, 0.175, t) * (mesh.userData.radiusScale ?? 1)
    for (let side = 0; side <= sides; side++) {
      const angle = -side / sides * Math.PI * 2
      const a = Math.cos(angle) * radius, b = Math.sin(angle) * radius
      positions.setXYZ(ring * (sides + 1) + side,
        point.x + normal.x * a + binormal.x * b,
        point.y + normal.y * a + binormal.y * b,
        point.z + normal.z * a + binormal.z * b)
    }
  }
  positions.needsUpdate = true
  mesh.geometry.computeVertexNormals()
  // Raycasting also needs the deformed bounds, including the extended feeding pose.
  mesh.geometry.computeBoundingSphere()
  mesh.geometry.computeBoundingBox()
}
