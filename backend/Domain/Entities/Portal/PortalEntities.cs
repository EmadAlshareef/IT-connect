namespace TrainerPortal.Api.Domain.Entities.Portal;

public sealed class RefStatus
{
    public byte Id { get; set; }
    public string Domain { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

public sealed class RefNotificationTone
{
    public string Code { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

public sealed class RefCourseCategory
{
    public string Code { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

public sealed class RefTag
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public sealed class Branch
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Region { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public bool IsDeleted { get; set; }
}

/// <summary>Tenant company (Phase 1 + Phase 3 profile fields; not yet used by APIs).</summary>
public sealed class Company
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? LogoUrl { get; set; }
    public string? Industry { get; set; }
    public string? Location { get; set; }
    public string? Vision { get; set; }
    public string? Description { get; set; }
    /// <summary>Original localStorage profile id (e.g. company-…).</summary>
    public string? LegacyLocalId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<Entities.UserCompany> UserMemberships { get; set; } = [];
    public ICollection<CompanyTrainer> Trainers { get; set; } = [];
    public ICollection<CompanyTrackRequest> TrackRequests { get; set; } = [];
    public ICollection<CompanyTrainingRequest> TrainingRequests { get; set; } = [];
    public ICollection<CompanyPostRequest> PostRequests { get; set; } = [];
    public ICollection<CompanySelectedTrack> SelectedTracks { get; set; } = [];
}

public sealed class Track
{
    public string Id { get; set; } = string.Empty;
    public string BranchId { get; set; } = string.Empty;
    public string? CompanyId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public bool IsDeleted { get; set; }
    public Branch? Branch { get; set; }
    public Company? Company { get; set; }
}

public sealed class Training
{
    public string Id { get; set; } = string.Empty;
    public string BranchId { get; set; } = string.Empty;
    public string? CompanyId { get; set; }
    public string? TrackId { get; set; }
    public string CategoryCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }
    public DateOnly? StartDate { get; set; }
    public string? Location { get; set; }
    public string? TrainerUserId { get; set; }
    public int SeatsTaken { get; set; }
    public int SeatsTotal { get; set; }
    public byte StatusId { get; set; }
    public string? FilterTag { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public bool IsDeleted { get; set; }
    public Track? Track { get; set; }
    public Company? Company { get; set; }
}

public sealed class TrainingSection
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? CompanyId { get; set; }
    public string? Company { get; set; }
    public string? DurationLabel { get; set; }
    public byte StatusId { get; set; }
    public string TrainerUserId { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public bool IsDeleted { get; set; }
    public Company? CompanyEntity { get; set; }
}

public sealed class SectionEnrollment
{
    public string SectionId { get; set; } = string.Empty;
    public string StudentUserId { get; set; } = string.Empty;
    public int ProgressPercent { get; set; }
    public int CompletedTasks { get; set; }
    public int TotalTasks { get; set; }
    public DateTime EnrolledAtUtc { get; set; }
}

public sealed class CompanyPost
{
    public string Id { get; set; } = string.Empty;
    public string BranchId { get; set; } = string.Empty;
    public string? CompanyId { get; set; }
    public string Title { get; set; } = string.Empty;
    public byte StatusId { get; set; }
    public string? Body { get; set; }
    public string? TrainingTitle { get; set; }
    public string? TrainingId { get; set; }
    public DateOnly? Deadline { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public bool IsDeleted { get; set; }
    public ICollection<CompanyPostTag> Tags { get; set; } = [];
    public Company? Company { get; set; }
}

public sealed class CompanyPostTag
{
    public string PostId { get; set; } = string.Empty;
    public int TagId { get; set; }
    public RefTag? Tag { get; set; }
}

public sealed class JobApplicant
{
    public string Id { get; set; } = string.Empty;
    public string BranchId { get; set; } = string.Empty;
    public string? CompanyId { get; set; }
    public string? ApplicantUserId { get; set; }
    public string? ApplicantInitial { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? TrainingTitle { get; set; }
    public byte StatusId { get; set; }
    public DateOnly? AppliedOn { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public Company? Company { get; set; }
}

public sealed class EnrollmentApplication
{
    public string Id { get; set; } = string.Empty;
    public string StudentUserId { get; set; } = string.Empty;
    public string BranchId { get; set; } = string.Empty;
    public string? CompanyId { get; set; }
    public string CourseId { get; set; } = string.Empty;
    public string TrainerUserId { get; set; } = string.Empty;
    public string? MotivationReason { get; set; }
    public string? UniversityName { get; set; }
    public string? Major { get; set; }
    public string? Gpa { get; set; }
    public string? PreviousStudies { get; set; }
    public string? CvFileName { get; set; }
    public string? CvFileUrl { get; set; }
    public byte StatusId { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }
    public string? ReviewedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public bool IsDeleted { get; set; }
    public Company? Company { get; set; }
}

public sealed class PortalNotification
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string ToneCode { get; set; } = "info";
    public bool IsRead { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public string TypeCode { get; set; } = string.Empty;
    public string? ApplicationId { get; set; }
    public string? BranchId { get; set; }
    public string? CompanyId { get; set; }
    public string? CourseId { get; set; }
    public string TargetView { get; set; } = "enrollment-requests";
    public string? SubmissionId { get; set; }
    public string? TopicId { get; set; }
    public string? StudentLegacyId { get; set; }
    public string? TargetPath { get; set; }
    public string? LegacyLocalId { get; set; }
    public Company? Company { get; set; }
}

public sealed class TraineeTask
{
    public string Id { get; set; } = string.Empty;

    /// <summary>Null for published tasks visible to all enrolled trainees in the session.</summary>
    public string? StudentUserId { get; set; }

    public string? SectionId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime DeadlineUtc { get; set; }
    public byte StatusId { get; set; }
    public string? LastSubmissionId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public bool IsDeleted { get; set; }

    public bool IsPublished { get; set; }
    public string? TrainerEmail { get; set; }
    public string? TrainerName { get; set; }
    public string? SessionTitle { get; set; }

    /// <summary>Training session id from Create Task form (always stored, even when SectionId FK is null).</summary>
    public string? TrainingSessionId { get; set; }

    /// <summary>Deadline as entered in the form (yyyy-MM-dd).</summary>
    public string? Deadline { get; set; }

    public string? AttachmentName { get; set; }
    public string? AttachmentDataUrl { get; set; }
    public string? BranchId { get; set; }
    public string? CourseId { get; set; }
    public string? CourseTitle { get; set; }
    public DateTime? PublishedAtUtc { get; set; }
    public string? LegacyLocalId { get; set; }
}

/// <summary>Trainer-published task briefs before assignment to trainees.</summary>
public sealed class TrainerTaskBrief
{
    public string Id { get; set; } = string.Empty;

    public string RequestedByEmail { get; set; } = string.Empty;

    public string? TrainerName { get; set; }

    public string SessionId { get; set; } = string.Empty;

    public string? SessionTitle { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string? Deadline { get; set; }

    public string? AttachmentName { get; set; }

    public string? BranchId { get; set; }

    public string? CourseId { get; set; }

    public string? CourseTitle { get; set; }

    public string Status { get; set; } = "pending";

    public DateTime? ReviewedAt { get; set; }

    public DateTime? PublishedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public string? LegacyLocalId { get; set; }

    public bool IsDeleted { get; set; }
}

/// <summary>Trainer topic documentation (programming lessons) per training session.</summary>
public sealed class TrainingTopic
{
    public string Id { get; set; } = string.Empty;
    public string TrainerEmail { get; set; } = string.Empty;
    public string TrainingSessionId { get; set; } = string.Empty;
    public string? TrainingTitle { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
    public string Status { get; set; } = "draft";
    public string? ContentKey { get; set; }
    public string? VideoUrl { get; set; }
    public string? VideoCaption { get; set; }
    public string? VideoSource { get; set; }
    public string? VideoFileName { get; set; }
    public int? VideoFileSize { get; set; }
    public string? VideoBlobUrl { get; set; }
    public bool VideoAllowDownload { get; set; } = true;
    public string? SectionsJson { get; set; }
    public string? AttachmentsJson { get; set; }
    public string? EnrolledStudentIdsJson { get; set; }
    public int EnrolledCount { get; set; }
    public string? BranchId { get; set; }
    public string? CourseId { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? LegacyLocalId { get; set; }
    public bool IsDeleted { get; set; }
}

public sealed class TaskSubmission
{
    public string Id { get; set; } = string.Empty;
    public string StudentUserId { get; set; } = string.Empty;
    public string TaskId { get; set; } = string.Empty;
    public string? TaskTitle { get; set; }
    public string? BranchId { get; set; }
    public string? CourseId { get; set; }
    public string? SubmissionLink { get; set; }
    public string? FileName { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = "Pending Evaluation";
    public string? Grade { get; set; }
    public string? EvaluationFeedback { get; set; }
    public string? TrainerName { get; set; }
    public string? ReviewedByUserId { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }
    public string? LegacyLocalId { get; set; }
    public DateTime SubmittedAtUtc { get; set; }
}

public sealed class Message
{
    public string Id { get; set; } = string.Empty;
    public string SenderUserId { get; set; } = string.Empty;
    public string ReceiverUserId { get; set; } = string.Empty;
    public string SenderRole { get; set; } = string.Empty;
    public string ReceiverRole { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? TaskId { get; set; }
    public DateTime TimestampUtc { get; set; }
}

public sealed class TrainerFeedback
{
    public string Id { get; set; } = string.Empty;
    public string StudentUserId { get; set; } = string.Empty;
    public string? TrainerUserId { get; set; }
    public string? TaskId { get; set; }
    public string? SubmissionId { get; set; }
    public string? BranchId { get; set; }
    public string? CourseId { get; set; }
    public string Comment { get; set; } = string.Empty;
    public string? Grade { get; set; }
    public string? LegacyLocalId { get; set; }
    public DateTime AtUtc { get; set; }
}

public sealed class TraineeEvaluation
{
    public string Id { get; set; } = string.Empty;
    public string? StudentUserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public ICollection<EvaluationTaskItem> Items { get; set; } = [];
}

public sealed class EvaluationTaskItem
{
    public string Id { get; set; } = string.Empty;
    public string EvaluationId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateOnly? Deadline { get; set; }
    public DateOnly? SubmittedOn { get; set; }
    public string? RepoTag { get; set; }
    public string? RepoBranch { get; set; }
    public string? Grade { get; set; }
    public string? Feedback { get; set; }
    public string? LegacyLocalId { get; set; }
    public byte StatusId { get; set; }
}

public sealed class InternshipProgram
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? CompanyId { get; set; }
    public string Company { get; set; } = string.Empty;
    public string Specialization { get; set; } = string.Empty;
    public string TrainingType { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public DateTime OpensOnUtc { get; set; }
    public DateTime ClosesOnUtc { get; set; }
    public bool IsDeleted { get; set; }
    public Company? CompanyEntity { get; set; }
}

public sealed class InternshipApplication
{
    public string Id { get; set; } = string.Empty;
    public string StudentUserId { get; set; } = string.Empty;
    public string ProgramId { get; set; } = string.Empty;
    public byte StatusId { get; set; }
    public string? CoverLetter { get; set; }
    public string? CvFileName { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public ICollection<InternshipApplicationTimelineStep> TimelineSteps { get; set; } = [];
}

public sealed class InternshipApplicationTimelineStep
{
    public Guid Id { get; set; }
    public string ApplicationId { get; set; } = string.Empty;
    public int StepOrder { get; set; }
    public string Label { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public DateTime AtUtc { get; set; }
}
