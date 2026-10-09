import assert from 'node:assert/strict'
import { Group, Scene } from 'three'
import { Feeding } from '../src/feeding.ts'
import { walkFlock } from '../src/movement.ts'

let seed = 39481
Math.random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647 }
const feeding = new Feeding(new Scene())
const birds = Array.from({ length: 100 }, (_, id) => {
  const root = new Group()
  root.scale.setScalar(0.9)
  root.position.set((id % 10 - 4.5) * 1.5, 0, (Math.floor(id / 10) - 4.5) * 1.5)
  return { id, root, speed: 1.2, phase: 0, heading: 0 }
})
feeding.scatter(0, 0, 11, 11)
assert.equal(feeding.grains.length, 26)
assert.ok(feeding.grains.every(g => Math.hypot(g.x, g.z) <= 0.85))
assert.ok(feeding.grains.every(g => Math.abs(g.x) <= 0.85 * 0.49), 'Scatter is 30% narrower while keeping the arc')
feeding.update(birds, null, 11, 11, 0)
assert.equal(feeding.meals.size, 0, 'Airborne grain cannot be eaten')
const matrix = new (await import('three')).Matrix4()
feeding.mesh.getMatrixAt(0, matrix)
const initialHeight = matrix.elements[13]
assert.ok(initialHeight > 1.4, 'Grain starts in the air')
feeding.update(birds, null, 11, 11, 0.1)
feeding.mesh.getMatrixAt(0, matrix)
assert.ok(matrix.elements[13] > initialHeight, 'Grain initially rises along its arc')
feeding.update(birds, null, 11, 11, 0.2)
feeding.mesh.getMatrixAt(0, matrix)
assert.ok(matrix.elements[12] !== feeding.grains[0].startX, 'Grain spreads horizontally in flight')
// Land without birds so reaction-delay assertions start at discovery time.
feeding.update([], null, 11, 11, 1)
feeding.mesh.getMatrixAt(0, matrix)
assert.ok(Math.abs(matrix.elements[13] - 0.035) < 0.0001, 'Grain lands on the floor')
feeding.update(birds, null, 11, 11, 0.4)
const delays = [...feeding.meals.values()].map(m => m.timer)
assert.ok(delays.length > 1 && delays.every(d => d >= -0.4 && d <= 2))
assert.ok(Math.max(...delays) - Math.min(...delays) > 0.5)
let ran = false, ate = false, shrank = false, maxSpeed = 0
for (let frame = 0; frame < 120 * 60; frame++) {
  const previous = birds.map(b => b.root.position.clone())
  feeding.update(birds, null, 11, 11, 1 / 60)
  for (const [bird, meal] of feeding.meals) {
    if (meal.mode === 'run') {
      ran = true
      maxSpeed = Math.max(maxSpeed, bird.root.position.distanceTo(previous[bird.id]) * 60)
    }
    if (meal.mode === 'eat') ate = true
  }
  walkFlock(birds, null, 11, 11, 1 / 60, feeding.controlled)
  if (feeding.grains.some(g => g.bites > 0 && g.bites < 4)) shrank = true
  if (feeding.grains.every(g => g.bites === 0)) break
}
assert.ok(ran && ate && shrank, 'Run, eat and gradually consume grains')
assert.ok(maxSpeed > 2.2, 'Run faster than 1.2 walking speed')
assert.ok(feeding.grains.every(g => g.bites === 0), `All grain is eventually consumed; remaining ${feeding.grains.filter(g => g.bites > 0).length}`)
feeding.update(birds, null, 11, 11, 1 / 60)
assert.equal(feeding.controlled.size, 0)
assert.equal(feeding.mesh.count, 0)
feeding.scatter(0, 0, 11, 11)
feeding.update(birds, null, 11, 11, 1)
const grabbed = feeding.meals.keys().next().value
assert.ok(grabbed)
feeding.update(birds, grabbed, 11, 11, 0.01)
assert.ok(!feeding.meals.has(grabbed), 'Picking up a bird interrupts feeding')
const continuous = new Feeding(new Scene())
for (let i = 0; i < 153; i++) continuous.scatter(0, 0, 11, 11)
assert.equal(continuous.grains.length, 3978, 'A continuous drag supports one third more drops at the original density')
for (let i = 0; i < 100; i++) continuous.scatter(0, 0, 11, 11)
continuous.update([], null, 11, 11, 1)
assert.equal(continuous.grains.length, 4000, 'Long drags keep memory bounded')
assert.equal(continuous.mesh.count, 4000, 'All remaining grains fit the instanced mesh')
continuous.grains.slice(0, 26).forEach(grain => { grain.bites = 0 })
continuous.scatter(0, 0, 11, 11)
assert.equal(continuous.grains.length, 4000, 'Eaten grains free slots for further scattering')
console.log('PASS: scattered grain, individual delays, running, eating, gradual depletion, return to roaming, grab interruption.')
