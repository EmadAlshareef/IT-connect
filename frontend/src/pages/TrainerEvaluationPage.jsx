import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import CodeReviewModal from '../components/CodeReviewModal.jsx'
import { traineeEvaluations } from '../data/evaluations.js'
import {
  fetchEvaluations,
  mapEvaluationItemToUi,
  updateEvaluationItem,
} from '../api/catalogApi.js'
import { loadTraineeTasks, persistTraineeTasks } from '../utils/evaluationStorage.js'

const statusStyles = {
  Evaluated:
    'border border-violet-200 bg-white text-violet-700 dark:border-violet-800/50 dark:bg-slate-800 dark:text-violet-300',
  'Pending Evaluation':
    'border border-slate-800 bg-white text-slate-800 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-200',
  'Not Submitted':
    'border border-slate-200 bg-white text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400',
}

function TrainerEvaluationPage() {
  const { traineeId } = useParams()
  const { role } = useAuth()
  const fallbackRecord = traineeEvaluations.find((item) => item.id === traineeId)
  const [traineeRecord, setTraineeRecord] = useState(fallbackRecord ?? null)
  const [tasks, setTasks] = useState(() =>
    fallbackRecord ? loadTraineeTasks(traineeId, fallbackRecord.tasks) : [],
  )
  const [apiReady, setApiReady] = useState(false)
  const [taskToEvaluate, setTaskToEvaluate] = useState(null)
  const [taskForCodeReview, setTaskForCodeReview] = useState(null)
  const [selectedGrade, setSelectedGrade] = useState('A')
  const [feedbackText, setFeedbackText] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchEvaluations()
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return
        const row = data.find((e) => e.studentLegacyId === traineeId || e.id === traineeId)
        if (!row) return
        setTraineeRecord({
          id: row.studentLegacyId || row.id,
          trainee: row.traineeName,
          tasks: (row.tasks ?? []).map(mapEvaluationItemToUi),
        })
        setTasks((row.tasks ?? []).map(mapEvaluationItemToUi))
        setApiReady(true)
      })
      .catch(() => {
        /* static fallback */
      })
    return () => {
      cancelled = true
    }
  }, [traineeId])

  if ((role ?? '').toLowerCase() === 'admin') {
    return <Navigate to="/admin" replace />
  }

  if (!traineeRecord) {
    return <Navigate to="/dashboard" replace />
  }

  const openEvaluationModal = (task) => {
    setTaskToEvaluate(task)
    setSelectedGrade(task.grade ?? 'A')
    setFeedbackText(task.evaluationFeedback ?? '')
  }

  const closeEvaluationModal = () => {
    setTaskToEvaluate(null)
    setSelectedGrade('A')
    setFeedbackText('')
  }

  const handleSubmitEvaluation = async (event) => {
    event.preventDefault()
    if (!taskToEvaluate || !traineeRecord) return

    const title = taskToEvaluate.title
    const applyLocal = (previous) => {
      const next = previous.map((task) =>
        task.title === title &&
        (task.status === 'Pending Evaluation' || task.status === 'Evaluated')
          ? {
              ...task,
              status: 'Evaluated',
              grade: selectedGrade,
              evaluationFeedback: feedbackText.trim(),
            }
          : task,
      )
      return next
    }

    if (apiReady && taskToEvaluate.id) {
      try {
        await updateEvaluationItem(taskToEvaluate.id, {
          status: 'evaluated',
          grade: selectedGrade,
          feedback: feedbackText.trim(),
        })
        setTasks(applyLocal)
        closeEvaluationModal()
        return
      } catch {
        /* fall through to local */
      }
    }

    const next = applyLocal(tasks)
    await persistTraineeTasks(traineeRecord.id, next)
    setTasks(next)
    closeEvaluationModal()
  }

  return (
    <main className="min-h-dvh bg-[#FFF9F2] font-display text-slate-800 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          ← Back to Dashboard
        </Link>
        <section className="mt-4">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">Tasks - {traineeRecord.trainee}</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">View and evaluate assigned tasks for this student</p>
        </section>

        <section className="mt-6 space-y-4">
          {tasks.map((task) => (
            <article
              key={`${traineeRecord.id}-${task.title}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{task.title}</h2>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        statusStyles[task.status] ??
                        'border border-slate-200 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Deadline: {task.deadline}</p>
                  {task.submitted ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">Submitted: {task.submitted}</p>
                  ) : null}
                  {task.status === 'Evaluated' && task.grade ? (
                    <p className="mt-2 text-sm font-medium text-violet-700 dark:text-violet-400">Grade: {task.grade}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      # {task.tag}
                    </span>
                    <span className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {task.branch}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTaskForCodeReview(task)}
                    className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-violet-200 hover:bg-violet-50/70 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-violet-500/40 dark:hover:bg-violet-950/40"
                  >
                    View Code
                  </button>
                  <button
                    type="button"
                    disabled={task.status === 'Not Submitted'}
                    title={
                      task.status === 'Not Submitted'
                        ? 'Cannot evaluate until the student submits this task.'
                        : undefined
                    }
                    onClick={() => openEvaluationModal(task)}
                    className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-violet-600/25 hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-violet-500 dark:hover:bg-violet-400"
                  >
                    {task.status === 'Evaluated' ? 'Update evaluation' : 'Evaluate'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>

      {taskToEvaluate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 px-4 backdrop-blur-sm dark:bg-slate-950/75">
          <form
            onSubmit={handleSubmitEvaluation}
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Evaluate Task</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Provide a grade and feedback for the student's work</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Task: {taskToEvaluate.title}</p>
              </div>
              <button
                type="button"
                onClick={closeEvaluationModal}
                className="text-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="evaluation-grade" className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Grade
                </label>
                <select
                  id="evaluation-grade"
                  value={selectedGrade}
                  onChange={(event) => setSelectedGrade(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                >
                  {['A', 'B', 'C', 'D', 'E', 'F'].map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="evaluation-feedback" className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Feedback
                </label>
                <textarea
                  id="evaluation-feedback"
                  value={feedbackText}
                  onChange={(event) => setFeedbackText(event.target.value)}
                  placeholder="Provide feedback for the student..."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-violet-600/20 transition hover:bg-violet-500 dark:bg-violet-500 dark:hover:bg-violet-400"
            >
              <span aria-hidden>☆</span>
              {taskToEvaluate.status === 'Evaluated' ? 'Update evaluation' : 'Submit Evaluation'}
            </button>
          </form>
        </div>
      ) : null}

      {taskForCodeReview ? (
        <CodeReviewModal
          traineeName={traineeRecord.trainee}
          branch={taskForCodeReview.branch ?? 'main'}
          projectTag={taskForCodeReview.tag}
          taskTitle={taskForCodeReview.title}
          onClose={() => setTaskForCodeReview(null)}
        />
      ) : null}
    </main>
  )
}

export default TrainerEvaluationPage
