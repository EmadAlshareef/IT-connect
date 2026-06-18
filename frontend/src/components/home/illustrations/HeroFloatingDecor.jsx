import { motion } from 'framer-motion'
import { BookOpen, GitBranch, Sparkles, Target } from 'lucide-react'

const floats = [
  {
    Icon: BookOpen,
    label: 'Learning',
    className: 'left-[6%] top-[8%] sm:left-[4%]',
    duration: 5.2,
    delay: 0,
  },
  {
    Icon: Sparkles,
    label: 'Innovation',
    className: 'right-[4%] top-[14%] sm:right-[2%]',
    duration: 4.4,
    delay: 0.35,
  },
  {
    Icon: GitBranch,
    label: 'Career pathways',
    className: 'left-[2%] bottom-[18%] sm:left-0',
    duration: 5.8,
    delay: 0.2,
  },
  {
    Icon: Target,
    label: 'Goals',
    className: 'right-[8%] bottom-[12%]',
    duration: 4.9,
    delay: 0.55,
  },
]

/** Floating Lucide badges around the hero illustration — decorative only. */
function HeroFloatingDecor() {
  return (
    <>
      {floats.map(({ Icon, label, className, duration, delay }) => (
        <motion.div
          key={label}
          className={`pointer-events-none absolute z-20 hidden rounded-2xl border border-slate-200/90 bg-white/95 p-2.5 shadow-lg shadow-violet-500/10 ring-1 ring-violet-100/80 dark:border-slate-600 dark:bg-slate-800/95 dark:shadow-black/30 dark:ring-slate-600 sm:block ${className}`}
          aria-hidden
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: [0, -10, 0],
          }}
          transition={{
            opacity: { duration: 0.45, delay: delay + 0.15 },
            scale: { duration: 0.45, delay: delay + 0.15 },
            y: { duration, repeat: Infinity, ease: 'easeInOut', delay },
          }}
        >
          <Icon className="h-5 w-5 text-sky-900 dark:text-violet-200" strokeWidth={1.75} aria-hidden />
        </motion.div>
      ))}
    </>
  )
}

export default HeroFloatingDecor
