import { getBranchAdminTrainings, normalizeBranchId } from '../data/adminDashboardData.js'
import { parseCreatedTrainingsSnapshot } from '../hooks/useAdminCreatedTrainings.js'
import { parseCompanyTrainersSnapshot } from '../hooks/useCompanyTrainers.js'
import { normalizeMemberRole, parseRegisteredMembersSnapshot } from '../hooks/useRegisteredMembers.js'

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

function trainerDedupeKey({ email, name }) {
  const e = normalizeEmail(email)
  if (e) return `e:${e}`
  const n = String(name ?? '').trim().toLowerCase()
  return n ? `n:${n}` : ''
}

function initialsFromName(name) {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) return '??'
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return trimmed.slice(0, 2).toUpperCase()
}

function resolveBranchTrainings(branchId, options = {}) {
  if (Array.isArray(options.trainings)) return options.trainings

  const bid = normalizeBranchId(branchId)
  const hidden = new Set(
    (options.hiddenSeedTrainingIds ?? []).map((id) => String(id ?? '').trim()).filter(Boolean),
  )
  const seed = getBranchAdminTrainings(bid).filter((t) => !hidden.has(String(t.id ?? '')))
  const created = parseCreatedTrainingsSnapshot()[bid] ?? []
  const extra = Array.isArray(options.extraTrainings) ? options.extraTrainings : []

  const byId = new Map()
  for (const row of [...extra, ...created, ...seed]) {
    if (!row?.id) continue
    byId.set(String(row.id), row)
  }
  return [...byId.values()]
}

/**
 * Real trainers for a branch: roster members, company-added trainers, and trainers
 * assigned on catalog trainings — deduped by email (or name when email is missing).
 */
export function listRealBranchTrainers(branchId, options = {}) {
  if (typeof window === 'undefined') return []

  const byKey = new Map()

  function upsert(entry) {
    const key = trainerDedupeKey(entry)
    if (!key) return
    const prev = byKey.get(key)
    if (prev) {
      byKey.set(key, {
        ...prev,
        ...entry,
        id: prev.id,
        name: entry.name || prev.name,
        role: entry.role || prev.role,
        source: prev.source === 'company' ? 'company' : entry.source || prev.source,
        companyTrainerId: prev.companyTrainerId || entry.companyTrainerId || '',
        linkedTrackTitles: [
          ...new Set([
            ...(prev.linkedTrackTitles ?? []),
            ...(entry.linkedTrackTitles ?? []),
          ]),
        ],
      })
      return
    }
    byKey.set(key, entry)
  }

  for (const member of parseRegisteredMembersSnapshot()) {
    if (normalizeMemberRole(member.role) !== 'trainer') continue
    upsert({
      id: `member-trainer-${member.id}`,
      name: String(member.fullName ?? '').trim(),
      email: normalizeEmail(member.email),
      role: 'Members roster · Trainer',
      initials: initialsFromName(member.fullName),
      source: 'platform',
    })
  }

  for (const row of parseCompanyTrainersSnapshot()) {
    upsert({
      id: String(row.id ?? `co-tr-${normalizeEmail(row.email)}`),
      name: String(row.fullName ?? '').trim(),
      email: normalizeEmail(row.email),
      role: String(row.companyPosition ?? '').trim() || 'Company trainer',
      initials: initialsFromName(row.fullName),
      source: 'company',
      companyTrainerId: String(row.id ?? ''),
      companyEmail: normalizeEmail(row.companyEmail),
      linkedTrackTitles: Array.isArray(row.linkedTrackTitles)
        ? row.linkedTrackTitles.map((title) => String(title ?? '').trim()).filter(Boolean)
        : [],
    })
  }

  for (const training of resolveBranchTrainings(branchId, options)) {
    const name = String(training.trainer ?? training.trainerName ?? '').trim()
    const email = normalizeEmail(training.trainerEmail)
    if (!name && !email) continue
    upsert({
      id: email ? `training-trainer-${email}` : `training-trainer-${name.toLowerCase()}`,
      name: name || email,
      email,
      role: 'Assigned · training catalog',
      initials: initialsFromName(name || email),
      source: 'platform',
    })
  }

  return [...byKey.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  )
}

export function countRealBranchTrainers(branchId, options = {}) {
  return listRealBranchTrainers(branchId, options).length
}

function normalizeTrackLabel(value) {
  return String(value ?? '').trim().toLowerCase()
}

/** Match a stored/company track label to a canonical select option. */
export function matchTrainerTrackOption(trackName, options = []) {
  const needle = normalizeTrackLabel(trackName)
  if (!needle) return ''
  const exact = options.find((option) => String(option ?? '').trim() === String(trackName ?? '').trim())
  if (exact) return exact
  return options.find((option) => normalizeTrackLabel(option) === needle) ?? ''
}

export function trainerTrackAssignmentKeys(trainer) {
  const keys = []
  if (trainer?.id) keys.push(String(trainer.id))
  if (trainer?.email) keys.push(`email:${normalizeEmail(trainer.email)}`)
  if (trainer?.companyTrainerId) keys.push(String(trainer.companyTrainerId))
  return [...new Set(keys.filter(Boolean))]
}

/** Resolve selected track for admin trainer card (persisted admin choice > company link > default). */
export function resolveTrainerTrackAssignment(trainer, assignments = {}, options = []) {
  for (const key of trainerTrackAssignmentKeys(trainer)) {
    const matched = matchTrainerTrackOption(assignments[key], options)
    if (matched) return matched
  }

  for (const title of trainer?.linkedTrackTitles ?? []) {
    const matched = matchTrainerTrackOption(title, options)
    if (matched) return matched
  }

  return ''
}
