import { NextRequest, NextResponse } from "next/server";
import { checkContentModeration } from "@/lib/contentModeration";
import { sanitizeSafeText } from "@/lib/security";
import { verifyServerAuth } from "@/lib/serverAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { parseReactionsAndLikedBy } from "@/services/supabaseService";
import { MovieComment } from "@/types/comment";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/**
 * GET /api/comments?movieSlug=xxx
 * Lấy bình luận an toàn qua Server Admin Client
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const movieSlug = searchParams.get("movieSlug");
  const parentId = searchParams.get("parentId");
  const userId = searchParams.get("userId");
  const all = searchParams.get("all");

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ success: true, items: [] });
    }

    let query = supabaseAdmin.from("movie_comments").select("*");

    if (all !== "true") {
      query = query.eq("is_flagged", false);
    }
    if (movieSlug) {
      query = query.eq("movie_slug", movieSlug);
    } else if (parentId) {
      query = query.eq("parent_id", parentId);
    } else if (userId) {
      query = query.eq("user_id", userId);
    }

    query = query.order("created_at", { ascending: false });
    if (!movieSlug && !parentId && !userId && all !== "true") {
      query = query.limit(100);
    }

    const { data, error } = await query;
    if (error || !data) {
      return NextResponse.json({ success: true, items: [] });
    }

    const items: MovieComment[] = (data as Array<Record<string, unknown>>).map((d) => {
      const { likedBy, reactions } = parseReactionsAndLikedBy(d.liked_by);
      return {
        id: String(d.id),
        movieSlug: String(d.movie_slug || ""),
        movieTitle: String(d.movie_title || ""),
        userId: String(d.user_id || ""),
        userName: String(d.user_name || "Thành viên"),
        userAvatar: String(d.user_avatar || ""),
        userEmail: d.user_email ? String(d.user_email) : undefined,
        rating: Number(d.rating) || 5,
        content: String(d.content || ""),
        episodeSlug: d.episode_slug ? String(d.episode_slug) : undefined,
        episodeName: d.episode_name ? String(d.episode_name) : undefined,
        parentId: d.parent_id ? String(d.parent_id) : undefined,
        parentOwnerId: d.parent_owner_id ? String(d.parent_owner_id) : undefined,
        replyToUserId: d.reply_to_user_id ? String(d.reply_to_user_id) : undefined,
        replyToUserName: d.reply_to_user_name ? String(d.reply_to_user_name) : undefined,
        isSpoiler: Boolean(d.is_spoiler),
        likes: Math.max(Number(d.likes) || 0, likedBy.length),
        likedBy,
        reactions,
        isFlagged: Boolean(d.is_flagged),
        flagReason: d.flag_reason ? String(d.flag_reason) : undefined,
        isApproved: d.is_approved !== false,
        isPinned: Boolean(d.is_pinned),
        createdAt: Number(d.created_at) || Date.now(),
        updatedAt: Number(d.updated_at) || Date.now(),
      };
    });

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

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase chưa được cấu hình" }, { status: 500 });
    }

    try {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("is_comment_restricted, display_name, photo_url, custom_avatar")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.is_comment_restricted) {
        return NextResponse.json(
          { error: "Tài khoản của bạn tạm thời bị khóa tính năng bình luận do vi phạm tiêu chuẩn cộng đồng!" },
          { status: 403 }
        );
      }
      if (profile?.display_name) userName = profile.display_name;
      if (profile?.custom_avatar || profile?.photo_url) userAvatar = profile.custom_avatar || profile.photo_url;
    } catch {
      // Sử dụng tên/avatar từ Firebase token
    }

    const commentId = `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();

    const payload = {
      id: commentId,
      movie_slug: movieSlug,
      movie_title: movieTitle || "",
      user_id: userId,
      user_name: sanitizeSafeText(userName, 100),
      user_avatar: userAvatar || "",
      user_email: userEmail || "",
      rating: Number(rating) || 5,
      content: sanitizeSafeText(content, 2500),
      episode_slug: episodeSlug || null,
      episode_name: episodeName || null,
      parent_id: parentId || null,
      parent_owner_id: parentOwnerId || null,
      reply_to_user_id: replyToUserId || null,
      reply_to_user_name: replyToUserName ? sanitizeSafeText(replyToUserName, 100) : null,
      is_spoiler: Boolean(isSpoiler),
      likes: 0,
      liked_by: [],
      is_flagged: false,
      is_approved: true,
      is_pinned: false,
      created_at: now,
      updated_at: now,
    };

    const { error: insertErr } = await supabaseAdmin.from("movie_comments").insert(payload);
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Tạo thông báo phản hồi hợp lệ ở phía server qua supabaseAdmin
    const targetUserId = replyToUserId || (parentOwnerId && parentOwnerId !== userId ? parentOwnerId : null);
    if (targetUserId && targetUserId !== userId) {
      const isDirect = Boolean(replyToUserId);
      try {
        await supabaseAdmin.from("notifications").upsert({
          id: `notif_reply_${commentId}_${targetUserId}`,
          user_id: targetUserId,
          type: "comment_reply",
          title: isDirect
            ? `${userName} đã trả lời bình luận của bạn`
            : `${userName} đã bình luận trong bài đánh giá của bạn`,
          message: content.length > 80 ? content.slice(0, 80) + "..." : content,
          link: `/movies/${movieSlug}?highlightComment=${commentId}#comment-${commentId}`,
          movie_slug: movieSlug,
          comment_id: commentId,
          replier_name: userName,
          replier_avatar: userAvatar,
          is_read: false,
          created_at: Date.now(),
        }, { onConflict: "id" });
      } catch {}
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
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase chưa được cấu hình" }, { status: 500 });
    }

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

      await supabaseAdmin
        .from("movie_comments")
        .update({ is_pinned: Boolean(isPinned), updated_at: Date.now() })
        .eq("id", commentId);

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

      await supabaseAdmin
        .from("movie_comments")
        .update({ is_flagged: false, flag_reason: null, updated_at: Date.now() })
        .eq("id", commentId);

      return NextResponse.json({ success: true });
    }

    // 3. THẢ CẢM XÚC (reaction)
    if (action === "reaction") {
      const auth = await verifyServerAuth(req);
      const effectiveUserId = auth.isAuthenticated && auth.userId ? auth.userId : userId;
      if (effectiveUserId) {
        const { data: cmtData } = await supabaseAdmin
          .from("movie_comments")
          .select("likes, liked_by, user_id, user_name, movie_slug, content")
          .eq("id", commentId)
          .maybeSingle();

        if (cmtData) {
          const { reactions } = parseReactionsAndLikedBy(cmtData.liked_by);
          const updatedReactions: Record<string, string> = { ...reactions };

          if (reactionType) {
            updatedReactions[effectiveUserId] = reactionType;
          } else {
            delete updatedReactions[effectiveUserId];
          }

          const newLikedBy = Object.keys(updatedReactions);
          const newLikes = newLikedBy.length;

          await supabaseAdmin
            .from("movie_comments")
            .update({
              likes: newLikes,
              liked_by: updatedReactions,
              updated_at: Date.now(),
            })
            .eq("id", commentId);

          // Tạo thông báo reaction an toàn (chỉ khi thêm reaction và người thả khác chủ bình luận)
          if (reactionType && cmtData.user_id && cmtData.user_id !== effectiveUserId) {
            let reactorName = auth.displayName || "Một thành viên";
            let reactorAvatar = auth.photoUrl || "";
            try {
              const { data: profile } = await supabaseAdmin
                .from("profiles")
                .select("display_name, photo_url, custom_avatar")
                .eq("id", effectiveUserId)
                .maybeSingle();

              if (profile?.display_name) reactorName = profile.display_name;
              if (profile?.custom_avatar || profile?.photo_url) reactorAvatar = profile.custom_avatar || profile.photo_url;
            } catch {}

            const emojiMap: Record<string, string> = {
              heart: "❤️",
              love: "❤️",
              like: "👍",
              laugh: "😂",
              haha: "😂",
              wow: "😮",
              sad: "😢",
              angry: "😡",
            };
            const emoji = emojiMap[reactionType] || "❤️";

            let otherCount = 0;
            if (cmtData.liked_by && typeof cmtData.liked_by === "object") {
              const keys = Object.keys(cmtData.liked_by).filter((uid) => uid !== effectiveUserId && uid !== cmtData.user_id);
              otherCount = keys.length;
            }

            const notifTitle = otherCount > 0
              ? `${emoji} ${reactorName} và ${otherCount} người khác đã phản ứng với bình luận của bạn`
              : `${emoji} ${reactorName} đã thích bình luận của bạn`;

            const msgSnippet = (cmtData.content || "").length > 80
              ? (cmtData.content || "").slice(0, 80) + "..."
              : cmtData.content || "";

            try {
              await supabaseAdmin.from("notifications").upsert({
                id: `react_${commentId}_${cmtData.user_id}`,
                user_id: cmtData.user_id,
                type: "comment_reaction",
                title: notifTitle,
                message: msgSnippet,
                link: `/movies/${cmtData.movie_slug}?highlightComment=${commentId}#comment-${commentId}`,
                movie_slug: cmtData.movie_slug,
                comment_id: commentId,
                replier_name: reactorName,
                replier_avatar: reactorAvatar,
                is_read: false,
                created_at: Date.now(),
              }, { onConflict: "id" });
            } catch {}
          }
        }
      }
      return NextResponse.json({ success: true });
    }

    // 4. BÁO CÁO VI PHẠM (flag)
    if (action === "flag" && reason) {
      await supabaseAdmin
        .from("movie_comments")
        .update({ is_flagged: true, flag_reason: sanitizeSafeText(reason, 200), updated_at: Date.now() })
        .eq("id", commentId);

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

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase chưa được cấu hình" }, { status: 500 });
    }

    // Kiểm tra quyền sở hữu bình luận từ cơ sở dữ liệu (không tin tưởng client)
    const { data: existingComment, error: fetchErr } = await supabaseAdmin
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

    const payload: Record<string, unknown> = {
      updated_at: Date.now(),
    };
    if (rating !== undefined) payload.rating = Number(rating) || 5;
    if (content !== undefined) payload.content = sanitizeSafeText(content, 2500);
    if (isSpoiler !== undefined) payload.is_spoiler = Boolean(isSpoiler);
    if (episodeSlug !== undefined) payload.episode_slug = episodeSlug;
    if (episodeName !== undefined) payload.episode_name = episodeName;

    const { error: updateErr } = await supabaseAdmin
      .from("movie_comments")
      .update(payload)
      .eq("id", commentId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lỗi API update comment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/comments?commentId=xxx hoặc ?userId=xxx (Admin-only)
 * Xóa bình luận khỏi Supabase (Yêu cầu đăng nhập; chỉ tác giả hoặc Admin mới được xóa)
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyServerAuth(req);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase chưa được cấu hình" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");
    const commentId = searchParams.get("commentId");

    // Cho phép Admin xóa toàn bộ comment của một user
    if (targetUserId) {
      if (!auth.isAdmin) {
        return NextResponse.json(
          { error: "Forbidden: Chỉ quản trị viên mới có quyền xóa hàng loạt bình luận" },
          { status: 403 }
        );
      }
      const { error } = await supabaseAdmin.from("movie_comments").delete().eq("user_id", targetUserId);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, allDeletedForUser: targetUserId });
    }

    if (!commentId) {
      return NextResponse.json({ error: "Thiếu commentId!" }, { status: 400 });
    }

    // Kiểm tra quyền sở hữu bình luận từ cơ sở dữ liệu (không tin tưởng client)
    const { data: existingComment, error: fetchErr } = await supabaseAdmin
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

    const { error: deleteErr } = await supabaseAdmin.from("movie_comments").delete().eq("id", commentId);
    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lỗi API delete comment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
