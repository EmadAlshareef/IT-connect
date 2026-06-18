import { useEffect, useRef, useState } from 'react'

function StudentChatModal({ student, sectionTitle, messages, onClose, onSend }) {
  const [composerRole, setComposerRole] = useState('trainer')
  const [draft, setDraft] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages])

  const sendMessage = () => {
    const body = draft.trim()
    if (!body) return
    onSend(composerRole, body)
    setDraft('')
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    sendMessage()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 px-4">
      <div className="flex h-[min(560px,85vh)] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Chat with {student.name}</h2>
            <p className="text-xs text-slate-500">{student.email}</p>
            <p className="mt-1 text-[11px] text-slate-400">{sectionTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close chat"
          >
            ×
          </button>
        </header>

        <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No messages yet. Start the conversation below.
            </p>
          ) : (
            messages.map((msg) => {
              const isTrainer = msg.sender === 'trainer'
              return (
                <div key={msg.id} className={`flex ${isTrainer ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      isTrainer ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                    <p
                      className={`mt-1 text-[10px] ${isTrainer ? 'text-orange-100' : 'text-slate-400'}`}
                    >
                      {isTrainer ? 'You (trainer)' : student.name} ·{' '}
                      {new Date(msg.sentAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <footer className="shrink-0 border-t border-slate-100 p-3">
          <div className="mb-2 flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setComposerRole('trainer')}
              className={`flex-1 rounded-md py-1.5 transition ${
                composerRole === 'trainer' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              Send as Trainer
            </button>
            <button
              type="button"
              onClick={() => setComposerRole('student')}
              className={`flex-1 rounded-md py-1.5 transition ${
                composerRole === 'student' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Send as Student (demo)
            </button>
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Type a message…"
              rows={2}
              className="min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
            <button
              type="submit"
              className="self-end rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400"
            >
              Send
            </button>
          </form>
        </footer>
      </div>
    </div>
  )
}

export default StudentChatModal
