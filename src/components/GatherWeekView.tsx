import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const HOURS = Array.from({ length: 24 }, (_, index) => index)
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

interface GatherWeekViewProps {
  dateKeys: string[]
  allCounts: Record<string, number[]>
  className?: string
}

const chunkWeeks = (dateKeys: string[]): string[][] => {
  const weeks: string[][] = []
  for (let index = 0; index < dateKeys.length; index += 7) {
    weeks.push(dateKeys.slice(index, index + 7))
  }
  return weeks
}

const formatWeekRange = (weekDates: string[]): string => {
  const first = weekDates[0]
  const last = weekDates[weekDates.length - 1]
  if (!first || !last) {
    return ''
  }
  const start = new Date(`${first}T00:00:00`)
  const end = new Date(`${last}T00:00:00`)
  return `${start.getMonth() + 1}/${start.getDate()}(${WEEKDAYS[start.getDay()]}) 〜 ${end.getMonth() + 1}/${end.getDate()}(${WEEKDAYS[end.getDay()]})`
}

const formatDayHeader = (
  dateKey: string,
): { day: string; weekday: string; isSunday: boolean; isSaturday: boolean } => {
  const date = new Date(`${dateKey}T00:00:00`)
  const weekdayIndex = date.getDay()
  return {
    day: `${date.getMonth() + 1}/${date.getDate()}`,
    weekday: WEEKDAYS[weekdayIndex],
    isSunday: weekdayIndex === 0,
    isSaturday: weekdayIndex === 6,
  }
}

const formatHour = (hour: number): string => `${hour.toString().padStart(2, '0')}:00`

const cellClass = (count: number): string => {
  if (count >= 3) {
    return 'gather-cell-hot bg-slate-800 text-white dark:bg-yellow-400 dark:text-slate-900'
  }
  if (count === 2) {
    return 'gather-cell-mid bg-slate-400 text-white dark:bg-slate-500'
  }
  if (count === 1) {
    return 'gather-cell-low bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-100'
  }
  return 'text-transparent'
}

function GatherCell({ count }: { count: number }): React.ReactElement {
  return (
    <div
      className={`gather-cell flex h-full w-full items-center justify-center text-[11px] font-medium leading-none sm:text-xs ${cellClass(count)}`}
    >
      {count > 0 ? (count >= 3 ? `⚔ ${count}` : count) : null}
    </div>
  )
}

