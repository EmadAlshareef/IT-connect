import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/useAuth.js'
import {
  COURSE_ACCESS_CHANGED_EVENT,
  listenCourseAccessChanges,
} from '../utils/courseEnrollmentAccess.js'
import { ENROLLMENT_APPLICATIONS_CHANGED_EVENT } from '../api/enrollmentApplicationApi.js'
import {
  STUDENT_TRAINING_ACCESS_EVENT,
  fetchStudentJoinedTraining,
} from '../utils/studentTrainingAccess.js'

/**
 * Whether the signed-in student has been accepted into a training (internship) program.
 */
export function useStudentJoinedTraining() {
  const { isAuthenticated, token, userId, role } = useAuth()
  const isStudent = String(role ?? '').toLowerCase() === 'student'

  const [loading, setLoading] = useState(false)
  const [joined, setJoined] = useState(false)

  const reload = useCallback(async () => {
    if (!isStudent || !isAuthenticated || !userId) {
      setLoading(false)
      setJoined(false)
      return
    }
    setLoading(true)
    try {
      const next = await fetchStudentJoinedTraining(token, userId)
      setJoined(Boolean(next))
    } catch {
      setJoined(false)
    } finally {
      setLoading(false)
    }
  }, [isStudent, isAuthenticated, token, userId])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    const onRefresh = () => {
      void reload()
    }
    window.addEventListener(STUDENT_TRAINING_ACCESS_EVENT, onRefresh)
    window.addEventListener(ENROLLMENT_APPLICATIONS_CHANGED_EVENT, onRefresh)
    const unsubCourse = listenCourseAccessChanges(onRefresh)
    const onVis = () => {
      if (document.visibilityState === 'visible') void reload()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener(STUDENT_TRAINING_ACCESS_EVENT, onRefresh)
      window.removeEventListener(ENROLLMENT_APPLICATIONS_CHANGED_EVENT, onRefresh)
      window.removeEventListener(COURSE_ACCESS_CHANGED_EVENT, onRefresh)
      unsubCourse()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [reload])

  return { joined, loading, reload }
}
