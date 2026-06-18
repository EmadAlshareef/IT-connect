using TrainerPortal.Api.Domain.Enums;

namespace TrainerPortal.Api.Domain.Entities;

public sealed class AuditLogEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public AuditEventType EventType { get; set; }

    public string? UserId { get; set; }

    public string? Email { get; set; }

    public string? IpAddress { get; set; }

    public string? UserAgent { get; set; }

    public string? Details { get; set; }

    public bool Success { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
