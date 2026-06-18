import PropTypes from 'prop-types'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../../context/useAuth.js'
import { useStudentJoinedTraining } from '../../../hooks/useStudentJoinedTraining.js'
import { btnPrimary, btnSecondary } from '../../home/homeTheme.js'
import { STUDENT_LANDING_PATH } from './navConstants.js'

const loginLink =
  'rounded-2xl px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-violet-50 hover:text-violet-900 focus-visible:outline focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF9F2] dark:text-slate-300 dark:hover:bg-violet-950/40 dark:hover:text-violet-100 dark:focus-visible:ring-offset-slate-950'

function NavbarAuthActions({ isAuthenticated, onLogout }) {
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

  const goDashboard = () => {
    void navigate(dashboardTo)
  }

  if (isAuthenticated) {
    const showStudentDashboard = normalizedRole !== 'student' || studentJoined
    const isStudentPending = normalizedRole === 'student' && studentJoinLoading

    return (
      <div
        className={`pointer-events-auto relative z-[1] flex gap-2 ${
          normalizedRole === 'student' ? 'w-full flex-col' : 'items-center'
        }`}
      >
        {normalizedRole === 'student' ? (
          isStudentPending ? (
            <span className="rounded-2xl border-2 border-violet-100 bg-violet-50/80 px-4 py-2.5 text-center text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-400">
              Checking training status…
            </span>
          ) : showStudentDashboard ? (
            <button type="button" onClick={goDashboard} className={`${btnPrimary} w-full cursor-pointer !px-4 !py-2.5`}>
              {dashboardLabel}
            </button>
          ) : (
            <Link to="/student/internships" className={`${btnSecondary} w-full !px-4 !py-2.5`}>
              Join a training
            </Link>
          )
        ) : normalizedRole === 'company' || normalizedRole === 'admin' ? null : (
          <button type="button" onClick={goDashboard} className={`${btnPrimary} cursor-pointer !px-4 !py-2.5`}>
            {dashboardLabel}
          </button>
        )}
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onLogout}
          className={`${btnSecondary} !px-4 !py-2.5 ${normalizedRole === 'student' ? 'w-full' : ''}`}
        >
          Log out
        </motion.button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
        <Link to="/register" className={`${btnPrimary} w-full !px-4 !py-2.5 sm:w-auto`}>
          Sign Up
        </Link>
      </motion.div>
      <Link to="/login" className={`${loginLink} w-full text-center sm:w-auto`}>
        Login
      </Link>
    </div>
  )
}

NavbarAuthActions.propTypes = {
  isAuthenticated: PropTypes.bool.isRequired,
  onLogout: PropTypes.func.isRequired,
}

export default NavbarAuthActions
