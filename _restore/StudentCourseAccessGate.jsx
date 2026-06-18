import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../../context/useAuth.js'
import { ENROLLMENT_APPLICATIONS_CHANGED_EVENT } from '../../api/enrollmentApplicationApi.js'
import { COURSE_ACCESS_CHANGED_EVENT, listenCourseAccessChanges } from '../../utils/courseEnrollmentAccess.js'
import { resolveCourseContentRedirect } from '../../utils/courseAccessRoutes.js'
import { studentRouteRequiresActiveTraining } from '../../utils/studentTrainingAccess.js'

/**
 * Blocks ALL course workspace routes until instructor approves enrollment for the target course.
 */
function StudentCourseAccessGate({ children }) {
  const { userId } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [tick, setTick] = useState(0)

  const needsGate = studentRouteRequiresActiveTraining(location.pathname)

  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    window.addEventListener(ENROLLMENT_APPLICATIONS_CHANGED_EVENT, bump)
    const unsub = listenCourseAccessChanges(bump)
    return () => {
      window.removeEventListener(ENROLLMENT_APPLICATIONS_CHANGED_EVENT, bump)
      unsub()
    }
  }, [])

  const decision = useMemo(() => {
    if (!needsGate || !userId) return null
    return resolveCourseContentRedirect(userId, location.pathname, searchParams)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick refreshes access after approval
  }, [needsGate, userId, location.pathname, searchParams, tick])

  if (!needsGate) {
    return children
  }

  if (!userId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" aria-hidden />
      </div>
    )
  }

  if (decision?.redirect) {
    return <Navigate to={decision.redirect} replace state={{ accessReason: decision.reason }} />
  }

  return children
}

export default StudentCourseAccessGate
