import {
  getTopicDocumentation,
  listTopicDocumentation,
  upsertTopicDocumentation,
} from './topicDocumentationStorage.js'
import {
  canStudentViewPublishedTopic,
  canTrainerPublishToTraining,
  makeTopicContentKey,
  PUBLISHED_TOPICS_CHANGED_EVENT,
  resolvePublishAudienceForTraining,
} from './topicPublishAccess.js'
export { PUBLISHED_TOPICS_CHANGED_EVENT }

/**
 * @returns {import('./topicDocumentationStorage.js').TopicDoc | null}
 */
export function findPublishedDuplicate(contentKey, excludeId = null) {
  const key = String(contentKey ?? '').trim()
  if (!key) return null
  return (
    listTopicDocumentation().find(
      (row) =>
        row.status === 'published' &&
        row.contentKey === key &&
        row.id !== excludeId,
    ) ?? null
  )
}

/**
 * Publish topic to enrolled students in the training.
 * @param {object} entry draft fields + id
 * @param {{ trainerKey: string, sessionStudents?: object[], sessionSummaries?: object[] }} ctx
 */
export async function publishTopicDocumentation(entry, ctx) {
  const trainerKey = String(ctx.trainerKey ?? '').trim().toLowerCase()
  const trainingId = String(entry.trainingId ?? '').trim()

  if (!trainerKey) {
    return { ok: false, code: 'UNAUTHORIZED', message: 'You must be signed in as a trainer to publish.' }
  }
  if (!trainingId) {
    return { ok: false, code: 'VALIDATION', message: 'Select a training session before publishing.' }
  }
  if (!canTrainerPublishToTraining(trainerKey, trainingId, ctx.sessionSummaries)) {
    return {
      ok: false,
      code: 'UNAUTHORIZED',
      message: 'You are not assigned to this training and cannot publish topics for it.',
    }
  }

  const title = String(entry.title ?? '').trim()
  const explanation = String(entry.explanation ?? '').trim()
  if (!title || !explanation) {
    return { ok: false, code: 'VALIDATION', message: 'Topic title and explanation are required before publishing.' }
  }

  const contentKey = makeTopicContentKey(trainingId, title)
  const duplicate = findPublishedDuplicate(contentKey, entry.id ?? null)
  if (duplicate) {
    return {
      ok: false,
      code: 'DUPLICATE',
      message: `“${duplicate.title}” is already published for this training. Edit the existing topic or use a different title.`,
    }
  }

  const audience = resolvePublishAudienceForTraining(trainingId, ctx.sessionStudents ?? [])

  const now = new Date().toISOString()
  const existing = entry.id ? getTopicDocumentation(entry.id) : null
  const upsertResult = await upsertTopicDocumentation({
    ...entry,
    id: entry.id ?? `topic-doc-${Date.now()}`,
    trainerKey,
    trainingId,
    title,
    explanation,
    videoUrl: String(entry.videoUrl ?? '').trim(),
    videoCaption: String(entry.videoCaption ?? '').trim(),
    videoSource: String(entry.videoSource ?? '').trim(),
    videoFileName: String(entry.videoFileName ?? '').trim(),
    videoFileSize: Number(entry.videoFileSize) || 0,
    videoAllowDownload: entry.videoAllowDownload !== false,
    sections: entry.sections ?? {},
    attachments: entry.attachments ?? [],
    status: 'published',
    contentKey,
    publishedAt: existing?.publishedAt ?? now,
    updatedAt: now,
    createdAt: existing?.createdAt ?? now,
    enrolledStudentIds: audience.map((row) => row.id),
    enrolledCount: audience.length,
  })

  const { record: published, saved } = upsertResult
  if (!saved) {
    return {
      ok: false,
      code: 'STORAGE',
      message:
        upsertResult.error ||
        'Could not save this topic. Check your connection or reduce attachment size (max 512 KB per file).',
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PUBLISHED_TOPICS_CHANGED_EVENT))
  }

  const enrolledCount = Number(published.enrolledCount ?? audience.length) || 0
  const programLabel = String(published.trainingTitle || entry.trainingTitle || 'this training').trim()
  const audienceNote =
    enrolledCount === 0
      ? ` Published for ${programLabel}. No enrolled students yet — the lesson will appear when students join this training.`
      : ` Published to ${enrolledCount} student${enrolledCount === 1 ? '' : 's'} enrolled in ${programLabel}. Other trainings are not affected.`

  return {
    ok: true,
    topic: published,
    enrolledCount,
    message: `“${published.title}”${audienceNote}`,
  }
}

/** Published topics visible to an enrolled student. */
export function listPublishedTopicsForStudent(userId, email, courseContext = {}) {
  const uid = String(userId ?? '').trim()

  return listTopicDocumentation()
    .filter((row) => row.status === 'published')
    .filter((row) => canStudentViewPublishedTopic(uid, email, row, courseContext))
    .sort((a, b) => new Date(b.publishedAt ?? b.updatedAt).getTime() - new Date(a.publishedAt ?? a.updatedAt).getTime())
}

/** @returns {import('./topicDocumentationStorage.js').TopicDoc | null} */
export function getPublishedTopicForStudent(topicId, userId, email, courseContext = {}) {
  const topic = getTopicDocumentation(topicId)
  if (!topic || topic.status !== 'published') return null
  if (!canStudentViewPublishedTopic(userId, email, topic, courseContext)) return null
  return topic
}
