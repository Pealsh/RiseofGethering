import { useTheme } from '../hooks/useTheme'

type TabType = 'gather' | 'register'

interface MobileFooterProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  userId: string
  onLogout: () => void
  onResetAll?: () => void
}

export function MobileFooter({
  activeTab,
  onTabChange,
  userId,
  onLogout,
  onResetAll,
}: MobileFooterProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <footer className="fixed inset-x-0 bottom-4 z-50 px-3 sm:hidden">
      {activeTab === 'register' && onResetAll && (
        <div className="mb-2 flex justify-center pt-2">
          <button
            type="button"
            onClick={onResetAll}
            className="rounded-[20px] border border-red-200 bg-white/95 px-4 py-1.5 text-[11px] font-medium text-red-600 shadow-lg backdrop-blur dark:border-red-900 dark:bg-slate-900/95 dark:text-red-400"
          >
            すべてリセット
          </button>
        </div>
      )}
      <div className="relative flex h-11 items-center">
        <button
          type="button"
          onClick={onLogout}
          className="absolute left-0 max-w-[5.5rem] truncate rounded-[20px] border border-slate-200 bg-white/95 px-3 py-2 text-[11px] font-medium text-slate-600 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-300"
          title={`${userId}（タップでログアウト）`}
        >
          {userId}
        </button>

        <nav
          aria-label="メインタブ"
          className="mx-auto inline-flex gap-1 rounded-[20px] border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
        >
          <button
            type="button"
            onClick={() => onTabChange('gather')}
            className={`rounded-2xl px-5 py-2 text-sm font-medium ${
              activeTab === 'gather'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            集結
          </button>
          <button
            type="button"
            onClick={() => onTabChange('register')}
            className={`rounded-2xl px-5 py-2 text-sm font-medium ${
              activeTab === 'register'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            登録
          </button>
        </nav>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
          className="absolute right-0 rounded-[20px] border border-slate-200 bg-white/95 px-4 py-2 text-sm font-medium text-slate-700 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100"
        >
          {theme === 'dark' ? 'ライト' : 'ダーク'}
        </button>
      </div>
    </footer>
  )
}
