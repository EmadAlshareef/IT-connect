import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/useAuth.js'
import NavbarLogo from './nav/training-sphere/NavbarLogo.jsx'
import NavbarAuthActions from './nav/training-sphere/NavbarAuthActions.jsx'
import ThemeToggleButton from './nav/training-sphere/ThemeToggleButton.jsx'
import MobileNavDrawer from './nav/training-sphere/MobileNavDrawer.jsx'
import {
  PUBLIC_NAV_LINKS,
  TRAINER_DASHBOARD_PENDING_SECTION_KEY,
  TRAINER_DASHBOARD_PENDING_TRAINING_KEY,
} from './nav/training-sphere/navConstants.js'
import { useStudentApprovedCourses } from '../hooks/useStudentApprovedCourses.js'
import { useTrainerEnrollmentInbox } from '../hooks/useTrainerEnrollmentInbox.js'
import StudentWorkspaceSidebar from './nav/training-sphere/StudentWorkspaceSidebar.jsx'
import TrainerNotificationBell from './trainer/notifications/TrainerNotificationBell.jsx'
import { useAdminNavSlot } from '../context/AdminNavSlotContext.jsx'
import { useTrainerCompanyWorkspace } from '../hooks/useTrainerCompanyWorkspace.js'
import TrainerWorkspaceSidebar from './TrainerWorkspaceSidebar.jsx'
import {
  buildTrainerDashboardUrl,
  parseTrainerTrainingId,
  parseTrainerViewId,
} from '../utils/trainerDashboardNav.js'
import { bootstrapCompanyPortalData } from '../utils/companyPortalBootstrap.js'
import { canUseProtectedApi, isLocalOnlySession } from '../api/authApi.js'
import { buildPendingCountByTrainingId } from '../utils/trainerEnrollmentScope.js'
import {
  btnSecondary,
  sidebarFocusRing,
  sidebarFooterBorder,
  sidebarLinkActive,
  sidebarLinkInactive,
  sidebarMutedLabel,
  sidebarShell,
} from './home/homeTheme.js'

function HamburgerButton({ open, onToggle }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      aria-expanded={open}
      aria-controls="mobile-nav-drawer"
      aria-label={open ? 'Close menu' : 'Open menu'}
      onClick={onToggle}
      className="fixed left-3 top-3 z-50 inline-flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-violet-100 bg-[#FFF9F2] text-violet-800 shadow-md transition hover:border-violet-200 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-900 dark:text-violet-200 dark:hover:border-violet-700/50 dark:hover:bg-slate-800 md:hidden"
    >
      <span className="flex h-5 w-6 flex-col justify-center gap-1.5" aria-hidden>
        <motion.span
          className="block h-0.5 w-6 origin-center rounded-full bg-current"
          animate={open ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
          transition={{ duration: 0.2 }}
        />
        <motion.span
          className="block h-0.5 w-6 rounded-full bg-current"
          animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.15 }}
        />
        <motion.span
          className="block h-0.5 w-6 origin-center rounded-full bg-current"
          animate={open ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
          transition={{ duration: 0.2 }}
        />
      </span>
    </motion.button>
  )
}

function dispatchTrainerDashboardScroll(sectionId) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('trainer-dashboard-nav', { detail: { sectionId } }))
}

/**
 * App chrome — fixed left sidebar (desktop), slide-out sheet (mobile), theme + auth in footer.
 */
