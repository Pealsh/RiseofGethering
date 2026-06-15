import { useEffect, useMemo, useRef, useState } from 'react'
import {
  collection,
  collectionGroup,
  onSnapshot,
  setDoc,
  writeBatch,
  doc,
} from 'firebase/firestore'
import { db } from './firebase'
import { AuthPage } from './components/AuthPage'
import { CalendarPanBridge, CalendarScroll } from './components/CalendarScroll'
import { useRollingToday } from './hooks/useRollingToday'

const HOURS = Array.from({ length: 24 }, (_, index) => index)
const DAYS_TO_SHOW = 60
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

type TabType = 'register' | 'gather'
type Timetable = number[]
type TimetableByDate = Record<string, Timetable>
type DragState = {
  active: boolean
  value: 0 | 1
  weeks: number
}

type PaintPointerState = {
  x: number
  y: number
  dateKey: string
  hour: number
  pointerType: string
  scrolling: boolean
}

const PAINT_MOVE_THRESHOLD = 10

const SESSION_USER_KEY = 'raik-session-user'

const createEmptyTimetable = (): Timetable => Array.from({ length: 24 }, () => 0)

const toDateKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const addDays = (dateKey: string, days: number): string => {
  const next = new Date(`${dateKey}T00:00:00`)
  next.setDate(next.getDate() + days)
  return toDateKey(next)
}

const formatDisplayDate = (dateKey: string): string => {
  const date = new Date(`${dateKey}T00:00:00`)
  return `${date.getMonth() + 1}/${date.getDate()} (${WEEKDAYS[date.getDay()]})`
}

const getSavedSessionUser = (): string => {
  const saved = localStorage.getItem(SESSION_USER_KEY)
  return saved ?? ''
}

