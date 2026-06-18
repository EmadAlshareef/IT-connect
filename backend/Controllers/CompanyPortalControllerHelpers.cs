using System.Security.Claims;

namespace TrainerPortal.Api.Controllers;

internal static class CompanyPortalControllerHelpers
{
    /// <summary>
    /// When the caller is trainer-only, scope list endpoints to their login email.
    /// Admin and Company roles may list broader company data.
    /// </summary>
    public static string? ResolveTrainerScopeEmail(ClaimsPrincipal user)
    {
        if (user.IsInRole("Admin") || user.IsInRole("Company")) return null;
        if (!user.IsInRole("Trainer")) return null;

        var email = user.FindFirstValue(ClaimTypes.Email)?.Trim();
        return string.IsNullOrWhiteSpace(email) ? null : email;
    }

    public static string? ResolveCompanyScopeEmail(ClaimsPrincipal user, string? requestedEmail = null)
    {
        if (user.IsInRole("Admin")) return requestedEmail;
        if (!user.IsInRole("Company")) return requestedEmail;

        var email = user.FindFirstValue(ClaimTypes.Email)?.Trim();
        return string.IsNullOrWhiteSpace(email) ? requestedEmail : email;
    }
}
