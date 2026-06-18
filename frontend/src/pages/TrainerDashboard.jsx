import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  FilePlus2,
  LayoutDashboard,
  Upload,
} from 'lucide-react'
import CodeReviewModal from '../components/CodeReviewModal.jsx'
import TopicDocumentationPanel from '../components/trainer/topicDocumentation/TopicDocumentationPanel.jsx'
import TrainerTaskSubmissionsPanel from '../components/trainer/taskSubmissions/TrainerTaskSubmissionsPanel.jsx'
import {
  TRAINER_DASHBOARD_PENDING_SECTION_KEY,
  TRAINER_DASHBOARD_PENDING_TRAINING_KEY,
  STUDENT_LANDING_PATH,
} from '../components/nav/training-sphere/navConstants.js'
import { useAuth } from '../context/useAuth.js'
import { useTrainerCompanyWorkspace } from '../hooks/useTrainerCompanyWorkspace.js'
import { traineeEvaluations } from '../data/evaluations.js'
import { loadTraineeTasks } from '../utils/evaluationStorage.js'
import {
  getRequestsForTrainer,
  publishTrainerTaskBrief,
  publishTrainerTaskRequest,
} from '../utils/taskApprovalRequests.js'
import TrainerGithubProfilesPanel from '../components/trainer/github/TrainerGithubProfilesPanel.jsx'
import TrainerEnrollmentApplicationsPanel from '../components/trainer/enrollmentApplications/TrainerEnrollmentApplicationsPanel.jsx'
import TrainerEnrolledStudentsPanel from '../components/trainer/enrolledStudents/TrainerEnrolledStudentsPanel.jsx'
import TrainerMessagesPanel from '../components/trainer/messages/TrainerMessagesPanel.jsx'
import TrainerPublishedTasksPanel from '../components/trainer/tasks/TrainerPublishedTasksPanel.jsx'
import TrainerEnrollmentAlerts from '../components/trainer/enrollmentApplications/TrainerEnrollmentAlerts.jsx'
import CollapsibleWorkspaceRegion from '../components/trainer/CollapsibleWorkspaceRegion.jsx'
import CollapsibleWorkspaceToggle from '../components/trainer/CollapsibleWorkspaceToggle.jsx'
import { useCollapsiblePanel } from '../hooks/useCollapsiblePanel.js'
import { useTrainerEnrollmentInbox } from '../hooks/useTrainerEnrollmentInbox.js'
import {
  buildTrainerDashboardUrl,
  buildTrainerEnrollmentRequestsUrl,
  parseTrainerViewId,
} from '../utils/trainerDashboardNav.js'
import { filterApplicationsForTrainingId } from '../utils/trainerEnrollmentScope.js'
import { getMessagesForUser, MESSAGES_CHANGED_EVENT } from '../api/messageApi.js'
import { countTrainerIncomingMessages } from '../utils/trainerEnrolledStudents.js'
import { resolveCatalogCourseForTrainingId } from '../utils/catalogCourseContext.js'

