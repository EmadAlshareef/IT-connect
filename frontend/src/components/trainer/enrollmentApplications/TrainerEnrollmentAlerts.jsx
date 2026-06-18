import { AlertCircle } from 'lucide-react'
import { buildTrainerEnrollmentRequestsUrl } from '../../../utils/trainerDashboardNav.js'
import { resolveTrainingIdForCatalogCourse } from '../../../utils/trainerEnrollmentScope.js'

function TrainerEnrollmentAlerts({ pendingByCourse, sessions = [], onReview }) {
  if (!pendingByCourse?.length) return null

  return (
    <div className="space-y-3">
      {pendingByCourse.map((group) => (
        <div
          key={`${group.branchId}-${group.courseId}`}
          className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/50 dark:bg-amber-950/40"
          role="status"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                Student{group.count > 1 ? 's' : ''} waiting for approval — {group.courseTitle}
              </p>
              <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-200/90">
                {group.count} student{group.count === 1 ? '' : 's'} submitted {group.count === 1 ? 'an' : ''}{' '}
                application and {group.count === 1 ? 'is' : 'are'} ready for you to accept or reject.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              onReview?.(
                buildTrainerEnrollmentRequestsUrl(
                  group.latestApplicationId,
                  resolveTrainingIdForCatalogCourse(group.branchId, group.courseId, sessions),
                ),
                group,
              )
            }
            className="shrink-0 rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            Review & approve
          </button>
        </div>
      ))}
    </div>
  )
}

export default TrainerEnrollmentAlerts
