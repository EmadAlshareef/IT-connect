using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrainerPortal.Student.Application.Contracts;
using TrainerPortal.Student.Application.Dtos;

namespace TrainerPortal.Student.Api.Controllers;

[NonController]
[Route("api/student/v1/auth")]
public sealed class StudentAuthController : ControllerBase
{
    private readonly IStudentAuthService _auth;

    public StudentAuthController(IStudentAuthService auth) => _auth = auth;

    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthStudentResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<AuthStudentResponse>> Register([FromBody] RegisterStudentRequest request, CancellationToken ct)
    {
        var result = await _auth.RegisterAsync(request, ct);
        return CreatedAtAction(nameof(Register), result);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthStudentResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthStudentResponse>> Login([FromBody] LoginStudentRequest request, CancellationToken ct)
    {
        return Ok(await _auth.LoginAsync(request, ct));
    }

    [HttpPost("logout")]
    [Authorize(Roles = "Student")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public IActionResult Logout() => NoContent();
}
