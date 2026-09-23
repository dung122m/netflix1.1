-- =========================================================
-- BẢNG PHẢN HỒI THÍCH / KHÔNG THÍCH PHIM (USER_REACTIONS)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.user_reactions (
  id TEXT PRIMARY KEY, -- userId_slug
  user_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  reaction TEXT NOT NULL CHECK (reaction IN ('like', 'dislike')),
  title TEXT,
  poster TEXT,
  genre TEXT,
  country TEXT,
  type_name TEXT,
  year INTEGER,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_user_reactions_user ON public.user_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reactions_slug ON public.user_reactions(slug);
CREATE INDEX IF NOT EXISTS idx_user_reactions_user_slug ON public.user_reactions(user_id, slug);
CREATE INDEX IF NOT EXISTS idx_user_reactions_user_updated ON public.user_reactions(user_id, updated_at DESC);

-- RLS POLICIES
ALTER TABLE public.user_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own reactions" ON public.user_reactions;
CREATE POLICY "Users can read own reactions" ON public.user_reactions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own reactions" ON public.user_reactions;
CREATE POLICY "Users can insert own reactions" ON public.user_reactions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own reactions" ON public.user_reactions;
CREATE POLICY "Users can update own reactions" ON public.user_reactions
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own reactions" ON public.user_reactions;
CREATE POLICY "Users can delete own reactions" ON public.user_reactions
  FOR DELETE USING (true);
