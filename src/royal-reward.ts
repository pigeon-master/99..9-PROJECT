import type { EggFocus } from './egg-focus'

export const shopUrl = 'https://www.crappyroom.shop'

// Pixel-edged open palm, with the fingertip as the cursor's hot spot.
const palm = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="32" viewBox="0 0 32 40"><path fill="white" stroke="black" stroke-width="1.8" stroke-linejoin="miter" d="M12 18V5h3V2h4v3h4v3h4v4h3v19h-3v5h-3v3H12v-3H9v-5H6v-5H3v-6h4v3h3v-5z"/><path fill="none" stroke="black" stroke-width="1.5" d="M15 5v15M19 5v15M23 8v13M27 12v12"/></svg>`
export const palmCursor = `url("data:image/svg+xml,${encodeURIComponent(palm)}") 13 2, pointer`

export class RoyalReward {
  private readonly overlay = document.createElement('section')
  private timers: ReturnType<typeof setTimeout>[] = []
  private readonly focus: EggFocus
  private announced = false
  active = false

  constructor(focus: EggFocus) {
    this.focus = focus
    this.overlay.className = 'royal-reward'
    this.overlay.hidden = true
    this.overlay.setAttribute('role', 'dialog')
    this.overlay.setAttribute('aria-modal', 'true')
    this.overlay.setAttribute('aria-label', '자르반84세 경로우대 할인 코드')
    this.overlay.innerHTML = `
      <div class="royal-reward-white" aria-hidden="true"></div>
      <p class="royal-greeting" lang="ko">경로우대!</p>
      <div class="royal-discount" aria-live="polite">
        <p>9% Discount Code :</p>
        <p class="royal-discount-code">sexypigeon</p>
        <button class="royal-return" type="button" aria-label="Close discount screen"><svg viewBox="0 0 18 18" aria-hidden="true"><title>X</title><path d="M2 2L16 16M16 2L2 16" /></svg></button>
      </div>`
    document.querySelector('main')!.append(this.overlay)
    this.overlay.querySelector('button')!.addEventListener('click', () => this.close())
  }

  start() {
    if (this.active || !this.focus.awaitingJuniorClick) return
    this.active = true
    const royal = this.focus.egg?.mesh.userData.parentStyle === 'royal'
    this.overlay.querySelector<HTMLElement>('.royal-greeting')!.hidden = !royal
    this.overlay.setAttribute('aria-label', royal ? '자르반84세 경로우대 할인 코드'
      : this.focus.egg?.mesh.userData.parentStyle === 'maid' ? '메이드 주니어 할인 코드' : '아기 비둘기 할인 코드')
    this.focus.greet()
    this.overlay.hidden = false
  }

  update() {
    // Wait for the rendered stand and then the open beak, including slow frames.
    if (!this.active || this.announced || !this.focus.greetingReady) return
    this.announced = true
    this.overlay.classList.add('greeting')
    this.timers.push(setTimeout(() => this.overlay.classList.add('fading'), 1450))
    this.timers.push(setTimeout(() => {
      this.overlay.classList.add('discount')
      this.overlay.querySelector<HTMLButtonElement>('button')!.focus({ preventScroll: true })
    }, 1800))
    this.timers.push(setTimeout(() => {
      // Keep this shortly after the user's click, within transient activation.
      window.open(shopUrl, '_blank', 'noopener,noreferrer')
    }, 2600))
  }

  close() {
    this.timers.forEach(clearTimeout)
    this.timers = []
    this.active = false
    this.announced = false
    this.overlay.hidden = true
    this.overlay.classList.remove('greeting', 'fading', 'discount')
    this.focus.close()
    this.focus.background.amount = 0
  }
}
