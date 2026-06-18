import axios from 'axios'
import { apiClient, isLocalOnlySession } from './authApi.js'
import { pushTaskSubmissionNotification } from './enrollmentApplicationApi.js'
import { recordStudentAction } from '../utils/studentUserActivity.js'
import { withCourseParams, getCourseQueryParams } from '../utils/studentApiCourseParams.js'
import { resolveCourseTrainer } from '../utils/resolveCourseTrainer.js'
import { TRAINER_SUBMISSIONS_CHANGED_EVENT } from '../utils/trainerTaskSubmissions.js'
import { filterFeedbackItemsForCourse, listStudentTaskFeedback } from '../utils/studentTaskFeedback.js'
import { hasCatalogEnrollmentRecord } from '../utils/trainingCatalogEnrollment.js'
import {
  listPublishedTasksForCourse,
  mergePublishedTasksWithStudentState,
} from '../utils/studentCourseTasks.js'
import { ensureApprovedBriefsForCourse } from '../utils/taskApprovalRequests.js'

const LS = {
  tasks: (userId) => `ts-student-tasks-${userId}`,
  submissions: (userId) => `ts-student-submissions-${userId}`,
  applications: (userId) => `ts-student-applications-${userId}`,
}

const demoPrograms = () => [
  {
    id: 'prog-cloud-01',
    title: 'Cloud reliability intern',
    company: 'Northwind Labs',
    specialization: 'Cloud / DevOps',
    trainingType: 'Internship',
    summary: 'Shadow on-call rotations, build runbooks, and automate health checks.',
    opensOnUtc: new Date(Date.now() - 30 * 864e5).toISOString(),
    closesOnUtc: new Date(Date.now() + 60 * 864e5).toISOString(),
  },
  {
    id: 'prog-sec-02',
    title: 'Application security residency',
    company: 'Contoso Security',
    specialization: 'Cybersecurity',
    trainingType: 'Residency',
    summary: 'Threat modeling, secure code review, and tooling integration sprints.',
    opensOnUtc: new Date(Date.now() - 14 * 864e5).toISOString(),
    closesOnUtc: new Date(Date.now() + 30 * 864e5).toISOString(),
  },
  {
    id: 'prog-fe-03',
    title: 'Product engineering trainee',
    company: 'Fabrikam Digital',
    specialization: 'Frontend',
    trainingType: 'Traineeship',
    summary: 'Ship UI experiments, instrument analytics, and pair with designers.',
    opensOnUtc: new Date(Date.now() - 7 * 864e5).toISOString(),
    closesOnUtc: new Date(Date.now() + 45 * 864e5).toISOString(),
  },
]

const defaultTasksForUser = (userId) => {
  if (userId === 'student-mohamed') {
    return [
      {
        id: 'task-ts-101',
        title: 'API integration checkpoint',
        description: 'Connect the Training Sphere dashboard to authenticated endpoints and handle 401/403 states.',
        deadlineUtc: new Date(Date.now() + 4 * 864e5).toISOString(),
        submissionStatus: 'Pending Review',
        lastSubmissionId: 'sub-demo-1',
      },
      {
        id: 'task-ts-102',
        title: 'Weekly learning journal',
        description: 'Submit a short reflection on blockers, learnings, and next steps.',
        deadlineUtc: new Date(Date.now() + 1 * 864e5).toISOString(),
        submissionStatus: 'Not Submitted',
        lastSubmissionId: null,
      },
      {
        id: 'task-ts-103',
        title: 'Capstone wireframes',
        description: 'Low-fidelity wireframes for the internship reporting module.',
        deadlineUtc: new Date(Date.now() + 10 * 864e5).toISOString(),
        submissionStatus: 'Completed',
        lastSubmissionId: 'sub-demo-0',
      },
    ]
  }
  if (userId === 'student-sara') {
    return [
      {
        id: 'task-ts-201',
        title: 'Security review checklist',
        description: 'Complete the secure coding checklist for your assigned service.',
        deadlineUtc: new Date(Date.now() + 3 * 864e5).toISOString(),
        submissionStatus: 'Not Submitted',
        lastSubmissionId: null,
      },
      {
        id: 'task-ts-202',
        title: 'Unit tests for validators',
        description: 'Add tests covering edge cases for input validation helpers.',
        deadlineUtc: new Date(Date.now() + 6 * 864e5).toISOString(),
        submissionStatus: 'Pending Review',
        lastSubmissionId: null,
      },
    ]
  }
  if (userId === 'student-hassan') {
    return [
      {
        id: 'task-ts-301',
        title: 'Onboarding quiz',
        description: 'Finish the platform onboarding knowledge check.',
        deadlineUtc: new Date(Date.now() - 1 * 864e5).toISOString(),
        submissionStatus: 'Overdue',
        lastSubmissionId: null,
      },
    ]
  }
  return [
    {
      id: 'task-ts-default',
      title: 'Welcome task',
      description: 'Confirm you can sign in, open the student dashboard, and read your assignments.',
      deadlineUtc: new Date(Date.now() + 7 * 864e5).toISOString(),
      submissionStatus: 'Not Submitted',
      lastSubmissionId: null,
    },
  ]
}

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

const writeJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value))
}

const authHeaders = (token) => (token ? { Authorization: `Bearer ${token}` } : {})

const isNetworkishFailure = (error) => !axios.isAxiosError(error) || !error.response

function shouldUseLocalStudentFallback(error, token) {
  if (isLocalOnlySession(token)) return true
  if (isNetworkishFailure(error)) return true
  if (axios.isAxiosError(error) && error.response?.status === 401) return true
  return false
}

async function loadCourseTasksForStudent(token, userId, branchId, courseId) {
  if (!userId || !branchId || !courseId) return null
  if (isLocalOnlySession(token) && !hasCatalogEnrollmentRecord(userId, branchId, courseId)) return []

  await ensureApprovedBriefsForCourse(branchId, courseId)
  const published = listPublishedTasksForCourse(branchId, courseId)
  const cached = readJson(LS.tasks(userId), [])
  return mergePublishedTasksWithStudentState(published, cached)
}

export async function fetchStudentTasks(token, userId, searchParams = null) {
  const course = getCourseQueryParams(
    searchParams ?? (typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null),
  )
  const { branchId, courseId } = course

  if (branchId && courseId) {
    const courseTasks = await loadCourseTasksForStudent(token, userId, branchId, courseId)
    if (courseTasks !== null) {
      return courseTasks
    }
  }

  if (isLocalOnlySession(token)) {
    const cached = readJson(LS.tasks(userId), null)
    return cached ?? defaultTasksForUser(userId)
  }

  if (branchId && courseId) {
    await ensureApprovedBriefsForCourse(branchId, courseId)
    const published = listPublishedTasksForCourse(branchId, courseId)
    const cached = readJson(LS.tasks(userId), [])
    return mergePublishedTasksWithStudentState(published, cached)
  }

  try {
    const { data } = await apiClient.get('/Tasks/me', withCourseParams({ headers: authHeaders(token) }, searchParams))
    return Array.isArray(data) ? data : []
  } catch (error) {
    if (shouldUseLocalStudentFallback(error, token)) {
      const courseTasks = await loadCourseTasksForStudent(token, userId, branchId, courseId)
      if (courseTasks !== null) return courseTasks
      const cached = readJson(LS.tasks(userId), null)
      return cached ?? defaultTasksForUser(userId)
    }
    throw error
  }
}

export async function persistStudentTasksCache(userId, tasks) {
  const incoming = Array.isArray(tasks) ? tasks : []
  const existing = readJson(LS.tasks(userId), [])
  const byId = new Map(existing.map((row) => [row.id, row]))
  for (const row of incoming) {
    byId.set(row.id, { ...byId.get(row.id), ...row })
  }
  writeJson(LS.tasks(userId), Array.from(byId.values()))
}

export async function fetchStudentSubmissions(token, userId) {
  if (isLocalOnlySession(token)) {
    return readJson(LS.submissions(userId), [])
  }
  try {
    const { data } = await apiClient.get('/Submission/me', withCourseParams({ headers: authHeaders(token) }))
    return data
  } catch (error) {
    if (shouldUseLocalStudentFallback(error, token)) {
      return readJson(LS.submissions(userId), [])
    }
    throw error
  }
}

function logTaskSubmissionAction(userId, payload) {
  const tasks = readJson(LS.tasks(userId), defaultTasksForUser(userId))
  const task = tasks.find((t) => t.id === payload.taskId)
  recordStudentAction({
    userId,
    type: 'task_submitted',
    label: `Submitted “${task?.title ?? 'task'}”`,
    detail: payload.fileName || payload.submissionLink || 'Waiting for trainer review',
    href: '/student/tasks',
    tone: 'success',
  })
}

