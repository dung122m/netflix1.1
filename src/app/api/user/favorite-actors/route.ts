import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyServerAuth, getEffectiveTargetUserId } from "@/lib/serverAuth";
import { sanitizeSafeText } from "@/lib/security";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";
import { safeParseJson } from "@/lib/securityValidation";
import { NO_CACHE_HEADERS } from "@/lib/cacheHeaders";
import type { FavoriteActorItem } from "@/services/actor/favoriteActors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const FAVORITE_ACTORS_SETTINGS_KEY = "__favorite_actors";
const MAX_FAVORITE_ACTORS = 200;

function normalizeActorKey(idOrSlug: string | number): string {
  return String(idOrSlug).trim().toLowerCase();
}

function sanitizeActorItem(raw: unknown): FavoriteActorItem | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const rawId = obj.id ?? obj.slug;
  const rawSlug = obj.slug ?? obj.id;
  const rawName = obj.name;

  if (!rawId || !rawSlug || typeof rawName !== "string" || !rawName.trim()) {
    return null;
  }

  const idValue: string | number =
    typeof obj.id === "number" && Number.isFinite(obj.id)
      ? obj.id
      : sanitizeSafeText(String(rawId), 120);
  const slugValue = sanitizeSafeText(String(rawSlug), 160);
  const nameValue = sanitizeSafeText(rawName, 140);

  if (!slugValue || !nameValue) return null;

  const totalMovies =
    typeof obj.totalMovies === "number" && Number.isFinite(obj.totalMovies)
      ? Math.max(0, Math.round(obj.totalMovies))
      : undefined;

  const addedAt =
    typeof obj.addedAt === "number" && Number.isFinite(obj.addedAt)
      ? obj.addedAt
      : Date.now();

  return {
    id: idValue,
    name: nameValue,
    slug: slugValue,
    avatarUrl:
      typeof obj.avatarUrl === "string" && obj.avatarUrl.trim()
        ? obj.avatarUrl.trim().slice(0, 500)
        : null,
    country:
      typeof obj.country === "string" && obj.country.trim()
        ? sanitizeSafeText(obj.country, 80)
        : undefined,
    roles:
      typeof obj.roles === "string" && obj.roles.trim()
        ? sanitizeSafeText(obj.roles, 80)
        : undefined,
    totalMovies,
    addedAt,
  };
}

function extractStoredActors(playerSettings: unknown): FavoriteActorItem[] {
  if (!playerSettings || typeof playerSettings !== "object") return [];
  const rawList = (playerSettings as Record<string, unknown>)[FAVORITE_ACTORS_SETTINGS_KEY];
  if (!Array.isArray(rawList)) return [];

  const result: FavoriteActorItem[] = [];
  const seen = new Set<string>();

  for (const item of rawList) {
    const clean = sanitizeActorItem(item);
    if (!clean) continue;
    const key = normalizeActorKey(clean.id || clean.slug);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }

  return result.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)).slice(0, MAX_FAVORITE_ACTORS);
}

async function persistStoredActors(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  userId: string,
  authEmail: string,
  authDisplayName: string,
  existingRow: { player_settings?: unknown } | null,
  actors: FavoriteActorItem[],
): Promise<{ error?: string }> {
  const now = Date.now();
  const baseSettings =
    existingRow?.player_settings && typeof existingRow.player_settings === "object"
      ? { ...(existingRow.player_settings as Record<string, unknown>) }
      : {};

  baseSettings[FAVORITE_ACTORS_SETTINGS_KEY] = actors.slice(0, MAX_FAVORITE_ACTORS);

  if (existingRow) {
    const { error } = await supabase
      .from("profiles")
      .update({
        player_settings: baseSettings,
        updated_at: now,
      })
      .eq("id", userId);
    return error ? { error: error.message } : {};
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email: authEmail,
      display_name: authDisplayName || "Thành viên Nanaflix",
      player_settings: baseSettings,
      created_at: now,
      last_login_at: now,
      updated_at: now,
    },
    { onConflict: "id" },
  );
  return error ? { error: error.message } : {};
}

