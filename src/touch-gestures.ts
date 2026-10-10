interface Point { x: number; y: number }
interface Actions {
  blocked(): boolean
  release(): void
  zoom(): number
  setZoom(value: number): void
  feed(x: number, y: number, start: boolean): void
}

export function setupTouchGestures(canvas: HTMLCanvasElement, actions: Actions) {
  const touches = new Map<number, Point>()
  let mode: 'pending' | 'pinch' | 'feed' | null = null
  let startDistance = 0, startZoom = 1
  let origin: Point = { x: 0, y: 0 }
  let suppressed = false
  function pair() {
    const [a, b] = [...touches.values()]
    return { center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, distance: Math.hypot(a.x - b.x, a.y - b.y) }
  }
  canvas.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' || actions.blocked()) return
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (touches.size < 2 && !suppressed) return
    event.preventDefault(); event.stopImmediatePropagation()
    if (touches.size === 2) {
      actions.release()
      const initial = pair()
      origin = initial.center; startDistance = Math.max(1, initial.distance); startZoom = actions.zoom()
      mode = 'pending'; suppressed = true
    }
    for (const id of touches.keys()) canvas.setPointerCapture(id)
  }, { capture: true })
  canvas.addEventListener('pointermove', event => {
    if (event.pointerType !== 'touch' || !touches.has(event.pointerId)) return
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (!suppressed) return
    event.preventDefault(); event.stopImmediatePropagation()
    if (touches.size !== 2 || !mode || actions.blocked()) return
    const current = pair()
    const separation = Math.abs(current.distance - startDistance)
    const travel = Math.hypot(current.center.x - origin.x, current.center.y - origin.y)
    if (mode === 'pending') {
      // Establish intent before feeding, so a pinch never leaves accidental grain.
      if (separation > Math.max(12, startDistance * 0.08) && separation > travel * 0.9) mode = 'pinch'
      else if (travel > 9 && separation < Math.max(12, startDistance * 0.08)) {
        mode = 'feed'; actions.feed(origin.x, origin.y, true)
      }
    }
    if (mode === 'pinch') actions.setZoom(startZoom * current.distance / startDistance)
    else if (mode === 'feed') actions.feed(current.center.x, current.center.y, false)
  }, { capture: true })
  function end(event: PointerEvent) {
    if (event.pointerType !== 'touch') return
    touches.delete(event.pointerId)
    if (!suppressed) return
    event.stopImmediatePropagation()
    mode = null
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
    // The remaining finger cannot accidentally pick up a bird after a gesture.
    if (touches.size === 0) { suppressed = false; actions.release() }
  }
  canvas.addEventListener('pointerup', end, { capture: true })
  canvas.addEventListener('pointercancel', end, { capture: true })
  window.addEventListener('blur', () => { touches.clear(); mode = null; suppressed = false; actions.release() })
}
