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
