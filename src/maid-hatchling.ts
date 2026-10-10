import * as THREE from 'three'
import { createBareHatchling } from './hatchling.ts'
import { dressMaid } from './maid.ts'

export function createMaidHatchling() {
  const root = createBareHatchling(false)
  root.name = 'maid-hatchling'
  createSeatedPose(root)
  const headwear = new THREE.Group()
  dressMaid(new THREE.Group(), headwear, [], [], true)
  createSmoothJuniorHair(headwear)
  headwear.scale.setScalar(0.6)
  headwear.position.set(0, 0.08 - 1.77 * 0.6, 0.035 - 0.49 * 0.6)
  root.getObjectByName('hatchling-head')!.add(headwear)
  root.add(createTeaService())
  updateMaidHatchlingTea(root, 0)
  return root
}

function createSeatedPose(root: THREE.Group) {
  const torso = root.getObjectByName('hatchling-torso')!
  torso.position.y = 0.13
  const originalWing = root.getObjectByName('hatchling-left-wing') as THREE.Mesh
  const skin = originalWing.material
  // Keep the newborn's original forward legs and toes in a low seated pose.
  for (const child of [...torso.children]) {
    if (child.name.includes('wing')) {
      torso.remove(child)
      if (child.name === 'hatchling-wing-fold') (child as THREE.Mesh).geometry.dispose()
    }
  }
  const sphere = new THREE.SphereGeometry(1, 16, 12)
  const oval = (parent: THREE.Object3D, p: number[], s: number[]) => {
    const mesh = new THREE.Mesh(sphere, skin)
    mesh.position.set(...p as [number, number, number]); mesh.scale.set(...s as [number, number, number])
    mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh
  }
  for (const side of [-1, 1]) {
    const wing = new THREE.Group()
    wing.name = side < 0 ? 'hatchling-left-wing' : 'hatchling-right-wing'
    wing.position.set(side * 0.09, 0.13, 0.025)
    torso.add(wing)
    // A fixed shoulder overlaps the torso; the wing rotates about this joint.
    oval(torso, [side * 0.09, 0.13, 0.025], [0.044, 0.045, 0.049])
    // The original flattened oval wing bud, hinged at its shoulder tip.
    const shape = new THREE.SphereGeometry(1, 24, 16)
    shape.translate(0, 1, 0)
    const limb = new THREE.Mesh(shape, skin)
    limb.name = 'maid-junior-wing-limb'; limb.castShadow = limb.receiveShadow = true
    limb.scale.set(0.035, 0.12, 0.095)
    wing.add(limb)
  }
}

