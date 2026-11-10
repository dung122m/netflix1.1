import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyServerAuth } from "@/lib/serverAuth";
import { isR2Configured, uploadToR2 } from "@/lib/r2";
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
    let mimeType = "image/webp";
    let fileExt = "webp";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "Thiếu file ảnh" }, { status: 400 });
      }

      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "File ảnh vượt quá 10MB" }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      fileBuffer = Buffer.from(bytes);
      mimeType = file.type || "image/jpeg";
      if (mimeType.includes("png")) fileExt = "png";
      else if (mimeType.includes("webp")) fileExt = "webp";
      else if (mimeType.includes("gif")) fileExt = "gif";
      else fileExt = "jpg";
    } else {
      const body = await req.json().catch(() => null);
      if (!body?.base64) {
        return NextResponse.json({ error: "Thiếu dữ liệu ảnh" }, { status: 400 });
      }

      const rawBase64 = String(body.base64);
      const matches = rawBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        fileBuffer = Buffer.from(matches[2], "base64");
      } else {
        fileBuffer = Buffer.from(rawBase64, "base64");
      }

      if (mimeType.includes("png")) fileExt = "png";
      else if (mimeType.includes("webp")) fileExt = "webp";
      else if (mimeType.includes("gif")) fileExt = "gif";
      else fileExt = "jpg";
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json({ error: "Dữ liệu ảnh không hợp lệ" }, { status: 400 });
    }

    const fileName = `${auth.userId}_${Date.now()}.${fileExt}`;
    const filePath = `covers/${fileName}`;

    let coverUrl: string | null = null;

    // 1. Ưu tiên tải lên Cloudflare R2 (0đ băng thông, lưu trữ vĩnh viễn, CDN siêu tốc)
    if (isR2Configured()) {
      coverUrl = await uploadToR2({
        key: filePath,
        buffer: fileBuffer,
        contentType: mimeType,
      });
    }

    // 2. Dự phòng Supabase Storage nếu R2 không khả dụng
    if (!coverUrl && supabaseAdmin) {
      const { error: uploadError } = await supabaseAdmin.storage
        .from("collection-covers")
        .upload(filePath, fileBuffer, {
          upsert: true,
          contentType: mimeType,
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

