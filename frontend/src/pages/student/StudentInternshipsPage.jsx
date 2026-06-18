import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Search } from 'lucide-react'
import TrainingEnrollButton from '../../components/TrainingEnrollButton.jsx'
import { useAdminCompanyPosts } from '../../hooks/useAdminCompanyPosts.js'
import { useAdminCreatedTrainings } from '../../hooks/useAdminCreatedTrainings.js'
import { getAllPublishedServicesOfferings } from '../../utils/publishedTrainingsCatalog.js'

function StudentInternshipsPage() {
  const location = useLocation()
  const { byBranch: createdTrainingsByBranch } = useAdminCreatedTrainings()
  const { byBranch: createdPostsByBranch } = useAdminCompanyPosts()
  const [track, setTrack] = useState('All')
  const [trainer, setTrainer] = useState('All')
  const [query, setQuery] = useState('')

  const trainings = useMemo(
    () => getAllPublishedServicesOfferings(createdTrainingsByBranch, createdPostsByBranch),
    [createdTrainingsByBranch, createdPostsByBranch],
  )

  const tracks = useMemo(() => {
    const values = Array.from(new Set(trainings.map((t) => t.trackTitle).filter(Boolean)))
    return ['All', ...values.sort()]
  }, [trainings])

  const trainers = useMemo(() => {
    const values = Array.from(new Set(trainings.map((t) => t.trainer).filter(Boolean)))
    return ['All', ...values.sort()]
  }, [trainings])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return trainings.filter((t) => {
      if (track !== 'All' && t.trackTitle !== track) return false
      if (trainer !== 'All' && t.trainer !== trainer) return false
      if (!q) return true
      const hay = `${t.title} ${t.body} ${t.trainer} ${t.trackTitle}`.toLowerCase()
      return hay.includes(q)
    })
  }, [trainings, track, trainer, query])

  return (
    <div className="space-y-8">
      {location.state?.needEnrollment ? (
        <div
          role="status"
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
        >
          Enroll in a training below and complete the onboarding application. After instructor approval you can access your
          full trainee dashboard (home, tasks, progress, and more). Check{' '}
          <Link to="/student/applications" className="font-semibold text-amber-900 underline underline-offset-2 dark:text-amber-50">
            My applications
          </Link>{' '}
          for internship program status.
        </div>
      ) : null}

      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Browse trainings</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          All published programs on Training Sphere. Enroll in a training to start the application flow—your instructor
          reviews it before course access unlocks.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <Search className="h-4 w-4 text-slate-400" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, track, or trainer"
            className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 dark:text-slate-100"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Track
            <select
              value={track}
              onChange={(e) => setTrack(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {tracks.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Trainer
            <select
              value={trainer}
              onChange={(e) => setTrainer(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {trainers.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {filtered.length} of {trainings.length} training{trainings.length === 1 ? '' : 's'}
        </p>
      </div>

      <ul className="grid list-none gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((training) => (
          <li key={`${training.branchId}-${training.id}`}>
            <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-violet-900/40">
              <Link
                to={`/services/training/${training.branchId}/${training.id}`}
                className="group flex min-h-0 flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF9F2] dark:focus-visible:ring-violet-400/80 dark:focus-visible:ring-offset-slate-950"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">
                    {training.trackTitle || 'Training'}
                  </span>
                  {training.status ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {training.status}
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-900 transition group-hover:text-violet-700 dark:text-slate-100 dark:group-hover:text-violet-300">
                  {training.title}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{training.body}</p>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {training.sourceType === 'post' && training.linkedTrainingTitle
                    ? `Program: ${training.linkedTrainingTitle}`
                    : `Trainer: ${training.trainer}`}
                  {training.date ? ` · ${training.date}` : ''}
                </p>
              </Link>
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                {training.enrollable !== false ? (
                  <TrainingEnrollButton
                    branchId={training.branchId}
                    trainingId={training.id}
                    trainingTitle={training.title}
                    compact
                    className="min-w-[8rem] flex-1"
                  />
                ) : (
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                    Cannot enroll yet — this post is not linked to a published training program
                    {training.linkedTrainingTitle ? ` (“${training.linkedTrainingTitle}”).` : '.'}
                  </p>
                )}
                <Link
                  to={`/services/training/${training.branchId}/${training.id}`}
                  className="text-sm font-semibold text-violet-600 hover:text-violet-500 dark:text-violet-300"
                >
                  Details →
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {trainings.length === 0
            ? 'No trainings published yet. Check back soon.'
            : 'No trainings match these filters. Reset filters or broaden your search.'}
        </p>
      ) : null}
    </div>
  )
}

export default StudentInternshipsPage
