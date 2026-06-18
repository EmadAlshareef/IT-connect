using TrainerPortal.Api.Models;

namespace TrainerPortal.Api.Services;

public sealed class SubmissionRepository : ISubmissionRepository
{
    private readonly List<TaskSubmissionRecord> _records =
    [
        new()
        {
            Id = "sub-demo-1",
            StudentId = "student-mohamed",
            TaskId = "task-ts-101",
            SubmissionLink = "https://example.com/mohamed/api-checkpoint",
            FileName = "api-notes.pdf",
            Notes = "Initial submission for review.",
            SubmittedAtUtc = DateTime.UtcNow.AddDays(-1),
        },
    ];

    public IReadOnlyList<TaskSubmissionRecord> GetForStudent(string studentId) =>
        _records.Where(r => r.StudentId == studentId).OrderByDescending(r => r.SubmittedAtUtc).ToList();

    public IReadOnlyList<TrainerSubmissionInboxRecord> GetForTrainer(
        string trainerId,
        string trainerEmail,
        string? branchId = null,
        string? courseId = null) => [];

    public TaskSubmissionRecord Add(string studentId, TaskSubmissionRequest request)
    {
        var record = new TaskSubmissionRecord
        {
            Id = Guid.NewGuid().ToString("N"),
            StudentId = studentId,
            TaskId = request.TaskId.Trim(),
            TaskTitle = request.TaskTitle,
            BranchId = request.BranchId,
            CourseId = request.CourseId,
            SubmissionLink = string.IsNullOrWhiteSpace(request.SubmissionLink) ? null : request.SubmissionLink.Trim(),
            FileName = string.IsNullOrWhiteSpace(request.FileName) ? null : request.FileName.Trim(),
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            Status = "Pending Evaluation",
            SubmittedAtUtc = DateTime.UtcNow,
        };
        _records.Add(record);
        return record;
    }

    public TaskSubmissionRecord Review(
        string submissionId,
        string trainerId,
        string trainerEmail,
        SubmissionReviewRequest request)
    {
        var index = _records.FindIndex(r => r.Id == submissionId);
        if (index < 0) throw new InvalidOperationException("Submission not found.");
        var updated = new TaskSubmissionRecord
        {
            Id = _records[index].Id,
            StudentId = _records[index].StudentId,
            TaskId = _records[index].TaskId,
            TaskTitle = _records[index].TaskTitle,
            BranchId = _records[index].BranchId,
            CourseId = _records[index].CourseId,
            SubmissionLink = _records[index].SubmissionLink,
            FileName = _records[index].FileName,
            Notes = _records[index].Notes,
            Status = "Evaluated",
            Grade = request.Grade ?? "A",
            EvaluationFeedback = request.Feedback,
            TrainerName = request.TrainerName,
            ReviewedAtUtc = DateTime.UtcNow,
            SubmittedAtUtc = _records[index].SubmittedAtUtc,
        };
        _records[index] = updated;
        return updated;
    }
}
