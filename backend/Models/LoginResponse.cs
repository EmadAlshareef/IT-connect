namespace TrainerPortal.Api.Models;

public sealed class LoginResponse
{
    public bool Success { get; init; }
    public string Message { get; init; } = string.Empty;
    public string Token { get; init; } = string.Empty;
    public LoginUser? User { get; init; }
}

public sealed class LoginUser
{
    public string Id { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
}
