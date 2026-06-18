import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ENROLLMENT_APPLICATIONS_CHANGED_EVENT,
  fetchPortalNotifications,
  fetchTrainerEnrollmentApplications,
  isApplicationAwaitingTrainerReview,
  isApplicationEnrolledAwaitingForm,
} from '../api/enrollmentApplicationApi.js'
import {
  countUnreadNotifications,
  groupPendingApplicationsByCourse,
  listenPortalNotificationsChanged,
} from '../utils/portalNotifications.js'
import {
  countPendingApplicationsForTraining,
  filterApplicationsForTrainingId,
} from '../utils/trainerEnrollmentScope.js'
import { MESSAGES_CHANGED_EVENT } from '../api/messageApi.js'
import { CATALOG_ENROLLMENT_CHANGED_EVENT } from '../utils/trainingCatalogEnrollment.js'
import { TRAINER_SUBMISSIONS_CHANGED_EVENT } from '../utils/trainerTaskSubmissions.js'
import { STUDENT_COURSE_TASKS_CHANGED_EVENT } from '../utils/taskCourseContext.js'

/**
 * Trainer inbox: pending enrollment applications + portal notifications.
 * Pass trainingId to scope pending counts/lists to one catalog course.
 */
export function useTrainerEnrollmentInbox({
  token,
  trainerEmail,
  trainerId,
  role,
  enabled = true,
  trainingId = '',
}) {
  const [pendingApplications, setPendingApplications] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const reloadTimerRef = useRef(null)

  const isTrainer = ['trainer', 'admin'].includes(String(role ?? '').toLowerCase())

  const reload = useCallback(async () => {
    if (!enabled || !isTrainer || (!trainerEmail && !trainerId)) {
      setPendingApplications([])
      setNotifications([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [appsResult, notifItems] = await Promise.all([
        fetchTrainerEnrollmentApplications(token, trainerEmail, null, trainerId),
        fetchPortalNotifications(token, trainerId, trainerEmail),
      ])
      setPendingApplications(appsResult.items ?? [])
      setNotifications(Array.isArray(notifItems) ? notifItems : [])
    } catch {
      setPendingApplications([])
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [enabled, isTrainer, token, trainerEmail, trainerId])

  const scheduleReload = useCallback(() => {
    if (reloadTimerRef.current) {
      window.clearTimeout(reloadTimerRef.current)
    }
    reloadTimerRef.current = window.setTimeout(() => {
      reloadTimerRef.current = null
      void reload()
    }, 250)
  }, [reload])

  useEffect(() => {
    void reload()
    const pollId = window.setInterval(() => {
      void reload()
    }, 20000)
    return () => {
      window.clearInterval(pollId)
      if (reloadTimerRef.current) {
        window.clearTimeout(reloadTimerRef.current)
      }
    }
  }, [reload])

  useEffect(() => {
    window.addEventListener(ENROLLMENT_APPLICATIONS_CHANGED_EVENT, scheduleReload)
    window.addEventListener(MESSAGES_CHANGED_EVENT, scheduleReload)
    window.addEventListener(CATALOG_ENROLLMENT_CHANGED_EVENT, scheduleReload)
    window.addEventListener(TRAINER_SUBMISSIONS_CHANGED_EVENT, scheduleReload)
    window.addEventListener(STUDENT_COURSE_TASKS_CHANGED_EVENT, scheduleReload)
    window.addEventListener('company-portal-store-changed', scheduleReload)
    const unsub = listenPortalNotificationsChanged(scheduleReload)
    return () => {
      window.removeEventListener(ENROLLMENT_APPLICATIONS_CHANGED_EVENT, scheduleReload)
      window.removeEventListener(MESSAGES_CHANGED_EVENT, scheduleReload)
      window.removeEventListener(CATALOG_ENROLLMENT_CHANGED_EVENT, scheduleReload)
      window.removeEventListener(TRAINER_SUBMISSIONS_CHANGED_EVENT, scheduleReload)
      window.removeEventListener(STUDENT_COURSE_TASKS_CHANGED_EVENT, scheduleReload)
      window.removeEventListener('company-portal-store-changed', scheduleReload)
      unsub()
      if (reloadTimerRef.current) {
        window.clearTimeout(reloadTimerRef.current)
      }
    }
  }, [scheduleReload])

  const scopedPendingApplications = useMemo(() => {
    const awaiting = pendingApplications.filter(
      (row) => isApplicationAwaitingTrainerReview(row) || isApplicationEnrolledAwaitingForm(row),
    )
    return filterApplicationsForTrainingId(awaiting, trainingId)
  }, [pendingApplications, trainingId])

  const pendingCount = pendingApplications.filter(
    (row) => isApplicationAwaitingTrainerReview(row) || isApplicationEnrolledAwaitingForm(row),
  ).length
  const pendingByCourse = useMemo(
    () =>
      groupPendingApplicationsByCourse(
        pendingApplications.filter(
          (row) => isApplicationAwaitingTrainerReview(row) || isApplicationEnrolledAwaitingForm(row),
        ),
      ),
    [pendingApplications],
  )
  const unreadCount = useMemo(() => countUnreadNotifications(notifications), [notifications])

  return {
    loading,
    pendingApplications,
    scopedPendingApplications,
    pendingCount,
    pendingByCourse,
    notifications,
    unreadCount,
    reload,
    countPendingForTraining: (tid) => countPendingApplicationsForTraining(pendingApplications, tid),
  }
}
