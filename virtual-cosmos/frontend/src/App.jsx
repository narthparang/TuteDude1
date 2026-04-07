/**
 * App — top-level component.
 * Handles the two screens: NameInput (lobby) and GameCanvas (world).
 */

import { useState } from 'react'
import NameInput from './components/NameInput.jsx'
import GameCanvas from './components/GameCanvas.jsx'

export default function App() {
  const [playerName, setPlayerName] = useState(null)

  if (!playerName) {
    return <NameInput onJoin={setPlayerName} />
  }

  return <GameCanvas playerName={playerName} />
}
