-- Add study guide fields to support read-aloud, PDF export, and guide view
ALTER TABLE public.topics ADD COLUMN overview TEXT NOT NULL DEFAULT '';
ALTER TABLE public.topics ADD COLUMN key_concepts JSONB NOT NULL DEFAULT '[]';
ALTER TABLE public.sections ADD COLUMN body TEXT NOT NULL DEFAULT '';
