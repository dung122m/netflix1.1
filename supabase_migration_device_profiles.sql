-- =========================================================
-- MIGRATION: TẠO BẢNG PUBLIC.DEVICE_PROFILES
-- Unified Device Profile cho Nanaflix (Guest + User)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.device_profiles (
  id TEXT PRIMARY KEY, -- Primary Key: guest_id (1 profile per browser installation)
  guest_id TEXT NOT NULL UNIQUE,
  user_id TEXT,
  device_type TEXT DEFAULT 'desktop', -- 'desktop', 'mobile', 'tablet'
  browser TEXT NOT NULL DEFAULT 'Other',
  os TEXT NOT NULL DEFAULT 'Other',
  platform TEXT DEFAULT 'unknown',
  language TEXT DEFAULT 'vi-VN',
  country TEXT, -- Approximate Country (e.g. 'Vietnam', 'United States')
  country_code TEXT, -- ISO Alpha-2 (e.g. 'VN', 'US')
  region TEXT, -- Province / State / Region (e.g. 'Hanoi', 'California')
  city TEXT, -- Approximate City (e.g. 'Hanoi', 'Ho Chi Minh City')
  timezone TEXT DEFAULT 'Asia/Ho_Chi_Minh',
  screen_width INTEGER DEFAULT 0,
  screen_height INTEGER DEFAULT 0,
  viewport_width INTEGER DEFAULT 0,
  viewport_height INTEGER DEFAULT 0,
  pixel_ratio NUMERIC DEFAULT 1,
  touch BOOLEAN DEFAULT FALSE,
  device_memory NUMERIC,
  hardware_concurrency INTEGER,
  network_effective_type TEXT DEFAULT 'unknown',
  network_downlink NUMERIC,
  network_rtt INTEGER,
  network_save_data BOOLEAN DEFAULT FALSE,
  prefers_dark BOOLEAN DEFAULT TRUE,
  prefers_reduced_motion BOOLEAN DEFAULT FALSE,
  codec_h264 BOOLEAN DEFAULT TRUE,
  codec_hevc BOOLEAN DEFAULT FALSE,
  codec_av1 BOOLEAN DEFAULT FALSE,
  user_agent TEXT,
  first_seen BIGINT NOT NULL,
  last_seen BIGINT NOT NULL
);

-- Xóa cột ip nếu bảng đã được tạo trước đó (IP chỉ dùng transient cho rate-limiting)
ALTER TABLE public.device_profiles DROP COLUMN IF EXISTS ip;

-- Thêm các cột vị trí ước lượng nếu bảng đã tồn tại từ trước
ALTER TABLE public.device_profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.device_profiles ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE public.device_profiles ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE public.device_profiles ADD COLUMN IF NOT EXISTS city TEXT;

-- Indexes cho aggregation truy vấn
CREATE INDEX IF NOT EXISTS idx_device_profiles_guest_id ON public.device_profiles(guest_id);
CREATE INDEX IF NOT EXISTS idx_device_profiles_user_id ON public.device_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_device_profiles_country ON public.device_profiles(country);
CREATE INDEX IF NOT EXISTS idx_device_profiles_city ON public.device_profiles(city);
CREATE INDEX IF NOT EXISTS idx_device_profiles_last_seen ON public.device_profiles(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_device_profiles_device_type ON public.device_profiles(device_type);
CREATE INDEX IF NOT EXISTS idx_device_profiles_browser ON public.device_profiles(browser);
CREATE INDEX IF NOT EXISTS idx_device_profiles_os ON public.device_profiles(os);

-- Row Level Security (RLS)
ALTER TABLE public.device_profiles ENABLE ROW LEVEL SECURITY;

-- Cho phép insert / update từ server / public client
DROP POLICY IF EXISTS "Public Upsert Device Profiles" ON public.device_profiles;
CREATE POLICY "Public Upsert Device Profiles" ON public.device_profiles
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Update Device Profiles" ON public.device_profiles;
CREATE POLICY "Public Update Device Profiles" ON public.device_profiles
  FOR UPDATE USING (true);
