-- Migration 014: Add manual email type for one-off sends

ALTER TYPE public.touchpoint_type ADD VALUE IF NOT EXISTS 'manual';

COMMENT ON TYPE public.touchpoint_type IS
  'renewal | marketing | manual — manual for ad-hoc composer sends';
