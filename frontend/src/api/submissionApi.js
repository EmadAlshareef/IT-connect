import { apiClient } from './authApi.js'

function mapSubmissionDto(dto) {
  if (!dto) return null
  return {
    id: dto.legacyLocalId || dto.id,
    apiId: dto.id,
    studentId: dto.studentId,
    taskId: dto.taskId,
    taskTitle: dto.taskTitle ?? '',
    branchId: dto.branchId ?? '',
    courseId: dto.courseId ?? '',
    submissionLink: dto.submissionLink ?? null,
    fileName: dto.fileName ?? null,
    notes: dto.notes ?? null,
    status: dto.status ?? 'Pending Evaluation',
    grade: dto.grade ?? null,
    evaluationFeedback: dto.evaluationFeedback ?? '',
    trainerName: dto.trainerName ?? '',
    reviewedAtUtc: dto.reviewedAtUtc ?? null,
    submittedAtUtc: dto.submittedAtUtc,
    submittedAt: dto.submittedAtUtc,
  }
}

function mapInboxDto(dto) {
  if (!dto) return null
  return {
    key: dto.key,
    submissionId: dto.submissionId,
    traineeId: dto.studentId,
    traineeName: dto.studentName,
    studentEmail: dto.studentEmail,
    portalUserId: dto.studentId,
    taskId: dto.taskId,
    taskTitle: dto.taskTitle,
    taskDescription: dto.taskDescription ?? '',
    answer: dto.answer ?? '',
    submissionLink: dto.submissionLink ?? null,
    fileName: dto.fileName ?? null,
    branchId: dto.branchId ?? '',
    courseId: dto.courseId ?? '',
    submittedAt: dto.submittedAt ?? null,
    status: dto.status ?? 'Pending Evaluation',
    grade: dto.grade ?? null,
    evaluationFeedback: dto.evaluationFeedback ?? '',
    trainerName: dto.trainerName ?? '',
  }
}

export async function fetchTrainerSubmissions(params = {}) {
  const { data } = await apiClient.get('/Submission/trainer', { params })
  const rows = Array.isArray(data) ? data : []
  return rows.map(mapInboxDto).filter(Boolean)
}

export async function reviewSubmissionApi(submissionId, payload) {
  const { data } = await apiClient.post(`/Submission/${encodeURIComponent(submissionId)}/review`, {
    grade: payload.grade ?? null,
    feedback: payload.feedback ?? payload.evaluationFeedback ?? '',
    trainerName: payload.trainerName ?? null,
    portalUserId: payload.portalUserId ?? null,
  })
  return mapSubmissionDto(data)
}

export async function fetchStudentSubmissionsApi() {
  const { data } = await apiClient.get('/Submission/me')
  const rows = Array.isArray(data) ? data : []
  return rows.map(mapSubmissionDto).filter(Boolean)
}
