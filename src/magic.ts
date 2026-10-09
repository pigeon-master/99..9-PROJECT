import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

export function dressMagic(body: THREE.Group, head: THREE.Group, legs: THREE.Group[], wings: THREE.Group[]) {
  const red = new THREE.MeshStandardMaterial({ color: '#d91e48', roughness: 0.28, metalness: 0.12, side: THREE.DoubleSide })
  const pink = new THREE.MeshStandardMaterial({ color: '#f6c7d7', roughness: 0.42, side: THREE.DoubleSide })
  const white = new THREE.MeshStandardMaterial({ color: '#fff4ef', roughness: 0.64, side: THREE.DoubleSide })
  const gold = new THREE.MeshStandardMaterial({ color: '#e8be70', metalness: 0.58, roughness: 0.25 })
  const ruby = new THREE.MeshPhysicalMaterial({ color: '#e9005d', metalness: 0.3, roughness: 0.16, clearcoat: 1 })
  const feather = new THREE.MeshStandardMaterial({ color: '#70747c', roughness: 0.85 })
  const mesh = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material) => {
    if (!geometry.index) { const indexed = mergeVertices(geometry); geometry.dispose(); geometry = indexed }
    const object = new THREE.Mesh(geometry, material)
    object.castShadow = object.receiveShadow = true
    parent.add(object)
    return object
  }
  const oval = (parent: THREE.Object3D, mat: THREE.Material, p: number[], s: number[]) => {
    const object = mesh(parent, new THREE.SphereGeometry(1, 12, 8), mat)
    object.position.set(p[0], p[1], p[2]); object.scale.set(s[0], s[1], s[2])
    return object
  }
  const rod = (parent: THREE.Object3D, mat: THREE.Material, a: number[], b: number[], r: number) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start)
    const object = mesh(parent, new THREE.CylinderGeometry(r, r, delta.length(), 8), mat)
    object.position.copy(start).add(end).multiplyScalar(0.5)
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize())
    return object
  }
  function heart(parent: THREE.Object3D, p: number[], size: number) {
    const group = new THREE.Group(); group.position.set(p[0], p[1], p[2]); group.scale.setScalar(size); parent.add(group)
    const shape = new THREE.Shape()
    shape.moveTo(0, -0.55)
    shape.bezierCurveTo(-0.16, -0.35, -0.62, 0.03, -0.46, 0.32)
    shape.bezierCurveTo(-0.3, 0.6, -0.05, 0.43, 0, 0.28)
    shape.bezierCurveTo(0.05, 0.43, 0.3, 0.6, 0.46, 0.32)
    shape.bezierCurveTo(0.62, 0.03, 0.16, -0.35, 0, -0.55)
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.035, bevelSegments: 2, curveSegments: 8 })
    mesh(group, geometry, gold)
    const jewel = mesh(group, geometry.clone(), ruby); jewel.scale.set(0.78, 0.78, 1); jewel.position.z = 0.07
    for (let i = 0; i < 16; i++) {
      const point = shape.getPoint(i / 16)
      oval(group, white, [point.x, point.y, 0.1], [0.025, 0.025, 0.02])
    }
    return group
  }
  function bow(parent: THREE.Object3D, p: number[], size: number, mat = red) {
    const group = new THREE.Group(); group.position.set(p[0], p[1], p[2]); group.scale.setScalar(size); parent.add(group)
    for (const side of [-1, 1]) {
      const shape = new THREE.Shape()
      shape.moveTo(0, 0); shape.bezierCurveTo(side * 0.25, 0.06, side * 0.52, 0.35, side * 0.58, 0.2)
      shape.bezierCurveTo(side * 0.72, -0.32, side * 0.22, -0.19, 0, 0)
      mesh(group, new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 8 }), mat)
      const tail = new THREE.Shape()
      tail.moveTo(side * 0.025, -0.025); tail.lineTo(side * 0.35, -0.58)
      tail.lineTo(side * 0.18, -0.47); tail.lineTo(side * 0.12, -0.61); tail.lineTo(0, -0.04)
      mesh(group, new THREE.ShapeGeometry(tail), mat)
    }
    heart(group, [0, 0, 0.08], 0.24)
    return group
  }
  // Corrugated cloth surfaces, with real scalloped loops at each lace hem.
  function skirt(parent: THREE.Object3D, y: number, rx: number, rz: number, height: number, mat: THREE.Material, trim: boolean) {
    const vertices: number[] = [], uv: number[] = [], indices: number[] = []
    const count = 72, rows = 4
    function point(a: number, t: number) {
      const ruffle = Math.sin(a * 18) * 0.027 * t
      return [Math.cos(a) * (rx + t * 0.11 + ruffle), y - t * height + Math.cos(a * 18) * 0.014 * t,
        0.1 + Math.sin(a) * (rz + t * 0.1 + ruffle)]
    }
    for (let row = 0; row <= rows; row++) for (let i = 0; i <= count; i++) {
      vertices.push(...point(i / count * Math.PI * 2, row / rows)); uv.push(i / count, row / rows)
      if (row < rows && i < count) {
        const a = row * (count + 1) + i, b = a + count + 1
        indices.push(a, b, a + 1, a + 1, b, b + 1)
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    geometry.setIndex(indices); geometry.computeVertexNormals(); mesh(parent, geometry, mat)
    for (let i = 0; i < 48; i++) {
      const a = i / 48 * Math.PI * 2, p = point(a, 0.95)
      if (trim) {
        const loop = mesh(parent, new THREE.TorusGeometry(0.024, 0.004, 4, 8), white)
        loop.position.set(p[0], p[1] - 0.028, p[2]); loop.rotation.y = Math.PI / 2 - a
      } else oval(parent, gold, p, [0.018, 0.006, 0.018])
    }
  }
  const dress = new THREE.Group(); dress.name = 'magic-dress'; body.add(dress)
  oval(dress, pink, [0, 1.04, 0.11], [0.29, 0.4, 0.29])
  oval(dress, pink, [0, 1.25, 0.34], [0.26, 0.19, 0.27])
  // Small vertical seams make the corset read as fabric rather than a solid lump.
  for (const side of [-1, 1]) rod(dress, gold, [side * 0.14, 0.82, 0.36], [side * 0.19, 1.25, 0.36], 0.006)
  for (let i = 0; i < 7; i++) oval(dress, gold, [0, 0.84 + i * 0.046, 0.408], [0.013, 0.012, 0.009])
  for (const side of [-1, 1]) {
    const collar = oval(dress, white, [side * 0.14, 1.4, 0.59], [0.17, 0.045, 0.1]); collar.rotation.z = side * 0.3
    for (let i = 0; i < 8; i++) oval(dress, white, [side * (0.025 + i * 0.034), 1.35 + i * 0.009, 0.66], [0.023, 0.025, 0.018])
  }
  const chestBow = bow(dress, [0, 1.22, 0.63], 0.45); chestBow.name = 'magic-chest-bow'
  skirt(dress, 0.77, 0.29, 0.24, 0.25, red, false)
  skirt(dress, 0.63, 0.4, 0.32, 0.21, white, true)
  skirt(dress, 0.56, 0.43, 0.35, 0.14, red, false)
  skirt(dress, 0.48, 0.46, 0.38, 0.17, white, true)
  skirt(dress, 0.38, 0.48, 0.4, 0.12, white, true)
  // Pale front apron, waist ribbons and a dressed back with a large bow.
  const apronShape = new THREE.Shape()
  apronShape.moveTo(-0.16, 0.83); apronShape.lineTo(0.16, 0.83)
  apronShape.quadraticCurveTo(0.23, 0.65, 0.3, 0.61)
  apronShape.quadraticCurveTo(0, 0.52, -0.3, 0.61); apronShape.quadraticCurveTo(-0.23, 0.65, -0.16, 0.83)
  const apronGeometry = new THREE.ShapeGeometry(apronShape, 12)
  const apronPoints = apronGeometry.getAttribute('position')
  for (let i = 0; i < apronPoints.count; i++) apronPoints.setZ(i, 0.39 + (0.83 - apronPoints.getY(i)) * 0.36 - apronPoints.getX(i) ** 2 * 0.22)
  apronGeometry.computeVertexNormals(); mesh(dress, apronGeometry, pink)
  for (const side of [-1, 1]) bow(dress, [side * 0.27, 0.83, 0.34], 0.22)
  const backBow = bow(dress, [0, 1.0, -0.17], 0.55); backBow.rotation.y = Math.PI
  // A ruffled red bonnet follows the head joint, keeping the face exposed.
  const bonnet = new THREE.Group(); bonnet.name = 'magic-bonnet'; head.add(bonnet)
  oval(bonnet, red, [0, 1.85, 0.3], [0.31, 0.3, 0.16])
  for (let i = 0; i <= 28; i++) {
    const a = -0.18 * Math.PI + i / 28 * 1.36 * Math.PI
    const x = Math.cos(a), y = Math.sin(a)
    const fold = oval(bonnet, red, [x * 0.34, 1.82 + y * 0.34, 0.4], [0.075, 0.09, 0.045]); fold.rotation.z = a - Math.PI / 2
    const lace = oval(bonnet, white, [x * 0.275, 1.82 + y * 0.275, 0.48], [0.027, 0.039, 0.016]); lace.rotation.z = a - Math.PI / 2
  }
  for (const side of [-1, 1]) {
    bow(bonnet, [side * 0.29, 1.9, 0.53], 0.23, white)
    const ribbon = bow(bonnet, [side * 0.31, 1.71, 0.38], 0.31); ribbon.rotation.z = side * -0.15
  }
  wings.forEach((wing, index) => {
    const side = index === 0 ? -1 : 1
    wing.clear(); wing.position.set(side * 0.33, 1.29, 0.13)
    oval(wing, white, [side * 0.06, -0.07, 0], [0.155, 0.2, 0.17])
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2
      oval(wing, white, [side * 0.05 + Math.cos(a) * 0.14, -0.22, Math.sin(a) * 0.14], [0.038, 0.048, 0.036])
    }
    bow(wing, [side * 0.13, -0.16, 0.145], 0.18)
    oval(wing, feather, [side * 0.09, -0.37, 0.04], [0.1, 0.18, 0.11])
    for (let i = 0; i < 5; i++) oval(wing, feather, [side * (0.05 + i * 0.021), -0.43, 0.03 - i * 0.025], [0.032, 0.16, 0.04])
    if (index === 0) {
      oval(wing, white, [-0.08, -0.42, 0.22], [0.084, 0.1, 0.08])
      for (let i = 0; i < 3; i++) oval(wing, white, [-0.07, -0.38 - i * 0.03, 0.29], [0.075, 0.014, 0.02])
      const wand = new THREE.Group(); wand.name = 'magic-wand'; wand.position.set(-0.08, -0.42, 0.24); wand.rotation.z = 0.13; wing.add(wand)
      rod(wand, pink, [0, -0.68, 0], [0, 0.86, 0], 0.022)
      for (const y of [-0.65, 0.36, 0.7]) rod(wand, gold, [0, y - 0.025, 0], [0, y + 0.025, 0], 0.032)
      const tip = mesh(wand, new THREE.ConeGeometry(0.043, 0.12, 8), gold); tip.position.y = -0.74; tip.rotation.z = Math.PI
      bow(wand, [0, 0.58, 0.04], 0.24)
      const rim = mesh(wand, new THREE.TorusGeometry(0.135, 0.016, 6, 24), gold); rim.position.y = 0.91
      oval(wand, ruby, [0, 0.91, 0], [0.12, 0.12, 0.095])
      heart(wand, [0, 1.13, 0], 0.15)
      // White feathered wings and a hooked bird-beak tip frame the ruby orb.
      for (const sign of [-1, 1]) for (let i = 0; i < 3; i++) {
        const plume = oval(wand, white, [sign * (0.17 + i * 0.036), 0.94 + i * 0.041, 0], [0.09, 0.025, 0.025]); plume.rotation.z = sign * 0.55
      }
      const beakShape = new THREE.Shape()
      beakShape.moveTo(-0.13, 0.94); beakShape.quadraticCurveTo(-0.32, 1.13, -0.36, 1.15)
      beakShape.quadraticCurveTo(-0.24, 1.16, -0.13, 1.05); beakShape.lineTo(-0.13, 0.94)
      mesh(wand, new THREE.ExtrudeGeometry(beakShape, { depth: 0.045, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 1, curveSegments: 10 }), white)
    }
  })
  // Lace stockings follow the independently moving legs; exposed pigeon toes.
  legs.forEach((hip, index) => {
    hip.scale.y = 1.7
    const foot = hip.children[0] as THREE.Group
    oval(foot, white, [0, 0.31, 0], [0.048, 0.19, 0.065])
    bow(foot, [0, 0.11, 0.065], 0.1)
    bow(foot, [0, 0.49, 0.07], 0.11)
    for (let i = 0; i < 8; i++) oval(foot, pink, [Math.sin(i * 2.4) * 0.046, 0.2 + i * 0.028, 0.051], [0.006, 0.008, 0.006])
    for (let toe = -1; toe <= 1; toe++) {
      const nail = oval(foot, ruby, [toe * 0.084, 0.024, 0.285 - Math.abs(toe) * 0.04], [0.014, 0.009, 0.057]); nail.rotation.x = -0.17
    }
    hip.position.x = (index === 0 ? -1 : 1) * 0.18
  })
}
