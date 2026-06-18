namespace TrainerPortal.Student.Domain.Entities;

public sealed class StudentNotification
{
    public Guid Id { get; set; }
    public Guid StudentId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAtUtc { get; set; }

    public StudentAccount Student { get; set; } = null!;
}
