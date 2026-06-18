namespace TrainerPortal.Api.Models;

public sealed class ChatMessage
{
    public string Id { get; init; } = string.Empty;
    public string SenderId { get; init; } = string.Empty;
    public string ReceiverId { get; init; } = string.Empty;
    public string SenderRole { get; init; } = string.Empty;
    public string ReceiverRole { get; init; } = string.Empty;
    public string Content { get; init; } = string.Empty;
    public string? TaskId { get; init; }
    public DateTime Timestamp { get; init; }
}

public sealed class SendMessageRequest
{
    public string SenderId { get; set; } = string.Empty;
    public string ReceiverId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? TaskId { get; set; }
}