export async function submitStudentTask(token, userId, payload) {
  const course = getCourseQueryParams()
  const courseTasks = await loadCourseTasksForStudent(token, userId, course.branchId, course.courseId)
  const tasks =
    courseTasks ??
    readJson(LS.tasks(userId), defaultTasksForUser(userId))
  const task = tasks.find((t) => t.id === payload.taskId)
  const taskTitle = task?.title ?? payload.taskTitle ?? 'Task'
  const trainer = course.branchId && course.courseId ? resolveCourseTrainer(course.branchId, course.courseId) : null

  const persistLocalSubmission = () => {
    const record = {
      id: `local-sub-${Date.now()}`,
      studentId: userId,
      taskId: payload.taskId,
      taskTitle,
      branchId: course.branchId || null,
      courseId: course.courseId || null,
      submissionLink: payload.submissionLink ?? null,
      fileName: payload.fileName ?? null,
      notes: payload.notes ?? null,
      submittedAtUtc: new Date().toISOString(),
      status: 'Pending Evaluation',
    }
    const prev = readJson(LS.submissions(userId), []).filter((row) => row.taskId !== payload.taskId)
    writeJson(LS.submissions(userId), [record, ...prev])

    const nextTasks = tasks.map((t) =>
      t.id === payload.taskId ? { ...t, submissionStatus: 'Pending Review', lastSubmissionId: record.id } : t,
    )
    writeJson(LS.tasks(userId), nextTasks)

    if (trainer?.trainerId) {
      pushTaskSubmissionNotification(trainer.trainerId, {
        submissionId: record.id,
        taskId: payload.taskId,
        taskTitle,
        studentId: userId,
        studentName: payload.studentName ?? '',
        branchId: course.branchId,
        courseId: course.courseId,
        courseTitle: trainer.courseTitle || taskTitle,
        trainingId: course.courseId,
      })
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(TRAINER_SUBMISSIONS_CHANGED_EVENT))
    }
    logTaskSubmissionAction(userId, payload)
    return { source: 'local', record }
  }

  if (isLocalOnlySession(token)) {
    return persistLocalSubmission()
  }
  try {
    const { data } = await apiClient.post(
      '/Submission/task',
      {
        ...payload,
        taskTitle,
        branchId: course.branchId || null,
        courseId: course.courseId || null,
        studentName: payload.studentName ?? '',
        legacyLocalId: `local-sub-${payload.taskId}-${userId}`,
      },
      withCourseParams({ headers: authHeaders(token) }),
    )
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(TRAINER_SUBMISSIONS_CHANGED_EVENT))
    }
    logTaskSubmissionAction(userId, payload)
    return { source: 'api', record: data }
  } catch (error) {
    if (shouldUseLocalStudentFallback(error, token)) {
      return persistLocalSubmission()
    }
    throw error
  }
}

export async function fetchInternshipPrograms(token) {
  if (isLocalOnlySession(token)) {
    return demoPrograms()
  }
  try {
    const { data } = await apiClient.get('/Internships/programs', { headers: authHeaders(token) })
    return data
  } catch (error) {
    if (shouldUseLocalStudentFallback(error, token)) {
      return demoPrograms()
    }
    throw error
  }
}

export async function fetchMyApplications(token, userId) {
  if (isLocalOnlySession(token)) {
    return readJson(LS.applications(userId), [])
  }
  try {
    const { data } = await apiClient.get('/Internships/applications/me', { headers: authHeaders(token) })
    return data
  } catch (error) {
    if (shouldUseLocalStudentFallback(error, token)) {
      return readJson(LS.applications(userId), [])
    }
    throw error
  }
}

export async function applyToInternship(token, userId, payload) {
  const persistLocalApplication = () => {
    const now = new Date().toISOString()
    const record = {
      id: `local-app-${Date.now()}`,
      studentId: userId,
      programId: payload.programId,
      status: 'Pending',
      coverLetter: payload.coverLetter ?? null,
      cvFileName: payload.cvFileName ?? null,
      createdAtUtc: now,
      timeline: [
        { label: 'Application received', state: 'Complete', atUtc: now },
        { label: 'Recruiter screen', state: 'Upcoming', atUtc: new Date(Date.now() + 2 * 864e5).toISOString() },
      ],
    }
    const prev = readJson(LS.applications(userId), [])
    writeJson(LS.applications(userId), [record, ...prev])
    recordStudentAction({
      userId,
      type: 'application',
      label: 'Internship application sent',
      detail: 'Status: Pending',
      href: '/student/applications',
      tone: 'pending',
    })
    return { source: 'local', record }
  }

  if (isLocalOnlySession(token)) {
    return persistLocalApplication()
  }
  try {
    const { data } = await apiClient.post('/Internships/applications', payload, { headers: authHeaders(token) })
    recordStudentAction({
      userId,
      type: 'application',
      label: 'Internship application sent',
      detail: payload.programTitle || 'Your application is in review',
      href: '/student/applications',
      tone: 'pending',
    })
    return { source: 'api', record: data }
  } catch (error) {
    if (shouldUseLocalStudentFallback(error, token)) {
      return persistLocalApplication()
    }
    throw error
  }
}

