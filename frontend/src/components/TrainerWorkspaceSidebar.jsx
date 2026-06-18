import { Link } from 'react-router-dom'
import { sidebarLinkActive, sidebarLinkInactive, sidebarMutedLabel } from './home/homeTheme.js'

const trainingListBtnBase =
  'flex w-full flex-col gap-0.5 rounded-xl px-3 py-2 text-left text-sm font-semibold transition sm:px-3.5'

const trainingListBtnActive = `${sidebarLinkActive} ring-1 ring-white/10`

const trainingListBtnIdle = sidebarLinkInactive

/**
 * Trainer sidebar: pick a training and see its details.
 */
export default function TrainerWorkspaceSidebar({
  sessions,
  selectedTrainingId,
  onSelectTraining,
  pendingCountBySession = {},
  compact = false,
  trainerEmail = '',
  isLoading = false,
}) {
  const selected =
    sessions.find((s) => s.id === selectedTrainingId) ?? sessions[0] ?? null
  const effectiveTrainingId = selected?.id ?? ''

  return (
    <div className={compact ? 'space-y-4' : 'flex min-h-0 flex-1 flex-col gap-4'}>
      <div className={compact ? '' : 'min-h-0 shrink-0'}>
        <p className={`px-1 ${sidebarMutedLabel}`}>My trainings</p>
        <ul className={`mt-2 space-y-1 ${compact ? '' : 'max-h-36 overflow-y-auto overscroll-contain pr-0.5'}`} role="list">
          {isLoading ? (
            <li className="px-2 py-2 text-xs text-slate-500 dark:text-slate-400">Loading your trainings…</li>
          ) : sessions.length === 0 ? (
            <li className="px-2 py-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              No trainings assigned yet.
              {trainerEmail ? (
                <>
                  {' '}
                  Ask your company to assign <span className="font-mono font-medium">{trainerEmail}</span> on the
                  training in Trainings (not only the Trainers roster).
                </>
              ) : null}
            </li>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === effectiveTrainingId
              const sessionPending = pendingCountBySession[session.id] ?? 0
              return (
                <li key={session.id}>
                  <button
                    type="button"
                    onClick={() => onSelectTraining(session.id)}
                    className={`${trainingListBtnBase} ${isActive ? trainingListBtnActive : trainingListBtnIdle}`}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-semibold leading-snug">{session.title}</span>
                      {sessionPending > 0 ? (
                        <span
                          className={`inline-flex min-h-[1.125rem] min-w-[1.125rem] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                            isActive ? 'bg-white/20 text-white' : 'bg-rose-600 text-white'
                          }`}
                          title={`${sessionPending} pending application${sessionPending === 1 ? '' : 's'}`}
                        >
                          {sessionPending > 9 ? '9+' : sessionPending}
                        </span>
                      ) : null}
                    </span>
                    {session.company ? (
                      <span
                        className={`text-[11px] font-medium ${isActive ? 'text-white/85' : 'text-slate-500 dark:text-slate-400'}`}
                      >
                        {session.company}
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      </div>

      {selected ? (
        <div className="shrink-0 rounded-xl border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-900/60">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Training details
          </p>
          <h2 className="mt-1.5 text-sm font-bold leading-snug text-slate-900 dark:text-slate-100">{selected.title}</h2>
          {selected.linkedTrackTitle ? (
            <p className="mt-1 text-[11px] font-medium text-violet-600 dark:text-violet-400">{selected.linkedTrackTitle}</p>
          ) : null}
          <dl className="mt-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
            {selected.company ? (
              <div className="flex justify-between gap-2">
                <dt>Company</dt>
                <dd className="text-right font-medium text-slate-800 dark:text-slate-200">{selected.company}</dd>
              </div>
            ) : null}
            {selected.duration ? (
              <div className="flex justify-between gap-2">
                <dt>Schedule</dt>
                <dd className="text-right font-medium text-slate-800 dark:text-slate-200">{selected.duration}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-2">
              <dt>Status</dt>
              <dd className="text-right font-medium text-slate-800 dark:text-slate-200">{selected.status}</dd>
            </div>
            {selected.seatsTotal != null ? (
              <div className="flex justify-between gap-2">
                <dt>Seats</dt>
                <dd className="text-right font-medium text-slate-800 dark:text-slate-200">
                  {selected.seatsTaken ?? 0} / {selected.seatsTotal}
                </dd>
              </div>
            ) : (
              <div className="flex justify-between gap-2">
                <dt>Trainees</dt>
                <dd className="text-right font-medium text-slate-800 dark:text-slate-200">
                  {selected.studentsCount ?? selected.students?.length ?? 0}
                </dd>
              </div>
            )}
          </dl>
          {!selected.isTrackPlaceholder ? (
            <Link
              to={`/dashboard/section/${selected.id}`}
              className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-300 dark:hover:bg-slate-800"
            >
              Open session workspace
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
