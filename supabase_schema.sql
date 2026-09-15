-- =========================================================
-- NANAFLIX SUPABASE DATABASE SCHEMA MIGRATION
-- =========================================================

-- 1. BẢNG HỒ SƠ NGƯỜI DÙNG (PROFILES)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY, -- Khớp với Auth UID
  email TEXT,
  display_name TEXT DEFAULT 'Thành viên Nanaflix',
  photo_url TEXT,
  custom_avatar TEXT,
  bio TEXT,
  favorite_genres JSONB DEFAULT '[]'::jsonb,
  badges JSONB DEFAULT '[]'::jsonb,
  watch_time_minutes INTEGER DEFAULT 0,
  role TEXT DEFAULT 'member',
  is_comment_restricted BOOLEAN DEFAULT FALSE,
  violations_count INTEGER DEFAULT 0,
  last_violation_reason TEXT,
  last_violation_at BIGINT,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  last_login_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- 2. BẢNG BÌNH LUẬN & ĐÁNH GIÁ PHIM (MOVIE_COMMENTS)
CREATE TABLE IF NOT EXISTS public.movie_comments (
  id TEXT PRIMARY KEY,
  movie_slug TEXT NOT NULL,
  movie_title TEXT,
  user_id TEXT NOT NULL,
  user_name TEXT DEFAULT 'Thành viên',
  user_avatar TEXT,
  user_email TEXT,
  rating INTEGER DEFAULT 5,
  content TEXT NOT NULL,
  episode_slug TEXT,
  episode_name TEXT,
  parent_id TEXT,
  parent_owner_id TEXT,
  reply_to_user_id TEXT,
  reply_to_user_name TEXT,
  is_spoiler BOOLEAN DEFAULT FALSE,
  likes INTEGER DEFAULT 0,
  liked_by JSONB DEFAULT '[]'::jsonb,
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  is_approved BOOLEAN DEFAULT TRUE,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- Index cho tìm kiếm và load nhanh bình luận theo phim
CREATE INDEX IF NOT EXISTS idx_comments_movie_slug ON public.movie_comments(movie_slug);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.movie_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.movie_comments(parent_id);

-- 3. BẢNG LỊCH SỬ XEM PHIM (WATCH_HISTORY)
CREATE TABLE IF NOT EXISTS public.watch_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  poster TEXT,
  episode_name TEXT,
  episode_slug TEXT,
  progress_seconds INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  year INTEGER,
  quality TEXT,
  category TEXT,
  synced_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_watch_history_user_id ON public.watch_history(user_id);

-- 4. BẢNG DANH SÁCH PHIM YÊU THÍCH (WATCHLIST)
CREATE TABLE IF NOT EXISTS public.watchlist (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  poster TEXT,
  year INTEGER,
  quality TEXT,
  category TEXT,
  added_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON public.watchlist(user_id);

-- 5. BẢNG BỘ SƯU TẬP PHIM (COLLECTIONS)
CREATE TABLE IF NOT EXISTS public.collections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT DEFAULT 'Thành viên Nanaflix',
  user_avatar TEXT,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  color_gradient TEXT,
  movies JSONB DEFAULT '[]'::jsonb,
  likes_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_collections_user_id ON public.collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_public ON public.collections(is_public);

-- 6. BẢNG THÔNG BÁO (NOTIFICATIONS)
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT DEFAULT 'comment_reply',
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  movie_slug TEXT,
  comment_id TEXT,
  replier_name TEXT,
  replier_avatar TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- 7. KÍCH HOẠT QUYỀN TRUY CẬP CÔNG KHAI (ROW LEVEL SECURITY POLICIES)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách cho phép đọc & ghi ẩn danh / xác thực qua API Anon Key
DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Profiles" ON public.profiles;
CREATE POLICY "Public Insert Profiles" ON public.profiles FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Profiles" ON public.profiles;
CREATE POLICY "Public Update Profiles" ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public Delete Profiles" ON public.profiles;
CREATE POLICY "Public Delete Profiles" ON public.profiles FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public Read Comments" ON public.movie_comments;
CREATE POLICY "Public Read Comments" ON public.movie_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Comments" ON public.movie_comments;
CREATE POLICY "Public Insert Comments" ON public.movie_comments FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Comments" ON public.movie_comments;
CREATE POLICY "Public Update Comments" ON public.movie_comments FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public Delete Comments" ON public.movie_comments;
CREATE POLICY "Public Delete Comments" ON public.movie_comments FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public Read Watch History" ON public.watch_history;
CREATE POLICY "Public Read Watch History" ON public.watch_history FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Watch History" ON public.watch_history;
CREATE POLICY "Public Insert Watch History" ON public.watch_history FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Watch History" ON public.watch_history;
CREATE POLICY "Public Update Watch History" ON public.watch_history FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public Delete Watch History" ON public.watch_history;
CREATE POLICY "Public Delete Watch History" ON public.watch_history FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public Read Watchlist" ON public.watchlist;
CREATE POLICY "Public Read Watchlist" ON public.watchlist FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Watchlist" ON public.watchlist;
CREATE POLICY "Public Insert Watchlist" ON public.watchlist FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Watchlist" ON public.watchlist;
CREATE POLICY "Public Update Watchlist" ON public.watchlist FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public Delete Watchlist" ON public.watchlist;
CREATE POLICY "Public Delete Watchlist" ON public.watchlist FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public Read Collections" ON public.collections;
CREATE POLICY "Public Read Collections" ON public.collections FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Collections" ON public.collections;
CREATE POLICY "Public Insert Collections" ON public.collections FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Collections" ON public.collections;
CREATE POLICY "Public Update Collections" ON public.collections FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public Delete Collections" ON public.collections;
CREATE POLICY "Public Delete Collections" ON public.collections FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public Read Notifications" ON public.notifications;
CREATE POLICY "Public Read Notifications" ON public.notifications FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Notifications" ON public.notifications;
CREATE POLICY "Public Insert Notifications" ON public.notifications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Notifications" ON public.notifications;
CREATE POLICY "Public Update Notifications" ON public.notifications FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public Delete Notifications" ON public.notifications;
CREATE POLICY "Public Delete Notifications" ON public.notifications FOR DELETE USING (true);

-- BẬT REALTIME CHO CÁC BẢNG CẦN THỜI GIAN THỰC (Bỏ qua lỗi nếu đã add)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'movie_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.movie_comments;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

