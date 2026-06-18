import { motion } from 'framer-motion'
import { Braces, Terminal } from 'lucide-react'

const shapes = [
  {
    Icon: Terminal,
    label: 'Terminal',
    className: 'left-2 top-2 sm:left-3 sm:top-3',
    tone: 'bg-slate-100 text-slate-700 ring-slate-200/80 dark:bg-slate-800/60 dark:text-slate-200 dark:ring-slate-600/50',
    duration: 5.4,
    delay: 0,
  },
  {
    Icon: Braces,
    label: 'Brackets',
    className: 'bottom-2 right-2 sm:bottom-3 sm:right-4',
    tone: 'bg-violet-50 text-violet-600 ring-violet-200/80 dark:bg-violet-950/60 dark:text-violet-300 dark:ring-violet-800/50',
    duration: 5.8,
    delay: 0.3,
  },
]

/** Minimal floating accents — language logos live inside the SVG. */
function HeroStudyItDecor() {
  return (
    <>
      {shapes.map(({ Icon, label, className, tone, duration, delay }) => (
        <motion.div
          key={label}
          className={`pointer-events-none absolute z-10 flex h-8 w-8 items-center justify-center rounded-xl border border-white/80 p-1.5 shadow-md ring-1 ${tone} ${className}`}
          aria-hidden
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1, y: [0, -6, 0], rotate: [0, -3, 0] }}
          transition={{
            opacity: { duration: 0.4, delay: delay + 0.2 },
            scale: { duration: 0.4, delay: delay + 0.2 },
            y: { duration, repeat: Infinity, ease: 'easeInOut', delay },
            rotate: { duration: duration + 1.5, repeat: Infinity, ease: 'easeInOut', delay },
          }}
        >
          <Icon className="h-full w-full" strokeWidth={1.75} aria-hidden />
        </motion.div>
      ))}
    </>
  )
}

export default HeroStudyItDecor
