import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { ArrowRight, BookOpen, Clock3 } from 'lucide-react'
import {
  ENROLLMENT_APPLICATIONS_CHANGED_EVENT,
  fetchMyEnrollmentApplications,
  isSubmittedEnrollmentApplication,
} from '../../api/enrollmentApplicationApi.js'
import {
  getCourseAccessState,
  getCourseOnboardingBadge,
  listEnrolledCatalogCourses,
  statusCardTone,
  statusPillTone,
} from '../../utils/courseEnrollmentAccess.js'
import {
  buildEnrollmentApplicationPath,
  buildEnrollmentStatusPath,
} from '../../utils/courseAccessRoutes.js'
import { buildStudentCourseNavLink, STUDENT_COURSE_WORKSPACE_PATH } from '../../components/nav/training-sphere/navConstants.js'
import { CATALOG_ENROLLMENT_CHANGED_EVENT } from '../../utils/trainingCatalogEnrollment.js'

function formatWhen(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function StudentApplicationsPage() {
  const { token, userId, email } = useOutletContext()
  const [applications, setApplications] = useState([])
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)

  const reload = useCallback(async () => {
    if (!userId) {
      setApplications([])
      return
    }
    try {
      setError('')
      const result = await fetchMyEnrollmentApplications(token, userId, email)
      setApplications(Array.isArray(result.items) ? result.items : [])
    } catch {
      setError('Unable to load your course applications.')
    }
  }, [token, userId, email])

  useEffect(() => {
    void reload()
  }, [reload, tick])

  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    window.addEventListener(ENROLLMENT_APPLICATIONS_CHANGED_EVENT, bump)
    window.addEventListener(CATALOG_ENROLLMENT_CHANGED_EVENT, bump)
    return () => {
      window.removeEventListener(ENROLLMENT_APPLICATIONS_CHANGED_EVENT, bump)
      window.removeEventListener(CATALOG_ENROLLMENT_CHANGED_EVENT, bump)
    }
  }, [])

  const courseRows = useMemo(() => {
    if (!userId) return []
    const enrollments = listEnrolledCatalogCourses(userId, email)
    return enrollments.map((row) => {
      const access = getCourseAccessState(userId, row.branchId, row.trainingId)
      const app =
        applications.find(
          (a) =>
            String(a.branchId) === String(row.branchId) && String(a.courseId) === String(row.trainingId),
        ) ?? access.application
      const onboarding = access.onboarding
      const badge = getCourseOnboardingBadge(onboarding)
      const detailPath =
        onboarding === 'approved'
          ? buildStudentCourseNavLink(STUDENT_COURSE_WORKSPACE_PATH, row.branchId, row.trainingId)
          : onboarding === 'pending' || onboarding === 'rejected'
            ? buildEnrollmentStatusPath(row.branchId, row.trainingId, row.trainingTitle)
            : buildEnrollmentApplicationPath(row.branchId, row.trainingId, row.trainingTitle)

      return {
        id: `${row.branchId}-${row.trainingId}`,
        courseTitle: row.trainingTitle || app?.courseTitle || 'Training program',
        branchId: row.branchId,
        courseId: row.trainingId,
        onboarding,
        badge,
        application: app,
        enrolledAt: row.enrolledAtUtc,
        detailPath,
        rejectionReason: app?.rejectionReason ?? row.rejectionReason ?? null,
      }
    })
  }, [applications, userId, email, tick])

  const grouped = useMemo(() => {
    const buckets = { pending: [], approved: [], rejected: [], incomplete: [] }
    for (const row of courseRows) {
      if (row.onboarding === 'approved') buckets.approved.push(row)
      else if (row.onboarding === 'rejected') buckets.rejected.push(row)
      else if (row.onboarding === 'pending') buckets.pending.push(row)
      else buckets.incomplete.push(row)
    }
    return buckets
  }, [courseRows])

  const sections = [
    { id: 'pending', title: 'Pending review', hint: 'Your instructor is reviewing your enrollment request.', rows: grouped.pending },
    { id: 'approved', title: 'Approved', hint: 'You have full access to these course workspaces.', rows: grouped.approved },
    { id: 'rejected', title: 'Not approved', hint: 'These courses were not approved for access.', rows: grouped.rejected },
    { id: 'incomplete', title: 'Action required', hint: 'Finish the onboarding application to start review.', rows: grouped.incomplete },
  ]

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">My applications</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
          Track each training you enrolled in — whether your request is still under review, approved, or not approved.
        </p>
        <div className="mt-4">
          <Link
            to="/student/internships"
            className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500"
          >
            Browse trainings
          </Link>
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100">
          {error}
        </p>
      ) : null}

      {courseRows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-600 dark:border-slate-600 dark:text-slate-400">
          You have not enrolled in any trainings yet. Open{' '}
          <Link to="/student/internships" className="font-semibold text-violet-600 hover:underline dark:text-violet-400">
            Trainings
          </Link>{' '}
          to join a program and submit your application.
        </p>
      ) : (
        sections
          .filter((section) => section.rows.length > 0)
          .map((section) => (
            <section key={section.id} aria-labelledby={`${section.id}-heading`} className="space-y-4">
              <div>
                <h2 id={`${section.id}-heading`} className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {section.title}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{section.hint}</p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {section.rows.map((row) => (
                  <article
                    key={row.id}
                    className={`flex h-full flex-col rounded-2xl border p-5 shadow-sm ${statusCardTone(row.onboarding)}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-violet-600 dark:text-violet-400" aria-hidden />
                        <div className="min-w-0">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{row.courseTitle}</h3>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Enrolled {formatWhen(row.enrolledAt)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${statusPillTone(row.onboarding)}`}
                      >
                        {row.badge.label}
                      </span>
                    </div>

                    {row.onboarding === 'pending' && isSubmittedEnrollmentApplication(row.application) ? (
                      <p className="mt-4 text-sm text-amber-900/90 dark:text-amber-100/90">
                        Your application was submitted and is waiting for instructor approval.
                      </p>
                    ) : null}

                    {row.onboarding === 'approved' ? (
                      <p className="mt-4 text-sm text-emerald-900/90 dark:text-emerald-100/90">
                        Approved — open your course workspace from Home or the sidebar.
                      </p>
                    ) : null}

                    {row.onboarding === 'rejected' && row.rejectionReason ? (
                      <p className="mt-4 rounded-xl border border-rose-200/80 bg-white/60 px-3 py-2 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-slate-950/40 dark:text-rose-100">
                        {row.rejectionReason}
                      </p>
                    ) : null}

                    {row.onboarding === 'none' ? (
                      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
                        Complete the onboarding form so your instructor can review your request.
                      </p>
                    ) : null}

                    {row.application?.reviewedAtUtc ? (
                      <p className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Clock3 className="h-3.5 w-3.5" aria-hidden />
                        Last updated {formatWhen(row.application.updatedAtUtc ?? row.application.reviewedAtUtc)}
                      </p>
                    ) : null}

                    <Link
                      to={row.detailPath}
                      className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:underline dark:text-violet-400"
                    >
                      {row.onboarding === 'approved' ? 'Open course' : 'View details'}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          ))
      )}
    </div>
  )
}

export default StudentApplicationsPage
