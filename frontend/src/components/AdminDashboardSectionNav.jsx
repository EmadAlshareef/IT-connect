import {
  BookOpen,
  Building2,
  Info,
  LayoutDashboard,
  Layers,
  Newspaper,
  Users,
  UsersRound,
} from 'lucide-react'
import { adminTabs } from '../data/adminDashboard.js'
import { formatOverviewRelativeTime } from '../utils/formatOverviewRelativeTime.js'

const tabIcons = {
  overview: LayoutDashboard,
  tracks: Layers,
  trainings: BookOpen,
  trainers: Users,
  members: UsersRound,
  companies: Building2,
  details: Info,
  posts: Newspaper,
}

const tabActiveClass =
  'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-md shadow-violet-500/20 ring-1 ring-white/10 dark:shadow-black/30'

const shellNavClass =
  'flex w-full flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-2 dark:border-slate-700 dark:bg-slate-900/50'

const inlineNavClass =
  'flex w-full max-w-full shrink-0 flex-col gap-1 self-stretch rounded-xl border border-slate-200 bg-slate-50/80 p-2 dark:border-slate-700 dark:bg-slate-900/50 lg:sticky lg:top-6 lg:w-56 lg:max-w-none'

/**
 * Branch admin tab strip (Overview, Tracks, …) with contextual subtitles.
 * @param {{ placement: 'inline' | 'shell' }} props
 */
export default function AdminDashboardSectionNav({
  placement,
  activeTab,
  onSelectTab,
  trainers,
  overviewActivityPulse,
  latestAddedTrainingOverview,
  adminTrainings,
}) {
  const rootClass = placement === 'shell' ? shellNavClass : inlineNavClass

  return (
    <div role="navigation" aria-label="Admin sections" className={rootClass}>
      {adminTabs.map((tab) => {
        const Icon = tabIcons[tab.id] ?? LayoutDashboard
        const isActive = activeTab === tab.id
        const showPulse = tab.id === 'overview'
        const showTrainerCount = tab.id === 'trainers'
        const showTrainingsLatest = tab.id === 'trainings'
        const tabTwoLine = showPulse || showTrainerCount || showTrainingsLatest
        const trainersSubtitle = `${trainers.length} trainer${trainers.length === 1 ? '' : 's'} on roster`
        const trainersTabTitle = `${trainers.length} trainers on roster`
        const trainingsLatestLine =
          latestAddedTrainingOverview?.training?.title &&
          (latestAddedTrainingOverview.ts > 0
            ? `Latest: ${latestAddedTrainingOverview.training.title} · ${formatOverviewRelativeTime(latestAddedTrainingOverview.ts)}`
            : `Latest: ${latestAddedTrainingOverview.training.title}`)
        const trainingsTabSubtitle =
          trainingsLatestLine ??
          `${adminTrainings.length} program${adminTrainings.length === 1 ? '' : 's'} in catalog`
        const trainingsTabTitleAttr =
          latestAddedTrainingOverview?.training?.title && latestAddedTrainingOverview.ts > 0
            ? `Latest training added: ${latestAddedTrainingOverview.training.title} (${formatOverviewRelativeTime(latestAddedTrainingOverview.ts)})`
            : latestAddedTrainingOverview?.training?.title
              ? `Latest training added: ${latestAddedTrainingOverview.training.title}`
              : `${adminTrainings.length} trainings in catalog`
        const pulseSubtitle = overviewActivityPulse
          ? `Updated ${formatOverviewRelativeTime(overviewActivityPulse.ts)} · ${overviewActivityPulse.label}`
          : 'Updated — · No activity yet'
        const pulseTitle = overviewActivityPulse
          ? `Latest activity: ${overviewActivityPulse.label} (${formatOverviewRelativeTime(overviewActivityPulse.ts)})`
          : 'No recorded activity yet'
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            title={
              showPulse ? pulseTitle : showTrainerCount ? trainersTabTitle : showTrainingsLatest ? trainingsTabTitleAttr : undefined
            }
            className={`flex w-full gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition sm:px-3.5 ${
              tabTwoLine ? 'min-h-[44px] items-start sm:min-h-[48px]' : 'min-h-[40px] items-center'
            } ${isActive ? tabActiveClass : 'text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'}`}
          >
            <Icon className={`h-4 w-4 shrink-0 opacity-90 ${tabTwoLine ? 'mt-0.5' : ''}`} aria-hidden />
            <span className={`flex min-w-0 flex-1 flex-col ${tabTwoLine ? 'items-start gap-0.5 text-left leading-snug' : ''}`}>
              <span>{tab.label}</span>
              {showPulse ? (
                <span
                  className={`max-w-full truncate text-[10px] font-normal opacity-90 ${isActive ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  {pulseSubtitle}
                </span>
              ) : null}
              {showTrainerCount ? (
                <span
                  className={`max-w-full truncate text-[10px] font-normal opacity-90 ${isActive ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  {trainersSubtitle}
                </span>
              ) : null}
              {showTrainingsLatest ? (
                <span
                  className={`max-w-full truncate text-[10px] font-normal opacity-90 ${isActive ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  {trainingsTabSubtitle}
                </span>
              ) : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
