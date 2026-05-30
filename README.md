# CNC Marketing CRM

Internal CRM for CNC Services — certificate renewals, marketing campaigns, and email operations. Replaces the legacy Streamlit app with Next.js 15, Supabase, and Vercel cron jobs.

## Features

- **Google Sheets sync** — pull certificates from the Renewals spreadsheet
- **Renewal campaigns** — month-anchor scheduling with 3 touchpoints per recipient
- **Marketing campaigns** — filtered outreach with templates and daily send limits
- **Manual email** — one-off sends via renewal SMTP
- **Email logs** — audit trail with filters and CSV export
- **Dashboard & settings** — operational overview and system configuration

## Local development

### Prerequisites

- Node.js 20+
- npm
- Supabase project
- Google Cloud service account with Sheets read access
- SMTP credentials for `renewal@cncservices.net` and `info@cncservices.net`

### Setup

```bash
git clone <repo-url>
cd cnc_marketing_crm
npm install
cp .env.local.example .env.local
# Fill in all env vars (see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript (`tsc --noEmit`) |
| `npm test` | Vitest unit tests |

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run migrations in order — see [`supabase/README.md`](supabase/README.md)
   - Option A: paste each file in SQL Editor (001 → 014)
   - Option B: `supabase db push` with linked CLI
3. Copy **Project URL** and **anon key** to `.env.local`
4. Copy **service role key** to `.env.local` (server-only, never commit)
5. Regenerate types after schema changes:

```bash
supabase gen types typescript --linked > supabase/database.types.ts
```

## Environment variables

Copy `.env.local.example` to `.env.local`. Never commit secrets.

| Variable | Required | Client | Description |
|----------|----------|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | **No** | Service role — cron & sync only |
| `NEXT_PUBLIC_APP_URL` | Yes | Yes | App URL (`http://localhost:3000` locally) |
| `ALLOWED_EMAIL_DOMAIN` | Yes | No | `cncservices.net` |
| `SMTP_RENEWAL_*` | Yes | **No** | Renewal SMTP (host, port, user, password) |
| `SMTP_MARKETING_*` | Yes | **No** | Marketing SMTP |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Yes | **No** | Sheets service account |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Yes | **No** | Service account private key |
| `GOOGLE_SHEET_ID` | Yes | **No** | Spreadsheet ID |
| `GOOGLE_SHEET_NAME` | No | No | Default: `Renewals` |
| `GOOGLE_WORKSHEET_NAME` | No | No | Default: `List Cleaned` |
| `CRON_SECRET` | Yes (prod) | **No** | Bearer token for cron routes |

## First admin user

1. Supabase Dashboard → **Authentication** → **Users** → **Invite user**
2. Use an `@cncservices.net` email address
3. User accepts invite and signs in
4. Promote to admin in SQL Editor:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'you@cncservices.net';
```

Non-`@cncservices.net` signups are blocked by database triggers and RLS.

## Deployment to Vercel

1. Push repo to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add all environment variables from `.env.local.example`
4. Deploy — cron jobs depend on your Vercel plan:

**Hobby (free)** — `vercel.json` runs each job **once per day** (UTC):

| Job | Schedule | Route |
|-----|----------|-------|
| Sheet sync | Daily 05:00 UTC | `/api/cron/sync-sheets` |
| Renewal send | Daily 06:00 UTC | `/api/cron/send-renewals` |
| Marketing send | Daily 07:00 UTC | `/api/cron/send-marketing` |

Use **Settings** in the app for manual sync/send between daily runs.

**Pro** — copy `vercel.pro.json` over `vercel.json` for production frequency:

| Job | Schedule |
|-----|----------|
| Sheet sync | Every 30 min |
| Renewal send | Every 5 min |
| Marketing send | Every 10 min |

```bash
cp vercel.pro.json vercel.json
```

5. Set `CRON_SECRET` in Vercel env — Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`
6. After deploy, run **Sync Google Sheets** from Settings to populate certificates
7. Verify cron runs in Vercel → Project → Cron Jobs

## Security

See [`SECURITY.md`](SECURITY.md) for the audit checklist and security model.

## Pre-launch checklist

See [`PRE_LAUNCH_CHECKLIST.md`](PRE_LAUNCH_CHECKLIST.md).

## Project structure

```
app/
  (auth)/          Login & signup
  (dashboard)/     Protected CRM pages
  api/cron/        Scheduled jobs (Bearer auth)
components/        UI components
lib/               Business logic (email, sheets, scheduling)
supabase/
  migrations/      SQL schema (001–014)
  database.types.ts Generated Supabase types
```
