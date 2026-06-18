import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { markPortalNotificationRead } from '../../../api/enrollmentApplicationApi.js'
import {
  buildTrainerDashboardUrl,
  buildTrainerEnrollmentRequestsUrl,
  buildTrainerTaskSubmissionsUrl,
} from '../../../utils/trainerDashboardNav.js'
import {
  CATALOG_ENROLLMENT_NOTIFICATION_TYPE,
  ENROLLMENT_NOTIFICATION_TYPE,
  groupNotificationsByCourse,
  STUDENT_MESSAGE_NOTIFICATION_TYPE,
  TASK_SUBMISSION_NOTIFICATION_TYPE,
} from '../../../utils/portalNotifications.js'

function formatWhen(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function resolveNotificationUrl(notification) {
  const trainingId = notification?.trainingId ?? notification?.courseId ?? ''
  const targetView = String(notification?.targetView ?? '')
  const type = String(notification?.type ?? '')

  if (type === TASK_SUBMISSION_NOTIFICATION_TYPE || targetView === 'evaluate') {
    return buildTrainerTaskSubmissionsUrl(trainingId)
  }
  if (type === STUDENT_MESSAGE_NOTIFICATION_TYPE || targetView === 'messages') {
    return buildTrainerDashboardUrl(trainingId, 'messages')
  }
  if (type === CATALOG_ENROLLMENT_NOTIFICATION_TYPE || targetView === 'enrolled-students') {
    return buildTrainerDashboardUrl(trainingId, 'enrolled-students')
  }
  if (type === ENROLLMENT_NOTIFICATION_TYPE || targetView === 'enrollment-requests') {
    return buildTrainerEnrollmentRequestsUrl(notification?.applicationId ?? '', trainingId)
  }
  return buildTrainerDashboardUrl(trainingId, targetView || 'overview')
}

function isStudentActivityNotification(notification) {
  const type = String(notification?.type ?? '')
  if (
    type === ENROLLMENT_NOTIFICATION_TYPE ||
    type === TASK_SUBMISSION_NOTIFICATION_TYPE ||
    type === CATALOG_ENROLLMENT_NOTIFICATION_TYPE ||
    type === STUDENT_MESSAGE_NOTIFICATION_TYPE
  ) {
    return true
  }
  const title = String(notification?.title ?? '').toLowerCase()
  return (
    title.includes('enrollment') ||
    title.includes('subscribed') ||
    title.includes('submitted') ||
    title.includes('applied') ||
    title.includes('message')
  )
}

function TrainerNotificationBell({
  token,
  userId,
  notifications,
  unreadCount,
  onNavigate,
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const [panelRect, setPanelRect] = useState(null)

  const activityNotifications = useMemo(
    () => (notifications ?? []).filter(isStudentActivityNotification),
    [notifications],
  )

  const groupedNotifications = useMemo(
    () => groupNotificationsByCourse(activityNotifications),
    [activityNotifications],
  )

  const badgeCount = unreadCount ?? 0

  useEffect(() => {
    if (!open) return
    const updateRect = () => {
      if (!buttonRef.current) return
      const rect = buttonRef.current.getBoundingClientRect()
      const panelWidth = Math.min(384, window.innerWidth - 16)
      let left = rect.right + 8
      if (left + panelWidth > window.innerWidth - 8) {
        left = Math.max(8, rect.left - panelWidth - 8)
      }
      const maxHeight = Math.min(420, window.innerHeight - 24)
      let top = rect.top - maxHeight + rect.height
      if (top < 8) top = 8
      if (top + maxHeight > window.innerHeight - 8) {
        top = Math.max(8, window.innerHeight - maxHeight - 8)
      }
      setPanelRect({ left, top, width: panelWidth, maxHeight })
    }
    updateRect()
    window.addEventListener('resize', updateRect)
    return () => {
      window.removeEventListener('resize', updateRect)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (event) => {
      if (rootRef.current?.contains(event.target)) return
      if (buttonRef.current?.contains(event.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const handleOpenNotification = async (notification) => {
    if (!notification?.isRead && notification?.id) {
      await markPortalNotificationRead(token, userId, notification.id)
    }
    setOpen(false)
    const url = resolveNotificationUrl(notification)
    if (onNavigate) {
      onNavigate(url, notification)
    } else {
      navigate(url)
    }
  }

  const panel =
    open && panelRect
      ? createPortal(
          <div
            ref={rootRef}
            className="fixed z-[200] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            style={{
              left: panelRect.left,
              top: panelRect.top,
              width: panelRect.width,
              maxHeight: panelRect.maxHeight,
            }}
          >
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Student activity</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Latest actions from students in your courses
                {badgeCount > 0 ? ` · ${badgeCount} unread` : ''}
              </p>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: panelRect.maxHeight - 72 }}>
              {groupedNotifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  No student activity yet.
                </p>
              ) : (
                groupedNotifications.map(({ courseTitle, items }) => (
                  <section
                    key={courseTitle}
                    className="border-b border-slate-100 last:border-b-0 dark:border-slate-800"
                  >
                    <div className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 px-4 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-300">
                        {courseTitle}
                      </p>
                    </div>
                    <ul>
                      {items.map((notification) => (
                        <li key={notification.id}>
                          <button
                            type="button"
                            onClick={() => void handleOpenNotification(notification)}
                            className={`w-full px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/80 ${
                              notification.isRead ? 'opacity-80' : 'bg-violet-50/40 dark:bg-violet-950/20'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {notification.title}
                              </p>
                              {formatWhen(notification.createdAtUtc) ? (
                                <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
                                  {formatWhen(notification.createdAtUtc)}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                              {notification.message}
                            </p>
                            {!notification.isRead ? (
                              <span className="mt-2 inline-block text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300">
                                New
                              </span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-violet-200 hover:bg-violet-50/80 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        aria-label={badgeCount ? `${badgeCount} unread notifications` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" aria-hidden />
        {badgeCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        ) : null}
      </button>
      {panel}
    </>
  )
}

export default TrainerNotificationBell