/**
 * GET /api/user/favorite-actors
 * Retrieves synced favorite actors for the authenticated user.
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: true, items: [] }, { headers: NO_CACHE_HEADERS });
  }

  const auth = await verifyServerAuth(req);
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.USER_READ, auth.userId);
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }

  try {
    const targetUserId = getEffectiveTargetUserId(auth, req) || auth.userId;
    const { data, error } = await supabase
      .from("profiles")
      .select("player_settings")
      .eq("id", targetUserId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const items = extractStoredActors(data?.player_settings);
    return NextResponse.json({ success: true, items }, { headers: NO_CACHE_HEADERS });
  } catch (err) {
    console.error("[FavoriteActors API GET] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/user/favorite-actors
 * Adds or merges favorite actors into the authenticated user's cloud profile.
 */
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
  }

  const auth = await verifyServerAuth(req);
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.USER_MUTATION, auth.userId);
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }

  try {
    const parseRes = await safeParseJson<Record<string, unknown>>(req, 100 * 1024);
    if (!parseRes.success) {
      return parseRes.response;
    }

    const body = parseRes.data;
    const rawItems = Array.isArray(body.items) ? body.items : [body];
    const incoming = rawItems.map(sanitizeActorItem).filter((x): x is FavoriteActorItem => x !== null);

    if (incoming.length === 0) {
      return NextResponse.json({ success: true, items: [] });
    }

    const { data: existingRow, error: fetchErr } = await supabase
      .from("profiles")
      .select("player_settings")
      .eq("id", auth.userId)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
    }

    const existingActors = extractStoredActors(existingRow?.player_settings);
    const mergedMap = new Map<string, FavoriteActorItem>();

    for (const actor of existingActors) {
      mergedMap.set(normalizeActorKey(actor.id || actor.slug), actor);
    }
    for (const actor of incoming) {
      const idKey = normalizeActorKey(actor.id || actor.slug);
      const slugKey = normalizeActorKey(actor.slug);
      const existingBySlug = Array.from(mergedMap.entries()).find(
        ([k, v]) => k === idKey || normalizeActorKey(v.slug) === slugKey || normalizeActorKey(v.id) === idKey,
      );
      if (existingBySlug) {
        mergedMap.delete(existingBySlug[0]);
      }
      mergedMap.set(idKey, actor);
    }

    const nextActors = Array.from(mergedMap.values())
      .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
      .slice(0, MAX_FAVORITE_ACTORS);

    const persistRes = await persistStoredActors(
      supabase,
      auth.userId,
      auth.email || "",
      auth.displayName || "",
      existingRow,
      nextActors,
    );
    if (persistRes.error) {
      return NextResponse.json({ success: false, error: persistRes.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, items: nextActors }, { headers: NO_CACHE_HEADERS });
  } catch (err) {
    console.error("[FavoriteActors API POST] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * DELETE /api/user/favorite-actors?key=xxx or ?all=true
 * Removes one actor or clears all favorite actors for the authenticated user.
 */
export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
  }

  const auth = await verifyServerAuth(req);
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.USER_MUTATION, auth.userId);
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }

  try {
    const { searchParams } = new URL(req.url);
    const deleteAll = searchParams.get("all") === "true";
    const key = searchParams.get("key")?.trim();

    if (!deleteAll && !key) {
      return NextResponse.json({ error: "Thiếu key hoặc tham số all=true" }, { status: 400 });
    }

    const { data: existingRow, error: fetchErr } = await supabase
      .from("profiles")
      .select("player_settings")
      .eq("id", auth.userId)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
    }

    if (!existingRow) {
      return NextResponse.json({ success: true, items: [] });
    }

    const targetKey = key ? normalizeActorKey(key) : "";
    const nextActors = deleteAll
      ? []
      : extractStoredActors(existingRow.player_settings).filter(
          (item) =>
            normalizeActorKey(item.id) !== targetKey &&
            normalizeActorKey(item.slug) !== targetKey,
        );

    const persistRes = await persistStoredActors(
      supabase,
      auth.userId,
      auth.email || "",
      auth.displayName || "",
      existingRow,
      nextActors,
    );
    if (persistRes.error) {
      return NextResponse.json({ success: false, error: persistRes.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, items: nextActors }, { headers: NO_CACHE_HEADERS });
  } catch (err) {
    console.error("[FavoriteActors API DELETE] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
