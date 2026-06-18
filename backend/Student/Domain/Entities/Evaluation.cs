namespace TrainerPortal.Student.Domain.Entities;

public sealed class Evaluation
{
    public Guid Id { get; set; }
    public Guid TaskSubmissionId { get; set; }
    public Guid TrainerId { get; set; }
    public string? Grade { get; set; }
    public string? Feedback { get; set; }
    public DateTime EvaluatedAtUtc { get; set; }

    public TaskSubmission TaskSubmission { get; set; } = null!;
}
