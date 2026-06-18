import { Clock, Mail, MessageSquare, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from '../constants/contact.js'
import HomeFooter from '../components/home/HomeFooter.jsx'
import {
  accentAt,
  cardPlayful,
  homePageShell,
  sectionEyebrow,
  sectionSubtitle,
  sectionTitle,
} from '../components/home/homeTheme.js'

function ContactPage() {
  const emailAccent = accentAt(0)
  const phoneAccent = accentAt(1)

  return (
    <div className={`${homePageShell} min-h-full font-display`}>
      <main className="px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <header className="mx-auto max-w-3xl text-center">
            <p className={sectionEyebrow}>Get in touch</p>
            <h1 className={`mt-3 ${sectionTitle}`}>Contact Training Sphere</h1>
            <p className={sectionSubtitle}>
              Whether you&apos;re a student exploring internships, a company posting opportunities, or an institution rolling out
              training—we&apos;re here to help with onboarding, demos, and support.
            </p>
          </header>

          <div className="mt-14 grid gap-6 lg:grid-cols-3 lg:gap-8">
            <div className="space-y-6 lg:col-span-2">
              <section className={cardPlayful}>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-50">Direct contact</h2>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">
                  Prefer email or phone? Use either channel below. Include your role (student, company, trainer, admin) and a short
                  summary so we can route your message quickly.
                </p>

                <ul className="mt-6 flex flex-col gap-4 sm:gap-5">
                  <li>
                    <a
                      href={`mailto:${CONTACT_EMAIL}?subject=Training%20Sphere%20inquiry`}
                      className="group flex gap-4 rounded-2xl border-2 border-violet-100 bg-violet-50/50 p-4 transition hover:border-violet-200 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-950/50 dark:hover:border-violet-700/50 dark:hover:bg-slate-800/80"
                    >
                      <span
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-2 ${emailAccent.bg} ${emailAccent.text} ${emailAccent.ring} ${emailAccent.darkBg} ${emailAccent.darkText}`}
                      >
                        <Mail className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Email</p>
                        <p className="mt-0.5 break-all text-sm font-extrabold text-violet-700 group-hover:underline dark:text-violet-400">
                          {CONTACT_EMAIL}
                        </p>
                      </div>
                    </a>
                  </li>
                  <li>
                    <a
                      href={`tel:${CONTACT_PHONE_TEL}`}
                      className="group flex gap-4 rounded-2xl border-2 border-violet-100 bg-violet-50/50 p-4 transition hover:border-violet-200 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-950/50 dark:hover:border-violet-700/50 dark:hover:bg-slate-800/80"
                    >
                      <span
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-2 ${phoneAccent.bg} ${phoneAccent.text} ${phoneAccent.ring} ${phoneAccent.darkBg} ${phoneAccent.darkText}`}
                      >
                        <Phone className="h-5 w-5" aria-hidden />
                      </span>
                      <div>
                        <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Phone</p>
                        <p className="mt-0.5 text-sm font-extrabold text-slate-900 group-hover:text-violet-700 dark:text-slate-100 dark:group-hover:text-violet-400">
                          {CONTACT_PHONE_DISPLAY}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Tap to call from your device</p>
                      </div>
                    </a>
                  </li>
                </ul>
              </section>

              <section className={cardPlayful}>
                <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-slate-50">
                  <MessageSquare className="h-5 w-5 text-violet-600 dark:text-violet-400" aria-hidden />
                  What we can help with
                </h2>
                <ul className="mt-4 list-inside list-disc space-y-2 text-sm font-medium leading-relaxed text-slate-600 marker:text-violet-600 dark:text-slate-400 dark:marker:text-violet-400">
                  <li>Student access, internships, applications, and progress questions</li>
                  <li>Company listings, hiring workflows, and trainer coordination</li>
                  <li>Platform demos for universities and training administrators</li>
                  <li>Technical issues, account access, and general product feedback</li>
                </ul>
              </section>
            </div>

            <aside className="space-y-6">
              <div className={`${cardPlayful} bg-gradient-to-b from-violet-50/80 to-white dark:from-slate-900 dark:to-slate-950`}>
                <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-slate-50">
                  <Clock className="h-5 w-5 text-violet-600 dark:text-violet-400" aria-hidden />
                  Availability
                </h2>
                <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">
                  We typically reply to email within{' '}
                  <strong className="font-extrabold text-slate-800 dark:text-slate-200">1–2 business days</strong>. For urgent
                  matters, call during the hours below.
                </p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="font-extrabold text-slate-900 dark:text-slate-100">Phone hours</dt>
                    <dd className="mt-0.5 font-medium text-slate-600 dark:text-slate-400">Monday–Friday, 9:00–17:00 (local time)</dd>
                  </div>
                  <div>
                    <dt className="font-extrabold text-slate-900 dark:text-slate-100">Evenings & weekends</dt>
                    <dd className="mt-0.5 font-medium text-slate-600 dark:text-slate-400">
                      Email is best—we&apos;ll pick it up on the next working day
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-[1.75rem] border-2 border-dashed border-violet-200 bg-white p-6 dark:border-slate-600 dark:bg-slate-900 sm:p-8">
                <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Before you write</p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">
                  Adding your institution or company name, and whether you need student or employer access, helps us respond with
                  the right next steps.
                </p>
                <Link
                  to="/services"
                  className="mt-4 inline-flex text-sm font-extrabold text-violet-700 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300"
                >
                  View platform services →
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <HomeFooter />
    </div>
  )
}

export default ContactPage
