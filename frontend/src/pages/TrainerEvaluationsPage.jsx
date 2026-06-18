import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { traineeEvaluations } from '../data/evaluations.js'
import { fetchEvaluations, mapEvaluationItemToUi } from '../api/catalogApi.js'
import { countPendingTasks } from '../utils/evaluationStorage.js'

function TrainerEvaluationsPage() {
  const navigate = useNavigate()
  const { role } = useAuth()
  const [rows, setRows] = useState(traineeEvaluations)

  useEffect(() => {
    let cancelled = false
    fetchEvaluations()
      .then((data) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return
        setRows(
          data.map((e) => ({
            id: e.studentLegacyId || e.id,
            trainee: e.traineeName,
            tasks: (e.tasks ?? []).map(mapEvaluationItemToUi),
          })),
        )
      })
      .catch(() => {
        /* keep static seed */
      })
    return () => {
      cancelled = true
    }
  }, [])

  if ((role ?? '').toLowerCase() === 'admin') {
    return <Navigate to="/admin" replace />
  }

  return (
    <main className="min-h-dvh bg-[#FFF9F2] font-display text-slate-800 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">Evaluations</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Review trainee submissions and evaluate pending tasks.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 focus-visible:outline focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200 dark:focus-visible:ring-offset-slate-950"
          >
            Back to Dashboard
          </button>
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          {rows.map((row) => (
            <article
              key={row.id}
              className="flex flex-col gap-4 border-b border-slate-100 p-4 last:border-b-0 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{row.trainee}</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{row.tasks[0]?.title || 'No tasks assigned yet'}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {countPendingTasks(row.id, row.tasks)} pending
                </span>
                <Link
                  to={`/dashboard/evaluate/${row.id}`}
                  className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-violet-600/25 transition hover:bg-violet-500 dark:bg-violet-500 dark:hover:bg-violet-400"
                >
                  Evaluate
                </Link>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}

export default TrainerEvaluationsPage
