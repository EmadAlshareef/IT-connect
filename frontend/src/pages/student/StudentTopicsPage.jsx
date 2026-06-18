import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useOutletContext } from 'react-router-dom'
import { BookOpen, Loader2, Video } from 'lucide-react'
import TopicContentViewer from '../../components/trainer/topicDocumentation/TopicContentViewer.jsx'
import {
  getPublishedTopicForStudent,
  listPublishedTopicsForStudent,
  PUBLISHED_TOPICS_CHANGED_EVENT,
} from '../../utils/topicDocumentationPublish.js'
import { bootstrapStudentTopicDocs } from '../../utils/topicDocumentationStorage.js'
import { hydrateTopicMedia } from '../../utils/topicPersistence.js'
import { parseTopicVideoUrl } from '../../utils/topicVideo.js'

function groupTopicsByTraining(topics) {
  const map = new Map()
  for (const topic of topics) {
    const trainingId = String(topic.trainingId ?? '').trim() || 'unknown'
    if (!map.has(trainingId)) {
      map.set(trainingId, {
        trainingId,
        trainingTitle: topic.trainingTitle || 'Training program',
        topics: [],
      })
    }
    map.get(trainingId).topics.push(topic)
  }
  return [...map.values()].sort((a, b) =>
    a.trainingTitle.localeCompare(b.trainingTitle, undefined, { sensitivity: 'base' }),
  )
}

function StudentTopicsPage() {
  const { userId, email } = useOutletContext()
  const location = useLocation()
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const courseContext = useMemo(
    () => ({
      branchId: String(searchParams.get('branchId') ?? '').trim(),
      courseId: String(searchParams.get('courseId') ?? '').trim(),
    }),
    [searchParams],
  )
  const courseSearch = useMemo(() => {
    return courseContext.branchId && courseContext.courseId
      ? new URLSearchParams(courseContext).toString()
      : ''
  }, [courseContext])
  const [selectedId, setSelectedId] = useState('')
  const [selected, setSelected] = useState(null)
  const [loadingTopic, setLoadingTopic] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    const params = courseContext.courseId ? { trainingSessionId: courseContext.courseId } : {}
    void bootstrapStudentTopicDocs(params).then(() => setRefreshTick((n) => n + 1)).catch(() => {})
  }, [courseContext.courseId])

  useEffect(() => {
    const bump = () => setRefreshTick((n) => n + 1)
    window.addEventListener(PUBLISHED_TOPICS_CHANGED_EVENT, bump)
    window.addEventListener('trainer-topic-docs-updated', bump)
    window.addEventListener('ts-catalog-enrollment-changed', bump)
    window.addEventListener('ts-course-access-changed', bump)
    return () => {
      window.removeEventListener(PUBLISHED_TOPICS_CHANGED_EVENT, bump)
      window.removeEventListener('trainer-topic-docs-updated', bump)
      window.removeEventListener('ts-catalog-enrollment-changed', bump)
      window.removeEventListener('ts-course-access-changed', bump)
    }
  }, [])

  const topics = useMemo(
    () => listPublishedTopicsForStudent(userId, email, courseContext),
    [userId, email, courseContext, refreshTick],
  )

  const trainingGroups = useMemo(() => groupTopicsByTraining(topics), [topics])

  const activeSelectedId = useMemo(() => {
    if (topics.length === 0) return ''
    if (selectedId && topics.some((topic) => topic.id === selectedId)) return selectedId
    return topics[0].id
  }, [topics, selectedId])

  useEffect(() => {
    let cancelled = false
    if (!activeSelectedId) {
      setSelected(null)
      setLoadingTopic(false)
      return undefined
    }

    const base = getPublishedTopicForStudent(activeSelectedId, userId, email, courseContext)
    if (!base) {
      setSelected(null)
      setLoadingTopic(false)
      return undefined
    }

    setLoadingTopic(true)
    hydrateTopicMedia(base)
      .then((hydrated) => {
        if (!cancelled) setSelected(hydrated ?? base)
      })
      .catch(() => {
        if (!cancelled) setSelected(base)
      })
      .finally(() => {
        if (!cancelled) setLoadingTopic(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeSelectedId, userId, email, courseContext, refreshTick])

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Course topics</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
          Lessons from your enrolled trainings only — each topic belongs to one program and is not shared
          with students in other trainings.
        </p>
      </header>

      {topics.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-400">
          No published topics yet. When your trainer publishes a lesson for a training you are enrolled in,
          it will appear here.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-5">
            {trainingGroups.map((group) => (
              <div key={group.trainingId}>
                <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-400">
                  {group.trainingTitle}
                </p>
                <ul className="space-y-2">
                  {group.topics.map((topic) => {
                    const isActive = topic.id === activeSelectedId
                    const hasVideo =
                      parseTopicVideoUrl(topic.videoUrl).valid || Boolean(topic.videoBlobKey)
                    return (
                      <li key={topic.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(topic.id)}
                          className={`flex w-full items-start gap-2 rounded-xl border px-3 py-3 text-left transition ${
                            isActive
                              ? 'border-violet-400 bg-violet-50 dark:border-violet-600 dark:bg-violet-950/40'
                              : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
                          }`}
                        >
                          <BookOpen
                            className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400"
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {topic.title}
                            </span>
                            {hasVideo ? (
                              <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-violet-600 dark:text-violet-400">
                                <Video className="h-3 w-3" aria-hidden />
                                Video lesson
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </aside>

          {loadingTopic ? (
            <div className="flex min-h-[12rem] items-center justify-center rounded-3xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600 dark:text-violet-400" aria-hidden />
            </div>
          ) : selected ? (
            <TopicContentViewer topic={selected} />
          ) : null}
        </div>
      )}

      <p className="text-sm text-slate-500 dark:text-slate-400">
        <Link
          to={courseSearch ? { pathname: '/student/tasks', search: courseSearch } : '/student/tasks'}
          className="font-semibold text-violet-600 hover:underline dark:text-violet-400"
        >
          Back to tasks
        </Link>
      </p>
    </div>
  )
}

export default StudentTopicsPage
