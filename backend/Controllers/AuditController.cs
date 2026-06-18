using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrainerPortal.Api.Infrastructure.Persistence;

namespace TrainerPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminOnly")]
public sealed class AuditController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int take = 100, CancellationToken cancellationToken = default)
    {
        take = Math.Clamp(take, 1, 500);
        var items = await dbContext.AuditLogs
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(take)
            .Select(x => new
            {
                x.Id,
                EventType = x.EventType.ToString(),
                x.Success,
                x.UserId,
                x.Email,
                x.IpAddress,
                x.Details,
                x.CreatedAtUtc,
            })
            .ToListAsync(cancellationToken);

        return Ok(items);
    }
}
