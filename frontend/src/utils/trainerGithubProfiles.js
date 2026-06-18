import {
  ENROLLMENT_APPLICATIONS_CHANGED_EVENT,
  listApprovedApplicationsForCourse,
} from '../api/enrollmentApplicationApi.js'
import { buildTrainerGithubHomeworkRows } from './studentGithubSubmissions.js'
import { resolveCatalogCourseForTrainingId } from './catalogCourseContext.js'

export const TRAINER_GITHUB_PROFILES_CHANGED_EVENT = 'student-github-submissions-changed'

export { ENROLLMENT_APPLICATIONS_CHANGED_EVENT as TRAINER_GITHUB_ROSTER_CHANGED_EVENT }

/** Instructors and admins may review student GitHub profiles. */
export function canReviewGithubProfiles(role) {
  const r = String(role ?? '').toLowerCase()
  return r === 'trainer' || r === 'admin'
}

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

/**
 * GitHub roster for the active course: only enrollment-approved students.
 * @param {{ sessionSummaries?: object[], evaluationRows?: object[], trainingId?: string }} options
 */
export function listTrainerGithubStudents(options = {}) {
  const { sessionSummaries = [], evaluationRows = [], trainingId = '' } = options
  const course = resolveCatalogCourseForTrainingId(trainingId)

  if (!course) {
    return []
  }

  const approvedApps = listApprovedApplicationsForCourse(course.branchId, course.courseId)
  const rosterStudents = approvedApps.map((app) => ({
    id: app.userId,
    name: app.userName || 'Student',
    email: app.userEmail,
  }))

  const approvedIds = new Set(approvedApps.map((a) => String(a.userId)))
  const approvedEmails = new Set(approvedApps.map((a) => normalizeEmail(a.userEmail)).filter(Boolean))

  const scopedEvaluationRows = evaluationRows.filter((row) => {
    if (approvedIds.has(String(row.id))) return true
    const email = normalizeEmail(row.email)
    return email && approvedEmails.has(email)
  })

  const sectionTitle = course.courseTitle || sessionSummaries.find((s) => s.id === trainingId)?.title || ''

  return buildTrainerGithubHomeworkRows({
    sessionSummaries: [{ id: trainingId, title: sectionTitle, students: rosterStudents }],
    evaluationRows: scopedEvaluationRows,
    rosterOnly: true,
  })
}

export function buildGithubReminderMessage(traineeName, trainingTitle) {
  const name = String(traineeName ?? 'there').trim() || 'there'
  const course = String(trainingTitle ?? 'your training program').trim() || 'your training program'
  return `Hi ${name}, please connect your GitHub account and add your project repository for "${course}". Open your student dashboard → GitHub page to submit your link.`
}

export async function copyGithubReminder(message) {
  const text = String(message ?? '').trim()
  if (!text) return { ok: false, message: 'Nothing to copy.' }
  try {
    await navigator.clipboard.writeText(text)
    return { ok: true, message: 'Reminder copied to clipboard.' }
  } catch {
    return { ok: false, message: 'Could not copy. Select and copy the reminder text manually.' }
  }
}

/** Derive github.com profile URL from repository URL when possible. */
export function githubProfileUrlFromRepo(repositoryUrl) {
  const url = String(repositoryUrl ?? '').trim()
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.includes('github.com')) return null
    const parts = parsed.pathname.split('/').filter(Boolean)
    if (parts.length >= 1) return `https://github.com/${parts[0]}`
  } catch {
    return null
  }
  return null
}
