import { NextRequest, NextResponse } from "next/server";
import { checkContentModeration } from "@/lib/contentModeration";
import { sanitizeSafeText } from "@/lib/security";
import { verifyServerAuth } from "@/lib/serverAuth";
import {
  getMovieCommentsSupabase,
  getAllCommentsSupabase,
  getUserCommentsSupabase,
  getCommentRepliesSupabase,
  postCommentSupabase,
  togglePinCommentSupabase,
  updateCommentSupabase,
  deleteCommentSupabase,
  getUserProfileSupabase,
  createNotificationSupabase,
} from "@/services/supabaseService";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
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
 * Xác thực danh tính qua Firebase Auth, không tin tưởng userId/userName/userAvatar từ client.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyServerAuth(req);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      movieSlug,
      movieTitle,
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

    // Tuyệt đối không tin tưởng body.userId, body.userName hay body.userAvatar từ client
    const userId = auth.userId;
    const userEmail = auth.email || "";

    if (!movieSlug || !content) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc!" }, { status: 400 });
    }

    const modCheck = checkContentModeration(content);
    if (!modCheck.isAllowed) {
      return NextResponse.json({ error: modCheck.reason || "Nội dung vi phạm tiêu chuẩn cộng đồng!" }, { status: 400 });
    }

    let userName = auth.displayName || (auth.email ? auth.email.split("@")[0] : "") || "Thành viên Nanaflix";
    let userAvatar = auth.photoUrl || "";

    if (isSupabaseConfigured()) {
      try {
        const profile = await getUserProfileSupabase(userId);
        if (profile?.isCommentRestricted) {
          return NextResponse.json(
            { error: "Tài khoản của bạn tạm thời bị khóa tính năng bình luận do vi phạm tiêu chuẩn cộng đồng!" },
            { status: 403 }
          );
        }
        if (profile?.displayName) userName = profile.displayName;
        if (profile?.photoURL) userAvatar = profile.photoURL;
      } catch {
        // Sử dụng tên/avatar từ Firebase token
      }
    }

    let commentId = "";

    if (isSupabaseConfigured()) {
      try {
        commentId = await postCommentSupabase({
          movieSlug,
          movieTitle: movieTitle || "",
          userId,
          userName: sanitizeSafeText(userName, 100),
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
          replyToUserName: replyToUserName ? sanitizeSafeText(replyToUserName, 100) : undefined,
        });

        // Tạo thông báo phản hồi hợp lệ ở phía server
        const targetUserId = replyToUserId || (parentOwnerId && parentOwnerId !== userId ? parentOwnerId : null);
        if (targetUserId && targetUserId !== userId) {
          const isDirect = Boolean(replyToUserId);
          await createNotificationSupabase({
            id: `notif_reply_${commentId}_${targetUserId}`,
            userId: targetUserId,
            type: "comment_reply",
            title: isDirect
              ? `${userName} đã trả lời bình luận của bạn`
              : `${userName} đã bình luận trong bài đánh giá của bạn`,
            message: content.length > 80 ? content.slice(0, 80) + "..." : content,
            link: `/movies/${movieSlug}?highlightComment=${commentId}#comment-${commentId}`,
            movieSlug,
            commentId,
            replierName: userName,
            replierAvatar: userAvatar,
            isRead: false,
            createdAt: Date.now(),
          }).catch(() => {});
        }
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
 * Ghim/bỏ ghim (chỉ Admin), thả reaction, báo cáo/gỡ báo cáo bình luận trên Supabase
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { commentId, isPinned, action, userId, reactionType, reason } = body;
    if (!commentId) {
      return NextResponse.json({ error: "Thiếu commentId!" }, { status: 400 });
    }

    // 1. GHIM / BỎ GHIM BÌNH LUẬN: Dành riêng cho Quản trị viên (Admin-only)
    if (isPinned !== undefined || action === "pin") {
      const auth = await verifyServerAuth(req);
      if (!auth.isAuthenticated) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!auth.isAdmin) {
        return NextResponse.json(
          { error: "Forbidden: Chỉ quản trị viên mới có quyền ghim bình luận!" },
          { status: 403 }
        );
      }

      if (isSupabaseConfigured()) {
        await togglePinCommentSupabase(commentId, Boolean(isPinned));
      }
      return NextResponse.json({ success: true });
    }

    // 2. GỠ ĐÁNH DẤU VI PHẠM (unflag): Dành riêng cho Quản trị viên
    if (action === "unflag") {
      const auth = await verifyServerAuth(req);
      if (!auth.isAuthenticated) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!auth.isAdmin) {
        return NextResponse.json(
          { error: "Forbidden: Chỉ quản trị viên mới có quyền gỡ cờ bình luận!" },
          { status: 403 }
        );
      }

      if (isSupabaseConfigured()) {
        const { unflagCommentSupabase } = await import("@/services/supabaseService");
        await unflagCommentSupabase(commentId);
      }
      return NextResponse.json({ success: true });
    }

    // 3. THẢ CẢM XÚC (reaction)
    if (action === "reaction") {
      const auth = await verifyServerAuth(req);
      const effectiveUserId = auth.isAuthenticated && auth.userId ? auth.userId : userId;
      if (isSupabaseConfigured() && effectiveUserId) {
        const { setCommentReactionSupabase } = await import("@/services/supabaseService");
        await setCommentReactionSupabase(commentId, effectiveUserId, reactionType || null);
      }
      return NextResponse.json({ success: true });
    }

    // 4. BÁO CÁO VI PHẠM (flag)
    if (action === "flag" && reason) {
      if (isSupabaseConfigured()) {
        const { flagCommentSupabase } = await import("@/services/supabaseService");
        await flagCommentSupabase(commentId, reason);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lỗi API patch comment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PUT /api/comments
 * Cập nhật bình luận trên Supabase (Yêu cầu đăng nhập; chỉ tác giả hoặc Admin mới được sửa)
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyServerAuth(req);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { commentId, rating, content, isSpoiler, episodeSlug, episodeName } = body;
    if (!commentId) {
      return NextResponse.json({ error: "Thiếu commentId!" }, { status: 400 });
    }

    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({ error: "Supabase chưa được cấu hình" }, { status: 500 });
    }

    // Kiểm tra quyền sở hữu bình luận từ cơ sở dữ liệu (không tin tưởng client)
    const { data: existingComment, error: fetchErr } = await supabase
      .from("movie_comments")
      .select("user_id")
      .eq("id", commentId)
      .maybeSingle();

    if (fetchErr || !existingComment) {
      return NextResponse.json({ error: "Không tìm thấy bình luận" }, { status: 404 });
    }

    const isOwner = existingComment.user_id === auth.userId;
    const isAdmin = Boolean(auth.isAdmin);

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Bạn không có quyền chỉnh sửa bình luận này" },
        { status: 403 }
      );
    }

    if (content !== undefined) {
      const modCheck = checkContentModeration(content);
      if (!modCheck.isAllowed) {
        return NextResponse.json(
          { error: modCheck.reason || "Nội dung vi phạm tiêu chuẩn cộng đồng!" },
          { status: 400 }
        );
      }
    }

    await updateCommentSupabase(commentId, {
      rating: rating !== undefined ? Number(rating) : undefined,
      content: content !== undefined ? sanitizeSafeText(content, 2500) : undefined,
      is_spoiler: isSpoiler !== undefined ? Boolean(isSpoiler) : undefined,
      episode_slug: episodeSlug !== undefined ? episodeSlug : undefined,
      episode_name: episodeName !== undefined ? episodeName : undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lỗi API update comment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/comments?commentId=xxx
 * Xóa bình luận khỏi Supabase (Yêu cầu đăng nhập; chỉ tác giả hoặc Admin mới được xóa)
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyServerAuth(req);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("commentId");
    if (!commentId) {
      return NextResponse.json({ error: "Thiếu commentId!" }, { status: 400 });
    }

    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({ error: "Supabase chưa được cấu hình" }, { status: 500 });
    }

    // Kiểm tra quyền sở hữu bình luận từ cơ sở dữ liệu (không tin tưởng client)
    const { data: existingComment, error: fetchErr } = await supabase
      .from("movie_comments")
      .select("user_id")
      .eq("id", commentId)
      .maybeSingle();

    if (fetchErr || !existingComment) {
      return NextResponse.json({ error: "Không tìm thấy bình luận" }, { status: 404 });
    }

    const isOwner = existingComment.user_id === auth.userId;
    const isAdmin = Boolean(auth.isAdmin);

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Bạn không có quyền xóa bình luận này" },
        { status: 403 }
      );
    }

    await deleteCommentSupabase(commentId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lỗi API delete comment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
