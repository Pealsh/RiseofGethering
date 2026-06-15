import { useEffect, useState, type ReactNode } from 'react'
import { applyTheme, getInitialTheme, saveTheme, type Theme } from '../lib/theme'
import { ThemeContext } from './theme-context'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme())

  useEffect(() => {
    applyTheme(theme)
    saveTheme(theme)
  }, [theme])

  const toggleTheme = (): void => {
    document.documentElement.classList.add('theme-switching')
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    applyTheme(next)
    saveTheme(next)
    setTheme(next)
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.documentElement.classList.remove('theme-switching')
      })
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
  )
}
