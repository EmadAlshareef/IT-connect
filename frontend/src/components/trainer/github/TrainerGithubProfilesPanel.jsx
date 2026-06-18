import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bell,
  ExternalLink,
  FolderGit2,
  Link2,
  Mail,
  User,
} from 'lucide-react'
import {
  buildGithubReminderMessage,
  canReviewGithubProfiles,
  copyGithubReminder,
  githubProfileUrlFromRepo,
  listTrainerGithubStudents,
  TRAINER_GITHUB_PROFILES_CHANGED_EVENT,
  TRAINER_GITHUB_ROSTER_CHANGED_EVENT,
} from '../../../utils/trainerGithubProfiles.js'

const FILTERS = [
  { id: 'all', label: 'All students' },
  { id: 'linked', label: 'GitHub linked' },
  { id: 'missing', label: 'Not linked yet' },
]

function formatLinkedAt(ts) {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return '—'
  }
}

/**
 * In-dashboard GitHub student roster for instructors (no route navigation).
 */
function TrainerGithubProfilesPanel({
  role,
  trainingId,
  trainingTitle,
  sessionSummaries,
  evaluationRows,
  onPreviewRepository,
}) {
  const [filter, setFilter] = useState('all')
  const [selectedKey, setSelectedKey] = useState('')
  const [tick, setTick] = useState(0)
  const [notice, setNotice] = useState({ type: '', message: '' })

  const authorized = canReviewGithubProfiles(role)

  const students = useMemo(
    () =>
      listTrainerGithubStudents({
        trainingId,
        sessionSummaries,
        evaluationRows,
      }),
    [trainingId, sessionSummaries, evaluationRows, tick],
  )

  const filtered = useMemo(() => {
    if (filter === 'linked') return students.filter((row) => row.hasGithubLink)
    if (filter === 'missing') return students.filter((row) => !row.hasGithubLink)
    return students
  }, [students, filter])

  const selected = useMemo(
    () => filtered.find((row) => row.key === selectedKey) ?? students.find((row) => row.key === selectedKey) ?? null,
    [filtered, students, selectedKey],
  )

  const profileUrl = selected?.hasGithubLink ? githubProfileUrlFromRepo(selected.repositoryUrl) : null

  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    window.addEventListener(TRAINER_GITHUB_PROFILES_CHANGED_EVENT, bump)
    window.addEventListener(TRAINER_GITHUB_ROSTER_CHANGED_EVENT, bump)
    window.addEventListener('storage', bump)
    return () => {
      window.removeEventListener(TRAINER_GITHUB_PROFILES_CHANGED_EVENT, bump)
      window.removeEventListener(TRAINER_GITHUB_ROSTER_CHANGED_EVENT, bump)
      window.removeEventListener('storage', bump)
    }
  }, [])

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedKey('')
      return
    }
    if (!selectedKey || !filtered.some((row) => row.key === selectedKey)) {
      setSelectedKey(filtered[0].key)
    }
  }, [filtered, selectedKey])

  const handleCopyReminder = useCallback(async () => {
    if (!selected) return
    const text = buildGithubReminderMessage(selected.traineeName, trainingTitle)
    const result = await copyGithubReminder(text)
    setNotice({ type: result.ok ? 'success' : 'error', message: result.message })
  }, [selected, trainingTitle])

  if (!authorized) {
    return (
      <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
        Only instructors and administrators can review student GitHub profiles.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          GitHub
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Student repositories</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          {trainingTitle
            ? `Only students approved for ${trainingTitle} appear here. Review their GitHub repos or send a reminder if they have not linked a repository yet.`
            : 'Select a training program to see approved students and their GitHub links.'}
        </p>
      </div>

      {notice.message ? (
        <p
          className={`rounded-xl px-4 py-3 text-sm ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
          }`}
          role="status"
        >
          {notice.message}
        </p>
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
            <span className="ml-1 opacity-80">
              (
              {chip.id === 'all'
                ? students.length
                : chip.id === 'linked'
                  ? students.filter((r) => r.hasGithubLink).length
                  : students.filter((r) => !r.hasGithubLink).length}
              )
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-400">
          {trainingId
            ? 'No approved students in this course yet. Approve enrollment requests first — then trainees will appear here with their GitHub links.'
            : 'Select a training from the sidebar to view approved students for that course.'}
        </p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
          <ul className="max-h-[min(70vh,640px)] space-y-2 overflow-y-auto pr-1" aria-label="Students GitHub list">
            {filtered.map((row) => {
              const isActive = row.key === selectedKey
              return (
                <li key={row.key}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedKey(row.key)
                      setNotice({ type: '', message: '' })
                    }}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-violet-400 bg-violet-50 dark:border-violet-600 dark:bg-violet-950/40'
                        : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.traineeName}</p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          row.hasGithubLink
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200'
                        }`}
                      >
                        {row.hasGithubLink ? 'Linked' : 'Missing'}
                      </span>
                    </div>
                    {row.email ? (
                      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{row.email}</p>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>

          {selected ? (
            <article className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                    <FolderGit2 className="h-5 w-5" aria-hidden />
                    {selected.traineeName}
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                    {selected.email ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-4 w-4" aria-hidden />
                        {selected.email}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1.5">
                      <User className="h-4 w-4" aria-hidden />
                      {selected.traineeId || 'Trainee'}
                    </span>
                    {selected.sectionTitle ? (
                      <span className="inline-flex items-center gap-1.5">
                        <FolderGit2 className="h-4 w-4" aria-hidden />
                        {selected.sectionTitle}
                      </span>
                    ) : null}
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    selected.hasGithubLink
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200'
                  }`}
                >
                  {selected.hasGithubLink ? 'GitHub connected' : 'GitHub not added'}
                </span>
              </div>

              {selected.hasGithubLink ? (
                <>
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950/50">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Repository</p>
                    <p className="mt-2 break-all text-sm font-medium text-violet-700 dark:text-violet-300">
                      <Link2 className="mr-1 inline h-4 w-4 align-text-bottom" aria-hidden />
                      {selected.repositoryUrl}
                    </p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Linked {formatLinkedAt(selected.linkedAt)}
                      {selected.isValid ? ' · Link validated' : ''}
                    </p>
                    {selected.validationMessage ? (
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{selected.validationMessage}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <a
                      href={selected.repositoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500 dark:bg-violet-500"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden />
                      Open repository
                    </a>
                    {profileUrl ? (
                      <a
                        href={profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                      >
                        <FolderGit2 className="h-4 w-4" aria-hidden />
                        View GitHub profile
                      </a>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/80 p-5 dark:border-amber-800/60 dark:bg-amber-950/30">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">No GitHub repository yet</p>
                  <p className="mt-2 text-sm leading-6 text-amber-800/90 dark:text-amber-200/90">
                    This student has not linked a project from their student dashboard. They must open{' '}
                    <strong>Student → GitHub</strong> and save a valid repository URL before you can review their work
                    on GitHub.
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyReminder}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500"
                  >
                    <Bell className="h-4 w-4" aria-hidden />
                    Copy reminder message
                  </button>
                  <p className="mt-3 rounded-lg bg-white/60 px-3 py-2 text-xs text-amber-900/80 dark:bg-slate-900/40 dark:text-amber-100/80">
                    {buildGithubReminderMessage(selected.traineeName, trainingTitle)}
                  </p>
                </div>
              )}
            </article>
          ) : null}
        </div>
      )}

      {onPreviewRepository ? (
        <HomeworkGithubPreviews
          evaluationRows={evaluationRows}
          students={students}
          onPreview={onPreviewRepository}
        />
      ) : null}
    </div>
  )
}

function HomeworkGithubPreviews({ evaluationRows, students, onPreview }) {
  const linkByTrainee = useMemo(() => {
    const m = new Map()
    for (const row of students.filter((r) => r.hasGithubLink)) {
      if (row.traineeId) m.set(row.traineeId, row.repositoryUrl)
      m.set(row.traineeName.toLowerCase(), row.repositoryUrl)
    }
    return m
  }, [students])

  const items = useMemo(
    () =>
      evaluationRows.flatMap((row) =>
        row.storedTasks
          ?.filter((task) => task.submitted)
          .map((task) => {
            const repositoryUrl =
              linkByTrainee.get(row.id) || linkByTrainee.get(String(row.trainee ?? '').toLowerCase()) || ''
            return {
              ...task,
              key: `${row.id}::${task.title}`,
              traineeId: row.id,
              traineeName: row.trainee,
              repositoryUrl,
              hasGithubLink: Boolean(repositoryUrl),
            }
          }) ?? [],
      ),
    [evaluationRows, linkByTrainee],
  )

  if (items.length === 0) return null

  return (
    <div className="border-t border-slate-200 pt-6 dark:border-slate-700">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Submitted homework on GitHub</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Tasks marked submitted — open repo preview when linked.</p>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            key={item.key}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/40"
          >
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{item.traineeName}</p>
            </div>
            <button
              type="button"
              disabled={!item.hasGithubLink}
              onClick={() => onPreview(item)}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              View repository preview
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default TrainerGithubProfilesPanel
