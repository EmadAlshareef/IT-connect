import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import TrainerFeedbackModal from '../components/TrainerFeedbackModal.jsx'
import { fetchSectionDetail, mapSectionDetailToSession } from '../api/catalogApi.js'
import { getMessagesForUser, sendRoleMessage } from '../api/messageApi.js'
import { trainerFeedbackActions } from '../data/messageActions.js'
import { useAuth } from '../context/useAuth.js'
import { findTrainerSessionById } from '../utils/trainerCompanyWorkspace.js'
import { trainingSections } from '../data/sessions.js'
import {
  ensureApprovedBriefsForSession,
  getApprovedRequestsForSession,
} from '../utils/taskApprovalRequests.js'
function TrainerSectionDetailsPage() {
  const { token, role, userId, email, trainerName } = useAuth()
  const { sectionId } = useParams()
  const normalizedRole = (role ?? '').toLowerCase()
  const fallbackSection = useMemo(
    () =>
      findTrainerSessionById(sectionId, email, trainerName) ??
      (normalizedRole !== 'trainer' ? trainingSections.find((item) => item.id === sectionId) : null) ??
      null,
    [sectionId, email, trainerName, normalizedRole],
  )
  const [section, setSection] = useState(fallbackSection ?? null)
  const [activeTab, setActiveTab] = useState('Students')
  const [approvalTick, setApprovalTick] = useState(0)
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [isTaskDetailsModalOpen, setIsTaskDetailsModalOpen] = useState(false)
  const [messageTargetStudent, setMessageTargetStudent] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageError, setMessageError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function loadSection() {
      if (!sectionId) return
      try {
        const detail = await fetchSectionDetail(sectionId)
        if (cancelled) return
        setSection(mapSectionDetailToSession(detail))
        await ensureApprovedBriefsForSession(sectionId)
        if (!cancelled) setApprovalTick((t) => t + 1)
      } catch {
        if (cancelled) return
        setSection(fallbackSection ?? null)
        await ensureApprovedBriefsForSession(sectionId)
        if (!cancelled) setApprovalTick((t) => t + 1)
      }
    }
    loadSection()
    return () => {
      cancelled = true
    }
  }, [sectionId, email, trainerName, fallbackSection])

  const students = useMemo(() => section?.students ?? [], [section])

  useEffect(() => {
    const onUpdate = () => setApprovalTick((t) => t + 1)
    window.addEventListener('trainer-task-requests-updated', onUpdate)
    return () => window.removeEventListener('trainer-task-requests-updated', onUpdate)
  }, [])

  const approvedTaskBriefs = useMemo(
    () => (section ? getApprovedRequestsForSession(section.id) : []),
    [section?.id, approvalTick],
  )

  const publishedTasks = useMemo(
    () =>
      approvedTaskBriefs.map((brief) => ({
        id: brief.id,
        title: brief.title,
        description: brief.description,
        deadline: brief.deadline,
        attachmentName: brief.attachmentName || '',
        notes: '',
        assignedStudents: students.map((student) => student.name),
        feedbackLog: [],
      })),
    [approvedTaskBriefs, students],
  )

  const selectedTask =
    publishedTasks.find((task) => task.id === selectedTaskId) ?? publishedTasks[0] ?? null
  const tabLabel = {
    Students: `Students (${students.length})`,
    Tasks: `Tasks (${publishedTasks.length})`,
    Communication: 'Communication',
  }

  useEffect(() => {
    const loadMessages = async () => {
      try {
        setMessageError('')
        const data = await getMessagesForUser(token, userId)
        setMessages(data)
      } catch {
        setMessageError('Unable to load role-based messages right now.')
      }
    }

    if (token && userId && section?.id) {
      loadMessages()
    }
  }, [token, userId, section?.id])

  const handleOpenStudentTasks = () => {
    setSelectedTaskId(publishedTasks[0]?.id ?? '')
    setActiveTab('Tasks')
  }

  const openFeedbackModal = (student) => {
    setMessageTargetStudent(student)
  }

  const closeFeedbackModal = () => {
    setMessageTargetStudent(null)
  }

  const handleFeedbackSubmit = async ({ content, taskId }) => {
    if (!messageTargetStudent) return
    setMessageError('')
    let saved
    try {
      saved = await sendRoleMessage(token, {
        senderId: userId,
        receiverId: messageTargetStudent.id,
        content,
        taskId,
      })
    } catch {
      setMessageError('Unable to send feedback.')
      throw new Error('send failed')
    }

    setMessages((previous) => [...previous, saved])
  }

  const feedbackStudentTasks = useMemo(() => publishedTasks, [publishedTasks])

  const handleOpenTaskDetails = (taskId) => {
    setSelectedTaskId(taskId)
    setIsTaskDetailsModalOpen(true)
  }

  const messagesByStudent = useMemo(() => {
    const grouped = {}
    students.forEach((student) => {
      grouped[student.id] = []
    })
    messages.forEach((message) => {
      if (message.senderRole === 'Trainer') {
        grouped[message.receiverId] = [...(grouped[message.receiverId] ?? []), message]
      } else {
        grouped[message.senderId] = [...(grouped[message.senderId] ?? []), message]
      }
    })
    return grouped
  }, [messages, students])

  const taskTitleById = useMemo(() => {
    const map = {}
    publishedTasks.forEach((task) => {
      map[task.id] = task.title
    })
    return map
  }, [publishedTasks])

  const sentFeedbackByStudent = useMemo(() => {
    const grouped = {}

    messages
      .filter((message) => message.senderId === userId)
      .forEach((message) => {
        const studentId = message.receiverId
        if (!grouped[studentId]) {
          grouped[studentId] = {}
        }
        const taskKey = message.taskId || 'unscoped'
        grouped[studentId][taskKey] = [...(grouped[studentId][taskKey] ?? []), message]
      })

    Object.keys(grouped).forEach((studentId) => {
      Object.keys(grouped[studentId]).forEach((taskKey) => {
        grouped[studentId][taskKey] = grouped[studentId][taskKey].sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
        )
      })
    })

    return grouped
  }, [messages, userId])

  if ((role ?? '').toLowerCase() === 'admin') {
    return <Navigate to="/admin" replace />
  }

  if (!section || role !== 'Trainer') {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="min-h-dvh bg-[#FFF9F2] font-display text-slate-800 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          ← Back to Dashboard
        </Link>

        <section className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">{section.title}</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {section.company} • {section.duration}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                section.status === 'Completed'
                  ? 'border border-slate-800 bg-white text-slate-800 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-200'
                  : 'border border-violet-600 bg-violet-600 text-white shadow-sm shadow-violet-600/20 dark:border-violet-500 dark:bg-violet-500 dark:shadow-violet-900/30'
              }`}
            >
              {section.status.toUpperCase()}
            </span>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-6 border-b border-slate-200 pb-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
            {Object.keys(tabLabel).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`border-b-2 pb-2 text-sm ${
                  activeTab === tab
                    ? 'border-violet-600 font-semibold text-slate-800 dark:border-violet-400 dark:text-slate-100'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tabLabel[tab]}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          {activeTab === 'Students' ? (
            <>
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                Published tasks are visible to every enrolled trainee automatically. Use{' '}
                <strong className="font-semibold text-slate-800 dark:text-slate-200">Create Task</strong> on the trainer
                dashboard to publish new briefs.
              </p>
              {approvedTaskBriefs.length === 0 ? (
                <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100">
                  No published tasks yet for this session.
                </p>
              ) : (
                <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-100">
                  {publishedTasks.length} published task{publishedTasks.length === 1 ? '' : 's'} available to all{' '}
                  {students.length} trainee{students.length === 1 ? '' : 's'}.
                </p>
              )}

              <div className="space-y-3">
                {section.students.map((student) => (
                  <article
                    key={`${section.id}-${student.email}`}
                    className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950 sm:flex sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3 sm:w-[40%]">
                      <div className="h-8 w-8 rounded-full border border-slate-200 bg-white" />
                      <div>
                        <h2 className="text-sm font-semibold text-slate-800">{student.name}</h2>
                        <p className="text-xs text-slate-500">{student.email}</p>
                      </div>
                    </div>

                    <div className="mt-4 text-xs text-slate-500 sm:mt-0 sm:w-[30%]">
                      {publishedTasks.length} shared task{publishedTasks.length === 1 ? '' : 's'}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 sm:mt-0 sm:w-[30%] sm:justify-end">
                      <button
                        type="button"
                        onClick={() => openFeedbackModal(student)}
                        className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:border-violet-200 hover:bg-violet-50/70 dark:hover:border-violet-800 dark:hover:bg-violet-950/40"
                      >
                        Send Feedback
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenStudentTasks}
                        className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-violet-600/25 hover:bg-violet-500 dark:bg-violet-500 dark:hover:bg-violet-400"
                      >
                        View Tasks
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : null}

          {activeTab === 'Tasks' ? (
            <div className="space-y-3">
              <p className="mb-2 text-xs text-slate-500">
                Published tasks shared with all enrolled trainees in this session.
              </p>
              {publishedTasks.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  No published tasks yet. Publish a task from the trainer dashboard.
                </p>
              ) : (
                publishedTasks.map((task) => (
                  <article
                    key={task.id}
                    className={`w-full rounded-xl border p-4 transition ${
                      selectedTask?.id === task.id
                        ? 'border-violet-200 bg-violet-50/90 dark:border-violet-800 dark:bg-violet-950/50'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600'
                    }`}
                  >
                    <button type="button" onClick={() => handleOpenTaskDetails(task.id)} className="w-full text-left">
                      <p className="text-sm font-semibold text-slate-800">{task.title}</p>
                      <p className="mt-1 text-xs text-slate-500">Deadline: {task.deadline}</p>
                      <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
                        Visible to all {task.assignedStudents.length} trainee
                        {task.assignedStudents.length === 1 ? '' : 's'}
                      </p>
                    </button>
                  </article>
                ))
              )}
            </div>
          ) : null}

          {activeTab === 'Communication' ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                All feedback you sent is shown below, grouped by student and task.
              </p>
              {messageError ? <p className="rounded bg-rose-50 px-3 py-2 text-xs text-rose-700">{messageError}</p> : null}
              <div className="grid gap-3 sm:grid-cols-2">
                {section.students.map((student) => {
                  const thread = messagesByStudent[student.id] ?? []
                  const last = thread[thread.length - 1]
                  const feedbackGroups = sentFeedbackByStudent[student.id] ?? {}
                  const taskKeys = Object.keys(feedbackGroups)
                  return (
                    <article
                      key={`chat-${student.id}`}
                      className="rounded-xl border border-slate-200 p-4 transition hover:border-violet-200 hover:bg-violet-50/40 dark:border-slate-700 dark:hover:border-violet-800 dark:hover:bg-violet-950/35"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-800">{student.name}</h3>
                          <p className="text-xs text-slate-500">{student.email}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openFeedbackModal(student)}
                          className="shrink-0 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-violet-600/25 hover:bg-violet-500 dark:bg-violet-500 dark:hover:bg-violet-400"
                        >
                          Send Feedback
                        </button>
                      </div>
                      <p className="mt-3 line-clamp-2 text-xs text-slate-500">
                        {last ? (
                          <>
                            <span className="font-medium text-slate-600">
                              {last.senderRole === 'Trainer' ? 'You: ' : `${student.name}: `}
                            </span>
                            {last.content}
                          </>
                        ) : (
                          'No messages yet.'
                        )}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">{thread.length} message(s)</p>
                      <div className="mt-3 border-t border-slate-100 pt-3">
                        {taskKeys.length === 0 ? (
                          <p className="text-xs text-slate-400">No feedback sent yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {taskKeys.map((taskKey) => (
                              <div
                                key={taskKey}
                                className="rounded-lg border border-slate-100 bg-white p-2 dark:border-slate-700 dark:bg-slate-900"
                              >
                                <p className="text-xs font-semibold text-slate-700">
                                  {taskKey === 'unscoped' ? 'No task selected' : taskTitleById[taskKey] || 'Unknown task'}
                                  <span className="ml-1 font-normal text-slate-500">
                                    ({feedbackGroups[taskKey].length})
                                  </span>
                                </p>
                                <ul className="mt-1 space-y-1">
                                  {feedbackGroups[taskKey].slice(0, 3).map((message) => (
                                    <li key={message.id} className="rounded bg-white px-2 py-1 text-xs text-slate-600">
                                      <p className="whitespace-pre-wrap">{message.content}</p>
                                      <p className="mt-0.5 text-[10px] text-slate-400">
                                        {new Date(message.timestamp).toLocaleString()}
                                      </p>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {messageTargetStudent ? (
        <TrainerFeedbackModal
          key={messageTargetStudent.id}
          student={messageTargetStudent}
          trainerUserId={userId}
          allMessages={messages}
          studentTasks={feedbackStudentTasks}
          totalTasksCount={publishedTasks.length}
          quickActions={trainerFeedbackActions}
          onRemoveTaskFromStudent={() => {}}
          onClose={closeFeedbackModal}
          onSendFeedback={async (payload) => {
            try {
              await handleFeedbackSubmit(payload)
            } catch {
              setMessageError('Unable to send feedback.')
              throw new Error('send failed')
            }
          }}
        />
      ) : null}

      {isTaskDetailsModalOpen && selectedTask ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 px-4 backdrop-blur-sm dark:bg-slate-950/75">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800">{selectedTask.title}</h2>
              <button
                type="button"
                onClick={() => setIsTaskDetailsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-slate-600">{selectedTask.description}</p>
            {selectedTask.notes ? (
              <p className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-300">
                Notes: {selectedTask.notes}
              </p>
            ) : null}
            <div className="mt-4 space-y-1 text-sm text-slate-600">
              <p>
                <span className="font-semibold">Deadline:</span> {selectedTask.deadline}
              </p>
              <p>
                <span className="font-semibold">Attachment:</span> {selectedTask.attachmentName || 'No attachment'}
              </p>
            </div>
            <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-300">
              Visible to all {selectedTask.assignedStudents.length} enrolled trainee
              {selectedTask.assignedStudents.length === 1 ? '' : 's'}.
            </p>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default TrainerSectionDetailsPage
