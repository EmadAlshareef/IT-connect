using TrainerPortal.Api.Models;

namespace TrainerPortal.Api.Services;

public interface IMessageService
{
    IReadOnlyList<ChatMessage> GetForUser(string userId);
    ChatMessage CreateMessage(SendMessageRequest request, string senderRole, string receiverRole);
}
