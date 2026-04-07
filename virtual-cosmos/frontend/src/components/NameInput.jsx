/**
 * NameInput — splash / login screen.
 * User enters their display name before entering the cosmos.
 */

import { useState } from 'react'
import useGameStore from '../store/gameStore.js'

export default function NameInput({ onJoin }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Please enter a display name.')
      return
    }
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters.')
      return
    }
    useGameStore.getState().setMyName(trimmed)
    onJoin(trimmed)
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-cosmos-bg px-4">
      {/* Glow backdrop */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="h-96 w-96 rounded-full bg-cosmos-accent opacity-5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Title */}
        <div className="mb-10 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-white">
            Virtual{' '}
            <span className="text-cosmos-highlight">Cosmos</span>
          </h1>
          <p className="mt-3 text-cosmos-muted text-sm">
            Move around · Get close · Chat instantly
          </p>
        </div>

        {/* Instructions */}
        <div className="mb-8 rounded-lg border border-cosmos-border bg-cosmos-panel p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-cosmos-muted">
            How it works
          </p>
          <ul className="space-y-1 text-sm text-cosmos-text">
            <li>🕹️ Move with <kbd className="rounded bg-cosmos-border px-1 text-xs">WASD</kbd> or arrow keys</li>
            <li>👥 Approach other users to start chatting</li>
            <li>💬 Chat panel opens automatically when nearby</li>
            <li>🚶 Walk away to disconnect</li>
          </ul>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="nameInput"
              className="mb-1 block text-xs font-semibold uppercase tracking-widest text-cosmos-muted"
            >
              Display Name
            </label>
            <input
              id="nameInput"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
              onKeyDown={(e) => e.stopPropagation()} // don't trigger game keys
              placeholder="Enter your name..."
              maxLength={24}
              autoFocus
              className="w-full rounded-lg border border-cosmos-border bg-cosmos-panel px-4 py-3
                         text-cosmos-text placeholder-cosmos-muted outline-none ring-0
                         transition focus:border-cosmos-accent focus:ring-1 focus:ring-cosmos-accent"
            />
            {error && (
              <p className="mt-1 text-xs text-cosmos-danger">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-cosmos-accent py-3 text-sm font-semibold text-white
                       transition hover:bg-indigo-500 active:scale-[0.98]"
          >
            Enter the Cosmos →
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-cosmos-muted">
          Open multiple tabs to test multiplayer
        </p>
      </div>
    </div>
  )
}
