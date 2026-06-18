import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import TrainingEnrollButton from '../components/TrainingEnrollButton.jsx'
import HomeFooter from '../components/home/HomeFooter.jsx'
import {
  accentAt,
  btnPrimary,
  btnSecondary,
  cardPlayful,
  homePageShell,
  sectionEyebrow,
  sectionSubtitle,
  sectionTitle,
} from '../components/home/homeTheme.js'
import { useAdminCompanyPosts } from '../hooks/useAdminCompanyPosts.js'
import { useAdminCreatedTrainings } from '../hooks/useAdminCreatedTrainings.js'
import { getAllPublishedServicesOfferings } from '../utils/publishedTrainingsCatalog.js'

function ServicesPage() {
  const { byBranch: createdTrainingsByBranch } = useAdminCreatedTrainings()
  const { byBranch: createdPostsByBranch } = useAdminCompanyPosts()
  const allTrainings = useMemo(
    () => getAllPublishedServicesOfferings(createdTrainingsByBranch, createdPostsByBranch),
    [createdTrainingsByBranch, createdPostsByBranch],
  )

  return (
    <div className={`${homePageShell} min-h-full font-display`}>
      <main className="px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <header className="mx-auto max-w-3xl text-center">
            <p className={sectionEyebrow}>What we offer</p>
            <h1 className={`mt-3 ${sectionTitle}`}>Platform services</h1>
            <p className={sectionSubtitle}>
              Training Sphere brings students, companies, trainers, and administrators together with matching, applications,
              communication, tasks, and insights—so training and internships stay aligned from start to finish. Registered
              students can enroll in any published training below.
            </p>
          </header>

          <section className="mt-14 border-t border-violet-100 pt-12 dark:border-slate-800 sm:mt-16">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">All Trainings</h2>
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800 dark:bg-violet-950/50 dark:text-violet-200">
                {allTrainings.length} total
              </span>
            </div>
            {allTrainings.length === 0 ? (
              <p className="mt-5 rounded-[1.75rem] border-2 border-dashed border-violet-200 bg-white/80 px-5 py-8 text-center text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                No trainings available yet.
              </p>
            ) : (
              <ul className="mt-6 grid list-none gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {allTrainings.map((training, index) => {
                  const accent = accentAt(index)
                  return (
                    <li key={`${training.branchId}-${training.id}`}>
                      <article className={`flex h-full flex-col ${cardPlayful}`}>
                        <Link
                          to={`/services/training/${training.branchId}/${training.id}`}
                          className="group flex min-h-0 flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
                        >
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-2 ${accent.bg} ${accent.text} ${accent.ring} ${accent.darkBg} ${accent.darkText}`}
                          >
                            <BookOpen className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                          </div>
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-violet-800 dark:bg-violet-950/50 dark:text-violet-200">
                              {training.trackTitle || 'Training'}
                            </span>
                          </div>
                          <h3 className="mt-3 text-lg font-extrabold text-slate-900 transition group-hover:text-violet-700 dark:text-slate-100 dark:group-hover:text-violet-300">
                            {training.title}
                          </h3>
                          <p className="mt-2 flex-1 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">
                            {training.body}
                          </p>
                          <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {training.sourceType === 'post' && training.linkedTrainingTitle
                              ? `Program: ${training.linkedTrainingTitle}`
                              : `Trainer: ${training.trainer}`}
                            {training.date ? ` · ${training.date}` : ''}
                          </p>
                        </Link>
                        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-violet-100 pt-4 dark:border-slate-800">
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
                              Cannot enroll yet — admin must link this post to a training program in{' '}
                              <span className="font-semibold">Training Management</span>
                              {training.linkedTrainingTitle
                                ? ` (missing: “${training.linkedTrainingTitle}”).`
                                : '.'}
                            </p>
                          )}
                          <Link
                            to={`/services/training/${training.branchId}/${training.id}`}
                            className="text-sm font-extrabold text-violet-600 hover:text-violet-500 dark:text-violet-400"
                          >
                            Details →
                          </Link>
                        </div>
                      </article>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <div className="mt-14 flex flex-col items-center justify-center gap-4 border-t border-violet-100 pt-12 dark:border-slate-800 sm:mt-16 sm:flex-row sm:gap-6">
            <Link to="/contact" className={`${btnPrimary} w-full sm:w-auto`}>
              Contact us
            </Link>
            <Link to="/companies" className={`${btnSecondary} w-full sm:w-auto`}>
              For companies
            </Link>
          </div>
        </div>
      </main>
      <HomeFooter />
    </div>
  )
}

export default ServicesPage
