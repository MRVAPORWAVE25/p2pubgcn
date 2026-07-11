
CREATE TABLE public.sight_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  title TEXT NOT NULL,
  description TEXT,
  homepage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sight_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sight_posts TO authenticated;
GRANT ALL ON public.sight_posts TO service_role;

ALTER TABLE public.sight_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read posts" ON public.sight_posts
  FOR SELECT USING (true);
CREATE POLICY "Authors can insert their posts" ON public.sight_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authors can update their posts" ON public.sight_posts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authors can delete their posts" ON public.sight_posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_sight_posts_updated_at
BEFORE UPDATE ON public.sight_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
