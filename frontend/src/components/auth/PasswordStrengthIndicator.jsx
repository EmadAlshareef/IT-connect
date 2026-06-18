import { evaluatePasswordStrength } from '../../utils/passwordPolicy.js'

const toneBarClass = {
  weak: 'bg-rose-500',
  fair: 'bg-amber-500',
  good: 'bg-sky-500',
  strong: 'bg-emerald-500',
}

function PasswordStrengthIndicator({ password, showRules = true }) {
  const { checks, score, label, tone } = evaluatePasswordStrength(password)

  if (!password) return null

  return (
    <div className="mt-2 space-y-2" aria-live="polite">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-slate-600 dark:text-slate-400">Password strength</span>
        <span
          className={`font-semibold ${
            tone === 'strong'
              ? 'text-emerald-600 dark:text-emerald-400'
              : tone === 'good'
                ? 'text-sky-600 dark:text-sky-400'
                : tone === 'fair'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {label}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-300 ${toneBarClass[tone] ?? toneBarClass.weak}`}
          style={{ width: `${Math.max(8, Math.round(score * 100))}%` }}
        />
      </div>
      {showRules ? (
        <ul className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
          {checks.map((check) => (
            <li key={check.id} className={check.passed ? 'text-emerald-600 dark:text-emerald-400' : ''}>
              {check.passed ? '✓' : '○'} {check.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export default PasswordStrengthIndicator
