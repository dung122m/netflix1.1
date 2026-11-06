import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyServerAuth } from "@/lib/serverAuth";
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
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Cơ sở dữ liệu chưa được cấu hình" }, { status: 500 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let fileBuffer: Buffer | null = null;
    let mimeType = "image/jpeg";
    let fileExt = "jpg";

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
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json({ error: "Dữ liệu ảnh không hợp lệ" }, { status: 400 });
    }

    const fileName = `${auth.userId}_${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Upload an toàn qua Service Role Supabase Admin (bỏ qua mọi rào cản RLS của anon key)
    const { error: uploadError } = await supabaseAdmin.storage
      .from("avatars")
      .upload(filePath, fileBuffer, {
        upsert: true,
        contentType: mimeType,
      });

    if (uploadError) {
      console.error("[Avatar Upload API] Lỗi storage:", uploadError);
      return NextResponse.json({ error: "Lỗi lưu trữ ảnh: " + uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const avatarUrl = publicUrlData?.publicUrl;
    if (!avatarUrl) {
      return NextResponse.json({ error: "Không thể lấy URL ảnh" }, { status: 500 });
    }

    // Tự động cập nhật ngay hồ sơ người dùng trong database
    const now = Date.now();
    await supabaseAdmin
      .from("profiles")
      .update({
        custom_avatar: avatarUrl,
        photo_url: avatarUrl,
        updated_at: now,
      })
      .eq("id", auth.userId);

    return NextResponse.json(
      {
        success: true,
        avatarUrl,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: unknown) {
    console.error("[Avatar Upload API] Lỗi không xác định:", err);
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

