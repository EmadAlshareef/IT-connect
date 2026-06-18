using Microsoft.EntityFrameworkCore;
using TrainerPortal.Api.Domain.Entities.Portal;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Infrastructure.Persistence.Services;

public sealed class EfCatalogService(ApplicationDbContext db, PortalUserResolver users) : ICatalogService
{
    public IReadOnlyList<BranchDto> ListBranches() =>
        db.Branches.AsNoTracking()
            .Where(b => !b.IsDeleted)
            .Select(b => new BranchDto { Id = b.Id, Name = b.Name, Region = b.Region ?? string.Empty })
            .ToList();

    public IReadOnlyList<TrackDto> ListTracks(string? branchId = null)
    {
        var query = db.Tracks.AsNoTracking().Where(t => !t.IsDeleted);
        if (!string.IsNullOrWhiteSpace(branchId))
            query = query.Where(t => t.BranchId == branchId.Trim());

        var tracks = query.ToList();
        return tracks.Select(t => new TrackDto
        {
            Id = t.Id,
            BranchId = t.BranchId,
            Title = t.Title,
            Icon = t.Icon,
            IsActive = t.IsActive,
            TrainingsCount = db.Trainings.Count(tr => tr.TrackId == t.Id && !tr.IsDeleted),
            StudentsCount = db.EnrollmentApplications.Count(ea =>
                !ea.IsDeleted &&
                ea.StatusId == PortalStatusIds.EnrollmentApproved &&
                db.Trainings.Any(tr => tr.Id == ea.CourseId && tr.TrackId == t.Id)),
        }).ToList();
    }

    public IReadOnlyList<TrainingDto> ListTrainings(string? branchId = null)
    {
        var query = db.Trainings.AsNoTracking().Where(t => !t.IsDeleted);
        if (!string.IsNullOrWhiteSpace(branchId))
            query = query.Where(t => t.BranchId == branchId.Trim());

        var rows = query.ToList();
        return MapTrainings(rows);
    }

    public int CountEnrolledStudents(string? branchId = null)
    {
        var query = db.EnrollmentApplications.AsNoTracking()
            .Where(a => !a.IsDeleted && a.StatusId == PortalStatusIds.EnrollmentApproved);

        if (!string.IsNullOrWhiteSpace(branchId))
        {
            var bid = branchId.Trim();
            query = query.Where(a => a.BranchId == bid);
        }

        return query.Select(a => a.StudentUserId).Distinct().Count();
    }

    public TrainingDto? GetTraining(string id)
    {
        var row = db.Trainings.AsNoTracking().FirstOrDefault(t => t.Id == id && !t.IsDeleted);
        return row is null ? null : MapTrainings([row]).FirstOrDefault();
    }

    public TrainingDto UpsertTraining(UpsertTrainingRequest request)
    {
        var id = string.IsNullOrWhiteSpace(request.Id)
            ? $"tr-{Guid.NewGuid():N}"[..12]
            : request.Id.Trim();

        var trainer = string.IsNullOrWhiteSpace(request.TrainerLegacyId)
            ? null
            : users.FindByLegacyOrId(request.TrainerLegacyId);

        var statusId = request.Status.Equals("upcoming", StringComparison.OrdinalIgnoreCase)
            ? PortalStatusIds.TrainingUpcoming
            : PortalStatusIds.TrainingActive;

        DateOnly? startDate = null;
        if (!string.IsNullOrWhiteSpace(request.StartDate) && DateOnly.TryParse(request.StartDate, out var parsed))
            startDate = parsed;

        var existing = db.Trainings.FirstOrDefault(t => t.Id == id);
        var now = DateTime.UtcNow;

        if (existing is null)
        {
            existing = new Training
            {
                Id = id,
                CreatedAtUtc = now,
            };
            db.Trainings.Add(existing);
        }

        existing.BranchId = request.BranchId.Trim();
        existing.TrackId = string.IsNullOrWhiteSpace(request.TrackId) ? null : request.TrackId.Trim();
        existing.CategoryCode = request.Category.Trim().ToUpperInvariant();
        existing.Title = request.Title.Trim();
        existing.Body = request.Body;
        existing.StartDate = startDate;
        existing.TrainerUserId = trainer?.Id;
        existing.SeatsTotal = request.SeatsTotal;
        existing.StatusId = statusId;
        existing.FilterTag = request.FilterTag;
        existing.UpdatedAtUtc = now;

        db.SaveChanges();
        return MapTrainings([existing]).First();
    }

