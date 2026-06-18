import axios from 'axios'
import {
  apiClient,
  buildAuthHeaders,
  canUseProtectedApi,
  isDevAuthToken,
  isLocalOnlySession,
  readStoredAuthToken,
  resetPreferLocalPortalData,
} from './authApi.js'
import { normalizeEnrollmentApplicationTrainer, trainerOwnsEnrollmentApplication } from '../utils/platformDefaultTrainer.js'
import { resolveCourseTrainer } from '../utils/resolveCourseTrainer.js'
import {
  dispatchPortalNotificationsChanged,
  ENROLLMENT_NOTIFICATION_TYPE,
  CATALOG_ENROLLMENT_NOTIFICATION_TYPE,
  STUDENT_MESSAGE_NOTIFICATION_TYPE,
} from '../utils/portalNotifications.js'
import {
  collectTrainerStudentActivities,
  mergeTrainerActivityNotifications,
} from '../utils/trainerStudentActivityFeed.js'
import {
  clearCatalogEnrollmentMemory,
  enrollInCatalogTraining,
  listAllCatalogEnrollmentOwners,
  readCatalogEnrollments,
} from '../utils/trainingCatalogEnrollment.js'
import { syncEnrollmentOnboardingFromApplication } from '../utils/enrollmentAccessSync.js'
import {
  isApplicationAwaitingTrainerReview,
  isSubmittedEnrollmentApplication,
} from '../utils/enrollmentApplicationStatus.js'
import { normalizePortalEmail, portalUserMatches, resolvePortalUserAliases } from '../utils/portalUserDirectory.js'

export {
  isApplicationApproved,
  isApplicationAwaitingTrainerReview,
  isApplicationEnrolledAwaitingForm,
  isApplicationFormComplete,
  isApplicationPending,
  isApplicationRejected,
  isSubmittedEnrollmentApplication,
} from '../utils/enrollmentApplicationStatus.js'
import {
  listApprovedApplicationsForCourse as listApprovedFromStore,
  setEnrollmentApplicationsSnapshot,
} from '../utils/enrollmentApplicationsStore.js'

export const ENROLLMENT_APPLICATIONS_CHANGED_EVENT = 'ts-enrollment-applications-changed'

const LS_KEY = 'ts-enrollment-applications-v1'

const authHeaders = buildAuthHeaders

/** In-memory cache of student applications from SQL (API sessions do not rely on localStorage). */
const studentApplicationsMemory = new Map()

/** True when the session has a real JWT (not blocked by offline/demo flags). */
function hasRealApiSession(token = readStoredAuthToken()) {
  const t = String(token ?? '').trim()
  return Boolean(t) && !isDevAuthToken(t) && canUseProtectedApi(t)
}

function shouldPersistEnrollmentLocally(token = readStoredAuthToken()) {
  return !hasRealApiSession(token)
}

export function cacheStudentApplications(userId, items = [], sessionEmail = '') {
  const uid = String(userId ?? '').trim()
  if (!uid) return
  studentApplicationsMemory.set(
    uid,
    (Array.isArray(items) ? items : [])
      .map((row) => normalizeApplicationRecord(row, uid))
      .filter((row) => row && applicationBelongsToUser(row, uid, sessionEmail)),
  )
}

export function clearStudentEnrollmentCaches() {
  studentApplicationsMemory.clear()
  clearCatalogEnrollmentMemory()
}

function readLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocal(rows) {
  if (!shouldPersistEnrollmentLocally()) {
    window.dispatchEvent(new CustomEvent(ENROLLMENT_APPLICATIONS_CHANGED_EVENT))
    return
  }
  const prev = readLocal()
  if (JSON.stringify(prev) === JSON.stringify(rows)) return
  localStorage.setItem(LS_KEY, JSON.stringify(rows))
  window.dispatchEvent(new CustomEvent(ENROLLMENT_APPLICATIONS_CHANGED_EVENT))
}

function isNetworkish(error) {
  return !axios.isAxiosError(error) || !error.response
}

function applicationCompoundKey(row) {
  return `${String(row?.userId ?? '')}::${String(row?.branchId ?? '')}::${String(row?.courseId ?? '')}`
}

function stableApplicationId(userId, branchId, courseId) {
  return `local-enroll-app-${branchId}-${courseId}-${String(userId).replace(/[^a-zA-Z0-9_-]/g, '')}`
}

