import PropTypes from 'prop-types'
import { useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../../context/useAuth.js'
import { useStudentJoinedTraining } from '../../../hooks/useStudentJoinedTraining.js'
import {
  btnPrimary,
  btnSecondary,
  sidebarFocusRing,
  sidebarLinkActive,
  sidebarLinkInactive,
  sidebarMutedLabel,
  sidebarShell,
} from '../../home/homeTheme.js'
import {
  PUBLIC_NAV_LINKS,
  STUDENT_LANDING_PATH,
} from './navConstants.js'
import TrainerWorkspaceSidebar from '../../TrainerWorkspaceSidebar.jsx'
import StudentWorkspaceSidebar from './StudentWorkspaceSidebar.jsx'

const linkVariants = {
  hidden: { opacity: 0, y: -10 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.05 + i * 0.05, duration: 0.32, ease: [0.22, 1, 0.36, 1] },
  }),
}

const mobileNavLinkClass = ({ isActive }) =>
  `block rounded-2xl border-2 px-5 py-4 text-lg font-bold transition ${sidebarFocusRing} ${
    isActive ? `${sidebarLinkActive} border-transparent` : `border-transparent ${sidebarLinkInactive}`
  }`

function MobileNavDrawer({
  open,
  onClose,
  isAuthenticated,
  onLogout,
  trainerWorkspaceMode,
  studentWorkspaceMode,
  onTrainerSectionNav,
  trainerSessions,
  selectedTrainingId,
  activeViewId,
  onSelectTraining,
  onSelectView,
  enrollmentPendingCount = 0,
  pendingCountBySession = {},
  trainerEmail = '',
  trainerPortalLoading = false,
  studentUserId,
  studentCoursesLoading,
  studentHasApprovedAccess,
  studentApprovedCourses,
  studentActiveCourse,
  studentShowCourseWorkspaceNav,
  onSelectStudentCourse,
}) {
  const panelRef = useRef(null)
  const navigate = useNavigate()
  const { role } = useAuth()
  const { joined: studentJoined, loading: studentJoinLoading } = useStudentJoinedTraining()
  const normalizedRole = (role ?? '').toLowerCase()
  const dashboardTo =
    normalizedRole === 'admin'
      ? '/admin'
      : normalizedRole === 'company'
        ? '/company/dashboard'
        : normalizedRole === 'student'
          ? STUDENT_LANDING_PATH
          : '/dashboard'
  const dashboardLabel =
    normalizedRole === 'admin'
      ? 'Admin Dashboard'
      : normalizedRole === 'company'
        ? 'Company Dashboard'
        : normalizedRole === 'student'
          ? 'Student Dashboard'
          : 'Dashboard'

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open || !panelRef.current) return
    const node = panelRef.current
    const focusable = node.querySelectorAll('a[href], button:not([disabled])')
    const first = focusable[0]
    window.setTimeout(() => first?.focus(), 0)
  }, [open])

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="backdrop"
            role="presentation"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[44] bg-white/55 backdrop-blur-sm dark:bg-slate-950/65 md:hidden"
            onClick={onClose}
          />
          <motion.div
            key="panel"
            ref={panelRef}
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            className={`fixed inset-y-0 left-0 z-[45] flex w-[min(22rem,92vw)] max-w-full flex-col overflow-hidden shadow-2xl shadow-violet-900/10 md:hidden ${sidebarShell}`}
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-10 pt-4">
              <div className="mx-auto flex max-w-md flex-col">
                <div className="mb-6 flex items-center justify-between">
                  <p className={sidebarMutedLabel}>Menu</p>
                  <button
                    type="button"
                    className={`rounded-2xl border-2 border-violet-100 bg-white p-2.5 text-violet-700 transition hover:border-violet-200 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-900 dark:text-violet-300 dark:hover:border-violet-700/50 dark:hover:bg-slate-800 ${sidebarFocusRing}`}
                    aria-label="Close menu"
                    onClick={onClose}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {trainerWorkspaceMode ? (
                  <div role="navigation" aria-label="Mobile workspace">
                    <TrainerWorkspaceSidebar
                      compact
                      sessions={trainerSessions ?? []}
                      selectedTrainingId={selectedTrainingId}
                      onSelectTraining={onSelectTraining ?? (() => {})}
                      pendingCountBySession={pendingCountBySession}
                      trainerEmail={trainerEmail}
                      isLoading={trainerPortalLoading}
                    />
                  </div>
                ) : studentWorkspaceMode ? (
                  <div role="navigation" aria-label="Mobile workspace" onClick={onClose}>
                    <StudentWorkspaceSidebar
                      userId={studentUserId}
                      loading={studentCoursesLoading}
                      hasApprovedAccess={studentHasApprovedAccess}
                      approvedCourses={studentApprovedCourses ?? []}
                      activeCourse={studentActiveCourse}
                      showCourseWorkspaceNav={studentShowCourseWorkspaceNav}
                      onSelectCourse={(course) => {
                        onSelectStudentCourse?.(course)
                        onClose()
                      }}
                    />
                  </div>
                ) : (
                  <section
                    className="overflow-hidden rounded-[1.75rem] border-2 border-violet-100/80 bg-white/80 dark:border-slate-700 dark:bg-slate-900/60"
                    aria-labelledby="mobile-site-sidebar-title"
                  >
                    <h2
                      id="mobile-site-sidebar-title"
                      className={`border-b border-violet-100 px-4 py-2.5 dark:border-slate-700 ${sidebarMutedLabel}`}
                    >
                      Site
                    </h2>
                    <div role="navigation" aria-label="Mobile primary" className="p-2">
                      <ul className="flex flex-col gap-2" role="list">
                        <motion.li custom={0} variants={linkVariants} initial="hidden" animate="show">
                          <NavLink to="/" end onClick={onClose} className={mobileNavLinkClass}>
                            Home
                          </NavLink>
                        </motion.li>
                        {PUBLIC_NAV_LINKS.map((item, i) => (
                          <motion.li key={item.to} custom={i + 1} variants={linkVariants} initial="hidden" animate="show">
                            <NavLink to={item.to} end={item.end} onClick={onClose} className={mobileNavLinkClass}>
                              {item.label}
                            </NavLink>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  </section>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18, duration: 0.3 }}
                  className="mt-10 border-t border-violet-100 pt-8 dark:border-slate-800"
                >
                  {isAuthenticated ? (
                    <div className="flex flex-col gap-3">
                      {!trainerWorkspaceMode &&
                      !studentWorkspaceMode &&
                      normalizedRole !== 'company' ? (
                        normalizedRole === 'student' && studentJoinLoading ? (
                          <p className="text-center text-sm text-slate-500 dark:text-slate-400">Checking training status…</p>
                        ) : normalizedRole === 'student' && !studentJoined ? (
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <NavLink to="/student/internships" onClick={onClose} className={`${btnSecondary} w-full !py-4`}>
                              Join a training
                            </NavLink>
                          </motion.div>
                        ) : (
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <button
                              type="button"
                              className={`${btnPrimary} w-full !py-4`}
                              onClick={() => {
                                onClose()
                                if (normalizedRole === 'student') {
                                  navigate(STUDENT_LANDING_PATH)
                                } else {
                                  navigate(dashboardTo)
                                }
                              }}
                            >
                              {dashboardLabel}
                            </button>
                          </motion.div>
                        )
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          onLogout()
                          onClose()
                        }}
                        className={`${btnSecondary} w-full !py-3.5`}
                      >
                        Log out
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <NavLink to="/register" onClick={onClose} className={`${btnPrimary} w-full !py-4`}>
                          Sign Up
                        </NavLink>
                      </motion.div>
                      <NavLink
                        to="/login"
                        onClick={onClose}
                        className="py-2 text-center text-base font-bold text-violet-700 transition hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100"
                      >
                        Login
                      </NavLink>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}

MobileNavDrawer.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  isAuthenticated: PropTypes.bool.isRequired,
  onLogout: PropTypes.func.isRequired,
  trainerWorkspaceMode: PropTypes.bool,
  studentWorkspaceMode: PropTypes.bool,
  onTrainerSectionNav: PropTypes.func,
  trainerSessions: PropTypes.arrayOf(PropTypes.object),
  selectedTrainingId: PropTypes.string,
  activeViewId: PropTypes.string,
  onSelectTraining: PropTypes.func,
  onSelectView: PropTypes.func,
}

MobileNavDrawer.defaultProps = {
  trainerWorkspaceMode: false,
  studentWorkspaceMode: false,
  onTrainerSectionNav: undefined,
  trainerSessions: [],
  selectedTrainingId: '',
  activeViewId: '',
  onSelectTraining: undefined,
  onSelectView: undefined,
}

export default MobileNavDrawer
