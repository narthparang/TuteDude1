/**
 * PixiGame — encapsulates all PixiJS rendering logic.
 *
 * Responsibilities:
 *  - Initialise and own the PIXI.Application instance
 *  - Draw the world background (grid + border)
 *  - Add / update / remove player sprites
 *  - Draw connection lines between nearby players
 *  - Camera follow (pan world container so local player stays centred)
 *  - Smooth interpolation of remote player positions
 *
 * This class is intentionally framework-agnostic. React components
 * call its methods from refs / effects.
 */

import * as PIXI from 'pixi.js'
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PLAYER_RADIUS,
  PROXIMITY_RADIUS,
  PLAYER_COLORS,
  WORLD_BG_COLOR,
  GRID_COLOR,
  GRID_SIZE,
  BORDER_COLOR,
  PROXIMITY_RING_COLOR,
  CONNECTION_LINE_COLOR,
  LERP_FACTOR,
} from '../constants/index.js'
import { lerp, clamp } from '../utils/distance.js'
import { colorIndexForId } from '../utils/roomUtils.js'

export class PixiGame {
  /**
   * @param {HTMLElement} container  DOM element to append the canvas to
   */
  constructor(container) {
    // ── PixiJS Application ────────────────────────────────────────────────────
    this.app = new PIXI.Application({
      resizeTo: container,
      backgroundColor: WORLD_BG_COLOR,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })
    container.appendChild(this.app.view)

    // ── Scene graph ───────────────────────────────────────────────────────────
    // world: everything that moves with the camera
    this.world = new PIXI.Container()
    this.app.stage.addChild(this.world)

    // Sub-layers (draw order matters — lower index = drawn first)
    this.floorLayer = new PIXI.Container()
    this.connectionLayer = new PIXI.Container() // connection lines
    this.playerLayer = new PIXI.Container()     // player circles + labels
    this.world.addChild(this.floorLayer, this.connectionLayer, this.playerLayer)

    // ── Player registry ───────────────────────────────────────────────────────
    // Record<socketId, { container, circle, label, proxRing?, targetX, targetY }>
    this._players = {}

    // ── Connection line graphics (redrawn every frame) ────────────────────────
    this._connectionGraphics = new PIXI.Graphics()
    this.connectionLayer.addChild(this._connectionGraphics)

    // ── Draw static background ────────────────────────────────────────────────
    this._drawFloor()

    // ── Resize support ────────────────────────────────────────────────────────
    window.addEventListener('resize', this._onResize.bind(this))
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Register a ticker callback. Called every frame by the game loop.
   * @param {(delta: number) => void} fn
   */
  addTicker(fn) {
    this.app.ticker.add(fn)
  }

  removeTicker(fn) {
    this.app.ticker.remove(fn)
  }

  /**
   * Add a new player sprite to the scene.
   * Safe to call multiple times — will update instead of duplicate.
   * @param {string} id         socket ID
   * @param {number} x
   * @param {number} y
   * @param {string} name
   * @param {boolean} isMe      true = local player
   */
  addPlayer(id, x, y, name, isMe = false) {
    if (this._players[id]) {
      // Already exists — just update position
      this._players[id].targetX = x
      this._players[id].targetY = y
      return
    }

    const color = PLAYER_COLORS[colorIndexForId(id, PLAYER_COLORS.length)]
    const container = new PIXI.Container()
    container.x = x
    container.y = y

    // ── Proximity ring (local player only) ─────────────────────────────────
    let proxRing = null
    if (isMe) {
      proxRing = new PIXI.Graphics()
      proxRing.lineStyle(1.5, PROXIMITY_RING_COLOR, 0.35)
      proxRing.beginFill(PROXIMITY_RING_COLOR, 0.04)
      proxRing.drawCircle(0, 0, PROXIMITY_RADIUS)
      proxRing.endFill()
      container.addChild(proxRing)
    }

    // ── Avatar circle ──────────────────────────────────────────────────────
    const circle = new PIXI.Graphics()
    circle.beginFill(color)
    circle.drawCircle(0, 0, PLAYER_RADIUS)
    circle.endFill()

    if (isMe) {
      // White outline for local player
      circle.lineStyle(2.5, 0xffffff, 0.9)
      circle.drawCircle(0, 0, PLAYER_RADIUS)
    }

    // ── Initials badge ─────────────────────────────────────────────────────
    const initials = name.slice(0, 2).toUpperCase()
    const badge = new PIXI.Text(initials, {
      fontSize: 13,
      fontWeight: 'bold',
      fill: 0xffffff,
      fontFamily: 'JetBrains Mono, monospace',
    })
    badge.anchor.set(0.5, 0.5)

    // ── Name label ─────────────────────────────────────────────────────────
    const label = new PIXI.Text(name, {
      fontSize: 11,
      fill: isMe ? 0xffffff : 0xc0c0d0,
      fontFamily: 'JetBrains Mono, monospace',
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowDistance: 1,
      dropShadowAlpha: 0.8,
    })
    label.anchor.set(0.5, 0)
    label.y = PLAYER_RADIUS + 5

    container.addChild(circle, badge, label)
    this.playerLayer.addChild(container)

    this._players[id] = {
      container,
      circle,
      label,
      badge,
      proxRing,
      isMe,
      targetX: x,
      targetY: y,
    }
  }

  /**
   * Update the target position for a remote player (interpolated in tick).
   * @param {string} id
   * @param {number} x
   * @param {number} y
   */
  setPlayerTarget(id, x, y) {
    const p = this._players[id]
    if (!p) return
    p.targetX = x
    p.targetY = y
  }

  /**
   * Immediately move the local player (no interpolation).
   * @param {string} id
   * @param {number} x
   * @param {number} y
   */
  setLocalPlayerPosition(id, x, y) {
    const p = this._players[id]
    if (!p) return
    p.container.x = x
    p.container.y = y
    p.targetX = x
    p.targetY = y
  }

  /**
   * Remove a player from the scene and clean up memory.
   * @param {string} id
   */
  removePlayer(id) {
    const p = this._players[id]
    if (!p) return
    this.playerLayer.removeChild(p.container)
    p.container.destroy({ children: true })
    delete this._players[id]
  }

  /**
   * Draw connection lines between the local player and all connected peers.
   * Also highlight connected players.
   * Called once per frame after positions are updated.
   * @param {string} myId
   * @param {Record<string, string>} activeConnections  socketId → roomId
   */
  drawConnections(myId, activeConnections) {
    const g = this._connectionGraphics
    g.clear()

    const me = this._players[myId]
    if (!me) return

    const mx = me.container.x
    const my = me.container.y

    for (const otherId of Object.keys(activeConnections)) {
      const other = this._players[otherId]
      if (!other) continue

      const ox = other.container.x
      const oy = other.container.y

      // Dashed line between players
      g.lineStyle(1.5, CONNECTION_LINE_COLOR, 0.5)
      g.moveTo(mx, my)
      g.lineTo(ox, oy)

      // Green pulse ring on connected remote player
      g.lineStyle(2, CONNECTION_LINE_COLOR, 0.7)
      g.drawCircle(ox, oy, PLAYER_RADIUS + 5)
    }
  }

  /**
   * Step interpolation for all remote players. Call once per ticker frame.
   */
  interpolatePlayers() {
    for (const [_id, p] of Object.entries(this._players)) {
      if (p.isMe) continue // local player is set directly
      p.container.x = lerp(p.container.x, p.targetX, LERP_FACTOR)
      p.container.y = lerp(p.container.y, p.targetY, LERP_FACTOR)
    }
  }

  /**
   * Pan the world container so the local player is centred on screen.
   * Clamped so the camera never shows empty space beyond world edges.
   * @param {string} myId
   */
  updateCamera(myId) {
    const p = this._players[myId]
    if (!p) return

    const sw = this.app.screen.width
    const sh = this.app.screen.height
    const px = p.container.x
    const py = p.container.y

    this.world.x = clamp(sw / 2 - px, sw - WORLD_WIDTH, 0)
    this.world.y = clamp(sh / 2 - py, sh - WORLD_HEIGHT, 0)
  }

  /**
   * Cleanly destroy the PixiJS application and release all resources.
   */
  destroy() {
    window.removeEventListener('resize', this._onResize.bind(this))
    this.app.destroy(true, { children: true, texture: true, baseTexture: true })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE
  // ═══════════════════════════════════════════════════════════════════════════

  _drawFloor() {
    const g = new PIXI.Graphics()

    // ── Grid ──────────────────────────────────────────────────────────────────
    g.lineStyle(1, GRID_COLOR, 1)
    for (let x = 0; x <= WORLD_WIDTH; x += GRID_SIZE) {
      g.moveTo(x, 0)
      g.lineTo(x, WORLD_HEIGHT)
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += GRID_SIZE) {
      g.moveTo(0, y)
      g.lineTo(WORLD_WIDTH, y)
    }

    // ── World border ──────────────────────────────────────────────────────────
    g.lineStyle(3, BORDER_COLOR, 1)
    g.drawRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)

    // ── Corner decorations ────────────────────────────────────────────────────
    const corners = [
      [0, 0], [WORLD_WIDTH, 0],
      [0, WORLD_HEIGHT], [WORLD_WIDTH, WORLD_HEIGHT],
    ]
    corners.forEach(([cx, cy]) => {
      g.lineStyle(0)
      g.beginFill(BORDER_COLOR, 0.6)
      g.drawCircle(cx, cy, 10)
      g.endFill()
    })

    this.floorLayer.addChild(g)

    // ── "Virtual Cosmos" world label ──────────────────────────────────────────
    const worldLabel = new PIXI.Text('Virtual Cosmos', {
      fontSize: 48,
      fontWeight: 'bold',
      fill: 0x1e1e38,
      fontFamily: 'JetBrains Mono, monospace',
    })
    worldLabel.anchor.set(0.5, 0.5)
    worldLabel.x = WORLD_WIDTH / 2
    worldLabel.y = WORLD_HEIGHT / 2
    this.floorLayer.addChild(worldLabel)
  }

  _onResize() {
    // PixiJS resizeTo handles canvas resizing automatically.
    // We just need to re-clamp the camera on resize.
  }
}
