import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movies/service";
import { upsertMovieEmbedding } from "@/services/aiVectorService";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isUserAdmin } from "@/lib/adminConfig";
import { isTimingSafeSecretMatch } from "@/lib/serverAuth";
import { deduplicateMovieItems } from "@/lib/movieMedia";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLogger";

export const maxDuration = 60;

/**
 * Xác thực quyền Quản trị viên (Admin) cho các thao tác nạp vector nhạy cảm:
 * - Cách 1: Header `x-admin-secret` hoặc `Authorization: Bearer <ADMIN_SYNC_SECRET>` khớp với biến môi trường server-side
 * - Cách 2: Header `Authorization: Bearer <Firebase_ID_Token>` từ tài khoản Quản trị viên đã đăng nhập
 */
async function verifyAdminAuth(req: NextRequest): Promise<{ authorized: boolean; error?: string; status: number; userEmail?: string }> {
  const secretHeader = req.headers.get("x-admin-secret")?.trim();
  const authHeader = req.headers.get("authorization")?.trim();
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  // 1. Kiểm tra Admin Secret server-side (Timing-Safe Comparison)
  const envSecret = process.env.ADMIN_SYNC_SECRET?.trim();
  if (envSecret) {
    const isHeaderMatch = secretHeader ? isTimingSafeSecretMatch(secretHeader, envSecret) : false;
    const isBearerMatch = bearerToken ? isTimingSafeSecretMatch(bearerToken, envSecret) : false;
    if (isHeaderMatch || isBearerMatch) {
      return { authorized: true, status: 200, userEmail: "admin_system" };
    }
  }

  // 2. Kiểm tra Firebase ID Token từ người dùng đăng nhập tài khoản Admin
  if (bearerToken && !isTimingSafeSecretMatch(bearerToken, envSecret)) {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
    if (apiKey) {
      try {
        const verifyRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: bearerToken }),
            signal: AbortSignal.timeout(6000),
          }
        );

        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          const email = verifyData.users?.[0]?.email;
          if (email && isUserAdmin(email)) {
            return { authorized: true, status: 200, userEmail: email };
          }
          return {
            authorized: false,
            error: "Tài khoản không có quyền Quản trị viên (Admin)",
            status: 403,
            userEmail: email,
          };
        }
      } catch (err) {
        console.warn("[sync-embeddings] Lỗi xác thực token Firebase:", err);
      }
    }
  }

  return {
    authorized: false,
    error: "Yêu cầu quyền Quản trị viên hợp lệ (Unauthorized)",
    status: 401,
  };
}

export async function GET(req: NextRequest) {
  // 1. Giới hạn tần suất thao tác Admin (30 req / 10 phút / admin)
  const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.ADMIN_MUTATION);
  if (!rateLimit.allowed) {
    logSecurityEvent(req, {
      event: "RATE_LIMIT_EXCEEDED",
      status: 429,
      reason: "Vượt quá giới hạn gọi Admin API",
    });
    return buildRateLimitResponse(rateLimit);
  }

  // 2. Xác thực quyền Admin trước khi thực hiện bất kỳ thao tác nào
  const authResult = await verifyAdminAuth(req);
  if (!authResult.authorized) {
    logSecurityEvent(req, {
      event: authResult.status === 403 ? "FORBIDDEN_ACCESS" : "AUTH_FAILURE",
      status: authResult.status || 401,
      reason: authResult.error || "Không có quyền Admin",
    });
    return NextResponse.json(
      { success: false, error: authResult.error || "Unauthorized" },
      { status: authResult.status || 401 }
    );
  }

  logSecurityEvent(req, {
    event: "ADMIN_ACTION",
    level: "INFO",
    status: 200,
    userId: authResult.userEmail,
    reason: "Thực thi nạp embedding vector",
  });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 30, 100);

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: "Supabase chưa được cấu hình" }, { status: 400 });
  }

  try {
    // 1. Lấy danh sách phim từ Primary Catalog (PhimAPI + NguonC)
    const resPrimary = await movieApi.getMovies({ page: 1, limit, skipKvCache: true });
    const primaryItems = resPrimary?.items || [];
    const combinedCatalog = deduplicateMovieItems(primaryItems);
    const items = combinedCatalog.slice(0, Math.max(limit, 60));

    if (items.length === 0) {
      return NextResponse.json({ success: false, error: "Không tìm thấy phim để nạp vector" });
    }

    // 2. Kiểm tra những phim đã tồn tại vector trong database để bỏ qua ngay (tiết kiệm quota AI & 0ms)
    const slugs = items.map((i: { slug?: string }) => i.slug).filter(Boolean) as string[];
    const { data: existingRows } = await supabaseAdmin
      .from("movie_embeddings")
      .select("id")
      .in("id", slugs);

    const existingIdSet = new Set((existingRows || []).map((r) => r.id));
    const itemsToSync = items.filter((i: { slug?: string }) => i.slug && !existingIdSet.has(i.slug));

    let newlySyncedCount = 0;
    const errors: string[] = [];

    // 3. Nạp song song theo từng batch 5 phim cùng lúc để xử lý siêu tốc (< 2 giây)
    const BATCH_SIZE = 5;
    for (let i = 0; i < itemsToSync.length; i += BATCH_SIZE) {
      const batch = itemsToSync.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (item: {
        slug: string;
        name?: string;
        title?: string;
        origin_name?: string;
        poster_url?: string;
        thumb_url?: string;
        year?: number;
        quality?: string;
        category?: { name?: string }[];
        content?: string;
        description?: string;
      }) => {
        try {
          const ok = await upsertMovieEmbedding({
            slug: item.slug,
            title: item.name || item.title || "",
            originalName: item.origin_name,
            posterUrl: item.poster_url || item.thumb_url || "/default-poster.jpg",
            thumbUrl: item.thumb_url,
            year: item.year,
            quality: item.quality,
            category: item.category?.[0]?.name,
            description: item.content || item.description,
          });
          return { ok, slug: item.slug };
        } catch (err) {
          return { ok: false, slug: item.slug, error: err instanceof Error ? err.message : String(err) };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      for (const res of batchResults) {
        if (res.ok) {
          newlySyncedCount++;
        } else if (res.error) {
          errors.push(`${res.slug}: ${res.error}`);
        }
      }
    }

    const totalAvailable = existingIdSet.size + newlySyncedCount;

    return NextResponse.json({
      success: true,
      totalRequested: items.length,
      alreadyExisted: existingIdSet.size,
      newlySynced: newlySyncedCount,
      syncedCount: totalAvailable,
      message: existingIdSet.size > 0
        ? `Đã nạp ${newlySyncedCount} phim mới (${existingIdSet.size} phim đã có sẵn vector trước đó)`
        : `Đã nạp thành công ${newlySyncedCount} phim`,
      errors: errors.slice(0, 5),
    });
  } catch (error) {
    console.error("[sync-embeddings] Error:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi đồng bộ vector phim" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
