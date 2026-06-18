/**
 * Overview / workspace toggle button with active styles (no navigation).
 */
function CollapsibleWorkspaceToggle({ id, label, isActive, onToggle, variant = 'default', badgeCount = 0 }) {
  const base =
    'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900'

  const styles = {
    primary: isActive
      ? 'bg-violet-700 text-white shadow-sm ring-2 ring-violet-300 dark:bg-violet-500 dark:ring-violet-600'
      : 'bg-violet-600 text-white shadow-sm shadow-violet-600/25 hover:bg-violet-500 dark:bg-violet-500 dark:hover:bg-violet-400',
    default: isActive
      ? 'border-2 border-violet-500 bg-violet-50 text-violet-900 dark:border-violet-400 dark:bg-violet-950/50 dark:text-violet-100'
      : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
    accent: isActive
      ? 'border-2 border-violet-500 bg-violet-100 text-violet-950 dark:border-violet-400 dark:bg-violet-950/60 dark:text-violet-100'
      : 'border border-violet-300 bg-violet-50 text-violet-900 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100 dark:hover:bg-violet-950/60',
  }

  return (
    <button
      type="button"
      id={`workspace-toggle-${id}`}
      aria-expanded={isActive}
      aria-controls={`workspace-panel-${id}`}
      onClick={() => onToggle(id)}
      className={`${base} ${styles[variant] ?? styles.default}`}
    >
      {label}
      {badgeCount > 0 ? (
        <span className="ml-1 inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-bold text-white">
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      ) : null}
    </button>
  )
}

export default CollapsibleWorkspaceToggle
