export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'raik-theme'

export function getStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') {
      return stored
    }
  } catch {
    return null
  }
  return null
}

export function getInitialTheme(): Theme {
  return getStoredTheme() ?? 'light'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // ignore storage errors
  }
}
