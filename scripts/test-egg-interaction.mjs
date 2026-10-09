import assert from 'node:assert/strict'
import * as THREE from 'three'
import { HoldEffects } from '../src/hold-effects.ts'
import { EggFocus } from '../src/egg-focus.ts'
import { pickSceneTarget } from '../src/picking.ts'
import { fragmentBottom } from '../src/egg-fragments.ts'

for (const style of ['gyaru', 'baby', 'walker', 'royal']) {
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
assert.equal(egg.mesh.userData.parentStyle, style, 'Egg remembers which special bird laid it')
assert.equal(Boolean(focus.scene.getObjectByName('royal-hatchling')), style === 'royal', 'Only the royal egg hatches this newborn')
if (style === 'royal') {
  const chick = focus.scene.getObjectByName('royal-hatchling')
  assert.ok(chick.getObjectByName('royal-crown'))
  assert.equal(chick.getObjectByName('royal-armor'), undefined)
}
assert.ok(focus.background.amount > 0.99, 'Background has faded while the egg is focused')
const stage = focus.floorMesh.getWorldPosition(new THREE.Vector3())
focus.floorRoot.updateMatrixWorld(true)
focus.floorMesh.getWorldPosition(stage)
assert.ok(Math.abs(stage.y + 0.2) < 0.01, 'Transparent floor is just below screen center')
const pieces = focus.scene.getObjectByName('egg-fragments').children
assert.ok(pieces.length >= 5 && pieces.length <= 8, 'Fourth click splits the real shell into several pieces')
const before = pieces.map(piece => piece.position.clone())
focus.update(0.4)
assert.ok(pieces.every((piece, i) => piece.position.distanceTo(before[i]) > 0.01), 'Shell pieces move apart')
for (let i = 0; i < 350; i++) focus.update(0.01)
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
focus.close()
assert.ok(!egg.mesh.visible && !egg.selected && !egg.mesh.parent, 'Closing a shattered egg does not restore an intact egg')
const remains = scene.getObjectByName('ground-egg-fragments')
assert.ok(remains && remains.children.filter(piece => piece.isMesh).length === pieces.length, 'Broken shell remains in the world')
assert.equal(Boolean(remains.getObjectByName('royal-hatchling')), style === 'royal', 'Newborn stays among the ground shells after closing')
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
