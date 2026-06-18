import { Sparkles } from 'lucide-react'

const GRADES = ['A', 'B', 'C', 'D', 'E', 'F']

function SubmissionReviewForm({ grade, feedback, onGradeChange, onFeedbackChange, onSubmit, disabled, saving, notice }) {
  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950/40">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Grade & feedback</h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Comments are visible to the student after you save.</p>

      <div className="mt-4 grid gap-4 md:grid-cols-[140px_1fr]">
        <div>
          <label htmlFor="submission-grade" className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">
            Grade
          </label>
          <select
            id="submission-grade"
            value={grade}
            onChange={(e) => onGradeChange(e.target.value)}
            disabled={disabled}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:focus:border-violet-500"
          >
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="submission-feedback" className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">
            Instructor comments
          </label>
          <textarea
            id="submission-feedback"
            value={feedback}
            onChange={(e) => onFeedbackChange(e.target.value)}
            rows={5}
            disabled={disabled}
            placeholder="Strengths, improvements, and next steps for the trainee…"
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:focus:border-violet-500"
          />
        </div>
      </div>

      {notice ? (
        <p
          className={`mt-4 text-sm ${notice.type === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-300'}`}
          role="status"
        >
          {notice.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={disabled || saving}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:opacity-60 dark:bg-violet-500"
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        {saving ? 'Saving…' : 'Save review'}
      </button>
    </form>
  )
}

export default SubmissionReviewForm
