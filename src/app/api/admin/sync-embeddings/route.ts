import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movieApi";
import { upsertMovieEmbedding } from "@/services/aiVectorService";
import { supabase } from "@/lib/supabase";
import { isUserAdmin } from "@/lib/adminConfig";

export const maxDuration = 60;

/**
 * Xác thực quyền Quản trị viên (Admin) cho các thao tác nạp vector nhạy cảm:
 * - Cách 1: Header `x-admin-secret` hoặc `Authorization: Bearer <ADMIN_SYNC_SECRET>` khớp với biến môi trường server-side
 * - Cách 2: Header `Authorization: Bearer <Firebase_ID_Token>` từ tài khoản Quản trị viên đã đăng nhập
 */
async function verifyAdminAuth(req: NextRequest): Promise<{ authorized: boolean; error?: string; status: number }> {
  const secretHeader = req.headers.get("x-admin-secret")?.trim();
  const authHeader = req.headers.get("authorization")?.trim();
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  // 1. Kiểm tra Admin Secret server-side
  const envSecret = process.env.ADMIN_SYNC_SECRET?.trim();
  if (envSecret && (secretHeader === envSecret || bearerToken === envSecret)) {
    return { authorized: true, status: 200 };
  }

  // 2. Kiểm tra Firebase ID Token từ người dùng đăng nhập tài khoản Admin
  if (bearerToken && bearerToken !== envSecret) {
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
            return { authorized: true, status: 200 };
          }
          return {
            authorized: false,
            error: "Tài khoản không có quyền Quản trị viên (Admin)",
            status: 403,
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
  // Xác thực quyền Admin trước khi thực hiện bất kỳ thao tác nào
  const authResult = await verifyAdminAuth(req);
  if (!authResult.authorized) {
    return NextResponse.json(
      { success: false, error: authResult.error || "Unauthorized" },
      { status: authResult.status || 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 30, 100);

  if (!supabase) {
    return NextResponse.json({ success: false, error: "Supabase chưa được cấu hình" }, { status: 400 });
  }

  try {
    // 1. Lấy danh sách phim hot / mới nhất
    const res = await movieApi.getMovies({ page: 1, limit });
    const items = res?.items || [];

    if (items.length === 0) {
      return NextResponse.json({ success: false, error: "Không tìm thấy phim để nạp vector" });
    }

    // 2. Kiểm tra những phim đã tồn tại vector trong database để bỏ qua ngay (tiết kiệm quota AI & 0ms)
    const slugs = items.map((i: { slug?: string }) => i.slug).filter(Boolean) as string[];
    const { data: existingRows } = await supabase
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
