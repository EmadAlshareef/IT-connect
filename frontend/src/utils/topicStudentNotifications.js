/** Topic publish notifications are created in SQL by the backend when a topic is published. */
export const TOPIC_PUBLISHED_NOTIFICATION_TYPE = 'topic_published'

/** @deprecated Notifications are stored in dbo.PortalNotifications via the API. */
export function pushTopicPublishedNotification() {
  return null
}
