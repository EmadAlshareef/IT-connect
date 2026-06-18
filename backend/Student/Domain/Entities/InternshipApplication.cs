using TrainerPortal.Student.Domain.Enums;

namespace TrainerPortal.Student.Domain.Entities;

public sealed class InternshipApplication
{
    public Guid Id { get; set; }
    public Guid StudentId { get; set; }
    public Guid InternshipId { get; set; }
    public ApplicationStatus Status { get; set; } = ApplicationStatus.Pending;
    public string? CoverLetter { get; set; }
    public string? CvFileName { get; set; }
    public string? CvStorageKey { get; set; }
    public DateTime SubmittedAtUtc { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }
    public string? RejectionReason { get; set; }

    public StudentAccount Student { get; set; } = null!;
    public Internship Internship { get; set; } = null!;
}
