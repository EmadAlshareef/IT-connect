using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class TrainerTaskBriefsController(ITrainerTaskBriefService service) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin,Trainer,Student")]
    public async Task<ActionResult<IReadOnlyList<TrainerTaskBriefDto>>> List(
        [FromQuery] string? trainerEmail,
        [FromQuery] string? sessionId,
        [FromQuery] string? branchId,
        [FromQuery] string? courseId,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        var trainerScope = CompanyPortalControllerHelpers.ResolveTrainerScopeEmail(User);
        if (trainerScope is not null)
        {
            return Ok(await service.ListAsync(
                trainerEmail: trainerScope,
                sessionId: sessionId,
                cancellationToken: cancellationToken));
        }

        if (User.IsInRole("Student"))
        {
            if (!string.IsNullOrWhiteSpace(sessionId))
            {
                return Ok(await service.ListAsync(
                    sessionId: sessionId,
                    status: string.IsNullOrWhiteSpace(status) ? "approved" : status,
                    cancellationToken: cancellationToken));
            }

            if (string.IsNullOrWhiteSpace(branchId) || string.IsNullOrWhiteSpace(courseId))
                return BadRequest(new { message = "branchId and courseId (or sessionId) are required for student task briefs." });

            return Ok(await service.ListAsync(
                branchId: branchId,
                courseId: courseId,
                status: string.IsNullOrWhiteSpace(status) ? "approved" : status,
                cancellationToken: cancellationToken));
        }

        return Ok(await service.ListAsync(
            trainerEmail,
            sessionId,
            branchId,
            courseId,
            status,
            cancellationToken));
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,Trainer,Student")]
    public async Task<ActionResult<TrainerTaskBriefDto>> Get(string id, CancellationToken cancellationToken)
    {
        var row = await service.GetAsync(id, cancellationToken);
        return row is null ? NotFound() : Ok(row);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Trainer")]
    public async Task<ActionResult<TrainerTaskBriefDto>> Create(
        [FromBody] CreateTrainerTaskBriefRequest request,
        CancellationToken cancellationToken)
    {
        var trainerScope = CompanyPortalControllerHelpers.ResolveTrainerScopeEmail(User);
        if (trainerScope is not null)
            request.RequestedByEmail = trainerScope;

        try
        {
            var created = await service.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Trainer")]
    public async Task<ActionResult<TrainerTaskBriefDto>> Update(
        string id,
        [FromBody] UpdateTrainerTaskBriefRequest request,
        CancellationToken cancellationToken)
    {
        var trainerScope = CompanyPortalControllerHelpers.ResolveTrainerScopeEmail(User);
        try
        {
            var updated = await service.UpdateAsync(id, request, trainerScope, cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Trainer")]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        var trainerScope = CompanyPortalControllerHelpers.ResolveTrainerScopeEmail(User);
        try
        {
            var deleted = await service.DeleteAsync(id, trainerScope, cancellationToken);
            return deleted ? NoContent() : NotFound();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }
}
