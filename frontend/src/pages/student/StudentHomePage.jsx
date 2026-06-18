import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useOutletContext } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  ClipboardList,
  FileText,
  FolderGit2,
  LayoutList,
  Lock,
  LogIn,
  MessageSquare,
  Radar,
  Send,
  Sparkles,
  Target,
  UserPlus,
} from 'lucide-react'
import { fetchDashboardStats } from '../../api/studentPortalApi.js'
import {
  STUDENT_FEATURES_HASH,
  STUDENT_FEATURES_SCROLL_PENDING_KEY,
} from '../../components/nav/training-sphere/navConstants.js'
import StudentActivityCelebrate from '../../components/student/StudentActivityCelebrate.jsx'

function StatTile({ label, value, hint, icon: Icon }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{hint}</p>
    </article>
  )
}

const TRAINEE_HUB_SECTIONS = [
  {
    n: 1,
    title: 'Authentication',
    icon: Lock,
    bullets: ['Sign up for a trainee account', 'Sign in with a secure JWT flow', 'Session tied to your Training Sphere token'],
    variant: 'auth',
  },
  {
    n: 2,
    title: 'Browse internship opportunities',
    icon: Briefcase,
    bullets: ['Programs in a responsive card grid', 'Filters: specialization, company, training type'],
    to: '/student/internships',
    cta: 'Browse internships',
  },
  {
    n: 3,
    title: 'Apply for internship',
    icon: FileText,
    bullets: ['Application form', 'Upload CV (filename captured for demo)', 'Live application status indicator'],
    to: '/student/apply',
    cta: 'Apply now',
  },
  {
    n: 4,
    title: 'Application tracking',
    icon: LayoutList,
    bullets: ['Pending, accepted, and rejected views', 'Per-application timeline / progress'],
    to: '/student/applications',
    cta: 'My applications',
  },
  {
    n: 5,
    title: 'Student dashboard home',
    icon: Radar,
    bullets: ['Personalized welcome', 'Active internships, tasks, feedback counts'],
    scrollToId: 'quick-stats-heading',
    cta: 'Jump to statistics',
  },
  {
    n: 6,
    title: 'View assigned tasks',
    icon: ClipboardList,
    bullets: ['Title, description, deadline', 'Submission status from task repository'],
    to: '/student/tasks',
    cta: 'My tasks',
  },
  {
    n: 7,
    title: 'Submit tasks',
    icon: Send,
    bullets: ['Upload files or paste submission links', 'Confirmation toast + SubmissionController'],
    to: '/student/submit',
    cta: 'Submit task',
  },
  {
    n: 8,
    title: 'Upload GitHub repository',
    icon: FolderGit2,
    bullets: ['Repository URL field', 'GitHub integration + validation API'],
    to: '/student/github',
    cta: 'Upload GitHub repo',
  },
  {
    n: 9,
    title: 'Track training progress',
    icon: BarChart3,
    bullets: ['Progress bars & completion %', 'Performance analytics & weekly activity', 'Attendance-style activity'],
    to: '/student/progress',
    cta: 'Training progress',
  },
  {
    n: 10,
    title: 'Feedback & evaluation',
    icon: Sparkles,
    bullets: ['Trainer comments & grades', 'Feedback history'],
    to: '/student/feedback',
    cta: 'View feedback',
  },
  {
    n: 11,
    title: 'Internal communication',
    icon: MessageSquare,
    bullets: ['Messages between trainee and assigned trainer', 'Same thread as the wider portal'],
    to: '/student/messages',
    cta: 'Messages',
  },
]

