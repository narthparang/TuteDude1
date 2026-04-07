/**
 * Virtual Cosmos — Backend Entry Point
 * Express + Socket.IO server for real-time multiplayer management.
 */

import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { registerSocketHandlers } from './src/sockets/socketHandler.js'

const PORT = process.env.PORT || 3001

const app = express()

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }))
app.use(express.json())

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// ─── HTTP + SOCKET.IO ─────────────────────────────────────────────────────────
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  // Tune for real-time performance
  pingTimeout: 20000,
  pingInterval: 10000,
})

// ─── SOCKET EVENTS ───────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  registerSocketHandlers(socket, io)
})

// ─── START ────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Virtual Cosmos server running on http://localhost:${PORT}\n`)
})
