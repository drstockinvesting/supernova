import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { SessionProvider } from './session/session.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Every route the app owns hangs off the deploy's base, which is `/` in dev
        and the repository subdirectory on a project Pages site. */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <SessionProvider>
        <App />
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
)
