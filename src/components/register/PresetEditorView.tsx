import { useState } from 'react'
import { HOURS, WEEKDAYS, type Preset } from '../../lib/scheduleUtils'

interface PresetEditorViewProps {
  presets: Preset[]
  onNameChange: (presetId: string, name: string) => void
  onToggleHour: (presetId: string, dayIndex: number, hour: number) => void
  onAddPreset: () => void
  onDeletePreset: (presetId: string) => void
}

function PresetCard({
  preset,
  canDelete,
  onNameChange,
  onToggleHour,
  onDeletePreset,
}: {
  preset: Preset
  canDelete: boolean
  onNameChange: (presetId: string, name: string) => void
  onToggleHour: (presetId: string, dayIndex: number, hour: number) => void
  onDeletePreset: (presetId: string) => void
}): React.ReactElement {
  const [activeDay, setActiveDay] = useState(0)
  const dayTimetable = preset.weekTimetable[activeDay]

  return (
    <section className="preset-card rounded-lg border border-slate-200 bg-white p-2 shadow-sm sm:p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="preset-card-header mb-2 flex items-start gap-2">
        <input
          type="text"
          value={preset.name}
          onChange={(event) => onNameChange(preset.id, event.target.value)}
          className="preset-card-name min-h-10 min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <button
          type="button"
          onClick={() => onDeletePreset(preset.id)}
          disabled={!canDelete}
          title={canDelete ? 'このプリセットを削除' : '最後の1つは削除できません'}
          className="preset-card-delete shrink-0 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/70"
        >
          削除
        </button>
      </div>

      <div className="preset-day-tabs mb-2 grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((label, dayIndex) => (
          <button
            key={`${preset.id}-day-${dayIndex}`}
            type="button"
            onClick={() => setActiveDay(dayIndex)}
            className={`preset-day-tab min-h-9 rounded-md px-0.5 py-1 text-[10px] font-medium transition-colors sm:min-h-8 sm:text-xs ${
              activeDay === dayIndex
                ? 'bg-slate-900 text-white dark:bg-sky-500'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="preset-day-caption mb-1.5 text-[10px] text-slate-500 sm:text-xs dark:text-slate-400">
        {WEEKDAYS[activeDay]}曜日の予定（0:00〜23:00）
      </p>

      <div className="preset-hour-grid grid grid-cols-2 gap-1 sm:grid-cols-3">
        {HOURS.map((hour) => {
          const active = dayTimetable[hour] === 1
          return (
            <button
              key={`${preset.id}-${activeDay}-${hour}`}
              type="button"
              onClick={() => onToggleHour(preset.id, activeDay, hour)}
              className={`preset-hour-cell flex min-h-10 items-center justify-between rounded-md px-2 py-1.5 text-xs sm:min-h-9 ${
                active
                  ? 'bg-slate-900 text-white dark:bg-sky-500'
                  : 'border border-slate-200 bg-white text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <span className="font-mono">{hour}:00</span>
              <span>{active ? '○' : '-'}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export function PresetEditorView({
  presets,
  onNameChange,
  onToggleHour,
  onAddPreset,
  onDeletePreset,
}: PresetEditorViewProps): React.ReactElement {
  const canDelete = presets.length > 1

  return (
    <div className="preset-editor-view flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="preset-editor-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pb-2">
        {presets.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            canDelete={canDelete}
            onNameChange={onNameChange}
            onToggleHour={onToggleHour}
            onDeletePreset={onDeletePreset}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onAddPreset}
        className="preset-add-btn shrink-0 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800"
      >
        + プリセットを追加
      </button>
    </div>
  )
}
