namespace TrainerPortal.Student.Domain.Entities;

public sealed class Internship
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string? Specialization { get; set; }
    public string? TrainingType { get; set; }
    public string? Summary { get; set; }
    public string? Description { get; set; }
    public string? Location { get; set; }
    public int SeatsTotal { get; set; }
    public int SeatsFilled { get; set; }
    public DateTime? OpensOnUtc { get; set; }
    public DateTime? ClosesOnUtc { get; set; }
    public string Status { get; set; } = "Draft";
    public DateTime CreatedAtUtc { get; set; }

    public ICollection<InternshipApplication> Applications { get; set; } = [];
    public ICollection<TrainingTask> Tasks { get; set; } = [];
}
