import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

// Accessories are built in the existing joints' local coordinates and batched
// by createPigeon, so picking and every existing animation work unchanged.
export function dressGyaru(body: THREE.Group, head: THREE.Group, feet: THREE.Group[]) {
  const satin = new THREE.MeshStandardMaterial({ color: '#ff91c6', roughness: 0.4, side: THREE.DoubleSide })
  const pink = new THREE.MeshStandardMaterial({ color: '#ec489a', roughness: 0.3 })
  const pale = new THREE.MeshStandardMaterial({ color: '#ffb9db', roughness: 0.5, side: THREE.DoubleSide })
  const lace = new THREE.MeshStandardMaterial({ color: '#fff5ee', roughness: 0.75, side: THREE.DoubleSide })
  const pearl = new THREE.MeshStandardMaterial({ color: '#fff6e6', metalness: 0.15, roughness: 0.2 })
  const gem = new THREE.MeshStandardMaterial({ color: '#ff3196', metalness: 0.35, roughness: 0.16 })
  const hair = new THREE.MeshStandardMaterial({ color: '#a98c76', roughness: 0.94 })
  const honey = new THREE.MeshStandardMaterial({ color: '#bca28c', roughness: 0.94 })
  const highlight = new THREE.MeshStandardMaterial({ color: '#d0baa4', roughness: 0.92 })
  const black = new THREE.MeshStandardMaterial({ color: '#221823', roughness: 0.65 })

  function mesh(parent: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material) {
    // Extruded bows and indexed spheres must survive the same material batch.
    if (!geometry.index) { const indexed = mergeVertices(geometry); geometry.dispose(); geometry = indexed }
    const object = new THREE.Mesh(geometry, material)
    object.castShadow = object.receiveShadow = true
    parent.add(object)
    return object
  }
  function oval(parent: THREE.Group, material: THREE.Material, p: number[], s: number[]) {
    const object = mesh(parent, new THREE.SphereGeometry(1, 12, 8), material)
    object.position.set(p[0], p[1], p[2])
    object.scale.set(s[0], s[1], s[2])
    return object
  }
  function tube(parent: THREE.Group, material: THREE.Material, points: THREE.Vector3[], radius: number, segments = 32) {
    return mesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, radius, 5, false), material)
  }
  function bow(parent: THREE.Group, p: number[], size: number, angle = 0) {
    // A ribbon silhouette with a pinched center and hanging satin tails.
    const group = new THREE.Group()
    group.position.set(p[0], p[1], p[2])
    group.scale.setScalar(size)
    group.rotation.z = angle
    parent.add(group)
    for (const side of [-1, 1]) {
      const shape = new THREE.Shape()
      shape.moveTo(0, 0)
      shape.bezierCurveTo(side * 0.22, 0.13, side * 0.48, 0.34, side * 0.52, 0.16)
      shape.bezierCurveTo(side * 0.62, -0.22, side * 0.27, -0.2, 0, 0)
      mesh(group, new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2, steps: 1, curveSegments: 8 }), satin)
      const tail = new THREE.Shape()
      tail.moveTo(side * 0.06, -0.03)
      tail.lineTo(side * 0.31, -0.49)
      tail.lineTo(side * 0.14, -0.42)
      tail.lineTo(side * 0.04, -0.49)
      tail.lineTo(0, -0.07)
      const ribbon = mesh(group, new THREE.ShapeGeometry(tail), pale)
      ribbon.position.z = 0.015
      for (let i = 0; i < 3; i++) oval(group, pearl, [side * (0.27 + i * 0.09), 0.08 - i * 0.04, 0.095], [0.025, 0.025, 0.018])
    }
    oval(group, pearl, [0, 0, 0.075], [0.105, 0.12, 0.065])
    oval(group, gem, [0, 0, 0.13], [0.065, 0.08, 0.035])
    return group
  }

  // Flared, pleated skirt tiers around the original round pigeon torso.
  function frill(y: number, rx: number, rz: number, height: number, material: THREE.Material) {
    const positions: number[] = [], uvs: number[] = [], indices: number[] = []
    const segments = 128, rows = 5
    const point = (a: number, t: number) => {
      const pleat = Math.sin(a * 20) * 0.035 * t
      return new THREE.Vector3(Math.cos(a) * (rx + t * 0.14 + pleat),
        y - t * height + Math.cos(a * 20) * 0.016 * t,
        -0.04 + Math.sin(a) * (rz + t * 0.14 + pleat))
    }
    for (let row = 0; row <= rows; row++) for (let i = 0; i <= segments; i++) {
      const p = point(i / segments * Math.PI * 2, row / rows)
      positions.push(p.x, p.y, p.z)
      uvs.push(i / segments, row / rows)
      if (row < rows && i < segments) {
        const a = row * (segments + 1) + i, b = a + segments + 1
        indices.push(a, b, a + 1, a + 1, b, b + 1)
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    mesh(body, geometry, material)
    // Open scalloped loops are real lace holes rather than an opaque white band.
    for (let i = 0; i < 64; i++) {
      const a = i / 64 * Math.PI * 2
      const p = point(a, 1)
      const loop = mesh(body, new THREE.TorusGeometry(0.038, 0.006, 4, 10), lace)
      loop.position.copy(p)
      loop.position.y -= 0.016
      loop.rotation.y = Math.PI / 2 - a
      oval(body, pearl, [p.x, p.y + 0.028, p.z], [0.011, 0.011, 0.011])
    }
  }
  // Fit one continuous fabric surface to the actual torso and breast, with only
  // a small fabric allowance. Separate padded ellipsoids made the chest bulky.
  const origin = new THREE.Vector3(0, 0.99, 0.04)
  const forms = [
    { center: new THREE.Vector3(0, 0.94, -0.03), scale: new THREE.Vector3(0.38, 0.46, 0.68), angle: -0.25 },
    { center: new THREE.Vector3(0, 1.12, 0.35), scale: new THREE.Vector3(0.31, 0.40, 0.37), angle: -0.18 },
  ]
  function fabricPoint(direction: THREE.Vector3, allowance = 0.009) {
    let distance = 0
    for (const form of forms) {
      const rotation = new THREE.Matrix4().makeRotationX(-form.angle)
      const o = origin.clone().sub(form.center).applyMatrix4(rotation).divide(form.scale)
      const d = direction.clone().applyMatrix4(rotation).divide(form.scale)
      const a = d.lengthSq(), b = 2 * o.dot(d), c = o.lengthSq() - 1
      const discriminant = b * b - 4 * a * c
      if (discriminant >= 0) distance = Math.max(distance, (-b + Math.sqrt(discriminant)) / (2 * a))
    }
    return origin.clone().addScaledVector(direction, distance + allowance)
  }
  const dress = new THREE.Group()
  dress.name = 'gyaru-fitted-dress'
  body.add(dress)
  const bodice = new THREE.SphereGeometry(1, 64, 32, 0, Math.PI * 2, 0.22, 2.46)
  const vertices = bodice.getAttribute('position')
  for (let i = 0; i < vertices.count; i++) {
    const direction = new THREE.Vector3().fromBufferAttribute(vertices, i).normalize()
    const a = Math.atan2(direction.z, direction.x)
    const p = fabricPoint(direction, 0.009 + 0.003 * (1 + Math.sin(a * 28)))
    vertices.setXYZ(i, p.x, p.y, p.z)
  }
  bodice.computeVertexNormals()
  mesh(dress, bodice, satin)
  // Shallow gathered ribbons follow the back instead of inflating the torso.
  for (let tier = 0; tier < 3; tier++) {
    const positions: number[] = [], uvs: number[] = [], indices: number[] = []
    for (let row = 0; row <= 3; row++) for (let i = 0; i <= 64; i++) {
      const a = Math.PI + i / 64 * Math.PI
      const t = row / 3, theta = 0.7 + tier * 0.28 + t * 0.12
      const d = new THREE.Vector3(Math.sin(theta) * Math.cos(a), Math.cos(theta), Math.sin(theta) * Math.sin(a))
      const p = fabricPoint(d, 0.017 + t * (0.01 + 0.013 * (1 + Math.sin(a * 28))))
      positions.push(p.x, p.y, p.z); uvs.push(i / 64, t)
      if (row < 3 && i < 64) { const k = row * 65 + i; indices.push(k, k + 65, k + 1, k + 1, k + 65, k + 66) }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setIndex(indices); geometry.computeVertexNormals()
    mesh(dress, geometry, tier % 2 ? pale : satin)
  }
  frill(0.85, 0.45, 0.67, 0.25, lace)
  frill(0.98, 0.43, 0.63, 0.25, pale)
  frill(1.10, 0.38, 0.58, 0.24, satin)
  const chestBow = bow(body, [0, 1.13, 0.745], 0.58)
  chestBow.name = 'gyaru-chest-bow'
  const backBow = bow(body, [0, 1.08, -0.72], 0.62)
  backBow.name = 'gyaru-back-bow'
  backBow.rotation.y = Math.PI
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * Math.PI * 2
    const loop = mesh(backBow, new THREE.TorusGeometry(0.047, 0.009, 4, 9), lace)
    loop.position.set(Math.cos(a) * 0.53, Math.sin(a) * 0.24, 0.015)
  }

  // Raised crown and swept fringe leave the beak and both eyes exposed.
  oval(head, hair, [0, 1.995, 0.42], [0.28, 0.17, 0.26])
  oval(head, honey, [-0.04, 2.065, 0.30], [0.235, 0.15, 0.23])
  for (let i = 0; i < 12; i++) {
    const x = (i - 5.5) * 0.033
    const arch = Math.sqrt(Math.max(0, 1 - (x / 0.23) ** 2))
    tube(head, i % 3 ? honey : highlight, [
      new THREE.Vector3(x - 0.07, 2.04, 0.09),
      new THREE.Vector3(x - 0.07, 2.07 + arch * 0.11, 0.19),
      new THREE.Vector3(x - 0.045, 2.08 + arch * 0.11, 0.34),
      new THREE.Vector3(x, 2.06, 0.53),
    ], 0.019, 20)
  }
  for (let i = 0; i < 9; i++) {
    const x = (i - 4) * 0.045
    tube(head, i % 3 === 0 ? highlight : honey, [
      new THREE.Vector3(x - 0.08, 2.11, 0.42),
      new THREE.Vector3(x - 0.05, 2.08, 0.63),
      new THREE.Vector3(x, 1.99, 0.71),
      new THREE.Vector3(x + 0.065, 1.955 + i * 0.004, 0.70),
    ], 0.029, 16)
  }
  // Soft, irregular waves taper into the scalp rather than disconnected coils.
  for (let strand = 0; strand < 18; strand++) {
    const a = 0.95 + strand / 17 * (Math.PI * 2 - 1.9)
    const cx = Math.sin(a) * 0.39, cz = 0.36 + Math.cos(a) * 0.22
    const rear = Math.max(0, -Math.cos(a))
    const length = 0.91 + (strand % 4) * 0.055 + rear * 0.24
    const points: THREE.Vector3[] = []
    for (let j = 0; j <= 48; j++) {
      const t = j / 48, wave = t * Math.PI * (3.2 + strand % 3 * 0.28) + strand * 0.83
      const curl = Math.sin(t * Math.PI / 2) * (0.042 + strand % 4 * 0.008)
      points.push(new THREE.Vector3(cx * (0.58 + Math.sin(t * Math.PI / 2) * 0.62) + Math.cos(wave) * curl,
        2.075 - t * length, 0.36 + (cz - 0.36) * (0.6 + t * 0.4) + Math.sin(wave) * curl - t * 0.06 - rear * 0.62 * t * t * (3 - 2 * t)))
    }
    tube(head, strand % 3 === 0 ? hair : honey, points, 0.043 + rear * 0.022, 40)
    tube(head, highlight, points.map(p => p.clone().add(new THREE.Vector3(0.011, 0.005, 0.033))), 0.006, 40)
  }
  bow(head, [0.23, 2.18, 0.49], 0.46, -0.35)
  bow(head, [-0.34, 1.34, 0.45], 0.16, 0.3)
  bow(head, [0.37, 1.16, 0.42], 0.19, -0.25)

  // Blush, fan lashes, pearl necklace, and a small cat-shaped hair charm.
  for (const side of [-1, 1]) {
    oval(head, satin, [side * 0.204, 1.717, 0.619], [0.024, 0.052, 0.069])
    for (let i = 0; i < 7; i++) {
      tube(head, black, [
        new THREE.Vector3(side * 0.233, 1.827 + i * 0.004, 0.622 - i * 0.017),
        new THREE.Vector3(side * (0.30 + i * 0.004), 1.90 + i * 0.004, 0.64 - i * 0.019),
        new THREE.Vector3(side * (0.37 + i * 0.009), 2.00 + i * 0.007, 0.66 - i * 0.021),
      ], 0.009, 8)
    }
  }
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2
    oval(body, i % 2 ? satin : pearl, [Math.cos(a) * 0.25, 1.41 - Math.sin(a) * 0.07, 0.41 + Math.sin(a) * 0.24], [0.027, 0.027, 0.027])
  }
  oval(head, pearl, [0.32, 1.93, 0.61], [0.096, 0.076, 0.046])
  for (const side of [-1, 1]) {
    const ear = mesh(head, new THREE.ConeGeometry(0.036, 0.064, 3), pearl)
    ear.position.set(0.32 + side * 0.061, 2.003, 0.61)
    oval(head, black, [0.32 + side * 0.035, 1.94, 0.653], [0.008, 0.011, 0.006])
  }
  oval(head, honey, [0.32, 1.919, 0.655], [0.009, 0.007, 0.006])
  bow(head, [0.385, 1.99, 0.65], 0.11)

  // Each nail follows its original foot joint, including the held kick motion.
  for (const foot of feet) {
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2
      oval(foot, i % 2 ? gem : pearl, [Math.cos(a) * 0.037, 0.15, Math.sin(a) * 0.037], [0.013, 0.014, 0.013])
    }
    for (let toe = -1; toe <= 1; toe++) {
      const tip = new THREE.Vector3(toe * 0.084, 0.036, 0.25 - Math.abs(toe) * 0.04)
      const direction = new THREE.Vector3(toe * 0.28, -0.04, 1).normalize()
      const nail = mesh(foot, new THREE.ConeGeometry(0.043, 0.30, 8), pink)
      nail.position.copy(tip).addScaledVector(direction, 0.12)
      nail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction)
      oval(foot, pearl, [tip.x, tip.y + 0.027, tip.z + 0.02], [0.014, 0.008, 0.018])
      oval(foot, gem, [tip.x + direction.x * 0.07, tip.y + 0.02, tip.z + 0.075], [0.013, 0.007, 0.015])
      bow(foot, [tip.x, tip.y + 0.044, tip.z + 0.045], 0.075)
      for (let j = 0; j < 3; j++) oval(foot, j % 2 ? pearl : gem,
        [tip.x + direction.x * (0.06 + j * 0.05), tip.y + 0.026, tip.z + 0.08 + j * 0.05], [0.021, 0.013, 0.021])
    }
  }
}
