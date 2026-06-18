import { apiClient } from './authApi.js'

export async function fetchBranches() {
  const { data } = await apiClient.get('/catalog/branches')
  return data ?? []
}

export async function fetchTracks(branchId) {
  const { data } = await apiClient.get('/catalog/tracks', { params: { branchId } })
  return data ?? []
}

export async function fetchCatalogTrainings(branchId) {
  const { data } = await apiClient.get('/catalog/trainings', { params: { branchId } })
  return data ?? []
}

export async function fetchCatalogStudentCount(branchId) {
  const { data } = await apiClient.get('/catalog/student-count', { params: { branchId } })
  return Number(data?.count ?? 0)
}

export async function fetchTraining(id) {
  const { data } = await apiClient.get(`/catalog/trainings/${encodeURIComponent(id)}`)
  return data
}

export async function saveTraining(payload) {
  const { data } = await apiClient.post('/catalog/trainings', payload)
  return data
}

export async function deleteTraining(id) {
  await apiClient.delete(`/catalog/trainings/${encodeURIComponent(id)}`)
}

export async function fetchTrainingSections(trainerId) {
  const { data } = await apiClient.get('/catalog/sections', { params: { trainerId } })
  return data ?? []
}

export async function fetchCompanyPosts(branchId) {
  const { data } = await apiClient.get('/catalog/company-posts', { params: { branchId } })
  return data ?? []
}

export async function fetchJobApplicants(branchId) {
  const { data } = await apiClient.get('/catalog/job-applicants', { params: { branchId } })
  return data ?? []
}

export async function fetchEvaluations() {
  const { data } = await apiClient.get('/catalog/evaluations')
  return data ?? []
}

export async function saveTrack(payload) {
  const { data } = await apiClient.post('/catalog/tracks', payload)
  return data
}

export async function deleteTrack(id) {
  await apiClient.delete(`/catalog/tracks/${encodeURIComponent(id)}`)
}

export async function fetchSectionDetail(sectionId) {
  const { data } = await apiClient.get(`/catalog/sections/${encodeURIComponent(sectionId)}`)
  return data
}

export async function fetchSectionTasks(sectionId) {
  const { data } = await apiClient.get(`/catalog/sections/${encodeURIComponent(sectionId)}/tasks`)
  return data ?? []
}

export async function saveSectionTask(sectionId, payload) {
  const { data } = await apiClient.post(
    `/catalog/sections/${encodeURIComponent(sectionId)}/tasks`,
    payload,
  )
  return data
}

export async function deleteSectionTask(sectionId, taskId) {
  await apiClient.delete(
    `/catalog/sections/${encodeURIComponent(sectionId)}/tasks/${encodeURIComponent(taskId)}`,
  )
}

export async function saveCompanyPost(payload) {
  const { data } = await apiClient.post('/catalog/company-posts', {
    ...payload,
    trainingId: payload.trainingId ?? payload.trainingLegacyId ?? null,
  })
  return data
}

export async function deleteCompanyPost(id) {
  await apiClient.delete(`/catalog/company-posts/${encodeURIComponent(id)}`)
}

export async function updateEvaluationItem(itemId, payload) {
  const { data } = await apiClient.put(
    `/catalog/evaluations/items/${encodeURIComponent(itemId)}`,
    payload,
  )
  return data
}

/** Map API track DTO to admin dashboard card shape. */
export function mapTrackDtoToCard(row) {
  return {
    branchId: row.branchId,
    id: row.id,
    title: row.title,
    description: '',
    icon: row.icon ?? 'code',
    trainings: row.trainingsCount ?? 0,
    students: 0,
    active: row.isActive ? 1 : 0,
    userCreated: true,
  }
}

/** Map API company post DTO to admin post card shape. */
export function mapCompanyPostDtoToCard(row) {
  const status = String(row.status ?? 'published').toUpperCase()
  return {
    id: row.id,
    branchId: row.branchId,
    title: row.title,
    status: status === 'PENDING' ? 'PENDING' : 'PUBLISHED',
    body: row.body ?? '',
    trainingId: row.trainingId ?? '',
    training: row.trainingTitle ?? '',
    deadline: row.deadline ?? 'TBD',
    applicants: row.applicantsCount ?? 0,
    tags: row.tags ? String(row.tags).split(',').map((t) => t.trim()).filter(Boolean) : [],
  }
}

export function mapEvaluationStatusToUi(code) {
  const raw = String(code ?? '').toLowerCase()
  if (raw === 'pending_evaluation' || raw === 'pending review') return 'Pending Evaluation'
  if (raw === 'evaluated' || raw === 'completed') return 'Evaluated'
  return 'Not Submitted'
}

export function mapEvaluationItemToUi(item) {
  return {
    id: item.id,
    title: item.title,
    deadline: item.deadline ?? '',
    submittedOn: item.submittedOn ?? '',
    repoTag: item.repoTag ?? '',
    repoBranch: item.repoBranch ?? '',
    status: mapEvaluationStatusToUi(item.status),
  }
}

export function mapSectionDetailToSession(row) {
  return {
    id: row.id,
    title: row.title,
    company: row.company ?? '',
    duration: row.durationLabel ?? '',
    studentsCount: row.studentsCount ?? 0,
    tasksCount: row.tasksCount ?? 0,
    status: row.status ?? 'Active',
    students: (row.students ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      progress: s.progress ?? 0,
      completedTasks: s.completedTasks ?? 0,
      totalTasks: s.totalTasks ?? 0,
    })),
  }
}

export function mapSectionTaskToUi(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    notes: '',
    deadline: row.deadline ?? '',
    attachmentName: '',
    assignedStudents: row.assignedStudentNames ?? [],
    assignedStudentIds: row.assignedStudentIds ?? [],
    feedbackLog: [],
  }
}

/** Map API training DTO to admin dashboard card shape. */
export function mapTrainingDtoToCard(row) {
  const trainerName = row.trainerName ?? ''
  return {
    id: row.id,
    branchId: row.branchId,
    trackId: row.trackId ?? null,
    linkedTrackId: row.trackId ?? null,
    category: row.category,
    title: row.title,
    body: row.body ?? '',
    startDate: row.startDate ?? '',
    date: row.startDate ?? '',
    trainer: trainerName,
    trainerId: row.trainerLegacyId ?? row.trainerUserId ?? '',
    trainerEmail: row.trainerEmail ?? '',
    trainerName,
    companyEmail: row.companyEmail ?? '',
    companyName: row.companyName ?? '',
    companyLogoUrl: row.companyLogoUrl ?? '',
    companyIndustry: row.companyIndustry ?? '',
    companyLocation: row.companyLocation ?? '',
    companyVision: row.companyVision ?? '',
    companyDescription: row.companyDescription ?? '',
    companyTrainingRequestId: row.companyTrainingRequestId ?? '',
    companyTrainingBody: row.companyTrainingBody ?? '',
    documentFileName: row.documentFileName ?? '',
    seatsTaken: row.seatsTaken ?? 0,
    seatsTotal: row.seatsTotal ?? 0,
    status: row.status ?? 'active',
    filterTag: row.filterTag ?? '',
  }
}
