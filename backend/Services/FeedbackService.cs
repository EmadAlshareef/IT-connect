using TrainerPortal.Api.Models;

namespace TrainerPortal.Api.Services;

public sealed class FeedbackService : IFeedbackService
{
    public IReadOnlyList<TrainerFeedbackItem> GetForStudent(string studentId)
    {
        if (studentId == "student-mohamed")
        {
            return
            [
                new()
                {
                    Id = "fb-1",
                    TaskTitle = "API integration checkpoint",
                    TrainerName = "Trainer User",
                    Comment = "Nice error handling on auth failures. Tighten retry backoff defaults.",
                    Grade = "A-",
                    AtUtc = DateTime.UtcNow.AddDays(-1),
                },
                new()
                {
                    Id = "fb-0",
                    TaskTitle = "Capstone wireframes",
                    TrainerName = "Trainer User",
                    Comment = "Flows are clear; add empty states for the reporting table.",
                    Grade = "B+",
                    AtUtc = DateTime.UtcNow.AddDays(-6),
                },
            ];
        }

        return
        [
            new()
            {
                Id = "fb-generic",
                TaskTitle = "Weekly deliverables",
                TrainerName = "Assigned trainer",
                Comment = "Great momentum this week. Focus on test coverage next sprint.",
                Grade = "B",
                AtUtc = DateTime.UtcNow.AddDays(-2),
            },
        ];
    }

    public TrainerFeedbackItem Add(string trainerId, CreateTrainerFeedbackRequest request) =>
        new()
        {
            Id = request.LegacyLocalId ?? Guid.NewGuid().ToString("N"),
            TaskId = request.TaskId,
            BranchId = request.BranchId,
            CourseId = request.CourseId,
            TaskTitle = "Feedback",
            TrainerName = request.TrainerName ?? "Trainer",
            Comment = request.Comment,
            Grade = request.Grade,
            AtUtc = DateTime.UtcNow,
        };
}
