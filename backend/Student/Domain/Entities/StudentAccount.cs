namespace TrainerPortal.Student.Domain.Entities;

public sealed class StudentAccount
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? University { get; set; }
    public string? Specialization { get; set; }
    public string? Bio { get; set; }
    public string? AvatarUrl { get; set; }
    public string? GithubUsername { get; set; }
    public string? PreferredGithubRepoUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public ICollection<InternshipApplication> Applications { get; set; } = [];
    public ICollection<TrainingTask> AssignedTasks { get; set; } = [];
    public ICollection<TaskSubmission> Submissions { get; set; } = [];
    public ProgressTracking? Progress { get; set; }
    public ICollection<StudentNotification> Notifications { get; set; } = [];
}
