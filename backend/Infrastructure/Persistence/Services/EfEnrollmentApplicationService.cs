using Microsoft.EntityFrameworkCore;
using TrainerPortal.Api.Domain.Entities;
using TrainerPortal.Api.Domain.Entities.Portal;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Infrastructure.Persistence.Services;

public sealed class EfEnrollmentApplicationService(
    ApplicationDbContext db,
    PortalUserResolver users,
    IUserDirectoryService userDirectory,
    IWebHostEnvironment env) : IEnrollmentApplicationService
{
    private static readonly string[] AllowedCvExtensions = [".pdf", ".doc", ".docx"];
    private readonly string _uploadRoot = Path.Combine(env.ContentRootPath, "wwwroot", "uploads", "enrollment-cvs");

    public IReadOnlyList<EnrollmentApplicationRecord> ListForStudent(string studentId)
    {
        var user = users.FindByLegacyOrId(studentId);
        if (user is null) return [];

        var rows = db.EnrollmentApplications.AsNoTracking()
            .Where(a => a.StudentUserId == user.Id && !a.IsDeleted)
            .OrderByDescending(a => a.CreatedAtUtc)
            .ToList();
        return MapRecords(rows);
    }

    public EnrollmentApplicationRecord? GetForStudentCourse(string studentId, string branchId, string courseId)
    {
        var user = users.FindByLegacyOrId(studentId);
        if (user is null) return null;

        var row = db.EnrollmentApplications.AsNoTracking()
            .FirstOrDefault(a =>
                a.StudentUserId == user.Id &&
                a.BranchId == branchId.Trim() &&
                a.CourseId == courseId.Trim() &&
                !a.IsDeleted);

        return row is null ? null : MapRecords([row]).FirstOrDefault();
    }

    public EnrollmentApplicationRecord StartEnrollment(
        string studentId,
        string studentEmail,
        string studentName,
        StartEnrollmentApplicationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.BranchId) || string.IsNullOrWhiteSpace(request.CourseId))
        {
            throw new ArgumentException("branchId and courseId are required.");
        }

        var student = users.FindByLegacyOrId(studentId)
            ?? throw new InvalidOperationException("Student not found.");

        var branchId = request.BranchId.Trim();
        var courseId = request.CourseId.Trim();

        var training = db.Trainings.AsNoTracking()
            .FirstOrDefault(t => t.Id == courseId && !t.IsDeleted && t.BranchId == branchId)
            ?? throw new InvalidOperationException(
                "Training program not found. The company post may not be linked to a published course yet.");

        var existing = db.EnrollmentApplications.FirstOrDefault(a =>
            a.StudentUserId == student.Id &&
            a.BranchId == branchId &&
            a.CourseId == courseId &&
            !a.IsDeleted);
        if (existing is not null)
        {
            return MapRecords([existing]).First();
        }

        var trainerUser = ResolveTrainerUserForCourse(branchId, courseId, request.TrainerId, request.TrainerEmail);
        var now = DateTime.UtcNow;
        var record = new EnrollmentApplication
        {
            Id = Guid.NewGuid().ToString("N"),
            StudentUserId = student.Id,
            BranchId = branchId,
            CompanyId = training.CompanyId,
            CourseId = courseId,
            TrainerUserId = trainerUser.Id,
            StatusId = PortalStatusIds.EnrollmentPending,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
        };

        db.EnrollmentApplications.Add(record);
        db.SaveChanges();
        NotifyEnrollmentRequest(record, student, trainerUser);
        return MapRecords([record]).First();
    }

    public EnrollmentApplicationRecord Submit(
        string studentId,
        string studentEmail,
        string studentName,
        SubmitEnrollmentApplicationRequest request,
        string cvFileName,
        Stream cvStream)
    {
        ValidateSubmit(request, cvFileName);

        var student = users.FindByLegacyOrId(studentId)
            ?? throw new InvalidOperationException("Student not found.");

        var branchId = request.BranchId.Trim();
        var courseId = request.CourseId.Trim();
        var trainerUser = ResolveTrainerUserForCourse(branchId, courseId, request.TrainerId, request.TrainerEmail);

        Directory.CreateDirectory(_uploadRoot);

        var existing = db.EnrollmentApplications.FirstOrDefault(a =>
            a.StudentUserId == student.Id &&
            a.BranchId == branchId &&
            a.CourseId == courseId &&
            !a.IsDeleted);

        var id = existing?.Id ?? Guid.NewGuid().ToString("N");
        var ext = Path.GetExtension(cvFileName).ToLowerInvariant();
        var storedName = $"{id}{ext}";
        var diskPath = Path.Combine(_uploadRoot, storedName);

        if (File.Exists(diskPath)) File.Delete(diskPath);
        using (var fs = File.Create(diskPath))
        {
            cvStream.CopyTo(fs);
        }

        var now = DateTime.UtcNow;
        if (existing is not null)
        {
            if (existing.StatusId != PortalStatusIds.EnrollmentPending)
            {
                throw new InvalidOperationException("An application for this course already exists.");
            }

            UpdateRow(existing, student, trainerUser, request, cvFileName, storedName, now);
            db.SaveChanges();
            NotifyEnrollmentRequest(existing, student, trainerUser);
            return MapRecords([existing]).First();
        }

        var record = new EnrollmentApplication
        {
            Id = id,
            StudentUserId = student.Id,
            BranchId = branchId,
            CourseId = courseId,
            TrainerUserId = trainerUser.Id,
            MotivationReason = request.MotivationReason.Trim(),
            UniversityName = request.UniversityName.Trim(),
            Major = request.Major.Trim(),
            Gpa = request.Gpa.Trim(),
            PreviousStudies = request.PreviousStudies.Trim(),
            CvFileName = cvFileName,
            CvFileUrl = $"/uploads/enrollment-cvs/{storedName}",
            StatusId = PortalStatusIds.EnrollmentPending,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
        };

        db.EnrollmentApplications.Add(record);
        db.SaveChanges();
        NotifyEnrollmentRequest(record, student, trainerUser);
        return MapRecords([record]).First();
    }

    public IReadOnlyList<EnrollmentApplicationRecord> ListForTrainer(string trainerId, string trainerEmail, string? statusFilter)
    {
        var trainer = users.FindByLegacyOrId(trainerId);
        var email = trainerEmail.Trim().ToLowerInvariant();

        var query = db.EnrollmentApplications.AsNoTracking()
            .Where(a => !a.IsDeleted);

        var visibleCourseIds = BuildTrainerVisibleCourseIds(trainer, email);
        var companyCourseTitles = BuildTrainerCompanyCourseTitles(email);

        if (trainer is not null)
        {
            query = companyCourseTitles.Count > 0
                ? query.Where(a =>
                    a.TrainerUserId == trainer.Id ||
                    visibleCourseIds.Contains(a.CourseId) ||
                    db.Trainings.Any(t =>
                        t.Id == a.CourseId && !t.IsDeleted && companyCourseTitles.Contains(t.Title)))
                : query.Where(a =>
                    a.TrainerUserId == trainer.Id ||
                    visibleCourseIds.Contains(a.CourseId));
        }
        else
        {
            var trainerUserIds = db.Users.AsNoTracking()
                .Where(u => u.NormalizedEmail == email)
                .Select(u => u.Id)
                .ToList();
            query = companyCourseTitles.Count > 0
                ? query.Where(a =>
                    trainerUserIds.Contains(a.TrainerUserId) ||
                    visibleCourseIds.Contains(a.CourseId) ||
                    db.Trainings.Any(t =>
                        t.Id == a.CourseId && !t.IsDeleted && companyCourseTitles.Contains(t.Title)))
                : query.Where(a =>
                    trainerUserIds.Contains(a.TrainerUserId) ||
                    visibleCourseIds.Contains(a.CourseId));
        }

        var rows = query.OrderByDescending(a => a.CreatedAtUtc).ToList();
        var mapped = MapRecords(rows);

        if (!string.IsNullOrWhiteSpace(statusFilter))
        {
            var statusId = PortalStatusIds.EnrollmentFromCode(statusFilter);
            mapped = mapped.Where(a =>
            {
                if (PortalStatusIds.EnrollmentFromCode(a.Status) != statusId) return false;
                if (statusId == PortalStatusIds.EnrollmentPending)
                {
                    return !string.IsNullOrWhiteSpace(a.MotivationReason);
                }
                return true;
            }).ToList();
        }

        return mapped;
    }

    public EnrollmentApplicationRecord? GetById(string id) =>
        db.EnrollmentApplications.AsNoTracking()
            .FirstOrDefault(a => a.Id == id && !a.IsDeleted) is { } row
            ? MapRecords([row]).FirstOrDefault()
            : null;

    public EnrollmentApplicationRecord Approve(string applicationId, string reviewerId, string reviewerEmail)
    {
        var record = db.EnrollmentApplications.FirstOrDefault(a => a.Id == applicationId && !a.IsDeleted)
            ?? throw new InvalidOperationException("Application not found.");
        EnsureTrainerCanReview(record, reviewerId, reviewerEmail);

        if (record.StatusId == PortalStatusIds.EnrollmentApproved) return MapRecords([record]).First();

        var reviewer = users.FindByLegacyOrId(reviewerId);
        record.StatusId = PortalStatusIds.EnrollmentApproved;
        record.RejectionReason = null;
        record.ReviewedAtUtc = DateTime.UtcNow;
        record.ReviewedByUserId = reviewer?.Id;
        record.UpdatedAtUtc = DateTime.UtcNow;
        db.SaveChanges();

        MarkEnrollmentNotificationsRead(reviewerId, applicationId);

        var student = db.Users.AsNoTracking().First(u => u.Id == record.StudentUserId);
        Notify(
            student.Id,
            users.LegacyId(student),
            "Enrollment approved",
            $"Your application for {GetCourseTitle(record.CourseId)} was approved. You now have full course access.",
            "success");

        return MapRecords([record]).First();
    }

    public EnrollmentApplicationRecord Reject(string applicationId, string reviewerId, string reviewerEmail, string? rejectionReason)
    {
        var record = db.EnrollmentApplications.FirstOrDefault(a => a.Id == applicationId && !a.IsDeleted)
            ?? throw new InvalidOperationException("Application not found.");
        EnsureTrainerCanReview(record, reviewerId, reviewerEmail);

        var reviewer = users.FindByLegacyOrId(reviewerId);
        record.StatusId = PortalStatusIds.EnrollmentRejected;
        record.RejectionReason = string.IsNullOrWhiteSpace(rejectionReason)
            ? "Application was not approved for this cohort."
            : rejectionReason.Trim();
        record.ReviewedAtUtc = DateTime.UtcNow;
        record.ReviewedByUserId = reviewer?.Id;
        record.UpdatedAtUtc = DateTime.UtcNow;
        db.SaveChanges();

        MarkEnrollmentNotificationsRead(reviewerId, applicationId);

        var student = db.Users.AsNoTracking().First(u => u.Id == record.StudentUserId);
        Notify(
            student.Id,
            users.LegacyId(student),
            "Enrollment not approved",
            $"Your application for {GetCourseTitle(record.CourseId)} was rejected. {record.RejectionReason}",
            "danger");

        return MapRecords([record]).First();
    }

    public IReadOnlyList<PortalNotificationRecord> ListNotifications(string userId)
    {
        var user = users.FindByLegacyOrId(userId);
        if (user is null) return [];

        return db.PortalNotifications.AsNoTracking()
            .Where(n => n.UserId == user.Id)
            .OrderByDescending(n => n.CreatedAtUtc)
            .Take(50)
            .ToList()
            .Select(n => MapNotification(n, userId))
            .ToList();
    }

    public int UnreadNotificationCount(string userId)
    {
        var user = users.FindByLegacyOrId(userId);
        if (user is null) return 0;
        return db.PortalNotifications.Count(n => n.UserId == user.Id && !n.IsRead);
    }

    public void MarkNotificationRead(string userId, string notificationId)
    {
        var user = users.FindByLegacyOrId(userId);
        if (user is null) return;

        var n = db.PortalNotifications.FirstOrDefault(x => x.Id == notificationId && x.UserId == user.Id);
        if (n is null) return;
        n.IsRead = true;
        db.SaveChanges();
    }

    public void MarkEnrollmentNotificationsRead(string userId, string applicationId)
    {
        if (string.IsNullOrWhiteSpace(applicationId)) return;
        var user = users.FindByLegacyOrId(userId);
        if (user is null) return;

        var rows = db.PortalNotifications
            .Where(x => x.UserId == user.Id && x.ApplicationId == applicationId && !x.IsRead)
            .ToList();
        if (rows.Count == 0) return;
        foreach (var n in rows) n.IsRead = true;
        db.SaveChanges();
    }

    private IReadOnlyList<EnrollmentApplicationRecord> MapRecords(IReadOnlyList<EnrollmentApplication> rows)
    {
        var userIds = rows
            .SelectMany(a => new[] { a.StudentUserId, a.TrainerUserId, a.ReviewedByUserId })
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Select(id => id!)
            .Distinct()
            .ToList();

        var userMap = db.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .AsEnumerable()
            .ToDictionary(u => u.Id);

        var courseIds = rows.Select(a => a.CourseId).Distinct().ToList();
        var courseTitles = db.Trainings.AsNoTracking()
            .Where(t => courseIds.Contains(t.Id))
            .ToDictionary(t => t.Id, t => t.Title);

        return rows.Select(a => MapRecord(a, userMap, courseTitles)).ToList();
    }

    private EnrollmentApplicationRecord MapRecord(
        EnrollmentApplication a,
        IReadOnlyDictionary<string, ApplicationUser> userMap,
        IReadOnlyDictionary<string, string> courseTitles)
    {
        userMap.TryGetValue(a.StudentUserId, out var student);
        userMap.TryGetValue(a.TrainerUserId, out var trainer);
        ApplicationUser? reviewer = null;
        if (a.ReviewedByUserId is not null)
        {
            userMap.TryGetValue(a.ReviewedByUserId, out reviewer);
        }

        courseTitles.TryGetValue(a.CourseId, out var courseTitle);

        return new EnrollmentApplicationRecord
        {
            Id = a.Id,
            UserId = student is null ? a.StudentUserId : users.LegacyId(student),
            UserEmail = student?.Email ?? string.Empty,
            UserName = student?.FullName ?? string.Empty,
            BranchId = a.BranchId,
            CourseId = a.CourseId,
            CourseTitle = courseTitle ?? a.CourseId,
            TrainerId = trainer is null ? a.TrainerUserId : users.LegacyId(trainer),
            TrainerEmail = trainer?.Email ?? string.Empty,
            TrainerName = trainer?.FullName ?? string.Empty,
            MotivationReason = a.MotivationReason ?? string.Empty,
            UniversityName = a.UniversityName ?? string.Empty,
            Major = a.Major ?? string.Empty,
            Gpa = a.Gpa ?? string.Empty,
            PreviousStudies = a.PreviousStudies ?? string.Empty,
            CvFileName = a.CvFileName ?? string.Empty,
            CvFileUrl = a.CvFileUrl ?? string.Empty,
            Status = PortalStatusIds.ToCode(a.StatusId),
            RejectionReason = a.RejectionReason,
            ReviewedAtUtc = a.ReviewedAtUtc,
            ReviewedBy = reviewer is null ? null : users.LegacyId(reviewer),
            CreatedAtUtc = a.CreatedAtUtc,
            UpdatedAtUtc = a.UpdatedAtUtc,
        };
    }

    private PortalNotificationRecord MapNotification(PortalNotification n, string legacyUserId) =>
        new()
        {
            Id = n.Id,
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
            CourseTitle = n.CourseId is null ? null : GetCourseTitle(n.CourseId),
            TargetView = n.TargetView,
            SubmissionId = n.SubmissionId,
            TopicId = n.TopicId,
            StudentId = n.StudentLegacyId,
            TargetPath = n.TargetPath,
            LegacyLocalId = n.LegacyLocalId,
        };

    private string GetCourseTitle(string courseId) =>
        db.Trainings.AsNoTracking()
            .Where(t => t.Id == courseId)
            .Select(t => t.Title)
            .FirstOrDefault() ?? courseId;

    private void NotifyEnrollmentRequest(EnrollmentApplication record, ApplicationUser student, ApplicationUser trainer)
    {
        var courseTitle = GetCourseTitle(record.CourseId);
        db.PortalNotifications.Add(new PortalNotification
        {
            Id = Guid.NewGuid().ToString("N"),
            UserId = trainer.Id,
            Title = $"New student enrollment request for {courseTitle}",
            Message = $"{student.FullName} has applied to join your course and is waiting for approval.",
            ToneCode = "info",
            IsRead = false,
            CreatedAtUtc = DateTime.UtcNow,
            TypeCode = "enrollment_request",
            ApplicationId = record.Id,
            BranchId = record.BranchId,
            CourseId = record.CourseId,
            TargetView = "enrollment-requests",
        });
        db.SaveChanges();
    }

    private void Notify(string dbUserId, string legacyUserId, string title, string message, string tone)
    {
        db.PortalNotifications.Add(new PortalNotification
        {
            Id = Guid.NewGuid().ToString("N"),
            UserId = dbUserId,
            Title = title,
            Message = message,
            ToneCode = tone,
            IsRead = false,
            CreatedAtUtc = DateTime.UtcNow,
        });
        db.SaveChanges();
    }

    private static void UpdateRow(
        EnrollmentApplication existing,
        ApplicationUser student,
        ApplicationUser trainerUser,
        SubmitEnrollmentApplicationRequest request,
        string cvFileName,
        string storedName,
        DateTime now)
    {
        existing.TrainerUserId = trainerUser.Id;
        existing.MotivationReason = request.MotivationReason.Trim();
        existing.UniversityName = request.UniversityName.Trim();
        existing.Major = request.Major.Trim();
        existing.Gpa = request.Gpa.Trim();
        existing.PreviousStudies = request.PreviousStudies.Trim();
        existing.CvFileName = cvFileName;
        existing.CvFileUrl = $"/uploads/enrollment-cvs/{storedName}";
        existing.StatusId = PortalStatusIds.EnrollmentPending;
        existing.UpdatedAtUtc = now;
    }

    private static void ValidateSubmit(SubmitEnrollmentApplicationRequest request, string cvFileName)
    {
        if (string.IsNullOrWhiteSpace(request.BranchId) || string.IsNullOrWhiteSpace(request.CourseId))
            throw new ArgumentException("Course context is required.");

        if (string.IsNullOrWhiteSpace(request.MotivationReason) ||
            string.IsNullOrWhiteSpace(request.UniversityName) ||
            string.IsNullOrWhiteSpace(request.Major) ||
            string.IsNullOrWhiteSpace(request.Gpa) ||
            string.IsNullOrWhiteSpace(request.PreviousStudies))
            throw new ArgumentException("All application fields are required.");

        if (string.IsNullOrWhiteSpace(cvFileName))
            throw new ArgumentException("CV upload is required.");

        var ext = Path.GetExtension(cvFileName).ToLowerInvariant();
        if (!AllowedCvExtensions.Contains(ext))
            throw new ArgumentException("CV must be PDF, DOC, or DOCX.");
    }

    private ApplicationUser ResolveTrainerUserForCourse(
        string branchId,
        string courseId,
        string? requestTrainerId,
        string? requestTrainerEmail)
    {
        var cid = courseId.Trim();
        var bid = branchId.Trim();

        var training = db.Trainings.AsNoTracking()
            .FirstOrDefault(t => t.Id == cid && !t.IsDeleted);
        var companyRequest = FindCompanyTrainingRequestForCourse(cid, bid, training);

        var fromCompany = ResolveTrainerUserFromCompanyRequest(companyRequest);
        if (fromCompany is not null) return fromCompany;

        if (training?.TrainerUserId is not null)
        {
            var fromTraining = db.Users.AsNoTracking().FirstOrDefault(u => u.Id == training.TrainerUserId);
            if (fromTraining is not null) return fromTraining;
        }

        var authTrainer = ResolveTrainer(requestTrainerId, requestTrainerEmail);
        if (authTrainer is not null)
        {
            var fromRequest = users.FindByLegacyOrId(authTrainer.Id);
            if (fromRequest is not null) return fromRequest;
        }

        throw new InvalidOperationException("No instructor is assigned to this training program.");
    }

    private CompanyTrainingRequest? FindCompanyTrainingRequestForCourse(
        string courseId,
        string branchId,
        Training? training = null)
    {
        var cid = courseId.Trim();
        var bid = branchId.Trim();

        var byPublished = db.CompanyTrainingRequests.AsNoTracking()
            .FirstOrDefault(r => !r.IsDeleted && r.PublishedTrainingId == cid);
        if (byPublished is not null) return byPublished;

        var byLegacy = db.CompanyTrainingRequests.AsNoTracking()
            .FirstOrDefault(r => !r.IsDeleted && r.LegacyLocalId == cid);
        if (byLegacy is not null) return byLegacy;

        training ??= db.Trainings.AsNoTracking().FirstOrDefault(t => t.Id == cid && !t.IsDeleted);
        if (training is null || string.IsNullOrWhiteSpace(training.Title)) return null;

        return db.CompanyTrainingRequests.AsNoTracking()
            .AsEnumerable()
            .FirstOrDefault(r =>
                !r.IsDeleted &&
                string.Equals(r.Title, training.Title, StringComparison.OrdinalIgnoreCase) &&
                (string.IsNullOrWhiteSpace(r.BranchId) ||
                 string.Equals(r.BranchId, bid, StringComparison.OrdinalIgnoreCase)));
    }

    private ApplicationUser? ResolveTrainerUserFromCompanyRequest(CompanyTrainingRequest? companyRequest)
    {
        if (string.IsNullOrWhiteSpace(companyRequest?.TrainerEmail)) return null;
        var trainerEmail = companyRequest.TrainerEmail.Trim().ToLowerInvariant();
        return db.Users.AsNoTracking().FirstOrDefault(u => u.NormalizedEmail == trainerEmail);
    }

    private HashSet<string> BuildTrainerVisibleCourseIds(ApplicationUser? trainer, string normalizedEmail)
    {
        var courseIds = new HashSet<string>(StringComparer.Ordinal);

        if (trainer is not null)
        {
            foreach (var id in db.Trainings.AsNoTracking()
                         .Where(t => !t.IsDeleted && t.TrainerUserId == trainer.Id)
                         .Select(t => t.Id))
            {
                courseIds.Add(id);
            }
        }

        if (string.IsNullOrWhiteSpace(normalizedEmail)) return courseIds;

        var companyRequests = db.CompanyTrainingRequests.AsNoTracking()
            .Where(r => !r.IsDeleted && r.TrainerEmail != null)
            .AsEnumerable()
            .Where(r => string.Equals(r.TrainerEmail, normalizedEmail, StringComparison.OrdinalIgnoreCase))
            .ToList();

        foreach (var request in companyRequests)
        {
            if (!string.IsNullOrWhiteSpace(request.PublishedTrainingId))
                courseIds.Add(request.PublishedTrainingId.Trim());

            if (!string.IsNullOrWhiteSpace(request.LegacyLocalId))
                courseIds.Add(request.LegacyLocalId.Trim());

            if (string.IsNullOrWhiteSpace(request.Title)) continue;

            var title = request.Title.Trim();
            var branchId = string.IsNullOrWhiteSpace(request.BranchId) ? null : request.BranchId.Trim();
            var matching = db.Trainings.AsNoTracking().Where(t => !t.IsDeleted && t.Title == title);
            if (branchId is not null)
                matching = matching.Where(t => t.BranchId == branchId);

            foreach (var id in matching.Select(t => t.Id))
                courseIds.Add(id);
        }

        return courseIds;
    }

    private List<string> BuildTrainerCompanyCourseTitles(string normalizedEmail)
    {
        if (string.IsNullOrWhiteSpace(normalizedEmail)) return [];

        return db.CompanyTrainingRequests.AsNoTracking()
            .Where(r => !r.IsDeleted && r.TrainerEmail != null)
            .AsEnumerable()
            .Where(r => string.Equals(r.TrainerEmail, normalizedEmail, StringComparison.OrdinalIgnoreCase))
            .Select(r => r.Title.Trim())
            .Where(title => !string.IsNullOrWhiteSpace(title))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private AuthUser? ResolveTrainer(string? trainerId, string? trainerEmail)
    {
        if (!string.IsNullOrWhiteSpace(trainerId))
        {
            var byId = userDirectory.GetById(trainerId.Trim());
            if (byId is not null) return byId;
        }

        if (!string.IsNullOrWhiteSpace(trainerEmail))
        {
            var byEmail = userDirectory.GetByEmail(trainerEmail.Trim());
            if (byEmail is not null) return byEmail;
        }

        return null;
    }

    private void EnsureTrainerCanReview(EnrollmentApplication record, string reviewerId, string reviewerEmail)
    {
        var reviewer = users.FindByLegacyOrId(reviewerId);
        var email = reviewerEmail.Trim().ToLowerInvariant();
        var assignedTrainer = db.Users.AsNoTracking().FirstOrDefault(u => u.Id == record.TrainerUserId);
        var visibleCourseIds = BuildTrainerVisibleCourseIds(reviewer, email);

        var companyCourseTitles = BuildTrainerCompanyCourseTitles(email);
        var courseTitleMatch = companyCourseTitles.Count > 0 &&
            db.Trainings.AsNoTracking().Any(t =>
                t.Id == record.CourseId &&
                !t.IsDeleted &&
                companyCourseTitles.Contains(t.Title));

        var allowed =
            (reviewer is not null && record.TrainerUserId == reviewer.Id) ||
            (assignedTrainer?.NormalizedEmail == email) ||
            (assignedTrainer is not null && userDirectory.GetById(reviewerId)?.Email.Equals(assignedTrainer.Email, StringComparison.OrdinalIgnoreCase) == true) ||
            visibleCourseIds.Contains(record.CourseId) ||
            courseTitleMatch;

        if (!allowed)
            throw new UnauthorizedAccessException("You are not assigned to review this course application.");
    }
}
