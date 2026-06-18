import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Check, GraduationCap, ShieldCheck, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { registerAccount } from '../api/authApi.js'
import PasswordStrengthIndicator from '../components/auth/PasswordStrengthIndicator.jsx'
import FormTextField from '../components/forms/FormTextField.jsx'
import { fadeUp, staggerItem, staggerParent } from '../components/home/homeAnimations.js'
import { btnPrimary, cardPlayful, linkAccent, sectionEyebrow } from '../components/home/homeTheme.js'
import { STUDENT_LANDING_PATH } from '../components/nav/training-sphere/navConstants.js'
import { useAuth } from '../context/useAuth.js'
import {
  appendRegisteredMember,
  saveMemberCredential,
} from '../hooks/useRegisteredMembers.js'
import { passwordsMatch, validatePassword } from '../utils/passwordPolicy.js'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const highlights = [
  { icon: BookOpen, text: 'Browse trainings and learning tracks' },
  { icon: GraduationCap, text: 'Track your progress in one place' },
  { icon: ShieldCheck, text: 'Secure account with strong passwords' },
]

function validateFields(values) {
  const errors = {}
  const fullName = values.fullName.trim()
  const email = values.email.trim()
  const password = values.password
  const confirmPassword = values.confirmPassword

  if (!fullName) errors.fullName = 'Full name is required.'
  if (!email) errors.email = 'Email is required.'
  else if (!EMAIL_REGEX.test(email)) errors.email = 'Please enter a valid email address.'

  const policyErrors = validatePassword(password)
  if (!password) errors.password = 'Password is required.'
  else if (policyErrors.length > 0) errors.password = policyErrors.join(' ')

  const confirmError = passwordsMatch(password, confirmPassword)
  if (confirmError) errors.confirmPassword = confirmError

  return errors
}

function navigateAfterLogin(navigate, result) {
  const role = (result.user?.role ?? '').toLowerCase()
  if (role === 'admin') {
    navigate('/admin')
    return
  }
  if (role === 'student') {
    navigate(STUDENT_LANDING_PATH)
    return
  }
  if (role === 'company') {
    navigate('/company/dashboard')
    return
  }
  navigate('/dashboard')
}

function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: '', form: '' }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validateFields(formData)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const email = formData.email.trim()
    const password = formData.password

    setIsSubmitting(true)
    try {
      const result = await registerAccount({
        fullName: formData.fullName.trim(),
        email,
        password,
        confirmPassword: formData.confirmPassword,
      })

      if (result.success) {
        const loginResult = await login(email, password)
        if (loginResult.success) {
          navigateAfterLogin(navigate, loginResult)
          return
        }
        setErrors({
          form: loginResult.message ?? 'Account created but sign-in failed. Please try signing in.',
        })
        return
      }

      if (result.message?.includes('Unable to reach')) {
        appendRegisteredMember({ fullName: formData.fullName, email, role: 'student' })
        saveMemberCredential(email, password)
        const loginResult = await login(email, password)
        if (loginResult.success) {
          navigateAfterLogin(navigate, loginResult)
          return
        }
        setErrors({ form: loginResult.message ?? 'Account saved locally but sign-in failed.' })
        return
      }

      setErrors({ form: result.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const passwordsMatchOk =
    formData.confirmPassword && formData.password === formData.confirmPassword && !errors.confirmPassword

  return (
    <main className="relative flex min-h-[calc(100dvh-5rem)] items-center justify-center overflow-hidden bg-[#FFF9F2] px-4 py-10 font-display text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-violet-300/30 blur-3xl dark:bg-violet-600/15"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-fuchsia-300/25 blur-3xl dark:bg-fuchsia-600/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-56 w-56 -translate-x-1/2 rounded-full bg-orange-200/30 blur-3xl dark:bg-orange-500/10"
      />

      <div className="relative z-10 mx-auto grid w-full max-w-5xl items-stretch gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-10">
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="hidden flex-col justify-center rounded-[1.75rem] bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-8 text-white shadow-[0_24px_60px_-28px_rgba(109,40,217,0.65)] ring-1 ring-white/15 lg:flex xl:p-10"
        >
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white/90 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
            Student portal
          </span>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight xl:text-4xl">Start learning with IT Connect</h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-violet-100/95">
            Create your student account in minutes. After registration you are signed in automatically and can explore
            trainings, tracks, and your personal dashboard.
          </p>
          <ul className="mt-8 space-y-4">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-violet-50/95">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <Icon className="h-4 w-4" strokeWidth={2.25} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </motion.section>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className={`w-full p-6 sm:p-8 ${cardPlayful}`}
        >
          <div className="mb-7 text-center lg:text-left">
            <span className={`${sectionEyebrow} lg:hidden`}>Student account</span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 lg:mt-0">
              Create your account
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Join IT Connect as a student. You will be signed in automatically after registration.
            </p>
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
              <FormTextField
                id="fullName"
                name="fullName"
                label="Full name"
                value={formData.fullName}
                onChange={handleChange}
                error={errors.fullName}
                autoComplete="name"
                placeholder="Your full name"
                disabled={isSubmitting}
              />
            </motion.div>

            <motion.div variants={staggerItem}>
              <FormTextField
                id="email"
                name="email"
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                autoComplete="email"
                placeholder="you@example.com"
                disabled={isSubmitting}
              />
            </motion.div>

            <motion.div variants={staggerItem}>
              <FormTextField
                id="password"
                name="password"
                label="Password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                autoComplete="new-password"
                disabled={isSubmitting}
              />
              <PasswordStrengthIndicator password={formData.password} />
            </motion.div>

            <motion.div variants={staggerItem}>
              <FormTextField
                id="confirmPassword"
                name="confirmPassword"
                label="Confirm password"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                autoComplete="new-password"
                disabled={isSubmitting}
              />
              {passwordsMatchOk ? (
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Passwords match
                </p>
              ) : null}
            </motion.div>

            {errors.form ? (
              <motion.p
                variants={staggerItem}
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
              >
                {errors.form}
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
                {isSubmitting ? 'Creating account…' : 'Create account'}
              </motion.button>
            </motion.div>
          </motion.form>

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400 lg:text-left">
            Already have an account?{' '}
            <Link to="/login" className={linkAccent}>
              Sign in
            </Link>
          </p>

          <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400 lg:text-left">
            Return to{' '}
            <Link to="/" className={linkAccent}>
              home
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  )
}

export default RegisterPage
