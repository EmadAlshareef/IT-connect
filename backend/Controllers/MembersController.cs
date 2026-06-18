using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminOnly")]
public sealed class MembersController(IMemberAdminService members) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<MemberDto>>> List(CancellationToken cancellationToken) =>
        Ok(await members.ListMembersAsync(cancellationToken));

    [HttpPatch("{id}/role")]
    public async Task<ActionResult<MemberDto>> UpdateRole(
        string id,
        [FromBody] UpdateMemberRoleRequest request,
        CancellationToken cancellationToken)
    {
        var updated = await members.UpdateMemberRoleAsync(id, request.Role, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        var deleted = await members.SoftDeleteMemberAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