    public void DeleteTraining(string id)
    {
        var row = db.Trainings.FirstOrDefault(t => t.Id == id);
        if (row is null) return;
        row.IsDeleted = true;
        row.UpdatedAtUtc = DateTime.UtcNow;
        db.SaveChanges();
    }

    public IReadOnlyList<TrainingSectionDto> ListSections(string? trainerLegacyId = null)
    {
        var query = db.TrainingSections.AsNoTracking().Where(s => !s.IsDeleted);
        if (!string.IsNullOrWhiteSpace(trainerLegacyId))
        {
            var trainer = users.FindByLegacyOrId(trainerLegacyId);
            if (trainer is not null)
                query = query.Where(s => s.TrainerUserId == trainer.Id);
        }

        return query.AsEnumerable().Select(s =>
        {
            var trainer = db.Users.AsNoTracking().FirstOrDefault(u => u.Id == s.TrainerUserId);
            return new TrainingSectionDto
            {
                Id = s.Id,
                Title = s.Title,
                Company = s.Company,
                DurationLabel = s.DurationLabel,
                Status = PortalStatusIds.ToCode(s.StatusId),
                TrainerLegacyId = trainer is null ? string.Empty : users.LegacyId(trainer),
                TasksCount = db.TraineeTasks.Count(t => t.SectionId == s.Id && !t.IsDeleted),
                StudentsCount = db.SectionEnrollments.Count(e => e.SectionId == s.Id),
            };
        }).ToList();
    }

    public IReadOnlyList<CompanyPostDto> ListCompanyPosts(string? branchId = null)
    {
        var query = db.CompanyPosts.AsNoTracking()
            .Include(p => p.Tags).ThenInclude(t => t.Tag)
            .Where(p => !p.IsDeleted);

        if (!string.IsNullOrWhiteSpace(branchId))
            query = query.Where(p => p.BranchId == branchId.Trim());

        var posts = query.ToList();
        var branchIds = posts.Select(p => p.BranchId).Distinct().ToList();
        var applicantCounts = branchIds.Count == 0
            ? new Dictionary<string, int>()
            : db.JobApplicants.AsNoTracking()
                .Where(j => branchIds.Contains(j.BranchId))
                .GroupBy(j => j.BranchId)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToDictionary(x => x.Key, x => x.Count);

        return posts.Select(p => new CompanyPostDto
        {
            Id = p.Id,
            BranchId = p.BranchId,
            Title = p.Title,
            Status = PortalStatusIds.ToCode(p.StatusId),
            Body = p.Body,
            TrainingTitle = p.TrainingTitle,
            TrainingId = p.TrainingId ?? ResolveCompanyPostTrainingId(p.BranchId, null, p.TrainingTitle),
            Deadline = p.Deadline?.ToString("yyyy-MM-dd"),
            ApplicantsCount = applicantCounts.GetValueOrDefault(p.BranchId),
            Tags = string.Join(",", p.Tags.Select(t => t.Tag?.Name).Where(n => n != null)),
        }).ToList();
    }

    public IReadOnlyList<JobApplicantDto> ListJobApplicants(string? branchId = null)
    {
        var query = db.JobApplicants.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(branchId))
            query = query.Where(j => j.BranchId == branchId.Trim());

