using Microsoft.EntityFrameworkCore;
using TrainerPortal.Api.Domain.Entities;
using TrainerPortal.Api.Domain.Entities.Portal;
using TrainerPortal.Api.Models;
using TrainerPortal.Api.Services;

namespace TrainerPortal.Api.Infrastructure.Persistence.Services;

public sealed class EfMessageService(ApplicationDbContext db, PortalUserResolver users) : IMessageService
{
    public IReadOnlyList<ChatMessage> GetForUser(string userId)
    {
        var user = users.FindByLegacyOrId(userId);
        if (user is null) return [];

        var messages = db.Messages.AsNoTracking()
            .Where(m => m.SenderUserId == user.Id || m.ReceiverUserId == user.Id)
            .OrderBy(m => m.TimestampUtc)
            .ToList();

        var userIds = messages.SelectMany(m => new[] { m.SenderUserId, m.ReceiverUserId }).Distinct();
        var lookup = users.LoadUsersByIds(userIds);

        return messages.Select(m => Map(m, lookup)).ToList();
    }

    public ChatMessage CreateMessage(SendMessageRequest request, string senderRole, string receiverRole)
    {
        var sender = users.FindByLegacyOrId(request.SenderId)
            ?? throw new InvalidOperationException("Sender not found.");
        var receiver = users.FindByLegacyOrId(request.ReceiverId)
            ?? throw new InvalidOperationException("Receiver not found.");

        var entity = new Message
        {
            Id = Guid.NewGuid().ToString("N"),
            SenderUserId = sender.Id,
            ReceiverUserId = receiver.Id,
            SenderRole = senderRole,
            ReceiverRole = receiverRole,
            Content = request.Content.Trim(),
            TaskId = string.IsNullOrWhiteSpace(request.TaskId) ? null : request.TaskId.Trim(),
            TimestampUtc = DateTime.UtcNow,
        };

        db.Messages.Add(entity);
        db.SaveChanges();

        var lookup = users.LoadUsersByIds([sender.Id, receiver.Id]);
        return Map(entity, lookup);
    }

    private static ChatMessage Map(Message m, IReadOnlyDictionary<string, ApplicationUser> lookup) =>
        new()
        {
            Id = m.Id,
            SenderId = Legacy(lookup, m.SenderUserId),
            ReceiverId = Legacy(lookup, m.ReceiverUserId),
            SenderRole = m.SenderRole,
            ReceiverRole = m.ReceiverRole,
            Content = m.Content,
            TaskId = m.TaskId,
            Timestamp = m.TimestampUtc,
        };

    private static string Legacy(IReadOnlyDictionary<string, ApplicationUser> lookup, string userId) =>
        lookup.TryGetValue(userId, out var user)
            ? (string.IsNullOrWhiteSpace(user.LegacyUserId) ? user.Id : user.LegacyUserId)
            : userId;
}
