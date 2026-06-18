namespace TrainerPortal.Api.Models;

public sealed class CompanyDto
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
    public string? LegacyLocalId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class CreateCompanyRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Slug { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? LogoUrl { get; set; }
    public string? Industry { get; set; }
    public string? Location { get; set; }
    public string? Vision { get; set; }
    public string? Description { get; set; }
    public string? LegacyLocalId { get; set; }
}

public sealed class UpdateCompanyRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Slug { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? LogoUrl { get; set; }
    public string? Industry { get; set; }
    public string? Location { get; set; }
    public string? Vision { get; set; }
    public string? Description { get; set; }
    public string? LegacyLocalId { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class CompanyTrainerDto
{
    public string Id { get; set; } = string.Empty;
    public string? CompanyId { get; set; }
    public string CompanyEmail { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? CompanyPosition { get; set; }
    public string? LegacyLocalId { get; set; }
    public DateTime CreatedAt { get; set; }
    public IReadOnlyList<string> LinkedTrackTitles { get; set; } = [];
}

public sealed class CreateCompanyTrainerRequest
{
    public string? CompanyId { get; set; }
    public string CompanyEmail { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? CompanyPosition { get; set; }
    public string? LegacyLocalId { get; set; }
    public IReadOnlyList<string>? LinkedTrackTitles { get; set; }
}

public sealed class UpdateCompanyTrainerRequest
{
    public string? CompanyId { get; set; }
    public string CompanyEmail { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Password { get; set; }
    public string? CompanyPosition { get; set; }
    public string? LegacyLocalId { get; set; }
    public IReadOnlyList<string>? LinkedTrackTitles { get; set; }
}

public sealed class CompanyTrackRequestDto
{
    public string Id { get; set; } = string.Empty;
    public string? CompanyId { get; set; }
    public string? CompanyEmail { get; set; }
    public string BranchId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? RequestedBy { get; set; }
    public string? RequestedByEmail { get; set; }
    public string Status { get; set; } = "PENDING";
    public string? ApprovedTrackId { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedBy { get; set; }
    public string? LegacyLocalId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class CreateCompanyTrackRequestRequest
{
    public string? CompanyId { get; set; }
    public string? CompanyEmail { get; set; }
    public string BranchId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? RequestedBy { get; set; }
    public string? RequestedByEmail { get; set; }
    public string? LegacyLocalId { get; set; }
}

public sealed class UpdateCompanyTrackRequestRequest
{
    public string? CompanyId { get; set; }
    public string? CompanyEmail { get; set; }
    public string BranchId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? RequestedBy { get; set; }
    public string? RequestedByEmail { get; set; }
    public string Status { get; set; } = "PENDING";
    public string? ApprovedTrackId { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedBy { get; set; }
    public string? LegacyLocalId { get; set; }
}

public sealed class CompanyTrainingRequestDto
{
    public string Id { get; set; } = string.Empty;
    public string? CompanyId { get; set; }
    public string? CompanyEmail { get; set; }
    public string BranchId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }
    public string? TrackRequestId { get; set; }
    public string? TrackTitle { get; set; }
    public string? TrainerName { get; set; }
    public string? TrainerEmail { get; set; }
    public string? StartDate { get; set; }
    public int SeatsTotal { get; set; }
    public string TrainingStatus { get; set; } = "active";
    public string? DocumentFileName { get; set; }
    public string? DocumentDataUrl { get; set; }
    public string? RequestedBy { get; set; }
    public string? RequestedByEmail { get; set; }
    public string ReviewStatus { get; set; } = "PENDING";
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedBy { get; set; }
    public string? PublishedTrainingId { get; set; }
    public string? LegacyLocalId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class CompanyEnrolledStudentDto
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Name { get; set; } = "Student";
    public string Email { get; set; } = string.Empty;
    public string TrainingTitle { get; set; } = "Training program";
    public string TrainingId { get; set; } = string.Empty;
    public string BranchId { get; set; } = string.Empty;
    public string CourseId { get; set; } = string.Empty;
    public string? TrainerName { get; set; }
    public string? TrainerEmail { get; set; }
    public string Status { get; set; } = "pending";
    public DateTime EnrolledAt { get; set; }
}

public sealed class CreateCompanyTrainingRequestRequest
{
    public string? CompanyId { get; set; }
    public string? CompanyEmail { get; set; }
    public string BranchId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }
    public string? TrackRequestId { get; set; }
    public string? TrackTitle { get; set; }
    public string? TrainerName { get; set; }
    public string? TrainerEmail { get; set; }
    public string? StartDate { get; set; }
    public int SeatsTotal { get; set; } = 20;
    public string TrainingStatus { get; set; } = "active";
    public string? DocumentFileName { get; set; }
    public string? DocumentDataUrl { get; set; }
    public string? RequestedBy { get; set; }
    public string? RequestedByEmail { get; set; }
    public string? LegacyLocalId { get; set; }
}

public sealed class UpdateCompanyTrainingRequestRequest
{
    public string? CompanyId { get; set; }
    public string? CompanyEmail { get; set; }
    public string BranchId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }
    public string? TrackRequestId { get; set; }
    public string? TrackTitle { get; set; }
    public string? TrainerName { get; set; }
    public string? TrainerEmail { get; set; }
    public string? StartDate { get; set; }
    public int SeatsTotal { get; set; } = 20;
    public string TrainingStatus { get; set; } = "active";
    public string? DocumentFileName { get; set; }
    public string? DocumentDataUrl { get; set; }
    public string? RequestedBy { get; set; }
    public string? RequestedByEmail { get; set; }
    public string ReviewStatus { get; set; } = "PENDING";
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedBy { get; set; }
    public string? PublishedTrainingId { get; set; }
    public string? LegacyLocalId { get; set; }
}

public sealed class CompanyPostRequestDto
{
    public string Id { get; set; } = string.Empty;
    public string? CompanyId { get; set; }
    public string? CompanyEmail { get; set; }
    public string BranchId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }
    public string? TrainingTitle { get; set; }
    public string? CompanyTrainingRequestId { get; set; }
    public string? SkillsRaw { get; set; }
    public string? Deadline { get; set; }
    public string? RequestedBy { get; set; }
    public string? RequestedByEmail { get; set; }
    public string ReviewStatus { get; set; } = "PENDING";
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedBy { get; set; }
    public string? LegacyLocalId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class CreateCompanyPostRequestRequest
{
    public string? CompanyId { get; set; }
    public string? CompanyEmail { get; set; }
    public string BranchId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }
    public string? TrainingTitle { get; set; }
    public string? CompanyTrainingRequestId { get; set; }
    public string? SkillsRaw { get; set; }
    public string? Deadline { get; set; }
    public string? RequestedBy { get; set; }
    public string? RequestedByEmail { get; set; }
    public string? LegacyLocalId { get; set; }
}

public sealed class UpdateCompanyPostRequestRequest
{
    public string? CompanyId { get; set; }
    public string? CompanyEmail { get; set; }
    public string BranchId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }
    public string? TrainingTitle { get; set; }
    public string? CompanyTrainingRequestId { get; set; }
    public string? SkillsRaw { get; set; }
    public string? Deadline { get; set; }
    public string? RequestedBy { get; set; }
    public string? RequestedByEmail { get; set; }
    public string ReviewStatus { get; set; } = "PENDING";
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedBy { get; set; }
    public string? LegacyLocalId { get; set; }
}

public sealed class CompanySelectedTrackDto
{
    public string Id { get; set; } = string.Empty;
    public string? CompanyId { get; set; }
    public string CompanyEmail { get; set; } = string.Empty;
    public string TrackValue { get; set; } = string.Empty;
    public string? Title { get; set; }
    public DateTime AddedAt { get; set; }
}

public sealed class CreateCompanySelectedTrackRequest
{
    public string? CompanyId { get; set; }
    public string CompanyEmail { get; set; } = string.Empty;
    public string TrackValue { get; set; } = string.Empty;
    public string? Title { get; set; }
}

public sealed class UpdateCompanySelectedTrackRequest
{
    public string? CompanyId { get; set; }
    public string CompanyEmail { get; set; } = string.Empty;
    public string TrackValue { get; set; } = string.Empty;
    public string? Title { get; set; }
}
