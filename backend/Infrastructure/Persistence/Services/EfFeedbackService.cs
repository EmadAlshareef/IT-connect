using Microsoft.EntityFrameworkCore;
using TrainerPortal.Api.Domain.Entities.Portal;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Infrastructure.Persistence.Services;

public sealed class EfFeedbackService(ApplicationDbContext db, PortalUserResolver users) : IFeedbackService
{
    public IReadOnlyList<TrainerFeedbackItem> GetForStudent(string studentId)
    {
        var user = users.FindByLegacyOrId(studentId);
        if (user is null) return [];

        var feedback = db.TrainerFeedbackEntries.AsNoTracking()
            .Where(f => f.StudentUserId == user.Id)
            .OrderByDescending(f => f.AtUtc)
            .ToList();

        return MapRows(feedback);
    }

    public TrainerFeedbackItem Add(string trainerId, CreateTrainerFeedbackRequest request)
    {
        var trainer = users.FindByLegacyOrId(trainerId)
            ?? throw new InvalidOperationException("Trainer not found.");
        var student = users.FindByLegacyOrId(request.StudentId)
            ?? throw new InvalidOperationException("Student not found.");

        var entity = new TrainerFeedback
        {
            Id = Guid.NewGuid().ToString("N"),
            StudentUserId = student.Id,
            TrainerUserId = trainer.Id,
            TaskId = TrimOrNull(request.TaskId),
            SubmissionId = TrimOrNull(request.SubmissionId),
            BranchId = TrimOrNull(request.BranchId),
            CourseId = TrimOrNull(request.CourseId),
            Comment = request.Comment.Trim(),
            Grade = TrimOrNull(request.Grade),
            LegacyLocalId = TrimOrNull(request.LegacyLocalId),
            AtUtc = DateTime.UtcNow,
        };

        db.TrainerFeedbackEntries.Add(entity);
        db.SaveChanges();

        var mapped = MapRows([entity], request.TrainerName);
        return mapped.First();
    }

    private List<TrainerFeedbackItem> MapRows(IReadOnlyList<TrainerFeedback> feedback, string? trainerNameOverride = null)
    {
        var trainerIds = feedback.Where(f => f.TrainerUserId != null).Select(f => f.TrainerUserId!).Distinct();
        var taskIds = feedback.Where(f => f.TaskId != null).Select(f => f.TaskId!).Distinct();
        var submissionIds = feedback.Where(f => f.SubmissionId != null).Select(f => f.SubmissionId!).Distinct();
        var trainers = users.LoadUsersByIds(trainerIds);
        var tasks = db.TraineeTasks.AsNoTracking()
            .Where(t => taskIds.Contains(t.Id))
            .ToDictionary(t => t.Id);
        var submissionRows = db.TaskSubmissions.AsNoTracking()
            .Where(s => submissionIds.Contains(s.Id) || (s.LegacyLocalId != null && submissionIds.Contains(s.LegacyLocalId)))
            .ToList();
        var submissions = new Dictionary<string, TaskSubmission>();
        foreach (var submission in submissionRows)
        {
            submissions[submission.Id] = submission;
            if (!string.IsNullOrWhiteSpace(submission.LegacyLocalId))
                submissions[submission.LegacyLocalId] = submission;
        }

        return feedback.Select(f => new TrainerFeedbackItem
        {
            Id = f.LegacyLocalId ?? f.Id,
            TaskId = f.TaskId,
            BranchId = f.BranchId
                ?? (f.SubmissionId is not null && submissions.TryGetValue(f.SubmissionId, out var subForBranch) ? subForBranch.BranchId : null)
                ?? (f.TaskId is not null && tasks.TryGetValue(f.TaskId, out var taskForBranch) ? taskForBranch.BranchId : null),
            CourseId = f.CourseId
                ?? (f.SubmissionId is not null && submissions.TryGetValue(f.SubmissionId, out var subForCourse) ? subForCourse.CourseId : null)
                ?? (f.TaskId is not null && tasks.TryGetValue(f.TaskId, out var taskForCourse) ? taskForCourse.CourseId : null),
            TaskTitle = f.TaskId is not null && tasks.TryGetValue(f.TaskId, out var task) ? task.Title : "General feedback",
            TrainerName = TrimOrNull(trainerNameOverride)
                ?? (f.TrainerUserId is not null && trainers.TryGetValue(f.TrainerUserId, out var trainer)
                    ? trainer.FullName
                    : "Assigned trainer"),
            Comment = f.Comment,
            Grade = f.Grade,
            AtUtc = f.AtUtc,
        }).ToList();
    }

    private static string? TrimOrNull(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }
}
