import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

import { fadeUp, staggerParent, staggerItem, viewportOnce } from './homeAnimations.js'
import { platformRoleCards } from './homeContent.js'
import { accentAt, sectionEyebrow, sectionSubtitle, sectionTitle } from './homeTheme.js'

function TypeBadge({ type }) {
  const styles = {
    student: 'bg-violet-100 text-violet-800 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-800/40',
    trainer: 'bg-orange-100 text-orange-800 ring-orange-200 dark:bg-orange-950/50 dark:text-orange-200 dark:ring-orange-800/40',
    company: 'bg-sky-100 text-sky-800 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-800/40',
    admin: 'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-800/40',
  }
  const labels = {
    student: 'Student portal',
    trainer: 'Trainer workspace',
    company: 'Company dashboard',
    admin: 'Admin console',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ring-2 ${styles[type] ?? styles.student}`}>
      {labels[type] ?? type}
    </span>
  )
}

function HomeTestimonials() {
  return (
    <motion.section
      id="testimonials"
      className="scroll-mt-24 bg-white py-16 font-display transition-colors dark:bg-slate-950 sm:py-20 lg:py-24"
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      aria-labelledby="stories-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className={sectionEyebrow}>What people say</p>
          <h2 id="stories-heading" className={`mt-3 ${sectionTitle}`}>
            One platform for every role
          </h2>
          <p className={sectionSubtitle}>
            Students, trainers, companies, and admins each get a dedicated workspace connected to the same training lifecycle.
          </p>
        </div>

        <div className="mt-12 -mx-4 snap-x snap-mandatory overflow-x-auto pb-2 sm:mx-0 sm:snap-none sm:overflow-visible">
          <motion.ul
            className="flex min-w-min gap-5 px-4 sm:grid sm:min-w-0 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 sm:px-0"
            role="list"
            variants={staggerParent}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
          >
            {platformRoleCards.map((card, index) => {
              const accent = accentAt(index)
              return (
                <motion.li
                  key={card.key}
                  variants={staggerItem}
                  className="w-[min(100vw-3rem,22rem)] shrink-0 snap-start sm:w-auto"
                >
                  <article className="flex h-full flex-col rounded-[1.75rem] border border-violet-100 bg-white p-6 shadow-[0_16px_36px_-22px_rgba(109,40,217,0.28)] transition hover:-translate-y-1 hover:border-violet-200 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-violet-700/50">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black text-white bg-gradient-to-br ${index % 2 === 0 ? 'from-violet-500 to-fuchsia-500' : 'from-orange-400 to-amber-500'}`}
                        aria-hidden
                      >
                        {card.title.slice(0, 1)}
                      </span>
                      <TypeBadge type={card.type} />
                    </div>
                    <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-slate-100">{card.title}</h3>
                    <p className="mt-3 flex-1 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">{card.body}</p>
                    <ul className="mt-5 space-y-2 border-t border-violet-100 pt-5 dark:border-slate-700" role="list">
                      {card.highlights.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${accent.bg} ${accent.text} ${accent.darkBg} ${accent.darkText}`}>
                            <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                </motion.li>
              )
            })}
          </motion.ul>
        </div>
      </div>
    </motion.section>
  )
}

export default HomeTestimonials
