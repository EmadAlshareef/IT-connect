import { useId } from 'react'
import { motion } from 'framer-motion'

/**
 * Custom vector illustration: collaborative learning, internship pathway, mentor + learner.
 * Gradients use useId() to avoid clashes when multiple instances mount.
 */
function HeroEducationScene() {
  const id = useId().replace(/:/g, '')
  const gradMain = `h-main-${id}`
  const gradScreen = `h-screen-${id}`
  const gradPath = `h-path-${id}`

  const floatSlow = {
    animate: { y: [0, -6, 0], x: [0, 2, 0] },
    transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
  }
  const floatMed = {
    animate: { y: [0, -10, 0] },
    transition: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' },
  }
  return (
    <svg
      className="h-auto w-full max-h-[min(420px,52vw)] text-inherit"
      viewBox="0 0 520 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby={`hero-svg-title-${id}`}
    >
      <title id={`hero-svg-title-${id}`}>
        Illustration of students and a trainer collaborating through digital learning and internships
      </title>
      <defs>
        <linearGradient id={gradMain} x1="80" y1="40" x2="440" y2="360" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1e3a8a" />
          <stop offset="0.5" stopColor="#5b21b6" />
          <stop offset="1" stopColor="#0891b2" />
        </linearGradient>
        <linearGradient id={gradScreen} x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="#dbeafe" />
          <stop offset="1" stopColor="#e0e7ff" />
        </linearGradient>
        <linearGradient id={gradPath} x1="0" y1="0" x2="280" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60a5fa" stopOpacity="0.2" />
          <stop offset="0.5" stopColor="#a78bfa" stopOpacity="0.55" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0.35" />
        </linearGradient>
      </defs>

      {/* Soft panel */}
      <rect x="24" y="28" width="472" height="344" rx="32" fill="#fafafa" stroke="#e2e8f0" strokeWidth="1.5" />
      <rect x="44" y="48" width="432" height="120" rx="20" fill="url(#gradScreen)" opacity="0.55" />

      {/* Connection arc */}
      <motion.path
        d="M 100 240 Q 260 140 420 240"
        stroke={`url(#${gradPath})`}
        strokeWidth="3"
        strokeDasharray="8 12"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* Network dots */}
      {[140, 260, 380].map((cx, i) => (
        <motion.circle
          key={cx}
          cx={cx}
          cy={188}
          r={5}
          fill="#6366f1"
          animate={{ opacity: [0.35, 0.92, 0.35] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.28 }}
        />
      ))}

      {/* Student + laptop (left) */}
      <motion.g {...floatSlow}>
        <rect x="72" y="232" width="112" height="72" rx="14" fill="#fff" stroke="#cbd5e1" strokeWidth="2" />
        <rect x="86" y="246" width="84" height="44" rx="6" fill="#eff6ff" stroke="#93c5fd" strokeWidth="1.5" />
        <rect x="94" y="258" width="24" height="20" rx="2" fill="#3b82f6" opacity="0.85" />
        <rect x="124" y="258" width="36" height="8" rx="2" fill="#c7d2fe" />
        <rect x="124" y="270" width="28" height="8" rx="2" fill="#e0e7ff" />
        <circle cx="128" cy="210" r="22" fill="#fff" stroke={`url(#${gradMain})`} strokeWidth="3" />
        <path d="M118 208 L126 216 L138 202" stroke={`url(#${gradMain})`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>

      {/* Trainer + internship brief (right) */}
      <motion.g {...floatMed}>
        <rect x="348" y="224" width="120" height="88" rx="14" fill="#fff" stroke="#cbd5e1" strokeWidth="2" />
        <rect x="362" y="238" width="92" height="56" rx="8" fill="#faf5ff" stroke="#ddd6fe" strokeWidth="1.5" />
        <path d="M376 268 L408 268 M376 278 L428 278 M376 258 L396 258" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" />
        <circle cx="408" cy="198" r="24" fill="#fff" stroke={`url(#${gradMain})`} strokeWidth="3" />
        <rect x="396" y="182" width="24" height="8" rx="2" fill="#1e3a8a" opacity="0.35" />
      </motion.g>

      {/* Central device — internship portal */}
      <motion.g
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <rect x="214" y="168" width="92" height="120" rx="16" fill="#fff" stroke={`url(#${gradMain})`} strokeWidth="3" />
        <rect x="226" y="182" width="68" height="48" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />
        <rect x="234" y="206" width="16" height="16" rx="2" fill="#06b6d4" opacity="0.9" />
        <rect x="256" y="206" width="30" height="6" rx="2" fill="#94a3b8" />
        <rect x="256" y="216" width="22" height="6" rx="2" fill="#cbd5e1" />
        <text
          x="260"
          y="258"
          textAnchor="middle"
          fill="#475569"
          fontSize="10"
          fontFamily="system-ui, sans-serif"
          fontWeight="600"
        >
          <tspan x="260" dy="0">
            Training
          </tspan>
          <tspan x="260" dy="12">
            Sphere
          </tspan>
        </text>
      </motion.g>

      {/* Flying abstract shapes */}
      <motion.rect
        x="460"
        y="72"
        width="36"
        height="36"
        rx="10"
        rotate={12}
        fill="#dbeafe"
        stroke="#93c5fd"
        strokeWidth="1.5"
        animate={{ rotate: [12, 18, 12], y: [0, -12, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.circle
        cx="56"
        cy="104"
        r="14"
        fill="#ede9fe"
        stroke="#c4b5fd"
        strokeWidth="1.5"
        animate={{ scale: [1, 1.12, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  )
}

export default HeroEducationScene
