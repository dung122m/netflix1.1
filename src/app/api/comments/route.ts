import { NextRequest, NextResponse } from "next/server";
import { checkContentModeration } from "@/lib/contentModeration";
import { sanitizeSafeText } from "@/lib/security";

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "nanaflix-9e8f3";
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
const FIRESTORE_REST_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

interface FirestoreField {
  stringValue?: string;
  integerValue?: string | number;
  booleanValue?: boolean;
  arrayValue?: { values?: Array<{ stringValue?: string }> };
}

function parseFirestoreDoc(doc: { name: string; fields?: Record<string, FirestoreField>; createTime?: string }): Record<string, unknown> {
  const id = doc.name.split("/").pop() || "";
  const data: Record<string, unknown> = { id };
  const fields = doc.fields || {};

  for (const [k, v] of Object.entries(fields)) {
    if (v.stringValue !== undefined) data[k] = v.stringValue;
    else if (v.integerValue !== undefined) data[k] = Number(v.integerValue);
    else if (v.booleanValue !== undefined) data[k] = v.booleanValue;
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
 * GET /api/comments?movieSlug=xxx
 * Lấy danh sách bình luận thông qua server Next.js (miễn nhiễm 100% với Adblocker / Browser Extensions)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const movieSlug = searchParams.get("movieSlug");
  const parentId = searchParams.get("parentId");
  const all = searchParams.get("all");

  try {
    const url = `${FIRESTORE_REST_BASE}/movie_comments?pageSize=300${API_KEY ? `&key=${API_KEY}` : ""}`;
    const res = await fetch(url, {
      next: { revalidate: 3 }, // Cache ngắn 3s trên server
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: "Firestore query failed", details: errText }, { status: res.status });
    }

    const json = await res.json();
    const rawDocs = json.documents || [];
    let items: Record<string, unknown>[] = rawDocs.map(parseFirestoreDoc);

    // Lọc theo movieSlug nếu có
    if (movieSlug) {
      items = items.filter((c: Record<string, unknown>) => c.movieSlug === movieSlug);
    }

    // Lọc theo parentId nếu có
    if (parentId) {
      items = items.filter((c: Record<string, unknown>) => c.parentId === parentId);
    } else if (!all && movieSlug) {
      // Mặc định cho trang phim: chỉ lấy root comments (không có parentId)
      items = items.filter((c: Record<string, unknown>) => !c.parentId);
    }

    // Sắp xếp: Ghim lên đầu, sau đó mới nhất
    items.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const isPinnedA = Boolean(a.isPinned);
      const isPinnedB = Boolean(b.isPinned);
      if (isPinnedA && !isPinnedB) return -1;
      if (!isPinnedA && isPinnedB) return 1;
      return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
    });

    return NextResponse.json({ success: true, items });
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
    if (replyToUserId) docFields.replyToUserId = { stringValue: replyToUserId };
    if (replyToUserName) docFields.replyToUserName = { stringValue: sanitizeSafeText(replyToUserName, 100) };

    const url = `${FIRESTORE_REST_BASE}/movie_comments${API_KEY ? `?key=${API_KEY}` : ""}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: docFields }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: "Không thể lưu bình luận", details: errText }, { status: res.status });
    }

    const createdDoc = await res.json();
    const commentId = createdDoc.name.split("/").pop() || "";

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

    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
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
