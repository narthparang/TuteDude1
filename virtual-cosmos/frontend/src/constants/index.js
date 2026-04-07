/**
 * Global constants for Virtual Cosmos.
 * Centralised here so tweaking one value propagates everywhere.
 */

// ─── WORLD ────────────────────────────────────────────────────────────────────
export const WORLD_WIDTH = 3000
export const WORLD_HEIGHT = 2000

// ─── PLAYER ───────────────────────────────────────────────────────────────────
export const PLAYER_RADIUS = 22
export const PLAYER_SPEED = 3          // pixels per frame
export const PROXIMITY_RADIUS = 150    // pixels — users connect inside this range

// ─── NETWORKING ───────────────────────────────────────────────────────────────
export const SOCKET_URL = 'http://localhost:3001'
export const EMIT_THROTTLE_MS = 50     // min ms between position emits

// ─── RENDERING ────────────────────────────────────────────────────────────────
export const LERP_FACTOR = 0.15        // interpolation speed for remote players (0–1)
export const GRID_SIZE = 60            // background grid cell size (px)

// ─── PLAYER COLOURS (hex numbers for PixiJS) ──────────────────────────────────
export const PLAYER_COLORS = [
  0x6366f1, // indigo
  0x22c55e, // green
  0xf59e0b, // amber
  0xef4444, // red
  0x06b6d4, // cyan
  0xe879f9, // fuchsia
  0xf97316, // orange
  0x14b8a6, // teal
  0xa855f7, // purple
  0xfbbf24, // yellow
]

// ─── VISUAL ───────────────────────────────────────────────────────────────────
export const WORLD_BG_COLOR = 0x0f0f1a
export const GRID_COLOR = 0x1e1e38
export const BORDER_COLOR = 0x2a2a5e
export const PROXIMITY_RING_COLOR = 0x6366f1
export const CONNECTION_LINE_COLOR = 0x22c55e

// ─── CHAT ─────────────────────────────────────────────────────────────────────
export const MAX_CHAT_MESSAGES = 200   // per room
export const MAX_MESSAGE_LENGTH = 500
