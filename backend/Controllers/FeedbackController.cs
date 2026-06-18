using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class FeedbackController(IFeedbackService feedbackService) : ControllerBase
{
    [HttpGet("me")]
    [Authorize(Roles = "Student")]
    public IActionResult GetMine()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        return Ok(feedbackService.GetForStudent(userId));
    }

    [HttpPost]
    [Authorize(Roles = "Trainer,Admin")]
    public IActionResult Create([FromBody] CreateTrainerFeedbackRequest request)
    {
        var trainerId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        try
        {
            return Ok(feedbackService.Add(trainerId, request));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
