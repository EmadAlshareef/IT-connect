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
public sealed class StudentDashboardController(
    ITaskRepository taskRepository,
    IInternshipService internshipService,
    IFeedbackService feedbackService) : ControllerBase
{
    [HttpGet("stats")]
    [ProducesResponseType(typeof(StudentDashboardStats), StatusCodes.Status200OK)]
    public IActionResult Stats()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var tasks = taskRepository.GetTasksForStudent(userId);
        var completed = tasks.Count(t =>
            t.SubmissionStatus.Equals("Completed", StringComparison.OrdinalIgnoreCase) ||
            t.SubmissionStatus.Equals("Evaluated", StringComparison.OrdinalIgnoreCase));
        var pending = tasks.Count(t =>
            t.SubmissionStatus.Equals("Not Submitted", StringComparison.OrdinalIgnoreCase) ||
            t.SubmissionStatus.Equals("Overdue", StringComparison.OrdinalIgnoreCase));

        var applications = internshipService.GetApplicationsForStudent(userId);
        var activeInternships = applications.Count(a =>
            a.Status.Equals("Accepted", StringComparison.OrdinalIgnoreCase) ||
            a.Status.Equals("Pending", StringComparison.OrdinalIgnoreCase));

        var feedback = feedbackService.GetForStudent(userId).Count;

        return Ok(new StudentDashboardStats
        {
            ActiveInternships = activeInternships,
            CompletedTasks = completed,
            PendingTasks = pending,
            FeedbackReceived = feedback,
        });
    }

    [HttpGet("feedback")]
    [ProducesResponseType(typeof(IReadOnlyList<TrainerFeedbackItem>), StatusCodes.Status200OK)]
    public IActionResult Feedback()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        return Ok(feedbackService.GetForStudent(userId));
    }

    [HttpGet("progress")]
    [ProducesResponseType(typeof(TrainingProgressSummary), StatusCodes.Status200OK)]
    public IActionResult Progress()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var tasks = taskRepository.GetTasksForStudent(userId);
        var total = tasks.Count;
        var completed = tasks.Count(t =>
            t.SubmissionStatus.Equals("Completed", StringComparison.OrdinalIgnoreCase) ||
            t.SubmissionStatus.Equals("Evaluated", StringComparison.OrdinalIgnoreCase) ||
            t.SubmissionStatus.Equals("Pending Review", StringComparison.OrdinalIgnoreCase));
        var completion = total == 0 ? 0 : (int)Math.Round(completed * 100.0 / total);
        var attendance = Math.Clamp(72 + completion / 3, 0, 100);

        return Ok(new TrainingProgressSummary
        {
            CompletionPercent = completion,
            AttendancePercent = attendance,
            PerformanceScore = Math.Clamp(6.8 + completion / 50.0, 0, 10),
            WeeklyActivity =
            [
                new ActivityPoint { Label = "Mon", Units = 4 + completion / 10 },
                new ActivityPoint { Label = "Tue", Units = 6 },
                new ActivityPoint { Label = "Wed", Units = 5 + completion / 15 },
                new ActivityPoint { Label = "Thu", Units = 7 },
                new ActivityPoint { Label = "Fri", Units = 3 + completion / 20 },
            ],
        });
    }
}
