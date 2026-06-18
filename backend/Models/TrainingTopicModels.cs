namespace TrainerPortal.Api.Models;

public sealed class TrainingTopicDto
{
    public string Id { get; set; } = string.Empty;
    public string TrainerKey { get; set; } = string.Empty;
    public string TrainingId { get; set; } = string.Empty;
    public string? TrainingTitle { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
    public string Status { get; set; } = "draft";
    public string? ContentKey { get; set; }
    public string? VideoUrl { get; set; }
    public string? VideoCaption { get; set; }
    public string? VideoSource { get; set; }
    public string? VideoFileName { get; set; }
    public int VideoFileSize { get; set; }
    public string? VideoBlobUrl { get; set; }
    public bool VideoAllowDownload { get; set; } = true;
    public Dictionary<string, string> Sections { get; set; } = new();
    public List<TopicAttachmentDto> Attachments { get; set; } = [];
    public List<string> EnrolledStudentIds { get; set; } = [];
    public int EnrolledCount { get; set; }
    public string? BranchId { get; set; }
    public string? CourseId { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? LegacyLocalId { get; set; }
}

public sealed class TopicAttachmentDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public long Size { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Kind { get; set; } = "document";
    public string? DataUrl { get; set; }
    public string? AddedAt { get; set; }
}

public sealed class UpsertTrainingTopicRequest
{
    public string? Id { get; set; }
    public string TrainerKey { get; set; } = string.Empty;
    public string TrainingId { get; set; } = string.Empty;
    public string? TrainingTitle { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
    public string Status { get; set; } = "draft";
    public string? ContentKey { get; set; }
    public string? VideoUrl { get; set; }
    public string? VideoCaption { get; set; }
    public string? VideoSource { get; set; }
    public string? VideoFileName { get; set; }
    public int VideoFileSize { get; set; }
    public string? VideoBlobUrl { get; set; }
    public bool VideoAllowDownload { get; set; } = true;
    public Dictionary<string, string>? Sections { get; set; }
    public List<TopicAttachmentDto>? Attachments { get; set; }
    public List<string>? EnrolledStudentIds { get; set; }
    public int EnrolledCount { get; set; }
    public string? BranchId { get; set; }
    public string? CourseId { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime? CreatedAt { get; set; }
    public string? LegacyLocalId { get; set; }
}
