import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import TrainingEnrollButton from '../components/TrainingEnrollButton.jsx'
import { adminBranches } from '../data/adminDashboardData.js'
import { useAdminCreatedTrainings } from '../hooks/useAdminCreatedTrainings.js'
import { getBranchCatalogTrainings } from '../utils/publishedTrainingsCatalog.js'
import { CATALOG_ENROLLMENT_CHANGED_EVENT } from '../utils/trainingCatalogEnrollment.js'
import { getCatalogTrainingSeatStats } from '../utils/catalogTrainingSeats.js'

function ServiceTrainingDetailsPage() {
  const { branchId, trainingId } = useParams()
  const { byBranch: createdTrainingsByBranch } = useAdminCreatedTrainings()
  const [seatTick, setSeatTick] = useState(0)

  useEffect(() => {
    const bump = () => setSeatTick((n) => n + 1)
    window.addEventListener(CATALOG_ENROLLMENT_CHANGED_EVENT, bump)
    return () => window.removeEventListener(CATALOG_ENROLLMENT_CHANGED_EVENT, bump)
  }, [])

  const branch = useMemo(() => adminBranches.find((b) => b.id === branchId) ?? null, [branchId])
  const training = useMemo(() => {
    if (!branch) return null
    return getBranchCatalogTrainings(branch.id, createdTrainingsByBranch).find(
      (item) => item.id === trainingId,
    ) ?? null
  }, [branch, createdTrainingsByBranch, trainingId])

  const seatStats = useMemo(() => {
    if (!branch || !training) return { taken: 0, total: 0 }
    return getCatalogTrainingSeatStats(branch.id, training.id)
  }, [branch, training, seatTick])
  const hasCompanyInfo = Boolean(
    training?.companyName ||
      training?.companyEmail ||
      training?.companyIndustry ||
      training?.companyLocation ||
      training?.companyDescription ||
      training?.companyVision ||
      training?.trackTitle ||
      training?.documentFileName,
  )

  if (!branch || !training) return <Navigate to="/services" replace />

  return (
    <main className="min-h-[calc(100dvh-5rem)] bg-[#FFF9F2] font-display px-4 py-12 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/services"
          className="text-sm text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          ← Back to Services
        </Link>

        <article className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-sky-800 dark:bg-sky-950/50 dark:text-sky-200">
              {training.status ?? 'active'}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{training.title}</h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{training.body}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/50">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Trainer</p>
              <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{training.trainer}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/50">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Start date</p>
              <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{training.date}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/50">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Seats</p>
              <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                {seatStats.taken} / {seatStats.total}
              </p>
            </div>
          </div>

          {hasCompanyInfo ? (
            <section className="mt-6 rounded-2xl border border-violet-100 bg-violet-50/60 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
                Company information
              </p>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
                {training.companyLogoUrl ? (
                  <img
                    src={training.companyLogoUrl}
                    alt={`${training.companyName || 'Company'} logo`}
                    className="h-16 w-16 rounded-2xl border border-white/70 object-cover shadow-sm dark:border-slate-800"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {training.companyName || 'Company training provider'}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {training.companyIndustry ? (
                      <span className="rounded-full bg-white px-2.5 py-1 dark:bg-slate-900">{training.companyIndustry}</span>
                    ) : null}
                    {training.companyLocation ? (
                      <span className="rounded-full bg-white px-2.5 py-1 dark:bg-slate-900">{training.companyLocation}</span>
                    ) : null}
                    {training.trackTitle ? (
                      <span className="rounded-full bg-white px-2.5 py-1 dark:bg-slate-900">Track: {training.trackTitle}</span>
                    ) : null}
                  </div>
                  {training.companyDescription ? (
                    <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">{training.companyDescription}</p>
                  ) : null}
                  {training.companyVision ? (
                    <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-sm leading-6 text-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">Vision:</span>{' '}
                      {training.companyVision}
                    </p>
                  ) : null}
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    {training.companyEmail ? (
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Company email</dt>
                        <dd className="mt-1 break-all text-slate-800 dark:text-slate-200">{training.companyEmail}</dd>
                      </div>
                    ) : null}
                    {training.documentFileName ? (
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Training document</dt>
                        <dd className="mt-1 text-slate-800 dark:text-slate-200">{training.documentFileName}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              </div>
            </section>
          ) : null}

          <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Join this program</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Register or sign in as a student, enroll in this program, then complete the required onboarding application.
              Your instructor must approve before you can access the trainee workspace.
            </p>
            <div className="mt-4 max-w-sm">
              <TrainingEnrollButton
                branchId={branch.id}
                trainingId={training.id}
                trainingTitle={training.title}
              />
            </div>
          </div>
        </article>
      </div>
    </main>
  )
}

export default ServiceTrainingDetailsPage
