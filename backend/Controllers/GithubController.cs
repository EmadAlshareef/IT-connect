using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrainerPortal.Api.Filters;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Student")]
[RequireApprovedCourseAccess]
public sealed class GithubController(IGithubUrlValidator githubUrlValidator) : ControllerBase
{
    [HttpPost("validate")]
    [ProducesResponseType(typeof(GithubValidateResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Validate([FromBody] GithubValidateRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(User.FindFirstValue(ClaimTypes.NameIdentifier)))
        {
            return Unauthorized();
        }

        var result = await githubUrlValidator.ValidateAsync(request.RepositoryUrl, cancellationToken);
        return Ok(result);
    }
}
