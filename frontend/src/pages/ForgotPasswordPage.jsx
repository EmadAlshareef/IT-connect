import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/authApi.js'
import { btnPrimary, cardPlayful, formInput, linkAccent } from '../components/home/homeTheme.js'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!email.trim()) {
      setError('Email is required.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await forgotPassword(email.trim())
      if (result.success) {
        setMessage(result.message)
      } else {
        setError(result.message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-[calc(100dvh-5rem)] items-center justify-center bg-[#FFF9F2] font-display px-4 py-10 sm:px-6">
      <div className={`w-full max-w-md p-6 sm:p-8 ${cardPlayful}`}>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Forgot password</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Enter your email and we will send reset instructions if an account exists.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={formInput}
              autoComplete="email"
              disabled={isSubmitting}
            />
          </div>

          {error ? <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
          {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">{message}</p> : null}

          <button type="submit" disabled={isSubmitting} className={`w-full disabled:opacity-70 ${btnPrimary}`}>
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link to="/login" className={linkAccent}>
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  )
}

export default ForgotPasswordPage
