import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  loginTrainer,
  isDevAuthToken,
  markPreferLocalPortalData,
  resetPreferLocalPortalData,
  logoutSession,
  restoreSessionFromStorage,
  setAccessTokenMemory,
  setAuthExpiredHandler,
} from '../api/authApi.js'
import { clearStudentEnrollmentCaches } from '../api/enrollmentApplicationApi.js'
import { normalizeMemberRole, parseRegisteredMembersSnapshot } from '../hooks/useRegisteredMembers.js'
import { resolveTrainerIdentity } from '../utils/trainerCompanyWorkspace.js'
import { AuthContext } from './authContextObject.js'

const AUTH_STORAGE_KEY = 'trainer-auth'
const defaultAuthState = {
  isAuthenticated: false,
  trainerName: '',
  token: '',
  email: '',
  role: '',
  userId: '',
}

const parseJwtPayload = (token) => {
  try {
    const [, payload] = token.split('.')
    if (!payload) return {}
    const normalized = payload.replaceAll('-', '+').replaceAll('_', '/')
    return JSON.parse(atob(normalized))
  } catch {
    return {}
  }
}

const persistAuthMetadata = (state) => {
  const safe = { ...state }
  delete safe.token
  delete safe.refreshToken
  delete safe.accessTokenExpiresAtUtc
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(safe))
}

const loadInitialAuthState = () => {
  const stored = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!stored) return defaultAuthState

  try {
    const parsed = JSON.parse(stored)
    delete parsed.token
    delete parsed.refreshToken
    delete parsed.accessTokenExpiresAtUtc
    if (!parsed.token) return parsed
    const jwtPayload = parseJwtPayload(parsed.token)
    const email = jwtPayload.email ?? parsed.email ?? ''
    const trainerName = jwtPayload.name ?? parsed.trainerName ?? ''
    const resolved = resolveTrainerIdentity(email, trainerName)
    const token = parsed.token ?? ''
    if (isDevAuthToken(token)) {
      markPreferLocalPortalData()
    } else if (jwtPayload.exp && Date.now() >= jwtPayload.exp * 1000) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      return defaultAuthState
    }
    return {
      ...parsed,
      role: jwtPayload.role ?? parsed.role ?? '',
      userId: jwtPayload.sub ?? parsed.userId ?? '',
      email: resolved.email,
      trainerName: resolved.trainerName,
    }
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return defaultAuthState
  }
}

const roleLabelFromStoredMemberRole = (role) => {
  const r = normalizeMemberRole(role)
  const map = {
    admin: 'Admin',
    student: 'Student',
    trainer: 'Trainer',
    company: 'Company',
    employer: 'Employer',
    institution: 'Institution',
  }
  return map[r] ?? 'Student'
}

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(loadInitialAuthState)

  const clearSession = useCallback(() => {
    resetPreferLocalPortalData()
    clearStudentEnrollmentCaches()
    setAccessTokenMemory('')
    setAuthState(defaultAuthState)
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }, [])

  useEffect(() => {
    void restoreSessionFromStorage().then((stored) => {
      if (stored === null) {
        clearSession()
        return
      }
      if (!stored?.token) return
      setAccessTokenMemory(stored.token)
      setAuthState((prev) => {
        if (!prev.isAuthenticated) return prev
        if (prev.token === stored.token) return prev
        return {
          ...prev,
          token: stored.token,
        }
      })
    })
  }, [clearSession])

  useEffect(() => {
    setAuthExpiredHandler(() => {
      clearSession()
      if (window.location.pathname !== '/login') {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.assign(`/login?redirect=${redirect}&expired=1`)
      }
    })
    return () => setAuthExpiredHandler(null)
  }, [clearSession])

  useEffect(() => {
    const syncRoleFromMembers = () => {
      setAuthState((prev) => {
        if (!prev.isAuthenticated || !prev.email) return prev
        if (prev.token && !isDevAuthToken(prev.token)) return prev
        const member = parseRegisteredMembersSnapshot().find(
          (m) => (m.email ?? '').trim().toLowerCase() === prev.email.trim().toLowerCase(),
        )
        if (!member) return prev
        const nextRole = roleLabelFromStoredMemberRole(member.role)
        if (nextRole === prev.role) return prev
        const next = { ...prev, role: nextRole }
        persistAuthMetadata(next)
        return next
      })
    }

    const syncTrainerIdentity = () => {
      setAuthState((prev) => {
        if (!prev.isAuthenticated || !prev.email) return prev
        const resolved = resolveTrainerIdentity(prev.email, prev.trainerName)
        if (resolved.email === prev.email && resolved.trainerName === prev.trainerName) return prev
        const next = { ...prev, email: resolved.email, trainerName: resolved.trainerName }
        persistAuthMetadata(next)
        return next
      })
    }

    window.addEventListener('registered-members-changed', syncRoleFromMembers)
    window.addEventListener('company-portal-store-changed', syncTrainerIdentity)
    window.addEventListener('admin-created-trainings', syncTrainerIdentity)
    window.addEventListener('storage', syncRoleFromMembers)
    window.addEventListener('storage', syncTrainerIdentity)
    return () => {
      window.removeEventListener('registered-members-changed', syncRoleFromMembers)
      window.removeEventListener('company-portal-store-changed', syncTrainerIdentity)
      window.removeEventListener('admin-created-trainings', syncTrainerIdentity)
      window.removeEventListener('storage', syncRoleFromMembers)
      window.removeEventListener('storage', syncTrainerIdentity)
    }
  }, [])

  const login = async (email, password) => {
    const response = await loginTrainer(email, password)
    if (!response.success) return response

    const resolved = resolveTrainerIdentity(response.user?.email ?? email, response.user?.name ?? 'IT Connect User')
    const nextState = {
      isAuthenticated: true,
      trainerName: resolved.trainerName,
      token: response.token ?? '',
      email: resolved.email,
      role: response.user?.role ?? '',
      userId: response.user?.id ?? parseJwtPayload(response.token ?? '').sub ?? '',
    }
    setAccessTokenMemory(nextState.token)
    clearStudentEnrollmentCaches()
    setAuthState(nextState)
    persistAuthMetadata(nextState)
    return response
  }

  const logout = async () => {
    await logoutSession()
    clearSession()
  }

  const value = useMemo(
    () => ({
      ...authState,
      login,
      logout,
    }),
    [authState],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
