using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TrainerPortal.Api.Domain.Entities.Portal;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Infrastructure.Persistence.Services;

public sealed class EfTrainingTopicService(ApplicationDbContext db, IPortalNotificationService notifications) : ITrainingTopicService
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public async Task<IReadOnlyList<TrainingTopicDto>> ListAsync(
        string? trainerEmail = null,
        string? trainingSessionId = null,
        string? status = null,
        CancellationToken cancellationToken = default)
    {
        var query = db.TrainingTopics.AsNoTracking().Where(t => !t.IsDeleted);

        var email = NormalizeEmailOrNull(trainerEmail);
        if (!string.IsNullOrWhiteSpace(email))
            query = query.Where(t => t.TrainerEmail == email);

        var sid = TrimOrNull(trainingSessionId);
        if (!string.IsNullOrWhiteSpace(sid))
            query = query.Where(t => t.TrainingSessionId == sid);

        var normalizedStatus = TrimOrNull(status)?.ToLowerInvariant();
        if (!string.IsNullOrWhiteSpace(normalizedStatus))
            query = query.Where(t => t.Status == normalizedStatus);

        var rows = await query
            .OrderByDescending(t => t.PublishedAt ?? t.UpdatedAt ?? t.CreatedAt)
            .ToListAsync(cancellationToken);

        return rows.Select(Map).ToList();
    }

    public async Task<TrainingTopicDto?> GetAsync(string id, CancellationToken cancellationToken = default)
    {
        var row = await FindEntityAsync(id, tracked: false, cancellationToken);
        return row is null ? null : Map(row);
    }

    public async Task<TrainingTopicDto> UpsertAsync(
        UpsertTrainingTopicRequest request,
        CancellationToken cancellationToken = default)
    {
        var email = NormalizeEmailOrNull(request.TrainerKey)
            ?? throw new ArgumentException("Trainer email is required.", nameof(request));
        var trainingId = request.TrainingId.Trim();
        var title = request.Title.Trim();
        var explanation = request.Explanation.Trim();
        var status = NormalizeStatus(request.Status);

        if (string.IsNullOrWhiteSpace(trainingId) || string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(explanation))
            throw new ArgumentException("Training, title, and explanation are required.", nameof(request));

        var contentKey = TrimOrNull(request.ContentKey);
        if (status == "published")
        {
            contentKey ??= MakeContentKey(trainingId, title);
            var duplicate = await db.TrainingTopics.AsNoTracking()
                .FirstOrDefaultAsync(t =>
                    !t.IsDeleted &&
                    t.Status == "published" &&
                    t.ContentKey == contentKey &&
                    t.Id != request.Id &&
                    t.LegacyLocalId != request.Id,
                    cancellationToken);
            if (duplicate is not null)
                throw new InvalidOperationException($"“{duplicate.Title}” is already published for this training.");
        }

        var now = DateTime.UtcNow;
        TrainingTopic entity;
        var key = TrimOrNull(request.Id) ?? TrimOrNull(request.LegacyLocalId);
        var existing = string.IsNullOrWhiteSpace(key) ? null : await FindEntityAsync(key, tracked: true, cancellationToken);

        if (existing is null)
        {
            entity = new TrainingTopic
            {
                Id = $"topic-{Guid.NewGuid():N}"[..16],
                CreatedAt = request.CreatedAt ?? now,
                IsDeleted = false,
            };
            db.TrainingTopics.Add(entity);
        }
        else
        {
            entity = existing;
        }

        entity.TrainerEmail = email;
        entity.TrainingSessionId = trainingId;
        entity.TrainingTitle = TrimOrNull(request.TrainingTitle);
        entity.Title = title;
        entity.Explanation = explanation;
        entity.Status = status;
        entity.ContentKey = contentKey;
        entity.VideoUrl = TrimOrNull(request.VideoUrl);
        entity.VideoCaption = TrimOrNull(request.VideoCaption);
        entity.VideoSource = TrimOrNull(request.VideoSource);
        entity.VideoFileName = TrimOrNull(request.VideoFileName);
        entity.VideoFileSize = request.VideoFileSize > 0 ? request.VideoFileSize : null;
        entity.VideoBlobUrl = TrimOrNull(request.VideoBlobUrl);
        entity.VideoAllowDownload = request.VideoAllowDownload;
        entity.SectionsJson = SerializeJson(request.Sections);
        entity.AttachmentsJson = SerializeJson(request.Attachments);
        entity.BranchId = TrimOrNull(request.BranchId);
        entity.CourseId = TrimOrNull(request.CourseId) ?? trainingId;
        entity.LegacyLocalId = TrimOrNull(request.LegacyLocalId) ?? entity.LegacyLocalId;
        entity.PublishedAt = status == "published" ? request.PublishedAt ?? entity.PublishedAt ?? now : entity.PublishedAt;
        entity.UpdatedAt = now;

        var enrolledStudentIds = status == "published"
            ? ResolvePublishedAudience(trainingId, entity.CourseId, entity.BranchId, request.EnrolledStudentIds)
            : request.EnrolledStudentIds ?? [];
        entity.EnrolledStudentIdsJson = SerializeJson(enrolledStudentIds);
        entity.EnrolledCount = enrolledStudentIds.Count;

        await db.SaveChangesAsync(cancellationToken);

        if (status == "published" && enrolledStudentIds.Count > 0)
        {
            var trainingTitle = TrimOrNull(request.TrainingTitle) ?? "your training program";
            foreach (var studentId in enrolledStudentIds)
            {
                if (string.IsNullOrWhiteSpace(studentId)) continue;
                notifications.Create(new CreatePortalNotificationRequest
                {
                    UserId = studentId.Trim(),
                    Title = $"New lesson: {title}",
                    Message = $"Your trainer published “{title}” in {trainingTitle}. Open Course topics to view it.",
                    Tone = "info",
                    Type = "topic_published",
                    TopicId = entity.LegacyLocalId ?? entity.Id,
                    TrainingId = trainingId,
                    CourseTitle = trainingTitle,
                    TargetView = "topics",
                    TargetPath = "/student/topics",
                    LegacyLocalId = $"topic-published-{trainingId}-{entity.Id}-{studentId.Trim()}",
                });
            }
        }

        return Map(entity);
    }

    private List<string> ResolvePublishedAudience(
        string trainingId,
        string? courseId,
        string? branchId,
        IReadOnlyCollection<string>? requestedStudentIds)
    {
        var studentIds = new HashSet<string>(
            (requestedStudentIds ?? [])
                .Select(id => id?.Trim())
                .Where(id => !string.IsNullOrWhiteSpace(id))!,
            StringComparer.OrdinalIgnoreCase);

        var courseKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            trainingId.Trim(),
        };
        if (!string.IsNullOrWhiteSpace(courseId))
            courseKeys.Add(courseId.Trim());

        var branch = TrimOrNull(branchId);
        var approvedQuery = db.EnrollmentApplications.AsNoTracking()
            .Where(a =>
                !a.IsDeleted &&
                a.StatusId == PortalStatusIds.EnrollmentApproved &&
                courseKeys.Contains(a.CourseId));

        if (branch is not null)
            approvedQuery = approvedQuery.Where(a => a.BranchId == branch);

        var dbStudentIds = approvedQuery
            .Select(a => a.StudentUserId)
            .Distinct()
            .ToList();

        if (dbStudentIds.Count > 0)
        {
            var students = db.Users.AsNoTracking()
                .Where(u => dbStudentIds.Contains(u.Id))
                .Select(u => new { u.Id, u.LegacyUserId })
                .ToList();

            foreach (var student in students)
            {
                studentIds.Add(string.IsNullOrWhiteSpace(student.LegacyUserId) ? student.Id : student.LegacyUserId);
            }
        }

        return studentIds.ToList();
    }

    public async Task<bool> DeleteAsync(string id, string? ownerEmail = null, CancellationToken cancellationToken = default)
    {
        var entity = await FindEntityAsync(id, tracked: true, cancellationToken);
        if (entity is null) return false;

        var owner = NormalizeEmailOrNull(ownerEmail);
        if (owner is not null && !string.Equals(entity.TrainerEmail, owner, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("You can only delete your own topics.");

        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<TrainingTopic?> FindEntityAsync(
        string id,
        bool tracked,
        CancellationToken cancellationToken)
    {
        var key = id.Trim();
        if (string.IsNullOrWhiteSpace(key)) return null;
        var query = tracked ? db.TrainingTopics : db.TrainingTopics.AsNoTracking();
        return await query.FirstOrDefaultAsync(
            t => !t.IsDeleted && (t.Id == key || t.LegacyLocalId == key),
            cancellationToken);
    }

    private static TrainingTopicDto Map(TrainingTopic row) => new()
    {
        Id = row.LegacyLocalId ?? row.Id,
        TrainerKey = row.TrainerEmail,
        TrainingId = row.TrainingSessionId,
        TrainingTitle = row.TrainingTitle,
        Title = row.Title,
        Explanation = row.Explanation,
        Status = row.Status,
        ContentKey = row.ContentKey,
        VideoUrl = row.VideoUrl,
        VideoCaption = row.VideoCaption,
        VideoSource = row.VideoSource,
        VideoFileName = row.VideoFileName,
        VideoFileSize = row.VideoFileSize ?? 0,
        VideoBlobUrl = row.VideoBlobUrl,
        VideoAllowDownload = row.VideoAllowDownload,
        Sections = DeserializeSections(row.SectionsJson),
        Attachments = DeserializeAttachments(row.AttachmentsJson),
        EnrolledStudentIds = DeserializeStringList(row.EnrolledStudentIdsJson),
        EnrolledCount = row.EnrolledCount,
        BranchId = row.BranchId,
        CourseId = row.CourseId,
        PublishedAt = row.PublishedAt,
        CreatedAt = row.CreatedAt,
        UpdatedAt = row.UpdatedAt,
        LegacyLocalId = row.LegacyLocalId,
    };

    private static Dictionary<string, string> DeserializeSections(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new Dictionary<string, string>();
        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, string>>(json, JsonOptions) ?? new Dictionary<string, string>();
        }
        catch
        {
            return new Dictionary<string, string>();
        }
    }

    private static List<TopicAttachmentDto> DeserializeAttachments(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<TopicAttachmentDto>>(json, JsonOptions) ?? [];
        }
        catch
        {
            return [];
        }
    }

    private static List<string> DeserializeStringList(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json, JsonOptions) ?? [];
        }
        catch
        {
            return [];
        }
    }

    private static string? SerializeJson<T>(T? value)
    {
        if (value is null) return null;
        if (value is ICollection<TopicAttachmentDto> attachments && attachments.Count == 0) return null;
        if (value is ICollection<string> strings && strings.Count == 0) return null;
        if (value is IDictionary<string, string> dict && dict.Count == 0) return null;
        return JsonSerializer.Serialize(value, JsonOptions);
    }

    private static string MakeContentKey(string trainingId, string title)
    {
        var slug = System.Text.RegularExpressions.Regex.Replace(
            title.Trim().ToLowerInvariant(),
            @"[^a-z0-9]+",
            "-").Trim('-');
        if (string.IsNullOrWhiteSpace(slug)) slug = "untitled";
        return $"{trainingId.Trim().ToLowerInvariant()}::{slug}";
    }

    private static string NormalizeStatus(string? status)
    {
        var value = (status ?? "draft").Trim().ToLowerInvariant();
        return value is "published" or "draft" ? value : "draft";
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
