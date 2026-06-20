import { CalendarPanBridge, CalendarScroll } from '../CalendarScroll'
import { HOURS, formatDisplayDate, type Timetable, type TimetableByDate } from '../../lib/scheduleUtils'

interface RegisterDayViewProps {
  dateKeys: string[]
  userId: string
  mySchedules: TimetableByDate
  onExtendWeek: (dateKey: string) => void
  onShrinkWeek: (dateKey: string) => void
  canExtendWeek: (dateKey: string) => boolean
  getWeekExtendCount: (dateKey: string) => number
  onBindPan: (consume: () => boolean) => void
  onCellPointerDown: (event: React.PointerEvent<HTMLButtonElement>, dateKey: string, hour: number) => void
  onCellPointerMove: (event: React.PointerEvent<HTMLButtonElement>, dateKey: string, hour: number) => void
  onCellPointerEnter: (event: React.PointerEvent<HTMLButtonElement>, dateKey: string, hour: number) => void
  onCellPointerUp: (event: React.PointerEvent<HTMLButtonElement>, dateKey: string, hour: number) => void
  onCellPointerCancel: () => void
  cellClassForRegister: (value: number) => string
  ensureTimetable: (source?: Timetable) => Timetable
}

export function RegisterDayView({
  dateKeys,
  userId,
  mySchedules,
  onExtendWeek,
  onShrinkWeek,
  canExtendWeek,
  getWeekExtendCount,
  onBindPan,
  onCellPointerDown,
  onCellPointerMove,
  onCellPointerEnter,
  onCellPointerUp,
  onCellPointerCancel,
  cellClassForRegister,
  ensureTimetable,
}: RegisterDayViewProps): React.ReactElement {
  return (
    <CalendarScroll className="min-h-0 flex-1" twoDayView registerMode fitViewport pairSnap>
      <CalendarPanBridge bind={onBindPan} />
      {dateKeys.map((dateKey) => {
        const myTimetable = ensureTimetable(mySchedules[dateKey])
        const weekExtendCount = getWeekExtendCount(dateKey)

        return (
          <article
            key={dateKey}
            className="calendar-day-card register-day-card flex min-h-0 shrink-0 flex-col rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm sm:w-40 sm:p-2 dark:border-slate-700 dark:bg-slate-900"
          >
            <h2 className="calendar-scroll-handle mb-0.5 shrink-0 text-center text-[11px] font-semibold text-slate-900 sm:mb-1 sm:text-xs dark:text-slate-100">
              {formatDisplayDate(dateKey)}
            </h2>

            <div className="register-day-controls mb-1 shrink-0 sm:mb-1">
              <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 text-[10px] sm:px-2 sm:py-1.5 sm:text-xs dark:border-slate-700 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => onShrinkWeek(dateKey)}
                  disabled={weekExtendCount <= 0}
                  className="flex h-5 w-5 items-center justify-center rounded bg-white text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                >
                  -
                </button>
                <span className="text-slate-700 dark:text-slate-300">+{weekExtendCount}週</span>
                <button
                  type="button"
                  onClick={() => onExtendWeek(dateKey)}
                  disabled={!canExtendWeek(dateKey)}
                  className="flex h-5 w-5 items-center justify-center rounded bg-white text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                >
                  +
                </button>
              </div>
            </div>

            <div className="calendar-day-hours grid min-h-0 flex-1 grid-cols-2 gap-0.5 sm:block sm:flex-none sm:grid-cols-1 sm:gap-0 sm:space-y-0.5">
              {HOURS.map((hour) => {
                const myValue = myTimetable[hour]

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
                    className={`flex w-full min-h-0 select-none items-center justify-between rounded-md px-1.5 py-1 text-[10px] sm:min-h-0 sm:px-2 sm:py-1.5 sm:text-xs disabled:cursor-not-allowed disabled:opacity-50 ${cellClassForRegister(
                      myValue,
                    )}`}
                  >
                    <span className="font-mono">{hour}:00</span>
                    <span className="text-[10px] sm:text-[10px]">{myValue === 1 ? '○' : '-'}</span>
                  </button>
                )
              })}
            </div>
          </article>
        )
      })}
    </CalendarScroll>
  )
}
