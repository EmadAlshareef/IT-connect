import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Loader2, Mail, User, UserMinus, Users } from 'lucide-react'
import { fetchTrainerEnrollmentApplications } from '../../../api/enrollmentApplicationApi.js'
import { badgeToneClasses } from '../../../utils/courseEnrollmentAccess.js'
import {
  canViewEnrolledStudents,
  listTrainerEnrolledStudents,
  removeTrainerEnrolledStudent,
  summarizeTrainerEnrolledStudents,
  TRAINER_ENROLLED_ROSTER_CHANGED_EVENT,
  TRAINER_ENROLLED_STUDENTS_CHANGED_EVENT,
} from '../../../utils/trainerEnrolledStudents.js'
import { filterApplicationsForTrainingId } from '../../../utils/trainerEnrollmentScope.js'

function formatWhen(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return '—'
  }
}

function statusBadge(status) {
  switch (String(status ?? '').toLowerCase()) {
    case 'approved':
      return { label: 'Approved', tone: 'approved' }
    case 'rejected':
      return { label: 'Not approved', tone: 'rejected' }
    case 'pending':
      return { label: 'Pending review', tone: 'pending' }
    default:
      return { label: 'Subscribed', tone: 'none' }
  }
}

function applicationToRosterStudent(application) {
  const status = String(application.status ?? '').toLowerCase()
  const badge = statusBadge(status)
  return {
    id: application.userId || application.id,
    name: application.userName || 'Student',
    email: application.userEmail || '',
    enrolledAt: application.createdAtUtc,
    courseTitle: application.courseTitle || '',
    branchId: application.branchId,
    courseId: application.courseId,
    progress: null,
    onboarding: status,
    statusLabel: badge.label,
    statusTone: badge.tone,
  }
}

function TrainerEnrolledStudentsPanel({ role, token, trainerId, trainerEmail, trainingId, trainingTitle }) {
  const [tick, setTick] = useState(0)
  const [apiStudents, setApiStudents] = useState(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState('')
  const [removingId, setRemovingId] = useState('')
  const [actionError, setActionError] = useState('')
  const authorized = canViewEnrolledStudents(role)

  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    window.addEventListener(TRAINER_ENROLLED_STUDENTS_CHANGED_EVENT, bump)
    window.addEventListener(TRAINER_ENROLLED_ROSTER_CHANGED_EVENT, bump)
    return () => {
      window.removeEventListener(TRAINER_ENROLLED_STUDENTS_CHANGED_EVENT, bump)
      window.removeEventListener(TRAINER_ENROLLED_ROSTER_CHANGED_EVENT, bump)
    }
  }, [])

  const localStudents = useMemo(
    () =>
      listTrainerEnrolledStudents({
        trainingId,
      }),
    [trainingId, tick],
  )

  useEffect(() => {
    if (!authorized || (!trainerEmail && !trainerId)) {
      setApiStudents(null)
      return
    }

    let cancelled = false
    fetchTrainerEnrollmentApplications(token, trainerEmail, null, trainerId)
      .then((result) => {
        if (cancelled) return
        const rows = filterApplicationsForTrainingId(result.items ?? [], trainingId)
          .filter((row) => String(row.status ?? '').toLowerCase() !== 'rejected')
          .map(applicationToRosterStudent)
        setApiStudents(rows)
      })
      .catch(() => {
        if (!cancelled) setApiStudents(null)
      })

    return () => {
      cancelled = true
    }
  }, [authorized, token, trainerEmail, trainerId, trainingId, tick])

  const students = apiStudents ?? localStudents

  const stats = useMemo(() => summarizeTrainerEnrolledStudents(students), [students])

  const handleRemove = async (student) => {
    setActionError('')
    setRemovingId(student.id)
    try {
      const result = removeTrainerEnrolledStudent({
        userId: student.id,
        trainingId,
        reason: `Removed from ${trainingTitle || 'course'} by instructor.`,
      })
      if (!result.success) {
        setActionError(result.message || 'Unable to remove student.')
        return
      }
      setConfirmRemoveId('')
      setTick((n) => n + 1)
    } finally {
      setRemovingId('')
    }
  }

  if (!authorized) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        You do not have permission to view enrolled students.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Course roster
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Enrolled students</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Students who subscribed to{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {trainingTitle || 'this training'}
            </span>{' '}
            through the site with a registered account.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-900/50 dark:bg-violet-950/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
            Total students
          </p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-violet-950 dark:text-violet-100">
            <Users className="h-5 w-5" aria-hidden />
            {stats.total}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            Approved
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-950 dark:text-emerald-100">{stats.approved}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Pending review
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-950 dark:text-amber-100">{stats.pending}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
            Subscribed only
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.subscribed}</p>
        </div>
      </div>

      {actionError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
          {actionError}
        </p>
      ) : null}

      {students.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-400">
          No students have subscribed to this course yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {students.map((student) => {
            const isConfirming = confirmRemoveId === student.id
            const isRemoving = removingId === student.id
            return (
              <li
                key={student.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40 sm:flex sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">
                    <User className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{student.name}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeToneClasses(student.statusTone)}`}
                      >
                        {student.statusLabel}
                      </span>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-500 dark:text-slate-400">
                      <Mail className="h-3 w-3 shrink-0" aria-hidden />
                      {student.email || 'No email on file'}
                    </p>
                    {student.courseTitle ? (
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <BookOpen className="h-3 w-3 shrink-0" aria-hidden />
                        {student.courseTitle}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 flex shrink-0 flex-col items-stretch gap-3 sm:mt-0 sm:items-end">
                  <dl className="grid shrink-0 grid-cols-2 gap-3 text-xs sm:text-right">
                    <div>
                      <dt className="text-slate-500 dark:text-slate-400">Subscribed</dt>
                      <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">
                        {formatWhen(student.enrolledAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 dark:text-slate-400">Progress</dt>
                      <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">
                        {student.progress != null ? `${student.progress}%` : '—'}
                      </dd>
                    </div>
                  </dl>

                  {isConfirming ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs text-rose-700 dark:text-rose-300">Remove this student from the course?</p>
                      <button
                        type="button"
                        disabled={isRemoving}
                        onClick={() => void handleRemove(student)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60"
                      >
                        {isRemoving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                        Confirm remove
                      </button>
                      <button
                        type="button"
                        disabled={isRemoving}
                        onClick={() => setConfirmRemoveId('')}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActionError('')
                        setConfirmRemoveId(student.id)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 transition hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/60"
                    >
                      <UserMinus className="h-3.5 w-3.5" aria-hidden />
                      Remove student
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default TrainerEnrolledStudentsPanel
