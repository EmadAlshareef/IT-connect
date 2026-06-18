using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrainerPortal.Api.Infrastructure.Security;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class TrainingTopicsController(
    ITrainingTopicService service,
    IWebHostEnvironment env) : ControllerBase
{
    [HttpPost("media")]
    [Authorize(Roles = "Admin,Trainer")]
    [RequestSizeLimit(50 * 1024 * 1024)]
    public async Task<ActionResult<object>> UploadMedia(IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "File is required." });

        try
        {
            await UploadSecurityValidator.ValidateAsync(file, UploadProfile.TopicMedia, cancellationToken);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }

        var uploadsRoot = Path.Combine(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"), "uploads", "topic-media");
        Directory.CreateDirectory(uploadsRoot);

        var safeName = $"{Guid.NewGuid():N}{Path.GetExtension(file.FileName)}";
        var fullPath = Path.Combine(uploadsRoot, safeName);
        await using (var stream = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var url = $"/uploads/topic-media/{safeName}";
        return Ok(new
        {
            url,
            fileName = file.FileName,
            size = file.Length,
        });
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<TrainingTopicDto>>> List(
        [FromQuery] string? trainerEmail,
        [FromQuery] string? trainingSessionId,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        try
        {
            if (User.Identity?.IsAuthenticated != true)
            {
                return Ok(await service.ListAsync(
                    trainingSessionId: trainingSessionId,
                    status: string.IsNullOrWhiteSpace(status) ? "published" : status,
                    cancellationToken: cancellationToken));
            }

            var trainerScope = CompanyPortalControllerHelpers.ResolveTrainerScopeEmail(User);
            if (trainerScope is not null)
            {
                return Ok(await service.ListAsync(
                    trainerEmail: trainerScope,
                    trainingSessionId: trainingSessionId,
                    status: status,
                    cancellationToken: cancellationToken));
            }

            if (User.IsInRole("Student"))
            {
                return Ok(await service.ListAsync(
                    trainingSessionId: trainingSessionId,
                    status: string.IsNullOrWhiteSpace(status) ? "published" : status,
                    cancellationToken: cancellationToken));
            }

            return Ok(await service.ListAsync(trainerEmail, trainingSessionId, status, cancellationToken));
        }
        catch
        {
            return Ok(Array.Empty<TrainingTopicDto>());
        }
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,Trainer,Student")]
    public async Task<ActionResult<TrainingTopicDto>> Get(string id, CancellationToken cancellationToken)
    {
        var row = await service.GetAsync(id, cancellationToken);
        return row is null ? NotFound() : Ok(row);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Trainer")]
    public async Task<ActionResult<TrainingTopicDto>> Upsert(
        [FromBody] UpsertTrainingTopicRequest request,
        CancellationToken cancellationToken)
    {
        var trainerScope = CompanyPortalControllerHelpers.ResolveTrainerScopeEmail(User);
        if (trainerScope is not null)
            request.TrainerKey = trainerScope;

        try
        {
            var saved = await service.UpsertAsync(request, cancellationToken);
            return Ok(saved);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
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
