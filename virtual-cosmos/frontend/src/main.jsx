import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode is intentionally omitted to avoid PixiJS double-init in dev.
  // For production React best-practices in non-canvas code, StrictMode is fine.
  <App />
)
