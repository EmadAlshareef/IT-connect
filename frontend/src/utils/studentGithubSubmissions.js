import { recordStudentAction } from './studentUserActivity.js'

const STORAGE_KEY = 'itconnect_student_github_submissions_v1'

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

function parseSnapshot() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeSnapshot(rows) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
  } catch {
    /* ignore quota */
  }
}

function notifyChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('student-github-submissions-changed'))
}

export function listGithubSubmissions() {
  return parseSnapshot().sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
}

export function getGithubSubmissionByEmail(studentEmail) {
  const email = normalizeEmail(studentEmail)
  if (!email) return null
  return parseSnapshot().find((row) => normalizeEmail(row.studentEmail) === email) ?? null
}

export function saveGithubSubmission({
  studentEmail,
  studentName,
  studentId,
  repositoryUrl,
  normalizedUrl,
  isValid,
  message,
}) {
  const email = normalizeEmail(studentEmail)
  const url = String(normalizedUrl ?? repositoryUrl ?? '').trim()
  if (!email || !url) return null

  const entry = {
    id: `gh-sub-${email.replace(/[^a-z0-9]/g, '-')}`,
    studentEmail: email,
    studentName: String(studentName ?? '').trim(),
    studentId: String(studentId ?? '').trim(),
    repositoryUrl: String(repositoryUrl ?? '').trim() || url,
    normalizedUrl: url,
    isValid: Boolean(isValid),
    message: String(message ?? '').trim(),
    updatedAt: Date.now(),
  }

  const snap = parseSnapshot().filter((row) => normalizeEmail(row.studentEmail) !== email)
  const next = [entry, ...snap]
  writeSnapshot(next)
  notifyChanged()
  if (entry.studentId) {
    recordStudentAction({
      userId: entry.studentId,
      type: 'github_linked',
      label: 'GitHub repository linked',
      detail: entry.repositoryUrl,
      href: '/student/github',
      tone: 'success',
    })
  }
  return entry
}

/**
 * Trainee rows for trainer GitHub section: session students + evaluation roster + saved links.
 * When rosterOnly is true, only trainees from sessionSummaries are listed (no global evaluation/github roster).
 */
export function buildTrainerGithubHomeworkRows({
  sessionSummaries = [],
  evaluationRows = [],
  rosterOnly = false,
}) {
  const submissionsByEmail = new Map()
  for (const sub of listGithubSubmissions()) {
    submissionsByEmail.set(normalizeEmail(sub.studentEmail), sub)
  }

  const trainees = new Map()

  const addTrainee = ({ traineeId, traineeName, email, sectionTitle }) => {
    const name = String(traineeName ?? '').trim()
    if (!name && !email) return
    const key = normalizeEmail(email) || String(traineeId ?? '').trim() || name.toLowerCase()
    if (!key || trainees.has(key)) {
      const existing = trainees.get(key)
      if (existing && sectionTitle && !existing.sectionTitle) {
        trainees.set(key, { ...existing, sectionTitle })
      }
      return
    }
    trainees.set(key, {
      traineeId: String(traineeId ?? '').trim(),
      traineeName: name || 'Trainee',
      email: normalizeEmail(email),
      sectionTitle: String(sectionTitle ?? '').trim(),
    })
  }

  for (const section of sessionSummaries) {
    for (const student of section.students ?? []) {
      addTrainee({
        traineeId: student.id,
        traineeName: student.name,
        email: student.email,
        sectionTitle: section.title,
      })
    }
  }

  if (!rosterOnly) {
    for (const row of evaluationRows) {
      addTrainee({
        traineeId: row.id,
        traineeName: row.trainee,
        email: row.email,
        sectionTitle: '',
      })
    }

    for (const sub of listGithubSubmissions()) {
      addTrainee({
        traineeId: sub.studentId,
        traineeName: sub.studentName,
        email: sub.studentEmail,
        sectionTitle: '',
      })
    }
  }

  return Array.from(trainees.values())
    .map((t) => {
      const sub = t.email ? submissionsByEmail.get(t.email) : null
      const byName =
        !sub &&
        listGithubSubmissions().find(
          (row) => normalizeName(row.studentName) === normalizeName(t.traineeName),
        )
      const link = sub || byName
      const repositoryUrl = link?.normalizedUrl || link?.repositoryUrl || ''
      return {
        ...t,
        key: t.email || t.traineeId || t.traineeName,
        hasGithubLink: Boolean(repositoryUrl),
        repositoryUrl,
        isValid: link?.isValid ?? false,
        validationMessage: link?.message ?? '',
        linkedAt: link?.updatedAt ?? null,
      }
    })
    .sort((a, b) => {
      if (a.hasGithubLink !== b.hasGithubLink) return a.hasGithubLink ? -1 : 1
      return a.traineeName.localeCompare(b.traineeName)
    })
}

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase()
}
