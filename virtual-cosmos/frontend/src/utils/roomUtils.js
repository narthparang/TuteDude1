/**
 * Room ID helpers — mirrors the backend logic exactly so both sides agree.
 */

/**
 * Generate a deterministic room ID from two socket IDs.
 * Sorting guarantees the same ID regardless of which side computes it.
 * @param {string} id1
 * @param {string} id2
 * @returns {string}
 */
export function getRoomId(id1, id2) {
  return [id1, id2].sort().join('_')
}

/**
 * Assign a consistent color index to a socket ID (for avatar colors).
 * Simple hash so the same ID always gets the same color.
 * @param {string} socketId
 * @param {number} colorsLength  length of your colors array
 * @returns {number}  index into colors array
 */
export function colorIndexForId(socketId, colorsLength) {
  let hash = 0
  for (let i = 0; i < socketId.length; i++) {
    hash = (hash * 31 + socketId.charCodeAt(i)) >>> 0
  }
  return hash % colorsLength
}
