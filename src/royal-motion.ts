import type { Pigeon } from './pigeon'

type Swing = { wait: number; elapsed: number; active: boolean }
const swings = new WeakMap<Pigeon, Swing>()
const duration = 1.15

// Called after the ordinary arm pose: interruptions return to that pose immediately.
export function updateRoyalSwing(bird: Pigeon, walking: boolean, dt: number) {
  let state = swings.get(bird)
  if (!state) {
    state = { wait: 3 + Math.random() * 5, elapsed: 0, active: false }
    swings.set(bird, state)
  }
  if (!walking) {
    state.active = false
    state.elapsed = 0
    return
  }
  if (!state.active) {
    state.wait -= dt
    if (state.wait > 0) return
    state.active = true
    state.elapsed = 0
  }
  state.elapsed += dt
  const t = Math.min(1, state.elapsed / duration)
  // Deliberate raise, quick diagonal slash, then a soft return to the walking pose.
  const smooth = (v: number) => v * v * (3 - 2 * v)
  const raise = t < 0.4 ? smooth(t / 0.4) : 1 - smooth((t - 0.4) / 0.6)
  const slash = t < 0.4 ? 0 : Math.sin(Math.PI * (t - 0.4) / 0.6)
  bird.wings[0].rotation.x -= raise * 2.35
  bird.wings[0].rotation.z -= raise * 0.65
  bird.wings[0].rotation.y += slash * 0.95
  bird.body.rotation.y += slash * 0.14
  if (t === 1) {
    state.active = false
    state.wait = 4 + Math.random() * 7
  }
}
