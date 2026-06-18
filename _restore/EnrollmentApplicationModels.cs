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
}
