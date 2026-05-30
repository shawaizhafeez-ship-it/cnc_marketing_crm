-- Migration 003: Certificates (synced from Google Sheets)

CREATE TABLE public.certificates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_no   TEXT NOT NULL,
  company_name     TEXT NOT NULL,
  item             TEXT,
  expiry_date      DATE NOT NULL,
  recipient_email  TEXT NOT NULL,
  renewal_amount   NUMERIC(12, 2),
  ops_status       TEXT NOT NULL DEFAULT '',
  contact_person   TEXT,
  sheet_row_hash   TEXT,
  last_synced_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT certificates_certificate_no_unique UNIQUE (certificate_no)
);

CREATE INDEX idx_certificates_expiry ON public.certificates(expiry_date);
CREATE INDEX idx_certificates_email ON public.certificates(recipient_email);
CREATE INDEX idx_certificates_ops_status ON public.certificates(ops_status);
CREATE INDEX idx_certificates_item ON public.certificates(item);
CREATE INDEX idx_certificates_expiry_month ON public.certificates(
  (EXTRACT(YEAR FROM expiry_date)::INTEGER),
  (EXTRACT(MONTH FROM expiry_date)::INTEGER)
);

COMMENT ON TABLE public.certificates IS 'Certificate renewals synced from Google Sheets (Renewals / List Cleaned)';
COMMENT ON COLUMN public.certificates.sheet_row_hash IS 'Hash of row data to detect changes on sync';

CREATE TRIGGER certificates_updated_at
  BEFORE UPDATE ON public.certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