function TrainerDashboard() {
  const { trainerName, role, email, token, userId } = useAuth()
  const navigate = useNavigate()
  const companyWorkspace = useTrainerCompanyWorkspace(email, trainerName)
  const [searchParams] = useSearchParams()
  const trainingIdFromUrl = String(searchParams.get('training') ?? '').trim()
  const applicationIdFromUrl = String(searchParams.get('application') ?? '').trim()
  const activeViewId = parseTrainerViewId(searchParams)
  const normalizedRole = (role ?? '').toLowerCase()
  const defaultSessionId =
    companyWorkspace.sessions.find((section) => section.status === 'Active')?.id ??
    companyWorkspace.sessions[0]?.id ??
    ''
  const [requestsTick, setRequestsTick] = useState(0)
  const [isPublishingTask, setIsPublishingTask] = useState(false)
  const [taskNotice, setTaskNotice] = useState({ type: '', message: '' })
  const [evaluationTick, setEvaluationTick] = useState(0)
  const [taskForm, setTaskForm] = useState({
    sessionId: defaultSessionId,
    title: '',
    description: '',
    deadline: '',
    attachmentName: '',
    attachmentDataUrl: '',
  })
  const [repoReviewTask, setRepoReviewTask] = useState(null)
  const [incomingMessageCount, setIncomingMessageCount] = useState(0)
  const workspacePanel = useCollapsiblePanel()

  const sessionSummaries = useMemo(() => {
    return companyWorkspace.sessions.map((section) => {
      const students = section.students ?? []
      const averageProgress =
        students.length > 0
          ? Math.round(students.reduce((sum, student) => sum + (student.progress ?? 0), 0) / students.length)
          : 0
      return {
        ...section,
        studentsTotal: students.length,
        averageProgress,
      }
    })
  }, [companyWorkspace.sessions])

  const selectedTrainingSession = useMemo(() => {
    const fromUrl = sessionSummaries.find((section) => section.id === trainingIdFromUrl)
    if (fromUrl) return fromUrl
    return sessionSummaries[0] ?? null
  }, [sessionSummaries, trainingIdFromUrl])

  const dashboardTrainingId = selectedTrainingSession?.id || defaultSessionId

  useEffect(() => {
    if (sessionSummaries.length === 0) return
    const validFromUrl = sessionSummaries.some((section) => section.id === trainingIdFromUrl)
    if (!trainingIdFromUrl || validFromUrl) return
    const nextId = defaultSessionId
    navigate(buildTrainerDashboardUrl(nextId, activeViewId), { replace: true })
  }, [activeViewId, defaultSessionId, navigate, sessionSummaries, trainingIdFromUrl])

  const inbox = useTrainerEnrollmentInbox({
    token,
    trainerEmail: email,
    trainerId: userId,
    role,
    enabled: normalizedRole === 'trainer' || normalizedRole === 'admin',
    trainingId: dashboardTrainingId,
  })

  const enrollmentBadgeCount = inbox.pendingCount

  const openEnrollmentRequests = (url = buildTrainerEnrollmentRequestsUrl('', dashboardTrainingId)) => {
    navigate(url)
    workspacePanel.setActiveId('enrollment-requests')
  }

  const scopedEnrollmentAlerts = useMemo(() => {
    if (!dashboardTrainingId) return inbox.pendingByCourse
    return inbox.pendingByCourse.filter(
      (group) =>
        filterApplicationsForTrainingId(
          [{ branchId: group.branchId, courseId: group.courseId }],
          dashboardTrainingId,
        ).length > 0,
    )
  }, [dashboardTrainingId, inbox.pendingByCourse])

  const activeCourseTitle = useMemo(() => {
    const fromSession = String(selectedTrainingSession?.title ?? '').trim()
    if (fromSession) return fromSession
    return String(resolveCatalogCourseForTrainingId(dashboardTrainingId)?.courseTitle ?? '').trim()
  }, [dashboardTrainingId, selectedTrainingSession?.title])

  useEffect(() => {
    const onUpdate = () => setRequestsTick((t) => t + 1)
    window.addEventListener('trainer-task-requests-updated', onUpdate)
    return () => window.removeEventListener('trainer-task-requests-updated', onUpdate)
  }, [])

  useEffect(() => {
    if (!userId || !token) {
      setIncomingMessageCount(0)
      return
    }
    const load = async () => {
      try {
        const rows = await getMessagesForUser(token, userId, { email })
        setIncomingMessageCount(
          countTrainerIncomingMessages(rows, userId, {
            trainingId: dashboardTrainingId,
            trainerEmail: email,
          }),
        )
      } catch {
        setIncomingMessageCount(0)
      }
    }
    void load()
    const bump = () => void load()
    window.addEventListener(MESSAGES_CHANGED_EVENT, bump)
    return () => window.removeEventListener(MESSAGES_CHANGED_EVENT, bump)
  }, [dashboardTrainingId, email, token, userId])

  const evaluationRows = useMemo(
    () =>
      traineeEvaluations.map((row) => ({
        ...row,
        storedTasks: loadTraineeTasks(row.id, row.tasks),
      })),
    [evaluationTick],
  )

  const taskDrafts = useMemo(() => {
    const rows = getRequestsForTrainer(email)
    const filtered = trainingIdFromUrl
      ? rows.filter((row) => row.sessionId === trainingIdFromUrl)
      : rows
    return filtered.slice(0, 24)
  }, [email, requestsTick, trainingIdFromUrl])

  const WORKSPACE_PANEL_IDS = new Set([
    'enrolled-students',
    'messages',
    'create-task',
    'my-tasks',
    'topics',
    'evaluate',
    'github',
    'enrollment-requests',
    'tasks',
    'topic-documentation',
  ])

  const openWorkspacePanel = (sectionId) => {
    const map = {
      tasks: 'create-task',
      'topic-documentation': 'topics',
    }
    const panelId = map[sectionId] ?? sectionId
    if (!WORKSPACE_PANEL_IDS.has(panelId)) return false
    workspacePanel.setActiveId(panelId)
    return true
  }

  useEffect(() => {
    const handleExternalNav = (event) => {
      const sectionId = event?.detail?.sectionId
      if (!sectionId) return
      if (openWorkspacePanel(sectionId)) return
    }

    window.addEventListener('trainer-dashboard-nav', handleExternalNav)
    return () => window.removeEventListener('trainer-dashboard-nav', handleExternalNav)
  }, [])

  useEffect(() => {
    if (activeViewId === 'enrollment-requests') {
      workspacePanel.setActiveId('enrollment-requests')
    }
    if (activeViewId === 'enrolled-students') {
      workspacePanel.setActiveId('enrolled-students')
    }
    if (activeViewId === 'messages') {
      workspacePanel.setActiveId('messages')
    }
    if (activeViewId === 'my-tasks') {
      workspacePanel.setActiveId('my-tasks')
    }
  }, [activeViewId])

  useEffect(() => {
    let pending = ''
    let pendingTraining = ''
    try {
      pending = sessionStorage.getItem(TRAINER_DASHBOARD_PENDING_SECTION_KEY) ?? ''
      pendingTraining = sessionStorage.getItem(TRAINER_DASHBOARD_PENDING_TRAINING_KEY) ?? ''
    } catch {
      return
    }
    if (!pending && !pendingTraining) return
    try {
      sessionStorage.removeItem(TRAINER_DASHBOARD_PENDING_SECTION_KEY)
      sessionStorage.removeItem(TRAINER_DASHBOARD_PENDING_TRAINING_KEY)
    } catch {
      /* ignore */
    }
    requestAnimationFrame(() => {
      if (pending) {
        openWorkspacePanel(pending)
      }
    })
  }, [])

  useEffect(() => {
    const nextId = selectedTrainingSession?.id
    if (!nextId) return
    setTaskForm((prev) => (prev.sessionId === nextId ? prev : { ...prev, sessionId: nextId }))
  }, [selectedTrainingSession?.id])

  const handleTaskFieldChange = (event) => {
    const { name, value } = event.target
    setTaskForm((previous) => ({ ...previous, [name]: value }))
  }

  const handleTaskAttachmentChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      setTaskForm((previous) => ({ ...previous, attachmentName: '', attachmentDataUrl: '' }))
      return
    }
    if (file.size > 512 * 1024) {
      setTaskNotice({ type: 'error', message: 'Attachment must be 512 KB or smaller.' })
      event.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setTaskForm((previous) => ({
        ...previous,
        attachmentName: file.name,
        attachmentDataUrl: typeof reader.result === 'string' ? reader.result : '',
      }))
    }
    reader.readAsDataURL(file)
  }

  const handlePublishTask = async (event) => {
    event.preventDefault()
    if (!taskForm.sessionId || !taskForm.title.trim() || !taskForm.description.trim() || !taskForm.deadline) {
      setTaskNotice({
        type: 'error',
        message: 'Training session, task title, description, and deadline are required.',
      })
      return
    }

    const session = sessionSummaries.find((item) => item.id === taskForm.sessionId)
    setIsPublishingTask(true)
    setTaskNotice({ type: '', message: '' })
    try {
      await publishTrainerTaskBrief({
        id: `task-req-${Date.now()}`,
        requestedByEmail: (email ?? '').trim().toLowerCase(),
        trainerName: trainerName || 'Trainer',
        sessionId: taskForm.sessionId,
        sessionTitle: session?.title ?? 'Training session',
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        deadline: taskForm.deadline,
        attachmentName: taskForm.attachmentName,
        attachmentDataUrl: taskForm.attachmentDataUrl,
        createdAt: new Date().toISOString(),
      })
      setRequestsTick((t) => t + 1)
      setTaskNotice({
        type: 'success',
        message: `Task published for ${session?.title ?? 'session'}. All enrolled trainees can see it immediately.`,
      })
      setTaskForm({
        sessionId: taskForm.sessionId,
        title: '',
        description: '',
        deadline: '',
        attachmentName: '',
        attachmentDataUrl: '',
      })
    } catch {
      setTaskNotice({
        type: 'error',
        message: 'Could not save the task to the database. Check that the backend is running and try again.',
      })
    } finally {
      setIsPublishingTask(false)
    }
  }

  if (normalizedRole === 'admin') {
    return <Navigate to="/admin" replace />
  }

  if (normalizedRole === 'company') {
    return <Navigate to="/company/dashboard" replace />
  }

  if (normalizedRole === 'student') {
    return <Navigate to={STUDENT_LANDING_PATH} replace />
  }

  return (
    <main className="min-h-dvh bg-[#FFF9F2] font-display text-slate-800 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="space-y-6">
          <TrainerEnrollmentAlerts
            pendingByCourse={scopedEnrollmentAlerts}
            sessions={sessionSummaries}
            onReview={openEnrollmentRequests}
          />

          <div className="rounded-3xl border border-violet-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-4 text-white sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                    <LayoutDashboard className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-100">Training Sphere</p>
                    <p className="mt-1 text-lg font-semibold">{companyWorkspace.displayName}</p>
                    {companyWorkspace.hasCompanyData ? (
                      <p className="mt-1 text-sm text-violet-100/90">
                        {companyWorkspace.companyName}
                        {companyWorkspace.position ? ` · ${companyWorkspace.position}` : ''}
                      </p>
                    ) : null}
                  </div>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-violet-50/90 sm:text-right">
                  {companyWorkspace.hasCompanyData
                    ? companyWorkspace.linkedTrackTitles.length > 0
                      ? `Assigned tracks: ${companyWorkspace.linkedTrackTitles.join(', ')}. Manage company programs, tasks, and trainee activity here.`
                      : 'Your company workspace — manage assigned programs, tasks, and trainee activity here.'
                    : 'Manage sessions, tasks, evaluations, repositories, and trainee activity from one workspace.'}
                </p>
              </div>
            </div>
          </div>

          <section
            id="overview"
            className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
              <div className="bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 px-6 py-6 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950/30">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-400">
                      Trainer Dashboard
                    </p>
                    {activeCourseTitle ? (
                      <>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          Course
                        </p>
                        <h2 className="mt-1 text-3xl font-bold tracking-tight text-violet-800 dark:text-violet-200">
                          {activeCourseTitle}
                        </h2>
                      </>
                    ) : null}
                    <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                      {activeCourseTitle
                        ? 'Trainer workspace'
                        : companyWorkspace.hasCompanyData
                          ? `${companyWorkspace.companyName} trainer workspace`
                          : 'Modern control center for trainer workflows'}
                    </h1>
                    <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
                      {companyWorkspace.hasCompanyData
                        ? `Programs and tracks assigned by ${companyWorkspace.companyName}. Create task briefs, review submissions, and manage day-to-day training for your published sessions.`
                        : 'Access your assigned training sessions, create task briefs, evaluate trainee submissions, review GitHub repositories, and manage training operations from one place.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3" role="tablist" aria-label="Workspace tools">
                    <CollapsibleWorkspaceToggle
                      id="enrolled-students"
                      label="Enrolled students"
                      isActive={workspacePanel.isActive('enrolled-students')}
                      onToggle={workspacePanel.toggle}
                      variant="primary"
                    />
                    <CollapsibleWorkspaceToggle
                      id="messages"
                      label="Messages"
                      isActive={workspacePanel.isActive('messages')}
                      onToggle={workspacePanel.toggle}
                      badgeCount={incomingMessageCount}
                    />
                    <CollapsibleWorkspaceToggle
                      id="create-task"
                      label="Create Task"
                      isActive={workspacePanel.isActive('create-task')}
                      onToggle={workspacePanel.toggle}
                    />
                    <CollapsibleWorkspaceToggle
                      id="my-tasks"
                      label="My tasks"
                      isActive={workspacePanel.isActive('my-tasks')}
                      onToggle={workspacePanel.toggle}
                      badgeCount={taskDrafts.length}
                    />
                    <CollapsibleWorkspaceToggle
                      id="topics"
                      label="Topic documentation"
                      isActive={workspacePanel.isActive('topics')}
                      onToggle={workspacePanel.toggle}
                      variant="accent"
                    />
                    <CollapsibleWorkspaceToggle
                      id="evaluate"
                      label="Task Submissions"
                      isActive={workspacePanel.isActive('evaluate')}
                      onToggle={workspacePanel.toggle}
                    />
                    <CollapsibleWorkspaceToggle
                      id="github"
                      label="GitHub Students"
                      isActive={workspacePanel.isActive('github')}
                      onToggle={workspacePanel.toggle}
                    />
                    <CollapsibleWorkspaceToggle
                      id="enrollment-requests"
                      label="Accept new students"
                      isActive={workspacePanel.isActive('enrollment-requests')}
                      onToggle={workspacePanel.toggle}
                      badgeCount={enrollmentBadgeCount}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 px-6 py-6 dark:border-slate-700">
                <CollapsibleWorkspaceRegion
                  panelId="enrolled-students"
                  activeId={workspacePanel.activeId}
                  title="Enrolled students"
                >
                  <TrainerEnrolledStudentsPanel
                    role={normalizedRole}
                    token={token}
                    trainerId={userId}
                    trainerEmail={email}
                    trainingId={dashboardTrainingId}
                    trainingTitle={selectedTrainingSession?.title}
                  />
                </CollapsibleWorkspaceRegion>

                <CollapsibleWorkspaceRegion panelId="messages" activeId={workspacePanel.activeId} title="Messages">
                  <TrainerMessagesPanel
                    role={normalizedRole}
                    token={token}
                    trainerId={userId}
                    trainerEmail={email}
                    trainerName={trainerName}
                    trainingId={dashboardTrainingId}
                    trainingTitle={selectedTrainingSession?.title}
                  />
                </CollapsibleWorkspaceRegion>

                <CollapsibleWorkspaceRegion panelId="create-task" activeId={workspacePanel.activeId} title="Create Task">
<div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Create New Tasks
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Create Task</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                    Build a task brief with title, description, deadline, and optional attachment, then publish it
                    directly to your training session.
                  </p>
                </div>

              <div className="mt-6 grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
                <form onSubmit={handlePublishTask} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950/40">
                  <div>
                    <label htmlFor="task-session" className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Training Session
                    </label>
                    <select
                      id="task-session"
                      name="sessionId"
                      value={taskForm.sessionId}
                      onChange={handleTaskFieldChange}
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
                    <label htmlFor="task-title" className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Task Title
                    </label>
                    <input
                      id="task-title"
                      name="title"
                      value={taskForm.title}
                      onChange={handleTaskFieldChange}
                      placeholder="e.g. Build trainer dashboard UI"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                    />
                  </div>

                  <div>
                    <label htmlFor="task-description" className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Task Description
                    </label>
                    <textarea
                      id="task-description"
                      name="description"
                      value={taskForm.description}
                      onChange={handleTaskFieldChange}
                      rows={4}
                      placeholder="Describe what trainees should complete and what success looks like."
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="task-deadline" className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Deadline
                      </label>
                      <input
                        id="task-deadline"
                        type="date"
                        name="deadline"
                        value={taskForm.deadline}
                        onChange={handleTaskFieldChange}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                      />
                    </div>

                    <div>
                      <label htmlFor="task-attachment" className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Attachments Upload
                      </label>
                      <label
                        htmlFor="task-attachment"
                        className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-600 transition hover:border-violet-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
                      >
                        <span>{taskForm.attachmentName || 'Choose file'}</span>
                        <Upload className="h-4 w-4" aria-hidden />
                      </label>
                      <input id="task-attachment" type="file" onChange={handleTaskAttachmentChange} className="hidden" />
                    </div>
                  </div>

                  {taskNotice.message ? (
                    <p
                      className={`text-sm ${
                        taskNotice.type === 'error'
                          ? 'text-rose-600 dark:text-rose-300'
                          : 'text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      {taskNotice.message}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={isPublishingTask}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-violet-600/25 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-400"
                  >
                    <FilePlus2 className="h-4 w-4" aria-hidden />
                    {isPublishingTask ? 'Saving…' : 'Publish task'}
                  </button>
                </form>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-950/40">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Published tasks
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">Your task briefs</h3>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {taskDrafts.length}
                    </span>
                  </div>

                  {taskDrafts.length === 0 ? (
                    <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      No published tasks yet. Use the form to publish a task brief for this training.
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {taskDrafts.map((draft) => {
                        const status = draft.status ?? 'pending'
                        const badgeClass =
                          status === 'approved'
                            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200'
                            : status === 'rejected'
                              ? 'bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200'
                              : 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
                        const badgeLabel =
                          status === 'approved' ? 'Published' : status === 'rejected' ? 'Rejected' : 'Draft'
                        return (
                          <li key={draft.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{draft.title}</p>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`}>
                                {badgeLabel}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{draft.sessionTitle}</p>
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Deadline: {draft.deadline}</p>
                            {draft.attachmentName ? (
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Attachment: {draft.attachmentName}</p>
                            ) : null}
                            {status === 'pending' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  void publishTrainerTaskRequest(draft.id)
                                    .then(() => setRequestsTick((t) => t + 1))
                                    .catch(() => {
                                      setTaskNotice({
                                        type: 'error',
                                        message: 'Could not publish the task. Try again.',
                                      })
                                    })
                                }}
                                className="mt-3 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500 dark:bg-violet-500 dark:hover:bg-violet-400"
                              >
                                Publish now
                              </button>
                            ) : null}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
                </CollapsibleWorkspaceRegion>

                <CollapsibleWorkspaceRegion panelId="my-tasks" activeId={workspacePanel.activeId} title="My tasks">
                  <TrainerPublishedTasksPanel
                    trainerEmail={email}
                    trainingId={dashboardTrainingId}
                    trainingTitle={selectedTrainingSession?.title}
                    sessionSummaries={sessionSummaries}
                  />
                </CollapsibleWorkspaceRegion>

                <CollapsibleWorkspaceRegion panelId="topics" activeId={workspacePanel.activeId} title="Topic documentation">
                  <TopicDocumentationPanel
                    trainerKey={(email ?? '').trim().toLowerCase()}
                    trainingId={dashboardTrainingId}
                    trainingTitle={selectedTrainingSession?.title}
                    sessionSummaries={sessionSummaries}
                    embedded
                    onClose={workspacePanel.collapse}
                    onTrainingChange={(id) => navigate(buildTrainerDashboardUrl(id, 'topics'), { replace: true })}
                  />
                </CollapsibleWorkspaceRegion>

                <CollapsibleWorkspaceRegion panelId="evaluate" activeId={workspacePanel.activeId} title="Task Submissions">
                  <TrainerTaskSubmissionsPanel
                    role={normalizedRole}
                    trainingId={dashboardTrainingId}
                    trainingTitle={selectedTrainingSession?.title}
                    sessionSummaries={sessionSummaries}
                    evaluationRows={evaluationRows}
                    trainerName={trainerName || 'Trainer'}
                    onReviewSaved={() => setEvaluationTick((value) => value + 1)}
                  />
                </CollapsibleWorkspaceRegion>

                <CollapsibleWorkspaceRegion panelId="github" activeId={workspacePanel.activeId} title="GitHub Students">
                  <TrainerGithubProfilesPanel
                    role={normalizedRole}
                    trainingId={dashboardTrainingId}
                    trainingTitle={selectedTrainingSession?.title}
                    sessionSummaries={sessionSummaries}
                    evaluationRows={evaluationRows}
                    onPreviewRepository={(item) => setRepoReviewTask(item)}
                  />
                </CollapsibleWorkspaceRegion>

                <CollapsibleWorkspaceRegion
                  panelId="enrollment-requests"
                  activeId={workspacePanel.activeId}
                  title="Accept new students"
                >
                  <TrainerEnrollmentApplicationsPanel
                    token={token}
                    trainerEmail={email}
                    trainerId={userId}
                    role={normalizedRole}
                    trainingId={dashboardTrainingId}
                    trainingTitle={activeCourseTitle}
                    initialApplicationId={applicationIdFromUrl}
                  />
                </CollapsibleWorkspaceRegion>
              </div>
            </section>

            {selectedTrainingSession ? (
              <section className="rounded-2xl border border-violet-200 bg-violet-50/60 px-5 py-4 dark:border-violet-900/50 dark:bg-violet-950/30">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">
                  Active training
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{selectedTrainingSession.title}</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {selectedTrainingSession.company}
                  {selectedTrainingSession.linkedTrackTitle ? ` · ${selectedTrainingSession.linkedTrackTitle}` : ''}
                  {' · '}
                  {selectedTrainingSession.status}
                </p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Use the sidebar to switch trainings or open workspace tools for this program.
                </p>
              </section>
            ) : null}

            

            

            

            

        </div>
      </div>

      {repoReviewTask ? (
        <CodeReviewModal
          traineeName={repoReviewTask.traineeName}
          branch={repoReviewTask.branch ?? 'main'}
          projectTag={repoReviewTask.tag}
          taskTitle={repoReviewTask.title}
          onClose={() => setRepoReviewTask(null)}
        />
      ) : null}
    </main>
  )
}

export default TrainerDashboard
