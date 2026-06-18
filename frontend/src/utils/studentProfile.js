export const STUDENT_PROFILE_CHANGED_EVENT = 'ts-student-profile-changed'

const storageKey = (userId) => `ts-student-profile-${userId}`

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

export function readStudentProfile(userId) {
  if (!userId) return null
  return readJson(storageKey(userId), null)
}

export function saveStudentProfile(userId, profile) {
  if (!userId) return null
  const now = new Date().toISOString()
  const existing = readStudentProfile(userId)
  const next = {
    id: existing?.id ?? userId,
    email: String(profile.email ?? existing?.email ?? '').trim(),
    fullName: String(profile.fullName ?? existing?.fullName ?? '').trim(),
    phone: String(profile.phone ?? '').trim(),
    university: String(profile.university ?? '').trim(),
    specialization: String(profile.specialization ?? '').trim(),
    bio: String(profile.bio ?? '').trim(),
    avatarUrl: String(profile.avatarUrl ?? existing?.avatarUrl ?? '').trim(),
    githubUsername: String(profile.githubUsername ?? '').trim(),
    preferredGithubRepoUrl: String(profile.preferredGithubRepoUrl ?? existing?.preferredGithubRepoUrl ?? '').trim(),
    cvFileName: String(profile.cvFileName ?? existing?.cvFileName ?? '').trim(),
    cvFileUrl: String(profile.cvFileUrl ?? existing?.cvFileUrl ?? '').trim(),
    updatedAtUtc: now,
  }
  localStorage.setItem(storageKey(userId), JSON.stringify(next))
  window.dispatchEvent(new CustomEvent(STUDENT_PROFILE_CHANGED_EVENT, { detail: { userId } }))
  return next
}

export function listenStudentProfileChanges(handler) {
  const onChange = (event) => handler(event?.detail?.userId)
  window.addEventListener(STUDENT_PROFILE_CHANGED_EVENT, onChange)
  return () => window.removeEventListener(STUDENT_PROFILE_CHANGED_EVENT, onChange)
}
