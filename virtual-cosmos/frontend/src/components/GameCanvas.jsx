/**
 * GameCanvas — orchestrates PixiJS + Socket.IO + keyboard movement.
 *
 * Architecture:
 *  - All high-frequency mutable state (positions, socket ref, pixi instance)
 *    is stored in refs so the game loop never triggers React re-renders.
 *  - Zustand store is used ONLY for UI state: chat messages, player list for HUD,
 *    connection status, active connections.
 *  - Proximity detection runs inside the PixiJS ticker (every frame)
 *    but is gated behind a throttle so socket.emit is only called when needed.
 */

import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import { PixiGame } from '../game/PixiGame.js'
import { useKeyboard, getDelta } from '../hooks/useKeyboard.js'
import useGameStore from '../store/gameStore.js'
import { euclidean } from '../utils/distance.js'
import { getRoomId } from '../utils/roomUtils.js'
import {
  SOCKET_URL,
  PLAYER_SPEED,
  EMIT_THROTTLE_MS,
  PROXIMITY_RADIUS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
} from '../constants/index.js'
import HUD from './HUD.jsx'
import ChatPanel from './ChatPanel.jsx'

/**
 * @param {{ playerName: string }} props
 */
export default function GameCanvas({ playerName }) {
  // ── DOM ref for the canvas container ──────────────────────────────────────
  const containerRef = useRef(null)

  // ── High-frequency game state (refs, not state) ───────────────────────────
  const pixiRef = useRef(null)          // PixiGame instance
  const socketRef = useRef(null)        // Socket.IO socket
  const myIdRef = useRef(null)          // local player socket ID
  const myPosRef = useRef({ x: Math.random() * 1600 + 200, y: Math.random() * 1200 + 200 })
  const playersRef = useRef({})         // socketId → { x, y, name }
  const activeConnsRef = useRef({})     // socketId → roomId  (mirrors Zustand)
  const lastEmitRef = useRef(0)         // throttle last-emit timestamp
  const lastProximityRef = useRef(0)    // throttle proximity checks

  // ── Keyboard ──────────────────────────────────────────────────────────────
  const pressedKeys = useKeyboard()

  // ── Zustand actions (stable refs, won't change) ───────────────────────────
  const store = useGameStore

  // ═════════════════════════════════════════════════════════════════════════
  // PROXIMITY DETECTION
  // Compares local player position against all known remote players.
  // Emits join-room / leave-room socket events when state changes.
  // ═════════════════════════════════════════════════════════════════════════
  const checkProximity = useCallback(() => {
    const myId = myIdRef.current
    const myPos = myPosRef.current
    const pixi = pixiRef.current
    const socket = socketRef.current
    if (!myId || !pixi || !socket) return

    const prevConns = activeConnsRef.current
    const newConns = {}

    for (const [otherId, other] of Object.entries(playersRef.current)) {
      if (otherId === myId) continue
      const dist = euclidean(myPos, other)

      if (dist < PROXIMITY_RADIUS) {
        const roomId = getRoomId(myId, otherId)
        newConns[otherId] = roomId

        // New connection — join the socket room
        if (!prevConns[otherId]) {
          socket.emit('join-room', { roomId })
          store.getState().addConnection(otherId, roomId)
        }
      }
    }

    // Detect disconnections (were in range, now out)
    for (const [otherId, roomId] of Object.entries(prevConns)) {
      if (!newConns[otherId]) {
        socket.emit('leave-room', { roomId })
        store.getState().removeConnection(otherId)
      }
    }

    activeConnsRef.current = newConns

    // Update connection lines in PixiJS
    pixi.drawConnections(myId, newConns)
  }, [])

  // ═════════════════════════════════════════════════════════════════════════
  // SOCKET SETUP
  // ═════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] })
    socketRef.current = socket

    // ── self-joined: server confirms our join + gives full player list ──────
    socket.on('self-joined', ({ id, players }) => {
      myIdRef.current = id
      store.getState().setMyId(id)
      store.getState().setConnected(true)

      // Sync all existing players into our local ref + Zustand
      const remoteMap = {}
      for (const [pid, p] of Object.entries(players)) {
        remoteMap[pid] = { x: p.x, y: p.y, name: p.name }
        store.getState().upsertPlayer(p)
      }
      playersRef.current = remoteMap

      // Add ourselves to Pixi (special "isMe" flag)
      const { x, y } = myPosRef.current
      pixiRef.current?.addPlayer(id, x, y, playerName, true)

      // Add all existing remote players to Pixi
      for (const [pid, p] of Object.entries(players)) {
        if (pid !== id) {
          pixiRef.current?.addPlayer(pid, p.x, p.y, p.name, false)
        }
      }
    })

    // ── player-joined: someone new arrived ──────────────────────────────────
    socket.on('player-joined', (player) => {
      playersRef.current[player.id] = {
        x: player.x,
        y: player.y,
        name: player.name,
      }
      store.getState().upsertPlayer(player)
      pixiRef.current?.addPlayer(player.id, player.x, player.y, player.name, false)
    })

    // ── player-moved: remote player position update ──────────────────────────
    socket.on('player-moved', ({ id, x, y }) => {
      if (playersRef.current[id]) {
        playersRef.current[id].x = x
        playersRef.current[id].y = y
      }
      store.getState().updatePlayerPosition(id, x, y)
      pixiRef.current?.setPlayerTarget(id, x, y)
    })

    // ── player-left: clean up disconnected player ────────────────────────────
    socket.on('player-left', (id) => {
      delete playersRef.current[id]
      store.getState().removePlayer(id)
      pixiRef.current?.removePlayer(id)

      // If we were connected to them, clean up
      if (activeConnsRef.current[id]) {
        store.getState().removeConnection(id)
        delete activeConnsRef.current[id]
        pixiRef.current?.drawConnections(myIdRef.current, activeConnsRef.current)
      }
    })

    // ── room-message: incoming chat message ─────────────────────────────────
    socket.on('room-message', ({ roomId, message }) => {
      store.getState().addMessage(roomId, message)
    })

    socket.on('disconnect', () => {
      store.getState().setConnected(false)
      store.getState().clearAllConnections()
      activeConnsRef.current = {}
    })

    socket.on('connect', () => {
      // Emit join with our name + starting position
      socket.emit('join', {
        name: playerName,
        x: myPosRef.current.x,
        y: myPosRef.current.y,
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [playerName])

  // ═════════════════════════════════════════════════════════════════════════
  // PIXI SETUP + GAME LOOP
  // ═════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!containerRef.current) return

    const pixi = new PixiGame(containerRef.current)
    pixiRef.current = pixi

    // ── Game loop (runs at ~60fps via requestAnimationFrame) ─────────────────
    const gameTick = () => {
      const myId = myIdRef.current
      if (!myId) return

      // 1. Read keyboard and compute movement delta
      const { dx, dy } = getDelta(pressedKeys.current, PLAYER_SPEED)

      if (dx !== 0 || dy !== 0) {
        const pos = myPosRef.current
        // Clamp to world bounds
        const newX = Math.max(PLAYER_SPEED, Math.min(WORLD_WIDTH - PLAYER_SPEED, pos.x + dx))
        const newY = Math.max(PLAYER_SPEED, Math.min(WORLD_HEIGHT - PLAYER_SPEED, pos.y + dy))

        myPosRef.current = { x: newX, y: newY }
        playersRef.current[myId] = {
          ...playersRef.current[myId],
          x: newX,
          y: newY,
        }

        // Move local sprite instantly (no interpolation)
        pixi.setLocalPlayerPosition(myId, newX, newY)

        // Throttled socket emit
        const now = Date.now()
        if (now - lastEmitRef.current >= EMIT_THROTTLE_MS) {
          lastEmitRef.current = now
          socketRef.current?.emit('move', { x: newX, y: newY })
        }

        // Throttled proximity check (runs slightly less often — every 80ms)
        if (now - lastProximityRef.current >= 80) {
          lastProximityRef.current = now
          checkProximity()
        }
      }

      // 2. Interpolate remote players toward their target positions
      pixi.interpolatePlayers()

      // 3. Pan camera to follow local player
      pixi.updateCamera(myId)
    }

    pixi.addTicker(gameTick)

    return () => {
      pixi.removeTicker(gameTick)
      pixi.destroy()
      pixiRef.current = null
    }
  }, [checkProximity])

  // ═════════════════════════════════════════════════════════════════════════
  // SEND CHAT MESSAGE
  // ═════════════════════════════════════════════════════════════════════════
  const handleSend = useCallback((roomId, text) => {
    socketRef.current?.emit('message', { roomId, text })
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden bg-cosmos-bg">
      {/* PixiJS canvas container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* React UI overlays */}
      <HUD />
      <ChatPanel onSend={handleSend} />
    </div>
  )
}
