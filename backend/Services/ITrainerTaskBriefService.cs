using TrainerPortal.Api.Models;

namespace TrainerPortal.Api.Services;

public interface ITrainerTaskBriefService
{
    Task<IReadOnlyList<TrainerTaskBriefDto>> ListAsync(
        string? trainerEmail = null,
        string? sessionId = null,
        string? branchId = null,
        string? courseId = null,
        string? status = null,
        CancellationToken cancellationToken = default);

    Task<TrainerTaskBriefDto?> GetAsync(string id, CancellationToken cancellationToken = default);

    Task<TrainerTaskBriefDto> CreateAsync(CreateTrainerTaskBriefRequest request, CancellationToken cancellationToken = default);

    Task<TrainerTaskBriefDto?> UpdateAsync(
        string id,
        UpdateTrainerTaskBriefRequest request,
        string? ownerEmail = null,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(string id, string? ownerEmail = null, CancellationToken cancellationToken = default);
}
