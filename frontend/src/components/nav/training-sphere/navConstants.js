/** Primary marketing navigation — paths must exist in the router. */
export const PUBLIC_NAV_LINKS = [
  { to: '/services', label: 'Services', end: false },
  { to: '/companies', label: 'Companies', end: false },
  { to: '/contact', label: 'Contact', end: false },
]

/** Trainer workspace — scroll targets on `/dashboard` (see `AppShell` + `TrainerDashboard`). */
export const TRAINER_WORKSPACE_NAV_ITEMS = [
  { id: 'enrolled-students', label: 'Enrolled students' },
  { id: 'messages', label: 'Messages' },
  { id: 'create-task', label: 'Create New Tasks' },
  { id: 'my-tasks', label: 'My tasks' },
  { id: 'evaluate', label: 'Task Submissions' },
  { id: 'github', label: 'GitHub Students' },
  { id: 'enrollment-requests', label: 'Accept new students' },
]

export const TRAINER_DASHBOARD_PENDING_SECTION_KEY = 'ts-trainer-dashboard-pending-section'
export const TRAINER_DASHBOARD_PENDING_TRAINING_KEY = 'ts-trainer-dashboard-pending-training'

/** Default student landing after login (no active course context). */
export const STUDENT_LANDING_PATH = '/student/applications'

/** First course workspace page when a training is approved (replaces removed Home). */
export const STUDENT_COURSE_WORKSPACE_PATH = '/student/tasks'

/** Student workspace — routes under `/student` (see `StudentDashboardLayout` + `AppShell`). */
export const STUDENT_WORKSPACE_NAV_ITEMS = [
  { to: '/student/internships', label: 'Trainings', requiresEnrollment: false },
  { to: '/student/profile', label: 'Profile', requiresEnrollment: false },
  { to: '/student/applications', label: 'Applications', requiresEnrollment: false },
  { to: '/student/tasks', label: 'Tasks', requiresEnrollment: true },
  { to: '/student/topics', label: 'Topics', requiresEnrollment: true },
  { to: '/student/messages', label: 'Messages', requiresEnrollment: true },
  { to: '/student/ai-tutor', label: 'AI Tutor', requiresEnrollment: true },
  { to: '/student/submit', label: 'Submit', requiresEnrollment: true },
  { to: '/student/github', label: 'GitHub', requiresEnrollment: true },
  { to: '/student/feedback', label: 'Feedback', requiresEnrollment: true },
]

/** Sidebar / drawer links: browse always; course workspace only after trainer-approved enrollment. */
export function visibleStudentWorkspaceNavItems(hasApprovedCourseAccess) {
  return STUDENT_WORKSPACE_NAV_ITEMS.filter((item) => !item.requiresEnrollment || hasApprovedCourseAccess)
}

export function buildStudentCourseNavLink(basePath, branchId, trainingId) {
  const params = new URLSearchParams({
    branchId: String(branchId),
    courseId: String(trainingId),
  })
  return `${basePath}?${params.toString()}`
}
