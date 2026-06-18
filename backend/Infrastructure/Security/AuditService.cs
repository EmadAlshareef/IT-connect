using TrainerPortal.Api.Application.Interfaces;
using TrainerPortal.Api.Domain.Entities;
using TrainerPortal.Api.Domain.Enums;
using TrainerPortal.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace TrainerPortal.Api.Infrastructure.Security;

public sealed class AuditService(ApplicationDbContext dbContext) : IAuditService
{
    public async Task LogAsync(
        AuditEventType eventType,
        bool success,
        string? userId = null,
        string? email = null,
        string? ipAddress = null,
        string? userAgent = null,
        string? details = null,
        CancellationToken cancellationToken = default)
    {
        var auditUserId = userId;
        if (!string.IsNullOrWhiteSpace(auditUserId))
        {
            var userExists = await dbContext.Users.AnyAsync(u => u.Id == auditUserId, cancellationToken);
            if (!userExists) auditUserId = null;
        }

        dbContext.AuditLogs.Add(new AuditLogEntry
        {
            EventType = eventType,
            Success = success,
            UserId = auditUserId,
            Email = email,
            IpAddress = ipAddress,
            UserAgent = userAgent?.Length > 512 ? userAgent[..512] : userAgent,
            Details = details?.Length > 2000 ? details[..2000] : details,
            CreatedAtUtc = DateTime.UtcNow,
        });

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
