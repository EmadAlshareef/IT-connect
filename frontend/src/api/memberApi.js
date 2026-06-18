import { apiClient } from './authApi.js'

export async function fetchMembers() {
  const { data } = await apiClient.get('/members')
  return data ?? []
}

export async function updateMemberRoleApi(memberId, role) {
  const { data } = await apiClient.patch(`/members/${encodeURIComponent(memberId)}/role`, { role })
  return data
}

export async function deleteMemberApi(memberId) {
  await apiClient.delete(`/members/${encodeURIComponent(memberId)}`)
}
