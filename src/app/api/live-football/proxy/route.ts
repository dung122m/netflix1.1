import { NextRequest } from "next/server";
import { isBlockedStreamUrl } from "@/services/live/shared/streamHealth";
import { isSafePublicUrl } from "@/lib/security";
import { isSafePublicMediaSegment } from "@/lib/live/proxySegmentCache";
import {
  handleHlsProxyGet,
  handleHlsProxyOptions,
  type HlsProxyUpstreamHeaders,
} from "@/services/live/shared/hlsProxyRoute";

export const dynamic = "force-dynamic";

export function isSafePublicSegment(
  request: NextRequest,
  targetUrl: string,
  contentType: string,
  response: Response,
): boolean {
  return isSafePublicMediaSegment(request, targetUrl, contentType, response);
}

export const MAX_SAFE_REDIRECTS = 5;

export interface SafeFetchResult {
  response: Response;
  finalUrl: string;
}

/**
 * Fetch upstream with controlled redirect validation preventing SSRF attacks.
 */
export async function fetchWithSafeRedirects(
  initialUrl: string,
  timeoutMs: number = 10000,
  maxRedirects: number = MAX_SAFE_REDIRECTS,
  clientHeaders?: Headers,
  clientSignal?: AbortSignal,
  upstreamHeaders?: HlsProxyUpstreamHeaders,
): Promise<SafeFetchResult> {
  let currentUrl = initialUrl;
  const visitedUrls = new Set<string>();

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
    if (!isSafePublicUrl(currentUrl)) {
      throw new Error(`SSRF guard blocked target URL: ${currentUrl}`);
    }

    if (isBlockedStreamUrl(currentUrl)) {
      throw new Error(`Stream source is blocked or invalid: ${currentUrl}`);
    }

    if (visitedUrls.has(currentUrl)) {
      throw new Error(`Redirect loop detected at ${currentUrl}`);
    }
    visitedUrls.add(currentUrl);

    const parsedCurrent = new URL(currentUrl);
    const origin = parsedCurrent.origin;
    const isFptStream = /fptplay(?:53)?\.net/i.test(parsedCurrent.hostname);
    const isColaStream = /miekgo\.app|msdht\.app/i.test(parsedCurrent.hostname);

    const safeReferer =
      upstreamHeaders?.referer && isSafePublicUrl(upstreamHeaders.referer)
        ? upstreamHeaders.referer
        : null;
    const effectiveReferer = safeReferer || origin + "/";
    const effectiveOrigin = safeReferer ? new URL(safeReferer).origin : origin;

    const stepHeaders: Record<string, string> = {
      "User-Agent": upstreamHeaders?.userAgent
        ? upstreamHeaders.userAgent
        : isFptStream
          ? "Mozilla/5.0 (SMART-TV; LINUX; Tizen 10.0) AppleWebKit/537.36 (KHTML, like Gecko) 130.0.6723.116/10.0 TV Safari/537.36"
          : isColaStream
            ? "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
            : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: effectiveReferer,
      Origin: effectiveOrigin,
    };

    const clientRange = clientHeaders?.get("range");
    if (clientRange) {
      stepHeaders["Range"] = clientRange;
    }

    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = clientSignal ? AbortSignal.any([clientSignal, timeoutSignal]) : timeoutSignal;

    const response = await fetch(currentUrl, {
      method: "GET",
      headers: stepHeaders,
      redirect: "manual",
      signal,
    });

    const isRedirect = [301, 302, 303, 307, 308].includes(response.status);
    if (!isRedirect) {
      return { response, finalUrl: currentUrl };
    }

    if (redirectCount >= maxRedirects) {
      throw new Error(`Maximum redirect limit (${maxRedirects}) exceeded`);
    }

    const location = response.headers.get("location");
    if (!location) {
      throw new Error(`Redirect response (${response.status}) missing Location header`);
    }

    try {
      currentUrl = new URL(location, currentUrl).toString();
    } catch {
      throw new Error(`Malformed Location header in redirect: ${location}`);
    }
  }

  throw new Error(`Maximum redirect limit (${maxRedirects}) exceeded`);
}

export async function GET(request: NextRequest) {
  return handleHlsProxyGet(request, {
    proxyBasePath: "/api/live-football/proxy",
    fetchUpstream: (req, targetUrl, upstreamHeaders) =>
      fetchWithSafeRedirects(
        targetUrl,
        10000,
        MAX_SAFE_REDIRECTS,
        req.headers,
        req.signal,
        upstreamHeaders,
      ),
  });
}

export async function OPTIONS() {
  return handleHlsProxyOptions();
}
