-- Migration 004: Google Sheets sync logs

CREATE TABLE public.sheet_sync_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status          public.sync_status NOT NULL,
  rows_processed  INTEGER NOT NULL DEFAULT 0,
  rows_inserted   INTEGER NOT NULL DEFAULT 0,
  rows_updated    INTEGER NOT NULL DEFAULT 0,
  rows_skipped    INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_sheet_sync_logs_started_at ON public.sheet_sync_logs(started_at DESC);

COMMENT ON TABLE public.sheet_sync_logs IS 'Audit log for Google Sheets → certificates sync jobs';
