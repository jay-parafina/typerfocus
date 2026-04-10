CREATE TABLE public.topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_topics_user_id ON public.topics(user_id);

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own topics"
  ON public.topics FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own topics"
  ON public.topics FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own topics"
  ON public.topics FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own topics"
  ON public.topics FOR DELETE USING (auth.uid() = user_id);


CREATE TABLE public.sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  order_num INTEGER NOT NULL,
  phrases JSONB NOT NULL DEFAULT '[]',
  quiz JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sections_topic_id ON public.sections(topic_id);
CREATE INDEX idx_sections_user_id ON public.sections(user_id);

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sections"
  ON public.sections FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sections"
  ON public.sections FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sections"
  ON public.sections FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sections"
  ON public.sections FOR DELETE USING (auth.uid() = user_id);
