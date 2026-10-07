import * as THREE from 'three'
import { createFlexibleNeck, updateFlexibleNeck } from './neck'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { dressGyaru } from './gyaru'
import { dressBaby } from './baby'
import { dressRoyal } from './royal'
import { createBabyWalker, type BabyWalker } from './walker'

export interface Pigeon {
  id: number
  style: 'classic' | 'gyaru' | 'baby' | 'walker' | 'royal'
  walker: BabyWalker | null
  name: string
  root: THREE.Group
  body: THREE.Group
  neck: THREE.Group
  neckBridge: THREE.Mesh
  legs: THREE.Group[]
  wings: THREE.Group[]
  heading: number
  speed: number
  phase: number
  turnTimer: number
  target: THREE.Vector3
  velocityY: number
}

const sphere = new THREE.SphereGeometry(1, 24, 18)
const featherSphere = new THREE.SphereGeometry(1, 10, 6)
// Fine feather filaments break up the smooth surfaces without external textures.
const featherCanvas = document.createElement('canvas')
featherCanvas.width = featherCanvas.height = 256
const featherContext = featherCanvas.getContext('2d')!
featherContext.fillStyle = '#e3e3e3'
featherContext.fillRect(0, 0, 256, 256)
let seed = 7251
const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
for (let i = 0; i < 18000; i++) {
  const value = 160 + Math.floor(random() * 85)
  featherContext.fillStyle = `rgba(${value},${value},${value},0.32)`
  featherContext.fillRect(random() * 256, random() * 256, 1, 1 + random() * 4)
}
for (let row = 0; row < 12; row++) {
  for (let column = 0; column < 10; column++) {
    const x = column * 28 + row % 2 * 14, y = row * 24
    featherContext.strokeStyle = 'rgba(80,80,80,0.16)'
    featherContext.lineWidth = 0.8
    featherContext.beginPath()
    featherContext.moveTo(x - 13, y - 7)
    featherContext.quadraticCurveTo(x, y + 24, x + 13, y - 7)
    featherContext.stroke()
  }
}
const featherTexture = new THREE.CanvasTexture(featherCanvas)
featherTexture.colorSpace = THREE.SRGBColorSpace
const bumpTexture = featherTexture.clone()
bumpTexture.colorSpace = THREE.NoColorSpace
const palettes = [
  { body: '#50565e', wing: '#656c75', head: '#383e46', bar: '#292e35', neck: '#365b55', name: '차콜' },
  { body: '#8d8178', wing: '#b4a397', head: '#685b55', bar: '#51403a', neck: '#796668', name: '시나몬' },
  { body: '#ecebe5', wing: '#f5f3ec', head: '#e7e6df', bar: '#bcbdb7', neck: '#ccd0c4', name: '아이보리' },
]
function material(color: string, roughness = 0.78) {
  return new THREE.MeshStandardMaterial({ color, roughness })
}
function ellipsoid(parent: THREE.Object3D, mat: THREE.Material, p: number[], s: number[], rotation = 0) {
  const mesh = new THREE.Mesh(Math.min(...s) < 0.05 ? featherSphere : sphere, mat)
  mesh.position.set(p[0], p[1], p[2])
  mesh.scale.set(s[0], s[1], s[2])
  mesh.rotation.x = rotation
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}
// Batch fixed details within each joint, retaining independent animated body parts.
function batchDetails(group: THREE.Group) {
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>()
  for (const child of [...group.children]) {
    if (child instanceof THREE.Group) batchDetails(child)
    if (!(child instanceof THREE.Mesh) || Array.isArray(child.material)) continue
    child.updateMatrix()
    const geometry = child.geometry.clone().applyMatrix4(child.matrix)
    const list = batches.get(child.material) ?? []
    list.push(geometry)
    batches.set(child.material, list)
    group.remove(child)
    if (child.geometry !== sphere && child.geometry !== featherSphere) child.geometry.dispose()
  }
  for (const [mat, geometries] of batches) {
    const merged = mergeGeometries(geometries)
    for (const geometry of geometries) geometry.dispose()
    if (!merged) continue
    const mesh = new THREE.Mesh(merged, mat)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  }
}
function rod(parent: THREE.Object3D, mat: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, radius: number) {
  const delta = b.clone().sub(a)
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.72, radius, delta.length(), 7), mat)
  mesh.position.copy(a).add(b).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize())
  mesh.castShadow = true
  parent.add(mesh)
}
export function createPigeon(id: number, style: Pigeon['style'] = 'classic'): Pigeon {
  const isBaby = style === 'baby' || style === 'walker'
  const palette = isBaby
    ? { body: '#81878e', wing: '#a5abb1', head: '#535962', bar: '#41464e', neck: '#42665c', name: '쪽쪽이 아기' }
    : palettes[style === 'gyaru' || style === 'royal' ? 0 : id % palettes.length]
  const root = new THREE.Group()
  root.userData.bird = id
  const size = style === 'royal' ? 0.98 : isBaby ? 0.73 : 0.73 + (id * 7 % 11) / 34
  root.scale.setScalar(size * (isBaby ? 1.1 : 1))
  const body = new THREE.Group()
  root.add(body)
  const plumage = material(palette.body)
  const wingMat = material(palette.wing)
  for (const mat of [plumage, wingMat]) {
    mat.map = featherTexture
    mat.bumpMap = bumpTexture
    mat.bumpScale = 0.035
    mat.color.offsetHSL((id - 10) * 0.001, 0, (id % 4 - 1.5) * 0.014)
  }
  const dark = material(palette.bar)
  const headMat = material(palette.head, 0.64)
  const feetMat = material(id % 3 === 0 ? '#9c5559' : '#bd7376', 0.65)
  const clawMat = material('#514846')
  const iridescence = new THREE.MeshPhysicalMaterial({ color: palette.neck, roughness: 0.48, metalness: 0.2, iridescence: 0.85, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 430], bumpMap: bumpTexture, bumpScale: 0.025 })
  ellipsoid(body, plumage, [0, 0.94, style === 'royal' ? 0.08 : -0.03], style === 'royal' ? [0.27, 0.43, 0.23] : [0.38, 0.46, 0.68], style === 'royal' ? 0 : -0.25)
  ellipsoid(body, plumage, [0, 1.12, style === 'royal' ? 0.2 : 0.35], style === 'royal' ? [0.25, 0.30, 0.18] : [0.31, 0.40, 0.37], -0.18)
  for (let j = 0; j < 5; j++) {
    const feather = style === 'royal'
      ? ellipsoid(body, dark, [(j - 2) * 0.063, 0.51, -0.43], [0.054, 0.026, 0.29], -0.48)
      : ellipsoid(body, dark, [(j - 2) * 0.086, 0.69, -0.84], [0.071, 0.026, 0.43], -0.17)
    feather.rotation.y = (j - 2) * 0.06
  }
  const wings: THREE.Group[] = []
  for (const side of [-1, 1]) {
    const wing = new THREE.Group()
    wing.position.set(side * 0.28, 1.13, 0.12)
    body.add(wing)
    wings.push(wing)
    ellipsoid(wing, wingMat, [side * 0.047, -0.10, -0.21], [0.122, 0.285, 0.54], -0.23)
    // Five broader flight feathers retain the silhouette and flapping joint.
    for (let j = 0; j < 5; j++) {
      const feather = ellipsoid(wing, wingMat, [side * (0.105 + j * 0.0135), -0.19 + j * 0.05175, -0.40 - j * 0.027], [0.035, 0.061, 0.36 - j * 0.02925], -0.25 - j * 0.0405)
      feather.rotation.y = side * -0.07
    }
    // Two continuous markings replace the many overlapping covert meshes.
    for (let stripe = 0; stripe < 2; stripe++) {
      ellipsoid(wing, dark, [side * 0.154, -0.115, -0.14 - stripe * 0.15], [0.018, 0.145, 0.031], -0.25)
    }
  }
  const neck = new THREE.Group()
  body.add(neck)
  ellipsoid(neck, headMat, [0, 1.77, 0.49], [0.224, 0.229, 0.275], 0.05)
  ellipsoid(neck, headMat, [0, 1.68, 0.64], [0.15, 0.135, 0.19])
  const beakMat = material('#57565a', 0.57)
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.072, 0.255, 14), beakMat)
  beak.rotation.x = Math.PI / 2 + 0.14
  beak.position.set(0, 1.70, 0.825)
  beak.castShadow = true
  neck.add(beak)
  ellipsoid(neck, material('#d4d1cb'), [0, 1.754, 0.742], [0.074, 0.05, 0.086])
  const eyeRing = material('#bfa5a0')
  const iris = material(palette.name === '아이보리' ? '#5f3933' : '#c87b32', 0.45)
  const pupil = material('#101010', 0.16)
  const glint = new THREE.MeshBasicMaterial({ color: '#ffffff' })
  for (const side of [-1, 1]) {
    ellipsoid(neck, eyeRing, [side * 0.204, 1.807, 0.588], [0.025, 0.051, 0.052])
    ellipsoid(neck, iris, [side * 0.221, 1.807, 0.59], [0.017, 0.037, 0.038])
    ellipsoid(neck, pupil, [side * 0.234, 1.808, 0.595], [0.011, 0.022, 0.023])
    ellipsoid(neck, glint, [side * 0.242, 1.820, 0.603], [0.005, 0.008, 0.008])
  }
  const legs: THREE.Group[] = []
  for (const side of [-1, 1]) {
    const hip = new THREE.Group()
    hip.position.set(side * (style === 'royal' ? 0.21 : 0.145), 0.48, 0.035)
    root.add(hip)
    const leg = new THREE.Group()
    leg.position.y = -0.48
    hip.add(leg)
    legs.push(hip)
    rod(leg, feetMat, new THREE.Vector3(0, 0.52, 0), new THREE.Vector3(0, 0.29, -0.055), 0.031)
    rod(leg, feetMat, new THREE.Vector3(0, 0.29, -0.055), new THREE.Vector3(0, 0.065, 0.055), 0.024)
    for (let toe = -1; toe <= 1; toe++) {
      const tip = new THREE.Vector3(toe * 0.084, 0.031, 0.25 - Math.abs(toe) * 0.04)
      rod(leg, feetMat, new THREE.Vector3(0, 0.055, 0.055), tip, 0.015)
      rod(leg, clawMat, tip, tip.clone().add(new THREE.Vector3(0, -0.01, 0.043)), 0.009)
    }
    rod(leg, feetMat, new THREE.Vector3(0, 0.055, 0.05), new THREE.Vector3(side * 0.025, 0.025, -0.10), 0.014)
    for (let j = 0; j < 5; j++) ellipsoid(leg, feetMat, [0, 0.095 + j * 0.034, 0.042 - j * 0.015], [0.029, 0.009, 0.024])
  }
  const heading = Math.random() * Math.PI * 2
  root.rotation.y = heading
  if (style === 'gyaru') dressGyaru(body, neck, legs.map(hip => hip.children[0] as THREE.Group))
  if (isBaby) dressBaby(body, neck, wings)
  if (style === 'royal') dressRoyal(body, neck, legs, wings)
  const walker = style === 'walker' ? createBabyWalker(root) : null
  batchDetails(root)
  const neckBridge = createFlexibleNeck(iridescence)
  body.add(neckBridge)
  updateFlexibleNeck(neckBridge, neck)
  return { id, style, walker, name: `${style === 'royal' ? '자르반' : style === 'walker' ? '보행기 아기' : style === 'gyaru' ? '핑크 갸루' : palette.name} ${String(id + 1).padStart(2, '0')}`, root, body, neck, neckBridge, legs, wings, heading, speed: 1.0 + Math.random() * 0.75, phase: Math.random() * Math.PI * 2, turnTimer: Math.random() * 3, target: new THREE.Vector3(), velocityY: 0 }
}
