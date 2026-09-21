import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-Side Supabase Admin Client
 * Dùng SUPABASE_SERVICE_ROLE_KEY cho các tác vụ ghi nhạy cảm trên Server.
 * TUYỆT ĐỐI KHÔNG import vào Client Components ("use client").
 */

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://hbrubnilyefrjtglhyap.supabase.co";

// BẮT BUỘC dùng SUPABASE_SERVICE_ROLE_KEY cho các tác vụ server-side để bypass RLS hợp lệ
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
      serviceRoleKey &&
      supabaseUrl !== "YOUR_SUPABASE_URL" &&
      serviceRoleKey !== "YOUR_SUPABASE_SERVICE_ROLE_KEY"
  );
}

let adminClientInstance: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClientInstance) return adminClientInstance;

  if (!serviceRoleKey) {
    const errorMsg =
      "[supabaseAdmin] FATAL: SUPABASE_SERVICE_ROLE_KEY is missing in environment variables. Refusing to fallback to anon key on server.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  if (!supabaseUrl) {
    const errorMsg = "[supabaseAdmin] FATAL: SUPABASE_URL is missing in environment variables.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  try {
    adminClientInstance = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return adminClientInstance;
  } catch (err) {
    console.error("[supabaseAdmin] Failed to initialize Supabase Admin client:", err);
    throw err;
  }
}


