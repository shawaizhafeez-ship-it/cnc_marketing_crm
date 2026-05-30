-- Migration 008: Marketing email templates

CREATE TABLE public.marketing_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  category     public.template_category NOT NULL DEFAULT 'general_marketing',
  subject      TEXT NOT NULL,
  html_content TEXT NOT NULL,
  variables    TEXT[] NOT NULL DEFAULT ARRAY[
    'company_name',
    'contact_person',
    'certificate_no',
    'item',
    'expiry_date',
    'renewal_amount'
  ],
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketing_templates_active ON public.marketing_templates(is_active);
CREATE INDEX idx_marketing_templates_category ON public.marketing_templates(category);

COMMENT ON TABLE public.marketing_templates IS 'HTML email templates with {variable} placeholders';

CREATE TRIGGER marketing_templates_updated_at
  BEFORE UPDATE ON public.marketing_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