function createSmoothJuniorHair(headwear: THREE.Group) {
  const hairstyle = headwear.getObjectByName('maid-twintails')!
  // Retain the mother's black hair bows, lace headband and red glasses.
  for (const child of [...hairstyle.children]) {
    if (child instanceof THREE.Mesh) { hairstyle.remove(child); child.geometry.dispose() }
  }
  const brown = new THREE.MeshStandardMaterial({ color: '#493027', roughness: 0.65, side: THREE.DoubleSide })
  const add = (geometry: THREE.BufferGeometry, name: string) => {
    const mesh = new THREE.Mesh(geometry, brown)
    mesh.name = name; mesh.castShadow = mesh.receiveShadow = true; hairstyle.add(mesh); return mesh
  }
  // One rounded wig surface wraps the scalp into a swept fringe, without a flat plate or a seam.
  const capPositions: number[] = [], capIndices: number[] = []
  const capRows = 32, capSides = 64
  for (let row = 0; row <= capRows; row++) for (let i = 0; i <= capSides; i++) {
    const phi = i / capSides * Math.PI * 2
    const front = Math.max(0, Math.sin(phi))
    const edge = 1.65 + front * (0.2 + Math.cos(phi) * 0.18)
    const theta = row / capRows * edge
    capPositions.push(-Math.cos(phi) * Math.sin(theta) * 0.255,
      1.9 + Math.cos(theta) * 0.185, 0.44 + Math.sin(phi) * Math.sin(theta) * 0.275)
    if (row < capRows && i < capSides) {
      const first = row * (capSides + 1) + i, next = first + capSides + 1
      capIndices.push(first, next, first + 1, first + 1, next, next + 1)
    }
  }
  const capGeometry = new THREE.BufferGeometry()
  capGeometry.setAttribute('position', new THREE.Float32BufferAttribute(capPositions, 3))
  capGeometry.setIndex(capIndices); capGeometry.computeVertexNormals()
  add(capGeometry, 'maid-junior-hair-cap')
  for (const side of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.275, 1.99, 0.34), new THREE.Vector3(side * 0.4, 1.63, 0.25),
      new THREE.Vector3(side * 0.51, 1.28, 0.15), new THREE.Vector3(side * 0.57, 1.06, 0.11),
      new THREE.Vector3(side * 0.65, 0.94, 0.1), new THREE.Vector3(side * 0.8, 0.87, 0.14),
      new THREE.Vector3(side * 0.98, 0.849, 0.25), new THREE.Vector3(side * 1.1, 0.84, 0.34),
    ])
    const positions: number[] = [], indices: number[] = []
    const rings = 64, sides = 20
    for (let row = 0; row <= rings; row++) {
      const t = row / rings, center = curve.getPoint(t), tangent = curve.getTangent(t).normalize()
      const flatten = THREE.MathUtils.smoothstep(t, 0.35, 0.72)
      const widthAxis = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, flatten, 1 - flatten)).normalize()
      const depthAxis = new THREE.Vector3().crossVectors(widthAxis, tangent).normalize()
      const width = 0.044 * (1 - t) + 0.1 * Math.sin(Math.PI * t) ** 0.7 + 0.002
      const depth = Math.min(0.075 * (1 - t) + 0.012, Math.max(0.008, center.y - 0.817))
      for (let i = 0; i <= sides; i++) {
        const a = i / sides * Math.PI * 2
        const p = center.clone().addScaledVector(widthAxis, Math.cos(a) * width).addScaledVector(depthAxis, Math.sin(a) * depth)
        p.y = Math.max(0.817, p.y)
        positions.push(p.x, p.y, p.z)
        if (row < rings && i < sides) {
          const first = row * (sides + 1) + i, next = first + sides + 1
          indices.push(first, next, first + 1, first + 1, next, next + 1)
        }
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices); geometry.computeVertexNormals()
    add(geometry, side < 0 ? 'maid-junior-left-tail' : 'maid-junior-right-tail')
  }
}

function createTeaService() {
  const service = new THREE.Group(); service.name = 'maid-tea-service'
  const white = new THREE.MeshStandardMaterial({ color: '#fffdf9', roughness: 0.26, side: THREE.DoubleSide })
  const coffee = new THREE.MeshStandardMaterial({ color: '#382215', roughness: 0.26 })
  const add = (parent: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material) => {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh
  }
  const pot = new THREE.Group(); pot.name = 'maid-junior-teapot'; service.add(pot)
  add(pot, new THREE.SphereGeometry(1, 20, 12), white).scale.set(0.105, 0.085, 0.09)
  add(pot, new THREE.CylinderGeometry(0.06, 0.065, 0.012, 20), white).position.y = 0.085
  const knob = add(pot, new THREE.SphereGeometry(0.016, 12, 8), white); knob.position.y = 0.106
  const spout = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.078, 0.01, 0), new THREE.Vector3(0.12, 0.035, 0),
    new THREE.Vector3(0.155, 0.08, 0), new THREE.Vector3(0.19, 0.11, 0),
  ])
  add(pot, new THREE.TubeGeometry(spout, 20, 0.014, 8, false), white)
  const handle = add(pot, new THREE.TorusGeometry(0.06, 0.012, 8, 20), white)
  handle.position.set(-0.125, 0.008, 0); handle.scale.x = 0.8
  const cup = new THREE.Group(); cup.name = 'maid-junior-teacup'; service.add(cup)
  const profile = [[0,-0.055],[0.04,-0.052],[0.055,-0.015],[0.062,0.043],[0.054,0.043],[0.047,-0.043],[0,-0.043]]
  add(cup, new THREE.LatheGeometry(profile.map(p => new THREE.Vector2(...p as [number, number])), 24), white)
  const rim = add(cup, new THREE.TorusGeometry(0.058, 0.004, 6, 24), white)
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.043
  const cupHandle = add(cup, new THREE.TorusGeometry(0.035, 0.008, 6, 18), white); cupHandle.position.x = 0.071
  add(cup, new THREE.CylinderGeometry(0.088, 0.075, 0.008, 24), white).position.y = -0.059
  const surface = add(cup, new THREE.CircleGeometry(0.048, 24), coffee)
  surface.name = 'maid-coffee-surface'; surface.rotation.x = -Math.PI / 2
  const stream = add(service, new THREE.CylinderGeometry(1, 1, 1, 8), coffee)
  stream.name = 'maid-coffee-stream'; stream.scale.set(0.006, 0.0001, 0.006)
  const steam = new THREE.Group(); steam.name = 'maid-coffee-steam'; cup.add(steam)
  const vapor = new THREE.MeshStandardMaterial({ color: '#b6b6b6', transparent: true, opacity: 0.28, depthWrite: false, roughness: 1 })
  for (let i = 0; i < 3; i++) {
    const path = Array.from({ length: 10 }, (_, j) => new THREE.Vector3((i - 1) * 0.018 + Math.sin(j * 0.8 + i) * 0.008, 0.052 + j * 0.013, 0))
    const wisp = add(steam, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path), 20, 0.0018, 4, false), vapor)
    wisp.castShadow = false
  }
  return service
}

