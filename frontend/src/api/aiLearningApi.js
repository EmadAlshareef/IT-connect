import { apiClient, isLocalOnlySession } from './authApi.js'
import { AI_TUTOR_HISTORY_LIMIT } from '../utils/aiTutorSystemPrompt.js'

function buildOfflineReply(message, courseTitle = '', studentName = '', history = []) {
  const course = courseTitle || 'your course'
  const student = studentName || 'there'
  const lower = String(message ?? '').toLowerCase()
  const priorUser = [...history].reverse().find((row) => row.role === 'user')?.content ?? ''

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('مرحب')) {
    return (
      `Hi ${student}! I'm your AI tutor for **${course}**.\n\n` +
      `Ask about concepts, tasks, debugging, or study strategies — I'll keep our conversation context in mind.\n\n` +
      `What would you like to work on?`
    )
  }

  if (priorUser && (lower.includes('yes') || lower.includes('more') || lower.includes('continue') || lower.includes('that'))) {
    return (
      'Got it — building on what we discussed:\n\n' +
      '1. What part is still unclear?\n' +
      '2. What have you tried so far?\n' +
      '3. What result did you expect vs. what happened?\n\n' +
      "Share those details and I'll guide you step by step."
    )
  }

  if (lower.includes('help') || lower.includes('stuck') || lower.includes('مساعد')) {
    return (
      "Let's break this down:\n\n" +
      '1. **Goal** — what are you trying to achieve?\n' +
      '2. **Context** — what do you already know?\n' +
      '3. **Next step** — one small action you can try now\n\n' +
      'Tell me your answers and we will continue from there.'
    )
  }

  if (lower.includes('debug') || lower.includes('error') || lower.includes('bug')) {
    return (
      '**Debugging steps:**\n\n' +
      '- Read the full error (file + line)\n' +
      '- Reproduce with the smallest example\n' +
      '- Check what changed recently\n' +
      '- Test one fix at a time\n\n' +
      'Paste the error and what you expected — I will help you interpret it.'
    )
  }

  if (lower.includes('react') || lower.includes('component') || lower.includes('hook')) {
    return (
      'React components render UI from **props** and **state**.\n\n' +
      '- `useState` — data that changes over time\n' +
      '- `useEffect` — side effects after render\n\n' +
      'What are you building? I can suggest structure and next steps.'
    )
  }

  if (lower.includes('api') || lower.includes('rest') || lower.includes('endpoint')) {
    return (
      'REST APIs use HTTP methods to exchange data.\n\n' +
      'Sketch: **URL** → **request** → **expected response** → **errors**\n\n' +
      'Which endpoint or integration are you working on?'
    )
  }

  if (lower.includes('compare') || lower.includes('difference') || lower.includes('vs')) {
    return (
      'To compare approaches, I need a bit more context:\n\n' +
      '- What two options are you choosing between?\n' +
      '- What matters most (speed, simplicity, scalability)?\n\n' +
      'I will outline trade-offs and recommend one.'
    )
  }

  return (
    `Good question about **${course}**.\n\n` +
    'Here is a practical way forward:\n\n' +
    '1. Restate the problem in your own words\n' +
    '2. Name one concrete example\n' +
    '3. Try a small step before the full solution\n\n' +
    'Share more detail about what confuses you and I will walk through it with you.'
  )
}

function readLocalHistory(userId, branchId, courseId) {
  if (!userId || !branchId || !courseId) return []
  try {
    const raw = localStorage.getItem(`ts-ai-tutor-${userId}-${branchId}-${courseId}`)
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocalHistory(userId, branchId, courseId, messages) {
  if (!userId || !branchId || !courseId) return
  try {
    localStorage.setItem(`ts-ai-tutor-${userId}-${branchId}-${courseId}`, JSON.stringify(messages))
  } catch {
    /* ignore */
  }
}

export function loadAiTutorHistory(userId, branchId, courseId) {
  return readLocalHistory(userId, branchId, courseId)
}

export function saveAiTutorHistory(userId, branchId, courseId, messages) {
  writeLocalHistory(userId, branchId, courseId, messages)
}

export function clearAiTutorHistory(userId, branchId, courseId) {
  try {
    localStorage.removeItem(`ts-ai-tutor-${userId}-${branchId}-${courseId}`)
  } catch {
    /* ignore */
  }
}

export async function sendAiTutorMessage(token, payload) {
  const { courseTitle, studentName, message, history = [] } = payload
  const trimmedHistory = history.slice(-AI_TUTOR_HISTORY_LIMIT)
  const offline = () => ({
    reply: buildOfflineReply(message, courseTitle, studentName, trimmedHistory),
    source: 'local',
  })

  if (isLocalOnlySession(token)) {
    return offline()
  }

  try {
    const { branchId, courseId } = payload
    const { data } = await apiClient.post(
      '/LearningAssistant/chat',
      {
        message,
        branchId,
        courseId,
        courseTitle,
        studentName,
        history: trimmedHistory.map((row) => ({
          role: row.role,
          content: row.content,
        })),
      },
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: { branchId, courseId },
        timeout: 20000,
      },
    )
    const reply = String(data?.reply ?? '').trim()
    if (!reply) return offline()
    return { reply, source: data?.source ?? 'api' }
  } catch {
    return offline()
  }
}
