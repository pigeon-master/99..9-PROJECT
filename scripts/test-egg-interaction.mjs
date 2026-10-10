import assert from 'node:assert/strict'
import * as THREE from 'three'
import { HoldEffects } from '../src/hold-effects.ts'
import { EggFocus } from '../src/egg-focus.ts'
import { pickSceneTarget } from '../src/picking.ts'
import { fragmentBottom } from '../src/egg-fragments.ts'

function assertChickClearance(focus) {
  const chick = focus.scene.getObjectByName('royal-hatchling') || focus.scene.getObjectByName('baby-hatchling') || focus.scene.getObjectByName('maid-hatchling')
  if (!chick) return
  focus.scene.updateMatrixWorld(true)
  const body = new THREE.Box3().setFromObject(chick, true)
  for (const piece of focus.scene.getObjectByName('egg-fragments').children) {
    const shell = new THREE.Box3().setFromObject(piece, true)
    assert.ok(shell.max.x < body.min.x || shell.min.x > body.max.x, 'Falling shell never overlaps the chick silhouette')
  }
}

for (const style of ['gyaru', 'magic', 'maid', 'baby', 'walker', 'royal']) {
const scene = new THREE.Scene()
const effects = new HoldEffects(scene)
const body = new THREE.Group()
body.position.y = 2.8
const bird = { style, body }
for (let i = 0; i < 720; i++) effects.update(bird, 0.01)
effects.release()
for (let i = 0; i < 1500; i++) effects.update(null, 0.01)
const egg = effects.eggs[0]
egg.mesh.position.x = egg.mesh.position.z = 0
const origin = egg.mesh.position.clone()
egg.hovered = true
for (let i = 0; i < 50; i++) effects.update(null, 0.01)
assert.ok(egg.mesh.scale.x > 1.49 && egg.mesh.scale.x <= 1.5, 'Hover grows the egg to 1.5 times its original size')
assert.equal(egg.mesh.position.x, origin.x)
assert.equal(egg.mesh.position.z, origin.z)
egg.mesh.updateMatrixWorld(true)
const ray = new THREE.Raycaster(new THREE.Vector3(0, origin.y, 5), new THREE.Vector3(0, 0, -1))
assert.equal(pickSceneTarget(ray, [], effects.eggs)?.egg, egg)
const blocker = new THREE.Group()
blocker.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()))
blocker.position.set(0, origin.y, 2)
blocker.updateMatrixWorld(true)
const frontBird = { root: blocker }
assert.equal(pickSceneTarget(ray, [frontBird], effects.eggs)?.kind, 'bird', 'A bird in front blocks the egg')
blocker.position.x = 2
blocker.updateMatrixWorld(true)
assert.equal(pickSceneTarget(ray, [frontBird], effects.eggs)?.kind, 'egg', 'Moving the bird reveals the egg')
blocker.position.set(0, origin.y, -2)
blocker.updateMatrixWorld(true)
assert.equal(pickSceneTarget(ray, [frontBird], effects.eggs)?.kind, 'egg', 'A bird behind the egg does not block it')
egg.landed = false
assert.equal(pickSceneTarget(ray, [], effects.eggs), null, 'Airborne eggs cannot be picked')
egg.landed = true