export function updateMaidHatchlingTea(root: THREE.Group, elapsed: number) {
  const reach = THREE.MathUtils.smoothstep(elapsed, 0.08, 0.65)
  const pour = THREE.MathUtils.smoothstep(elapsed, 0.65, 1.2)
  const service = root.getObjectByName('maid-tea-service')!
  service.visible = elapsed > 0.08
  const pot = service.getObjectByName('maid-junior-teapot')!
  const cup = service.getObjectByName('maid-junior-teacup')!
  pot.position.set(THREE.MathUtils.lerp(-0.16, -0.26, reach) + pour * 0.185, 0.25 + reach * 0.15, -0.18 + reach * 0.68)
  pot.rotation.z = -0.62 * pour
  cup.position.set(0.12 + reach * 0.09, 0.21 + reach * 0.045, -0.18 + reach * 0.75)
  {
    root.updateWorldMatrix(true, true)
    // Fixed pivots keep the shoulders attached throughout the entire motion.
    for (const [name, side, prop, handleX] of [
      ['hatchling-left-wing', -1, pot, -0.125],
      ['hatchling-right-wing', 1, cup, 0.071],
    ] as const) {
      const wing = root.getObjectByName(name)!
      const shoulder = wing.position.clone()
      const grip = wing.parent!.worldToLocal(prop.localToWorld(new THREE.Vector3(handleX, 0.008, 0)))
      const restTip = new THREE.Vector3(side * 0.13, 0.01, 0.085)
      grip.lerpVectors(restTip, grip.clone(), reach)
      const direction = grip.clone().sub(shoulder)
      const pose = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
      wing.quaternion.copy(pose)
      wing.getObjectByName('maid-junior-wing-limb')!.scale.y = shoulder.distanceTo(grip) / 2
    }
  }
  const surface = service.getObjectByName('maid-coffee-surface')!
  const fill = THREE.MathUtils.smoothstep(elapsed, 0.8, 2.8)
  surface.position.y = -0.04 + fill * 0.064
  surface.visible = fill > 0
  const stream = service.getObjectByName('maid-coffee-stream')!
  stream.visible = elapsed > 0.85 && elapsed < 3.2
  if (stream.visible) {
    root.updateWorldMatrix(true, true)
    const tip = root.worldToLocal(pot.localToWorld(new THREE.Vector3(0.19, 0.11, 0)))
    const target = root.worldToLocal(cup.localToWorld(new THREE.Vector3(0, surface.position.y, 0)))
    const direction = target.clone().sub(tip)
    stream.position.copy(tip).add(target).multiplyScalar(0.5)
    stream.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize())
    stream.scale.set(0.0055, direction.length(), 0.0055)
  }
  const steam = service.getObjectByName('maid-coffee-steam')!
  steam.visible = elapsed > 0.85
  steam.children.forEach((wisp, i) => {
    wisp.position.x = Math.sin(elapsed * 2 + i) * 0.006
    wisp.position.y = Math.sin(elapsed * 1.5 + i) * 0.008
  })
}

export function stopMaidHatchlingTea(root: THREE.Group) {
  root.getObjectByName('maid-coffee-stream')!.visible = false
  root.getObjectByName('maid-coffee-steam')!.visible = false
}
