using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Company")]
public sealed class CompanyTrackRequestsController(ICompanyPortalService portal) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CompanyTrackRequestDto>>> List(
        [FromQuery] string? companyId,
        [FromQuery] string? companyEmail,
        [FromQuery] string? branchId,
        CancellationToken cancellationToken) =>
        Ok(await portal.ListCompanyTrackRequestsAsync(companyId, CompanyPortalControllerHelpers.ResolveCompanyScopeEmail(User, companyEmail), branchId, cancellationToken));

    [HttpGet("{id}")]
    public async Task<ActionResult<CompanyTrackRequestDto>> Get(string id, CancellationToken cancellationToken)
    {
        var row = await portal.GetCompanyTrackRequestAsync(id, cancellationToken);
        if (row is null) return NotFound();
        var scopedEmail = CompanyPortalControllerHelpers.ResolveCompanyScopeEmail(User);
        if (!User.IsInRole("Admin") && !string.IsNullOrWhiteSpace(scopedEmail) && !string.Equals(row.CompanyEmail, scopedEmail, StringComparison.OrdinalIgnoreCase))
            return Forbid();
        return Ok(row);
    }

    [HttpPost]
    public async Task<ActionResult<CompanyTrackRequestDto>> Create(
        [FromBody] CreateCompanyTrackRequestRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            request.CompanyEmail = CompanyPortalControllerHelpers.ResolveCompanyScopeEmail(User, request.CompanyEmail);
            var created = await portal.CreateCompanyTrackRequestAsync(request, cancellationToken);
            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<CompanyTrackRequestDto>> Update(
        string id,
        [FromBody] UpdateCompanyTrackRequestRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var existing = await portal.GetCompanyTrackRequestAsync(id, cancellationToken);
            if (existing is null) return NotFound();
            var scopedEmail = CompanyPortalControllerHelpers.ResolveCompanyScopeEmail(User);
            if (!User.IsInRole("Admin") && !string.IsNullOrWhiteSpace(scopedEmail) && !string.Equals(existing.CompanyEmail, scopedEmail, StringComparison.OrdinalIgnoreCase))
                return Forbid();
            request.CompanyEmail = CompanyPortalControllerHelpers.ResolveCompanyScopeEmail(User, request.CompanyEmail);
            var updated = await portal.UpdateCompanyTrackRequestAsync(id, request, cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        var existing = await portal.GetCompanyTrackRequestAsync(id, cancellationToken);
        if (existing is null) return NotFound();
        var scopedEmail = CompanyPortalControllerHelpers.ResolveCompanyScopeEmail(User);
        if (!User.IsInRole("Admin") && !string.IsNullOrWhiteSpace(scopedEmail) && !string.Equals(existing.CompanyEmail, scopedEmail, StringComparison.OrdinalIgnoreCase))
            return Forbid();
        var deleted = await portal.DeleteCompanyTrackRequestAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
