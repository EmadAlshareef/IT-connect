import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { fadeUp, staggerItem, staggerParent } from '../components/home/homeAnimations.js'
import { btnPrimary, cardPlayful, formInput, linkAccent } from '../components/home/homeTheme.js'
import { STUDENT_LANDING_PATH } from '../components/nav/training-sphere/navConstants.js'
import { useAuth } from '../context/useAuth.js'

function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect')
  const sessionExpired = searchParams.get('expired') === '1'

  const [formData, setFormData] = useState({ email: '', password: '' })
  const [needsVerification, setNeedsVerification] = useState(false)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = () => {
    const nextErrors = {}
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!formData.email.trim()) {
      nextErrors.email = 'Email is required.'
    } else if (!emailRegex.test(formData.email.trim())) {
      nextErrors.email = 'Please provide a valid email address.'
    }

    if (!formData.password.trim()) {
      nextErrors.password = 'Password is required.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: '' }))
    setApiError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setIsSubmitting(true)
      const result = await login(formData.email.trim(), formData.password.trim())

      if (!result.success) {
        setNeedsVerification(Boolean(result.requiresEmailVerification))
        setApiError(result.message || 'Invalid email or password')
        return
      }
      setNeedsVerification(false)

      const role = (result.user?.role ?? '').toLowerCase()
      const safeRedirect =
        redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : null

      if (role === 'admin') {
        navigate(safeRedirect && safeRedirect.startsWith('/admin') ? safeRedirect : '/admin')
        return
      }
      if (role === 'student') {
        if (safeRedirect) {
          navigate(safeRedirect)
          return
        }
        navigate(STUDENT_LANDING_PATH)
        return
      }
      if (role === 'company') {
        navigate('/company/dashboard')
        return
      }

      navigate('/dashboard')
    } catch {
      setApiError('Unable to reach the authentication service.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-[calc(100dvh-5rem)] items-center justify-center bg-[#FFF9F2] font-display px-4 py-10 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100 sm:px-6">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className={`w-full max-w-md p-6 sm:p-8 ${cardPlayful}`}
      >
        <div>
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">IT Connect</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Sign in for trainers and students</p>
            {sessionExpired ? (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                Your session expired. Please sign in again.
              </p>
            ) : null}
          </div>

          <motion.form
            onSubmit={handleSubmit}
            className="space-y-4"
            noValidate
            variants={staggerParent}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={staggerItem}>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                className={formInput}
              />
              {errors.email ? <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.email}</p> : null}
            </motion.div>

            <motion.div variants={staggerItem}>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                className={formInput}
              />
              {errors.password ? <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.password}</p> : null}
              <p className="mt-2 text-right text-xs">
                <Link to="/forgot-password" className={linkAccent}>
                  Forgot password?
                </Link>
              </p>
            </motion.div>

            {needsVerification ? (
              <p className="text-center text-xs text-slate-600 dark:text-slate-400">
                <Link to="/verify-email" className={linkAccent}>
                  Resend verification email
                </Link>
              </p>
            ) : null}

            {apiError ? (
              <motion.p
                variants={staggerItem}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
              >
                {apiError}
              </motion.p>
            ) : null}

            <motion.div variants={staggerItem}>
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: isSubmitting ? 1 : 1.01 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.99 }}
                transition={{ type: 'spring', stiffness: 520, damping: 28 }}
                className={`w-full disabled:cursor-not-allowed disabled:opacity-70 ${btnPrimary}`}
              >
                {isSubmitting ? 'Signing in...' : 'Login'}
              </motion.button>
            </motion.div>
          </motion.form>

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            Need an account?{' '}
            <Link
              to="/register"
              className={linkAccent}
            >
              Create one
            </Link>
          </p>

          <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
            Return to{' '}
            <Link to="/" className={linkAccent}>
              home
            </Link>
          </p>
        </div>
      </motion.div>
    </main>
  )
}

export default LoginPage
