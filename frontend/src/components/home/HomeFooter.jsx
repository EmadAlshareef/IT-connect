import { Link } from 'react-router-dom'
import { Mail, Phone, Sparkles } from 'lucide-react'
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from '../../constants/contact.js'
import { accentAt, cardPlayful, sectionEyebrow, sidebarFocusRing, sidebarMutedLabel } from './homeTheme.js'

const footerLink =
  'inline-flex w-full items-center rounded-2xl px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-violet-50 hover:text-violet-800 dark:text-slate-300 dark:hover:bg-violet-950/40 dark:hover:text-violet-100'

const QUICK_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/companies', label: 'Companies' },
  { to: '/contact', label: 'Contact' },
  { to: '/login', label: 'Sign in' },
]

const SOCIAL_LINKS = [
  { href: 'https://linkedin.com', label: 'LinkedIn', text: 'in', accentIndex: 0 },
  { href: 'https://twitter.com', label: 'X', text: 'X', accentIndex: 1 },
  { href: 'https://youtube.com', label: 'YouTube', text: '▶', accentIndex: 2 },
]

function HomeFooter() {
  const year = new Date().getFullYear()
  const emailAccent = accentAt(0)
  const phoneAccent = accentAt(1)

  return (
    <footer
      className="relative overflow-hidden border-t border-violet-100 bg-[#FFF9F2] font-display transition-colors dark:border-slate-800 dark:bg-slate-950"
      role="contentinfo"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-16 top-8 h-48 w-48 rounded-full bg-violet-200/40 blur-3xl dark:bg-violet-950/30" />
        <div className="absolute -right-12 bottom-0 h-40 w-40 rounded-full bg-orange-200/35 blur-3xl dark:bg-orange-950/20" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-12 lg:gap-6">
          <div className={`lg:col-span-4 ${cardPlayful}`}>
            <Link to="/" className={`group inline-flex items-center gap-3 rounded-2xl ${sidebarFocusRing}`} aria-label="Training Sphere home">
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 shadow-lg shadow-violet-500/30 ring-2 ring-white/30">
                <span className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/25 to-orange-200/30 opacity-70" aria-hidden />
                <Sparkles className="relative h-5 w-5 text-white" strokeWidth={2} aria-hidden />
              </span>
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-lg font-black text-transparent">
                Training Sphere
              </span>
            </Link>
            <p className={sectionEyebrow + ' mt-5'}>Learn & grow</p>
            <p className="mt-4 max-w-sm text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">
              University-grade internship and training infrastructure—trusted by students, faculty, and hiring partners.
            </p>
          </div>

          <div className={`lg:col-span-2 ${cardPlayful} !p-5`}>
            <p className={sidebarMutedLabel}>Quick links</p>
            <ul className="mt-4 flex flex-col gap-1" role="list">
              {QUICK_LINKS.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className={footerLink}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className={`lg:col-span-3 ${cardPlayful} !p-5`}>
            <p className={sidebarMutedLabel}>Contact</p>
            <ul className="mt-4 flex flex-col gap-3" role="list">
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className={`group flex items-start gap-3 rounded-2xl border-2 border-violet-100 bg-violet-50/60 p-3 transition hover:border-violet-200 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-950/50 dark:hover:border-violet-700/50 ${sidebarFocusRing}`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-2 ${emailAccent.bg} ${emailAccent.text} ${emailAccent.ring} ${emailAccent.darkBg} ${emailAccent.darkText}`}
                  >
                    <Mail className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 pt-1">
                    <span className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Email</span>
                    <span className="mt-0.5 block break-all text-sm font-extrabold text-violet-700 group-hover:underline dark:text-violet-400">
                      {CONTACT_EMAIL}
                    </span>
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={`tel:${CONTACT_PHONE_TEL}`}
                  className={`group flex items-start gap-3 rounded-2xl border-2 border-violet-100 bg-violet-50/60 p-3 transition hover:border-violet-200 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-950/50 dark:hover:border-violet-700/50 ${sidebarFocusRing}`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-2 ${phoneAccent.bg} ${phoneAccent.text} ${phoneAccent.ring} ${phoneAccent.darkBg} ${phoneAccent.darkText}`}
                  >
                    <Phone className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="pt-1">
                    <span className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Phone</span>
                    <span className="mt-0.5 block text-sm font-extrabold text-slate-800 group-hover:text-violet-700 dark:text-slate-100 dark:group-hover:text-violet-400">
                      {CONTACT_PHONE_DISPLAY}
                    </span>
                  </span>
                </a>
              </li>
              <li className="px-1 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">
                Demos, partnerships, and support for students, companies, and institutions.
              </li>
            </ul>
          </div>

          <div className={`lg:col-span-3 ${cardPlayful} !p-5`}>
            <p className={sidebarMutedLabel}>Follow</p>
            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">
              Stay connected for program updates, student success stories, and partnership news.
            </p>
            <ul className="mt-5 flex flex-wrap gap-3" role="list">
              {SOCIAL_LINKS.map((social) => {
                const accent = accentAt(social.accentIndex)
                return (
                  <li key={social.label}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ring-2 transition hover:-translate-y-0.5 hover:shadow-md ${accent.bg} ${accent.text} ${accent.ring} ${accent.darkBg} ${accent.darkText} ${sidebarFocusRing}`}
                      aria-label={`Training Sphere on ${social.label}`}
                    >
                      <span className="text-sm font-extrabold">{social.text}</span>
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-[1.75rem] border-2 border-violet-100/80 bg-white/70 px-5 py-5 text-center text-xs font-medium text-slate-500 shadow-[0_12px_32px_-24px_rgba(109,40,217,0.25)] dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400 sm:flex-row sm:text-left">
          <p className="font-bold text-slate-700 dark:text-slate-300">© {year} Training Sphere. All rights reserved.</p>
          <p className="max-w-md font-medium sm:text-right">
            FERPA-aligned practices recommended. Configure institutional policies with your IT and compliance office.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default HomeFooter
