import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

import { sidebarFocusRing } from '../../home/homeTheme.js'

function NavbarLogo({ onNavigate }) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="shrink-0">
      <Link
        to="/"
        className={`group flex items-center gap-3 rounded-xl outline-none transition ${sidebarFocusRing}`}
        onClick={onNavigate}
        aria-label="IT Connect home"
      >
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 shadow-lg shadow-blue-900/25 ring-1 ring-cyan-400/30">
          <span
            className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/25 to-cyan-300/20 opacity-60"
            aria-hidden
          />
          <span className="relative text-[13px] font-bold tracking-tight text-white drop-shadow-sm">IT</span>
        </span>
        <span className="hidden text-lg font-bold tracking-tight text-slate-900 transition group-hover:text-blue-900 dark:text-slate-100 dark:group-hover:text-blue-300 sm:inline">
          IT Connect
        </span>
      </Link>
    </motion.div>
  )
}

NavbarLogo.propTypes = {
  onNavigate: PropTypes.func,
}

NavbarLogo.defaultProps = {
  onNavigate: undefined,
}

export default NavbarLogo
