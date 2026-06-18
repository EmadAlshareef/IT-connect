import { useState } from 'react'
import { Building2 } from 'lucide-react'
import HomeFooter from '../components/home/HomeFooter.jsx'
import {
  accentAt,
  cardPlayful,
  homePageShell,
  sectionEyebrow,
  sectionSubtitle,
  sectionTitle,
} from '../components/home/homeTheme.js'
import { useCompanyProfiles } from '../hooks/useCompanyProfiles.js'

function CompaniesPage() {
  const { companies } = useCompanyProfiles()
  const [openCompanyId, setOpenCompanyId] = useState(null)

  const openCompany = (companyId) => setOpenCompanyId(companyId)
  const closeCompany = () => setOpenCompanyId(null)
  const selectedCompany = companies.find((c) => c.id === openCompanyId) ?? null

  return (
    <div className={`${homePageShell} min-h-full font-display`}>
      <main className="px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <header className="mx-auto max-w-3xl text-center">
            <p className={sectionEyebrow}>Partners</p>
            <h1 className={`mt-3 ${sectionTitle}`}>Companies we work with</h1>
            <p className={sectionSubtitle}>
              Explore the companies we work with across training, mentorship, and hiring partnerships.
            </p>
          </header>

          {companies.length === 0 ? (
            <p className="mx-auto mt-10 max-w-xl rounded-[1.75rem] border-2 border-dashed border-violet-200 bg-white/80 px-5 py-8 text-center text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
              No companies added yet.
            </p>
          ) : (
            <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {companies.map((company, index) => {
                const accent = accentAt(index)
                return (
                  <li key={company.id} className={`overflow-hidden ${cardPlayful} p-0`}>
                    <button type="button" onClick={() => openCompany(company.id)} className="w-full text-left">
                      <div className="relative">
                        {company.logoUrl ? (
                          <div className="flex h-44 w-full items-center justify-center bg-white p-4 dark:bg-slate-950">
                            <img
                              src={company.logoUrl}
                              alt={`${company.companyName} logo`}
                              className="h-full w-full object-contain"
                            />
                          </div>
                        ) : (
                          <div
                            className={`flex h-44 w-full items-center justify-center ${accent.bg} ${accent.darkBg}`}
                          >
                            <span className={`text-5xl font-black ${accent.text} ${accent.darkText}`}>
                              {(company.companyName ?? '?').slice(0, 1).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="absolute left-3 top-3 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
                          Partner
                        </span>
                      </div>
                      <div className="p-5">
                        <div
                          className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ring-2 ${accent.bg} ${accent.text} ${accent.ring} ${accent.darkBg} ${accent.darkText}`}
                        >
                          <Building2 className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                        </div>
                        <p className="line-clamp-2 text-xl font-extrabold leading-tight text-slate-900 dark:text-slate-100">
                          {company.companyName}
                        </p>
                        <p className="mt-2 line-clamp-1 text-sm font-medium text-slate-600 dark:text-slate-400">
                          {company.contactEmail || company.location || 'Company profile'}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-0.5 text-xs font-bold text-violet-700 dark:border-slate-700 dark:bg-slate-800 dark:text-violet-300">
                            {company.industry || 'General'}
                          </span>
                          {company.location ? (
                            <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-0.5 text-xs font-bold text-violet-700 dark:border-slate-700 dark:bg-slate-800 dark:text-violet-300">
                              {company.location}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <p className="text-base font-extrabold text-violet-700 dark:text-violet-400">View profile</p>
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Open details →</span>
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>

      {selectedCompany ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-[2px] dark:bg-slate-950/75"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeCompany()
          }}
        >
          <section
            className="max-h-[min(90vh,720px)] w-full max-w-xl overflow-y-auto rounded-[22px] bg-white p-6 shadow-2xl ring-1 ring-violet-100/80 dark:bg-slate-900 dark:ring-slate-700"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">{selectedCompany.companyName}</h2>
              <button
                type="button"
                onClick={closeCompany}
                className="rounded-full border-2 border-violet-200 px-3 py-1 text-xs font-bold text-violet-700 transition hover:bg-violet-50 dark:border-slate-700 dark:text-violet-300 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
            {selectedCompany.logoUrl ? (
              <div className="mt-4 flex h-44 w-full items-center justify-center rounded-2xl border border-violet-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
                <img
                  src={selectedCompany.logoUrl}
                  alt={`${selectedCompany.companyName} logo`}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : null}
            <div className="mt-4 space-y-2 text-sm">
              <p className="text-slate-700 dark:text-slate-300">
                <span className="font-bold">Industry:</span> {selectedCompany.industry || 'General'}
              </p>
              {selectedCompany.contactEmail ? (
                <p className="text-slate-700 dark:text-slate-300">
                  <span className="font-bold">Contact:</span> {selectedCompany.contactEmail}
                </p>
              ) : null}
              {selectedCompany.location ? (
                <p className="text-slate-700 dark:text-slate-300">
                  <span className="font-bold">Location:</span> {selectedCompany.location}
                </p>
              ) : null}
              {selectedCompany.description ? (
                <p className="pt-1 text-slate-700 dark:text-slate-300">
                  <span className="font-bold">Description:</span> {selectedCompany.description}
                </p>
              ) : null}
              {selectedCompany.vision ? (
                <p className="pt-1 text-slate-700 dark:text-slate-300">
                  <span className="font-bold">Vision:</span> {selectedCompany.vision}
                </p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      <HomeFooter />
    </div>
  )
}

export default CompaniesPage
