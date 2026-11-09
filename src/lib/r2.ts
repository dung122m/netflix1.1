import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { checkR2QuotaAllowance, recordSuccessfulR2Upload, getR2QuotaStatus } from "./r2QuotaGuard";
import r2Manifest from "@/data/r2AssetsManifest.json";

export { getR2QuotaStatus };

/**
 * Tra cứu URL CDN R2 nhanh 0ms cho asset tĩnh đã được pre-warm
 */
export function getR2AssetUrl(key: string): string | null {
  return (r2Manifest as Record<string, string>)[key] || null;
}

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME || "nanaflix-media";
const publicBaseUrl = process.env.R2_PUBLIC_URL || "https://media.nanaflix.asia";

export const isR2Configured = (): boolean =>
  Boolean(accountId && accessKeyId && secretAccessKey);

let r2ClientInstance: S3Client | null = null;

export function getR2Client(): S3Client | null {
  if (!isR2Configured()) return null;

  if (!r2ClientInstance) {
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
        Bucket: bucketName,
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
        Bucket: bucketName,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

