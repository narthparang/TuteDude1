# Virtual Cosmos

A real-time 2D virtual environment where users can move around and interact through **proximity-based chat**. Built with React + PixiJS on the frontend and Node.js + Socket.IO on the backend.

> When users come close → chat connects.  
> When users move away → chat disconnects.

---

## Demo Features

- 🕹️ **Smooth movement** via WASD / arrow keys (60fps, diagonal normalised)
- 👥 **Real-time multiplayer** — see all connected users move live
- 📡 **Proximity detection** — Euclidean distance check every 80ms
- 💬 **Auto-connect chat** — chat panel appears when within 150px of another user
- 🔄 **Interpolation** — remote players animate smoothly between position updates
- 🎨 **PixiJS canvas** — grid-based world with camera that follows your avatar
- 🧹 **Clean teardown** — player removed from canvas on disconnect, stale rooms cleaned up

---

## Project Structure

```
virtual-cosmos/
├── backend/
│   ├── server.js                 # Express + Socket.IO entry point
│   ├── package.json
│   └── src/
│       ├── models/
│       │   └── UserStore.js      # In-memory user state
│       ├── sockets/
│       │   └── socketHandler.js  # All socket event handlers
│       └── utils/
│           └── roomUtils.js      # Deterministic room ID generation
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── package.json
    └── src/
        ├── main.jsx              # React entry point
        ├── App.jsx               # Screen router (lobby → game)
        ├── constants/
        │   └── index.js          # All tunable constants (speed, radius, etc.)
        ├── utils/
        │   ├── distance.js       # euclidean, lerp, clamp
        │   └── roomUtils.js      # getRoomId, colorIndexForId
        ├── store/
        │   └── gameStore.js      # Zustand — UI state only (chat, connections, HUD)
        ├── hooks/
        │   └── useKeyboard.js    # Tracks pressed keys; getDelta() helper
        ├── game/
        │   └── PixiGame.js       # PixiJS rendering engine class
        └── components/
            ├── NameInput.jsx     # Lobby / login screen
            ├── GameCanvas.jsx    # Orchestrates Pixi + sockets + game loop
            ├── ChatPanel.jsx     # Proximity chat UI (tabbed for multiple connections)
            └── HUD.jsx           # Player count, controls, connection status overlay
```

---

## Setup & Running

### Prerequisites

- Node.js 18+
- npm 9+

### 1. Clone / navigate to the project

```bash
cd virtual-cosmos
```

### 2. Install & start the backend

```bash
cd backend
npm install
npm run dev       # starts on http://localhost:3001
```

> Uses `nodemon` for auto-reload in development.  
> For production: `npm start`

### 3. Install & start the frontend

```bash
cd ../frontend
npm install
npm run dev       # starts on http://localhost:5173
```

### 4. Open the app

Open **http://localhost:5173** in your browser.  
Open a **second tab** (or different browser) to test multiplayer.

---

## Architecture

### Frontend

| Layer | Responsibility |
|---|---|
| `PixiGame` | Pure rendering: players, grid, camera, connection lines |
| `GameCanvas` | Game loop, socket events, proximity logic — all in refs |
| Zustand store | UI state only: chat messages, player list for HUD, active connections |
| `useKeyboard` | Tracks raw key presses; `getDelta()` produces normalised movement vector |

**Why refs for game state?**  
High-frequency updates (60fps) must never trigger React re-renders. Positions, the socket instance, and PixiJS objects all live in `useRef`. Only chat messages, the connections list (for the HUD), and player names flow through Zustand.

### Backend

| Module | Responsibility |
|---|---|
| `UserStore` | In-memory `Map` of all connected users with position |
| `socketHandler` | Registers all Socket.IO event handlers for each connection |
| `roomUtils` | `getRoomId(a, b)` — sorted join ensures both sides agree on room name |

### Socket Events

| Direction | Event | Payload |
|---|---|---|
| Client → Server | `join` | `{ name, x, y }` |
| Server → Client | `self-joined` | `{ id, players }` |
| Server → Others | `player-joined` | `{ id, name, x, y }` |
| Client → Server | `move` | `{ x, y }` (throttled 50ms) |
| Server → Others | `player-moved` | `{ id, x, y }` |
| Server → All | `player-left` | `socketId` |
| Client → Server | `join-room` | `{ roomId }` |
| Client → Server | `leave-room` | `{ roomId }` |
| Client → Server | `message` | `{ roomId, text }` |
| Server → Room | `room-message` | `{ roomId, message }` |

### Proximity Logic

```
Every 80ms during movement:
  for each remote player:
    dist = sqrt((myX - px)² + (myY - py)²)
    if dist < 150:
      roomId = sort([myId, theirId]).join("_")
      if not already connected:
        emit join-room
        store.addConnection(theirId, roomId)
    else:
      if was connected:
        emit leave-room
        store.removeConnection(theirId)
```

---

## Configuration

All tunable values live in `frontend/src/constants/index.js`:

| Constant | Default | Description |
|---|---|---|
| `PROXIMITY_RADIUS` | 150px | Distance at which chat connects |
| `PLAYER_SPEED` | 3px/frame | Movement speed |
| `EMIT_THROTTLE_MS` | 50ms | Min interval between position emits |
| `LERP_FACTOR` | 0.15 | Remote player interpolation speed |
| `WORLD_WIDTH` | 3000px | Canvas world width |
| `WORLD_HEIGHT` | 2000px | Canvas world height |

---

## Tech Stack Justification

| Choice | Reason |
|---|---|
| **PixiJS v7** | GPU-accelerated 2D canvas, best-in-class for 20+ moving sprites at 60fps |
| **React + Vite** | Fast dev experience, component model for UI overlays (HUD, chat) |
| **Zustand** | Minimal boilerplate state for UI-only data; `getState()` usable outside React hooks |
| **Socket.IO** | Auto-reconnect, room management, cross-browser WebSocket with fallback |
| **In-memory store** | No persistence needed for sessions; lower latency than DB reads on every move |
| **Tailwind CSS** | Utility-first → rapid UI iteration without context-switching to CSS files |
