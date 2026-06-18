import axios from 'axios'
import { ADMIN_LOGIN_EMAIL, ADMIN_LOGIN_PASSWORD } from '../constants/adminAuth.js'
import { normalizeMemberRole, parseRegisteredMembersSnapshot, verifyMemberCredential } from '../hooks/useRegisteredMembers.js'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5114/api'
const apiBaseUrl = API_BASE_URL
const AUTH_STORAGE_KEY = 'trainer-auth'

function readDevAccounts(envKey) {
  if (!import.meta.env.DEV) return []
  try {
    const parsed = JSON.parse(import.meta.env[envKey] ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const staticAccounts = readDevAccounts('VITE_DEV_OFFLINE_ACCOUNTS')

/** API-backed accounts with production password policy (when backend is running). */
const apiAccounts = readDevAccounts('VITE_DEV_API_ACCOUNTS')

export const ACTIVE_TRAINER_ACCOUNTS_COUNT = staticAccounts.filter((a) => a.role === 'Trainer').length

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

let preferLocalPortalData = false
let refreshInFlight = null
let onAuthExpired = null
let backendProbe = { at: 0, ok: true }
let inMemoryAccessToken = ''

export function setAccessTokenMemory(token = '') {
  inMemoryAccessToken = String(token ?? '')
}

function sanitizeStoredAuth(auth) {
  if (!auth || typeof auth !== 'object') return auth
  const safe = { ...auth }
  delete safe.token
  delete safe.refreshToken
  delete safe.accessTokenExpiresAtUtc
  return safe
}

function isNetworkConnectionError(error) {
  return axios.isAxiosError(error) && !error.response
}

/** Quick health check — avoids a failed /auth/login when the API is down. */
async function probeBackendReachable(force = false) {
  const now = Date.now()
  if (!force && now - backendProbe.at < 4000) return backendProbe.ok
  try {
    await axios.get(`${apiBaseUrl}/catalog/branches`, { timeout: 2500 })
    backendProbe = { at: now, ok: true }
    return true
  } catch {
    backendProbe = { at: now, ok: false }
    markPreferLocalPortalData()
    return false
  }
}

export function setAuthExpiredHandler(handler) {
  onAuthExpired = handler
}

export function markPreferLocalPortalData() {
  preferLocalPortalData = true
}

export function resetPreferLocalPortalData() {
  preferLocalPortalData = false
}

function isPortalNetworkError(error) {
  if (!axios.isAxiosError(error)) return true
  if (!error.response) return true
  const status = error.response.status
  return status === 401 || status === 403 || status >= 500
}

function readStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeStoredAuth(next) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sanitizeStoredAuth(next)))
}

function parseJwtPayload(token) {
  try {
    const [, payload] = token.split('.')
    if (!payload) return {}
    const normalized = payload.replaceAll('-', '+').replaceAll('_', '/')
    return JSON.parse(atob(normalized))
  } catch {
    return {}
  }
}

function tokenExpiresSoon(token, skewSeconds = 60) {
  const payload = parseJwtPayload(token)
  if (!payload.exp) return false
  const expiresAtMs = payload.exp * 1000
  return Date.now() >= expiresAtMs - skewSeconds * 1000
}

export function isDevAuthToken(token) {
  return typeof token === 'string' && token.endsWith('.dev-signature')
}

export function isLocalOnlySession(token) {
  if (preferLocalPortalData) return true
  return !String(token ?? '').trim() || isDevAuthToken(token) || !canUseProtectedApi(token)
}

/** True when the access token can be sent to protected API routes. */
export function canUseProtectedApi(token = readStoredAuthToken()) {
  const t = String(token ?? '').trim()
  if (!t || isDevAuthToken(t) || preferLocalPortalData) return false
  const payload = parseJwtPayload(t)
  if (!payload.exp) return true
  const expiresAtMs = payload.exp * 1000
  if (Date.now() < expiresAtMs) return true
  return true
}

export function buildAuthHeaders(token = readStoredAuthToken()) {
  if (!canUseProtectedApi(token)) return {}
  return { Authorization: `Bearer ${String(token).trim()}` }
}

export async function restoreSessionFromStorage() {
  const stored = readStoredAuth()
  if (stored?.token && isDevAuthToken(stored.token)) {
    setAccessTokenMemory(stored.token)
    return stored
  }
  if (!stored?.token) {
    try {
      return await refreshAccessToken()
    } catch {
      return stored?.isAuthenticated ? null : stored
    }
  }
  if (canUseProtectedApi(stored.token)) return stored
  try {
    return await refreshAccessToken()
  } catch {
    return null
  }
}

