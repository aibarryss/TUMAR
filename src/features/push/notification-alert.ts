const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function notificationAlert(data: unknown, userId: string): string | null {
  if (!data || typeof data !== 'object') return null;
  const value = data as Record<string, unknown>;
  return value.recipientId === userId && typeof value.alertId === 'string' && uuid.test(value.alertId) ? value.alertId : null;
}
