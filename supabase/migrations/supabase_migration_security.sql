-- =========================================================
-- MIGRATION: BẢNG SECURITY & RATE LIMITS CHO SECURITY CENTER
-- Nanaflix Enterprise Security Engine & Audit Trail
-- =========================================================

-- 1. BẢNG SECURITY_INCIDENTS (Lịch sử các sự kiện rủi ro/cảnh báo)
CREATE TABLE IF NOT EXISTS public.security_incidents (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  anonymous_id TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  risk_score INTEGER NOT NULL DEFAULT 0,
  action_type TEXT NOT NULL, -- 'warning', 'temp_block', 'high_alert', 'blocked_request'
  violation_type TEXT NOT NULL, -- 'rapid_flood', 'duplicate_spam', 'comment_flood', 'xss_pattern', 'sqli_pattern', 'path_traversal', 'auth_abuse'
  reason TEXT NOT NULL,
  endpoint TEXT,
  method TEXT DEFAULT 'POST',
  device_type TEXT DEFAULT 'desktop',
  os TEXT DEFAULT 'Other',
  browser TEXT DEFAULT 'Other',
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'blocked', 'resolved', 'auto_decayed'
  resolved_at BIGINT,
  resolved_by TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_security_incidents_created_at ON public.security_incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_incidents_user_id ON public.security_incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_security_incidents_anon_id ON public.security_incidents(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_security_incidents_ip_hash ON public.security_incidents(ip_hash);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON public.security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_risk ON public.security_incidents(risk_score DESC);

-- 2. BẢNG SECURITY_WARNINGS (Cảnh báo người dùng đang kích hoạt)
CREATE TABLE IF NOT EXISTS public.security_warnings (
  id TEXT PRIMARY KEY,
  target_key TEXT NOT NULL, -- 'user:uid' hoặc 'anon:anon_xxx' hoặc 'ip:hash'
  user_id TEXT,
  anonymous_id TEXT,
  risk_score INTEGER NOT NULL DEFAULT 30,
  message TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_security_warnings_target ON public.security_warnings(target_key);
CREATE INDEX IF NOT EXISTS idx_security_warnings_active ON public.security_warnings(is_active, expires_at);

-- 3. BẢNG SECURITY_RATE_LIMITS (Bộ đếm tần suất phân tán)
CREATE TABLE IF NOT EXISTS public.security_rate_limits (
  id TEXT PRIMARY KEY, -- key băm theo identifier + bucket
  target_key TEXT NOT NULL,
  bucket_start BIGINT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_security_rate_limits_expires ON public.security_rate_limits(expires_at);

-- 4. RLS POLICIES (Bảo vệ dữ liệu nghiêm ngặt)
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;

-- Chỉ Server-side / Service Role mới có quyền truy cập toàn phần
DROP POLICY IF EXISTS "Deny Public Access Incidents" ON public.security_incidents;
DROP POLICY IF EXISTS "Deny Public Access Warnings" ON public.security_warnings;
DROP POLICY IF EXISTS "Deny Public Access Limits" ON public.security_rate_limits;
