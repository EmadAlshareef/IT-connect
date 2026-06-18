import axios from 'axios'
import { apiClient, isDevAuthToken } from './authApi.js'
import { normalizeEnrollmentApplicationTrainer, trainerOwnsEnrollmentApplication } from '../utils/platformDefaultTrainer.js'
import { resolveCourseTrainer } from '../utils/resolveCourseTrainer.js'

export const ENROLLMENT_APPLICATIONS_CHANGED_EVENT = 'ts-enrollment-applications-changed'

const LS_KEY = 'ts-enrollment-applications-v1'

const authHeaders = (token) => (token ? { Authorization: `Bearer ${token}` } : {})

function readLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocal(rows, { silent = false } = {}) {
  localStorage.setItem(LS_KEY, JSON.stringify(rows))
  if (!silent) {
    window.dispatchEvent(new CustomEvent(ENROLLMENT_APPLICATIONS_CHANGED_EVENT))
  }
}

let inboxSyncRunning = false

/** Backfill enrollment requests for students who enrolled before inbox sync existed. */
export function syncCatalogEnrollmentsToTrainerInbox() {
  if (typeof localStorage === 'undefined' || inboxSyncRunning) return
  inboxSyncRunning = true
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key?.startsWith('ts-catalog-training-enrollments-')) continue
      const userId = key.slice('ts-catalog-training-enrollments-'.length)
      if (!userId) continue
      const raw = localStorage.getItem(key)
      const rows = raw ? JSON.parse(raw) : []
      if (!Array.isArray(rows)) continue
      for (const row of rows) {
        const status = String(row?.status ?? '').toLowerCase()
        if (!status.includes('accept') && !status.includes('enroll')) continue
        const existing = findLocalApplication(userId, row.branchId, row.trainingId)
        if (existing) continue
        ensureEnrollmentRequestForCatalogEnroll(userId, row.userEmail ?? row.studentEmail ?? '', row.userName ?? 'Student', {
          branchId: row.branchId,
          courseId: row.trainingId,
          courseTitle: row.trainingTitle,
        })
      }
    }
  } catch {
    /* ignore */
  } finally {
    inboxSyncRunning = false
  }
}

function isNetworkish(error) {
  return !axios.isAxiosError(error) || !error.response
}

function shouldUseLocalEnrollmentFallback(error, token) {
  if (isNetworkish(error)) return true
  if (axios.isAxiosError(error) && error.response?.status === 401 && isDevAuthToken(token)) return true
  return false
}

function createLocalEnrollmentApplication(userId, userEmail, userName, fields, cvFile) {
  const now = new Date().toISOString()
  const trainer = normalizeEnrollmentApplicationTrainer(fields)
  const record = {
    id: `local-enroll-app-${Date.now()}`,
    userId,
    userEmail,
    userName,
    branchId: fields.branchId,
    courseId: fields.courseId,
    courseTitle: fields.courseTitle,
    trainerId: trainer.trainerId,
    trainerEmail: trainer.trainerEmail,
    trainerName: trainer.trainerName,
    motivationReason: fields.motivationReason,
    universityName: fields.universityName,
    major: fields.major,
    gpa: fields.gpa,
    previousStudies: fields.previousStudies,
    cvFileName: cvFile.name,
    cvFileUrl: `local://${cvFile.name}`,
    status: 'pending',
    rejectionReason: null,
    reviewedAtUtc: null,
    reviewedBy: null,
    createdAtUtc: now,
    updatedAtUtc: now,
  }
  saveLocalApplication(record)
  return record
}

export function findLocalApplication(userId, branchId, courseId) {
  const bid = String(branchId ?? '').trim()
  const cid = String(courseId ?? '').trim()
  return (
    readLocal().find(
      (row) =>
        String(row.userId) === String(userId) &&
        String(row.branchId) === bid &&
        String(row.courseId) === cid,
    ) ?? null
  )
}

export function listLocalApplicationsForStudent(userId) {
  return readLocal().filter((row) => String(row.userId) === String(userId))
}

export function listLocalApplicationsForTrainer(trainerEmail, statusFilter, trainerId = '') {
  let rows = readLocal()
    .map((row) => normalizeEnrollmentApplicationTrainer(row))
    .filter((row) => trainerOwnsEnrollmentApplication(row, trainerEmail, trainerId, resolveCourseTrainer))
  if (statusFilter) {
    const f = String(statusFilter).toLowerCase()
    rows = rows.filter((row) => String(row.status).toLowerCase() === f)
  }
  return rows.sort((a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime())
}

function mergeEnrollmentApplications(apiItems, localItems) {
  const merged = new Map()
  for (const row of localItems.map((item) => normalizeEnrollmentApplicationTrainer(item))) {
    merged.set(row.id, row)
  }
  for (const row of apiItems.map((item) => normalizeEnrollmentApplicationTrainer(item))) {
    merged.set(row.id, row)
  }
  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.createdAtUtc ?? b.createdAt).getTime() - new Date(a.createdAtUtc ?? a.createdAt).getTime(),
  )
}

export function saveLocalApplication(record) {
  const prev = readLocal().filter((row) => row.id !== record.id)
  writeLocal([record, ...prev])
  if (record?.userId && record?.branchId && record?.courseId) {
    syncCatalogEnrollmentFromApplication(record.userId, record.branchId, record.courseId, record)
  }
  return record
}

