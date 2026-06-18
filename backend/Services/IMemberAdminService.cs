using TrainerPortal.Api.Models;

namespace TrainerPortal.Api.Services;

public interface IMemberAdminService
{
    Task<IReadOnlyList<MemberDto>> ListMembersAsync(CancellationToken cancellationToken = default);

    Task<MemberDto?> UpdateMemberRoleAsync(string memberId, string role, CancellationToken cancellationToken = default);

    Task<bool> SoftDeleteMemberAsync(string memberId, CancellationToken cancellationToken = default);
}
