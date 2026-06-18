using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace TrainerPortal.Student.Api.Controllers;

[ApiController]
[Route("api/student/v1/[controller]")]
[Authorize(Roles = "Student")]
public abstract class StudentV1ControllerBase : ControllerBase
{
    protected Guid CurrentStudentId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException("Missing student id claim."));
}