export function GatherWeekView({ dateKeys, allCounts, className }: GatherWeekViewProps): React.ReactElement {
  const mainRef = useRef<HTMLDivElement>(null)
  const [pageWidth, setPageWidth] = useState(0)
  const [activeWeekIndex, setActiveWeekIndex] = useState(0)

  const weeks = useMemo(() => chunkWeeks(dateKeys), [dateKeys])
  const activeWeek = weeks[activeWeekIndex] ?? weeks[0] ?? []

  const updatePageWidth = useCallback((): void => {
    const main = mainRef.current
    if (!main) {
      return
    }
    setPageWidth(main.clientWidth)
  }, [])

  const scrollToWeek = useCallback(
    (index: number): void => {
      const main = mainRef.current
      if (!main || pageWidth <= 0) {
        return
      }
      const next = Math.max(0, Math.min(index, weeks.length - 1))
      main.scrollTo({ left: next * pageWidth, behavior: 'smooth' })
      setActiveWeekIndex(next)
    },
    [pageWidth, weeks.length],
  )

  useEffect(() => {
    const main = mainRef.current
    if (!main) {
      return
    }

    updatePageWidth()
    const observer = new ResizeObserver(updatePageWidth)
    observer.observe(main)
    return () => observer.disconnect()
  }, [updatePageWidth, weeks])

  useEffect(() => {
    const main = mainRef.current
    if (!main || pageWidth <= 0) {
      return
    }

    const onScroll = (): void => {
      const index = Math.round(main.scrollLeft / pageWidth)
      setActiveWeekIndex(Math.max(0, Math.min(index, weeks.length - 1)))
    }

    main.addEventListener('scroll', onScroll, { passive: true })
    return () => main.removeEventListener('scroll', onScroll)
  }, [pageWidth, weeks.length])

  useEffect(() => {
    const main = mainRef.current
    if (!main) {
      return
    }

    const onWheel = (event: WheelEvent): void => {
      if (Math.abs(event.deltaY) < 1) {
        return
      }
      if (event.shiftKey || Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        event.preventDefault()
        main.scrollLeft += event.deltaY
      }
    }

    main.addEventListener('wheel', onWheel, { passive: false })
    return () => main.removeEventListener('wheel', onWheel)
  }, [])

  return (
    <div className={`gather-week-wrap flex min-h-0 flex-col ${className ?? ''}`}>
      <div className="gather-week-desktop-bar mb-2 hidden shrink-0 sm:block">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollToWeek(activeWeekIndex - 1)}
              disabled={activeWeekIndex <= 0}
              className="gather-week-nav-btn"
            >
              ← 前の週
            </button>
            <button
              type="button"
              onClick={() => scrollToWeek(activeWeekIndex + 1)}
              disabled={activeWeekIndex >= weeks.length - 1}
              className="gather-week-nav-btn"
            >
              次の週 →
            </button>
            <span className="ml-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              {formatWeekRange(activeWeek)}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {activeWeekIndex + 1} / {weeks.length}週
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="gather-legend-swatch gather-cell-low" />
              1人
            </span>
            <span className="flex items-center gap-1.5">
              <span className="gather-legend-swatch gather-cell-mid" />
              2人
            </span>
            <span className="flex items-center gap-1.5">
              <span className="gather-legend-swatch gather-cell-hot" />
              3人以上
            </span>
          </div>
        </div>
      </div>

      <div
        ref={mainRef}
        className="gather-week-pages min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
      >
        <div className="flex h-full">
          {weeks.map((weekDates, weekIndex) => {
            const paddedDates = [...weekDates]
            while (paddedDates.length < 7) {
              paddedDates.push('')
            }

            return (
              <section
                key={weekDates[0] ?? `week-${weekIndex}`}
                className="gather-week-page flex h-full shrink-0 snap-start snap-always flex-col"
                style={{ width: pageWidth > 0 ? pageWidth : '100%' }}
              >
                <p className="mb-1 shrink-0 text-center text-[11px] text-slate-500 sm:hidden dark:text-slate-400">
                  {formatWeekRange(weekDates)}
                </p>

                <div className="gather-week-table flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white sm:shadow-md dark:border-slate-700 dark:bg-slate-900">
                  <div className="gather-week-head grid shrink-0 border-b border-slate-200 dark:border-slate-700">
                    <div className="gather-week-corner border-r border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800" />
                    {paddedDates.map((dateKey, columnIndex) => {
                      if (!dateKey) {
                        return (
                          <div
                            key={`empty-h-${weekIndex}-${columnIndex}`}
                            className="border-r border-slate-200 bg-slate-50 last:border-r-0 dark:border-slate-700 dark:bg-slate-800"
                          />
                        )
                      }
                      const header = formatDayHeader(dateKey)
                      return (
                        <div
                          key={dateKey}
                          className={`border-r border-slate-200 px-1 py-1 text-center last:border-r-0 sm:py-1.5 dark:border-slate-700 ${
                            header.isSunday
                              ? 'bg-red-50 dark:bg-red-950/30'
                              : header.isSaturday
                                ? 'bg-blue-50 dark:bg-blue-950/30'
                                : 'bg-slate-50 dark:bg-slate-800'
                          }`}
                        >
                          <div className="text-[11px] font-semibold text-slate-800 sm:text-sm dark:text-slate-100">
                            {header.day}
                          </div>
                          <div
                            className={`text-[10px] sm:text-xs ${
                              header.isSunday
                                ? 'text-red-500 dark:text-red-400'
                                : header.isSaturday
                                  ? 'text-blue-500 dark:text-blue-400'
                                  : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {header.weekday}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="gather-week-body grid min-h-0 flex-1">
                    {HOURS.map((hour) => (
                      <div key={`hour-row-${weekIndex}-${hour}`} className="gather-week-row contents">
                        <div className="gather-week-hour flex items-center justify-end border-r border-b border-slate-200 bg-slate-50 pr-2 font-mono text-[11px] font-medium tabular-nums text-slate-600 sm:text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {formatHour(hour)}
                        </div>
                        {paddedDates.map((dateKey, columnIndex) => {
                          if (!dateKey) {
                            return (
                              <div
                                key={`empty-cell-${weekIndex}-${hour}-${columnIndex}`}
                                className="border-r border-b border-slate-200 last:border-r-0 dark:border-slate-700"
                              />
                            )
                          }
                          const header = formatDayHeader(dateKey)
                          const counts = allCounts[dateKey] ?? []
                          const count = counts[hour] ?? 0
                          return (
                            <div
                              key={`${dateKey}-${hour}`}
                              className={`border-r border-b border-slate-200 last:border-r-0 dark:border-slate-700 ${
                                header.isSunday
                                  ? 'bg-red-50/40 dark:bg-red-950/10'
                                  : header.isSaturday
                                    ? 'bg-blue-50/40 dark:bg-blue-950/10'
                                    : ''
                              }`}
                            >
                              <GatherCell count={count} />
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      </div>

      <p className="mt-1 shrink-0 text-center text-[10px] text-slate-400 sm:hidden dark:text-slate-500">
        横スワイプで週を移動　⚔は3人以上
      </p>
    </div>
  )
}
