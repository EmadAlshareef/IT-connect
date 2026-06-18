using Microsoft.EntityFrameworkCore;
using TrainerPortal.Api.Domain.Entities.Portal;

namespace TrainerPortal.Api.Infrastructure.Persistence.Services;

/// <summary>
/// Ensures company-approved trainings exist in dbo.Trainings so posts and enrollment can resolve them.
/// </summary>
public static class CompanyTrainingCatalogSync
{
    public static async Task BackfillMissingPublishedTrainingsAsync(
        ApplicationDbContext db,
        CancellationToken cancellationToken = default)
    {
        var approved = await db.CompanyTrainingRequests.AsNoTracking()
            .Where(r => !r.IsDeleted
                        && r.ReviewStatus == "APPROVED"
                        && r.PublishedTrainingId != null
                        && r.PublishedTrainingId != "")
            .OrderBy(r => r.CreatedAt)
            .ToListAsync(cancellationToken);

        foreach (var request in approved)
        {
            await EnsureFromRequestAsync(db, request, cancellationToken);
        }

        await BackfillCompanyPostTrainingIdsAsync(db, cancellationToken);
    }

    public static async Task EnsureFromRequestAsync(
        ApplicationDbContext db,
        CompanyTrainingRequest entity,
        CancellationToken cancellationToken = default)
    {
        var publishedId = TrimOrNull(entity.PublishedTrainingId);
        if (publishedId is null) return;

        var exists = await db.Trainings.AsNoTracking()
            .AnyAsync(t => t.Id == publishedId && !t.IsDeleted, cancellationToken);
        if (exists) return;

        var trainerUserId = await ResolveTrainerUserIdAsync(db, entity.TrainerEmail, cancellationToken);
        var branchId = string.IsNullOrWhiteSpace(entity.BranchId) ? "cairo" : entity.BranchId.Trim();
        var trackId = await ResolveApprovedTrackIdAsync(db, entity.TrackRequestId, cancellationToken);
        var now = DateTime.UtcNow;

        db.Trainings.Add(new Training
        {
            Id = publishedId,
            BranchId = branchId,
            TrackId = trackId,
            CompanyId = entity.CompanyId,
            CategoryCode = await ResolveTrainingCategoryCodeAsync(
                db, entity, branchId, trackId, cancellationToken),
            Title = entity.Title.Trim(),
            Body = entity.Body,
            StartDate = entity.StartDate,
            TrainerUserId = trainerUserId,
            SeatsTotal = Math.Max(1, entity.SeatsTotal),
            StatusId = entity.TrainingStatus.Equals("upcoming", StringComparison.OrdinalIgnoreCase)
                ? PortalStatusIds.TrainingUpcoming
                : PortalStatusIds.TrainingActive,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
        });

        await db.SaveChangesAsync(cancellationToken);
    }

    public static async Task<string?> ResolvePublishedTrainingIdForTitleAsync(
        ApplicationDbContext db,
        string branchId,
        string? trainingTitle,
        CancellationToken cancellationToken = default)
    {
        var title = trainingTitle?.Trim();
        if (string.IsNullOrWhiteSpace(title)) return null;

        var bid = branchId.Trim();
        var candidates = await db.CompanyTrainingRequests.AsNoTracking()
            .Where(r => !r.IsDeleted
                        && r.ReviewStatus == "APPROVED"
                        && r.PublishedTrainingId != null
                        && r.BranchId == bid)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(cancellationToken);

        var request = candidates.FirstOrDefault(
            r => string.Equals(r.Title.Trim(), title, StringComparison.OrdinalIgnoreCase));

        if (request is null) return null;

        var tracked = await db.CompanyTrainingRequests
            .FirstOrDefaultAsync(r => r.Id == request.Id, cancellationToken);
        if (tracked is not null)
        {
            await EnsureFromRequestAsync(db, tracked, cancellationToken);
        }

        return TrimOrNull(request.PublishedTrainingId);
    }

    private static async Task BackfillCompanyPostTrainingIdsAsync(
        ApplicationDbContext db,
        CancellationToken cancellationToken)
    {
        var posts = await db.CompanyPosts
            .Where(p => !p.IsDeleted && (p.TrainingId == null || p.TrainingId == ""))
            .ToListAsync(cancellationToken);

        var changed = false;
        foreach (var post in posts)
        {
            var resolved = await ResolvePublishedTrainingIdForTitleAsync(
                db, post.BranchId, post.TrainingTitle, cancellationToken);
            if (string.IsNullOrWhiteSpace(resolved)) continue;

            post.TrainingId = resolved;
            post.UpdatedAtUtc = DateTime.UtcNow;
            changed = true;
        }

        if (changed)
        {
            await db.SaveChangesAsync(cancellationToken);
        }
    }

    private static async Task<string?> ResolveTrainerUserIdAsync(
        ApplicationDbContext db,
        string? trainerEmail,
        CancellationToken cancellationToken)
    {
        var email = NormalizeEmailOrNull(trainerEmail);
        if (email is null) return null;

        return await db.Users.AsNoTracking()
            .Where(u => u.NormalizedEmail == email && !u.IsDeleted)
            .Select(u => u.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static async Task<string?> ResolveApprovedTrackIdAsync(
        ApplicationDbContext db,
        string? trackRequestId,
        CancellationToken cancellationToken)
    {
        var id = TrimOrNull(trackRequestId);
        if (id is null) return null;

        var approvedTrackId = TrimOrNull(await db.CompanyTrackRequests.AsNoTracking()
            .Where(r => r.Id == id && !r.IsDeleted)
            .Select(r => r.ApprovedTrackId)
            .FirstOrDefaultAsync(cancellationToken));
        if (approvedTrackId is null) return null;

        var exists = await db.Tracks.AsNoTracking()
            .AnyAsync(t => t.Id == approvedTrackId && !t.IsDeleted, cancellationToken);
        return exists ? approvedTrackId : null;
    }

    private static async Task<string> ResolveTrainingCategoryCodeAsync(
        ApplicationDbContext db,
        CompanyTrainingRequest entity,
        string branchId,
        string? trackId,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(trackId))
        {
            var fromTrack = await db.Trainings.AsNoTracking()
                .Where(t => !t.IsDeleted && t.TrackId == trackId)
                .Select(t => t.CategoryCode)
                .FirstOrDefaultAsync(cancellationToken);
            if (!string.IsNullOrWhiteSpace(fromTrack))
                return fromTrack;
        }

        var title = entity.Title.Trim();
        if (!string.IsNullOrWhiteSpace(title))
        {
            var fromTitle = await db.Trainings.AsNoTracking()
                .Where(t => !t.IsDeleted && t.BranchId == branchId && t.Title == title)
                .Select(t => t.CategoryCode)
                .FirstOrDefaultAsync(cancellationToken);
            if (!string.IsNullOrWhiteSpace(fromTitle))
                return fromTitle;
        }

        return "FRONTEND";
    }

    private static string? TrimOrNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string? NormalizeEmailOrNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim().ToLowerInvariant();
}
