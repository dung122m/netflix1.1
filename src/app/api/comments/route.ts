import { NextRequest, NextResponse } from "next/server";
import { checkContentModeration } from "@/lib/contentModeration";
import { sanitizeSafeText } from "@/lib/security";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// Fix #1: Hỗ trợ cả server-side env var (không có NEXT_PUBLIC_) để đảm bảo
// hoạt động ổn định trong Vercel serverless functions
const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  "";
const API_KEY =
  process.env.FIREBASE_API_KEY ||
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  "";

const FIRESTORE_REST_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const FIRESTORE_RUN_QUERY = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;

interface FirestoreField {
  stringValue?: string;
  integerValue?: string | number;
  booleanValue?: boolean;
  nullValue?: string;
  arrayValue?: { values?: Array<{ stringValue?: string }> };
  mapValue?: { fields?: Record<string, FirestoreField> };
}

function parseFirestoreDoc(doc: { name: string; fields?: Record<string, FirestoreField>; createTime?: string }): Record<string, unknown> {
  const id = doc.name.split("/").pop() || "";
  const data: Record<string, unknown> = { id };
  const fields = doc.fields || {};

  for (const [k, v] of Object.entries(fields)) {
    if (v.stringValue !== undefined) data[k] = v.stringValue;
    else if (v.integerValue !== undefined) data[k] = Number(v.integerValue);
    else if (v.booleanValue !== undefined) data[k] = v.booleanValue;
    else if (v.nullValue !== undefined) data[k] = null;
    else if (v.arrayValue !== undefined) {
      data[k] = v.arrayValue.values
        ? v.arrayValue.values.map((item) => item.stringValue || "")
        : [];
    } else {
      data[k] = null;
    }
  }

  return data;
}

/**
 * Fix #4: Xây dựng structuredQuery để query server-side trên Firestore REST
 * Thay vì lấy 300 docs rồi filter ở server → chỉ lấy đúng docs cần
 */
function buildStructuredQuery(params: {
  movieSlug?: string | null;
  parentId?: string | null;
  userId?: string | null;
  all?: string | null;
  pageSize?: number;
}) {
  const { movieSlug, parentId, userId, all } = params;
  const pageSize = all ? 500 : (params.pageSize || 200);

  // Xác định điều kiện filter chính
  const filters: object[] = [];

  if (movieSlug) {
    filters.push({
      fieldFilter: {
        field: { fieldPath: "movieSlug" },
        op: "EQUAL",
        value: { stringValue: movieSlug },
      },
    });
  }

  if (parentId) {
    filters.push({
      fieldFilter: {
        field: { fieldPath: "parentId" },
        op: "EQUAL",
        value: { stringValue: parentId },
      },
    });
  }

  if (userId && !movieSlug) {
    filters.push({
      fieldFilter: {
        field: { fieldPath: "userId" },
        op: "EQUAL",
        value: { stringValue: userId },
      },
    });
  }

  const whereClause =
    filters.length === 0
      ? undefined
      : filters.length === 1
        ? filters[0]
        : { compositeFilter: { op: "AND", filters } };

  return {
    structuredQuery: {
      from: [{ collectionId: "movie_comments" }],
      ...(whereClause ? { where: whereClause } : {}),
      orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
      limit: pageSize,
    },
  };
}

