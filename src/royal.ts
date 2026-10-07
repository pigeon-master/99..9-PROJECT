import { createRoyalCrown } from './royal-crown.ts'
import * as THREE from 'three'

// Modest polygon counts; fixed pieces are batched by material at each joint.
export function dressRoyal(body: THREE.Group, neck: THREE.Group, legs: THREE.Group[], wings: THREE.Group[]) {
  const gold = new THREE.MeshStandardMaterial({ color: '#ffdc65', metalness: 0.52, roughness: 0.22, emissive: '#b97708', emissiveIntensity: 0.13 })
  const silver = new THREE.MeshStandardMaterial({ color: '#c6cdd4', metalness: 0.85, roughness: 0.24 })
  const red = new THREE.MeshStandardMaterial({ color: '#b52d40', roughness: 0.65 })
  const olive = new THREE.MeshStandardMaterial({ color: '#414534', roughness: 0.95 })
  const dark = new THREE.MeshStandardMaterial({ color: '#242820', roughness: 0.9 })
  const black = new THREE.MeshStandardMaterial({ color: '#15171b', roughness: 0.28 })
  const purple = new THREE.MeshStandardMaterial({ color: '#6d268e', metalness: 0.25, roughness: 0.18 })
  const feather = new THREE.MeshStandardMaterial({ color: '#626773', roughness: 0.8 })
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
  function bar(parent: THREE.Object3D, mat: THREE.Material, a: number[], b: number[], radius: number) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.sub(start)
    const m = mesh(parent, new THREE.CylinderGeometry(radius, radius, delta.length(), 6), mat, 0, 0, 0)
    m.position.copy(start).addScaledVector(delta, 0.5)
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize())
  }
  const armor = new THREE.Group()
  armor.name = 'royal-armor'
  body.add(armor)
  oval(armor, olive, 0, 0.98, 0.09, 0.30, 0.43, 0.25)
  function flower(parent: THREE.Object3D, x: number, y: number, z: number, radius: number, gem = false) {
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2
      const petal = oval(parent, gold, x + Math.sin(a) * radius * 0.64, y + Math.cos(a) * radius * 0.64, z, radius * 0.23, radius * 0.49, 0.018)
      petal.rotation.z = -a
    }
    oval(parent, gold, x, y, z + 0.012, radius * 0.44, radius * 0.44, 0.025)
    oval(parent, gem ? purple : gold, x, y, z + 0.033, radius * 0.3, radius * 0.3, 0.023)
  }
  for (const side of [-1, 1]) {
    const panel = mesh(armor, new THREE.BoxGeometry(0.23, 0.67, 0.055), red, side * 0.18, 1.11, 0.48)
    panel.rotation.z = side * -0.15
    for (let i = 0; i < 4; i++) {
      const y = 0.86 + i * 0.14
      bar(armor, gold, [side * 0.18, y - 0.06, 0.52], [side * 0.08, y + 0.06, 0.52], 0.014)
      bar(armor, gold, [side * 0.18, y - 0.06, 0.52], [side * 0.29, y + 0.06, 0.52], 0.014)
      flower(armor, side * 0.18, y, 0.53, 0.06)
    }
    bar(armor, gold, [side * 0.3, 0.82, 0.52], [side * 0.23, 1.42, 0.52], 0.018)
  }
  // Three separate red-and-gold tassets, all hanging from the same waist line.
  for (let i = -1; i <= 1; i++) {
    const panel = new THREE.Group()
    panel.name = `royal-waist-panel-${i + 1}`
    panel.position.set(i * 0.225, 0.54, 0.43)
    panel.rotation.z = -i * 0.06
    armor.add(panel)
    mesh(panel, new THREE.BoxGeometry(0.205, 0.37, 0.046), gold, 0, 0, 0)
    mesh(panel, new THREE.BoxGeometry(0.178, 0.34, 0.02), red, 0, 0, 0.03)
    flower(panel, 0, 0.055, 0.05, 0.074)
    for (const side of [-1, 1]) bar(panel, gold, [0, -0.15, 0.052], [side * 0.075, -0.035, 0.052], 0.013)
  }
  const belt = mesh(armor, new THREE.CylinderGeometry(0.34, 0.34, 0.21, 20), gold, 0, 0.79, 0.11)
  belt.scale.z = 1.12
  for (const y of [0.695, 0.885]) {
    const rim = mesh(armor, new THREE.TorusGeometry(0.34, 0.017, 5, 20), gold, 0, y, 0.11)
    rim.rotation.x = Math.PI / 2
    rim.scale.y = 1.12
  }
  oval(armor, gold, 0, 0.79, 0.51, 0.17, 0.105, 0.035)
  flower(armor, 0, 0.79, 0.55, 0.085)
  flower(armor, 0.23, 1.17, 0.57, 0.15, true)
  // The reverse is a fitted gold cuirass, with simpler embossed seams.
  oval(armor, gold, 0, 1.09, -0.18, 0.31, 0.36, 0.12)
  bar(armor, gold, [0, 0.84, -0.30], [0, 1.4, -0.26], 0.022)
  for (const side of [-1, 1]) {
    bar(armor, gold, [0, 1.02, -0.30], [side * 0.24, 1.23, -0.25], 0.023)
    bar(armor, gold, [0, 1.19, -0.30], [side * 0.19, 1.36, -0.23], 0.018)
    mesh(armor, new THREE.BoxGeometry(0.23, 0.3, 0.045), gold, side * 0.16, 0.55, -0.22)
  }
  // A small, crisp Taegeukgi badge on the viewer's left chest.
  const flagCanvas = document.createElement('canvas')
  flagCanvas.width = 192; flagCanvas.height = 128
  const ctx = flagCanvas.getContext('2d')!
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 192, 128)
  ctx.save(); ctx.translate(96, 64); ctx.rotate(0.55)
  ctx.fillStyle = '#cd2e3a'; ctx.beginPath(); ctx.arc(0, 0, 27, Math.PI, 0); ctx.arc(13.5, 0, 13.5, 0, Math.PI); ctx.arc(-13.5, 0, 13.5, 0, Math.PI, true); ctx.fill()
  ctx.fillStyle = '#0047a0'; ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI); ctx.arc(-13.5, 0, 13.5, Math.PI, 0); ctx.arc(13.5, 0, 13.5, Math.PI, 0, true); ctx.fill(); ctx.restore()
  const trigrams = [{x:44,y:30,a:-0.58,b:[false,false,false]}, {x:148,y:98,a:-0.58,b:[true,true,true]}, {x:148,y:30,a:0.58,b:[true,false,true]}, {x:44,y:98,a:0.58,b:[false,true,false]}]
  ctx.fillStyle = '#111'
  for (const t of trigrams) {
    ctx.save(); ctx.translate(t.x,t.y); ctx.rotate(t.a)
    t.b.forEach((broken, i) => { const x = (i - 1) * 7; if (broken) { ctx.fillRect(x-2,-16,4,13); ctx.fillRect(x-2,3,4,13) } else ctx.fillRect(x-2,-16,4,32) })
    ctx.restore()
  }
  const flagTexture = new THREE.CanvasTexture(flagCanvas)
  flagTexture.colorSpace = THREE.SRGBColorSpace
  const badge = new THREE.Group(); badge.name = 'royal-taegeukgi'; armor.add(badge)
  mesh(badge, new THREE.BoxGeometry(0.225, 0.153, 0.025), gold, -0.22, 1.22, 0.565)
  mesh(badge, new THREE.PlaneGeometry(0.21, 0.14), new THREE.MeshStandardMaterial({map: flagTexture, roughness: 0.7}), -0.22, 1.22, 0.58)
  wings.forEach((wing, index) => {
    const side = index === 0 ? -1 : 1
    wing.clear()
    wing.position.set(side * 0.35, 1.25, 0.14)
    oval(wing, olive, side * 0.07, -0.22, 0, 0.125, 0.3, 0.13)
    oval(wing, gold, side * 0.06, 0, 0, 0.27, 0.08, 0.25)
    for (let j = 0; j < 4; j++) {
      bar(wing, gold, [side * (0.08 + j * 0.045), -0.03, 0.12], [side * (0.1 + j * 0.06), -0.23 - j * 0.015, 0.12], 0.02)
      mesh(wing, new THREE.CylinderGeometry(0.105, 0.11, 0.04, 10), gold, side * 0.1, -0.32 - j * 0.055, 0.02)
    }
    oval(wing, feather, side * 0.1, -0.58, 0.025, 0.08, 0.12, 0.075)
    if (index === 0) {
      const sword = new THREE.Group()
      sword.name = 'royal-sword'
      sword.position.set(side * 0.1, -0.57, 0.12)
      sword.rotation.z = -0.1
      wing.add(sword)
      bar(sword, black, [0, 0.1, 0], [0, -0.12, 0], 0.036)
      oval(sword, gold, 0, 0.11, 0, 0.055, 0.05, 0.055)
      bar(sword, gold, [-0.18, -0.12, 0], [0.18, -0.12, 0], 0.03)
      const blade = mesh(sword, new THREE.ConeGeometry(0.085, 0.8, 4), silver, 0, -0.54, 0)
      blade.rotation.z = Math.PI
      blade.scale.z = 0.32
      bar(sword, gold, [0, -0.14, 0.026], [0, -0.85, 0.01], 0.009)
    }
  })
  legs.forEach(hip => {
    hip.scale.y = 1.7
    const leg = hip.children[0]
    oval(leg, olive, 0, 0.39, 0, 0.14, 0.17, 0.14)
    for (let j = 0; j < 5; j++) oval(leg, dark, Math.sin(j * 2) * 0.09, 0.3 + j * 0.035, 0.11, 0.055, 0.025, 0.025)
    mesh(leg, new THREE.CylinderGeometry(0.084, 0.067, 0.23, 10), black, 0, 0.185, 0.015)
    for (const y of [0.085, 0.29]) mesh(leg, new THREE.CylinderGeometry(0.089, 0.089, 0.025, 10), gold, 0, y, 0.015)
  })
  const crown = createRoyalCrown()
  crown.position.set(0, 1.96, 0.49)
  neck.add(crown)
  for (const side of [-1, 1]) {
    oval(neck, black, side * 0.13, 1.82, 0.7, 0.14, 0.065, 0.035)
    bar(neck, black, [side * 0.24, 1.82, 0.69], [side * 0.23, 1.83, 0.47], 0.018)
  }
  bar(neck, gold, [-0.035, 1.83, 0.72], [0.035, 1.83, 0.72], 0.012)
}

