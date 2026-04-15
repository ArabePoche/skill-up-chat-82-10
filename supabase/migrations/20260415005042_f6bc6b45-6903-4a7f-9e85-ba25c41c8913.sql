ALTER TABLE public.school_site_templates 
ADD COLUMN IF NOT EXISTS template_key TEXT UNIQUE;