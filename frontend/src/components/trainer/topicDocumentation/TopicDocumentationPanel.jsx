import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, FileText, Pencil, Trash2, Video, X } from 'lucide-react'
import { useTopicDocumentationForm } from '../../../hooks/useTopicDocumentationForm.js'
import { publishTopicDocumentation } from '../../../utils/topicDocumentationPublish.js'
import { getSessionStudentsForTraining } from '../../../utils/topicPublishAccess.js'
import {
  deleteTopicDocumentation,
  getTopicDocumentation,
  listTopicDocumentation,
  upsertTopicDocumentation,
} from '../../../utils/topicDocumentationStorage.js'
import { hydrateTopicMedia } from '../../../utils/topicPersistence.js'
import TopicDocumentationForm from './TopicDocumentationForm.jsx'

function topicSummaryHasVideo(topic) {
  return Boolean(topic?.hasVideo || topic?.hasVideoBlob || topic?.videoBlobKey)
}

/**
 * Topic documentation workspace — shown only when opened from overview (via URL).
 */
function TopicDocumentationPanel({
  trainerKey,
  trainingId,
  trainingTitle,
  sessionSummaries = [],
  initialOpen = false,
  embedded = false,
  onClose,
  onTrainingChange,
}) {
  const [panelOpen, setPanelOpen] = useState(embedded || initialOpen)
  const [activeTrainingId, setActiveTrainingId] = useState(
    () => trainingId || sessionSummaries[0]?.id || '',
  )
  const [editingId, setEditingId] = useState(null)
  const [notice, setNotice] = useState({ type: '', message: '' })
  const [publishing, setPublishing] = useState(false)
  const [listTick, setListTick] = useState(0)
  const [savedTopics, setSavedTopics] = useState([])
  const [loadingList, setLoadingList] = useState(false)

  const effectiveTrainingId = activeTrainingId || trainingId || sessionSummaries[0]?.id || ''
  const effectiveTrainingTitle =
    sessionSummaries.find((section) => section.id === effectiveTrainingId)?.title ?? trainingTitle ?? ''

  useEffect(() => {
    const next = trainingId || sessionSummaries[0]?.id || ''
    setActiveTrainingId(next)
  }, [trainingId, sessionSummaries])

  useEffect(() => {
    if (!panelOpen) return undefined
    let cancelled = false
    setLoadingList(true)
    const timer = window.setTimeout(() => {
      if (cancelled) return
      try {
        const rows = listTopicDocumentation({ trainerKey, trainingId: effectiveTrainingId }).sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        setSavedTopics(rows)
      } catch {
        if (!cancelled) setSavedTopics([])
      } finally {
        if (!cancelled) setLoadingList(false)
      }
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [panelOpen, trainerKey, effectiveTrainingId, listTick])

  const editingEntry = useMemo(
    () => (editingId ? savedTopics.find((row) => row.id === editingId) ?? null : null),
    [editingId, savedTopics],
  )

  const form = useTopicDocumentationForm(editingEntry)

  useEffect(() => {
    const bump = () => setListTick((n) => n + 1)
    window.addEventListener('trainer-topic-docs-updated', bump)
    return () => window.removeEventListener('trainer-topic-docs-updated', bump)
  }, [])

  useEffect(() => {
    try {
      const legacyNotice = sessionStorage.getItem('ts-topic-docs-legacy-cleared')
      if (legacyNotice) {
        setNotice({ type: 'error', message: legacyNotice })
        sessionStorage.removeItem('ts-topic-docs-legacy-cleared')
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (!initialOpen) return
    setPanelOpen(true)
    setEditingId(null)
    form.reset()
  }, [initialOpen])

  const openEdit = useCallback(
    async (entry) => {
      setEditingId(entry.id)
      setPanelOpen(true)
      setNotice({ type: '', message: '' })
      try {
        const hydrated = await hydrateTopicMedia(entry)
        form.load(hydrated ?? entry)
      } catch {
        form.load(entry)
      }
    },
    [form],
  )

  const closePanel = useCallback(() => {
    setPanelOpen(false)
    setEditingId(null)
    form.reset()
    setNotice({ type: '', message: '' })
  }, [form])

  const dismiss = useCallback(() => {
    closePanel()
    onClose?.()
  }, [closePanel, onClose])

  const scrollToNotice = useCallback(() => {
    requestAnimationFrame(() => {
      document.getElementById('topic-documentation-notice')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }, [])

  const handlePublish = useCallback(async () => {
    const validation = form.validate()
    if (!validation.valid) {
      const msg = Object.values(validation.errors).join(' ')
      setNotice({
        type: 'error',
        message: msg || 'Please fix the highlighted fields before publishing.',
      })
      scrollToNotice()
      return
    }

    setPublishing(true)
    setNotice({ type: '', message: '' })
    const { draft } = form
    const id = editingId ?? `topic-doc-${Date.now()}`
    if (!effectiveTrainingId) {
      setNotice({
        type: 'error',
        message: 'Select a training session before publishing.',
      })
      scrollToNotice()
      return
    }

    const sessionStudents = getSessionStudentsForTraining(effectiveTrainingId, sessionSummaries)

    try {
      const result = await publishTopicDocumentation(
        {
          id,
          trainerKey,
          trainingId: effectiveTrainingId,
          trainingTitle: effectiveTrainingTitle,
          title: draft.title,
          explanation: draft.explanation,
          videoUrl: draft.videoUrl?.trim() ?? '',
          videoCaption: draft.videoCaption?.trim() ?? '',
          videoSource: draft.videoSource ?? '',
          videoFileName: draft.videoFileName ?? '',
          videoFileSize: draft.videoFileSize ?? 0,
          videoAllowDownload: draft.videoAllowDownload !== false,
          sections: draft.sections,
          attachments: draft.attachments,
          createdAt: editingEntry?.createdAt,
          status: editingEntry?.status,
        },
        { trainerKey, sessionStudents, sessionSummaries },
      )

      if (!result.ok) {
        setNotice({
          type: 'error',
          message: result.message,
        })
        scrollToNotice()
        return
      }

      setNotice({ type: 'success', message: result.message })
      setListTick((n) => n + 1)
      scrollToNotice()
      if (embedded) {
        form.reset()
        setEditingId(null)
      } else {
        closePanel()
        onClose?.()
      }
    } catch (err) {
      setNotice({
        type: 'error',
        message: err?.message || 'Publish failed. Try again or remove large file uploads.',
      })
      scrollToNotice()
    } finally {
      setPublishing(false)
    }
  }, [
    closePanel,
    editingEntry?.createdAt,
    editingEntry?.status,
    editingId,
    embedded,
    form,
    onClose,
    sessionSummaries,
    effectiveTrainingId,
    effectiveTrainingTitle,
    trainerKey,
    scrollToNotice,
  ])

  const handleSaveDraft = useCallback(async () => {
    const validation = form.validate()
    if (!validation.valid) {
      setNotice({
        type: 'error',
        message: Object.values(validation.errors).join(' ') || 'Please fix the form before saving.',
      })
      scrollToNotice()
      return
    }
    const { draft } = form
    const id = editingId ?? `topic-doc-${Date.now()}`
    if (!effectiveTrainingId) {
      setNotice({
        type: 'error',
        message: 'Select a training session before saving.',
      })
      scrollToNotice()
      return
    }

    const { saved, error } = await upsertTopicDocumentation({
      id,
      trainerKey,
      trainingId: effectiveTrainingId,
      trainingTitle: effectiveTrainingTitle,
      title: draft.title.trim(),
      explanation: draft.explanation.trim(),
      videoUrl: draft.videoUrl?.trim() ?? '',
      videoCaption: draft.videoCaption?.trim() ?? '',
      videoSource: draft.videoSource ?? '',
      videoFileName: draft.videoFileName ?? '',
      videoFileSize: draft.videoFileSize ?? 0,
      videoAllowDownload: draft.videoAllowDownload !== false,
      sections: draft.sections,
      attachments: draft.attachments,
      status: 'draft',
      createdAt: editingEntry?.createdAt ?? new Date().toISOString(),
    })
    if (!saved) {
      setNotice({
        type: 'error',
        message: error || 'Could not save draft. Check your connection or reduce attachment size (max 512 KB per file).',
      })
      scrollToNotice()
      return
    }
    setNotice({ type: 'success', message: 'Draft saved (not visible to students until published).' })
    setListTick((n) => n + 1)
    scrollToNotice()
  }, [editingEntry?.createdAt, editingId, effectiveTrainingId, effectiveTrainingTitle, form, trainerKey, scrollToNotice])

  const handleTrainingSelect = useCallback(
    (nextId) => {
      const id = String(nextId ?? '').trim()
      setActiveTrainingId(id)
      onTrainingChange?.(id)
    },
    [onTrainingChange],
  )

  const handleDelete = useCallback(
    async (id) => {
      await deleteTopicDocumentation(id)
      setListTick((n) => n + 1)
      if (editingId === id) closePanel()
      setNotice({ type: 'success', message: 'Topic documentation removed.' })
    },
    [closePanel, editingId],
  )

  useEffect(() => {
    if (embedded) setPanelOpen(true)
  }, [embedded])

  return (
    <div id="topic-documentation" className={embedded ? '' : 'mb-8 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 dark:border-slate-700 dark:from-slate-950/50 dark:to-slate-900'}>
      {embedded ? null : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-400">
              Programming topics
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">Topic documentation</h3>
            <p className="mt-1 max-w-xl text-sm text-slate-600 dark:text-slate-400">
              Create structured guides for programming concepts tied to this training workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" aria-hidden />
            Close
          </button>
        </div>
      )}

      {notice.message ? (
        <p
          id="topic-documentation-notice"
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
          }`}
          role="status"
        >
          {notice.message}
        </p>
      ) : null}

      {panelOpen ? (
        <div className="mt-6">
          {sessionSummaries.length === 0 ? (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-200">
              No training sessions are assigned to you yet. Ask your company to publish a training and link you as the
              trainer, then return here to publish topics.
            </p>
          ) : (
            <div className="mb-4 space-y-2">
              <label htmlFor="topic-training-session" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                Training session <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <select
                id="topic-training-session"
                value={effectiveTrainingId}
                onChange={(event) => handleTrainingSelect(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950"
              >
                <option value="">Select a training session</option>
                {sessionSummaries.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title}
                    {section.company ? ` — ${section.company}` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You can also pick a session from <span className="font-semibold">My trainings</span> in the left sidebar.
              </p>
            </div>
          )}

          <TopicDocumentationForm
            draft={form.draft}
            errors={form.errors}
            onFieldChange={form.setField}
            onSectionChange={form.setSection}
            onAddFiles={form.addFiles}
            onReplaceFile={form.replaceFile}
            onRemoveFile={form.removeFile}
            onVideoUpload={form.setVideoFromFile}
            onVideoLinkChange={form.setVideoLink}
            onClearVideo={form.clearVideo}
            fileBusy={form.fileBusy}
            fileError={form.fileError}
            onSubmit={handlePublish}
            onCancel={dismiss}
            publishing={publishing}
            submitLabel={editingEntry?.status === 'published' ? 'Update published topic' : 'Publish topic'}
          />
          <div className="mt-3">
            <button
              type="button"
              disabled={publishing}
              onClick={handleSaveDraft}
              className="text-sm font-semibold text-slate-600 underline-offset-2 hover:underline disabled:opacity-50 dark:text-slate-400"
            >
              Save as draft only
            </button>
          </div>
        </div>
      ) : null}

      {loadingList ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading saved topics…</p>
      ) : null}

      {!loadingList && savedTopics.length > 0 ? (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Saved topic guides ({savedTopics.length})</h4>
          <ul className="mt-3 space-y-3">
            {savedTopics.map((topic) => (
              <li
                key={topic.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950/60"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" aria-hidden />
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{topic.title}</p>
                    {topic.status === 'published' ? (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                        Published
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                    {topic.explanationPreview ?? topic.explanation}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {topic.status === 'published' && topic.enrolledCount != null ? (
                      <span>{topic.enrolledCount} enrolled</span>
                    ) : null}
                    {topicSummaryHasVideo(topic) ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-violet-800 dark:bg-violet-950/50 dark:text-violet-200">
                        <Video className="h-3 w-3" aria-hidden />
                        Video
                      </span>
                    ) : null}
                    {(topic.attachmentCount ?? topic.attachments?.length ?? 0) > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                        <FileText className="h-3 w-3" aria-hidden />
                        {topic.attachmentCount ?? topic.attachments.length} file
                        {(topic.attachmentCount ?? topic.attachments.length) === 1 ? '' : 's'}
                      </span>
                    ) : null}
                    <span>Updated {new Date(topic.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const full = getTopicDocumentation(topic.id)
                      if (full) void openEdit(full)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(topic.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : !loadingList ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-3 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-950/30 dark:text-slate-400">
          No saved guides yet. Complete the form above to add your first topic.
        </p>
      ) : null}
    </div>
  )
}

export default TopicDocumentationPanel
