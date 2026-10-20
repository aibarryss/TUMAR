type Result = { outcome: 'accepted' | 'complete' | 'retry' | 'failed' | 'invalid'; ticketId?: string; error?: string };

export function parseExpoResult(httpStatus: number, body: unknown, receiptId?: string): Result {
  if (httpStatus === 429 || httpStatus >= 500) return { outcome: 'retry', error: `HTTP_${httpStatus}` };
  if (httpStatus < 200 || httpStatus >= 300) return { outcome: 'failed', error: `HTTP_${httpStatus}` };
  const data = (body as { data?: Record<string, unknown> } | null)?.data;
  const item = (receiptId ? data?.[receiptId] : data) as { status?: string; id?: string; details?: { error?: string } } | undefined;
  if (item?.status === 'ok') return receiptId ? { outcome: 'complete' }
    : typeof item.id === 'string' && item.id ? { outcome: 'accepted', ticketId: item.id } : { outcome: 'retry', error: 'MissingTicket' };
  const error = item?.details?.error;
  if (error === 'DeviceNotRegistered') return { outcome: 'invalid', error };
  if (error && error !== 'MessageRateExceeded') return { outcome: 'failed', error };
  return { outcome: 'retry', error: error ?? 'PendingOrInvalidResponse' };
}
