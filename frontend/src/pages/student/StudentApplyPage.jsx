import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useOutletContext } from 'react-router-dom'
import { CheckCircle2, UploadCloud } from 'lucide-react'
import { applyToInternship, fetchInternshipPrograms } from '../../api/studentPortalApi.js'
import { invalidateStudentTrainingAccess } from '../../utils/studentTrainingAccess.js'

function StudentApplyPage() {
  const { notify, token, userId } = useOutletContext()
  const location = useLocation()
  const [programs, setPrograms] = useState([])
  const [programId, setProgramId] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [cvFileName, setCvFileName] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await fetchInternshipPrograms(token)
        if (!cancelled) {
          setPrograms(data)
          const preset = location.state?.programId
          if (preset && data.some((p) => p.id === preset)) {
            setProgramId(preset)
          } else if (data[0]) {
            setProgramId(data[0].id)
          }
        }
      } catch {
        if (!cancelled) setError('Unable to load programs for application.')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [location.state, token])

  const selectedProgram = useMemo(() => programs.find((p) => p.id === programId), [programs, programId])

  const handleCv = (event) => {
    const file = event.target.files?.[0]
    setCvFileName(file ? file.name : '')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setStatus('')
    if (!programId) {
      setError('Pick a program to apply for.')
      return
    }
    try {
      const result = await applyToInternship(token, userId, {
        programId,
        coverLetter,
        cvFileName: cvFileName || null,
      })
      setStatus(result.record.status ?? 'Pending')
      notify({
        title: 'Application submitted',
        message: `Your application to ${selectedProgram?.title ?? 'the program'} is now ${result.record.status ?? 'Pending'}.`,
        tone: 'success',
      })
      invalidateStudentTrainingAccess()
    } catch {
      setError('Unable to submit your application right now.')
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Apply for an internship</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
          Complete the application form, attach your CV (stored as a filename for this demo UI), and track status from{' '}
          <Link to="/student/applications" className="font-semibold text-violet-600 hover:text-violet-500 dark:text-violet-300">
            My applications
          </Link>
          .
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            Program
            <select
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.title} — {program.company}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            Cover letter
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={6}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder="Share motivation, relevant coursework, and availability."
            />
          </label>

          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Upload CV</p>
            <label className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600 transition hover:border-violet-300 hover:bg-violet-50/40 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-violet-500/60">
              <UploadCloud className="h-6 w-6 text-violet-500" aria-hidden />
              <span className="font-semibold text-slate-900 dark:text-slate-100">Choose a PDF or DOCX</span>
              <span className="text-xs">Filename is forwarded with your application payload.</span>
              <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleCv} />
            </label>
            {cvFileName ? <p className="mt-2 text-xs text-slate-500">Selected file: {cvFileName}</p> : null}
          </div>

          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-600/25 transition hover:bg-violet-500 min-[420px]:flex-none"
            >
              Apply now
            </button>
            <Link
              to="/student/internships"
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-violet-200 hover:text-violet-700 dark:border-slate-700 dark:text-slate-100 min-[420px]:flex-none"
            >
              Back to catalog
            </Link>
          </div>
        </form>

        <aside className="space-y-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-slate-50 shadow-lg dark:border-slate-700">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-300" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-white">Application status indicator</p>
              <p className="text-xs text-slate-200/90">
                After you submit, your latest status appears here and syncs with the applications board.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-200/80">Current status</p>
            <p className="mt-3 text-2xl font-bold text-white">{status || 'Not submitted'}</p>
            {selectedProgram ? (
              <p className="mt-2 text-xs text-slate-200/90">
                Target program: <span className="font-semibold text-white">{selectedProgram.title}</span>
              </p>
            ) : null}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-5 text-slate-100/90">
            <p className="font-semibold text-white">Secure flow</p>
            <p className="mt-2">
              Authenticated POST to <span className="font-mono text-[11px]">/Internships/applications</span> persists your application
              when the Training Sphere API is reachable. Offline mode mirrors the same shape in local storage.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default StudentApplyPage
