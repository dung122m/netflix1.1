/**
 * Zero-dependency Supabase runtime configuration and readiness check.
 * Kept separate from `supabase.ts` so UI/auth consumers that only check
 * `isSupabaseConfigured()` do not pull `@supabase/supabase-js` into client bundles.
 */
export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://hbrubnilyefrjtglhyap.supabase.co";

export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "sb_publishable_qwXQaLG4kfMu41kixCllkA_YZmpM7XN";

export const isSupabaseConfigured = (): boolean =>
  Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      supabaseUrl !== "YOUR_SUPABASE_URL" &&
      supabaseAnonKey !== "YOUR_SUPABASE_KEY"
  );
