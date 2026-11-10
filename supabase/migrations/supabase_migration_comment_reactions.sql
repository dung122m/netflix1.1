-- ============================================================================
-- MIGRATION: BẢNG COMMENT_REACTIONS (TÁCH CẢM XÚC/TIM TRÁNH TRANH CHẤP GHI)
-- Giúp hàng ngàn người dùng có thể cùng lúc thả tim/react mà không gây lock bảng movie_comments
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id TEXT PRIMARY KEY, -- Khóa chính kết hợp: `${comment_id}_${user_id}`
  comment_id TEXT NOT NULL REFERENCES public.movie_comments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'heart',
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  CONSTRAINT uq_comment_user_reaction UNIQUE (comment_id, user_id)
);

-- Chỉ mục hiệu năng cao cho truy vấn theo bình luận hoặc theo tài khoản
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON public.comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON public.comment_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_created_at ON public.comment_reactions(created_at DESC);

-- Bật Row Level Security (RLS)
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

-- 1. Cho phép tất cả người dùng (kể cả khách) đọc dữ liệu reactions
DROP POLICY IF EXISTS "Public Read Comment Reactions" ON public.comment_reactions;
CREATE POLICY "Public Read Comment Reactions" ON public.comment_reactions
  FOR SELECT USING (true);

-- 2. Cho phép người dùng đã xác thực quản lý (thêm/sửa/xóa) reaction của chính mình
DROP POLICY IF EXISTS "Users Manage Own Reactions" ON public.comment_reactions;
CREATE POLICY "Users Manage Own Reactions" ON public.comment_reactions
  FOR ALL USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Cấp quyền truy cập cho vai trò anon, authenticated và service_role
GRANT SELECT ON TABLE public.comment_reactions TO anon;
GRANT ALL ON TABLE public.comment_reactions TO authenticated;
GRANT ALL ON TABLE public.comment_reactions TO service_role;

