using System.Net;
using System.Net.Mail;
using TrainerPortal.Api.Application.Interfaces;

namespace TrainerPortal.Api.Infrastructure.Email;

/// <summary>Sends email through SMTP (Gmail, Outlook, SendGrid SMTP relay, etc.).</summary>
public sealed class SmtpEmailSender(
    ILogger<SmtpEmailSender> logger,
    IConfiguration configuration) : IEmailSender
{
    public async Task SendEmailAsync(string toEmail, string subject, string htmlBody, CancellationToken cancellationToken = default)
    {
        var host = configuration["Email:Smtp:Host"]?.Trim();
        if (string.IsNullOrWhiteSpace(host))
            throw new InvalidOperationException("Email:Smtp:Host is not configured.");

        var port = configuration.GetValue("Email:Smtp:Port", 587);
        var enableSsl = configuration.GetValue("Email:Smtp:EnableSsl", true);
        var user = configuration["Email:Smtp:User"]?.Trim();
        var password = configuration["Email:Smtp:Password"];
        var from = configuration["Email:Smtp:From"]?.Trim() ?? user ?? "noreply@itconnect.local";

        using var message = new MailMessage
        {
            From = new MailAddress(from),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true,
        };
        message.To.Add(toEmail);

        using var client = new SmtpClient(host, port)
        {
            EnableSsl = enableSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network,
            UseDefaultCredentials = false,
        };

        if (!string.IsNullOrWhiteSpace(user))
            client.Credentials = new NetworkCredential(user, password);

        logger.LogInformation("Sending email via SMTP {Host}:{Port} → {To} | {Subject}", host, port, toEmail, subject);

        await client.SendMailAsync(message, cancellationToken);
    }
}
