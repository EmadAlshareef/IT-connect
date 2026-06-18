namespace TrainerPortal.Api.Models;

public static class EnrollmentApplicationStatuses
{
    public const string Pending = "pending";
    public const string Approved = "approved";
    public const string Rejected = "rejected";
}

public sealed class EnrollmentApplicationRecord
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string BranchId { get; set; } = string.Empty;
    public string CourseId { get; set; } = string.Empty;
    public string CourseTitle { get; set; } = string.Empty;
    public string TrainerId { get; set; } = string.Empty;
    public string TrainerEmail { get; set; } = string.Empty;
    public string TrainerName { get; set; } = string.Empty;
    public string MotivationReason { get; set; } = string.Empty;
    public string UniversityName { get; set; } = string.Empty;
    public string Major { get; set; } = string.Empty;
    public string Gpa { get; set; } = string.Empty;
    public string PreviousStudies { get; set; } = string.Empty;
    public string CvFileName { get; set; } = string.Empty;
    public string CvFileUrl { get; set; } = string.Empty;
    public string Status { get; set; } = EnrollmentApplicationStatuses.Pending;
    public string? RejectionReason { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }
    public string? ReviewedBy { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

public sealed class StartEnrollmentApplicationRequest
{
    public string BranchId { get; set; } = string.Empty;
    public string CourseId { get; set; } = string.Empty;
    public string CourseTitle { get; set; } = string.Empty;
    public string TrainerId { get; set; } = string.Empty;
    public string TrainerEmail { get; set; } = string.Empty;
    public string TrainerName { get; set; } = string.Empty;
}

public sealed class SubmitEnrollmentApplicationRequest
{
    public string BranchId { get; set; } = string.Empty;
    public string CourseId { get; set; } = string.Empty;
    public string CourseTitle { get; set; } = string.Empty;
    public string TrainerId { get; set; } = string.Empty;
    public string TrainerEmail { get; set; } = string.Empty;
    public string TrainerName { get; set; } = string.Empty;
    public string MotivationReason { get; set; } = string.Empty;
    public string UniversityName { get; set; } = string.Empty;
    public string Major { get; set; } = string.Empty;
    public string Gpa { get; set; } = string.Empty;
    public string PreviousStudies { get; set; } = string.Empty;
}

public sealed class RejectEnrollmentApplicationRequest
{
    public string? RejectionReason { get; set; }
}

public sealed class PortalNotificationRecord
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Tone { get; set; } = "info";
    public bool IsRead { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    /** e.g. enrollment_request */
    public string Type { get; set; } = string.Empty;
    public string? ApplicationId { get; set; }
    public string? BranchId { get; set; }
    public string? CourseId { get; set; }
    public string? CourseTitle { get; set; }
    /** Trainer dashboard view id to open when clicked. */
    public string TargetView { get; set; } = "enrollment-requests";
    public string? SubmissionId { get; set; }
    public string? TopicId { get; set; }
    public string? StudentId { get; set; }
    public string? StudentName { get; set; }
    public string? TrainingId { get; set; }
    public string? TargetPath { get; set; }
    public string? LegacyLocalId { get; set; }
}

public sealed class CreatePortalNotificationRequest
{
    public string UserId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Tone { get; set; } = "info";
    public string Type { get; set; } = string.Empty;
    public string? ApplicationId { get; set; }
    public string? BranchId { get; set; }
    public string? CourseId { get; set; }
    public string? CourseTitle { get; set; }
    public string TargetView { get; set; } = "enrollment-requests";
    public string? SubmissionId { get; set; }
    public string? TopicId { get; set; }
    public string? StudentId { get; set; }
    public string? TrainingId { get; set; }
    public string? TargetPath { get; set; }
    public string? LegacyLocalId { get; set; }
}
