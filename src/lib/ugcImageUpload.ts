import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isR2Configured, uploadToR2 } from "@/lib/r2";
import { validateImageMagicBytes } from "@/lib/fileValidation";

export { NO_CACHE_HEADERS as UGC_NO_CACHE_HEADERS } from "@/lib/cacheHeaders";

interface ParseImageUploadOptions {
  maxBytes: number;
  sizeErrorMessage: string;
  allowedTypes: Parameters<typeof validateImageMagicBytes>[1];
  formatErrorMessage: string;
  extraFieldName?: string;
}

type ParseImageUploadResult =
  | {
      ok: true;
      buffer: Buffer;
      mimeType: string;
      extension: string;
      extraFieldValue: string | null;
    }
  | {
      ok: false;
      response: NextResponse;
    };

/**
 * Parse and validate multipart or base64 UGC image uploads with magic-byte verification.
 */
export async function parseUgcImageUpload(
  req: NextRequest,
  options: ParseImageUploadOptions
): Promise<ParseImageUploadResult> {
  const contentType = req.headers.get("content-type") || "";
  let fileBuffer: Buffer | null = null;
  let extraFieldValue: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return { ok: false, response: NextResponse.json({ error: "Thiếu file ảnh" }, { status: 400 }) };
    }
    if (file.size > options.maxBytes) {
      return { ok: false, response: NextResponse.json({ error: options.sizeErrorMessage }, { status: 400 }) };
    }
    const bytes = await file.arrayBuffer();
    fileBuffer = Buffer.from(bytes);
    if (options.extraFieldName) {
      extraFieldValue = (formData.get(options.extraFieldName) as string) || null;
    }
  } else {
    const body = await req.json().catch(() => null);
    if (!body?.base64) {
      return { ok: false, response: NextResponse.json({ error: "Thiếu dữ liệu ảnh" }, { status: 400 }) };
    }
    const rawBase64 = String(body.base64);
    const matches = rawBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    fileBuffer = matches && matches.length === 3
      ? Buffer.from(matches[2], "base64")
      : Buffer.from(rawBase64, "base64");

    if (fileBuffer.length > options.maxBytes) {
      return { ok: false, response: NextResponse.json({ error: options.sizeErrorMessage }, { status: 400 }) };
    }
    if (options.extraFieldName && body?.[options.extraFieldName]) {
      extraFieldValue = String(body[options.extraFieldName]);
    }
  }

  if (!fileBuffer || fileBuffer.length === 0) {
    return { ok: false, response: NextResponse.json({ error: "Dữ liệu ảnh không hợp lệ" }, { status: 400 }) };
  }

  const validation = validateImageMagicBytes(fileBuffer, options.allowedTypes);
  if (!validation.isValid || !validation.mimeType || !validation.extension) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: validation.error || options.formatErrorMessage },
        { status: 400 }
      ),
    };
  }

  return {
    ok: true,
    buffer: fileBuffer,
    mimeType: validation.mimeType,
    extension: validation.extension,
    extraFieldValue,
  };
}

/**
 * Upload UGC image to Cloudflare R2 primary storage with Supabase Storage fallback.
 */
export async function uploadUgcImageToStorage(params: {
  filePath: string;
  buffer: Buffer;
  contentType: string;
  supabaseAdmin: SupabaseClient | null;
  supabaseBucket: string;
  logPrefix: string;
}): Promise<{ url: string | null; storageError?: string }> {
  if (isR2Configured()) {
    const r2Url = await uploadToR2({
      key: params.filePath,
      buffer: params.buffer,
      contentType: params.contentType,
      category: "ugc",
    });
    if (r2Url) return { url: r2Url };
  }

  if (params.supabaseAdmin) {
    const { error: uploadError } = await params.supabaseAdmin.storage
      .from(params.supabaseBucket)
      .upload(params.filePath, params.buffer, {
        upsert: true,
        contentType: params.contentType,
      });

    if (uploadError) {
      console.warn(`[${params.logPrefix}] Supabase storage fallback error:`, uploadError.message);
      return { url: null, storageError: uploadError.message };
    }

    const { data: publicUrlData } = params.supabaseAdmin.storage
      .from(params.supabaseBucket)
      .getPublicUrl(params.filePath);

    return { url: publicUrlData?.publicUrl || null };
  }

  return { url: null };
}
