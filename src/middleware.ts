import { NextRequest, NextResponse } from "next/server";
import { getRequestId } from "@/lib/requestId";

/**
 * Enterprise Edge Middleware for Nanaflix
 * - Chặn bot quét lỗ hổng tự động (Malicious Scanners / Exploit Probes)
 * - Chặn các đường dẫn dò quét (.env, .git, wp-admin, phpmyadmin...)
 * - Chặn các phương thức HTTP nguy hiểm (TRACE, TRACK)
 * - Tự động gắn Request ID & Security Headers
 * - Buộc chống cache (No-Store / Private) đối với API riêng tư
 */

// Danh sách các User-Agent của công cụ quét mã độc / Pentest bots
const MALICIOUS_USER_AGENTS = [
  /sqlmap/i,
  /nikto/i,
  /wpscan/i,
  /acunetix/i,
  /masscan/i,
  /zgrab/i,
  /gobuster/i,
  /dirbuster/i,
  /nmap/i,
  /censys/i,
];

// Danh sách các User-Agent cào dữ liệu hung hãn không mong muốn (chặn sớm tại Edge để triệt tiêu tải Redis DB1 & DB3)
// Giữ nguyên Googlebot, Bingbot, ClaudeBot và các Verified Bots hợp lệ theo yêu cầu
const AGGRESSIVE_SCRAPER_USER_AGENTS = [
  /bytespider/i,
  /petalbot/i,
  /ahrefsbot/i,
  /semrushbot/i,
  /dotbot/i,
  /mj12bot/i,
  /dataforseobot/i,
  /blexbot/i,
  /seekport/i,
  /screaming\s*frog/i,
  /zoominfobot/i,
  /exabot/i,
  /python-requests/i,
  /python-urllib/i,
  /scrapy/i,
  /aiohttp/i,
  /go-http-client/i,
  /node-fetch/i,
  /axios/i,
  /headlesschrome/i,
  /phantomjs/i,
  /selenium/i,
  /puppeteer/i,
];

// In-Memory Edge Rate Limiter cho tuyến đường diễn viên (/dien-vien/*)
// Chặn đứng hoàn toàn bão quét từ crawler mà không tiêu tốn lệnh Redis nào
interface EdgeRateLimitRecord {
  count: number;
  resetAt: number;
}
const ACTOR_EDGE_RATE_LIMIT = new Map<string, EdgeRateLimitRecord>();
const ACTOR_RL_MAX_REQUESTS = 15; // Tối đa 15 request trong 10 giây
const ACTOR_RL_WINDOW_MS = 10_000;
const MAX_ACTOR_RL_ENTRIES = 5000;

// Danh sách các đường dẫn dò quét lỗ hổng phổ biến của botnet
const BLOCKED_PATH_PATTERNS = [
  /^\/\.env(\..*)?$/i,
  /^\/\.git(\/.*)?$/i,
  /^\/\.aws(\/.*)?$/i,
  /^\/\.ds_store$/i,
  /^\/wp-(admin|login|includes|content)(\/.*)?$/i,
  /^\/xmlrpc\.php$/i,
  /^\/phpmyadmin(\/.*)?$/i,
  /^\/actuator(\/.*)?$/i,
  /^\/\.htaccess$/i,
  /^\/web\.config$/i,
  /^\/telescope(\/.*)?$/i,
];

/**
 * Constant-time string comparison for Edge Middleware (Zero external dependencies)
 */
