namespace TrainerPortal.Api.Domain.Entities.Portal;

/// <summary>Phase 3 — SQL persistence for company portal localStorage shapes (not yet wired to APIs).</summary>

public sealed class CompanyTrainer
{
    public string Id { get; set; } = string.Empty;

    public string? CompanyId { get; set; }

    /// <summary>Denormalized company contact email for dual-mode localStorage matching.</summary>
    public string CompanyEmail { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string? CompanyPosition { get; set; }

    /// <summary>Original localStorage id (e.g. co-tr-…).</summary>
    public string? LegacyLocalId { get; set; }

    public DateTime CreatedAt { get; set; }

    public bool IsDeleted { get; set; }

    public Company? Company { get; set; }

    public ICollection<CompanyTrainerLinkedTrack> LinkedTracks { get; set; } = [];
}

public sealed class CompanyTrainerLinkedTrack
{
    public string TrainerId { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    public string TrackTitle { get; set; } = string.Empty;

    public CompanyTrainer? Trainer { get; set; }
}

public sealed class CompanyTrackRequest
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

    /// <summary>Catalog track id created when admin approves this request.</summary>
    public string? ApprovedTrackId { get; set; }

    public DateTime? ReviewedAt { get; set; }

    public string? ReviewedBy { get; set; }

    public string? LegacyLocalId { get; set; }

    public DateTime CreatedAt { get; set; }

    public bool IsDeleted { get; set; }

    public Company? Company { get; set; }

    public Branch? Branch { get; set; }
}

public sealed class CompanyTrainingRequest
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

    public DateOnly? StartDate { get; set; }

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

    public DateTime CreatedAt { get; set; }

    public bool IsDeleted { get; set; }

    public Company? Company { get; set; }

    public Branch? Branch { get; set; }
}

public sealed class CompanyPostRequest
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

    public DateOnly? Deadline { get; set; }

    public string? RequestedBy { get; set; }

    public string? RequestedByEmail { get; set; }

    public string ReviewStatus { get; set; } = "PENDING";

    public DateTime? ReviewedAt { get; set; }

    public string? ReviewedBy { get; set; }

    public string? LegacyLocalId { get; set; }

    public DateTime CreatedAt { get; set; }

    public bool IsDeleted { get; set; }

    public Company? Company { get; set; }

    public Branch? Branch { get; set; }
}

public sealed class CompanySelectedTrack
{
    public string Id { get; set; } = string.Empty;

    public string? CompanyId { get; set; }

    public string CompanyEmail { get; set; } = string.Empty;

    public string TrackValue { get; set; } = string.Empty;

    public string? Title { get; set; }

    public DateTime AddedAt { get; set; }

    public Company? Company { get; set; }
}
