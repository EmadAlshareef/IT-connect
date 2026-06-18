let snapshot = []

export function setEnrollmentApplicationsSnapshot(rows) {
  snapshot = Array.isArray(rows) ? rows.map((row) => ({ ...row })) : []
}

export function getEnrollmentApplicationsSnapshot() {
  return [...snapshot]
}

export function isApplicationApproved(record) {
  return String(record?.status ?? '').toLowerCase() === 'approved'
}

/** Approved students for a catalog course — from SQL snapshot. */
export function listApprovedApplicationsForCourse(branchId, courseId) {
  const bid = String(branchId ?? '').trim()
  const cid = String(courseId ?? '').trim()
  if (!bid || !cid) return []
  return snapshot
    .filter(
      (row) =>
        String(row.branchId) === bid && String(row.courseId) === cid && isApplicationApproved(row),
    )
    .sort(
      (a, b) =>
        new Date(b.reviewedAtUtc ?? b.updatedAtUtc).getTime() -
        new Date(a.reviewedAtUtc ?? a.updatedAtUtc).getTime(),
    )
}
