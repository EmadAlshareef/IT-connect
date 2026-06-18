using Microsoft.EntityFrameworkCore;
using TrainerPortal.Api.Domain.Entities.Portal;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Infrastructure.Persistence.Services;

/// <summary>Trainer publish/edit API backed by dbo.Tasks (IsPublished = 1, StudentUserId IS NULL).</summary>
public sealed class EfTrainerTaskBriefService(ApplicationDbContext db) : ITrainerTaskBriefService
{
    private static IQueryable<TraineeTask> PublishedQuery(IQueryable<TraineeTask> query) =>
        query.Where(t => !t.IsDeleted && t.IsPublished && t.StudentUserId == null);

    public async Task<IReadOnlyList<TrainerTaskBriefDto>> ListAsync(
        string? trainerEmail = null,
        string? sessionId = null,
        string? branchId = null,
        string? courseId = null,
        string? status = null,
        CancellationToken cancellationToken = default)
    {
        var query = PublishedQuery(db.TraineeTasks.AsNoTracking());

        var email = NormalizeEmailOrNull(trainerEmail);
        if (!string.IsNullOrWhiteSpace(email))
            query = query.Where(r => r.TrainerEmail == email);

        var sid = TrimOrNull(sessionId);
        if (!string.IsNullOrWhiteSpace(sid))
            query = query.Where(r =>
                r.TrainingSessionId == sid || r.SectionId == sid || r.CourseId == sid);

        var bid = TrimOrNull(branchId);
        var cid = TrimOrNull(courseId);
        if (!string.IsNullOrWhiteSpace(bid) && !string.IsNullOrWhiteSpace(cid))
        {
            query = query.Where(r =>
                (r.BranchId == bid && r.CourseId == cid) ||
                r.TrainingSessionId == cid ||
                r.SectionId == cid ||
                (r.BranchId == bid && r.SectionId == cid));
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(bid))
                query = query.Where(r => r.BranchId == bid);
            if (!string.IsNullOrWhiteSpace(cid))
                query = query.Where(r => r.CourseId == cid || r.TrainingSessionId == cid || r.SectionId == cid);
        }

        var normalizedStatus = TrimOrNull(status)?.ToLowerInvariant();
        if (normalizedStatus == "approved")
            query = query.Where(r => r.IsPublished);
        else if (normalizedStatus == "pending")
            query = query.Where(r => !r.IsPublished);

        var rows = await query
            .OrderByDescending(r => r.PublishedAtUtc ?? r.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return rows.Select(Map).ToList();
    }

    public async Task<TrainerTaskBriefDto?> GetAsync(string id, CancellationToken cancellationToken = default)
    {
        var row = await FindEntityAsync(id, tracked: false, cancellationToken);
        return row is null ? null : Map(row);
    }

    public async Task<TrainerTaskBriefDto> CreateAsync(
        CreateTrainerTaskBriefRequest request,
        CancellationToken cancellationToken = default)
    {
        var title = request.Title.Trim();
        var description = request.Description.Trim();
        var sessionId = request.SessionId.Trim();
        var email = NormalizeEmailOrNull(request.RequestedByEmail)
            ?? throw new ArgumentException("Trainer email is required.", nameof(request));

        if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(description) || string.IsNullOrWhiteSpace(sessionId))
            throw new ArgumentException("Session, title, and description are required.", nameof(request));

        var now = DateTime.UtcNow;
        var approved = NormalizeStatus(request.Status) == "approved";
        var deadline = ParseDeadline(request.Deadline, now);

        var sectionExists = await db.TrainingSections.AsNoTracking()
            .AnyAsync(s => s.Id == sessionId, cancellationToken);

        var entity = new TraineeTask
        {
            Id = $"task-{Guid.NewGuid():N}"[..16],
            StudentUserId = null,
            SectionId = sectionExists ? sessionId : null,
            Title = title,
            Description = description,
            DeadlineUtc = deadline,
            StatusId = PortalStatusIds.TaskNotSubmitted,
            TrainerEmail = email,
            TrainerName = TrimOrNull(request.TrainerName),
            SessionTitle = TrimOrNull(request.SessionTitle),
            TrainingSessionId = sessionId,
            Deadline = TrimOrNull(request.Deadline),
            AttachmentName = TrimOrNull(request.AttachmentName),
            AttachmentDataUrl = TrimOrNull(request.AttachmentDataUrl),
            BranchId = TrimOrNull(request.BranchId),
            CourseId = TrimOrNull(request.CourseId) ?? sessionId,
            CourseTitle = TrimOrNull(request.CourseTitle),
            IsPublished = approved,
            PublishedAtUtc = approved ? request.PublishedAt ?? now : null,
            LegacyLocalId = TrimOrNull(request.LegacyLocalId),
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            IsDeleted = false,
        };

