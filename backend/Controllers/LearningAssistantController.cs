using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Student")]
public sealed class LearningAssistantController(ILearningAssistantService learningAssistantService) : ControllerBase
{
    [HttpPost("chat")]
    [ProducesResponseType(typeof(LearningChatResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Chat([FromBody] LearningChatRequest request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(new { message = "Message is required." });
        }

        var branchId = request.BranchId ?? Request.Query["branchId"].FirstOrDefault();
        var courseId = request.CourseId ?? Request.Query["courseId"].FirstOrDefault();
        request.BranchId = branchId;
        request.CourseId = courseId;

        var result = await learningAssistantService.ChatAsync(request, cancellationToken);
        return Ok(result);
    }
}
