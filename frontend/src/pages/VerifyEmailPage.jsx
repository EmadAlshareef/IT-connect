import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resendVerification, verifyEmail } from '../api/authApi.js'
import { btnPrimary, cardPlayful, formInput, linkAccent } from '../components/home/homeTheme.js'

function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const userId = useMemo(() => searchParams.get('userId') ?? '', [searchParams])
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams])

  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resendMessage, setResendMessage] = useState('')
  const [devVerificationUrl, setDevVerificationUrl] = useState('')

  useEffect(() => {
    if (!userId || !token) return

    let cancelled = false
    ;(async () => {
      setStatus('loading')
      const result = await verifyEmail(userId, token)
      if (cancelled) return
      setStatus(result.success ? 'success' : 'error')
      setMessage(result.message)
    })()

    return () => {
      cancelled = true
    }
  }, [userId, token])

  const handleResend = async (event) => {
    event.preventDefault()
    if (!resendEmail.trim()) return
    const result = await resendVerification(resendEmail.trim())
    setResendMessage(result.message)
    setDevVerificationUrl(result.devVerificationUrl ?? '')
  }

  return (
    <main className="flex min-h-[calc(100dvh-5rem)] items-center justify-center bg-[#FFF9F2] font-display px-4 py-10 sm:px-6">
      <div className={`w-full max-w-md p-6 sm:p-8 ${cardPlayful}`}>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Email verification</h1>

        {userId && token ? (
          <div className="mt-4">
            {status === 'loading' ? <p className="text-sm text-slate-600">Verifying your email…</p> : null}
            {status === 'success' ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">{message}</p>
            ) : null}
            {status === 'error' ? <p className="text-sm text-rose-600">{message}</p> : null}
            {status === 'success' ? (
              <Link to="/login" className={`mt-4 inline-flex w-full justify-center ${btnPrimary}`}>
                Sign in
              </Link>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Open the verification link from your email, or resend a new one below.
          </p>
        )}

        <form onSubmit={handleResend} className="mt-6 space-y-3">
          <label htmlFor="resendEmail" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Resend verification
          </label>
          <input
            id="resendEmail"
            type="email"
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
            className={formInput}
            placeholder="you@example.com"
          />
          <button type="submit" className={`w-full ${btnPrimary}`}>
            Resend email
          </button>
          {resendMessage ? <p className="text-sm text-slate-600">{resendMessage}</p> : null}
          {devVerificationUrl ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40">
              <p className="font-medium text-amber-900 dark:text-amber-200">Development verification link</p>
              <a href={devVerificationUrl} className="mt-2 block break-all text-violet-700 underline dark:text-violet-300">
                {devVerificationUrl}
              </a>
            </div>
          ) : null}
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

export default VerifyEmailPage