/**
 * GET /api/comments?movieSlug=xxx
 * Fix: Dùng runQuery query đúng theo movieSlug
 * Sắp xếp in-memory và không cache rỗng
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const movieSlug = searchParams.get("movieSlug");
  const parentId = searchParams.get("parentId");
  const userId = searchParams.get("userId");
  const all = searchParams.get("all");

  try {
    const keyParam = API_KEY ? `?key=${API_KEY}` : "";
    const queryUrl = `${FIRESTORE_RUN_QUERY}${keyParam}`;

    const body = buildStructuredQuery({ movieSlug, parentId, userId, all });

    let rawDocs: Array<{ name: string; fields?: Record<string, FirestoreField>; createTime?: string }> = [];

    const res = await fetch(queryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rawDocs = (json as any[])
        .filter((r) => r.document)
        .map((r) => r.document);
    } else {
      // Fallback: nếu runQuery bị từ chối, thử fetch trực tiếp qua collection documents
      try {
        const fallbackPageSize = all ? 300 : 150;
        const fallbackUrl = `${FIRESTORE_REST_BASE}/movie_comments?pageSize=${fallbackPageSize}${API_KEY ? `&key=${API_KEY}` : ""}`;
        const fallbackRes = await fetch(fallbackUrl, { cache: "no-store" });
        if (fallbackRes.ok) {
          const fbJson = await fallbackRes.json();
          rawDocs = fbJson.documents || [];
        }
      } catch {}
    }

    let items: Record<string, unknown>[] = rawDocs.map(parseFirestoreDoc);

    // Filter theo userId nếu cần (khi query kết hợp movieSlug + userId)
    if (userId && movieSlug) {
      items = items.filter((c) => c.userId === userId);
    }

    // Ẩn comment bị flagged (chỉ ẩn cho user thường, Admin all=true cần thấy hết cả bình luận vi phạm)
    if (!all) {
      items = items.filter((c) => !c.isFlagged);
    }

    // Sắp xếp: ghim lên đầu → mới nhất
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
 * Gửi bình luận an toàn qua Server Next.js
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

    const docFields: Record<string, FirestoreField> = {
      movieSlug: { stringValue: movieSlug },
      userId: { stringValue: userId },
      userName: { stringValue: sanitizeSafeText(userName || "Thành viên Nanaflix", 100) },
      content: { stringValue: sanitizeSafeText(content, 2500) },
      rating: { integerValue: Number(rating) || 0 },
      likes: { integerValue: 0 },
      isSpoiler: { booleanValue: Boolean(isSpoiler) },
      createdAt: { integerValue: Date.now() },
      likedBy: { arrayValue: { values: [] } },
    };

    if (movieTitle) docFields.movieTitle = { stringValue: sanitizeSafeText(movieTitle, 200) };
    if (userAvatar) docFields.userAvatar = { stringValue: userAvatar };
    if (userEmail) docFields.userEmail = { stringValue: userEmail };
    if (episodeSlug) docFields.episodeSlug = { stringValue: episodeSlug };
    if (episodeName) docFields.episodeName = { stringValue: episodeName };
    if (parentId) docFields.parentId = { stringValue: parentId };
    if (parentOwnerId) docFields.parentOwnerId = { stringValue: parentOwnerId };
    if (replyToUserId) docFields.replyToUserId = { stringValue: replyToUserId };
    if (replyToUserName) docFields.replyToUserName = { stringValue: sanitizeSafeText(replyToUserName, 100) };

    const authHeader = req.headers.get("authorization");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const url = `${FIRESTORE_REST_BASE}/movie_comments${API_KEY ? `?key=${API_KEY}` : ""}`;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ fields: docFields }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: "Không thể lưu bình luận", details: errText }, { status: res.status });
    }

    const createdDoc = await res.json();
    const commentId = createdDoc.name.split("/").pop() || "";

    // Tự động tạo thông báo cho người nhận (nếu có replyToUserId hoặc parentOwnerId)
    const targetUserId = replyToUserId || (parentOwnerId && parentOwnerId !== userId ? parentOwnerId : null);
    if (targetUserId && targetUserId !== userId) {
      const notifDocId = `reply_${commentId || Date.now()}`;
      const notifUrl = `${FIRESTORE_REST_BASE}/users/${targetUserId}/notifications?documentId=${notifDocId}${API_KEY ? `&key=${API_KEY}` : ""}`;
      const cleanReplierName = sanitizeSafeText(userName || "Thành viên Nanaflix", 100);
      const isDirect = Boolean(replyToUserId);
      const notifPayload = {
        fields: {
          id: { stringValue: notifDocId },
          type: { stringValue: "comment_reply" },
          title: { stringValue: isDirect ? `${cleanReplierName} đã trả lời bình luận của bạn` : `${cleanReplierName} đã bình luận trong bài đánh giá của bạn` },
          message: { stringValue: sanitizeSafeText(content, 200) },
          link: { stringValue: `/movies/${movieSlug}?highlightComment=${commentId}#comment-${commentId}` },
          movieSlug: { stringValue: movieSlug },
          commentId: { stringValue: commentId },
          replierName: { stringValue: cleanReplierName },
          ...(userAvatar ? { replierAvatar: { stringValue: userAvatar } } : {}),
          isRead: { booleanValue: false },
          createdAt: { integerValue: Date.now() },
        }
      };
      fetch(notifUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notifPayload),
      }).catch((e) => console.warn("Lỗi tạo thông báo server:", e));
    }

    return NextResponse.json({ success: true, id: commentId });
  } catch (error) {
    console.error("Lỗi API post comment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PATCH /api/comments
 * Ghim hoặc bỏ ghim bình luận (dành riêng cho Admin)
 */
