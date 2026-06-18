using TrainerPortal.Api.Models;

namespace TrainerPortal.Api.Services;

public interface ICatalogService
{
    IReadOnlyList<BranchDto> ListBranches();
    IReadOnlyList<TrackDto> ListTracks(string? branchId = null);
    IReadOnlyList<TrainingDto> ListTrainings(string? branchId = null);
    int CountEnrolledStudents(string? branchId = null);
    TrainingDto? GetTraining(string id);
    TrainingDto UpsertTraining(UpsertTrainingRequest request);
    void DeleteTraining(string id);
    IReadOnlyList<TrainingSectionDto> ListSections(string? trainerLegacyId = null);
    IReadOnlyList<CompanyPostDto> ListCompanyPosts(string? branchId = null);
    IReadOnlyList<JobApplicantDto> ListJobApplicants(string? branchId = null);
    IReadOnlyList<TraineeEvaluationDto> ListEvaluations();
    TrackDto UpsertTrack(UpsertTrackRequest request);
    void DeleteTrack(string id);
    SectionDetailDto? GetSectionDetail(string sectionId);
    IReadOnlyList<SectionTaskDto> ListSectionTasks(string sectionId);
    SectionTaskDto UpsertSectionTask(UpsertSectionTaskRequest request);
    void DeleteSectionTask(string sectionId, string taskGroupId);
    CompanyPostDto UpsertCompanyPost(UpsertCompanyPostRequest request);
    void DeleteCompanyPost(string id);
    EvaluationTaskItemDto UpdateEvaluationItem(string itemId, UpdateEvaluationItemRequest request);
}
