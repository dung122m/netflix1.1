import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyServerAuth } from "@/lib/serverAuth";
import { isR2Configured, uploadToR2, deleteFromR2, extractR2KeyFromUrl } from "@/lib/r2";
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

const MAX_AVATAR_BYTES = 2.5 * 1024 * 1024; // 2.5MB

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

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "Thiếu file ảnh" }, { status: 400 });
      }

      if (file.size > MAX_AVATAR_BYTES) {
        return NextResponse.json(
          { error: "Ảnh đại diện vượt quá dung lượng cho phép (tối đa 2.5MB)" },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      fileBuffer = Buffer.from(bytes);
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

      if (fileBuffer.length > MAX_AVATAR_BYTES) {
        return NextResponse.json(
          { error: "Ảnh đại diện vượt quá dung lượng cho phép (tối đa 2.5MB)" },
          { status: 400 }
        );
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json({ error: "Dữ liệu ảnh không hợp lệ" }, { status: 400 });
    }

    // 1. Kiểm tra chữ ký nhị phân Magic Bytes (Ngăn chặn triệt để Stored XSS / MIME Spoofing)
    const validation = validateImageMagicBytes(fileBuffer, ["jpeg", "png", "webp"]);
    if (!validation.isValid || !validation.mimeType || !validation.extension) {
      return NextResponse.json(
        { error: validation.error || "Định dạng file không được hỗ trợ (chỉ nhận JPG, PNG, WEBP)" },
        { status: 400 }
      );
    }

    const verifiedMimeType = validation.mimeType;
    const verifiedExt = validation.extension;

    // 2. Tra cứu avatar cũ của user để dọn dẹp file rác sau khi tải mới thành công
    const { data: currentProfile } = await supabaseAdmin
      .from("profiles")
      .select("custom_avatar, photo_url")
      .eq("id", auth.userId)
      .maybeSingle();
    const oldAvatarUrl = currentProfile?.custom_avatar || currentProfile?.photo_url || null;

    const safeFileName = sanitizeStorageKey(`${auth.userId}_${Date.now()}.${verifiedExt}`);
    const filePath = `avatars/${safeFileName}`;

    let avatarUrl: string | null = null;

    // 3. Ưu tiên tải lên Cloudflare R2 (0đ băng thông, lưu trữ vĩnh viễn, CDN siêu tốc)
    if (isR2Configured()) {
      avatarUrl = await uploadToR2({
        key: filePath,
        buffer: fileBuffer,
        contentType: verifiedMimeType,
        category: "ugc",
      });
    }

    // 4. Dự phòng Supabase Storage nếu R2 không khả dụng
    if (!avatarUrl) {
      const { error: uploadError } = await supabaseAdmin.storage
        .from("avatars")
        .upload(filePath, fileBuffer, {
          upsert: true,
          contentType: verifiedMimeType,
        });

      if (uploadError) {
        console.error("[Avatar Upload API] Lỗi storage:", uploadError);
        return NextResponse.json({ error: "Lỗi lưu trữ ảnh: " + uploadError.message }, { status: 500 });
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from("avatars")
        .getPublicUrl(filePath);

      avatarUrl = publicUrlData?.publicUrl || null;
    }

    if (!avatarUrl) {
      return NextResponse.json({ error: "Không thể lấy URL ảnh" }, { status: 500 });
    }

    // 5. Cập nhật ngay hồ sơ người dùng trong database
    const now = Date.now();
    await supabaseAdmin
      .from("profiles")
      .update({
        custom_avatar: avatarUrl,
        photo_url: avatarUrl,
        updated_at: now,
      })
      .eq("id", auth.userId);

    // 6. Tự động dọn dẹp avatar cũ (Orphaned File Cleanup) nếu có
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
