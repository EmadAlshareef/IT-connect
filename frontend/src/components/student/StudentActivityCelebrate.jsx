import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Briefcase,
  ClipboardList,
  FolderGit2,
  PartyPopper,
  Send,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { formatOverviewRelativeTime } from '../../utils/formatOverviewRelativeTime.js'
import {
  loadStudentHomeInsights,
  STUDENT_ACTIVITY_CHANGED_EVENT,
} from '../../utils/studentUserActivity.js'

const ACTION_ICONS = {
  task_submitted: Send,
  task_completed: Trophy,
  application: Briefcase,
  application_accepted: PartyPopper,
  github_linked: FolderGit2,
  default: ClipboardList,
}

function actionToneClass(tone) {
  switch (tone) {
    case 'success':
      return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200'
    case 'pending':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
    default:
      return 'bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-200'
  }
}

function celebrationCardClass(tone) {
  switch (tone) {
    case 'gold':
      return 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:border-amber-900/40 dark:from-amber-950/30 dark:via-slate-900 dark:to-orange-950/20'
    case 'emerald':
      return 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:border-emerald-900/40 dark:from-emerald-950/30 dark:via-slate-900 dark:to-teal-950/20'
    case 'violet':
      return 'border-violet-200 bg-gradient-to-br from-violet-50 via-white to-violet-50 dark:border-violet-900/40 dark:from-violet-950/30 dark:via-slate-900 dark:to-violet-950/20'
    case 'sky':
      return 'border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50 dark:border-sky-900/40 dark:from-sky-950/30 dark:via-slate-900 dark:to-cyan-950/20'
  }
  return 'border-violet-200 bg-gradient-to-br from-violet-50 via-white to-violet-50 dark:border-violet-900/40 dark:from-violet-950/30 dark:via-slate-900 dark:to-violet-950/20'
}

function ActivityRow({ item }) {
  const Icon = ACTION_ICONS[item.type] ?? ACTION_ICONS.default
  const inner = (
    <>
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.label}</p>
        {item.detail ? (
          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${actionToneClass(item.tone)}`}>
          {item.tone === 'success' ? 'Done' : item.tone === 'pending' ? 'Pending' : 'Action'}
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">{formatOverviewRelativeTime(item.ts)}</span>
      </div>
    </>
  )

  if (item.href) {
    return (
      <li>
        <Link
          to={item.href}
          className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60 sm:px-5"
        >
          {inner}
        </Link>
      </li>
    )
  }

  return (
    <li className="flex w-full items-start gap-3 px-4 py-3 sm:px-5">
      {inner}
    </li>
  )
}

function CelebrationCard({ item }) {
  const Icon = item.id.includes('feedback') ? Sparkles : item.id.includes('accepted') ? PartyPopper : Trophy
  const body = (
    <article className={`rounded-2xl border p-4 shadow-sm ${celebrationCardClass(item.tone)}`}>
      <div className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-violet-700 shadow-sm dark:bg-slate-800 dark:text-violet-300">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{item.message}</p>
        </div>
      </div>
    </article>
  )

  if (item.href) {
    return (
      <Link to={item.href} className="block transition hover:opacity-95">
        {body}
      </Link>
    )
  }
  return body
}

function StudentActivityCelebrate({ userId, email, stats }) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    window.addEventListener(STUDENT_ACTIVITY_CHANGED_EVENT, bump)
    window.addEventListener('storage', bump)
    window.addEventListener('student-github-submissions-changed', bump)
    window.addEventListener('ts-trainer-submissions-changed', bump)
    return () => {
      window.removeEventListener(STUDENT_ACTIVITY_CHANGED_EVENT, bump)
      window.removeEventListener('storage', bump)
      window.removeEventListener('student-github-submissions-changed', bump)
      window.removeEventListener('ts-trainer-submissions-changed', bump)
    }
  }, [])

  const { actions, celebrations } = useMemo(
    () => loadStudentHomeInsights({ userId, email, stats }),
    [userId, email, stats, tick],
  )

  return (
    <section
      aria-labelledby="student-activity-heading"
      className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
    >
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
          <h2 id="student-activity-heading" className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Your recent actions
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Submissions, applications, GitHub links, and milestones appear here as you work.
          </p>
        </div>
        {actions.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400 sm:px-6">
            No actions yet. Submit a task or apply to an internship to start your activity feed.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {actions.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <PartyPopper className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden />
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Celebrate</h2>
        </div>
        <p className="-mt-2 px-1 text-sm text-slate-600 dark:text-slate-400">
          Milestones and wins based on your progress — keep going!
        </p>
        <div className="space-y-3">
          {celebrations.map((item) => (
            <CelebrationCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default StudentActivityCelebrate
