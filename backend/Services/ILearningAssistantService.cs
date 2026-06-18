using TrainerPortal.Api.Models;

namespace TrainerPortal.Api.Services;

public interface ILearningAssistantService
{
    Task<LearningChatResponse> ChatAsync(LearningChatRequest request, CancellationToken cancellationToken = default);
}
