export const measurementId = 'G-1MR4LJW7XG'
export type EventParameters = Record<string, string | number>
export interface TrackedInteraction { end(parameters?: EventParameters): void }

type AnalyticsWindow = Window & { gtag?: (command: string, name: string, parameters: EventParameters) => void }
const activeInteractions = new Set<TrackedInteraction>()

// Analytics is optional: blocked tags, missing scripts or errors must never
// interrupt input, physics or animation. No polling, per-frame events or random draws.
export function trackEvent(name: string, parameters: EventParameters = {}) {
  if (typeof window === 'undefined') return
  try {
    const gtag = (window as AnalyticsWindow).gtag
    if (typeof gtag === 'function') gtag('event', name, { ...parameters, send_to: measurementId })
  } catch { /* Gameplay continues if analytics is unavailable. */ }
}

export function startInteraction(experience: string, parameters: EventParameters = {}): TrackedInteraction {
  const started = performance.now()
  const context = { experience, ...parameters }
  let ended = false
  trackEvent(`${experience}_start`, context)
  const interaction: TrackedInteraction = {
    end(details = {}) {
      if (ended) return
      ended = true
      activeInteractions.delete(interaction)
      trackEvent(`${experience}_end`, { ...context, ...details, duration_ms: Math.max(0, Math.round(performance.now() - started)) })
    },
  }
  activeInteractions.add(interaction)
  return interaction
}

export function endActiveInteractions(reason: string) {
  for (const interaction of [...activeInteractions]) interaction.end({ end_reason: reason, result: 'interrupted' })
}

if (typeof window !== 'undefined') window.addEventListener('pagehide', () => endActiveInteractions('pagehide'))

export function characterType(style: unknown): string {
  return typeof style === 'string' && ['classic', 'royal', 'walker', 'maid', 'baby', 'gyaru', 'magic'].includes(style) ? style : 'unknown'
}
