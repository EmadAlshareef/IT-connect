namespace TrainerPortal.Api.Models;

public sealed class LearningChatMessageDto
{
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}

public sealed class LearningChatRequest
{
    public string Message { get; set; } = string.Empty;
    public string? BranchId { get; set; }
    public string? CourseId { get; set; }
    public string? CourseTitle { get; set; }
    public string? StudentName { get; set; }
    public List<LearningChatMessageDto> History { get; set; } = [];
}

public sealed class LearningChatResponse
{
    public string Reply { get; set; } = string.Empty;
    public string Source { get; set; } = "offline";
}
