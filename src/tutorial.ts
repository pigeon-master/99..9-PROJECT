// Lightweight vector illustrations based on the supplied mouse and pointer references.
function mouseIllustration(side: 'left' | 'right') {
  return `<svg viewBox="0 0 100 140" focusable="false" aria-hidden="true">
    <defs>
      <linearGradient id="mouse-${side}" x1="0" y1="0" x2="0.65" y2="1">
        <stop stop-color="#f4f5fa"/><stop offset="0.52" stop-color="#dfe2eb"/><stop offset="1" stop-color="#bfc2cd"/>
      </linearGradient>
      <linearGradient id="wheel-${side}" x2="1" y2="1"><stop stop-color="#e5e7ef"/><stop offset="1" stop-color="#a9adba"/></linearGradient>
    </defs>
    <path d="M50 6 C20 6 10 20 10 47 L10 93 C10 120 24 134 50 134 C76 134 90 120 90 93 L90 47 C90 20 80 6 50 6Z" fill="url(#mouse-${side})" stroke="#aeb1ba" stroke-width="1.2"/>
    <path d="M50 7V54 M11 54H89" fill="none" stroke="#9699a1" stroke-width="1.3"/>
    <path d="M11 56H89" stroke="#fff" stroke-width="1.2"/>
    <ellipse cx="50" cy="31" rx="5" ry="13" fill="url(#wheel-${side})" stroke="#b4b8c2"/>
    <g transform="translate(${side === 'left' ? 15 : 57} 29) scale(0.65)">
      <path d="M12 0H20V27H26V23H33V29H40V34H46V54H41V64H16V58H10V51H4V44H0V37H7V41H12Z" fill="#fff" stroke="#080808" stroke-width="3.5" stroke-linejoin="miter"/>
      <path d="M20 27V40 M27 29V42 M34 34V44" fill="none" stroke="#080808" stroke-width="2.5"/>
    </g>
  </svg>`
}

export function setupTutorial(beforeOpen: () => void, makePreviews: () => { pigeon: string; feed: string }) {
  const button = document.querySelector<HTMLButtonElement>('.help-indicator')!
  const dialog = document.querySelector<HTMLDialogElement>('#tutorial')!
  const move = dialog.querySelector<HTMLElement>('[data-tutorial-move]')!
  const feed = dialog.querySelector<HTMLElement>('[data-tutorial-feed]')!
  let previewsReady = false
  for (const side of ['left', 'right'] as const) dialog.querySelector<HTMLElement>(`[data-mouse="${side}"]`)!.innerHTML = mouseIllustration(side)
  button.addEventListener('click', event => {
    const touch = (event instanceof PointerEvent && event.pointerType === 'touch')
      || matchMedia('(pointer: coarse)').matches
      || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    dialog.dataset.device = touch ? 'touch' : 'desktop'
    if (!touch && !previewsReady) {
      const previews = makePreviews()
      for (const key of ['pigeon', 'feed'] as const) dialog.querySelector<HTMLImageElement>(`[data-preview="${key}"]`)!.src = previews[key]
      previewsReady = true
    }
    move.textContent = touch ? 'TAP + HOLD → MOVE A PIGEON' : 'LEFT CLICK + DRAG → MOVE A PIGEON'
    feed.textContent = touch ? 'TWO-FINGER DRAG → FEED THE PIGEONS' : 'RIGHT CLICK + DRAG → FEED THE PIGEONS'
    beforeOpen()
    dialog.showModal()
    button.setAttribute('aria-expanded', 'true')
    dialog.focus()
  })
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return
    const rect = dialog.getBoundingClientRect()
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close()
  })
  dialog.addEventListener('close', () => {
    button.setAttribute('aria-expanded', 'false')
    button.focus({ preventScroll: true })
  })
}
