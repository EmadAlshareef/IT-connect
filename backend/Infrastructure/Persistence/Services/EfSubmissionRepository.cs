using Microsoft.EntityFrameworkCore;
using TrainerPortal.Api.Domain.Entities.Portal;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Infrastructure.Persistence.Services;

public sealed class EfSubmissionRepository(
    ApplicationDbContext db,
    PortalUserResolver users,
    ITaskRepository taskRepository,
    IPortalNotificationService notifications) : ISubmissionRepository
{
    public IReadOnlyList<TaskSubmissionRecord> GetForStudent(string studentId)
    {
        var user = users.FindByLegacyOrId(studentId);
        if (user is null) return [];

        return db.TaskSubmissions.AsNoTracking()
            .Where(s => s.StudentUserId == user.Id)
            .OrderByDescending(s => s.SubmittedAtUtc)
            .Select(s => MapRecord(s, studentId))
            .ToList();
    }

    public IReadOnlyList<TrainerSubmissionInboxRecord> GetForTrainer(
        string trainerId,
        string trainerEmail,
        string? branchId = null,
        string? courseId = null)
    {
        var trainer = users.FindByLegacyOrId(trainerId);
        if (trainer is null) return [];

        var email = trainerEmail.Trim().ToLowerInvariant();
        var approvedQuery = db.EnrollmentApplications.AsNoTracking()
            .Where(a => !a.IsDeleted && a.StatusId == PortalStatusIds.EnrollmentApproved);

        approvedQuery = approvedQuery.Where(a =>
            a.TrainerUserId == trainer.Id ||
            db.Users.AsNoTracking().Any(u => u.Id == a.TrainerUserId && u.Email != null && u.Email.ToLower() == email));

        if (!string.IsNullOrWhiteSpace(branchId))
            approvedQuery = approvedQuery.Where(a => a.BranchId == branchId.Trim());
        if (!string.IsNullOrWhiteSpace(courseId))
            approvedQuery = approvedQuery.Where(a => a.CourseId == courseId.Trim());

        var approved = approvedQuery.ToList();
        if (approved.Count == 0) return [];

        var studentIds = approved.Select(a => a.StudentUserId).Distinct().ToList();
        var studentMap = db.Users.AsNoTracking()
            .Where(u => studentIds.Contains(u.Id))
            .AsEnumerable()
            .ToDictionary(u => u.Id);

        var submissions = db.TaskSubmissions.AsNoTracking()
            .Where(s => studentIds.Contains(s.StudentUserId))
            .OrderByDescending(s => s.SubmittedAtUtc)
            .ToList();

        var taskIds = submissions.Select(s => s.TaskId).Distinct().ToList();
        var taskMap = db.TraineeTasks.AsNoTracking()
            .Where(t => taskIds.Contains(t.Id))
            .ToDictionary(t => t.Id);

        var rows = new List<TrainerSubmissionInboxRecord>();
        foreach (var sub in submissions)
        {
            if (!string.IsNullOrWhiteSpace(branchId) && sub.BranchId is not null && sub.BranchId != branchId.Trim())
                continue;
            if (!string.IsNullOrWhiteSpace(courseId) && sub.CourseId is not null && sub.CourseId != courseId.Trim())
                continue;

            studentMap.TryGetValue(sub.StudentUserId, out var student);
            var legacyStudentId = student is null ? sub.StudentUserId : users.LegacyId(student);
            taskMap.TryGetValue(sub.TaskId, out var task);

            rows.Add(new TrainerSubmissionInboxRecord
            {
                Key = $"{legacyStudentId}::{sub.Id}",
                SubmissionId = sub.LegacyLocalId ?? sub.Id,
                StudentId = legacyStudentId,
                StudentName = student?.FullName ?? "Student",
                StudentEmail = student?.Email ?? string.Empty,
                TaskId = sub.TaskId,
                TaskTitle = sub.TaskTitle ?? task?.Title ?? "Submitted task",
                TaskDescription = task?.Description,
                Answer = sub.Notes,
                SubmissionLink = sub.SubmissionLink,
                FileName = sub.FileName,
                BranchId = sub.BranchId ?? task?.BranchId,
                CourseId = sub.CourseId ?? task?.CourseId,
                SubmittedAt = sub.SubmittedAtUtc,
                Status = sub.Status,
                Grade = sub.Grade,
                EvaluationFeedback = sub.EvaluationFeedback,
                TrainerName = sub.TrainerName,
            });
        }

        return rows;
    }

    public TaskSubmissionRecord Add(string studentId, TaskSubmissionRequest request)
    {
        var user = users.FindByLegacyOrId(studentId)
            ?? throw new InvalidOperationException("Student not found.");

        var taskKey = request.TaskId.Trim();
        var task = db.TraineeTasks.AsNoTracking()
            .FirstOrDefault(t => !t.IsDeleted && (t.Id == taskKey || t.LegacyLocalId == taskKey));
        var record = new TaskSubmission
        {
            Id = Guid.NewGuid().ToString("N"),
            StudentUserId = user.Id,
            TaskId = task?.Id ?? taskKey,
            TaskTitle = TrimOrNull(request.TaskTitle) ?? task?.Title,
            BranchId = TrimOrNull(request.BranchId) ?? task?.BranchId,
            CourseId = TrimOrNull(request.CourseId) ?? task?.CourseId ?? task?.TrainingSessionId,
            SubmissionLink = TrimOrNull(request.SubmissionLink),
            FileName = TrimOrNull(request.FileName),
            Notes = TrimOrNull(request.Notes),
            Status = "Pending Evaluation",
            LegacyLocalId = TrimOrNull(request.LegacyLocalId),
            SubmittedAtUtc = DateTime.UtcNow,
        };

        db.TaskSubmissions.Add(record);
        db.SaveChanges();

        taskRepository.TryMarkTaskSubmitted(studentId, record.TaskId, record.Id, "Pending Review");

        var enrollment = db.EnrollmentApplications.AsNoTracking()
            .FirstOrDefault(a =>
                !a.IsDeleted &&
                a.StudentUserId == user.Id &&
                a.StatusId == PortalStatusIds.EnrollmentApproved &&
                (record.CourseId == null || a.CourseId == record.CourseId));

        if (enrollment is not null)
        {
            var trainer = db.Users.AsNoTracking().FirstOrDefault(u => u.Id == enrollment.TrainerUserId);
            if (trainer is not null)
            {
                var courseTitle = db.Trainings.AsNoTracking()
                    .Where(t => t.Id == enrollment.CourseId)
                    .Select(t => t.Title)
                    .FirstOrDefault() ?? enrollment.CourseId;

                notifications.Create(new CreatePortalNotificationRequest
                {
                    UserId = users.LegacyId(trainer),
                    Title = $"Task submitted — {record.TaskTitle ?? "Task"}",
                    Message = $"{request.StudentName?.Trim() ?? user.FullName} submitted work in {courseTitle}. Open Task Submissions to review and grade.",
                    Tone = "info",
                    Type = "task_submission",
                    BranchId = record.BranchId,
                    CourseId = record.CourseId,
                    CourseTitle = courseTitle,
                    SubmissionId = record.LegacyLocalId ?? record.Id,
                    StudentId = studentId,
                    TargetView = "evaluate",
                    LegacyLocalId = $"activity-sub-{record.Id}",
                });
            }
        }

        return MapRecord(record, studentId);
    }

    public TaskSubmissionRecord Review(
        string submissionId,
        string trainerId,
        string trainerEmail,
        SubmissionReviewRequest request)
    {
        var trainer = users.FindByLegacyOrId(trainerId)
            ?? throw new UnauthorizedAccessException("Trainer not found.");

        var key = submissionId.Trim();
        var submission = db.TaskSubmissions.FirstOrDefault(s => s.Id == key || s.LegacyLocalId == key)
            ?? throw new InvalidOperationException("Submission not found.");

        var enrollment = db.EnrollmentApplications.AsNoTracking()
            .FirstOrDefault(a =>
                !a.IsDeleted &&
                a.StudentUserId == submission.StudentUserId &&
                a.StatusId == PortalStatusIds.EnrollmentApproved &&
                (submission.CourseId == null || a.CourseId == submission.CourseId));

        if (enrollment is null || (enrollment.TrainerUserId != trainer.Id &&
            !string.Equals(trainer.Email, trainerEmail, StringComparison.OrdinalIgnoreCase)))
        {
            throw new UnauthorizedAccessException("You cannot review this submission.");
        }

        var grade = TrimOrNull(request.Grade) ?? "A";
        var feedback = TrimOrNull(request.Feedback) ?? string.Empty;
        var trainerName = TrimOrNull(request.TrainerName) ?? trainer.FullName;
        var reviewedAt = DateTime.UtcNow;

        submission.Status = "Evaluated";
        submission.Grade = grade;
        submission.EvaluationFeedback = feedback;
        submission.TrainerName = trainerName;
        submission.ReviewedByUserId = trainer.Id;
        submission.ReviewedAtUtc = reviewedAt;

        var student = db.Users.AsNoTracking().First(u => u.Id == submission.StudentUserId);
        var legacyStudentId = users.LegacyId(student);

        var feedbackRow = db.TrainerFeedbackEntries.FirstOrDefault(f =>
            f.SubmissionId == submission.Id || (f.TaskId == submission.TaskId && f.StudentUserId == submission.StudentUserId));

        if (feedbackRow is null)
        {
            feedbackRow = new TrainerFeedback
            {
                Id = Guid.NewGuid().ToString("N"),
                StudentUserId = submission.StudentUserId,
                TrainerUserId = trainer.Id,
                TaskId = submission.TaskId,
                SubmissionId = submission.Id,
                BranchId = submission.BranchId,
                CourseId = submission.CourseId,
            };
            db.TrainerFeedbackEntries.Add(feedbackRow);
        }

        feedbackRow.Comment = feedback;
        feedbackRow.Grade = grade;
        feedbackRow.AtUtc = reviewedAt;
        feedbackRow.TrainerUserId = trainer.Id;
        feedbackRow.StudentUserId = submission.StudentUserId;
        feedbackRow.TaskId = submission.TaskId;
        feedbackRow.SubmissionId = submission.Id;
        feedbackRow.BranchId = submission.BranchId;
        feedbackRow.CourseId = submission.CourseId;

        db.SaveChanges();

        taskRepository.TryMarkTaskSubmitted(legacyStudentId, submission.TaskId, submission.Id, "Evaluated");

        var taskTitle = submission.TaskTitle ?? "your task";
        notifications.Create(new CreatePortalNotificationRequest
        {
            UserId = legacyStudentId,
            Title = $"Feedback on {taskTitle}",
            Message = $"Your trainer graded your submission ({grade}). Open Feedback to read comments.",
            Tone = "success",
            Type = "task_feedback",
            BranchId = submission.BranchId,
            CourseId = submission.CourseId,
            SubmissionId = submission.LegacyLocalId ?? submission.Id,
            TargetView = "feedback",
            TargetPath = "/student/feedback",
            LegacyLocalId = $"feedback-{submission.Id}",
        });

        return MapRecord(submission, legacyStudentId);
    }

    private static TaskSubmissionRecord MapRecord(TaskSubmission s, string legacyStudentId) => new()
    {
        Id = s.LegacyLocalId ?? s.Id,
        StudentId = legacyStudentId,
        TaskId = s.TaskId,
        TaskTitle = s.TaskTitle,
        BranchId = s.BranchId,
        CourseId = s.CourseId,
        SubmissionLink = s.SubmissionLink,
        FileName = s.FileName,
        Notes = s.Notes,
        Status = s.Status,
        Grade = s.Grade,
        EvaluationFeedback = s.EvaluationFeedback,
        TrainerName = s.TrainerName,
        ReviewedAtUtc = s.ReviewedAtUtc,
        LegacyLocalId = s.LegacyLocalId,
        SubmittedAtUtc = s.SubmittedAtUtc,
    };

    private static string? TrimOrNull(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }
}
