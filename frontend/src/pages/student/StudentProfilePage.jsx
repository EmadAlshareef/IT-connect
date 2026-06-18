import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { FileUp, Loader2, Save, UserCircle2 } from 'lucide-react'
import { useAuth } from '../../context/useAuth.js'
import { validateOptionalCvFile } from '../../api/enrollmentApplicationApi.js'
import { fetchStudentProfile, updateStudentProfile } from '../../api/studentProfileApi.js'
import { readStudentProfileCv } from '../../utils/studentProfileCv.js'

const EMPTY_FORM = {
  fullName: '',
  phone: '',
  university: '',
  specialization: '',
  bio: '',
  githubUsername: '',
}

function StudentProfilePage() {
  const { notify, token, userId } = useOutletContext()
  const { email, trainerName } = useAuth()
  const [form, setForm] = useState(EMPTY_FORM)
  const [savedCvFileName, setSavedCvFileName] = useState('')
  const [savedCvUrl, setSavedCvUrl] = useState('')
  const [cvFile, setCvFile] = useState(null)
  const [cvError, setCvError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const localCvDownloadUrl = useMemo(() => {
    const stored = readStudentProfileCv(userId)
    return stored?.dataUrl ?? ''
  }, [savedCvFileName, userId])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const profile = await fetchStudentProfile(token, userId, {
          email,
          fullName: trainerName,
        })
        if (!cancelled && profile) {
          setForm({
            fullName: profile.fullName ?? trainerName ?? '',
            phone: profile.phone ?? '',
            university: profile.university ?? '',
            specialization: profile.specialization ?? '',
            bio: profile.bio ?? '',
            githubUsername: profile.githubUsername ?? '',
          })
          setSavedCvFileName(profile.cvFileName ?? '')
          setSavedCvUrl(profile.cvFileUrl ?? '')
        }
      } catch {
        if (!cancelled) setError('Unable to load your profile.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [email, token, trainerName, userId])

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleCvChange = (event) => {
    const file = event.target.files?.[0] ?? null
    setCvFile(file)
    setCvError(file ? validateOptionalCvFile(file) : '')
  }

  const cvDownloadHref =
    savedCvUrl && !savedCvUrl.startsWith('local://')
      ? savedCvUrl
      : localCvDownloadUrl || ''

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (cvFile) {
      const cvMsg = validateOptionalCvFile(cvFile)
      if (cvMsg) {
        setCvError(cvMsg)
        return
      }
    }
    setSaving(true)
    setError('')
    try {
      const updated = await updateStudentProfile(
        token,
        userId,
        {
          email,
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          university: form.university.trim(),
          specialization: form.specialization.trim(),
          bio: form.bio.trim(),
          githubUsername: form.githubUsername.trim(),
        },
        cvFile,
      )
      if (updated?.cvFileName) {
        setSavedCvFileName(updated.cvFileName)
        setSavedCvUrl(updated.cvFileUrl ?? '')
      } else if (cvFile) {
        setSavedCvFileName(cvFile.name)
        setSavedCvUrl(`local://${cvFile.name}`)
      }
      setCvFile(null)
      setCvError('')
      notify({
        title: 'Profile saved',
        message: cvFile ? 'Your profile and CV have been updated.' : 'Your trainee profile has been updated.',
        tone: 'success',
      })
    } catch {
      setError('Unable to save your profile right now.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-violet-600" aria-hidden />
      </div>
    )
  }

  const displayedCvName = cvFile?.name || savedCvFileName

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">My profile</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Keep your contact details, CV, and background up to date. Trainers see this information when reviewing your
            enrollment and internship applications.
          </p>
        </div>
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
          <UserCircle2 className="h-8 w-8" aria-hidden />
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            Full name
            <input
              type="text"
              value={form.fullName}
              onChange={handleChange('fullName')}
              required
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder="Your name"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            Email
            <input
              type="email"
              value={email}
              readOnly
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            Phone
            <input
              type="tel"
              value={form.phone}
              onChange={handleChange('phone')}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder="+1 555 0100"
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
              University
              <input
                type="text"
                value={form.university}
                onChange={handleChange('university')}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                placeholder="University name"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
              Specialization
              <input
                type="text"
                value={form.specialization}
                onChange={handleChange('specialization')}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                placeholder="Computer science, cybersecurity…"
              />
            </label>
          </div>

          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            GitHub username
            <input
              type="text"
              value={form.githubUsername}
              onChange={handleChange('githubUsername')}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder="octocat"
            />
          </label>

          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">CV (PDF, DOC, DOCX)</p>
            <label
              htmlFor="profile-cv"
              className="mt-2 flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm transition hover:border-violet-300 hover:bg-violet-50/40 dark:border-slate-600 dark:bg-slate-950/50 dark:hover:border-violet-500/60"
            >
              <span className="truncate text-slate-600 dark:text-slate-300">
                {displayedCvName || 'Choose file to upload'}
              </span>
              <FileUp className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
            </label>
            <input
              id="profile-cv"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={handleCvChange}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Max 10 MB. Replaces your previously saved CV.</p>
            {cvError ? <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">{cvError}</p> : null}
            {savedCvFileName && !cvFile && cvDownloadHref ? (
              <a
                href={cvDownloadHref}
                download={savedCvFileName}
                className="mt-2 inline-flex text-xs font-semibold text-violet-600 hover:text-violet-500 dark:text-violet-300"
              >
                Download current CV ({savedCvFileName})
              </a>
            ) : null}
          </div>

          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            Bio
            <textarea
              value={form.bio}
              onChange={handleChange('bio')}
              rows={5}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder="Short summary of your skills, interests, and goals."
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-600/25 transition hover:bg-violet-500 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
            Save profile
          </button>
        </div>

        <aside className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
          <p className="font-semibold text-slate-900 dark:text-slate-100">What this is used for</p>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            <li>Enrollment applications can reuse your saved CV and profile details.</li>
            <li>Trainers see your GitHub username alongside linked homework repos.</li>
            <li>Internship applications can reuse your bio, university info, and CV.</li>
          </ul>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Related</p>
            <div className="mt-3 flex flex-col gap-2">
              <Link
                to="/student/internships"
                className="font-semibold text-violet-600 hover:text-violet-500 dark:text-violet-300"
              >
                Browse trainings →
              </Link>
              <Link
                to="/student/applications"
                className="font-semibold text-violet-600 hover:text-violet-500 dark:text-violet-300"
              >
                My applications →
              </Link>
              <Link
                to="/student/github"
                className="font-semibold text-violet-600 hover:text-violet-500 dark:text-violet-300"
              >
                Link GitHub project →
              </Link>
            </div>
          </div>
        </aside>
      </form>
    </div>
  )
}

export default StudentProfilePage
