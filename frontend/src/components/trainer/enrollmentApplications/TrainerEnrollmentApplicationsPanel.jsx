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
  saveLocalApplication,
  isApplicationAwaitingTrainerReview,
  isApplicationEnrolledAwaitingForm,
  isApplicationFormComplete,
  markEnrollmentApplicationNotificationsRead,
  rejectEnrollmentApplication,
} from '../../../api/enrollmentApplicationApi.js'
import { CATALOG_ENROLLMENT_CHANGED_EVENT } from '../../../utils/trainingCatalogEnrollment.js'
import { syncEnrollmentOnboardingFromApplication } from '../../../utils/courseEnrollmentAccess.js'
import { invalidateStudentTrainingAccess } from '../../../utils/studentTrainingAccess.js'
import { filterApplicationsForTrainingId } from '../../../utils/trainerEnrollmentScope.js'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
]

function TrainerEnrollmentApplicationsPanel({
  token,
  trainerEmail,
  trainerId,
  role,
  trainingId = '',
  trainingTitle = '',
  initialApplicationId = '',
}) {
  const [filter, setFilter] = useState('all')
  const [showAllTrainings, setShowAllTrainings] = useState(true)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [actionError, setActionError] = useState('')
  const [actingId, setActingId] = useState('')
  const acting = Boolean(actingId)

  const normalizedRole = String(role ?? '').toLowerCase()
  const authorized = normalizedRole === 'trainer' || normalizedRole === 'admin'

  const [allItems, setAllItems] = useState([])

  const load = useCallback(async () => {
    if (!authorized || (!trainerEmail && !trainerId)) {
      setAllItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const result = await fetchTrainerEnrollmentApplications(token, trainerEmail, null, trainerId)
      setAllItems(result.items ?? [])
    } catch {
      setAllItems([])
    } finally {
      setLoading(false)
    }
  }, [authorized, token, trainerEmail, trainerId])

  const items = useMemo(() => {
    if (!trainingId || showAllTrainings) return allItems
    return filterApplicationsForTrainingId(allItems, trainingId)
  }, [allItems, trainingId, showAllTrainings])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onChange = () => void load()
    window.addEventListener(ENROLLMENT_APPLICATIONS_CHANGED_EVENT, onChange)
    window.addEventListener(CATALOG_ENROLLMENT_CHANGED_EVENT, onChange)
    return () => {
      window.removeEventListener(ENROLLMENT_APPLICATIONS_CHANGED_EVENT, onChange)
      window.removeEventListener(CATALOG_ENROLLMENT_CHANGED_EVENT, onChange)
    }
  }, [load])

  const filtered = useMemo(() => {
    if (filter === 'all') return items
    if (filter === 'pending') return items.filter(isApplicationAwaitingTrainerReview)
    return items.filter((row) => String(row.status).toLowerCase() === filter)
  }, [filter, items])

  const awaitingForm = useMemo(
    () => (filter === 'pending' ? items.filter(isApplicationEnrolledAwaitingForm) : []),
    [filter, items],
  )

  const otherTrainingsPendingCount = useMemo(() => {
    if (showAllTrainings || !trainingId) return 0
    const totalPending = allItems.filter(isApplicationAwaitingTrainerReview).length
    const scopedPending = filterApplicationsForTrainingId(allItems, trainingId).filter(
      isApplicationAwaitingTrainerReview,
    ).length
    return Math.max(0, totalPending - scopedPending)
  }, [allItems, showAllTrainings, trainingId])

  const selected = useMemo(
    () => filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  )

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId('')
      return
    }
    if (initialApplicationId && filtered.some((row) => row.id === initialApplicationId)) {
      setSelectedId(initialApplicationId)
      return
    }
    if (!selectedId || !filtered.some((row) => row.id === selectedId)) {
      setSelectedId(filtered[0].id)
    }
  }, [filtered, initialApplicationId, selectedId])

  useEffect(() => {
    if (!selected?.id || !trainerId) return
    void markEnrollmentApplicationNotificationsRead(token, trainerId, selected.id)
  }, [selected?.id, token, trainerId])

  const handleApproveRow = async (row) => {
    if (!row?.id) return
    setActingId(row.id)
    setActionError('')
    try {
      saveLocalApplication(row)
      const updated = await approveEnrollmentApplication(token, row.id)
      syncEnrollmentOnboardingFromApplication(updated.userId, updated.branchId, updated.courseId, updated)
      invalidateStudentTrainingAccess()
      await load()
    } catch {
      setActionError('Could not approve student.')
    } finally {
      setActingId('')
    }
  }

  const handleApprove = () => {
    if (!selected) return
    void handleApproveRow(selected)
  }

  const handleReject = async () => {
    if (!selected) return
    setActingId(selected.id)
    setActionError('')
    try {
      const updated = await rejectEnrollmentApplication(token, selected.id, rejectReason)
      syncEnrollmentOnboardingFromApplication(updated.userId, updated.branchId, updated.courseId, updated)
      setRejectReason('')
      await load()
    } catch {
      setActionError('Could not reject application.')
    } finally {
      setActingId('')
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
          Accept new students
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {trainingTitle && !showAllTrainings ? `${trainingTitle} — onboarding` : 'Course onboarding'}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          {trainingTitle && !showAllTrainings
            ? `Students enrolled in ${trainingTitle} appear here after they submit their application form. Approve to grant workspace access, or reject with an optional message.`
            : 'Students who submit their enrollment application appear here across all trainings you instruct. Approve to grant workspace access, or reject with an optional message.'}
        </p>
      </div>

      {trainingId ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowAllTrainings(false)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              !showAllTrainings
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            This training only
          </button>
          <button
            type="button"
            onClick={() => setShowAllTrainings(true)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              showAllTrainings
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            All my trainings
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setFilter(chip.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === chip.id
                ? 'bg-violet-600 text-white'
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
      ) : filtered.length === 0 && awaitingForm.length === 0 ? (
        <div className="space-y-3">
          {otherTrainingsPendingCount > 0 ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              You have {otherTrainingsPendingCount} pending application
              {otherTrainingsPendingCount === 1 ? '' : 's'} for other trainings. Switch to{' '}
              <button
                type="button"
                onClick={() => setShowAllTrainings(true)}
                className="font-semibold text-violet-700 underline underline-offset-2 hover:text-violet-600 dark:text-violet-300"
              >
                All my trainings
              </button>{' '}
              to review them.
            </p>
          ) : null}
          <p className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-600">
            {trainingTitle && !showAllTrainings
              ? `No enrollment applications for ${trainingTitle} in this filter.`
              : 'No enrollment applications in this filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {awaitingForm.length > 0 ? (
            <div className="rounded-2xl border border-sky-200 bg-sky-50/80 px-4 py-4 dark:border-sky-900/50 dark:bg-sky-950/30">
              <p className="text-sm font-semibold text-sky-950 dark:text-sky-100">
                Enrolled — awaiting application form ({awaitingForm.length})
              </p>
              <p className="mt-1 text-sm text-sky-900/90 dark:text-sky-200/90">
                These students joined the class but have not submitted the onboarding form yet. You can accept them now
                or wait until they complete the form.
              </p>
              {actionError ? (
                <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">{actionError}</p>
              ) : null}
              <ul className="mt-3 space-y-2">
                {awaitingForm.map((row) => {
                  const rowActing = actingId === row.id
                  return (
                    <li
                      key={row.id}
                      className="flex flex-col gap-3 rounded-xl border border-sky-200 bg-white px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-sky-900/40 dark:bg-slate-900"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{row.userName}</p>
                        <p className="text-xs text-slate-500">{row.userEmail}</p>
                        {!showAllTrainings ? null : (
                          <p className="mt-1 text-xs font-medium text-violet-700 dark:text-violet-300">
                            {row.courseTitle}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={acting}
                        onClick={() => void handleApproveRow(row)}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                      >
                        {rowActing ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" aria-hidden />
                        )}
                        Accept
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          {filtered.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 px-6 py-8 text-center text-sm text-slate-500 dark:border-slate-600">
              No submitted applications ready for review in this filter yet.
            </p>
          ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <ul className="max-h-[min(70vh,560px)] space-y-2 overflow-y-auto">
            {filtered.map((row) => {
              const active = row.id === selected?.id
              const formComplete = isApplicationFormComplete(row)
              const tone =
                row.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                  : row.status === 'rejected'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200'
                    : formComplete
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200'
                      : 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200'
              const statusLabel = formComplete ? row.status : 'awaiting form'
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      active
                        ? 'border-violet-400 bg-violet-50 dark:border-violet-600 dark:bg-violet-950/40'
                        : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.userName}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${tone}`}>
                        {statusLabel}
                      </span>
                    </div>
                    {showAllTrainings || !trainingTitle ? (
                      <p className="mt-1 text-xs text-slate-500">{row.courseTitle}</p>
                    ) : null}
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
                  <p className="mt-2 text-sm font-medium text-violet-700 dark:text-violet-300">{selected.courseTitle}</p>
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
                  {selected.motivationReason?.trim()
                    ? selected.motivationReason
                    : 'Student enrolled but has not submitted the onboarding application form yet.'}
                </p>
              </div>

              {isApplicationFormComplete(selected) ? (
                <>
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
                          className="inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:underline dark:text-violet-400"
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
                </>
              ) : (
                <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-200">
                  This student joined the class but still needs to complete the application form before you can approve or
                  reject.
                </p>
              )}
            </article>
          ) : null}
        </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TrainerEnrollmentApplicationsPanel
