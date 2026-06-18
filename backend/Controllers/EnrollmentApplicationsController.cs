using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrainerPortal.Api.Infrastructure.Security;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class EnrollmentApplicationsController(
    IEnrollmentApplicationService service,
    ICourseAccessAuthorizationService courseAccess) : ControllerBase
{
    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
    private string CurrentEmail => User.FindFirstValue(ClaimTypes.Email) ?? string.Empty;
    private string CurrentName => User.FindFirstValue(ClaimTypes.Name) ?? string.Empty;
    private string CurrentRole => User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

    [HttpGet("me")]
    [Authorize(Roles = "Student")]
    public ActionResult<IReadOnlyList<EnrollmentApplicationRecord>> ListMine() =>
        Ok(service.ListForStudent(CurrentUserId));

    [HttpGet("access")]
    [Authorize(Roles = "Student")]
    public ActionResult<CourseAccessDecision> GetAccess([FromQuery] string branchId, [FromQuery] string courseId)
    {
        if (string.IsNullOrWhiteSpace(branchId) || string.IsNullOrWhiteSpace(courseId))
        {
            return BadRequest(new { message = "branchId and courseId are required." });
        }

        return Ok(courseAccess.Resolve(CurrentUserId, branchId, courseId));
    }

    [HttpGet("me/course")]
    [Authorize(Roles = "Student")]
    public ActionResult<EnrollmentApplicationRecord?> GetMineForCourse([FromQuery] string branchId, [FromQuery] string courseId)
    {
        if (string.IsNullOrWhiteSpace(branchId) || string.IsNullOrWhiteSpace(courseId))
        {
            return BadRequest(new { message = "branchId and courseId are required." });
        }

        return Ok(service.GetForStudentCourse(CurrentUserId, branchId, courseId));
    }

    [HttpPost("start")]
    [Authorize(Roles = "Student")]
    public ActionResult<EnrollmentApplicationRecord> Start([FromBody] StartEnrollmentApplicationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.BranchId) || string.IsNullOrWhiteSpace(request.CourseId))
        {
            return BadRequest(new { message = "branchId and courseId are required." });
        }

        try
        {
            var record = service.StartEnrollment(CurrentUserId, CurrentEmail, CurrentName, request);
            return Ok(record);
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

    [HttpPost]
    [Authorize(Roles = "Student")]
    [RequestSizeLimit(12 * 1024 * 1024)]
    public async Task<ActionResult<EnrollmentApplicationRecord>> Submit([FromForm] SubmitEnrollmentApplicationRequest request, IFormFile? cv)
    {
        if (cv is null || cv.Length == 0)
        {
            return BadRequest(new { message = "CV file is required (PDF, DOC, or DOCX)." });
        }

        try
        {
            await UploadSecurityValidator.ValidateAsync(cv, UploadProfile.EnrollmentCv);
            await using var stream = cv.OpenReadStream();
            var record = service.Submit(
                CurrentUserId,
                CurrentEmail,
                CurrentName,
                request,
                cv.FileName,
                stream);
            return CreatedAtAction(nameof(GetMineForCourse), new { branchId = record.BranchId, courseId = record.CourseId }, record);
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

    [HttpGet("trainer")]
    [Authorize(Roles = "Trainer")]
    public ActionResult<IReadOnlyList<EnrollmentApplicationRecord>> ListForTrainer([FromQuery] string? status)
    {
        return Ok(service.ListForTrainer(CurrentUserId, CurrentEmail, status));
    }

    [HttpGet("trainer/{id}")]
    [Authorize(Roles = "Trainer")]
    public ActionResult<EnrollmentApplicationRecord> GetForTrainer(string id)
    {
        var record = service.GetById(id);
        if (record is null) return NotFound();
        try
        {
            var list = service.ListForTrainer(CurrentUserId, CurrentEmail, null);
            if (!list.Any(a => a.Id == id)) return NotFound();
        }
        catch
        {
            return NotFound();
        }

        return Ok(record);
    }

    [HttpPost("trainer/{id}/approve")]
    [Authorize(Roles = "Trainer")]
    public ActionResult<EnrollmentApplicationRecord> Approve(string id)
    {
        try
        {
            return Ok(service.Approve(id, CurrentUserId, CurrentEmail));
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

    [HttpPost("trainer/{id}/reject")]
    [Authorize(Roles = "Trainer")]
    public ActionResult<EnrollmentApplicationRecord> Reject(string id, [FromBody] RejectEnrollmentApplicationRequest? body)
    {
        try
        {
            return Ok(service.Reject(id, CurrentUserId, CurrentEmail, body?.RejectionReason));
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

    [HttpGet("notifications")]
    [Authorize]
    public ActionResult<IReadOnlyList<PortalNotificationRecord>> Notifications() =>
        Ok(service.ListNotifications(CurrentUserId));

    [HttpGet("notifications/unread-count")]
    [Authorize]
    public ActionResult<object> UnreadNotificationCount() =>
        Ok(new { count = service.UnreadNotificationCount(CurrentUserId) });

    [HttpPost("notifications/{notificationId}/read")]
    public IActionResult MarkRead(string notificationId)
    {
        service.MarkNotificationRead(CurrentUserId, notificationId);
        return NoContent();
    }

    [HttpPost("notifications/application/{applicationId}/read")]
    [Authorize(Roles = "Trainer")]
    public IActionResult MarkApplicationNotificationsRead(string applicationId)
    {
        service.MarkEnrollmentNotificationsRead(CurrentUserId, applicationId);
        return NoContent();
    }
}
