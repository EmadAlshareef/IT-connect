const cvStorageKey = (userId) => `ts-student-profile-cv-${userId}`

export async function saveStudentProfileCv(userId, file) {
  if (!userId || !file) return null
  const dataUrl = await readFileAsDataUrl(file)
  const record = {
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    dataUrl,
    uploadedAtUtc: new Date().toISOString(),
  }
  localStorage.setItem(cvStorageKey(userId), JSON.stringify(record))
  return record
}

export function readStudentProfileCv(userId) {
  if (!userId) return null
  try {
    const raw = localStorage.getItem(cvStorageKey(userId))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearStudentProfileCv(userId) {
  if (!userId) return
  localStorage.removeItem(cvStorageKey(userId))
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Unable to read CV file.'))
    reader.readAsDataURL(file)
  })
}
