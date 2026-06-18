import {
  normalizePortalEmail,
  portalUserMatches,
  resolveKnownPortalUser,
} from './portalUserDirectory.js'

export function messageInvolvesUser(message, userId, userEmail = '') {
  if (!message) return false
  if (portalUserMatches(userId, userEmail, message.senderId)) return true
  if (portalUserMatches(userId, userEmail, message.receiverId)) return true
  const normalizedEmail = normalizePortalEmail(userEmail)
  if (normalizedEmail) {
    if (normalizePortalEmail(message.senderEmail) === normalizedEmail) return true
    if (normalizePortalEmail(message.receiverEmail) === normalizedEmail) return true
  }
  return false
}

export function usersShareConversation(message, selfId, selfEmail, partnerId, partnerEmail = '') {
  if (!messageInvolvesUser(message, selfId, selfEmail)) return false
  return portalUserMatches(partnerId, partnerEmail, message.senderId) ||
    portalUserMatches(partnerId, partnerEmail, message.receiverId) ||
    (partnerEmail &&
      (normalizePortalEmail(message.senderEmail) === normalizePortalEmail(partnerEmail) ||
        normalizePortalEmail(message.receiverEmail) === normalizePortalEmail(partnerEmail)))
}

export function filterConversation(messages, selfId, selfEmail, partnerId, partnerEmail = '') {
  return (messages ?? [])
    .filter((message) => usersShareConversation(message, selfId, selfEmail, partnerId, partnerEmail))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
}

export function messageSenderIsSelf(message, selfId, selfEmail = '') {
  return portalUserMatches(selfId, selfEmail, message.senderId) ||
    (selfEmail && normalizePortalEmail(message.senderEmail) === normalizePortalEmail(selfEmail))
}

export function resolveMessagePartner(message, selfId, selfEmail = '') {
  if (!message) return null
  const selfIsSender = messageSenderIsSelf(message, selfId, selfEmail)
  return {
    id: selfIsSender ? message.receiverId : message.senderId,
    email: selfIsSender ? message.receiverEmail : message.senderEmail,
  }
}

export function listConversationPartners(messages, selfId, selfEmail = '', resolveUser = resolveKnownPortalUser) {
  const byKey = new Map()

  for (const message of messages ?? []) {
    if (!messageInvolvesUser(message, selfId, selfEmail)) continue
    const partner = resolveMessagePartner(message, selfId, selfEmail)
    const partnerId = String(partner?.id ?? '').trim()
    if (!partnerId) continue

    const profile = resolveUser(partnerId) ?? (partner.email ? resolveUser('', partner.email) : null)
    const email = String(profile?.email ?? partner.email ?? '').trim()
    const key = `${partnerId}:${normalizePortalEmail(email)}`
    const existing = byKey.get(key)
    const timestamp = message.timestamp

    if (!existing) {
      byKey.set(key, {
        id: partnerId,
        email,
        name: profile?.name || profile?.fullName || email || 'User',
        role: profile?.role ?? '',
        lastMessage: message,
        lastTimestamp: timestamp,
      })
      continue
    }

    if (new Date(timestamp) > new Date(existing.lastTimestamp)) {
      existing.lastMessage = message
      existing.lastTimestamp = timestamp
    }
  }

  return [...byKey.values()].sort(
    (a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp),
  )
}
