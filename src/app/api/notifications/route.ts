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
 * GET /api/notifications?userId=xxx
 * Lấy danh sách thông báo của người dùng qua Server API
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Thiếu userId!" }, { status: 400 });
  }

  try {
    const url = `${FIRESTORE_REST_BASE}/users/${userId}/notifications?pageSize=100${API_KEY ? `&key=${API_KEY}` : ""}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ success: true, items: [] });
    }
    const json = await res.json();
    const rawDocs = json.documents || [];
    const items = rawDocs.map(parseFirestoreDoc);
    items.sort((a: Record<string, unknown>, b: Record<string, unknown>) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("Lỗi API get notifications:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
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
