import { motion } from 'framer-motion'

const BADGE = 48

function ringSlot(index, total, cx, cy, radius) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2
  return {
    x: cx + radius * Math.cos(angle) - BADGE / 2,
    y: cy + radius * Math.sin(angle) - BADGE / 2,
    rotate: (Math.sin(angle) * 4),
    delay: index * 0.12,
  }
}

function LangBadge({ x, y, label, children, delay = 0, rotate = 0 }) {
  return (
    <motion.g
      animate={{ y: [0, -5, 0], rotate: [rotate, rotate + 2, rotate] }}
      transition={{ duration: 4.8 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
      style={{ transformOrigin: `${x + BADGE / 2}px ${y + BADGE / 2}px` }}
      role="img"
      aria-label={label}
    >
      <rect x={x + 1} y={y + 2} width={BADGE} height={BADGE} rx={14} fill="#0F172A" opacity="0.06" />
      <rect x={x} y={y} width={BADGE} height={BADGE} rx={14} fill="#fff" stroke="#E2E8F0" strokeWidth="1.5" />
      <g transform={`translate(${x} ${y})`}>{children}</g>
    </motion.g>
  )
}

function LogoJavaScript() {
  return (
    <>
      <rect x={4} y={4} width={40} height={40} rx={10} fill="#F7DF1E" />
      <text x={24} y={30} textAnchor="middle" fill="#323330" fontSize="14" fontFamily="ui-monospace, monospace" fontWeight="800">
        JS
      </text>
    </>
  )
}

function LogoPython() {
  return (
    <>
      <rect x={4} y={4} width={40} height={40} rx={10} fill="#306998" />
      <path
        d="M30 18 C35 18 38 22 36 26 C35 29 31 30 28 29 C25 28 24 25 25 22 C26 20 28 18 30 18 Z"
        fill="#FFD43B"
      />
      <path
        d="M18 30 C13 30 10 26 12 22 C13 19 17 18 20 19 C23 20 24 23 23 26 C22 28 20 30 18 30 Z"
        fill="#4B8BBE"
      />
      <circle cx={27} cy={22} r={1.6} fill="#fff" />
      <circle cx={27.3} cy={22.3} r={0.8} fill="#C88A00" />
      <circle cx={19} cy={26} r={1.6} fill="#fff" />
      <circle cx={18.7} cy={26.3} r={0.8} fill="#306998" />
    </>
  )
}

function LogoTypeScript() {
  return (
    <>
      <rect x={4} y={4} width={40} height={40} rx={10} fill="#3178C6" />
      <rect x={10} y={14} width={28} height={20} rx={2} fill="none" stroke="#fff" strokeWidth="2" />
      <text x={24} y={29} textAnchor="middle" fill="#fff" fontSize="12" fontFamily="ui-monospace, monospace" fontWeight="800">
        TS
      </text>
    </>
  )
}

function LogoReact() {
  return (
    <>
      <rect x={4} y={4} width={40} height={40} rx={10} fill="#0F172A" />
      <circle cx={24} cy={24} r={3.5} fill="#61DAFB" />
      <ellipse cx={24} cy={24} rx={13} ry={4.5} stroke="#61DAFB" strokeWidth="1.5" fill="none" />
      <ellipse cx={24} cy={24} rx={13} ry={4.5} stroke="#61DAFB" strokeWidth="1.5" fill="none" transform="rotate(60 24 24)" />
      <ellipse cx={24} cy={24} rx={13} ry={4.5} stroke="#61DAFB" strokeWidth="1.5" fill="none" transform="rotate(-60 24 24)" />
    </>
  )
}

function LogoJava() {
  return (
    <>
      <rect x={4} y={4} width={40} height={40} rx={10} fill="#ED8B00" />
      <path d="M18 30 C22 32 28 32 32 30" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M20 22 C18 26 20 30 24 30 M28 22 C30 26 28 30 24 30" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M24 16 C24 20 24 24 24 28" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx={24} cy={16} rx={6} ry={3} fill="#fff" opacity="0.95" />
    </>
  )
}

function LogoCSharp() {
  return (
    <>
      <rect x={4} y={4} width={40} height={40} rx={10} fill="#68217A" />
      <text x={24} y={30} textAnchor="middle" fill="#fff" fontSize="12" fontFamily="ui-monospace, monospace" fontWeight="800">
        C#
      </text>
    </>
  )
}

function LogoGo() {
  return (
    <>
      <rect x={4} y={4} width={40} height={40} rx={10} fill="#00ADD8" />
      <text x={24} y={22} textAnchor="middle" fill="#fff" fontSize="9" fontFamily="ui-monospace, monospace" fontWeight="800">
        Go
      </text>
      <path d="M14 28 L20 34 L34 20" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  )
}

function LogoNode() {
  return (
    <>
      <rect x={4} y={4} width={40} height={40} rx={10} fill="#339933" />
      <path d="M24 10 L34 18 L34 30 L24 38 L14 30 L14 18 Z" fill="#fff" opacity="0.95" />
      <text x={24} y={28} textAnchor="middle" fill="#339933" fontSize="9" fontFamily="ui-monospace, monospace" fontWeight="800">
        JS
      </text>
    </>
  )
}

const CENTER = { x: 260, y: 200 }
const RING_RADIUS = 112

const languages = [
  { id: 'js', label: 'JavaScript', Logo: LogoJavaScript },
  { id: 'py', label: 'Python', Logo: LogoPython },
  { id: 'react', label: 'React', Logo: LogoReact },
  { id: 'ts', label: 'TypeScript', Logo: LogoTypeScript },
  { id: 'java', label: 'Java', Logo: LogoJava },
  { id: 'csharp', label: 'C#', Logo: LogoCSharp },
  { id: 'go', label: 'Go', Logo: LogoGo },
  { id: 'node', label: 'Node.js', Logo: LogoNode },
].map((lang, index) => ({ ...lang, ...ringSlot(index, 8, CENTER.x, CENTER.y, RING_RADIUS) }))

/** Programming-language logos arranged in a ring around the center. */
function HeroLanguageLogos() {
  return (
    <>
      {languages.map(({ id, x, y, label, Logo, delay, rotate }) => (
        <LangBadge key={id} x={x} y={y} label={label} delay={delay} rotate={rotate}>
          <Logo />
        </LangBadge>
      ))}
    </>
  )
}

export { CENTER as heroLogoCenter }
export default HeroLanguageLogos
