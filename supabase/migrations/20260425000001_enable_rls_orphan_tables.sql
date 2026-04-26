-- Enable RLS on tables that exist in the public schema but have no policies.
-- These tables are not referenced anywhere in the TyperFocus codebase (orphan
-- tables from a prior app on the same Supabase project). Enabling RLS with no
-- policies = default deny for anon and authenticated roles. Service role still
-- bypasses RLS, so any caller using the service-role key continues to work.
--
-- Resolves Supabase Advisor lint: rls_disabled_in_public (7 errors).

ALTER TABLE public.releases          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_tracks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listen_events     ENABLE ROW LEVEL SECURITY;
