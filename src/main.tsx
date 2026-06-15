import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeProvider.tsx'
import { ThemeToggle } from './components/ThemeToggle.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
      <ThemeToggle />
    </ThemeProvider>
  </StrictMode>,
)
