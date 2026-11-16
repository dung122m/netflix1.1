import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { cacheService } from "@/lib/cache";
import { checkR2QuotaAllowance, recordSuccessfulR2Upload, getR2QuotaStatus } from "./r2QuotaGuard";
import { refreshR2Manifest, getR2AssetUrl, getR2BannerUrl, getR2TeamLogoUrl } from "./r2Manifest";

export { getR2QuotaStatus, refreshR2Manifest, getR2AssetUrl, getR2BannerUrl, getR2TeamLogoUrl };

// Multi-Tier Existence Cache (L1 RAM + L2 Redis DB 3)
const R2_EXISTS_L1_CACHE = new Map<string, { exists: boolean; expiresAt: number }>();
const MAX_R2_EXISTS_L1 = 5000;
const R2_EXISTS_HIT_TTL_MS = 6 * 60 * 60 * 1000; // 6h RAM
const R2_EXISTS_MISS_TTL_MS = 5 * 60 * 1000;      // 5m RAM
const R2_REDIS_HIT_TTL_SEC = 7 * 24 * 60 * 60;    // 7 ngày Redis DB 3
const R2_REDIS_MISS_TTL_SEC = 600;                 // 10 phút Redis DB 3

function setR2ExistsL1(key: string, exists: boolean): void {
  if (R2_EXISTS_L1_CACHE.size >= MAX_R2_EXISTS_L1) {
    const firstKey = R2_EXISTS_L1_CACHE.keys().next().value;
    if (firstKey !== undefined) R2_EXISTS_L1_CACHE.delete(firstKey);
  }
  R2_EXISTS_L1_CACHE.set(key, {
    exists,
    expiresAt: Date.now() + (exists ? R2_EXISTS_HIT_TTL_MS : R2_EXISTS_MISS_TTL_MS),
  });
}

function getR2ExistsL1(key: string): boolean | undefined {
  const hit = R2_EXISTS_L1_CACHE.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    R2_EXISTS_L1_CACHE.delete(key);
    return undefined;
  }
  return hit.exists;
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
    setR2ExistsL1(key, true);
    cacheService.set(`r2:exists:${key}`, true, R2_REDIS_HIT_TTL_SEC).catch(() => {});
    return getR2PublicUrl(key);
  } catch (err) {
    console.error("[R2 Storage] Upload failed for key:", key, err);
    return null;
  }
}

/**
 * Check if an object exists in Cloudflare R2 with L1 RAM + L2 Redis DB 3 caching.
 * Prevents redundant S3 HeadObject (Class B) operations across serverless lambdas.
 */
export async function checkR2ObjectExists(key: string): Promise<boolean> {
  // 1. Kiểm tra L1 RAM cache (0ms)
  const l1Hit = getR2ExistsL1(key);
  if (l1Hit !== undefined) {
    return l1Hit;
  }

  // 2. Kiểm tra Redis DB 3 (~2-5ms)
  const redisKey = `r2:exists:${key}`;
  try {
    const redisVal = await cacheService.get<boolean>(redisKey);
    if (typeof redisVal === "boolean") {
      setR2ExistsL1(key, redisVal);
      return redisVal;
    }
  } catch {
    // Graceful fallback nếu Redis gặp sự cố
  }

  // 3. Fallback: S3 HeadObjectCommand
  const client = getR2Client();
  if (!client) return false;

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || "nanaflix-media",
        Key: key,
      })
    );
    setR2ExistsL1(key, true);
    cacheService.set(redisKey, true, R2_REDIS_HIT_TTL_SEC).catch(() => {});
    return true;
  } catch {
    setR2ExistsL1(key, false);
    cacheService.set(redisKey, false, R2_REDIS_MISS_TTL_SEC).catch(() => {});
    return false;
  }
}

