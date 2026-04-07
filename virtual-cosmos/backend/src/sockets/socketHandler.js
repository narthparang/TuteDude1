/**
 * Socket.IO event handler.
 * Manages all real-time events: join, move, chat, room management, disconnect.
 */

import UserStore from '../models/UserStore.js'
import { getRoomId } from '../utils/roomUtils.js'

/**
 * Attach all socket event listeners for a single client connection.
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 */
export function registerSocketHandlers(socket, io) {
  const { id } = socket

  console.log(`[+] Client connected: ${id}`)

  // ─── JOIN ───────────────────────────────────────────────────────────────────
  // Client emits 'join' with their name and initial position.
  socket.on('join', ({ name, x, y }) => {
    // Validate and sanitize
    const safeName = String(name || 'Anonymous').slice(0, 24)
    const safeX = Number(x) || 400
    const safeY = Number(y) || 300

    UserStore.addUser(id, { name: safeName, x: safeX, y: safeY })

    // Send the joining user their own ID + full player list
    socket.emit('self-joined', { id, players: UserStore.getAllUsers() })

    // Notify every OTHER client about the new player
    socket.broadcast.emit('player-joined', UserStore.getUser(id))

    console.log(`[JOIN] ${safeName} (${id}) — total: ${UserStore.count()}`)
  })

  // ─── MOVE ────────────────────────────────────────────────────────────────────
  // Client emits 'move' whenever their position changes (throttled on client).
  socket.on('move', ({ x, y }) => {
    const safeX = Number(x)
    const safeY = Number(y)

    if (!isFinite(safeX) || !isFinite(safeY)) return

    UserStore.updatePosition(id, { x: safeX, y: safeY })

    // Broadcast updated position to all other clients
    socket.broadcast.emit('player-moved', { id, x: safeX, y: safeY })
  })

  // ─── JOIN ROOM ───────────────────────────────────────────────────────────────
  // Client requests to join a proximity chat room.
  socket.on('join-room', ({ roomId }) => {
    if (!roomId || typeof roomId !== 'string') return

    // Prevent duplicate joins
    if (socket.rooms.has(roomId)) return

    socket.join(roomId)
    console.log(`[ROOM JOIN] ${id} → ${roomId}`)
  })

  // ─── LEAVE ROOM ──────────────────────────────────────────────────────────────
  // Client requests to leave a proximity chat room (moved out of range).
  socket.on('leave-room', ({ roomId }) => {
    if (!roomId || typeof roomId !== 'string') return

    socket.leave(roomId)
    console.log(`[ROOM LEAVE] ${id} ← ${roomId}`)
  })

  // ─── MESSAGE ─────────────────────────────────────────────────────────────────
  // Client sends a message to a specific room.
  socket.on('message', ({ roomId, text }) => {
    if (!roomId || !text) return

    // Must be in the room to send
    if (!socket.rooms.has(roomId)) return

    const user = UserStore.getUser(id)
    if (!user) return

    const message = {
      id: `${id}_${Date.now()}`,
      senderId: id,
      senderName: user.name,
      text: String(text).slice(0, 500), // cap message length
      timestamp: Date.now(),
    }

    // Emit to everyone in the room (including sender)
    io.to(roomId).emit('room-message', { roomId, message })
  })

  // ─── DISCONNECT ──────────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    const user = UserStore.getUser(id)
    console.log(`[-] Client disconnected: ${id} (${user?.name ?? 'unknown'}) — reason: ${reason}`)

    UserStore.removeUser(id)

    // Notify all remaining clients to remove this player
    io.emit('player-left', id)
  })
}
