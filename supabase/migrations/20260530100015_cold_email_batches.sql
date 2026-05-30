-- Migration 015: Cold email CSV batches (marketing outreach lists)

ALTER TYPE public.touchpoint_type ADD VALUE IF NOT EXISTS 'cold';

CREATE TABLE public.cold_email_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  subject         TEXT NOT NULL DEFAULT 'Get CE Marking Now',
  html_template   TEXT NOT NULL,
  status          public.campaign_status NOT NULL DEFAULT 'draft',
  total_recipients INTEGER NOT NULL DEFAULT 0,
  emails_sent     INTEGER NOT NULL DEFAULT 0,
  emails_failed   INTEGER NOT NULL DEFAULT 0,
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_cold_email_batches_status ON public.cold_email_batches(status);

CREATE TABLE public.cold_email_recipients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id         UUID NOT NULL REFERENCES public.cold_email_batches(id) ON DELETE CASCADE,
  recipient_email  TEXT NOT NULL,
  company_name     TEXT NOT NULL,
  status           public.email_status NOT NULL DEFAULT 'pending',
  sent_at          TIMESTAMPTZ,
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cold_email_recipients_unique_email UNIQUE (batch_id, recipient_email)
);

CREATE INDEX idx_cold_email_recipients_pending
  ON public.cold_email_recipients(status, created_at)
  WHERE status = 'pending';

CREATE INDEX idx_cold_email_recipients_batch ON public.cold_email_recipients(batch_id);

CREATE TRIGGER cold_email_batches_updated_at
  BEFORE UPDATE ON public.cold_email_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER cold_email_recipients_updated_at
  BEFORE UPDATE ON public.cold_email_recipients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

COMMENT ON TABLE public.cold_email_batches IS 'CSV-upload cold email campaigns via marketing SMTP';
COMMENT ON TABLE public.cold_email_recipients IS 'Recipients queued from uploaded marketing email lists';

ALTER TABLE public.cold_email_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cold_email_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY cold_email_batches_all ON public.cold_email_batches
  FOR ALL
  TO authenticated
  USING (public.is_cnc_user())
  WITH CHECK (public.is_cnc_user());

CREATE POLICY cold_email_recipients_all ON public.cold_email_recipients
  FOR ALL
  TO authenticated
  USING (public.is_cnc_user())
  WITH CHECK (public.is_cnc_user());
