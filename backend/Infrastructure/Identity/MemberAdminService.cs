using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TrainerPortal.Api.Domain.Entities;
using TrainerPortal.Api.Infrastructure.Persistence;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Infrastructure.Identity;

public sealed class MemberAdminService(
    ApplicationDbContext dbContext,
    UserManager<ApplicationUser> userManager) : IMemberAdminService
{
    private static readonly Dictionary<string, string> FrontendToIdentity = new(StringComparer.OrdinalIgnoreCase)
    {
        ["admin"] = "Admin",
        ["student"] = "Student",
        ["trainer"] = "Trainer",
        ["company"] = "Company",
        ["employer"] = "Company",
        ["institution"] = "Company",
    };

    public async Task<IReadOnlyList<MemberDto>> ListMembersAsync(CancellationToken cancellationToken = default)
    {
        var users = await dbContext.Users.AsNoTracking()
            .Where(u => !u.IsDeleted)
            .OrderByDescending(u => u.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var result = new List<MemberDto>(users.Count);
        foreach (var user in users)
        {
            var roles = await userManager.GetRolesAsync(user);
            result.Add(MapUser(user, roles.FirstOrDefault() ?? "Student"));
        }

        return result;
    }

    public async Task<MemberDto?> UpdateMemberRoleAsync(
        string memberId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var user = await FindActiveUserAsync(memberId, tracked: true, cancellationToken);
        if (user is null)
        {
            return null;
        }

        if (!FrontendToIdentity.TryGetValue(role.Trim(), out var identityRole))
        {
            identityRole = "Student";
        }

        var currentRoles = await userManager.GetRolesAsync(user);
        if (currentRoles.Any())
        {
            await userManager.RemoveFromRolesAsync(user, currentRoles);
        }

        await userManager.AddToRoleAsync(user, identityRole);
        user.UpdatedAtUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return MapUser(user, identityRole);
    }

    public async Task<bool> SoftDeleteMemberAsync(string memberId, CancellationToken cancellationToken = default)
    {
        var user = await FindActiveUserAsync(memberId, tracked: true, cancellationToken);
        if (user is null)
        {
            return false;
        }

        user.IsDeleted = true;
        user.UpdatedAtUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        await userManager.SetLockoutEnabledAsync(user, true);
        await userManager.SetLockoutEndDateAsync(user, DateTimeOffset.MaxValue);

        return true;
    }

    private async Task<ApplicationUser?> FindActiveUserAsync(
        string memberId,
        bool tracked = false,
        CancellationToken cancellationToken = default)
    {
        var id = memberId.Trim();
        var query = tracked ? dbContext.Users : dbContext.Users.AsNoTracking();
        return await query.FirstOrDefaultAsync(
            u => !u.IsDeleted && (u.LegacyUserId == id || u.Id == id),
            cancellationToken);
    }

    private static MemberDto MapUser(ApplicationUser user, string identityRole) =>
        new()
        {
            Id = user.LegacyUserId.Length > 0 ? user.LegacyUserId : user.Id,
            FullName = user.FullName,
            Email = user.Email ?? string.Empty,
            Role = MapIdentityRoleToFrontend(identityRole),
            RegisteredAt = user.CreatedAtUtc.ToString("O"),
        };

    private static string MapIdentityRoleToFrontend(string identityRole) =>
        identityRole.Trim().ToLowerInvariant() switch
        {
            "admin" => "admin",
            "trainer" => "trainer",
            "company" => "company",
            _ => "student",
        };
}
