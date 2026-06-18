import { useEffect, useMemo, useState } from 'react'
import { BookOpen, GraduationCap, Mail, User, Users } from 'lucide-react'
import { canSyncCompanyPortalApi, fetchCompanyEnrolledStudents } from '../../api/companyPortalApi.js'
import { badgeToneClasses } from '../../utils/courseEnrollmentAccess.js'
import {
  listCompanyEnrolledStudents,
  listCompanyTrainerRoster,
  summarizeCompanyApplicants,
} from '../../utils/companyApplicantsRoster.js'
import { CATALOG_ENROLLMENT_CHANGED_EVENT } from '../../utils/trainingCatalogEnrollment.js'
import { ENROLLMENT_APPLICATIONS_CHANGED_EVENT } from '../../api/enrollmentApplicationApi.js'
import { listenCompanyPortalStore } from '../../utils/companyPortalStore.js'

function formatWhen(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return '—'
  }
}

function CompanyApplicantsPanel({ companyEmail, trainingRequests, companyTrainers = [] }) {
  const [tick, setTick] = useState(0)
  const [apiStudents, setApiStudents] = useState(null)

  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    window.addEventListener(CATALOG_ENROLLMENT_CHANGED_EVENT, bump)
    window.addEventListener(ENROLLMENT_APPLICATIONS_CHANGED_EVENT, bump)
    const unlistenPortal = listenCompanyPortalStore(bump)
    return () => {
      window.removeEventListener(CATALOG_ENROLLMENT_CHANGED_EVENT, bump)
      window.removeEventListener(ENROLLMENT_APPLICATIONS_CHANGED_EVENT, bump)
      unlistenPortal()
    }
  }, [])

  const localStudents = useMemo(
    () => listCompanyEnrolledStudents(companyEmail, trainingRequests),
    [companyEmail, trainingRequests, tick],
  )

  useEffect(() => {
    if (!companyEmail || !canSyncCompanyPortalApi()) {
      setApiStudents(null)
      return
    }

    let cancelled = false
    fetchCompanyEnrolledStudents({ companyEmail })
      .then((rows) => {
        if (!cancelled) setApiStudents(rows)
      })
      .catch(() => {
        if (!cancelled) setApiStudents(null)
      })

    return () => {
      cancelled = true
    }
  }, [companyEmail, tick])

  const students = apiStudents ?? localStudents

  const trainers = useMemo(() => {
    const fromRoster = listCompanyTrainerRoster(companyEmail)
    if (fromRoster.length > 0) return fromRoster
    return (companyTrainers ?? []).map((row) => ({
      id: row.id,
      name: String(row.fullName ?? '').trim() || 'Trainer',
      email: String(row.email ?? '').trim().toLowerCase(),
      position: String(row.companyPosition ?? '').trim(),
      tracks: Array.isArray(row.linkedTrackTitles) ? row.linkedTrackTitles : [],
    }))
  }, [companyEmail, companyTrainers, tick])

  const stats = useMemo(() => summarizeCompanyApplicants(students, trainers), [students, trainers])

  return (
    <div className="mt-5 space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-900/50 dark:bg-violet-950/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
            Enrolled students
          </p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-violet-950 dark:text-violet-100">
            <Users className="h-5 w-5" aria-hidden />
            {stats.studentCount}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            Approved access
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-950 dark:text-emerald-100">{stats.approvedStudents}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Pending review
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-950 dark:text-amber-100">{stats.pendingStudents}</p>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-900/50 dark:bg-violet-950/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
            Company trainers
          </p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-violet-950 dark:text-violet-100">
            <GraduationCap className="h-5 w-5" aria-hidden />
            {stats.trainerCount}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Students in company courses
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Everyone who subscribed to your published training programs across all courses.
          </p>
        </div>

        {students.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-3 py-8 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
            No enrolled students yet. Students appear here after they subscribe to one of your approved trainings.
          </p>
        ) : (
          <ul className="space-y-3">
            {students.map((student) => (
              <li
                key={student.id}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/40 sm:flex sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">
                    <User className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{student.name}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeToneClasses(student.statusTone)}`}
                      >
                        {student.statusLabel}
                      </span>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Mail className="h-3 w-3 shrink-0" aria-hidden />
                      {student.email}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <BookOpen className="h-3 w-3 shrink-0" aria-hidden />
                      {student.trainingTitle}
                      {student.trainerName ? ` · Trainer: ${student.trainerName}` : ''}
                    </p>
                  </div>
                </div>
                <p className="mt-2 shrink-0 text-xs text-slate-500 sm:mt-0 sm:text-right dark:text-slate-400">
                  Subscribed {formatWhen(student.enrolledAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Company trainers
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Instructors linked to your company account and assigned tracks.
          </p>
        </div>

        {trainers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-3 py-8 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
            No trainers yet. Add trainers from the Trainers tab.
          </p>
        ) : (
          <ul className="space-y-3">
            {trainers.map((trainer) => (
              <li
                key={trainer.id}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 sm:flex sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">
                    <GraduationCap className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{trainer.name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Mail className="h-3 w-3 shrink-0" aria-hidden />
                      {trainer.email}
                    </p>
                    {trainer.position ? (
                      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {trainer.position}
                      </p>
                    ) : null}
                  </div>
                </div>
                {trainer.tracks?.length ? (
                  <p className="mt-2 text-xs text-slate-500 sm:mt-0 sm:max-w-xs sm:text-right dark:text-slate-400">
                    Tracks: {trainer.tracks.join(', ')}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default CompanyApplicantsPanel