        db.TraineeTasks.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    public async Task<TrainerTaskBriefDto?> UpdateAsync(
        string id,
        UpdateTrainerTaskBriefRequest request,
        string? ownerEmail = null,
        CancellationToken cancellationToken = default)
    {
        var entity = await FindEntityAsync(id, tracked: true, cancellationToken);
        if (entity is null) return null;

        var owner = NormalizeEmailOrNull(ownerEmail);
        if (owner is not null && !string.Equals(entity.TrainerEmail, owner, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("You can only edit your own task briefs.");

        var title = request.Title.Trim();
        var description = request.Description.Trim();
        if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(description))
            throw new ArgumentException("Title and description are required.", nameof(request));

        if (!string.IsNullOrWhiteSpace(request.SessionId))
        {
            var nextSessionId = request.SessionId.Trim();
            var sectionExists = await db.TrainingSections.AsNoTracking()
                .AnyAsync(s => s.Id == nextSessionId, cancellationToken);
            entity.SectionId = sectionExists ? nextSessionId : null;
            entity.CourseId = TrimOrNull(request.CourseId) ?? nextSessionId;
            entity.TrainingSessionId = nextSessionId;
        }
        entity.SessionTitle = TrimOrNull(request.SessionTitle) ?? entity.SessionTitle;
        entity.Title = title;
        entity.Description = description;
        if (!string.IsNullOrWhiteSpace(request.Deadline))
        {
            entity.Deadline = request.Deadline.Trim();
            entity.DeadlineUtc = ParseDeadline(request.Deadline, entity.DeadlineUtc);
        }
        entity.AttachmentName = TrimOrNull(request.AttachmentName);
        if (request.AttachmentDataUrl is not null)
            entity.AttachmentDataUrl = TrimOrNull(request.AttachmentDataUrl);
        entity.BranchId = TrimOrNull(request.BranchId) ?? entity.BranchId;
        entity.CourseId = TrimOrNull(request.CourseId) ?? entity.CourseId;
        entity.CourseTitle = TrimOrNull(request.CourseTitle) ?? entity.CourseTitle;

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            var approved = NormalizeStatus(request.Status) == "approved";
            entity.IsPublished = approved;
            if (approved)
                entity.PublishedAtUtc = request.PublishedAt ?? entity.PublishedAtUtc ?? DateTime.UtcNow;
        }
        else if (request.PublishedAt is not null)
        {
            entity.PublishedAtUtc = request.PublishedAt;
        }

        entity.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    public async Task<bool> DeleteAsync(string id, string? ownerEmail = null, CancellationToken cancellationToken = default)
    {
        var entity = await FindEntityAsync(id, tracked: true, cancellationToken);
        if (entity is null) return false;

        var owner = NormalizeEmailOrNull(ownerEmail);
        if (owner is not null && !string.Equals(entity.TrainerEmail, owner, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("You can only delete your own task briefs.");

        entity.IsDeleted = true;
        entity.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<TraineeTask?> FindEntityAsync(
        string id,
        bool tracked = false,
        CancellationToken cancellationToken = default)
    {
        var key = id.Trim();
        if (string.IsNullOrWhiteSpace(key)) return null;

        var query = tracked ? db.TraineeTasks : db.TraineeTasks.AsNoTracking();
        return await query.FirstOrDefaultAsync(
            t => !t.IsDeleted && (t.Id == key || t.LegacyLocalId == key),
            cancellationToken);
    }

    private static TrainerTaskBriefDto Map(TraineeTask row) => new()
    {
        Id = row.Id,
        RequestedByEmail = row.TrainerEmail ?? string.Empty,
        TrainerName = row.TrainerName,
        SessionId = row.TrainingSessionId ?? row.SectionId ?? row.CourseId ?? string.Empty,
        SessionTitle = row.SessionTitle,
        Title = row.Title,
        Description = row.Description ?? string.Empty,
        Deadline = row.Deadline ?? row.DeadlineUtc.ToString("yyyy-MM-dd"),
        AttachmentName = row.AttachmentName,
        AttachmentDataUrl = row.AttachmentDataUrl,
        BranchId = row.BranchId,
        CourseId = row.CourseId,
        CourseTitle = row.CourseTitle,
        Status = row.IsPublished ? "approved" : "pending",
        ReviewedAt = row.PublishedAtUtc,
        PublishedAt = row.PublishedAtUtc,
        CreatedAt = row.CreatedAtUtc,
        UpdatedAt = row.UpdatedAtUtc,
        LegacyLocalId = row.LegacyLocalId,
    };

    private static DateTime ParseDeadline(string? deadline, DateTime fallback)
    {
        if (!string.IsNullOrWhiteSpace(deadline) && DateTime.TryParse(deadline, out var parsed))
            return DateTime.SpecifyKind(parsed, DateTimeKind.Utc);
        return fallback;
    }

    private static string NormalizeStatus(string? status)
    {
        var value = (status ?? "pending").Trim().ToLowerInvariant();
        return value is "approved" or "rejected" or "pending" ? value : "pending";
    }

    private static string? TrimOrNull(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }

    private static string? NormalizeEmailOrNull(string? value)
    {
        var trimmed = value?.Trim().ToLowerInvariant();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }
}
