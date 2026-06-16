import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery'

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
  className?: string
  twoDayView?: boolean
  registerMode?: boolean
  fitViewport?: boolean
  pairSnap?: boolean
}

type GestureMode = 'pending' | 'scroll' | 'cancelled'

type GestureState = {
  pointerId: number
  startX: number
  startY: number
  startScrollLeft: number
  mode: GestureMode
}

const isScrollBlockedTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) {
    return true
  }
  return !!target.closest('button, a, input, select, textarea, label')
}

export function CalendarScroll({
  children,
  className,
  twoDayView = false,
  registerMode = false,
  fitViewport = false,
  pairSnap = false,
}: CalendarScrollProps) {
  const isMobilePairSnap = useMediaQuery('(max-width: 639px)') && pairSnap
  const topRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const gestureRef = useRef<GestureState | null>(null)
  const scrollGestureRef = useRef(false)
  const syncingRef = useRef(false)
  const setScrollLeftRef = useRef<(scrollLeft: number) => void>(() => {})
  const [contentWidth, setContentWidth] = useState(0)
  const [isScrollDragging, setIsScrollDragging] = useState(false)

  const { panBridge, dayCards } = useMemo(() => {
    const items = Children.toArray(children)
    return {
      panBridge: items.find((child) => isValidElement(child) && child.type === CalendarPanBridge),
      dayCards: items.filter((child) => !isValidElement(child) || child.type !== CalendarPanBridge),
    }
  }, [children])

  const childPairs = useMemo(() => {
    const pairs: ReactNode[][] = []
    for (let index = 0; index < dayCards.length; index += 2) {
      pairs.push(dayCards.slice(index, index + 2))
    }
    return pairs
  }, [dayCards])

  const consumeScrollGesture = useCallback((): boolean => {
    if (!scrollGestureRef.current) {
      return false
    }
    scrollGestureRef.current = false
    return true
  }, [])

  const setScrollLeft = useCallback((scrollLeft: number): void => {
    const main = mainRef.current
    const top = topRef.current
    if (!main) {
      return
    }

    const maxScroll = main.scrollWidth - main.clientWidth
    const next = Math.max(0, Math.min(scrollLeft, maxScroll))

    syncingRef.current = true
    main.scrollLeft = next
    if (top) {
      top.scrollLeft = next
    }
    requestAnimationFrame(() => {
      syncingRef.current = false
    })
  }, [])

  setScrollLeftRef.current = setScrollLeft

  useEffect(() => {
    const inner = innerRef.current
    const main = mainRef.current
    if (!inner) {
      return
    }

    const updateWidth = (): void => {
      setContentWidth(inner.scrollWidth)
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(inner)
    if (main && isMobilePairSnap) {
      observer.observe(main)
    }
    return () => observer.disconnect()
  }, [children, childPairs, isMobilePairSnap])

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

  const endGesture = (pointerId: number): void => {
    const main = mainRef.current
    const state = gestureRef.current
    if (!state || state.pointerId !== pointerId) {
      return
    }

    if (state.mode === 'scroll' && main?.hasPointerCapture(pointerId)) {
      main.releasePointerCapture(pointerId)
    }

    gestureRef.current = null
    setIsScrollDragging(false)
  }

  const handlePointerMove = (event: PointerEvent): void => {
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
    setScrollLeftRef.current(state.startScrollLeft - deltaX)
  }

  const handlePointerUp = (event: PointerEvent): void => {
    endGesture(event.pointerId)
  }

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    const main = mainRef.current
    if (!main || event.button > 0 || event.pointerType === 'touch') {
      return
    }
    if (isScrollBlockedTarget(event.target)) {
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

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [])

  useEffect(() => {
    const main = mainRef.current
    if (!main) {
      return
    }

    const onWheel = (event: WheelEvent): void => {
      const horizontalDelta = event.shiftKey ? event.deltaY : event.deltaX
      if (Math.abs(horizontalDelta) < 1) {
        return
      }

      if (Math.abs(horizontalDelta) >= Math.abs(event.deltaY) || event.shiftKey) {
        event.preventDefault()
        setScrollLeftRef.current(main.scrollLeft + horizontalDelta)
      }
    }

    main.addEventListener('wheel', onWheel, { passive: false })
    return () => main.removeEventListener('wheel', onWheel)
  }, [])

  const wrapClassName = [
    'calendar-scroll-wrap flex min-h-0 flex-col',
    twoDayView ? 'calendar-scroll-two-day' : '',
    registerMode ? 'calendar-scroll-register' : '',
    fitViewport ? 'calendar-scroll-fit' : '',
    isMobilePairSnap ? 'calendar-scroll-pair-snap' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  const mainFillsViewport = !registerMode || fitViewport || isMobilePairSnap
  const mainFitClass =
    fitViewport || isMobilePairSnap
      ? 'calendar-scroll-main-fit'
      : mainFillsViewport
        ? 'min-h-0 flex-1'
        : ''

  const hideTopBar = isMobilePairSnap

  const scrollContent = isMobilePairSnap ? (
    <>
      {childPairs.map((pair, pairIndex) => (
        <div key={`pair-${pairIndex}`} className="register-pair-page h-full shrink-0 snap-start snap-always">
          {pair}
        </div>
      ))}
    </>
  ) : (
    dayCards
  )

  return (
    <CalendarPanContext.Provider value={{ isScrollDragging, consumeScrollGesture }}>
      {panBridge}
      <div className={wrapClassName}>
        {!hideTopBar && (
          <div
            ref={topRef}
            onScroll={syncFromTop}
            className="calendar-scroll-top mb-2 mt-1 shrink-0 overflow-x-auto sm:mb-2 sm:mt-0"
          >
            <div className="calendar-scroll-top-track" style={{ width: contentWidth }} />
          </div>
        )}
        <div
          ref={mainRef}
          onScroll={syncFromMain}
          onPointerDownCapture={onPointerDown}
          className={`calendar-scroll-main overflow-x-auto pb-2 sm:pb-2 ${mainFitClass} ${
            isScrollDragging ? 'calendar-scroll-dragging' : ''
          }`}
        >
          <div
            ref={innerRef}
            className={`calendar-scroll-content flex min-w-max items-stretch gap-2 sm:gap-2 ${
              fitViewport || isMobilePairSnap ? 'calendar-scroll-content-fit' : mainFillsViewport ? 'h-full' : ''
            }`}
          >
            {scrollContent}
          </div>
        </div>
      </div>
    </CalendarPanContext.Provider>
  )
}
