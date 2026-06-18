using TrainerPortal.Api.Models;

namespace TrainerPortal.Api.Services;

public interface IPortalNotificationService
{
    PortalNotificationRecord Create(CreatePortalNotificationRequest request);

    IReadOnlyList<PortalNotificationRecord> ListForUser(string userId);

    int UnreadCount(string userId);

    void MarkRead(string userId, string notificationId);
}
