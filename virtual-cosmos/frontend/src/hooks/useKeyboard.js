/**
 * useKeyboard — tracks which keys are currently pressed.
 * Returns a stable ref (not state) so game-loop reads never trigger re-renders.
 */

import { useEffect, useRef } from 'react'

// Keys we care about — anything else is ignored to avoid processing noise.
const TRACKED_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
])

/**
 * @returns {React.MutableRefObject<Set<string>>}
 *   A ref whose `.current` is the live set of pressed key codes.
 */
export function useKeyboard() {
  const pressedKeys = useRef(new Set())

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!TRACKED_KEYS.has(e.code)) return
      // Prevent default scrolling behaviour for arrow keys
      e.preventDefault()
      pressedKeys.current.add(e.code)
    }

    const onKeyUp = (e) => {
      pressedKeys.current.delete(e.code)
    }

    // Clear all keys when window loses focus to avoid "stuck" movement
    const onBlur = () => pressedKeys.current.clear()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  return pressedKeys
}

/**
 * Convert the current key set into a movement delta {dx, dy}.
 * Normalises diagonal movement so speed is consistent.
 * @param {Set<string>} keys
 * @param {number} speed  pixels per frame
 * @returns {{ dx: number, dy: number }}
 */
export function getDelta(keys, speed) {
  let dx = 0
  let dy = 0

  if (keys.has('ArrowLeft') || keys.has('KeyA')) dx -= 1
  if (keys.has('ArrowRight') || keys.has('KeyD')) dx += 1
  if (keys.has('ArrowUp') || keys.has('KeyW')) dy -= 1
  if (keys.has('ArrowDown') || keys.has('KeyS')) dy += 1

  // Normalise diagonal movement
  if (dx !== 0 && dy !== 0) {
    const norm = Math.SQRT2
    dx = (dx / norm) * speed
    dy = (dy / norm) * speed
  } else {
    dx *= speed
    dy *= speed
  }

  return { dx, dy }
}
