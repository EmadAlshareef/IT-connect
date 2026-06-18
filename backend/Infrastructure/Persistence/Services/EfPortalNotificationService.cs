using Microsoft.EntityFrameworkCore;
using TrainerPortal.Api.Domain.Entities.Portal;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Infrastructure.Persistence.Services;

public sealed class EfPortalNotificationService(ApplicationDbContext db, PortalUserResolver users) : IPortalNotificationService
{
    public PortalNotificationRecord Create(CreatePortalNotificationRequest request)
    {
        var user = users.FindByLegacyOrId(request.UserId)
            ?? throw new InvalidOperationException("Notification recipient not found.");

        var entity = new PortalNotification
        {
            Id = Guid.NewGuid().ToString("N"),
            UserId = user.Id,
            Title = request.Title.Trim(),
            Message = request.Message.Trim(),
            ToneCode = string.IsNullOrWhiteSpace(request.Tone) ? "info" : request.Tone.Trim().ToLowerInvariant(),
            IsRead = false,
            CreatedAtUtc = DateTime.UtcNow,
            TypeCode = request.Type.Trim(),
            ApplicationId = TrimOrNull(request.ApplicationId),
            BranchId = TrimOrNull(request.BranchId),
            CourseId = TrimOrNull(request.CourseId),
            TargetView = string.IsNullOrWhiteSpace(request.TargetView) ? "enrollment-requests" : request.TargetView.Trim(),
            SubmissionId = TrimOrNull(request.SubmissionId),
            TopicId = TrimOrNull(request.TopicId),
            StudentLegacyId = TrimOrNull(request.StudentId),
            TargetPath = TrimOrNull(request.TargetPath),
            LegacyLocalId = TrimLegacyLocalId(request.LegacyLocalId),
        };

        db.PortalNotifications.Add(entity);
        db.SaveChanges();

        return Map(entity, users.LegacyId(user), request.CourseTitle);
    }

    public IReadOnlyList<PortalNotificationRecord> ListForUser(string userId)
    {
        var user = users.FindByLegacyOrId(userId);
        if (user is null) return [];

        return db.PortalNotifications.AsNoTracking()
            .Where(n => n.UserId == user.Id)
            .OrderByDescending(n => n.CreatedAtUtc)
            .Take(50)
            .AsEnumerable()
            .Select(n => Map(n, userId, null))
            .ToList();
    }

    public int UnreadCount(string userId)
    {
        var user = users.FindByLegacyOrId(userId);
        if (user is null) return 0;
        return db.PortalNotifications.Count(n => n.UserId == user.Id && !n.IsRead);
    }

    public void MarkRead(string userId, string notificationId)
    {
        var user = users.FindByLegacyOrId(userId);
        if (user is null) return;

        var row = db.PortalNotifications.FirstOrDefault(n => n.Id == notificationId && n.UserId == user.Id);
        if (row is null) return;
        row.IsRead = true;
        db.SaveChanges();
    }

    private PortalNotificationRecord Map(PortalNotification n, string legacyUserId, string? courseTitleOverride)
    {
        var courseTitle = courseTitleOverride;
        if (courseTitle is null && n.CourseId is not null)
        {
            courseTitle = db.Trainings.AsNoTracking()
                .Where(t => t.Id == n.CourseId)
                .Select(t => t.Title)
                .FirstOrDefault();
        }

        return new PortalNotificationRecord
        {
            Id = n.LegacyLocalId ?? n.Id,
            UserId = legacyUserId,
            Title = n.Title,
            Message = n.Message,
            Tone = n.ToneCode,
            IsRead = n.IsRead,
            CreatedAtUtc = n.CreatedAtUtc,
            Type = n.TypeCode,
            ApplicationId = n.ApplicationId,
            BranchId = n.BranchId,
            CourseId = n.CourseId,
            CourseTitle = courseTitle,
            TargetView = n.TargetView,
            SubmissionId = n.SubmissionId,
            TopicId = n.TopicId,
            StudentId = n.StudentLegacyId,
            TrainingId = n.CourseId,
            TargetPath = n.TargetPath,
            LegacyLocalId = n.LegacyLocalId,
        };
    }

    private static string? TrimOrNull(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }

    private static string? TrimLegacyLocalId(string? value)
    {
        var trimmed = TrimOrNull(value);
        return trimmed is not null && trimmed.Length > 64 ? trimmed[..64] : trimmed;
    }
}
