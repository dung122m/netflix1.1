import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  supabaseUrl,
  supabaseAnonKey,
  isSupabaseConfigured,
} from "./supabaseConfig";

export { supabaseUrl, supabaseAnonKey, isSupabaseConfigured };

// Chỉ tạo client thực tế nếu URL và Key hợp lệ để tránh crash ứng dụng khi chạy ở chế độ Local
export const supabase: SupabaseClient = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (createClient(
      "https://placeholder-project.supabase.co",
      "placeholder-anon-key-must-be-long-enough"
    ) as SupabaseClient);
