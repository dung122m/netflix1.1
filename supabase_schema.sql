-- =========================================================
-- NANAFLIX SUPABASE COMPLETE DATABASE SCHEMA & TRIGGERS
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
  cover_url TEXT,
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

-- 7. BẢNG BÁO CÁO LỖI PHIM (ERROR_REPORTS)
CREATE TABLE IF NOT EXISTS public.error_reports (
  id TEXT PRIMARY KEY,
  movie_slug TEXT NOT NULL,
  movie_title TEXT NOT NULL,
  episode_name TEXT,
  episode_slug TEXT,
  server_name TEXT,
  issue_type TEXT NOT NULL, -- 'broken_link', 'audio', 'subtitle', 'player', 'other'
  description TEXT,
  user_id TEXT,
  user_name TEXT,
  user_email TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'resolved', 'ignored'
  admin_note TEXT,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_error_reports_status ON public.error_reports(status);
CREATE INDEX IF NOT EXISTS idx_error_reports_slug ON public.error_reports(movie_slug);

-- 8. BẢNG THEO DÕI PHIM BỘ (FOLLOWED_SERIES)
CREATE TABLE IF NOT EXISTS public.followed_series (
  id TEXT PRIMARY KEY, -- userId_movieSlug
  user_id TEXT NOT NULL,
  movie_slug TEXT NOT NULL,
  movie_title TEXT NOT NULL,
  poster TEXT,
  last_notified_episode TEXT,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_followed_series_user ON public.followed_series(user_id);
CREATE INDEX IF NOT EXISTS idx_followed_series_slug ON public.followed_series(movie_slug);

-- 9. BẢNG NHẮC LỊCH THỂ THAO & BÓNG ĐÁ (MATCH_REMINDERS)
CREATE TABLE IF NOT EXISTS public.match_reminders (
  id TEXT PRIMARY KEY, -- userId_matchId
  user_id TEXT NOT NULL,
  match_id TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  match_time BIGINT NOT NULL,
  tournament TEXT,
  is_notified BOOLEAN DEFAULT FALSE,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_match_reminders_user ON public.match_reminders(user_id);

-- 10. BẢNG TIẾP TỤC XEM ĐA THIẾT BỊ (DEVICE_HANDOFF)
CREATE TABLE IF NOT EXISTS public.device_handoff (
  id TEXT PRIMARY KEY, -- userId
  user_id TEXT NOT NULL,
  movie_slug TEXT NOT NULL,
  movie_title TEXT NOT NULL,
  poster TEXT,
  episode_slug TEXT,
  episode_name TEXT,
  progress_seconds INTEGER NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  device_name TEXT,
  updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- =========================================================
-- ROW LEVEL SECURITY POLICIES (CẤP QUYỀN TRUY CẬP)
-- =========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followed_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_handoff ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Profiles" ON public.profiles;
CREATE POLICY "Public Insert Profiles" ON public.profiles FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Profiles" ON public.profiles;
CREATE POLICY "Public Update Profiles" ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public Delete Profiles" ON public.profiles;
CREATE POLICY "Public Delete Profiles" ON public.profiles FOR DELETE USING (true);

-- Comments
DROP POLICY IF EXISTS "Public Read Comments" ON public.movie_comments;
CREATE POLICY "Public Read Comments" ON public.movie_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Comments" ON public.movie_comments;
CREATE POLICY "Public Insert Comments" ON public.movie_comments FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Comments" ON public.movie_comments;
CREATE POLICY "Public Update Comments" ON public.movie_comments FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public Delete Comments" ON public.movie_comments;
CREATE POLICY "Public Delete Comments" ON public.movie_comments FOR DELETE USING (true);

-- Watch History
DROP POLICY IF EXISTS "Public Read Watch History" ON public.watch_history;
CREATE POLICY "Public Read Watch History" ON public.watch_history FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Watch History" ON public.watch_history;
CREATE POLICY "Public Insert Watch History" ON public.watch_history FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Watch History" ON public.watch_history;
CREATE POLICY "Public Update Watch History" ON public.watch_history FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public Delete Watch History" ON public.watch_history;
CREATE POLICY "Public Delete Watch History" ON public.watch_history FOR DELETE USING (true);

-- Watchlist
DROP POLICY IF EXISTS "Public Read Watchlist" ON public.watchlist;
CREATE POLICY "Public Read Watchlist" ON public.watchlist FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Watchlist" ON public.watchlist;
CREATE POLICY "Public Insert Watchlist" ON public.watchlist FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Watchlist" ON public.watchlist;
CREATE POLICY "Public Update Watchlist" ON public.watchlist FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public Delete Watchlist" ON public.watchlist;
CREATE POLICY "Public Delete Watchlist" ON public.watchlist FOR DELETE USING (true);

-- Collections
DROP POLICY IF EXISTS "Public Read Collections" ON public.collections;
CREATE POLICY "Public Read Collections" ON public.collections FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Collections" ON public.collections;
CREATE POLICY "Public Insert Collections" ON public.collections FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Collections" ON public.collections;
CREATE POLICY "Public Update Collections" ON public.collections FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public Delete Collections" ON public.collections;
CREATE POLICY "Public Delete Collections" ON public.collections FOR DELETE USING (true);

-- Notifications
DROP POLICY IF EXISTS "Public Read Notifications" ON public.notifications;
CREATE POLICY "Public Read Notifications" ON public.notifications FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Notifications" ON public.notifications;
CREATE POLICY "Public Insert Notifications" ON public.notifications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Notifications" ON public.notifications;
CREATE POLICY "Public Update Notifications" ON public.notifications FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public Delete Notifications" ON public.notifications;
CREATE POLICY "Public Delete Notifications" ON public.notifications FOR DELETE USING (true);

-- Error Reports
DROP POLICY IF EXISTS "Public Read Error Reports" ON public.error_reports;
CREATE POLICY "Public Read Error Reports" ON public.error_reports FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Error Reports" ON public.error_reports;
CREATE POLICY "Public Insert Error Reports" ON public.error_reports FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Error Reports" ON public.error_reports;
CREATE POLICY "Public Update Error Reports" ON public.error_reports FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public Delete Error Reports" ON public.error_reports;
CREATE POLICY "Public Delete Error Reports" ON public.error_reports FOR DELETE USING (true);

-- Followed Series
DROP POLICY IF EXISTS "Public Followed Series" ON public.followed_series;
CREATE POLICY "Public Followed Series" ON public.followed_series FOR ALL USING (true) WITH CHECK (true);

-- Match Reminders
DROP POLICY IF EXISTS "Public Match Reminders" ON public.match_reminders;
CREATE POLICY "Public Match Reminders" ON public.match_reminders FOR ALL USING (true) WITH CHECK (true);

-- Device Handoff
DROP POLICY IF EXISTS "Public Device Handoff" ON public.device_handoff;
CREATE POLICY "Public Device Handoff" ON public.device_handoff FOR ALL USING (true) WITH CHECK (true);

-- =========================================================
-- BẬT REALTIME PUBLICATION CHO CÁC BẢNG
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'movie_comments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.movie_comments;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'error_reports') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.error_reports;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'device_handoff') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.device_handoff;
  END IF;
END $$;

-- =========================================================
-- POSTGRES DATABASE TRIGGERS: TỰ ĐỘNG TẠO THÔNG BÁO KHI REPLY
-- =========================================================
CREATE OR REPLACE FUNCTION public.fn_auto_notify_comment_reply()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id TEXT;
  notif_title TEXT;
  notif_msg TEXT;
BEGIN
  -- Chỉ xử lý nếu đây là một reply và không phải tự reply chính mình
  IF NEW.parent_id IS NOT NULL THEN
    target_user_id := COALESCE(NEW.reply_to_user_id, NEW.parent_owner_id);

    IF target_user_id IS NOT NULL AND target_user_id <> NEW.user_id THEN
      notif_title := COALESCE(NEW.user_name, 'Một thành viên') || ' đã trả lời bình luận của bạn';
      notif_msg := SUBSTRING(NEW.content FROM 1 FOR 120);

      INSERT INTO public.notifications (
        id,
        user_id,
        type,
        title,
        message,
        link,
        movie_slug,
        comment_id,
        replier_name,
        replier_avatar,
        is_read,
        created_at
      ) VALUES (
        'notif_' || (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT || '_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5),
        target_user_id,
        'comment_reply',
        notif_title,
        notif_msg,
        '/movies/' || NEW.movie_slug || '#comment-' || NEW.id,
        NEW.movie_slug,
        NEW.id,
        NEW.user_name,
        NEW.user_avatar,
        FALSE,
        (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_notify_comment_reply ON public.movie_comments;
CREATE TRIGGER trg_auto_notify_comment_reply
AFTER INSERT ON public.movie_comments
FOR EACH ROW
EXECUTE FUNCTION public.fn_auto_notify_comment_reply();

-- =========================================================
-- POSTGRES RPC: FULL-TEXT SEARCH TIẾNG VIỆT SIÊU TỐC
-- =========================================================
CREATE OR REPLACE FUNCTION public.search_comments_fts(search_term TEXT)
RETURNS SETOF public.movie_comments AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.movie_comments
  WHERE content ILIKE '%' || search_term || '%'
     OR movie_title ILIKE '%' || search_term || '%'
     OR user_name ILIKE '%' || search_term || '%'
  ORDER BY created_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.search_collections_fts(search_term TEXT)
RETURNS SETOF public.collections AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.collections
  WHERE is_public = TRUE
    AND (name ILIKE '%' || search_term || '%' OR description ILIKE '%' || search_term || '%')
  ORDER BY created_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

-- =========================================================
-- SUPABASE STORAGE: CẤP QUYỀN CHO BUCKETS AVATARS & COVERS
-- =========================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('collection-covers', 'collection-covers', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public View Avatars" ON storage.objects;
CREATE POLICY "Public View Avatars" ON storage.objects FOR SELECT USING (bucket_id IN ('avatars', 'collection-covers'));

DROP POLICY IF EXISTS "Public Upload Avatars" ON storage.objects;
CREATE POLICY "Public Upload Avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('avatars', 'collection-covers'));

DROP POLICY IF EXISTS "Public Update Avatars" ON storage.objects;
CREATE POLICY "Public Update Avatars" ON storage.objects FOR UPDATE USING (bucket_id IN ('avatars', 'collection-covers'));


