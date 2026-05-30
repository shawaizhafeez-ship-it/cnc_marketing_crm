-- Migration 006: Scheduled renewal emails (grouped by recipient + touchpoint)

CREATE TABLE public.scheduled_emails (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id          UUID NOT NULL REFERENCES public.renewal_campaigns(id) ON DELETE CASCADE,
  touchpoint_number    INTEGER NOT NULL CHECK (touchpoint_number BETWEEN 1 AND 3),
  recipient_email      TEXT NOT NULL,
  company_name         TEXT NOT NULL,
  certificate_ids      UUID[] NOT NULL DEFAULT '{}',
  certificate_snapshot JSONB NOT NULL DEFAULT '[]',
  subject              TEXT NOT NULL DEFAULT 'Renewal CE Marking',
  scheduled_at         TIMESTAMPTZ NOT NULL,
  status               public.email_status NOT NULL DEFAULT 'pending',
  sent_at              TIMESTAMPTZ,
  error_message        TEXT,
  retry_count          INTEGER NOT NULL DEFAULT 0,
  max_retries          INTEGER NOT NULL DEFAULT 3,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT scheduled_emails_unique_recipient_touchpoint UNIQUE (
    campaign_id,
    touchpoint_number,
    recipient_email
  )
);

CREATE INDEX idx_scheduled_emails_pending
  ON public.scheduled_emails(status, scheduled_at)
  WHERE status = 'pending';

CREATE INDEX idx_scheduled_emails_campaign ON public.scheduled_emails(campaign_id);
CREATE INDEX idx_scheduled_emails_recipient ON public.scheduled_emails(recipient_email);
CREATE INDEX idx_scheduled_emails_touchpoint ON public.scheduled_emails(campaign_id, touchpoint_number);

COMMENT ON TABLE public.scheduled_emails IS 'One row per recipient per touchpoint — multiple certs grouped in certificate_ids[]';
COMMENT ON COLUMN public.scheduled_emails.certificate_snapshot IS 'Denormalized cert data at schedule time for email rendering';

CREATE TRIGGER scheduled_emails_updated_at
  BEFORE UPDATE ON public.scheduled_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
