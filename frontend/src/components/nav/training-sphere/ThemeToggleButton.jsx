import { motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'

import { useTheme } from '../../../context/useTheme.js'
import { sidebarFocusRing } from '../../home/homeTheme.js'

function ThemeToggleButton() {
  const { dark, toggleTheme } = useTheme()

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      onClick={toggleTheme}
      className={`rounded-2xl border-2 border-violet-100 bg-white p-2 text-violet-700 shadow-sm transition-colors duration-300 hover:border-violet-200 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-900 dark:text-violet-300 dark:hover:border-violet-700/50 dark:hover:bg-slate-800 ${sidebarFocusRing}`}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={dark}
    >
      {dark ? (
        <Sun className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      ) : (
        <Moon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      )}
    </motion.button>
  )
}

export default ThemeToggleButton
