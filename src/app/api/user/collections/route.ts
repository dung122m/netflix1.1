import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyServerAuth } from "@/lib/serverAuth";
import { sanitizeSafeText } from "@/lib/security";

export const dynamic = "force-dynamic";

export interface SanitizedMovieItem {
  slug: string;
  title: string;
  poster: string;
  year?: string;
  quality?: string;
  category?: string;
  addedAt: number;
  itemType?: "movie" | "series" | "episode";
  seriesSlug?: string;
  seriesTitle?: string;
  episodeSlug?: string;
  episodeName?: string;
  seasonName?: string;
}

/**
 * Chuẩn hóa và loại bỏ phim trùng slug ở cấp độ Server API
 * - Chuẩn hóa slug (trim, case-insensitive khi kiểm tra trùng)
 * - Bảo tồn thứ tự phim xuất hiện ban đầu
 * - Giữ trọn vẹn metadata hợp lệ (poster, year, quality, category, addedAt, itemType, seriesSlug, episodeSlug...)
 * - Loại bỏ các item rỗng hoặc thiếu slug/title
 */
export function sanitizeAndDeduplicateMovies(rawMovies: unknown): SanitizedMovieItem[] {
  if (!Array.isArray(rawMovies)) return [];

  const seenSlugs = new Set<string>();
  const sanitized: SanitizedMovieItem[] = [];

  for (const item of rawMovies) {
    if (!item || typeof item !== "object") continue;
    const m = item as Record<string, unknown>;

    const slug = String(m.slug || "").trim();
    const title = String(m.title || "").trim();
    if (!slug || !title) continue;

    const normalizedKey = slug.toLowerCase();
    if (seenSlugs.has(normalizedKey)) {
      continue; // Đã có trong danh sách, bỏ qua để chống trùng
    }
    seenSlugs.add(normalizedKey);

    const poster = String(m.poster || m.posterUrl || m.poster_url || m.thumb_url || "/default-poster.jpg").trim();
    const year = m.year !== undefined && m.year !== null ? String(m.year).trim() : undefined;
    const quality = m.quality ? String(m.quality).trim() : undefined;
    const category = m.category ? String(m.category).trim() : undefined;
    const addedAt = Number(m.addedAt ?? m.added_at) || Date.now();

    const itemType = m.itemType && ["movie", "series", "episode"].includes(String(m.itemType))
      ? (String(m.itemType) as "movie" | "series" | "episode")
      : (slug.includes("__ep__") ? "episode" : undefined);
    const seriesSlug = m.seriesSlug
      ? String(m.seriesSlug).trim()
      : (slug.includes("__ep__") ? slug.split("__ep__")[0] : undefined);
    const seriesTitle = m.seriesTitle ? sanitizeSafeText(String(m.seriesTitle), 200) : undefined;
    const episodeSlug = m.episodeSlug
      ? String(m.episodeSlug).trim()
      : (slug.includes("__ep__") ? slug.split("__ep__")[1] : undefined);
    const episodeName = m.episodeName ? sanitizeSafeText(String(m.episodeName), 100) : undefined;
    const seasonName = m.seasonName ? sanitizeSafeText(String(m.seasonName), 100) : undefined;

    sanitized.push({
      slug,
      title: sanitizeSafeText(title, 200),
      poster,
      year: year || undefined,
      quality: quality || undefined,
      category: category || undefined,
      addedAt,
      itemType,
      seriesSlug,
      seriesTitle,
      episodeSlug,
      episodeName,
      seasonName,
    });
  }

  return sanitized;
}

function formatCollectionResponse(row: Record<string, unknown>) {
  const now = Date.now();
  return {
    id: String(row.id || ""),
    userId: String(row.user_id || row.userId || ""),
    user_id: String(row.user_id || row.userId || ""),
    creatorName: String(row.user_name || row.creatorName || "Thành viên Nanaflix"),
    user_name: String(row.user_name || row.creatorName || "Thành viên Nanaflix"),
    creatorPhoto: row.user_avatar ? String(row.user_avatar) : (row.creatorPhoto ? String(row.creatorPhoto) : undefined),
    user_avatar: row.user_avatar || null,
    name: String(row.name || ""),
    description: row.description ? String(row.description) : "",
    isPublic: Boolean(row.is_public ?? row.isPublic ?? true),
    is_public: Boolean(row.is_public ?? row.isPublic ?? true),
    colorGradient: (row.color_gradient || row.colorGradient || null) as string | null,
    color_gradient: (row.color_gradient || row.colorGradient || null) as string | null,
    coverUrl: (row.cover_url || row.coverUrl || null) as string | null,
    cover_url: (row.cover_url || row.coverUrl || null) as string | null,
    movies: Array.isArray(row.movies) ? row.movies : [],
    likesCount: Number(row.likes_count ?? row.likesCount ?? 0),
    likes_count: Number(row.likes_count ?? row.likesCount ?? 0),
    viewsCount: Number(row.views_count ?? row.viewsCount ?? 0),
    views_count: Number(row.views_count ?? row.viewsCount ?? 0),
    createdAt: Number(row.created_at ?? row.createdAt) || now,
    created_at: Number(row.created_at ?? row.createdAt) || now,
    updatedAt: Number(row.updated_at ?? row.updatedAt) || now,
    updated_at: Number(row.updated_at ?? row.updatedAt) || now,
  };
}

