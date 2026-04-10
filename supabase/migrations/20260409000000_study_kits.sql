CREATE TABLE public.study_kits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  topic TEXT NOT NULL,
  depth TEXT NOT NULL,
  section_count INTEGER NOT NULL,
  exercise_count INTEGER NOT NULL,
  quiz_count INTEGER NOT NULL,
  guide_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_study_kits_user_id ON public.study_kits(user_id);

ALTER TABLE public.study_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own study kits"
  ON public.study_kits FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study kits"
  ON public.study_kits FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study kits"
  ON public.study_kits FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study kits"
  ON public.study_kits FOR DELETE USING (auth.uid() = user_id);
