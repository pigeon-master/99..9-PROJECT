import assert from 'node:assert/strict'
import { Group, Vector3 } from 'three'
import { updateBabyWalker } from '../src/walker.ts'

const root = new Group()
root.scale.setScalar(0.803)
const frame = new Group()
root.add(frame)
const casters = [-1, 1].map(side => {
  const swivel = new Group(), wheel = new Group()
  swivel.position.set(side * 0.8, 0.115, 0.5)
  frame.add(swivel); swivel.add(wheel)
  return { swivel, wheel, previous: new Vector3() }
})
const rig = { frame, casters, initialized: false }
updateBabyWalker(rig, root, true, 1 / 60)
root.position.z += 0.05
updateBabyWalker(rig, root, true, 1 / 60)
const expected = 0.05 / (0.115 * 0.803)
assert.ok(casters.every(c => Math.abs(c.wheel.rotation.x - expected) < 1e-6), 'Wheel angle matches actual distance and scale')
const angles = casters.map(c => c.wheel.rotation.x)
updateBabyWalker(rig, root, true, 1 / 60)
assert.deepEqual(casters.map(c => c.wheel.rotation.x), angles, 'Stopped walker wheels stop')
root.rotation.y += 0.08
updateBabyWalker(rig, root, true, 1 / 60)
assert.ok(casters.every((c, i) => c.wheel.rotation.x !== angles[i]), 'Turning in place rolls the casters')
assert.ok(casters.every(c => Math.abs(c.swivel.rotation.y) > 0.001), 'Casters turn into their travel direction')
const airborne = casters.map(c => c.wheel.rotation.x)
root.position.set(3, 2.8, 2)
updateBabyWalker(rig, root, false, 1 / 60)
assert.deepEqual(casters.map(c => c.wheel.rotation.x), airborne, 'Lifting and dragging does not spin grounded wheels')
root.position.y = 0
updateBabyWalker(rig, root, true, 1 / 60)
assert.deepEqual(casters.map(c => c.wheel.rotation.x), airborne, 'Landing does not create a fake wheel jump')
console.log('PASS: travel-distance wheel rotation, caster steering, stopping, lift/drag and landing.')
