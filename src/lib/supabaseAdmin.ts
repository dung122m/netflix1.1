import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-Side Supabase Admin Client
 * Dùng SUPABASE_SERVICE_ROLE_KEY cho các tác vụ ghi nhạy cảm trên Server.
 * TUYỆT ĐỐI KHÔNG import vào Client Components ("use client").
 */

function resolveSupabaseCredentials(): { url: string; key: string | undefined } | null {
  const isTest = process.env.NODE_ENV === "test" || process.env.APP_ENV === "test";

  if (isTest) {
    const testUrl = process.env.TEST_SUPABASE_URL?.trim();
    const testKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY?.trim();
    const prodUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hbrubnilyefrjtglhyap.supabase.co").trim();

    // In test mode: refuse to connect to production/live database
    if (testUrl && prodUrl && testUrl.toLowerCase() === prodUrl.toLowerCase()) {
      console.warn("[supabaseAdmin Safety Guard] TEST_SUPABASE_URL matches production Supabase URL. Refusing to connect in test mode.");
      return null;
    }
    if (testUrl && testUrl.includes("hbrubnilyefrjtglhyap")) {
      console.warn("[supabaseAdmin Safety Guard] TEST_SUPABASE_URL points to Nanaflix production project. Refusing to connect in test mode.");
      return null;
    }

    if (testUrl && testKey) {
      return { url: testUrl, key: testKey };
    }

    // In test mode without dedicated test credentials: refuse fallback to production credentials
    return null;
  }

  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://hbrubnilyefrjtglhyap.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return { url, key };
}

export function isSupabaseAdminConfigured(): boolean {
  const creds = resolveSupabaseCredentials();
  return Boolean(
    creds?.url &&
      creds?.key &&
      creds.url !== "YOUR_SUPABASE_URL" &&
      creds.key !== "YOUR_SUPABASE_SERVICE_ROLE_KEY"
  );
}

let adminClientInstance: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClientInstance) return adminClientInstance;

  const creds = resolveSupabaseCredentials();
  if (!creds) {
    // In test mode without TEST credentials, return null safely instead of crashing or touching production
    return null;
  }

  const { url, key } = creds;
  if (!key) {
    const errorMsg =
      "[supabaseAdmin] FATAL: SUPABASE_SERVICE_ROLE_KEY is missing in environment variables. Refusing to fallback to anon key on server.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  if (!url) {
    const errorMsg = "[supabaseAdmin] FATAL: SUPABASE_URL is missing in environment variables.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  try {
    adminClientInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
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
    });
    return adminClientInstance;
  } catch (err) {
    console.error("[supabaseAdmin] Failed to initialize Supabase Admin client:", err);
    throw err;
  }
}