export function readStoredAuthToken() {
  return inMemoryAccessToken
}

export function readStoredRefreshToken() {
  return ''
}

async function refreshAccessToken() {
  const stored = readStoredAuth()
  if (isDevAuthToken(stored?.token)) {
    throw new Error('No refresh token')
  }

  const response = await axios.post(`${apiBaseUrl}/auth/refresh`, {}, { withCredentials: true })
  const data = response.data
  if (!data?.success || !data?.token) {
    throw new Error(data?.message ?? 'Refresh failed')
  }

  const next = {
    ...stored,
    token: data.token,
    refreshToken: '',
    accessTokenExpiresAtUtc: data.accessTokenExpiresAtUtc ?? null,
  }
  setAccessTokenMemory(next.token)
  writeStoredAuth(next)
  resetPreferLocalPortalData()
  return next
}

apiClient.interceptors.request.use(async (config) => {
  const stored = readStoredAuth()
  const token = stored?.token
  const isAuthRoute = String(config.url ?? '').includes('/auth/')

  if (canUseProtectedApi(token) && !isAuthRoute) {
    if (tokenExpiresSoon(token)) {
      try {
        if (!refreshInFlight) {
          refreshInFlight = refreshAccessToken().finally(() => {
            refreshInFlight = null
          })
        }
        await refreshInFlight
      } catch {
        onAuthExpired?.()
        return Promise.reject(new axios.AxiosError('Session expired', 'ERR_SESSION_EXPIRED'))
      }
    }

    const latest = readStoredAuth()
    if (latest?.token) {
      config.headers.Authorization = `Bearer ${latest.token}`
    }
  }

  try {
    const url = String(config.url ?? '')
    const prefixes = ['/Tasks', '/Submission', '/StudentDashboard', '/Github']
    if (prefixes.some((p) => url.startsWith(p))) {
      const activeRaw = sessionStorage.getItem('ts-student-active-course')
      if (activeRaw) {
        const active = JSON.parse(activeRaw)
        if (active?.branchId && active?.trainingId) {
          config.params = {
            ...(config.params ?? {}),
            branchId: active.branchId,
            courseId: active.trainingId,
          }
        }
      }
    }
  } catch {
    /* ignore */
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status

    if (status === 401 && original && !original._retry && !String(original.url ?? '').includes('/auth/')) {
      const stored = readStoredAuth()
      if (!isDevAuthToken(stored?.token)) {
        original._retry = true
        try {
          if (!refreshInFlight) {
            refreshInFlight = refreshAccessToken().finally(() => {
              refreshInFlight = null
            })
          }
          const next = await refreshInFlight
          original.headers.Authorization = `Bearer ${next.token}`
          return apiClient(original)
        } catch {
          onAuthExpired?.()
          return Promise.reject(error)
        }
      }
    }

    if (isPortalNetworkError(error)) {
      preferLocalPortalData = true
    }
    return Promise.reject(error)
  },
)

function jwtRoleFromStoredMemberRole(role) {
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

const buildDevToken = (account) => {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' })).replaceAll('=', '')
  const payload = btoa(
    JSON.stringify({
      sub: account.id,
      email: account.email,
      role: account.role,
      name: account.name,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
    }),
  )
    .replaceAll('=', '')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
  return `${header}.${payload}.dev-signature`
}

const loginOfflineAccount = (account) => {
  markPreferLocalPortalData()
  return {
    success: true,
    token: buildDevToken(account),
    user: {
      id: account.id,
      email: account.email,
      role: account.role,
      name: account.name,
    },
    message: 'Login successful (offline demo).',
  }
}

const offlineLoginAccounts = [...staticAccounts, ...apiAccounts]

/** Passwords for demo accounts when the API server is online (JWT login). */
export const API_DEMO_PASSWORDS = Object.fromEntries(
  apiAccounts.map((account) => [String(account.email ?? '').trim().toLowerCase(), account.password]),
)

function resolveApiLoginErrorMessage(error, normalizedEmail) {
  const fallback = 'Invalid email or password.'
  if (!axios.isAxiosError(error) || !error.response?.data) return fallback

  const data = error.response.data
  const serverMsg = typeof data.message === 'string' ? data.message.trim() : ''
  if (!serverMsg) return fallback

  if (/locked/i.test(serverMsg)) {
    return `${serverMsg} If this is a demo account, restart the backend in Development mode to restore access.`
  }

  const apiPassword = API_DEMO_PASSWORDS[normalizedEmail]
  if (apiPassword) {
    return `${serverMsg} With the server online, use password: ${apiPassword}`
  }

  return serverMsg
}

const tryOfflineLogin = (normalizedEmail, normalizedPassword) => {
  const offlineDemo = offlineLoginAccounts.find(
    (account) =>
      normalizedEmail === String(account.email ?? '').trim().toLowerCase() &&
      normalizedPassword === String(account.password ?? ''),
  )
  if (offlineDemo) return loginOfflineAccount(offlineDemo)

  if (verifyMemberCredential(normalizedEmail, normalizedPassword)) {
    const rosterMember = parseRegisteredMembersSnapshot().find(
      (m) => String(m.email ?? '').trim().toLowerCase() === normalizedEmail,
    )
    if (rosterMember) {
      return loginOfflineAccount({
        id: rosterMember.id,
        email: rosterMember.email,
        password: normalizedPassword,
        role: jwtRoleFromStoredMemberRole(rosterMember.role),
        name: rosterMember.fullName,
      })
    }
  }

  return null
}

function tryAdminOfflineLogin(normalizedEmail, normalizedPassword) {
  if (
    normalizedEmail === ADMIN_LOGIN_EMAIL.trim().toLowerCase() &&
    normalizedPassword === ADMIN_LOGIN_PASSWORD
  ) {
    return loginOfflineAccount({
      id: 'admin',
      email: ADMIN_LOGIN_EMAIL,
      password: ADMIN_LOGIN_PASSWORD,
      role: 'Admin',
      name: 'Administrator',
    })
  }
  return null
}

export const loginTrainer = async (email, password) => {
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedPassword = password.trim()
  const offlineReady = tryOfflineLogin(normalizedEmail, normalizedPassword)
  const adminOffline = tryAdminOfflineLogin(normalizedEmail, normalizedPassword)

  if (!(await probeBackendReachable())) {
    return (
      offlineReady ??
      adminOffline ?? {
        success: false,
        message:
          'Cannot reach the API server. Start the backend on http://localhost:5114.',
      }
    )
  }

  try {
    const response = await apiClient.post('/auth/login', { email, password }, { timeout: 8000 })
    if (response.data?.success) {
      resetPreferLocalPortalData()
      return response.data
    }
    return {
      success: false,
      message: resolveApiLoginErrorMessage(
        { response: { data: response.data } },
        normalizedEmail,
      ),
      requiresEmailVerification: response.data?.requiresEmailVerification ?? false,
    }
  } catch (error) {
    if (isNetworkConnectionError(error)) {
      backendProbe = { at: Date.now(), ok: false }
      markPreferLocalPortalData()
      return (
        offlineReady ??
        adminOffline ?? {
          success: false,
          message:
            'Cannot reach the API server. Start the backend on http://localhost:5114.',
        }
      )
    }
    if (axios.isAxiosError(error) && error.response?.data) {
      return {
        success: false,
        message: resolveApiLoginErrorMessage(error, normalizedEmail),
        requiresEmailVerification:
          error.response.data.requiresEmailVerification ??
          error.response.data.RequiresEmailVerification ??
          false,
      }
    }
  }

  return { success: false, message: 'Invalid email or password.' }
}

export const registerAccount = async (payload) => {
  try {
    const response = await apiClient.post('/auth/register', payload, { timeout: 10000 })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      return error.response.data
    }
    return { success: false, message: 'Unable to reach the registration service.' }
  }
}

export const logoutSession = async () => {
  try {
    const token = readStoredAuthToken()
    if (!canUseProtectedApi(token)) return
    if (tokenExpiresSoon(token, 0)) {
      await refreshAccessToken()
    }
    await apiClient.post('/auth/logout', {}, { headers: buildAuthHeaders() })
  } catch {
    /* best effort */
  }
}

export const verifyEmail = async (userId, token) => {
  try {
    const response = await apiClient.post('/auth/verify-email', { userId, token })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) return error.response.data
    return { success: false, message: 'Verification failed.' }
  }
}

export const resendVerification = async (email) => {
  try {
    const response = await apiClient.post('/auth/resend-verification', { email })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) return error.response.data
    return { success: false, message: 'Unable to resend verification email.' }
  }
}

export const forgotPassword = async (email) => {
  try {
    const response = await apiClient.post('/auth/forgot-password', { email })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) return error.response.data
    return { success: false, message: 'Unable to process request.' }
  }
}

export const resetPassword = async (payload) => {
  try {
    const response = await apiClient.post('/auth/reset-password', payload)
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) return error.response.data
    return { success: false, message: 'Unable to reset password.' }
  }
}

export const changePassword = async (payload) => {
  try {
    const response = await apiClient.post('/auth/change-password', payload)
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) return error.response.data
    return { success: false, message: 'Unable to change password.' }
  }
}

export { apiAccounts }
