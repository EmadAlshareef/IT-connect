using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Student")]
public sealed class InternshipsController(IInternshipService internshipService) : ControllerBase
{
    [HttpGet("programs")]
    [ProducesResponseType(typeof(IReadOnlyList<InternshipProgram>), StatusCodes.Status200OK)]
    public IActionResult Programs()
    {
        if (string.IsNullOrWhiteSpace(User.FindFirstValue(ClaimTypes.NameIdentifier)))
        {
            return Unauthorized();
        }

        return Ok(internshipService.ListPrograms());
    }

    [HttpGet("applications/me")]
    [ProducesResponseType(typeof(IReadOnlyList<InternshipApplicationRecord>), StatusCodes.Status200OK)]
    public IActionResult MyApplications()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        return Ok(internshipService.GetApplicationsForStudent(userId));
    }

    [HttpPost("applications")]
    [ProducesResponseType(typeof(InternshipApplicationRecord), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public IActionResult Apply([FromBody] InternshipApplicationRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(request.ProgramId))
        {
            return BadRequest("programId is required.");
        }

        try
        {
            var created = internshipService.Apply(userId, request);
            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
