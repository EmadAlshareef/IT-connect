import { getMemberRoleLabel, normalizeMemberRole, parseRegisteredMembersSnapshot } from '../hooks/useRegisteredMembers.js'

export function normalizePortalEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

/** Demo/API accounts that can appear in local enrollments. */
const KNOWN_PORTAL_USERS = [
  { id: 'trainer-2000', email: 'trainer2000@gmail.com', name: 'Trainer User 2000', role: 'Trainer' },
  { id: 'trainer-2003', email: 'trainer2003@gmail.com', name: 'Trainer User', role: 'Trainer' },
  { id: 'student-mohamed', email: 'mohamed.ali@example.com', name: 'Mohamed Ali', role: 'Student' },
  { id: 'student-sara', email: 'sara.ahmed@example.com', name: 'Sara Ahmed', role: 'Student' },
  { id: 'student-hassan', email: 'hassan@example.com', name: 'Hassan Ibrahim', role: 'Student' },
  { id: 'admin', email: 'admin123@gmail.com', name: 'Administrator', role: 'Admin' },
]

function normalizeRoleLabel(role) {
  const raw = String(role ?? '').trim()
  if (!raw) return 'Member'
  if (raw === raw.toUpperCase() && raw.length > 2) {
    return raw.charAt(0) + raw.slice(1).toLowerCase()
  }
  return getMemberRoleLabel(normalizeMemberRole(raw))
}

/** Resolve a portal user id to a real name + email from roster/demo accounts. */
export function resolveKnownPortalUser(userId, emailHint = '') {
  const id = String(userId ?? '').trim()
  const normalizedHint = normalizePortalEmail(emailHint)

  if (id) {
    const known = KNOWN_PORTAL_USERS.find((row) => row.id === id)
    if (known) return known
  }

  if (normalizedHint) {
    const knownByEmail = KNOWN_PORTAL_USERS.find((row) => normalizePortalEmail(row.email) === normalizedHint)
    if (knownByEmail) return knownByEmail
  }

  const member = parseRegisteredMembersSnapshot().find((row) => {
    if (id && row.id === id) return true
    return normalizedHint && normalizePortalEmail(row.email) === normalizedHint
  })
  if (member) {
    return {
      id: member.id,
      email: member.email,
      name: member.fullName,
      role: normalizeRoleLabel(member.role),
    }
  }

  if (id) {
    const memberById = parseRegisteredMembersSnapshot().find((row) => row.id === id)
    if (memberById) {
      return {
        id: memberById.id,
        email: memberById.email,
        name: memberById.fullName,
        role: normalizeRoleLabel(memberById.role),
      }
    }
  }

  return null
}

export function resolvePortalUserByEmail(email) {
  return resolveKnownPortalUser('', email)
}

export function listAllMessagableUsers(excludeEmail = '') {
  const seen = new Set()
  const rows = []
  const exclude = normalizePortalEmail(excludeEmail)

  const push = (entry) => {
    const email = normalizePortalEmail(entry.email)
    if (!email || email === exclude || seen.has(email)) return
    seen.add(email)
    rows.push({
      id: entry.id,
      email: entry.email,
      name: entry.name ?? entry.fullName ?? entry.email,
      role: normalizeRoleLabel(entry.role),
    })
  }

  for (const user of KNOWN_PORTAL_USERS) push(user)
  for (const member of parseRegisteredMembersSnapshot()) {
    push({
      id: member.id,
      email: member.email,
      fullName: member.fullName,
      role: member.role,
    })
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name))
}

export function searchPortalUsersByEmail(query, { excludeEmail = '' } = {}) {
  const q = normalizePortalEmail(query)
  if (q.length < 2) return []
  const needle = q
  return listAllMessagableUsers(excludeEmail)
    .filter((user) => {
      const email = normalizePortalEmail(user.email)
      const name = String(user.name ?? '').toLowerCase()
      return email.includes(needle) || name.includes(needle)
    })
    .slice(0, 10)
}

export function resolvePortalRoleLabel(userId, email = '') {
  const profile = resolveKnownPortalUser(userId, email)
  if (profile?.role) return profile.role
  const id = String(userId ?? '')
  if (id.startsWith('trainer-')) return 'Trainer'
  if (id.startsWith('student-')) return 'Student'
  if (id === 'admin') return 'Admin'
  return 'Member'
}

/** All ids/emails that refer to the same portal account (auth id, demo id, roster id). */
export function resolvePortalUserAliases(userId, email = '') {
  const ids = new Set()
  const tid = String(userId ?? '').trim()
  if (tid) ids.add(tid)

  const normalizedEmail = normalizePortalEmail(email)
  if (normalizedEmail) {
    for (const row of KNOWN_PORTAL_USERS) {
      if (normalizePortalEmail(row.email) === normalizedEmail) ids.add(row.id)
    }
    for (const member of parseRegisteredMembersSnapshot()) {
      if (normalizePortalEmail(member.email) === normalizedEmail) ids.add(member.id)
    }
  }

  const known = resolveKnownPortalUser(tid)
  if (known?.id) ids.add(known.id)

  return ids
}

export function portalUserMatches(userId, email, candidateId) {
  const candidate = String(candidateId ?? '').trim()
  if (!candidate) return false
  if (resolvePortalUserAliases(userId, email).has(candidate)) return true
  if (email && normalizePortalEmail(candidate) === normalizePortalEmail(email)) return true
  return false
}

export function hasVerifiablePortalIdentity(userId, enrollment, application) {
  const email = normalizePortalEmail(application?.userEmail || enrollment?.userEmail || '')
  if (email) return true
  return Boolean(resolveKnownPortalUser(userId))
}
