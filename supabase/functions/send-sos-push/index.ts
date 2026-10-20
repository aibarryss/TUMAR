import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { parseExpoResult } from './expo-result.ts';

Deno.serve(async (req: Request) => {
  const secret = Deno.env.get('PUSH_WORKER_SECRET');
  if (!secret || req.headers.get('x-push-secret') !== secret) return new Response('Unauthorized', { status: 401 });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: jobs, error } = await db.rpc('claim_push_jobs');
  if (error) return new Response('Queue unavailable', { status: 503 });
  await Promise.all((jobs ?? []).map(async (job: { id: string; lease_id: string; token: string; ticket_id: string | null; alert_id: string; recipient_id: string }) => {
    let result: ReturnType<typeof parseExpoResult>;
    try {
      const receipt = job.ticket_id;
      const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
      const response = await fetch(`https://exp.host/--/api/v2/push/${receipt ? 'getReceipts' : 'send'}`, {
        method: 'POST', signal: AbortSignal.timeout(10000),
        headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify(receipt ? { ids: [receipt] } : {
          to: job.token, title: 'TUMAR · Тестовый SOS', body: 'Получен тестовый сигнал. Откройте TUMAR, чтобы посмотреть.',
          sound: 'default', priority: 'high', channelId: 'sos', ttl: 3600,
          data: { alertId: job.alert_id, recipientId: job.recipient_id },
        }),
      });
      result = parseExpoResult(response.status, await response.json(), receipt ?? undefined);
    } catch { result = { outcome: 'retry', error: 'NetworkError' }; }
    const { error: finishError } = await db.rpc('finish_push_job', {
      job_id: job.id, job_lease: job.lease_id, outcome: result.outcome,
      receipt_ticket: result.ticketId ?? null, failure_code: result.error ?? null,
    });
    if (finishError) console.error('push_job_completion_failed');
  }));
  return Response.json({ processed: jobs?.length ?? 0 });
});
