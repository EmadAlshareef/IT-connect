import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useOutletContext } from 'react-router-dom'
import { Paperclip, Send } from 'lucide-react'
import { fetchStudentTasks, submitStudentTask } from '../../api/studentPortalApi.js'

function StudentSubmitPage() {
  const { notify, token, userId, trainerName } = useOutletContext()
  const location = useLocation()
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const courseSearch = useMemo(() => {
    const branchId = String(searchParams.get('branchId') ?? '').trim()
    const courseId = String(searchParams.get('courseId') ?? '').trim()
    return branchId && courseId ? new URLSearchParams({ branchId, courseId }).toString() : ''
  }, [searchParams])
  const [tasks, setTasks] = useState([])
  const [taskId, setTaskId] = useState('')
  const [submissionLink, setSubmissionLink] = useState('')
  const [fileName, setFileName] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await fetchStudentTasks(token, userId, searchParams)
        if (!cancelled) {
          setTasks(data)
          const preset = location.state?.taskId
          if (preset && data.some((t) => t.id === preset)) {
            setTaskId(preset)
          } else if (data[0]) {
            setTaskId(data[0].id)
          }
        }
      } catch {
        if (!cancelled) setError('Unable to load tasks for submission.')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [location.state, searchParams, token, userId])

  const handleFile = (event) => {
    const file = event.target.files?.[0]
    setFileName(file ? file.name : '')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setConfirmation('')
    if (!taskId) {
      setError('Select a task to submit.')
      return
    }
    if (!submissionLink.trim() && !fileName.trim()) {
      setError('Provide a submission link and/or attach a file (filename is sent to SubmissionController).')
      return
    }
    try {
      const selectedTask = tasks.find((t) => t.id === taskId)
      await submitStudentTask(token, userId, {
        taskId,
        taskTitle: selectedTask?.title ?? '',
        studentName: trainerName ?? '',
        submissionLink: submissionLink.trim() || null,
        fileName: fileName.trim() || null,
        notes: notes.trim() || null,
      })
      setConfirmation(
        `Submitted successfully. Your instructor received "${selectedTask?.title ?? 'the task'}" in Task Submissions for review.`,
      )
      notify({
        title: 'Sent to your instructor',
        message: 'Your trainer can now review and grade this submission from Task Submissions.',
        tone: 'success',
      })
      setSubmissionLink('')
      setFileName('')
      setNotes('')
    } catch {
      setError('Unable to submit right now.')
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Submit a task</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
          Upload files or share links. Payloads are posted to <span className="font-mono text-[11px]">POST /Submission/task</span>, which
          collaborates with the task repository to mark items as pending review.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:grid-cols-[1.1fr,0.9fr]"
      >
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            Task
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            Submission link
            <input
              value={submissionLink}
              onChange={(e) => setSubmissionLink(e.target.value)}
              placeholder="https://"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>

          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Upload task files</p>
            <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600 transition hover:border-violet-300 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              <Paperclip className="h-5 w-5 text-violet-500" aria-hidden />
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">Attach deliverable</p>
                <p className="text-xs text-slate-500">Filename is forwarded to the submission API.</p>
              </div>
              <input type="file" className="hidden" onChange={handleFile} />
            </label>
            {fileName ? <p className="mt-2 text-xs text-slate-500">Selected: {fileName}</p> : null}
          </div>

          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            Notes to trainer
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder="Context, blockers, or instructions."
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100">
              {error}
            </p>
          ) : null}
          {confirmation ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
              {confirmation}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-600/25 transition hover:bg-violet-500 min-[420px]:flex-none"
            >
              <Send className="h-4 w-4" aria-hidden />
              Submit task
            </button>
            <Link
              to={courseSearch ? { pathname: '/student/tasks', search: courseSearch } : '/student/tasks'}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-violet-200 hover:text-violet-700 dark:border-slate-700 dark:text-slate-100 min-[420px]:flex-none"
            >
              Review assignments
            </Link>
          </div>
        </div>

        <aside className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">Submission checklist</p>
          <ul className="list-disc space-y-2 pl-4 text-xs leading-5">
            <li>Confirm you selected the correct task ID for audit trails.</li>
            <li>Links should be reachable without authentication unless previously agreed.</li>
            <li>Large binaries should live in your approved storage; share the URL here.</li>
          </ul>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <p className="font-semibold text-slate-900 dark:text-slate-100">API contract</p>
            <p className="mt-2">
              SubmissionController validates ownership, persists the submission, and asks the task repository to move the assignment
              into a pending review state.
            </p>
          </div>
        </aside>
      </form>
    </div>
  )
}

export default StudentSubmitPage
