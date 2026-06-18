using TrainerPortal.Student.Application.Dtos;

namespace TrainerPortal.Student.Application.Contracts;

public interface IStudentAuthService
{
    Task<AuthStudentResponse> RegisterAsync(RegisterStudentRequest request, CancellationToken ct = default);
    Task<AuthStudentResponse> LoginAsync(LoginStudentRequest request, CancellationToken ct = default);
}

public interface IStudentProfileService
{
    Task<StudentProfileDto> GetProfileAsync(Guid studentId, CancellationToken ct = default);
    Task<StudentProfileDto> UpdateProfileAsync(Guid studentId, UpdateStudentProfileRequest request, CancellationToken ct = default);
    Task<GithubValidateResponse> ValidateAndSaveGithubRepoAsync(Guid studentId, string repositoryUrl, CancellationToken ct = default);
}

public interface IStudentInternshipBrowseService
{
    Task<IReadOnlyList<InternshipListItemDto>> BrowseAsync(string? specialization, string? company, CancellationToken ct = default);
    Task<InternshipDetailDto?> GetDetailAsync(Guid internshipId, CancellationToken ct = default);
}

public interface IStudentApplicationService
{
    Task<ApplicationDto> ApplyAsync(Guid studentId, ApplyInternshipRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<ApplicationDto>> ListMineAsync(Guid studentId, CancellationToken ct = default);
    Task<ApplicationDto?> GetStatusAsync(Guid studentId, Guid applicationId, CancellationToken ct = default);
}

public interface IStudentTaskService
{
    Task<IReadOnlyList<TaskListItemDto>> ListAssignedAsync(Guid studentId, CancellationToken ct = default);
    Task<SubmissionDto> SubmitAsync(Guid studentId, Guid taskId, SubmitTaskRequest request, CancellationToken ct = default);
}

public interface IStudentFeedbackService
{
    Task<IReadOnlyList<FeedbackItemDto>> ListFeedbackAsync(Guid studentId, CancellationToken ct = default);
}

public interface IStudentProgressService
{
    Task<DashboardStatsDto> GetDashboardStatsAsync(Guid studentId, CancellationToken ct = default);
    Task<ProgressSummaryDto> GetProgressAsync(Guid studentId, CancellationToken ct = default);
}
