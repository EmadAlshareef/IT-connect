namespace TrainerPortal.Api.Services;

public sealed record CourseAccessDecision(
    bool CanAccess,
    string Status,
    string? RejectionReason,
    string? BranchId,
    string? CourseId);

public interface ICourseAccessAuthorizationService
{
    CourseAccessDecision Resolve(string studentId, string? branchId, string? courseId);

    void EnsureCanAccessCourseContent(string studentId, string? branchId, string? courseId);
}
