import { NextRequest, NextResponse } from "next/server";
import { checkContentModeration } from "@/lib/contentModeration";
import { sanitizeSafeText } from "@/lib/security";
import {
  getMovieCommentsSupabase,
  getAllCommentsSupabase,
  getUserCommentsSupabase,
  getCommentRepliesSupabase,
  postCommentSupabase,
  togglePinCommentSupabase,
  updateCommentSupabase,
  deleteCommentSupabase,
} from "@/services/supabaseService";
import { isSupabaseConfigured } from "@/lib/supabase";
import { MovieComment } from "@/types/comment";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/**
 * GET /api/comments?movieSlug=xxx
 * Lấy bình luận trực tiếp từ Supabase
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const movieSlug = searchParams.get("movieSlug");
  const parentId = searchParams.get("parentId");
  const userId = searchParams.get("userId");
  const all = searchParams.get("all");

  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, items: [] });
    }

    let supaItems: MovieComment[] = [];
    if (all === "true") {
      supaItems = await getAllCommentsSupabase();
    } else if (movieSlug) {
      supaItems = await getMovieCommentsSupabase(movieSlug);
    } else if (parentId) {
      supaItems = await getCommentRepliesSupabase(parentId);
    } else if (userId) {
      supaItems = await getUserCommentsSupabase(userId);
    } else {
      supaItems = await getAllCommentsSupabase();
    }

    let items = supaItems || [];
    if (movieSlug) items = items.filter((c) => c.movieSlug === movieSlug);
    if (parentId) items = items.filter((c) => c.parentId === parentId);
    if (userId) items = items.filter((c) => c.userId === userId);
    if (!all) items = items.filter((c) => !c.isFlagged);

    items.sort((a, b) => {
      const isPinnedA = Boolean(a.isPinned);
      const isPinnedB = Boolean(b.isPinned);
      if (isPinnedA && !isPinnedB) return -1;
      if (!isPinnedA && isPinnedB) return 1;
      return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
    });

    return NextResponse.json(
      { success: true, items },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          "CDN-Cache-Control": "no-store",
          "Vercel-CDN-Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Lỗi API get comments:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/comments
 * Gửi bình luận an toàn vào Supabase
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      movieSlug,
      movieTitle,
      userId,
      userName,
      userAvatar,
      userEmail,
      rating = 5,
      content,
      isSpoiler = false,
      episodeSlug,
      episodeName,
      parentId,
      parentOwnerId,
      replyToUserId,
      replyToUserName,
    } = body;

    if (!movieSlug || !userId || !content) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc!" }, { status: 400 });
    }

    const modCheck = checkContentModeration(content);
    if (!modCheck.isAllowed) {
      return NextResponse.json({ error: modCheck.reason || "Nội dung vi phạm tiêu chuẩn cộng đồng!" }, { status: 400 });
    }

    let commentId = "";

    if (isSupabaseConfigured()) {
      try {
        commentId = await postCommentSupabase({
          movieSlug,
          movieTitle,
          userId,
          userName: sanitizeSafeText(userName || "Thành viên Nanaflix", 100),
          userAvatar,
          userEmail,
          rating: Number(rating) || 0,
          content: sanitizeSafeText(content, 2500),
          isSpoiler: Boolean(isSpoiler),
          episodeSlug,
          episodeName,
          parentId,
          parentOwnerId,
          replyToUserId,
          replyToUserName: sanitizeSafeText(replyToUserName || "", 100),
        });
      } catch (supaErr) {
        console.warn("Lỗi lưu Supabase trong API POST:", supaErr);
      }
    }

    if (!commentId) {
      commentId = `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }

    return NextResponse.json({ success: true, id: commentId });
  } catch (error) {
    console.error("Lỗi API post comment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PATCH /api/comments
 * Ghim/bỏ ghim, thả reaction, báo cáo/gỡ báo cáo bình luận trên Supabase
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { commentId, isPinned, action, userId, reactionType, reason } = body;
    if (!commentId) {
      return NextResponse.json({ error: "Thiếu commentId!" }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      if (action === "reaction" && userId) {
        const { setCommentReactionSupabase } = await import("@/services/supabaseService");
        await setCommentReactionSupabase(commentId, userId, reactionType || null);
      } else if (action === "flag" && reason) {
        const { flagCommentSupabase } = await import("@/services/supabaseService");
        await flagCommentSupabase(commentId, reason);
      } else if (action === "unflag") {
        const { unflagCommentSupabase } = await import("@/services/supabaseService");
        await unflagCommentSupabase(commentId);
      } else if (isPinned !== undefined || action === "pin") {
        await togglePinCommentSupabase(commentId, Boolean(isPinned));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lỗi API patch comment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PUT /api/comments
 * Cập nhật bình luận trên Supabase
 */
export async function PUT(req: NextRequest) {
  try {
    const { commentId, rating, content, isSpoiler, episodeSlug, episodeName } = await req.json();
    if (!commentId) {
      return NextResponse.json({ error: "Thiếu commentId!" }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      await updateCommentSupabase(commentId, {
        rating: rating !== undefined ? Number(rating) : undefined,
        content: content !== undefined ? sanitizeSafeText(content, 2500) : undefined,
        is_spoiler: isSpoiler !== undefined ? Boolean(isSpoiler) : undefined,
        episode_slug: episodeSlug !== undefined ? episodeSlug : undefined,
        episode_name: episodeName !== undefined ? episodeName : undefined,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lỗi API update comment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/comments?commentId=xxx
 * Xóa bình luận khỏi Supabase
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("commentId");
    if (!commentId) {
      return NextResponse.json({ error: "Thiếu commentId!" }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      await deleteCommentSupabase(commentId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lỗi API delete comment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