function timingSafeEqualString(a?: string | null, b?: string | null): boolean {
  if (!a || !b || typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Origin Protection & Direct Vercel Domain Bypass Defense
 * - Protects Vercel origin from being bypassed directly via *.vercel.app.
 * - Enforces requests arrive through Cloudflare Edge proxy using shared EDGE_ORIGIN_SECRET.
 * - Safe by default: Fails open if EDGE_ORIGIN_SECRET is not configured or in development/test/preview.
 */
export function checkOriginProtection(req: NextRequest): NextResponse | null {
  const edgeSecret = process.env.EDGE_ORIGIN_SECRET?.trim();
  if (!edgeSecret) {
    // If not configured, fail-open to prevent breaking unconfigured environments
    return null;
  }

  // Bypass for local development, standalone tests, and Vercel preview environments
  const isTest = process.env.NODE_ENV === "test" || process.env.APP_ENV === "test";
  const isDev = process.env.NODE_ENV === "development";
  const isPreview = process.env.VERCEL_ENV === "preview" || process.env.APP_ENV === "preview";
  const isLoopback = req.nextUrl.hostname === "localhost" || req.nextUrl.hostname === "127.0.0.1";

  const isForcedTest = Boolean(req.headers.get("x-test-enforce-origin-protection"));
  if (!isForcedTest && (isTest || isDev || isPreview || isLoopback)) {
    return null;
  }

  const host = (req.headers.get("host") || req.nextUrl.host || "")
    .toLowerCase()
    .split(":")[0];
  const customDomain = (process.env.CUSTOM_DOMAIN || process.env.NEXT_PUBLIC_APP_URL || "")
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0]
    .toLowerCase();

  // 1. Direct *.vercel.app origin bypass detection
  if (customDomain && host.endsWith(".vercel.app") && host !== customDomain) {
    // For browser GET/HEAD requests, redirect permanently (308) to official custom domain
    if (req.method === "GET" || req.method === "HEAD") {
      const targetUrl = new URL(req.nextUrl.pathname + req.nextUrl.search, `https://${customDomain}`);
      return NextResponse.redirect(targetUrl, 308);
    }
    // For API calls directly targeting *.vercel.app origin, reject with 403 Forbidden
    return new NextResponse(
      JSON.stringify({
        error: "Truy cập trực tiếp origin bị từ chối. Vui lòng truy cập qua domain chính thức.",
      }),
      {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  }

  // 2. Validate secret header injected by Cloudflare Transform Rule (supporting both standard headers)
  const incomingSecret = (req.headers.get("x-nanaflix-edge-secret") || req.headers.get("x-edge-origin-secret"))?.trim();
  if (!incomingSecret || !timingSafeEqualString(incomingSecret, edgeSecret)) {
    return new NextResponse(
      JSON.stringify({
        error: "Truy cập không hợp lệ. Yêu cầu kết nối qua Cloudflare Edge Proxy.",
      }),
      {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  }

  return null;
}

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const method = req.method.toUpperCase();
  const requestId = getRequestId(req);

  // 1. Chặn các phương thức HTTP nguy hiểm
  if (method === "TRACE" || method === "TRACK") {
    return new NextResponse("Method Not Allowed", {
      status: 405,
      headers: {
        Allow: "GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS",
        "X-Request-Id": requestId,
      },
    });
  }

  // 2. Chặn các đường dẫn dò quét nhạy cảm
  for (const pattern of BLOCKED_PATH_PATTERNS) {
    if (pattern.test(pathname)) {
      return new NextResponse("Not Found", {
        status: 404,
        headers: {
          "X-Content-Type-Options": "nosniff",
          "X-Request-Id": requestId,
        },
      });
    }
  }

  // 3. Chặn các User-Agent của công cụ quét tự động
  const userAgent = req.headers.get("user-agent") || "";
  for (const agentPattern of MALICIOUS_USER_AGENTS) {
    if (agentPattern.test(userAgent)) {
      return new NextResponse("Forbidden Access", {
        status: 403,
        headers: {
          "X-Content-Type-Options": "nosniff",
          "X-Request-Id": requestId,
        },
      });
    }
  }

  // 3.1 Chặn các bot cào dữ liệu hung hãn không mong muốn (tiết kiệm 100% Redis commands)
  for (const scraperPattern of AGGRESSIVE_SCRAPER_USER_AGENTS) {
    if (scraperPattern.test(userAgent)) {
      return new NextResponse("Forbidden Access - Automated Scraper Disallowed", {
        status: 403,
        headers: {
          "X-Content-Type-Options": "nosniff",
          "X-Request-Id": requestId,
        },
      });
    }
  }

  // 4. Kiểm tra bảo vệ Origin (Chống bypass Cloudflare qua *.vercel.app)
  const originBlock = checkOriginProtection(req);
  if (originBlock) {
    originBlock.headers.set("X-Request-Id", requestId);
    return originBlock;
  }

  // 4.1 Chuẩn hóa URL trang diễn viên: Chuyển hướng 308 vĩnh viễn từ /dien-vien/:slug?id=:id sang /dien-vien/:id-:slug
  // Loại bỏ hoàn toàn query param ?id= để Next.js ISR / Edge Cache hoạt động 100% không bị Dynamic Rendering
  if (pathname.startsWith("/dien-vien/")) {
    const rawId = req.nextUrl.searchParams.get("id")?.trim();
    if (rawId && /^\d+$/.test(rawId)) {
      const rawSlug = pathname.slice("/dien-vien/".length).trim();
      if (rawSlug) {
        let cleanNameSlug = rawSlug;
        const prefixMatch = cleanNameSlug.match(/^(\d+)(?:-(.*))?$/);
        if (prefixMatch) {
          cleanNameSlug = prefixMatch[2] || "";
        } else {
          const suffixMatch = cleanNameSlug.match(/^(.*?)-(\d+)$/);
          if (suffixMatch) {
            cleanNameSlug = suffixMatch[1];
          }
        }

        const canonicalSlug = cleanNameSlug ? `${rawId}-${cleanNameSlug}` : rawId;
        const nextUrl = req.nextUrl.clone();
        nextUrl.pathname = `/dien-vien/${canonicalSlug}`;
        nextUrl.searchParams.delete("id");

        const redirectRes = NextResponse.redirect(nextUrl, 308);
        redirectRes.headers.set("X-Request-Id", requestId);
        redirectRes.headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
        return redirectRes;
      }
    }

    // 4.2 Giới hạn tần suất Edge cho trang diễn viên (chống crawler cào dồn dập, 0 Redis commands)
    const isSearchBot = /googlebot|bingbot|duckduckbot/i.test(userAgent);
    if (!isSearchBot) {
      const clientIp =
        req.headers.get("cf-connecting-ip") ||
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "unknown";
      const now = Date.now();
      const record = ACTOR_EDGE_RATE_LIMIT.get(clientIp);

      if (record && record.resetAt > now) {
        record.count++;
        if (record.count > ACTOR_RL_MAX_REQUESTS) {
          return new NextResponse(
            JSON.stringify({
              error: "Too Many Requests",
              message: "Tần suất truy cập trang diễn viên vượt ngưỡng an toàn. Vui lòng thử lại sau.",
            }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": "60",
                "X-Request-Id": requestId,
                "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
              },
            }
          );
        }
      } else {
        if (ACTOR_EDGE_RATE_LIMIT.size >= MAX_ACTOR_RL_ENTRIES) {
          const oldestKey = ACTOR_EDGE_RATE_LIMIT.keys().next().value;
          if (oldestKey) ACTOR_EDGE_RATE_LIMIT.delete(oldestKey);
        }
        ACTOR_EDGE_RATE_LIMIT.set(clientIp, {
          count: 1,
          resetAt: now + ACTOR_RL_WINDOW_MS,
        });
      }
    }
  }

  // 5. Cho phép request tiếp tục và gắn Security Headers
  const response = NextResponse.next();

  response.headers.set("X-Request-Id", requestId);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()"
  );

  // 5. Ngăn chặn tuyệt đối CDN / Cache proxy lưu dữ liệu người dùng riêng tư hoặc trang quản trị/cá nhân
  const isPrivateResource =
    pathname.startsWith("/api/user/") ||
    pathname.startsWith("/api/notifications") ||
    pathname.startsWith("/api/admin/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/my-list");

  // Nếu request có Authorization header hoặc truy cập tài nguyên riêng tư, buộc no-store
  const hasAuthHeader = req.headers.has("authorization");

  if (isPrivateResource || hasAuthHeader) {
    response.headers.set(
      "Cache-Control",
      "private, no-cache, no-store, max-age=0, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("CDN-Cache-Control", "no-store");
    response.headers.set("Vercel-CDN-Cache-Control", "no-store");
    response.headers.set("Cloudflare-CDN-Cache-Control", "no-store");
  }

  // 6. Bảo vệ RSC flight stream: Tuyệt đối không để CDN / Cloudflare Edge lưu cache RSC payload
  // Tránh nguy cơ trả nhầm text/x-component cho người dùng truy cập HTML hoặc ngược lại
  const isRscRequest = req.headers.get("rsc") === "1" || req.nextUrl.searchParams.has("_rsc");
  if (isRscRequest) {
    response.headers.set("CDN-Cache-Control", "no-store");
    response.headers.set("Cloudflare-CDN-Cache-Control", "no-store");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Khớp tất cả request đường dẫn trừ các file tĩnh:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with common extensions (images, fonts, media)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|mp4|webm)$).*)",
  ],
};
