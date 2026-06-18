/** Default instructor for catalog trainings without an explicit trainer email. */
export const PLATFORM_DEFAULT_TRAINER = {
  trainerId: 'trainer-2003',
  trainerEmail: 'trainer2003@gmail.com',
  trainerName: 'Trainer User',
}

export function withDefaultTrainer(meta = {}) {
  return {
    trainerId: String(meta.trainerId ?? '').trim() || PLATFORM_DEFAULT_TRAINER.trainerId,
    trainerEmail: String(meta.trainerEmail ?? '').trim().toLowerCase() || PLATFORM_DEFAULT_TRAINER.trainerEmail,
    trainerName: String(meta.trainerName ?? '').trim() || PLATFORM_DEFAULT_TRAINER.trainerName,
  }
}

export function trainerOwnsEnrollmentApplication(row, trainerEmail, trainerId = '') {
  const email = String(trainerEmail ?? '').trim().toLowerCase()
  const tid = String(trainerId ?? '').trim()
  const rowEmail = String(row?.trainerEmail ?? '').trim().toLowerCase()
  const rowId = String(row?.trainerId ?? '').trim()

  if (email && rowEmail && rowEmail === email) return true
  if (tid && rowId && rowId === tid) return true

  const isDefaultTrainer =
    email === PLATFORM_DEFAULT_TRAINER.trainerEmail || tid === PLATFORM_DEFAULT_TRAINER.trainerId
  if (isDefaultTrainer && !rowEmail) return true

  return false
}

export function normalizeEnrollmentApplicationTrainer(row) {
  if (!row) return row
  const trainer = withDefaultTrainer(row)
  return {
    ...row,
    ...trainer,
  }
}
