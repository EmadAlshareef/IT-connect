using TrainerPortal.Api.Application.DTOs;
using TrainerPortal.Api.Models;

namespace TrainerPortal.Api.Services;

public interface IAuthService
{
    Task<AuthResponseDto> LoginAsync(LoginRequestDto request, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default);

    Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default);

    Task<AuthResponseDto> RefreshAsync(RefreshTokenRequestDto request, string? ipAddress, CancellationToken cancellationToken = default);

    Task LogoutAsync(string userId, string? refreshToken, string? ipAddress, CancellationToken cancellationToken = default);

    Task<AuthResponseDto> VerifyEmailAsync(VerifyEmailRequestDto request, string? ipAddress, CancellationToken cancellationToken = default);

    Task<AuthResponseDto> ResendVerificationAsync(ResendVerificationRequestDto request, string? ipAddress, CancellationToken cancellationToken = default);

    Task<AuthResponseDto> ForgotPasswordAsync(ForgotPasswordRequestDto request, string? ipAddress, CancellationToken cancellationToken = default);

    Task<AuthResponseDto> ResetPasswordAsync(ResetPasswordRequestDto request, string? ipAddress, CancellationToken cancellationToken = default);

    Task<AuthResponseDto> ChangePasswordAsync(string userId, ChangePasswordRequestDto request, string? ipAddress, CancellationToken cancellationToken = default);

    Task<AuthResponseDto> GetMeAsync(string userId, CancellationToken cancellationToken = default);

    /// <summary>Legacy sync login — kept for backward compatibility during migration.</summary>
    LoginResponse ValidateUser(LoginRequest request);
}
