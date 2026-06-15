import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

const GESTURE_THRESHOLD = 8

type CalendarPanContextValue = {
  isScrollDragging: boolean
  consumeScrollGesture: () => boolean
}

const CalendarPanContext = createContext<CalendarPanContextValue>({
  isScrollDragging: false,
  consumeScrollGesture: () => false,
})

export function useCalendarPan(): CalendarPanContextValue {
  return useContext(CalendarPanContext)
}

export function CalendarPanBridge({
  bind,
}: {
  bind: (consumeScrollGesture: () => boolean) => void
}): null {
  const { consumeScrollGesture } = useCalendarPan()

  useEffect(() => {
    bind(consumeScrollGesture)
  }, [bind, consumeScrollGesture])

  return null
}

interface CalendarScrollProps {
  children: ReactNode
}

type GestureMode = 'pending' | 'scroll' | 'cancelled'

type GestureState = {
  pointerId: number
  startX: number
  startY: number
  startScrollLeft: number
  mode: GestureMode
}

export function CalendarScroll({ children }: CalendarScrollProps) {
  const topRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const gestureRef = useRef<GestureState | null>(null)
  const scrollGestureRef = useRef(false)
  const syncingRef = useRef(false)
  const [contentWidth, setContentWidth] = useState(0)
  const [isScrollDragging, setIsScrollDragging] = useState(false)

  const consumeScrollGesture = useCallback((): boolean => {
    if (!scrollGestureRef.current) {
      return false
    }
    scrollGestureRef.current = false
    return true
  }, [])

  useEffect(() => {
    const inner = innerRef.current
    if (!inner) {
      return
    }

    const updateWidth = (): void => {
      setContentWidth(inner.scrollWidth)
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(inner)
    return () => observer.disconnect()
  }, [children])

  const setScrollLeft = useCallback((scrollLeft: number): void => {
    const main = mainRef.current
    const top = topRef.current
    if (!main) {
      return
    }

    syncingRef.current = true
    main.scrollLeft = scrollLeft
    if (top) {
      top.scrollLeft = scrollLeft
    }
    requestAnimationFrame(() => {
      syncingRef.current = false
    })
  }, [])

  const syncFromTop = (): void => {
    if (syncingRef.current || !topRef.current || !mainRef.current) {
      return
    }
    setScrollLeft(topRef.current.scrollLeft)
  }

  const syncFromMain = (): void => {
    if (syncingRef.current || !topRef.current || !mainRef.current) {
      return
    }
    setScrollLeft(mainRef.current.scrollLeft)
  }

  const endGesture = (event: React.PointerEvent<HTMLDivElement>): void => {
    const main = mainRef.current
    const state = gestureRef.current
    if (!state) {
      return
    }

    if (state.mode === 'scroll' && main?.hasPointerCapture(event.pointerId)) {
      main.releasePointerCapture(event.pointerId)
    }

    gestureRef.current = null
    setIsScrollDragging(false)
  }

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    const main = mainRef.current
    if (!main || event.button > 0) {
      return
    }

    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: main.scrollLeft,
      mode: 'pending',
    }
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    const main = mainRef.current
    const state = gestureRef.current
    if (!main || !state || state.pointerId !== event.pointerId) {
      return
    }

    const deltaX = event.clientX - state.startX
    const deltaY = event.clientY - state.startY

    if (state.mode === 'pending') {
      if (Math.abs(deltaX) < GESTURE_THRESHOLD && Math.abs(deltaY) < GESTURE_THRESHOLD) {
        return
      }

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        state.mode = 'scroll'
        state.startScrollLeft = main.scrollLeft
        scrollGestureRef.current = true
        setIsScrollDragging(true)
        main.setPointerCapture(event.pointerId)
      } else {
        state.mode = 'cancelled'
        gestureRef.current = null
        return
      }
    }

    if (state.mode !== 'scroll') {
      return
    }

    event.preventDefault()
    setScrollLeft(state.startScrollLeft - deltaX)
  }

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>): void => {
    endGesture(event)
  }

  useEffect(() => {
    const onWindowPointerUp = (): void => {
      const main = mainRef.current
      const state = gestureRef.current
      if (state?.mode === 'scroll' && main?.hasPointerCapture(state.pointerId)) {
        main.releasePointerCapture(state.pointerId)
      }
      gestureRef.current = null
      setIsScrollDragging(false)
    }

    window.addEventListener('pointerup', onWindowPointerUp)
    window.addEventListener('pointercancel', onWindowPointerUp)
    return () => {
      window.removeEventListener('pointerup', onWindowPointerUp)
      window.removeEventListener('pointercancel', onWindowPointerUp)
    }
  }, [])

  return (
    <CalendarPanContext.Provider value={{ isScrollDragging, consumeScrollGesture }}>
      <div className="calendar-scroll-wrap">
        <div
          ref={topRef}
          onScroll={syncFromTop}
          aria-hidden
          className="calendar-scroll-top mb-2 overflow-x-auto"
        >
          <div style={{ width: contentWidth, height: 1 }} />
        </div>
        <div
          ref={mainRef}
          onScroll={syncFromMain}
          onPointerDownCapture={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={`calendar-scroll-main overflow-x-auto pb-4 ${
            isScrollDragging ? 'calendar-scroll-dragging' : ''
          }`}
        >
          <div ref={innerRef} className="calendar-scroll-content flex min-w-max gap-2.5">
            {children}
          </div>
        </div>
      </div>
    </CalendarPanContext.Provider>
  )
}
