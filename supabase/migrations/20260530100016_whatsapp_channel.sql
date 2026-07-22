-- Migration 016: WhatsApp delivery channel for renewal reminders
--
-- Adds a second delivery channel (WhatsApp via Meta Cloud API) alongside email.
-- Renewal touchpoints can now be scheduled per-channel; the same 3-touchpoint
-- pipeline and send-renewals cron process both channels.

-- Delivery channel enum (email today, whatsapp added here)
CREATE TYPE public.delivery_channel AS ENUM ('email', 'whatsapp');

-- Client phone number, synced from the sheet's TEL column, normalized to E.164.
ALTER TABLE public.certificates
  ADD COLUMN phone TEXT;

COMMENT ON COLUMN public.certificates.phone IS 'WhatsApp/mobile number in E.164 (e.g. +923001234567), synced & normalized from the sheet TEL column; NULL if absent/unparseable';

-- Channel + denormalized destination on scheduled rows.
ALTER TABLE public.scheduled_emails
  ADD COLUMN channel public.delivery_channel NOT NULL DEFAULT 'email',
  ADD COLUMN recipient_phone TEXT;

COMMENT ON COLUMN public.scheduled_emails.channel IS 'Delivery channel for this touchpoint row';
COMMENT ON COLUMN public.scheduled_emails.recipient_phone IS 'Denormalized E.164 destination for whatsapp channel rows';

-- The uniqueness of a touchpoint is now per-channel (email + whatsapp can coexist).
ALTER TABLE public.scheduled_emails
  DROP CONSTRAINT scheduled_emails_unique_recipient_touchpoint;

ALTER TABLE public.scheduled_emails
  ADD CONSTRAINT scheduled_emails_unique_recipient_touchpoint UNIQUE (
    campaign_id,
    touchpoint_number,
    recipient_email,
    channel
  );

-- Channel on the audit log so email vs whatsapp sends are distinguishable.
ALTER TABLE public.email_logs
  ADD COLUMN channel public.delivery_channel NOT NULL DEFAULT 'email';

COMMENT ON COLUMN public.email_logs.channel IS 'Delivery channel of the logged send';
