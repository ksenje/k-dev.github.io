import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { PlayerProvider } from './components/music/PlayerProvider'
import './index.css'

const container = document.getElementById('root')

if (!container) throw new Error('Root container not found')

createRoot(container).render(
  <StrictMode>
    <PlayerProvider>
      <App />
    </PlayerProvider>
  </StrictMode>,
)