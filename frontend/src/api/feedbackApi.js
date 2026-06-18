import { apiClient } from './authApi.js'

export function mapFeedbackDto(dto) {
  if (!dto) return null
  return {
    id: dto.id,
    taskId: dto.taskId ?? null,
    branchId: dto.branchId ?? '',
    courseId: dto.courseId ?? '',
    taskTitle: dto.taskTitle ?? 'Feedback',
    trainerName: dto.trainerName ?? 'Trainer',
    comment: dto.comment ?? '',
    grade: dto.grade ?? null,
    atUtc: dto.atUtc,
  }
}

export async function fetchStudentFeedbackApi() {
  const { data } = await apiClient.get('/Feedback/me')
  const rows = Array.isArray(data) ? data : []
  return rows.map(mapFeedbackDto).filter(Boolean)
}
