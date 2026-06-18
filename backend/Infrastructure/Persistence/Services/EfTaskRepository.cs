using Microsoft.EntityFrameworkCore;
using TrainerPortal.Api.Domain.Entities.Portal;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Infrastructure.Persistence.Services;

public sealed class EfTaskRepository(ApplicationDbContext db, PortalUserResolver users) : ITaskRepository
{
    public IReadOnlyList<TraineeTaskItem> GetTasksForStudent(string studentId)
    {
        var user = users.FindByLegacyOrId(studentId);
        if (user is null) return [];

        var enrollments = db.EnrollmentApplications.AsNoTracking()
            .Where(a => a.StudentUserId == user.Id && !a.IsDeleted && a.StatusId == PortalStatusIds.EnrollmentApproved)
            .Select(a => new { a.BranchId, a.CourseId })
            .ToList();

        var personal = db.TraineeTasks.AsNoTracking()
            .Where(t => t.StudentUserId == user.Id && !t.IsDeleted && !t.IsPublished)
            .Select(MapItem)
            .ToList();

        var publishedQuery = db.TraineeTasks.AsNoTracking()
            .Where(t => !t.IsDeleted && t.IsPublished && t.StudentUserId == null);

        if (enrollments.Count > 0)
        {
            var courseIds = enrollments.Select(e => e.CourseId).Distinct().ToList();
            var branchIds = enrollments.Select(e => e.BranchId).Distinct().ToList();
            publishedQuery = publishedQuery.Where(t =>
                (t.SectionId != null && courseIds.Contains(t.SectionId)) ||
                (t.CourseId != null && courseIds.Contains(t.CourseId)) ||
                (t.BranchId != null && t.CourseId != null && branchIds.Contains(t.BranchId) && courseIds.Contains(t.CourseId)));
        }

        var published = publishedQuery
            .OrderByDescending(t => t.PublishedAtUtc ?? t.CreatedAtUtc)
            .Select(MapItem)
            .ToList();

        return personal
            .Concat(published)
            .GroupBy(t => t.Id)
            .Select(g => g.First())
            .OrderBy(t => t.DeadlineUtc)
            .ToList();
    }

    public bool TryMarkTaskSubmitted(string studentId, string taskId, string submissionId, string status)
    {
        var user = users.FindByLegacyOrId(studentId);
        if (user is null) return false;
        var key = taskId.Trim();

        var task = db.TraineeTasks.FirstOrDefault(t =>
            (t.Id == key || t.LegacyLocalId == key) && !t.IsDeleted &&
            (t.StudentUserId == user.Id || (t.IsPublished && t.StudentUserId == null)));
        if (task is null) return false;

        if (task.StudentUserId == user.Id)
        {
            task.StatusId = PortalStatusIds.TaskFromDisplayOrCode(status);
            task.LastSubmissionId = submissionId;
            task.UpdatedAtUtc = DateTime.UtcNow;
            db.SaveChanges();
        }

        return true;
    }

    private static TraineeTaskItem MapItem(TraineeTask t) => new()
    {
        Id = t.LegacyLocalId ?? t.Id,
        Title = t.Title,
        Description = t.Description ?? string.Empty,
        DeadlineUtc = t.DeadlineUtc,
        SubmissionStatus = PortalStatusIds.ToDisplayLabel(t.StatusId),
        LastSubmissionId = t.LastSubmissionId,
    };
}
