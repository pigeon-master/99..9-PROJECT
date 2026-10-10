export function flockLayout(width: number, height: number, touch: boolean) {
  const compact = width < 768 || (touch && width < 1400)
  if (!compact) {
    const halfWidth = Math.max(10, 14 * (width / height) / 1.7)
    return { compact, count: 100, halfWidth, halfHeight: halfWidth / (width / height) }
  }
  // About 38 CSS pixels per world unit keeps the birds readable on small screens.
  const aspect = width / height
  const halfHeight = Math.max(4.3, height / 76, 4.3 / aspect)
  return {
    compact,
    count: Math.min(100, 2 * Math.max(18, Math.min(70, Math.round(width * height / 15000)))),
    halfWidth: halfHeight * aspect,
    halfHeight,
  }
}
