-- Migration 001: Extensions and enums
-- CNC Services CRM — run in Supabase SQL Editor or via `supabase db push`

-- gen_random_uuid() is built into Postgres 13+ / Supabase (pgcrypto)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- pg_cron is optional — enable via Supabase Dashboard → Database → Extensions if needed
-- CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE public.user_role AS ENUM ('admin', 'user');

CREATE TYPE public.campaign_status AS ENUM (
  'draft',
  'active',
  'paused',
  'completed',
  'cancelled'
);

CREATE TYPE public.email_status AS ENUM (
  'pending',
  'sent',
  'failed',
  'skipped',
  'cancelled'
);

CREATE TYPE public.touchpoint_type AS ENUM ('renewal', 'marketing');

CREATE TYPE public.template_category AS ENUM (
  'product_updates',
  'compliance_news',
  'general_marketing',
  'announcements',
  'renewals',
  'custom'
);

CREATE TYPE public.campaign_type AS ENUM (
  'marketing',
  'newsletter',
  'product_update',
  'compliance_alert',
  'general'
);

CREATE TYPE public.sync_status AS ENUM ('success', 'failed', 'partial');
