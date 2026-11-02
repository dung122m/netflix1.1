/**
 * Request Validation, Input Sanitization & Anti-Abuse Guards for Nanaflix
 * - HTTP Method & Content-Type enforcement
 * - Request Body Size limitation (Anti-OOM / Anti-Buffer-Overflow)
 * - Deterministic Injection & XSS pattern inspection
 * - Anti-Spam & Link Flood detection
 */

import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// 1. HTTP PROTOCOL ENFORCEMENT
// ============================================================================

/**
 * Enforce allowed HTTP methods. Returns 405 with Allow header if method is not permitted.
 */
export function validateHttpMethod(
  req: NextRequest,
  allowedMethods: string[]
): NextResponse | null {
  const method = req.method.toUpperCase();
  const allowed = allowedMethods.map((m) => m.toUpperCase());

  if (!allowed.includes(method)) {
    return NextResponse.json(
      { error: `Phương thức ${method} không được hỗ trợ.` },
      {
        status: 405,
        headers: {
          Allow: allowed.join(", "),
        },
      }
    );
  }
  return null;
}

/**
 * Validate Content-Type for POST / PUT / PATCH requests
 */
export function validateContentType(
  req: NextRequest,
  expectedPrefixes: string[] = ["application/json"]
): NextResponse | null {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS" || method === "DELETE") {
    return null;
  }

  const contentType = req.headers.get("content-type")?.toLowerCase() || "";
  const isValid = expectedPrefixes.some((prefix) => contentType.includes(prefix.toLowerCase()));

  if (!isValid) {
    return NextResponse.json(
      {
        error: `Định dạng yêu cầu không hợp lệ. Yêu cầu: ${expectedPrefixes.join(" hoặc ")}.`,
      },
      {
        status: 415,
      }
    );
  }
  return null;
}

/**
 * Check Content-Length before parsing large payloads into memory
 */
export function validateContentLength(
  req: NextRequest,
  maxBytes: number = 100 * 1024 // Default 100KB for standard JSON APIs
): NextResponse | null {
  const contentLength = req.headers.get("content-length");
  if (contentLength) {
    const bytes = parseInt(contentLength, 10);
    if (!isNaN(bytes) && bytes > maxBytes) {
      return NextResponse.json(
        {
          error: `Dung lượng yêu cầu vượt quá giới hạn tối đa cho phép (${Math.round(maxBytes / 1024)}KB).`,
        },
        { status: 413 }
      );
    }
  }
  return null;
}

/**
 * Safely parse JSON body with strict size checks to prevent memory exhaustion
 */
export async function safeParseJson<T = Record<string, unknown>>(
  req: NextRequest,
  maxBytes: number = 100 * 1024
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  // 1. Content-Length pre-check
  const lengthCheck = validateContentLength(req, maxBytes);
  if (lengthCheck) {
    return { success: false, response: lengthCheck };
  }

  // 2. Read text body and check exact byte size
  try {
    const rawText = await req.text();
    const byteLength = Buffer.byteLength(rawText, "utf-8");

    if (byteLength > maxBytes) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: `Nội dung yêu cầu vượt quá giới hạn (${Math.round(maxBytes / 1024)}KB).`,
          },
          { status: 413 }
        ),
      };
    }

    if (!rawText.trim()) {
      return { success: true, data: {} as T };
    }

    const data = JSON.parse(rawText) as T;
    return { success: true, data };
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Cú pháp JSON trong yêu cầu không hợp lệ." },
        { status: 400 }
      ),
    };
  }
}

// ============================================================================
// 2. INJECTION & MALICIOUS PATTERN DETECTION
// ============================================================================

