import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

// Accessories use existing body/head joints and are batched with their parent.
export function dressBaby(body: THREE.Group, head: THREE.Group, wings: THREE.Group[]) {
  const plastic = new THREE.MeshStandardMaterial({ color: '#86c9ec', roughness: 0.36 })
  const plasticEdge = new THREE.MeshStandardMaterial({ color: '#68a8c8', roughness: 0.42 })
  const blue = new THREE.MeshStandardMaterial({ color: '#97c6df', roughness: 0.28 })
  const cotton = new THREE.MeshStandardMaterial({ color: '#fffdf5', roughness: 0.98 })
  const mint = new THREE.MeshStandardMaterial({ color: '#b1dfd9', roughness: 0.93 })
  const seam = new THREE.MeshStandardMaterial({ color: '#e4e9df', roughness: 1 })
  const marking = new THREE.MeshStandardMaterial({ color: '#464b51', roughness: 0.85 })
  const mesh = (parent: THREE.Group, geometry: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[]) => {
    // Extruded shields and rounded parts need matching indexing for batching.
    const indexed = geometry.index ? geometry : mergeVertices(geometry)
    if (indexed !== geometry) geometry.dispose()
    const object = new THREE.Mesh(indexed, mat)
    object.castShadow = object.receiveShadow = true
    parent.add(object)
    return object
  }
  const oval = (parent: THREE.Group, mat: THREE.Material, p: number[], s: number[]) => {
    const object = mesh(parent, new THREE.SphereGeometry(1, 16, 10), mat)
    object.position.set(p[0], p[1], p[2])
    object.scale.set(s[0], s[1], s[2])
    return object
  }
  const stitch = (points: THREE.Vector3[], radius: number, mat: THREE.Material, closed = false) =>
    mesh(diaper, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, closed), 36, radius, 5, closed), mat)

  const pacifier = new THREE.Group()
  pacifier.name = 'baby-pacifier'
  head.add(pacifier)
  // Sky-blue shield and handle, with softly shaded bevels and ventilation holes.
  const shield = new THREE.Shape()
  shield.moveTo(0, 0.13)
  shield.bezierCurveTo(-0.07, 0.21, -0.24, 0.18, -0.23, 0.015)
  shield.bezierCurveTo(-0.22, -0.19, 0.22, -0.19, 0.23, 0.015)
  shield.bezierCurveTo(0.24, 0.18, 0.07, 0.21, 0, 0.13)
  for (const side of [-1, 1]) {
    const hole = new THREE.Path()
    hole.absellipse(side * 0.135, 0.085, 0.026, 0.035, 0, Math.PI * 2, true)
    shield.holes.push(hole)
  }
  mesh(pacifier, new THREE.ExtrudeGeometry(shield, {
    depth: 0.027, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008,
    bevelSegments: 2, curveSegments: 12,
  }), [plastic, plasticEdge]).position.set(0, 1.68, 0.91)
  oval(pacifier, blue, [0, 1.675, 0.975], [0.114, 0.112, 0.065])
  const handle = mesh(pacifier, new THREE.TorusGeometry(0.153, 0.021, 8, 28), plastic)
  handle.position.set(0, 1.59, 1.045)
  handle.scale.y = 0.85
  handle.rotation.x = -0.13
  for (const side of [-1, 1]) oval(pacifier, plastic, [side * 0.14, 1.66, 1.013], [0.027, 0.039, 0.026])

  const diaper = new THREE.Group()
  diaper.name = 'baby-diaper'
  diaper.position.y = 0.16
  // Fit the fuller mid-body so the raised fabric stays outside the plumage.
  diaper.scale.set(1.15, 1, 1.16)
  body.add(diaper)
  oval(diaper, cotton, [0, 0.67, -0.22], [0.40, 0.235, 0.57])
  oval(diaper, cotton, [0, 0.73, -0.56], [0.32, 0.22, 0.26])
  oval(diaper, mint, [0, 0.745, 0.285], [0.285, 0.11, 0.105])
  // Elastic waist follows the lower torso and leaves wings and legs articulated.
  const waist: THREE.Vector3[] = []
  for (let i = 0; i < 40; i++) {
    const a = i / 40 * Math.PI * 2
    waist.push(new THREE.Vector3(Math.cos(a) * 0.378, 0.855 - Math.sin(a) * 0.055, -0.2 + Math.sin(a) * 0.51))
  }
  stitch(waist, 0.045, mint, true)
  for (const side of [-1, 1]) {
    const tab = oval(diaper, mint, [side * 0.385, 0.755, -0.08], [0.04, 0.105, 0.20])
    tab.rotation.x = -0.28
    oval(diaper, cotton, [side * 0.414, 0.76, 0.01], [0.015, 0.07, 0.11])
    // Gathered seams around each leg opening, not attached to the kicking feet.
    const cuff: THREE.Vector3[] = []
    for (let i = 0; i <= 28; i++) {
      const a = i / 28 * Math.PI * 2, ruffle = Math.sin(a * 10) * 0.012
      cuff.push(new THREE.Vector3(side * 0.18 + Math.cos(a) * (0.125 + ruffle),
        0.488 + Math.sin(a) * 0.015, 0.015 + Math.sin(a) * (0.155 + ruffle)))
    }
    stitch(cuff, 0.02, cotton)
    for (let i = 0; i < 5; i++) {
      stitch([new THREE.Vector3(side * 0.32, 0.57 + i * 0.035, -0.48),
        new THREE.Vector3(side * 0.385, 0.6 + i * 0.035, -0.27),
        new THREE.Vector3(side * 0.37, 0.62 + i * 0.035, -0.10)], 0.004, seam)
    }
  }
  // A few broad checker markings evoke the reference without dense feather meshes.
  wings.forEach((wing, index) => {
    const side = index === 0 ? -1 : 1
    for (let row = 0; row < 2; row++) for (let j = 0; j < 4; j++) {
      oval(wing, marking, [side * 0.164, -0.055 - row * 0.105, 0.02 - j * 0.10], [0.013, 0.036, 0.034])
    }
  })
}
