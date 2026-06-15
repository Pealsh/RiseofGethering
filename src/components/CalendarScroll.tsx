import { useEffect, useRef, useState, type ReactNode } from 'react'

interface CalendarScrollProps {
  children: ReactNode
}

export function CalendarScroll({ children }: CalendarScrollProps) {
  const topRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [contentWidth, setContentWidth] = useState(0)

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

  const syncFromTop = (): void => {
    if (!topRef.current || !mainRef.current) {
      return
    }
    mainRef.current.scrollLeft = topRef.current.scrollLeft
  }

  const syncFromMain = (): void => {
    if (!topRef.current || !mainRef.current) {
      return
    }
    topRef.current.scrollLeft = mainRef.current.scrollLeft
  }

  return (
    <div>
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
        className="calendar-scroll-main snap-x snap-mandatory overflow-x-auto pb-4"
      >
        <div ref={innerRef} className="flex min-w-max gap-2.5">
          {children}
        </div>
      </div>
    </div>
  )
}
