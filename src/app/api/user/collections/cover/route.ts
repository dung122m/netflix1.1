import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyServerAuth } from "@/lib/serverAuth";
import { isR2Configured, uploadToR2, deleteFromR2ByUrl } from "@/lib/r2";
import { validateImageMagicBytes, sanitizeStorageKey } from "@/lib/fileValidation";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const NO_CACHE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate, proxy-revalidate",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
};

const MAX_COVER_BYTES = 4 * 1024 * 1024; // 4MB

/**
 * POST /api/user/collections/cover
 * Tải ảnh bìa (cover/banner) bộ sưu tập lên Cloudflare R2 (vĩnh viễn, 0đ egress)
 * Hỗ trợ cả Multipart Form Data và Base64
 */
export async function POST(req: NextRequest) {
  const auth = await verifyServerAuth(req);
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized: Vui lòng đăng nhập" }, { status: 401 });
  }

  const rateLimit = await enforceRateLimit(
    req,
    RATE_LIMIT_PRESETS.USER_MUTATION,
    auth.userId
  );
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }

  const supabaseAdmin = getSupabaseAdmin();

  try {
    const contentType = req.headers.get("content-type") || "";
    let fileBuffer: Buffer | null = null;
    let oldCoverUrl: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "Thiếu file ảnh" }, { status: 400 });
      }

      if (file.size > MAX_COVER_BYTES) {
        return NextResponse.json(
          { error: "Ảnh bìa vượt quá dung lượng cho phép (tối đa 4MB)" },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      fileBuffer = Buffer.from(bytes);
      oldCoverUrl = (formData.get("oldCoverUrl") as string) || null;
    } else {
      const body = await req.json().catch(() => null);
      if (!body?.base64) {
        return NextResponse.json({ error: "Thiếu dữ liệu ảnh" }, { status: 400 });
      }

      const rawBase64 = String(body.base64);
      const matches = rawBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        fileBuffer = Buffer.from(matches[2], "base64");
      } else {
        fileBuffer = Buffer.from(rawBase64, "base64");
      }

      if (fileBuffer.length > MAX_COVER_BYTES) {
        return NextResponse.json(
          { error: "Ảnh bìa vượt quá dung lượng cho phép (tối đa 4MB)" },
          { status: 400 }
        );
      }
      oldCoverUrl = body?.oldCoverUrl ? String(body.oldCoverUrl) : null;
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json({ error: "Dữ liệu ảnh không hợp lệ" }, { status: 400 });
    }

    // 1. Kiểm tra chữ ký nhị phân Magic Bytes
    const validation = validateImageMagicBytes(fileBuffer, ["jpeg", "png", "webp", "gif"]);
    if (!validation.isValid || !validation.mimeType || !validation.extension) {
      return NextResponse.json(
        { error: validation.error || "Định dạng file không được hỗ trợ (chỉ nhận JPG, PNG, WEBP, GIF)" },
        { status: 400 }
      );
    }

    const verifiedMimeType = validation.mimeType;
    const verifiedExt = validation.extension;

    const safeFileName = sanitizeStorageKey(`${auth.userId}_${Date.now()}.${verifiedExt}`);
    const filePath = `covers/${safeFileName}`;

    let coverUrl: string | null = null;

    // 2. Ưu tiên tải lên Cloudflare R2 (0đ băng thông, lưu trữ vĩnh viễn, CDN siêu tốc)
    if (isR2Configured()) {
      coverUrl = await uploadToR2({
        key: filePath,
        buffer: fileBuffer,
        contentType: verifiedMimeType,
        category: "ugc",
      });
    }

    // 3. Dự phòng Supabase Storage nếu R2 không khả dụng
    if (!coverUrl && supabaseAdmin) {
      const { error: uploadError } = await supabaseAdmin.storage
        .from("collection-covers")
        .upload(filePath, fileBuffer, {
          upsert: true,
          contentType: verifiedMimeType,
        });

      if (!uploadError) {
        const { data: publicUrlData } = supabaseAdmin.storage
          .from("collection-covers")
          .getPublicUrl(filePath);
        coverUrl = publicUrlData?.publicUrl || null;
      } else {
        console.warn("[Collection Cover API] Supabase storage fallback error:", uploadError.message);
      }
    }

    if (!coverUrl) {
      return NextResponse.json({ error: "Không thể lưu trữ ảnh bìa bộ sưu tập" }, { status: 500 });
    }

    // 4. Dọn dẹp ảnh bìa cũ nếu có yêu cầu thay thế
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

    return NextResponse.json(
      {
        success: true,
        coverUrl,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Collection Cover API] Lỗi xử lý:", errorMsg);
    return NextResponse.json({ error: "Lỗi nội bộ khi tải ảnh bìa" }, { status: 500 });
  }
}