export async function PATCH(req: NextRequest) {
  try {
    const { commentId, isPinned, adminEmail } = await req.json();
    if (!commentId || !adminEmail) {
      return NextResponse.json({ error: "Thiếu dữ liệu bắt buộc!" }, { status: 400 });
    }

    const url = `${FIRESTORE_REST_BASE}/movie_comments/${commentId}?updateMask.fieldPaths=isPinned&updateMask.fieldPaths=pinnedAt&updateMask.fieldPaths=pinnedBy${API_KEY ? `&key=${API_KEY}` : ""}`;
    const fields: Record<string, FirestoreField> = {
      isPinned: { booleanValue: Boolean(isPinned) },
      pinnedAt: { integerValue: Date.now() },
      pinnedBy: { stringValue: adminEmail },
    };

    const authHeader = req.headers.get("authorization");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authHeader) headers["Authorization"] = authHeader;

    const res = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Không thể cập nhật trạng thái ghim!" }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lỗi API patch comment pin:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PUT /api/comments
 * Cập nhật nội dung, điểm đánh giá hoặc cảnh báo spoil của bình luận
 */
export async function PUT(req: NextRequest) {
  try {
    const { commentId, rating, content, isSpoiler, episodeSlug, episodeName } = await req.json();
    if (!commentId) {
      return NextResponse.json({ error: "Thiếu commentId!" }, { status: 400 });
    }

    const fieldPaths: string[] = ["updatedAt"];
    const fields: Record<string, FirestoreField> = {
      updatedAt: { integerValue: Date.now() },
    };

    if (content !== undefined) {
      fieldPaths.push("content");
      fields.content = { stringValue: sanitizeSafeText(content, 2500) };
    }
    if (rating !== undefined) {
      fieldPaths.push("rating");
      fields.rating = { integerValue: Number(rating) };
    }
    if (isSpoiler !== undefined) {
      fieldPaths.push("isSpoiler");
      fields.isSpoiler = { booleanValue: Boolean(isSpoiler) };
    }
    if (episodeSlug !== undefined) {
      fieldPaths.push("episodeSlug");
      fields.episodeSlug = { stringValue: episodeSlug };
    }
    if (episodeName !== undefined) {
      fieldPaths.push("episodeName");
      fields.episodeName = { stringValue: episodeName };
    }

    const maskParams = fieldPaths.map((p) => `updateMask.fieldPaths=${p}`).join("&");
    const authHeader = req.headers.get("authorization");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authHeader) headers["Authorization"] = authHeader;

    const url = `${FIRESTORE_REST_BASE}/movie_comments/${commentId}?${maskParams}${API_KEY ? `&key=${API_KEY}` : ""}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: "Không thể cập nhật bình luận", details: errText }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lỗi API update comment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/comments?commentId=xxx
 * Xóa bình luận khỏi Firestore qua Server API
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("commentId");
    if (!commentId) {
      return NextResponse.json({ error: "Thiếu commentId!" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization");
    const headers: Record<string, string> = {};
    if (authHeader) headers["Authorization"] = authHeader;

    const url = `${FIRESTORE_REST_BASE}/movie_comments/${commentId}${API_KEY ? `?key=${API_KEY}` : ""}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers,
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: "Không thể xóa bình luận", details: errText }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lỗi API delete comment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