const CV_MIME = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
}

export function validateCvFile(file) {
  if (!file) return 'CV upload is required.'
  return validateOptionalCvFile(file)
}

export function validateOptionalCvFile(file) {
  if (!file) return ''
  const name = file.name.toLowerCase()
  const okExt = name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx')
  if (!okExt) return 'CV must be a PDF, DOC, or DOCX file.'
  const okMime = Object.keys(CV_MIME).includes(file.type) || okExt
  if (!okMime) return 'Invalid file type. Use PDF, DOC, or DOCX only.'
  if (file.size > 10 * 1024 * 1024) return 'CV must be 10 MB or smaller.'
  return ''
}

export async function fetchMyEnrollmentApplications(token, userId = '') {
  try {
    const { data } = await apiClient.get('/EnrollmentApplications/me', { headers: authHeaders(token) })
    return { source: 'api', items: data }
  } catch (error) {
    if (shouldUseLocalEnrollmentFallback(error, token)) {
      const items = userId ? listLocalApplicationsForStudent(userId) : readLocal()
      return { source: 'local', items }
    }
    throw error
  }
}

export async function fetchCourseEnrollmentApplication(token, userId, branchId, courseId) {
  try {
    const { data } = await apiClient.get('/EnrollmentApplications/me/course', {
      headers: authHeaders(token),
      params: { branchId, courseId },
    })
    return { source: 'api', record: data }
  } catch (error) {
    if (shouldUseLocalEnrollmentFallback(error, token)) {
      return { source: 'local', record: findLocalApplication(userId, branchId, courseId) }
    }
    throw error
  }
}

export async function submitEnrollmentApplication(token, userId, userEmail, userName, fields, cvFile, onProgress) {
  const form = new FormData()
  Object.entries(fields).forEach(([key, value]) => form.append(key, value ?? ''))
  form.append('cv', cvFile)

  try {
    const { data } = await apiClient.post('/EnrollmentApplications', form, {
      headers: {
        ...authHeaders(token),
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) return
        onProgress(Math.round((event.loaded * 100) / event.total))
      },
    })
    saveLocalApplication(normalizeRecord(data, userId))
    return { source: 'api', record: data }
  } catch (error) {
    if (shouldUseLocalEnrollmentFallback(error, token)) {
      onProgress?.(100)
      const record = createLocalEnrollmentApplication(userId, userEmail, userName, fields, cvFile)
      return { source: 'local', record }
    }
    const message =
      axios.isAxiosError(error) && error.response?.status === 401
        ? 'Your session expired or is not valid for the API. Sign out and sign in again, then resubmit.'
        : error.response?.data?.message ?? 'Unable to submit application.'
    throw new Error(message)
  }
}

export async function fetchTrainerEnrollmentApplications(token, trainerEmail, statusFilter, trainerId = '') {
  syncCatalogEnrollmentsToTrainerInbox()
  const status = statusFilter || null
  const localItems = listLocalApplicationsForTrainer(trainerEmail, status, trainerId)
  try {
    const { data } = await apiClient.get('/EnrollmentApplications/trainer', {
      headers: authHeaders(token),
      params: status ? { status } : {},
    })
    const apiItems = Array.isArray(data) ? data : []
    return { source: 'merged', items: mergeEnrollmentApplications(apiItems, localItems) }
  } catch (error) {
    if (shouldUseLocalEnrollmentFallback(error, token) || localItems.length > 0) {
      return { source: 'local', items: localItems }
    }
    throw error
  }
}

export async function approveEnrollmentApplication(token, applicationId) {
  try {
    const { data } = await apiClient.post(
      `/EnrollmentApplications/trainer/${applicationId}/approve`,
      {},
      { headers: authHeaders(token) },
    )
    saveLocalApplication(normalizeRecord(data))
    return data
  } catch (error) {
    if (shouldUseLocalEnrollmentFallback(error, token) || isNetworkish(error)) {
      const rows = readLocal()
      const idx = rows.findIndex((r) => r.id === applicationId)
      if (idx >= 0) {
        rows[idx] = {
          ...rows[idx],
          status: 'approved',
          rejectionReason: null,
          reviewedAtUtc: new Date().toISOString(),
          updatedAtUtc: new Date().toISOString(),
        }
        writeLocal(rows)
        return rows[idx]
      }
    }
    throw error
  }
}

export async function rejectEnrollmentApplication(token, applicationId, rejectionReason) {
  try {
    const { data } = await apiClient.post(
      `/EnrollmentApplications/trainer/${applicationId}/reject`,
      { rejectionReason },
      { headers: authHeaders(token) },
    )
    saveLocalApplication(normalizeRecord(data))
    return data
  } catch (error) {
    if (shouldUseLocalEnrollmentFallback(error, token) || isNetworkish(error)) {
      const rows = readLocal()
      const idx = rows.findIndex((r) => r.id === applicationId)
      if (idx >= 0) {
        rows[idx] = {
          ...rows[idx],
          status: 'rejected',
          rejectionReason: rejectionReason || 'Application was not approved.',
          reviewedAtUtc: new Date().toISOString(),
          updatedAtUtc: new Date().toISOString(),
        }
        writeLocal(rows)
        return rows[idx]
      }
    }
    throw error
  }
}

