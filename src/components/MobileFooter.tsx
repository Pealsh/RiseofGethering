import { type TouchEvent } from 'react'
import { useTheme } from '../hooks/useTheme'
import { useMobileTabSwipe } from './useMobileTabSwipe'

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
  const tabSwipe = useMobileTabSwipe(activeTab, onTabChange)

  const handleFooterTouchStart = (event: TouchEvent<HTMLElement>): void => {
    tabSwipe.onTouchStart(event)
  }

  const handleFooterTouchMove = (event: TouchEvent<HTMLElement>): void => {
    tabSwipe.onTouchMove(event)
  }

  const handleFooterTouchEnd = (): void => {
    tabSwipe.onTouchEnd()
  }

  const handleFooterTouchCancel = (): void => {
    tabSwipe.onTouchCancel()
  }

  return (
    <footer
      className="mobile-footer fixed inset-x-0 bottom-4 z-50 px-3 sm:hidden"
      onTouchStart={handleFooterTouchStart}
      onTouchMove={handleFooterTouchMove}
      onTouchEnd={handleFooterTouchEnd}
      onTouchCancel={handleFooterTouchCancel}
    >
      {activeTab === 'register' && onResetAll && (
        <div className="mb-2 flex justify-center pt-1">
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
          className="mobile-footer-side-btn absolute left-0 truncate rounded-[20px] border border-slate-200 bg-white/95 text-[11px] font-medium text-slate-600 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-300"
          title={`${userId}（タップでログアウト）`}
        >
          {userId}
        </button>

        <nav
          aria-label="メインタブ"
          className="mobile-tab-nav relative mx-auto grid w-[11.5rem] grid-cols-2 gap-1 rounded-[20px] border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
        >
          <span
            aria-hidden
            className={`mobile-tab-pill absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-2xl bg-slate-900 transition-transform duration-300 ease-out dark:bg-white ${
              activeTab === 'gather' ? 'translate-x-1' : 'translate-x-[calc(100%+0.25rem)]'
            }`}
          />
          <button
            type="button"
            onClick={() => onTabChange('gather')}
            className={`relative z-10 rounded-2xl px-4 py-2 text-sm font-medium transition-colors duration-300 ${
              activeTab === 'gather'
                ? 'text-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            集結
          </button>
          <button
            type="button"
            onClick={() => onTabChange('register')}
            className={`relative z-10 rounded-2xl px-4 py-2 text-sm font-medium transition-colors duration-300 ${
              activeTab === 'register'
                ? 'text-white dark:text-slate-900'
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
          className="mobile-footer-side-btn absolute right-0 rounded-[20px] border border-slate-200 bg-white/95 text-[11px] font-medium text-slate-700 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100"
        >
          {theme === 'dark' ? 'ライト' : 'ダーク'}
        </button>
      </div>
    </footer>
  )
}
