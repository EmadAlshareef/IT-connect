import { getGithubSubmissionByEmail } from './studentGithubSubmissions.js'

export const STUDENT_ACTIVITY_CHANGED_EVENT = 'ts-student-activity-changed'

const activityKey = (userId) => `ts-student-activity-${userId}`

const LS = {
  tasks: (userId) => `ts-student-tasks-${userId}`,
  submissions: (userId) => `ts-student-submissions-${userId}`,
  applications: (userId) => `ts-student-applications-${userId}`,
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function notifyChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STUDENT_ACTIVITY_CHANGED_EVENT))
  }
}

/** Persist a student-visible action for the home activity feed. */
export function recordStudentAction({ userId, type, label, detail = '', href = '', tone = 'default' }) {
  if (!userId || !label) return null
  const entry = {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId,
    type,
    label,
    detail,
    href,
    tone,
    ts: Date.now(),
  }
  const prev = readJson(activityKey(userId), [])
  const next = [entry, ...prev].slice(0, 48)
  try {
    localStorage.setItem(activityKey(userId), JSON.stringify(next))
  } catch {
    /* ignore quota */
  }
  notifyChanged()
  return entry
}

export function listStudentActions(userId, limit = 20) {
  if (!userId) return []
  return readJson(activityKey(userId), [])
    .filter((row) => row?.label)
    .sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0))
    .slice(0, limit)
}

function deriveStorageActions(userId, email) {
  if (!userId) return []
  const derived = []

  for (const sub of readJson(LS.submissions(userId), [])) {
    const ts = sub.submittedAtUtc ? new Date(sub.submittedAtUtc).getTime() : 0
    if (!ts) continue
    derived.push({
      id: `derived-sub-${sub.id}`,
      type: 'task_submitted',
      label: 'Task submitted',
      detail: sub.fileName || sub.submissionLink || 'Submission recorded',
      href: '/student/tasks',
      tone: 'success',
      ts,
    })
  }

  for (const app of readJson(LS.applications(userId), [])) {
    const ts = app.createdAtUtc ? new Date(app.createdAtUtc).getTime() : 0
    if (ts) {
      derived.push({
        id: `derived-app-${app.id}`,
        type: 'application',
        label: 'Internship application sent',
        detail: app.status ? `Status: ${app.status}` : 'Application on file',
        href: '/student/applications',
        tone: app.status === 'Accepted' ? 'success' : 'pending',
        ts,
      })
    }
    if (app.status === 'Accepted') {
      const acceptedTs = app.timeline?.find((s) => s.state === 'Complete' && /accept/i.test(s.label ?? ''))?.atUtc
      derived.push({
        id: `derived-app-accepted-${app.id}`,
        type: 'application_accepted',
        label: 'Application accepted',
        detail: 'You can continue with training tasks and submissions.',
        href: '/student/applications',
        tone: 'success',
        ts: acceptedTs ? new Date(acceptedTs).getTime() : ts || Date.now(),
      })
    }
  }

  const tasks = readJson(LS.tasks(userId), [])
  for (const task of tasks) {
    if (!['Completed', 'Evaluated'].includes(task.submissionStatus)) continue
    const ts = task.completedAtUtc ? new Date(task.completedAtUtc).getTime() : Date.now() - 864e5
    derived.push({
      id: `derived-task-done-${task.id}`,
      type: 'task_completed',
      label: `Completed “${task.title}”`,
      detail: 'Marked complete in your task list.',
      href: '/student/tasks',
      tone: 'success',
      ts,
    })
  }

  const github = getGithubSubmissionByEmail(email)
  if (github?.repositoryUrl) {
    derived.push({
      id: `derived-github-${normalizeEmail(email)}`,
      type: 'github_linked',
      label: 'GitHub repository linked',
      detail: github.repositoryUrl,
      href: '/student/github',
      tone: 'success',
      ts: github.updatedAt ?? github.linkedAt ?? Date.now(),
    })
  }

  return derived
}

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

function mergeActions(logged, derived, limit = 16) {
  const byId = new Map()
  for (const row of [...logged, ...derived]) {
    if (!row?.id || !row.label) continue
    const existing = byId.get(row.id)
    if (!existing || (row.ts ?? 0) > (existing.ts ?? 0)) {
      byId.set(row.id, row)
    }
  }
  return [...byId.values()].sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0)).slice(0, limit)
}

export function buildStudentActivityFeed({ userId, email, limit = 12 }) {
  const logged = listStudentActions(userId, limit)
  const derived = deriveStorageActions(userId, email)
  return mergeActions(logged, derived, limit)
}

export function buildStudentCelebrations({ stats, tasks = [], applications = [], githubLinked = false }) {
  const completed = Number(stats?.completedTasks ?? 0) || tasks.filter((t) => ['Completed', 'Evaluated'].includes(t.submissionStatus)).length
  const pending = Number(stats?.pendingTasks ?? 0) || tasks.filter((t) => ['Not Submitted', 'Overdue'].includes(t.submissionStatus)).length
  const hasAcceptedApp = applications.some((a) => a.status === 'Accepted')
  const items = []

  if (hasAcceptedApp) {
    items.push({
      id: 'celebrate-accepted',
      title: 'You’re in!',
      message: 'An internship application was accepted — celebrate the win and check your next steps.',
      tone: 'gold',
    })
  }

  if (githubLinked) {
    items.push({
      id: 'celebrate-github',
      title: 'Repo connected',
      message: 'Your GitHub project is linked. Trainers can review your work from their dashboard.',
      tone: 'indigo',
    })
  }

  if (completed >= 3) {
    items.push({
      id: 'celebrate-tasks-3',
      title: 'Triple threat',
      message: `${completed} tasks completed — you’re building serious momentum.`,
      tone: 'emerald',
    })
  } else if (completed >= 1) {
    items.push({
      id: 'celebrate-first-task',
      title: 'First task done',
      message: 'You finished an assigned task. That’s worth celebrating!',
      tone: 'emerald',
    })
  }

  if (pending === 0 && completed > 0) {
    items.push({
      id: 'celebrate-inbox-zero',
      title: 'Inbox clear',
      message: 'No pending tasks right now — great time to explore internships or message your trainer.',
      tone: 'violet',
    })
  }

  if (Number(stats?.feedbackReceived ?? 0) > 0) {
    items.push({
      id: 'celebrate-feedback',
      title: 'Trainer feedback',
      message: 'You have trainer comments waiting — read them and keep improving.',
      tone: 'sky',
      href: '/student/feedback',
    })
  }

  if (items.length === 0) {
    items.push({
      id: 'celebrate-welcome',
      title: 'Your journey starts here',
      message: 'Submit a task, apply to an internship, or link GitHub — each action shows up below.',
      tone: 'welcome',
      href: '/student/submit',
    })
  }

  return items.slice(0, 4)
}

export function loadStudentHomeInsights({ userId, email, stats }) {
  const tasks = readJson(LS.tasks(userId), [])
  const applications = readJson(LS.applications(userId), [])
  const githubLinked = Boolean(getGithubSubmissionByEmail(email)?.repositoryUrl)
  return {
    actions: buildStudentActivityFeed({ userId, email }),
    celebrations: buildStudentCelebrations({ stats, tasks, applications, githubLinked }),
  }
}
