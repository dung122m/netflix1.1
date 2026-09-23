import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyServerAuth } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export interface UserReactionRecord {
  slug: string;
  reaction: "like" | "dislike";
  title?: string;
  poster?: string;
  genre?: string;
  country?: string;
  type_name?: string;
  year?: number;
  updatedAt: number;
}

/**
 * GET /api/user/reactions
 * Lấy danh sách phản hồi (like/dislike) của user đã xác thực
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: true, items: [] });
  }

  const auth = await verifyServerAuth(req);
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const targetUserId = auth.isAdmin && searchParams.get("userId")
      ? searchParams.get("userId")!
      : auth.userId;

    const { data, error } = await supabase
      .from("user_reactions")
      .select("*")
      .eq("user_id", targetUserId)
      .order("updated_at", { ascending: false });

    if (error) {
      // Nếu bảng chưa tồn tại trong Supabase môi trường hiện tại, trả về mảng rỗng nhẹ nhàng
      if (error.code === "42P01") {
        return NextResponse.json({ success: true, items: [] });
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const items: UserReactionRecord[] = (data || []).map((row) => ({
      slug: row.slug,
      reaction: row.reaction as "like" | "dislike",
      title: row.title || undefined,
      poster: row.poster || undefined,
      genre: row.genre || undefined,
      country: row.country || undefined,
      type_name: row.type_name || undefined,
      year: row.year ? Number(row.year) : undefined,
      updatedAt: Number(row.updated_at) || Date.now(),
    }));

    return NextResponse.json({ success: true, items });
  } catch (err) {
    console.error("[Reactions API GET] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/user/reactions
 * Lưu / cập nhật phản hồi của user cho 1 hoặc nhiều phim
 * Body: { slug, reaction: 'like' | 'dislike' | null, title?, poster?, genre?, country?, type_name?, year? }
 * hoặc { items: [...] }
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
    const rawItems = Array.isArray(body.items) ? body.items : [body];
    const userId = auth.userId;
    const now = Date.now();

    // Tách items cần xóa (reaction === null hoặc reaction === "") và items cần upsert
    const toDeleteSlugs: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toUpsertRows: any[] = [];

    for (const item of rawItems) {
      if (!item || !item.slug) continue;
      const slug = String(item.slug).trim();
      const reaction = item.reaction;

      if (!reaction || (reaction !== "like" && reaction !== "dislike")) {
        toDeleteSlugs.push(slug);
      } else {
        toUpsertRows.push({
          id: `${userId}_${slug}`,
          user_id: userId,
          slug,
          reaction,
          title: item.title ? String(item.title) : null,
          poster: item.poster ? String(item.poster) : null,
          genre: item.genre ? String(item.genre) : null,
          country: item.country ? String(item.country) : null,
          type_name: item.type_name ? String(item.type_name) : null,
          year: item.year ? Number(item.year) : null,
          updated_at: item.updatedAt ? Number(item.updatedAt) : now,
        });
      }
    }

    if (toDeleteSlugs.length > 0) {
      const deleteIds = toDeleteSlugs.map((s) => `${userId}_${s}`);
      await supabase.from("user_reactions").delete().in("id", deleteIds).eq("user_id", userId);
    }

    if (toUpsertRows.length > 0) {
      const { error } = await supabase.from("user_reactions").upsert(toUpsertRows, { onConflict: "id" });
      if (error) {
        if (error.code === "42P01") {
          return NextResponse.json({ success: true, count: toUpsertRows.length, fallback: true });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, upserted: toUpsertRows.length, deleted: toDeleteSlugs.length });
  } catch (err) {
    console.error("[Reactions API POST] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * DELETE /api/user/reactions?slug=xxx hoặc ?all=true
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
    const isAll = searchParams.get("all") === "true";
    const slug = searchParams.get("slug");

    if (isAll) {
      const { error } = await supabase.from("user_reactions").delete().eq("user_id", auth.userId);
      if (error && error.code !== "42P01") {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, allCleared: true });
    }

    if (slug) {
      const id = `${auth.userId}_${slug}`;
      const { error } = await supabase.from("user_reactions").delete().eq("id", id).eq("user_id", auth.userId);
      if (error && error.code !== "42P01") {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, slug });
    }

    return NextResponse.json({ error: "Missing slug or all parameter" }, { status: 400 });
  } catch (err) {
    console.error("[Reactions API DELETE] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
