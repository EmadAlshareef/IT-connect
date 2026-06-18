import axios from 'axios'
import { apiClient, buildAuthHeaders, canUseProtectedApi } from './authApi.js'
import { pushStudentMessageNotification } from './enrollmentApplicationApi.js'
import {
  portalUserMatches,
  resolveKnownPortalUser,
  resolvePortalRoleLabel,
} from '../utils/portalUserDirectory.js'

const MESSAGE_STORAGE_KEY = 'role-based-messages'

const readLocalMessages = () => {
  try {
    return JSON.parse(localStorage.getItem(MESSAGE_STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

const writeLocalMessages = (messages) => {
  localStorage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(messages))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MESSAGES_CHANGED_EVENT))
  }
}

export const MESSAGES_CHANGED_EVENT = 'ts-role-messages-changed'

export const searchMessageUsers = async (token, query) => {
  const q = String(query ?? '').trim()
  if (q.length < 2 || !canUseProtectedApi(token)) return []
  const { data } = await apiClient.get('/messages/users/search', {
    headers: buildAuthHeaders(token),
    params: { q },
  })
  return (Array.isArray(data) ? data : []).map((row) => ({
    id: row.id,
    email: row.email ?? '',
    name: row.name ?? row.email ?? 'User',
    role: row.role ?? 'Member',
  }))
}

export const getMessagesForUser = async (token, userId, options = {}) => {
  const { email = '' } = options ?? {}
  const localForUser = () => {
    const localMessages = readLocalMessages()
    return localMessages.filter(
      (message) =>
        portalUserMatches(userId, email, message.senderId) ||
        portalUserMatches(userId, email, message.receiverId),
    )
  }

  if (!canUseProtectedApi(token)) {
    return localForUser()
  }

  try {
    const response = await apiClient.get(`/messages/${userId}`, {
      headers: buildAuthHeaders(token),
    })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return localForUser()
    }
    if (axios.isAxiosError(error) && error.response) {
      throw error
    }
    return localForUser()
  }
}

export const sendRoleMessage = async (token, payload) => {
  const persistLocalMessage = () => {
    const localMessages = readLocalMessages()
    const senderProfile = resolveKnownPortalUser(payload.senderId, payload.senderEmail)
    const receiverProfile = resolveKnownPortalUser(payload.receiverId, payload.receiverEmail)
    const senderRole = resolvePortalRoleLabel(payload.senderId, senderProfile?.email ?? payload.senderEmail)
    const receiverRole = resolvePortalRoleLabel(payload.receiverId, receiverProfile?.email ?? payload.receiverEmail)
    const message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      senderId: payload.senderId,
      receiverId: payload.receiverId,
      senderEmail: senderProfile?.email ?? payload.senderEmail ?? '',
      receiverEmail: receiverProfile?.email ?? payload.receiverEmail ?? '',
      senderRole,
      receiverRole,
      content: payload.content,
      taskId: payload.taskId ?? null,
      timestamp: new Date().toISOString(),
    }
    writeLocalMessages([...localMessages, message])
    if (receiverRole === 'Trainer') {
      const student = resolveKnownPortalUser(payload.senderId, payload.senderEmail)
      pushStudentMessageNotification(payload.receiverId, {
        messageId: message.id,
        studentId: payload.senderId,
        studentName: student?.name,
        content: payload.content,
        timestamp: message.timestamp,
      })
    }
    return message
  }

  if (!canUseProtectedApi(token)) {
    return persistLocalMessage()
  }

  try {
    const response = await apiClient.post('/messages/send', payload, {
      headers: buildAuthHeaders(token),
    })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return persistLocalMessage()
    }
    if (axios.isAxiosError(error) && error.response) {
      throw error
    }

    return persistLocalMessage()
  }
}
