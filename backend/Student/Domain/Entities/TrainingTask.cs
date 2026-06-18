namespace TrainerPortal.Student.Domain.Entities;

public sealed class TrainingTask
{
    public Guid Id { get; set; }
    public Guid? InternshipId { get; set; }
    public Guid? TrainingSessionId { get; set; }
    public Guid AssignedStudentId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime DeadlineUtc { get; set; }
    public string Status { get; set; } = "Assigned";
    public DateTime CreatedAtUtc { get; set; }

    public Internship? Internship { get; set; }
    public StudentAccount AssignedStudent { get; set; } = null!;
    public ICollection<TaskSubmission> Submissions { get; set; } = [];
}
