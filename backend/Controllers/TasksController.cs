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
public sealed class TasksController(ITaskRepository taskRepository) : ControllerBase
{
    [HttpGet("me")]
    [ProducesResponseType(typeof(IReadOnlyList<TraineeTaskItem>), StatusCodes.Status200OK)]
    public IActionResult GetMyTasks([FromQuery] string? branchId, [FromQuery] string? courseId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        return Ok(taskRepository.GetTasksForStudent(userId));
    }
}
