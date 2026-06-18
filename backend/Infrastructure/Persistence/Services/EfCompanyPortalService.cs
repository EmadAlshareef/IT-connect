using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TrainerPortal.Api.Application.Validators;
using TrainerPortal.Api.Domain.Entities;
using TrainerPortal.Api.Domain.Entities.Portal;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Infrastructure.Persistence.Services;

public sealed class EfCompanyPortalService(
    ApplicationDbContext db,
    UserManager<ApplicationUser> userManager) : ICompanyPortalService
{
    public async Task<IReadOnlyList<CompanyDto>> ListCompaniesAsync(string? email = null, CancellationToken cancellationToken = default)
    {
        var query = db.Companies.AsNoTracking().Where(c => c.IsActive);
        if (!string.IsNullOrWhiteSpace(email))
        {
            var normalized = NormalizeEmail(email);
            query = query.Where(c => c.Email != null && c.Email.ToLower() == normalized);
        }

        var rows = await query.OrderByDescending(c => c.CreatedAt).ToListAsync(cancellationToken);
        return rows.Select(MapCompany).ToList();
    }

    public async Task<CompanyDto?> GetCompanyAsync(string id, CancellationToken cancellationToken = default)
    {
        var row = await db.Companies.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id && c.IsActive, cancellationToken);
        return row is null ? null : MapCompany(row);
    }

    public async Task<CompanyDto> CreateCompanyAsync(CreateCompanyRequest request, CancellationToken cancellationToken = default)
    {
        var name = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Company name is required.", nameof(request));

        var now = DateTime.UtcNow;
        var slug = string.IsNullOrWhiteSpace(request.Slug)
            ? Slugify(name)
            : request.Slug.Trim().ToLowerInvariant();
        slug = await EnsureUniqueSlugAsync(slug, cancellationToken: cancellationToken);

        var entity = new Company
        {
            Id = $"co-{Guid.NewGuid():N}"[..12],
            Name = name,
            Slug = slug,
            Email = NormalizeEmailOrNull(request.Email),
            Phone = TrimOrNull(request.Phone),
            LogoUrl = TrimOrNull(request.LogoUrl),
            Industry = TrimOrNull(request.Industry),
            Location = TrimOrNull(request.Location),
            Vision = TrimOrNull(request.Vision),
            Description = TrimOrNull(request.Description),
            LegacyLocalId = TrimOrNull(request.LegacyLocalId),
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now,
        };

        db.Companies.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return MapCompany(entity);
    }

    public async Task<CompanyDto?> UpdateCompanyAsync(string id, UpdateCompanyRequest request, CancellationToken cancellationToken = default)
    {
        var entity = await db.Companies.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (entity is null) return null;

        var name = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Company name is required.", nameof(request));

        entity.Name = name;
        var slug = string.IsNullOrWhiteSpace(request.Slug)
            ? Slugify(name)
            : request.Slug.Trim().ToLowerInvariant();
        entity.Slug = await EnsureUniqueSlugAsync(slug, entity.Id, cancellationToken);
        entity.Email = NormalizeEmailOrNull(request.Email);
        entity.Phone = TrimOrNull(request.Phone);
        entity.LogoUrl = TrimOrNull(request.LogoUrl);
        entity.Industry = TrimOrNull(request.Industry);
        entity.Location = TrimOrNull(request.Location);
        entity.Vision = TrimOrNull(request.Vision);
        entity.Description = TrimOrNull(request.Description);
        entity.LegacyLocalId = TrimOrNull(request.LegacyLocalId);
        entity.IsActive = request.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        return MapCompany(entity);
    }

    public async Task<bool> DeleteCompanyAsync(string id, CancellationToken cancellationToken = default)
    {
        var entity = await db.Companies.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (entity is null || !entity.IsActive) return false;

        entity.IsActive = false;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<CompanyTrainerDto>> ListCompanyTrainersAsync(
        string? companyId = null,
        string? companyEmail = null,
        string? trainerEmail = null,
        CancellationToken cancellationToken = default)
    {
        var query = db.CompanyTrainers.AsNoTracking()
            .Include(t => t.LinkedTracks)
            .Where(t => !t.IsDeleted);

        if (!string.IsNullOrWhiteSpace(companyId))
            query = query.Where(t => t.CompanyId == companyId.Trim());
        if (!string.IsNullOrWhiteSpace(companyEmail))
        {
            var email = NormalizeEmail(companyEmail);
            query = query.Where(t => t.CompanyEmail == email);
        }
        if (!string.IsNullOrWhiteSpace(trainerEmail))
        {
            var email = NormalizeEmail(trainerEmail);
            query = query.Where(t => t.Email == email);
        }

        var rows = await query.OrderByDescending(t => t.CreatedAt).ToListAsync(cancellationToken);
        return rows.Select(MapCompanyTrainer).ToList();
    }

    public async Task<CompanyTrainerDto?> GetCompanyTrainerAsync(string id, CancellationToken cancellationToken = default)
    {
        var row = await db.CompanyTrainers.AsNoTracking()
            .Include(t => t.LinkedTracks)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted, cancellationToken);
        return row is null ? null : MapCompanyTrainer(row);
    }

    public async Task<CompanyTrainerDto> CreateCompanyTrainerAsync(CreateCompanyTrainerRequest request, CancellationToken cancellationToken = default)
    {
        var companyEmail = NormalizeEmail(request.CompanyEmail);
        var fullName = request.FullName.Trim();
        var email = NormalizeEmail(request.Email);
        if (string.IsNullOrWhiteSpace(companyEmail) || string.IsNullOrWhiteSpace(fullName) || string.IsNullOrWhiteSpace(email))
            throw new ArgumentException("Company email, full name, and email are required.", nameof(request));

        var linkedTitles = NormalizeTrackTitles(request.LinkedTrackTitles);
        if (linkedTitles.Count == 0)
            throw new ArgumentException("At least one linked track title is required.", nameof(request));

        if (string.IsNullOrWhiteSpace(request.Password))
            throw new ArgumentException("Password is required for trainer login.", nameof(request));

        await ProvisionTrainerAccountAsync(fullName, email, request.Password, cancellationToken);

        var companyId = await ResolveCompanyIdAsync(request.CompanyId, companyEmail, cancellationToken);
        var now = DateTime.UtcNow;
        var entity = new CompanyTrainer
        {
            Id = $"co-tr-{Guid.NewGuid():N}"[..14],
            CompanyId = companyId,
            CompanyEmail = companyEmail,
            FullName = fullName,
            Email = email,
            CompanyPosition = TrimOrNull(request.CompanyPosition),
            LegacyLocalId = TrimOrNull(request.LegacyLocalId),
            CreatedAt = now,
            IsDeleted = false,
        };

        entity.LinkedTracks = linkedTitles
            .Select((title, index) => new CompanyTrainerLinkedTrack
            {
                TrainerId = entity.Id,
                TrackTitle = title,
                SortOrder = index,
            })
            .ToList();

        db.CompanyTrainers.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return MapCompanyTrainer(entity);
    }

    public async Task<CompanyTrainerDto?> UpdateCompanyTrainerAsync(string id, UpdateCompanyTrainerRequest request, CancellationToken cancellationToken = default)
    {
        var entity = await db.CompanyTrainers
            .Include(t => t.LinkedTracks)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted, cancellationToken);
        if (entity is null) return null;

        var companyEmail = NormalizeEmail(request.CompanyEmail);
        var fullName = request.FullName.Trim();
        var email = NormalizeEmail(request.Email);
        if (string.IsNullOrWhiteSpace(companyEmail) || string.IsNullOrWhiteSpace(fullName) || string.IsNullOrWhiteSpace(email))
            throw new ArgumentException("Company email, full name, and email are required.", nameof(request));

        var linkedTitles = NormalizeTrackTitles(request.LinkedTrackTitles);
        if (linkedTitles.Count == 0)
            throw new ArgumentException("At least one linked track title is required.", nameof(request));

        entity.CompanyId = await ResolveCompanyIdAsync(request.CompanyId, companyEmail, cancellationToken);
        entity.CompanyEmail = companyEmail;
        entity.FullName = fullName;
        entity.Email = email;
        entity.CompanyPosition = TrimOrNull(request.CompanyPosition);
        entity.LegacyLocalId = TrimOrNull(request.LegacyLocalId);

        if (!string.IsNullOrWhiteSpace(request.Password))
            await ProvisionTrainerAccountAsync(fullName, email, request.Password, cancellationToken);

        db.CompanyTrainerLinkedTracks.RemoveRange(entity.LinkedTracks);
        entity.LinkedTracks = linkedTitles
            .Select((title, index) => new CompanyTrainerLinkedTrack
            {
                TrainerId = entity.Id,
                TrackTitle = title,
                SortOrder = index,
            })
            .ToList();

        await db.SaveChangesAsync(cancellationToken);
        return MapCompanyTrainer(entity);
    }

    public async Task<bool> DeleteCompanyTrainerAsync(string id, CancellationToken cancellationToken = default)
    {
        var entity = await db.CompanyTrainers.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted, cancellationToken);
        if (entity is null) return false;

        entity.IsDeleted = true;
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<CompanyTrackRequestDto>> ListCompanyTrackRequestsAsync(
        string? companyId = null,
        string? companyEmail = null,
        string? branchId = null,
        CancellationToken cancellationToken = default)
    {
        var query = db.CompanyTrackRequests.AsNoTracking().Where(r => !r.IsDeleted);
        if (!string.IsNullOrWhiteSpace(companyId))
            query = query.Where(r => r.CompanyId == companyId.Trim());
        if (!string.IsNullOrWhiteSpace(companyEmail))
        {
            var email = NormalizeEmail(companyEmail);
            query = query.Where(r => r.CompanyEmail == email || r.RequestedByEmail == email);
        }
        if (!string.IsNullOrWhiteSpace(branchId))
            query = query.Where(r => r.BranchId == branchId.Trim());

        var rows = await query.OrderByDescending(r => r.CreatedAt).ToListAsync(cancellationToken);
        return rows.Select(MapCompanyTrackRequest).ToList();
    }

    public async Task<CompanyTrackRequestDto?> GetCompanyTrackRequestAsync(string id, CancellationToken cancellationToken = default)
    {
        var row = await db.CompanyTrackRequests.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, cancellationToken);
        return row is null ? null : MapCompanyTrackRequest(row);
    }

    public async Task<CompanyTrackRequestDto> CreateCompanyTrackRequestAsync(
        CreateCompanyTrackRequestRequest request,
        CancellationToken cancellationToken = default)
    {
        var title = request.Title.Trim();
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title is required.", nameof(request));

        var companyEmail = NormalizeEmailOrNull(request.CompanyEmail ?? request.RequestedByEmail);
        var companyId = await ResolveCompanyIdAsync(request.CompanyId, companyEmail, cancellationToken);
        var now = DateTime.UtcNow;

        var entity = new CompanyTrackRequest
        {
            Id = $"ctr-{Guid.NewGuid():N}"[..12],
            CompanyId = companyId,
            CompanyEmail = companyEmail,
            BranchId = string.IsNullOrWhiteSpace(request.BranchId) ? "cairo" : request.BranchId.Trim(),
            Title = title,
            Description = TrimOrNull(request.Description),
            RequestedBy = TrimOrNull(request.RequestedBy) ?? "Company Member",
            RequestedByEmail = NormalizeEmailOrNull(request.RequestedByEmail),
            Status = "PENDING",
            LegacyLocalId = TrimOrNull(request.LegacyLocalId),
            CreatedAt = now,
            IsDeleted = false,
        };

        db.CompanyTrackRequests.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return MapCompanyTrackRequest(entity);
    }

    public async Task<CompanyTrackRequestDto?> UpdateCompanyTrackRequestAsync(
        string id,
        UpdateCompanyTrackRequestRequest request,
        CancellationToken cancellationToken = default)
    {
        var entity = await db.CompanyTrackRequests.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, cancellationToken);
        if (entity is null) return null;

        var title = request.Title.Trim();
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title is required.", nameof(request));

        var companyEmail = NormalizeEmailOrNull(request.CompanyEmail ?? request.RequestedByEmail);
        entity.CompanyId = await ResolveCompanyIdAsync(request.CompanyId, companyEmail, cancellationToken);
        entity.CompanyEmail = companyEmail;
        entity.BranchId = string.IsNullOrWhiteSpace(request.BranchId) ? entity.BranchId : request.BranchId.Trim();
        entity.Title = title;
        entity.Description = TrimOrNull(request.Description);
        entity.RequestedBy = TrimOrNull(request.RequestedBy);
        entity.RequestedByEmail = NormalizeEmailOrNull(request.RequestedByEmail);
        entity.Status = NormalizeStatus(request.Status, "PENDING");
        entity.ApprovedTrackId = TrimOrNull(request.ApprovedTrackId);
        entity.ReviewedAt = request.ReviewedAt;
        entity.ReviewedBy = TrimOrNull(request.ReviewedBy);
        entity.LegacyLocalId = TrimOrNull(request.LegacyLocalId);

        await db.SaveChangesAsync(cancellationToken);
        return MapCompanyTrackRequest(entity);
    }

    public async Task<bool> DeleteCompanyTrackRequestAsync(string id, CancellationToken cancellationToken = default)
    {
        var entity = await db.CompanyTrackRequests.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, cancellationToken);
        if (entity is null) return false;

        entity.IsDeleted = true;
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<CompanyTrainingRequestDto>> ListCompanyTrainingRequestsAsync(
        string? companyId = null,
        string? companyEmail = null,
        string? branchId = null,
        string? trainerEmail = null,
        CancellationToken cancellationToken = default)
    {
        var query = db.CompanyTrainingRequests.AsNoTracking().Where(r => !r.IsDeleted);
        if (!string.IsNullOrWhiteSpace(companyId))
            query = query.Where(r => r.CompanyId == companyId.Trim());
        if (!string.IsNullOrWhiteSpace(companyEmail))
        {
            var email = NormalizeEmail(companyEmail);
            query = query.Where(r => r.CompanyEmail == email || r.RequestedByEmail == email);
        }
        if (!string.IsNullOrWhiteSpace(branchId))
            query = query.Where(r => r.BranchId == branchId.Trim());
        if (!string.IsNullOrWhiteSpace(trainerEmail))
        {
            var email = NormalizeEmail(trainerEmail);
            query = query.Where(r => r.TrainerEmail != null && r.TrainerEmail.ToLower() == email);
        }

        var rows = await query.OrderByDescending(r => r.CreatedAt).ToListAsync(cancellationToken);
        return rows.Select(MapCompanyTrainingRequest).ToList();
    }

    public async Task<IReadOnlyList<CompanyEnrolledStudentDto>> ListCompanyEnrolledStudentsAsync(
        string? companyId = null,
        string? companyEmail = null,
        CancellationToken cancellationToken = default)
    {
        var trainingQuery = db.CompanyTrainingRequests.AsNoTracking()
            .Where(r =>
                !r.IsDeleted &&
                r.ReviewStatus == "APPROVED" &&
                r.PublishedTrainingId != null &&
                r.PublishedTrainingId != "");

        if (!string.IsNullOrWhiteSpace(companyId))
            trainingQuery = trainingQuery.Where(r => r.CompanyId == companyId.Trim());

        if (!string.IsNullOrWhiteSpace(companyEmail))
        {
            var email = NormalizeEmail(companyEmail);
            trainingQuery = trainingQuery.Where(r => r.CompanyEmail == email || r.RequestedByEmail == email);
        }

        var rows = await (
            from training in trainingQuery
            join enrollment in db.EnrollmentApplications.AsNoTracking()
                on training.PublishedTrainingId equals enrollment.CourseId
            join student in db.Users.AsNoTracking()
                on enrollment.StudentUserId equals student.Id
            where
                !enrollment.IsDeleted &&
                enrollment.StatusId != PortalStatusIds.EnrollmentRejected &&
                enrollment.BranchId == training.BranchId &&
                !student.IsDeleted
            orderby enrollment.CreatedAtUtc descending
            select new
            {
                EnrollmentId = enrollment.Id,
                enrollment.StudentUserId,
                student.FullName,
                student.Email,
                TrainingTitle = training.Title,
                TrainingId = training.PublishedTrainingId!,
                training.BranchId,
                enrollment.CourseId,
                training.TrainerName,
                training.TrainerEmail,
                enrollment.StatusId,
                enrollment.CreatedAtUtc,
            })
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(row => $"{row.StudentUserId}::{row.CourseId}")
            .Select(group => group.First())
            .Select(row => new CompanyEnrolledStudentDto
            {
                Id = row.EnrollmentId,
                UserId = row.StudentUserId,
                Name = string.IsNullOrWhiteSpace(row.FullName) ? "Student" : row.FullName,
                Email = row.Email ?? string.Empty,
                TrainingTitle = string.IsNullOrWhiteSpace(row.TrainingTitle) ? "Training program" : row.TrainingTitle,
                TrainingId = row.TrainingId,
                BranchId = row.BranchId,
                CourseId = row.CourseId,
                TrainerName = row.TrainerName,
                TrainerEmail = row.TrainerEmail,
                Status = PortalStatusIds.ToCode(row.StatusId),
                EnrolledAt = row.CreatedAtUtc,
            })
            .ToList();
    }

    public async Task<CompanyTrainingRequestDto?> GetCompanyTrainingRequestAsync(string id, CancellationToken cancellationToken = default)
    {
        var row = await db.CompanyTrainingRequests.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, cancellationToken);
        return row is null ? null : MapCompanyTrainingRequest(row);
    }

    public async Task<CompanyTrainingRequestDto> CreateCompanyTrainingRequestAsync(
        CreateCompanyTrainingRequestRequest request,
        CancellationToken cancellationToken = default)
    {
        var title = request.Title.Trim();
        var trainerName = TrimOrNull(request.TrainerName);
        if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(trainerName))
            throw new ArgumentException("Title and trainer name are required.", nameof(request));

        var companyEmail = NormalizeEmailOrNull(request.CompanyEmail ?? request.RequestedByEmail);
        var companyId = await ResolveCompanyIdAsync(request.CompanyId, companyEmail, cancellationToken);
        var now = DateTime.UtcNow;

        var entity = new CompanyTrainingRequest
        {
            Id = $"ctrn-{Guid.NewGuid():N}"[..13],
            CompanyId = companyId,
            CompanyEmail = companyEmail,
            BranchId = string.IsNullOrWhiteSpace(request.BranchId) ? "cairo" : request.BranchId.Trim(),
            Title = title,
            Body = TrimOrNull(request.Body) ?? "No description provided.",
            TrackRequestId = TrimOrNull(request.TrackRequestId),
            TrackTitle = TrimOrNull(request.TrackTitle),
            TrainerName = trainerName,
            TrainerEmail = NormalizeEmailOrNull(request.TrainerEmail),
            StartDate = ParseDateOnly(request.StartDate),
            SeatsTotal = Math.Max(1, request.SeatsTotal),
            TrainingStatus = request.TrainingStatus.Equals("upcoming", StringComparison.OrdinalIgnoreCase) ? "upcoming" : "active",
            DocumentFileName = TrimOrNull(request.DocumentFileName),
            DocumentDataUrl = TrimOrNull(request.DocumentDataUrl),
            RequestedBy = TrimOrNull(request.RequestedBy) ?? "Company Member",
            RequestedByEmail = NormalizeEmailOrNull(request.RequestedByEmail),
            ReviewStatus = "PENDING",
            LegacyLocalId = TrimOrNull(request.LegacyLocalId),
            CreatedAt = now,
            IsDeleted = false,
        };

        db.CompanyTrainingRequests.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return MapCompanyTrainingRequest(entity);
    }

    public async Task<CompanyTrainingRequestDto?> UpdateCompanyTrainingRequestAsync(
        string id,
        UpdateCompanyTrainingRequestRequest request,
        CancellationToken cancellationToken = default)
    {
        var entity = await db.CompanyTrainingRequests.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, cancellationToken);
        if (entity is null) return null;

        var title = request.Title.Trim();
        var trainerName = TrimOrNull(request.TrainerName);
        if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(trainerName))
            throw new ArgumentException("Title and trainer name are required.", nameof(request));

        var companyEmail = NormalizeEmailOrNull(request.CompanyEmail ?? request.RequestedByEmail);
        entity.CompanyId = await ResolveCompanyIdAsync(request.CompanyId, companyEmail, cancellationToken);
        entity.CompanyEmail = companyEmail;
        entity.BranchId = string.IsNullOrWhiteSpace(request.BranchId) ? entity.BranchId : request.BranchId.Trim();
        entity.Title = title;
        entity.Body = TrimOrNull(request.Body);
        entity.TrackRequestId = TrimOrNull(request.TrackRequestId);
        entity.TrackTitle = TrimOrNull(request.TrackTitle);
        entity.TrainerName = trainerName;
        entity.TrainerEmail = NormalizeEmailOrNull(request.TrainerEmail);
        entity.StartDate = ParseDateOnly(request.StartDate);
        entity.SeatsTotal = Math.Max(1, request.SeatsTotal);
        entity.TrainingStatus = request.TrainingStatus.Equals("upcoming", StringComparison.OrdinalIgnoreCase) ? "upcoming" : "active";
        entity.DocumentFileName = TrimOrNull(request.DocumentFileName);
        entity.DocumentDataUrl = TrimOrNull(request.DocumentDataUrl);
        entity.RequestedBy = TrimOrNull(request.RequestedBy);
        entity.RequestedByEmail = NormalizeEmailOrNull(request.RequestedByEmail);
        entity.ReviewStatus = NormalizeStatus(request.ReviewStatus, "PENDING");
        entity.ReviewedAt = request.ReviewedAt;
        entity.ReviewedBy = TrimOrNull(request.ReviewedBy);
        entity.PublishedTrainingId = TrimOrNull(request.PublishedTrainingId);
        entity.LegacyLocalId = TrimOrNull(request.LegacyLocalId);

        await db.SaveChangesAsync(cancellationToken);
        await SyncPublishedTrainingTrainerAsync(entity, cancellationToken);
        return MapCompanyTrainingRequest(entity);
    }

    public async Task<bool> DeleteCompanyTrainingRequestAsync(string id, CancellationToken cancellationToken = default)
    {
        var entity = await db.CompanyTrainingRequests.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, cancellationToken);
        if (entity is null) return false;

        entity.IsDeleted = true;
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<CompanyPostRequestDto>> ListCompanyPostRequestsAsync(
        string? companyId = null,
        string? companyEmail = null,
        string? branchId = null,
        CancellationToken cancellationToken = default)
    {
        var query = db.CompanyPostRequests.AsNoTracking().Where(r => !r.IsDeleted);
        if (!string.IsNullOrWhiteSpace(companyId))
            query = query.Where(r => r.CompanyId == companyId.Trim());
        if (!string.IsNullOrWhiteSpace(companyEmail))
        {
            var email = NormalizeEmail(companyEmail);
            query = query.Where(r => r.CompanyEmail == email || r.RequestedByEmail == email);
        }
        if (!string.IsNullOrWhiteSpace(branchId))
            query = query.Where(r => r.BranchId == branchId.Trim());

        var rows = await query.OrderByDescending(r => r.CreatedAt).ToListAsync(cancellationToken);
        return rows.Select(MapCompanyPostRequest).ToList();
    }

    public async Task<CompanyPostRequestDto?> GetCompanyPostRequestAsync(string id, CancellationToken cancellationToken = default)
    {
        var row = await db.CompanyPostRequests.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, cancellationToken);
        return row is null ? null : MapCompanyPostRequest(row);
    }

    public async Task<CompanyPostRequestDto> CreateCompanyPostRequestAsync(
        CreateCompanyPostRequestRequest request,
        CancellationToken cancellationToken = default)
    {
        var title = request.Title.Trim();
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title is required.", nameof(request));

        var companyEmail = NormalizeEmailOrNull(request.CompanyEmail ?? request.RequestedByEmail);
        var companyId = await ResolveCompanyIdAsync(request.CompanyId, companyEmail, cancellationToken);
        var now = DateTime.UtcNow;

        var entity = new CompanyPostRequest
        {
            Id = $"cpr-{Guid.NewGuid():N}"[..12],
            CompanyId = companyId,
            CompanyEmail = companyEmail,
            BranchId = string.IsNullOrWhiteSpace(request.BranchId) ? "cairo" : request.BranchId.Trim(),
            Title = title,
            Body = TrimOrNull(request.Body),
            TrainingTitle = TrimOrNull(request.TrainingTitle),
            CompanyTrainingRequestId = TrimOrNull(request.CompanyTrainingRequestId),
            SkillsRaw = TrimOrNull(request.SkillsRaw),
            Deadline = ParseDateOnly(request.Deadline),
            RequestedBy = TrimOrNull(request.RequestedBy) ?? "Company Member",
            RequestedByEmail = NormalizeEmailOrNull(request.RequestedByEmail),
            ReviewStatus = "PENDING",
            LegacyLocalId = TrimOrNull(request.LegacyLocalId),
            CreatedAt = now,
            IsDeleted = false,
        };

        db.CompanyPostRequests.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return MapCompanyPostRequest(entity);
    }

    public async Task<CompanyPostRequestDto?> UpdateCompanyPostRequestAsync(
        string id,
        UpdateCompanyPostRequestRequest request,
        CancellationToken cancellationToken = default)
    {
        var entity = await db.CompanyPostRequests.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, cancellationToken);
        if (entity is null) return null;

        var title = request.Title.Trim();
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title is required.", nameof(request));

        var companyEmail = NormalizeEmailOrNull(request.CompanyEmail ?? request.RequestedByEmail);
        entity.CompanyId = await ResolveCompanyIdAsync(request.CompanyId, companyEmail, cancellationToken);
        entity.CompanyEmail = companyEmail;
        entity.BranchId = string.IsNullOrWhiteSpace(request.BranchId) ? entity.BranchId : request.BranchId.Trim();
        entity.Title = title;
        entity.Body = TrimOrNull(request.Body);
        entity.TrainingTitle = TrimOrNull(request.TrainingTitle);
        entity.CompanyTrainingRequestId = TrimOrNull(request.CompanyTrainingRequestId);
        entity.SkillsRaw = TrimOrNull(request.SkillsRaw);
        entity.Deadline = ParseDateOnly(request.Deadline);
        entity.RequestedBy = TrimOrNull(request.RequestedBy);
        entity.RequestedByEmail = NormalizeEmailOrNull(request.RequestedByEmail);
        entity.ReviewStatus = NormalizeStatus(request.ReviewStatus, "PENDING");
        entity.ReviewedAt = request.ReviewedAt;
        entity.ReviewedBy = TrimOrNull(request.ReviewedBy);
        entity.LegacyLocalId = TrimOrNull(request.LegacyLocalId);

        await db.SaveChangesAsync(cancellationToken);
        return MapCompanyPostRequest(entity);
    }

    public async Task<bool> DeleteCompanyPostRequestAsync(string id, CancellationToken cancellationToken = default)
    {
        var entity = await db.CompanyPostRequests.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, cancellationToken);
        if (entity is null) return false;

        entity.IsDeleted = true;
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<CompanySelectedTrackDto>> ListCompanySelectedTracksAsync(
        string? companyId = null,
        string? companyEmail = null,
        CancellationToken cancellationToken = default)
    {
        var query = db.CompanySelectedTracks.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(companyId))
            query = query.Where(r => r.CompanyId == companyId.Trim());
        if (!string.IsNullOrWhiteSpace(companyEmail))
        {
            var email = NormalizeEmail(companyEmail);
            query = query.Where(r => r.CompanyEmail == email);
        }

        var rows = await query.OrderByDescending(r => r.AddedAt).ToListAsync(cancellationToken);
        return rows.Select(MapCompanySelectedTrack).ToList();
    }

    public async Task<CompanySelectedTrackDto?> GetCompanySelectedTrackAsync(string id, CancellationToken cancellationToken = default)
    {
        var row = await db.CompanySelectedTracks.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        return row is null ? null : MapCompanySelectedTrack(row);
    }

    public async Task<CompanySelectedTrackDto> CreateCompanySelectedTrackAsync(
        CreateCompanySelectedTrackRequest request,
        CancellationToken cancellationToken = default)
    {
        var companyEmail = NormalizeEmail(request.CompanyEmail);
        var trackValue = request.TrackValue.Trim();
        if (string.IsNullOrWhiteSpace(companyEmail) || string.IsNullOrWhiteSpace(trackValue))
            throw new ArgumentException("Company email and track value are required.", nameof(request));

        var companyId = await ResolveCompanyIdAsync(request.CompanyId, companyEmail, cancellationToken);
        var existing = await db.CompanySelectedTracks.FirstOrDefaultAsync(
            r => r.CompanyEmail == companyEmail && r.TrackValue == trackValue,
            cancellationToken);
        if (existing is not null)
            return MapCompanySelectedTrack(existing);

        var entity = new CompanySelectedTrack
        {
            Id = $"cst-{Guid.NewGuid():N}"[..12],
            CompanyId = companyId,
            CompanyEmail = companyEmail,
            TrackValue = trackValue,
            Title = TrimOrNull(request.Title),
            AddedAt = DateTime.UtcNow,
        };

        db.CompanySelectedTracks.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return MapCompanySelectedTrack(entity);
    }

    public async Task<CompanySelectedTrackDto?> UpdateCompanySelectedTrackAsync(
        string id,
        UpdateCompanySelectedTrackRequest request,
        CancellationToken cancellationToken = default)
    {
        var entity = await db.CompanySelectedTracks.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (entity is null) return null;

        var companyEmail = NormalizeEmail(request.CompanyEmail);
        var trackValue = request.TrackValue.Trim();
        if (string.IsNullOrWhiteSpace(companyEmail) || string.IsNullOrWhiteSpace(trackValue))
            throw new ArgumentException("Company email and track value are required.", nameof(request));

        var duplicate = await db.CompanySelectedTracks.AnyAsync(
            r => r.Id != id && r.CompanyEmail == companyEmail && r.TrackValue == trackValue,
            cancellationToken);
        if (duplicate)
            throw new InvalidOperationException("This track is already selected for the company.");

        entity.CompanyId = await ResolveCompanyIdAsync(request.CompanyId, companyEmail, cancellationToken);
        entity.CompanyEmail = companyEmail;
        entity.TrackValue = trackValue;
        entity.Title = TrimOrNull(request.Title);

        await db.SaveChangesAsync(cancellationToken);
        return MapCompanySelectedTrack(entity);
    }

    public async Task<bool> DeleteCompanySelectedTrackAsync(string id, CancellationToken cancellationToken = default)
    {
        var entity = await db.CompanySelectedTracks.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (entity is null) return false;

        db.CompanySelectedTracks.Remove(entity);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<string?> ResolveCompanyIdAsync(string? companyId, string? companyEmail, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(companyId))
            return companyId.Trim();

        if (string.IsNullOrWhiteSpace(companyEmail))
            return null;

        var email = NormalizeEmail(companyEmail);
        var company = await db.Companies.AsNoTracking()
            .Where(c => c.IsActive && c.Email != null && c.Email.ToLower() == email)
            .Select(c => c.Id)
            .FirstOrDefaultAsync(cancellationToken);

        return company;
    }

    private static CompanyDto MapCompany(Company row) => new()
    {
        Id = row.Id,
        Name = row.Name,
        Slug = row.Slug,
        Email = row.Email,
        Phone = row.Phone,
        LogoUrl = row.LogoUrl,
        Industry = row.Industry,
        Location = row.Location,
        Vision = row.Vision,
        Description = row.Description,
        LegacyLocalId = row.LegacyLocalId,
        IsActive = row.IsActive,
        CreatedAt = row.CreatedAt,
        UpdatedAt = row.UpdatedAt,
    };

    private static CompanyTrainerDto MapCompanyTrainer(CompanyTrainer row) => new()
    {
        Id = row.Id,
        CompanyId = row.CompanyId,
        CompanyEmail = row.CompanyEmail,
        FullName = row.FullName,
        Email = row.Email,
        CompanyPosition = row.CompanyPosition,
        LegacyLocalId = row.LegacyLocalId,
        CreatedAt = row.CreatedAt,
        LinkedTrackTitles = row.LinkedTracks
            .OrderBy(t => t.SortOrder)
            .Select(t => t.TrackTitle)
            .ToList(),
    };

    private static CompanyTrackRequestDto MapCompanyTrackRequest(CompanyTrackRequest row) => new()
    {
        Id = row.Id,
        CompanyId = row.CompanyId,
        CompanyEmail = row.CompanyEmail,
        BranchId = row.BranchId,
        Title = row.Title,
        Description = row.Description,
        RequestedBy = row.RequestedBy,
        RequestedByEmail = row.RequestedByEmail,
        Status = row.Status,
        ApprovedTrackId = row.ApprovedTrackId,
        ReviewedAt = row.ReviewedAt,
        ReviewedBy = row.ReviewedBy,
        LegacyLocalId = row.LegacyLocalId,
        CreatedAt = row.CreatedAt,
    };

    private static CompanyTrainingRequestDto MapCompanyTrainingRequest(CompanyTrainingRequest row) => new()
    {
        Id = row.Id,
        CompanyId = row.CompanyId,
        CompanyEmail = row.CompanyEmail,
        BranchId = row.BranchId,
        Title = row.Title,
        Body = row.Body,
        TrackRequestId = row.TrackRequestId,
        TrackTitle = row.TrackTitle,
        TrainerName = row.TrainerName,
        TrainerEmail = row.TrainerEmail,
        StartDate = row.StartDate?.ToString("yyyy-MM-dd"),
        SeatsTotal = row.SeatsTotal,
        TrainingStatus = row.TrainingStatus,
        DocumentFileName = row.DocumentFileName,
        DocumentDataUrl = row.DocumentDataUrl,
        RequestedBy = row.RequestedBy,
        RequestedByEmail = row.RequestedByEmail,
        ReviewStatus = row.ReviewStatus,
        ReviewedAt = row.ReviewedAt,
        ReviewedBy = row.ReviewedBy,
        PublishedTrainingId = row.PublishedTrainingId,
        LegacyLocalId = row.LegacyLocalId,
        CreatedAt = row.CreatedAt,
    };

    private static CompanyPostRequestDto MapCompanyPostRequest(CompanyPostRequest row) => new()
    {
        Id = row.Id,
        CompanyId = row.CompanyId,
        CompanyEmail = row.CompanyEmail,
        BranchId = row.BranchId,
        Title = row.Title,
        Body = row.Body,
        TrainingTitle = row.TrainingTitle,
        CompanyTrainingRequestId = row.CompanyTrainingRequestId,
        SkillsRaw = row.SkillsRaw,
        Deadline = row.Deadline?.ToString("yyyy-MM-dd"),
        RequestedBy = row.RequestedBy,
        RequestedByEmail = row.RequestedByEmail,
        ReviewStatus = row.ReviewStatus,
        ReviewedAt = row.ReviewedAt,
        ReviewedBy = row.ReviewedBy,
        LegacyLocalId = row.LegacyLocalId,
        CreatedAt = row.CreatedAt,
    };

    private static CompanySelectedTrackDto MapCompanySelectedTrack(CompanySelectedTrack row) => new()
    {
        Id = row.Id,
        CompanyId = row.CompanyId,
        CompanyEmail = row.CompanyEmail,
        TrackValue = row.TrackValue,
        Title = row.Title,
        AddedAt = row.AddedAt,
    };

    private async Task ProvisionTrainerAccountAsync(
        string fullName,
        string email,
        string password,
        CancellationToken cancellationToken)
    {
        var policyErrors = PasswordPolicyValidator.Validate(password);
        if (policyErrors.Count > 0)
            throw new ArgumentException(string.Join(" ", policyErrors));

        var existing = await userManager.FindByEmailAsync(email);
        if (existing is null)
        {
            var user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                FullName = fullName,
                LegacyUserId = $"trainer-{Guid.NewGuid():N}"[..20],
                CreatedAtUtc = DateTime.UtcNow,
                EmailConfirmed = true,
            };

            var create = await userManager.CreateAsync(user, password);
            if (!create.Succeeded)
                throw new ArgumentException(string.Join(" ", create.Errors.Select(e => e.Description)));

            await userManager.AddToRoleAsync(user, "Trainer");
            return;
        }

        if (existing.IsDeleted)
            throw new ArgumentException("This email belongs to a deleted account.");

        var roles = await userManager.GetRolesAsync(existing);
        if (roles.Any(r => r.Equals("Admin", StringComparison.OrdinalIgnoreCase)
                           || r.Equals("Company", StringComparison.OrdinalIgnoreCase)))
        {
            throw new ArgumentException("This email is already registered with a different account type.");
        }

        if (!roles.Contains("Trainer"))
        {
            if (roles.Count > 0)
                await userManager.RemoveFromRolesAsync(existing, roles);
            await userManager.AddToRoleAsync(existing, "Trainer");
        }

        if (!string.Equals(existing.FullName, fullName, StringComparison.Ordinal))
        {
            existing.FullName = fullName;
            existing.UpdatedAtUtc = DateTime.UtcNow;
            await userManager.UpdateAsync(existing);
        }

        var resetToken = await userManager.GeneratePasswordResetTokenAsync(existing);
        var reset = await userManager.ResetPasswordAsync(existing, resetToken, password);
        if (!reset.Succeeded)
            throw new ArgumentException(string.Join(" ", reset.Errors.Select(e => e.Description)));
    }

    private async Task SyncPublishedTrainingTrainerAsync(
        CompanyTrainingRequest entity,
        CancellationToken cancellationToken)
    {
        var publishedId = TrimOrNull(entity.PublishedTrainingId);
        var trainerEmail = NormalizeEmailOrNull(entity.TrainerEmail);
        if (publishedId is null || trainerEmail is null) return;

        var trainer = await db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.NormalizedEmail == trainerEmail, cancellationToken);
        if (trainer is null) return;

        await CompanyTrainingCatalogSync.EnsureFromRequestAsync(db, entity, cancellationToken);

        var now = DateTime.UtcNow;
        var training = await db.Trainings.FirstOrDefaultAsync(
            t => t.Id == publishedId && !t.IsDeleted,
            cancellationToken);
        if (training is null) return;

        training.TrainerUserId = trainer.Id;
        training.CompanyId ??= entity.CompanyId;
        if (string.IsNullOrWhiteSpace(training.Title))
            training.Title = entity.Title.Trim();
        training.UpdatedAtUtc = now;

        var branchId = training.BranchId;
        var title = entity.Title.Trim();
        if (!string.IsNullOrWhiteSpace(title))
        {
            var siblings = await db.Trainings
                .Where(t => !t.IsDeleted && t.BranchId == branchId && t.Title == title && t.TrainerUserId == null)
                .ToListAsync(cancellationToken);
            foreach (var sibling in siblings)
            {
                sibling.TrainerUserId = trainer.Id;
                sibling.CompanyId ??= entity.CompanyId;
                sibling.UpdatedAtUtc = now;
            }
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task<string> EnsureUniqueSlugAsync(
        string baseSlug,
        string? excludeCompanyId = null,
        CancellationToken cancellationToken = default)
    {
        var slug = string.IsNullOrWhiteSpace(baseSlug) ? $"company-{Guid.NewGuid():N}"[..12] : baseSlug.Trim().ToLowerInvariant();
        if (slug.Length > 120) slug = slug[..120];

        var candidate = slug;
        var suffix = 2;
        while (await db.Companies.AnyAsync(
                   c => c.Slug == candidate && (excludeCompanyId == null || c.Id != excludeCompanyId),
                   cancellationToken))
        {
            var tail = $"-{suffix++}";
            var maxBase = Math.Max(1, 120 - tail.Length);
            candidate = $"{slug[..Math.Min(slug.Length, maxBase)]}{tail}";
        }

        return candidate;
    }

    private static string Slugify(string value) =>
        string.Join('-', value.Trim().ToLowerInvariant()
            .Split([' ', '\t', '\r', '\n'], StringSplitOptions.RemoveEmptyEntries)
            .Select(part => new string(part.Where(ch => char.IsLetterOrDigit(ch) || ch == '-').ToArray()))
            .Where(part => part.Length > 0));

    private static string NormalizeEmail(string value) => value.Trim().ToLowerInvariant();

    private static string? NormalizeEmailOrNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : NormalizeEmail(value);

    private static string? TrimOrNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static DateOnly? ParseDateOnly(string? value) =>
        string.IsNullOrWhiteSpace(value) || !DateOnly.TryParse(value, out var parsed) ? null : parsed;

    private static string NormalizeStatus(string? value, string fallback) =>
        string.IsNullOrWhiteSpace(value) ? fallback : value.Trim().ToUpperInvariant();

    private static IReadOnlyList<string> NormalizeTrackTitles(IReadOnlyList<string>? titles) =>
        (titles ?? [])
            .Select(t => t.Trim())
            .Where(t => t.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
}
