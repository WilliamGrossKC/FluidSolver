function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function decimalsForStep(step) {
  if (!Number.isFinite(step) || step <= 0) return 0
  const s = step.toString()
  if (s.includes('e-')) return clamp(parseInt(s.split('e-')[1], 10) || 0, 0, 10)
  const idx = s.indexOf('.')
  return idx === -1 ? 0 : clamp(s.length - idx - 1, 0, 10)
}

/**
 * Create "nice" domain + ticks using a power-of-10 step (…, 1, 0.1, 0.01, …).
 * This produces whole-number-looking axes and avoids odd cropping from tight domains.
 * @param {number} [options.minBound] - If set, domain will not go below this (e.g. 0 for absolute pressure).
 * @param {number} [options.maxBound] - If set, domain will not go above this.
 */
export function niceAxisFromValues(values, { maxTicks = 6, padFrac = 0.05, minBound = undefined, maxBound = undefined } = {}) {
  const vals = (values || []).filter(v => v != null && Number.isFinite(v))
  if (!vals.length) {
    return { domain: undefined, ticks: undefined, decimals: 0, step: 1 }
  }

  let min = Math.min(...vals)
  let max = Math.max(...vals)

  if (min === max) {
    const pad = Math.abs(max) * padFrac || 1
    min -= pad
    max += pad
  } else {
    const pad = (max - min) * padFrac
    min -= pad
    max += pad
  }

  if (minBound != null && Number.isFinite(minBound)) min = Math.max(min, minBound)
  if (maxBound != null && Number.isFinite(maxBound)) max = Math.min(max, maxBound)

  const span = Math.max(0, max - min)
  const targetStep = span / Math.max(2, (maxTicks - 1))
  const pow = Math.floor(Math.log10(targetStep || 1))
  const step = Math.pow(10, pow)

  let niceMin = Math.floor(min / step) * step
  let niceMax = Math.ceil(max / step) * step
  if (minBound != null && Number.isFinite(minBound)) niceMin = Math.max(niceMin, minBound)
  if (maxBound != null && Number.isFinite(maxBound)) niceMax = Math.min(niceMax, maxBound)

  const ticks = []
  const n = clamp(Math.round((niceMax - niceMin) / step), 0, 200)
  for (let i = 0; i <= n; i++) {
    const t = niceMin + i * step
    ticks.push(Number(t.toFixed(decimalsForStep(step))))
  }

  return {
    domain: [niceMin, niceMax],
    ticks,
    decimals: decimalsForStep(step),
    step,
  }
}

