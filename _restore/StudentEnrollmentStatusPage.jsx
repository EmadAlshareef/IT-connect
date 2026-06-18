import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useOutletContext, useSearchParams } from 'react-router-dom'
import { AlertCircle, Clock, FileText } from 'lucide-react'
import {
  ENROLLMENT_APPLICATIONS_CHANGED_EVENT,
  fetchCourseEnrollmentApplication,
} from '../../api/enrollmentApplicationApi.js'
import { getCourseAccessState } from '../../utils/courseEnrollmentAccess.js'
import { buildEnrollmentApplicationPath } from '../../utils/courseAccessRoutes.js'
import { hasCatalogEnrollmentRecord } from '../../utils/trainingCatalogEnrollment.js'
import { resolveCourseTrainer } from '../../utils/resolveCourseTrainer.js'

function StudentEnrollmentStatusPage() {
  const { token, userId, trainerName } = useOutletContext()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const branchId = String(searchParams.get('branchId') ?? '').trim()
  const courseId = String(searchParams.get('courseId') ?? '').trim()
  const titleParam = String(searchParams.get('title') ?? '').trim()

  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)

  const meta = useMemo(() => resolveCourseTrainer(branchId, courseId), [branchId, courseId])
  const courseTitle = titleParam || meta.courseTitle || 'Training program'

  useEffect(() => {
    if (!userId || !branchId || !courseId) {
      setLoading(false)
      return
    }
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const result = await fetchCourseEnrollmentApplication(token, userId, branchId, courseId)
        if (!cancelled) setApplication(result.record ?? null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    const onChange = () => void load()
    window.addEventListener(ENROLLMENT_APPLICATIONS_CHANGED_EVENT, onChange)
    return () => {
      cancelled = true
      window.removeEventListener(ENROLLMENT_APPLICATIONS_CHANGED_EVENT, onChange)
    }
  }, [branchId, courseId, token, userId])

  const access = useMemo(
    () => (userId && branchId && courseId ? getCourseAccessState(userId, branchId, courseId) : null),
    [userId, branchId, courseId, application],
  )

  if (!branchId || !courseId) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-slate-600 dark:text-slate-400">Missing course information.</p>
        <Link to="/student/internships" className="mt-4 inline-block text-sm font-semibold text-indigo-600">
          Browse trainings
        </Link>
      </div>
    )
  }

  if (!loading && !hasCatalogEnrollmentRecord(userId, branchId, courseId)) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-slate-600 dark:text-slate-400">You are not enrolled in this course yet.</p>
        <Link to="/services" className="mt-4 inline-block text-sm font-semibold text-indigo-600">
          Browse programs
        </Link>
      </div>
    )
  }

  if (access?.onboarding === 'approved') {
    const params = new URLSearchParams({ branchId, courseId, title: courseTitle })
    return <Navigate to={`/student/home?${params.toString()}`} replace />
  }

  const isRejected = access?.onboarding === 'rejected'
  const isPending = access?.onboarding === 'pending' || (!application && access?.onboarding !== 'none')

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Enrollment status</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{courseTitle}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Hi {trainerName}, course materials stay hidden until your instructor completes the review.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-slate-500">Loading status…</p>
      ) : isRejected ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-900/50 dark:bg-rose-950/40">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden />
            <div>
              <h2 className="text-lg font-semibold text-rose-900 dark:text-rose-100">Your application was rejected</h2>
              <p className="mt-2 text-sm text-rose-800 dark:text-rose-200">
                You cannot access this course. Lessons, tasks, assignments, and progress are not available.
              </p>
              {application?.rejectionReason || access?.application?.rejectionReason ? (
                <p className="mt-3 rounded-xl bg-white/60 px-3 py-2 text-sm dark:bg-slate-900/50">
                  {application?.rejectionReason || access?.application?.rejectionReason}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/50 dark:bg-amber-950/40">
          <div className="flex items-start gap-3">
            <Clock className="h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            <div>
              <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                Your application is under review
              </h2>
              <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
                You must not access course content until approval. The course sidebar, lessons, tasks, and progress
                tracking remain hidden.
              </p>
              {meta.trainerName ? (
                <p className="mt-3 text-xs text-amber-900/80 dark:text-amber-200/80">
                  Reviewer: {meta.trainerName}
                  {meta.trainerEmail ? ` · ${meta.trainerEmail}` : ''}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {!isRejected && access?.onboarding === 'none' ? (
          <Link
            to={buildEnrollmentApplicationPath(branchId, courseId, courseTitle)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <FileText className="h-4 w-4" aria-hidden />
            Complete application
          </Link>
        ) : null}
        <Link
          to="/student/internships"
          className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 dark:border-slate-600 dark:text-slate-200"
        >
          Browse other programs
        </Link>
      </div>

      {location.state?.accessReason === 'pending' && isPending ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          You were redirected here because this course is not available yet.
        </p>
      ) : null}
    </div>
  )
}

export default StudentEnrollmentStatusPage