        return query.Select(j => new JobApplicantDto
        {
            Id = j.Id,
            BranchId = j.BranchId,
            ApplicantInitial = j.ApplicantInitial,
            FullName = j.FullName,
            Email = j.Email,
            TrainingTitle = j.TrainingTitle,
            Status = PortalStatusIds.ToCode(j.StatusId),
            AppliedOn = j.AppliedOn.HasValue ? j.AppliedOn.Value.ToString("yyyy-MM-dd") : null,
        }).ToList();
    }

    public IReadOnlyList<TraineeEvaluationDto> ListEvaluations() =>
        db.TraineeEvaluations.AsNoTracking()
            .Include(e => e.Items)
            .AsEnumerable()
            .Select(e =>
            {
                var student = e.StudentUserId is null
                    ? null
                    : db.Users.AsNoTracking().FirstOrDefault(u => u.Id == e.StudentUserId);
                return new TraineeEvaluationDto
                {
                    Id = e.Id,
                    StudentLegacyId = student is null ? null : users.LegacyId(student),
                    TraineeName = e.DisplayName,
                    PendingCount = e.Items.Count(i => i.StatusId == PortalStatusIds.EvaluationPending),
                    Tasks = e.Items.Select(i => new EvaluationTaskItemDto
                    {
                        Id = i.Id,
                        Title = i.Title,
                        Deadline = i.Deadline?.ToString("yyyy-MM-dd"),
                        SubmittedOn = i.SubmittedOn?.ToString("yyyy-MM-dd"),
                        RepoTag = i.RepoTag,
                        RepoBranch = i.RepoBranch,
                        Status = PortalStatusIds.ToDisplayLabel(i.StatusId),
                        Grade = i.Grade,
                        Feedback = i.Feedback,
                    }).ToList(),
                };
            })
            .ToList();

    private IReadOnlyList<TrainingDto> MapTrainings(IReadOnlyList<Training> rows)
    {
        var trainerIds = rows
            .Where(t => t.TrainerUserId != null)
            .Select(t => t.TrainerUserId!)
            .Distinct()
            .ToList();

        var trainers = trainerIds.Count == 0
            ? new Dictionary<string, Domain.Entities.ApplicationUser>()
            : db.Users.AsNoTracking()
                .Where(u => trainerIds.Contains(u.Id))
                .AsEnumerable()
                .ToDictionary(u => u.Id);

        var trainingIds = rows.Select(t => t.Id).Distinct().ToList();
        var companyIds = rows
            .Where(t => !string.IsNullOrWhiteSpace(t.CompanyId))
            .Select(t => t.CompanyId!)
            .Distinct()
            .ToList();

        var companies = companyIds.Count == 0
            ? new Dictionary<string, Company>()
            : db.Companies.AsNoTracking()
                .Where(c => companyIds.Contains(c.Id))
                .AsEnumerable()
                .ToDictionary(c => c.Id);

        var requestsByTrainingId = trainingIds.Count == 0
            ? new Dictionary<string, CompanyTrainingRequest>()
            : db.CompanyTrainingRequests.AsNoTracking()
                .Where(r => !r.IsDeleted && r.PublishedTrainingId != null && trainingIds.Contains(r.PublishedTrainingId))
                .AsEnumerable()
                .GroupBy(r => r.PublishedTrainingId!)
                .ToDictionary(g => g.Key, g => g.First());

        return rows.Select(t =>
        {
            trainers.TryGetValue(t.TrainerUserId ?? string.Empty, out var trainer);
            requestsByTrainingId.TryGetValue(t.Id, out var request);
            companies.TryGetValue(t.CompanyId ?? string.Empty, out var company);

            var companyEmail = FirstNonEmpty(
                company?.Email,
                request?.CompanyEmail,
                request?.RequestedByEmail);
            var companyName = FirstNonEmpty(company?.Name, request?.RequestedBy);

            return new TrainingDto
            {
                Id = t.Id,
                BranchId = t.BranchId,
                TrackId = t.TrackId,
                Category = t.CategoryCode,
                Title = t.Title,
                Body = t.Body,
                StartDate = t.StartDate?.ToString("yyyy-MM-dd"),
                TrainerUserId = t.TrainerUserId,
                TrainerLegacyId = trainer is null ? null : users.LegacyId(trainer),
                TrainerEmail = trainer?.Email,
                TrainerName = trainer?.FullName,
                CompanyEmail = companyEmail,
                CompanyName = companyName,
                CompanyLogoUrl = company?.LogoUrl,
                CompanyIndustry = company?.Industry,
                CompanyLocation = company?.Location,
                CompanyVision = company?.Vision,
                CompanyDescription = company?.Description,
                TrackTitle = request?.TrackTitle,
                CompanyTrainingRequestId = request?.Id,
                CompanyTrainingBody = request?.Body,
                DocumentFileName = request?.DocumentFileName,
                SeatsTaken = t.SeatsTaken,
                SeatsTotal = t.SeatsTotal,
                Status = PortalStatusIds.ToCode(t.StatusId),
                FilterTag = t.FilterTag,
            };
        }).ToList();
    }

    private static string? FirstNonEmpty(params string?[] values)
    {
        foreach (var value in values)
        {
            if (!string.IsNullOrWhiteSpace(value)) return value.Trim();
        }

        return null;
    }

    public TrackDto UpsertTrack(UpsertTrackRequest request)
    {
        var id = string.IsNullOrWhiteSpace(request.Id)
            ? $"tr-{Guid.NewGuid():N}"[..12]
            : request.Id.Trim();
        var now = DateTime.UtcNow;
        var row = db.Tracks.FirstOrDefault(t => t.Id == id);
        if (row is null)
        {
            row = new Track { Id = id, CreatedAtUtc = now, IsActive = true };
            db.Tracks.Add(row);
        }

        row.BranchId = request.BranchId.Trim();
        row.Title = request.Title.Trim();
        row.Icon = string.IsNullOrWhiteSpace(request.Icon) ? "code" : request.Icon.Trim();
        row.UpdatedAtUtc = now;
        row.IsDeleted = false;
        db.SaveChanges();

        return ListTracks(row.BranchId).First(t => t.Id == id);
    }

    public void DeleteTrack(string id)
    {
        var row = db.Tracks.FirstOrDefault(t => t.Id == id);
        if (row is null) return;
        row.IsDeleted = true;
        row.UpdatedAtUtc = DateTime.UtcNow;
        db.SaveChanges();
    }

    public SectionDetailDto? GetSectionDetail(string sectionId)
    {
        var section = db.TrainingSections.AsNoTracking()
            .FirstOrDefault(s => s.Id == sectionId && !s.IsDeleted);
        if (section is null) return null;

        var trainer = db.Users.AsNoTracking().FirstOrDefault(u => u.Id == section.TrainerUserId);
        var enrollments = db.SectionEnrollments.AsNoTracking()
            .Where(e => e.SectionId == sectionId)
            .ToList();
        var studentIds = enrollments.Select(e => e.StudentUserId).ToList();
        var studentMap = db.Users.AsNoTracking()
            .Where(u => studentIds.Contains(u.Id))
            .ToDictionary(u => u.Id);

        return new SectionDetailDto
        {
            Id = section.Id,
            Title = section.Title,
            Company = section.Company,
            DurationLabel = section.DurationLabel,
            Status = PortalStatusIds.ToCode(section.StatusId),
            TrainerLegacyId = trainer is null ? string.Empty : users.LegacyId(trainer),
            TasksCount = db.TraineeTasks.Count(t => t.SectionId == sectionId && !t.IsDeleted),
            StudentsCount = enrollments.Count,
            Students = enrollments.Select(e =>
            {
                studentMap.TryGetValue(e.StudentUserId, out var student);
                return new SectionStudentDto
                {
                    Id = student is null ? e.StudentUserId : users.LegacyId(student),
                    Name = student?.FullName ?? string.Empty,
                    Email = student?.Email ?? string.Empty,
                    Progress = e.ProgressPercent,
                    CompletedTasks = e.CompletedTasks,
                    TotalTasks = e.TotalTasks,
                };
            }).ToList(),
        };
    }

    public IReadOnlyList<SectionTaskDto> ListSectionTasks(string sectionId)
    {
        var tasks = db.TraineeTasks.AsNoTracking()
            .Where(t => t.SectionId == sectionId && !t.IsDeleted)
            .ToList();
        var studentIds = tasks.Select(t => t.StudentUserId).Distinct().ToList();
        var studentMap = db.Users.AsNoTracking()
            .Where(u => studentIds.Contains(u.Id))
            .ToDictionary(u => u.Id);

        return tasks
            .GroupBy(t => new { t.Title, t.DeadlineUtc })
            .Select(g =>
            {
                var first = g.OrderBy(t => t.Id).First();
                return new SectionTaskDto
                {
                    Id = first.Id,
                    SectionId = sectionId,
                    Title = first.Title,
                    Description = first.Description,
                    Deadline = first.DeadlineUtc.ToString("yyyy-MM-dd"),
                    SubmissionStatus = PortalStatusIds.ToDisplayLabel(first.StatusId),
                    AssignedStudentIds = g.Select(t => !string.IsNullOrWhiteSpace(t.StudentUserId) && studentMap.TryGetValue(t.StudentUserId, out var s)
                        ? users.LegacyId(s) : t.StudentUserId ?? string.Empty).ToList(),
                    AssignedStudentNames = g.Select(t => !string.IsNullOrWhiteSpace(t.StudentUserId) && studentMap.TryGetValue(t.StudentUserId, out var s)
                        ? s.FullName : string.Empty).Where(n => n.Length > 0).ToList(),
                };
            })
            .ToList();
    }

    public SectionTaskDto UpsertSectionTask(UpsertSectionTaskRequest request)
    {
        var sectionId = request.SectionId.Trim();
        var title = request.Title.Trim();
        DateTime deadline = DateTime.UtcNow.AddDays(7);
        if (!string.IsNullOrWhiteSpace(request.Deadline) && DateTime.TryParse(request.Deadline, out var parsed))
            deadline = DateTime.SpecifyKind(parsed, DateTimeKind.Utc);

        if (!string.IsNullOrWhiteSpace(request.Id))
        {
            var anchor = db.TraineeTasks.FirstOrDefault(t => t.Id == request.Id && t.SectionId == sectionId);
            if (anchor is not null)
            {
                var toRemove = db.TraineeTasks
                    .Where(t => t.SectionId == sectionId && t.Title == anchor.Title && t.DeadlineUtc == anchor.DeadlineUtc)
                    .ToList();
                foreach (var t in toRemove) t.IsDeleted = true;
            }
        }

        var now = DateTime.UtcNow;
        string? firstId = null;
        foreach (var legacyId in request.StudentLegacyIds.Distinct())
        {
            var student = users.FindByLegacyOrId(legacyId)
                ?? throw new InvalidOperationException($"Student not found: {legacyId}");
            var taskId = $"{sectionId}-{Guid.NewGuid():N}"[..24];
            if (firstId is null) firstId = taskId;
            db.TraineeTasks.Add(new TraineeTask
            {
                Id = taskId,
                StudentUserId = student.Id,
                SectionId = sectionId,
                Title = title,
                Description = request.Description,
                DeadlineUtc = deadline,
                StatusId = PortalStatusIds.TaskNotSubmitted,
                CreatedAtUtc = now,
                UpdatedAtUtc = now,
            });
        }

        db.SaveChanges();
        if (firstId is null)
            throw new InvalidOperationException("At least one student is required.");

        return ListSectionTasks(sectionId).First(t => t.Id == firstId);
    }

    public void DeleteSectionTask(string sectionId, string taskGroupId)
    {
        var anchor = db.TraineeTasks.FirstOrDefault(t => t.Id == taskGroupId && t.SectionId == sectionId);
        if (anchor is null) return;
        var rows = db.TraineeTasks
            .Where(t => t.SectionId == sectionId && t.Title == anchor.Title && t.DeadlineUtc == anchor.DeadlineUtc)
            .ToList();
        foreach (var row in rows)
        {
            row.IsDeleted = true;
            row.UpdatedAtUtc = DateTime.UtcNow;
        }
        db.SaveChanges();
    }

    public CompanyPostDto UpsertCompanyPost(UpsertCompanyPostRequest request)
    {
        var id = string.IsNullOrWhiteSpace(request.Id)
            ? $"p-{Guid.NewGuid():N}"[..10]
            : request.Id.Trim();
        var now = DateTime.UtcNow;
        var row = db.CompanyPosts.Include(p => p.Tags).FirstOrDefault(p => p.Id == id);
        if (row is null)
        {
            row = new CompanyPost { Id = id, CreatedAtUtc = now };
            db.CompanyPosts.Add(row);
        }

        row.BranchId = request.BranchId.Trim();
        row.Title = request.Title.Trim();
        row.Body = request.Body;
        row.TrainingTitle = request.TrainingTitle;
        row.TrainingId = ResolveCompanyPostTrainingId(request.BranchId, request.TrainingId, request.TrainingTitle);
        row.StatusId = request.Status.Equals("pending", StringComparison.OrdinalIgnoreCase)
            ? PortalStatusIds.PostPending
            : PortalStatusIds.PostPublished;
        if (!string.IsNullOrWhiteSpace(request.Deadline) && DateOnly.TryParse(request.Deadline, out var dl))
            row.Deadline = dl;
        row.UpdatedAtUtc = now;
        row.IsDeleted = false;

        var existingTags = db.Set<CompanyPostTag>().Where(t => t.PostId == id).ToList();
        db.Set<CompanyPostTag>().RemoveRange(existingTags);
        row.Tags.Clear();
        if (!string.IsNullOrWhiteSpace(request.Tags))
        {
            foreach (var tagName in request.Tags.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                var tag = db.Set<RefTag>().FirstOrDefault(t => t.Name == tagName);
                if (tag is null)
                {
                    tag = new RefTag { Name = tagName };
                    db.Set<RefTag>().Add(tag);
                    db.SaveChanges();
                }

                row.Tags.Add(new CompanyPostTag { PostId = id, TagId = tag.Id });
            }
        }

        db.SaveChanges();
        return ListCompanyPosts(row.BranchId).First(p => p.Id == id);
    }

    public void DeleteCompanyPost(string id)
    {
        var row = db.CompanyPosts.FirstOrDefault(p => p.Id == id);
        if (row is null) return;
        row.IsDeleted = true;
        row.UpdatedAtUtc = DateTime.UtcNow;
        db.SaveChanges();
    }

    public EvaluationTaskItemDto UpdateEvaluationItem(string itemId, UpdateEvaluationItemRequest request)
    {
        var item = db.Set<EvaluationTaskItem>().FirstOrDefault(i => i.Id == itemId)
            ?? throw new InvalidOperationException("Evaluation item not found.");

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            var status = request.Status.Trim();
            item.StatusId = status.Equals("evaluated", StringComparison.OrdinalIgnoreCase)
                ? PortalStatusIds.EvaluationEvaluated
                : status.Equals("pending_evaluation", StringComparison.OrdinalIgnoreCase)
                    || status.Equals("Pending Evaluation", StringComparison.OrdinalIgnoreCase)
                    ? PortalStatusIds.EvaluationPending
                    : PortalStatusIds.TaskFromDisplayOrCode(status);
        }
        if (!string.IsNullOrWhiteSpace(request.SubmittedOn) && DateOnly.TryParse(request.SubmittedOn, out var sub))
            item.SubmittedOn = sub;
        if (request.RepoTag is not null) item.RepoTag = request.RepoTag;
        if (request.RepoBranch is not null) item.RepoBranch = request.RepoBranch;
        if (request.Grade is not null) item.Grade = request.Grade.Trim();
        if (request.Feedback is not null) item.Feedback = request.Feedback.Trim();
        db.SaveChanges();

        return new EvaluationTaskItemDto
        {
            Id = item.Id,
            Title = item.Title,
            Deadline = item.Deadline?.ToString("yyyy-MM-dd"),
            SubmittedOn = item.SubmittedOn?.ToString("yyyy-MM-dd"),
            RepoTag = item.RepoTag,
            RepoBranch = item.RepoBranch,
            Status = PortalStatusIds.ToDisplayLabel(item.StatusId),
            Grade = item.Grade,
            Feedback = item.Feedback,
        };
    }

    private string? ResolveCompanyPostTrainingId(string branchId, string? trainingId, string? trainingTitle)
    {
        var bid = branchId.Trim();
        if (!string.IsNullOrWhiteSpace(trainingId))
        {
            var id = trainingId.Trim();
            var existsInBranch = db.Trainings.AsNoTracking()
                .Any(t => t.Id == id && !t.IsDeleted && t.BranchId == bid);
            if (existsInBranch) return id;

            var existsAnyBranch = db.Trainings.AsNoTracking()
                .Any(t => t.Id == id && !t.IsDeleted);
            if (existsAnyBranch) return id;
        }

        var title = trainingTitle?.Trim();
        if (string.IsNullOrWhiteSpace(title)) return null;

        var sameBranch = db.Trainings.AsNoTracking()
            .Where(t => !t.IsDeleted && t.BranchId == bid)
            .AsEnumerable()
            .FirstOrDefault(t => string.Equals(t.Title.Trim(), title, StringComparison.OrdinalIgnoreCase))
            ?.Id;
        if (!string.IsNullOrWhiteSpace(sameBranch)) return sameBranch;

        var anyBranch = db.Trainings.AsNoTracking()
            .Where(t => !t.IsDeleted)
            .AsEnumerable()
            .FirstOrDefault(t => string.Equals(t.Title.Trim(), title, StringComparison.OrdinalIgnoreCase))
            ?.Id;
        if (!string.IsNullOrWhiteSpace(anyBranch)) return anyBranch;

        var companyRequest = db.CompanyTrainingRequests.AsNoTracking()
            .Where(r => !r.IsDeleted
                        && r.ReviewStatus == "APPROVED"
                        && r.PublishedTrainingId != null
                        && r.BranchId == bid)
            .AsEnumerable()
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefault(r => string.Equals(r.Title.Trim(), title, StringComparison.OrdinalIgnoreCase));

        if (companyRequest is null) return null;

        var publishedId = companyRequest.PublishedTrainingId!.Trim();
        var tracked = db.CompanyTrainingRequests.FirstOrDefault(r => r.Id == companyRequest.Id);
        if (tracked is not null)
        {
            CompanyTrainingCatalogSync.EnsureFromRequestAsync(db, tracked).GetAwaiter().GetResult();
        }

        return publishedId;
    }
}
