export type RegisterMode = 'day' | 'week' | 'preset'

interface RegisterSubNavProps {
  mode: RegisterMode
  onChange: (mode: RegisterMode) => void
}

const MODES: { id: RegisterMode; label: string }[] = [
  { id: 'day', label: '日別' },
  { id: 'week', label: '週別' },
  { id: 'preset', label: 'プリセット' },
]

export function RegisterSubNav({ mode, onChange }: RegisterSubNavProps): React.ReactElement {
  return (
    <nav
      aria-label="登録モード"
      className="register-sub-nav mb-1 grid shrink-0 grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm sm:mb-3 dark:border-slate-700 dark:bg-slate-900"
    >
      {MODES.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors sm:text-xs ${
            mode === item.id
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}
