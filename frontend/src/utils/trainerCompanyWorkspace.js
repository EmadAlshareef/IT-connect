import { parseCompanyTrainersSnapshot } from '../hooks/useCompanyTrainers.js'
import {
  getCompanyProfilesSnapshot,
  getCompanyTrainingRequestsSnapshot,
  getTrainerCatalogTrainingsSnapshot,
} from './companyPortalStore.js'

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

/** Company roster row for the logged-in trainer email, if any. */
export function findCompanyTrainerByEmail(trainerEmail) {
  const email = normalizeEmail(trainerEmail)
  if (!email) return null
  return parseCompanyTrainersSnapshot().find((row) => normalizeEmail(row.email) === email) ?? null
}

export function getCompanyProfileByContactEmail(companyEmail) {
  const ce = normalizeEmail(companyEmail)
  if (!ce) return null
  return getCompanyProfilesSnapshot().find((row) => normalizeEmail(row.contactEmail) === ce) ?? null
}

function enrichProgramFromCompanyRequest(program) {
  if (!program?.id) return program
  const req = getCompanyTrainingRequestsSnapshot().find(
    (r) => r.publishedTrainingId === program.id || r.id === program.requestId || r.apiId === program.requestId,
  )
  if (!req) return program
  return {
    ...program,
    trainer: program.trainer || req.trainer,
    trainerEmail: program.trainerEmail || req.trainerEmail,
    companyContactEmail: program.companyContactEmail || req.requestedByEmail,
    trackTitle: program.linkedTrackTitle || program.trackTitle || req.trackTitle,
    reviewStatus: program.reviewStatus || req.reviewStatus,
    requestId: program.requestId || req.id,
  }
}

function programAssignedByCompany(program, trainerRecord, trainerEmail) {
  const email = normalizeEmail(trainerEmail)
  if (!email) return false

  const assignedEmail = normalizeEmail(program.trainerEmail)
  if (!assignedEmail || assignedEmail !== email) return false

  if (trainerRecord) {
    const companyEmail = normalizeEmail(trainerRecord.companyEmail)
    const programCompany =
      normalizeEmail(program.companyContactEmail) || normalizeEmail(program.companyEmail)
    if (companyEmail && programCompany && companyEmail !== programCompany) return false
  }

  return true
}

function collectProgramsForTrainer(trainerRecord, trainerEmail) {
  const programs = []
  const seen = new Set()

  const push = (raw, source) => {
    const row = enrichProgramFromCompanyRequest(raw)
    const key = row.publishedTrainingId || row.id
    if (!key || seen.has(key)) return
    if (!programAssignedByCompany(row, trainerRecord, trainerEmail)) return
    seen.add(key)
    programs.push({ ...row, source })
  }

  for (const req of getCompanyTrainingRequestsSnapshot()) {
    const reviewStatus = String(req.reviewStatus ?? '').toUpperCase()
    const base = {
      id: req.publishedTrainingId || `pending-${req.id}`,
      publishedTrainingId: req.publishedTrainingId,
      requestId: req.id,
      title: req.title,
      body: req.body,
      date: req.date,
      trainer: req.trainer,
      trainerEmail: req.trainerEmail,
      seatsTaken: 0,
      seatsTotal: req.seatsTotal,
      status: req.status,
      linkedTrackTitle: req.trackTitle,
      trackTitle: req.trackTitle,
      companyContactEmail: req.requestedByEmail,
      companyEmail: req.companyEmail,
      reviewStatus,
      branchId: req.branchId,
    }

    if (reviewStatus === 'APPROVED') {
      push(base, 'request-approved')
    } else if (reviewStatus === 'PENDING') {
      push(base, 'request-pending')
    }
  }

  for (const row of getTrainerCatalogTrainingsSnapshot()) {
    push(
      {
        id: row.id,
        publishedTrainingId: row.id,
        title: row.title,
        body: row.body,
        date: row.date || row.startDate,
        trainer: row.trainer || row.trainerName,
        trainerEmail: row.trainerEmail,
        seatsTotal: row.seatsTotal,
        status: row.status,
        linkedTrackTitle: row.linkedTrackTitle,
        trackTitle: row.linkedTrackTitle,
        companyContactEmail: row.companyContactEmail,
        companyEmail: row.companyContactEmail,
        reviewStatus: 'APPROVED',
        branchId: row.branchId,
      },
      'catalog',
    )
  }

  return programs.sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))
}

