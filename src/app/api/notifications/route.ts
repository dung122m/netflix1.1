import { NextRequest, NextResponse } from "next/server";
import { sanitizeSafeText } from "@/lib/security";

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "nanaflix-9e8f3";
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
const FIRESTORE_REST_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

interface FirestoreField {
  stringValue?: string;
  integerValue?: string | number;
  booleanValue?: boolean;
}

function parseFirestoreDoc(doc: { name: string; fields?: Record<string, FirestoreField> }): Record<string, unknown> {
  const id = doc.name.split("/").pop() || "";
  const data: Record<string, unknown> = { id };
  const fields = doc.fields || {};

  for (const [k, v] of Object.entries(fields)) {
    if (v.stringValue !== undefined) data[k] = v.stringValue;
    else if (v.integerValue !== undefined) data[k] = Number(v.integerValue);
    else if (v.booleanValue !== undefined) data[k] = v.booleanValue;
    else data[k] = null;
  }

  return data;
}

/**
 * GET /api/notifications
 * - Không có userId: Trả về danh sách thông báo hệ thống / phim mới cập nhật / sự kiện hot
 * - Có userId: Lấy danh sách thông báo cá nhân (phản hồi bình luận, tập mới phim theo dõi)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  // 1. Trường hợp không có userId: Trả về thông báo hệ thống & phim mới cập nhật
  if (!userId) {
    try {
      // Lấy danh sách phim mới cập nhật từ upstream API
      const upstreamRes = await fetch("https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1", {
        next: { revalidate: 300 }, // Cache 5 phút
      });

      const dynamicItems: Array<Record<string, unknown>> = [];

      if (upstreamRes.ok) {
        const data = await upstreamRes.json();
        const movies = Array.isArray(data.items) ? data.items.slice(0, 5) : [];

        movies.forEach((m: { name?: string; slug?: string; poster_url?: string; thumb_url?: string; episode_current?: string; year?: number }) => {
          if (m.slug && m.name) {
            const posterImg = m.poster_url?.startsWith("http")
              ? m.poster_url
              : m.thumb_url?.startsWith("http")
                ? m.thumb_url
                : `https://phimimg.com/${m.poster_url || m.thumb_url}`;

            dynamicItems.push({
              id: `sys_movie_${m.slug}`,
              type: "movie",
              title: m.name,
              message: `Đã cập nhật ${m.episode_current || "bản HD Vietsub"}. Bấm xem ngay hôm nay!`,
              time: "Hôm nay",
              link: `/movies/${m.slug}`,
              image: posterImg,
              badge: "TẬP MỚI",
              badgeColor: "bg-netflix-red text-white",
            });
          }
        });
      }

      // Thông báo trực tiếp bóng đá / sự kiện hot
      dynamicItems.unshift({
        id: "sys_live_hot",
        type: "live",
        title: "Trực Tiếp Bóng Đá & Sự Kiện Thể Thao",
        message: "Xem trực tiếp các trận cầu đỉnh cao Ngoại Hạng Anh, C1 chất lượng Full HD không giật lag!",
        time: "Trực tiếp",
        link: "/live",
        image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=500&auto=format&fit=crop&q=60",
        badge: "LIVE 🔴",
        badgeColor: "bg-amber-600 text-white animate-pulse",
      });

      return NextResponse.json({ success: true, items: dynamicItems });
    } catch (err) {
      console.error("Lỗi lấy thông báo hệ thống:", err);
      return NextResponse.json({
        success: true,
        items: [
          {
            id: "sys_welcome",
            type: "system",
            title: "Chào mừng bạn đến với Nanaflix!",
            message: "Hàng ngàn bộ phim bom tấn và phim bộ chất lượng 4K đang chờ bạn khám phá.",
            time: "Hôm nay",
            link: "/browse",
            badge: "HOT",
            badgeColor: "bg-netflix-red text-white",
          },
        ],
      });
    }
  }

  // 2. Trường hợp có userId: Lấy thông báo cá nhân (kết hợp subcollection & truy quét từ movie_comments)
  try {
    const authHeader = req.headers.get("authorization");
    const headers: Record<string, string> = {};
    if (authHeader) headers["Authorization"] = authHeader;

    const notifMap = new Map<string, Record<string, unknown>>();

    // 2.1 Lấy thông báo từ Firestore subcollection users/{userId}/notifications
    try {
      const url = `${FIRESTORE_REST_BASE}/users/${userId}/notifications?pageSize=100${API_KEY ? `&key=${API_KEY}` : ""}`;
      const res = await fetch(url, { headers, cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const rawDocs = json.documents || [];
        const items = rawDocs.map(parseFirestoreDoc);
        items.forEach((item: Record<string, unknown>) => {
          if (item.id) notifMap.set(String(item.id), item);
        });
      }
    } catch {}

    // 2.2 Quét toàn bộ phản hồi từ collection movie_comments để đảm bảo 100% không bị mất thông báo reply
    try {
      const commentsUrl = `${FIRESTORE_REST_BASE}/movie_comments?pageSize=150${API_KEY ? `&key=${API_KEY}` : ""}`;
      const commentsRes = await fetch(commentsUrl, { cache: "no-store" });
      if (commentsRes.ok) {
        const commentsJson = await commentsRes.json();
        const rawComments = commentsJson.documents || [];
        const allComments = rawComments.map(parseFirestoreDoc);

        // Lưu danh sách comment gốc của userId này
        const myRootCommentIds = new Set<string>();
        allComments.forEach((c: Record<string, unknown>) => {
          if (c.userId === userId && !c.parentId) {
            myRootCommentIds.add(String(c.id));
          }
        });

        // Tìm tất cả reply nhắm tới userId hoặc nằm trong thread comment gốc của userId
        allComments.forEach((c: Record<string, unknown>) => {
          if (c.userId === userId) return; // Không tự thông báo cho chính mình

          const cId = String(c.id);
          const cContent = String(c.content || "");
          const cMovieSlug = String(c.movieSlug || "");
          const cUserName = String(c.userName || "Thành viên Nanaflix");
          const cUserAvatar = c.userAvatar ? String(c.userAvatar) : undefined;
          const cCreatedAt = Number(c.createdAt) || Date.now();

          // TH1: Được reply trực tiếp (@user)
          if (c.replyToUserId === userId) {
            const notifKey = `reply_direct_${cId}`;
            if (!notifMap.has(notifKey)) {
              notifMap.set(notifKey, {
                id: notifKey,
                type: "comment_reply",
                title: `${cUserName} đã trả lời bình luận của bạn`,
                message: cContent.length > 80 ? cContent.slice(0, 80) + "..." : cContent,
                link: `/movies/${cMovieSlug}?highlightComment=${cId}#comment-${cId}`,
                movieSlug: cMovieSlug,
                commentId: cId,
                replierName: cUserName,
                replierAvatar: cUserAvatar,
                isRead: false,
                createdAt: cCreatedAt,
              });
            }
          }
          // TH2: Reply vào bài đánh giá gốc của userId
          else if (c.parentId && myRootCommentIds.has(String(c.parentId)) && !c.replyToUserId) {
            const notifKey = `reply_root_${cId}`;
            if (!notifMap.has(notifKey)) {
              notifMap.set(notifKey, {
                id: notifKey,
                type: "comment_reply",
                title: `${cUserName} đã bình luận trong bài đánh giá của bạn`,
                message: cContent.length > 80 ? cContent.slice(0, 80) + "..." : cContent,
                link: `/movies/${cMovieSlug}?highlightComment=${cId}#comment-${cId}`,
                movieSlug: cMovieSlug,
                commentId: cId,
                replierName: cUserName,
                replierAvatar: cUserAvatar,
                isRead: false,
                createdAt: cCreatedAt,
              });
            }
          }
        });
      }
    } catch {}

    const items = Array.from(notifMap.values());
    items.sort((a: Record<string, unknown>, b: Record<string, unknown>) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("Lỗi API get notifications:", error);
    return NextResponse.json({ success: true, items: [] });
  }
}

/**
 * POST /api/notifications
 * Tạo thông báo mới cho người dùng qua Server API
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, notifId, type, title, message, link, movieSlug, commentId, replierName, replierAvatar } = body;

    if (!userId || !title) {
      return NextResponse.json({ error: "Thiếu thông tin thông báo!" }, { status: 400 });
    }

    const docFields: Record<string, FirestoreField> = {
      id: { stringValue: notifId || `notif_${Date.now()}` },
      type: { stringValue: type || "comment_reply" },
      title: { stringValue: sanitizeSafeText(title, 150) },
      message: { stringValue: sanitizeSafeText(message || "", 500) },
      isRead: { booleanValue: false },
      createdAt: { integerValue: Date.now() },
    };

    if (link) docFields.link = { stringValue: link };
    if (movieSlug) docFields.movieSlug = { stringValue: movieSlug };
    if (commentId) docFields.commentId = { stringValue: commentId };
    if (replierName) docFields.replierName = { stringValue: sanitizeSafeText(replierName, 100) };
    if (replierAvatar) docFields.replierAvatar = { stringValue: replierAvatar };

    const docId = notifId || `notif_${Date.now()}`;
    const authHeader = req.headers.get("authorization");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authHeader) headers["Authorization"] = authHeader;

    const url = `${FIRESTORE_REST_BASE}/users/${userId}/notifications?documentId=${docId}${API_KEY ? `&key=${API_KEY}` : ""}`;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ fields: docFields }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: "Không thể lưu thông báo", details: errText }, { status: res.status });
    }

    return NextResponse.json({ success: true, id: docId });
  } catch (error) {
    console.error("Lỗi API post notification:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
