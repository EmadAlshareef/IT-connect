import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Calendar, ExternalLink, FileText, User, X } from 'lucide-react'

import { DEFAULT_BRANCH_ID, getBranchAdminTrainings } from '../../data/adminDashboardData.js'
import { getLatestCreatedTrainingGlobally } from '../../hooks/useAdminCreatedTrainings.js'
import { selectFeaturedTrainings } from '../../utils/homeFeaturedTrainings.js'
import { fadeUp, staggerParent, staggerItem, viewportOnce } from './homeAnimations.js'
import { accentAt, sectionEyebrow, sectionSubtitle, sectionTitle } from './homeTheme.js'

const iconClass = 'h-6 w-6'

const cardBtnClass =
  'group flex h-full w-full flex-col rounded-[1.75rem] border border-violet-100/80 bg-white p-6 text-left shadow-[0_16px_36px_-22px_rgba(109,40,217,0.35)] outline-none transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_22px_48px_-20px_rgba(109,40,217,0.4)] focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-violet-700/50 dark:focus-visible:ring-offset-slate-950'

const hoverLift = { y: -4, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } }

function useSyncedLatestCreatedTrainingGlobally() {
  const [latest, setLatest] = useState(getLatestCreatedTrainingGlobally)

  useEffect(() => {
    const sync = () => setLatest(getLatestCreatedTrainingGlobally())
    sync()
    window.addEventListener('storage', sync)
    window.addEventListener('admin-created-trainings', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('admin-created-trainings', sync)
    }
  }, [])

  return latest
}

function TrainingDetailModal({ training, onClose, highlightLatest }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!training) return null

  const taken = training.seatsTaken ?? 0
  const total = Math.max(1, training.seatsTotal ?? 0)
  const pct = Math.round((taken / total) * 100)
  const status = training.status ?? ''

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-[2px] dark:bg-slate-950/75"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="training-detail-title"
        className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-[22px] bg-white p-6 shadow-2xl ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-700"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {highlightLatest ? (
              <p className="mb-2 inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-900 ring-1 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-800/40">
                Latest addition
              </p>
            ) : null}
            <h2 id="training-detail-title" className="text-xl font-bold text-slate-900 dark:text-slate-50">
              {training.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close details"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{training.body}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {status ? (
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-bold uppercase text-sky-900 dark:bg-sky-950/50 dark:text-sky-200">
              {status}
            </span>
          ) : null}
        </div>

        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex gap-3">
            <dt className="flex shrink-0 items-center gap-1.5 font-semibold text-slate-500 dark:text-slate-400">
              <Calendar className="h-4 w-4" aria-hidden />
              Start date
            </dt>
            <dd className="text-slate-900 dark:text-slate-100">{training.date}</dd>
          </div>
          {training.trainer ? (
            <div className="flex gap-3">
              <dt className="flex shrink-0 items-center gap-1.5 font-semibold text-slate-500 dark:text-slate-400">
                <User className="h-4 w-4" aria-hidden />
                Trainer
              </dt>
              <dd className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                {training.initials ? (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-xs font-bold text-white dark:from-violet-900 dark:via-violet-800 dark:to-violet-900">
                    {training.initials}
                  </span>
                ) : null}
                <span>{training.trainer}</span>
              </dd>
            </div>
          ) : null}
          {training.linkedTrackTitle ? (
            <div className="flex gap-3">
              <dt className="font-semibold text-slate-500 dark:text-slate-400">Track</dt>
              <dd className="text-slate-900 dark:text-slate-100">{training.linkedTrackTitle}</dd>
            </div>
          ) : null}
          {training.attachedDocumentName ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
              <dt className="flex shrink-0 items-center gap-1.5 font-semibold text-slate-500 dark:text-slate-400">
                <FileText className="h-4 w-4" aria-hidden />
                Document
              </dt>
              <dd className="min-w-0 flex-1 space-y-2">
                <p className="truncate text-slate-900 dark:text-slate-100" title={training.attachedDocumentName}>
                  {training.attachedDocumentName}
                </p>
                {training.attachedDocumentDataUrl ? (
                  <a
                    href={training.attachedDocumentDataUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={training.attachedDocumentName}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 underline-offset-2 hover:underline dark:text-violet-400"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                    Open document
                  </a>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Re-create this training with an attachment under 2 MB in Admin to enable opening the file here.
                  </p>
                )}
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Enrollment</p>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
            {taken} / {training.seatsTotal ?? 0} seats filled
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 via-violet-600 to-violet-600"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          Close
        </button>
      </div>
    </div>
  )
}

