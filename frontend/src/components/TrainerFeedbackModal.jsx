import { useEffect, useMemo, useRef, useState } from 'react'

function PaperPlaneIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  )
}

function TrashIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

/**
 * Feedback modal styled like Send Announcement: clear labels, task select, chat,
 * suggested lines that fill the composer, full-width primary send.
 */
function TrainerFeedbackModal({
  student,
  trainerUserId,
  allMessages,
  studentTasks,
  totalTasksCount = 0,
  quickActions,
  onClose,
  onSendFeedback,
  onRemoveTaskFromStudent,
}) {
  const taskIds = useMemo(() => studentTasks.map((task) => task.id), [studentTasks])
  const [manualTaskId, setManualTaskId] = useState(null)
  const effectiveTaskId =
    manualTaskId != null && taskIds.includes(manualTaskId) ? manualTaskId : taskIds[0] ?? ''

  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sentOk, setSentOk] = useState(false)
  const [pickedSuggestion, setPickedSuggestion] = useState(null)
  const listRef = useRef(null)

  const thread = useMemo(() => {
    return allMessages
      .filter(
        (message) =>
          ((message.senderId === trainerUserId && message.receiverId === student.id) ||
            (message.senderId === student.id && message.receiverId === trainerUserId)) &&
          message.taskId === effectiveTaskId,
      )
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  }, [allMessages, trainerUserId, student.id, effectiveTaskId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [thread])

  const submit = async () => {
    const trimmed = draft.trim()
    if (!trimmed) return

    if (studentTasks.length === 0) {
      setError('Assign at least one task to this student before sending feedback.')
      return
    }
    if (!effectiveTaskId) {
      setError('Select which task this feedback should be saved on.')
      return
    }

    setSending(true)
    setError('')
    setSentOk(false)
    try {
      await onSendFeedback({ content: trimmed, taskId: effectiveTaskId })
      setDraft('')
      setPickedSuggestion(null)
      setSentOk(true)
      window.setTimeout(() => setSentOk(false), 2500)
    } catch {
      setError('Could not send feedback. Try again.')
    } finally {
      setSending(false)
    }
  }

  const applySuggestion = (text) => {
    setDraft(text)
    setPickedSuggestion(text)
    setError('')
  }

  const hasTasks = studentTasks.length > 0
  const selectedTask = studentTasks.find((task) => task.id === effectiveTaskId) ?? null
  const taskQuickActions = useMemo(() => {
    if (!selectedTask) return quickActions
    const generated = [
      `Great progress on "${selectedTask.title}". Keep going.`,
      selectedTask.deadline ? `Reminder: deadline is ${selectedTask.deadline}.` : null,
      selectedTask.description
        ? `Please review this part: ${selectedTask.description.slice(0, 90)}${selectedTask.description.length > 90 ? '...' : ''}`
        : null,
    ].filter(Boolean)
    return [...new Set([...generated, ...quickActions])]
  }, [selectedTask, quickActions])

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4 py-8"
      role="dialog"
      aria-labelledby="feedback-modal-title"
      aria-modal="true"
    >
      <div className="relative flex h-[min(780px,92dvh)] max-h-[92dvh] w-full max-w-md min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
        >
          <span className="block text-xl leading-none">×</span>
        </button>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6 pt-7">
          <header className="shrink-0 pr-10">
            <h2 id="feedback-modal-title" className="text-xl font-bold text-slate-900">
              Feedback
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              This message will be sent to <span className="font-medium text-slate-700">{student.name}</span>.
              Feedback is saved on the task you select below.
            </p>
          </header>

          <div className="mt-6 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
            {/* Task select */}
            <div className="shrink-0">
              <p className="mb-1 text-xs font-medium text-slate-500">
                {studentTasks.length}/{totalTasksCount} tasks for {student.name}
              </p>
              <label htmlFor="feedback-task-select" className="mb-1.5 block text-sm font-medium text-slate-900">
                Task
              </label>
              {!hasTasks ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                  No tasks for this student yet. Assign one from the Students tab first.
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    id="feedback-task-select"
                    value={effectiveTaskId}
                    onChange={(event) => setManualTaskId(event.target.value)}
                    disabled={sending}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                  >
                    {studentTasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={sending || !effectiveTaskId}
                    onClick={() => onRemoveTaskFromStudent?.(effectiveTaskId)}
                    className="shrink-0 rounded-lg border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-45"
                    aria-label="Remove selected task from this student"
                    title="Remove selected task from this student"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Chat history */}
            <div className="flex min-h-[120px] flex-1 flex-col">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-900">Messages</span>
                <span className="text-xs text-slate-400">
                  {thread.length} {thread.length === 1 ? 'message' : 'messages'}
                </span>
              </div>
              <div
                ref={listRef}
                className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/80 p-3"
              >
                {thread.length === 0 ? (
                  <p className="flex h-full min-h-[100px] items-center justify-center px-2 text-center text-sm text-slate-500">
                    No messages yet for this task.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {thread.map((message) => {
                      const fromTrainer = message.senderId === trainerUserId
                      return (
                        <li key={message.id} className={`flex ${fromTrainer ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-snug ${
                              fromTrainer
                                ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/20 dark:bg-violet-500'
                                : 'border border-slate-200 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            <p className={`mt-1 text-[10px] ${fromTrainer ? 'text-violet-100' : 'text-slate-400'}`}>
                              {fromTrainer ? 'You' : student.name} ·{' '}
                              {new Date(message.timestamp).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Suggested feedback — fills message box */}
            <div className="shrink-0">
              <span className="mb-1.5 block text-sm font-medium text-slate-900">Suggested feedback</span>
              <p className="mb-2 text-xs text-slate-500">Tap a suggestion to add it to your message — edit before sending.</p>
              <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-2">
                {taskQuickActions.map((text) => {
                  const active = pickedSuggestion === text || draft === text
                  return (
                    <button
                      key={text}
                      type="button"
                      disabled={sending || !hasTasks}
                      onClick={() => applySuggestion(text)}
                      className={`rounded-full border px-3 py-1.5 text-left text-xs leading-snug transition disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm ${
                        active
                          ? 'border-violet-400 bg-violet-50 font-medium text-violet-950 dark:border-violet-500 dark:bg-violet-950/60 dark:text-violet-100'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500'
                      }`}
                    >
                      <span className="line-clamp-2">{text}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Message + send */}
            <div className="shrink-0 space-y-3 border-t border-slate-100 pt-4">
              <div>
                <label htmlFor="feedback-custom" className="mb-1.5 block text-sm font-medium text-slate-900">
                  Message
                </label>
                <textarea
                  id="feedback-custom"
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value)
                    setPickedSuggestion(null)
                  }}
                  placeholder="Your message..."
                  rows={4}
                  disabled={sending || !hasTasks}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950 dark:disabled:bg-slate-900/50"
                />
              </div>

              {sentOk ? (
                <p className="text-xs font-medium text-emerald-700">Sent and saved on the selected task.</p>
              ) : null}
              {error ? <p className="text-xs text-rose-600">{error}</p> : null}

              <button
                type="button"
                disabled={sending || !hasTasks || !draft.trim()}
                onClick={submit}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white shadow-md shadow-violet-600/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-violet-500 dark:hover:bg-violet-400"
              >
                <PaperPlaneIcon className="h-5 w-5" />
                {sending ? 'Sending…' : 'Send feedback'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrainerFeedbackModal
