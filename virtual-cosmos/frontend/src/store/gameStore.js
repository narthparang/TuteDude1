/**
 * Global Zustand store.
 * Only UI-driven state lives here (chat messages, connections, player list for HUD).
 * High-frequency game-loop state (raw positions, PixiJS objects) stays in refs inside GameCanvas.
 */

import { create } from 'zustand'
import { MAX_CHAT_MESSAGES } from '../constants/index.js'

const useGameStore = create((set, get) => ({
  // ─── Auth / Session ──────────────────────────────────────────────────────────
  myName: '',
  myId: null,
  isJoined: false,

  // ─── Players (lightweight, for HUD display) ──────────────────────────────────
  // Record<socketId, { id, name, x, y }>
  players: {},

  // ─── Connectivity ────────────────────────────────────────────────────────────
  isConnected: false,

  // ─── Proximity Connections ───────────────────────────────────────────────────
  // Record<socketId, roomId> — who we're currently connected to
  activeConnections: {},

  // ─── Chat ────────────────────────────────────────────────────────────────────
  // Record<roomId, Message[]>
  // Message: { id, senderId, senderName, text, timestamp }
  chatMessages: {},

  // Currently focused room (null = no chat panel)
  activeChatRoom: null,

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  setMyName: (name) => set({ myName: name }),
  setMyId: (id) => set({ myId: id }),
  setJoined: (val) => set({ isJoined: val }),
  setConnected: (val) => set({ isConnected: val }),

  // ─── Players ─────────────────────────────────────────────────────────────────
  setAllPlayers: (players) => set({ players }),

  upsertPlayer: (player) =>
    set((state) => ({
      players: { ...state.players, [player.id]: player },
    })),

  updatePlayerPosition: (id, x, y) =>
    set((state) => {
      const existing = state.players[id]
      if (!existing) return {}
      return {
        players: { ...state.players, [id]: { ...existing, x, y } },
      }
    }),

  removePlayer: (id) =>
    set((state) => {
      const players = { ...state.players }
      delete players[id]
      // Also clean up any connection with that player
      const activeConnections = { ...state.activeConnections }
      const chatMessages = { ...state.chatMessages }
      const roomId = activeConnections[id]
      if (roomId) {
        delete activeConnections[id]
        // Optionally keep chat history for the session — don't delete chatMessages[roomId]
      }
      return { players, activeConnections }
    }),

  // ─── Connections ─────────────────────────────────────────────────────────────
  addConnection: (socketId, roomId) =>
    set((state) => ({
      activeConnections: { ...state.activeConnections, [socketId]: roomId },
      // Auto-switch active chat to this room if none is active
      activeChatRoom: state.activeChatRoom ?? roomId,
    })),

  removeConnection: (socketId) =>
    set((state) => {
      const activeConnections = { ...state.activeConnections }
      const removedRoom = activeConnections[socketId]
      delete activeConnections[socketId]

      // If the active chat was this room and it's now empty, switch to another
      let { activeChatRoom } = state
      if (activeChatRoom === removedRoom) {
        const remaining = Object.values(activeConnections)
        activeChatRoom = remaining.length > 0 ? remaining[0] : null
      }

      return { activeConnections, activeChatRoom }
    }),

  clearAllConnections: () =>
    set({ activeConnections: {}, activeChatRoom: null }),

  setActiveChatRoom: (roomId) => set({ activeChatRoom: roomId }),

  // ─── Chat ─────────────────────────────────────────────────────────────────────
  addMessage: (roomId, message) =>
    set((state) => {
      const existing = state.chatMessages[roomId] ?? []
      const updated = [...existing, message].slice(-MAX_CHAT_MESSAGES)
      return { chatMessages: { ...state.chatMessages, [roomId]: updated } }
    }),

  // Derived helpers (called outside React, so we expose as functions)
  getActiveConnectionCount: () => Object.keys(get().activeConnections).length,
}))

export default useGameStore
