import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { BookOpen, Clock } from 'lucide-react'
import {
  buildStudentCourseNavLink,
  STUDENT_COURSE_WORKSPACE_PATH,
  visibleStudentWorkspaceNavItems,
} from './navConstants.js'
import {
  badgeToneClasses,
  getCourseAccessState,
  getCourseOnboardingBadge,
  listEnrolledCatalogCourses,
  listenCourseAccessChanges,
  shouldShowCourseWorkspaceNav,
} from '../../../utils/courseEnrollmentAccess.js'
import {
  buildEnrollmentApplicationPath,
  buildEnrollmentStatusPath,
} from '../../../utils/courseAccessRoutes.js'
import { sidebarFocusRing, sidebarLinkActive, sidebarLinkInactive, sidebarMutedLabel } from '../../home/homeTheme.js'

function linkClass({ isActive }) {
  return `flex w-full items-center rounded-2xl px-3 py-2.5 text-sm font-bold transition ${sidebarFocusRing} ${
    isActive ? sidebarLinkActive : sidebarLinkInactive
  }`
}

function courseLinkClass(isActive, tone = 'default') {
  const toneClass =
    tone === 'approved'
      ? isActive
        ? 'border-violet-400 bg-violet-50 text-violet-900 dark:border-violet-600 dark:bg-violet-950/40 dark:text-violet-100'
        : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800'
      : isActive
        ? 'border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100'
        : 'border-transparent text-amber-800 hover:bg-amber-50 dark:text-amber-200 dark:hover:bg-amber-950/30'
  return `flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${sidebarFocusRing} ${toneClass}`
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
  const [, setAccessTick] = useState(0)
  const discoverNav = visibleStudentWorkspaceNavItems(false).filter((item) => !item.requiresEnrollment)

  useEffect(() => {
    return listenCourseAccessChanges(() => setAccessTick((t) => t + 1))
  }, [])

  const enrolledCourses = userId ? listEnrolledCatalogCourses(userId) : []

  const applicationsNavBadge = useMemo(() => {
    if (!userId || enrolledCourses.length === 0) return null
    const primary =
      activeCourse &&
      enrolledCourses.find(
        (row) =>
          String(row.branchId) === String(activeCourse.branchId) &&
          String(row.trainingId) === String(activeCourse.trainingId),
      )
    const target = primary ?? enrolledCourses[0]
    if (!target) return null
    const { onboarding } = getCourseAccessState(userId, target.branchId, target.trainingId)
    return getCourseOnboardingBadge(onboarding)
  }, [activeCourse, enrolledCourses, userId])

  const handleSelectApprovedCourse = (course) => {
    onSelectCourse(course)
    navigate(buildStudentCourseNavLink(STUDENT_COURSE_WORKSPACE_PATH, course.branchId, course.trainingId))
  }

  const handleEnrolledCourseClick = (row) => {
    const { onboarding } = getCourseAccessState(userId, row.branchId, row.trainingId)
    const title = row.trainingTitle ?? ''
    if (onboarding === 'approved') {
      handleSelectApprovedCourse(row)
      return
    }
    if (onboarding === 'pending' || onboarding === 'rejected') {
      navigate(buildEnrollmentStatusPath(row.branchId, row.trainingId, title))
      return
    }
    navigate(buildEnrollmentApplicationPath(row.branchId, row.trainingId, title))
  }

  const showWorkspaceNav =
    showCourseWorkspaceNav && shouldShowCourseWorkspaceNav(userId, activeCourse)

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Discover
        </p>
        {discoverNav.map((item) =>
          item.to === '/student/applications' ? (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              <span className="flex w-full items-center justify-between gap-2">
                <span>{item.label}</span>
                {applicationsNavBadge ? (
                  <span
                    className={`truncate text-[10px] font-normal ${badgeToneClasses(applicationsNavBadge.tone)}`}
                  >
                    {applicationsNavBadge.label}
                  </span>
                ) : null}
              </span>
            </NavLink>
          ) : (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              {item.label}
            </NavLink>
          ),
        )}
      </div>

      {loading && enrolledCourses.length === 0 ? (
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
            const badge = getCourseOnboardingBadge(onboarding).label
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
                    className={`block text-[10px] font-normal ${badgeToneClasses(getCourseOnboardingBadge(onboarding).tone)}`}
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
          Enroll in a training from Trainings to see your courses here.
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
                onClick={() => onSelectCourse(activeCourse)}
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