const DANGEROUS_PATTERNS = {
  XSS: /(<\s*script\b|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|on(?:error|load|click|mouseover|submit|focus)\s*=|document\.(?:cookie|location|domain)|window\.(?:location|eval)|eval\s*\()/i,
  SQLI: /(\b(?:UNION\s+ALL\s+SELECT|UNION\s+SELECT|DROP\s+TABLE|ALTER\s+TABLE|INFORMATION_SCHEMA|SLEEP\s*\(\s*\d+\s*\))\b|'\s*(?:OR|AND)\s+'?1'?\s*=\s*'?1|--\s*$|;\s*--)/i,
  PATH_TRAVERSAL: /(?:\.\.[\\/]|%2e%2e(?:%2f|%5c)|%252e%252e|\/etc\/(?:passwd|shadow)|\/proc\/self)/i,
  NULL_BYTE: /\0/,
};

/**
 * Inspect raw string content for common attack vectors
 */
export function detectMaliciousPayload(content: unknown): {
  isMalicious: boolean;
  type?: "xss" | "sqli" | "path_traversal" | "null_byte";
  reason?: string;
} {
  if (!content) return { isMalicious: false };

  const str = typeof content === "string" ? content : JSON.stringify(content);

  if (DANGEROUS_PATTERNS.NULL_BYTE.test(str)) {
    return {
      isMalicious: true,
      type: "null_byte",
      reason: "Phát hiện byte null bất thường trong nội dung.",
    };
  }

  if (DANGEROUS_PATTERNS.XSS.test(str)) {
    return {
      isMalicious: true,
      type: "xss",
      reason: "Nội dung chứa đoạn mã hoặc thuộc tính thực thi không an toàn (XSS).",
    };
  }

  if (DANGEROUS_PATTERNS.SQLI.test(str)) {
    return {
      isMalicious: true,
      type: "sqli",
      reason: "Nội dung chứa cú pháp truy vấn cơ sở dữ liệu bất thường (SQL Injection).",
    };
  }

  if (DANGEROUS_PATTERNS.PATH_TRAVERSAL.test(str)) {
    return {
      isMalicious: true,
      type: "path_traversal",
      reason: "Phát hiện điều hướng thư mục vượt cấp không an toàn (Path Traversal).",
    };
  }

  return { isMalicious: false };
}

// ============================================================================
// 3. COMMENT & CONTENT SPAM HEURISTICS
// ============================================================================

const SPAM_KEYWORDS = [
  /t\.me\//i,
  /telegram/i,
  /zalo\.me\//i,
  /cờ bạc/i,
  /cá cược/i,
  /nạp rút/i,
  /kèo nhà cái/i,
  /kubet/i,
  /thabet/i,
  /fb88/i,
  /w88/i,
  /hitclub/i,
  /b52/i,
];

/**
 * Heuristics to detect automated bot spam in user comments and reviews
 */
export function detectContentSpam(content: string): {
  isSpam: boolean;
  reason?: string;
} {
  if (!content || typeof content !== "string") {
    return { isSpam: false };
  }

  const trimmed = content.trim();

  // 1. Excessive length
  if (trimmed.length > 2000) {
    return { isSpam: true, reason: "Nội dung bình luận quá dài (tối đa 2000 ký tự)." };
  }

  // 2. Character repetition flood (e.g. "aaaaaaaaaaaaaa..." or "phim hayyyyyyyyyyyyyyyyy")
  if (/(.)\1{12,}/i.test(trimmed)) {
    return { isSpam: true, reason: "Nội dung lặp lại ký tự bất thường." };
  }

  // 3. Invisible / Zero-width characters flood
  if (/[\u200B-\u200D\uFEFF]/.test(trimmed)) {
    return { isSpam: true, reason: "Phát hiện ký tự ẩn hoặc định dạng không hợp lệ." };
  }

  // 4. Link flood (more than 1 URL in a comment)
  const urlMatches = trimmed.match(/https?:\/\/[^\s]+/gi);
  if (urlMatches && urlMatches.length > 1) {
    return { isSpam: true, reason: "Bình luận chứa quá nhiều liên kết ngoài." };
  }

  // 5. Blacklisted spam keywords (Gambling, Telegram bots, illicit links)
  for (const kw of SPAM_KEYWORDS) {
    if (kw.test(trimmed)) {
      return { isSpam: true, reason: "Nội dung chứa từ khóa bị cấm hoặc liên kết quảng cáo." };
    }
  }

  return { isSpam: false };
}

// ============================================================================
// 4. DUPLICATE CONTENT DETECTION & CONCURRENCY GUARD
// ============================================================================

interface RecentSubmission {
  hash: string;
  timestamp: number;
}
const recentSubmissionsMap = new Map<string, RecentSubmission>();

export function hashContentSimple(content: string): string {
  let hash = 0;
  const str = content.trim().toLowerCase();
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return String(hash);
}

export function isDuplicateContent(
  userKey: string,
  content: string,
  windowSeconds: number = 60
): boolean {
  if (!userKey || !content) return false;
  const now = Date.now();
  const rec = recentSubmissionsMap.get(userKey);
  if (!rec) return false;

  if (now - rec.timestamp > windowSeconds * 1000) {
    recentSubmissionsMap.delete(userKey);
    return false;
  }

  const currentHash = hashContentSimple(content);
  return rec.hash === currentHash;
}

export function recordRecentContent(userKey: string, content: string): void {
  if (!userKey || !content) return;
  recentSubmissionsMap.set(userKey, {
    hash: hashContentSimple(content),
    timestamp: Date.now(),
  });
}

export function _resetRecentSubmissionsForTesting(): void {
  recentSubmissionsMap.clear();
}

// In-flight concurrency lock to prevent parallel double-submissions
const inFlightOperations = new Map<string, Promise<unknown>>();

export async function executeWithConcurrencyGuard<T>(
  lockKey: string,
  fn: () => Promise<T>
): Promise<T> {
  const existing = inFlightOperations.get(lockKey);
  if (existing) {
    return existing as Promise<T>;
  }
  const promise = (async () => {
    try {
      return await fn();
    } finally {
      inFlightOperations.delete(lockKey);
    }
  })();
  inFlightOperations.set(lockKey, promise);
  return promise;
}

// ============================================================================
// 5. ANTI-CRAWLING PAGINATION SANITIZER
// ============================================================================

export interface PaginationOptions {
  defaultLimit?: number;
  maxLimit?: number;
  maxPage?: number;
}

/**
 * Sanitize and enforce strict boundaries on pagination parameters
 * Prevents mass scraping, unbounded database allocation, and pagination abuse.
 */
export function sanitizePagination(
  rawPage: unknown,
  rawLimit: unknown,
  options?: PaginationOptions
): { page: number; limit: number } {
  const defaultLimit = options?.defaultLimit ?? 20;
  const maxLimit = options?.maxLimit ?? 50;
  const maxPage = options?.maxPage ?? 50;

  let page = 1;
  if (typeof rawPage === "number" && !isNaN(rawPage)) {
    page = Math.floor(rawPage);
  } else if (typeof rawPage === "string") {
    const parsed = parseInt(rawPage, 10);
    if (!isNaN(parsed)) page = parsed;
  }
  page = Math.max(1, Math.min(page, maxPage));

  let limit = defaultLimit;
  if (typeof rawLimit === "number" && !isNaN(rawLimit)) {
    limit = Math.floor(rawLimit);
  } else if (typeof rawLimit === "string") {
    const parsed = parseInt(rawLimit, 10);
    if (!isNaN(parsed)) limit = parsed;
  }
  limit = Math.max(1, Math.min(limit, maxLimit));

  return { page, limit };
}

// Re-export core text sanitization for unified access
export { sanitizeSafeText } from "./security";