function mapProgramToSection(program, companyLabel) {
  const seatsTotal = Math.max(0, Number.parseInt(String(program.seatsTotal ?? '0'), 10) || 0)
  const seatsTaken = Math.max(0, Number.parseInt(String(program.seatsTaken ?? '0'), 10) || 0)
  const reviewStatus = String(program.reviewStatus ?? '').toUpperCase()
  const statusRaw = String(program.status ?? 'active').toLowerCase()

  let status = 'Active'
  if (reviewStatus === 'PENDING') status = 'Pending approval'
  else if (statusRaw === 'upcoming') status = 'Upcoming'
  else if (statusRaw === 'completed') status = 'Completed'

  const sessionId = program.publishedTrainingId || program.id

  return {
    id: sessionId,
    publishedTrainingId: program.publishedTrainingId || sessionId,
    title: program.title ?? 'Training program',
    company: companyLabel,
    duration: program.date ? `Starts ${program.date}` : 'Schedule TBD',
    studentsCount: seatsTaken,
    pendingEvaluations: 0,
    status,
    tasksCount: 0,
    students: [],
    body: program.body ?? '',
    linkedTrackTitle: program.linkedTrackTitle ?? program.trackTitle ?? '',
    seatsTaken,
    seatsTotal,
    isCompanyProgram: true,
    reviewStatus,
    requestId: program.requestId,
    isPendingApproval: reviewStatus === 'PENDING',
  }
}

function resolveCompanyLabel(profile, programs) {
  if (profile) {
    const companyProfile = getCompanyProfileByContactEmail(profile.companyEmail)
    return (
      String(companyProfile?.companyName ?? '').trim() ||
      String(profile.companyEmail ?? '').trim() ||
      'Your company'
    )
  }
  const contact = programs.find((p) => p.companyContactEmail)?.companyContactEmail
  if (contact) {
    const companyProfile = getCompanyProfileByContactEmail(contact)
    return String(companyProfile?.companyName ?? '').trim() || String(contact).trim() || 'Your company'
  }
  return 'Your company'
}

/**
 * Builds trainer dashboard sessions + profile context from company-added data.
 */
export function buildTrainerCompanyWorkspace(trainerEmail, authTrainerName = '') {
  const email = normalizeEmail(trainerEmail)
  const profile = findCompanyTrainerByEmail(email)
  const programs = collectProgramsForTrainer(profile, email)
  const isCompanyTrainer = Boolean(profile)

  if (!isCompanyTrainer && programs.length === 0) {
    return {
      profile: null,
      companyName: '',
      displayName: String(authTrainerName ?? '').trim() || 'Trainer',
      position: '',
      linkedTrackTitles: [],
      sessions: [],
      programs: [],
      hasCompanyData: false,
    }
  }

  const companyName = resolveCompanyLabel(profile, programs)
  const sessions = programs.map((p) => mapProgramToSection(p, companyName))

  return {
    profile,
    companyName,
    displayName:
      String(profile?.fullName ?? '').trim() || String(authTrainerName ?? '').trim() || 'Trainer',
    position: String(profile?.companyPosition ?? '').trim(),
    linkedTrackTitles: Array.isArray(profile?.linkedTrackTitles) ? profile.linkedTrackTitles : [],
    sessions,
    programs,
    hasCompanyData: isCompanyTrainer || sessions.length > 0,
  }
}

export function findTrainerSessionById(sectionId, trainerEmail, authTrainerName = '') {
  const workspace = buildTrainerCompanyWorkspace(trainerEmail, authTrainerName)
  return workspace.sessions.find((s) => s.id === sectionId) ?? null
}

/** Prefer roster + company-trainer email/name for trainer auth display. */
export function resolveTrainerIdentity(loginEmail, loginName = '') {
  const email = normalizeEmail(loginEmail)
  const companyTrainer = findCompanyTrainerByEmail(email)
  return {
    email: email || String(loginEmail ?? '').trim(),
    trainerName: String(companyTrainer?.fullName ?? '').trim() || String(loginName ?? '').trim() || 'Trainer',
  }
}
