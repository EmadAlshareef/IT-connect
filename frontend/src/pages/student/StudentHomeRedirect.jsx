import { Navigate, useLocation } from 'react-router-dom'
import { STUDENT_COURSE_WORKSPACE_PATH, STUDENT_LANDING_PATH } from '../../components/nav/training-sphere/navConstants.js'

/** Legacy `/student/home` URLs redirect to the current student landing pages. */
function StudentHomeRedirect() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const hasCourse = Boolean(params.get('branchId') && params.get('courseId'))
  const target = hasCourse
    ? `${STUDENT_COURSE_WORKSPACE_PATH}${location.search}`
    : STUDENT_LANDING_PATH
  return <Navigate to={target} replace />
}

export default StudentHomeRedirect

/** Legacy removed course routes (e.g. Progress) → Tasks with same course context. */
export function StudentCourseWorkspaceRedirect() {
  const location = useLocation()
  return <Navigate to={`${STUDENT_COURSE_WORKSPACE_PATH}${location.search}`} replace />
}