function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [trainerPortalLoading, setTrainerPortalLoading] = useState(false)
  const { isAuthenticated, logout, role, email, trainerName, userId, token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const normalizedRole = (role ?? '').toLowerCase()
  const isTrainerWorkspace =
    isAuthenticated && normalizedRole === 'trainer' && location.pathname.startsWith('/dashboard')
  const isStudentWorkspace =
    isAuthenticated && normalizedRole === 'student' && location.pathname.startsWith('/student')
  const isCompanyWorkspace =
    isAuthenticated && normalizedRole === 'company' && location.pathname.startsWith('/company')
  const isAdminWorkspace =
    isAuthenticated && normalizedRole === 'admin' && location.pathname.startsWith('/admin')
  const isWorkspaceNav = isTrainerWorkspace || isStudentWorkspace || isCompanyWorkspace || isAdminWorkspace

  useEffect(() => {
    if (!isAuthenticated || !token || isLocalOnlySession(token) || !canUseProtectedApi(token)) return
    if (!['admin', 'company', 'trainer'].includes(normalizedRole)) return
    const trainerOnly = normalizedRole === 'trainer'
    if (trainerOnly) setTrainerPortalLoading(true)
    void bootstrapCompanyPortalData({ trainerOnly, trainerEmail: email })
      .catch(() => {})
      .finally(() => {
        if (trainerOnly) setTrainerPortalLoading(false)
      })
  }, [isAuthenticated, token, normalizedRole, email])
  const {
    loading: studentCoursesLoading,
    approvedCourses,
    hasApprovedAccess,
    activeCourse,
    showCourseWorkspaceNav,
    selectCourse,
  } = useStudentApprovedCourses({ enabled: isStudentWorkspace || (isAuthenticated && normalizedRole === 'student') })
  const { setSlot: setAdminNavSlot } = useAdminNavSlot()
  const isAdminRoot = location.pathname === '/admin' || location.pathname.startsWith('/admin/')
  const isCompanyDashboard = location.pathname === '/company/dashboard'
  const companyWorkspace = useTrainerCompanyWorkspace(email, trainerName)
  const trainerSessions = useMemo(() => companyWorkspace.sessions, [companyWorkspace.sessions])
  const trainerInbox = useTrainerEnrollmentInbox({
    token,
    trainerEmail: email,
    trainerId: userId,
    role,
    enabled: isTrainerWorkspace,
  })
  const selectedTrainingId = parseTrainerTrainingId(location.pathname, searchParams)
  const activeViewId = parseTrainerViewId(searchParams)
  const pendingCountBySession = useMemo(
    () => buildPendingCountByTrainingId(trainerInbox.pendingApplications, trainerSessions),
    [trainerInbox.pendingApplications, trainerSessions],
  )
  const selectedEnrollmentPendingCount = pendingCountBySession[selectedTrainingId] ?? 0

  const goToTrainerDashboard = useCallback(
    (trainingId, viewId) => {
      const tid = trainingId || trainerSessions[0]?.id || ''
      const path = buildTrainerDashboardUrl(tid, viewId)
      if (location.pathname === '/dashboard') {
        navigate(path, { replace: true })
        if (viewId) {
          requestAnimationFrame(() => dispatchTrainerDashboardScroll(viewId))
        }
        return
      }
      try {
        if (viewId) sessionStorage.setItem(TRAINER_DASHBOARD_PENDING_SECTION_KEY, viewId)
        if (tid) sessionStorage.setItem(TRAINER_DASHBOARD_PENDING_TRAINING_KEY, tid)
      } catch {
        /* ignore */
      }
      navigate(path)
    },
    [location.pathname, navigate, trainerSessions],
  )

  const selectTraining = useCallback(
    (trainingId) => {
      goToTrainerDashboard(trainingId, activeViewId || '')
    },
    [activeViewId, goToTrainerDashboard],
  )

  const selectView = useCallback(
    (viewId, trainingId) => {
      goToTrainerDashboard(trainingId || selectedTrainingId, viewId)
    },
    [goToTrainerDashboard, selectedTrainingId],
  )

  useEffect(() => {
    const id = window.setTimeout(() => setMobileOpen(false), 0)
    return () => window.clearTimeout(id)
  }, [location.pathname])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const closeMobile = () => setMobileOpen(false)

  const studentNavClass = ({ isActive }) =>
    `flex w-full items-center rounded-2xl px-3 py-2.5 text-sm font-bold transition ${sidebarFocusRing} ${
      isActive ? sidebarLinkActive : sidebarLinkInactive
    }`

  const publicNavClass = ({ isActive }) =>
    `flex w-full items-center rounded-2xl px-3 py-2.5 text-sm font-bold transition ${sidebarFocusRing} ${
      isActive ? sidebarLinkActive : sidebarLinkInactive
    }`

  const showPublicSidebarNav = !isTrainerWorkspace && !isStudentWorkspace && !isAdminRoot && !isCompanyDashboard

  return (
    <>
      <aside className={`fixed left-0 top-0 z-40 hidden h-dvh w-64 flex-col md:flex ${sidebarShell}`}>
        <div className="flex h-full flex-col px-3 pb-4 pt-5">
          {!isTrainerWorkspace ? (
            <div className="px-1 pb-4">
              <NavbarLogo onNavigate={closeMobile} />
            </div>
          ) : (
            <div className="shrink-0 px-2 pb-3">
              <p className={sidebarMutedLabel}>Training Sphere</p>
              <p className="mt-1 text-lg font-extrabold text-slate-900 dark:text-slate-50">Trainer workspace</p>
            </div>
          )}

          {isTrainerWorkspace ? (
            <div
              role="navigation"
              aria-label="Workspace"
              className="flex min-h-0 flex-1 flex-col overflow-hidden px-1 py-2"
            >
              <TrainerWorkspaceSidebar
                sessions={trainerSessions}
                selectedTrainingId={selectedTrainingId}
                onSelectTraining={selectTraining}
                pendingCountBySession={pendingCountBySession}
                trainerEmail={email}
                isLoading={trainerPortalLoading}
              />
            </div>
          ) : isStudentWorkspace ? (
            <div
              role="navigation"
              aria-label="Workspace"
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-2"
            >
              <StudentWorkspaceSidebar
                userId={userId}
                loading={studentCoursesLoading}
                hasApprovedAccess={hasApprovedAccess}
                approvedCourses={approvedCourses}
                activeCourse={activeCourse}
                showCourseWorkspaceNav={showCourseWorkspaceNav}
                onSelectCourse={selectCourse}
              />
            </div>
          ) : (
            <div
              role="navigation"
              aria-label={showPublicSidebarNav ? 'Site' : 'Dashboard sections'}
              className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-1 py-2"
            >
              {isAdminRoot || isCompanyDashboard ? (
                <div ref={setAdminNavSlot} className="min-h-0 w-full shrink-0" />
              ) : null}
              {showPublicSidebarNav
                ? PUBLIC_NAV_LINKS.map((item) => (
                    <NavLink key={item.to} to={item.to} end={item.end} className={publicNavClass} onClick={closeMobile}>
                      {item.label}
                    </NavLink>
                  ))
                : null}
            </div>
          )}

          <div className={`mt-auto flex flex-col gap-3 px-2 pt-4 ${sidebarFooterBorder}`}>
            {isTrainerWorkspace ? (
              <div className="flex items-center justify-between gap-2 px-1">
                <span className={sidebarMutedLabel}>Alerts</span>
                <TrainerNotificationBell
                  token={token}
                  userId={userId}
                  notifications={trainerInbox.notifications}
                  unreadCount={trainerInbox.unreadCount}
                  onNavigate={(url) => navigate(url)}
                />
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-2 px-1">
              <span className={sidebarMutedLabel}>Theme</span>
              <ThemeToggleButton />
            </div>
            {isWorkspaceNav ? (
              <button type="button" onClick={handleLogout} className={`w-full ${btnSecondary} !px-4 !py-2.5`}>
                Log out
              </button>
            ) : (
              <NavbarAuthActions isAuthenticated={isAuthenticated} onLogout={handleLogout} />
            )}
          </div>
        </div>
      </aside>

      <HamburgerButton open={mobileOpen} onToggle={() => setMobileOpen((o) => !o)} />

      <MobileNavDrawer
        open={mobileOpen}
        onClose={closeMobile}
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        trainerWorkspaceMode={isTrainerWorkspace}
        studentWorkspaceMode={isStudentWorkspace}
        studentUserId={userId}
        studentCoursesLoading={studentCoursesLoading}
        studentHasApprovedAccess={hasApprovedAccess}
        studentApprovedCourses={approvedCourses}
        studentActiveCourse={activeCourse}
        studentShowCourseWorkspaceNav={showCourseWorkspaceNav}
        onSelectStudentCourse={selectCourse}
        trainerSessions={trainerSessions}
        selectedTrainingId={selectedTrainingId}
        activeViewId={activeViewId}
        onSelectTraining={(trainingId) => {
          selectTraining(trainingId)
          closeMobile()
        }}
        onSelectView={(viewId, trainingId) => {
          selectView(viewId, trainingId)
          closeMobile()
        }}
        enrollmentPendingCount={selectedEnrollmentPendingCount}
        pendingCountBySession={pendingCountBySession}
        trainerEmail={email}
        trainerPortalLoading={trainerPortalLoading}
      />
    </>
  )
}

export default AppShell

