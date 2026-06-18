using System.Text.Json;
using TrainerPortal.Api.Models;

namespace TrainerPortal.Api.Services;

public sealed class EnrollmentApplicationService : IEnrollmentApplicationService
{
    private static readonly string[] AllowedCvExtensions = [".pdf", ".doc", ".docx"];
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

    private readonly string _dataPath;
    private readonly string _uploadRoot;
    private readonly IUserDirectoryService _users;
    private readonly object _lock = new();
    private List<EnrollmentApplicationRecord> _applications = [];
    private List<PortalNotificationRecord> _notifications = [];

    public EnrollmentApplicationService(IWebHostEnvironment env, IUserDirectoryService users)
    {
        _users = users;
        var dataDir = Path.Combine(env.ContentRootPath, "App_Data");
        Directory.CreateDirectory(dataDir);
        _dataPath = Path.Combine(dataDir, "enrollment-applications.json");
        _uploadRoot = Path.Combine(env.ContentRootPath, "wwwroot", "uploads", "enrollment-cvs");
        Directory.CreateDirectory(_uploadRoot);
        Load();
    }

    public IReadOnlyList<EnrollmentApplicationRecord> ListForStudent(string studentId) =>
        Snapshot().Where(a => a.UserId == studentId).OrderByDescending(a => a.CreatedAtUtc).ToList();

    public EnrollmentApplicationRecord? GetForStudentCourse(string studentId, string branchId, string courseId) =>
        Snapshot().FirstOrDefault(a =>
            a.UserId == studentId &&
            a.BranchId == branchId.Trim() &&
            a.CourseId == courseId.Trim());

    public EnrollmentApplicationRecord StartEnrollment(
        string studentId,
        string studentEmail,
        string studentName,
        StartEnrollmentApplicationRequest request) =>
        GetForStudentCourse(studentId, request.BranchId, request.CourseId)
        ?? throw new InvalidOperationException("Training program not found.");

