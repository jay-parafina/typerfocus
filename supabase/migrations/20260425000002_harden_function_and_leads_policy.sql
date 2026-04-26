-- Fix Supabase Advisor: function_search_path_mutable on handle_new_user.
-- Pinning search_path to '' forces fully-qualified names and prevents schema
-- shadowing attacks against this SECURITY DEFINER function. The body already
-- qualifies public.profiles, so empty search_path works.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- Fix Supabase Advisor: rls_enabled_no_policy on public.leads.
-- This policy makes the existing intent explicit: only the service-role
-- client (which bypasses RLS) may read or write leads. anon and authenticated
-- get zero access. Behavior is unchanged from "RLS enabled, no policies".
CREATE POLICY "service role only" ON public.leads
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);
