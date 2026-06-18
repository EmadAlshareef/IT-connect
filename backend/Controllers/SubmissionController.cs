using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrainerPortal.Api.Filters;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class SubmissionController(
    ISubmissionRepository submissionRepository,
    ITaskRepository taskRepository) : ControllerBase
{
    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
    private string CurrentEmail => User.FindFirstValue(ClaimTypes.Email) ?? string.Empty;

    [HttpGet("trainer")]
    [Authorize(Roles = "Trainer,Admin")]
    [ProducesResponseType(typeof(IReadOnlyList<TrainerSubmissionInboxRecord>), StatusCodes.Status200OK)]
    public IActionResult GetTrainerSubmissions([FromQuery] string? branchId, [FromQuery] string? courseId)
    {
        return Ok(submissionRepository.GetForTrainer(CurrentUserId, CurrentEmail, branchId, courseId));
    }

    [HttpPost("{submissionId}/review")]
    [Authorize(Roles = "Trainer,Admin")]
    [ProducesResponseType(typeof(TaskSubmissionRecord), StatusCodes.Status200OK)]
    public IActionResult ReviewSubmission(string submissionId, [FromBody] SubmissionReviewRequest request)
    {
        try
        {
            return Ok(submissionRepository.Review(submissionId, CurrentUserId, CurrentEmail, request));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("me")]
    [Authorize(Roles = "Student")]
    [RequireApprovedCourseAccess]
    [ProducesResponseType(typeof(IReadOnlyList<TaskSubmissionRecord>), StatusCodes.Status200OK)]
    public IActionResult GetMySubmissions()
    {
        if (string.IsNullOrWhiteSpace(CurrentUserId))
        {
            return Unauthorized();
        }

        return Ok(submissionRepository.GetForStudent(CurrentUserId));
    }

    [HttpPost("task")]
    [Authorize(Roles = "Student")]
    [RequireApprovedCourseAccess]
    [ProducesResponseType(typeof(TaskSubmissionRecord), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public IActionResult SubmitTask([FromBody] TaskSubmissionRequest request)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(request.TaskId))
        {
            return BadRequest("taskId is required.");
        }

        var hasLink = !string.IsNullOrWhiteSpace(request.SubmissionLink);
        var hasFile = !string.IsNullOrWhiteSpace(request.FileName);
        if (!hasLink && !hasFile)
        {
            return BadRequest("Provide submissionLink and/or fileName.");
        }

        var tasks = taskRepository.GetTasksForStudent(userId);
        if (tasks.All(t => t.Id != request.TaskId.Trim()))
        {
            return BadRequest("Unknown task for this trainee.");
        }

        var record = submissionRepository.Add(userId, request);
        taskRepository.TryMarkTaskSubmitted(userId, record.TaskId, record.Id, "Pending Review");
        return Ok(record);
    }
}
