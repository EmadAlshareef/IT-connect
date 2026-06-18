namespace TrainerPortal.Api.Models;

public sealed class AuthUser
{
    public string Id { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
    public string TrainerId { get; init; } = string.Empty;
}
