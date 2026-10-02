import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthShell } from './features/Auth'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthShell><App /></AuthShell>
  </StrictMode>,
)