/**
 * GET /api/user/collections
 * - ?id=xxx: Lấy chi tiết bộ sưu tập (nếu public hoặc là owner/admin)
 * - Mặc định: Lấy danh sách bộ sưu tập của chính user đã đăng nhập
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: true, items: [] });
  }

  const { searchParams } = new URL(req.url);
  const collectionId = searchParams.get("id");
  const auth = await verifyServerAuth(req);

  try {
    if (collectionId) {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("id", collectionId)
        .maybeSingle();

      if (error || !data) {
        return NextResponse.json({ success: false, error: "Không tìm thấy bộ sưu tập" }, { status: 404 });
      }

      // Cho phép xem nếu là public HOẶC là chủ sở hữu HOẶC là Admin
      const isOwner = auth.isAuthenticated && auth.userId === data.user_id;
      const isPublic = Boolean(data.is_public);
      if (!isPublic && !isOwner && !auth.isAdmin) {
        return NextResponse.json({ error: "Forbidden: Bộ sưu tập riêng tư" }, { status: 403 });
      }

      return NextResponse.json({ success: true, item: formatCollectionResponse(data) });
    }

    if (searchParams.get("public") === "true") {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      const items = (data || []).map(formatCollectionResponse);
      return NextResponse.json({ success: true, items });
    }

    if (searchParams.get("all") === "true") {
      if (!auth.isAuthenticated || !auth.isAdmin) {
        return NextResponse.json({ error: "Forbidden: Yêu cầu quyền Quản trị viên" }, { status: 403 });
      }
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      const items = (data || []).map(formatCollectionResponse);
      return NextResponse.json({ success: true, items });
    }

    const targetUserId = searchParams.get("userId");
    if (targetUserId) {
      const isSelfOrAdmin = auth.isAuthenticated && (auth.isAdmin || auth.userId === targetUserId);
      let query = supabase.from("collections").select("*").eq("user_id", targetUserId);
      if (!isSelfOrAdmin) {
        query = query.eq("is_public", true);
      }
      query = query.order("updated_at", { ascending: false });
      const { data, error } = await query;
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      const items = (data || []).map(formatCollectionResponse);
      return NextResponse.json({ success: true, items });
    }

    // Lấy danh sách bộ sưu tập của chính user
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("collections")
      .select("*")
      .eq("user_id", auth.userId)
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const items = (data || []).map(formatCollectionResponse);
    return NextResponse.json({ success: true, items });
  } catch (err) {
    console.error("[Collections API GET] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/user/collections
 * Tạo hoặc cập nhật bộ sưu tập (Xác thực quyền sở hữu server-side)
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

  try {
    const body = await req.json();
    const id = body.id;
    const name = body.name;
    const description = body.description;
    const isPublic = body.isPublic !== undefined ? body.isPublic : (body.is_public !== undefined ? body.is_public : true);
    const colorGradient = body.colorGradient || body.color_gradient || null;
    const coverUrl = body.coverUrl || body.cover_url || null;
    const movies = sanitizeAndDeduplicateMovies(body.movies);
    const clientCreatedAt = body.createdAt || body.created_at;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Tên bộ sưu tập không được để trống" }, { status: 400 });
    }

    const userId = auth.userId;
    const now = Date.now();
    const collectionId = id || `col_${userId}_${now}`;

    // Kiểm tra bản ghi đã tồn tại trong DB
    let existingRecord: { user_id: string; created_at?: number | string | null } | null = null;
    if (id) {
      const { data: existing } = await supabase
        .from("collections")
        .select("user_id, created_at")
        .eq("id", id)
        .maybeSingle();

      existingRecord = existing;

      if (existing && existing.user_id !== userId && !auth.isAdmin) {
        return NextResponse.json(
          { error: "Forbidden: Bạn không có quyền chỉnh sửa bộ sưu tập này" },
          { status: 403 }
        );
      }
    }

    // Bảo tồn created_at: Nếu đã tồn tại thì giữ nguyên, nếu tạo mới thì lấy clientCreatedAt hoặc now
    const createdAt = existingRecord?.created_at
      ? Number(existingRecord.created_at)
      : (Number(clientCreatedAt) || now);

    const payload = {
      id: collectionId,
      user_id: userId,
      user_name: sanitizeSafeText(auth.displayName || "Thành viên Nanaflix", 100),
      user_avatar: auth.photoUrl || null,
      name: sanitizeSafeText(name, 120),
      description: description ? sanitizeSafeText(description, 500) : null,
      is_public: Boolean(isPublic),
      color_gradient: colorGradient || null,
      cover_url: coverUrl || null,
      movies,
      created_at: createdAt,
      updated_at: now,
    };

    const { error } = await supabase.from("collections").upsert(payload, { onConflict: "id" });
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: collectionId, item: formatCollectionResponse(payload) });
  } catch (err) {
    console.error("[Collections API POST] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * DELETE /api/user/collections?id=xxx
 * Xóa bộ sưu tập (Chỉ chủ sở hữu hoặc Admin mới có quyền)
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

  try {
    const { searchParams } = new URL(req.url);
    const collectionId = searchParams.get("id");
    if (!collectionId) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("collections")
      .select("user_id")
      .eq("id", collectionId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ success: true, message: "Collection already deleted" });
    }

    if (existing.user_id !== auth.userId && !auth.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Bạn không có quyền xóa bộ sưu tập này" },
        { status: 403 }
      );
    }

    const { error } = await supabase.from("collections").delete().eq("id", collectionId);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: collectionId });
  } catch (err) {
    console.error("[Collections API DELETE] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
