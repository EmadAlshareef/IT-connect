import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'itconnect_admin_track_skills_v1'

const EMPTY_SKILLS = {}

function parseSkillsSnapshot() {
  if (typeof window === 'undefined') return EMPTY_SKILLS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_SKILLS
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Object.keys(parsed).length === 0) return EMPTY_SKILLS
    return parsed
  } catch {
    return EMPTY_SKILLS
  }
}

function mergeIntoSnapshot(prev, next) {
  if (prev === next) return prev
  try {
    return JSON.stringify(prev) === JSON.stringify(next) ? prev : next
  } catch {
    return next
  }
}

function writeSkills(data) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* ignore quota */
  }
}

function notifySkillsChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('admin-track-skills'))
}

/**
 * Skills saved under a parent track id: `{ [parentTrackId]: [{ id, skillsName, description }] }`
 */
export function useAdminTrackSkills() {
  const [skillsByParent, setSkillsByParent] = useState(parseSkillsSnapshot)

  useEffect(() => {
    const sync = () => {
      setSkillsByParent((prev) => mergeIntoSnapshot(prev, parseSkillsSnapshot()))
    }
    window.addEventListener('storage', sync)
    window.addEventListener('admin-track-skills', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('admin-track-skills', sync)
    }
  }, [])

  const addSkillToTrack = useCallback((parentTrackId, { skillsName, description }) => {
    if (!parentTrackId) return
    const name = (skillsName ?? '').trim()
    if (!name) return
    const current = parseSkillsSnapshot()
    const base = current === EMPTY_SKILLS ? {} : { ...current }
    const entry = {
      id: `sk-${Date.now()}`,
      skillsName: name,
      description: (description ?? '').trim(),
    }
    const next = {
      ...base,
      [parentTrackId]: [...(base[parentTrackId] ?? []), entry],
    }
    writeSkills(next)
    notifySkillsChanged()
  }, [])

  const skillCountForTrack = useCallback((trackId) => (skillsByParent[trackId] ?? []).length, [skillsByParent])

  return { skillsByParent, addSkillToTrack, skillCountForTrack }
}
