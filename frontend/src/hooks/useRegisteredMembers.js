import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { canUseProtectedApi, isLocalOnlySession, readStoredAuthToken } from '../api/authApi.js'
import { deleteMemberApi, fetchMembers, updateMemberRoleApi } from '../api/memberApi.js'
import { purgeMemberTrainerLinks } from '../utils/purgeMemberTrainerLinks.js'

const STORAGE_KEY = 'itconnect_registered_members_v1'

/** Registration / Members roster role types (aligned with platform personas). */
export const MEMBER_ROLE_OPTIONS = [
  { id: 'student', label: 'Student' },
  { id: 'trainer', label: 'Trainer' },
  { id: 'company', label: 'Company' },
  { id: 'employer', label: 'Employer / Partner' },
  { id: 'institution', label: 'University / Institution' },
  { id: 'admin', label: 'Administrator' },
]

/** Public sign-up cannot self-select administrator. */
export const PUBLIC_REGISTRATION_ROLE_OPTIONS = MEMBER_ROLE_OPTIONS.filter((o) => o.id !== 'admin')

/** Roles an admin can assign from the Members tab (demo). */
export const ADMIN_QUICK_ASSIGN_ROLES = [
  { id: 'admin', label: 'Admin' },
  { id: 'student', label: 'Student' },
  { id: 'trainer', label: 'Trainer' },
  { id: 'company', label: 'Company' },
]

const ROLE_LABEL_MAP = Object.fromEntries(MEMBER_ROLE_OPTIONS.map((o) => [o.id, o.label]))

const QUICK_ASSIGN_IDS = new Set(ADMIN_QUICK_ASSIGN_ROLES.map((o) => o.id))

export function normalizeMemberRole(role) {
  const r = String(role ?? '').toLowerCase()
  return ROLE_LABEL_MAP[r] ? r : 'student'
}

export function getMemberRoleLabel(role) {
  return ROLE_LABEL_MAP[normalizeMemberRole(role)] ?? 'Student'
}

export function parseRegisteredMembersSnapshot() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeSnapshot(list) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* ignore quota */
  }
}

function notifyChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('registered-members-changed'))
}

const CREDENTIALS_KEY = 'itconnect_member_credentials_v1'

function parseCredentialsSnapshot() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/** Demo-only: stores plaintext password so roster-based login can resolve roles after admin promotion. */
export function saveMemberCredential(email, password) {
  const e = (email ?? '').trim().toLowerCase()
  if (!e || password == null) return
  const next = { ...parseCredentialsSnapshot(), [e]: String(password) }
  try {
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota */
  }
}

export function verifyMemberCredential(email, password) {
  const e = (email ?? '').trim().toLowerCase()
  const map = parseCredentialsSnapshot()
  return map[e] === password
}

/** Demo-only: read stored password when migrating login email after roster edits. */
export function peekMemberCredential(email) {
  const e = (email ?? '').trim().toLowerCase()
  if (!e) return undefined
  const map = parseCredentialsSnapshot()
  const pw = map[e]
  return typeof pw === 'string' ? pw : undefined
}

export function deleteMemberCredential(email) {
  const e = (email ?? '').trim().toLowerCase()
  if (!e) return
  const map = parseCredentialsSnapshot()
  if (!(e in map)) return
  const next = { ...map }
  delete next[e]
  try {
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota */
  }
}

/**
 * Append a member from the public Register flow (demo: localStorage).
 * Same email registers again → newest row replaces the prior entry.
 */
export function appendRegisteredMember({ fullName, email, role }) {
  const trimmedEmail = (email ?? '').trim().toLowerCase()
  const trimmedName = (fullName ?? '').trim()
  if (!trimmedEmail || !trimmedName) return null

  let roleId = normalizeMemberRole(role)
  if (roleId === 'admin') roleId = 'student'

  const entry = {
    id: `member-${Date.now()}`,
    fullName: trimmedName,
    email: trimmedEmail,
    role: roleId,
    registeredAt: new Date().toISOString(),
  }

  const snap = parseRegisteredMembersSnapshot().filter((m) => m.email !== trimmedEmail)
  const next = [entry, ...snap]
  writeSnapshot(next)
  notifyChanged()
  return entry
}

