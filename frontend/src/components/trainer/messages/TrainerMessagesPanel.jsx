import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Mail, MessageSquare, Search, Send, User, Users } from 'lucide-react'
import {
  getMessagesForUser,
  MESSAGES_CHANGED_EVENT,
  searchMessageUsers,
  sendRoleMessage,
} from '../../../api/messageApi.js'
import {
  canViewEnrolledStudents,
  listTrainerEnrolledStudents,
  listTrainerIncomingMessages,
  TRAINER_ENROLLED_ROSTER_CHANGED_EVENT,
  TRAINER_ENROLLED_STUDENTS_CHANGED_EVENT,
} from '../../../utils/trainerEnrolledStudents.js'
import {
  filterConversation,
  listConversationPartners,
  messageSenderIsSelf,
} from '../../../utils/directMessages.js'
import {
  resolveKnownPortalUser,
  searchPortalUsersByEmail,
} from '../../../utils/portalUserDirectory.js'

function MessageBubble({ isMine, label, content, timestamp }) {
  return (
    <div className={`flex gap-3 ${isMine ? 'flex-row-reverse' : ''}`}>
      <span
        className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
          isMine
            ? 'bg-violet-600 text-white'
            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
        }`}
        aria-hidden
      >
        <User className="h-4 w-4" />
      </span>
      <div className={`max-w-[min(100%,28rem)] ${isMine ? 'text-right' : ''}`}>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
            isMine
              ? 'bg-violet-600 text-white'
              : 'border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
          }`}
        >
          {content}
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          {timestamp ? new Date(timestamp).toLocaleString() : '—'}
        </p>
      </div>
    </div>
  )
}

