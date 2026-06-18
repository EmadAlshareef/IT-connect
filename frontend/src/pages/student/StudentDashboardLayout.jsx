import { useCallback, useMemo, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Bell, X } from 'lucide-react'
import { useAuth } from '../../context/useAuth.js'
import StudentCourseAccessGate from '../../components/student/StudentCourseAccessGate.jsx'

function ToastStack({ items, onDismiss }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
      {items.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg ${
            toast.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/60 dark:text-emerald-100'
              : toast.tone === 'danger'
                ? 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/60 dark:text-rose-100'
                : 'border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
          }`}
        >
          <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/70 dark:bg-slate-800">
            <Bell className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{toast.title}</p>
            <p className="mt-0.5 text-xs opacity-90">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="rounded-lg p-1 text-slate-500 transition hover:bg-black/5 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-slate-100"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

function StudentDashboardLayout() {
  const { role, trainerName, email, token, userId } = useAuth()
  const location = useLocation()
  const [toasts, setToasts] = useState([])

  const notify = useCallback((payload) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts((prev) => [...prev, { id, tone: 'info', ...payload }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5200)
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const outletContext = useMemo(
    () => ({
      notify,
      token,
      userId,
      trainerName,
      email,
    }),
    [email, notify, token, trainerName, userId],
  )

  if ((role ?? '').toLowerCase() === 'admin') {
    return <Navigate to="/admin" replace />
  }

  if (String(role ?? '').toLowerCase() !== 'student') {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-dvh bg-[#FFF9F2] font-display text-slate-900 dark:from-slate-950 dark:to-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-10">
        <div className="mb-6 rounded-2xl border border-violet-100 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/50 lg:hidden">
          <p className="text-xs font-extrabold uppercase tracking-wider text-violet-600/80 dark:text-violet-400/90">Trainee workspace</p>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">Welcome back, {trainerName}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-500">{email}</p>
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
            Open the menu (top-left) to switch pages. On larger screens, trainee navigation is in the left sidebar.
          </p>
        </div>

        <StudentCourseAccessGate>
          <Outlet context={outletContext} key={`${location.pathname}${location.search}`} />
        </StudentCourseAccessGate>
      </div>

      <ToastStack items={toasts} onDismiss={dismissToast} />
    </div>
  )
}

export default StudentDashboardLayout
