namespace TrainerPortal.Api.Models;

public sealed class MemberDto
{
    public required string Id { get; init; }

    public required string FullName { get; init; }

    public required string Email { get; init; }

    /// <summary>Lowercase portal role id (student, trainer, admin, company).</summary>
    public required string Role { get; init; }

    public required string RegisteredAt { get; init; }
}

public sealed class UpdateMemberRoleRequest
{
    public required string Role { get; init; }
}
