using TrainerPortal.Api.Application.Interfaces;
using System.Text.RegularExpressions;

namespace TrainerPortal.Api.Infrastructure.Email;

/// <summary>Development email sender — logs messages to console and optional file.</summary>
public sealed class DevEmailSender(ILogger<DevEmailSender> logger, IConfiguration configuration) : IEmailSender
{
    public async Task SendEmailAsync(string toEmail, string subject, string htmlBody, CancellationToken cancellationToken = default)
    {
        var safeBody = RedactSensitiveLinks(htmlBody);
        logger.LogInformation("EMAIL → {To} | {Subject}\n{Body}", toEmail, subject, safeBody);

        var logPath = configuration["Email:DevLogPath"];
        if (!string.IsNullOrWhiteSpace(logPath))
        {
            var entry = $"""
                --- {DateTime.UtcNow:O} ---
                To: {toEmail}
                Subject: {subject}
                {safeBody}

                """;
            await File.AppendAllTextAsync(logPath, entry, cancellationToken);
        }
    }

    private static string RedactSensitiveLinks(string htmlBody)
    {
        return Regex.Replace(
            htmlBody,
            @"(?i)([?&](?:token|code)=)[^&""'<\s]+",
            "$1[redacted]");
    }
}
