import { useCallback, useEffect, useMemo, useState } from 'react'
import { Calendar, ClipboardList, ExternalLink, FileText, User } from 'lucide-react'
import { resolveCatalogCourseForTrainingId } from '../../../utils/catalogCourseContext.js'
import {
  bootstrapTrainerSubmissions,
  canReviewTaskSubmissions,
  listTrainerTaskSubmissions,
  saveTrainerSubmissionReview,
  TRAINER_SUBMISSIONS_CHANGED_EVENT,
  TRAINER_SUBMISSIONS_ROSTER_CHANGED_EVENT,
} from '../../../utils/trainerTaskSubmissions.js'
import SubmissionReviewForm from './SubmissionReviewForm.jsx'

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending review' },
  { id: 'evaluated', label: 'Graded' },
]

function statusTone(status) {
  const s = String(status ?? '').toLowerCase()
  if (s.includes('evaluated') || s.includes('complete')) {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
  }
  if (s.includes('pending')) {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
  }
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
}

function formatWhen(iso) {
  if (!iso) return 'Not recorded'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

/**
 * In-dashboard task submissions hub for trainers/admins (no route navigation).
 */
function TrainerTaskSubmissionsPanel({
  role,
  trainingId,
  trainingTitle,
  sessionSummaries,
  evaluationRows,
  trainerName = 'Your instructor',
  onReviewSaved,
}) {
  const [filter, setFilter] = useState('all')
  const [selectedKey, setSelectedKey] = useState('')
  const [grade, setGrade] = useState('A')
  const [feedback, setFeedback] = useState('')
  const [notice, setNotice] = useState({ type: '', message: '' })
  const [saving, setSaving] = useState(false)
  const [tick, setTick] = useState(0)

  const authorized = canReviewTaskSubmissions(role)

  const submissions = useMemo(
    () =>
      listTrainerTaskSubmissions({
        trainingId,
        sessionSummaries,
        evaluationRows,
      }),
    [trainingId, sessionSummaries, evaluationRows, tick],
  )

  const filtered = useMemo(() => {
    if (filter === 'pending') {
      return submissions.filter((row) => {
        const s = String(row.status).toLowerCase()
        return s.includes('pending') && !s.includes('evaluated')
      })
    }
    if (filter === 'evaluated') {
      return submissions.filter((row) => String(row.status).toLowerCase().includes('evaluated'))
    }
    return submissions
  }, [submissions, filter])

  const selected = useMemo(
    () => filtered.find((row) => row.key === selectedKey) ?? submissions.find((row) => row.key === selectedKey) ?? null,
    [filtered, submissions, selectedKey],
  )

  useEffect(() => {
    const course = resolveCatalogCourseForTrainingId(trainingId)
    void bootstrapTrainerSubmissions({
      branchId: course?.branchId,
      courseId: course?.courseId,
    }).then(() => setTick((n) => n + 1))
  }, [trainingId])

  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    window.addEventListener(TRAINER_SUBMISSIONS_CHANGED_EVENT, bump)
    window.addEventListener(TRAINER_SUBMISSIONS_ROSTER_CHANGED_EVENT, bump)
    window.addEventListener('storage', bump)
    return () => {
      window.removeEventListener(TRAINER_SUBMISSIONS_CHANGED_EVENT, bump)
      window.removeEventListener(TRAINER_SUBMISSIONS_ROSTER_CHANGED_EVENT, bump)
      window.removeEventListener('storage', bump)
    }
  }, [])

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedKey('')
      return
    }
    if (selectedKey && !filtered.some((row) => row.key === selectedKey)) {
      setSelectedKey('')
    }
  }, [filtered, selectedKey])

  useEffect(() => {
    if (!selected) return
    setGrade(selected.grade ?? 'A')
    setFeedback(selected.evaluationFeedback ?? '')
    setNotice({ type: '', message: '' })
  }, [selected?.key])

  const handleSelect = useCallback((row) => {
    setSelectedKey((current) => {
      if (current === row.key) return ''
      return row.key
    })
    setGrade(row.grade ?? 'A')
    setFeedback(row.evaluationFeedback ?? '')
    setNotice({ type: '', message: '' })
  }, [])

  const handleSaveReview = useCallback(
    async (event) => {
      event.preventDefault()
      if (!selected || !authorized) return
      setSaving(true)
      const result = await saveTrainerSubmissionReview({
        submissionId: selected.submissionId,
        traineeId: selected.traineeId,
        taskTitle: selected.taskTitle,
        taskId: selected.taskId,
        grade,
        feedback,
        portalUserId: selected.portalUserId,
        trainerName,
      })
      setSaving(false)
      setNotice({
        type: result.ok ? 'success' : 'error',
        message: result.message,
      })
      if (result.ok) {
        setTick((n) => n + 1)
        onReviewSaved?.()
      }
    },
    [authorized, feedback, grade, onReviewSaved, selected, trainerName],
  )

  if (!authorized) {
    return (
      <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
        Only instructors and administrators can review task submissions.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Task submissions
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Student solutions</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          {trainingTitle
            ? `Only work submitted by approved students in ${trainingTitle} appears here (files, links, or answers from the student portal).`
            : 'Select a training program to review submissions from approved students in that course.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((chip) => (
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
            <span className="ml-1 opacity-80">
              (
              {chip.id === 'all'
                ? submissions.length
                : chip.id === 'pending'
                  ? submissions.filter((r) => String(r.status).includes('Pending')).length
                  : submissions.filter((r) => String(r.status).includes('Evaluated')).length}
              )
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-400">
          {trainingId
            ? 'No student submissions yet for this course. Approved trainees appear here after they submit a task from their student dashboard.'
            : 'Select a training from the sidebar to view submitted work for that course.'}
        </p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <ul className="max-h-[min(70vh,640px)] space-y-2 overflow-y-auto pr-1" aria-label="Submission list">
            {filtered.map((row) => {
              const isActive = row.key === selectedKey
              return (
                <li key={row.key}>
                  <button
                    type="button"
                    onClick={() => handleSelect(row)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-violet-400 bg-violet-50 dark:border-violet-600 dark:bg-violet-950/40'
                        : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.taskTitle}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone(row.status)}`}>
                        {row.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{row.traineeName}</p>
                    <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-500">{formatWhen(row.submittedAt)}</p>
                  </button>
                </li>
              )
            })}
          </ul>

          {selected ? (
            <div className="space-y-5" role="region" aria-label="Submission review">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{selected.taskTitle}</h3>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-4 w-4" aria-hidden />
                        {selected.traineeName}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" aria-hidden />
                        Submitted {formatWhen(selected.submittedAt)}
                      </span>
                    </div>
                  </div>
                  {selected.grade ? (
                    <span className="rounded-xl bg-violet-100 px-3 py-1 text-lg font-bold text-violet-800 dark:bg-violet-950/60 dark:text-violet-200">
                      {selected.grade}
                    </span>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-950/50">
                    <p className="font-semibold uppercase tracking-wide text-slate-500">Deadline</p>
                    <p className="mt-1 text-sm text-slate-800 dark:text-slate-200">{selected.deadline || '—'}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-950/50">
                    <p className="font-semibold uppercase tracking-wide text-slate-500">Project tag</p>
                    <p className="mt-1 text-sm text-slate-800 dark:text-slate-200">{selected.tag || '—'}</p>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    <ClipboardList className="h-4 w-4" aria-hidden />
                    Student answer
                  </p>
                  <p className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
                    {selected.answer?.trim() ? selected.answer : 'No written answer provided.'}
                  </p>
                </div>

                {(selected.fileName || selected.submissionLink) && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Attachments</p>
                    {selected.fileName ? (
                      <p className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                        <FileText className="h-4 w-4 text-slate-500" aria-hidden />
                        {selected.fileName}
                      </p>
                    ) : null}
                    {selected.submissionLink ? (
                      <a
                        href={selected.submissionLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:underline dark:text-violet-400"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden />
                        Open submission link
                      </a>
                    ) : null}
                  </div>
                )}
              </article>

              <SubmissionReviewForm
                grade={grade}
                feedback={feedback}
                onGradeChange={setGrade}
                onFeedbackChange={setFeedback}
                onSubmit={handleSaveReview}
                disabled={!selected}
                saving={saving}
                notice={notice}
              />
            </div>
          ) : (
            <div
              className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center dark:border-slate-600 dark:bg-slate-950/40"
              role="status"
            >
              <ClipboardList className="h-10 w-10 text-slate-400 dark:text-slate-500" aria-hidden />
              <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Select a submission</p>
              <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                Click a task in the list to open the student&apos;s answer, attachments, and grading form. Click again to
                collapse.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TrainerTaskSubmissionsPanel
