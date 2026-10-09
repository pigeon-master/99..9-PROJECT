import assert from 'node:assert/strict'
import { Group, Scene, Vector3 } from 'three'
import { HoldEffects } from '../src/hold-effects.ts'

for (const style of ['gyaru', 'magic', 'maid', 'baby', 'walker', 'royal']) {
let seed = 8123
Math.random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647 }
const root = new Group()
root.position.set(2, 2.8, -1)
root.rotation.y = 0.7
root.scale.setScalar(0.9)
const body = new Group()
body.rotation.z = 0.13
root.add(body)
const gyaru = { style, body }
const classic = { style: 'classic', body }
const effects = new HoldEffects(new Scene())
const advance = (effect, bird, seconds) => {
  const frames = Math.round(seconds * 100)
  for (let i = 0; i < frames; i++) effect.update(bird, 0.01)
}
const volume = effect => effect.drops.length + effect.puddles.reduce((sum, p) => sum + p.volume, 0)

advance(effects, classic, 10)
assert.equal(volume(effects), 0, 'Ordinary pigeons never emit liquid')
assert.equal(effects.eggs.length, 0, 'Ordinary pigeons never lay an egg')
advance(effects, gyaru, 0.99)
assert.equal(volume(effects), 0, 'No emission before one continuous second')
advance(effects, gyaru, 0.04)
assert.ok(effects.drops.length > 0)
assert.equal(effects.jets.length, 1, 'One connected stream per burst')
assert.ok(effects.drops.every(d => !d.mesh.visible && !d.mesh.parent), 'Fluid samples are never drawn as beads')
assert.ok(Array.from(effects.jets[0].mesh.geometry.getAttribute('position').array).every(Number.isFinite), 'Stream geometry is finite')
const expected = body.localToWorld(new Vector3(0, 0.59, -0.76))
assert.ok(effects.drops[0].mesh.position.distanceTo(expected) < 0.06, 'Outlet follows body world transform')
const initialY = effects.drops[0].mesh.position.y
advance(effects, gyaru, 0.1)
assert.ok(effects.drops[0].mesh.position.y < initialY, 'Gravity pulls liquid down')
advance(effects, gyaru, 0.87) // hold = 2 seconds; first burst is landing
assert.equal(volume(effects), 25, 'First burst has exactly 25 liquid segments')
assert.ok(effects.drops.length < 25, 'First burst starts landing before the second')
assert.ok(effects.puddles.length > 0)
advance(effects, gyaru, 0.6)
assert.equal(volume(effects), 50, 'Exactly two bursts')
assert.equal(effects.eggs.length, 0)
assert.ok(effects.puddles.every(p => p.mesh.scale.x <= 0.301 && p.mesh.position.y === 0.014), 'Marks spread only over a small ground area')
advance(effects, gyaru, 1.99) // hold = 4.59 seconds
assert.equal(effects.eggs.length, 0, 'Wait 2 seconds after the second burst ends')
advance(effects, gyaru, 0.06)
assert.equal(effects.eggs.length, 1)
const egg = effects.eggs[0]
egg.mesh.geometry.computeBoundingBox()
assert.ok(Math.abs(egg.mesh.geometry.boundingBox.getSize(new Vector3()).y - 0.84) < 0.0001, 'Egg is 30% smaller than the previous 1.2-unit shell')
assert.ok(egg.mesh.material.color.b > effects.puddles[0].mesh.material.color.b, 'Egg is paler than the liquid')
assert.ok(egg.mesh.material.color.b < egg.mesh.material.color.r, 'Egg has a warm ivory tint')
assert.equal(egg.mesh.children[0].name, 'egg-soft-outline')
assert.ok(egg.mesh.children[0].material.color.r < egg.mesh.material.color.r, 'Outline is slightly darker than the shell')
assert.ok(egg.mesh.position.y > 2, 'Egg emerges at the elevated tail')
while (!egg.landed) effects.update(gyaru, 0.01)
assert.equal(effects.drops.length, 0, 'Both bursts reach the ground')
assert.equal(effects.jets.length, 0, 'Stream meshes are removed when all liquid lands')
const landing = egg.mesh.position.clone()
const firstHeading = egg.heading
let actualRotation = 0
while (egg.rollSpeed > 0) {
  const before = egg.mesh.quaternion.clone()
  effects.update(gyaru, 0.01)
  actualRotation += before.angleTo(egg.mesh.quaternion)
}
assert.ok(actualRotation >= 4 * Math.PI - 0.001 && actualRotation <= 6 * Math.PI + 0.001, 'Egg visibly rotates two to three full turns')
assert.ok(Math.abs(egg.heading - firstHeading) > 0.2, 'Roll follows a changing, curved direction')
advance(effects, gyaru, 1.1)
assert.equal(egg.rollSpeed, 0, 'Friction brings the egg to rest')
const distance = new Vector3(egg.mesh.position.x, 0, egg.mesh.position.z).distanceTo(new Vector3(landing.x, 0, landing.z))
assert.ok(distance > 2 && distance < 9, 'Larger egg travels far enough for two to three rotations')
const position = egg.mesh.position.clone(), rotation = egg.mesh.quaternion.clone()
advance(effects, gyaru, 10)
assert.deepEqual(egg.mesh.position, position, 'Resting egg stays still')
assert.deepEqual(egg.mesh.quaternion.toArray(), rotation.toArray())
assert.equal(effects.eggs.length, 1, 'A long hold never repeats the egg')
assert.equal(volume(effects), 50, 'A long hold never repeats the two bursts')
egg.mesh.updateMatrixWorld(true)
const vertices = egg.mesh.geometry.getAttribute('position')
let bottom = Infinity
for (let i = 0; i < vertices.count; i++) bottom = Math.min(bottom, new Vector3().fromBufferAttribute(vertices, i).applyMatrix4(egg.mesh.matrixWorld).y)
assert.ok(bottom >= 0 && bottom < 0.005, 'Resting egg contacts the floor without penetration or hovering')

