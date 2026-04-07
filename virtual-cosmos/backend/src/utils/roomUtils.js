/**
 * Utilities for room ID generation and management.
 * Room IDs are deterministic: sorted socketIds joined by "_".
 * This guarantees both parties resolve to the same room string.
 */

/**
 * Generate a unique, stable room ID for two socket IDs.
 * @param {string} id1
 * @param {string} id2
 * @returns {string}
 */
export function getRoomId(id1, id2) {
  return [id1, id2].sort().join('_')
}
