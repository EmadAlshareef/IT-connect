using System.ComponentModel.DataAnnotations;

namespace TrainerPortal.Api.Application.DTOs;

public sealed class LoginRequestDto
{
    [Required, EmailAddress]
    public string Email { get; init; } = string.Empty;

    [Required]
    public string Password { get; init; } = string.Empty;
}

public sealed class RegisterRequestDto
{
    [Required, MaxLength(120)]
    public string FullName { get; init; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; init; } = string.Empty;

    [Required]
    public string Password { get; init; } = string.Empty;

    [Required]
    public string ConfirmPassword { get; init; } = string.Empty;
}

public sealed class RefreshTokenRequestDto
{
    public string? RefreshToken { get; init; }
}

public sealed class LogoutRequestDto
{
    public string? RefreshToken { get; init; }
}

public sealed class VerifyEmailRequestDto
{
    [Required]
    public string UserId { get; init; } = string.Empty;

    [Required]
    public string Token { get; init; } = string.Empty;
}

public sealed class ResendVerificationRequestDto
{
    [Required, EmailAddress]
    public string Email { get; init; } = string.Empty;
}

public sealed class ForgotPasswordRequestDto
{
    [Required, EmailAddress]
    public string Email { get; init; } = string.Empty;
}

public sealed class ResetPasswordRequestDto
{
    [Required, EmailAddress]
    public string Email { get; init; } = string.Empty;

    [Required]
    public string Token { get; init; } = string.Empty;

    [Required]
    public string Password { get; init; } = string.Empty;

    [Required]
    public string ConfirmPassword { get; init; } = string.Empty;
}

public sealed class ChangePasswordRequestDto
{
    [Required]
    public string CurrentPassword { get; init; } = string.Empty;

    [Required]
    public string NewPassword { get; init; } = string.Empty;

    [Required]
    public string ConfirmPassword { get; init; } = string.Empty;
}

public sealed class AuthUserDto
{
    public string Id { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
}

public sealed class AuthResponseDto
{
    public bool Success { get; init; }
    public string Message { get; init; } = string.Empty;
    public string Token { get; init; } = string.Empty;
    /// <summary>Server-side only. Controllers place this in an HttpOnly cookie and must not serialize it to browsers.</summary>
    public string RefreshToken { get; init; } = string.Empty;
    public DateTime? AccessTokenExpiresAtUtc { get; init; }
    public AuthUserDto? User { get; init; }
    public bool RequiresEmailVerification { get; init; }
    /// <summary>Development only — shown when SMTP is not configured.</summary>
    public string? DevVerificationUrl { get; init; }
}
