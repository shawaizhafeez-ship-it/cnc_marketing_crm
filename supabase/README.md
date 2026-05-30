# Supabase Migrations — CNC Marketing CRM

## Migration files (run in order)

| # | File | Description |
|---|------|-------------|
| 001 | `20260530100001_extensions_and_enums.sql` | pgcrypto + all Postgres enums |
| 002 | `20260530100002_profiles.sql` | profiles table + auth.users trigger |
| 003 | `20260530100003_certificates.sql` | Google Sheets certificate data |
| 004 | `20260530100004_sheet_sync_logs.sql` | Sync job audit log |
| 005 | `20260530100005_renewal_campaigns.sql` | Month-anchor renewal campaigns + scheduling functions |
| 006 | `20260530100006_scheduled_emails.sql` | Grouped renewal scheduled emails |
| 007 | `20260530100007_email_logs.sql` | All email send logs |
| 008 | `20260530100008_marketing_templates.sql` | Marketing HTML templates |
| 009 | `20260530100009_marketing_campaigns.sql` | Marketing campaigns + touchpoints + scheduled emails |
| 010 | `20260530100010_app_settings.sql` | Daily counters + app config seed |
| 011 | `20260530100011_views.sql` | Helper views |
| 012 | `20260530100012_row_level_security.sql` | RLS policies |
| 013 | `20260530100013_auth_domain_enforcement.sql` | Auth domain enforcement |
| 014 | `20260530100014_add_manual_email_type.sql` | Manual email type enum |
| 015 | `20260530100015_cold_email_batches.sql` | Cold email CSV batches + recipients |

---

## Option A — Supabase Dashboard (quickest)

1. Go to [supabase.com](https://supabase.com) → your project → **SQL Editor**
2. Open each migration file in order (001 → 012)
3. Paste and click **Run**
4. Confirm no errors before running the next file

---

## Option B — Supabase CLI

```bash
# Install CLI: https://supabase.com/docs/guides/cli
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
supabase db push
```

---

## Generate TypeScript types

After migrations are applied:

```bash
supabase gen types typescript --project-id YOUR_PROJECT_REF > supabase/database.types.ts
```

Or with a linked project:

```bash
supabase gen types typescript --linked > supabase/database.types.ts
```

A hand-maintained copy lives at `supabase/database.types.ts` — regenerate after schema changes.

---

## Verify schema

Run in SQL Editor:

```sql
-- Check enums
SELECT typname FROM pg_type
WHERE typnamespace = 'public'::regnamespace AND typtype = 'e'
ORDER BY typname;

-- Check tables
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Test renewal touchpoint scheduling (March 2026 example)
SELECT
  public.get_renewal_touchpoint_date('2026-03-01', 1) AS tp1_feb_14,
  public.get_renewal_touchpoint_date('2026-03-01', 2) AS tp2_mar_15,
  public.get_renewal_touchpoint_date('2026-03-01', 3) AS tp3_mar_29;

-- Check views
SELECT * FROM public.v_certificates_active LIMIT 1;
SELECT * FROM public.v_renewal_campaign_stats LIMIT 1;
```

Expected touchpoint dates for anchor `2026-03-01`:
- TP1: `2026-02-14 09:00:00+00`
- TP2: `2026-03-15 09:00:00+00`
- TP3: `2026-03-29 09:00:00+00`

---

## Create first admin user

1. **Authentication → Users → Invite user**
2. Use an `@cncservices.net` email
3. After they accept, promote to admin:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'you@cncservices.net';
```

> Non-`@cncservices.net` signups are blocked by the `handle_new_user()` trigger and the `profiles_email_domain` CHECK constraint.

---

## Cron / background jobs

Server-side jobs (sheet sync, email sending) must use the **service role key** (`SUPABASE_SERVICE_ROLE_KEY`) — never expose it to the browser. The service role bypasses RLS.

---

## Renewal scheduling reference

All certificates expiring in the same month share one **anchor_date** (1st of that month):

| Touchpoint | Offset from anchor | Example (March 2026) |
|------------|-------------------|----------------------|
| 1 | −15 days | February 14 |
| 2 | +14 days | March 15 |
| 3 | +28 days | March 29 |

Stored in `app_settings.renewal_touchpoints` as `{"offsets":[-15,14,28],"send_hour":9}`.
