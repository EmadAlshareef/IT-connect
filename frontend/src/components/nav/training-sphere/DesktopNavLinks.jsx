import PropTypes from 'prop-types'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PUBLIC_NAV_LINKS } from './navConstants.js'

const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF9F2] dark:focus-visible:ring-violet-400/80 dark:focus-visible:ring-offset-slate-950'

function DesktopNavLinks({ onNavigate }) {
  return (
    <ul className="flex flex-1 flex-wrap items-center justify-center gap-0.5 sm:gap-1" role="list">
      {PUBLIC_NAV_LINKS.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-200 ${focusRing} ${
                isActive
                  ? 'text-violet-900 dark:text-violet-300'
                  : 'text-slate-600 hover:bg-violet-50/90 hover:text-violet-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              }`
            }
          >
            {({ isActive }) => (
              <span className="relative inline-block px-0.5">
                <span className="relative z-10">{item.label}</span>
                {isActive ? (
                  <motion.span
                    layoutId="nav-active-underline"
                    className="absolute -bottom-1 left-0 right-0 mx-auto h-0.5 max-w-[90%] rounded-full bg-gradient-to-r from-violet-700 via-purple-600 to-fuchsia-500 shadow-[0_0_12px_rgba(139,92,246,0.35)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                ) : null}
              </span>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

DesktopNavLinks.propTypes = {
  onNavigate: PropTypes.func,
}

DesktopNavLinks.defaultProps = {
  onNavigate: undefined,
}

export default DesktopNavLinks
