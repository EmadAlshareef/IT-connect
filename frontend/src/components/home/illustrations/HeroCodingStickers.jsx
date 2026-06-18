import { motion } from 'framer-motion'

/** Shared peel-shadow sticker backing. */
function StickerShell({ x, y, w, h, rotate = 0, children, label }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate} ${w / 2} ${h / 2})`} role="img" aria-label={label}>
      <rect x={2} y={3} width={w} height={h} rx={10} fill="#0F172A" opacity="0.08" />
      <rect x={0} y={0} width={w} height={h} rx={10} fill="#fff" stroke="#E2E8F0" strokeWidth="1.5" />
      <rect x={0} y={0} width={w} height={h} rx={10} fill="url(#sticker-gloss)" opacity="0.45" />
      {children}
    </g>
  )
}

/** Geometric low-poly T-Rex — dev culture sticker. */
export function StickerTrex({ x, y }) {
  return (
    <motion.g
      animate={{ y: [0, -7, 0], rotate: [-6, -3, -6] }}
      transition={{ duration: 5.4, repeat: Infinity, ease: 'easeInOut' }}
      style={{ transformOrigin: `${x + 36}px ${y + 36}px` }}
    >
      <StickerShell x={x} y={y} w={72} h={72} rotate={-8} label="Geometric T-Rex coding sticker">
        <path d="M18 52 L28 22 L42 18 L52 28 L48 44 L36 54 Z" fill="#10B981" />
        <path d="M28 22 L36 30 L42 18 Z" fill="#059669" />
        <path d="M48 44 L58 38 L62 48 L54 56 Z" fill="#34D399" />
        <circle cx="38" cy="30" r="2.5" fill="#064E3B" />
        <path d="M44 34 L54 32" stroke="#064E3B" strokeWidth="2" strokeLinecap="round" />
        <path d="M22 48 L14 52 M22 44 L12 42" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
      </StickerShell>
    </motion.g>
  )
}

/** Linux Tux penguin mascot sticker. */
export function StickerTux({ x, y }) {
  return (
    <motion.g
      animate={{ y: [0, -9, 0], rotate: [5, 9, 5] }}
      transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
      style={{ transformOrigin: `${x + 34}px ${y + 38}px` }}
    >
      <StickerShell x={x} y={y} w={68} h={76} rotate={7} label="Linux Tux sticker">
        <ellipse cx="34" cy="52" rx="18" ry="20" fill="#1E293B" />
        <ellipse cx="34" cy="54" rx="12" ry="14" fill="#F8FAFC" />
        <circle cx="34" cy="30" r="16" fill="#1E293B" />
        <ellipse cx="34" cy="32" rx="10" ry="11" fill="#F8FAFC" />
        <circle cx="28" cy="28" r="3" fill="#0F172A" />
        <circle cx="40" cy="28" r="3" fill="#0F172A" />
        <ellipse cx="34" cy="34" rx="4" ry="3" fill="#F97316" />
        <ellipse cx="26" cy="58" rx="6" ry="4" fill="#F97316" />
        <ellipse cx="42" cy="58" rx="6" ry="4" fill="#F97316" />
      </StickerShell>
    </motion.g>
  )
}

/** Glossy Photoshop-style code sticker. */
export function StickerGlossyCode({ x, y }) {
  return (
    <motion.g
      animate={{ y: [0, -6, 0], scale: [1, 1.03, 1] }}
      transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 0.35 }}
      style={{ transformOrigin: `${x + 40}px ${y + 28}px` }}
    >
      <StickerShell x={x} y={y} w={80} h={56} rotate={-4} label="Glossy code sticker">
        <rect x={8} y={10} width={64} height={36} rx={8} fill="#0F172A" />
        <rect x={8} y={10} width={64} height={10} rx={8} fill="#334155" />
        <circle cx={16} cy={15} r={2} fill="#F87171" />
        <circle cx={24} cy={15} r={2} fill="#FBBF24" />
        <circle cx={32} cy={15} r={2} fill="#4ADE80" />
        <text x={40} y={34} textAnchor="middle" fill="#A78BFA" fontSize="14" fontFamily="ui-monospace, monospace" fontWeight="700">
          {'</>'}
        </text>
        <path d="M12 42 Q40 48 68 42" stroke="#C4B5FD" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
      </StickerShell>
    </motion.g>
  )
}

/** Colorful rabbit + code brackets logo sticker. */
export function StickerRabbitCode({ x, y }) {
  return (
    <motion.g
      animate={{ y: [0, -8, 0], rotate: [0, 4, 0] }}
      transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      style={{ transformOrigin: `${x + 36}px ${y + 40}px` }}
    >
      <StickerShell x={x} y={y} w={72} h={80} rotate={6} label="Rabbit code logo sticker">
        <rect x={8} y={8} width={56} height={64} rx={12} fill="#0F172A" />
        <ellipse cx={28} cy={22} rx={7} ry={16} fill="#F472B6" transform="rotate(-12 28 22)" />
        <ellipse cx={44} cy={22} rx={7} ry={16} fill="#38BDF8" transform="rotate(12 44 22)" />
        <circle cx={36} cy={38} r={14} fill="#F8FAFC" />
        <circle cx={31} cy={36} r={2.5} fill="#0F172A" />
        <circle cx={41} cy={36} r={2.5} fill="#0F172A" />
        <ellipse cx={36} cy={42} rx={3} ry={2} fill="#FDA4AF" />
        <text x={22} y={62} fill="#4ADE80" fontSize="12" fontFamily="ui-monospace, monospace" fontWeight="700">
          {'{'}
        </text>
        <text x={44} y={62} fill="#F472B6" fontSize="12" fontFamily="ui-monospace, monospace" fontWeight="700">
          {'}'}
        </text>
      </StickerShell>
    </motion.g>
  )
}

/** Kawaii doodle laptop sticker. */
export function StickerKawaiiDoodle({ x, y }) {
  return (
    <motion.g
      animate={{ y: [0, -10, 0], rotate: [-3, 3, -3] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
      style={{ transformOrigin: `${x + 38}px ${y + 36}px` }}
    >
      <StickerShell x={x} y={y} w={76} h={72} rotate={-5} label="Kawaii coding doodle sticker">
        <rect x={14} y={16} width={48} height={32} rx={6} fill="#E0E7FF" stroke="#A5B4FC" strokeWidth="1.5" />
        <circle cx={26} cy={30} r={3} fill="#0F172A" />
        <circle cx={38} cy={30} r={3} fill="#0F172A" />
        <path d="M24 38 Q38 44 52 38" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M10 48 L66 48 L72 54 L4 54 Z" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1.5" />
        <path d="M58 10 L62 6 M64 14 L70 12" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
        <circle cx={12} cy={12} r={3} fill="#F472B6" />
        <circle cx={64} cy={8} r={2.5} fill="#38BDF8" />
        <text x={38} y={66} textAnchor="middle" fill="#8B5CF6" fontSize="7" fontFamily="system-ui, sans-serif" fontWeight="700">
          cute.exe
        </text>
      </StickerShell>
    </motion.g>
  )
}

/** "Do not disturb — coder" sign sticker. */
export function StickerCoderSign({ x, y }) {
  return (
    <motion.g
      animate={{ y: [0, -7, 0], rotate: [4, 8, 4] }}
      transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.65 }}
      style={{ transformOrigin: `${x + 40}px ${y + 34}px` }}
    >
      <StickerShell x={x} y={y} w={80} h={68} rotate={5} label="Do not disturb coder sticker">
        <rect x={10} y={12} width={60} height={40} rx={6} fill="#FEF2F2" stroke="#FCA5A5" strokeWidth="2" />
        <circle cx={40} cy={32} r={14} fill="none" stroke="#EF4444" strokeWidth="3" />
        <path d="M30 22 L50 42 M50 22 L30 42" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
        <text x={40} y={58} textAnchor="middle" fill="#991B1B" fontSize="7" fontFamily="ui-monospace, monospace" fontWeight="700">
          CODING
        </text>
        <rect x={54} y={8} width={16} height={10} rx={3} fill="#1E293B" />
        <path d="M58 12 L66 12 M58 15 L64 15" stroke="#4ADE80" strokeWidth="1.5" strokeLinecap="round" />
      </StickerShell>
    </motion.g>
  )
}

/** Gloss gradient used by all stickers — define once in parent SVG defs. */
export const stickerGlossDef = (
  <linearGradient id="sticker-gloss" x1="0" y1="0" x2="1" y2="1">
    <stop stopColor="#fff" stopOpacity="0.9" />
    <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
    <stop offset="1" stopColor="#C4B5FD" stopOpacity="0.25" />
  </linearGradient>
)
