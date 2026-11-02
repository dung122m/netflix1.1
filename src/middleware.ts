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

  // 2. Validate secret header injected by Cloudflare Transform Rule
  const incomingSecret = req.headers.get("x-nanaflix-edge-secret")?.trim();
  if (!incomingSecret || incomingSecret !== edgeSecret) {
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

  // 4. Kiểm tra bảo vệ Origin (Chống bypass Cloudflare qua *.vercel.app)
  const originBlock = checkOriginProtection(req);
  if (originBlock) {
    originBlock.headers.set("X-Request-Id", requestId);
    return originBlock;
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

  // 5. Ngăn chặn tuyệt đối CDN / Cache proxy lưu dữ liệu người dùng riêng tư
  const isPrivateApi =
    pathname.startsWith("/api/user/") ||
    pathname.startsWith("/api/notifications") ||
    pathname.startsWith("/api/admin/");

  if (isPrivateApi) {
    response.headers.set(
      "Cache-Control",
      "private, no-cache, no-store, max-age=0, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("CDN-Cache-Control", "no-store");
    response.headers.set("Vercel-CDN-Cache-Control", "no-store");
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
