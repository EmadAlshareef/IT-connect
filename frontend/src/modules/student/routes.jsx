/**
 * Student (Trainee) module — route map (v1 rebuild).
 * Wire from App.jsx: import { studentRoutes } from './modules/student/routes.jsx'
 */
import { Navigate } from 'react-router-dom'
import StudentDashboardLayout from '../../pages/student/StudentDashboardLayout.jsx'
import StudentHomeRedirect, { StudentCourseWorkspaceRedirect } from '../../pages/student/StudentHomeRedirect.jsx'
import StudentInternshipsPage from '../../pages/student/StudentInternshipsPage.jsx'
import StudentApplyPage from '../../pages/student/StudentApplyPage.jsx'
import StudentProfilePage from '../../pages/student/StudentProfilePage.jsx'
import StudentApplicationsPage from '../../pages/student/StudentApplicationsPage.jsx'
import StudentTasksPage from '../../pages/student/StudentTasksPage.jsx'
import StudentAiChatPage from '../../pages/student/StudentAiChatPage.jsx'
import StudentSubmitPage from '../../pages/student/StudentSubmitPage.jsx'
import StudentGithubPage from '../../pages/student/StudentGithubPage.jsx'
import StudentFeedbackPage from '../../pages/student/StudentFeedbackPage.jsx'

/** @type {import('react-router-dom').RouteObject[]} */
export const studentRouteTree = {
  path: 'student',
  element: <StudentDashboardLayout />,
  children: [
    { index: true, element: <Navigate to="applications" replace /> },
    { path: 'home', element: <StudentHomeRedirect /> },
    { path: 'internships', element: <StudentInternshipsPage /> },
  // { path: 'internships/:internshipId', element: <InternshipDetailPage /> }, // Phase 2
    { path: 'profile', element: <StudentProfilePage /> },
    { path: 'apply', element: <StudentApplyPage /> },
    { path: 'applications', element: <StudentApplicationsPage /> },
    { path: 'tasks', element: <StudentTasksPage /> },
    { path: 'ai-tutor', element: <StudentAiChatPage /> },
    { path: 'submit', element: <StudentSubmitPage /> },
    { path: 'github', element: <StudentGithubPage /> },
    { path: 'progress', element: <StudentCourseWorkspaceRedirect /> },
    { path: 'feedback', element: <StudentFeedbackPage /> },
  ],
}
