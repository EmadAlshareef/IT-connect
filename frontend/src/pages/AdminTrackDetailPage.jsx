import { useMemo, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Code2, Database, Smartphone } from 'lucide-react'
import { adminBranches, normalizeBranchId } from '../data/adminDashboardData.js'
import { useAdminCreatedTracks } from '../hooks/useAdminCreatedTracks.js'
import { useAdminTrackSkills } from '../hooks/useAdminTrackSkills.js'
import { getTrackById } from '../utils/adminTrackUtils.js'

const trackIcon = {
  code: Code2,
  db: Database,
  mobile: Smartphone,
}

const ctaBtn =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-900/15 ring-1 ring-white/10 transition hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 dark:shadow-black/30'

const accentSoftSquare =
  'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300'

function AdminTrackDetailPage() {
  const { trackId } = useParams()
  const [searchParams] = useSearchParams()
  const branchId = normalizeBranchId(searchParams.get('branch'))
  const branch = adminBranches.find((b) => b.id === branchId) ?? adminBranches[0]

  const { skillsByParent, addSkillToTrack } = useAdminTrackSkills()
  const { findCreatedTrack } = useAdminCreatedTracks()
  const [form, setForm] = useState({ skillsName: '', description: '' })

  const track = useMemo(
    () => findCreatedTrack(branchId, trackId) ?? getTrackById(branchId, trackId),
    [branchId, trackId, findCreatedTrack],
  )
  const savedSkills = skillsByParent[trackId] ?? []

  if (!trackId || !track) {
    return <Navigate to={`/admin?branch=${branchId}`} replace />
  }

  const Icon = trackIcon[track.icon] ?? Code2
  const displayTitle = track.skillsName ?? track.title
  const backTo = `/admin?branch=${branchId}&tab=tracks`

  const handleAddSkill = (e) => {
    e.preventDefault()
    const skillsName = form.skillsName.trim()
    if (!skillsName) return
    addSkillToTrack(trackId, { skillsName, description: form.description })
    setForm({ skillsName: '', description: '' })
  }

  return (
    <main className="min-h-dvh bg-[#FFF9F2] font-display text-slate-800 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <Link
          to={backTo}
          replace
          className="inline-flex items-center gap-2 text-sm font-medium text-violet-700 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-200"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to track management
        </Link>

        <header className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accentSoftSquare}`}>
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Track
                </p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{displayTitle}</h1>
                {track.description ? (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{track.description}</p>
                ) : null}
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-900 dark:bg-sky-950/50 dark:text-sky-200">
              {track.trainings} trainings
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
              {track.students} students
            </span>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-900 dark:bg-violet-950/50 dark:text-violet-200">
              {savedSkills.length} saved skill{savedSkills.length === 1 ? '' : 's'}
            </span>
          </div>
        </header>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Skills saved in this track</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Entries you add from &quot;Create Track&quot; on the dashboard or below are stored here for this track.
          </p>

          {savedSkills.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
              No skills saved yet. Add one below or use + Add Track on the dashboard.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {savedSkills.map((row) => (
                <li key={row.id} className="py-4 first:pt-0">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{row.skillsName}</p>
                  {row.description ? (
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{row.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add a skill to this track</h2>
          <form onSubmit={handleAddSkill} className="mt-4 space-y-4">
            <div>
              <label htmlFor="detail-skill-name" className="block text-sm font-semibold text-slate-900">
                Skills name
              </label>
              <input
                id="detail-skill-name"
                type="text"
                value={form.skillsName}
                onChange={(e) => setForm((f) => ({ ...f, skillsName: e.target.value }))}
                placeholder="e.g., React, TypeScript"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-400 dark:focus:ring-violet-950"
              />
            </div>
            <div>
              <label htmlFor="detail-skill-desc" className="block text-sm font-semibold text-slate-900">
                Description
              </label>
              <textarea
                id="detail-skill-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Technologies and skills covered…"
                rows={3}
                className="mt-2 w-full resize-y rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-400 dark:focus:ring-violet-950"
              />
            </div>
            <button type="submit" disabled={!form.skillsName.trim()} className={`${ctaBtn} disabled:pointer-events-none disabled:opacity-50`}>
              Save skill in this track
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}

export default AdminTrackDetailPage