/** Normalize API/local rows and always attach the course's assigned trainer. */
export function normalizeApplicationRecord(row, userId = '') {
  if (!row) return null
  const branchId = String(row.branchId ?? row.BranchId ?? '').trim()
  const courseId = String(row.courseId ?? row.CourseId ?? row.trainingId ?? '').trim()
  const courseTrainer = branchId && courseId ? resolveCourseTrainer(branchId, courseId) : {}
  const motivationReason = String(row.motivationReason ?? row.MotivationReason ?? '').trim()

  return normalizeEnrollmentApplicationTrainer({
    ...row,
    id: row.id ?? row.Id ?? (userId && branchId && courseId ? stableApplicationId(userId, branchId, courseId) : undefined),
    userId: row.userId ?? row.UserId ?? userId,
    branchId,
    courseId,
    courseTitle:
      String(row.courseTitle ?? row.CourseTitle ?? courseTrainer.courseTitle ?? '').trim() ||
      'Training program',
    motivationReason,
    universityName: String(row.universityName ?? row.UniversityName ?? '').trim(),
    major: String(row.major ?? row.Major ?? '').trim(),
    gpa: String(row.gpa ?? row.Gpa ?? '').trim(),
    previousStudies: String(row.previousStudies ?? row.PreviousStudies ?? '').trim(),
    cvFileName: row.cvFileName ?? row.CvFileName ?? '',
    cvFileUrl: row.cvFileUrl ?? row.CvFileUrl ?? '',
    trainerId: String(row.trainerId ?? row.TrainerId ?? courseTrainer.trainerId ?? '').trim(),
    trainerEmail: String(row.trainerEmail ?? row.TrainerEmail ?? courseTrainer.trainerEmail ?? '')
      .trim()
      .toLowerCase(),
    trainerName: String(row.trainerName ?? row.TrainerName ?? courseTrainer.trainerName ?? '').trim(),
    applicationComplete: motivationReason ? true : row.applicationComplete !== false,
    status: String(row.status ?? row.Status ?? 'pending').toLowerCase(),
    rejectionReason: row.rejectionReason ?? row.RejectionReason ?? null,
    createdAtUtc: row.createdAtUtc ?? row.CreatedAtUtc ?? row.createdAt ?? new Date().toISOString(),
    updatedAtUtc: row.updatedAtUtc ?? row.UpdatedAtUtc ?? row.updatedAt ?? new Date().toISOString(),
  })
}

function reconcileStoredEnrollmentApplications() {
  const rows = readLocal()
  let changed = false
  const next = rows.map((row) => {
    const normalized = normalizeApplicationRecord(row, row.userId)
    if (JSON.stringify(normalized) !== JSON.stringify(row)) changed = true
    return normalized
  })
  if (changed) writeLocal(next)
  return next
}

function pickPreferredApplication(existing, candidate) {
  if (!existing) return candidate
  if (!candidate) return existing
  const existingReady = isSubmittedEnrollmentApplication(existing)
  const candidateReady = isSubmittedEnrollmentApplication(candidate)
  if (candidateReady && !existingReady) return candidate
  if (existingReady && !candidateReady) return existing
  const existingAt = new Date(existing.updatedAtUtc ?? 0).getTime()
  const candidateAt = new Date(candidate.updatedAtUtc ?? 0).getTime()
  return candidateAt >= existingAt ? candidate : existing
}

function shouldUseLocalEnrollmentFallback(error, token) {
  if (!hasRealApiSession(token)) return true
  if (isNetworkish(error)) return true
  if (axios.isAxiosError(error) && error.response?.status === 409) return true
  return false
}

function pruneIncompleteEnrollmentStubs() {
  const rows = readLocal()
  const kept = rows.filter(
    (row) => isSubmittedEnrollmentApplication(row) || String(row.status).toLowerCase() !== 'pending',
  )
  if (kept.length !== rows.length) writeLocal(kept)
}

/** Create or return a pending application when a student enrolls in a course. */
export function ensureEnrollmentApplicationStub(userId, userEmail, userName, fields) {
  const branchId = String(fields?.branchId ?? '').trim()
  const courseId = String(fields?.courseId ?? fields?.trainingId ?? '').trim()
  const courseTitle = String(fields?.courseTitle ?? fields?.trainingTitle ?? '').trim()
  if (!userId || !branchId || !courseId) return null

  const existing = findLocalApplication(userId, branchId, courseId)
  if (existing) return existing

  const now = new Date().toISOString()
  const record = normalizeApplicationRecord({
    id: stableApplicationId(userId, branchId, courseId),
    userId,
    userEmail: String(userEmail ?? '').trim(),
    userName: String(userName ?? '').trim() || 'Student',
    branchId,
    courseId,
    courseTitle,
    motivationReason: '',
    applicationComplete: false,
    status: 'pending',
    rejectionReason: null,
    reviewedAtUtc: null,
    reviewedBy: null,
    createdAtUtc: now,
    updatedAtUtc: now,
  }, userId)
  saveLocalApplication(record)
  pushEnrollmentRequestNotification(record.trainerId, {
    applicationId: record.id,
    branchId,
    courseId,
    courseTitle: record.courseTitle,
    userName: record.userName,
    studentId: userId,
    trainerEmail: record.trainerEmail,
  })
  return record
}

