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
            if (existing is not null)
            {
                throw new InvalidOperationException("An application for this course already exists.");
            }

            var trainer = ResolveTrainer(request.TrainerId, request.TrainerEmail);
            var id = Guid.NewGuid().ToString("N");
            var ext = Path.GetExtension(cvFileName).ToLowerInvariant();
            var storedName = $"{id}{ext}";
            var diskPath = Path.Combine(_uploadRoot, storedName);

            using (var fs = File.Create(diskPath))
            {
                cvStream.CopyTo(fs);
            }

            var now = DateTime.UtcNow;
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

            Notify(
                record.TrainerId,
                "New enrollment application",
                $"{record.UserName} applied for {record.CourseTitle}. Review required.",
                "info");

            return record;
        }
    }

    public IReadOnlyList<EnrollmentApplicationRecord> ListForTrainer(string trainerId, string trainerEmail, string? statusFilter)
    {
        var email = trainerEmail.Trim().ToLowerInvariant();
        var list = Snapshot().Where(a =>
            a.TrainerId == trainerId ||
            a.TrainerEmail.Equals(email, StringComparison.OrdinalIgnoreCase));

        if (!string.IsNullOrWhiteSpace(statusFilter))
        {
            var f = statusFilter.Trim().ToLowerInvariant();
            list = list.Where(a => a.Status.Equals(f, StringComparison.OrdinalIgnoreCase));
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
            EnsureTrainerCanReview(record, reviewerId, reviewerEmail);

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
            EnsureTrainerCanReview(record, reviewerId, reviewerEmail);

            record.Status = EnrollmentApplicationStatuses.Rejected;
            record.RejectionReason = string.IsNullOrWhiteSpace(rejectionReason)
                ? "Application was not approved for this cohort."
                : rejectionReason.Trim();
            record.ReviewedAtUtc = DateTime.UtcNow;
            record.ReviewedBy = reviewerId;
            record.UpdatedAtUtc = DateTime.UtcNow;
            Persist();

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

        var email = trainerEmail.Trim();
        if (string.IsNullOrWhiteSpace(email)) return null;

        return _users.GetByEmail(email);
    }

    private static void EnsureTrainerCanReview(EnrollmentApplicationRecord record, string reviewerId, string reviewerEmail)
    {
        var email = reviewerEmail.Trim().ToLowerInvariant();
        var allowed =
            record.TrainerId == reviewerId ||
            record.TrainerEmail.Equals(email, StringComparison.OrdinalIgnoreCase);
        if (!allowed)
        {
            throw new UnauthorizedAccessException("You are not assigned to review this course application.");
        }
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
