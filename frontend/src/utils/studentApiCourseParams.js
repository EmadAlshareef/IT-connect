import { readActiveCourseSelection } from '../hooks/useStudentApprovedCourses.js'

/** Course context sent to protected student APIs (backend RequireApprovedCourseAccess). */
export function getCourseQueryParams(searchParams) {
  const fromUrl = {
    branchId: String(searchParams?.get?.('branchId') ?? '').trim(),
    courseId: String(searchParams?.get?.('courseId') ?? '').trim(),
  }
  if (fromUrl.branchId && fromUrl.courseId) {
    return fromUrl
  }
  const active = readActiveCourseSelection()
  if (active?.branchId && active?.trainingId) {
    return { branchId: active.branchId, courseId: active.trainingId }
  }
  return {}
}

export function withCourseParams(config = {}, searchParams = null) {
  const params = getCourseQueryParams(
    searchParams ?? (typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null),
  )
  return {
    ...config,
    params: { ...(config.params ?? {}), ...params },
  }
}
