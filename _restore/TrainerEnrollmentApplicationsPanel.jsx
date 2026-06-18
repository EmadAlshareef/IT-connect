import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  User,
  XCircle,
} from 'lucide-react'
import {
  ENROLLMENT_APPLICATIONS_CHANGED_EVENT,
  approveEnrollmentApplication,
  fetchTrainerEnrollmentApplications,
  rejectEnrollmentApplication,
} from '../../../api/enrollmentApplicationApi.js'
import { syncEnrollmentOnboardingFromApplication } from '../../../utils/courseEnrollmentAccess.js'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
]

function TrainerEnrollmentApplicationsPanel({ token, trainerEmail, role }) {
  const [filter, setFilter] = useState('pending')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [actionError, setActionError] = useState('')
  const [acting, setActing] = useState(false)

  const normalizedRole = String(role ?? '').toLowerCase()
  const authorized = normalizedRole === 'trainer' || normalizedRole === 'admin'

  const load = useCallback(async () => {
    if (!authorized || !trainerEmail) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const status = filter === 'all' ? null : filter
      const result = await fetchTrainerEnrollmentApplications(token, trainerEmail, status)
      setItems(result.items ?? [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [authorized, filter, token, trainerEmail])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onChange = () => void load()
    window.addEventListener(ENROLLMENT_APPLICATIONS_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(ENROLLMENT_APPLICATIONS_CHANGED_EVENT, onChange)
  }, [load])

  const filtered = useMemo(() => {
    if (filter === 'all') return items
    return items.filter((row) => String(row.status).toLowerCase() === filter)
  }, [filter, items])

  const selected = useMemo(
    () => filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  )

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId('')
      return
    }
    if (!selectedId || !filtered.some((row) => row.id === selectedId)) {
      setSelectedId(filtered[0].id)
    }
  }, [filtered, selectedId])

  const handleApprove = async () => {
    if (!selected) return
    setActing(true)
    setActionError('')
    try {
      const updated = await approveEnrollmentApplication(token, selected.id)
      syncEnrollmentOnboardingFromApplication(updated.userId, updated.branchId, updated.courseId, updated)
      await load()
    } catch {
      setActionError('Could not approve application.')
    } finally {
      setActing(false)
    }
  }

  const handleReject = async () => {
    if (!selected) return
    setActing(true)
    setActionError('')
    try {
      const updated = await rejectEnrollmentApplication(token, selected.id, rejectReason)
      syncEnrollmentOnboardingFromApplication(updated.userId, updated.branchId, updated.courseId, updated)
      setRejectReason('')
      await load()
    } catch {
      setActionError('Could not reject application.')
    } finally {
      setActing(false)
    }
  }

  if (!authorized) {
    return (
      <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
        Only instructors can review enrollment applications.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Enrollment requests
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Course onboarding</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          Students who enroll in your courses must complete this application. Approve to grant workspace access, or reject
          with an optional message.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setFilter(chip.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === chip.id
                ? 'bg-indigo-600 text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading requests…
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-600">
          No enrollment applications in this filter.
        </p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <ul className="max-h-[min(70vh,560px)] space-y-2 overflow-y-auto">
            {filtered.map((row) => {
              const active = row.id === selected?.id
              const tone =
                row.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                  : row.status === 'rejected'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200'
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      active
                        ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950/40'
                        : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.userName}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${tone}`}>
                        {row.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{row.courseTitle}</p>
                  </button>
                </li>
              )
            })}
          </ul>

          {selected ? (
            <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                    <User className="h-5 w-5" aria-hidden />
                    {selected.userName}
                  </h3>
                  <p className="text-sm text-slate-500">{selected.userEmail}</p>
                  <p className="mt-2 text-sm font-medium text-indigo-700 dark:text-indigo-300">{selected.courseTitle}</p>
                </div>
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50">
                  <p className="text-xs font-semibold uppercase text-slate-500">University</p>
                  <p className="mt-1 text-slate-800 dark:text-slate-200">{selected.universityName}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50">
                  <p className="text-xs font-semibold uppercase text-slate-500">Major / GPA</p>
                  <p className="mt-1 text-slate-800 dark:text-slate-200">
                    {selected.major} · {selected.gpa}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Motivation</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                  {selected.motivationReason}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Background</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                  {selected.previousStudies}
                </p>
              </div>

              {selected.cvFileName ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                    <FileText className="h-4 w-4" aria-hidden />
                    {selected.cvFileName}
                  </span>
                  {selected.cvFileUrl && !String(selected.cvFileUrl).startsWith('local://') ? (
                    <a
                      href={selected.cvFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden />
                      View CV
                    </a>
                  ) : null}
                </div>
              ) : null}

              {selected.status === 'pending' ? (
                <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Rejection message (optional)
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                    placeholder="Optional reason if you reject this request"
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                  />
                  {actionError ? <p className="text-xs text-rose-600 dark:text-rose-300">{actionError}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={acting}
                      onClick={handleApprove}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={acting}
                      onClick={handleReject}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
                    >
                      <XCircle className="h-4 w-4" aria-hidden />
                      Reject
                    </button>
                  </div>
                </div>
              ) : selected.status === 'rejected' && selected.rejectionReason ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
                  {selected.rejectionReason}
                </p>
              ) : null}
            </article>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default TrainerEnrollmentApplicationsPanel
