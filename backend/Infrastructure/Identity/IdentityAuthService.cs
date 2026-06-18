using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TrainerPortal.Api.Application.DTOs;
using TrainerPortal.Api.Application.Interfaces;
using TrainerPortal.Api.Application.Validators;
using TrainerPortal.Api.Domain.Entities;
using TrainerPortal.Api.Domain.Enums;
using TrainerPortal.Api.Infrastructure.Persistence;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Infrastructure.Identity;

public sealed class IdentityAuthService(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    ApplicationDbContext dbContext,
    ITokenService tokenService,
    IEmailSender emailSender,
    IAuditService auditService,
    IConfiguration configuration,
    IHostEnvironment environment) : IAuthService
{
    private readonly int _refreshTokenDays = configuration.GetValue("Jwt:RefreshTokenDays", 7);
    private readonly string _frontendBaseUrl = configuration["Frontend:BaseUrl"] ?? "http://localhost:5173";
    private readonly bool _smtpEnabled = !string.IsNullOrWhiteSpace(configuration["Email:Smtp:Host"]);

    public async Task<AuthResponseDto> LoginAsync(
        LoginRequestDto request,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim();
        var user = await userManager.FindByEmailAsync(email);

        if (user is null)
        {
            await auditService.LogAsync(AuditEventType.LoginFailed, false, email: email, ipAddress: ipAddress, userAgent: userAgent, details: "Unknown email", cancellationToken: cancellationToken);
            return Fail("Invalid email or password.");
        }

        var signIn = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (signIn.IsLockedOut)
        {
            await auditService.LogAsync(AuditEventType.AccountLockedOut, false, user.Id, email, ipAddress, userAgent, cancellationToken: cancellationToken);
            return Fail("Account locked due to multiple failed attempts. Try again later.");
        }

        if (!signIn.Succeeded)
        {
            await auditService.LogAsync(AuditEventType.LoginFailed, false, user.Id, email, ipAddress, userAgent, cancellationToken: cancellationToken);
            return Fail("Invalid email or password.");
        }

        return await IssueTokensAsync(user, ipAddress, userAgent, AuditEventType.LoginSuccess, "Login successful.", cancellationToken);
    }

    public async Task<AuthResponseDto> RegisterAsync(
        RegisterRequestDto request,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default)
    {
        if (!string.Equals(request.Password, request.ConfirmPassword, StringComparison.Ordinal))
        {
            return Fail("Passwords do not match.");
        }

        var policyErrors = PasswordPolicyValidator.Validate(request.Password);
        if (policyErrors.Count > 0)
        {
            return Fail(string.Join(" ", policyErrors));
        }

        var email = request.Email.Trim();
        if (await userManager.FindByEmailAsync(email) is not null)
        {
            return Fail("An account with this email already exists.");
        }

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FullName = request.FullName.Trim(),
            LegacyUserId = $"student-{Guid.NewGuid():N}"[..20],
            CreatedAtUtc = DateTime.UtcNow,
            EmailConfirmed = true,
        };

        var create = await userManager.CreateAsync(user, request.Password);
        if (!create.Succeeded)
        {
            var message = string.Join(" ", create.Errors.Select(e => e.Description));
            await auditService.LogAsync(AuditEventType.Registration, false, email: email, ipAddress: ipAddress, userAgent: userAgent, details: message, cancellationToken: cancellationToken);
            return Fail(message);
        }

        await userManager.AddToRoleAsync(user, "Student");
        await auditService.LogAsync(AuditEventType.Registration, true, user.Id, email, ipAddress, userAgent, cancellationToken: cancellationToken);

        return new AuthResponseDto
        {
            Success = true,
            Message = "Account created. You can sign in now.",
            RequiresEmailVerification = false,
            User = await MapUserAsync(user, cancellationToken),
        };
    }

    public async Task<AuthResponseDto> RefreshAsync(
        RefreshTokenRequestDto request,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return Fail("Invalid or expired refresh token.");
        }

        var hash = RefreshTokenHasher.Hash(request.RefreshToken);
        var stored = await dbContext.RefreshTokens
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.TokenHash == hash, cancellationToken);

        if (stored is null || !stored.IsActive)
        {
            return Fail("Invalid or expired refresh token.");
        }

        stored.RevokedAtUtc = DateTime.UtcNow;
        var user = stored.User;
        var response = await IssueTokensAsync(user, ipAddress, null, AuditEventType.RefreshTokenIssued, "Token refreshed.", cancellationToken, stored.TokenHash);
        await dbContext.SaveChangesAsync(cancellationToken);
        return response;
    }

    public async Task LogoutAsync(string userId, string? refreshToken, string? ipAddress, CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrWhiteSpace(refreshToken))
        {
            var hash = RefreshTokenHasher.Hash(refreshToken);
            var stored = await dbContext.RefreshTokens.FirstOrDefaultAsync(x => x.TokenHash == hash && x.UserId == userId, cancellationToken);
            if (stored is not null)
            {
                stored.RevokedAtUtc = DateTime.UtcNow;
                await dbContext.SaveChangesAsync(cancellationToken);
            }
        }

        await auditService.LogAsync(AuditEventType.Logout, true, userId, ipAddress: ipAddress, cancellationToken: cancellationToken);
    }

    public async Task<AuthResponseDto> VerifyEmailAsync(VerifyEmailRequestDto request, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByIdAsync(request.UserId);
        if (user is null)
        {
            return Fail("Invalid verification link.");
        }

        var result = await userManager.ConfirmEmailAsync(user, request.Token);
        if (!result.Succeeded)
        {
            await auditService.LogAsync(AuditEventType.EmailVerified, false, user.Id, user.Email, ipAddress, details: string.Join(" ", result.Errors.Select(e => e.Description)), cancellationToken: cancellationToken);
            return Fail("Invalid or expired verification link.");
        }

        await auditService.LogAsync(AuditEventType.EmailVerified, true, user.Id, user.Email, ipAddress, cancellationToken: cancellationToken);
        return new AuthResponseDto { Success = true, Message = "Email verified successfully. You can now sign in." };
    }

    public async Task<AuthResponseDto> ResendVerificationAsync(ResendVerificationRequestDto request, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByEmailAsync(request.Email.Trim());
        if (user is null || user.EmailConfirmed)
        {
            return new AuthResponseDto { Success = true, Message = "If an unverified account exists, a verification email has been sent." };
        }

        var verificationUrl = await SendVerificationEmailAsync(user, cancellationToken);
        return new AuthResponseDto
        {
            Success = true,
            Message = _smtpEnabled
                ? "If an unverified account exists, a verification email has been sent."
                : "SMTP is not configured. Use the verification link below if shown (also in backend/email-dev.log).",
            DevVerificationUrl = !_smtpEnabled && environment.IsDevelopment() ? verificationUrl : null,
        };
    }

    public async Task<AuthResponseDto> ForgotPasswordAsync(ForgotPasswordRequestDto request, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByEmailAsync(request.Email.Trim());
        if (user is not null)
        {
            var token = await userManager.GeneratePasswordResetTokenAsync(user);
            var link = $"{_frontendBaseUrl}/reset-password?email={Uri.EscapeDataString(user.Email!)}&token={Uri.EscapeDataString(token)}";
            await emailSender.SendEmailAsync(
                user.Email!,
                "Reset your IT Connect password",
                $"<p>Click to reset your password (expires in 1 hour):</p><p><a href=\"{link}\">{link}</a></p>",
                cancellationToken);
            await auditService.LogAsync(AuditEventType.PasswordResetRequested, true, user.Id, user.Email, ipAddress, cancellationToken: cancellationToken);
        }

        return new AuthResponseDto { Success = true, Message = "If an account exists, password reset instructions have been sent." };
    }

    public async Task<AuthResponseDto> ResetPasswordAsync(ResetPasswordRequestDto request, string? ipAddress, CancellationToken cancellationToken = default)
    {
        if (!string.Equals(request.Password, request.ConfirmPassword, StringComparison.Ordinal))
        {
            return Fail("Passwords do not match.");
        }

        var policyErrors = PasswordPolicyValidator.Validate(request.Password);
        if (policyErrors.Count > 0)
        {
            return Fail(string.Join(" ", policyErrors));
        }

        var user = await userManager.FindByEmailAsync(request.Email.Trim());
        if (user is null)
        {
            return Fail("Invalid reset request.");
        }

        var result = await userManager.ResetPasswordAsync(user, request.Token, request.Password);
        if (!result.Succeeded)
        {
            await auditService.LogAsync(AuditEventType.PasswordResetCompleted, false, user.Id, user.Email, ipAddress, details: string.Join(" ", result.Errors.Select(e => e.Description)), cancellationToken: cancellationToken);
            return Fail("Invalid or expired reset token.");
        }

        await RevokeAllRefreshTokensAsync(user.Id, cancellationToken);
        await auditService.LogAsync(AuditEventType.PasswordResetCompleted, true, user.Id, user.Email, ipAddress, cancellationToken: cancellationToken);
        return new AuthResponseDto { Success = true, Message = "Password reset successfully. Please sign in." };
    }

    public async Task<AuthResponseDto> ChangePasswordAsync(
        string userId,
        ChangePasswordRequestDto request,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        if (!string.Equals(request.NewPassword, request.ConfirmPassword, StringComparison.Ordinal))
        {
            return Fail("Passwords do not match.");
        }

        var policyErrors = PasswordPolicyValidator.Validate(request.NewPassword);
        if (policyErrors.Count > 0)
        {
            return Fail(string.Join(" ", policyErrors));
        }

        var user = await userManager.FindByIdAsync(userId)
            ?? await dbContext.Users.FirstOrDefaultAsync(u => u.LegacyUserId == userId, cancellationToken);

        if (user is null)
        {
            return Fail("User not found.");
        }

        var result = await userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
        {
            await auditService.LogAsync(AuditEventType.PasswordChanged, false, user.Id, user.Email, ipAddress, details: string.Join(" ", result.Errors.Select(e => e.Description)), cancellationToken: cancellationToken);
            return Fail(string.Join(" ", result.Errors.Select(e => e.Description)));
        }

        await RevokeAllRefreshTokensAsync(user.Id, cancellationToken);
        await auditService.LogAsync(AuditEventType.PasswordChanged, true, user.Id, user.Email, ipAddress, cancellationToken: cancellationToken);
        return new AuthResponseDto { Success = true, Message = "Password changed successfully." };
    }

    public async Task<AuthResponseDto> GetMeAsync(string userId, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId || u.LegacyUserId == userId, cancellationToken);

        if (user is null)
        {
            return Fail("User not found.");
        }

        return new AuthResponseDto
        {
            Success = true,
            Message = "OK",
            User = await MapUserAsync(user, cancellationToken),
        };
    }

    public LoginResponse ValidateUser(LoginRequest request)
    {
        var result = LoginAsync(
            new LoginRequestDto { Email = request.Email, Password = request.Password },
            null,
            null).GetAwaiter().GetResult();

        return new LoginResponse
        {
            Success = result.Success,
            Message = result.Message,
            Token = result.Token,
            User = result.User is null
                ? null
                : new LoginUser
                {
                    Id = result.User.Id,
                    Email = result.User.Email,
                    Role = result.User.Role,
                    Name = result.User.Name,
                },
        };
    }

    private async Task<AuthResponseDto> IssueTokensAsync(
        ApplicationUser user,
        string? ipAddress,
        string? userAgent,
        AuditEventType auditEvent,
        string message,
        CancellationToken cancellationToken,
        string? replacedTokenHash = null)
    {
        var roles = await userManager.GetRolesAsync(user);
        var (accessToken, expiresAt) = tokenService.GenerateAccessToken(user, roles);
        var rawRefresh = tokenService.GenerateRefreshToken();
        var refreshHash = RefreshTokenHasher.Hash(rawRefresh);

        dbContext.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = refreshHash,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(_refreshTokenDays),
            CreatedByIp = ipAddress,
            ReplacedByTokenHash = replacedTokenHash,
        });

        await dbContext.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync(auditEvent, true, user.Id, user.Email, ipAddress, userAgent, cancellationToken: cancellationToken);

        return new AuthResponseDto
        {
            Success = true,
            Message = message,
            Token = accessToken,
            RefreshToken = rawRefresh,
            AccessTokenExpiresAtUtc = expiresAt,
            User = await MapUserAsync(user, cancellationToken),
        };
    }

    private async Task<AuthUserDto> MapUserAsync(ApplicationUser user, CancellationToken cancellationToken)
    {
        var roles = await userManager.GetRolesAsync(user);
        return new AuthUserDto
        {
            Id = user.LegacyUserId.Length > 0 ? user.LegacyUserId : user.Id,
            Email = user.Email ?? string.Empty,
            Name = user.FullName,
            Role = roles.FirstOrDefault() ?? "Student",
        };
    }

    private async Task<string> SendVerificationEmailAsync(ApplicationUser user, CancellationToken cancellationToken)
    {
        var token = await userManager.GenerateEmailConfirmationTokenAsync(user);
        var link = $"{_frontendBaseUrl}/verify-email?userId={Uri.EscapeDataString(user.Id)}&token={Uri.EscapeDataString(token)}";
        await emailSender.SendEmailAsync(
            user.Email!,
            "Verify your IT Connect email",
            $"<p>Welcome to IT Connect!</p><p><a href=\"{link}\">Verify your email</a></p><p>Or copy this link:</p><p>{link}</p>",
            cancellationToken);
        return link;
    }

    private async Task RevokeAllRefreshTokensAsync(string userId, CancellationToken cancellationToken)
    {
        var tokens = await dbContext.RefreshTokens.Where(x => x.UserId == userId && x.RevokedAtUtc == null).ToListAsync(cancellationToken);
        foreach (var token in tokens)
        {
            token.RevokedAtUtc = DateTime.UtcNow;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync(AuditEventType.RefreshTokenRevoked, true, userId, cancellationToken: cancellationToken);
    }

    private static AuthResponseDto Fail(string message) =>
        new() { Success = false, Message = message };
}
