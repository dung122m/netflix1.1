import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyServerAuth } from "@/lib/serverAuth";
import { deleteFromR2, extractR2KeyFromUrl } from "@/lib/r2";
import { sanitizeStorageKey } from "@/lib/fileValidation";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";
import {
  UGC_NO_CACHE_HEADERS,
  parseUgcImageUpload,
  uploadUgcImageToStorage,
} from "@/lib/ugcImageUpload";
import { syncUserProfileAcrossContent } from "@/lib/userProfileSync";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MAX_AVATAR_BYTES = 2.5 * 1024 * 1024; // 2.5MB

export async function POST(req: NextRequest) {
  const auth = await verifyServerAuth(req);
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized: Vui lòng đăng nhập" }, { status: 401 });
  }

  const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.USER_MUTATION, auth.userId);
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Cơ sở dữ liệu chưa được cấu hình" }, { status: 500 });
  }

  try {
    const parsed = await parseUgcImageUpload(req, {
      maxBytes: MAX_AVATAR_BYTES,
      sizeErrorMessage: "Ảnh đại diện vượt quá dung lượng cho phép (tối đa 2.5MB)",
      allowedTypes: ["jpeg", "png", "webp"],
      formatErrorMessage: "Định dạng file không được hỗ trợ (chỉ nhận JPG, PNG, WEBP)",
    });
    if (!parsed.ok) return parsed.response;

    const { data: currentProfile } = await supabaseAdmin
      .from("profiles")
      .select("custom_avatar, photo_url, display_name")
      .eq("id", auth.userId)
      .maybeSingle();
    const oldAvatarUrl = currentProfile?.custom_avatar || currentProfile?.photo_url || null;

    const safeFileName = sanitizeStorageKey(`${auth.userId}_${Date.now()}.${parsed.extension}`);
    const filePath = `avatars/${safeFileName}`;

    const uploaded = await uploadUgcImageToStorage({
      filePath,
      buffer: parsed.buffer,
      contentType: parsed.mimeType,
      supabaseAdmin,
      supabaseBucket: "avatars",
      logPrefix: "Avatar Upload API",
    });

    if (uploaded.storageError) {
      return NextResponse.json({ error: "Lỗi lưu trữ ảnh: " + uploaded.storageError }, { status: 500 });
    }
    if (!uploaded.url) {
      return NextResponse.json({ error: "Không thể lấy URL ảnh" }, { status: 500 });
    }

    const avatarUrl = uploaded.url;
    await supabaseAdmin
      .from("profiles")
      .update({
        custom_avatar: avatarUrl,
        photo_url: avatarUrl,
        updated_at: Date.now(),
      })
      .eq("id", auth.userId);

    await syncUserProfileAcrossContent({
      supabase: supabaseAdmin,
      userId: auth.userId,
      nextAvatar: avatarUrl,
      prevAvatar: oldAvatarUrl,
      nextDisplayName: currentProfile?.display_name || undefined,
      prevDisplayName: currentProfile?.display_name || undefined,
    });

    if (oldAvatarUrl && typeof oldAvatarUrl === "string") {
      const oldR2Key = extractR2KeyFromUrl(oldAvatarUrl);
      if (oldR2Key && oldR2Key.startsWith("avatars/")) {
        deleteFromR2(oldR2Key).catch((cleanupErr) => {
          console.warn("[Avatar Upload] Dọn avatar R2 cũ thất bại:", cleanupErr);
        });
      } else if (oldAvatarUrl.includes("/avatars/") && !oldAvatarUrl.startsWith("/")) {
        try {
          const parts = oldAvatarUrl.split("/avatars/");
          if (parts[1]) {
            supabaseAdmin.storage.from("avatars").remove([parts[1]]).catch(() => {});
          }
        } catch {}
      }
    }

    return NextResponse.json({ success: true, avatarUrl }, { headers: UGC_NO_CACHE_HEADERS });
  } catch (err: unknown) {
    console.error("[Avatar Upload API] Lỗi không xác định:", err);
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
