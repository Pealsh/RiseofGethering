import { type ReactNode } from 'react'

type TabType = 'gather' | 'register'

interface MobileTabShellProps {
  activeTab: TabType
  gather: ReactNode
  register: ReactNode
}

export function MobileTabShell({ activeTab, gather, register }: MobileTabShellProps): React.ReactElement {
  const panelIndex = activeTab === 'gather' ? 0 : 1

  return (
    <div className="mobile-tab-shell flex min-h-0 flex-1 flex-col overflow-hidden sm:hidden">
      <div
        className="mobile-tab-track flex h-full w-[200%]"
        style={{
          transform: `translateX(-${panelIndex * 50}%)`,
          transition: 'transform 320ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div className="mobile-tab-panel flex h-full w-1/2 min-h-0 flex-col">{gather}</div>
        <div className="mobile-tab-panel flex h-full w-1/2 min-h-0 flex-col">{register}</div>
      </div>
    </div>
  )
}
