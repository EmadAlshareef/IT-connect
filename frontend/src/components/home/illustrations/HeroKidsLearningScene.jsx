import { useId } from 'react'
import { motion } from 'framer-motion'

import HeroCenterLogo, { heroCenterLogoDefs } from './HeroCenterLogo.jsx'
import HeroLanguageLogos, { heroLogoCenter } from './HeroLanguageLogos.jsx'

/** Programming hero — language ring, center logo, and dev accents. */
function HeroKidsLearningScene() {
  const id = useId().replace(/:/g, '')
  const glowId = `hero-glow-${id}`

  return (
    <svg
      className="h-auto w-full max-h-[min(440px,54vw)]"
      viewBox="0 0 520 420"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby={`prog-hero-title-${id}`}
    >
      <title id={`prog-hero-title-${id}`}>
        IT Connect surrounded by programming language logos and development accents
      </title>
      <defs>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop stopColor="#EEF2FF" stopOpacity="0.9" />
          <stop offset="1" stopColor="#FFFDF8" stopOpacity="0" />
        </radialGradient>
        {heroCenterLogoDefs}
      </defs>

      {/* Soft panel */}
      <rect x="20" y="24" width="480" height="372" rx="36" fill="#FFFDF8" stroke="#E9D5FF" strokeWidth="1.5" />

      {/* Center glow */}
      <circle cx={heroLogoCenter.x} cy={heroLogoCenter.y} r={78} fill={`url(#${glowId})`} />

      {/* Orbit ring */}
      <circle
        cx={heroLogoCenter.x}
        cy={heroLogoCenter.y}
        r={112}
        stroke="#C4B5FD"
        strokeWidth="1.5"
        strokeDasharray="6 8"
        opacity="0.45"
      />

      {/* Language logos — ring layout */}
      <HeroLanguageLogos />

      {/* Center brand logo */}
      <HeroCenterLogo cx={heroLogoCenter.x} cy={heroLogoCenter.y} />

      {/* Extra dev accents */}
      <motion.g animate={{ opacity: [0.35, 0.75, 0.35] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
        <text x="52" y="58" fill="#8B5CF6" fontSize="11" fontFamily="ui-monospace, monospace" fontWeight="700">
          {'{ }'}
        </text>
        <text x="448" y="72" fill="#38BDF8" fontSize="10" fontFamily="ui-monospace, monospace" fontWeight="700">
          {'</>'}
        </text>
        <text x="56" y="368" fill="#10B981" fontSize="9" fontFamily="ui-monospace, monospace">
          fn()
        </text>
        <text x="430" y="360" fill="#94A3B8" fontSize="8" fontFamily="ui-monospace, monospace">
          10110
        </text>
      </motion.g>

      {/* Git nodes — top */}
      <motion.g animate={{ y: [0, -4, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
        <circle cx="108" cy="118" r="5" fill="#6366F1" />
        <circle cx="132" cy="106" r="4" fill="#8B5CF6" />
        <circle cx="156" cy="118" r="5" fill="#6366F1" />
        <path d="M108 118 L132 106 L156 118" stroke="#A5B4FC" strokeWidth="1.5" strokeDasharray="3 3" />
      </motion.g>

      {/* Terminal — bottom */}
      <motion.g
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
      >
        <rect x="186" y="340" width="148" height="40" rx="12" fill="#0F172A" stroke="#334155" strokeWidth="1.5" />
        <circle cx="202" cy="352" r="3" fill="#F87171" />
        <circle cx="214" cy="352" r="3" fill="#FBBF24" />
        <circle cx="226" cy="352" r="3" fill="#4ADE80" />
        <text x="198" y="370" fill="#4ADE80" fontSize="9" fontFamily="ui-monospace, monospace" fontWeight="600">
          {'> npm run learn'}
        </text>
      </motion.g>

      {/* Small API badge — right */}
      <motion.g
        animate={{ y: [0, -6, 0], rotate: [0, 3, 0] }}
        transition={{ duration: 5.4, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
        style={{ transformOrigin: '430px 300px' }}
      >
        <rect x="404" y="284" width="56" height="32" rx="8" fill="#fff" stroke="#86EFAC" strokeWidth="1.5" />
        <text x="432" y="304" textAnchor="middle" fill="#16A34A" fontSize="8" fontFamily="ui-monospace, monospace" fontWeight="700">
          API
        </text>
      </motion.g>

      {/* Database icon — left */}
      <motion.g
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 0.35 }}
        style={{ transformOrigin: '72px 300px' }}
      >
        <ellipse cx="72" cy="292" rx="14" ry="5" fill="#38BDF8" />
        <rect x="58" y="292" width="28" height="22" fill="#7DD3FC" />
        <ellipse cx="72" cy="314" rx="14" ry="5" fill="#0EA5E9" />
      </motion.g>
    </svg>
  )
}

export default HeroKidsLearningScene
