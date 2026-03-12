type NotificationActorLike = {
  display_name?: string | null;
  username?: string | null;
} | null | undefined;

export function getNotificationActorName(actor: NotificationActorLike): string {
  return actor?.display_name || actor?.username || 'Someone';
}
