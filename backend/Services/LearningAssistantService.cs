using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using TrainerPortal.Api.Models;

namespace TrainerPortal.Api.Services;

public sealed class LearningAssistantService(IConfiguration configuration, IHttpClientFactory httpClientFactory)
    : ILearningAssistantService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public async Task<LearningChatResponse> ChatAsync(
        LearningChatRequest request,
        CancellationToken cancellationToken = default)
    {
        var message = (request.Message ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(message))
        {
            return new LearningChatResponse
            {
                Reply = "Ask a question about your course topic, a task concept, or something you are stuck on.",
                Source = "offline",
            };
        }

        var geminiKey = FirstNonEmpty(
            Environment.GetEnvironmentVariable("GEMINI_API_KEY"),
            configuration["Gemini:ApiKey"],
            configuration["Google:GenerativeLanguageApiKey"]);
        var groqKey = FirstNonEmpty(
            Environment.GetEnvironmentVariable("GROQ_API_KEY"),
            configuration["Groq:ApiKey"],
            configuration["Ai:GroqApiKey"]);
        var openAiKey = FirstNonEmpty(configuration["Ai:OpenAiApiKey"]);

        if (string.IsNullOrWhiteSpace(geminiKey) &&
            string.IsNullOrWhiteSpace(groqKey) &&
            string.IsNullOrWhiteSpace(openAiKey))
        {
            return new LearningChatResponse
            {
                Reply = BuildOfflineReply(message, request.CourseTitle, request.StudentName, request.History),
                Source = "offline",
            };
        }

        try
        {
            if (!string.IsNullOrWhiteSpace(geminiKey))
            {
                var reply = await CallGeminiAsync(
                    message,
                    request,
                    geminiKey,
                    configuration["Gemini:Model"] ?? "gemini-2.5-flash",
                    configuration["Gemini:BaseUrl"] ?? "https://generativelanguage.googleapis.com/v1beta/",
                    cancellationToken);
                return new LearningChatResponse { Reply = reply, Source = "gemini" };
            }

            if (!string.IsNullOrWhiteSpace(groqKey))
            {
                var reply = await CallChatCompletionsAsync(
                    message,
                    request,
                    groqKey,
                    configuration["Groq:Model"] ?? "llama-3.1-8b-instant",
                    configuration["Groq:BaseUrl"] ?? "https://api.groq.com/openai/v1/",
                    cancellationToken);
                return new LearningChatResponse { Reply = reply, Source = "groq" };
            }

            var openAiReply = await CallChatCompletionsAsync(
                message,
                request,
                openAiKey!,
                configuration["Ai:OpenAiModel"] ?? "gpt-4o-mini",
                configuration["Ai:OpenAiBaseUrl"] ?? "https://api.openai.com/v1/",
                cancellationToken);
            return new LearningChatResponse { Reply = openAiReply, Source = "openai" };
        }
        catch
        {
            return new LearningChatResponse
            {
                Reply = BuildOfflineReply(message, request.CourseTitle, request.StudentName, request.History),
                Source = "offline",
            };
        }
    }

    private async Task<string> CallGeminiAsync(
        string message,
        LearningChatRequest request,
        string apiKey,
        string model,
        string baseUrl,
        CancellationToken cancellationToken)
    {
        if (!baseUrl.EndsWith('/')) baseUrl += "/";

        var courseLabel = string.IsNullOrWhiteSpace(request.CourseTitle) ? "your training program" : request.CourseTitle;
        var systemPrompt = AiTutorPromptBuilder.BuildSystemPrompt(courseLabel, request.StudentName);
        var contents = new List<object>();

        foreach (var item in request.History.TakeLast(20))
        {
            if (string.IsNullOrWhiteSpace(item.Content)) continue;
            var role = string.Equals(item.Role, "assistant", StringComparison.OrdinalIgnoreCase) ? "model" : "user";
            contents.Add(new
            {
                role,
                parts = new[] { new { text = item.Content.Trim() } },
            });
        }

        contents.Add(new
        {
            role = "user",
            parts = new[] { new { text = message } },
        });

        var payload = new
        {
            systemInstruction = new
            {
                parts = new[] { new { text = systemPrompt } },
            },
            contents,
            generationConfig = new { temperature = 0.7 },
        };

        var client = httpClientFactory.CreateClient();
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}models/{model}:generateContent");
        httpRequest.Headers.TryAddWithoutValidation("X-goog-api-key", apiKey);
        httpRequest.Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json");

        using var response = await client.SendAsync(httpRequest, cancellationToken);
        response.EnsureSuccessStatusCode();
        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        var content = doc.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString();

        return string.IsNullOrWhiteSpace(content)
            ? BuildOfflineReply(message, request.CourseTitle, request.StudentName, request.History)
            : content.Trim();
    }

    private async Task<string> CallChatCompletionsAsync(
        string message,
        LearningChatRequest request,
        string apiKey,
        string model,
        string baseUrl,
        CancellationToken cancellationToken)
    {
        if (!baseUrl.EndsWith('/')) baseUrl += "/";

        var courseLabel = string.IsNullOrWhiteSpace(request.CourseTitle) ? "your training program" : request.CourseTitle;
        var systemPrompt = AiTutorPromptBuilder.BuildSystemPrompt(courseLabel, request.StudentName);

        var messages = new List<object> { new { role = "system", content = systemPrompt } };
        foreach (var item in request.History.TakeLast(20))
        {
            var role = string.Equals(item.Role, "assistant", StringComparison.OrdinalIgnoreCase) ? "assistant" : "user";
            if (string.IsNullOrWhiteSpace(item.Content)) continue;
            messages.Add(new { role, content = item.Content.Trim() });
        }

        messages.Add(new { role = "user", content = message });

        var payload = new { model, messages, temperature = 0.7 };
        var client = httpClientFactory.CreateClient();
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}chat/completions");
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        httpRequest.Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json");

        using var response = await client.SendAsync(httpRequest, cancellationToken);
        response.EnsureSuccessStatusCode();
        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        var content = doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString();

        return string.IsNullOrWhiteSpace(content)
            ? BuildOfflineReply(message, request.CourseTitle, request.StudentName, request.History)
            : content.Trim();
    }

    private static string? FirstNonEmpty(params string?[] values)
    {
        foreach (var value in values)
        {
            var trimmed = value?.Trim();
            if (!string.IsNullOrWhiteSpace(trimmed)) return trimmed;
        }

        return null;
    }

    private static string BuildOfflineReply(
        string message,
        string? courseTitle,
        string? studentName,
        IReadOnlyList<LearningChatMessageDto>? history)
    {
        var course = string.IsNullOrWhiteSpace(courseTitle) ? "your course" : courseTitle;
        var student = string.IsNullOrWhiteSpace(studentName) ? "there" : studentName;
        var lower = message.ToLowerInvariant();
        var priorUser = history?.LastOrDefault(h =>
            string.Equals(h.Role, "user", StringComparison.OrdinalIgnoreCase))?.Content ?? "";

        if (lower.Contains("hello") || lower.Contains("hi") || lower.Contains("مرحب"))
        {
            return
                $"Hi {student}! I'm your AI tutor for **{course}**.\n\n" +
                "Ask about concepts, tasks, debugging, or study strategies — I'll keep our conversation context in mind.\n\n" +
                "What would you like to work on?";
        }

        if (!string.IsNullOrWhiteSpace(priorUser) && (lower.Contains("yes") || lower.Contains("more") || lower.Contains("continue") || lower.Contains("that")))
        {
            return
                "Got it — building on what we discussed:\n\n" +
                "1. What part is still unclear?\n" +
                "2. What have you tried so far?\n" +
                "3. What result did you expect vs. what happened?\n\n" +
                "Share those details and I'll guide you step by step.";
        }

        if (lower.Contains("help") || lower.Contains("stuck") || lower.Contains("مساعد"))
        {
            return
                "Try breaking the problem into smaller pieces:\n\n" +
                "1. What is the goal of the task?\n" +
                "2. What do you already know?\n" +
                "3. What single step could you try next?\n\n" +
                "Share your answers and I will guide you from there.";
        }

        if (lower.Contains("api") || lower.Contains("rest") || lower.Contains("endpoint"))
        {
            return
                "REST APIs exchange data over HTTP using verbs like GET (read), POST (create), PUT/PATCH (update), and DELETE.\n\n" +
                "When learning APIs, sketch: URL → request body → expected response → error cases. " +
                "Which part of your task involves the API?";
        }

        if (lower.Contains("react") || lower.Contains("component") || lower.Contains("hook"))
        {
            return
                "In React, components are functions that return UI. State (`useState`) holds data that can change; " +
                "`useEffect` runs side effects after render.\n\n" +
                "What component are you building, and what state does it need?";
        }

        if (lower.Contains("git") || lower.Contains("github") || lower.Contains("commit"))
        {
            return
                "Git tracks snapshots (commits) of your project. A typical flow: `git status` → stage files → commit with a clear message → push.\n\n" +
                "What Git step are you unsure about for this task?";
        }

        if (lower.Contains("debug") || lower.Contains("error") || lower.Contains("bug"))
        {
            return
                "Debugging checklist:\n\n" +
                "• Read the full error message and note the file + line\n" +
                "• Reproduce the issue with the smallest example\n" +
                "• Check recent changes\n" +
                "• Add one log or breakpoint at a time\n\n" +
                "Paste the error text and what you expected to happen.";
        }

        return
            $"Good question about {course}. Here is how I would approach it:\n\n" +
            "• Restate the concept in your own words\n" +
            "• Identify one concrete example\n" +
            "• Try a tiny practice step before the full solution\n\n" +
            "Tell me more detail about the specific concept or task line you are on, and I will walk through it with you. " +
            "(Demo mode: set `GEMINI_API_KEY` in the backend environment for live AI responses.)";
    }
}
