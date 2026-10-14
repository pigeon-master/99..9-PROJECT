import type { EggFocus } from './egg-focus'
import greetingUrl from './royal-greeting.svg'
import { startInteraction, trackEvent, characterType, type TrackedInteraction } from './analytics.ts'

export const shopUrl = 'https://www.crappyroom.shop'

// Compact open palm matching the reference, with a transparent background.
const palm = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="28" viewBox="0 0 32 34"><path fill="white" stroke="black" stroke-width="1.8" stroke-linejoin="miter" d="M10 15V6H14V3H18V4H22V5H26V8H29V23H27V26H24V29H12V27H9V24H7V20H5V14H8V17H10Z"/><path fill="none" stroke="black" stroke-width="1.5" d="M14 6V18M18 4V18M22 5V18M26 8V19"/></svg>`
export const palmCursor = `url("data:image/svg+xml,${encodeURIComponent(palm)}") 13 3, pointer`

export class RoyalReward {
  private readonly overlay = document.createElement('section')
  private timers: ReturnType<typeof setTimeout>[] = []
  private readonly focus: EggFocus
  private announced = false
  private character = 'unknown'
  private actionTracking: TrackedInteraction | null = null
  private rewardTracking: TrackedInteraction | null = null
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
      <p class="royal-greeting" lang="ko"><img src="${greetingUrl}" alt="경로우대!"></p>
      <div class="royal-discount" aria-live="polite">
        <p>9% Discount Code :</p>
        <p class="royal-discount-code">sexypigeon</p>
        <button class="royal-return" type="button" aria-label="Close discount screen"><svg viewBox="0 0 18 18" aria-hidden="true"><title>X</title><path d="M2 2L16 16M16 2L2 16" /></svg></button>
      </div>`
    document.querySelector('main')!.append(this.overlay)
    this.overlay.querySelector('button')!.addEventListener('click', () => this.close())
  }

  start(inputMethod = 'unknown') {
    if (this.active || !this.focus.awaitingJuniorClick) return
    this.active = true
    const royal = this.focus.egg?.mesh.userData.parentStyle === 'royal'
    this.overlay.querySelector<HTMLElement>('.royal-greeting')!.hidden = !royal
    this.overlay.setAttribute('aria-label', royal ? '자르반84세 경로우대 할인 코드'
      : this.focus.egg?.mesh.userData.parentStyle === 'maid' ? '메이드 주니어 할인 코드' : '아기 비둘기 할인 코드')
    this.focus.greet()
    this.overlay.hidden = false
    this.character = characterType(this.focus.egg?.mesh.userData.parentStyle)
    this.actionTracking = startInteraction('junior_action', { character_type: this.character, input_method: inputMethod })
  }

  update() {
    // Wait for the rendered stand and then the open beak, including slow frames.
    if (!this.active || this.announced || !this.focus.greetingReady) return
    this.announced = true
    this.overlay.classList.add('greeting')
    if (this.character === 'royal') trackEvent('royal_greeting_shown', { character_type: this.character })
    this.timers.push(setTimeout(() => this.overlay.classList.add('fading'), 1450))
    this.timers.push(setTimeout(() => {
      this.overlay.classList.add('discount')
      this.actionTracking?.end({ result: 'completed', end_reason: 'reward_shown' })
      this.actionTracking = null
      this.rewardTracking = startInteraction('reward', { character_type: this.character })
      this.overlay.querySelector<HTMLButtonElement>('button')!.focus({ preventScroll: true })
    }, 1800))
    this.timers.push(setTimeout(() => {
      // Keep this shortly after the user's click, within transient activation.
      window.open(shopUrl, '_blank', 'noopener,noreferrer')
      trackEvent('shop_open_attempt', { character_type: this.character, link_url: shopUrl })
    }, 2600))
  }

  close() {
    this.actionTracking?.end({ result: 'interrupted', end_reason: 'closed' })
    this.actionTracking = null
    this.rewardTracking?.end({ end_reason: 'closed' })
    this.rewardTracking = null
    this.timers.forEach(clearTimeout)
    this.timers = []
    this.active = false
    this.announced = false
    this.overlay.hidden = true
    this.overlay.classList.remove('greeting', 'fading', 'discount')
    this.focus.close('reward_closed')
    this.focus.background.amount = 0
  }
}
