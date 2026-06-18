namespace TrainerPortal.Api.Models;

public sealed class BranchDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
}

public sealed class TrackDto
{
    public string Id { get; set; } = string.Empty;
    public string BranchId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public bool IsActive { get; set; }
    public int TrainingsCount { get; set; }
    public int StudentsCount { get; set; }
}

public sealed class TrainingDto
{
    public string Id { get; set; } = string.Empty;
    public string BranchId { get; set; } = string.Empty;
    public string? TrackId { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }
    public string? StartDate { get; set; }
    public string? Location { get; set; }
    public string? TrainerUserId { get; set; }
    public string? TrainerLegacyId { get; set; }
    public string? TrainerEmail { get; set; }
    public string? TrainerName { get; set; }
    public string? CompanyEmail { get; set; }
    public string? CompanyName { get; set; }
    public string? CompanyLogoUrl { get; set; }
    public string? CompanyIndustry { get; set; }
    public string? CompanyLocation { get; set; }
    public string? CompanyVision { get; set; }
    public string? CompanyDescription { get; set; }
    public string? TrackTitle { get; set; }
    public string? CompanyTrainingRequestId { get; set; }
    public string? CompanyTrainingBody { get; set; }
    public string? DocumentFileName { get; set; }
    public int SeatsTaken { get; set; }
    public int SeatsTotal { get; set; }
    public string Status { get; set; } = "active";
    public string? FilterTag { get; set; }
}

public sealed class UpsertTrainingRequest
{
    public string? Id { get; set; }
    public string BranchId { get; set; } = string.Empty;
    public string? TrackId { get; set; }
    public string Category { get; set; } = "FRONTEND";
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }
    public string? StartDate { get; set; }
    public string? TrainerLegacyId { get; set; }
    public int SeatsTotal { get; set; } = 20;
    public string Status { get; set; } = "active";
    public string? FilterTag { get; set; }
}

public sealed class TrainingSectionDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Company { get; set; }
    public string? DurationLabel { get; set; }
    public string Status { get; set; } = "Active";
    public string TrainerLegacyId { get; set; } = string.Empty;
    public int TasksCount { get; set; }
    public int StudentsCount { get; set; }
}

public sealed class CompanyPostDto
{
    public string Id { get; set; } = string.Empty;
    public string BranchId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Body { get; set; }
    public string? TrainingTitle { get; set; }
    public string? TrainingId { get; set; }
    public string? Deadline { get; set; }
    public int ApplicantsCount { get; set; }
    public string Tags { get; set; } = string.Empty;
}

public sealed class JobApplicantDto
{
    public string Id { get; set; } = string.Empty;
    public string BranchId { get; set; } = string.Empty;
    public string? ApplicantInitial { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? TrainingTitle { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? AppliedOn { get; set; }
}

public sealed class TraineeEvaluationDto
{
    public string Id { get; set; } = string.Empty;
    public string? StudentLegacyId { get; set; }
    public string TraineeName { get; set; } = string.Empty;
    public int PendingCount { get; set; }
    public IReadOnlyList<EvaluationTaskItemDto> Tasks { get; set; } = [];
}

public sealed class EvaluationTaskItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Deadline { get; set; }
    public string? SubmittedOn { get; set; }
    public string? RepoTag { get; set; }
    public string? RepoBranch { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Grade { get; set; }
    public string? Feedback { get; set; }
}

public sealed class UpsertTrackRequest
{
    public string? Id { get; set; }
    public string BranchId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Icon { get; set; }
}

public sealed class SectionStudentDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int Progress { get; set; }
    public int CompletedTasks { get; set; }
    public int TotalTasks { get; set; }
}

public sealed class SectionDetailDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Company { get; set; }
    public string? DurationLabel { get; set; }
    public string Status { get; set; } = "Active";
    public string TrainerLegacyId { get; set; } = string.Empty;
    public int TasksCount { get; set; }
    public int StudentsCount { get; set; }
    public IReadOnlyList<SectionStudentDto> Students { get; set; } = [];
}

public sealed class SectionTaskDto
{
    public string Id { get; set; } = string.Empty;
    public string SectionId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Deadline { get; set; }
    public string SubmissionStatus { get; set; } = "Not Submitted";
    public IReadOnlyList<string> AssignedStudentIds { get; set; } = [];
    public IReadOnlyList<string> AssignedStudentNames { get; set; } = [];
}

public sealed class UpsertSectionTaskRequest
{
    public string? Id { get; set; }
    public string SectionId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Deadline { get; set; }
    public IReadOnlyList<string> StudentLegacyIds { get; set; } = [];
}

public sealed class UpsertCompanyPostRequest
{
    public string? Id { get; set; }
    public string BranchId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }
    public string? TrainingTitle { get; set; }
    public string? TrainingId { get; set; }
    public string? Deadline { get; set; }
    public string Status { get; set; } = "published";
    public string? Tags { get; set; }
}

public sealed class UpdateEvaluationItemRequest
{
    public string? Status { get; set; }
    public string? SubmittedOn { get; set; }
    public string? RepoTag { get; set; }
    public string? RepoBranch { get; set; }
    public string? Grade { get; set; }
    public string? Feedback { get; set; }
}
