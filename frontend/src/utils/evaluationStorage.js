import { updateEvaluationItem } from '../api/catalogApi.js'

const storageKey = (traineeId) => `ts-eval-tasks-${traineeId}`

/** @deprecated legacy local cache — evaluations persist in SQL via catalog API */
export function loadTraineeTasks(traineeId, defaultTasks) {
  try {
    const raw = localStorage.getItem(storageKey(traineeId))
    if (!raw) return defaultTasks.map((t) => ({ ...t }))
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return defaultTasks.map((t) => ({ ...t }))
    return parsed
  } catch {
    return defaultTasks.map((t) => ({ ...t }))
  }
}

export async function persistTraineeTasks(traineeId, tasks) {
  for (const task of tasks) {
    if (!task?.id) continue
    try {
      await updateEvaluationItem(task.id, {
        status: task.status,
        grade: task.grade,
        feedback: task.evaluationFeedback ?? task.feedback,
        submittedOn: task.submitted ?? task.submittedOn,
        repoTag: task.tag ?? task.repoTag,
        repoBranch: task.branch ?? task.repoBranch,
      })
    } catch {
      /* keep going */
    }
  }
  try {
    localStorage.removeItem(storageKey(traineeId))
  } catch {
    /* ignore */
  }
}

export function countPendingTasks(traineeId, fallbackTasks) {
  const tasks = loadTraineeTasks(traineeId, fallbackTasks)
  return tasks.filter((t) => t.status === 'Pending Evaluation').length
}
