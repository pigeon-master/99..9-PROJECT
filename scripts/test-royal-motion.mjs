import assert from 'node:assert/strict'
import { Group } from 'three'
import { updateRoyalSwing } from '../src/royal-motion.ts'

const bird = { wings: [new Group(), new Group()], body: new Group() }
const originalRandom = Math.random
Math.random = () => 0
const reset = () => { bird.wings.forEach(w => w.rotation.set(0, 0, 0)); bird.body.rotation.set(0, 0, 0) }
try {
  for (let i = 0; i < 299; i++) { reset(); updateRoyalSwing(bird, true, 0.01) }
  assert.equal(bird.wings[0].rotation.x, 0, 'Waits before swinging')
  let maximum = 0
  for (let i = 0; i < 120; i++) {
    reset(); updateRoyalSwing(bird, true, 0.01)
    maximum = Math.max(maximum, Math.abs(bird.wings[0].rotation.x))
    assert.equal(bird.wings[1].rotation.x, 0, 'Only the sword arm swings')
  }
  assert.ok(maximum > 2, 'Raises the sword into a visible slash')
  assert.equal(bird.wings[0].rotation.x, 0, 'Returns to walking pose')
  for (let i = 0; i < 420; i++) { reset(); updateRoyalSwing(bird, true, 0.01) }
  assert.ok(Math.abs(bird.wings[0].rotation.x) > 0.1, 'Next swing starts after cooldown')
  reset(); updateRoyalSwing(bird, false, 0.01)
  assert.equal(bird.wings[0].rotation.x, 0, 'Holding or feeding interrupts the swing')
  for (let i = 0; i < 500; i++) { reset(); updateRoyalSwing(bird, false, 0.01) }
  assert.equal(bird.wings[0].rotation.x, 0, 'Does not swing while held or feeding')
  console.log('PASS: random cooldown, sword-arm slash, recovery, and interruption.')
} finally { Math.random = originalRandom }
