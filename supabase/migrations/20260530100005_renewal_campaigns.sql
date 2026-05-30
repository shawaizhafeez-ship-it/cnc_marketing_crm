-- Migration 005: Renewal campaigns (month-anchor scheduling)

CREATE TABLE public.renewal_campaigns (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   TEXT NOT NULL,
  description            TEXT,
  target_month           INTEGER NOT NULL CHECK (target_month BETWEEN 1 AND 12),
  target_year            INTEGER NOT NULL CHECK (target_year >= 2020),
  status                 public.campaign_status NOT NULL DEFAULT 'draft',
  anchor_date            DATE NOT NULL,
  total_certificates     INTEGER NOT NULL DEFAULT 0,
  total_recipients       INTEGER NOT NULL DEFAULT 0,
  total_emails_scheduled INTEGER NOT NULL DEFAULT 0,
  emails_sent            INTEGER NOT NULL DEFAULT 0,
  created_by             UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at             TIMESTAMPTZ,
  completed_at           TIMESTAMPTZ,
  CONSTRAINT renewal_campaigns_anchor_is_first_of_month CHECK (
    anchor_date = make_date(target_year, target_month, 1)
  )
);

CREATE INDEX idx_renewal_campaigns_status ON public.renewal_campaigns(status);
CREATE INDEX idx_renewal_campaigns_target ON public.renewal_campaigns(target_year, target_month);
CREATE UNIQUE INDEX idx_renewal_campaigns_active_month ON public.renewal_campaigns(target_year, target_month)
  WHERE status IN ('draft', 'active', 'paused');

COMMENT ON TABLE public.renewal_campaigns IS 'Renewal email campaigns grouped by expiry month';
COMMENT ON COLUMN public.renewal_campaigns.anchor_date IS '1st day of target_month/target_year — base for touchpoint scheduling';
COMMENT ON COLUMN public.renewal_campaigns.total_emails_scheduled IS 'recipients × 3 touchpoints';

CREATE TRIGGER renewal_campaigns_updated_at
  BEFORE UPDATE ON public.renewal_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- Renewal touchpoint scheduling helpers
-- Offsets from anchor_date (1st of expiry month):
--   Touchpoint 1: -15 days
--   Touchpoint 2: +14 days (2 weeks)
--   Touchpoint 3: +28 days (4 weeks)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_renewal_touchpoint_offset_days(p_touchpoint INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE p_touchpoint
    WHEN 1 THEN RETURN -15;
    WHEN 2 THEN RETURN 14;
    WHEN 3 THEN RETURN 28;
    ELSE RAISE EXCEPTION 'Invalid renewal touchpoint: %. Must be 1, 2, or 3.', p_touchpoint;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_renewal_touchpoint_date(
  p_anchor_date DATE,
  p_touchpoint  INTEGER,
  p_send_hour   INTEGER DEFAULT 9
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_offset_days INTEGER;
  v_result      TIMESTAMPTZ;
BEGIN
  v_offset_days := public.get_renewal_touchpoint_offset_days(p_touchpoint);
  v_result := (p_anchor_date + v_offset_days * INTERVAL '1 day')::TIMESTAMPTZ;
  v_result := date_trunc('day', v_result) + (p_send_hour || ' hours')::INTERVAL;
  RETURN v_result AT TIME ZONE 'UTC';
END;
$$;

COMMENT ON FUNCTION public.get_renewal_touchpoint_date IS
  'Example: anchor 2026-03-01, TP1 → 2026-02-14 09:00 UTC, TP2 → 2026-03-15, TP3 → 2026-03-29';
