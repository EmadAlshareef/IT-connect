/** Enrollment application status helpers (no API/storage imports — safe for any module). */

export function isSubmittedEnrollmentApplication(record) {
  if (!record) return false
  if (record.applicationComplete === false) return false
  return Boolean(String(record.motivationReason ?? '').trim())
}

export function isApplicationAwaitingTrainerReview(record) {
  return String(record?.status ?? '').toLowerCase() === 'pending' && isSubmittedEnrollmentApplication(record)
}

export function isApplicationEnrolledAwaitingForm(record) {
  return String(record?.status ?? '').toLowerCase() === 'pending' && !isSubmittedEnrollmentApplication(record)
}

export const isApplicationFormComplete = isSubmittedEnrollmentApplication

export function isApplicationApproved(record) {
  return String(record?.status ?? '').toLowerCase() === 'approved'
}

export function isApplicationPending(record) {
  return isApplicationAwaitingTrainerReview(record)
}

export function isApplicationRejected(record) {
  return String(record?.status ?? '').toLowerCase() === 'rejected'
}
