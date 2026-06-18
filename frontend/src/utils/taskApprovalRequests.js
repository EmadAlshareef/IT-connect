import {
  attachCourseContextToTaskBrief,
  notifyStudentCourseTasksChanged,
} from './taskCourseContext.js'
import {
  createTrainerTaskBrief,
  fetchTrainerTaskBriefs,
  updateTrainerTaskBriefApi,
} from '../api/trainerTaskBriefApi.js'

/** @deprecated localStorage key kept for one-time migration only */
export const TASK_APPROVAL_REQUESTS_KEY = 'ts-trainer-task-requests'
const LEGACY_TASK_DRAFTS_KEY = 'ts-trainer-dashboard-task-drafts'

let snapshot = []
let bootstrapPromise = null
let bootstrapEmail = ''

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

function resolveApiId(row) {
  return row?.apiId || row?.id || ''
}

function mergeIntoSnapshot(rows) {
  const next = [...snapshot]
  const indexByKey = new Map()
  next.forEach((row, idx) => {
    indexByKey.set(row.id, idx)
    if (row.apiId) indexByKey.set(row.apiId, idx)
    if (row.legacyLocalId) indexByKey.set(row.legacyLocalId, idx)
  })

  for (const row of rows) {
    const keys = [row.id, row.apiId, row.legacyLocalId].filter(Boolean)
    const existingIdx = keys.map((key) => indexByKey.get(key)).find((idx) => idx != null)
    if (existingIdx != null) {
      next[existingIdx] = { ...next[existingIdx], ...row }
      continue
    }
    next.unshift(row)
    keys.forEach((key) => indexByKey.set(key, 0))
  }

  snapshot = next
}

function notifyUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('trainer-task-requests-updated'))
  }
}

export function setTrainerTaskBriefsSnapshot(rows) {
  snapshot = Array.isArray(rows) ? rows.map((row) => ({ ...row })) : []
  notifyUpdated()
}

export function loadTaskApprovalRequests() {
  return [...snapshot]
}

