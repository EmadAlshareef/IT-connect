import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, Gauge } from 'lucide-react'
import { fetchTrainingProgress } from '../../api/studentPortalApi.js'

function ProgressBar({ label, value, hint }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-sky-500 to-emerald-400"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  )
}

function StudentProgressPage() {
  const { token, userId } = useOutletContext()
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setError('')
        const data = await fetchTrainingProgress(token, userId)
        if (!cancelled) setProgress(data)
      } catch {
        if (!cancelled) setError('Unable to load training analytics.')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token, userId])

  const chartData = (progress?.weeklyActivity ?? []).map((point) => ({
    name: point.label,
    activity: Math.round(point.units * 10) / 10,
  }))

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Training progress</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
            Visualize completion, attendance-style activity, and weekly engagement. Analytics hydrate from{' '}
            <span className="font-mono text-[11px]">GET /StudentDashboard/progress</span> and stay synchronized with your task
            repository state.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Gauge className="h-4 w-4" aria-hidden />
            <p className="font-semibold">Performance snapshot</p>
          </div>
          <p className="mt-2 text-xs leading-5">
            Score is a normalized index (0-10) derived from completion velocity and review outcomes.
          </p>
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Performance analytics</p>
          <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">Weekly activity</h2>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                  contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0' }}
                />
                <Bar dataKey="activity" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="space-y-5 rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-950">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Activity className="h-5 w-5 text-violet-500" aria-hidden />
            <h2 className="text-lg font-bold">Core KPIs</h2>
          </div>
          <ProgressBar label="Completion" value={progress?.completionPercent ?? 0} hint="Based on submitted vs. outstanding tasks." />
          <ProgressBar label="Attendance / activity" value={progress?.attendancePercent ?? 0} hint="Synthetic blend of check-ins and submissions." />
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Performance score</p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
              {progress ? progress.performanceScore.toFixed(1) : '—'}
              <span className="text-base font-semibold text-slate-500"> /10</span>
            </p>
          </div>
        </article>
      </section>
    </div>
  )
}

export default StudentProgressPage
