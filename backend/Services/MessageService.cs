using TrainerPortal.Api.Models;

namespace TrainerPortal.Api.Services;

public sealed class MessageService(IUserDirectoryService userDirectoryService) : IMessageService
{
    private readonly List<ChatMessage> _messages =
    [
        new()
        {
            Id = Guid.NewGuid().ToString("N"),
            SenderId = "trainer-2003",
            ReceiverId = "student-mohamed",
            SenderRole = "Trainer",
            ReceiverRole = "Student",
            Content = "Please submit the API integration task by Friday.",
            Timestamp = DateTime.UtcNow.AddHours(-6)
        },
        new()
        {
            Id = Guid.NewGuid().ToString("N"),
            SenderId = "student-mohamed",
            ReceiverId = "trainer-2003",
            SenderRole = "Student",
            ReceiverRole = "Trainer",
            Content = "Understood. I will submit before deadline.",
            Timestamp = DateTime.UtcNow.AddHours(-5)
        }
    ];

    public IReadOnlyList<ChatMessage> GetForUser(string userId)
    {
        var user = userDirectoryService.GetById(userId);
        if (user is null)
        {
            return [];
        }

        return _messages
            .Where(message => message.SenderId == userId || message.ReceiverId == userId)
            .OrderBy(message => message.Timestamp)
            .ToList();
    }

    public ChatMessage CreateMessage(SendMessageRequest request, string senderRole, string receiverRole)
    {
        var normalizedTaskId = string.IsNullOrWhiteSpace(request.TaskId) ? null : request.TaskId.Trim();
        var message = new ChatMessage
        {
            Id = Guid.NewGuid().ToString("N"),
            SenderId = request.SenderId,
            ReceiverId = request.ReceiverId,
            SenderRole = senderRole,
            ReceiverRole = receiverRole,
            Content = request.Content.Trim(),
            TaskId = normalizedTaskId,
            Timestamp = DateTime.UtcNow
        };

        _messages.Add(message);
        return message;
    }
}
