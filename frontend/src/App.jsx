import { BrowserRouter as Router, Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'
import AppShell from './components/AppShell.jsx'
import { AdminNavSlotProvider } from './context/AdminNavSlotContext.jsx'
import AdminProtectedRoute from './components/AdminProtectedRoute.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import HomePage from './pages/HomePage.jsx'
import ServicesPage from './pages/ServicesPage.jsx'
import ServiceTrainingDetailsPage from './pages/ServiceTrainingDetailsPage.jsx'
import ContactPage from './pages/ContactPage.jsx'
import CompaniesPage from './pages/CompaniesPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import VerifyEmailPage from './pages/VerifyEmailPage.jsx'
import TrainerDashboard from './pages/TrainerDashboard.jsx'
import TrainerEvaluationPage from './pages/TrainerEvaluationPage.jsx'
import TrainerEvaluationsPage from './pages/TrainerEvaluationsPage.jsx'
import TrainerSectionDetailsPage from './pages/TrainerSectionDetailsPage.jsx'
import DirectMessagesPage from './pages/DirectMessagesPage.jsx'
import StudentMessagesPage from './pages/StudentMessagesPage.jsx'
import StudentDashboardLayout from './pages/student/StudentDashboardLayout.jsx'
import StudentHomeRedirect, { StudentCourseWorkspaceRedirect } from './pages/student/StudentHomeRedirect.jsx'
import StudentInternshipsPage from './pages/student/StudentInternshipsPage.jsx'
import StudentApplyPage from './pages/student/StudentApplyPage.jsx'
import StudentProfilePage from './pages/student/StudentProfilePage.jsx'
import StudentApplicationsPage from './pages/student/StudentApplicationsPage.jsx'
import StudentTasksPage from './pages/student/StudentTasksPage.jsx'
import StudentTopicsPage from './pages/student/StudentTopicsPage.jsx'
import StudentAiChatPage from './pages/student/StudentAiChatPage.jsx'
import StudentSubmitPage from './pages/student/StudentSubmitPage.jsx'
import StudentGithubPage from './pages/student/StudentGithubPage.jsx'
import StudentFeedbackPage from './pages/student/StudentFeedbackPage.jsx'
import StudentEnrollmentApplicationPage from './pages/student/StudentEnrollmentApplicationPage.jsx'
import StudentEnrollmentStatusPage from './pages/student/StudentEnrollmentStatusPage.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminTrackDetailPage from './pages/AdminTrackDetailPage.jsx'
import CompanyDashboard from './pages/CompanyDashboard.jsx'

function TrainerSectionDetailsRoute() {
  const { sectionId } = useParams()
  return <TrainerSectionDetailsPage key={sectionId} />
}

function TrainerEvaluationRoute() {
  const { traineeId } = useParams()
  return <TrainerEvaluationPage key={traineeId} />
}

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <Outlet />
    </ProtectedRoute>
  )
}

function App() {
  return (
    <Router>
      <AdminNavSlotProvider>
        <div className="min-h-screen bg-[#FFF9F2] font-display text-slate-800 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
          <AppShell />

          <main className="min-h-screen min-w-0 pt-16 md:pl-64 md:pt-0">
            <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/services/training/:branchId/:trainingId" element={<ServiceTrainingDetailsPage />} />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            <Route element={<ProtectedLayout />}>
              <Route path="/dashboard" element={<TrainerDashboard />} />
              <Route path="/company/dashboard" element={<CompanyDashboard />} />
              <Route path="/messages" element={<DirectMessagesPage />} />
              <Route path="/dashboard/evaluations" element={<TrainerEvaluationsPage />} />
              <Route path="/dashboard/evaluate/:traineeId" element={<TrainerEvaluationRoute />} />
              <Route path="/dashboard/section/:sectionId" element={<TrainerSectionDetailsRoute />} />

              <Route path="/student" element={<StudentDashboardLayout />}>
                <Route index element={<Navigate to="/student/applications" replace />} />
                <Route path="home" element={<StudentHomeRedirect />} />
                <Route path="internships" element={<StudentInternshipsPage />} />
                <Route path="profile" element={<StudentProfilePage />} />
                <Route path="apply" element={<StudentApplyPage />} />
                <Route path="applications" element={<StudentApplicationsPage />} />
                <Route path="tasks" element={<StudentTasksPage />} />
                <Route path="topics" element={<StudentTopicsPage />} />
                <Route path="ai-tutor" element={<StudentAiChatPage />} />
                <Route path="submit" element={<StudentSubmitPage />} />
                <Route path="github" element={<StudentGithubPage />} />
                <Route path="progress" element={<StudentCourseWorkspaceRedirect />} />
                <Route path="feedback" element={<StudentFeedbackPage />} />
                <Route path="enrollment/application" element={<StudentEnrollmentApplicationPage />} />
                <Route path="enrollment/status" element={<StudentEnrollmentStatusPage />} />
                <Route path="messages" element={<StudentMessagesPage />} />
              </Route>
            </Route>

            <Route element={<AdminProtectedRoute />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/track/:trackId" element={<AdminTrackDetailPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </AdminNavSlotProvider>
    </Router>
  )
}

export default App
