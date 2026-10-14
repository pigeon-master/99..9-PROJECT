import assert from 'node:assert/strict'
import * as THREE from 'three'
import { trackEvent, startInteraction, endActiveInteractions, measurementId } from '../src/analytics.ts'
import { HoldEffects } from '../src/hold-effects.ts'
import { EggFocus } from '../src/egg-focus.ts'
import { Feeding } from '../src/feeding.ts'

const events = []
globalThis.window = { gtag: (command, name, parameters) => events.push({ command, name, parameters }) }
const originalPerformance = globalThis.performance
let time = 100
globalThis.performance = { now: () => time }
const interaction = startInteraction('pigeon_grab', { character_type: 'royal', input_method: 'touch' })
time = 375
interaction.end({ end_reason: 'released' }); interaction.end()
assert.deepEqual(events.map(e => e.name), ['pigeon_grab_start', 'pigeon_grab_end'])
assert.equal(events[1].parameters.duration_ms, 275)
assert.equal(events[1].parameters.send_to, measurementId)
assert.equal(events[1].parameters.character_type, 'royal')
const pending = startInteraction('pinch_zoom', { input_method: 'touch' })
endActiveInteractions('pagehide'); pending.end(); endActiveInteractions('pagehide')
assert.equal(events.filter(e => e.name === 'pinch_zoom_end').length, 1)
assert.equal(events.at(-1).parameters.result, 'interrupted')

events.length = 0
const effects = new HoldEffects(new THREE.Scene()), body = new THREE.Group()
body.position.y = 2.8
const bird = { style: 'royal', body }
effects.update(bird, 4.2); effects.update(bird, 0.2); effects.release()
for (let i = 0; i < 800; i++) effects.update(null, 0.01)
assert.deepEqual(events.filter(e => e.name === 'pigeon_excretion').map(e => e.parameters.burst_number), [1, 2])
assert.equal(events.filter(e => e.name === 'egg_laid').length, 1)
const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 100)
camera.position.set(0, 6, 10); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true)
const focus = new EggFocus()
focus.resize(1440, 1000); focus.open(effects.eggs[0], camera, 'touch'); focus.open(effects.eggs[0], camera)
focus.crack()
assert.equal(events.filter(e => e.name === 'egg_crack').length, 0, 'No event for cracking before arrival')
focus.update(1)
for (let i = 0; i < 4; i++) { focus.crack(); focus.update(0.3) }
focus.crack(); focus.close('test_closed'); focus.close()
assert.equal(events.filter(e => e.name === 'egg_focus_start').length, 1)
assert.deepEqual(events.filter(e => e.name === 'egg_crack').map(e => e.parameters.hit_count), [1, 2, 3, 4])
assert.equal(events.filter(e => e.name === 'egg_hatched').length, 1)
assert.equal(events.filter(e => e.name === 'egg_focus_end').length, 1)
const end = events.find(e => e.name === 'egg_focus_end').parameters
assert.equal(end.hit_count, 4); assert.equal(end.result, 'completed')
assert.equal(end.input_method, 'touch')
const feeding = new Feeding(new THREE.Scene())
assert.equal(feeding.scatter(0, 0, 10, 10), 26)
feeding.update([], null, 10, 10, 1)
feeding.grains.forEach(grain => { grain.bites = 0 })
feeding.containGrains(10, 10, -10)
feeding.update([], null, 10, 10, 0.01)
feeding.update([], null, 10, 10, 0.01)
assert.equal(events.filter(e => e.name === 'feed_cleared').length, 1, 'Empty feed is recorded only on the visible-to-empty transition')
assert.equal(events.find(e => e.name === 'feed_cleared').parameters.grains_count, 26)
for (const event of events) {
  assert.match(event.name, /^[a-z][a-z0-9_]{0,39}$/)
  assert.ok(Object.keys(event.parameters).length < 25)
}
window.gtag = () => { throw Error('Analytics blocked') }
assert.doesNotThrow(() => { const blocked = startInteraction('tutorial'); blocked.end() })
delete window.gtag
assert.doesNotThrow(() => trackEvent('shop_open_attempt'))
globalThis.performance = originalPerformance
delete globalThis.window
console.log('PASS: GA4 routing, exact start/end counts, duration, exit interruption, rare milestones, four accepted cracks, hatching, no duplicates and fail-open behavior; no real GA events sent.')