function syncEnrollmentApplicationsToLocal(items, sessionUserId = '', token = readStoredAuthToken()) {
  if (!Array.isArray(items) || items.length === 0) return
  const normalizedItems = items
    .map((row) => {
      const ownerId = sessionUserId || row.userId || row.UserId
      return normalizeApplicationRecord({ ...row, userId: ownerId }, ownerId)
    })
    .filter(Boolean)
  for (const normalized of normalizedItems) {
    saveLocalApplication(normalized)
  }
  if (sessionUserId) {
    cacheStudentApplications(sessionUserId, normalizedItems)
  }
}

function createLocalEnrollmentApplication(userId, userEmail, userName, fields, cvFile) {
  const now = new Date().toISOString()
  const branchId = String(fields.branchId ?? '').trim()
  const courseId = String(fields.courseId ?? '').trim()
  const existing = findLocalApplication(userId, branchId, courseId)
  const record = normalizeApplicationRecord({
    ...(existing ?? {}),
    id: existing?.id ?? stableApplicationId(userId, branchId, courseId),
    userId,
    userEmail,
    userName,
    branchId,
    courseId,
    courseTitle: fields.courseTitle,
    motivationReason: fields.motivationReason,
    universityName: fields.universityName,
    major: fields.major,
    gpa: fields.gpa,
    previousStudies: fields.previousStudies,
    cvFileName: cvFile.name,
    cvFileUrl: `local://${cvFile.name}`,
    applicationComplete: true,
    status: 'pending',
    rejectionReason: null,
    reviewedAtUtc: null,
    reviewedBy: null,
    createdAtUtc: existing?.createdAtUtc ?? now,
    updatedAtUtc: now,
  }, userId)
  saveLocalApplication(record)
  if (isApplicationAwaitingTrainerReview(record)) {
    notifyTrainerEnrollmentReady(record, userName)
  }
  return record
}

function applicationBelongsToUser(row, userId, sessionEmail = '') {
  const uid = String(userId ?? '').trim()
  const rowUid = String(row?.userId ?? '').trim()
  const email = normalizePortalEmail(sessionEmail)
  const rowEmail = normalizePortalEmail(row?.userEmail)
  if (!uid && !email) return false
  if (uid && rowUid && uid === rowUid) return true
  if (email && rowEmail && email === rowEmail) return true
  if (uid && rowUid && portalUserMatches(uid, email, rowUid)) return true
  return false
}

export function findLocalApplication(userId, branchId, courseId, sessionEmail = '') {
  const bid = String(branchId ?? '').trim()
  const cid = String(courseId ?? '').trim()
  return (
    listLocalApplicationsForStudent(userId, sessionEmail).find(
      (row) => String(row.branchId) === bid && String(row.courseId) === cid,
    ) ?? null
  )
}

export function listLocalApplicationsForStudent(userId, sessionEmail = '') {
  const uid = String(userId ?? '').trim()
  if (!uid) return []
  const cached = studentApplicationsMemory.get(uid)
  if (cached) {
    return cached.filter((row) => applicationBelongsToUser(row, uid, sessionEmail))
  }
  if (!shouldPersistEnrollmentLocally()) return []
  return readLocal().filter((row) => applicationBelongsToUser(row, uid, sessionEmail))
}

