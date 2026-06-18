namespace TrainerPortal.Api.Models;

public sealed record TraineeTaskItem
{
    public string Id { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public DateTime DeadlineUtc { get; init; }
    public string SubmissionStatus { get; init; } = "Not Submitted";
    public string? LastSubmissionId { get; init; }
}

public sealed class TaskSubmissionRequest
{
    public string TaskId { get; set; } = string.Empty;
    public string? TaskTitle { get; set; }
    public string? BranchId { get; set; }
    public string? CourseId { get; set; }
    public string? StudentName { get; set; }
    public string? SubmissionLink { get; set; }
    public string? FileName { get; set; }
    public string? Notes { get; set; }
    public string? LegacyLocalId { get; set; }
}

public sealed class TaskSubmissionRecord
{
    public string Id { get; init; } = string.Empty;
    public string StudentId { get; init; } = string.Empty;
    public string TaskId { get; init; } = string.Empty;
    public string? TaskTitle { get; init; }
    public string? BranchId { get; init; }
    public string? CourseId { get; init; }
    public string? SubmissionLink { get; init; }
    public string? FileName { get; init; }
    public string? Notes { get; init; }
    public string Status { get; init; } = "Pending Evaluation";
    public string? Grade { get; init; }
    public string? EvaluationFeedback { get; init; }
    public string? TrainerName { get; init; }
    public DateTime? ReviewedAtUtc { get; init; }
    public string? LegacyLocalId { get; init; }
    public DateTime SubmittedAtUtc { get; init; }
}

public sealed class TrainerSubmissionInboxRecord
{
    public string Key { get; init; } = string.Empty;
    public string SubmissionId { get; init; } = string.Empty;
    public string StudentId { get; init; } = string.Empty;
    public string StudentName { get; init; } = string.Empty;
    public string StudentEmail { get; init; } = string.Empty;
    public string TaskId { get; init; } = string.Empty;
    public string TaskTitle { get; init; } = string.Empty;
    public string? TaskDescription { get; init; }
    public string? Answer { get; init; }
    public string? SubmissionLink { get; init; }
    public string? FileName { get; init; }
    public string? BranchId { get; init; }
    public string? CourseId { get; init; }
    public DateTime? SubmittedAt { get; init; }
    public string Status { get; init; } = "Pending Evaluation";
    public string? Grade { get; init; }
    public string? EvaluationFeedback { get; init; }
    public string? TrainerName { get; init; }
}

public sealed class SubmissionReviewRequest
{
    public string? Grade { get; set; }
    public string? Feedback { get; set; }
    public string? TrainerName { get; set; }
    public string? PortalUserId { get; set; }
}

public sealed class GithubValidateRequest
{
    public string RepositoryUrl { get; set; } = string.Empty;
}

public sealed class GithubValidateResponse
{
    public bool IsValid { get; init; }
    public string Message { get; init; } = string.Empty;
    public string? NormalizedUrl { get; init; }
}

public sealed class InternshipProgram
{
    public string Id { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Company { get; init; } = string.Empty;
    public string Specialization { get; init; } = string.Empty;
    public string TrainingType { get; init; } = string.Empty;
    public string Summary { get; init; } = string.Empty;
    public DateTime OpensOnUtc { get; init; }
    public DateTime ClosesOnUtc { get; init; }
}

public sealed class InternshipApplicationRequest
{
    public string ProgramId { get; set; } = string.Empty;
    public string? CoverLetter { get; set; }
    public string? CvFileName { get; set; }
}

public sealed class InternshipApplicationRecord
{
    public string Id { get; init; } = string.Empty;
    public string StudentId { get; init; } = string.Empty;
    public string ProgramId { get; init; } = string.Empty;
    public string Status { get; init; } = "Pending";
    public string? CoverLetter { get; init; }
    public string? CvFileName { get; init; }
    public DateTime CreatedAtUtc { get; init; }
    public IReadOnlyList<ApplicationTimelineStep> Timeline { get; init; } = [];
}

public sealed class ApplicationTimelineStep
{
    public string Label { get; init; } = string.Empty;
    public string State { get; init; } = string.Empty;
    public DateTime AtUtc { get; init; }
}

public sealed class StudentDashboardStats
{
    public int ActiveInternships { get; init; }
    public int CompletedTasks { get; init; }
    public int PendingTasks { get; init; }
    public int FeedbackReceived { get; init; }
}

public sealed class TrainerFeedbackItem
{
    public string Id { get; init; } = string.Empty;
    public string? TaskId { get; init; }
    public string? BranchId { get; init; }
    public string? CourseId { get; init; }
    public string TaskTitle { get; init; } = string.Empty;
    public string TrainerName { get; init; } = string.Empty;
    public string Comment { get; init; } = string.Empty;
    public string? Grade { get; init; }
    public DateTime AtUtc { get; init; }
}

public sealed class CreateTrainerFeedbackRequest
{
    public string StudentId { get; set; } = string.Empty;
    public string? TaskId { get; set; }
    public string? SubmissionId { get; set; }
    public string? BranchId { get; set; }
    public string? CourseId { get; set; }
    public string Comment { get; set; } = string.Empty;
    public string? Grade { get; set; }
    public string? TrainerName { get; set; }
    public string? LegacyLocalId { get; set; }
}

public sealed class TrainingProgressSummary
{
    public int CompletionPercent { get; init; }
    public int AttendancePercent { get; init; }
    public double PerformanceScore { get; init; }
    public IReadOnlyList<ActivityPoint> WeeklyActivity { get; init; } = [];
}

public sealed class ActivityPoint
{
    public string Label { get; init; } = string.Empty;
    public double Units { get; init; }
}
