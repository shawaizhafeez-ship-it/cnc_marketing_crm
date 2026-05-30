-- Migration 012: Row Level Security (RLS)

-- ---------------------------------------------------------------------------
-- Enable RLS on all public tables
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheet_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renewal_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_scheduled_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_send_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helper: authenticated active @cncservices.net user
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_cnc_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND is_active = true
        AND email ~* '@cncservices\.net$'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_cnc_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_cnc_user()
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    );
$$;

COMMENT ON FUNCTION public.is_cnc_user IS 'True when caller is an active @cncservices.net user';
COMMENT ON FUNCTION public.is_cnc_admin IS 'True when caller is an active CNC admin';

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.is_cnc_admin()
  );

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_admin_update ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_cnc_admin())
  WITH CHECK (public.is_cnc_admin());

-- ---------------------------------------------------------------------------
-- Operational tables — all authenticated CNC users
-- ---------------------------------------------------------------------------

CREATE POLICY certificates_all ON public.certificates
  FOR ALL
  TO authenticated
  USING (public.is_cnc_user())
  WITH CHECK (public.is_cnc_user());

CREATE POLICY renewal_campaigns_all ON public.renewal_campaigns
  FOR ALL
  TO authenticated
  USING (public.is_cnc_user())
  WITH CHECK (public.is_cnc_user());

CREATE POLICY scheduled_emails_all ON public.scheduled_emails
  FOR ALL
  TO authenticated
  USING (public.is_cnc_user())
  WITH CHECK (public.is_cnc_user());

CREATE POLICY email_logs_all ON public.email_logs
  FOR ALL
  TO authenticated
  USING (public.is_cnc_user())
  WITH CHECK (public.is_cnc_user());

CREATE POLICY marketing_templates_all ON public.marketing_templates
  FOR ALL
  TO authenticated
  USING (public.is_cnc_user())
  WITH CHECK (public.is_cnc_user());

CREATE POLICY marketing_campaigns_all ON public.marketing_campaigns
  FOR ALL
  TO authenticated
  USING (public.is_cnc_user())
  WITH CHECK (public.is_cnc_user());

CREATE POLICY marketing_touchpoints_all ON public.marketing_touchpoints
  FOR ALL
  TO authenticated
  USING (public.is_cnc_user())
  WITH CHECK (public.is_cnc_user());

CREATE POLICY marketing_scheduled_all ON public.marketing_scheduled_emails
  FOR ALL
  TO authenticated
  USING (public.is_cnc_user())
  WITH CHECK (public.is_cnc_user());

-- ---------------------------------------------------------------------------
-- Read-only for regular users; writes via service role (cron/sync)
-- ---------------------------------------------------------------------------

CREATE POLICY sheet_sync_logs_select ON public.sheet_sync_logs
  FOR SELECT
  TO authenticated
  USING (public.is_cnc_user());

CREATE POLICY daily_counters_select ON public.daily_send_counters
  FOR SELECT
  TO authenticated
  USING (public.is_cnc_user());

CREATE POLICY app_settings_select ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (public.is_cnc_user());

CREATE POLICY app_settings_admin_update ON public.app_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_cnc_admin())
  WITH CHECK (public.is_cnc_admin());

-- Service role bypasses RLS automatically — used by cron jobs and sheet sync