export function listLocalApplicationsForTrainer(trainerEmail, statusFilter, trainerId = '') {
  let rows = collectTrainerEnrollmentApplications(trainerEmail, trainerId)

  if (statusFilter) {
    const f = String(statusFilter).toLowerCase()
    rows = rows.filter((row) => String(row.status).toLowerCase() === f)
  }
  return rows.sort((a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime())
}

/** Applications ready for trainer approval — mirrors student "Pending review" state. */
export function listPendingReviewApplicationsForTrainer(trainerEmail, trainerId = '') {
  return collectTrainerEnrollmentApplications(trainerEmail, trainerId).filter(isApplicationAwaitingTrainerReview)
}

function collectTrainerEnrollmentApplications(trainerEmail, trainerId = '') {
  reconcileStoredEnrollmentApplications()

  const rows = readLocal()
    .map((row) => normalizeApplicationRecord(row, row.userId))
    .filter((row) => trainerOwnsEnrollmentApplication(row, trainerEmail, trainerId, resolveCourseTrainer))

  const existingKeys = new Set(
    rows.map((row) => `${row.userId}::${row.branchId}::${row.courseId}`),
  )

  for (const stub of listCatalogEnrollmentApplicationStubsForTrainer(trainerEmail, trainerId)) {
    const key = `${stub.userId}::${stub.branchId}::${stub.courseId}`
    if (existingKeys.has(key)) continue
    saveLocalApplication(stub)
    rows.push(stub)
    existingKeys.add(key)
  }

  for (const { userId: studentUserId, enrollments } of listAllCatalogEnrollmentOwners()) {
    for (const enrollment of enrollments) {
      const branchId = String(enrollment.branchId ?? '').trim()
      const courseId = String(enrollment.trainingId ?? '').trim()
      if (!branchId || !courseId) continue

      const compound = `${studentUserId}::${branchId}::${courseId}`
      if (existingKeys.has(compound)) continue

      const application = findLocalApplication(studentUserId, branchId, courseId)
      if (!application) continue
      if (!trainerOwnsEnrollmentApplication(application, trainerEmail, trainerId, resolveCourseTrainer)) {
        continue
      }

      const normalized = normalizeApplicationRecord(application, studentUserId)
      saveLocalApplication(normalized)
      rows.push(normalized)
      existingKeys.add(compound)
    }
  }

  const merged = new Map()
  for (const row of rows) {
    const key = applicationCompoundKey(row)
    if (!key || key === '::') continue
    merged.set(key, pickPreferredApplication(merged.get(key), row))
  }
  return [...merged.values()]
}

function listCatalogEnrollmentApplicationStubsForTrainer(trainerEmail, trainerId = '') {
  if (typeof window === 'undefined') return []

  const stubs = []
  const seen = new Set()

  for (const { userId, enrollments } of listAllCatalogEnrollmentOwners()) {
    for (const enrollment of enrollments) {
      const branchId = String(enrollment.branchId ?? '').trim()
      const courseId = String(enrollment.trainingId ?? '').trim()
      if (!branchId || !courseId) continue

      const enrollmentStatus = String(enrollment.status ?? '').toLowerCase()
      if (!enrollmentStatus.includes('accept') && !enrollmentStatus.includes('enroll')) continue

      const compound = `${userId}::${branchId}::${courseId}`
      if (seen.has(compound)) continue
      seen.add(compound)
      if (findLocalApplication(userId, branchId, courseId)) continue

      const trainer = normalizeEnrollmentApplicationTrainer({
        branchId,
        courseId,
        courseTitle: enrollment.trainingTitle,
        ...resolveCourseTrainer(branchId, courseId),
      })
      const ownershipRow = {
        branchId,
        courseId,
        trainerId: trainer.trainerId,
        trainerEmail: trainer.trainerEmail,
      }
      if (!trainerOwnsEnrollmentApplication(ownershipRow, trainerEmail, trainerId, resolveCourseTrainer)) {
        continue
      }

      const onboarding = String(enrollment.onboardingStatus ?? '').toLowerCase()
      stubs.push({
        id: `local-enroll-app-${branchId}-${courseId}-${String(userId).replace(/[^a-zA-Z0-9_-]/g, '')}`,
        userId,
        userEmail: String(enrollment.userEmail ?? '').trim(),
        userName: String(enrollment.userName ?? '').trim() || 'Student',
        branchId,
        courseId,
        courseTitle: String(enrollment.trainingTitle ?? '').trim() || trainer.courseTitle || 'Training program',
        trainerId: trainer.trainerId,
        trainerEmail: trainer.trainerEmail,
        trainerName: trainer.trainerName,
        motivationReason: '',
        universityName: '',
        major: '',
        gpa: '',
        previousStudies: '',
        cvFileName: '',
        cvFileUrl: '',
        applicationComplete: false,
        status: onboarding === 'rejected' ? 'rejected' : 'pending',
        rejectionReason: enrollment.rejectionReason ?? null,
        reviewedAtUtc: null,
        reviewedBy: null,
        createdAtUtc: enrollment.enrolledAtUtc ?? new Date().toISOString(),
        updatedAtUtc: enrollment.enrolledAtUtc ?? new Date().toISOString(),
      })
    }
  }

  return stubs
}

function mergeEnrollmentApplications(apiItems, localItems) {
  const merged = new Map()
  const ingest = (row) => {
    const normalized = normalizeApplicationRecord(row, row?.userId)
    if (!normalized) return
    const key = applicationCompoundKey(normalized)
    if (!key || key === '::') return
    merged.set(key, pickPreferredApplication(merged.get(key), normalized))
  }
  for (const row of localItems ?? []) ingest(row)
  for (const row of apiItems ?? []) ingest(row)
  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.createdAtUtc ?? b.createdAt).getTime() - new Date(a.createdAtUtc ?? a.createdAt).getTime(),
  )
}

