import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { FolderGit2, Link2, ShieldCheck } from 'lucide-react'
import { validateGithubRepo } from '../../api/studentPortalApi.js'
import { useAuth } from '../../context/useAuth.js'
import { getGithubSubmissionByEmail, saveGithubSubmission } from '../../utils/studentGithubSubmissions.js'

function StudentGithubPage() {
  const { notify, token } = useOutletContext()
  const { email, trainerName, userId } = useAuth()
  const [url, setUrl] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [linked, setLinked] = useState(null)

  useEffect(() => {
    const existing = getGithubSubmissionByEmail(email)
    if (existing?.normalizedUrl || existing?.repositoryUrl) {
      setLinked(existing)
      setUrl(existing.normalizedUrl || existing.repositoryUrl)
    }
  }, [email])

  const handleValidate = async (event) => {
    event.preventDefault()
    setError('')
    setResult(null)
    setPending(true)
    try {
      const data = await validateGithubRepo(token, url)
      setResult(data)
      if (data.isValid) {
        const saved = saveGithubSubmission({
          studentEmail: email,
          studentName: trainerName,
          studentId: userId,
          repositoryUrl: url,
          normalizedUrl: data.normalizedUrl || url,
          isValid: true,
          message: data.message,
        })
        if (saved) setLinked(saved)
      }
      notify({
        title: data.isValid ? 'Project linked with GitHub' : 'Validation failed',
        message: data.message,
        tone: data.isValid ? 'success' : 'danger',
      })
    } catch {
      setError('Unable to validate the repository URL.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Link project with GitHub</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
            Paste your public GitHub repository URL for homework. Your trainer can see whether you uploaded and open the
            project from their dashboard.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            <p className="font-semibold">Trainer visibility</p>
          </div>
          <p className="mt-2 text-xs leading-5">
            After you link a valid URL, it appears on your trainer&apos;s Review GitHub Repositories section.
          </p>
        </div>
      </header>

      {linked ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
          <p className="font-semibold">Homework linked</p>
          <p className="mt-1 inline-flex items-center gap-2 text-xs">
            <Link2 className="h-4 w-4 shrink-0" aria-hidden />
            {linked.normalizedUrl || linked.repositoryUrl}
          </p>
          <p className="mt-2 text-xs opacity-90">Submit again to update your linked repository.</p>
        </div>
      ) : null}

      <form
        onSubmit={handleValidate}
        className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:grid-cols-[1fr,0.9fr]"
      >
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            GitHub repository URL
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder="https://github.com/your-username/your-project"
            />
          </label>
          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100">
              {error}
            </p>
          ) : null}
          {result ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                result.isValid
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100'
                  : 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100'
              }`}
            >
              <p className="font-semibold">{result.isValid ? 'Validated' : 'Needs attention'}</p>
              <p className="mt-1 text-xs leading-5">{result.message}</p>
              {result.normalizedUrl ? (
                <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-100">
                  <Link2 className="h-4 w-4" aria-hidden />
                  {result.normalizedUrl}
                </p>
              ) : null}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={pending || !url.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-600 dark:hover:bg-violet-500"
          >
            <FolderGit2 className="h-4 w-4" aria-hidden />
            {pending ? 'Linking…' : linked ? 'Update GitHub link' : 'Link project with GitHub'}
          </button>
        </div>
        <aside className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">What we verify</p>
          <ul className="mt-3 list-disc space-y-2 pl-4 text-xs leading-5">
            <li>HTTPS scheme pointing to github.com with org/repo segments.</li>
            <li>Optional reachability check when the API is available.</li>
            <li>Your trainer sees a Linked or Not uploaded status on their dashboard.</li>
          </ul>
        </aside>
      </form>
    </div>
  )
}

export default StudentGithubPage
