import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/authApi.js'
import PasswordStrengthIndicator from '../components/auth/PasswordStrengthIndicator.jsx'
import { btnPrimary, cardPlayful, formInput, linkAccent } from '../components/home/homeTheme.js'
import { passwordsMatch, validatePassword } from '../utils/passwordPolicy.js'

function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const email = useMemo(() => searchParams.get('email') ?? '', [searchParams])
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams])

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    const policyErrors = validatePassword(password)
    if (policyErrors.length > 0) nextErrors.password = policyErrors.join(' ')
    const confirmError = passwordsMatch(password, confirmPassword)
    if (confirmError) nextErrors.confirmPassword = confirmError
    if (!email || !token) nextErrors.form = 'Invalid or expired reset link.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      const result = await resetPassword({ email, token, password, confirmPassword })
      if (result.success) {
        setMessage(result.message)
      } else {
        setErrors({ form: result.message })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-[calc(100dvh-5rem)] items-center justify-center bg-[#FFF9F2] font-display px-4 py-10 sm:px-6">
      <div className={`w-full max-w-md p-6 sm:p-8 ${cardPlayful}`}>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Reset password</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Choose a strong new password for your account.</p>

        {message ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">{message}</p>
            <Link to="/login" className={`inline-flex w-full justify-center ${btnPrimary}`}>
              Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                New password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={formInput}
                autoComplete="new-password"
                disabled={isSubmitting}
              />
              {errors.password ? <p className="mt-1 text-xs text-rose-600">{errors.password}</p> : null}
              <PasswordStrengthIndicator password={password} />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={formInput}
                autoComplete="new-password"
                disabled={isSubmitting}
              />
              {confirmPassword && !errors.confirmPassword && password === confirmPassword ? (
                <p className="mt-1 text-xs text-emerald-600">Passwords match</p>
              ) : null}
              {errors.confirmPassword ? <p className="mt-1 text-xs text-rose-600">{errors.confirmPassword}</p> : null}
            </div>

            {errors.form ? <p className="text-sm text-rose-600">{errors.form}</p> : null}

            <button type="submit" disabled={isSubmitting} className={`w-full disabled:opacity-70 ${btnPrimary}`}>
              {isSubmitting ? 'Resetting…' : 'Reset password'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm">
          <Link to="/login" className={linkAccent}>
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  )
}

export default ResetPasswordPage
