using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using TrainerPortal.Api.Application.DTOs;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AuthController(IAuthService authService) : ControllerBase
{
    private const string RefreshCookieName = "__Host-ts_refresh";

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(Fail("Email and password are required."));
        }

        var result = await authService.LoginAsync(request, GetIp(), GetUserAgent(), cancellationToken);
        if (result.Success) SetRefreshCookie(result.RefreshToken);
        return result.Success ? Ok(ToLegacyCompatible(result)) : Unauthorized(ToLegacyCompatible(result));
    }

    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDto request, CancellationToken cancellationToken)
    {
        var result = await authService.RegisterAsync(request, GetIp(), GetUserAgent(), cancellationToken);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("refresh")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequestDto? request, CancellationToken cancellationToken)
    {
        var refreshToken = request?.RefreshToken ?? Request.Cookies[RefreshCookieName];
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return Unauthorized(Fail("Missing refresh token."));
        }

        var result = await authService.RefreshAsync(new RefreshTokenRequestDto { RefreshToken = refreshToken }, GetIp(), cancellationToken);
        if (result.Success) SetRefreshCookie(result.RefreshToken);
        return result.Success ? Ok(ToLegacyCompatible(result)) : Unauthorized(result);
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout([FromBody] LogoutRequestDto? request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var refreshToken = request?.RefreshToken ?? Request.Cookies[RefreshCookieName];
        if (!string.IsNullOrWhiteSpace(userId))
        {
            await authService.LogoutAsync(userId, refreshToken, GetIp(), cancellationToken);
        }
        ClearRefreshCookie();
        return NoContent();
    }

    [HttpPost("verify-email")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequestDto request, CancellationToken cancellationToken)
    {
        var result = await authService.VerifyEmailAsync(request, GetIp(), cancellationToken);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("resend-verification")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationRequestDto request, CancellationToken cancellationToken)
    {
        var result = await authService.ResendVerificationAsync(request, GetIp(), cancellationToken);
        return Ok(result);
    }

    [HttpPost("forgot-password")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto request, CancellationToken cancellationToken)
    {
        var result = await authService.ForgotPasswordAsync(request, GetIp(), cancellationToken);
        return Ok(result);
    }

    [HttpPost("reset-password")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequestDto request, CancellationToken cancellationToken)
    {
        var result = await authService.ResetPasswordAsync(request, GetIp(), cancellationToken);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequestDto request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var result = await authService.ChangePasswordAsync(userId, request, GetIp(), cancellationToken);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var result = await authService.GetMeAsync(userId, cancellationToken);
        return result.Success ? Ok(result) : NotFound(result);
    }

    /// <summary>Legacy route kept for existing clients.</summary>
    [HttpPost("legacy-login")]
    [EnableRateLimiting("auth")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public IActionResult LegacyLogin([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new LoginResponse { Success = false, Message = "Email and password are required." });
        }

        var result = authService.ValidateUser(request);
        return result.Success ? Ok(result) : Unauthorized(result);
    }

    private static AuthResponseDto Fail(string message) => new() { Success = false, Message = message };

    private static object ToLegacyCompatible(AuthResponseDto result) =>
        new
        {
            result.Success,
            result.Message,
            Token = result.Token,
            AccessTokenExpiresAtUtc = result.AccessTokenExpiresAtUtc,
            result.RequiresEmailVerification,
            User = result.User,
        };

    private void SetRefreshCookie(string refreshToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken)) return;

        Response.Cookies.Append(RefreshCookieName, refreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax,
            Path = "/",
            Expires = DateTimeOffset.UtcNow.AddDays(7),
        });
    }

    private void ClearRefreshCookie()
    {
        Response.Cookies.Delete(RefreshCookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax,
            Path = "/",
        });
    }

    private string? GetIp() => HttpContext.Connection.RemoteIpAddress?.ToString();

    private string? GetUserAgent() => Request.Headers.UserAgent.ToString();
}
