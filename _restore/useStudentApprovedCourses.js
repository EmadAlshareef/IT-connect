import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/useAuth.js'
import { fetchMyEnrollmentApplications } from '../api/enrollmentApplicationApi.js'
import {
  COURSE_ACCESS_CHANGED_EVENT,
  listApprovedCatalogEnrollments,
  listenCourseAccessChanges,
} from '../utils/courseEnrollmentAccess.js'
import { STUDENT_TRAINING_ACCESS_EVENT } from '../utils/studentTrainingAccess.js'

const ACTIVE_COURSE_KEY = 'ts-student-active-course'

export function readActiveCourseSelection() {
  try {
    const raw = sessionStorage.getItem(ACTIVE_COURSE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.branchId || !parsed?.trainingId) return null
    return parsed
  } catch {
    return null
  }
}

export function setActiveCourseSelection(branchId, trainingId, trainingTitle = '') {
  try {
    sessionStorage.setItem(
      ACTIVE_COURSE_KEY,
      JSON.stringify({
        branchId: String(branchId),
        trainingId: String(trainingId),
        trainingTitle: String(trainingTitle ?? ''),
      }),
    )
    window.dispatchEvent(new CustomEvent(COURSE_ACCESS_CHANGED_EVENT))
  } catch {
    /* ignore */
  }
}

/**
 * Approved catalog enrollments + whether the student can use course workspace nav.
 */
export function useStudentApprovedCourses() {
  const { isAuthenticated, userId, role, token } = useAuth()
  const isStudent = String(role ?? '').toLowerCase() === 'student'
  const [loading, setLoading] = useState(false)
  const [approvedCourses, setApprovedCourses] = useState([])
  const [activeCourse, setActiveCourse] = useState(() => readActiveCourseSelection())

  const reload = useCallback(async () => {
    if (!isStudent || !isAuthenticated || !userId) {
      setApprovedCourses([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const appsResult = await fetchMyEnrollmentApplications(token).catch(() => ({ items: [] }))
      const approved = listApprovedCatalogEnrollments(userId, appsResult.items ?? [])
      setApprovedCourses(approved)

      const stored = readActiveCourseSelection()
      const stillValid =
        stored &&
        approved.some(
          (c) => String(c.branchId) === String(stored.branchId) && String(c.trainingId) === String(stored.trainingId),
        )
      if (stillValid) {
        setActiveCourse(stored)
      } else if (approved[0]) {
        const next = {
          branchId: approved[0].branchId,
          trainingId: approved[0].trainingId,
          trainingTitle: approved[0].trainingTitle ?? '',
        }
        setActiveCourseSelection(next.branchId, next.trainingId, next.trainingTitle)
        setActiveCourse(next)
      } else {
        setActiveCourse(null)
        try {
          sessionStorage.removeItem(ACTIVE_COURSE_KEY)
        } catch {
          /* ignore */
        }
      }
    } catch {
      setApprovedCourses(listApprovedCatalogEnrollments(userId))
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, isStudent, token, userId])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    return listenCourseAccessChanges(() => {
      void reload()
    })
  }, [reload])

  useEffect(() => {
    const onAccess = () => void reload()
    window.addEventListener(STUDENT_TRAINING_ACCESS_EVENT, onAccess)
    return () => window.removeEventListener(STUDENT_TRAINING_ACCESS_EVENT, onAccess)
  }, [reload])

  const selectCourse = useCallback((enrollment) => {
    if (!enrollment) return
    const next = {
      branchId: enrollment.branchId,
      trainingId: enrollment.trainingId,
      trainingTitle: enrollment.trainingTitle ?? '',
    }
    setActiveCourseSelection(next.branchId, next.trainingId, next.trainingTitle)
    setActiveCourse(next)
  }, [])

  const hasApprovedAccess = approvedCourses.length > 0

  return {
    loading,
    approvedCourses,
    hasApprovedAccess,
    activeCourse,
    selectCourse,
    reload,
  }
}
