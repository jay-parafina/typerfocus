import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client. BYPASSES Row Level Security.
 *
 * NEVER import this from a client component, a client hook, or any file
 * under `src/app/**` that isn't a route handler / server action / server
 * component. The service role key must never reach the browser.
 *
 * Required env var: SUPABASE_SERVICE_ROLE_KEY (server-only — do not prefix
 * with NEXT_PUBLIC_).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
