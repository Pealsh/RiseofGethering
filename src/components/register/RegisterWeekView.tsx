import type { MonthBlock, Preset, WeekPlanState } from '../../lib/scheduleUtils'

interface RegisterWeekViewProps {
  monthBlocks: MonthBlock[]
  presets: Preset[]
  weekPlan: WeekPlanState
  onAssignPreset: (weekKey: string, presetId: string) => void
  onClearWeekAssignment: (weekKey: string) => void
  onContinueChange: (enabled: boolean) => void
}

export function RegisterWeekView({
  monthBlocks,
  presets,
  weekPlan,
  onAssignPreset,
  onClearWeekAssignment,
  onContinueChange,
}: RegisterWeekViewProps): React.ReactElement {
  const handlePresetChange = (weekKey: string, value: string): void => {
    if (value === '') {
      onClearWeekAssignment(weekKey)
      return
    }
    onAssignPreset(weekKey, value)
  }

  return (
    <div className="register-week-view flex min-h-0 flex-1 flex-col overflow-hidden">
      <label className="register-week-continue mb-2 flex shrink-0 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs shadow-sm sm:text-sm dark:border-slate-700 dark:bg-slate-900">
        <span className="font-medium text-slate-700 dark:text-slate-200">この予定を継続</span>
        <button
          type="button"
          role="switch"
          aria-checked={weekPlan.continueEnabled}
          onClick={() => onContinueChange(!weekPlan.continueEnabled)}
          className={`register-week-continue-toggle relative h-7 w-12 shrink-0 rounded-full transition-colors ${
            weekPlan.continueEnabled ? 'bg-slate-900 dark:bg-yellow-400' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
              weekPlan.continueEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </label>

      <div className="register-week-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto pb-1 sm:space-y-3">
        {monthBlocks.map((month) => (
          <section
            key={month.monthKey}
            className="register-week-month overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <h3 className="register-week-month-title border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
              {month.label}
            </h3>

            <ul className="register-week-list divide-y divide-slate-100 dark:divide-slate-800">
              {month.weeks.map((week) => {
                const assignedPresetId = weekPlan.assignments[week.weekKey] ?? ''
                const assignedPreset = presets.find((preset) => preset.id === assignedPresetId)

                return (
                  <li key={week.weekKey} className="register-week-row px-2.5 py-2 sm:px-3 sm:py-2.5">
                    <div className="register-week-row-inner flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <div className="register-week-row-label min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 sm:text-sm dark:text-slate-100">
                          {week.label}
                        </p>
                        {assignedPreset && (
                          <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs dark:text-slate-400">
                            適用中: {assignedPreset.name}
                          </p>
                        )}
                      </div>

                      <div className="register-week-row-control flex shrink-0 items-center gap-2">
                        <select
                          value={assignedPresetId}
                          onChange={(event) => handlePresetChange(week.weekKey, event.target.value)}
                          className="register-week-select min-h-11 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-800 sm:min-h-10 sm:min-w-[10rem] sm:flex-none sm:text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          aria-label={`${week.label}のプリセット`}
                        >
                          <option value="">未設定</option>
                          {presets.map((preset) => (
                            <option key={preset.id} value={preset.id}>
                              {preset.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
