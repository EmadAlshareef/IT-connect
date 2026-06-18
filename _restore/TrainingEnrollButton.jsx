import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { useAuth } from '../context/useAuth.js'
import {
  CATALOG_ENROLLMENT_CHANGED_EVENT,
  enrollInCatalogTraining,
  hasCatalogEnrollmentRecord,
} from '../utils/trainingCatalogEnrollment.js'
import { getCourseAccessState } from '../utils/courseEnrollmentAccess.js'
import { ENROLLMENT_APPLICATIONS_CHANGED_EVENT } from '../api/enrollmentApplicationApi.js'
import { invalidateStudentTrainingAccess } from '../utils/studentTrainingAccess.js'

function applicationPath(branchId, trainingId, title) {
  const params = new URLSearchParams({
    branchId: String(branchId),
    courseId: String(trainingId),
    title: String(title ?? ''),
  })
  return `/student/enrollment/application?${params.toString()}`
}

function TrainingEnrollButton({
  branchId,
  trainingId,
  trainingTitle,
  compact = false,
  className = '',
}) {
  const { isAuthenticated, role, userId, token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const normalizedRole = String(role ?? '').toLowerCase()

  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [access, setAccess] = useState({ enrolled: false, onboarding: 'none', application: null })

  const refresh = useCallback(() => {
    if (!userId) {
      setAccess({ enrolled: false, onboarding: 'none', application: null })
      return
    }
    setAccess(getCourseAccessState(userId, branchId, trainingId))
  }, [branchId, trainingId, userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const onChange = () => refresh()
    window.addEventListener(CATALOG_ENROLLMENT_CHANGED_EVENT, onChange)
    window.addEventListener(ENROLLMENT_APPLICATIONS_CHANGED_EVENT, onChange)
    window.addEventListener('ts-course-access-changed', onChange)
    return () => {
      window.removeEventListener(CATALOG_ENROLLMENT_CHANGED_EVENT, onChange)
      window.removeEventListener(ENROLLMENT_APPLICATIONS_CHANGED_EVENT, onChange)
      window.removeEventListener('ts-course-access-changed', onChange)
    }
  }, [refresh])

  const returnPath = `${location.pathname}${location.search}`
  const appLink = applicationPath(branchId, trainingId, trainingTitle)

  const handleEnroll = async (event) => {
    event.preventDefault()
    event.stopPropagation()

    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(returnPath)}`)
      return
    }

    if (normalizedRole !== 'student') {
      setError('Only student accounts can enroll in trainings.')
      return
    }

    if (hasCatalogEnrollmentRecord(userId, branchId, trainingId)) {
      navigate(appLink)
      return
    }

    setError('')
    setStatus('loading')
    try {
      enrollInCatalogTraining(userId, {
        branchId,
        trainingId,
        trainingTitle,
      })
      invalidateStudentTrainingAccess()
      setStatus('done')
      navigate(appLink)
    } catch {
      setError('Could not complete enrollment. Try again.')
      setStatus('idle')
    }
  }

  if (!isAuthenticated) {
    return (
      <Link
        to={`/login?redirect=${encodeURIComponent(returnPath)}`}
        onClick={(event) => event.stopPropagation()}
        className={`inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 ${className}`}
      >
        Sign in to enroll
      </Link>
    )
  }

  if (normalizedRole !== 'student') {
    return (
      <p className={`text-xs text-slate-500 dark:text-slate-400 ${className}`}>
        Student account required to enroll.
      </p>
    )
  }

  if (access.onboarding === 'approved') {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          Enrolled · Approved
        </span>
        <Link
          to="/student/home"
          onClick={(event) => event.stopPropagation()}
          className="text-center text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-300"
        >
          Open trainee dashboard →
        </Link>
      </div>
    )
  }

  if (access.onboarding === 'pending') {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <Clock className="h-4 w-4 shrink-0" aria-hidden />
          Pending review
        </span>
        <Link
          to={appLink}
          onClick={(event) => event.stopPropagation()}
          className="text-center text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-300"
        >
          View application status →
        </Link>
      </div>
    )
  }

  if (access.onboarding === 'rejected') {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          Not approved
        </span>
        <Link
          to={appLink}
          onClick={(event) => event.stopPropagation()}
          className="text-center text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400"
        >
          View details →
        </Link>
      </div>
    )
  }

  if (access.enrolled && (access.onboarding === 'none' || !access.application)) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <Link
          to={appLink}
          onClick={(event) => event.stopPropagation()}
          className={`inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 font-semibold text-white shadow-sm transition hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 ${
            compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'
          }`}
        >
          Complete application
        </Link>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Required onboarding form before course access.
        </p>
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <button
        type="button"
        disabled={status === 'loading'}
        onClick={handleEnroll}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-indigo-500 dark:hover:bg-indigo-400 ${
          compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'
        }`}
      >
        {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {status === 'loading' ? 'Enrolling…' : 'Enroll now'}
      </button>
      {error ? <p className="text-xs text-rose-600 dark:text-rose-300">{error}</p> : null}
      {!compact && token ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          After enrolling, you will complete a short application for instructor approval.
        </p>
      ) : null}
    </div>
  )
}

export default TrainingEnrollButton
