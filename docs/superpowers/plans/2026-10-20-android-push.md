# Android push and APK implementation

Approved scope: preserve the existing design and SOS/contact actions; add Android remote push and an installable standalone preview APK.

1. Register Expo tokens after login, using the existing Supabase session and a private device-token table. Remove this device before logout. Show permission/setup status in the existing information block; no new screens.
2. Insert one persistent delivery job per recipient device in the same transaction as a new SOS recipient row. Restrict tokens and jobs; use service-role-only atomic claim/completion RPCs. Repeat sends only for transient failures, at most three attempts; check Expo receipts and remove invalid tokens. Skip closed/revoked/reassigned jobs.
3. A protected Supabase Edge Function processes jobs. Database trigger wakes it after insert and cron runs every minute as a fallback. Store its random invocation secret in Supabase Vault and function secrets. Firebase private key belongs only in EAS.
4. Handle foreground notifications and taps, including cold start. Revalidate event access through the existing alert RPC; never acknowledge on notification tap. Queue opening while initial loading is running.
5. Add Expo notification configuration, Firebase config path, and an internal-distribution APK profile. Upload only public Supabase build variables; keep server secrets out of the app/archive.
6. Verify SQL permissions, deduplication, retries, revocation, token transfer and Expo response handling with local tests before deployment. Run TypeScript and Android export. Deploy additive SQL/function/scheduler, configure EAS FCM credentials and start the cloud APK build after Expo login. A physical-device check is required to establish delivery.
