export const PORTAL_NOTIFICATIONS_CHANGED_EVENT = 'ts-portal-notifications-changed'

export const ENROLLMENT_NOTIFICATION_TYPE = 'enrollment_request'
export const TASK_SUBMISSION_NOTIFICATION_TYPE = 'task_submission'
export const CATALOG_ENROLLMENT_NOTIFICATION_TYPE = 'catalog_enrollment'
export const STUDENT_MESSAGE_NOTIFICATION_TYPE = 'student_message'

export function groupNotificationsByCourse(notifications) {
  const groups = new Map()
  for (const row of notifications ?? []) {
    const courseTitle = String(row?.courseTitle ?? '').trim() || 'General'
    if (!groups.has(courseTitle)) groups.set(courseTitle, [])
    groups.get(courseTitle).push(row)
  }
  return [...groups.entries()].map(([courseTitle, items]) => ({
    courseTitle,
    items: items.sort(
      (a, b) => new Date(b.createdAtUtc ?? 0).getTime() - new Date(a.createdAtUtc ?? 0).getTime(),
    ),
  }))
}

export function dispatchPortalNotificationsChanged() {
  window.dispatchEvent(new CustomEvent(PORTAL_NOTIFICATIONS_CHANGED_EVENT))
}

export function listenPortalNotificationsChanged(handler) {
  window.addEventListener(PORTAL_NOTIFICATIONS_CHANGED_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(PORTAL_NOTIFICATIONS_CHANGED_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

export function countUnreadNotifications(items) {
  if (!Array.isArray(items)) return 0
  return items.filter((row) => !row?.isRead).length
}

function isReadyForTrainerReview(row) {
  if (String(row?.status ?? '').toLowerCase() !== 'pending') return false
  if (row?.applicationComplete === false) return false
  return Boolean(String(row?.motivationReason ?? '').trim())
}

export function groupPendingApplicationsByCourse(applications) {
  const map = new Map()
  for (const row of applications ?? []) {
    if (!isReadyForTrainerReview(row)) continue
    const key = `${row.branchId}::${row.courseId}`
    const existing = map.get(key)
    if (existing) {
      existing.count += 1
    } else {
      map.set(key, {
        branchId: row.branchId,
        courseId: row.courseId,
        courseTitle: row.courseTitle || 'Training program',
        count: 1,
        latestApplicationId: row.id,
      })
    }
  }
  return Array.from(map.values())
}
