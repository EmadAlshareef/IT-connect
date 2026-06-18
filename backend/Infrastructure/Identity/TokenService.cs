using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using TrainerPortal.Api.Domain.Entities;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Infrastructure.Identity;

public sealed class TokenService(IConfiguration configuration) : ITokenService
{
    private readonly int _accessTokenMinutes = configuration.GetValue("Jwt:AccessTokenMinutes", 15);

    public (string AccessToken, DateTime ExpiresAtUtc) GenerateAccessToken(ApplicationUser user, IList<string> roles)
    {
        var key = ResolveJwtKey();
        var issuer = configuration["Jwt:Issuer"] ?? throw new InvalidOperationException("Missing JWT issuer.");
        var audience = configuration["Jwt:Audience"] ?? throw new InvalidOperationException("Missing JWT audience.");

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var expiresAt = DateTime.UtcNow.AddMinutes(_accessTokenMinutes);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.LegacyUserId.Length > 0 ? user.LegacyUserId : user.Id),
            new(ClaimTypes.Email, user.Email ?? string.Empty),
            new(ClaimTypes.Name, user.FullName),
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256));

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }

    public string GenerateRefreshToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

    /// <summary>Legacy bridge for in-memory AuthUser consumers.</summary>
    public string Generate(AuthUser user)
    {
        var key = ResolveJwtKey();
        var issuer = configuration["Jwt:Issuer"] ?? throw new InvalidOperationException("Missing JWT issuer.");
        var audience = configuration["Jwt:Audience"] ?? throw new InvalidOperationException("Missing JWT audience.");

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.Name),
            new(ClaimTypes.Role, user.Role),
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_accessTokenMinutes),
            signingCredentials: new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private string ResolveJwtKey()
    {
        var key = Environment.GetEnvironmentVariable("JWT_KEY") ?? configuration["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(key))
        {
            throw new InvalidOperationException("Missing JWT key.");
        }

        return key;
    }
}