function TrainingProgramCard({ tr, variants, latestBadge = false, onOpenDetail, accentIndex = 0 }) {
  const accent = accentAt(accentIndex)
  return (
    <motion.li variants={variants} className="flex h-full min-h-0">
      <motion.button
        type="button"
        whileHover={hoverLift}
        className={cardBtnClass}
        onClick={() => onOpenDetail(tr, latestBadge)}
      >
        {latestBadge ? (
          <p className="mb-3 inline-flex rounded-full bg-gradient-to-r from-orange-400 to-amber-400 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white">
            Latest addition
          </p>
        ) : null}
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl ring-2 ${accent.bg} ${accent.text} ${accent.ring} ${accent.darkBg} ${accent.darkText}`}
        >
          <BookOpen className={iconClass} strokeWidth={1.75} aria-hidden />
        </div>
        <h3 className="mt-5 text-lg font-extrabold text-slate-900 dark:text-slate-100">{tr.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">{tr.body}</p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {tr.date}
          </span>
          <span className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400">
            {tr.seatsTaken ?? 0} / {tr.seatsTotal ?? 0} seats
          </span>
        </div>
        <span className="mt-4 text-xs font-extrabold text-violet-600 dark:text-violet-400">View details →</span>
      </motion.button>
    </motion.li>
  )
}

function HomeFeatures() {
  const featuredTrainings = useMemo(
    () => selectFeaturedTrainings(getBranchAdminTrainings(DEFAULT_BRANCH_ID)),
    [],
  )

  const latestCreated = useSyncedLatestCreatedTrainingGlobally()

  const showLatestSlot = Boolean(latestCreated)

  const gridClass = showLatestSlot
    ? 'mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4'
    : 'mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3'

  const [detailTraining, setDetailTraining] = useState(null)
  const [detailHighlightLatest, setDetailHighlightLatest] = useState(false)

  const openDetail = (tr, fromLatestSlot) => {
    setDetailTraining(tr)
    setDetailHighlightLatest(Boolean(fromLatestSlot))
  }

  const closeDetail = () => {
    setDetailTraining(null)
    setDetailHighlightLatest(false)
  }

  return (
    <motion.section
      id="features"
      className="scroll-mt-24 bg-white py-16 font-display transition-colors dark:bg-slate-950 sm:py-20 lg:py-24"
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className={sectionEyebrow}>Popular programs</p>
          <h2 id="features-heading" className={`mt-3 ${sectionTitle}`}>
            Our range of educational programs
          </h2>
          <p className={sectionSubtitle}>
            From internship intake to verified certification—every workflow stays transparent and accountable.
          </p>
        </div>

        <motion.ul
          className={gridClass}
          role="list"
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          {featuredTrainings.map((tr, i) => (
            <TrainingProgramCard key={tr.id} tr={tr} variants={staggerItem} onOpenDetail={openDetail} accentIndex={i} />
          ))}
          {showLatestSlot ? (
            <TrainingProgramCard
              key={`latest-${latestCreated.id}`}
              tr={latestCreated}
              variants={staggerItem}
              latestBadge
              onOpenDetail={openDetail}
              accentIndex={featuredTrainings.length}
            />
          ) : null}
        </motion.ul>
      </div>

      <TrainingDetailModal training={detailTraining} onClose={closeDetail} highlightLatest={detailHighlightLatest} />
    </motion.section>
  )
}

export default HomeFeatures
