import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import IncidenciasPartidosOverlay from './IncidenciasPartidosOverlay.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <IncidenciasPartidosOverlay />
  </StrictMode>,
)
