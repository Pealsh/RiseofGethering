import { useCallback, useRef, type TouchEvent } from 'react'

type TabType = 'gather' | 'register'

const SWIPE_THRESHOLD = 50

export function useMobileTabSwipe(
  activeTab: TabType,
  onTabChange: (tab: TabType) => void,
): {
  onTouchStart: (event: TouchEvent) => void
  onTouchMove: (event: TouchEvent) => void
  onTouchEnd: () => void
  onTouchCancel: () => void
} {
  const startXRef = useRef(0)
  const dragXRef = useRef(0)
  const draggingRef = useRef(false)

  const onTouchStart = useCallback((event: TouchEvent): void => {
    if (event.touches.length !== 1) {
      return
    }
    startXRef.current = event.touches[0].clientX
    dragXRef.current = 0
    draggingRef.current = true
  }, [])

  const onTouchMove = useCallback((event: TouchEvent): void => {
    if (!draggingRef.current || event.touches.length !== 1) {
      return
    }
    dragXRef.current = event.touches[0].clientX - startXRef.current
  }, [])

  const finish = useCallback((): void => {
    const deltaX = dragXRef.current
    if (deltaX < -SWIPE_THRESHOLD && activeTab === 'gather') {
      onTabChange('register')
    } else if (deltaX > SWIPE_THRESHOLD && activeTab === 'register') {
      onTabChange('gather')
    }
    dragXRef.current = 0
    draggingRef.current = false
  }, [activeTab, onTabChange])

  const onTouchEnd = useCallback((): void => {
    finish()
  }, [finish])

  const onTouchCancel = useCallback((): void => {
    dragXRef.current = 0
    draggingRef.current = false
  }, [])

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel }
}