export async function validateGithubRepo(token, repositoryUrl) {
  const offlineValidate = () => {
    const trimmed = repositoryUrl.trim()
    const ok = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/?$/i.test(trimmed)
    return {
      isValid: ok,
      message: ok ? 'Offline validation: URL format looks correct.' : 'Use a URL like https://github.com/org/repo',
      normalizedUrl: ok ? trimmed.replace(/\/$/, '') : null,
    }
  }

  if (isLocalOnlySession(token)) {
    return offlineValidate()
  }
  try {
    const { data } = await apiClient.post(
      '/Github/validate',
      { repositoryUrl },
      withCourseParams({ headers: authHeaders(token) }),
    )
    return data
  } catch (error) {
    if (shouldUseLocalStudentFallback(error, token)) {
      return offlineValidate()
    }
    throw error
  }
}

export async function fetchDashboardStats(token, userId) {
  const localStats = () => {
    const tasks = readJson(LS.tasks(userId), defaultTasksForUser(userId))
    const completed = tasks.filter((t) => ['Completed', 'Evaluated'].includes(t.submissionStatus)).length
    const pending = tasks.filter((t) => ['Not Submitted', 'Overdue'].includes(t.submissionStatus)).length
    const apps = readJson(LS.applications(userId), [])
    const pipeline = apps.filter((a) => ['Pending', 'Accepted'].includes(a.status)).length
    return {
      activeInternships: pipeline,
      completedTasks: completed,
      pendingTasks: pending,
      feedbackReceived: 2,
    }
  }

  if (isLocalOnlySession(token)) {
    return localStats()
  }
  try {
    const { data } = await apiClient.get(
      '/StudentDashboard/stats',
      withCourseParams({ headers: authHeaders(token) }),
    )
    return data
  } catch (error) {
    if (shouldUseLocalStudentFallback(error, token)) {
      return localStats()
    }
    throw error
  }
}

export async function fetchTrainerFeedback(token, userId, searchParams = null) {
  const course = getCourseQueryParams(
    searchParams ?? (typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null),
  )
  if (course.branchId && course.courseId) {
    await ensureApprovedBriefsForCourse(course.branchId, course.courseId)
  }
  const fromReviews = () => listStudentTaskFeedback(userId, course)

  if (isLocalOnlySession(token)) {
    return fromReviews()
  }
  try {
    const { data } = await apiClient.get(
      '/Feedback/me',
      withCourseParams({ headers: authHeaders(token) }, searchParams),
    )
    const apiItems = filterFeedbackItemsForCourse(Array.isArray(data) ? data : [], course.branchId, course.courseId)
    return apiItems
  } catch (error) {
    if (shouldUseLocalStudentFallback(error, token)) {
      return fromReviews()
    }
    throw error
  }
}

export async function fetchTrainingProgress(token, userId) {
  const localProgress = () => {
    const tasks = readJson(LS.tasks(userId), defaultTasksForUser(userId))
    const total = tasks.length || 1
    const completed = tasks.filter((t) =>
      ['Completed', 'Evaluated', 'Pending Review'].includes(t.submissionStatus),
    ).length
    const completionPercent = Math.round((completed * 100) / total)
    return {
      completionPercent,
      attendancePercent: Math.min(95, 68 + Math.round(completionPercent / 4)),
      performanceScore: Math.min(10, 6.5 + completionPercent / 40),
      weeklyActivity: [
        { label: 'Mon', units: 4 },
        { label: 'Tue', units: 6 },
        { label: 'Wed', units: 5 },
        { label: 'Thu', units: 7 },
        { label: 'Fri', units: 3 },
      ],
    }
  }

  if (isLocalOnlySession(token)) {
    return localProgress()
  }
  try {
    const { data } = await apiClient.get(
      '/StudentDashboard/progress',
      withCourseParams({ headers: authHeaders(token) }),
    )
    return data
  } catch (error) {
    if (shouldUseLocalStudentFallback(error, token)) {
      return localProgress()
    }
    throw error
  }
}
