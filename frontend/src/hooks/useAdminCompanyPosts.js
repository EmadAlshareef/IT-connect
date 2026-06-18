import { useCallback, useEffect, useState } from 'react'
import {
  deleteCompanyPost,
  fetchCompanyPosts,
  mapCompanyPostDtoToCard,
  saveCompanyPost,
} from '../api/catalogApi.js'

const STORAGE_KEY = 'itconnect_admin_created_posts_v1'

function groupByBranch(rows) {
  const map = {}
  for (const row of rows) {
    const bid = row.branchId || 'cairo'
    if (!map[bid]) map[bid] = []
    map[bid].push(row)
  }
  return map
}

async function loadPostsFromApi() {
  const rows = await fetchCompanyPosts()
  return groupByBranch(rows.map(mapCompanyPostDtoToCard))
}

function parseSnapshot() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeSnapshot(data) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* ignore */
  }
}

function notifyChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('admin-created-posts'))
}

/** Company posts from SQL Server (admin Post Management). */
export function useAdminCompanyPosts() {
  const [byBranch, setByBranch] = useState(parseSnapshot)

  const refreshFromApi = useCallback(async () => {
    try {
      const local = parseSnapshot()
      const grouped = await loadPostsFromApi()
      const merged = {}
      const branchIds = new Set([...Object.keys(local), ...Object.keys(grouped)])
      for (const branchId of branchIds) {
        const apiRows = grouped[branchId] ?? []
        const localRows = local[branchId] ?? []
        merged[branchId] = apiRows.map((row) => {
          const cached = localRows.find((item) => item.id === row.id)
          if (!cached?.trainingId) return row
          return { ...row, trainingId: cached.trainingId }
        })
      }
      setByBranch(merged)
      writeSnapshot(merged)
    } catch {
      setByBranch(parseSnapshot())
    }
  }, [])

  useEffect(() => {
    refreshFromApi()
    const sync = () => refreshFromApi()
    window.addEventListener('storage', sync)
    window.addEventListener('admin-created-posts', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('admin-created-posts', sync)
    }
  }, [refreshFromApi])

  const prependPost = useCallback(async (branchId, post) => {
    try {
      await saveCompanyPost({
        id: post.id,
        branchId,
        title: post.title,
        body: post.body,
        trainingId: post.trainingId,
        trainingTitle: post.training,
        deadline: post.deadlineRaw ?? post.deadline,
        status: (post.status ?? 'PUBLISHED').toLowerCase(),
        tags: Array.isArray(post.tags) ? post.tags.join(',') : post.tags,
      })
      await refreshFromApi()
      notifyChanged()
    } catch {
      const snap = parseSnapshot()
      const next = {
        ...snap,
        [branchId]: [post, ...(snap[branchId] ?? [])],
      }
      writeSnapshot(next)
      notifyChanged()
      setByBranch(next)
    }
  }, [refreshFromApi])

  const removePost = useCallback(async (branchId, postId) => {
    try {
      await deleteCompanyPost(postId)
      await refreshFromApi()
      notifyChanged()
      return true
    } catch {
      const snap = parseSnapshot()
      const list = snap[branchId] ?? []
      const isLocalOnly = list.some((p) => p.id === postId && String(p.id).startsWith('new-'))
      if (!isLocalOnly) return false
      const next = {
        ...snap,
        [branchId]: list.filter((p) => p.id !== postId),
      }
      writeSnapshot(next)
      notifyChanged()
      setByBranch(next)
      return true
    }
  }, [refreshFromApi])

  return { byBranch, prependPost, removePost, refreshFromApi }
}
