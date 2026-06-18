using Microsoft.EntityFrameworkCore;
using TrainerPortal.Api.Domain.Entities;

namespace TrainerPortal.Api.Infrastructure.Persistence;

public sealed class PortalUserResolver(ApplicationDbContext db)
{
    public ApplicationUser? FindByLegacyOrId(string legacyOrId)
    {
        if (string.IsNullOrWhiteSpace(legacyOrId)) return null;
        var key = legacyOrId.Trim();
        return db.Users.AsNoTracking()
            .FirstOrDefault(u => u.LegacyUserId == key || u.Id == key);
    }

    public string? ResolveDbUserId(string legacyOrId) => FindByLegacyOrId(legacyOrId)?.Id;

    public string LegacyId(ApplicationUser user) =>
        string.IsNullOrWhiteSpace(user.LegacyUserId) ? user.Id : user.LegacyUserId;

    public Dictionary<string, ApplicationUser> LoadUsersByIds(IEnumerable<string> ids)
    {
        var keys = ids.Where(id => !string.IsNullOrWhiteSpace(id)).Select(id => id.Trim()).Distinct().ToList();
        if (keys.Count == 0) return [];

        return db.Users.AsNoTracking()
            .Where(u => keys.Contains(u.Id) || keys.Contains(u.LegacyUserId))
            .AsEnumerable()
            .GroupBy(u => u.Id)
            .ToDictionary(g => g.Key, g => g.First());
    }
}
