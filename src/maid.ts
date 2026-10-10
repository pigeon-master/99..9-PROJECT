import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

export function dressMaid(body: THREE.Group, head: THREE.Group, legs: THREE.Group[], wings: THREE.Group[], headOnly = false) {
  const black = new THREE.MeshStandardMaterial({ color: '#0e0d11', roughness: 0.78, side: THREE.DoubleSide })
  const white = new THREE.MeshStandardMaterial({ color: '#fff8f3', roughness: 0.72, side: THREE.DoubleSide })
  const stocking = new THREE.MeshStandardMaterial({ color: '#eee1e4', roughness: 0.92 })
  const hair = new THREE.MeshStandardMaterial({ color: '#493027', roughness: 0.46 })
  const hairLight = new THREE.MeshStandardMaterial({ color: '#68493c', roughness: 0.42 })
  const hairShade = new THREE.MeshStandardMaterial({ color: '#2c1c18', roughness: 0.5 })
  const gray = new THREE.MeshStandardMaterial({ color: '#85858d', roughness: 0.87 })
  const pearl = new THREE.MeshStandardMaterial({ color: '#eee7d9', roughness: 0.35 })
  function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material) {
    if (!geometry.index) { const indexed = mergeVertices(geometry); geometry.dispose(); geometry = indexed }
    const object = new THREE.Mesh(geometry, material)
    object.castShadow = object.receiveShadow = true; parent.add(object); return object
  }
  function oval(parent: THREE.Object3D, mat: THREE.Material, p: number[], s: number[]) {
    const object = mesh(parent, new THREE.SphereGeometry(1, 12, 8), mat)
    object.position.set(p[0], p[1], p[2]); object.scale.set(s[0], s[1], s[2]); return object
  }
  function tube(parent: THREE.Object3D, mat: THREE.Material, points: number[][], radius: number, segments = 20) {
    return mesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), segments, radius, 6, false), mat)
  }
  function bow(parent: THREE.Object3D, p: number[], size: number, mat: THREE.Material, fullness = 1) {
    const group = new THREE.Group(); group.position.set(p[0], p[1], p[2]); group.scale.setScalar(size); parent.add(group)
    for (const side of [-1, 1]) {
      const shape = new THREE.Shape()
      shape.moveTo(0, 0); shape.bezierCurveTo(side * 0.24, 0.08, side * 0.48, 0.29, side * 0.56, 0.14)
      shape.bezierCurveTo(side * 0.66, -0.27, side * 0.25, -0.17, 0, 0)
      const loopGeometry = new THREE.ExtrudeGeometry(shape, { depth: 0.03 * fullness, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 8 })
      if (fullness > 1) {
        const points = loopGeometry.getAttribute('position')
        for (let i = 0; i < points.count; i++) {
          const puff = Math.sin(Math.min(1, Math.abs(points.getX(i)) / 0.65) * Math.PI) * 0.12 * (fullness - 1)
          points.setY(i, points.getY(i) * fullness)
          points.setZ(i, points.getZ(i) + puff)
        }
        loopGeometry.computeVertexNormals()
      }
      mesh(group, loopGeometry, mat)
      const tail = new THREE.Shape()
      tail.moveTo(side * 0.015, -0.02); tail.lineTo(side * 0.3, -0.55)
      tail.lineTo(side * 0.14, -0.49); tail.lineTo(side * 0.1, -0.57); tail.lineTo(0, -0.05)
      mesh(group, new THREE.ShapeGeometry(tail), mat)
    }
    oval(group, mat, [0, 0, 0.02], [0.09, 0.08, 0.045]); return group
  }
  if (!headOnly) {
    const dress = new THREE.Group(); dress.name = 'maid-dress'; body.add(dress)
    oval(dress, black, [0, 1.04, 0.11], [0.29, 0.4, 0.29])
    oval(dress, white, [0, 1.25, 0.34], [0.245, 0.195, 0.275])
    const bibShape = new THREE.Shape()
    bibShape.moveTo(-0.19, 1.4); bibShape.lineTo(0.19, 1.4)
    bibShape.bezierCurveTo(0.23, 1.24, 0.23, 1.08, 0.14, 1.0)
    bibShape.quadraticCurveTo(0, 0.96, -0.14, 1.0)
    bibShape.bezierCurveTo(-0.23, 1.08, -0.23, 1.24, -0.19, 1.4)
    const bibGeometry = new THREE.ShapeGeometry(bibShape, 16), bibPoints = bibGeometry.getAttribute('position')
    for (let i = 0; i < bibPoints.count; i++) {
      const y = bibPoints.getY(i), x = bibPoints.getX(i)
      bibPoints.setZ(i, 0.625 - Math.max(0, 1.22 - y) * 0.16 - x * x * 0.15)
    }
    bibGeometry.computeVertexNormals(); mesh(dress, bibGeometry, white)
    for (const side of [-1, 1]) {
      // The black bodice straps border a thin white blouse front.
      tube(dress, black, [[side * 0.19, 0.91, 0.4], [side * 0.235, 1.17, 0.51], [side * 0.23, 1.43, 0.43]], 0.035)
      const collar = oval(dress, white, [side * 0.135, 1.4, 0.59], [0.15, 0.033, 0.1]); collar.rotation.z = side * 0.25
      for (let i = 0; i < 8; i++) oval(dress, white, [side * (0.02 + i * 0.032), 1.35 + i * 0.009, 0.65], [0.018, 0.02, 0.011])
    }
    for (let i = 0; i < 5; i++) {
      const y = 1.03 + i * 0.047
      oval(dress, pearl, [0, y, 0.637 - Math.max(0, 1.22 - y) * 0.16], [0.009, 0.009, 0.007])
    }
    const neckBow = bow(dress, [0, 1.31, 0.67], 0.27, black, 1.2)
    neckBow.name = 'maid-neck-bow'
    const waistband = mesh(dress, new THREE.CylinderGeometry(0.305, 0.3, 0.105, 32), white)
    waistband.position.set(0, 0.84, 0.1); waistband.scale.z = 0.94
    function skirt(y: number, rx: number, rz: number, height: number, mat: THREE.Material, lace: boolean) {
      const positions: number[] = [], uvs: number[] = [], indices: number[] = []
      const segments = 96, rows = 5
      const point = (a: number, t: number) => {
        const pleat = Math.sin(a * 16) * 0.028 * t
        return [Math.cos(a) * (rx + t * 0.24 + pleat), y - t * height + Math.cos(a * 16) * 0.015 * t,
          0.1 + Math.sin(a) * (rz + t * 0.21 + pleat)]
      }
      for (let row = 0; row <= rows; row++) for (let i = 0; i <= segments; i++) {
        positions.push(...point(i / segments * Math.PI * 2, row / rows)); uvs.push(i / segments, row / rows)
        if (row < rows && i < segments) {
          const a = row * (segments + 1) + i, b = a + segments + 1
          indices.push(a, b, a + 1, a + 1, b, b + 1)
        }
      }
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
      geometry.setIndex(indices); geometry.computeVertexNormals(); mesh(dress, geometry, mat)
      if (lace) for (let i = 0; i < 56; i++) {
        const a = i / 56 * Math.PI * 2, p = point(a, 0.97)
        const loop = mesh(dress, new THREE.TorusGeometry(0.024, 0.005, 4, 8), white)
        loop.position.set(p[0], p[1] - 0.025, p[2]); loop.rotation.y = Math.PI / 2 - a
      }
    }
    skirt(0.77, 0.32, 0.25, 0.43, white, true)
    skirt(0.81, 0.3, 0.24, 0.38, black, false)
    const apron = new THREE.Group(); apron.name = 'maid-apron'; dress.add(apron)
    const outline = new THREE.Shape()
    outline.moveTo(-0.18, 0.89); outline.lineTo(0.18, 0.89)
    outline.quadraticCurveTo(0.25, 0.68, 0.38, 0.54); outline.quadraticCurveTo(0, 0.39, -0.38, 0.54)
    outline.quadraticCurveTo(-0.25, 0.68, -0.18, 0.89)
    const apronDepth = (x: number, y: number) => 0.405 + (0.89 - y) * 0.56 - x ** 2 * 0.65
    const geometry = new THREE.ShapeGeometry(outline, 16), points = geometry.getAttribute('position')
    for (let i = 0; i < points.count; i++) points.setZ(i, apronDepth(points.getX(i), points.getY(i)))
    geometry.computeVertexNormals(); mesh(apron, geometry, white)
    for (let i = 0; i < 42; i++) {
      const p = outline.getPoint(i / 42)
      const lace = mesh(apron, new THREE.TorusGeometry(0.02, 0.004, 4, 8), white)
      lace.position.set(p.x, p.y, apronDepth(p.x, p.y) + 0.004)
    }
    const backBow = bow(dress, [0, 0.84, -0.24], 0.47, white); backBow.rotation.y = Math.PI
    }
  const hairstyle = new THREE.Group(); hairstyle.name = 'maid-twintails'; head.add(hairstyle)
  oval(hairstyle, hair, [0, 1.95, 0.44], [0.238, 0.123, 0.24])
  for (let i = 0; i < 11; i++) {
    const x = (i - 5) * 0.036
    tube(hairstyle, i % 3 === 0 ? hairLight : hair,
      [[x * 0.7, 2.045, 0.47], [x, 1.99, 0.61], [x * 1.05, 1.885 + Math.abs(x) * 0.12, 0.67]], 0.023, 12)
  }
  for (const side of [-1, 1]) {
    bow(hairstyle, [side * 0.265, 1.99, 0.42], 0.19, black)
    // Long, broad silky tails flare out gently and curl inward near the ankles.
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.275, 1.99, 0.34),
      new THREE.Vector3(side * 0.4, 1.58, 0.21),
      new THREE.Vector3(side * 0.53, 0.95, 0.16),
      new THREE.Vector3(side * 0.64, 0.4, 0.1),
      new THREE.Vector3(side * 0.56, 0.01, 0.13),
      new THREE.Vector3(side * 0.47, -0.14, 0.18),
    ])
    const section = (t: number) => ({
      width: 0.045 * (1 - t) + 0.135 * Math.sin(Math.PI * t) ** 0.6 + 0.004,
      depth: (0.055 + 0.095 * Math.sin(Math.PI * t)) * (1 - t) ** 0.24 + 0.004,
    })
    const positions: number[] = [], indices: number[] = [], uvs: number[] = []
    const rings = 32, sides = 10
    for (let row = 0; row <= rings; row++) {
      const t = row / rings, center = curve.getPoint(t), { width, depth } = section(t)
      for (let i = 0; i <= sides; i++) {
        const a = i / sides * Math.PI * 2
        positions.push(center.x + Math.cos(a) * width, center.y, center.z + Math.sin(a) * depth)
        uvs.push(i / sides, t)
        if (row < rings && i < sides) {
          const first = row * (sides + 1) + i, next = first + sides + 1
          indices.push(first, first + 1, next, first + 1, next + 1, next)
        }
      }
    }
    const tailGeometry = new THREE.BufferGeometry()
    tailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    tailGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    tailGeometry.setIndex(indices); tailGeometry.computeVertexNormals()
    mesh(hairstyle, tailGeometry, hair)
    for (const strand of [-0.55, 0, 0.55]) {
      const path: number[][] = []
      for (let i = 0; i <= 28; i++) {
        const t = i / 28 * 0.97, center = curve.getPoint(t), { width, depth } = section(t)
        path.push([center.x + strand * width, center.y, center.z + depth * Math.sqrt(1 - strand * strand) + 0.002])
      }
      tube(hairstyle, strand === 0 ? hairLight : hairShade, path, 0.0035, 28)
    }
  }
  const headband = new THREE.Group(); headband.name = 'maid-lace-headband'; head.add(headband)
  for (let i = 0; i <= 20; i++) {
    const a = i / 20 * Math.PI, x = Math.cos(a), y = Math.sin(a)
    const fold = oval(headband, white, [x * 0.26, 1.92 + y * 0.22, 0.48], [0.035, 0.063, 0.02]); fold.rotation.z = a - Math.PI / 2
    const lace = mesh(headband, new THREE.TorusGeometry(0.023, 0.004, 4, 8), white)
    lace.position.set(x * 0.282, 1.92 + y * 0.26, 0.5)
  }
  // Rounded rectangular burgundy frames wrap around the pigeon's lateral eyes.
  const glasses = new THREE.Group(); glasses.name = 'maid-glasses'; head.add(glasses)
  const frame = new THREE.MeshStandardMaterial({ color: '#981b37', roughness: 0.24, metalness: 0.12 })
  const lens = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.12, transparent: true, opacity: 0.045, depthWrite: false, side: THREE.DoubleSide })
  const rim = new THREE.Shape()
  rim.moveTo(-0.075, 0.06); rim.lineTo(0.07, 0.065)
  rim.quadraticCurveTo(0.1, 0.065, 0.1, 0.04); rim.lineTo(0.095, -0.035)
  rim.quadraticCurveTo(0.09, -0.06, 0.065, -0.06); rim.lineTo(-0.07, -0.058)
  rim.quadraticCurveTo(-0.1, -0.056, -0.1, -0.03); rim.lineTo(-0.1, 0.03)
  rim.quadraticCurveTo(-0.1, 0.058, -0.075, 0.06)
  for (const side of [-1, 1]) {
    const eyepiece = new THREE.Group(); glasses.add(eyepiece)
    eyepiece.position.set(side * 0.233, 1.814, 0.628)
    eyepiece.rotation.y = side * 0.95
    const path = rim.getPoints(10).slice(0, -1).map(p => new THREE.Vector3(p.x, p.y, 0))
    mesh(eyepiece, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path, true), 48, 0.009, 6, true), frame)
    mesh(eyepiece, new THREE.ShapeGeometry(rim, 10), lens).castShadow = false
    tube(glasses, frame, [[side * 0.288, 1.814, 0.55], [side * 0.273, 1.806, 0.43], [side * 0.225, 1.775, 0.31]], 0.008, 16)
  }
  tube(glasses, frame, [[-0.175, 1.814, 0.71], [-0.09, 1.835, 0.773], [0, 1.835, 0.8], [0.09, 1.835, 0.773], [0.175, 1.814, 0.71]], 0.008, 24)
  wings.forEach((wing, index) => {
    const side = index === 0 ? -1 : 1
    wing.clear(); wing.position.set(side * 0.33, 1.29, 0.13)
    oval(wing, white, [side * 0.065, -0.065, 0], [0.15, 0.19, 0.17])
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2
      oval(wing, white, [side * 0.06 + Math.cos(a) * 0.14, -0.23, Math.sin(a) * 0.14], [0.03, 0.043, 0.03])
    }
    oval(wing, gray, [side * 0.075, -0.38, 0.04], [0.11, 0.2, 0.11])
    for (let i = 0; i < 6; i++) {
      const plume = oval(wing, gray, [side * (0.035 + i * 0.025), -0.44, -i * 0.019], [0.032, 0.19 - i * 0.01, 0.04]); plume.rotation.z = -side * 0.08
    }
  })
  legs.forEach((hip, index) => {
    hip.scale.y = 1.7; hip.position.x = (index === 0 ? -1 : 1) * 0.18
    const foot = hip.children[0] as THREE.Group
    oval(foot, stocking, [0, 0.29, 0.006], [0.047, 0.2, 0.064])
    for (const y of [0.105, 0.48]) {
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2
        oval(foot, white, [Math.cos(a) * 0.05, y, Math.sin(a) * 0.055], [0.012, 0.014, 0.012])
      }
    }
    bow(foot, [0, 0.47, 0.063], 0.085, black)
    for (let toe = -1; toe <= 1; toe++) {
      oval(foot, white, [toe * 0.084, 0.044, 0.245 - Math.abs(toe) * 0.04], [0.024, 0.013, 0.018])
    }
  })
}
