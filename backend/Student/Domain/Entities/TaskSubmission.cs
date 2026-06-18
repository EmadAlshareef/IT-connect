using TrainerPortal.Student.Domain.Enums;

namespace TrainerPortal.Student.Domain.Entities;

public sealed class TaskSubmission
{
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    public Guid StudentId { get; set; }
    public int Version { get; set; } = 1;
    public string SubmissionType { get; set; } = "Link";
    public string? SubmissionLink { get; set; }
    public string? FileName { get; set; }
    public string? FileStorageKey { get; set; }
    public string? GithubRepoUrl { get; set; }
    public string? Notes { get; set; }
    public SubmissionStatus Status { get; set; } = SubmissionStatus.Submitted;
    public DateTime SubmittedAtUtc { get; set; }

    public TrainingTask Task { get; set; } = null!;
    public StudentAccount Student { get; set; } = null!;
    public Evaluation? Evaluation { get; set; }
}
