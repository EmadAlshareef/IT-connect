import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Code2, Database, Smartphone } from 'lucide-react'

import { useAdminCreatedTracks } from '../../hooks/useAdminCreatedTracks.js'
import { fadeUp, staggerParent, staggerItem, viewportOnce } from './homeAnimations.js'
import { programTracks } from './homeContent.js'
import { accentAt, sectionEyebrow, sectionSubtitle, sectionTitle } from './homeTheme.js'

const TRACK_ICONS = {
  code: Code2,
  db: Database,
  mobile: Smartphone,
}

function createdTrackTimestamp(trackId) {
  const s = String(trackId)
  const i = s.lastIndexOf('-')
  if (i === -1) return 0
  const ts = Number.parseInt(s.slice(i + 1), 10)
  return Number.isFinite(ts) ? ts : 0
}

/** Maps admin “Add Track” rows into the same shape as static marketing tracks. */
function buildDisplayTracks(byBranch) {
  const createdFlat = Object.values(byBranch).flatMap((rows) => rows ?? []).filter((r) => r.userCreated)
  createdFlat.sort((a, b) => createdTrackTimestamp(b.id) - createdTrackTimestamp(a.id))

  const fromWorkspace = createdFlat.map((r) => ({
    key: r.id,
    title: r.title,
    description: r.description?.trim() || 'Training track managed in your admin workspace.',
    icon: r.icon,
    trainings: r.trainings ?? 0,
    students: r.students ?? 0,
    active: r.active ?? 0,
    skills: [],
    userCreated: true,
  }))

  const baseline = programTracks.map((p) => ({ ...p, userCreated: false }))
  return [...fromWorkspace, ...baseline]
}

function HomeForWho() {
  const { byBranch } = useAdminCreatedTracks()
  const displayTracks = useMemo(() => buildDisplayTracks(byBranch), [byBranch])

  return (
    <motion.section
      id="for-who"
      className="scroll-mt-24 bg-[#FFF9F2] py-16 font-display transition-colors dark:bg-slate-950 sm:py-20 lg:py-24"
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      aria-labelledby="forwho-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className={sectionEyebrow}>Learning tracks</p>
          <h2 id="forwho-heading" className={`mt-3 ${sectionTitle}`}>
            Program pathways for every learner
          </h2>
          <p className={sectionSubtitle}>
            Program tracks organized like your admin workspace so cohorts, skills, and enrollments stay aligned.
          </p>
        </div>

        <motion.ul
          className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          role="list"
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          {displayTracks.map((tr, index) => {
            const Icon = TRACK_ICONS[tr.icon] ?? Code2
            const skills = tr.skills ?? []
            const accent = accentAt(index)
            return (
              <motion.li
                key={tr.key}
                variants={staggerItem}
                whileHover={{ y: -6, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } }}
                className={`flex flex-col rounded-[1.75rem] border bg-white p-6 shadow-[0_16px_36px_-22px_rgba(109,40,217,0.28)] transition dark:bg-slate-900 ${
                  tr.userCreated
                    ? 'border-emerald-200 ring-2 ring-emerald-400/20 dark:border-emerald-900/50'
                    : 'border-violet-100 hover:border-violet-200 dark:border-slate-700 dark:hover:border-violet-700/50'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-2 ${accent.bg} ${accent.text} ${accent.ring} ${accent.darkBg} ${accent.darkText}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  {tr.userCreated ? (
                    <span className="rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                      New
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-5 text-lg font-extrabold text-slate-900 dark:text-slate-100">{tr.title}</h3>
                <p className="mt-3 flex-1 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">{tr.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-extrabold text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">
                    {tr.trainings} Trainings
                  </span>
                  <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-extrabold text-orange-700 dark:bg-orange-950/50 dark:text-orange-200">
                    {tr.students} Students
                  </span>
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-400">{tr.active} active trainings</p>
                {skills.length > 0 ? (
                  <div className="mt-5 border-t border-violet-100 pt-5 dark:border-slate-800">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Skills in this track
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {skills.map((sk) => (
                        <li
                          key={sk}
                          className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {sk}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </motion.li>
            )
          })}
        </motion.ul>
      </div>
    </motion.section>
  )
}

export default HomeForWho