export function saveLocalApplication(record) {
  const normalized = normalizeApplicationRecord(record, record?.userId)
  if (!normalized) return null
  const uid = String(normalized.userId ?? '').trim()
  const compound = applicationCompoundKey(normalized)
  let memoryChanged = false
  if (uid) {
    const existing = (studentApplicationsMemory.get(uid) ?? []).find(
      (row) => row.id === normalized.id || applicationCompoundKey(row) === compound,
    )
    memoryChanged = !existing || JSON.stringify(existing) !== JSON.stringify(normalized)
    const prev = (studentApplicationsMemory.get(uid) ?? []).filter(
      (row) => row.id !== normalized.id && applicationCompoundKey(row) !== compound,
    )
    studentApplicationsMemory.set(uid, [normalized, ...prev])
  }
  if (!shouldPersistEnrollmentLocally()) {
    if (memoryChanged) {
      window.dispatchEvent(new CustomEvent(ENROLLMENT_APPLICATIONS_CHANGED_EVENT))
    }
    return normalized
  }
  const rows = readLocal()
  const existing = rows.find(
    (row) => row.id === normalized.id || applicationCompoundKey(row) === compound,
  )
  if (existing && JSON.stringify(existing) === JSON.stringify(normalized)) return normalized
  const prev = rows.filter(
    (row) => row.id !== normalized.id && applicationCompoundKey(row) !== compound,
  )
  writeLocal([normalized, ...prev])
  return normalized
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

export async function fetchCourseAccessDecision(token, branchId, courseId) {
  if (isLocalOnlySession(token)) return null
  try {
    const { data } = await apiClient.get('/EnrollmentApplications/access', {
      headers: authHeaders(token),
      params: { branchId, courseId },
    })
    return data ?? null
  } catch {
    return null
  }
}

export async function fetchMyEnrollmentApplications(token, userId = '', sessionEmail = '') {
  if (!userId) {
    return { source: 'local', items: [] }
  }
  if (!hasRealApiSession(token)) {
    const items = listLocalApplicationsForStudent(userId, sessionEmail)
    cacheStudentApplications(userId, items, sessionEmail)
    return { source: 'local', items }
  }
  try {
    const { data } = await apiClient.get('/EnrollmentApplications/me', { headers: authHeaders(token) })
    resetPreferLocalPortalData()
    const items = (Array.isArray(data) ? data : [])
      .map((row) =>
        normalizeApplicationRecord(
          { ...row, userId: userId || row.userId || row.UserId },
          userId || row.userId || row.UserId,
        ),
      )
      .filter((row) => row && applicationBelongsToUser(row, userId, sessionEmail))
    cacheStudentApplications(userId, items, sessionEmail)
    syncEnrollmentApplicationsToLocal(items, userId, token)
    return { source: 'api', items }
  } catch (error) {
    if (shouldUseLocalEnrollmentFallback(error, token)) {
      const items = listLocalApplicationsForStudent(userId, sessionEmail)
      return { source: 'local', items }
    }
    throw error
  }
}

export async function startEnrollmentApplication(token, userId, userEmail, userName, fields) {
  const branchId = String(fields?.branchId ?? '').trim()
  const courseId = String(fields?.courseId ?? fields?.trainingId ?? '').trim()
  const courseTitle = String(fields?.courseTitle ?? fields?.trainingTitle ?? '').trim()
  if (!userId || !branchId || !courseId) {
    throw new Error('Missing enrollment details.')
  }

  const trainer = resolveCourseTrainer(branchId, courseId)
  const localFields = {
    branchId,
    courseId,
    courseTitle: courseTitle || trainer.courseTitle || 'Training program',
    trainerId: fields?.trainerId ?? trainer.trainerId,
    trainerEmail: fields?.trainerEmail ?? trainer.trainerEmail,
    trainerName: fields?.trainerName ?? trainer.trainerName,
  }

  enrollInCatalogTraining(userId, {
    branchId,
    trainingId: courseId,
    trainingTitle: localFields.courseTitle,
    userEmail,
    userName,
  })

  if (!hasRealApiSession(token)) {
    const record = ensureEnrollmentApplicationStub(userId, userEmail, userName, localFields)
    return { source: 'local', record }
  }

  try {
    const { data } = await apiClient.post(
      '/EnrollmentApplications/start',
      {
        branchId,
        courseId,
        courseTitle: localFields.courseTitle,
        trainerId: localFields.trainerId,
        trainerEmail: localFields.trainerEmail,
        trainerName: localFields.trainerName,
      },
      { headers: authHeaders(token), timeout: 10000 },
    )
    resetPreferLocalPortalData()
    const record = normalizeApplicationRecord({ ...data, userId }, userId)
    saveLocalApplication(record)
    syncEnrollmentOnboardingFromApplication(userId, branchId, courseId, record)
    pushEnrollmentRequestNotification(record.trainerId, {
      applicationId: record.id,
      branchId,
      courseId,
      courseTitle: record.courseTitle,
      userName: record.userName || userName,
      studentId: record.userId || userId,
      trainerEmail: record.trainerEmail,
    })
    return { source: 'api', record }
  } catch (error) {
    if (shouldUseLocalEnrollmentFallback(error, token)) {
      const record = ensureEnrollmentApplicationStub(userId, userEmail, userName, localFields)
      return { source: 'local', record }
    }
    const message =
      axios.isAxiosError(error) && error.response?.data?.message
        ? String(error.response.data.message)
        : 'Could not start enrollment. Try again.'
    throw new Error(message)
  }
}

export async function fetchCourseEnrollmentApplication(token, userId, branchId, courseId) {
  const localRecord = findLocalApplication(userId, branchId, courseId)
  if (isLocalOnlySession(token)) {
    return { source: 'local', record: localRecord }
  }
  try {
    const { data } = await apiClient.get('/EnrollmentApplications/me/course', {
      headers: authHeaders(token),
      params: { branchId, courseId },
    })
    if (data) {
      const normalized = normalizeRecord(data, userId)
      saveLocalApplication(normalized)
      syncEnrollmentOnboardingFromApplication(userId, branchId, courseId, normalized)
      return { source: 'api', record: normalized }
    }
    return { source: 'local', record: localRecord }
  } catch (error) {
    if (shouldUseLocalEnrollmentFallback(error, token) || localRecord) {
      return { source: 'local', record: localRecord }
    }
    throw error
  }
}

export async function submitEnrollmentApplication(token, userId, userEmail, userName, fields, cvFile, onProgress) {
  onProgress?.(10)

  const form = new FormData()
  Object.entries(fields).forEach(([key, value]) => form.append(key, value ?? ''))
  form.append('cv', cvFile)

  const tryApiSubmit = async () => {
    const { data } = await apiClient.post('/EnrollmentApplications', form, {
      headers: {
        ...authHeaders(token),
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) return
        onProgress(Math.round((event.loaded * 100) / event.total))
      },
      timeout: 15000,
    })
    const record = normalizeApplicationRecord(data, userId)
    saveLocalApplication(record)
    syncEnrollmentOnboardingFromApplication(userId, fields.branchId, fields.courseId, record)
    if (isApplicationAwaitingTrainerReview(record)) {
      notifyTrainerEnrollmentReady(record, userName)
    }
    return { source: 'api', record }
  }

  try {
    return await tryApiSubmit()
  } catch (error) {
    const localRecord = createLocalEnrollmentApplication(userId, userEmail, userName, fields, cvFile)
    syncEnrollmentOnboardingFromApplication(userId, fields.branchId, fields.courseId, localRecord)
    onProgress?.(100)
    if (shouldUseLocalEnrollmentFallback(error, token)) {
      return { source: 'local', record: localRecord }
    }
    return { source: 'local', record: localRecord }
  }
}

