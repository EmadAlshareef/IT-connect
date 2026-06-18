import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Mail, Search, Send, User } from 'lucide-react'
import { getMessagesForUser, MESSAGES_CHANGED_EVENT, sendRoleMessage } from '../api/messageApi.js'
import { useAuth } from '../context/useAuth.js'
import {
  filterConversation,
  listConversationPartners,
  messageSenderIsSelf,
} from '../utils/directMessages.js'
import {
  resolveKnownPortalUser,
  searchPortalUsersByEmail,
} from '../utils/portalUserDirectory.js'

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
      <div className={`max-w-[min(100%,32rem)] ${isMine ? 'text-right' : ''}`}>
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

function DirectMessagesPage() {
  const { role, userId, token, trainerName, email } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchNotice, setSearchNotice] = useState('')
  const [activePartner, setActivePartner] = useState(null)
  const listRef = useRef(null)

  const reload = useCallback(async () => {
    if (!userId || !token) {
      setMessages([])
      setLoading(false)
      return
    }
    try {
      setError('')
      const data = await getMessagesForUser(token, userId, { email })
      setMessages(Array.isArray(data) ? data : [])
    } catch {
      setError('Unable to load messages.')
    } finally {
      setLoading(false)
    }
  }, [email, token, userId])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    const bump = () => void reload()
    window.addEventListener(MESSAGES_CHANGED_EVENT, bump)
    window.addEventListener('storage', bump)
    window.addEventListener('registered-members-changed', bump)
    return () => {
      window.removeEventListener(MESSAGES_CHANGED_EVENT, bump)
      window.removeEventListener('storage', bump)
      window.removeEventListener('registered-members-changed', bump)
    }
  }, [reload])

  const searchResults = useMemo(
    () => searchPortalUsersByEmail(searchQuery, { excludeEmail: email }),
    [email, searchQuery],
  )

  const conversationPartners = useMemo(
    () => listConversationPartners(messages, userId, email, resolveKnownPortalUser),
    [email, messages, userId],
  )

  useEffect(() => {
    if (activePartner) return
    if (conversationPartners.length > 0) {
      setActivePartner(conversationPartners[0])
    }
  }, [activePartner, conversationPartners])

  const conversation = useMemo(() => {
    if (!activePartner?.id) return []
    return filterConversation(messages, userId, email, activePartner.id, activePartner.email)
  }, [activePartner, email, messages, userId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [conversation, sending])

  const startConversationWith = (user) => {
    if (!user?.id) return
    setSearchNotice('')
    setSearchQuery('')
    setActivePartner({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
  }

  const handleSend = async () => {
    const body = draft.trim()
    if (!body || sending || !activePartner?.id || !userId) return

    setSending(true)
    setError('')
    try {
      const saved = await sendRoleMessage(token, {
        senderId: userId,
        senderEmail: email,
        receiverId: activePartner.id,
        receiverEmail: activePartner.email,
        content: body,
      })
      setMessages((previous) => [...previous, saved])
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
      startConversationWith(searchResults[0])
      return
    }
    if (searchResults.length === 0) {
      setSearchNotice('No user found with that email. They must register on the platform first.')
    }
  }

  const displayName = trainerName || email || 'You'

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <header className="shrink-0">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Messages</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Search by email to message any registered user. Logged in as {displayName} ({email}) · {role}.
        </p>
      </header>

      <div className="grid min-h-[min(68vh,calc(100dvh-12rem))] gap-0 overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="flex flex-col border-b border-violet-100 bg-violet-50/40 dark:border-slate-700 dark:bg-slate-950/40 lg:border-b-0 lg:border-r">
          <form onSubmit={handleSearchSubmit} className="border-b border-slate-200 p-3 dark:border-slate-700">
            <label htmlFor="message-user-search" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Find user by email
            </label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                id="message-user-search"
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value)
                  setSearchNotice('')
                }}
                placeholder="e.g. trainer2003@gmail.com"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-900 dark:focus:border-violet-500 dark:focus:ring-violet-950/50"
              />
            </div>
            {searchQuery.trim().length >= 2 && searchResults.length > 0 ? (
              <ul className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900">
                {searchResults.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => startConversationWith(user)}
                      className="flex w-full flex-col gap-0.5 border-b border-slate-100 px-3 py-2 text-left text-sm transition last:border-b-0 hover:bg-violet-50 dark:border-slate-800 dark:hover:bg-violet-950/30"
                    >
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{user.name}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{user.email}</span>
                      {user.role ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">
                          {user.role}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {searchNotice ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{searchNotice}</p>
            ) : null}
          </form>

          <p className="border-b border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Conversations ({conversationPartners.length})
          </p>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <li className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading…
              </li>
            ) : conversationPartners.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No conversations yet. Search for someone by email to start.
              </li>
            ) : (
              conversationPartners.map((partner) => {
                const isActive = partner.id === activePartner?.id
                return (
                  <li key={`${partner.id}:${partner.email}`}>
                    <button
                      type="button"
                      onClick={() => setActivePartner(partner)}
                      className={`flex w-full flex-col gap-1 border-b border-slate-200 px-4 py-3 text-left transition last:border-b-0 dark:border-slate-700 ${
                        isActive
                          ? 'bg-violet-50 dark:bg-violet-950/40'
                          : 'hover:bg-white dark:hover:bg-slate-900'
                      }`}
                    >
                      <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {partner.name}
                      </span>
                      <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">{partner.email}</span>
                      <span className="line-clamp-1 text-[11px] text-slate-400 dark:text-slate-500">
                        {partner.lastMessage?.content}
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </aside>

        <section className="flex min-h-[360px] flex-col">
          {activePartner ? (
            <>
              <div className="shrink-0 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{activePartner.name}</p>
                <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Mail className="h-3 w-3" aria-hidden />
                  {activePartner.email}
                  {activePartner.role ? ` · ${activePartner.role}` : ''}
                </p>
              </div>

              <div
                ref={listRef}
                className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50/80 p-4 dark:bg-slate-950/40"
              >
                {conversation.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    No messages yet. Send the first message below.
                  </p>
                ) : (
                  conversation.map((message) => {
                    const isMine = messageSenderIsSelf(message, userId, email)
                    const label = isMine ? 'You' : activePartner.name
                    return (
                      <MessageBubble
                        key={message.id}
                        isMine={isMine}
                        label={label}
                        content={message.content}
                        timestamp={message.timestamp}
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
                  <label htmlFor="direct-message-input" className="sr-only">
                    Message to {activePartner.name}
                  </label>
                  <textarea
                    id="direct-message-input"
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
              <Mail className="h-8 w-8 text-slate-300 dark:text-slate-600" aria-hidden />
              <p>Search for a user by email, or pick a conversation from the list.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default DirectMessagesPage