const interrupted = new HoldEffects(new Scene())
advance(interrupted, gyaru, 0.9)
interrupted.release()
advance(interrupted, gyaru, 0.9)
assert.equal(volume(interrupted), 0, 'Release and immediate re-grab resets the hold clock')
advance(interrupted, gyaru, 0.35)
assert.ok(interrupted.drops.length > 0)
const emitted = volume(interrupted)
interrupted.release()
advance(interrupted, null, 10)
assert.equal(volume(interrupted), emitted, 'Release cancels the rest of the stream and sequence')
assert.equal(interrupted.drops.length, 0, 'Emitted liquid still lands after release')
assert.equal(interrupted.eggs.length, 0, 'No delayed egg after release')

const afterEgg = new HoldEffects(new Scene())
advance(afterEgg, gyaru, 7.15)
afterEgg.release()
advance(afterEgg, null, 10)
assert.equal(afterEgg.eggs[0].rollSpeed, 0, 'Emitted egg lands and settles after release')
assert.ok(afterEgg.eggs[0].landed)
for (const [choice, expectedBursts] of [[0.1, 2], [0.9, 3]]) {
  afterEgg.release()
  const seededRandom = Math.random
  Math.random = () => choice
  afterEgg.update(gyaru, 0.01)
  Math.random = seededRandom
  const jets = new Set()
  for (let i = 0; i < 1200; i++) {
    afterEgg.update(gyaru, 0.01)
    afterEgg.jets.forEach(jet => jets.add(jet))
  }
  assert.equal(jets.size, expectedBursts, 'Subsequent holds emit the chosen two or three bursts only')
  assert.equal(afterEgg.eggs.length, 1, 'A bird cannot lay again after release and re-grab')
}

// A different individual retains its own first egg, even in the same scene.
const secondBird = { style: style === 'gyaru' ? 'baby' : 'gyaru', body: new Group() }
secondBird.body.position.set(5, 2.8, 0)
advance(afterEgg, secondBird, 7.2)
assert.equal(afterEgg.eggs.length, 2, 'The egg allowance is per bird, not global')
advance(afterEgg, gyaru, 12)
assert.equal(afterEgg.eggs.length, 2, 'Switching birds does not reset a used allowance')

advance(interrupted, gyaru, 7.2)
assert.equal(interrupted.eggs.length, 1, 'An interrupted pre-egg hold does not consume the allowance')
const refreshed = new HoldEffects(new Scene())
advance(refreshed, gyaru, 7.2)
assert.equal(refreshed.eggs.length, 1, 'A new page session allows laying again')
console.log('PASS: continuous thin jets, no rendered beads, two bursts, gravity, puddles, reduced ivory egg and outline, 2–3 visible rotations, curved roll, floor contact, settling, release/reset.')
console.log('PASS: one egg per individual per page session; re-holds produce two or three bursts without eggs; interruptions and page reset behave correctly.')
console.log(`PASS: ${style} shares the complete hold behavior and has an independent egg allowance.`)
}
