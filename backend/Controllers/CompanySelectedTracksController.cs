using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Company")]
public sealed class CompanySelectedTracksController(ICompanyPortalService portal) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CompanySelectedTrackDto>>> List(
        [FromQuery] string? companyId,
        [FromQuery] string? companyEmail,
        CancellationToken cancellationToken) =>
        Ok(await portal.ListCompanySelectedTracksAsync(companyId, CompanyPortalControllerHelpers.ResolveCompanyScopeEmail(User, companyEmail), cancellationToken));

    [HttpGet("{id}")]
    public async Task<ActionResult<CompanySelectedTrackDto>> Get(string id, CancellationToken cancellationToken)
    {
        var row = await portal.GetCompanySelectedTrackAsync(id, cancellationToken);
        if (row is null) return NotFound();
        var scopedEmail = CompanyPortalControllerHelpers.ResolveCompanyScopeEmail(User);
        if (!User.IsInRole("Admin") && !string.IsNullOrWhiteSpace(scopedEmail) && !string.Equals(row.CompanyEmail, scopedEmail, StringComparison.OrdinalIgnoreCase))
            return Forbid();
        return Ok(row);
    }

    [HttpPost]
    public async Task<ActionResult<CompanySelectedTrackDto>> Create(
        [FromBody] CreateCompanySelectedTrackRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            request.CompanyEmail = CompanyPortalControllerHelpers.ResolveCompanyScopeEmail(User, request.CompanyEmail) ?? request.CompanyEmail;
            var created = await portal.CreateCompanySelectedTrackAsync(request, cancellationToken);
            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
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

    [HttpPut("{id}")]
    public async Task<ActionResult<CompanySelectedTrackDto>> Update(
        string id,
        [FromBody] UpdateCompanySelectedTrackRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var existing = await portal.GetCompanySelectedTrackAsync(id, cancellationToken);
            if (existing is null) return NotFound();
            var scopedEmail = CompanyPortalControllerHelpers.ResolveCompanyScopeEmail(User);
            if (!User.IsInRole("Admin") && !string.IsNullOrWhiteSpace(scopedEmail) && !string.Equals(existing.CompanyEmail, scopedEmail, StringComparison.OrdinalIgnoreCase))
                return Forbid();
            request.CompanyEmail = CompanyPortalControllerHelpers.ResolveCompanyScopeEmail(User, request.CompanyEmail) ?? request.CompanyEmail;
            var updated = await portal.UpdateCompanySelectedTrackAsync(id, request, cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
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

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        var existing = await portal.GetCompanySelectedTrackAsync(id, cancellationToken);
        if (existing is null) return NotFound();
        var scopedEmail = CompanyPortalControllerHelpers.ResolveCompanyScopeEmail(User);
        if (!User.IsInRole("Admin") && !string.IsNullOrWhiteSpace(scopedEmail) && !string.Equals(existing.CompanyEmail, scopedEmail, StringComparison.OrdinalIgnoreCase))
            return Forbid();
        var deleted = await portal.DeleteCompanySelectedTrackAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
