-- Extend reading_sessions to support save/resume progress.
-- Existing rows predate these columns (table was created via the Supabase
-- dashboard, no prior migration), so use ADD COLUMN IF NOT EXISTS and supply
-- defaults that make legacy rows behave as "fresh, never resumed."

ALTER TABLE public.reading_sessions
  ADD COLUMN IF NOT EXISTS source_text       text,
  ADD COLUMN IF NOT EXISTS source_type       text,
  ADD COLUMN IF NOT EXISTS source_filename   text,
  ADD COLUMN IF NOT EXISTS chunk_size        int,
  ADD COLUMN IF NOT EXISTS total_chunks      int,
  ADD COLUMN IF NOT EXISTS current_chunk_index int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at        timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_accessed_at  timestamptz NOT NULL DEFAULT now();

-- Constrain source_type to the two values the app produces. Done as a separate
-- statement so the ALTER above remains idempotent on re-run.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reading_sessions_source_type_check'
  ) THEN
    ALTER TABLE public.reading_sessions
      ADD CONSTRAINT reading_sessions_source_type_check
      CHECK (source_type IS NULL OR source_type IN ('file', 'paste'));
  END IF;
END $$;

-- The saved-readings list orders by last_accessed_at DESC per user.
CREATE INDEX IF NOT EXISTS reading_sessions_user_last_accessed_idx
  ON public.reading_sessions (user_id, last_accessed_at DESC);
