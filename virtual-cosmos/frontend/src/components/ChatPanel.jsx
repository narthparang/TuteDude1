/**
 * ChatPanel — proximity-based chat UI.
 *
 * Appears only when activeConnections is non-empty.
 * Supports multiple simultaneous connections (tabbed by room).
 * Auto-scrolls to the latest message.
 * Sends messages via the passed `onSend` callback.
 */

import { useEffect, useRef, useState } from 'react'
import useGameStore from '../store/gameStore.js'
import { MAX_MESSAGE_LENGTH } from '../constants/index.js'

/**
 * @param {{ onSend: (roomId: string, text: string) => void }} props
 */
export default function ChatPanel({ onSend }) {
  const players = useGameStore((s) => s.players)
  const myId = useGameStore((s) => s.myId)
  const activeConnections = useGameStore((s) => s.activeConnections)
  const chatMessages = useGameStore((s) => s.chatMessages)
  const activeChatRoom = useGameStore((s) => s.activeChatRoom)
  const setActiveChatRoom = useGameStore((s) => s.setActiveChatRoom)

  const [draft, setDraft] = useState('')
  const messagesEndRef = useRef(null)

  // Scroll to bottom whenever the active room's messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, activeChatRoom])

  const connectionEntries = Object.entries(activeConnections)
  const isOpen = connectionEntries.length > 0

  if (!isOpen) {
    return (
      <div
        className="pointer-events-none absolute bottom-4 right-4 z-20
                   flex items-center gap-2 rounded-full border border-cosmos-border
                   bg-cosmos-panel/80 px-4 py-2 text-xs text-cosmos-muted backdrop-blur"
      >
        <span className="h-2 w-2 rounded-full bg-cosmos-muted" />
        No nearby users — explore!
      </div>
    )
  }

  const currentMessages =
    activeChatRoom ? (chatMessages[activeChatRoom] ?? []) : []

  const handleSend = (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !activeChatRoom) return
    onSend(activeChatRoom, text)
    setDraft('')
  }

  return (
    <div
      className="absolute bottom-4 right-4 z-20 flex h-[420px] w-80 flex-col
                 overflow-hidden rounded-xl border border-cosmos-border
                 bg-cosmos-panel shadow-2xl"
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-cosmos-border px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-cosmos-success" />
          <span className="text-xs font-semibold text-cosmos-text">
            Nearby Chat
          </span>
        </div>
        <span className="text-xs text-cosmos-muted">
          {connectionEntries.length} connection{connectionEntries.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Room Tabs ────────────────────────────────────────────────────────── */}
      {connectionEntries.length > 1 && (
        <div className="flex overflow-x-auto border-b border-cosmos-border bg-cosmos-bg/40">
          {connectionEntries.map(([otherId, roomId]) => {
            const otherName = players[otherId]?.name ?? otherId.slice(0, 6)
            const isActive = roomId === activeChatRoom
            const unread = (chatMessages[roomId] ?? []).length

            return (
              <button
                key={roomId}
                onClick={() => setActiveChatRoom(roomId)}
                className={`flex-shrink-0 px-3 py-1.5 text-xs transition
                  ${isActive
                    ? 'border-b-2 border-cosmos-accent text-cosmos-highlight'
                    : 'text-cosmos-muted hover:text-cosmos-text'
                  }`}
              >
                {otherName}
              </button>
            )
          })}
        </div>
      )}

      {/* Single-connection name header */}
      {connectionEntries.length === 1 && (
        <div className="border-b border-cosmos-border px-4 py-1.5">
          <p className="text-xs text-cosmos-muted">
            Chatting with{' '}
            <span className="font-semibold text-cosmos-highlight">
              {players[connectionEntries[0][0]]?.name ?? 'nearby user'}
            </span>
          </p>
        </div>
      )}

      {/* ── Messages ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scrollbar-thin">
        {currentMessages.length === 0 ? (
          <p className="mt-4 text-center text-xs text-cosmos-muted">
            Say hello! 👋
          </p>
        ) : (
          currentMessages.map((msg) => {
            const isOwn = msg.senderId === myId
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
              >
                {!isOwn && (
                  <span className="mb-0.5 text-[10px] text-cosmos-muted">
                    {msg.senderName}
                  </span>
                )}
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-1.5 text-sm leading-snug
                    ${isOwn
                      ? 'bg-cosmos-accent text-white'
                      : 'bg-cosmos-bg text-cosmos-text'
                    }`}
                >
                  {msg.text}
                </div>
                <span className="mt-0.5 text-[9px] text-cosmos-muted">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ────────────────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSend}
        className="flex gap-2 border-t border-cosmos-border px-3 py-2"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()} // prevent game keys while typing
          placeholder="Type a message..."
          maxLength={MAX_MESSAGE_LENGTH}
          className="flex-1 rounded-md border border-cosmos-border bg-cosmos-bg px-3 py-1.5
                     text-xs text-cosmos-text placeholder-cosmos-muted outline-none
                     focus:border-cosmos-accent focus:ring-1 focus:ring-cosmos-accent"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="rounded-md bg-cosmos-accent px-3 py-1.5 text-xs font-semibold
                     text-white transition hover:bg-indigo-500 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  )
}
