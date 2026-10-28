import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import App from './app/App'
import { ProgressProvider } from './lib/ProgressContext'
import { runAllChecks } from './lib/engineChecks'
import './styles.css'

// Used by `npm run selftest` to verify the built app.
window.__dataraSelfTest = runAllChecks

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <ProgressProvider>
        <App />
      </ProgressProvider>
    </HashRouter>
  </StrictMode>
)
