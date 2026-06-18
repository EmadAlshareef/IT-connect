namespace TrainerPortal.Student.Domain.Entities;

public sealed class ProgressTracking
{
    public Guid Id { get; set; }
    public Guid StudentId { get; set; }
    public int CompletionPercent { get; set; }
    public int AttendancePercent { get; set; }
    public decimal PerformanceScore { get; set; }
    public int CompletedTasksCount { get; set; }
    public int PendingTasksCount { get; set; }
    public DateTime? LastActivityAtUtc { get; set; }
    public string WeeklyActivityJson { get; set; } = "[]";

    public StudentAccount Student { get; set; } = null!;
}
