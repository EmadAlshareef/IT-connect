import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fadeUp, viewportOnce } from './homeAnimations.js'

function HomeCta() {
  return (
    <motion.section
      className="bg-[#FFF9F2] pb-20 pt-6 font-display transition-colors dark:bg-slate-950 sm:pb-24"
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      aria-labelledby="cta-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[2rem] border-2 border-violet-200/80 px-8 py-14 text-center shadow-[0_28px_60px_-28px_rgba(109,40,217,0.45)] dark:border-violet-900/40 sm:px-16">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 dark:from-violet-900 dark:via-fuchsia-900 dark:to-orange-900"
            aria-hidden
          />
          <div className="pointer-events-none absolute -left-8 top-8 h-24 w-24 rounded-full bg-white/15 blur-sm" aria-hidden />
          <div className="pointer-events-none absolute -right-6 bottom-6 h-32 w-32 rounded-full bg-orange-300/25 blur-md" aria-hidden />
          <div className="relative">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/80">Start today</p>
            <h2 id="cta-heading" className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
              Start your learning journey today
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base font-semibold text-white/90">
              Join Training Sphere to align students, trainers, universities, and employers on one verified pathway—from
              onboarding to certification.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-full bg-white px-10 py-4 text-sm font-extrabold text-violet-700 shadow-lg transition hover:bg-violet-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-violet-600"
              >
                Join Training Sphere
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-full border-2 border-white/70 bg-white/10 px-8 py-4 text-sm font-extrabold text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-violet-600"
              >
                Schedule a briefing
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

export default HomeCta