    public EnrollmentApplicationRecord Submit(
        string studentId,
        string studentEmail,
        string studentName,
        SubmitEnrollmentApplicationRequest request,
        string cvFileName,
        Stream cvStream)
    {
        ValidateSubmit(request, cvFileName);

        var branchId = request.BranchId.Trim();
        var courseId = request.CourseId.Trim();

        lock (_lock)
        {
            var existing = _applications.FirstOrDefault(a =>
                a.UserId == studentId && a.BranchId == branchId && a.CourseId == courseId);

            var trainer = ResolveTrainer(request.TrainerId, request.TrainerEmail)
                ?? _users.GetById("trainer-2003");
            var id = existing?.Id ?? Guid.NewGuid().ToString("N");
            var ext = Path.GetExtension(cvFileName).ToLowerInvariant();
            var storedName = $"{id}{ext}";
            var diskPath = Path.Combine(_uploadRoot, storedName);

            if (File.Exists(diskPath))
            {
                File.Delete(diskPath);
            }

            using (var fs = File.Create(diskPath))
            {
                cvStream.CopyTo(fs);
            }

            var now = DateTime.UtcNow;
            if (existing is not null)
            {
                if (!existing.Status.Equals(EnrollmentApplicationStatuses.Pending, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException("An application for this course already exists.");
                }

                existing.UserEmail = studentEmail.Trim();
                existing.UserName = studentName.Trim();
                existing.CourseTitle = request.CourseTitle.Trim();
                existing.TrainerId = trainer?.Id ?? request.TrainerId.Trim();
                existing.TrainerEmail = (trainer?.Email ?? request.TrainerEmail).Trim().ToLowerInvariant();
                existing.TrainerName = trainer?.Name ?? request.TrainerName.Trim();
                existing.MotivationReason = request.MotivationReason.Trim();
                existing.UniversityName = request.UniversityName.Trim();
                existing.Major = request.Major.Trim();
                existing.Gpa = request.Gpa.Trim();
                existing.PreviousStudies = request.PreviousStudies.Trim();
                existing.CvFileName = cvFileName;
                existing.CvFileUrl = $"/uploads/enrollment-cvs/{storedName}";
                existing.Status = EnrollmentApplicationStatuses.Pending;
                existing.UpdatedAtUtc = now;
                Persist();
                NotifyEnrollmentRequest(existing);
                return existing;
            }

            var record = new EnrollmentApplicationRecord
            {
                Id = id,
                UserId = studentId,
                UserEmail = studentEmail.Trim(),
                UserName = studentName.Trim(),
                BranchId = branchId,
                CourseId = courseId,
                CourseTitle = request.CourseTitle.Trim(),
                TrainerId = trainer?.Id ?? request.TrainerId.Trim(),
                TrainerEmail = (trainer?.Email ?? request.TrainerEmail).Trim().ToLowerInvariant(),
                TrainerName = trainer?.Name ?? request.TrainerName.Trim(),
                MotivationReason = request.MotivationReason.Trim(),
                UniversityName = request.UniversityName.Trim(),
                Major = request.Major.Trim(),
                Gpa = request.Gpa.Trim(),
                PreviousStudies = request.PreviousStudies.Trim(),
                CvFileName = cvFileName,
                CvFileUrl = $"/uploads/enrollment-cvs/{storedName}",
                Status = EnrollmentApplicationStatuses.Pending,
                CreatedAtUtc = now,
                UpdatedAtUtc = now,
            };

            _applications.Insert(0, record);
            Persist();

            NotifyEnrollmentRequest(record);

            return record;
        }
    }

    public IReadOnlyList<EnrollmentApplicationRecord> ListForTrainer(string trainerId, string trainerEmail, string? statusFilter)
    {
        var email = trainerEmail.Trim().ToLowerInvariant();
        var tid = trainerId.Trim();
        var list = Snapshot().Where(a =>
            a.TrainerId == tid ||
            a.TrainerEmail.Equals(email, StringComparison.OrdinalIgnoreCase) ||
            (_users.GetByEmail(a.TrainerEmail)?.Id == tid) ||
            (_users.GetById(a.TrainerId)?.Email.Equals(email, StringComparison.OrdinalIgnoreCase) ?? false));

        if (!string.IsNullOrWhiteSpace(statusFilter))
        {
            var f = statusFilter.Trim().ToLowerInvariant();
            list = list.Where(a =>
            {
                if (!a.Status.Equals(f, StringComparison.OrdinalIgnoreCase)) return false;
                if (f == EnrollmentApplicationStatuses.Pending)
                {
                    return !string.IsNullOrWhiteSpace(a.MotivationReason);
                }
                return true;
            });
        }

        return list.OrderByDescending(a => a.CreatedAtUtc).ToList();
    }

    public EnrollmentApplicationRecord? GetById(string id) =>
        Snapshot().FirstOrDefault(a => a.Id == id);

    public EnrollmentApplicationRecord Approve(string applicationId, string reviewerId, string reviewerEmail)
    {
        lock (_lock)
        {
            var record = _applications.FirstOrDefault(a => a.Id == applicationId)
                ?? throw new InvalidOperationException("Application not found.");
            EnsureTrainerCanReview(record, reviewerId, reviewerEmail, _users);

            if (record.Status == EnrollmentApplicationStatuses.Approved)
            {
                return record;
            }

            record.Status = EnrollmentApplicationStatuses.Approved;
            record.RejectionReason = null;
            record.ReviewedAtUtc = DateTime.UtcNow;
            record.ReviewedBy = reviewerId;
            record.UpdatedAtUtc = DateTime.UtcNow;
            Persist();

            MarkEnrollmentNotificationsRead(reviewerId, applicationId);

            Notify(
                record.UserId,
                "Enrollment approved",
                $"Your application for {record.CourseTitle} was approved. You now have full course access.",
                "success");

            return record;
        }
    }

    public EnrollmentApplicationRecord Reject(string applicationId, string reviewerId, string reviewerEmail, string? rejectionReason)
    {
        lock (_lock)
        {
            var record = _applications.FirstOrDefault(a => a.Id == applicationId)
                ?? throw new InvalidOperationException("Application not found.");
            EnsureTrainerCanReview(record, reviewerId, reviewerEmail, _users);

            record.Status = EnrollmentApplicationStatuses.Rejected;
            record.RejectionReason = string.IsNullOrWhiteSpace(rejectionReason)
                ? "Application was not approved for this cohort."
                : rejectionReason.Trim();
            record.ReviewedAtUtc = DateTime.UtcNow;
            record.ReviewedBy = reviewerId;
            record.UpdatedAtUtc = DateTime.UtcNow;
            Persist();

            MarkEnrollmentNotificationsRead(reviewerId, applicationId);

            Notify(
                record.UserId,
                "Enrollment not approved",
                $"Your application for {record.CourseTitle} was rejected. {record.RejectionReason}",
                "danger");

            return record;
        }
    }

    public IReadOnlyList<PortalNotificationRecord> ListNotifications(string userId) =>
        _notifications.Where(n => n.UserId == userId).OrderByDescending(n => n.CreatedAtUtc).Take(50).ToList();

    public int UnreadNotificationCount(string userId) =>
        _notifications.Count(n => n.UserId == userId && !n.IsRead);

    public void MarkNotificationRead(string userId, string notificationId)
    {
        lock (_lock)
        {
            var n = _notifications.FirstOrDefault(x => x.Id == notificationId && x.UserId == userId);
            if (n is null) return;
            n.IsRead = true;
            Persist();
        }
    }

    public void MarkEnrollmentNotificationsRead(string userId, string applicationId)
    {
        if (string.IsNullOrWhiteSpace(applicationId)) return;
        lock (_lock)
        {
            var changed = false;
            foreach (var n in _notifications.Where(x =>
                         x.UserId == userId &&
                         x.ApplicationId == applicationId &&
                         !x.IsRead))
            {
                n.IsRead = true;
                changed = true;
            }
            if (changed) Persist();
        }
    }

    private void ValidateSubmit(SubmitEnrollmentApplicationRequest request, string cvFileName)
    {
        if (string.IsNullOrWhiteSpace(request.BranchId) || string.IsNullOrWhiteSpace(request.CourseId))
        {
            throw new ArgumentException("Course context is required.");
        }

        if (string.IsNullOrWhiteSpace(request.MotivationReason) ||
            string.IsNullOrWhiteSpace(request.UniversityName) ||
            string.IsNullOrWhiteSpace(request.Major) ||
            string.IsNullOrWhiteSpace(request.Gpa) ||
            string.IsNullOrWhiteSpace(request.PreviousStudies))
        {
            throw new ArgumentException("All application fields are required.");
        }

        if (string.IsNullOrWhiteSpace(cvFileName))
        {
            throw new ArgumentException("CV upload is required.");
        }

        var ext = Path.GetExtension(cvFileName).ToLowerInvariant();
        if (!AllowedCvExtensions.Contains(ext))
        {
            throw new ArgumentException("CV must be PDF, DOC, or DOCX.");
        }
    }

    private AuthUser? ResolveTrainer(string trainerId, string trainerEmail)
    {
        if (!string.IsNullOrWhiteSpace(trainerId))
        {
            var byId = _users.GetById(trainerId.Trim());
            if (byId is not null) return byId;
        }

        if (!string.IsNullOrWhiteSpace(trainerEmail))
        {
            var byEmail = _users.GetByEmail(trainerEmail.Trim());
            if (byEmail is not null) return byEmail;
        }

        return _users.GetById("trainer-2003");
    }

    private static void EnsureTrainerCanReview(EnrollmentApplicationRecord record, string reviewerId, string reviewerEmail, IUserDirectoryService users)
    {
        var email = reviewerEmail.Trim().ToLowerInvariant();
        var rid = reviewerId.Trim();
        var allowed =
            record.TrainerId == rid ||
            record.TrainerEmail.Equals(email, StringComparison.OrdinalIgnoreCase) ||
            (users.GetByEmail(record.TrainerEmail)?.Id == rid) ||
            (users.GetById(record.TrainerId)?.Email.Equals(email, StringComparison.OrdinalIgnoreCase) ?? false);
        if (!allowed)
        {
            throw new UnauthorizedAccessException("You are not assigned to review this course application.");
        }
    }

    private void NotifyEnrollmentRequest(EnrollmentApplicationRecord record)
    {
        if (string.IsNullOrWhiteSpace(record.TrainerId)) return;
        _notifications.Insert(0, new PortalNotificationRecord
        {
            Id = Guid.NewGuid().ToString("N"),
            UserId = record.TrainerId,
            Title = $"New student enrollment request for {record.CourseTitle}",
            Message = $"{record.UserName} has applied to join your course and is waiting for approval.",
            Tone = "info",
            IsRead = false,
            CreatedAtUtc = DateTime.UtcNow,
            Type = "enrollment_request",
            ApplicationId = record.Id,
            BranchId = record.BranchId,
            CourseId = record.CourseId,
            CourseTitle = record.CourseTitle,
            TargetView = "enrollment-requests",
        });
        if (_notifications.Count > 500) _notifications = _notifications.Take(500).ToList();
        Persist();
    }

    private void Notify(string userId, string title, string message, string tone)
    {
        if (string.IsNullOrWhiteSpace(userId)) return;
        _notifications.Insert(0, new PortalNotificationRecord
        {
            Id = Guid.NewGuid().ToString("N"),
            UserId = userId,
            Title = title,
            Message = message,
            Tone = tone,
            IsRead = false,
            CreatedAtUtc = DateTime.UtcNow,
        });
        if (_notifications.Count > 500) _notifications = _notifications.Take(500).ToList();
    }

    private IReadOnlyList<EnrollmentApplicationRecord> Snapshot()
    {
        lock (_lock)
        {
            return _applications.ToList();
        }
    }

    private void Load()
    {
        if (!File.Exists(_dataPath)) return;
        try
        {
            var json = File.ReadAllText(_dataPath);
            var doc = JsonSerializer.Deserialize<EnrollmentDataDocument>(json, JsonOptions);
            _applications = doc?.Applications ?? [];
            _notifications = doc?.Notifications ?? [];
        }
        catch
        {
            _applications = [];
            _notifications = [];
        }
    }

    private void Persist()
    {
        var doc = new EnrollmentDataDocument { Applications = _applications, Notifications = _notifications };
        File.WriteAllText(_dataPath, JsonSerializer.Serialize(doc, JsonOptions));
    }

    private sealed class EnrollmentDataDocument
    {
        public List<EnrollmentApplicationRecord> Applications { get; set; } = [];
        public List<PortalNotificationRecord> Notifications { get; set; } = [];
    }
}
