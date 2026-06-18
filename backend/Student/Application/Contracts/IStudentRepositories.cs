using TrainerPortal.Student.Domain.Entities;
using TrainerPortal.Student.Domain.Enums;

namespace TrainerPortal.Student.Application.Contracts;

public interface IStudentRepository
{
    Task<StudentAccount?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<StudentAccount?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task AddAsync(StudentAccount student, CancellationToken ct = default);
    Task UpdateAsync(StudentAccount student, CancellationToken ct = default);
}

public interface IInternshipRepository
{
    Task<IReadOnlyList<Internship>> ListPublishedAsync(string? specialization, string? company, CancellationToken ct = default);
    Task<Internship?> GetPublishedByIdAsync(Guid id, CancellationToken ct = default);
}

public interface IApplicationRepository
{
    Task<InternshipApplication?> GetByIdForStudentAsync(Guid applicationId, Guid studentId, CancellationToken ct = default);
    Task<InternshipApplication?> GetByStudentAndInternshipAsync(Guid studentId, Guid internshipId, CancellationToken ct = default);
    Task<IReadOnlyList<InternshipApplication>> ListForStudentAsync(Guid studentId, CancellationToken ct = default);
    Task AddAsync(InternshipApplication application, CancellationToken ct = default);
}

public interface IStudentTaskRepository
{
    Task<IReadOnlyList<TrainingTask>> ListForStudentAsync(Guid studentId, CancellationToken ct = default);
    Task<TrainingTask?> GetForStudentAsync(Guid taskId, Guid studentId, CancellationToken ct = default);
}

public interface ISubmissionRepository
{
    Task<int> GetNextVersionAsync(Guid taskId, Guid studentId, CancellationToken ct = default);
    Task AddAsync(TaskSubmission submission, CancellationToken ct = default);
    Task<IReadOnlyList<TaskSubmission>> ListForStudentAsync(Guid studentId, CancellationToken ct = default);
}

public interface IEvaluationRepository
{
    Task<IReadOnlyList<Evaluation>> ListForStudentAsync(Guid studentId, CancellationToken ct = default);
}

public interface IProgressRepository
{
    Task<ProgressTracking?> GetForStudentAsync(Guid studentId, CancellationToken ct = default);
    Task UpsertAsync(ProgressTracking progress, CancellationToken ct = default);
}

public interface INotificationRepository
{
    Task<IReadOnlyList<StudentNotification>> ListForStudentAsync(Guid studentId, bool unreadOnly, CancellationToken ct = default);
    Task AddAsync(StudentNotification notification, CancellationToken ct = default);
    Task MarkReadAsync(Guid notificationId, Guid studentId, CancellationToken ct = default);
}
