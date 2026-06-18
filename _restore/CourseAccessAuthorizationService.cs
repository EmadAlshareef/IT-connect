using TrainerPortal.Api.Models;

namespace TrainerPortal.Api.Services;

public sealed class CourseAccessAuthorizationService(IEnrollmentApplicationService applications) : ICourseAccessAuthorizationService
{
    public CourseAccessDecision Resolve(string studentId, string? branchId, string? courseId)
    {
        var bid = branchId?.Trim() ?? string.Empty;
        var cid = courseId?.Trim() ?? string.Empty;

        if (!string.IsNullOrEmpty(bid) && !string.IsNullOrEmpty(cid))
        {
            var app = applications.GetForStudentCourse(studentId, bid, cid);
            if (app is null)
            {
                return new CourseAccessDecision(false, "none", null, bid, cid);
            }

            var status = app.Status.Trim().ToLowerInvariant();
            return new CourseAccessDecision(
                status == EnrollmentApplicationStatuses.Approved,
                status,
                app.RejectionReason,
                bid,
                cid);
        }

        var approved = applications.ListForStudent(studentId)
            .FirstOrDefault(a => a.Status.Equals(EnrollmentApplicationStatuses.Approved, StringComparison.OrdinalIgnoreCase));

        if (approved is not null)
        {
            return new CourseAccessDecision(true, EnrollmentApplicationStatuses.Approved, null, approved.BranchId, approved.CourseId);
        }

        var pending = applications.ListForStudent(studentId)
            .FirstOrDefault(a => a.Status.Equals(EnrollmentApplicationStatuses.Pending, StringComparison.OrdinalIgnoreCase));
        if (pending is not null)
        {
            return new CourseAccessDecision(false, EnrollmentApplicationStatuses.Pending, null, pending.BranchId, pending.CourseId);
        }

        var rejected = applications.ListForStudent(studentId)
            .FirstOrDefault(a => a.Status.Equals(EnrollmentApplicationStatuses.Rejected, StringComparison.OrdinalIgnoreCase));
        if (rejected is not null)
        {
            return new CourseAccessDecision(false, EnrollmentApplicationStatuses.Rejected, rejected.RejectionReason, rejected.BranchId, rejected.CourseId);
        }

        return new CourseAccessDecision(false, "none", null, null, null);
    }

    public void EnsureCanAccessCourseContent(string studentId, string? branchId, string? courseId)
    {
        var decision = Resolve(studentId, branchId, courseId);
        if (decision.CanAccess)
        {
            return;
        }

        var message = decision.Status switch
        {
            EnrollmentApplicationStatuses.Pending => "Course access denied. Your enrollment application is pending instructor approval.",
            EnrollmentApplicationStatuses.Rejected => decision.RejectionReason ?? "Course access denied. Your enrollment application was rejected.",
            _ => "Course access denied. Complete and submit your enrollment application, then wait for instructor approval.",
        };

        throw new UnauthorizedAccessException(message);
    }
}
