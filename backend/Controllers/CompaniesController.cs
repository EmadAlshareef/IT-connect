using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class CompaniesController(ICompanyPortalService portal) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<CompanyDto>>> List(
        [FromQuery] string? email,
        CancellationToken cancellationToken) =>
        Ok(await portal.ListCompaniesAsync(email, cancellationToken));

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<ActionResult<CompanyDto>> Get(string id, CancellationToken cancellationToken)
    {
        var row = await portal.GetCompanyAsync(id, cancellationToken);
        return row is null ? NotFound() : Ok(row);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Company")]
    public async Task<ActionResult<CompanyDto>> Create(
        [FromBody] CreateCompanyRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var created = await portal.CreateCompanyAsync(request, cancellationToken);
            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Could not save company. A profile with this slug may already exist." });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Company")]
    public async Task<ActionResult<CompanyDto>> Update(
        string id,
        [FromBody] UpdateCompanyRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await portal.UpdateCompanyAsync(id, request, cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Could not update company. A profile with this slug may already exist." });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        var deleted = await portal.DeleteCompanyAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
