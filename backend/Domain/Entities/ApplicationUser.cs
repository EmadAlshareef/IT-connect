using Microsoft.AspNetCore.Identity;

namespace TrainerPortal.Api.Domain.Entities;

public sealed class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;

    /// <summary>Legacy portal id (e.g. trainer-2003) for backward-compatible APIs.</summary>
    public string LegacyUserId { get; set; } = string.Empty;

    /// <summary>Trainer legacy id for student accounts (SQLite / compat column).</summary>
    public string? TrainerLegacyId { get; set; }

    /// <summary>FK to assigned trainer (SQL Server v3).</summary>
    public string? AssignedTrainerUserId { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public bool IsDeleted { get; set; }

    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];

    /// <summary>Company memberships (Phase 2). Empty for platform-level admins.</summary>
    public ICollection<UserCompany> CompanyMemberships { get; set; } = [];
}
