import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useOutletContext } from 'react-router-dom'
import { AlarmClock, ArrowUpRight, FileText, MessageCircle, Paperclip } from 'lucide-react'
import { fetchStudentTasks, persistStudentTasksCache } from '../../api/studentPortalApi.js'
import { STUDENT_COURSE_TASKS_CHANGED_EVENT } from '../../utils/taskCourseContext.js'

const toneForStatus = (status) => {
  const value = (status ?? '').toLowerCase()
  if (value.includes('complete') || value.includes('evaluated')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100'
  }
  if (value.includes('pending') || value.includes('review')) {
    return 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100'
  }
  if (value.includes('overdue') || value.includes('not submitted')) {
    return 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100'
  }
  return 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
}

function formatWhen(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

function StudentTasksPage() {
  const { token, userId } = useOutletContext()
  const location = useLocation()
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const courseSearch = useMemo(() => {
    const branchId = String(searchParams.get('branchId') ?? '').trim()
    const courseId = String(searchParams.get('courseId') ?? '').trim()
    return branchId && courseId ? new URLSearchParams({ branchId, courseId }).toString() : ''
  }, [searchParams])
  const [tasks, setTasks] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const data = await fetchStudentTasks(token, userId, searchParams)
        if (!cancelled) {
          setTasks(data)
          await persistStudentTasksCache(userId, data)
        }
      } catch {
        if (!cancelled) setError('Unable to load assigned tasks.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()

    const reload = () => void load()
    window.addEventListener(STUDENT_COURSE_TASKS_CHANGED_EVENT, reload)
    window.addEventListener('trainer-task-requests-updated', reload)
    return () => {
      cancelled = true
      window.removeEventListener(STUDENT_COURSE_TASKS_CHANGED_EVENT, reload)
      window.removeEventListener('trainer-task-requests-updated', reload)
    }
  }, [token, userId, searchParams])

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">My tasks</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
            Tasks published by your trainer for this course appear here with title, description, deadline, and
            submission status.
          </p>
          <div className="mt-4">
            <Link
              to={courseSearch ? { pathname: '/student/submit', search: courseSearch } : '/student/submit'}
              className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-600/25 transition hover:bg-violet-500"
            >
              Submit task
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <AlarmClock className="h-4 w-4" aria-hidden />
            <p className="font-semibold">Deadlines at a glance</p>
          </div>
          <p className="mt-2 text-xs leading-5">
            Dates render in your local timezone. Overdue tasks inherit a stronger visual treatment so they are impossible to miss.
          </p>
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading tasks…</p>
      ) : null}

      {!loading && tasks.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-400">
          No tasks published for this course yet. Your trainer will publish tasks from the trainer dashboard.
        </p>
      ) : null}

      <div className="grid gap-6">
        {tasks.map((task) => {
          const branchId = String(task.branchId ?? searchParams.get('branchId') ?? '').trim()
          const courseId = String(task.courseId ?? searchParams.get('courseId') ?? '').trim()
          const submitTo =
            branchId && courseId
              ? {
                  pathname: '/student/submit',
                  search: new URLSearchParams({ branchId, courseId }).toString(),
                }
              : '/student/submit'
          const feedback = String(task.evaluationFeedback ?? '').trim()

          return (
          <article
            key={task.id}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Task brief
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{task.title}</h2>
              </div>
              <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${toneForStatus(task.submissionStatus)}`}>
                {task.submissionStatus}
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Description
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">
                {String(task.description ?? '').trim() || 'No description provided for this task.'}
              </p>
            </div>

            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Deadline</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {formatWhen(task.deadlineUtc)}
                </dd>
              </div>
              {task.publishedAtUtc ? (
                <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                  <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Published</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {formatWhen(task.publishedAtUtc)}
                  </dd>
                </div>
              ) : null}
              {task.attachmentName ? (
                <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                  <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <Paperclip className="h-3.5 w-3.5" aria-hidden />
                    Attachment
                  </dt>
                  <dd className="mt-1 flex items-start gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" aria-hidden />
                    <span className="break-all">{task.attachmentName}</span>
                  </dd>
                </div>
              ) : null}
              {task.grade ? (
                <div className="rounded-xl border border-violet-100 bg-violet-50/70 px-4 py-3 dark:border-violet-900/40 dark:bg-violet-950/30">
                  <dt className="text-xs uppercase tracking-wide text-violet-700 dark:text-violet-300">Grade</dt>
                  <dd className="mt-1 text-sm font-semibold text-violet-900 dark:text-violet-100">{task.grade}</dd>
                </div>
              ) : null}
            </dl>

            {feedback ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  Trainer feedback
                  {task.trainerName ? ` · ${task.trainerName}` : ''}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-emerald-950 dark:text-emerald-100">
                  {feedback}
                </p>
                {task.reviewedAtUtc ? (
                  <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
                    Reviewed {formatWhen(task.reviewedAtUtc)}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Task ID: <span className="font-mono text-[11px]">{task.id}</span>
              </p>
              <Link
                to={submitTo}
                state={{ taskId: task.id }}
                className="inline-flex items-center gap-1 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-600/25 transition hover:bg-violet-500"
              >
                Submit deliverable
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </article>
          )
        })}
      </div>
    </div>
  )
}

export default StudentTasksPage
