using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class CompanyTrainersController(ICompanyPortalService portal) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin,Company,Trainer")]
    public async Task<ActionResult<IReadOnlyList<CompanyTrainerDto>>> List(
        [FromQuery] string? companyId,
        [FromQuery] string? companyEmail,
        CancellationToken cancellationToken)
    {
        var trainerScope = CompanyPortalControllerHelpers.ResolveTrainerScopeEmail(User);
        if (trainerScope is not null)
        {
            return Ok(await portal.ListCompanyTrainersAsync(
                trainerEmail: trainerScope,
                cancellationToken: cancellationToken));
        }

        var scopedEmail = CompanyPortalControllerHelpers.ResolveCompanyScopeEmail(User, companyEmail);
        return Ok(await portal.ListCompanyTrainersAsync(companyId, scopedEmail, cancellationToken: cancellationToken));
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,Company,Trainer")]
    public async Task<ActionResult<CompanyTrainerDto>> Get(string id, CancellationToken cancellationToken)
    {
        var row = await portal.GetCompanyTrainerAsync(id, cancellationToken);
        if (row is null) return NotFound();
        var scopedEmail = CompanyPortalControllerHelpers.ResolveCompanyScopeEmail(User);
        if (!User.IsInRole("Admin") && !string.IsNullOrWhiteSpace(scopedEmail) && !string.Equals(row.CompanyEmail, scopedEmail, StringComparison.OrdinalIgnoreCase))
            return Forbid();
        return Ok(row);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Company")]
    public async Task<ActionResult<CompanyTrainerDto>> Create(
        [FromBody] CreateCompanyTrainerRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            request.CompanyEmail = CompanyPortalControllerHelpers.ResolveCompanyScopeEmail(User, request.CompanyEmail) ?? request.CompanyEmail;
            var created = await portal.CreateCompanyTrainerAsync(request, cancellationToken);
            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Company")]
    public async Task<ActionResult<CompanyTrainerDto>> Update(
        string id,
        [FromBody] UpdateCompanyTrainerRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var existing = await portal.GetCompanyTrainerAsync(id, cancellationToken);
            if (existing is null) return NotFound();
            var scopedEmail = CompanyPortalControllerHelpers.ResolveCompanyScopeEmail(User);
            if (!User.IsInRole("Admin") && !string.IsNullOrWhiteSpace(scopedEmail) && !string.Equals(existing.CompanyEmail, scopedEmail, StringComparison.OrdinalIgnoreCase))
                return Forbid();
            request.CompanyEmail = CompanyPortalControllerHelpers.ResolveCompanyScopeEmail(User, request.CompanyEmail) ?? request.CompanyEmail;
            var updated = await portal.UpdateCompanyTrainerAsync(id, request, cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Company")]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        var existing = await portal.GetCompanyTrainerAsync(id, cancellationToken);
        if (existing is null) return NotFound();
        var scopedEmail = CompanyPortalControllerHelpers.ResolveCompanyScopeEmail(User);
        if (!User.IsInRole("Admin") && !string.IsNullOrWhiteSpace(scopedEmail) && !string.Equals(existing.CompanyEmail, scopedEmail, StringComparison.OrdinalIgnoreCase))
            return Forbid();
        var deleted = await portal.DeleteCompanyTrainerAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