export async function fetchTrainerEnrollmentApplications(token, trainerEmail, statusFilter, trainerId = '') {
  try {
    reconcileStoredEnrollmentApplications()
  } catch {
    // Local snapshots are best-effort; the API remains the source of truth for signed-in trainers.
  }

  let items = []
  try {
    items = collectTrainerEnrollmentApplications(trainerEmail, trainerId)
  } catch {
    items = []
  }
  const trustedApiIds = new Set()

  if (hasRealApiSession(token)) {
    try {
      const { data } = await apiClient.get('/EnrollmentApplications/trainer', {
        headers: authHeaders(token),
        params: statusFilter ? { status: statusFilter } : {},
      })
      resetPreferLocalPortalData()
      const apiItems = (Array.isArray(data) ? data : []).map((row) => normalizeApplicationRecord(row))
      for (const row of apiItems) {
        if (row?.id) trustedApiIds.add(row.id)
      }
      syncEnrollmentApplicationsToLocal(apiItems)
      items = mergeEnrollmentApplications(apiItems, collectTrainerEnrollmentApplications(trainerEmail, trainerId))
    } catch (error) {
      if (!shouldUseLocalEnrollmentFallback(error, token) && items.length === 0) {
        throw error
      }
    }
  }

  // SQL already scopes trainer inbox — do not drop API rows when local trainer metadata is stale.
  items = items.filter(
    (row) =>
      trustedApiIds.has(row.id) ||
      trainerOwnsEnrollmentApplication(row, trainerEmail, trainerId, resolveCourseTrainer),
  )

  if (statusFilter) {
    const f = String(statusFilter).toLowerCase()
    items =
      f === 'pending'
        ? items.filter(isApplicationAwaitingTrainerReview)
        : items.filter((row) => String(row.status).toLowerCase() === f)
  }

  const sorted = items.sort(
    (a, b) => new Date(b.createdAtUtc ?? 0).getTime() - new Date(a.createdAtUtc ?? 0).getTime(),
  )
  setEnrollmentApplicationsSnapshot(sorted)

  return {
    source: isLocalOnlySession(token) ? 'local' : 'merged',
    items: sorted,
  }
}

export async function approveEnrollmentApplication(token, applicationId) {
  if (isLocalOnlySession(token)) {
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
      const updated = rows[idx]
      if (updated?.userId && updated.branchId && updated.courseId) {
        syncEnrollmentOnboardingFromApplication(
          updated.userId,
          updated.branchId,
          updated.courseId,
          updated,
        )
      }
      return updated
    }
    throw new Error('Application not found.')
  }
  try {
    const { data } = await apiClient.post(
      `/EnrollmentApplications/trainer/${applicationId}/approve`,
      {},
      { headers: authHeaders(token) },
    )
    const normalized = normalizeRecord(data)
    saveLocalApplication(normalized)
    if (normalized?.userId && normalized.branchId && normalized.courseId) {
      syncEnrollmentOnboardingFromApplication(
        normalized.userId,
        normalized.branchId,
        normalized.courseId,
        normalized,
      )
    }
    return normalized
  } catch (error) {
    if (shouldUseLocalEnrollmentFallback(error, token)) {
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
        const updated = rows[idx]
        if (updated?.userId && updated.branchId && updated.courseId) {
          syncEnrollmentOnboardingFromApplication(
            updated.userId,
            updated.branchId,
            updated.courseId,
            updated,
          )
        }
        return updated
      }
    }
    throw error
  }
}

