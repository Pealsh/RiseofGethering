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
import { GatherWeekView } from './components/GatherWeekView'
import { MobileFooter } from './components/MobileFooter'
import { MobileTabShell } from './components/MobileTabShell'
import { PresetEditorView } from './components/register/PresetEditorView'
import { RegisterDayView } from './components/register/RegisterDayView'
import { RegisterSubNav, type RegisterMode } from './components/register/RegisterSubNav'
import { RegisterWeekView } from './components/register/RegisterWeekView'
import { usePresets } from './hooks/usePresets'
import { useRollingToday } from './hooks/useRollingToday'
import { useWeekPlan } from './hooks/useWeekPlan'
import {
  DAYS_TO_SHOW,
  addDays,
  buildMonthBlocks,
  collectWeeksFrom,
  compareWeekKeys,
  createEmptyTimetable,
  ensureTimetable,
  formatDisplayDate,
  toDateKey,
  type Timetable,
  type TimetableByDate,
  type WeekPlanState,
} from './lib/scheduleUtils'

const EMPTY_WEEK_PLAN: WeekPlanState = {
  assignments: {},
  continueEnabled: false,
  continuePresetId: null,
  continueAnchorWeekKey: null,
}

type TabType = 'register' | 'gather'

type DragState = {
  active: boolean
  value: 0 | 1
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

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('gather')
  const [registerMode, setRegisterMode] = useState<RegisterMode>('day')
  const [userId, setUserId] = useState<string>(() => localStorage.getItem(SESSION_USER_KEY) ?? '')
  const [mySchedules, setMySchedules] = useState<TimetableByDate>({})
  const [allCounts, setAllCounts] = useState<Record<string, number[]>>({})
  const [weekExtendCounts, setWeekExtendCounts] = useState<Record<string, number>>({})
  const [syncStatus, setSyncStatus] = useState<string>(
    db ? 'Firebase同期中' : 'Firebase未設定: ローカル表示のみ',
  )

  const dragState = useRef<DragState>({ active: false, value: 1 })
  const paintPointer = useRef<PaintPointerState | null>(null)
  const consumeCalendarPanRef = useRef<() => boolean>(() => false)
  const mySchedulesRef = useRef<TimetableByDate>({})
  const weekPlanRef = useRef<WeekPlanState>(EMPTY_WEEK_PLAN)

  const today = useRollingToday()
  const { presets, updatePreset, togglePresetHour, addPreset, deletePreset } = usePresets(userId)
  const { weekPlan, persistWeekPlan } = useWeekPlan(userId)

  const dateKeys = useMemo(() => {
    return Array.from({ length: DAYS_TO_SHOW }, (_, index) =>
      toDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + index)),
    )
  }, [today])

  const firstDate = dateKeys[0]
  const lastDate = dateKeys[dateKeys.length - 1]
  const monthBlocks = useMemo(() => buildMonthBlocks(dateKeys), [dateKeys])

  useEffect(() => {
    mySchedulesRef.current = mySchedules
  }, [mySchedules])

  useEffect(() => {
    weekPlanRef.current = weekPlan
  }, [weekPlan])

  useEffect(() => {
    if (!db || !userId) {
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
  }, [firstDate, lastDate])

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
          batch.set(doc(firestore, 'schedules', userId, 'dates', date), { userId, date, timetable }, { merge: true })
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

  const getWeekExtendCount = (dateKey: string): number => weekExtendCounts[dateKey] ?? 0

  const canExtendWeek = (dateKey: string): boolean => {
    const nextOffset = getWeekExtendCount(dateKey) + 1
    return addDays(dateKey, 7 * nextOffset) <= lastDate
  }

  const extendScheduleByOneWeek = (dateKey: string): void => {
    const source = ensureTimetable(mySchedulesRef.current[dateKey])
    const nextOffset = getWeekExtendCount(dateKey) + 1
    const targetDate = addDays(dateKey, 7 * nextOffset)
    if (targetDate > lastDate) {
      return
    }
    applyUpdates({ [targetDate]: [...source] })
    setWeekExtendCounts((prev) => ({ ...prev, [dateKey]: nextOffset }))
  }

  const shrinkWeekExtend = (dateKey: string): void => {
    const current = getWeekExtendCount(dateKey)
    if (current <= 0) {
      return
    }
    setWeekExtendCounts((prev) => ({ ...prev, [dateKey]: current - 1 }))
  }

  const paintHour = (dateKey: string, hour: number, value: 0 | 1): void => {
    const timetable = ensureTimetable(mySchedulesRef.current[dateKey])
    timetable[hour] = value
    applyUpdates({ [dateKey]: timetable })
  }

  const assignPresetToWeek = (weekKey: string, presetId: string): void => {
    const preset = presets.find((item) => item.id === presetId)
    if (!preset) {
      return
    }

    const plan = weekPlanRef.current
    const shouldContinue = plan.continueEnabled
    const targetWeeks = shouldContinue
      ? collectWeeksFrom(monthBlocks, weekKey)
      : monthBlocks.flatMap((block) => block.weeks).filter((week) => week.weekKey === weekKey)

    const updates: TimetableByDate = {}
    const assignments = { ...plan.assignments }
    targetWeeks.forEach((week) => {
      week.dateKeys.forEach((dateKey) => {
        const dayIndex = new Date(`${dateKey}T00:00:00`).getDay()
        updates[dateKey] = [...preset.weekTimetable[dayIndex]]
      })
      assignments[week.weekKey] = presetId
    })

    applyUpdates(updates)
    persistWeekPlan({
      ...plan,
      assignments,
      continuePresetId: shouldContinue ? presetId : plan.continuePresetId,
      continueAnchorWeekKey: shouldContinue ? weekKey : plan.continueAnchorWeekKey,
    })
  }

  const handleContinueChange = (enabled: boolean): void => {
    const plan = weekPlanRef.current

    if (!enabled) {
      const assignments = { ...plan.assignments }
      const updates: TimetableByDate = {}

      if (plan.continueAnchorWeekKey && plan.continuePresetId) {
        const anchor = plan.continueAnchorWeekKey
        const presetId = plan.continuePresetId

        monthBlocks.flatMap((block) => block.weeks).forEach((week) => {
          if (compareWeekKeys(week.weekKey, anchor) > 0 && assignments[week.weekKey] === presetId) {
            delete assignments[week.weekKey]
            week.dateKeys.forEach((dateKey) => {
              updates[dateKey] = createEmptyTimetable()
            })
          }
        })
      }

      if (Object.keys(updates).length > 0) {
        applyUpdates(updates)
      }

      persistWeekPlan({
        ...plan,
        assignments,
        continueEnabled: false,
        continuePresetId: null,
        continueAnchorWeekKey: null,
      })
      return
    }

    persistWeekPlan({
      ...plan,
      continueEnabled: true,
    })
  }

  const clearWeekAssignment = (weekKey: string): void => {
    const assignments = { ...weekPlan.assignments }
    delete assignments[weekKey]
    persistWeekPlan({
      ...weekPlan,
      assignments,
    })
  }

  const handleDeletePreset = (presetId: string): void => {
    if (!deletePreset(presetId)) {
      return
    }

    const assignments = { ...weekPlan.assignments }
    Object.keys(assignments).forEach((weekKey) => {
      if (assignments[weekKey] === presetId) {
        delete assignments[weekKey]
      }
    })

    const wasContinuePreset = weekPlan.continuePresetId === presetId
    persistWeekPlan({
      assignments,
      continueEnabled: wasContinuePreset ? false : weekPlan.continueEnabled,
      continuePresetId: wasContinuePreset ? null : weekPlan.continuePresetId,
      continueAnchorWeekKey: wasContinuePreset ? null : weekPlan.continueAnchorWeekKey,
    })
  }

  const startDragPaint = (dateKey: string, hour: number): void => {
    const current = ensureTimetable(mySchedulesRef.current[dateKey])[hour]
    const nextValue: 0 | 1 = current === 1 ? 0 : 1
    dragState.current = { active: true, value: nextValue }
    paintHour(dateKey, hour, nextValue)
  }

  const moveDragPaint = (dateKey: string, hour: number): void => {
    if (!dragState.current.active) {
      return
    }
    paintHour(dateKey, hour, dragState.current.value)
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
    if (Math.abs(deltaX) > PAINT_MOVE_THRESHOLD || Math.abs(deltaY) > PAINT_MOVE_THRESHOLD) {
      state.scrolling = true
      stopDragPaint()
      if (
        event.pointerType === 'mouse' &&
        Math.abs(deltaY) > Math.abs(deltaX) &&
        !dragState.current.active
      ) {
        startDragPaint(dateKey, hour)
      }
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
      persistWeekPlan({
        assignments: {},
        continueEnabled: false,
        continuePresetId: null,
        continueAnchorWeekKey: null,
      })
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

  const cellClassForRegister = (value: number): string =>
    value === 1
      ? 'bg-slate-900 text-white font-medium dark:bg-sky-500 dark:text-white'
      : 'bg-white text-slate-400 border border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'

  const registerPanel = (
    <div className="flex min-h-0 flex-1 flex-col">
      <RegisterSubNav mode={registerMode} onChange={setRegisterMode} />
      {registerMode === 'day' && (
        <RegisterDayView
          dateKeys={dateKeys}
          userId={userId}
          mySchedules={mySchedules}
          onExtendWeek={extendScheduleByOneWeek}
          onShrinkWeek={shrinkWeekExtend}
          canExtendWeek={canExtendWeek}
          getWeekExtendCount={getWeekExtendCount}
          onBindPan={(consume) => {
            consumeCalendarPanRef.current = consume
          }}
          onCellPointerDown={onCellPointerDown}
          onCellPointerMove={onCellPointerMove}
          onCellPointerEnter={onCellPointerEnter}
          onCellPointerUp={onCellPointerUp}
          onCellPointerCancel={onCellPointerCancel}
          cellClassForRegister={cellClassForRegister}
          ensureTimetable={ensureTimetable}
        />
      )}
      {registerMode === 'week' && (
        <RegisterWeekView
          monthBlocks={monthBlocks}
          presets={presets}
          weekPlan={weekPlan}
          onAssignPreset={assignPresetToWeek}
          onClearWeekAssignment={clearWeekAssignment}
          onContinueChange={handleContinueChange}
        />
      )}
      {registerMode === 'preset' && (
        <PresetEditorView
          presets={presets}
          onNameChange={(presetId, name) => updatePreset(presetId, { name })}
          onToggleHour={togglePresetHour}
          onAddPreset={addPreset}
          onDeletePreset={handleDeletePreset}
        />
      )}
    </div>
  )

  return (
    <div
      className={`mobile-shell flex flex-col bg-slate-50 px-3 dark:bg-slate-950 ${
        activeTab === 'register' ? 'register-mobile pb-28' : 'pb-20'
      } h-dvh overflow-hidden sm:p-6 sm:pb-6`}
    >
      <div
        className={`mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col ${
          activeTab === 'gather' ? 'gather-app-main' : activeTab === 'register' ? 'register-app-main' : ''
        }`}
      >
        <h1 className="shrink-0 text-center text-base font-bold tracking-wide text-slate-900 sm:hidden dark:text-white">
          万国覚醒
        </h1>

        <header className="mb-6 hidden shrink-0 flex-wrap items-center justify-between gap-3 sm:flex">
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

        <div className="gather-tabs mb-5 hidden shrink-0 items-center justify-between gap-3 sm:flex">
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

        <p className="mb-4 hidden shrink-0 text-xs text-slate-500 sm:block dark:text-slate-400">{syncStatus}</p>

        <MobileTabShell
          activeTab={activeTab}
          gather={
            <>
              <p className="mb-1 shrink-0 text-[10px] text-slate-400 dark:text-slate-500">{syncStatus}</p>
              <GatherWeekView className="min-h-0 flex-1" dateKeys={dateKeys} allCounts={allCounts} />
            </>
          }
          register={registerPanel}
        />

        <section className="hidden min-h-0 flex-1 flex-col sm:flex">
          {activeTab === 'gather' ? (
            <GatherWeekView className="min-h-0 flex-1" dateKeys={dateKeys} allCounts={allCounts} />
          ) : (
            registerPanel
          )}
        </section>
      </div>

      <MobileFooter
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userId={userId}
        onLogout={handleLogout}
        onResetAll={() => void resetAllSchedules()}
      />
    </div>
  )
}

export default App
