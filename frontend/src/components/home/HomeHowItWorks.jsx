import { motion } from 'framer-motion'
import {
  Award,
  BookOpen,
  Building2,
  ClipboardCheck,
  LayoutDashboard,
  ListChecks,
} from 'lucide-react'

import { fadeUp, staggerParent, staggerItem, viewportOnce } from './homeAnimations.js'
import { platformHighlights } from './homeContent.js'
import { accentAt, sectionEyebrow, sectionSubtitle, sectionTitle } from './homeTheme.js'

const HIGHLIGHT_ICONS = {
  book: BookOpen,
  building: Building2,
  clipboard: ClipboardCheck,
  checklist: ListChecks,
  layout: LayoutDashboard,
  award: Award,
}

function HomeHowItWorks() {
  return (
    <motion.section
      id="how-it-works"
      className="scroll-mt-24 bg-[#F5F0FF] py-16 font-display transition-colors dark:border-slate-800 dark:bg-slate-950 sm:py-20 lg:py-24"
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      aria-labelledby="how-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className={sectionEyebrow}>Why choose us</p>
          <h2 id="how-heading" className={`mt-3 ${sectionTitle}`}>
            Everything you need to run training
          </h2>
          <p className={sectionSubtitle}>
            From catalog enrollment to company programs, evaluations, and credentials—all in one platform.
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
          {platformHighlights.map((item, index) => {
            const Icon = HIGHLIGHT_ICONS[item.icon] ?? BookOpen
            const accent = accentAt(index)
            return (
              <motion.li
                key={item.key}
                variants={staggerItem}
                whileHover={{ y: -6, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } }}
                className="flex flex-col rounded-[1.75rem] border border-violet-100/70 bg-white p-6 shadow-[0_16px_36px_-22px_rgba(109,40,217,0.28)] transition hover:border-violet-200 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-violet-700/50"
              >
                <span
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-2 ${accent.bg} ${accent.text} ${accent.ring} ${accent.darkBg} ${accent.darkText}`}
                >
                  <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-extrabold text-slate-900 dark:text-slate-100">{item.title}</h3>
                <p className="mt-3 flex-1 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">{item.body}</p>
              </motion.li>
            )
          })}
        </motion.ul>
      </div>
    </motion.section>
  )
}

export default HomeHowItWorks