function TrainerMessagesPanel({
  role,
  token,
  trainerId,
  trainerEmail,
  trainerName,
  trainingId,
  trainingTitle,
}) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [activePartner, setActivePartner] = useState(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [apiSearchResults, setApiSearchResults] = useState([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [searchNotice, setSearchNotice] = useState('')
  const [rosterTick, setRosterTick] = useState(0)
  const listRef = useRef(null)

  const authorized = canViewEnrolledStudents(role)

  const roster = useMemo(
    () => listTrainerEnrolledStudents({ trainingId }),
    [trainingId, rosterTick],
  )

  const reloadMessages = useCallback(async () => {
    if (!authorized || !trainerId || !token) {
      setMessages([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setError('')
      const data = await getMessagesForUser(token, trainerId, { email: trainerEmail })
      setMessages(Array.isArray(data) ? data : [])
    } catch {
      setError('Unable to load messages.')
    } finally {
      setLoading(false)
    }
  }, [authorized, token, trainerEmail, trainerId])

  useEffect(() => {
    void reloadMessages()
  }, [reloadMessages])

  useEffect(() => {
    const bump = () => {
      setRosterTick((n) => n + 1)
      void reloadMessages()
    }
    window.addEventListener(MESSAGES_CHANGED_EVENT, bump)
    window.addEventListener(TRAINER_ENROLLED_STUDENTS_CHANGED_EVENT, bump)
    window.addEventListener(TRAINER_ENROLLED_ROSTER_CHANGED_EVENT, bump)
    window.addEventListener('registered-members-changed', bump)
    return () => {
      window.removeEventListener(MESSAGES_CHANGED_EVENT, bump)
      window.removeEventListener(TRAINER_ENROLLED_STUDENTS_CHANGED_EVENT, bump)
      window.removeEventListener(TRAINER_ENROLLED_ROSTER_CHANGED_EVENT, bump)
      window.removeEventListener('registered-members-changed', bump)
    }
  }, [reloadMessages])

  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2 || !token) {
      setApiSearchResults([])
      setSearchingUsers(false)
      return undefined
    }

    let cancelled = false
    setSearchingUsers(true)
    const timer = window.setTimeout(() => {
      searchMessageUsers(token, q)
        .then((rows) => {
          if (!cancelled) setApiSearchResults(rows)
        })
        .catch(() => {
          if (!cancelled) setApiSearchResults([])
        })
        .finally(() => {
          if (!cancelled) setSearchingUsers(false)
        })
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [searchQuery, token])

  const searchResults = useMemo(() => {
    const byEmail = new Map()
    const exclude = String(trainerEmail ?? '').trim().toLowerCase()
    for (const row of [
      ...searchPortalUsersByEmail(searchQuery, { excludeEmail: trainerEmail }),
      ...apiSearchResults,
    ]) {
      const email = String(row.email ?? '').trim().toLowerCase()
      if (!email || email === exclude || byEmail.has(email)) continue
      byEmail.set(email, row)
    }
    return [...byEmail.values()].slice(0, 10)
  }, [apiSearchResults, searchQuery, trainerEmail])

  const conversationPartners = useMemo(
    () => listConversationPartners(messages, trainerId, trainerEmail, resolveKnownPortalUser),
    [messages, trainerEmail, trainerId],
  )

  const incomingMessages = useMemo(
    () =>
      listTrainerIncomingMessages(messages, trainerId, {
        trainingId,
        trainerEmail,
      }),
    [messages, trainerEmail, trainerId, trainingId, rosterTick],
  )

  useEffect(() => {
    if (activePartner) return
    if (conversationPartners.length > 0) {
      setActivePartner(conversationPartners[0])
      return
    }
    if (roster.length > 0) {
      setActivePartner({
        id: roster[0].id,
        email: roster[0].email,
        name: roster[0].name,
        role: 'Student',
      })
    }
  }, [activePartner, conversationPartners, roster])

  const conversation = useMemo(() => {
    if (!activePartner?.id) return []
    return filterConversation(messages, trainerId, trainerEmail, activePartner.id, activePartner.email)
  }, [activePartner, messages, trainerEmail, trainerId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [conversation, sending])

  const selectPartner = (partner) => {
    if (!partner?.id) return
    setSearchNotice('')
    setSearchQuery('')
    setActivePartner({
      id: partner.id,
      email: partner.email ?? '',
      name: partner.name ?? partner.email ?? 'User',
      role: partner.role ?? '',
    })
  }

  const handleSend = async () => {
    const body = draft.trim()
    if (!body || sending || !activePartner?.id || !trainerId) return

    setSending(true)
    setError('')
    try {
      const saved = await sendRoleMessage(token, {
        senderId: trainerId,
        senderEmail: trainerEmail,
        receiverId: activePartner.id,
        receiverEmail: activePartner.email,
        content: body,
      })
      setMessages((prev) => [...prev, saved])
      setDraft('')
    } catch {
      setError('Unable to send message.')
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    void handleSend()
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setSearchNotice('')
    const trimmed = searchQuery.trim()
    if (trimmed.length < 2) {
      setSearchNotice('Type at least 2 characters to search by email or name.')
      return
    }
    if (searchResults.length === 1) {
      selectPartner(searchResults[0])
      return
    }
    if (searchResults.length === 0) {
      setSearchNotice('No user found. They must register on the platform first.')
    }
  }

  if (!authorized) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">You do not have permission to view messages.</p>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Trainer inbox
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Messages</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Search by email to message anyone, reply to students, or start a conversation with someone enrolled in{' '}
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {trainingTitle || 'this training'}
          </span>
          .
        </p>
      </div>

      <div className="grid min-h-[min(520px,calc(100dvh-16rem))] gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="flex flex-col border-b border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-950/40 lg:border-b-0 lg:border-r">
          <form onSubmit={handleSearchSubmit} className="border-b border-slate-200 p-3 dark:border-slate-700">
            <label htmlFor="trainer-user-search" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Find user by email
            </label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                id="trainer-user-search"
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value)
                  setSearchNotice('')
                }}
                placeholder="e.g. mohamed.ali@example.com"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-900 dark:focus:border-violet-500 dark:focus:ring-violet-950/50"
              />
            </div>
            {searchingUsers ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Searching users…
              </p>
            ) : null}
            {searchQuery.trim().length >= 2 && searchResults.length > 0 ? (
              <ul className="mt-2 max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900">
                {searchResults.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => selectPartner(user)}
                      className="flex w-full flex-col gap-0.5 border-b border-slate-100 px-3 py-2 text-left text-sm transition last:border-b-0 hover:bg-violet-50 dark:border-slate-800 dark:hover:bg-violet-950/30"
                    >
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{user.name}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{user.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {searchNotice ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{searchNotice}</p>
            ) : null}
          </form>

          <ul className="max-h-40 overflow-y-auto border-b border-slate-200 lg:max-h-44 dark:border-slate-700">
            {loading ? (
              <li className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading…
              </li>
            ) : conversationPartners.length === 0 ? (
              <li className="px-4 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                No conversations yet.
              </li>
            ) : (
              conversationPartners.map((partner) => {
                const isActive = partner.id === activePartner?.id
                return (
                  <li key={`${partner.id}:${partner.email}`}>
                    <button
                      type="button"
                      onClick={() => selectPartner(partner)}
                      className={`flex w-full flex-col gap-1 border-b border-slate-200 px-4 py-3 text-left transition last:border-b-0 dark:border-slate-700 ${
                        isActive
                          ? 'bg-violet-50 dark:bg-violet-950/40'
                          : 'hover:bg-white dark:hover:bg-slate-900'
                      }`}
                    >
                      <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {partner.name}
                      </span>
                      <span className="line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {partner.lastMessage?.content}
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>

          <p className="flex items-center gap-2 border-y border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <Users className="h-3.5 w-3.5" aria-hidden />
            Enrolled students ({roster.length})
          </p>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {roster.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No enrolled students for this training yet.
              </li>
            ) : (
              roster.map((student) => {
                const isActive = student.id === activePartner?.id
                return (
                  <li key={student.id}>
                    <button
                      type="button"
                      onClick={() => selectPartner(student)}
                      className={`flex w-full flex-col gap-0.5 border-b border-slate-200 px-4 py-3 text-left transition last:border-b-0 dark:border-slate-700 ${
                        isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/30'
                          : 'hover:bg-white dark:hover:bg-slate-900'
                      }`}
                    >
                      <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {student.name}
                      </span>
                      <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">{student.email}</span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
          {incomingMessages.length > 0 ? (
            <p className="border-t border-slate-200 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
              {incomingMessages.length} new student message{incomingMessages.length === 1 ? '' : 's'} for this training.
            </p>
          ) : null}
        </aside>

        <div className="flex min-h-[360px] flex-col">
          {activePartner ? (
            <>
              <div className="shrink-0 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{activePartner.name}</p>
                <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Mail className="h-3 w-3" aria-hidden />
                  {activePartner.email || 'Direct message'}
                  {activePartner.role ? ` · ${activePartner.role}` : ''}
                </p>
              </div>

              <div
                ref={listRef}
                className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50/50 p-4 dark:bg-slate-950/30"
              >
                {conversation.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    No messages yet. Send the first message below.
                  </p>
                ) : (
                  conversation.map((msg) => {
                    const isMine = messageSenderIsSelf(msg, trainerId, trainerEmail)
                    return (
                      <MessageBubble
                        key={msg.id}
                        isMine={isMine}
                        label={isMine ? trainerName || 'You' : activePartner.name}
                        content={msg.content}
                        timestamp={msg.timestamp}
                      />
                    )
                  })
                )}
                {sending ? (
                  <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    Sending…
                  </p>
                ) : null}
              </div>

              {error ? (
                <p className="shrink-0 border-t border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200">
                  {error}
                </p>
              ) : null}

              <footer className="shrink-0 border-t border-slate-200 p-4 dark:border-slate-700">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <label htmlFor="trainer-message-input" className="sr-only">
                    Message to {activePartner.name}
                  </label>
                  <textarea
                    id="trainer-message-input"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        void handleSend()
                      }
                    }}
                    rows={2}
                    placeholder={`Message ${activePartner.name}…`}
                    disabled={sending}
                    className="min-h-[52px] flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-950 dark:focus:border-violet-500 dark:focus:ring-violet-950/50"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="inline-flex shrink-0 items-center justify-center gap-2 self-end rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" aria-hidden />
                    Send
                  </button>
                </form>
              </footer>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              <MessageSquare className="h-8 w-8 text-slate-300 dark:text-slate-600" aria-hidden />
              <p>Search for a user by email, or pick an enrolled student to start messaging.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TrainerMessagesPanel