export async function rejectEnrollmentApplication(token, applicationId, rejectionReason) {
  if (isLocalOnlySession(token)) {
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
    throw new Error('Application not found.')
  }
  try {
    const { data } = await apiClient.post(
      `/EnrollmentApplications/trainer/${applicationId}/reject`,
      { rejectionReason },
      { headers: authHeaders(token) },
    )
    saveLocalApplication(normalizeRecord(data))
    return data
  } catch (error) {
    if (shouldUseLocalEnrollmentFallback(error, token)) {
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

function buildTrainerNotificationFeed(userId, trainerEmail = '') {
  const stored = readNotificationsLocal(userId)
  const derived = collectTrainerStudentActivities({ trainerId: userId, trainerEmail })
  return mergeTrainerActivityNotifications(stored, derived)
}

export async function fetchPortalNotifications(token, userId, trainerEmail = '') {
  const merged = buildTrainerNotificationFeed(userId, trainerEmail)
  if (!hasRealApiSession(token)) {
    return merged
  }
  try {
    const { data } = await apiClient.get('/EnrollmentApplications/notifications', {
      headers: authHeaders(token),
    })
    resetPreferLocalPortalData()
    const apiItems = Array.isArray(data) ? data : []
    return mergePortalNotifications(apiItems, merged)
  } catch (error) {
    if (shouldUseLocalEnrollmentFallback(error, token)) {
      return merged
    }
    return merged.length ? merged : []
  }
}

export async function fetchUnreadNotificationCount(token, userId, trainerEmail = '') {
  const merged = buildTrainerNotificationFeed(userId, trainerEmail)
  const localUnread = merged.filter((n) => !n.isRead).length
  if (isLocalOnlySession(token)) {
    return localUnread
  }
  try {
    const { data } = await apiClient.get('/EnrollmentApplications/notifications/unread-count', {
      headers: authHeaders(token),
    })
    const apiCount = Number(data?.count ?? 0)
    return Math.max(apiCount, localUnread)
  } catch {
    return localUnread
  }
}

export async function markPortalNotificationRead(token, userId, notificationId) {
  markNotificationReadLocal(userId, notificationId)
  if (isLocalOnlySession(token)) {
    dispatchPortalNotificationsChanged()
    return
  }
  try {
    await apiClient.post(`/EnrollmentApplications/notifications/${notificationId}/read`, null, {
      headers: authHeaders(token),
    })
  } catch {
    /* local already updated */
  }
  dispatchPortalNotificationsChanged()
}

export async function markEnrollmentApplicationNotificationsRead(token, userId, applicationId) {
  markEnrollmentNotificationsReadLocal(userId, applicationId)
  if (isLocalOnlySession(token)) {
    dispatchPortalNotificationsChanged()
    return
  }
  try {
    await apiClient.post(`/EnrollmentApplications/notifications/application/${applicationId}/read`, null, {
      headers: authHeaders(token),
    })
  } catch {
    /* local already updated */
  }
  dispatchPortalNotificationsChanged()
}

const NOTIF_KEY = (userId) => `ts-portal-notifications-${userId}`

function readNotificationsLocal(userId) {
  if (!userId) return []
  try {
    const raw = localStorage.getItem(NOTIF_KEY(userId))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeNotificationsLocal(userId, rows) {
  if (!userId) return
  localStorage.setItem(NOTIF_KEY(userId), JSON.stringify(rows.slice(0, 50)))
  dispatchPortalNotificationsChanged()
}

function mergePortalNotifications(apiItems, localItems) {
  if (apiItems.length > 0) {
    return [...apiItems].sort(
      (a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime(),
    )
  }
  const merged = new Map()
  for (const row of localItems) merged.set(row.id, row)
  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime(),
  )
}

function markNotificationReadLocal(userId, notificationId) {
  const rows = readNotificationsLocal(userId).map((row) =>
    row.id === notificationId ? { ...row, isRead: true } : row,
  )
  writeNotificationsLocal(userId, rows)
}

function markEnrollmentNotificationsReadLocal(userId, applicationId) {
  const rows = readNotificationsLocal(userId).map((row) =>
    row.applicationId === applicationId ? { ...row, isRead: true } : row,
  )
  writeNotificationsLocal(userId, rows)
}

function notifyTrainerEnrollmentReady(record, userName = '') {
  if (!record || !isApplicationAwaitingTrainerReview(record)) return null
  return pushEnrollmentRequestNotification(record.trainerId, {
    applicationId: record.id,
    branchId: record.branchId,
    courseId: record.courseId,
    courseTitle: record.courseTitle,
    userName: userName || record.userName,
    studentId: record.userId,
    trainerEmail: record.trainerEmail,
    readyForReview: true,
  })
}

export function pushEnrollmentRequestNotification(trainerUserId, payload) {
  if (!payload?.applicationId) return null
  const courseTitle = payload.courseTitle || 'Training program'
  const userName = payload.userName || 'A student'
  const readyForReview = payload.readyForReview === true
  const stableId = `activity-app-${payload.branchId}-${payload.courseId}-${payload.studentId}`
  const row = {
    id: stableId,
    userId: trainerUserId,
    title: readyForReview
      ? `${userName} is waiting for approval`
      : `New enrollment interest for ${courseTitle}`,
    message: readyForReview
      ? `${userName} submitted their application for ${courseTitle}. Open Accept new students to review and approve.`
      : `${userName} enrolled in ${courseTitle} and still needs to complete the application form.`,
    tone: 'info',
    isRead: false,
    type: ENROLLMENT_NOTIFICATION_TYPE,
    applicationId: payload.applicationId,
    branchId: payload.branchId,
    courseId: payload.courseId,
    courseTitle,
    trainingId: payload.courseId,
    studentId: payload.studentId,
    studentName: userName,
    targetView: 'enrollment-requests',
    createdAtUtc: new Date().toISOString(),
  }

  const trainerIds = resolvePortalUserAliases(trainerUserId, payload.trainerEmail ?? '')
  if (trainerUserId) trainerIds.add(String(trainerUserId))
  let last = null
  for (const id of trainerIds) {
    const prev = readNotificationsLocal(id)
    writeNotificationsLocal(id, [{ ...row, userId: id }, ...prev.filter((item) => item.id !== row.id)])
    last = row
  }
  return last
}

/** Notify the course trainer that a student submitted a task for review. */
/** Notifications are created in SQL when students submit tasks via /api/Submission/task. */
export function pushTaskSubmissionNotification() {
  return null
}

export function pushCatalogEnrollmentNotification(trainerUserId, payload) {
  if (!trainerUserId) return null
  const courseTitle = payload.courseTitle || 'Training program'
  const studentName = payload.studentName || 'A student'
  const row = {
    id: `activity-enroll-${payload.studentId}-${payload.branchId}-${payload.courseId}`,
    userId: trainerUserId,
    title: `${studentName} subscribed to the course`,
    message: `${studentName} enrolled in ${courseTitle}.`,
    tone: 'info',
    isRead: false,
    type: CATALOG_ENROLLMENT_NOTIFICATION_TYPE,
    branchId: payload.branchId,
    courseId: payload.courseId,
    courseTitle,
    trainingId: payload.courseId,
    studentId: payload.studentId,
    studentName,
    targetView: 'enrolled-students',
    createdAtUtc: payload.enrolledAtUtc ?? new Date().toISOString(),
  }
  const prev = readNotificationsLocal(trainerUserId)
  writeNotificationsLocal(trainerUserId, [row, ...prev.filter((item) => item.id !== row.id)])
  return row
}

export function pushStudentMessageNotification(trainerUserId, payload) {
  if (!trainerUserId) return null
  const studentName = payload.studentName || 'A student'
  const preview = String(payload.content ?? '').trim().slice(0, 120)
  const row = {
    id: payload.messageId ? `activity-msg-${payload.messageId}` : `n-msg-${Date.now()}`,
    userId: trainerUserId,
    title: `${studentName} sent a message`,
    message: preview || 'New message from a student.',
    tone: 'info',
    isRead: false,
    type: STUDENT_MESSAGE_NOTIFICATION_TYPE,
    studentId: payload.studentId,
    studentName,
    courseTitle: payload.courseTitle || 'Direct message',
    targetView: 'messages',
    createdAtUtc: payload.timestamp ?? new Date().toISOString(),
  }
  const prev = readNotificationsLocal(trainerUserId)
  writeNotificationsLocal(trainerUserId, [row, ...prev.filter((item) => item.id !== row.id)])
  return row
}

function appendPortalNotifications(trainerUserId, rows) {
  if (!trainerUserId || !Array.isArray(rows) || rows.length === 0) return
  const prev = readNotificationsLocal(trainerUserId)
  const merged = mergeTrainerActivityNotifications(prev, rows)
  const prevIds = new Set(prev.map((row) => row.id))
  const hasNew = merged.some((row) => row?.id && !prevIds.has(row.id))
  if (hasNew) {
    writeNotificationsLocal(trainerUserId, merged)
  }
}

/** @deprecated use pushEnrollmentRequestNotification */
export function pushNotificationLocal(userId, payload) {
  return pushEnrollmentRequestNotification(userId, {
    applicationId: payload.applicationId,
    branchId: payload.branchId,
    courseId: payload.courseId,
    courseTitle: payload.courseTitle,
    userName: payload.message ?? 'A student',
  })
}

function normalizeRecord(data, userId) {
  return normalizeApplicationRecord(data, userId)
}

/** Students the trainer approved for a specific catalog course (SQL snapshot). */
export function listApprovedApplicationsForCourse(branchId, courseId) {
  return listApprovedFromStore(branchId, courseId)
}
