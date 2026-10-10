import assert from 'node:assert/strict'
import { flockLayout } from '../src/responsive.ts'
import { setupTouchGestures } from '../src/touch-gestures.ts'

const desktop = flockLayout(1440, 1000, false)
assert.equal(desktop.count, 100)
assert.equal(desktop.halfWidth, 14 * 1.44 / 1.7)
for (const [width, height] of [[390, 844], [844, 390], [768, 1024], [1024, 768]]) {
  const layout = flockLayout(width, height, true)
  assert.ok(layout.count >= 18 && layout.count <= 70)
  assert.ok(layout.halfWidth >= 4.3 && layout.halfHeight >= 4.3)
  assert.ok(layout.count > 3, 'There is always room for all three special pigeons')
}
assert.equal(flockLayout(390, 844, true).count, 22)
assert.equal(flockLayout(1024, 768, true).count, 52)

globalThis.window = new EventTarget()
class Canvas extends EventTarget {
  captures = new Set()
  setPointerCapture(id) { this.captures.add(id) }
  hasPointerCapture(id) { return this.captures.has(id) }
  releasePointerCapture(id) { this.captures.delete(id) }
}
const canvas = new Canvas()
let zoom = 1, releases = 0, blocked = false
const feed = []
setupTouchGestures(canvas, {
  blocked: () => blocked,
  release: () => releases++,
  zoom: () => zoom,
  setZoom: value => { zoom = value },
  feed: (x, y, start) => feed.push({ x, y, start }),
})
function touch(type, id, x, y) {
  const event = new Event(type, { cancelable: true })
  Object.assign(event, { pointerType: 'touch', pointerId: id, clientX: x, clientY: y })
  canvas.dispatchEvent(event)
  return event
}
touch('pointerdown', 1, 100, 200)
touch('pointerdown', 2, 200, 200)
assert.equal(releases, 1, 'A second finger releases a held pigeon')
touch('pointermove', 1, 70, 200)
touch('pointermove', 2, 230, 200)
assert.equal(zoom, 1.6)
assert.equal(feed.length, 0, 'Pinching must never scatter feed')
touch('pointerup', 2, 230, 200)
touch('pointermove', 1, 80, 230)
assert.equal(zoom, 1.6, 'A remaining finger cannot continue a two-finger gesture')
touch('pointerup', 1, 80, 230)

touch('pointerdown', 1, 100, 200)
touch('pointerdown', 2, 200, 200)
touch('pointermove', 1, 100, 220)
touch('pointermove', 2, 200, 220)
touch('pointermove', 1, 100, 240)
touch('pointermove', 2, 200, 240)
assert.equal(feed[0].start, true)
assert.equal(feed.filter(point => point.start).length, 1)
assert.ok(feed.length >= 3, 'Feed continues along the drag path')
assert.equal(zoom, 1.6, 'Feeding does not change zoom')
touch('pointercancel', 1, 100, 240)
touch('pointercancel', 2, 200, 240)
assert.equal(canvas.captures.size, 0)

blocked = true
const previousFeed = feed.length
touch('pointerdown', 1, 100, 200)
touch('pointerdown', 2, 200, 200)
touch('pointermove', 1, 70, 250)
assert.equal(feed.length, previousFeed, 'Egg and reward screens do not accept feeding gestures')
console.log('PASS: responsive flock sizes, pinch/feed separation, hold release, leftover finger suppression, cancellation and modal blocking.')
