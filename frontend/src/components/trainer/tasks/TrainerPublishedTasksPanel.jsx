import { useEffect, useMemo, useState } from 'react'
import { Calendar, ClipboardList, Pencil, Save, Upload, X } from 'lucide-react'
import {
  getRequestsForTrainer,
  publishTrainerTaskRequest,
  updateTrainerTaskBrief,
} from '../../../utils/taskApprovalRequests.js'

function statusBadge(status) {
  if (status === 'approved') {
    return {
      label: 'Published',
      className: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200',
    }
  }
  if (status === 'rejected') {
    return {
      label: 'Rejected',
      className: 'bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200',
    }
  }
  return {
    label: 'Draft',
    className: 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
  }
}

const emptyEditForm = {
  sessionId: '',
  title: '',
  description: '',
  deadline: '',
  attachmentName: '',
  attachmentDataUrl: '',
}

function TrainerPublishedTasksPanel({ trainerEmail, trainingId, trainingTitle, sessionSummaries }) {
  const [tick, setTick] = useState(0)
  const [editingId, setEditingId] = useState('')
  const [editForm, setEditForm] = useState(emptyEditForm)
  const [notice, setNotice] = useState({ type: '', message: '' })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    window.addEventListener('trainer-task-requests-updated', bump)
    return () => window.removeEventListener('trainer-task-requests-updated', bump)
  }, [])

  const tasks = useMemo(() => {
    const rows = getRequestsForTrainer(trainerEmail)
    const filtered = trainingId ? rows.filter((row) => row.sessionId === trainingId) : rows
    return filtered.sort(
      (a, b) =>
        new Date(b.publishedAt ?? b.createdAt ?? 0).getTime() -
        new Date(a.publishedAt ?? a.createdAt ?? 0).getTime(),
    )
  }, [trainerEmail, trainingId, tick])

  const startEdit = (task) => {
    setEditingId(task.id)
    setNotice({ type: '', message: '' })
    setEditForm({
      sessionId: task.sessionId ?? '',
      title: task.title ?? '',
      description: task.description ?? '',
      deadline: task.deadline ?? '',
      attachmentName: task.attachmentName ?? '',
      attachmentDataUrl: task.attachmentDataUrl ?? '',
    })
  }

  const cancelEdit = () => {
    setEditingId('')
    setEditForm(emptyEditForm)
    setNotice({ type: '', message: '' })
  }

  const handleEditFieldChange = (event) => {
    const { name, value } = event.target
    setEditForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleAttachmentChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      setEditForm((prev) => ({ ...prev, attachmentName: '', attachmentDataUrl: '' }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setEditForm((prev) => ({
        ...prev,
        attachmentName: file.name,
        attachmentDataUrl: typeof reader.result === 'string' ? reader.result : '',
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (!editingId) return
    if (!editForm.sessionId || !editForm.title.trim() || !editForm.description.trim() || !editForm.deadline) {
      setNotice({ type: 'error', message: 'Training session, title, description, and deadline are required.' })
      return
    }

    const session = sessionSummaries.find((item) => item.id === editForm.sessionId)
    setIsSaving(true)
    try {
      await updateTrainerTaskBrief(editingId, {
        sessionId: editForm.sessionId,
        sessionTitle: session?.title ?? 'Training session',
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        deadline: editForm.deadline,
        attachmentName: editForm.attachmentName,
        attachmentDataUrl: editForm.attachmentDataUrl,
      })
      setTick((n) => n + 1)
      setNotice({ type: 'success', message: 'Task updated successfully.' })
      setEditingId('')
      setEditForm(emptyEditForm)
    } catch {
      setNotice({
        type: 'error',
        message: 'Could not save changes to the database. Check that the backend is running.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Task library
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">My tasks</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            View and edit task briefs you published
            {trainingTitle ? (
              <>
                {' '}
                for{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-200">{trainingTitle}</span>
              </>
            ) : (
              ' across your training sessions'
            )}
            .
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-800 dark:bg-violet-950/50 dark:text-violet-200">
          <ClipboardList className="h-3.5 w-3.5" aria-hidden />
          {tasks.length} tasks
        </span>
      </div>

      {tasks.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-400">
          No tasks published yet. Use <span className="font-semibold">Create Task</span> to publish your first brief.
        </p>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_1.1fr]">
          <ul className="space-y-3">
            {tasks.map((task) => {
              const status = task.status ?? 'pending'
              const badge = statusBadge(status)
              const isEditing = editingId === task.id
              return (
                <li
                  key={task.id}
                  className={`rounded-2xl border p-4 transition ${
                    isEditing
                      ? 'border-violet-400 bg-violet-50/60 dark:border-violet-500 dark:bg-violet-950/30'
                      : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{task.title}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{task.sessionTitle}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Calendar className="h-3 w-3 shrink-0" aria-hidden />
                    Deadline: {task.deadline || '—'}
                  </p>
                  {task.description ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
                      {task.description}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(task)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Edit
                    </button>
                    {status === 'pending' ? (
                      <button
                        type="button"
                        onClick={() => {
                          void publishTrainerTaskRequest(task.id)
                            .then(() => setTick((n) => n + 1))
                            .catch(() => {
                              setNotice({ type: 'error', message: 'Could not publish the task. Try again.' })
                            })
                        }}
                        className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500 dark:bg-violet-500 dark:hover:bg-violet-400"
                      >
                        Publish now
                      </button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-950/40">
            {editingId ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Edit task
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">Update task brief</h3>
                  </div>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    aria-label="Cancel edit"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div>
                  <label htmlFor="edit-task-session" className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Training session
                  </label>
                  <select
                    id="edit-task-session"
                    name="sessionId"
                    value={editForm.sessionId}
                    onChange={handleEditFieldChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                  >
                    {sessionSummaries.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-task-title" className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Task title
                  </label>
                  <input
                    id="edit-task-title"
                    name="title"
                    value={editForm.title}
                    onChange={handleEditFieldChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                  />
                </div>

                <div>
                  <label htmlFor="edit-task-description" className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Description
                  </label>
                  <textarea
                    id="edit-task-description"
                    name="description"
                    value={editForm.description}
                    onChange={handleEditFieldChange}
                    rows={4}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="edit-task-deadline" className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Deadline
                    </label>
                    <input
                      id="edit-task-deadline"
                      type="date"
                      name="deadline"
                      value={editForm.deadline}
                      onChange={handleEditFieldChange}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-task-attachment" className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Attachment
                    </label>
                    <label
                      htmlFor="edit-task-attachment"
                      className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-600 transition hover:border-violet-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
                    >
                      <span className="truncate">{editForm.attachmentName || 'Choose file'}</span>
                      <Upload className="h-4 w-4 shrink-0" aria-hidden />
                    </label>
                    <input id="edit-task-attachment" type="file" onChange={handleAttachmentChange} className="hidden" />
                  </div>
                </div>

                {notice.message ? (
                  <p
                    className={`text-sm ${
                      notice.type === 'error'
                        ? 'text-rose-600 dark:text-rose-300'
                        : 'text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    {notice.message}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-400"
                  >
                    <Save className="h-4 w-4" aria-hidden />
                    {isSaving ? 'Saving…' : 'Save changes'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex h-full min-h-[12rem] flex-col items-center justify-center text-center">
                <ClipboardList className="h-10 w-10 text-slate-300 dark:text-slate-600" aria-hidden />
                <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">Select a task to edit</p>
                <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Choose a published task from the list and update its title, description, deadline, or attachment.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default TrainerPublishedTasksPanel
