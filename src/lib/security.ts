/**
 * Trung tâm Bảo Mật & Phòng Thủ Hệ Thống (System Security & Anti-Exploit Module)
 * Bao gồm:
 * 1. Anti-XSS & Input Sanitization (Chống mã độc chèn XSS, script injection, HTML hijacking)
 * 2. Anti-SSRF URL Guard (Chống tấn công nội mạng & proxy abuse)
 * 3. Rate Limiter (Chống Spam, DDoS, Brute-force API)
 * 4. Content Payload Validation (Giới hạn độ dài, ngăn tràn bộ nhớ)
 */


// ==========================================
// 1. ANTI-XSS & CHUẨN HÓA ĐẦU VÀO AN TOÀN
// ==========================================

/**
 * Làm sạch và trung hòa các ký tự/mã nguy hiểm trong chuỗi văn bản người dùng nhập
 */
export function sanitizeSafeText(input: string | null | undefined, maxLength = 3000): string {
  if (!input) return "";

  let cleaned = String(input);

  // 1. Loại bỏ các byte null nguy hiểm
  cleaned = cleaned.replace(/\0/g, "");

  // 2. Loại bỏ các thẻ script, iframe, object, embed, form, input, button nguy hiểm
  cleaned = cleaned.replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "");
  cleaned = cleaned.replace(/<\s*iframe[^>]*>[\s\S]*?<\s*\/\s*iframe\s*>/gi, "");
  cleaned = cleaned.replace(/<\s*object[^>]*>[\s\S]*?<\s*\/\s*object\s*>/gi, "");
  cleaned = cleaned.replace(/<\s*embed[^>]*>[\s\S]*?<\s*\/\s*embed\s*>/gi, "");
  cleaned = cleaned.replace(/<\s*style[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi, "");

  // 3. Loại bỏ các thuộc tính event handler như onload=, onerror=, onclick=, onmouseover=...
  cleaned = cleaned.replace(/\bon\w+\s*=\s*(['"]).*?\1/gi, "");
  cleaned = cleaned.replace(/\bon\w+\s*=\s*[^>\s]+/gi, "");

  // 4. Loại bỏ javascript: / vbscript: / data: URI lừa đảo
  cleaned = cleaned.replace(/(javascript|vbscript|data):/gi, "$1_blocked:");

  // 5. Cắt ngắn nếu vượt quá độ dài cho phép để chống tràn bộ nhớ
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }

  return cleaned.trim();
}

/**
 * Mã hóa các ký tự HTML đặc biệt để render an toàn tuyệt đối
 */
export function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==========================================
// 2. ANTI-SSRF URL GUARD (CHỐNG TẤN CÔNG PROXY/NỘI MẠNG)
// ==========================================

const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\./,                          // 127.0.0.0/8 Loopback
  /^10\./,                           // 10.0.0.0/8 Private
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12 Private
  /^192\.168\./,                     // 192.168.0.0/16 Private
  /^169\.254\./,                     // 169.254.0.0/16 Link-local / Cloud metadata
  /^0\.0\.0\.0$/,
  /^::1$/,                           // IPv6 Loopback
  /^fc00:/i,                         // IPv6 Unique Local
  /^fe80:/i,                         // IPv6 Link-Local
];

/**
 * Kiểm tra xem một URL có phải là URL công khai an toàn (không trỏ tới localhost/mạng nội bộ/metadata)
 */
export function isSafePublicUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== "string") return false;

  try {
    const parsed = new URL(urlString.trim());

    // Chỉ cho phép giao thức http hoặc https
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Kiểm tra các dải IP nội bộ & hostname nguy hiểm
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return false;
      }
    }

    // Không cho phép các cổng nhạy cảm (SSH, FTP, Database ports...)
    if (parsed.port) {
      const portNum = parseInt(parsed.port, 10);
      const allowedPorts = [80, 443, 8080, 8443];
      if (!allowedPorts.includes(portNum) && (portNum < 1024 || portNum === 3000 || portNum === 3306 || portNum === 5432 || portNum === 27017 || portNum === 6379)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

// ==========================================
// 3. IN-MEMORY RATE LIMITER (DÀNH CHO PROXIES & LEGACY)
// ==========================================

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Dọn dẹp RAM định kỳ mỗi 5 phút
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    const expiry = 5 * 60 * 1000;
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < expiry);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export { getClientIp, cleanIpString } from "./clientIp";

/**
 * Kiểm tra giới hạn tốc độ yêu cầu nội bộ RAM (Sliding Window Rate Limit)
 * @returns { allowed: boolean, remaining: number, resetSeconds: number }
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 60,
  windowSeconds: number = 60
): { allowed: boolean; remaining: number; resetSeconds: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  let record = rateLimitStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Loại bỏ các request đã quá thời gian của cửa sổ
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (record.timestamps.length >= maxRequests) {
    const oldest = record.timestamps[0] || now;
    const resetSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetSeconds: Math.max(1, resetSeconds),
    };
  }

  record.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxRequests - record.timestamps.length,
    resetSeconds: windowSeconds,
  };
}

// ==========================================
// 4. IN-MEMORY RATE LIMITER (ZERO REDIS COMMANDS)
// ==========================================

// Local Ephemeral Cache (L1): Cho phản hồi 0ms khi một IP đã bị khóa trong cửa sổ hiện tại
const localBlockedCache = new Map<string, number>();

// In-Memory Fixed Window Store (Zero Redis commands, 0ms latency)
const localFallbackStore = new Map<string, { count: number; expiresAt: number }>();

/**
 * Kiểm tra giới hạn tốc độ In-Memory (Zero Redis commands, 0 quota)
 * @returns { allowed: boolean, remaining: number, resetSeconds: number }
 */
export async function checkDistributedRateLimit(
  key: string,
  maxRequests: number = 60,
  windowSeconds: number = 60,
  _timeoutMs: number = 200
): Promise<{ allowed: boolean; remaining: number; resetSeconds: number }> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const currentBucket = Math.floor(now / windowMs);
  const bucketKey = `rl:${key}:${currentBucket}`;
  const resetSeconds = Math.max(1, Math.ceil(((currentBucket + 1) * windowMs - now) / 1000));

  // 1. Kiểm tra L1 Ephemeral Blocked Cache (0ms latency, 0 Redis commands)
  const blockedUntil = localBlockedCache.get(bucketKey);
  if (blockedUntil && blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      resetSeconds: Math.max(1, Math.ceil((blockedUntil - now) / 1000)),
    };
  }

  // 2. In-memory Fixed Window Store (Zero Redis commands)
  let fallbackRec = localFallbackStore.get(bucketKey);
  if (!fallbackRec || fallbackRec.expiresAt < now) {
    fallbackRec = { count: 1, expiresAt: (currentBucket + 1) * windowMs };
    localFallbackStore.set(bucketKey, fallbackRec);
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetSeconds,
    };
  }

  fallbackRec.count += 1;
  if (fallbackRec.count > maxRequests) {
    localBlockedCache.set(bucketKey, (currentBucket + 1) * windowMs);
    return {
      allowed: false,
      remaining: 0,
      resetSeconds,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - fallbackRec.count),
    resetSeconds,
  };
}

