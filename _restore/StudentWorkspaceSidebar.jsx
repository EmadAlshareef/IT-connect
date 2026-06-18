import { NavLink, useNavigate } from 'react-router-dom'
import { BookOpen, Clock } from 'lucide-react'
import {
  buildStudentCourseNavLink,
  buildEnrollmentApplicationPath,
  buildEnrollmentStatusPath,
  visibleStudentWorkspaceNavItems,
} from './navConstants.js'
import {
  getCourseAccessState,
  listEnrolledCatalogCourses,
  shouldShowCourseWorkspaceNav,
} from '../../../utils/courseEnrollmentAccess.js'
import { buildEnrollmentApplicationPath as buildAppPath, buildEnrollmentStatusPath as buildStatusPath } from '../../../utils/courseAccessRoutes.js'

const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-blue-600/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-blue-400/80 dark:focus-visible:ring-offset-slate-950'

function linkClass({ isActive }) {
  return `flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-semibold transition ${focusRing} ${
    isActive
      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
      : 'text-slate-600 hover:bg-blue-50/90 hover:text-blue-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
  }`
}

function courseLinkClass(isActive, tone = 'default') {
  const toneClass =
    tone === 'approved'
      ? isActive
        ? 'border-indigo-400 bg-indigo-50 text-indigo-900 dark:border-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-100'
        : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800'
      : isActive
        ? 'border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100'
        : 'border-transparent text-amber-800 hover:bg-amber-50 dark:text-amber-200 dark:hover:bg-amber-950/30'
  return `flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${focusRing} ${toneClass}`
}

function StudentWorkspaceSidebar({
  userId,
  loading,
  hasApprovedAccess,
  approvedCourses,
  activeCourse,
  showCourseWorkspaceNav = false,
  onSelectCourse,
}) {
  const navigate = useNavigate()
  const discoverNav = visibleStudentWorkspaceNavItems(false).filter((item) => !item.requiresEnrollment)

  const enrolledCourses = userId ? listEnrolledCatalogCourses(userId) : []

  const handleSelectApprovedCourse = (course) => {
    onSelectCourse(course)
    navigate(buildStudentCourseNavLink('/student/home', course.branchId, course.trainingId))
  }

  const handleEnrolledCourseClick = (row) => {
    const { onboarding } = getCourseAccessState(userId, row.branchId, row.trainingId)
    const title = row.trainingTitle ?? ''
    if (onboarding === 'approved') {
      handleSelectApprovedCourse(row)
      return
    }
    if (onboarding === 'pending') {
      navigate(buildStatusPath(row.branchId, row.trainingId, title))
      return
    }
    if (onboarding === 'rejected') {
      navigate(buildStatusPath(row.branchId, row.trainingId, title))
      return
    }
    navigate(buildAppPath(row.branchId, row.trainingId, title))
  }

  const showWorkspaceNav =
    showCourseWorkspaceNav && shouldShowCourseWorkspaceNav(userId, activeCourse)

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Discover
        </p>
        {discoverNav.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass}>
            {item.label}
          </NavLink>
        ))}
      </div>

      {loading ? (
        <p className="px-3 text-xs text-slate-500 dark:text-slate-400">Checking your courses…</p>
      ) : enrolledCourses.length > 0 ? (
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            My courses
          </p>
          {enrolledCourses.map((row) => {
            const { onboarding } = getCourseAccessState(userId, row.branchId, row.trainingId)
            const isActive =
              activeCourse &&
              String(activeCourse.branchId) === String(row.branchId) &&
              String(activeCourse.trainingId) === String(row.trainingId)
            const tone = onboarding === 'approved' ? 'approved' : 'pending'
            const badge =
              onboarding === 'approved'
                ? 'Approved'
                : onboarding === 'pending'
                  ? 'Pending review'
                  : onboarding === 'rejected'
                    ? 'Not approved'
                    : 'Complete application'
            return (
              <button
                key={`${row.branchId}-${row.trainingId}`}
                type="button"
                onClick={() => handleEnrolledCourseClick(row)}
                className={courseLinkClass(isActive, tone)}
              >
                {onboarding === 'pending' || onboarding === 'none' ? (
                  <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                ) : (
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{row.trainingTitle || 'Training'}</span>
                  <span
                    className={`block text-[10px] font-normal ${
                      onboarding === 'approved'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : onboarding === 'rejected'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {badge}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 px-3 py-3 text-xs leading-relaxed text-slate-500 dark:border-slate-600 dark:text-slate-400">
          Enroll in a training from Services to see your courses here.
        </p>
      )}

      {showWorkspaceNav && activeCourse ? (
        <div className="space-y-1 border-t border-slate-200 pt-3 dark:border-slate-800">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {activeCourse.trainingTitle || 'Course workspace'}
          </p>
          {visibleStudentWorkspaceNavItems(true)
            .filter((item) => item.requiresEnrollment)
            .map((item) => (
              <NavLink
                key={item.to}
                to={buildStudentCourseNavLink(item.to, activeCourse.branchId, activeCourse.trainingId)}
                end={item.to === '/student/home'}
                className={linkClass}
              >
                {item.label}
              </NavLink>
            ))}
        </div>
      ) : null}

      {!loading && enrolledCourses.length > 0 && !showWorkspaceNav ? (
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 px-3">
          Course lessons and tasks unlock after your instructor approves your enrollment application.
        </p>
      ) : null}
    </div>
  )
}

export default StudentWorkspaceSidebar
