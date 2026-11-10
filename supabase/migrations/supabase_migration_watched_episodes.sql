-- Migration: Bổ sung cột watched_episodes vào bảng public.watch_history
-- Lưu trữ vĩnh viễn mảng các tập phim đã xem (tích xanh) trên đám mây Supabase
-- Dung lượng cực kỳ nhẹ (~1KB / phim dài tập), không vượt hạn mức Free Tier của Supabase

ALTER TABLE IF EXISTS public.watch_history 
ADD COLUMN IF NOT EXISTS watched_episodes JSONB DEFAULT '[]'::jsonb;

-- Chỉ mục hỗ trợ truy vấn mảng nhanh chóng nếu cần tìm kiếm tập đã xem
COMMENT ON COLUMN public.watch_history.watched_episodes IS 'Danh sách slug các tập đã xem xong (>= 90%) của bộ phim';
