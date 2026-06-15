import { useEffect, useState } from 'react'

const getTodayStart = (): Date => {
  const base = new Date()
  return new Date(base.getFullYear(), base.getMonth(), base.getDate())
}

export function useRollingToday(): Date {
  const [today, setToday] = useState<Date>(() => getTodayStart())

  useEffect(() => {
    const syncToday = (): void => {
      const next = getTodayStart()
      setToday((prev) => (prev.getTime() === next.getTime() ? prev : next))
    }

    let midnightTimer = 0

    const scheduleMidnightRefresh = (): void => {
      const now = new Date()
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      const delay = nextMidnight.getTime() - now.getTime() + 1000
      midnightTimer = window.setTimeout(() => {
        syncToday()
        scheduleMidnightRefresh()
      }, delay)
    }

    scheduleMidnightRefresh()
    const intervalTimer = window.setInterval(syncToday, 60_000)

    const onVisible = (): void => {
      if (document.visibilityState === 'visible') {
        syncToday()
      }
    }

    window.addEventListener('focus', syncToday)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearTimeout(midnightTimer)
      window.clearInterval(intervalTimer)
      window.removeEventListener('focus', syncToday)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return today
}
