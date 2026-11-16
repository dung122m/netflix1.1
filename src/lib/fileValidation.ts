/**
 * Utility for verifying file signatures (Magic Bytes) and sanitizing uploaded media files.
 * Defends against MIME-type spoofing, malicious payloads, and Stored XSS.
 */

export interface ImageValidationResult {
  isValid: boolean;
  mimeType?: string;
  extension?: string;
  error?: string;
}

/**
 * Validates binary buffer by checking file magic numbers (file header signatures).
 * Guarantees that client cannot bypass validation by simply forging `Content-Type` header or file extension.
 *
 * Supported formats:
 * - JPEG / JPG: FF D8 FF
 * - PNG: 89 50 4E 47 0D 0A 1A 0A
 * - WebP: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
 * - GIF: 47 49 46 38 37 61 or 47 49 46 38 39 61 (GIF87a / GIF89a)
 */
export function validateImageMagicBytes(
  buffer: Buffer | Uint8Array,
  allowedFormats: Array<"jpeg" | "png" | "webp" | "gif"> = ["jpeg", "png", "webp", "gif"]
): ImageValidationResult {
  if (!buffer || buffer.length < 12) {
    return {
      isValid: false,
      error: "Tệp tin quá nhỏ hoặc rỗng (không phải ảnh hợp lệ)",
    };
  }

  const b = buffer instanceof Buffer ? buffer : Buffer.from(buffer);

  // 1. JPEG Check: FF D8 FF
  if (
    allowedFormats.includes("jpeg") &&
    b[0] === 0xff &&
    b[1] === 0xd8 &&
    b[2] === 0xff
  ) {
    return {
      isValid: true,
      mimeType: "image/jpeg",
      extension: "jpg",
    };
  }

  // 2. PNG Check: 89 50 4E 47 0D 0A 1A 0A
  if (
    allowedFormats.includes("png") &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    return {
      isValid: true,
      mimeType: "image/png",
      extension: "png",
    };
  }

  // 3. WebP Check: RIFF (bytes 0-3) + WEBP (bytes 8-11)
  if (
    allowedFormats.includes("webp") &&
    b[0] === 0x52 && // R
    b[1] === 0x49 && // I
    b[2] === 0x46 && // F
    b[3] === 0x46 && // F
    b[8] === 0x57 && // W
    b[9] === 0x45 && // E
    b[10] === 0x42 && // B
    b[11] === 0x50 // P
  ) {
    return {
      isValid: true,
      mimeType: "image/webp",
      extension: "webp",
    };
  }

  // 4. GIF Check: GIF87a or GIF89a
  if (
    allowedFormats.includes("gif") &&
    b[0] === 0x47 && // G
    b[1] === 0x49 && // I
    b[2] === 0x46 && // F
    b[3] === 0x38 && // 8
    (b[4] === 0x37 || b[4] === 0x39) && // 7 or 9
    b[5] === 0x61 // a
  ) {
    return {
      isValid: true,
      mimeType: "image/gif",
      extension: "gif",
    };
  }

  return {
    isValid: false,
    error: "Định dạng file không được hỗ trợ hoặc nội dung file không khớp với định dạng ảnh.",
  };
}

/**
 * Sanitizes a storage key / file name to prevent directory traversal and illegal characters.
 */
export function sanitizeStorageKey(raw: string): string {
  return raw
    .replace(/\.\./g, "") // Prevent directory traversal
    .replace(/[^a-zA-Z0-9_\-\/.]/g, "_") // Safe chars only
    .replace(/\/+/g, "/") // Collapse consecutive slashes
    .replace(/^\/+/, ""); // Trim leading slash
}
