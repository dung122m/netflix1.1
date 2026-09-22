-- ============================================================================
-- NANAFLIX - MIGRATION KHÓA SUPABASE ROW LEVEL SECURITY (RLS) AN TOÀN
-- ============================================================================
-- Kiến trúc: Hybrid Authentication
--   * User Auth: Firebase Authentication (Client lấy Firebase ID Token)
--   * Database Operations: Next.js Server API Routes + SUPABASE_SERVICE_ROLE_KEY (service_role bypass RLS)
--   * Client Anon Key: Bị khóa 100% quyền WRITE/UPDATE/DELETE trên tất cả các bảng.
--   * Dữ liệu Private: Khóa 100% (Không cho phép anon SELECT/INSERT/UPDATE/DELETE).
--   * Dữ liệu Public: Chỉ cho phép anon SELECT tối thiểu cần thiết cho UI & Realtime Comments.
--
-- QUAN TRỌNG: Script này mang tính idempotent, an toàn để chạy nhiều lần mà không gián đoạn dịch vụ.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- BƯỚC 1: ĐẢM BẢO BẢNG TỒN TẠI & BẬT ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.movies (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  origin_name TEXT,
  thumb_url TEXT,
  poster_url TEXT,
  year INTEGER,
  quality TEXT,
  type TEXT,
  category JSONB DEFAULT '[]'::jsonb,
  country JSONB DEFAULT '[]'::jsonb,
  actors TEXT[] DEFAULT '{}',
  director TEXT[] DEFAULT '{}',
  content TEXT,
  view_count INTEGER DEFAULT 0,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.error_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.followed_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.match_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.device_handoff ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.followed_actors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.movie_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.movie_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.movies ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- BƯỚC 2: XÓA BỎ TOÀN BỘ POLICIES CŨ NGUY HIỂM (USING true / WITH CHECK true)
-- ----------------------------------------------------------------------------

-- 1. Profiles
DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public Read Basic Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public Insert Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public Update Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public Delete Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all for profiles" ON public.profiles;

-- 2. Movie Comments
DROP POLICY IF EXISTS "Public Read Comments" ON public.movie_comments;
DROP POLICY IF EXISTS "Public Read Approved Comments" ON public.movie_comments;
DROP POLICY IF EXISTS "Public Insert Comments" ON public.movie_comments;
DROP POLICY IF EXISTS "Public Update Comments" ON public.movie_comments;
DROP POLICY IF EXISTS "Public Delete Comments" ON public.movie_comments;
DROP POLICY IF EXISTS "Allow all for movie_comments" ON public.movie_comments;

-- 3. Watch History
DROP POLICY IF EXISTS "Public Read Watch History" ON public.watch_history;
DROP POLICY IF EXISTS "Public Insert Watch History" ON public.watch_history;
DROP POLICY IF EXISTS "Public Update Watch History" ON public.watch_history;
DROP POLICY IF EXISTS "Public Delete Watch History" ON public.watch_history;
DROP POLICY IF EXISTS "Allow all for watch_history" ON public.watch_history;

-- 4. Watchlist
DROP POLICY IF EXISTS "Public Read Watchlist" ON public.watchlist;
DROP POLICY IF EXISTS "Public Insert Watchlist" ON public.watchlist;
DROP POLICY IF EXISTS "Public Update Watchlist" ON public.watchlist;
DROP POLICY IF EXISTS "Public Delete Watchlist" ON public.watchlist;
DROP POLICY IF EXISTS "Allow all for watchlist" ON public.watchlist;

-- 5. Collections
DROP POLICY IF EXISTS "Public Read Collections" ON public.collections;
DROP POLICY IF EXISTS "Public Read Public Collections" ON public.collections;
DROP POLICY IF EXISTS "Public Insert Collections" ON public.collections;
DROP POLICY IF EXISTS "Public Update Collections" ON public.collections;
DROP POLICY IF EXISTS "Public Delete Collections" ON public.collections;
DROP POLICY IF EXISTS "Allow all for collections" ON public.collections;

-- 6. Notifications
DROP POLICY IF EXISTS "Public Read Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Public Insert Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Public Update Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Public Delete Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow all for notifications" ON public.notifications;

-- 7. Error Reports
DROP POLICY IF EXISTS "Public Read Error Reports" ON public.error_reports;
DROP POLICY IF EXISTS "Public Insert Error Reports" ON public.error_reports;
DROP POLICY IF EXISTS "Public Update Error Reports" ON public.error_reports;
DROP POLICY IF EXISTS "Public Delete Error Reports" ON public.error_reports;
DROP POLICY IF EXISTS "Allow all for error_reports" ON public.error_reports;

-- 8. Followed Series
DROP POLICY IF EXISTS "Public Followed Series" ON public.followed_series;
DROP POLICY IF EXISTS "Public Read Followed Series" ON public.followed_series;
DROP POLICY IF EXISTS "Public Insert Followed Series" ON public.followed_series;
DROP POLICY IF EXISTS "Public Update Followed Series" ON public.followed_series;
DROP POLICY IF EXISTS "Public Delete Followed Series" ON public.followed_series;
DROP POLICY IF EXISTS "Allow all for followed_series" ON public.followed_series;

-- 9. Match Reminders
DROP POLICY IF EXISTS "Public Match Reminders" ON public.match_reminders;
DROP POLICY IF EXISTS "Public Read Match Reminders" ON public.match_reminders;
DROP POLICY IF EXISTS "Public Insert Match Reminders" ON public.match_reminders;
DROP POLICY IF EXISTS "Public Update Match Reminders" ON public.match_reminders;
DROP POLICY IF EXISTS "Public Delete Match Reminders" ON public.match_reminders;
DROP POLICY IF EXISTS "Allow all for match_reminders" ON public.match_reminders;

-- 10. Device Handoff
DROP POLICY IF EXISTS "Public Device Handoff" ON public.device_handoff;
DROP POLICY IF EXISTS "Public Read Device Handoff" ON public.device_handoff;
DROP POLICY IF EXISTS "Public Insert Device Handoff" ON public.device_handoff;
DROP POLICY IF EXISTS "Public Update Device Handoff" ON public.device_handoff;
DROP POLICY IF EXISTS "Public Delete Device Handoff" ON public.device_handoff;
DROP POLICY IF EXISTS "Allow all for device_handoff" ON public.device_handoff;

-- 11. Analytics Events
DROP POLICY IF EXISTS "Public Insert Analytics" ON public.analytics_events;
DROP POLICY IF EXISTS "Public Read Analytics" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow all for analytics_events" ON public.analytics_events;

-- 12. Movie Embeddings
DROP POLICY IF EXISTS "Public Read Movie Embeddings" ON public.movie_embeddings;
DROP POLICY IF EXISTS "Public Upsert Movie Embeddings" ON public.movie_embeddings;
DROP POLICY IF EXISTS "Public Update Movie Embeddings" ON public.movie_embeddings;
DROP POLICY IF EXISTS "Public Delete Movie Embeddings" ON public.movie_embeddings;
DROP POLICY IF EXISTS "Allow all for movie_embeddings" ON public.movie_embeddings;

-- 13. Movies
DROP POLICY IF EXISTS "Public Read Movies" ON public.movies;
DROP POLICY IF EXISTS "Public Insert Movies" ON public.movies;
DROP POLICY IF EXISTS "Public Update Movies" ON public.movies;
DROP POLICY IF EXISTS "Public Delete Movies" ON public.movies;

-- ----------------------------------------------------------------------------
-- BƯỚC 3: THIẾT LẬP CÁC POLICY SELECT AN TOÀN CHO DỮ LIỆU CÔNG KHAI
-- ----------------------------------------------------------------------------

-- [A] MOVIES: Cho phép đọc danh mục phim công khai
CREATE POLICY "Public Read Movies"
ON public.movies
FOR SELECT
TO anon, authenticated
USING (true);

-- [B] MOVIE_COMMENTS: Cho phép đọc các bình luận đã duyệt, không bị cờ
-- Phục vụ hiển thị bình luận và lắng nghe Realtime postgres_changes
CREATE POLICY "Public Read Approved Comments"
ON public.movie_comments
FOR SELECT
TO anon, authenticated
USING (is_approved = true AND is_flagged = false);

-- [C] COLLECTIONS: Chỉ cho phép đọc các bộ sưu tập được chia sẻ công khai
CREATE POLICY "Public Read Public Collections"
ON public.collections
FOR SELECT
TO anon, authenticated
USING (is_public = true);

-- [D] VIEW PUBLIC_PROFILES (TỐI THIỂU AN TOÀN CHO LEADERBOARD & PROFILE CÔNG KHAI):
-- Loại bỏ hoàn toàn email, favorite_genres, role, created_at, violations_count, last_violation_reason, last_violation_at, is_comment_restricted
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  display_name,
  photo_url,
  custom_avatar,
  bio,
  badges,
  watch_time_minutes
FROM public.profiles;

-- ----------------------------------------------------------------------------
-- BƯỚC 4: BẢNG PRIVATE - KHÔNG CÓ POLICY NÀO CHO ANON (MẶC ĐỊNH BỊ TỪ CHỐI 100%)
-- ----------------------------------------------------------------------------
-- Các bảng sau HOÀN TOÀN KHÔNG có policy nào cho `anon` hoặc `public`:
--   1. public.profiles        -> 100% private (đọc/ghi qua /api/user/profile với Firebase Auth)
--   2. public.watch_history   -> 100% private, truy cập qua /api/user/history
--   3. public.watchlist       -> 100% private, truy cập qua /api/user/watchlist
--   4. public.notifications   -> 100% private, truy cập qua /api/notifications
--   5. public.error_reports   -> 100% private, truy cập qua /api/reports
--   6. public.followed_series -> 100% private, truy cập qua /api/user/series
--   7. public.match_reminders -> 100% private, truy cập qua /api/user/reminders
--   8. public.device_handoff  -> 100% private, truy cập qua /api/user/handoff
--   9. public.followed_actors -> 100% private, truy cập qua /api/user/actors
--  10. public.analytics_events-> 100% private, ghi nhận qua Next.js Server API
--  11. public.movie_embeddings-> 100% private, tìm kiếm & nạp vector qua Server API
--
-- Khi RLS được bật và không có SELECT/INSERT/UPDATE/DELETE policy nào khớp,
-- PostgreSQL sẽ mặc định trả về 0 rows hoặc từ chối mọi thao tác của anon client.

-- ----------------------------------------------------------------------------
-- BƯỚC 5: PHÂN QUYỀN VAI TRÒ (GRANTS & REVOKES)
-- ----------------------------------------------------------------------------

-- 1. Thu hồi toàn bộ quyền GHI/SỬA/XÓA của anon trên toàn bộ public schema
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon;

-- 2. Thu hồi quyền ĐỌC trên TẤT CẢ các bảng nhạy cảm đối với anon
REVOKE SELECT ON TABLE public.profiles FROM anon;
REVOKE SELECT ON TABLE public.watch_history FROM anon;
REVOKE SELECT ON TABLE public.watchlist FROM anon;
REVOKE SELECT ON TABLE public.notifications FROM anon;
REVOKE SELECT ON TABLE public.error_reports FROM anon;
REVOKE SELECT ON TABLE public.followed_series FROM anon;
REVOKE SELECT ON TABLE public.match_reminders FROM anon;
REVOKE SELECT ON TABLE public.device_handoff FROM anon;
REVOKE SELECT ON TABLE public.analytics_events FROM anon;
REVOKE SELECT ON TABLE public.movie_embeddings FROM anon;

-- 3. Cấp quyền ĐỌC công khai có giới hạn theo RLS cho anon
GRANT SELECT ON TABLE public.movies TO anon;
GRANT SELECT ON TABLE public.movie_comments TO anon;
GRANT SELECT ON TABLE public.collections TO anon;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 4. Đảm bảo vai trò service_role (Server API Backend) có toàn quyền không giới hạn
GRANT ALL ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- ============================================================================
-- KẾT THÚC MIGRATION RLS (CHƯA CHẠY PRODUCTION - SẴN SÀNG ĐỂ CHẠY KHI ĐƯỢC PHÊ DUYỆT)
-- ============================================================================
