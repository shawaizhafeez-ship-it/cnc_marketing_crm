# Security — CNC Marketing CRM

## Security model

- **Authentication:** Supabase Auth with `@cncservices.net` domain enforcement (DB trigger + middleware)
- **Authorization:** Row Level Security on all public tables; admin role for sensitive operations
- **Secrets:** SMTP passwords, service role key, Google private key, and `CRON_SECRET` are server-only env vars
- **Cron jobs:** All `/api/cron/*` routes require `Authorization: Bearer <CRON_SECRET>`

## Audit checklist

Use this before production launch.

### Environment & secrets

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel **only** (not prefixed with `NEXT_PUBLIC_`)
- [ ] `SMTP_RENEWAL_PASSWORD` and `SMTP_MARKETING_PASSWORD` are server-only
- [ ] `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` is server-only
- [ ] `CRON_SECRET` is a long random string (32+ chars), unique per environment
- [ ] `.env.local` is in `.gitignore` and never committed
- [ ] No secrets in client bundles — run `npm run build` and grep dist for key patterns

### Cron routes

All three routes use `lib/cron/auth.ts` → `verifyCronRequest`:

- [ ] `/api/cron/sync-sheets` — returns 401 without valid Bearer token
- [ ] `/api/cron/send-renewals` — returns 401 without valid Bearer token
- [ ] `/api/cron/send-marketing` — returns 401 without valid Bearer token
- [ ] Routes return 401 when `CRON_SECRET` is unset (fail closed)

Manual test:

```bash
curl -i https://your-app.vercel.app/api/cron/sync-sheets
# Expect 401

curl -i -H "Authorization: Bearer $CRON_SECRET" \
  https://your-app.vercel.app/api/cron/sync-sheets
# Expect 200 or 500 (depending on config), not 401
```

### Row Level Security

Migration `20260530100012_row_level_security.sql` enables RLS on:

| Table | Policy summary |
|-------|----------------|
| `profiles` | Users read own profile; admins read/update all |
| `certificates` | All active CNC users — full CRUD |
| `renewal_campaigns` | All active CNC users — full CRUD |
| `scheduled_emails` | All active CNC users — full CRUD |
| `email_logs` | All active CNC users — full CRUD |
| `marketing_templates` | All active CNC users — full CRUD |
| `marketing_campaigns` | All active CNC users — full CRUD |
| `marketing_touchpoints` | All active CNC users — full CRUD |
| `marketing_scheduled_emails` | All active CNC users — full CRUD |
| `sheet_sync_logs` | SELECT only for CNC users; writes via service role |
| `daily_send_counters` | SELECT only for CNC users; writes via service role |
| `app_settings` | SELECT for CNC users; UPDATE for admins only |

Verify in SQL Editor:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- rowsecurity should be true for all tables above
```

### SMTP exposure

- [ ] Settings page shows masked config only (`•••••••• (configured)`) via `lib/email/smtp-display.ts`
- [ ] `lib/email/smtp.ts` imports `server-only` — cannot be bundled client-side
- [ ] `lib/supabase/admin.ts` imports `server-only`
- [ ] No `SMTP_*_PASSWORD` in any `"use client"` component or `NEXT_PUBLIC_*` var

### Service role usage

Service role client (`lib/supabase/admin.ts`) is used only in:

- Cron API routes
- Server actions: sheet sync, email send crons, daily counters
- Dashboard/settings data fetch for sync logs and cron run logs

- [ ] Confirm no `"use client"` file imports `@/lib/supabase/admin`

### Auth domain

- [ ] Migration 013 auth domain enforcement applied
- [ ] Signup/login rejects non-`@cncservices.net` emails
- [ ] Deactivated users (`is_active = false`) cannot access dashboard

## Reporting issues

Report security concerns to the CNC Services engineering team. Do not open public issues for vulnerabilities.
