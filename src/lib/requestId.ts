import { NextRequest } from "next/server";

/**
 * Extract or generate a consistent Request ID for tracing.
 * Platform & Edge Runtime Safe: zero Node.js native dependencies.
 */
export function getRequestId(req: NextRequest | Headers): string {
  const headers = "headers" in req ? req.headers : req;
  const existing =
    headers.get("x-request-id") ||
    headers.get("x-vercel-id") ||
    headers.get("cf-ray");

  if (existing) return existing;

  const randSuffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `req_${Date.now()}_${randSuffix}`;
}
