using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class CompanyTrainingRequestsController(ICompanyPortalService portal) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin,Company,Trainer")]
    public async Task<ActionResult<IReadOnlyList<CompanyTrainingRequestDto>>> List(
        [FromQuery] string? companyId,
        [FromQuery] string? companyEmail,
        [FromQuery] string? branchId,
        CancellationToken cancellationToken)
    {
        var trainerScope = CompanyPortalControllerHelpers.ResolveTrainerScopeEmail(User);
        if (trainerScope is not null)
        {
            return Ok(await portal.ListCompanyTrainingRequestsAsync(
                trainerEmail: trainerScope,
                cancellationToken: cancellationToken));
        }

        var scopedEmail = CompanyPortalControllerHelpers.ResolveCompanyScopeEmail(User, companyEmail);
        return Ok(await portal.ListCompanyTrainingRequestsAsync(companyId, scopedEmail, branchId, cancellationToken: cancellationToken));
    }

    [HttpGet("enrolled-students")]
    [Authorize(Roles = "Admin,Company,Trainer")]
    public async Task<ActionResult<IReadOnlyList<CompanyEnrolledStudentDto>>> ListEnrolledStudents(
        [FromQuery] string? companyId,
        [FromQuery] string? companyEmail,
        CancellationToken cancellationToken)
    {
        var scopedEmail = CompanyPortalControllerHelpers.ResolveCompanyScopeEmail(User, companyEmail);
        return Ok(await portal.ListCompanyEnrolledStudentsAsync(companyId, scopedEmail, cancellationToken));
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,Company,Trainer")]
    public async Task<ActionResult<CompanyTrainingRequestDto>> Get(string id, CancellationToken cancellationToken)
    {
        var row = await portal.GetCompanyTrainingRequestAsync(id, cancellationToken);
        if (row is null) return NotFound();
        var scopedEmail = CompanyPortalControllerHelpers.ResolveCompanyScopeEmail(User);
        if (!User.IsInRole("Admin") && !string.IsNullOrWhiteSpace(scopedEmail) && !string.Equals(row?.CompanyEmail, scopedEmail, StringComparison.OrdinalIgnoreCase))
            return Forbid();
        return Ok(row);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Company")]
    public async Task<ActionResult<CompanyTrainingRequestDto>> Create(
        [FromBody] CreateCompanyTrainingRequestRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            request.CompanyEmail = CompanyPortalControllerHelpers.ResolveCompanyScopeEmail(User, request.CompanyEmail);
            var created = await portal.CreateCompanyTrainingRequestAsync(request, cancellationToken);
            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Company")]
    public async Task<ActionResult<CompanyTrainingRequestDto>> Update(
        string id,
        [FromBody] UpdateCompanyTrainingRequestRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var existing = await portal.GetCompanyTrainingRequestAsync(id, cancellationToken);
            if (existing is null) return NotFound();
            var scopedEmail = CompanyPortalControllerHelpers.ResolveCompanyScopeEmail(User);
            if (!User.IsInRole("Admin") && !string.IsNullOrWhiteSpace(scopedEmail) && !string.Equals(existing.CompanyEmail, scopedEmail, StringComparison.OrdinalIgnoreCase))
                return Forbid();
            request.CompanyEmail = CompanyPortalControllerHelpers.ResolveCompanyScopeEmail(User, request.CompanyEmail);
            var updated = await portal.UpdateCompanyTrainingRequestAsync(id, request, cancellationToken);
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
        var existing = await portal.GetCompanyTrainingRequestAsync(id, cancellationToken);
        if (existing is null) return NotFound();
        var scopedEmail = CompanyPortalControllerHelpers.ResolveCompanyScopeEmail(User);
        if (!User.IsInRole("Admin") && !string.IsNullOrWhiteSpace(scopedEmail) && !string.Equals(existing.CompanyEmail, scopedEmail, StringComparison.OrdinalIgnoreCase))
            return Forbid();
        var deleted = await portal.DeleteCompanyTrainingRequestAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
