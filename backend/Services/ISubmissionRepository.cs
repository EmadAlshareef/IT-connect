using TrainerPortal.Api.Models;

namespace TrainerPortal.Api.Services;

public interface ISubmissionRepository
{
    IReadOnlyList<TaskSubmissionRecord> GetForStudent(string studentId);

    IReadOnlyList<TrainerSubmissionInboxRecord> GetForTrainer(
        string trainerId,
        string trainerEmail,
        string? branchId = null,
        string? courseId = null);

    TaskSubmissionRecord Add(string studentId, TaskSubmissionRequest request);

    TaskSubmissionRecord Review(
        string submissionId,
        string trainerId,
        string trainerEmail,
        SubmissionReviewRequest request);
}
