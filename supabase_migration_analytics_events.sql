-- =========================================================
-- MIGRATION: TẠO BẢNG PUBLIC.ANALYTICS_EVENTS TRÊN PRODUCTION SUPABASE
-- Khớp chính xác thiết kế schema trong supabase_schema.sql
-- =========================================================

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'movie_view', 'watch_start', 'watch_progress', 'watch_end', 'search'
  movie_slug TEXT,
  movie_title TEXT,
  episode_slug TEXT,
  episode_name TEXT,
  user_id TEXT,
  anonymous_id TEXT NOT NULL,
  device_type TEXT DEFAULT 'desktop', -- 'desktop', 'mobile', 'tablet'
  os TEXT DEFAULT 'Other',
  browser TEXT DEFAULT 'Other',
  screen_res TEXT DEFAULT NULL,
  duration_seconds INTEGER DEFAULT 0,
  progress_seconds INTEGER DEFAULT 0,
  keyword TEXT,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- 2. Indexes cho truy vấn analytics
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_movie_slug ON public.analytics_events(movie_slug);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_anonymous_id ON public.analytics_events(anonymous_id);

-- 3. Row Level Security (RLS)
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Cho phép INSERT sự kiện mới từ Client / Server
DROP POLICY IF EXISTS "Public Insert Analytics" ON public.analytics_events;
CREATE POLICY "Public Insert Analytics" ON public.analytics_events FOR INSERT WITH CHECK (true);

-- Đảm bảo không có policy public SELECT (Chặn hoàn toàn đọc công khai)
DROP POLICY IF EXISTS "Public Read Analytics" ON public.analytics_events;
