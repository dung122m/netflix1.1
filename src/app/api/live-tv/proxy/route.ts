import { NextRequest } from "next/server";
import { isSafePublicMediaSegment } from "@/lib/live/proxySegmentCache";
import { handleHlsProxyGet, handleHlsProxyOptions } from "@/services/live/shared/hlsProxyRoute";

export const dynamic = "force-dynamic";

export function isSafePublicSegment(
  request: NextRequest,
  targetUrl: string,
  contentType: string,
  response: Response,
): boolean {
  return isSafePublicMediaSegment(request, targetUrl, contentType, response);
}

const REFERER_MAP: Record<string, string> = {
  "ntv1.akamaized.net": "https://www.nasa.gov/",
  "rbmn-live.akamaized.net": "https://www.redbull.com/",
  "akamaized.net": "https://www.nhk.or.jp/",
  "vips-livecdn.fptplay.net": "https://fptplay.vn/",
  "live-a.fptplay53.net": "https://fptplay.vn/",
  "fptplay53.net": "https://fptplay.vn/",
  "fptplay.net": "https://fptplay.vn/",
  "vnns.net": "https://thvl.vn/",
  "qpvn.vn": "https://qpvn.vn/",
  "vtvprime.vn": "https://vtvgo.vn/",
  "vtvdigital.vn": "https://vtvgo.vn/",
  "dethich.pw": "https://dethich.pw/",
};

function getReferer(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    const sortedEntries = Object.entries(REFERER_MAP).sort((a, b) => b[0].length - a[0].length);
    for (const [key, referer] of sortedEntries) {
      if (hostname === key || hostname.endsWith("." + key) || hostname.includes(key)) {
        return referer;
      }
    }
    return parsed.origin + "/";
  } catch {
    return "https://fptplay.vn/";
  }
}

export async function GET(request: NextRequest) {
  return handleHlsProxyGet(request, {
    proxyBasePath: "/api/live-tv/proxy",
    fetchUpstream: async (req, targetUrl) => {
      const referer = getReferer(targetUrl);
      const isFptStream = /fptplay(?:53)?\.net/i.test(new URL(targetUrl).hostname);
      const clientRange = req.headers.get("range");
      const reqHeaders: Record<string, string> = {
        "User-Agent": isFptStream
          ? "Mozilla/5.0 (SMART-TV; LINUX; Tizen 10.0) AppleWebKit/537.36 (KHTML, like Gecko) 130.0.6723.116/10.0 TV Safari/537.36"
          : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Referer: referer,
        Origin: new URL(referer).origin,
        Accept: "*/*",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
      };
      if (clientRange) {
        reqHeaders["Range"] = clientRange;
      }

      const timeoutSignal = AbortSignal.timeout(9000);
      const combinedSignal = req.signal ? AbortSignal.any([req.signal, timeoutSignal]) : timeoutSignal;
      const response = await fetch(targetUrl, { headers: reqHeaders, signal: combinedSignal });
      return { response, finalUrl: targetUrl };
    },
  });
}

export async function OPTIONS() {
  return handleHlsProxyOptions();
}