function mapApiMember(row) {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    role: normalizeMemberRole(row.role),
    registeredAt: row.registeredAt,
  }
}

async function loadMembersFromApi() {
  const rows = await fetchMembers()
  return rows.map(mapApiMember)
}

function membersLoadErrorMessage(error) {
  if (isLocalOnlySession(readStoredAuthToken())) {
    return 'Sign out and sign in with your admin email and password to load all accounts from the database.'
  }
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    if (status === 401 || status === 403) {
      return 'Your session cannot access the members list. Sign in again as an administrator.'
    }
    if (status === 404) {
      return 'Members API is unavailable. Restart the backend server, then refresh this page.'
    }
    if (!error.response) {
      return 'Unable to reach the server. Check that the backend is running.'
    }
  }
  return 'Could not load members from the database.'
}

function readStoredSessionRole() {
  try {
    const raw = localStorage.getItem('trainer-auth')
    if (!raw) return ''
    const parsed = JSON.parse(raw)
    return normalizeMemberRole(parsed.role ?? '')
  } catch {
    return ''
  }
}

export function useRegisteredMembers() {
  const isAdmin = readStoredSessionRole() === 'admin' && canUseProtectedApi(readStoredAuthToken())
  const [members, setMembers] = useState([])
  const [apiConnected, setApiConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const refreshFromApi = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const list = await loadMembersFromApi()
      setMembers(list)
      setApiConnected(true)
      writeSnapshot(list)
      return list
    } catch (error) {
      setApiConnected(false)
      setLoadError(membersLoadErrorMessage(error))
      if (!axios.isAxiosError(error) || !error.response) {
        const snap = parseRegisteredMembersSnapshot()
        if (snap.length > 0) {
          setMembers(snap)
        }
      }
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) {
      setIsLoading(false)
      setApiConnected(false)
      setLoadError('')
      setMembers(parseRegisteredMembersSnapshot())
      return
    }
    void refreshFromApi()
  }, [isAdmin, refreshFromApi])

  useEffect(() => {
    if (apiConnected) return undefined
    const sync = () => setMembers(parseRegisteredMembersSnapshot())
    window.addEventListener('storage', sync)
    window.addEventListener('registered-members-changed', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('registered-members-changed', sync)
    }
  }, [apiConnected])

  const removeMember = useCallback(
    async (memberId) => {
      const current = apiConnected ? members : parseRegisteredMembersSnapshot()
      const member = current.find((m) => m.id === memberId)

      if (apiConnected) {
        try {
          await deleteMemberApi(memberId)
          if (member) {
            await purgeMemberTrainerLinks(member)
          }
          await refreshFromApi()
          return
        } catch {
          /* fall through to local roster */
        }
      }

      if (member) {
        await purgeMemberTrainerLinks(member)
      }
      const snap = current.filter((m) => m.id !== memberId)
      writeSnapshot(snap)
      notifyChanged()
      setMembers(snap)
    },
    [apiConnected, members, refreshFromApi],
  )

  const updateMemberRole = useCallback(
    async (memberId, role) => {
      const r = String(role ?? '').toLowerCase()
      if (!QUICK_ASSIGN_IDS.has(r)) return

      if (apiConnected) {
        try {
          await updateMemberRoleApi(memberId, r)
          await refreshFromApi()
          return
        } catch {
          /* fall through to local roster */
        }
      }

      const snap = parseRegisteredMembersSnapshot()
      const idx = snap.findIndex((m) => m.id === memberId)
      if (idx === -1) return
      const next = [...snap]
      next[idx] = { ...next[idx], role: r }
      writeSnapshot(next)
      notifyChanged()
      setMembers(next)
    },
    [apiConnected, refreshFromApi],
  )

  return { members, removeMember, updateMemberRole, refreshFromApi, apiConnected, isLoading, loadError }
}
