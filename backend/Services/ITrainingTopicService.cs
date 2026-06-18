using TrainerPortal.Api.Models;

namespace TrainerPortal.Api.Services;

public interface ITrainingTopicService
{
    Task<IReadOnlyList<TrainingTopicDto>> ListAsync(
        string? trainerEmail = null,
        string? trainingSessionId = null,
        string? status = null,
        CancellationToken cancellationToken = default);

    Task<TrainingTopicDto?> GetAsync(string id, CancellationToken cancellationToken = default);

    Task<TrainingTopicDto> UpsertAsync(UpsertTrainingTopicRequest request, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(string id, string? ownerEmail = null, CancellationToken cancellationToken = default);
}
