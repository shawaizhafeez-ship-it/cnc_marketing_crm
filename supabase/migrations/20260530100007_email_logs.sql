-- Migration 007: Email send logs (renewal, marketing, manual)

CREATE TABLE public.email_logs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type         public.touchpoint_type NOT NULL,
  campaign_id        UUID,
  scheduled_email_id UUID,
  recipient_email    TEXT NOT NULL,
  company_name       TEXT,
  subject            TEXT NOT NULL,
  certificate_count  INTEGER NOT NULL DEFAULT 0,
  status             public.email_status NOT NULL,
  error_message      TEXT,
  smtp_message_id    TEXT,
  sent_by            UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sent_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata           JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_email_logs_type ON public.email_logs(email_type);
CREATE INDEX idx_email_logs_sent_at ON public.email_logs(sent_at DESC);
CREATE INDEX idx_email_logs_recipient ON public.email_logs(recipient_email);
CREATE INDEX idx_email_logs_campaign ON public.email_logs(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_email_logs_status ON public.email_logs(status);

COMMENT ON TABLE public.email_logs IS 'Audit log for all sent/failed/skipped emails';
COMMENT ON COLUMN public.email_logs.campaign_id IS 'References renewal_campaigns.id or marketing_campaigns.id (polymorphic)';
COMMENT ON COLUMN public.email_logs.scheduled_email_id IS 'References scheduled_emails.id or marketing_scheduled_emails.id (polymorphic)';
