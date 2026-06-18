import { useEffect, useMemo, useState } from 'react'

import { Navigate, useLocation } from 'react-router-dom'

import { Loader2 } from 'lucide-react'

import { useAuth } from '../../context/useAuth.js'

import {

  ENROLLMENT_APPLICATIONS_CHANGED_EVENT,

  fetchMyEnrollmentApplications,

} from '../../api/enrollmentApplicationApi.js'

import { listenCourseAccessChanges } from '../../utils/courseEnrollmentAccess.js'

import { resolveCourseContentRedirect } from '../../utils/courseAccessRoutes.js'

import { studentRouteRequiresActiveTraining } from '../../utils/studentTrainingAccess.js'

import { isLocalOnlySession } from '../../api/authApi.js'



/**

 * Blocks ALL course workspace routes until instructor approves enrollment for the target course.

 */

function StudentCourseAccessGate({ children }) {

  const { userId, token } = useAuth()

  const location = useLocation()

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])

  const [tick, setTick] = useState(0)

  const [accessLoading, setAccessLoading] = useState(false)



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



  useEffect(() => {

    if (!needsGate || !userId || isLocalOnlySession(token)) {

      setAccessLoading(false)

      return

    }

    let cancelled = false

    setAccessLoading(true)

    void fetchMyEnrollmentApplications(token, userId)

      .then((result) => {

        if (cancelled) return

        setTick((n) => n + 1)

      })

      .catch(() => {

        /* fall back to in-memory / local state */

      })

      .finally(() => {

        if (!cancelled) setAccessLoading(false)

      })

    return () => {

      cancelled = true

    }

  }, [needsGate, userId, token, location.pathname])



  const decision = useMemo(() => {

    if (!needsGate || !userId) return null

    return resolveCourseContentRedirect(userId, location.pathname, searchParams)

  }, [needsGate, userId, location.pathname, searchParams, tick])



  if (!needsGate) {

    return children

  }



  if (!userId || accessLoading) {

    return (

      <div className="flex min-h-[40vh] items-center justify-center">

        <Loader2 className="h-6 w-6 animate-spin text-violet-600" aria-hidden />

      </div>

    )

  }



  if (decision?.redirect) {

    const current = `${location.pathname}${location.search}`

    const target = decision.redirect.startsWith('/')

      ? decision.redirect

      : `${location.pathname}${decision.redirect}`

    if (target !== current) {

      return <Navigate to={target} replace state={{ accessReason: decision.reason }} />

    }

  }



  return children

}



export default StudentCourseAccessGate

