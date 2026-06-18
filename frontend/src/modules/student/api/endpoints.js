/**
 * Student API v1 — base paths aligned with backend/Student/Api
 * Client attaches JWT via auth interceptor.
 */
export const STUDENT_API_V1 = '/api/student/v1'

export const studentEndpoints = {
  auth: {
    register: `${STUDENT_API_V1}/auth/register`,
    login: `${STUDENT_API_V1}/auth/login`,
    logout: `${STUDENT_API_V1}/auth/logout`,
  },
  profile: {
    me: `${STUDENT_API_V1}/profile`,
    githubRepo: `${STUDENT_API_V1}/profile/github-repo`,
  },
  internships: {
    list: `${STUDENT_API_V1}/internships`,
    detail: (id) => `${STUDENT_API_V1}/internships/${id}`,
  },
  applications: {
    list: `${STUDENT_API_V1}/applications`,
    create: `${STUDENT_API_V1}/applications`,
    detail: (id) => `${STUDENT_API_V1}/applications/${id}`,
  },
  tasks: {
    list: `${STUDENT_API_V1}/tasks`,
    detail: (id) => `${STUDENT_API_V1}/tasks/${id}`,
    submit: (taskId) => `${STUDENT_API_V1}/tasks/${taskId}/submissions`,
  },
  submissions: {
    list: `${STUDENT_API_V1}/submissions`,
  },
  github: {
    validate: `${STUDENT_API_V1}/github/validate`,
  },
  feedback: {
    list: `${STUDENT_API_V1}/feedback`,
  },
  dashboard: {
    stats: `${STUDENT_API_V1}/dashboard/stats`,
    progress: `${STUDENT_API_V1}/progress`,
  },
  notifications: {
    list: `${STUDENT_API_V1}/notifications`,
    markRead: (id) => `${STUDENT_API_V1}/notifications/${id}/read`,
  },
}
