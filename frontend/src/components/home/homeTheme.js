/** Playful kids-learning visual tokens for the marketing home page. */

export const homePageShell = 'bg-[#FFF9F2] text-slate-800 transition-colors dark:bg-slate-950 dark:text-slate-100'

export const sectionEyebrow =
  'inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-orange-600 dark:bg-orange-950/50 dark:text-orange-300'

export const sectionTitle =
  'text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl'

export const sectionSubtitle = 'mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400'

export const btnPrimary =
  'inline-flex items-center justify-center rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 ring-2 ring-white/20 transition hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 focus-visible:outline focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950'

export const btnSecondary =
  'inline-flex items-center justify-center rounded-full border-2 border-violet-200 bg-white px-8 py-3.5 text-sm font-bold text-violet-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:border-violet-700 dark:bg-slate-900 dark:text-violet-200 dark:hover:bg-violet-950/40 dark:focus-visible:ring-offset-slate-950'

export const cardPlayful =
  'rounded-[1.75rem] border border-violet-100/80 bg-white p-6 shadow-[0_18px_40px_-24px_rgba(109,40,217,0.35)] transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_22px_48px_-20px_rgba(109,40,217,0.4)] dark:border-slate-700 dark:bg-slate-900 dark:hover:border-violet-700/50'

export const accentPalette = [
  { bg: 'bg-violet-100', text: 'text-violet-700', ring: 'ring-violet-200', darkBg: 'dark:bg-violet-950/50', darkText: 'dark:text-violet-300' },
  { bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-200', darkBg: 'dark:bg-orange-950/50', darkText: 'dark:text-orange-300' },
  { bg: 'bg-sky-100', text: 'text-sky-700', ring: 'ring-sky-200', darkBg: 'dark:bg-sky-950/50', darkText: 'dark:text-sky-300' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200', darkBg: 'dark:bg-emerald-950/50', darkText: 'dark:text-emerald-300' },
  { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-200', darkBg: 'dark:bg-amber-950/50', darkText: 'dark:text-amber-300' },
  { bg: 'bg-pink-100', text: 'text-pink-700', ring: 'ring-pink-200', darkBg: 'dark:bg-pink-950/50', darkText: 'dark:text-pink-300' },
]

export function accentAt(index) {
  return accentPalette[index % accentPalette.length]
}

/** Shared chrome for the fixed sidebar and mobile drawer. */
export const sidebarShell =
  'border-r border-violet-100/90 bg-[#FFF9F2]/95 font-display shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95'

export const sidebarFocusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF9F2] dark:focus-visible:ring-violet-400/80 dark:focus-visible:ring-offset-slate-950'

export const sidebarLinkActive =
  'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-md shadow-violet-500/25'

export const sidebarLinkInactive =
  'text-slate-700 hover:bg-violet-50/90 hover:text-violet-900 dark:text-slate-300 dark:hover:bg-violet-950/40 dark:hover:text-violet-100'

export const sidebarFooterBorder = 'border-t border-violet-100 dark:border-slate-800'

export const sidebarMutedLabel = 'text-xs font-extrabold uppercase tracking-wider text-violet-600/80 dark:text-violet-400/90'

/** App-wide page background — use on dashboards, auth, and workspace routes. */
export const pageShell = `${homePageShell} min-h-dvh font-display`

export const workspaceCard =
  'rounded-3xl border border-violet-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900'

export const workspaceHeroGradient =
  'rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white'

export const formInput =
  'w-full rounded-xl border border-violet-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950'

export const linkAccent =
  'font-semibold text-violet-700 transition hover:text-violet-600 dark:text-violet-300 dark:hover:text-violet-200'
