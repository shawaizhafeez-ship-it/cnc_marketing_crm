-- Migration 011: Helper views

CREATE OR REPLACE VIEW public.v_certificates_active
WITH (security_invoker = true)
AS
SELECT
  id,
  certificate_no,
  company_name,
  item,
  expiry_date,
  recipient_email,
  renewal_amount,
  ops_status,
  contact_person,
  sheet_row_hash,
  last_synced_at,
  created_at,
  updated_at
FROM public.certificates
WHERE lower(trim(ops_status)) <> 'done'
  AND recipient_email IS NOT NULL
  AND trim(recipient_email) <> '';

COMMENT ON VIEW public.v_certificates_active IS
  'Certificates eligible for renewal/marketing — excludes ops_status=done and blank emails';

-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.v_renewal_campaign_stats
WITH (security_invoker = true)
AS
SELECT
  rc.id,
  rc.name,
  rc.description,
  rc.status,
  rc.target_year,
  rc.target_month,
  rc.anchor_date,
  rc.total_certificates,
  rc.total_recipients,
  rc.total_emails_scheduled,
  rc.emails_sent,
  rc.created_by,
  rc.created_at,
  rc.started_at,
  rc.completed_at,
  CASE
    WHEN rc.total_emails_scheduled > 0
    THEN ROUND(100.0 * rc.emails_sent / rc.total_emails_scheduled, 1)
    ELSE 0
  END AS progress_pct,
  COUNT(se.id) FILTER (WHERE se.status = 'pending')  AS pending_count,
  COUNT(se.id) FILTER (WHERE se.status = 'sent')     AS sent_count,
  COUNT(se.id) FILTER (WHERE se.status = 'failed')   AS failed_count,
  COUNT(se.id) FILTER (WHERE se.status = 'skipped')  AS skipped_count,
  COUNT(se.id) FILTER (WHERE se.status = 'cancelled') AS cancelled_count
FROM public.renewal_campaigns rc
LEFT JOIN public.scheduled_emails se ON se.campaign_id = rc.id
GROUP BY rc.id;

COMMENT ON VIEW public.v_renewal_campaign_stats IS
  'Renewal campaign progress with per-status scheduled email counts';

-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.v_marketing_campaign_stats
WITH (security_invoker = true)
AS
SELECT
  mc.id,
  mc.name,
  mc.campaign_type,
  mc.status,
  mc.total_certificates,
  mc.total_recipients,
  mc.total_emails,
  mc.emails_sent,
  mc.filters_applied,
  mc.created_at,
  CASE
    WHEN mc.total_emails > 0
    THEN ROUND(100.0 * mc.emails_sent / mc.total_emails, 1)
    ELSE 0
  END AS progress_pct,
  COUNT(mse.id) FILTER (WHERE mse.status = 'pending') AS pending_count,
  COUNT(mse.id) FILTER (WHERE mse.status = 'failed')  AS failed_count
FROM public.marketing_campaigns mc
LEFT JOIN public.marketing_scheduled_emails mse ON mse.campaign_id = mc.id
GROUP BY mc.id;

COMMENT ON VIEW public.v_marketing_campaign_stats IS
  'Marketing campaign progress with pending/failed email counts';