const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 100)
camera.position.set(0, 6, 10)
camera.lookAt(0, 0, 0)
camera.updateMatrixWorld(true)
const focus = new EggFocus()
focus.resize(1440, 1000)
focus.open(egg, camera)
assert.ok(egg.selected && !egg.mesh.visible, 'Flight removes the ground duplicate')
assert.equal(pickSceneTarget(ray, [], effects.eggs), null)
const startSize = focus.shell.scale.x
focus.crack()
assert.equal(egg.cracked, false, 'Cannot crack before arrival')
focus.update(0.225)
assert.ok(!focus.ready, 'Cannot interact halfway through the faster flight')
assert.ok(Math.abs(focus.background.amount - 0.5) < 1e-6, 'Radial fade advances with the 0.45-second egg flight')
const halfwaySize = focus.shell.scale.x
focus.update(0.226)
assert.ok(focus.ready)
assert.ok(new THREE.Box3().setFromObject(focus.shell, true).getCenter(new THREE.Vector3()).length() < 1e-6, 'Actual shell silhouette reaches exact screen center')
assert.ok(focus.shell.scale.x - halfwaySize > (halfwaySize - startSize) * 3, 'Growth accelerates near the center')
const size = new THREE.Box3().setFromObject(focus.shell, true).getSize(new THREE.Vector3())
const area = size.x * size.y / (4 * 1.44)
assert.ok(area > 0.28 && area < 0.31, 'Linear size reduced by 30%, area reduced to 49% of previous area')
assert.equal(focus.shell.getObjectByName('egg-soft-outline'), undefined, 'Focused egg has natural shading without an enlarged outline')
assert.ok(focus.hit(new THREE.Vector2(0, 0)))
for (const [index, pointer] of [new THREE.Vector2(0.12, 0.08), new THREE.Vector2(-0.12, -0.08), new THREE.Vector2(0.04, -0.1)].entries()) {
  focus.crack(pointer)
  assert.equal(focus.hitCount, index + 1)
  const impact = focus.shell.getObjectByName(`egg-impact-${index + 1}`)
  assert.ok(impact)
  const projected = new THREE.Vector3(...impact.userData.impact).applyMatrix4(focus.shell.matrixWorld).project(focus.camera)
  assert.ok(Math.hypot(projected.x - pointer.x, projected.y - pointer.y) < 1e-6, 'Cracks originate at the exact clicked surface point')
  focus.update(0.3)
  assert.ok(!focus.broken, 'First three impacts keep the shell whole')
}
const hitsBeforeMiss = focus.hitCount
focus.crack(new THREE.Vector2(0.99, 0.99))
assert.equal(focus.hitCount, hitsBeforeMiss, 'Off-shell clicks cannot damage the egg')
focus.resize(390, 844)
focus.update(0.01)
const mobile = new THREE.Box3().setFromObject(focus.shell, true)
assert.ok(mobile.min.x > -390 / 844 && mobile.max.x < 390 / 844 && mobile.min.y > -1 && mobile.max.y < 1, 'Portrait resize keeps the egg inside the viewport')
focus.close()
assert.ok(egg.mesh.visible && !egg.selected && egg.mesh.getObjectByName('egg-impact-1'), 'Closing restores the partially cracked ground egg')
focus.open(egg, camera)
focus.update(1)
assert.equal(focus.hitCount, 3, 'Damage survives closing and reopening')
focus.crack(new THREE.Vector2(0, 0))
assert.ok(focus.broken && focus.hitCount === 4)
assertChickClearance(focus)
assert.equal(egg.mesh.userData.parentStyle, style, 'Egg remembers which special bird laid it')
assert.equal(Boolean(focus.scene.getObjectByName('royal-hatchling')), style === 'royal', 'Only the royal egg hatches this newborn')
const babyJunior = style === 'baby' || style === 'walker'
const maidJunior = style === 'maid'
assert.equal(Boolean(focus.scene.getObjectByName('baby-hatchling')), babyJunior, 'Baby and walker eggs hatch the diapered newborn')
assert.equal(Boolean(focus.scene.getObjectByName('maid-hatchling')), maidJunior)
if (maidJunior) {
  const chick = focus.scene.getObjectByName('maid-hatchling')
  for (const name of ['maid-twintails', 'maid-lace-headband', 'maid-glasses']) assert.ok(chick.getObjectByName(name))
  assert.equal(chick.getObjectByName('baby-diaper'), undefined)
  assert.equal(chick.getObjectByName('royal-crown'), undefined)
  assert.equal(chick.getObjectByName('maid-tea-service').visible, false, 'Tea props stay hidden until the newborn is clicked')
  assert.equal(focus.awaitingJuniorClick, true)
}
if (babyJunior) {
  const chick = focus.scene.getObjectByName('baby-hatchling')
  assert.ok(chick.getObjectByName('baby-pacifier'))
  assert.ok(chick.getObjectByName('baby-diaper'))
  assert.ok(chick.getObjectByName('junior-diaper-leg-opening-0'))
  assert.ok(chick.getObjectByName('junior-diaper-leg-opening-1'))
  assert.equal(chick.getObjectByName('royal-crown'), undefined)
  assert.equal(chick.getObjectByName('baby-walker'), undefined)
  assert.equal(focus.awaitingJuniorClick, true)
}
if (style === 'royal') {
  const chick = focus.scene.getObjectByName('royal-hatchling')
  assert.ok(chick.getObjectByName('royal-crown'))
  assert.equal(chick.getObjectByName('royal-armor'), undefined)
  focus.scene.updateMatrixWorld(true)
  for (const point of [new THREE.Vector3(0, 0.24, 0), new THREE.Vector3(0, 0.85, 0.1), new THREE.Vector3(0.13, 0.28, 0)]) {
    const projected = chick.localToWorld(point).project(focus.camera)
    assert.ok(focus.hitHatchling(new THREE.Vector2(projected.x, projected.y)), 'Body, crown and wing share the same hover/click target')
  }
  assert.equal(focus.hitHatchling(new THREE.Vector2(0.99, -0.99)), false)
}
assert.ok(focus.background.amount > 0.99, 'Background has faded while the egg is focused')
const stage = focus.floorMesh.getWorldPosition(new THREE.Vector3())
focus.floorRoot.updateMatrixWorld(true)
focus.floorMesh.getWorldPosition(stage)
assert.ok(Math.abs(stage.y + 0.2) < 0.01, 'Transparent floor is just below screen center')
const pieces = focus.scene.getObjectByName('egg-fragments').children
assert.ok(pieces.length >= 5 && pieces.length <= 8, 'Fourth click splits the real shell into several pieces')
if (style === 'royal' || babyJunior || maidJunior) assert.equal(pieces.length, 8, 'Newborn has eight shell pieces')
const before = pieces.map(piece => piece.position.clone())
focus.update(0.4)
assertChickClearance(focus)
assert.ok(pieces.every((piece, i) => piece.position.distanceTo(before[i]) > 0.01), 'Shell pieces move apart')
for (let i = 0; i < 350; i++) { focus.update(0.01); assertChickClearance(focus) }
assert.ok(focus.fragments.every(fragment => fragment.settled), 'Every fragment settles on the transparent stage')
for (const fragment of focus.fragments) {
  assert.ok(Math.abs(fragment.mesh.position.y + fragmentBottom(fragment) - focus.floorHeight) < 1e-5, 'Fragments rest exactly on the floor without floating or sinking')
}
const facing = focus.fragments.map(fragment => fragment.origin.clone().normalize().applyQuaternion(fragment.mesh.quaternion).y)
assert.ok(facing.some(y => y > 0.9) && facing.some(y => y < -0.9), 'Some pieces land upside down, others stay upright')
const resting = pieces.map(piece => ({ p: piece.position.clone(), q: piece.quaternion.clone() }))
focus.update(0.5)
pieces.forEach((piece, i) => { assert.deepEqual(piece.position, resting[i].p); assert.deepEqual(piece.quaternion.toArray(), resting[i].q.toArray()) })
const thirdCount = focus.hitCount
focus.crack()
assert.equal(focus.hitCount, thirdCount, 'Broken egg cannot spawn repeated fragments')
if (style === 'royal') {
  focus.greet()
  const chick = focus.scene.getObjectByName('royal-hatchling')
  for (let i = 0; i < 7; i++) focus.update(0.05)
  assert.ok(chick.getObjectByName('hatchling-torso').rotation.x > 0.1, 'Chick stands with a stooped waist first')
  assert.equal(chick.getObjectByName('hatchling-lower-beak').rotation.x, 0, 'Beak stays shut during the stand')
  assert.equal(focus.greetingReady, false, 'Greeting waits until both movements finish')
  for (let i = 0; i < 7; i++) focus.update(0.05)
  assert.ok(chick.getObjectByName('hatchling-lower-beak').rotation.x > 0.1, 'Beak opens after the stand')
  assert.equal(focus.greetingReady, false)
  for (let i = 0; i < 4; i++) focus.update(0.05)
  assert.equal(focus.greetingReady, true)
  assert.ok(Math.abs(chick.rotation.y + 0.8) < 0.001, 'Greeting turns to a three-quarter view while rising')
  assert.ok(chick.getObjectByName('hatchling-head').rotation.x < -0.8, 'Raised head counters the stooped torso to show the open beak')
  assertChickClearance(focus)
}
if (babyJunior) {
  focus.greet()
  const chick = focus.scene.getObjectByName('baby-hatchling')
  for (let i = 0; i < 18; i++) focus.update(0.05)
  assert.equal(focus.greetingReady, true)
  assert.equal(chick.getObjectByName('hatchling-torso').position.y, 0.13, 'Crying chick remains seated')
  assert.ok(chick.getObjectByName('hatchling-lower-beak').rotation.x > 0.7)
  assert.ok(chick.getObjectsByProperty('name', 'hatchling-leg').every(leg => leg.scale.y === 1))
  const tears = chick.getObjectByName('hatchling-tears')
  assert.equal(tears.children.length, 24, 'Tears use a fixed small pool')
  assert.ok(tears.children.filter(drop => drop.visible).length >= 12, 'Both eyes stream many tear drops')
  assert.equal(tears.children[0].material.color.getHexString(), 'ffffff')
  assert.ok(tears.children[0].material.opacity < 0.3, 'Colourless tears show the background through them')
  const pacifier = chick.getObjectByName('hatchling-pacifier')
  assert.equal(pacifier.parent, chick, 'Pacifier detaches from the beak')
  assert.equal(pacifier.userData.settled, true, 'Pacifier settles on the floor')
  const positions = tears.children.map(drop => drop.position.clone())
  focus.update(0.05)
  assert.ok(tears.children.some((drop, i) => drop.position.distanceTo(positions[i]) > 0.005), 'Tears arc and fall')
}
if (maidJunior) {
  focus.greet()
  const chick = focus.scene.getObjectByName('maid-hatchling')
  for (let i = 0; i < 30; i++) focus.update(0.05)
  assert.equal(focus.greetingReady, true)
  assert.equal(chick.getObjectByName('maid-tea-service').visible, true)
  assert.ok(chick.getObjectByName('maid-junior-teapot').rotation.z < -0.5, 'Teapot tips toward the cup')
  assert.equal(chick.getObjectByName('maid-coffee-stream').visible, true)
  assert.equal(chick.getObjectByName('maid-coffee-surface').visible, true)
  assert.equal(chick.getObjectByName('maid-coffee-steam').visible, true)
  assert.equal(chick.getObjectByName('hatchling-torso').position.y, 0.13, 'Maid stays low in a seated posture')
  for (const [name, side, propName, handleX] of [
    ['hatchling-left-wing', -1, 'maid-junior-teapot', -0.125],
    ['hatchling-right-wing', 1, 'maid-junior-teacup', 0.071],
  ]) {
    const wing = chick.getObjectByName(name)
    assert.deepEqual(wing.position.toArray(), [side * 0.09, 0.13, 0.025], 'Shoulder remains embedded in the torso during pouring')
    const limb = wing.getObjectByName('maid-junior-wing-limb')
    chick.updateWorldMatrix(true, true)
    assert.equal(limb.geometry.type, 'SphereGeometry', 'Bare wing keeps its original flattened oval shape')
    const tip = limb.localToWorld(new THREE.Vector3(0, 2, 0))
    const grip = chick.getObjectByName(propName).localToWorld(new THREE.Vector3(handleX, 0.008, 0))
    assert.ok(tip.distanceTo(grip) < 1e-5, 'Anchored wing reaches its prop handle without detaching')
  }
  for (const name of ['maid-junior-left-tail', 'maid-junior-right-tail']) {
    const tail = chick.getObjectByName(name)
    chick.updateWorldMatrix(true, true)
    const points = tail.geometry.getAttribute('position')
    let bottom = Infinity
    for (let i = 0; i < points.count; i++) {
      const point = chick.worldToLocal(tail.localToWorld(new THREE.Vector3().fromBufferAttribute(points, i)))
      bottom = Math.min(bottom, point.y)
    }
    assert.ok(bottom >= 0 && bottom < 0.02, 'Long hair rests above the floor rather than clipping through it')
  }
  assertChickClearance(focus)
}
focus.close()
assert.ok(!egg.mesh.visible && !egg.selected && !egg.mesh.parent, 'Closing a shattered egg does not restore an intact egg')
const remains = scene.getObjectByName('ground-egg-fragments')
assert.ok(remains && remains.children.filter(piece => piece.isMesh).length === pieces.length, 'Broken shell remains in the world')
assert.equal(Boolean(remains.getObjectByName('royal-hatchling')), style === 'royal', 'Newborn stays among the ground shells after closing')
assert.equal(Boolean(remains.getObjectByName('baby-hatchling')), babyJunior)
assert.equal(Boolean(remains.getObjectByName('maid-hatchling')), maidJunior)
if (maidJunior) {
  assert.equal(remains.getObjectByName('maid-coffee-stream').visible, false)
  assert.equal(remains.getObjectByName('maid-coffee-steam').visible, false)
}
assert.equal(remains.getObjectByName('hatchling-tears'), undefined, 'Transient tears are removed when returning to the flock')
assert.equal(remains.position.x, origin.x)
assert.equal(remains.position.z, origin.z)
const groundBounds = new THREE.Box3().setFromObject(remains, true).getSize(new THREE.Vector3())
assert.ok(Math.max(groundBounds.x, groundBounds.z) > 0.7, 'Ground shells are wider than a full-sized puddle')
for (const piece of remains.children.filter(piece => piece.isMesh)) {
  assert.ok(Math.abs(piece.position.y + fragmentBottom({ mesh: piece })) < 1e-5, 'World shell pieces rest on the ground')
  assert.ok(piece.getObjectByName('ground-shell-rim'), 'Ground shells have subtle broken edge shading')
}
assert.equal(pickSceneTarget(ray, [], effects.eggs), null)
focus.update(1)
assert.ok(focus.background.amount < 0.001, 'World returns after closing the focus')
console.log('PASS: centered shell, precise impacts, four-click fragmentation, raised stage, background fade, resize and cleanup.')
console.log(`PASS: ${style} egg interactions.`)
}
