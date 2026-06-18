using TrainerPortal.Api.Domain.Enums;

namespace TrainerPortal.Api.Application.Interfaces;

public interface IAuditService
{
    Task LogAsync(
        AuditEventType eventType,
        bool success,
        string? userId = null,
        string? email = null,
        string? ipAddress = null,
        string? userAgent = null,
        string? details = null,
        CancellationToken cancellationToken = default);
}
