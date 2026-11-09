import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { checkR2QuotaAllowance, recordSuccessfulR2Upload, getR2QuotaStatus } from "./r2QuotaGuard";
import r2Manifest from "@/data/r2AssetsManifest.json";

export { getR2QuotaStatus };

const inFlightBannerSyncs = new Set<string>();

/**
 * Tra cứu URL CDN R2 nhanh 0ms cho asset tĩnh đã được pre-warm
 */
export function getR2AssetUrl(key: string): string | null {
  return (r2Manifest as Record<string, string>)[key] || null;
}

/**
 * Tra cứu thông minh Banner phim từ R2 CDN theo slug, URL gốc hoặc mã hash TMDb
 */
export function getR2BannerUrl(
  slug?: string | null,
  sourceUrl?: string | null
): string | null {
  if (slug) {
    const clean = slug.toLowerCase().trim();
    const noYear = clean.replace(/-\d{4}$/, "");
    const match =
      getR2AssetUrl(`banners/${clean}`) ||
      getR2AssetUrl(`banners/${clean}.jpg`) ||
      getR2AssetUrl(`banners/${clean}.webp`) ||
      getR2AssetUrl(`banners/${noYear}`) ||
      getR2AssetUrl(`banners/${noYear}.jpg`) ||
      getR2AssetUrl(`banners/${noYear}.webp`);
    if (match) return match;
  }
  if (sourceUrl && typeof sourceUrl === "string") {
    const directMatch = getR2AssetUrl(sourceUrl);
    if (directMatch) return directMatch;
    const filename = sourceUrl.split("/").pop()?.split("?")[0];
    if (filename) {
      const fileMatch = getR2AssetUrl(`banners/${filename}`);
      if (fileMatch) return fileMatch;
    }
  }
  return null;
}

/**
 * Đồng bộ đúng các banner phim thực sự xuất hiện trên Hero Banner (On-Demand Just-In-Time)
 * - Chỉ tải đúng 6-8 phim đang hiển thị cho người dùng, không bao giờ cào thừa thãi
 * - Tự động khử trùng lặp (Dedup qua in-flight set và manifest)
 * - Tuân thủ cầu chì Quota Guard
 */
export async function syncHeroBannerToR2(
  slug: string,
  sourceUrl: string
): Promise<string | null> {
  if (
    !slug ||
    !sourceUrl ||
    !sourceUrl.startsWith("http") ||
    sourceUrl.includes("media.nanaflix.asia")
  ) {
    return null;
  }

  const cleanSlug = slug.toLowerCase().trim();
  const existing =
    getR2AssetUrl(`banners/${cleanSlug}`) ||
    getR2AssetUrl(`banners/${cleanSlug}.jpg`) ||
    getR2AssetUrl(`banners/${cleanSlug}.webp`);
  if (existing) return existing;

  if (inFlightBannerSyncs.has(cleanSlug)) return null;
  inFlightBannerSyncs.add(cleanSlug);

  try {
    const res = await fetch(sourceUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: "https://nanaflix.asia",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    if (buffer.length < 500 || buffer.length > 2.5 * 1024 * 1024) {
      return null;
    }

    const key = `banners/${cleanSlug}.jpg`;
    const publicUrl = await uploadToR2({
      key,
      buffer,
      contentType: "image/jpeg",
    });

    if (publicUrl) {
      (r2Manifest as Record<string, string>)[key] = publicUrl;
      (r2Manifest as Record<string, string>)[`banners/${cleanSlug}`] = publicUrl;
      return publicUrl;
    }
    return null;
  } catch {
    return null;
  } finally {
    inFlightBannerSyncs.delete(cleanSlug);
  }
}

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
  const publicBaseUrl = process.env.R2_PUBLIC_URL || "https://media.nanaflix.asia";
  const cleanBase = publicBaseUrl.replace(/\/+$/, "");
  const cleanKey = key.replace(/^\/+/, "");
  return `${cleanBase}/${cleanKey}`;
}

/**
 * Upload a binary buffer or stream to Cloudflare R2 bucket.
 * Returns public HTTPS URL if successful, or null on failure.
 */
export async function uploadToR2({
  key,
  buffer,
  contentType,
  cacheControl = "public, max-age=31536000, immutable",
  isBatchAdmin = false,
}: {
  key: string;
  buffer: Buffer | Uint8Array;
  contentType: string;
  cacheControl?: string;
  isBatchAdmin?: boolean;
}): Promise<string | null> {
  const client = getR2Client();
  if (!client) return null;

  // CẦU CHÌ BẢO VỆ QUOTA (CIRCUIT BREAKER)
  // Tuyệt đối không cho phép upload nếu sắp chạm trần hoặc bị spam
  const byteLength = buffer instanceof Buffer ? buffer.length : buffer.byteLength;
  const quotaCheck = checkR2QuotaAllowance(byteLength, isBatchAdmin);
  if (!quotaCheck.allowed) {
    console.warn(`[R2 Storage Shield] Upload rejected for ${key}: ${quotaCheck.reason}`);
    return null;
  }

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || "nanaflix-media",
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: cacheControl,
      })
    );

    recordSuccessfulR2Upload(byteLength);
    return getR2PublicUrl(key);
  } catch (err) {
    console.error("[R2 Storage] Upload failed for key:", key, err);
    return null;
  }
}

/**
 * Check if an object exists in Cloudflare R2.
 */
export async function checkR2ObjectExists(key: string): Promise<boolean> {
  const client = getR2Client();
  if (!client) return false;

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || "nanaflix-media",
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

