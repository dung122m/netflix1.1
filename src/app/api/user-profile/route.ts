import { NextRequest, NextResponse } from "next/server";
import { sanitizeSafeText } from "@/lib/security";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  "nanaflix-9e8f3";
const API_KEY =
  process.env.FIREBASE_API_KEY ||
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  "";
const FIRESTORE_REST_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

interface FirestoreField {
  stringValue?: string;
  integerValue?: string | number;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  arrayValue?: {
    values?: Array<{
      stringValue?: string;
      integerValue?: string | number;
      doubleValue?: number;
    }>;
  };
}

function parseFirestoreDoc(doc: { name: string; fields?: Record<string, FirestoreField> }): Record<string, unknown> {
  const id = doc.name.split("/").pop() || "";
  const data: Record<string, unknown> = { uid: id };
  const fields = doc.fields || {};

  for (const [k, v] of Object.entries(fields)) {
    if (v.stringValue !== undefined) {
      data[k] = v.stringValue;
    } else if (v.integerValue !== undefined) {
      data[k] = Number(v.integerValue);
    } else if (v.doubleValue !== undefined) {
      data[k] = Number(v.doubleValue);
    } else if (v.booleanValue !== undefined) {
      data[k] = v.booleanValue;
    } else if (v.timestampValue !== undefined) {
      data[k] = new Date(v.timestampValue).getTime();
    } else if (v.arrayValue !== undefined) {
      data[k] = v.arrayValue.values
        ? v.arrayValue.values.map((item) => {
            if (item.stringValue !== undefined) return item.stringValue;
            if (item.integerValue !== undefined) return Number(item.integerValue);
            if (item.doubleValue !== undefined) return Number(item.doubleValue);
            return "";
          })
        : [];
    } else {
      data[k] = null;
    }
  }

  return data;
}

/**
 * GET /api/user-profile?userId=xxx
 * Lấy hồ sơ cá nhân qua Server API (miễn nhiễm với AdBlocker)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Thiếu userId!" }, { status: 400 });
  }

  try {
    const url = `${FIRESTORE_REST_BASE}/users/${userId}${API_KEY ? `?key=${API_KEY}` : ""}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ success: false, profile: null });
    }
    const docJson = await res.json();
    const profile = parseFirestoreDoc(docJson);
    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("Lỗi API get user profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/user-profile
 * Cập nhật hồ sơ cá nhân (sở thích, danh hiệu, bio, avatar, số phút xem) qua Server API
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      displayName,
      customAvatar,
      photoURL,
      bio,
      favoriteGenres,
      badges,
      watchTimeMinutes,
      incrementMinutes,
    } = body;
    if (!userId) {
      return NextResponse.json({ error: "Thiếu userId!" }, { status: 400 });
    }

    const fieldPaths: string[] = ["updatedAt"];
    const fields: Record<string, FirestoreField> = {
      updatedAt: { integerValue: Date.now() },
    };

    if (displayName !== undefined) {
      fieldPaths.push("displayName");
      fields.displayName = { stringValue: sanitizeSafeText(displayName, 50) };
    }
    if (photoURL !== undefined) {
      fieldPaths.push("photoURL");
      fields.photoURL = { stringValue: photoURL };
    }
    if (customAvatar !== undefined) {
      fieldPaths.push("customAvatar");
      fields.customAvatar = { stringValue: customAvatar };
    }
    if (bio !== undefined) {
      fieldPaths.push("bio");
      fields.bio = { stringValue: sanitizeSafeText(bio, 150) };
    }
    if (favoriteGenres !== undefined && Array.isArray(favoriteGenres)) {
      fieldPaths.push("favoriteGenres");
      fields.favoriteGenres = {
        arrayValue: {
          values: favoriteGenres.map((g) => ({ stringValue: String(g) })),
        },
      };
    }
    if (badges !== undefined && Array.isArray(badges)) {
      fieldPaths.push("badges");
      fields.badges = {
        arrayValue: {
          values: badges.map((b) => ({ stringValue: String(b) })),
        },
      };
    }
    if (watchTimeMinutes !== undefined) {
      fieldPaths.push("watchTimeMinutes");
      fields.watchTimeMinutes = { integerValue: Math.max(0, Math.floor(Number(watchTimeMinutes))) };
    }

    // Nếu là request cộng dồn số phút qua API
    if (incrementMinutes !== undefined && Number(incrementMinutes) > 0) {
      // Đọc giá trị hiện tại trước
      let currentWatchMins = 0;
      try {
        const getUrl = `${FIRESTORE_REST_BASE}/users/${userId}${API_KEY ? `?key=${API_KEY}` : ""}`;
        const getRes = await fetch(getUrl, { cache: "no-store" });
        if (getRes.ok) {
          const docJson = await getRes.json();
          const p = parseFirestoreDoc(docJson);
          currentWatchMins = Number(p.watchTimeMinutes || 0);
        }
      } catch {}

      const newWatchMins = currentWatchMins + Math.floor(Number(incrementMinutes));
      fieldPaths.push("watchTimeMinutes");
      fields.watchTimeMinutes = { integerValue: newWatchMins };
    }

    const maskParams = fieldPaths.map((p) => `updateMask.fieldPaths=${p}`).join("&");
    const authHeader = req.headers.get("authorization");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authHeader) headers["Authorization"] = authHeader;

    const url = `${FIRESTORE_REST_BASE}/users/${userId}?${maskParams}${API_KEY ? `&key=${API_KEY}` : ""}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: "Không thể lưu hồ sơ", details: errText }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lỗi API post user profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
