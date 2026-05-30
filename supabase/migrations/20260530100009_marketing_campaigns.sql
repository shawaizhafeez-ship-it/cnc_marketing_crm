-- Migration 009: Marketing campaigns, touchpoints, and scheduled emails

CREATE TABLE public.marketing_campaigns (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  description        TEXT,
  campaign_type      public.campaign_type NOT NULL DEFAULT 'marketing',
  status             public.campaign_status NOT NULL DEFAULT 'draft',
  filters_applied    JSONB NOT NULL DEFAULT '{}',
  total_certificates INTEGER NOT NULL DEFAULT 0,
  total_recipients   INTEGER NOT NULL DEFAULT 0,
  total_emails       INTEGER NOT NULL DEFAULT 0,
  emails_sent        INTEGER NOT NULL DEFAULT 0,
  created_by         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at         TIMESTAMPTZ,
  completed_at       TIMESTAMPTZ
);

CREATE INDEX idx_marketing_campaigns_status ON public.marketing_campaigns(status);
CREATE INDEX idx_marketing_campaigns_type ON public.marketing_campaigns(campaign_type);

COMMENT ON TABLE public.marketing_campaigns IS 'Targeted marketing campaigns with custom filters and touchpoints';
COMMENT ON COLUMN public.marketing_campaigns.filters_applied IS
  'JSON e.g. {"items":["PPE"],"item_match":"exact","companies":[],"exclude_done":true}';

CREATE TRIGGER marketing_campaigns_updated_at
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------

CREATE TABLE public.marketing_touchpoints (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  touchpoint_number INTEGER NOT NULL CHECK (touchpoint_number BETWEEN 1 AND 10),
  template_id       UUID NOT NULL REFERENCES public.marketing_templates(id) ON DELETE RESTRICT,
  schedule_type     TEXT NOT NULL CHECK (schedule_type IN ('immediate', 'weekly', 'monthly', 'custom_days')),
  schedule_value    INTEGER NOT NULL DEFAULT 0,
  delay_days        INTEGER NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT marketing_touchpoints_unique_number UNIQUE (campaign_id, touchpoint_number)
);

CREATE INDEX idx_marketing_touchpoints_campaign ON public.marketing_touchpoints(campaign_id);

COMMENT ON COLUMN public.marketing_touchpoints.schedule_type IS 'immediate | weekly | monthly | custom_days';
COMMENT ON COLUMN public.marketing_touchpoints.schedule_value IS 'Days offset — meaning depends on schedule_type';

-- ---------------------------------------------------------------------------

CREATE TABLE public.marketing_scheduled_emails (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  touchpoint_id     UUID NOT NULL REFERENCES public.marketing_touchpoints(id) ON DELETE CASCADE,
  template_id       UUID NOT NULL REFERENCES public.marketing_templates(id) ON DELETE RESTRICT,
  recipient_email   TEXT NOT NULL,
  company_name      TEXT NOT NULL,
  certificate_ids   UUID[] NOT NULL DEFAULT '{}',
  rendered_subject  TEXT NOT NULL,
  rendered_html     TEXT NOT NULL,
  scheduled_at      TIMESTAMPTZ NOT NULL,
  status            public.email_status NOT NULL DEFAULT 'pending',
  sent_at           TIMESTAMPTZ,
  error_message     TEXT,
  retry_count       INTEGER NOT NULL DEFAULT 0,
  max_retries       INTEGER NOT NULL DEFAULT 3,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT marketing_scheduled_emails_unique_recipient UNIQUE (
    campaign_id,
    touchpoint_id,
    recipient_email
  )
);

CREATE INDEX idx_marketing_scheduled_pending
  ON public.marketing_scheduled_emails(status, scheduled_at)
  WHERE status = 'pending';

CREATE INDEX idx_marketing_scheduled_campaign ON public.marketing_scheduled_emails(campaign_id);
CREATE INDEX idx_marketing_scheduled_touchpoint ON public.marketing_scheduled_emails(touchpoint_id);

CREATE TRIGGER marketing_scheduled_emails_updated_at
  BEFORE UPDATE ON public.marketing_scheduled_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
