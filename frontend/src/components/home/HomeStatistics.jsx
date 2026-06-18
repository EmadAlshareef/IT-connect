import PropTypes from 'prop-types'
import { motion } from 'framer-motion'
import { fadeUp, staggerParent, staggerItem, viewportOnce } from './homeAnimations.js'
import { accentAt, sectionEyebrow, sectionSubtitle, sectionTitle } from './homeTheme.js'

function HomeStatistics({ metrics }) {
  const items = [
    { label: 'Students trained', value: `${metrics.students}+`, hint: 'Across active programs' },
    { label: 'Active trainers', value: String(metrics.trainers), hint: 'Mentoring on-platform' },
    { label: 'Partner organizations', value: `${metrics.companies}+`, hint: 'Universities & employers' },
    { label: 'Internships completed', value: `${metrics.internshipsCompleted}+`, hint: 'Structured placements' },
    { label: 'Program success rate', value: metrics.successRate, hint: 'Completion & evaluation pass' },
  ]

  return (
    <motion.section
      className="bg-[#F5F0FF] py-16 font-display transition-colors dark:bg-slate-950 sm:py-20"
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      aria-labelledby="stats-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className={sectionEyebrow}>Our impact</p>
          <h2 id="stats-heading" className={`mt-3 ${sectionTitle}`}>
            Numbers that matter on campus
          </h2>
          <p className={sectionSubtitle}>
            Transparent metrics your leadership team and partners can stand behind.
          </p>
        </div>

        <motion.ul
          className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
          role="list"
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          {items.map((item, index) => {
            const accent = accentAt(index)
            return (
              <motion.li
                key={item.label}
                variants={staggerItem}
                className="rounded-[1.75rem] border border-violet-100/70 bg-white p-6 text-center shadow-[0_16px_36px_-22px_rgba(109,40,217,0.28)] transition hover:-translate-y-1 dark:border-slate-700 dark:bg-slate-900"
              >
                <p className={`text-3xl font-black tabular-nums sm:text-[1.75rem] ${accent.text} ${accent.darkText}`}>
                  {item.value}
                </p>
                <p className="mt-2 text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {item.label}
                </p>
                <p className="mt-2 text-[11px] font-medium text-slate-400 dark:text-slate-500">{item.hint}</p>
              </motion.li>
            )
          })}
        </motion.ul>
      </div>
    </motion.section>
  )
}

HomeStatistics.propTypes = {
  metrics: PropTypes.shape({
    students: PropTypes.number.isRequired,
    trainers: PropTypes.number.isRequired,
    companies: PropTypes.number.isRequired,
    internshipsCompleted: PropTypes.number.isRequired,
    successRate: PropTypes.string.isRequired,
  }).isRequired,
}

export default HomeStatistics
