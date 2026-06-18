import { motion } from 'framer-motion'

/** IT Connect brand mark — centered inside the hero illustration. */
function HeroCenterLogo({ cx = 260, cy = 200 }) {
  const w = 96
  const h = 108
  const x = cx - w / 2
  const y = cy - h / 2 - 4

  return (
    <motion.g
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
      style={{ transformOrigin: `${cx}px ${cy}px` }}
      role="img"
      aria-label="IT Connect"
    >
      <rect x={x + 2} y={y + 3} width={w} height={h} rx={22} fill="#0F172A" opacity="0.07" />
      <rect x={x} y={y} width={w} height={h} rx={22} fill="#fff" stroke="#C7D2FE" strokeWidth="2" />
      <rect x={x + 14} y={y + 14} width={68} height={68} rx={18} fill="url(#hero-center-logo-grad)" />
      <rect
        x={x + 14}
        y={y + 14}
        width={68}
        height={68}
        rx={18}
        fill="url(#hero-center-logo-shine)"
        opacity="0.55"
      />
      <text
        x={cx}
        y={cy + 6}
        textAnchor="middle"
        fill="#fff"
        fontSize="24"
        fontFamily="system-ui, sans-serif"
        fontWeight="800"
      >
        IT
      </text>
      <text
        x={cx}
        y={cy + 44}
        textAnchor="middle"
        fill="#1E3A8A"
        fontSize="12"
        fontFamily="system-ui, sans-serif"
        fontWeight="800"
      >
        IT Connect
      </text>
    </motion.g>
  )
}

export const heroCenterLogoDefs = (
  <>
    <linearGradient id="hero-center-logo-grad" x1="0" y1="0" x2="1" y2="1">
      <stop stopColor="#1E3A8A" />
      <stop offset="0.5" stopColor="#4338CA" />
      <stop offset="1" stopColor="#6D28D9" />
    </linearGradient>
    <linearGradient id="hero-center-logo-shine" x1="0" y1="0" x2="1" y2="1">
      <stop stopColor="#fff" stopOpacity="0" />
      <stop offset="0.5" stopColor="#fff" stopOpacity="0.35" />
      <stop offset="1" stopColor="#67E8F9" stopOpacity="0.2" />
    </linearGradient>
  </>
)

export default HeroCenterLogo
