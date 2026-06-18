import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useOutletContext } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { fetchTrainerFeedback } from '../../api/studentPortalApi.js'
import { getCourseQueryParams } from '../../utils/studentApiCourseParams.js'
import { resolveCourseTrainer } from '../../utils/resolveCourseTrainer.js'
import { STUDENT_FEEDBACK_CHANGED_EVENT } from '../../utils/studentTaskFeedback.js'
import { TRAINER_SUBMISSIONS_CHANGED_EVENT } from '../../utils/trainerTaskSubmissions.js'

function StudentFeedbackPage() {
  const { token, userId } = useOutletContext()
  const location = useLocation()
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const course = useMemo(() => getCourseQueryParams(searchParams), [searchParams])
  const courseMeta = useMemo(
    () => (course.branchId && course.courseId ? resolveCourseTrainer(course.branchId, course.courseId) : null),
    [course.branchId, course.courseId],
  )
  const courseTitle = courseMeta?.courseTitle || 'this training'

  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!userId) {
      setItems([])
      setLoading(false)
      return
    }
    try {
      setError('')
      const data = await fetchTrainerFeedback(token, userId, searchParams)
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setError('Unable to load trainer feedback.')
    } finally {
      setLoading(false)
    }
  }, [token, userId, searchParams])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    const bump = () => void reload()
    window.addEventListener(STUDENT_FEEDBACK_CHANGED_EVENT, bump)
    window.addEventListener(TRAINER_SUBMISSIONS_CHANGED_EVENT, bump)
    window.addEventListener('storage', bump)
    return () => {
      window.removeEventListener(STUDENT_FEEDBACK_CHANGED_EVENT, bump)
      window.removeEventListener(TRAINER_SUBMISSIONS_CHANGED_EVENT, bump)
      window.removeEventListener('storage', bump)
    }
  }, [reload])

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Feedback &amp; evaluation</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
          {course.branchId && course.courseId
            ? `Trainer grades and comments for ${courseTitle} appear here after your instructor reviews your submitted tasks.`
            : 'Trainer grades and comments on your submitted tasks appear here after your instructor reviews your work in Task Submissions.'}
        </p>
      </header>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100">
          {error}
        </p>
      ) : null}

      <section className="space-y-4" aria-labelledby="feedback-history-heading">
        <h2 id="feedback-history-heading" className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {course.branchId && course.courseId ? `Feedback for ${courseTitle}` : 'Feedback history'}
        </h2>

        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading feedback…</p>
        ) : items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-600 dark:border-slate-600 dark:text-slate-400">
            {course.branchId && course.courseId
              ? `No feedback for ${courseTitle} yet. Submit a task from Submit, then your instructor will grade it — their comments will show up here.`
              : 'No feedback yet. Submit a task from Submit, then your instructor will grade it — their comments will show up here.'}
          </p>
        ) : (
          <div className="grid gap-4">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{item.taskTitle}</p>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{item.trainerName}</h3>
                  </div>
                  {item.grade ? (
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">
                      Grade {item.grade}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" aria-hidden />
                  <span>{item.comment}</span>
                </p>
                <p className="mt-3 text-xs text-slate-400">
                  {item.atUtc ? new Date(item.atUtc).toLocaleString() : '—'}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default StudentFeedbackPage
