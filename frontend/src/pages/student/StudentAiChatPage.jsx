import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useOutletContext } from 'react-router-dom'
import { Bot, Loader2, RotateCcw, Send, Sparkles, User } from 'lucide-react'
import { useAuth } from '../../context/useAuth.js'
import {
  clearAiTutorHistory,
  loadAiTutorHistory,
  saveAiTutorHistory,
  sendAiTutorMessage,
} from '../../api/aiLearningApi.js'
import { parseCourseFromSearch } from '../../utils/courseAccessRoutes.js'
import { readActiveCourseSelection } from '../../hooks/useStudentApprovedCourses.js'
import {
  AI_TUTOR_STARTER_PROMPTS,
  buildAiTutorWelcomeMessage,
} from '../../utils/aiTutorSystemPrompt.js'

function MessageBubble({ role, content }) {
  const isUser = role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <span
        className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
          isUser
            ? 'bg-violet-600 text-white'
            : 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200'
        }`}
        aria-hidden
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </span>
      <div
        className={`max-w-[min(100%,40rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-violet-600 text-white'
            : 'border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
        }`}
      >
        {content}
      </div>
    </div>
  )
}

function StudentAiChatPage() {
  const outlet = useOutletContext()
  const auth = useAuth()
  const token = outlet?.token ?? auth.token
  const userId = outlet?.userId ?? auth.userId
  const trainerName = outlet?.trainerName ?? auth.trainerName
  const location = useLocation()
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [source, setSource] = useState('')
  const listRef = useRef(null)
  const historySyncKeyRef = useRef('')

  const course = useMemo(
    () => parseCourseFromSearch(new URLSearchParams(location.search)),
    [location.search],
  )
  const activeCourse = useMemo(() => readActiveCourseSelection(), [location.search, userId])
  const branchId = course?.branchId ?? activeCourse?.branchId ?? ''
  const courseId = course?.courseId ?? activeCourse?.trainingId ?? ''
  const courseTitle = course?.title || activeCourse?.trainingTitle || 'Training program'
  const studentName = trainerName?.split(' ')[0] || trainerName || 'there'

  const welcomeMessage = useMemo(
    () => buildAiTutorWelcomeMessage({ courseTitle, studentName }),
    [courseTitle, studentName],
  )

  useEffect(() => {
    if (!userId || !branchId || !courseId) {
      historySyncKeyRef.current = ''
      setMessages([])
      return
    }
    const syncKey = `${userId}|${branchId}|${courseId}`
    historySyncKeyRef.current = syncKey
    setMessages(loadAiTutorHistory(userId, branchId, courseId))
  }, [branchId, courseId, userId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  useEffect(() => {
    if (!userId || !branchId || !courseId) return
    const syncKey = `${userId}|${branchId}|${courseId}`
    if (historySyncKeyRef.current !== syncKey) return
    saveAiTutorHistory(userId, branchId, courseId, messages)
  }, [branchId, courseId, messages, userId])

  const sendMessage = useCallback(
    async (text) => {
      const body = String(text ?? '').trim()
      if (!body || sending) return
      if (!userId) {
        setError('Please sign in again to use the AI tutor.')
        return
      }

      const userMessage = { id: `u-${Date.now()}`, role: 'user', content: body }
      let historyForApi = []
      setMessages((prev) => {
        historyForApi = [...prev, userMessage].map(({ role, content }) => ({ role, content }))
        return [...prev, userMessage]
      })
      setDraft('')
      setSending(true)
      setError('')

      try {
        const result = await sendAiTutorMessage(token, {
          userId,
          branchId,
          courseId,
          courseTitle,
          studentName: trainerName ?? studentName,
          message: body,
          history: historyForApi.slice(0, -1),
        })
        setSource(result.source ?? 'local')
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: 'assistant', content: result.reply },
        ])
      } catch {
        setError('Something went wrong. Please try again.')
      } finally {
        setSending(false)
      }
    },
    [branchId, courseId, courseTitle, sending, studentName, token, trainerName, userId],
  )

  const handleSubmit = (event) => {
    event.preventDefault()
    void sendMessage(draft)
  }

  const handleClear = () => {
    if (!userId || !branchId || !courseId) return
    clearAiTutorHistory(userId, branchId, courseId)
    setMessages([])
    setSource('')
    setError('')
  }

  if (!branchId || !courseId) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-600">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Select an approved course from the sidebar to open the AI tutor.
        </p>
        <Link
          to="/student/applications"
          className="mt-4 inline-block text-sm font-semibold text-violet-600 hover:underline dark:text-violet-400"
        >
          View applications
        </Link>
      </div>
    )
  }

  const showWelcome = messages.length === 0 && !sending

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <header className="shrink-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              AI Tutor
            </p>
            <h1 className="mt-1 truncate text-2xl font-bold text-slate-900 dark:text-slate-100">{courseTitle}</h1>
            {source ? (
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                {source === 'gemini'
                  ? 'Connected — live Gemini AI responses'
                  : source === 'groq'
                  ? 'Connected — live Groq AI responses'
                  : source === 'openai'
                  ? 'Connected — live AI responses'
                  : 'Demo mode — set GEMINI_API_KEY in backend for full AI'}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            New chat
          </button>
        </div>
      </header>

      <section
        className="flex h-[calc(100dvh-12rem)] min-h-[480px] max-h-[820px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
        aria-label="AI tutor conversation"
      >
        <div
          ref={listRef}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50/80 p-4 dark:bg-slate-950/40"
        >
          {showWelcome ? (
            <>
              <MessageBubble role="assistant" content={welcomeMessage} />
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {AI_TUTOR_STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-50 dark:border-violet-900/50 dark:bg-slate-900 dark:text-violet-200 dark:hover:bg-violet-950/40"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </>
          ) : (
            messages.map((msg) => <MessageBubble key={msg.id} role={msg.role} content={msg.content} />)
          )}
          {sending ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Thinking…
            </div>
          ) : null}
        </div>

        {error ? (
          <p className="shrink-0 border-t border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </p>
        ) : null}

        <footer className="shrink-0 border-t border-slate-200 p-4 dark:border-slate-700">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <label htmlFor="ai-tutor-input" className="sr-only">
              Message to AI tutor
            </label>
            <textarea
              id="ai-tutor-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void sendMessage(draft)
                }
              }}
              rows={2}
              placeholder="Ask anything about your course, code, or tasks…"
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
      </section>
    </div>
  )
}

export default StudentAiChatPage
