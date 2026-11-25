import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyServerAuth } from "@/lib/serverAuth";
import { deleteFromR2ByUrl } from "@/lib/r2";
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

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MAX_COVER_BYTES = 4 * 1024 * 1024; // 4MB

/**
 * POST /api/user/collections/cover
 * Tải ảnh bìa (cover/banner) bộ sưu tập lên Cloudflare R2 (vĩnh viễn, 0đ egress)
 */
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

  try {
    const parsed = await parseUgcImageUpload(req, {
      maxBytes: MAX_COVER_BYTES,
      sizeErrorMessage: "Ảnh bìa vượt quá dung lượng cho phép (tối đa 4MB)",
      allowedTypes: ["jpeg", "png", "webp", "gif"],
      formatErrorMessage: "Định dạng file không được hỗ trợ (chỉ nhận JPG, PNG, WEBP, GIF)",
      extraFieldName: "oldCoverUrl",
    });
    if (!parsed.ok) return parsed.response;

    const safeFileName = sanitizeStorageKey(`${auth.userId}_${Date.now()}.${parsed.extension}`);
    const filePath = `covers/${safeFileName}`;

    const uploaded = await uploadUgcImageToStorage({
      filePath,
      buffer: parsed.buffer,
      contentType: parsed.mimeType,
      supabaseAdmin,
      supabaseBucket: "collection-covers",
      logPrefix: "Collection Cover API",
    });

    if (!uploaded.url) {
      return NextResponse.json({ error: "Không thể lưu trữ ảnh bìa bộ sưu tập" }, { status: 500 });
    }

    const oldCoverUrl = parsed.extraFieldValue;
    if (oldCoverUrl && typeof oldCoverUrl === "string") {
      deleteFromR2ByUrl(oldCoverUrl).catch((cleanupErr) => {
        console.warn("[Collection Cover API] Lỗi dọn bìa cũ R2:", cleanupErr);
      });
      if (oldCoverUrl.includes("/collection-covers/") && supabaseAdmin) {
        try {
          const parts = oldCoverUrl.split("/collection-covers/");
          if (parts[1]) {
            supabaseAdmin.storage.from("collection-covers").remove([parts[1]]).catch(() => {});
          }
        } catch {}
      }
    }

    return NextResponse.json({ success: true, coverUrl: uploaded.url }, { headers: UGC_NO_CACHE_HEADERS });
  } catch (err: unknown) {
    console.error("[Collection Cover API] Lỗi không xác định:", err);
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
