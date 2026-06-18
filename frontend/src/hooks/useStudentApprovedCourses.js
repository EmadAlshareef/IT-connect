import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { fetchMyEnrollmentApplications } from '../api/enrollmentApplicationApi.js'
import {
  COURSE_ACCESS_CHANGED_EVENT,
  getCourseAccessState,
  listApprovedCatalogEnrollments,
  listenCourseAccessChanges,
  shouldShowCourseWorkspaceNav,
} from '../utils/courseEnrollmentAccess.js'
import { hasStudentCourseRecord } from '../utils/courseEnrollmentAccess.js'
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

export function setActiveCourseSelection(branchId, trainingId, trainingTitle = '', { notify = true } = {}) {
  const next = {
    branchId: String(branchId),
    trainingId: String(trainingId),
    trainingTitle: String(trainingTitle ?? ''),
  }
  const stored = readActiveCourseSelection()
  if (
    stored &&
    String(stored.branchId) === next.branchId &&
    String(stored.trainingId) === next.trainingId &&
    String(stored.trainingTitle ?? '') === next.trainingTitle
  ) {
    return
  }
  try {
    sessionStorage.setItem(ACTIVE_COURSE_KEY, JSON.stringify(next))
    if (notify) {
      window.dispatchEvent(new CustomEvent(COURSE_ACCESS_CHANGED_EVENT))
    }
  } catch {
    /* ignore */
  }
}

/**
 * Approved catalog enrollments + whether the student can use course workspace nav.
 */
export function useStudentApprovedCourses({ enabled = true } = {}) {
  const { isAuthenticated, userId, role, token } = useAuth()
  const isStudent = String(role ?? '').toLowerCase() === 'student'
  const active = enabled && isStudent && isAuthenticated && Boolean(userId)
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [approvedCourses, setApprovedCourses] = useState([])
  const [activeCourse, setActiveCourse] = useState(() => readActiveCourseSelection())
  const initialLoadDoneRef = useRef(false)
  const reloadInFlightRef = useRef(false)

  const reload = useCallback(async ({ silent = false } = {}) => {
    if (reloadInFlightRef.current) return
    reloadInFlightRef.current = true
    if (!active) {
      setApprovedCourses([])
      setActiveCourse(null)
      setLoading(false)
      initialLoadDoneRef.current = false
      reloadInFlightRef.current = false
      return
    }
    const showLoading = !silent && !initialLoadDoneRef.current
    if (showLoading) setLoading(true)
    try {
      const appsResult = await fetchMyEnrollmentApplications(token, userId).catch(() => ({ items: [] }))
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
        setActiveCourseSelection(next.branchId, next.trainingId, next.trainingTitle, { notify: false })
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
      reloadInFlightRef.current = false
      initialLoadDoneRef.current = true
      if (showLoading) setLoading(false)
    }
  }, [active, token, userId])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    return listenCourseAccessChanges(() => {
      void reload({ silent: true })
    })
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

  const showCourseWorkspaceNav =
    active && shouldShowCourseWorkspaceNav(userId, activeCourse)

  useEffect(() => {
    if (!active || !userId) return
    const params = new URLSearchParams(location.search)
    const branchId = String(params.get('branchId') ?? '').trim()
    const courseId = String(params.get('courseId') ?? '').trim()
    if (!branchId || !courseId) return
    if (!hasStudentCourseRecord(userId, branchId, courseId)) return
    const { onboarding } = getCourseAccessState(userId, branchId, courseId)
    if (onboarding !== 'approved') return
    const title = String(params.get('title') ?? '').trim()
    const enrollment = approvedCourses.find(
      (c) => String(c.branchId) === branchId && String(c.trainingId) === courseId,
    )
    const trainingTitle = title || enrollment?.trainingTitle || ''
    setActiveCourseSelection(branchId, courseId, trainingTitle, { notify: false })
    setActiveCourse((prev) => {
      if (
        prev &&
        String(prev.branchId) === branchId &&
        String(prev.trainingId) === courseId &&
        String(prev.trainingTitle ?? '') === trainingTitle
      ) {
        return prev
      }
      return { branchId, trainingId: courseId, trainingTitle }
    })
  }, [active, approvedCourses, location.search, userId])

  return {
    loading,
    approvedCourses,
    hasApprovedAccess,
    activeCourse,
    showCourseWorkspaceNav,
    selectCourse,
    reload,
  }
}
