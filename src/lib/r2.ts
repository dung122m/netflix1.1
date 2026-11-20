import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { refreshR2Manifest, getR2AssetUrl, getR2BannerUrl, getR2TeamLogoUrl } from "./r2Manifest";

export { refreshR2Manifest, getR2AssetUrl, getR2BannerUrl, getR2TeamLogoUrl };

export const isR2Configured = (): boolean =>
  Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );

let r2ClientInstance: S3Client | null = null;

export function getR2Client(): S3Client | null {
  if (!isR2Configured()) return null;

  if (!r2ClientInstance) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    r2ClientInstance = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    });
  }

  return r2ClientInstance;
}

export function getR2PublicUrl(key: string): string {
  const publicBaseUrl =
    (typeof process !== "undefined" &&
      (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL)) ||
    "https://media.nanaflix.asia";
  const cleanBase = publicBaseUrl.replace(/\/+$/, "");
  const cleanKey = key.replace(/^\/+/, "");
  return `${cleanBase}/${cleanKey}`;
}

/**
 * Extracts storage key from a public URL if the URL points to this R2 bucket.
 * E.g. "https://media.nanaflix.asia/avatars/user123_456.jpg" -> "avatars/user123_456.jpg"
 */
export function extractR2KeyFromUrl(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  try {
    const publicBase =
      (typeof process !== "undefined" &&
        (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL)) ||
      "https://media.nanaflix.asia";
    const cleanPublicBase = publicBase.replace(/\/+$/, "").toLowerCase();
    const cleanInput = rawUrl.trim();

    if (cleanInput.toLowerCase().startsWith(cleanPublicBase)) {
      return cleanInput.slice(cleanPublicBase.length).replace(/^\/+/, "");
    }

    const parsed = new URL(cleanInput);
    if (parsed.hostname.includes("nanaflix.asia") || parsed.hostname.includes("r2.cloudflarestorage.com")) {
      return parsed.pathname.replace(/^\/+/, "");
    }
  } catch {
    if (rawUrl.startsWith("avatars/") || rawUrl.startsWith("covers/")) {
      return rawUrl;
    }
  }
  return null;
}

/**
 * Tải file (Buffer / Uint8Array) lên Cloudflare R2 bucket.
 * Phục vụ nội dung người dùng tạo (UGC: avatar, collection cover).
 */
export async function uploadToR2({
  key,
  buffer,
  contentType,
  cacheControl = "public, max-age=31536000, immutable",
  category: _category,
  isBatchAdmin: _isBatchAdmin,
}: {
  key: string;
  buffer: Buffer | Uint8Array;
  contentType: string;
  cacheControl?: string;
  isBatchAdmin?: boolean;
  category?: "ugc" | "cache" | "admin";
}): Promise<string | null> {
  const client = getR2Client();
  if (!client) return null;

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || "nanaflix-media",
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: cacheControl,
        Metadata: {
          "x-content-type-options": "nosniff",
        },
      })
    );

    return getR2PublicUrl(key);
  } catch (err) {
    console.error("[R2 Storage] Upload failed for key:", key, err);
    return null;
  }
}

/**
 * Xóa một file khỏi Cloudflare R2 bucket.
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  const client = getR2Client();
  if (!client) return false;

  const cleanKey = key.replace(/^\/+/, "");
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || "nanaflix-media",
        Key: cleanKey,
      })
    );
    return true;
  } catch (err) {
    console.error("[R2 Storage] Delete failed for key:", cleanKey, err);
    return false;
  }
}

/**
 * Xóa một file khỏi Cloudflare R2 thông qua public URL.
 */
export async function deleteFromR2ByUrl(url: string): Promise<boolean> {
  const key = extractR2KeyFromUrl(url);
  if (!key) return false;
  return deleteFromR2(key);
}