function readLegacyLocalRows() {
  try {
    const raw = localStorage.getItem(TASK_APPROVAL_REQUESTS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function migrateLocalRowsToApi(trainerEmail) {
  const email = normalizeEmail(trainerEmail)
  if (!email) return

  const legacyRows = readLegacyLocalRows()
  try {
    const rawDrafts = localStorage.getItem(LEGACY_TASK_DRAFTS_KEY)
    if (rawDrafts) {
      const drafts = JSON.parse(rawDrafts)
      if (Array.isArray(drafts)) {
        for (const draft of drafts) {
          legacyRows.push({
            id: draft.id?.startsWith('task-draft-')
              ? `migrated-${draft.id}`
              : `migrated-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            requestedByEmail: email,
            trainerName: 'Trainer',
            sessionId: draft.sessionId,
            sessionTitle: draft.sessionTitle ?? '',
            title: draft.title,
            description: draft.description,
            deadline: draft.deadline,
            attachmentName: draft.attachmentName || '',
            createdAt: draft.createdAt || new Date().toISOString(),
            status: 'approved',
            reviewedAt: draft.createdAt || new Date().toISOString(),
            publishedAt: draft.createdAt || new Date().toISOString(),
            migratedFromLegacy: true,
          })
        }
      }
    }
  } catch {
    /* ignore */
  }

  if (legacyRows.length === 0) return

  const existing = new Set(
    snapshot.flatMap((row) => [row.id, row.apiId, row.legacyLocalId].filter(Boolean)),
  )

  for (const row of legacyRows) {
    if (normalizeEmail(row.requestedByEmail) !== email) continue
    const legacyId = String(row.id ?? '').trim()
    if (!legacyId || existing.has(legacyId)) continue

    const withContext = attachCourseContextToTaskBrief(row)
    try {
      const saved = await createTrainerTaskBrief(withContext)
      mergeIntoSnapshot([saved])
      existing.add(saved.id)
      if (saved.apiId) existing.add(saved.apiId)
      if (saved.legacyLocalId) existing.add(saved.legacyLocalId)
    } catch {
      mergeIntoSnapshot([withContext])
      existing.add(legacyId)
    }
  }

  try {
    localStorage.removeItem(TASK_APPROVAL_REQUESTS_KEY)
    localStorage.removeItem(LEGACY_TASK_DRAFTS_KEY)
  } catch {
    /* ignore */
  }
}

/** Load trainer task briefs from SQL (with one-time localStorage migration). */
export async function bootstrapTrainerTaskBriefs(trainerEmail = '') {
  const email = normalizeEmail(trainerEmail)
  if (!email) {
    setTrainerTaskBriefsSnapshot([])
    return []
  }

  if (bootstrapPromise && bootstrapEmail === email) return bootstrapPromise

  bootstrapEmail = email
  bootstrapPromise = (async () => {
    try {
      const rows = await fetchTrainerTaskBriefs()
      setTrainerTaskBriefsSnapshot(rows)
      await migrateLocalRowsToApi(email)
      return loadTaskApprovalRequests()
    } catch {
      await migrateLocalRowsToApi(email)
      return loadTaskApprovalRequests()
    } finally {
      bootstrapPromise = null
    }
  })()

  return bootstrapPromise
}

/** Load approved briefs for a student course from SQL. */
export async function ensureApprovedBriefsForCourse(branchId, courseId) {
  const bid = String(branchId ?? '').trim()
  const cid = String(courseId ?? '').trim()
  if (!bid || !cid) return []

  try {
    const [byCourse, bySession] = await Promise.allSettled([
      fetchTrainerTaskBriefs({ branchId: bid, courseId: cid, status: 'approved' }),
      fetchTrainerTaskBriefs({ sessionId: cid, status: 'approved' }),
    ])
    const rows = [
      ...(byCourse.status === 'fulfilled' ? byCourse.value : []),
      ...(bySession.status === 'fulfilled' ? bySession.value : []),
    ]
    mergeIntoSnapshot(rows)
    return rows
  } catch {
    return loadTaskApprovalRequests().filter((row) => {
      if (String(row.status ?? '').toLowerCase() !== 'approved') return false
      const sessionId = String(row.sessionId ?? '').trim()
      return (
        (String(row.branchId ?? '') === bid && String(row.courseId ?? '') === cid) ||
        sessionId === cid
      )
    })
  }
}

/** Load approved briefs for a trainer session workspace. */
export async function ensureApprovedBriefsForSession(sessionId) {
  const sid = String(sessionId ?? '').trim()
  if (!sid) return []
  try {
    const rows = await fetchTrainerTaskBriefs({ sessionId: sid, status: 'approved' })
    mergeIntoSnapshot(rows)
    notifyUpdated()
    return rows
  } catch {
    return getApprovedRequestsForSession(sid)
  }
}

export function getRequestsForTrainer(email) {
  const e = normalizeEmail(email)
  return loadTaskApprovalRequests().filter((r) => normalizeEmail(r.requestedByEmail) === e)
}

export function getApprovedRequestsForSession(sessionId) {
  return loadTaskApprovalRequests().filter(
    (r) => r.sessionId === sessionId && String(r.status ?? '').toLowerCase() === 'approved',
  )
}

export function getPendingTaskApprovalRequests() {
  return loadTaskApprovalRequests().filter((r) => String(r.status ?? '').toLowerCase() === 'pending')
}

/** Publish a task brief to SQL. */
export async function publishTrainerTaskBrief(entry) {
  const now = new Date().toISOString()
  const payload = attachCourseContextToTaskBrief({
    ...entry,
    status: 'approved',
    reviewedAt: entry.reviewedAt ?? now,
    publishedAt: entry.publishedAt ?? now,
  })

  const saved = await createTrainerTaskBrief(payload)
  mergeIntoSnapshot([saved])
  notifyUpdated()
  notifyStudentCourseTasksChanged()
  return saved
}

/** Update a task brief in SQL. */
export async function updateTrainerTaskBrief(id, patch) {
  const row = loadTaskApprovalRequests().find(
    (r) => r.id === id || r.apiId === id || r.legacyLocalId === id,
  )
  const apiId = resolveApiId(row) || id
  const merged = attachCourseContextToTaskBrief({
    ...(row ?? {}),
    ...patch,
    updatedAt: new Date().toISOString(),
  })

  const saved = await updateTrainerTaskBriefApi(apiId, merged)
  mergeIntoSnapshot([saved])
  notifyUpdated()
  notifyStudentCourseTasksChanged()
  return saved
}

/** Publish a previously pending brief by id. */
export async function publishTrainerTaskRequest(id) {
  const now = new Date().toISOString()
  return updateTrainerTaskBrief(id, {
    status: 'approved',
    reviewedAt: now,
    publishedAt: now,
  })
}

/**
 * @deprecated Migration runs automatically during bootstrapTrainerTaskBriefs.
 */
export function migrateLegacyTaskDrafts({ requestedByEmail }) {
  void bootstrapTrainerTaskBriefs(requestedByEmail)
}
