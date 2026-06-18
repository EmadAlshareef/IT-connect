import { apiClient, isLocalOnlySession } from './authApi.js'
import { readStudentProfile, saveStudentProfile } from '../utils/studentProfile.js'
import { readStudentProfileCv, saveStudentProfileCv } from '../utils/studentProfileCv.js'

function readLocalProfile(userId, defaults = {}) {
  const stored = readStudentProfile(userId)
  if (stored) {
    const localCv = readStudentProfileCv(userId)
    if (localCv?.fileName && !stored.cvFileName) {
      return saveStudentProfile(userId, {
        ...stored,
        cvFileName: localCv.fileName,
        cvFileUrl: stored.cvFileUrl || `local://${localCv.fileName}`,
      })
    }
    return stored
  }
  return saveStudentProfile(userId, defaults)
}

export async function fetchStudentProfile(token, userId, defaults = {}) {
  if (isLocalOnlySession(token)) {
    return readLocalProfile(userId, defaults)
  }
  try {
    const { data } = await apiClient.get('/student/v1/profile', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (data) {
      saveStudentProfile(userId, { ...defaults, ...data })
      return data
    }
  } catch {
    /* fall back to local profile */
  }
  return readLocalProfile(userId, defaults)
}

export async function updateStudentProfile(token, userId, payload, cvFile = null) {
  if (isLocalOnlySession(token)) {
    let cvMeta = {}
    if (cvFile) {
      await saveStudentProfileCv(userId, cvFile)
      cvMeta = {
        cvFileName: cvFile.name,
        cvFileUrl: `local://${cvFile.name}`,
      }
    }
    return saveStudentProfile(userId, { ...payload, ...cvMeta })
  }

  let cvMeta = {}
  if (cvFile) {
    try {
      const form = new FormData()
      form.append('cv', cvFile)
      Object.entries(payload).forEach(([key, value]) => {
        if (value != null && value !== '') form.append(key, String(value))
      })
      const { data } = await apiClient.put('/student/v1/profile', form, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (data) {
        return saveStudentProfile(userId, data)
      }
    } catch {
      /* fall back below */
    }
    await saveStudentProfileCv(userId, cvFile)
    cvMeta = {
      cvFileName: cvFile.name,
      cvFileUrl: `local://${cvFile.name}`,
    }
  }

  try {
    const { data } = await apiClient.put('/student/v1/profile', payload, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (data) {
      return saveStudentProfile(userId, data)
    }
  } catch {
    /* fall back to local profile */
  }
  return saveStudentProfile(userId, { ...payload, ...cvMeta })
}
