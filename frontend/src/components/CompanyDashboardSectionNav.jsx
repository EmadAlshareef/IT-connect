const tabActiveClass =
  'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-md shadow-violet-500/20 ring-1 ring-white/10 dark:shadow-black/30'

const shellNavClass =
  'flex w-full flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-2 dark:border-slate-700 dark:bg-slate-900/50'

const inlineNavClass =
  'flex w-full max-w-full shrink-0 flex-col gap-1 self-stretch rounded-xl border border-slate-200 bg-slate-50/80 p-2 dark:border-slate-700 dark:bg-slate-900/50 lg:sticky lg:top-6 lg:w-56 lg:max-w-none'

/**
 * Company workspace tab strip (Overview, Company profile, Tracks, …).
 * @param {{ placement: 'inline' | 'shell', tabs: { id: string, label: string }[], activeTab: string, onSelectTab: (tabId: string) => void }} props
 */
export default function CompanyDashboardSectionNav({ placement, tabs, activeTab, onSelectTab }) {
  const rootClass = placement === 'shell' ? shellNavClass : inlineNavClass

  return (
    <div role="navigation" aria-label="Company dashboard sections" className={rootClass}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onSelectTab(tab.id)
            }}
            className={`flex w-full min-h-[40px] items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition sm:px-3.5 ${
              isActive ? tabActiveClass : 'text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
