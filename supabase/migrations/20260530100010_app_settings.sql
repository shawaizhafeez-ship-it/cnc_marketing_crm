-- Migration 010: Daily send counters and app settings

CREATE TABLE public.daily_send_counters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counter_date    DATE NOT NULL UNIQUE,
  renewal_sent    INTEGER NOT NULL DEFAULT 0,
  marketing_sent  INTEGER NOT NULL DEFAULT 0,
  marketing_limit INTEGER NOT NULL DEFAULT 100,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_send_counters_marketing_nonneg CHECK (marketing_sent >= 0),
  CONSTRAINT daily_send_counters_renewal_nonneg CHECK (renewal_sent >= 0)
);

CREATE INDEX idx_daily_send_counters_date ON public.daily_send_counters(counter_date DESC);

COMMENT ON TABLE public.daily_send_counters IS 'Daily email send counters — marketing limited to 100/day by default';

CREATE TABLE public.app_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.app_settings IS 'Non-secret app configuration (SMTP secrets live in env vars)';

INSERT INTO public.app_settings (key, value) VALUES
  (
    'smtp_renewal',
    '{"host":"mail.cncservices.net","port":465,"from":"renewal@cncservices.net"}'::JSONB
  ),
  (
    'smtp_marketing',
    '{"host":"mail.cncservices.net","port":465,"from":"info@cncservices.net"}'::JSONB
  ),
  (
    'renewal_touchpoints',
    '{"offsets":[-15,14,28],"send_hour":9,"description":"TP1: 15d before month start, TP2: +2w, TP3: +4w"}'::JSONB
  ),
  (
    'allowed_email_domain',
    '"cncservices.net"'::JSONB
  ),
  (
    'google_sheet',
    '{"spreadsheet":"Renewals","worksheet":"List Cleaned"}'::JSONB
  );
