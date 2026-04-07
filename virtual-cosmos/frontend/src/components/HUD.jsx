/**
 * HUD — heads-up display overlay shown during gameplay.
 * Displays: player count, connection status, control hints, mini legend.
 */

import useGameStore from '../store/gameStore.js'

export default function HUD() {
  const players = useGameStore((s) => s.players)
  const myId = useGameStore((s) => s.myId)
  const myName = useGameStore((s) => s.myName)
  const activeConnections = useGameStore((s) => s.activeConnections)
  const isConnected = useGameStore((s) => s.isConnected)

  const playerCount = Object.keys(players).length
  const connectionCount = Object.keys(activeConnections).length

  return (
    <>
      {/* ── Top-left: server status + player info ─────────────────────────── */}
      <div
        className="absolute left-4 top-4 z-20 flex flex-col gap-2"
        style={{ pointerEvents: 'none' }}
      >
        {/* Connection pill */}
        <div className="flex items-center gap-2 rounded-full border border-cosmos-border
                        bg-cosmos-panel/90 px-3 py-1.5 backdrop-blur">
          <span
            className={`h-2 w-2 rounded-full ${
              isConnected ? 'bg-cosmos-success animate-pulse' : 'bg-cosmos-danger'
            }`}
          />
          <span className="text-xs text-cosmos-text">
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>

        {/* Player identity */}
        <div className="rounded-lg border border-cosmos-border bg-cosmos-panel/90 px-3 py-2 backdrop-blur">
          <p className="text-[10px] uppercase tracking-widest text-cosmos-muted">
            You
          </p>
          <p className="text-sm font-semibold text-cosmos-text">{myName}</p>
        </div>

        {/* World stats */}
        <div className="rounded-lg border border-cosmos-border bg-cosmos-panel/90 px-3 py-2 backdrop-blur">
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-cosmos-muted">Players</p>
              <p className="text-sm font-bold text-cosmos-text">{playerCount}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-cosmos-muted">Nearby</p>
              <p
                className={`text-sm font-bold ${
                  connectionCount > 0 ? 'text-cosmos-success' : 'text-cosmos-muted'
                }`}
              >
                {connectionCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom-left: controls ─────────────────────────────────────────── */}
      <div
        className="absolute bottom-4 left-4 z-20 rounded-lg border border-cosmos-border
                   bg-cosmos-panel/80 px-3 py-2 backdrop-blur"
        style={{ pointerEvents: 'none' }}
      >
        <p className="mb-1 text-[10px] uppercase tracking-widest text-cosmos-muted">Controls</p>
        <div className="flex gap-3 text-xs text-cosmos-muted">
          <span>
            <kbd className="rounded bg-cosmos-border px-1 font-mono text-[10px]">W A S D</kbd>
            {' '}or{' '}
            <kbd className="rounded bg-cosmos-border px-1 font-mono text-[10px]">↑ ← ↓ →</kbd>
            {' '}Move
          </span>
        </div>
      </div>

      {/* ── Top-right: nearby connections list ───────────────────────────── */}
      {connectionCount > 0 && (
        <div
          className="absolute right-4 top-4 z-20 rounded-lg border border-cosmos-border
                     bg-cosmos-panel/90 px-3 py-2 backdrop-blur"
          style={{ pointerEvents: 'none' }}
        >
          <p className="mb-1 text-[10px] uppercase tracking-widest text-cosmos-success">
            Connected
          </p>
          {Object.keys(activeConnections).map((id) => {
            const p = players[id]
            if (!p) return null
            return (
              <div key={id} className="flex items-center gap-1.5 text-xs text-cosmos-text">
                <span className="h-1.5 w-1.5 rounded-full bg-cosmos-success" />
                {p.name}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
