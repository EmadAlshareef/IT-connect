import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Clock, FileUp, Loader2, Upload } from 'lucide-react'
import {
  ENROLLMENT_APPLICATIONS_CHANGED_EVENT,
  fetchCourseEnrollmentApplication,
  isApplicationApproved,
  isApplicationPending,
  isApplicationRejected,
  submitEnrollmentApplication,
  validateCvFile,
} from '../../api/enrollmentApplicationApi.js'
import { useAuth } from '../../context/useAuth.js'
import {
  getCourseAccessState,
  syncEnrollmentOnboardingFromApplication,
} from '../../utils/courseEnrollmentAccess.js'
import { hasCatalogEnrollmentRecord } from '../../utils/trainingCatalogEnrollment.js'
import { resolveCourseTrainer } from '../../utils/resolveCourseTrainer.js'
import { invalidateStudentTrainingAccess } from '../../utils/studentTrainingAccess.js'

const INITIAL_FORM = {
  motivationReason: '',
  universityName: '',
  major: '',
  gpa: '',
  previousStudies: '',
}

function StatusBanner({ onboarding, application }) {
  if (isApplicationApproved(application) || onboarding === 'approved') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-900/50 dark:bg-emerald-950/40">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <div>
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">Application approved</p>
            <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
              You have full access to this course and your trainee workspace.
            </p>
            <Link
              to="/student/home"
              className="mt-3 inline-flex text-sm font-semibold text-emerald-700 underline underline-offset-2 dark:text-emerald-300"
            >
              Open trainee dashboard →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (isApplicationRejected(application) || onboarding === 'rejected') {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 dark:border-rose-900/50 dark:bg-rose-950/40">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-rose-600 dark:text-rose-400" aria-hidden />
          <div>
            <p className="font-semibold text-rose-900 dark:text-rose-100">Application not approved</p>
            <p className="mt-1 text-sm text-rose-800 dark:text-rose-200">
              {application?.rejectionReason ??
                'Your instructor did not approve this enrollment. You cannot access course content.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isApplicationPending(application) || onboarding === 'pending') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-900/50 dark:bg-amber-950/40">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-100">Pending instructor review</p>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
              Your application was submitted. You will get access after your trainer approves it.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}

function StudentEnrollmentApplicationPage() {
  const { notify, token, userId, trainerName, email } = useOutletContext()
  const { role } = useAuth()
  const [searchParams] = useSearchParams()
  const branchId = String(searchParams.get('branchId') ?? '').trim()
  const courseId = String(searchParams.get('courseId') ?? '').trim()
  const courseTitleParam = String(searchParams.get('title') ?? '').trim()

  const meta = useMemo(() => resolveCourseTrainer(branchId, courseId), [branchId, courseId])
  const courseTitle = courseTitleParam || meta.courseTitle || 'Training program'

  const [form, setForm] = useState(INITIAL_FORM)
  const [cvFile, setCvFile] = useState(null)
  const [cvError, setCvError] = useState('')
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [application, setApplication] = useState(null)
  const [access, setAccess] = useState({ enrolled: false, onboarding: 'none' })

  const reload = useCallback(async () => {
    if (!userId || !branchId || !courseId) {
      setLoading(false)
      return
    }
    setAccess(getCourseAccessState(userId, branchId, courseId))
    try {
      const result = await fetchCourseEnrollmentApplication(token, userId, branchId, courseId)
      const record = result.record ?? null
      setApplication(record)
      if (record) syncEnrollmentOnboardingFromApplication(userId, branchId, courseId, record)
      setAccess(getCourseAccessState(userId, branchId, courseId))
    } catch {
      setFormError('Unable to load application status.')
    } finally {
      setLoading(false)
    }
  }, [branchId, courseId, token, userId])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    const onChange = () => void reload()
    window.addEventListener(ENROLLMENT_APPLICATIONS_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(ENROLLMENT_APPLICATIONS_CHANGED_EVENT, onChange)
  }, [reload])

  if (String(role ?? '').toLowerCase() !== 'student') {
    return <Navigate to="/login" replace />
  }

  if (!branchId || !courseId) {
    return <Navigate to="/student/internships" replace />
  }

  if (!loading && !hasCatalogEnrollmentRecord(userId, branchId, courseId)) {
    return (
      <Navigate
        to={`/services/training/${branchId}/${courseId}`}
        replace
        state={{ needEnrollment: true }}
      />
    )
  }

  const showForm =
    !application &&
    access.onboarding !== 'pending' &&
    access.onboarding !== 'approved' &&
    access.onboarding !== 'rejected'

  const validateForm = () => {
    if (!form.motivationReason.trim()) return 'Please explain why you want to join this course.'
    if (!form.universityName.trim()) return 'University name is required.'
    if (!form.major.trim()) return 'Major / field of study is required.'
    if (!form.gpa.trim()) return 'GPA / university average is required.'
    if (!form.previousStudies.trim()) return 'Previous studies or background is required.'
    const cvMsg = validateCvFile(cvFile)
    if (cvMsg) return cvMsg
    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    setCvError('')
    const validation = validateForm()
    if (validation) {
      setFormError(validation)
      return
    }

    setSubmitting(true)
    setUploadProgress(0)
    try {
      const result = await submitEnrollmentApplication(
        token,
        userId,
        email,
        trainerName,
        {
          branchId,
          courseId,
          courseTitle,
          trainerId: meta.trainerId,
          trainerEmail: meta.trainerEmail,
          trainerName: meta.trainerName,
          motivationReason: form.motivationReason.trim(),
          universityName: form.universityName.trim(),
          major: form.major.trim(),
          gpa: form.gpa.trim(),
          previousStudies: form.previousStudies.trim(),
        },
        cvFile,
        setUploadProgress,
      )
      const record = result.record
      syncEnrollmentOnboardingFromApplication(userId, branchId, courseId, {
        ...record,
        status: 'pending',
      })
      setApplication(record)
      invalidateStudentTrainingAccess()
      notify({
        title: 'Application submitted',
        message: 'Your instructor will review your enrollment request.',
        tone: 'success',
      })
    } catch (err) {
      setFormError(err.message ?? 'Submission failed. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
          Course onboarding
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Enrollment application</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Complete this required form for <span className="font-semibold text-slate-800 dark:text-slate-200">{courseTitle}</span>.
          Your assigned instructor must approve before you can access course content.
        </p>
        {meta.trainerName ? (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Reviewer: {meta.trainerName}
            {meta.trainerEmail ? ` · ${meta.trainerEmail}` : ''}
          </p>
        ) : null}
      </header>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading application…
        </p>
      ) : (
        <>
          <StatusBanner onboarding={access.onboarding} application={application} />

          {showForm ? (
            <form
              onSubmit={handleSubmit}
              className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <div>
                <label htmlFor="motivation" className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Why do you want to join this course? <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="motivation"
                  required
                  rows={4}
                  value={form.motivationReason}
                  onChange={(e) => setForm((p) => ({ ...p, motivationReason: e.target.value }))}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="university" className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                    University name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="university"
                    required
                    value={form.universityName}
                    onChange={(e) => setForm((p) => ({ ...p, universityName: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label htmlFor="major" className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Major / field of study <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="major"
                    required
                    value={form.major}
                    onChange={(e) => setForm((p) => ({ ...p, major: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="gpa" className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  GPA / university average <span className="text-rose-500">*</span>
                </label>
                <input
                  id="gpa"
                  required
                  value={form.gpa}
                  onChange={(e) => setForm((p) => ({ ...p, gpa: e.target.value }))}
                  placeholder="e.g. 3.6 / 4.0"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div>
                <label htmlFor="background" className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Previous studies or relevant background <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="background"
                  required
                  rows={3}
                  value={form.previousStudies}
                  onChange={(e) => setForm((p) => ({ ...p, previousStudies: e.target.value }))}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div>
                <label htmlFor="cv" className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  CV upload (PDF, DOC, DOCX) <span className="text-rose-500">*</span>
                </label>
                <label
                  htmlFor="cv"
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-950/50"
                >
                  <span className="truncate text-slate-600 dark:text-slate-300">
                    {cvFile ? cvFile.name : 'Choose file'}
                  </span>
                  <FileUp className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                </label>
                <input
                  id="cv"
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null
                    setCvFile(file)
                    setCvError(file ? validateCvFile(file) : 'CV upload is required.')
                  }}
                />
                {cvError ? <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">{cvError}</p> : null}
              </div>

              {submitting && uploadProgress > 0 ? (
                <div>
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>Uploading CV…</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : null}

              {formError ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
                  {formError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60 dark:bg-indigo-500"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
                {submitting ? 'Submitting application…' : 'Submit for instructor review'}
              </button>
            </form>
          ) : null}
        </>
      )}
    </div>
  )
}

export default StudentEnrollmentApplicationPage