const ensureTimetable = (source?: Timetable): Timetable => {
  if (!source || source.length !== 24) {
    return createEmptyTimetable()
  }
  return [...source]
}

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('register')
  const [userId, setUserId] = useState<string>(() => getSavedSessionUser())
  const [mySchedules, setMySchedules] = useState<TimetableByDate>({})
  const [allCounts, setAllCounts] = useState<Record<string, number[]>>({})
  const [weekSpans, setWeekSpans] = useState<Record<string, number>>({})
  const [syncStatus, setSyncStatus] = useState<string>(
    db ? 'Firebase同期中' : 'Firebase未設定: ローカル表示のみ',
  )
  const dragState = useRef<DragState>({ active: false, value: 1, weeks: 1 })
  const paintPointer = useRef<PaintPointerState | null>(null)
  const consumeCalendarPanRef = useRef<() => boolean>(() => false)
  const mySchedulesRef = useRef<TimetableByDate>({})

  const today = useRollingToday()

  const dateKeys = useMemo(() => {
    return Array.from({ length: DAYS_TO_SHOW }, (_, index) =>
      toDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + index)),
    )
  }, [today])

  const firstDate = dateKeys[0]
  const lastDate = dateKeys[dateKeys.length - 1]

  useEffect(() => {
    mySchedulesRef.current = mySchedules
  }, [mySchedules])

  useEffect(() => {
    if (!db) {
      return
    }
    if (!userId) {
      return
    }

    const scheduleRef = collection(db, 'schedules', userId, 'dates')

    const unsubscribe = onSnapshot(
      scheduleRef,
      (snapshot) => {
        const next: TimetableByDate = {}
        snapshot.forEach((item) => {
          const data = item.data()
          const date = data.date as string
          if (date < firstDate || date > lastDate) {
            return
          }
          next[date] = ensureTimetable(data.timetable as Timetable)
        })
        setMySchedules(next)
      },
      (error) => {
        console.error('Own schedule sync error:', error)
        setSyncStatus(`自分のスケジュール同期エラー: ${error.message}`)
      },
    )

    return () => unsubscribe()
  }, [firstDate, lastDate, userId])

  useEffect(() => {
    if (!db) {
      return
    }

    const groupRef = collectionGroup(db, 'dates')

    const unsubscribe = onSnapshot(
      groupRef,
      (snapshot) => {
        const counts: Record<string, number[]> = {}
        snapshot.forEach((item) => {
          const data = item.data()
          const date = data.date as string
          if (date < firstDate || date > lastDate) {
            return
          }
          const timetable = ensureTimetable(data.timetable as Timetable)
          if (!counts[date]) {
            counts[date] = createEmptyTimetable()
          }
          timetable.forEach((value, hour) => {
            if (value === 1) {
              counts[date][hour] += 1
            }
          })
        })
        setAllCounts(counts)
        setSyncStatus(`同期済み (${snapshot.size}件のデータ)`)
      },
      (error) => {
        console.error('Firestore sync error:', error)
        setSyncStatus(`同期エラー: ${error.message}`)
      },
    )

    return () => unsubscribe()
  }, [firstDate, lastDate, userId])

  useEffect(() => {
    const onPointerUp = () => {
      dragState.current.active = false
    }
    window.addEventListener('pointerup', onPointerUp)
    return () => window.removeEventListener('pointerup', onPointerUp)
  }, [])

  const persistTimetables = async (updates: TimetableByDate): Promise<void> => {
    if (!db) {
      setSyncStatus('Firebase未設定: ローカル表示のみ')
      return
    }
    if (!userId) {
      setSyncStatus('ユーザーネーム未設定')
      return
    }
    const firestore = db

    const entries = Object.entries(updates)
    if (entries.length === 0) {
      return
    }

    try {
      setSyncStatus('保存中...')
      if (entries.length === 1) {
        const [date, timetable] = entries[0]
        await setDoc(
          doc(firestore, 'schedules', userId, 'dates', date),
          { userId, date, timetable },
          { merge: true },
        )
      } else {
        const batch = writeBatch(firestore)
        entries.forEach(([date, timetable]) => {
          batch.set(
            doc(firestore, 'schedules', userId, 'dates', date),
            { userId, date, timetable },
            { merge: true },
          )
        })
        await batch.commit()
      }
      setSyncStatus('保存済み')
    } catch {
      setSyncStatus('保存エラー')
    }
  }

  const applyUpdates = (updates: TimetableByDate): void => {
    setMySchedules((prev) => {
      const next = { ...prev }
      Object.entries(updates).forEach(([date, timetable]) => {
        next[date] = timetable
      })
      mySchedulesRef.current = next
      return next
    })
    void persistTimetables(updates)
  }

  const getWeekSpan = (dateKey: string): number => {
    return weekSpans[dateKey] ?? 1
  }

  const paintHour = (dateKey: string, hour: number, value: 0 | 1, weeks: number): void => {
    const updates: TimetableByDate = {}
    for (let index = 0; index < weeks; index += 1) {
      const targetDate = addDays(dateKey, index * 7)
      const timetable = ensureTimetable(mySchedulesRef.current[targetDate])
      timetable[hour] = value
      updates[targetDate] = timetable
    }
    applyUpdates(updates)
  }

  const continueSchedule = (dateKey: string, totalDays: number): void => {
    const source = ensureTimetable(mySchedulesRef.current[dateKey])
    const updates: TimetableByDate = {}
    for (let index = 0; index < totalDays; index += 1) {
      const targetDate = addDays(dateKey, index)
      updates[targetDate] = [...source]
    }
    applyUpdates(updates)
  }

  const startDragPaint = (dateKey: string, hour: number): void => {
    const current = ensureTimetable(mySchedulesRef.current[dateKey])[hour]
    const nextValue: 0 | 1 = current === 1 ? 0 : 1
    const weeks = getWeekSpan(dateKey)
    dragState.current = { active: true, value: nextValue, weeks }
    paintHour(dateKey, hour, nextValue, weeks)
  }

  const moveDragPaint = (dateKey: string, hour: number): void => {
    if (!dragState.current.active) {
      return
    }
    paintHour(dateKey, hour, dragState.current.value, dragState.current.weeks)
  }

  const stopDragPaint = (): void => {
    dragState.current.active = false
  }

  const onCellPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    dateKey: string,
    hour: number,
  ): void => {
    paintPointer.current = {
      x: event.clientX,
      y: event.clientY,
      dateKey,
      hour,
      pointerType: event.pointerType,
      scrolling: false,
    }
  }

  const onCellPointerMove = (
    event: React.PointerEvent<HTMLButtonElement>,
    dateKey: string,
    hour: number,
  ): void => {
    const state = paintPointer.current
    if (!state || state.scrolling) {
      return
    }

    const deltaX = event.clientX - state.x
    const deltaY = event.clientY - state.y
    if (
      Math.abs(deltaX) > PAINT_MOVE_THRESHOLD ||
      Math.abs(deltaY) > PAINT_MOVE_THRESHOLD
    ) {
      state.scrolling = true
      stopDragPaint()

      if (
        event.pointerType === 'mouse' &&
        Math.abs(deltaY) > Math.abs(deltaX) &&
        !dragState.current.active
      ) {
        startDragPaint(dateKey, hour)
      }
      return
    }
  }

  const onCellPointerEnter = (
    event: React.PointerEvent<HTMLButtonElement>,
    dateKey: string,
    hour: number,
  ): void => {
    if (event.pointerType === 'mouse' && dragState.current.active) {
      moveDragPaint(dateKey, hour)
    }
  }

  const onCellPointerUp = (
    _event: React.PointerEvent<HTMLButtonElement>,
    dateKey: string,
    hour: number,
  ): void => {
    if (consumeCalendarPanRef.current()) {
      paintPointer.current = null
      stopDragPaint()
      return
    }

    const state = paintPointer.current
    if (state && !state.scrolling) {
      startDragPaint(dateKey, hour)
    }
    paintPointer.current = null
    stopDragPaint()
  }

  const onCellPointerCancel = (): void => {
    paintPointer.current = null
    stopDragPaint()
  }

  const resetAllSchedules = async (): Promise<void> => {
    if (!db || !userId) {
      return
    }
    if (!confirm('すべての登録をリセットしますか？この操作は取り消せません。')) {
      return
    }
    try {
      setSyncStatus('リセット中...')
      const updates: TimetableByDate = {}
      dateKeys.forEach((dateKey) => {
        updates[dateKey] = createEmptyTimetable()
      })
      await persistTimetables(updates)
      setMySchedules({})
      setSyncStatus('リセット完了')
    } catch {
      setSyncStatus('リセット失敗')
    }
  }

  const handleAuthSuccess = (username: string): void => {
    localStorage.setItem(SESSION_USER_KEY, username)
    setUserId(username)
  }

  const handleLogout = (): void => {
    localStorage.removeItem(SESSION_USER_KEY)
    setUserId('')
    setMySchedules({})
  }

  if (!userId) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />
  }

  const cellClassForGather = (count: number): string => {
    if (count >= 3) {
      return 'bg-slate-900 text-white font-medium dark:bg-yellow-400 dark:text-slate-900'
    }
    if (count === 2) {
      return 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
    }
    if (count === 1) {
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
    }
    return 'bg-white text-slate-400 border border-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-700'
  }

  const cellClassForRegister = (value: number): string => {
    return value === 1
      ? 'bg-slate-900 text-white font-medium dark:bg-sky-500 dark:text-white'
      : 'bg-white text-slate-400 border border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
  }

  return (
    <div className="min-h-screen bg-slate-50 p-3 pb-16 md:p-6 md:pb-20 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">RiseofGethering</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {formatDisplayDate(firstDate)} 〜 {formatDisplayDate(lastDate)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
              {userId}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              ログアウト
            </button>
          </div>
        </header>

        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="inline-flex gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setActiveTab('gather')}
              className={`rounded px-4 py-2 text-sm font-medium ${
                activeTab === 'gather'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              集結
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`rounded px-4 py-2 text-sm font-medium ${
                activeTab === 'register'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              登録
            </button>
          </div>

          {activeTab === 'register' && (
            <button
              type="button"
              onClick={() => void resetAllSchedules()}
              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              すべてリセット
            </button>
          )}
        </div>

        {activeTab === 'register' && (
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
            PCはドラッグで連続選択。スマホはタップで切り替え、押しながら横スワイプでカレンダーを移動。
          </div>
        )}

        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{syncStatus}</p>

        <section>
          <CalendarScroll>
            <CalendarPanBridge bind={(consume) => { consumeCalendarPanRef.current = consume }} />
            {dateKeys.map((dateKey) => {
              const myTimetable = ensureTimetable(mySchedules[dateKey])
              const gatherCounts = allCounts[dateKey] ?? createEmptyTimetable()
              const weekSpan = getWeekSpan(dateKey)

              return (
                <article
                  key={dateKey}
                  className="w-40 shrink-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:w-44 dark:border-slate-700 dark:bg-slate-900"
                >
                  <h2 className="mb-3 text-center text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {formatDisplayDate(dateKey)}
                  </h2>

                  {activeTab === 'register' && (
                    <div className="mb-3 space-y-2">
                      <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800">
                        <button
                          type="button"
                          onClick={() =>
                            setWeekSpans((prev) => ({
                              ...prev,
                              [dateKey]: Math.max(1, (prev[dateKey] ?? 1) - 1),
                            }))
                          }
                          className="flex h-5 w-5 items-center justify-center rounded bg-white text-xs font-medium text-slate-600 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                        >
                          -
                        </button>
                        <span className="text-slate-700 dark:text-slate-300">{weekSpan}週</span>
                        <button
                          type="button"
                          onClick={() =>
                            setWeekSpans((prev) => ({
                              ...prev,
                              [dateKey]: Math.min(4, (prev[dateKey] ?? 1) + 1),
                            }))
                          }
                          className="flex h-5 w-5 items-center justify-center rounded bg-white text-xs font-medium text-slate-600 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                        >
                          +
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => continueSchedule(dateKey, 7)}
                          className="rounded-md border border-slate-200 bg-white px-1.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          1週間
                        </button>
                        <button
                          type="button"
                          onClick={() => continueSchedule(dateKey, 28)}
                          className="rounded-md border border-slate-200 bg-white px-1.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          1ヶ月
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-0.5">
                    {HOURS.map((hour) => {
                      const myValue = myTimetable[hour]
                      const count = gatherCounts[hour]

                      if (activeTab === 'gather') {
                        return (
                          <div
                            key={`${dateKey}-${hour}`}
                            className={`flex items-center justify-between rounded-md px-2 py-1.5 text-xs ${cellClassForGather(
                              count,
                            )}`}
                          >
                            <span className="font-mono">{hour}:00</span>
                            <span className="text-[10px] font-medium">
                              {count >= 3 ? `⚔️ ${count}人` : count > 0 ? `${count}人` : '0人'}
                            </span>
                          </div>
                        )
                      }

                      return (
                        <button
                          key={`${dateKey}-${hour}`}
                          type="button"
                          disabled={!userId}
                          onPointerDown={(event) => onCellPointerDown(event, dateKey, hour)}
                          onPointerMove={(event) => onCellPointerMove(event, dateKey, hour)}
                          onPointerEnter={(event) => onCellPointerEnter(event, dateKey, hour)}
                          onPointerUp={(event) => onCellPointerUp(event, dateKey, hour)}
                          onPointerCancel={onCellPointerCancel}
                          className={`flex w-full select-none items-center justify-between rounded-md px-2 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50 ${cellClassForRegister(
                            myValue,
                          )}`}
                        >
                          <span className="font-mono">{hour}:00</span>
                          <span className="text-[10px]">{myValue === 1 ? '○' : '-'}</span>
                        </button>
                      )
                    })}
                  </div>
                </article>
              )
            })}
          </CalendarScroll>
        </section>
      </div>
    </div>
  )
}

export default App
