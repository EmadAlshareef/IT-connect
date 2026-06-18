namespace TrainerPortal.Student.Application.Dtos;

public sealed record StudentProfileDto(
    Guid Id,
    string Email,
    string FullName,
    string? Phone,
    string? University,
    string? Specialization,
    string? Bio,
    string? AvatarUrl,
    string? GithubUsername,
    string? PreferredGithubRepoUrl);

public sealed record UpdateStudentProfileRequest(
    string? FullName,
    string? Phone,
    string? University,
    string? Specialization,
    string? Bio,
    string? GithubUsername);

public sealed record InternshipListItemDto(
    Guid Id,
    string Title,
    string CompanyName,
    string? Specialization,
    string? TrainingType,
    string Summary,
    DateTime OpensOnUtc,
    DateTime ClosesOnUtc);

public sealed record InternshipDetailDto(
    Guid Id,
    string Title,
    string CompanyName,
    string? Specialization,
    string? TrainingType,
    string Summary,
    string? Description,
    string? Location,
    int SeatsTotal,
    int SeatsAvailable,
    DateTime OpensOnUtc,
    DateTime ClosesOnUtc);

public sealed record ApplyInternshipRequest(
    Guid InternshipId,
    string? CoverLetter,
    string? CvFileName);

public sealed record ApplicationTimelineStepDto(string Label, string State, DateTime AtUtc);

public sealed record ApplicationDto(
    Guid Id,
    Guid InternshipId,
    string InternshipTitle,
    string Status,
    DateTime SubmittedAtUtc,
    IReadOnlyList<ApplicationTimelineStepDto> Timeline);

public sealed record TaskListItemDto(
    Guid Id,
    string Title,
    string Description,
    DateTime DeadlineUtc,
    string SubmissionStatus,
    Guid? LastSubmissionId);

public sealed record SubmitTaskRequest(
    string? SubmissionLink,
    string? FileName,
    string? GithubRepoUrl,
    string? Notes);

public sealed record SubmissionDto(
    Guid Id,
    Guid TaskId,
    int Version,
    string Status,
    DateTime SubmittedAtUtc);

public sealed record FeedbackItemDto(
    Guid Id,
    string TaskTitle,
    string TrainerName,
    string Comment,
    string? Grade,
    DateTime AtUtc);

public sealed record DashboardStatsDto(
    int ActiveInternships,
    int CompletedTasks,
    int PendingTasks,
    int FeedbackReceived);

public sealed record ProgressSummaryDto(
    int CompletionPercent,
    int AttendancePercent,
    double PerformanceScore,
    IReadOnlyList<ActivityPointDto> WeeklyActivity);

public sealed record ActivityPointDto(string Label, double Units);

public sealed record GithubValidateRequest(string RepositoryUrl);

public sealed record GithubValidateResponse(bool IsValid, string Message, string? NormalizedUrl);
