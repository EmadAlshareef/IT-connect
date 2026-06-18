namespace TrainerPortal.Api.Domain.Entities;

/// <summary>
/// Links an Identity user to a tenant company (Phase 2 — schema only; not yet used by APIs).
/// Platform Admins typically have no rows here.
/// </summary>
public sealed class UserCompany
{
    public string UserId { get; set; } = string.Empty;

    public string CompanyId { get; set; } = string.Empty;

    /// <summary>Primary company when a user belongs to multiple tenants.</summary>
    public bool IsPrimary { get; set; } = true;

    public DateTime CreatedAt { get; set; }

    public ApplicationUser? User { get; set; }

    public Portal.Company? Company { get; set; }
}
