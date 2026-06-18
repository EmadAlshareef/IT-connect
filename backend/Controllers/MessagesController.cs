using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using TrainerPortal.Api.Domain.Entities;
using TrainerPortal.Api.Infrastructure.Persistence;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class MessagesController(
    IMessageService messageService,
    IUserDirectoryService userDirectoryService,
    ApplicationDbContext db,
    UserManager<ApplicationUser> userManager) : ControllerBase
{
    [HttpGet("users/search")]
    [Authorize(Roles = "Trainer,Admin")]
    public async Task<ActionResult<IReadOnlyList<AuthUser>>> SearchUsers(
        [FromQuery] string q,
        CancellationToken cancellationToken)
    {
        var needle = (q ?? string.Empty).Trim().ToLowerInvariant();
        if (needle.Length < 2) return Ok(Array.Empty<AuthUser>());

        var rows = await db.Users.AsNoTracking()
            .Where(u =>
                !u.IsDeleted &&
                ((u.Email != null && u.Email.ToLower().Contains(needle)) ||
                 u.FullName.ToLower().Contains(needle)))
            .OrderBy(u => u.Email)
            .Take(10)
            .ToListAsync(cancellationToken);

        var result = new List<AuthUser>();
        foreach (var user in rows)
        {
            var roles = await userManager.GetRolesAsync(user);
            result.Add(new AuthUser
            {
                Id = string.IsNullOrWhiteSpace(user.LegacyUserId) ? user.Id : user.LegacyUserId,
                Email = user.Email ?? string.Empty,
                Name = user.FullName,
                Role = roles.FirstOrDefault() ?? "Student",
                TrainerId = user.TrainerLegacyId ?? string.Empty,
            });
        }

        return Ok(result);
    }

    [HttpGet("{userId}")]
    [ProducesResponseType(typeof(IReadOnlyList<ChatMessage>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public IActionResult GetByUserId(string userId)
    {
        var tokenUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (tokenUserId is null || tokenUserId != userId)
        {
            return Forbid();
        }

        var messages = messageService.GetForUser(userId);
        return Ok(messages);
    }

    [HttpPost("send")]
    [ProducesResponseType(typeof(ChatMessage), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public IActionResult Send([FromBody] SendMessageRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Content) ||
            string.IsNullOrWhiteSpace(request.SenderId) ||
            string.IsNullOrWhiteSpace(request.ReceiverId))
        {
            return BadRequest("senderId, receiverId, and content are required.");
        }

        var tokenUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (tokenUserId is null || tokenUserId != request.SenderId)
        {
            return Forbid();
        }

        var sender = userDirectoryService.GetById(request.SenderId);
        var receiver = userDirectoryService.GetById(request.ReceiverId);
        if (sender is null || receiver is null)
        {
            return BadRequest("Invalid sender or receiver.");
        }

        if (!userDirectoryService.CanCommunicate(sender.Id, receiver.Id))
        {
            return Forbid();
        }

        var created = messageService.CreateMessage(request, sender.Role, receiver.Role);
        return Ok(created);
    }
}
