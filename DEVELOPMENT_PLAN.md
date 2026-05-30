# CNC Marketing CRM — Development Plan

> **Goal:** Rebuild the legacy Streamlit `cnc_crm` app as a modern Next.js + Supabase application with domain-restricted auth, improved month-based renewal scheduling, and full marketing email capabilities.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Tech Stack](#2-tech-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [Renewal Scheduling Logic (New)](#4-renewal-scheduling-logic-new)
5. [Feature Matrix vs Reference Repo](#5-feature-matrix-vs-reference-repo)
6. [Supabase Database Schema](#6-supabase-database-schema)
7. [Row Level Security (RLS)](#7-row-level-security-rls)
8. [Auth: @cncservices.net Only](#8-auth-cncservicesnet-only)
9. [Environment Variables](#9-environment-variables)
10. [Project Structure](#10-project-structure)
11. [Development Phases](#11-development-phases)
12. [Claude Prompts (Run in Order)](#12-claude-prompts-run-in-order)

---

## 1. Executive Summary

The new app replaces CSV-file storage and Streamlit with:

| Area | Old (`cnc_crm`) | New |
|------|-----------------|-----|
| Frontend | Streamlit | Next.js 15 (App Router) + React + Tailwind + shadcn/ui |
| Database | CSV files | Supabase (Postgres) |
| Auth | None | Supabase Auth — `@cncservices.net` only |
| Data source | Google Sheets (direct) | Google Sheets sync → Supabase `certificates` table |
| Renewal scheduling | Per-certificate dates (4 touchpoints) | **Month-anchored** (3 touchpoints, grouped by expiry month) |
| Email sending | Background Python threads | Supabase Edge Functions + cron OR Vercel Cron + API routes |
| Marketing | Custom templates + filters | Same capabilities, stored in Supabase |

---

## 2. Tech Stack

```
Frontend:     Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui
Backend:      Next.js API Routes + Server Actions
Database:     Supabase (Postgres)
Auth:         Supabase Auth (email/password or magic link)
Storage:      Supabase Storage (optional: HTML template assets)
Email:        Nodemailer (SMTP) via server-side only — never expose credentials
Sheets sync:  Google Sheets API (service account) via cron job
Scheduling:   Supabase pg_cron + Edge Functions, OR Vercel Cron hitting /api/cron/*
Deployment:   Vercel (frontend) + Supabase (DB/auth)
```

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js App (Vercel)                        │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Auth     │  │ Dashboard    │  │ Campaign / Marketing UI  │  │
│  │ (login)  │  │ (metrics)    │  │ (create, preview, send)  │  │
│  └────┬─────┘  └──────┬───────┘  └────────────┬─────────────┘  │
│       │               │                        │                │
│       └───────────────┴────────────────────────┘                │
│                       │ Server Actions / API Routes             │
└───────────────────────┼─────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   Supabase Auth   Supabase DB    Google Sheets
   (@cncservices)  (Postgres)     (sync job)
                        │
                        ▼
              Cron: process scheduled emails
              (Edge Function or /api/cron/send-emails)
                        │
                        ▼
              SMTP (mail.cncservices.net:465)
              renewal@ / info@ accounts
```

### Data flow

1. **Sync job** (every 15–30 min): Pull Google Sheet → upsert `certificates` table.
2. **User creates renewal campaign**: Select expiry month/year → system computes 3 touchpoint dates → creates `scheduled_emails` rows (grouped by recipient).
3. **Cron job** (every 5 min): Query `scheduled_emails WHERE status='pending' AND scheduled_at <= now()` → send via SMTP → log results.
4. **Marketing campaigns**: Same pattern but uses `marketing_*` tables and custom templates.

---

## 4. Renewal Scheduling Logic (New)

### Core rule: Month anchor

For any certificate with expiry date **D**, define:

```
anchor_date = 1st day of (month(D), year(D))
```

All touchpoints are calculated from `anchor_date`, **not** from the individual expiry day.

### Touchpoints (3 emails per expiry month campaign)

| # | Offset from anchor | Example (March 2026 expiry month) |
|---|-------------------|-----------------------------------|
| 1 | **−15 days** (15 days before 1st of month) | Feb 14, 2026 |
| 2 | **+14 days** (2 weeks after 1st of month) | Mar 15, 2026 |
| 3 | **+28 days** (4 weeks after 1st of month) | Mar 29, 2026 |

### Worked example

Certificate expires **March 16, 2026**:
- Anchor = **March 1, 2026**
- Email 1 → **February 14, 2026** at 09:00 (configurable)
- Email 2 → **March 15, 2026** at 09:00
- Email 3 → **March 29, 2026** at 09:00

Certificate expires **March 3, 2026** (same month):
- Same anchor → **same 3 dates**
- Both certs appear in **one combined email** per touchpoint (grouped by `recipient_email`)

### Grouping rules

```
FOR each renewal_campaign (target_month, target_year):
  FOR each touchpoint (1, 2, 3):
    FOR each unique recipient_email in active certificates expiring that month:
      CREATE one scheduled_email containing ALL certificates for that email
      EXCLUDE certificates where ops_status = 'done'
      RE-CHECK ops_status at send time (skip if now 'done')
```

### TypeScript reference implementation

```typescript
type TouchpointNumber = 1 | 2 | 3;

const TOUCHPOINT_OFFSETS: Record<TouchpointNumber, number> = {
  1: -15,  // days before anchor
  2: 14,   // days after anchor (2 weeks)
  3: 28,   // days after anchor (4 weeks)
};

function getMonthAnchor(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1, 9, 0, 0)); // 09:00 UTC
}

function getTouchpointDate(
  expiryDate: Date,
  touchpoint: TouchpointNumber,
  sendHour = 9
): Date {
  const anchor = getMonthAnchor(
    expiryDate.getUTCFullYear(),
    expiryDate.getUTCMonth() + 1
  );
  const offsetDays = TOUCHPOINT_OFFSETS[touchpoint];
  const result = new Date(anchor);
  result.setUTCDate(result.getUTCDate() + offsetDays);
  result.setUTCHours(sendHour, 0, 0, 0);
  return result;
}

// Example: expiry March 16, 2026
// getTouchpointDate(new Date('2026-03-16'), 1) → 2026-02-14T09:00:00Z
// getTouchpointDate(new Date('2026-03-16'), 2) → 2026-03-15T09:00:00Z
// getTouchpointDate(new Date('2026-03-16'), 3) → 2026-03-29T09:00:00Z
```

### Edge cases to handle in code

| Case | Behavior |
|------|----------|
| Expiry in January, touchpoint 1 (−15 days) | Dec 17 previous year — valid |
| Certificate added after touchpoint 1 date passed | Skip past touchpoints; only schedule future ones |
| Ops status changes to `done` before send | Cancel/skip at send time |
| Duplicate email in same month | One email with all certs listed |
| Invalid/missing email | Exclude from scheduling; log warning |
| Timezone | Store all dates as `timestamptz` UTC; display in Europe/Berlin or Asia/Karachi as needed |

---

## 5. Feature Matrix vs Reference Repo

| Feature | Reference repo | New app |
|---------|---------------|---------|
| Google Sheets data load | ✅ | ✅ (sync to DB) |
| Filter by expiry month/year | ✅ | ✅ |
| Group certs per email | ✅ | ✅ |
| Email preview | ✅ | ✅ |
| Batch send renewals (manual) | ✅ | ✅ |
| Scheduled renewal campaigns | ✅ 4 touchpoints per cert | ✅ **3 touchpoints per month** (grouped) |
| Ops Status exclusion | ✅ | ✅ |
| Real-time ops check at send | ✅ | ✅ |
| Marketing templates CRUD | ✅ | ✅ |
| Marketing campaign filters (ITEM, company) | ✅ | ✅ |
| Marketing touchpoints (1–10) | ✅ | ✅ |
| Daily marketing email limit (100) | ✅ | ✅ |
| Manual one-off email | ✅ | ✅ |
| Email logs + CSV export | ✅ | ✅ |
| Pause/resume/cancel campaigns | ✅ | ✅ |
| User login | ❌ | ✅ `@cncservices.net` only |
| Role-based access | ❌ | ✅ (admin / user) — optional phase 2 |

---

## 6. Supabase Database Schema

Run these migrations in order in the Supabase SQL Editor.

### Migration 001 — Extensions & enums

```sql
-- 001_extensions_and_enums.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";  -- if using Supabase cron

CREATE TYPE user_role AS ENUM ('admin', 'user');
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');
CREATE TYPE email_status AS ENUM ('pending', 'sent', 'failed', 'skipped', 'cancelled');
CREATE TYPE touchpoint_type AS ENUM ('renewal', 'marketing');
CREATE TYPE template_category AS ENUM (
  'product_updates', 'compliance_news', 'general_marketing',
  'announcements', 'renewals', 'custom'
);
CREATE TYPE campaign_type AS ENUM (
  'marketing', 'newsletter', 'product_update', 'compliance_alert', 'general'
);
CREATE TYPE sync_status AS ENUM ('success', 'failed', 'partial');
```

### Migration 002 — Profiles (extends auth.users)

```sql
-- 002_profiles.sql
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT,
  role          user_role NOT NULL DEFAULT 'user',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profiles_email_domain CHECK (email ~* '@cncservices\.net$')
);

CREATE INDEX idx_profiles_email ON public.profiles(email);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email !~* '@cncservices\.net$' THEN
    RAISE EXCEPTION 'Only @cncservices.net email addresses are allowed';
  END IF;
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

### Migration 003 — Certificates (synced from Google Sheets)

```sql
-- 003_certificates.sql
CREATE TABLE public.certificates (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certificate_no    TEXT NOT NULL,
  company_name      TEXT NOT NULL,
  item              TEXT,
  expiry_date       DATE NOT NULL,
  recipient_email   TEXT NOT NULL,
  renewal_amount    NUMERIC(12, 2),
  ops_status        TEXT DEFAULT '',
  contact_person    TEXT,
  sheet_row_hash    TEXT,  -- detect changes on sync
  last_synced_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (certificate_no)
);

CREATE INDEX idx_certificates_expiry ON public.certificates(expiry_date);
CREATE INDEX idx_certificates_email ON public.certificates(recipient_email);
CREATE INDEX idx_certificates_ops_status ON public.certificates(ops_status);
CREATE INDEX idx_certificates_item ON public.certificates(item);
CREATE INDEX idx_certificates_expiry_month ON public.certificates(
  EXTRACT(YEAR FROM expiry_date),
  EXTRACT(MONTH FROM expiry_date)
);

CREATE TRIGGER certificates_updated_at
  BEFORE UPDATE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

### Migration 004 — Sheet sync logs

```sql
-- 004_sheet_sync_logs.sql
CREATE TABLE public.sheet_sync_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status          sync_status NOT NULL,
  rows_processed  INTEGER NOT NULL DEFAULT 0,
  rows_inserted   INTEGER NOT NULL DEFAULT 0,
  rows_updated    INTEGER NOT NULL DEFAULT 0,
  rows_skipped    INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);
```

### Migration 005 — Renewal campaigns

```sql
-- 005_renewal_campaigns.sql
CREATE TABLE public.renewal_campaigns (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT NOT NULL,
  description           TEXT,
  target_month          INTEGER NOT NULL CHECK (target_month BETWEEN 1 AND 12),
  target_year           INTEGER NOT NULL CHECK (target_year >= 2020),
  status                campaign_status NOT NULL DEFAULT 'draft',
  anchor_date           DATE NOT NULL,  -- 1st of target month
  total_certificates    INTEGER NOT NULL DEFAULT 0,
  total_recipients      INTEGER NOT NULL DEFAULT 0,
  total_emails_scheduled INTEGER NOT NULL DEFAULT 0,
  emails_sent           INTEGER NOT NULL DEFAULT 0,
  created_by            UUID REFERENCES public.profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ
);

CREATE INDEX idx_renewal_campaigns_status ON public.renewal_campaigns(status);
CREATE INDEX idx_renewal_campaigns_target ON public.renewal_campaigns(target_year, target_month);

CREATE TRIGGER renewal_campaigns_updated_at
  BEFORE UPDATE ON public.renewal_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

### Migration 006 — Scheduled emails (renewals + shared infrastructure)

```sql
-- 006_scheduled_emails.sql
CREATE TABLE public.scheduled_emails (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id         UUID NOT NULL REFERENCES public.renewal_campaigns(id) ON DELETE CASCADE,
  touchpoint_number   INTEGER NOT NULL CHECK (touchpoint_number BETWEEN 1 AND 3),
  recipient_email     TEXT NOT NULL,
  company_name        TEXT NOT NULL,
  certificate_ids     UUID[] NOT NULL DEFAULT '{}',  -- grouped certs
  certificate_snapshot JSONB NOT NULL DEFAULT '[]', -- denormalized for send
  subject             TEXT NOT NULL DEFAULT 'Renewal CE Marking',
  scheduled_at        TIMESTAMPTZ NOT NULL,
  status              email_status NOT NULL DEFAULT 'pending',
  sent_at             TIMESTAMPTZ,
  error_message       TEXT,
  retry_count         INTEGER NOT NULL DEFAULT 0,
  max_retries         INTEGER NOT NULL DEFAULT 3,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scheduled_emails_pending ON public.scheduled_emails(status, scheduled_at)
  WHERE status = 'pending';
CREATE INDEX idx_scheduled_emails_campaign ON public.scheduled_emails(campaign_id);

CREATE TRIGGER scheduled_emails_updated_at
  BEFORE UPDATE ON public.scheduled_emails
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

### Migration 007 — Email send logs

```sql
-- 007_email_logs.sql
CREATE TABLE public.email_logs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_type        touchpoint_type NOT NULL,  -- 'renewal' | 'marketing'
  campaign_id       UUID,  -- renewal or marketing campaign id
  scheduled_email_id UUID,
  recipient_email   TEXT NOT NULL,
  company_name      TEXT,
  subject           TEXT NOT NULL,
  certificate_count INTEGER NOT NULL DEFAULT 0,
  status            email_status NOT NULL,
  error_message     TEXT,
  smtp_message_id   TEXT,
  sent_by           UUID REFERENCES public.profiles(id),
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata          JSONB DEFAULT '{}'
);

CREATE INDEX idx_email_logs_type ON public.email_logs(email_type);
CREATE INDEX idx_email_logs_sent_at ON public.email_logs(sent_at DESC);
CREATE INDEX idx_email_logs_recipient ON public.email_logs(recipient_email);
```

### Migration 008 — Marketing templates

```sql
-- 008_marketing_templates.sql
CREATE TABLE public.marketing_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  category        template_category NOT NULL DEFAULT 'general_marketing',
  subject         TEXT NOT NULL,
  html_content    TEXT NOT NULL,
  variables       TEXT[] NOT NULL DEFAULT ARRAY[
    'company_name', 'contact_person', 'certificate_no',
    'item', 'expiry_date', 'renewal_amount'
  ],
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketing_templates_active ON public.marketing_templates(is_active);

CREATE TRIGGER marketing_templates_updated_at
  BEFORE UPDATE ON public.marketing_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

### Migration 009 — Marketing campaigns

```sql
-- 009_marketing_campaigns.sql
CREATE TABLE public.marketing_campaigns (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  description         TEXT,
  campaign_type       campaign_type NOT NULL DEFAULT 'marketing',
  status              campaign_status NOT NULL DEFAULT 'draft',
  filters_applied     JSONB NOT NULL DEFAULT '{}',
  -- e.g. {"items": ["PPE"], "item_match": "exact", "companies": [], "exclude_done": true}
  total_certificates  INTEGER NOT NULL DEFAULT 0,
  total_recipients    INTEGER NOT NULL DEFAULT 0,
  total_emails        INTEGER NOT NULL DEFAULT 0,
  emails_sent         INTEGER NOT NULL DEFAULT 0,
  created_by          UUID REFERENCES public.profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ
);

CREATE TABLE public.marketing_touchpoints (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id       UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  touchpoint_number INTEGER NOT NULL,
  template_id       UUID NOT NULL REFERENCES public.marketing_templates(id),
  schedule_type     TEXT NOT NULL CHECK (schedule_type IN ('immediate', 'weekly', 'monthly', 'custom_days')),
  schedule_value    INTEGER NOT NULL DEFAULT 0,  -- days offset from campaign start or previous touchpoint
  delay_days        INTEGER NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, touchpoint_number)
);

CREATE TABLE public.marketing_scheduled_emails (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id         UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  touchpoint_id       UUID NOT NULL REFERENCES public.marketing_touchpoints(id) ON DELETE CASCADE,
  template_id         UUID NOT NULL REFERENCES public.marketing_templates(id),
  recipient_email     TEXT NOT NULL,
  company_name        TEXT NOT NULL,
  certificate_ids     UUID[] NOT NULL DEFAULT '{}',
  rendered_subject    TEXT NOT NULL,
  rendered_html       TEXT NOT NULL,
  scheduled_at        TIMESTAMPTZ NOT NULL,
  status              email_status NOT NULL DEFAULT 'pending',
  sent_at             TIMESTAMPTZ,
  error_message       TEXT,
  retry_count         INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketing_scheduled_pending ON public.marketing_scheduled_emails(status, scheduled_at)
  WHERE status = 'pending';
```

### Migration 010 — Daily send limits & app settings

```sql
-- 010_app_settings.sql
CREATE TABLE public.daily_send_counters (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  counter_date    DATE NOT NULL UNIQUE,
  renewal_sent    INTEGER NOT NULL DEFAULT 0,
  marketing_sent  INTEGER NOT NULL DEFAULT 0,
  marketing_limit INTEGER NOT NULL DEFAULT 100,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (key, value) VALUES
  ('smtp_renewal', '{"host":"mail.cncservices.net","port":465,"from":"renewal@cncservices.net"}'),
  ('smtp_marketing', '{"host":"mail.cncservices.net","port":465,"from":"info@cncservices.net"}'),
  ('renewal_touchpoints', '{"offsets":[-15,14,28],"send_hour":9}'),
  ('allowed_email_domain', '"cncservices.net"'),
  ('google_sheet', '{"spreadsheet":"Renewals","worksheet":"List Cleaned"}');
```

### Migration 011 — Helper views

```sql
-- 011_views.sql
CREATE OR REPLACE VIEW public.v_certificates_active AS
SELECT *
FROM public.certificates
WHERE lower(trim(ops_status)) != 'done'
  AND recipient_email IS NOT NULL
  AND recipient_email != '';

CREATE OR REPLACE VIEW public.v_renewal_campaign_stats AS
SELECT
  rc.id,
  rc.name,
  rc.status,
  rc.target_year,
  rc.target_month,
  rc.emails_sent,
  rc.total_emails_scheduled,
  CASE WHEN rc.total_emails_scheduled > 0
    THEN ROUND(100.0 * rc.emails_sent / rc.total_emails_scheduled, 1)
    ELSE 0
  END AS progress_pct,
  COUNT(se.id) FILTER (WHERE se.status = 'pending') AS pending_count,
  COUNT(se.id) FILTER (WHERE se.status = 'failed') AS failed_count
FROM public.renewal_campaigns rc
LEFT JOIN public.scheduled_emails se ON se.campaign_id = rc.id
GROUP BY rc.id;
```

---

## 7. Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renewal_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_scheduled_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheet_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_send_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Helper: check authenticated @cncservices.net user
CREATE OR REPLACE FUNCTION public.is_cnc_user()
RETURNS BOOLEAN AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND is_active = true
        AND email ~* '@cncservices\.net$'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles: users read own profile; admins read all
CREATE POLICY profiles_select ON public.profiles FOR SELECT
  USING (id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- All authenticated CNC users can CRUD operational tables
CREATE POLICY certificates_all ON public.certificates FOR ALL
  USING (public.is_cnc_user()) WITH CHECK (public.is_cnc_user());

CREATE POLICY renewal_campaigns_all ON public.renewal_campaigns FOR ALL
  USING (public.is_cnc_user()) WITH CHECK (public.is_cnc_user());

CREATE POLICY scheduled_emails_all ON public.scheduled_emails FOR ALL
  USING (public.is_cnc_user()) WITH CHECK (public.is_cnc_user());

CREATE POLICY email_logs_all ON public.email_logs FOR ALL
  USING (public.is_cnc_user()) WITH CHECK (public.is_cnc_user());

CREATE POLICY marketing_templates_all ON public.marketing_templates FOR ALL
  USING (public.is_cnc_user()) WITH CHECK (public.is_cnc_user());

CREATE POLICY marketing_campaigns_all ON public.marketing_campaigns FOR ALL
  USING (public.is_cnc_user()) WITH CHECK (public.is_cnc_user());

CREATE POLICY marketing_touchpoints_all ON public.marketing_touchpoints FOR ALL
  USING (public.is_cnc_user()) WITH CHECK (public.is_cnc_user());

CREATE POLICY marketing_scheduled_all ON public.marketing_scheduled_emails FOR ALL
  USING (public.is_cnc_user()) WITH CHECK (public.is_cnc_user());

CREATE POLICY sheet_sync_logs_select ON public.sheet_sync_logs FOR SELECT
  USING (public.is_cnc_user());

CREATE POLICY daily_counters_select ON public.daily_send_counters FOR SELECT
  USING (public.is_cnc_user());

CREATE POLICY app_settings_select ON public.app_settings FOR SELECT
  USING (public.is_cnc_user());
```

> **Note:** Cron/background jobs must use the **Supabase service role key** (server-side only) to bypass RLS when sending emails.

---

## 8. Auth: @cncservices.net Only

Implement **three layers** of protection:

1. **Supabase Auth hook** (recommended): Create a `before-user-created` Edge Function that rejects non-`@cncservices.net` emails.
2. **Database trigger** (`handle_new_user`): Already in Migration 002 — blocks profile creation.
3. **Next.js middleware**: Redirect unauthenticated users to `/login`; verify session on every protected route.

### Sign-up flow

- **Option A (recommended):** Disable public sign-up; admin invites users via Supabase Dashboard.
- **Option B:** Allow sign-up but domain validated by hook + DB constraint.

### Login page requirements

- Email + password form
- Show error: "Only @cncservices.net accounts can access this system"
- Redirect to `/dashboard` on success

---

## 9. Environment Variables

```bash
# .env.local (Next.js — never commit)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # server only

# SMTP — Renewal
SMTP_RENEWAL_HOST=mail.cncservices.net
SMTP_RENEWAL_PORT=465
SMTP_RENEWAL_USER=renewal@cncservices.net
SMTP_RENEWAL_PASSWORD=secret

# SMTP — Marketing
SMTP_MARKETING_HOST=mail.cncservices.net
SMTP_MARKETING_PORT=465
SMTP_MARKETING_USER=info@cncservices.net
SMTP_MARKETING_PASSWORD=secret

# Google Sheets
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN..."
GOOGLE_SHEET_ID=...
GOOGLE_SHEET_NAME=Renewals
GOOGLE_WORKSHEET_NAME=List Cleaned

# Cron security
CRON_SECRET=random-long-string

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
ALLOWED_EMAIL_DOMAIN=cncservices.net
```

---

## 10. Project Structure

```
cnc_marketing_crm/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # sidebar nav, auth guard
│   │   ├── dashboard/page.tsx
│   │   ├── renewals/
│   │   │   ├── page.tsx            # manual send
│   │   │   ├── campaigns/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   └── preview/page.tsx
│   │   ├── marketing/
│   │   │   ├── templates/page.tsx
│   │   │   ├── campaigns/page.tsx
│   │   │   └── campaigns/new/page.tsx
│   │   ├── manual-email/page.tsx
│   │   ├── logs/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── cron/
│   │   │   ├── sync-sheets/route.ts
│   │   │   ├── send-renewals/route.ts
│   │   │   └── send-marketing/route.ts
│   │   └── webhooks/
│   └── layout.tsx
├── components/
│   ├── ui/                         # shadcn
│   ├── auth/
│   ├── renewals/
│   ├── marketing/
│   └── shared/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── email/
│   │   ├── smtp.ts
│   │   ├── renewal-template.ts
│   │   └── template-renderer.ts
│   ├── sheets/
│   │   └── sync.ts
│   ├── scheduling/
│   │   ├── renewal-schedule.ts     # month-anchor logic
│   │   └── marketing-schedule.ts
│   └── utils/
├── types/
│   └── database.ts                 # generated from Supabase
├── supabase/
│   └── migrations/                 # SQL files from section 6
├── middleware.ts
├── vercel.json                       # cron config
└── package.json
```

---

## 11. Development Phases

| Phase | Scope | Est. prompts |
|-------|-------|--------------|
| **0** | Supabase project + all migrations | Prompt 1 |
| **1** | Next.js scaffold + auth + middleware | Prompts 2–3 |
| **2** | Google Sheets sync | Prompt 4 |
| **3** | Renewal manual send + preview | Prompt 5 |
| **4** | Renewal campaigns + month-anchor scheduling | Prompts 6–7 |
| **5** | Email cron + SMTP sending | Prompt 8 |
| **6** | Marketing templates | Prompt 9 |
| **7** | Marketing campaigns + filters | Prompt 10 |
| **8** | Marketing cron + daily limits | Prompt 11 |
| **9** | Manual email + logs + dashboard | Prompts 12–13 |
| **10** | Polish, settings, deployment | Prompt 14 |

---

## 12. Claude Prompts (Run in Order)

Copy each prompt into Claude **one at a time**. Wait for completion and test before moving to the next.

---

### Prompt 1 — Supabase database setup

```
I'm building a CNC Services CRM email app with Next.js and Supabase.

Create ALL Supabase SQL migrations for this project. Use the exact schema below.

Requirements:
- Postgres enums: user_role, campaign_status, email_status, touchpoint_type, template_category, campaign_type, sync_status
- Tables: profiles, certificates, sheet_sync_logs, renewal_campaigns, scheduled_emails, email_logs, marketing_templates, marketing_campaigns, marketing_touchpoints, marketing_scheduled_emails, daily_send_counters, app_settings
- profiles must enforce @cncservices.net email domain via CHECK constraint and trigger on auth.users insert
- certificates synced from Google Sheets with columns: certificate_no, company_name, item, expiry_date, recipient_email, renewal_amount, ops_status, contact_person
- renewal_campaigns uses month-anchor scheduling with target_month, target_year, anchor_date (1st of month)
- scheduled_emails groups multiple certificate_ids per recipient per touchpoint (touchpoint_number 1-3)
- RLS enabled on all tables with is_cnc_user() helper function
- Views: v_certificates_active (ops_status != 'done'), v_renewal_campaign_stats

Renewal touchpoint offsets from month anchor (1st of expiry month):
- Touchpoint 1: -15 days
- Touchpoint 2: +14 days (2 weeks)
- Touchpoint 3: +28 days (4 weeks)

Output:
1. Numbered migration files (001 through 011) as separate SQL code blocks
2. Instructions for running in Supabase SQL Editor
3. How to generate TypeScript types with `supabase gen types`
```

---

### Prompt 2 — Next.js project scaffold

```
Create a new Next.js 15 App Router project for "CNC Marketing CRM" with:

Stack:
- TypeScript, Tailwind CSS, shadcn/ui, lucide-react
- @supabase/ssr and @supabase/supabase-js
- Folder structure as specified in DEVELOPMENT_PLAN.md

Deliver:
1. Full package.json with dependencies
2. tailwind.config.ts, components.json for shadcn
3. lib/supabase/client.ts, server.ts, middleware.ts (SSR cookie pattern)
4. middleware.ts that protects all routes except /login — redirect unauthenticated to /login
5. app/layout.tsx with Inter font and Toaster
6. app/(auth)/login/page.tsx — email/password login form, CNC branding, error for wrong domain
7. app/(dashboard)/layout.tsx — sidebar with nav links: Dashboard, Renewals, Renewal Campaigns, Marketing Templates, Marketing Campaigns, Manual Email, Logs, Settings. Include user menu with logout.
8. Placeholder pages for each nav item
9. .env.local.example with all required env vars documented

Do NOT implement business logic yet — scaffold and auth shell only.
Use a clean professional UI: navy/slate colors, CNC Services branding placeholder.
```

---

### Prompt 3 — Auth domain restriction

```
Extend the Next.js CNC Marketing CRM auth system to strictly allow only @cncservices.net users.

Implement:
1. Supabase Edge Function `auth-before-user-created` that rejects signup if email domain is not cncservices.net (return 403 with clear message)
2. Client-side validation on login/signup forms — regex check before submit
3. Server action `signInWithEmail` that validates domain before calling Supabase
4. Server action `signOut`
5. Hook/trigger SQL (if not already applied) for profiles table domain CHECK
6. middleware.ts: refresh session, redirect logged-in users away from /login to /dashboard
7. Display user email and role from profiles table in sidebar

Provide:
- Edge Function code (index.ts)
- All Next.js auth files
- Deployment instructions for the Edge Function in Supabase Dashboard
- How to disable public signup and use invite-only if preferred
```

---

### Prompt 4 — Google Sheets sync

```
Build Google Sheets → Supabase sync for CNC Marketing CRM (Next.js).

Reference: legacy Python app reads sheet "Renewals", worksheet "List Cleaned" with columns:
COMPANY NAME, CERTIFICATE NO., ITEM, EXPIRY (DD/MM/YYYY), E-MAIL, Renewal Amount, Ops Status

Implement:
1. lib/sheets/google-client.ts — service account auth from env vars
2. lib/sheets/sync.ts — fetch sheet, parse dates (DD/MM/YYYY → ISO date), map columns to certificates table, upsert on certificate_no, compute row hash for change detection
3. app/api/cron/sync-sheets/route.ts — POST endpoint protected by CRON_SECRET header, calls sync, writes sheet_sync_logs row
4. Server action or admin button to trigger manual sync from Settings page
5. Handle: empty emails (skip), invalid dates (log warning), trim whitespace

Return sync stats: inserted, updated, skipped, errors.

Also create lib/sheets/types.ts and unit-testable parseExpiryDate() function.

vercel.json cron entry: run sync every 30 minutes.
```

---

### Prompt 5 — Manual renewal emails (send now)

```
Build the "Send Renewal Emails" feature for CNC Marketing CRM.

Data: certificates table in Supabase (active = ops_status != 'done').

Features:
1. app/(dashboard)/renewals/page.tsx
   - Month/year picker for expiry filter
   - Load certificates expiring in selected month from Supabase
   - Metrics: total certs, unique companies, unique emails, total renewal amount
   - Data table with sorting
   - Group certificates by recipient_email (one email per company/email)
2. Email preview panel — select recipient, render HTML renewal template
3. lib/email/renewal-template.ts — port the HTML template from legacy cnc_crm (subject: "Renewal CE Marking", lists certs with cert no, item, expiry, renewal amount, bank details)
4. lib/email/smtp.ts — Nodemailer wrapper with renewal SMTP credentials from env
5. "Test connection" button
6. "Send all" with progress — batch send, log each to email_logs table
7. Server actions: getRenewalPreview, sendRenewalBatch, testSmtpConnection

Use Server Components for data fetch, Client Components for interactive send UI.
Match grouping logic from legacy prepare_email_data() in data_processor.py.
```

---

### Prompt 6 — Renewal campaign creation (month-anchor scheduling)

```
Build renewal campaign creation with MONTH-ANCHOR scheduling for CNC Marketing CRM.

CRITICAL scheduling logic:
- For certificates expiring in target_month/target_year, anchor = 1st of that month
- Touchpoint 1: anchor - 15 days
- Touchpoint 2: anchor + 14 days
- Touchpoint 3: anchor + 28 days
- Group ALL certificates expiring that month by recipient_email → ONE scheduled_email row per recipient per touchpoint
- Exclude ops_status = 'done'
- Skip touchpoints whose scheduled_at is already in the past (only schedule future touchpoints)
- Default send time: 09:00 UTC (configurable from app_settings)

Implement:
1. lib/scheduling/renewal-schedule.ts
   - getMonthAnchor(year, month)
   - getTouchpointDate(anchor, touchpointNumber)
   - buildScheduledEmails(certificates, campaignId) → array of scheduled_email records with certificate_ids[] and certificate_snapshot JSONB
2. app/(dashboard)/renewals/campaigns/new/page.tsx — form: name, description, month, year, preview counts, certificate preview table
3. Server action createRenewalCampaign — inserts renewal_campaigns + bulk insert scheduled_emails
4. app/(dashboard)/renewals/campaigns/page.tsx — list campaigns with status, progress
5. app/(dashboard)/renewals/campaigns/[id]/page.tsx — detail: pause/resume/cancel, view scheduled emails by touchpoint and status

Include worked example in code comments: March 16 2026 expiry → anchor Mar 1 → emails Feb 14, Mar 15, Mar 29.
Write Jest tests for renewal-schedule.ts covering January edge case (touchpoint 1 in prior year).
```

---

### Prompt 7 — Renewal campaign management UI

```
Build renewal campaign management pages for CNC Marketing CRM.

Pages:
1. Campaign list — filter by status (active, paused, completed, cancelled), sort by date, progress bar, stats from v_renewal_campaign_stats view
2. Campaign detail page:
   - Header with name, status badge, target month/year, anchor date
   - Metrics: total certificates, recipients, emails scheduled/sent/pending/failed
   - Actions: Pause, Resume, Cancel (update renewal_campaigns.status)
   - Tabs: Overview | Scheduled Emails | Logs
   - Scheduled Emails tab: filter by touchpoint (1/2/3) and status, table with recipient, company, cert count, scheduled_at, sent_at
   - Logs tab: email_logs filtered by campaign_id

Server actions:
- pauseRenewalCampaign(id)
- resumeRenewalCampaign(id)
- cancelRenewalCampaign(id) — also set pending scheduled_emails to cancelled

Use shadcn DataTable, Badge, Tabs, Dialog components.
Include CSV export button for scheduled emails and logs.
```

---

### Prompt 8 — Email sending cron (renewals)

```
Build the automated email sending cron for renewal campaigns in CNC Marketing CRM.

Implement:
1. app/api/cron/send-renewals/route.ts
   - Protected by Authorization: Bearer CRON_SECRET
   - Query scheduled_emails WHERE status='pending' AND scheduled_at <= now() AND campaign is active
   - For each email (batch max 20 per run):
     a. Re-fetch certificates by certificate_ids — skip if ANY now have ops_status='done'
     b. If all skipped, mark scheduled_email status='skipped'
     c. Render renewal HTML template with certificate_snapshot
     d. Send via lib/email/smtp.ts (renewal account)
     e. Update scheduled_email status, sent_at, increment renewal_campaigns.emails_sent
     f. Insert email_logs row
     g. 2-second delay between sends
   - Retry failed emails up to max_retries with exponential backoff

2. lib/email/send-renewal.ts — single email send logic extracted for testing

3. vercel.json cron: every 5 minutes

4. app/(dashboard)/settings/page.tsx section showing cron status, last run (store in app_settings or sheet_sync_logs pattern)

5. Manual trigger button for admins: "Process pending renewal emails now"

Write tests for skip-when-ops-done logic.
Handle SMTP errors gracefully, store error_message on scheduled_emails.
```

---

### Prompt 9 — Marketing email templates CRUD

```
Build marketing email template management for CNC Marketing CRM.

Port features from legacy marketing_template_manager.py:

1. app/(dashboard)/marketing/templates/page.tsx
   - List templates with category filter
   - Create / Edit / Delete / Preview
   - Categories: product_updates, compliance_news, general_marketing, announcements, renewals, custom

2. Template fields: name, category, subject, html_content, description, is_active
   - Variables: {company_name}, {contact_person}, {certificate_no}, {item}, {expiry_date}, {renewal_amount}
   - Live preview panel with editable test variables

3. lib/email/template-renderer.ts
   - renderTemplate(html, subject, variables) — replace {var} placeholders
   - validateTemplate() — check required fields, warn on unknown variables

4. Server actions: createTemplate, updateTemplate, deleteTemplate, getTemplates

5. Seed function createDefaultTemplates() — 3 sample templates (product update, compliance news, general marketing) insertable from UI button

6. Store in marketing_templates table

Use a rich text approach: textarea with HTML support (or TipTap if you prefer) — keep it simple with HTML textarea + preview iframe/div.

Reference legacy sample templates in cnc_crm repo for content style.
```

---

### Prompt 10 — Marketing campaigns with filters

```
Build marketing campaign creation for CNC Marketing CRM.

Port logic from legacy marketing_data_processor.py and marketing_campaign_manager.py:

FILTERING (at least one filter required):
- Filter by ITEM: multiselect, match type exact or contains
- Filter by company: optional multiselect
- Exclude ops_status='done': checkbox (default true)
- Preview filtered certificates before creating campaign

CAMPAIGN CREATION:
1. app/(dashboard)/marketing/campaigns/new/page.tsx
   - Step wizard: (1) Filters & Preview → (2) Touchpoints → (3) Review & Create
   - Campaign name, type (marketing/newsletter/product_update/compliance_alert/general), description
   - Touchpoints: 1-10, each with template select + schedule (immediate/weekly/monthly/custom_days)
   - Group by unique recipient_email (NOT per certificate — one email per recipient per touchpoint with all their matching certs)

2. lib/scheduling/marketing-schedule.ts
   - calculateTouchpointDates(campaignStart, touchpointsConfig)
   - buildMarketingScheduledEmails(filteredCerts, campaign, touchpoints)

3. Server action createMarketingCampaign — inserts marketing_campaigns, marketing_touchpoints, marketing_scheduled_emails

4. app/(dashboard)/marketing/campaigns/page.tsx — list with status, progress
5. Campaign detail — pause/resume/cancel/delete, view touchpoints and scheduled emails

Template rendering: per recipient, pick first certificate for variable substitution OR merge multiple certs in template.

Store filters_applied as JSONB on marketing_campaigns.
```

---

### Prompt 11 — Marketing email cron + daily limit

```
Build marketing email sending cron with daily limit for CNC Marketing CRM.

Requirements from legacy marketing_email_scheduler.py:
- Daily limit: 100 marketing emails per day (renewal emails NOT counted)
- Track in daily_send_counters table
- Marketing SMTP: info@cncservices.net (separate from renewal@)
- Batch max 10 emails per cron run
- 2-second delay between sends
- Skip if campaign not active
- Re-check ops_status at send time

Implement:
1. app/api/cron/send-marketing/route.ts — same pattern as send-renewals
2. lib/email/send-marketing.ts — render template with variables, send, log
3. lib/email/daily-limit.ts — check/increment marketing counter, reset on new day
4. Manual "Send pending marketing emails now" button on marketing dashboard
5. Dashboard widget: marketing emails sent today / 100 limit

Marketing logs go to email_logs with email_type='marketing'.

vercel.json: add cron every 10 minutes for marketing sends.
```

---

### Prompt 12 — Manual email + email logs

```
Build Manual Email and Email Logs pages for CNC Marketing CRM.

MANUAL EMAIL (app/(dashboard)/manual-email/page.tsx):
- Compose: recipient, subject, HTML body
- Quick templates: Business Update, Certificate Information, General Inquiry Response (from legacy app)
- Preview before send, optional CC to admin@cncservices.net
- Bypasses marketing daily limit
- Uses renewal SMTP account
- Log to email_logs

EMAIL LOGS (app/(dashboard)/logs/page.tsx):
- Tabs: All | Renewal | Marketing | Manual
- Stats cards: total sent, successful, failed, success rate
- Filter by status, date range, recipient search
- Paginated DataTable
- CSV export
- Data from email_logs table joined with campaign names where available

Server actions: sendManualEmail, getEmailLogs, getEmailLogStats
```

---

### Prompt 13 — Dashboard + settings

```
Build Dashboard and Settings pages for CNC Marketing CRM.

DASHBOARD (app/(dashboard)/dashboard/page.tsx):
- Cards: total active certificates, expiring this month, pending renewal emails, pending marketing emails
- Active renewal campaigns with progress bars
- Active marketing campaigns with progress bars
- Recent email activity (last 10 from email_logs)
- Marketing daily limit gauge (X/100)
- Last Google Sheets sync time and status
- Quick actions: Sync Sheets, Create Renewal Campaign, Create Marketing Campaign

SETTINGS (app/(dashboard)/settings/page.tsx):
- Display (read-only) SMTP config masked — renewal vs marketing
- Google Sheet config
- Renewal touchpoint offsets (from app_settings)
- Required certificate columns reference
- Manual "Sync Google Sheets" button with last sync log
- Scheduler info: cron intervals

Use Server Components for data, revalidate on sync/send actions.
```

---

### Prompt 14 — Deployment + final polish

```
Finalize CNC Marketing CRM for production deployment.

Tasks:
1. Generate supabase/database.types.ts from schema
2. Add comprehensive error boundaries and loading.tsx skeletons for all dashboard routes
3. Add empty states for all lists
4. Security audit checklist:
   - Service role key only in server env
   - CRON_SECRET on all cron routes
   - RLS verified on all tables
   - SMTP passwords never exposed to client
5. vercel.json with all cron jobs:
   - sync-sheets: */30 * * * *
   - send-renewals: */5 * * * *
   - send-marketing: */10 * * * *
6. README.md with:
   - Local dev setup
   - Supabase setup steps
   - Env var list
   - How to invite first admin user
   - Deployment to Vercel
7. Add npm run type-check and npm run lint scripts
8. Mobile-responsive sidebar (collapsible)

Review entire app for TypeScript errors and fix.
Provide a pre-launch checklist.
```

---

## Quick Reference: Renewal Schedule Examples

| Expiry date | Anchor | TP1 (−15d) | TP2 (+14d) | TP3 (+28d) |
|-------------|--------|------------|------------|------------|
| Mar 3, 2026 | Mar 1 | Feb 14 | Mar 15 | Mar 29 |
| Mar 16, 2026 | Mar 1 | Feb 14 | Mar 15 | Mar 29 |
| Mar 31, 2026 | Mar 1 | Feb 14 | Mar 15 | Mar 29 |
| Jan 10, 2026 | Jan 1 | Dec 17, 2025 | Jan 15 | Jan 29 |
| Dec 20, 2026 | Dec 1 | Nov 16 | Dec 15 | Dec 29 |

All certificates in the same month share the same 3 send dates and are grouped into one email per recipient per touchpoint.

---

## Pre-Development Checklist

- [ ] Create Supabase project
- [ ] Run migrations 001–011
- [ ] Deploy auth Edge Function for domain restriction
- [ ] Create Google Cloud service account with Sheets API access
- [ ] Share Google Sheet with service account email
- [ ] Obtain SMTP credentials for renewal@ and info@
- [ ] Create Vercel project
- [ ] Invite first admin user (@cncservices.net)

---

*Document version: 1.0 — Generated for cnc_marketing_crm rebuild*
