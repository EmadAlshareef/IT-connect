namespace TrainerPortal.Api.Models;

public sealed class TrainerTaskBriefDto
{
    public string Id { get; set; } = string.Empty;
    public string RequestedByEmail { get; set; } = string.Empty;
    public string? TrainerName { get; set; }
    public string SessionId { get; set; } = string.Empty;
    public string? SessionTitle { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Deadline { get; set; }
    public string? AttachmentName { get; set; }
    public string? AttachmentDataUrl { get; set; }
    public string? BranchId { get; set; }
    public string? CourseId { get; set; }
    public string? CourseTitle { get; set; }
    public string Status { get; set; } = "pending";
    public DateTime? ReviewedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? LegacyLocalId { get; set; }
}

public sealed class CreateTrainerTaskBriefRequest
{
    public string RequestedByEmail { get; set; } = string.Empty;
    public string? TrainerName { get; set; }
    public string SessionId { get; set; } = string.Empty;
    public string? SessionTitle { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Deadline { get; set; }
    public string? AttachmentName { get; set; }
    public string? AttachmentDataUrl { get; set; }
    public string? BranchId { get; set; }
    public string? CourseId { get; set; }
    public string? CourseTitle { get; set; }
    public string Status { get; set; } = "approved";
    public DateTime? ReviewedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
    public string? LegacyLocalId { get; set; }
}

public sealed class UpdateTrainerTaskBriefRequest
{
    public string? SessionId { get; set; }
    public string? SessionTitle { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Deadline { get; set; }
    public string? AttachmentName { get; set; }
    public string? AttachmentDataUrl { get; set; }
    public string? BranchId { get; set; }
    public string? CourseId { get; set; }
    public string? CourseTitle { get; set; }
    public string? Status { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
}
