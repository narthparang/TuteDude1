/**
 * Geometry / distance utilities.
 */

/**
 * Euclidean distance between two 2D points.
 * @param {{ x: number, y: number }} a
 * @param {{ x: number, y: number }} b
 * @returns {number}
 */
export function euclidean(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Linear interpolation between two values.
 * @param {number} current
 * @param {number} target
 * @param {number} factor  0 = no movement, 1 = instant snap
 * @returns {number}
 */
export function lerp(current, target, factor) {
  return current + (target - current) * factor
}

/**
 * Clamp a value within [min, max].
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}
