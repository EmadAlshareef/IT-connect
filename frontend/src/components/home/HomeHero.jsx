import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Sparkles, Star } from 'lucide-react'

import HeroKidsLearningScene from './illustrations/HeroKidsLearningScene.jsx'
import HeroStudyItDecor from './illustrations/HeroStudyItDecor.jsx'
import { btnPrimary, btnSecondary } from './homeTheme.js'

function HomeHero({ stats }) {
  const { scrollY } = useScroll()
  const blobRightY = useTransform(scrollY, [0, 480], [0, 70])
  const blobLeftY = useTransform(scrollY, [0, 480], [0, -48])

  return (
    <section className="relative scroll-mt-24 overflow-hidden bg-[#FFF9F2] font-display transition-colors dark:bg-slate-950">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <motion.div
          className="absolute -right-20 top-8 h-72 w-72 rounded-full bg-gradient-to-br from-violet-200/70 via-fuchsia-100/40 to-transparent blur-3xl dark:from-violet-950/40"
          style={{ y: blobRightY }}
        />
        <motion.div
          className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-gradient-to-tr from-amber-200/60 via-orange-100/40 to-transparent blur-3xl dark:from-amber-950/30"
          style={{ y: blobLeftY }}
        />
        <div className="absolute left-[8%] top-[18%] h-4 w-4 rounded-full bg-orange-400/70" />
        <div className="absolute right-[14%] top-[28%] h-3 w-3 rounded-full bg-violet-400/70" />
        <div className="absolute bottom-[22%] left-[42%] h-5 w-5 rounded-full bg-sky-300/60" />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-14 lg:pb-28 lg:pt-14">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.p
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-violet-700 shadow-sm ring-1 ring-violet-100 dark:bg-slate-900 dark:text-violet-300 dark:ring-violet-800/50"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
          >
            <Sparkles className="h-3.5 w-3.5 text-orange-500" aria-hidden />
            Training Sphere
            <span className="h-1 w-1 rounded-full bg-orange-400" aria-hidden />
            Learn & grow
          </motion.p>

          <motion.h1
            className="mt-6 text-4xl font-black leading-[1.08] tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl lg:text-[3.25rem]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06 }}
          >
            Making practical learning{' '}
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 bg-clip-text text-transparent">
              fun & easy
            </span>{' '}
            for every student.
          </motion.h1>

          <motion.p
            className="mt-5 max-w-xl text-lg font-semibold leading-relaxed text-slate-600 dark:text-slate-400"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.14 }}
          >
            Training Sphere connects university students with companies offering hands-on training—colorful pathways,
            clear milestones, and mentor support from day one.
          </motion.p>

          <motion.div
            className="mt-9 flex flex-wrap gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48, delay: 0.22 }}
          >
            <motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} className="inline-flex">
              <Link to="/login" className={btnPrimary}>
                Get Started
              </Link>
            </motion.span>
            <motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} className="inline-flex">
              <Link to="/services" className={btnSecondary}>
                Explore Programs
              </Link>
            </motion.span>
          </motion.div>

          <motion.dl
            className="mt-12 grid grid-cols-3 gap-4 sm:max-w-lg"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.08, delayChildren: 0.35 } },
            }}
          >
            {[
              { label: 'Students', value: `${stats.students}+`, tone: 'from-violet-500 to-purple-600' },
              { label: 'Trainers', value: String(stats.trainers), tone: 'from-orange-400 to-amber-500' },
              { label: 'Partners', value: String(stats.companies), tone: 'from-sky-400 to-cyan-500' },
            ].map((row) => (
              <motion.div
                key={row.label}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } },
                }}
                className="rounded-2xl bg-white p-4 text-center shadow-[0_12px_30px_-18px_rgba(109,40,217,0.35)] ring-1 ring-violet-100 dark:bg-slate-900 dark:ring-slate-700"
              >
                <dt className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {row.label}
                </dt>
                <dd
                  className={`mt-1 bg-gradient-to-r ${row.tone} bg-clip-text text-2xl font-black tabular-nums text-transparent sm:text-3xl`}
                >
                  {row.value}
                </dd>
              </motion.div>
            ))}
          </motion.dl>
        </motion.div>

        <motion.div
          className="relative mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="absolute -left-2 top-6 z-20 hidden rounded-2xl bg-white px-3 py-2 shadow-lg ring-1 ring-orange-100 sm:flex dark:bg-slate-900 dark:ring-orange-900/40"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          >
            <span className="flex items-center gap-1.5 text-xs font-extrabold text-orange-600 dark:text-orange-300">
              <Star className="h-4 w-4 fill-orange-400 text-orange-400" />
              Top rated
            </span>
          </motion.div>

          <motion.div
            className="absolute -right-1 bottom-16 z-20 hidden rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg sm:flex"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
            aria-hidden
          >
            120+ courses
          </motion.div>

          <div className="relative overflow-visible rounded-[2rem] border-2 border-violet-100 bg-white p-4 shadow-[0_28px_60px_-28px_rgba(109,40,217,0.45)] dark:border-violet-900/40 dark:bg-slate-900 sm:p-6">
            <HeroStudyItDecor />
            <HeroKidsLearningScene />
          </div>
        </motion.div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-b from-transparent to-white dark:to-slate-950" aria-hidden />
    </section>
  )
}

HomeHero.propTypes = {
  stats: PropTypes.shape({
    students: PropTypes.number.isRequired,
    trainers: PropTypes.number.isRequired,
    companies: PropTypes.number.isRequired,
  }).isRequired,
}

export default HomeHero
