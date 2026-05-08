# send-communication

Edge Function inayo **tuma SMS na barua pepe kwa kweli** kutoka kwa seva (hakuna siri kwenye browser).

## Mtiririko

1. Portal huunda `communications` (`status = queued`) na `communication_recipients` (`delivery_status = pending`).
2. Hii function husoma foleni, kutuma kupitia Beem / Twilio / Africa’s Talking (SMS) na SendGrid / Resend (barua pepe).
3. Kila mstari wa `communication_recipients` husasishwa (`sent` / `failed` / `skipped`).
4. `communications.status` huwekwa `sent` au `failed` na `sent_at` inapohitajika.
5. Arifa ya mfumo: `portal_enqueue_notification_system` (ina hitaji migration `20260516140000_edge_enqueue_notification_system.sql`).

## Uanzishaji (Supabase Secrets)

Weka kwenye **Project Settings → Edge Functions → Secrets** (au CLI `supabase secrets set`):

| Secret | Maana |
|--------|--------|
| `SMS_PROVIDER` | `beem` \| `twilio` \| `africastalking` |
| `BEEM_API_KEY` | Ufunguo wa Beem |
| `BEEM_SECRET` | Siri ya Beem (au `BEEM_SECRET_KEY`) |
| `SMS_SOURCE_ADDR` | Jina la kutuma (masafa 11, mf. `KMKTINFO`) |
| `EMAIL_PROVIDER` | `sendgrid` \| `resend` |
| `SENDGRID_API_KEY` | API ya SendGrid |
| `RESEND_API_KEY` | API ya Resend (badala ya SendGrid) |
| `FROM_EMAIL` | Barua ya kutuma (lazima imethibitishwa kwa mtoa huduma) |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | Ukitumia Twilio |
| `AFRICASTALKING_API_KEY` / `AFRICASTALKING_USERNAME` | Ukitumia AT |
| `COMMUNICATION_CRON_SECRET` | Nenosiri kwa batch + cron (si lazima kwa mtumiaji wa kawaida) |

**Muda halisi:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` zinatolewa na mazingira ya Edge moja kwa moja kwenye Supabase hosted.

## Itifaki ya API

### Tuma kampeni moja (JWT ya mtumiaji)

```http
POST /functions/v1/send-communication
Authorization: Bearer <user_jwt>
Content-Type: application/json

{"communicationId":"<uuid>"}
```

Mtumiaji lazima awe na ruhusa ya kuona/kuhariri kampeni hiyo (RLS kwa `select` ya `communications`).

### Jaribu tena walioshindwa

```json
{"communicationId":"<uuid>","retryFailed":true}
```

### Batch (cron / nje ya browser)

```http
POST /functions/v1/send-communication
x-communication-secret: <COMMUNICATION_CRON_SECRET>
Content-Type: application/json

{"batch":true}
```

Inachakata kampeni zote `queued` ambazo `scheduled_at` ni null au tayari umepita.

## Cron (mapendekezo)

1. **Supabase Scheduled Functions** au **GitHub Actions** / **cron** ya nje iite URL pamoja na `x-communication-secret`.
2. Au tumia **pg_cron** + `net.http_post` ikiwa ipo kwenye mradi.

## Usalama

- Siri hazionekani kwenye frontend — tumia tu secrets za Edge.
- `verify_jwt = false` kwenye `[functions.send-communication]` kwa sababu tunathibitisha **JWT ya mtumiaji** au **cron secret** ndani ya `index.ts`.

## Majaribio ya haraka

1. Weka secrets za Beem + SendGrid + `FROM_EMAIL`.
2. Tengeneza kampeni mfano na nambari/barua halisi.
3. Bonyeza **Tuma sasa** kwenye portal au invoke function kwa `communicationId`.
