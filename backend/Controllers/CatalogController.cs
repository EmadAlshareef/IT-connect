using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class CatalogController(ICatalogService catalog) : ControllerBase
{
    [HttpGet("branches")]
    [AllowAnonymous]
    public ActionResult<IReadOnlyList<BranchDto>> Branches() => Ok(catalog.ListBranches());

    [HttpGet("tracks")]
    [AllowAnonymous]
    public ActionResult<IReadOnlyList<TrackDto>> Tracks([FromQuery] string? branchId) =>
        Ok(catalog.ListTracks(branchId));

    [HttpPost("tracks")]
    [Authorize(Policy = "AdminOnly")]
    public ActionResult<TrackDto> UpsertTrack([FromBody] UpsertTrackRequest request) =>
        Ok(catalog.UpsertTrack(request));

    [HttpDelete("tracks/{id}")]
    [Authorize(Policy = "AdminOnly")]
    public IActionResult DeleteTrack(string id)
    {
        catalog.DeleteTrack(id);
        return NoContent();
    }

    [HttpGet("trainings")]
    [AllowAnonymous]
    public ActionResult<IReadOnlyList<TrainingDto>> Trainings([FromQuery] string? branchId) =>
        Ok(catalog.ListTrainings(branchId));

    [HttpGet("student-count")]
    [Authorize(Policy = "AdminOnly")]
    public ActionResult<object> StudentCount([FromQuery] string? branchId) =>
        Ok(new { count = catalog.CountEnrolledStudents(branchId) });

    [HttpGet("trainings/{id}")]
    [AllowAnonymous]
    public ActionResult<TrainingDto> Training(string id)
    {
        var row = catalog.GetTraining(id);
        return row is null ? NotFound() : Ok(row);
    }

    [HttpPost("trainings")]
    [Authorize(Policy = "AdminOnly")]
    public ActionResult<TrainingDto> UpsertTraining([FromBody] UpsertTrainingRequest request) =>
        Ok(catalog.UpsertTraining(request));

    [HttpDelete("trainings/{id}")]
    [Authorize(Policy = "AdminOnly")]
    public IActionResult DeleteTraining(string id)
    {
        catalog.DeleteTraining(id);
        return NoContent();
    }

    [HttpGet("sections")]
    [Authorize]
    public ActionResult<IReadOnlyList<TrainingSectionDto>> Sections([FromQuery] string? trainerId) =>
        Ok(catalog.ListSections(trainerId));

    [HttpGet("sections/{id}")]
    [Authorize]
    public ActionResult<SectionDetailDto> SectionDetail(string id)
    {
        var row = catalog.GetSectionDetail(id);
        return row is null ? NotFound() : Ok(row);
    }

    [HttpGet("sections/{sectionId}/tasks")]
    [Authorize(Roles = "Trainer,Admin")]
    public ActionResult<IReadOnlyList<SectionTaskDto>> SectionTasks(string sectionId) =>
        Ok(catalog.ListSectionTasks(sectionId));

    [HttpPost("sections/{sectionId}/tasks")]
    [Authorize(Roles = "Trainer,Admin")]
    public ActionResult<SectionTaskDto> UpsertSectionTask(string sectionId, [FromBody] UpsertSectionTaskRequest request)
    {
        request.SectionId = sectionId;
        return Ok(catalog.UpsertSectionTask(request));
    }

    [HttpDelete("sections/{sectionId}/tasks/{taskId}")]
    [Authorize(Roles = "Trainer,Admin")]
    public IActionResult DeleteSectionTask(string sectionId, string taskId)
    {
        catalog.DeleteSectionTask(sectionId, taskId);
        return NoContent();
    }

    [HttpGet("company-posts")]
    [AllowAnonymous]
    public ActionResult<IReadOnlyList<CompanyPostDto>> CompanyPosts([FromQuery] string? branchId) =>
        Ok(catalog.ListCompanyPosts(branchId));

    [HttpPost("company-posts")]
    [Authorize(Policy = "AdminOnly")]
    public ActionResult<CompanyPostDto> UpsertCompanyPost([FromBody] UpsertCompanyPostRequest request) =>
        Ok(catalog.UpsertCompanyPost(request));

    [HttpDelete("company-posts/{id}")]
    [Authorize(Policy = "AdminOnly")]
    public IActionResult DeleteCompanyPost(string id)
    {
        catalog.DeleteCompanyPost(id);
        return NoContent();
    }

    [HttpGet("job-applicants")]
    [Authorize(Policy = "AdminOnly")]
    public ActionResult<IReadOnlyList<JobApplicantDto>> JobApplicants([FromQuery] string? branchId) =>
        Ok(catalog.ListJobApplicants(branchId));

    [HttpGet("evaluations")]
    [Authorize(Roles = "Trainer,Admin")]
    public ActionResult<IReadOnlyList<TraineeEvaluationDto>> Evaluations() =>
        Ok(catalog.ListEvaluations());

    [HttpPut("evaluations/items/{itemId}")]
    [Authorize(Roles = "Trainer,Admin")]
    public ActionResult<EvaluationTaskItemDto> UpdateEvaluationItem(
        string itemId,
        [FromBody] UpdateEvaluationItemRequest request) =>
        Ok(catalog.UpdateEvaluationItem(itemId, request));
}