function HubSectionCard({ section }) {
  const Icon = section.icon
  const scrollToStats = () => {
    document.getElementById(section.scrollToId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-violet-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-violet-800/60">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-sm font-bold text-white shadow-sm shadow-violet-600/30">
          {section.n}
        </span>
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-snug text-slate-900 dark:text-slate-100">{section.title}</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            {section.bullets.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
        {section.variant === 'auth' ? (
          <div className="flex flex-wrap gap-2">
            <Link
              to="/register"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-500 min-[280px]:flex-none sm:text-sm"
            >
              <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
              Sign up
            </Link>
            <Link
              to="/login"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 transition hover:border-violet-200 hover:text-violet-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 min-[280px]:flex-none sm:text-sm"
            >
              <LogIn className="h-4 w-4 shrink-0" aria-hidden />
              Login
            </Link>
          </div>
        ) : section.scrollToId ? (
          <button
            type="button"
            onClick={scrollToStats}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-violet-600 dark:hover:bg-violet-500 sm:text-sm"
          >
            {section.cta}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <Link
            to={section.to}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-violet-600 dark:hover:bg-violet-500 sm:text-sm"
          >
            {section.cta}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
    </article>
  )
}

function StudentHomePage() {
  const { notify, token, userId, trainerName, email } = useOutletContext()
  const location = useLocation()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const wantsHash = location.hash === STUDENT_FEATURES_HASH
    let wantsStorage = false
    try {
      wantsStorage = sessionStorage.getItem(STUDENT_FEATURES_SCROLL_PENDING_KEY) === '1'
    } catch {
      /* ignore */
    }
    if (!wantsHash && !wantsStorage) return undefined

    const clearStorageFlag = () => {
      try {
        sessionStorage.removeItem(STUDENT_FEATURES_SCROLL_PENDING_KEY)
      } catch {
        /* ignore */
      }
    }

    const tryScroll = () => {
      const el = document.getElementById('student-dashboard-features')
      if (!el) return false
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      if (wantsStorage) clearStorageFlag()
      return true
    }

    if (tryScroll()) return undefined

    let attempts = 0
    const id = window.setInterval(() => {
      attempts += 1
      if (tryScroll() || attempts >= 40) {
        window.clearInterval(id)
        if (attempts >= 40 && wantsStorage) {
          clearStorageFlag()
        }
      }
    }, 50)

    return () => window.clearInterval(id)
  }, [location.pathname, location.hash])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setError('')
        const data = await fetchDashboardStats(token, userId)
        if (!cancelled) setStats(data)
      } catch {
        if (!cancelled) setError('Unable to load dashboard statistics.')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token, userId])

  const statTiles = useMemo(
    () => [
      {
        label: 'Active internships',
        value: stats?.activeInternships ?? '—',
        hint: 'Applications in progress or active placements.',
        icon: Briefcase,
      },
      {
        label: 'Completed tasks',
        value: stats?.completedTasks ?? '—',
        hint: 'Evaluated or completed deliverables.',
        icon: Target,
      },
      {
        label: 'Pending tasks',
        value: stats?.pendingTasks ?? '—',
        hint: 'Items still waiting on your action.',
        icon: ClipboardList,
      },
      {
        label: 'Feedback received',
        value: stats?.feedbackReceived ?? '—',
        hint: 'Trainer comments and grades in your inbox.',
        icon: Sparkles,
      },
    ],
    [stats],
  )

  return (
    <div className="space-y-10">
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 p-8 text-white shadow-xl dark:border-slate-800">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-100/90">Student dashboard</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Welcome back, {trainerName}</h1>
            <p className="text-sm leading-7 text-violet-50/95 sm:text-base">
              Everything on your requirements list — authentication, internships, applications, tasks, submissions, GitHub checks,
              progress analytics, feedback, and trainer messages — is available below and in the sidebar. Data routes through{' '}
              <span className="font-medium text-white">SubmissionController</span>,{' '}
              <span className="font-medium text-white">GitHub</span> validation, and the{' '}
              <span className="font-medium text-white">task repository</span> when the API is online.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/student/internships"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50"
              >
                Browse internships
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                to="/student/submit"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                Submit task
              </Link>
              <button
                type="button"
                onClick={() =>
                  notify({
                    title: 'Notifications enabled',
                    message: 'You will see submission confirmations and system notices here.',
                    tone: 'success',
                  })
                }
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                Test notification
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-violet-50 backdrop-blur">
            <div className="flex items-center gap-3">
              <Radar className="h-6 w-6" aria-hidden />
              <div>
                <p className="font-semibold text-white">Live workspace</p>
                <p className="text-xs text-violet-100/90">Connected views for tasks, applications, and messaging.</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100">
          {error}
        </p>
      ) : null}

      <StudentActivityCelebrate userId={userId} email={email} stats={stats} />

      <section
        id="student-dashboard-features"
        aria-labelledby="trainee-hub-heading"
        className="scroll-mt-28 rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/90 p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950/90 sm:scroll-mt-32 sm:p-8"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="trainee-hub-heading" className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Training Sphere — trainee requirements hub
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
              Eleven interactive areas matching your specification. Each card opens the matching screen or action; layout is responsive
              with touch-friendly targets.
            </p>
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">Notifications: bell toasts on key actions</p>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {TRAINEE_HUB_SECTIONS.map((section) => (
            <HubSectionCard key={section.n} section={section} />
          ))}
        </div>
      </section>

      <section aria-labelledby="quick-stats-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="quick-stats-heading" className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Quick statistics
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Pulled from your tasks, applications, and feedback feed.</p>
          </div>
          <Link
            to="/student/progress"
            className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            View training analytics
            <BarChart3 className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statTiles.map((tile) => (
            <StatTile key={tile.label} {...tile} />
          ))}
        </div>
      </section>

      <section aria-labelledby="shortcut-links-heading" className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-4 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400 sm:px-6">
        <p id="shortcut-links-heading" className="font-medium text-slate-800 dark:text-slate-200">
          Sidebar navigation mirrors these eleven areas on desktop; on mobile, open the menu (top left in the trainee bar) for the same
          links.
        </p>
      </section>
    </div>
  )
}

export default StudentHomePage
