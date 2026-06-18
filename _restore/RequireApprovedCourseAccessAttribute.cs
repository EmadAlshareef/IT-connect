using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Filters;

/// <summary>
/// Blocks course-content API calls unless the student has an approved enrollment application.
/// Reads branchId and courseId from query string (optional; falls back to any approved application).
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class RequireApprovedCourseAccessAttribute : Attribute, IAuthorizationFilter
{
    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;
        if (!user.Identity?.IsAuthenticated ?? true)
        {
            return;
        }

        if (!user.IsInRole("Student"))
        {
            return;
        }

        var studentId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(studentId))
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var query = context.HttpContext.Request.Query;
        var branchId = query["branchId"].FirstOrDefault();
        var courseId = query["courseId"].FirstOrDefault();

        var access = context.HttpContext.RequestServices.GetRequiredService<ICourseAccessAuthorizationService>();
        var decision = access.Resolve(studentId, branchId, courseId);

        if (decision.CanAccess)
        {
            return;
        }

        context.Result = new ObjectResult(new
        {
            code = "COURSE_ACCESS_DENIED",
            status = decision.Status,
            message = decision.Status switch
            {
                "pending" => "Your application is under review.",
                "rejected" => decision.RejectionReason ?? "Your application was rejected.",
                _ => "Enrollment application required and must be approved.",
            },
            branchId = decision.BranchId,
            courseId = decision.CourseId,
        })
        {
            StatusCode = StatusCodes.Status403Forbidden,
        };
    }
}
