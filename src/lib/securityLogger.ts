/**
 * Structured Security & Observability Logger for Nanaflix
 * - Formats: JSON logs with ISO timestamp, requestId, eventType, ipHash, userId
 * - Data Protection: Automatically masks Authorization, Cookies, Secrets, Passwords, Tokens
 * - Non-blocking: Catch-all to never disrupt request lifecycle
 */

import { NextRequest } from "next/server";
import { hashClientIp } from "./rateLimit";
import { getClientIp } from "./clientIp";

export type SecurityEventType =
  | "RATE_LIMIT_EXCEEDED"
  | "AUTH_FAILURE"
  | "FORBIDDEN_ACCESS"
  | "MALICIOUS_PAYLOAD"
  | "BOT_PROBE_BLOCKED"
  | "SPAM_DETECTED"
  | "PAYLOAD_TOO_LARGE"
  | "REDIS_OUTAGE"
  | "ADMIN_ACTION";

export interface SecurityLogEntry {
  timestamp: string;
  requestId: string;
  event: SecurityEventType;
  level: "WARN" | "ERROR" | "INFO";
  endpoint: string;
  method: string;
  ipHash: string;
  userId?: string | null;
  status: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

import { getRequestId } from "./requestId";
export { getRequestId };

/**
 * Mask sensitive strings (tokens, keys, passwords)
 */
function sanitizeMetadata(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;

  const sanitized: Record<string, unknown> = {};
  const SENSITIVE_KEYS = [
    "authorization",
    "token",
    "idtoken",
    "secret",
    "password",
    "cookie",
    "key",
    "apikey",
  ];

  for (const [key, value] of Object.entries(meta)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Log a structured security event to stdout (captured by Vercel / Cloudwatch / Datadog)
 */
export function logSecurityEvent(
  req: NextRequest,
  params: {
    event: SecurityEventType;
    level?: "WARN" | "ERROR" | "INFO";
    status: number;
    userId?: string | null;
    reason?: string;
    metadata?: Record<string, unknown>;
  }
): void {
  try {
    const rawIp = getClientIp(req);
    const ipHash = hashClientIp(rawIp);
    const requestId = getRequestId(req);

    const entry: SecurityLogEntry = {
      timestamp: new Date().toISOString(),
      requestId,
      event: params.event,
      level: params.level || (params.status >= 500 ? "ERROR" : "WARN"),
      endpoint: req.nextUrl?.pathname || req.url,
      method: req.method,
      ipHash,
      userId: params.userId || undefined,
      status: params.status,
      reason: params.reason,
      metadata: sanitizeMetadata(params.metadata),
    };

    const serialized = JSON.stringify(entry);

    if (entry.level === "ERROR") {
      console.error(`[SECURITY] ${serialized}`);
    } else {
      console.warn(`[SECURITY] ${serialized}`);
    }
  } catch {
    // Fail silently to never impact application execution
  }
}
