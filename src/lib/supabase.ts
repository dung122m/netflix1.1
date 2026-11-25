import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  supabaseUrl,
  supabaseAnonKey,
  isSupabaseConfigured,
} from "./supabaseConfig";

export { isSupabaseConfigured };

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        fetch: (input, init) => {
          const timeoutSignal = AbortSignal.timeout(8000);
          const signal = init?.signal
            ? AbortSignal.any([init.signal, timeoutSignal])
            : timeoutSignal;
          return fetch(input, { ...init, signal });
        },
      },
    })
  : null;
