namespace TrainerPortal.Student.Application.Dtos;

public sealed record RegisterStudentRequest(
    string Email,
    string Password,
    string FullName,
    string? University,
    string? Specialization);

public sealed record LoginStudentRequest(string Email, string Password);

public sealed record AuthStudentResponse(
    Guid StudentId,
    string Email,
    string FullName,
    string Role,
    string AccessToken,
    int ExpiresIn);
