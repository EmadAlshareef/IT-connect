using TrainerPortal.Api.Domain.Entities;
using TrainerPortal.Api.Models;

namespace TrainerPortal.Api.Services;

public interface ITokenService
{
    string Generate(AuthUser user);

    (string AccessToken, DateTime ExpiresAtUtc) GenerateAccessToken(ApplicationUser user, IList<string> roles);

    string GenerateRefreshToken();
}
