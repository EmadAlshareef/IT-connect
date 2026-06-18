using TrainerPortal.Api.Application.Interfaces;

namespace TrainerPortal.Api.Infrastructure.Email;

/// <summary>Logs every message; also sends via SMTP when configured.</summary>
public sealed class CompositeEmailSender(
    DevEmailSender devSender,
    SmtpEmailSender smtpSender,
    IConfiguration configuration,
    IHostEnvironment environment,
    ILogger<CompositeEmailSender> logger) : IEmailSender
{
    private readonly bool _smtpEnabled = !string.IsNullOrWhiteSpace(configuration["Email:Smtp:Host"]);

    public async Task SendEmailAsync(string toEmail, string subject, string htmlBody, CancellationToken cancellationToken = default)
    {
        if (environment.IsDevelopment())
        {
            await devSender.SendEmailAsync(toEmail, subject, htmlBody, cancellationToken);
        }

        if (!_smtpEnabled)
        {
            logger.LogWarning(
                "SMTP is not configured (Email:Smtp:Host). Email was not delivered to {To}.",
                toEmail);
            return;
        }

        await smtpSender.SendEmailAsync(toEmail, subject, htmlBody, cancellationToken);
    }
}
