import { NextRequest, NextResponse } from "next/server";
import {
  hashClientIp,
  isEntityBlocked,
  evaluateSecurityPayload,
  evaluateRateLimit,
  recordSecurityViolation,
} from "@/services/securityRiskService";

export interface SecurityCheckOptions {
  userId?: string;
  userEmail?: string;
  userDisplayName?: string;
  anonymousId?: string;
  payload?: string | object;
  actionKey?: string;
  maxRequests?: number;
  windowSeconds?: number;
  device?: string;
  browser?: string;
}

export interface SecurityCheckResult {
  passed: boolean;
  response?: NextResponse;
  riskScore?: number;
}

/**
 * Standard Security Guard for Next.js API route handlers
 * Detects:
 * - Entity Temporary Block status (Risk >= 60)
 * - XSS / SQLi / Path Traversal injections
 * - Rapid requests / Flood abuse
 */
export async function runSecurityGuard(
  req: NextRequest,
  options: SecurityCheckOptions = {}
): Promise<SecurityCheckResult> {
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const rawIp = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
    const ipHash = hashClientIp(rawIp);

    const anonymousId =
      options.anonymousId || req.headers.get("x-anonymous-id") || undefined;
    const userId = options.userId;

    const userAgent = req.headers.get("user-agent") || "";
    let device = options.device;
    let browser = options.browser;

    if (!device) {
      if (/mobile|android|iphone/i.test(userAgent)) device = "mobile";
      else if (/ipad|tablet/i.test(userAgent)) device = "tablet";
      else device = "desktop";
    }

    if (!browser) {
      if (/chrome|crios/i.test(userAgent)) browser = "Chrome";
      else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = "Safari";
      else if (/firefox|fxios/i.test(userAgent)) browser = "Firefox";
      else if (/edg/i.test(userAgent)) browser = "Edge";
      else browser = "Browser";
    }

    // 1. Check if entity is currently blocked (Risk >= 60)
    const blockedCheck = await isEntityBlocked({
      userId,
      anonymousId,
      ipHash,
    });

    if (blockedCheck.isBlocked) {
      return {
        passed: false,
        riskScore: blockedCheck.riskScore,
        response: NextResponse.json(
          {
            error:
              blockedCheck.reason ||
              "Hệ thống phát hiện tần suất gửi yêu cầu bất thường. Để bảo vệ kết nối, tính năng tạm dừng trong ít phút. Vui lòng thử lại sau.",
            riskScore: blockedCheck.riskScore,
          },
          { status: 429 }
        ),
      };
    }

    // 2. Inspect Payload for Injection attacks (XSS / SQLi / Path Traversal)
    if (options.payload) {
      const payloadStr =
        typeof options.payload === "string"
          ? options.payload
          : JSON.stringify(options.payload);

      const payloadCheck = evaluateSecurityPayload(payloadStr);
      if (payloadCheck.detected) {
        // Record violation in Security Engine
        await recordSecurityViolation({
          userId,
          userEmail: options.userEmail,
          userDisplayName: options.userDisplayName,
          anonymousId,
          ipHash,
          violationType: payloadCheck.violationType!,
          reason: payloadCheck.reason!,
          payloadSnippet: payloadCheck.payloadSnippet,
          device,
          browser,
        });

        return {
          passed: false,
          response: NextResponse.json(
            {
              error: "Nội dung chứa định dạng không hợp lệ. Vui lòng kiểm tra lại.",
            },
            { status: 400 }
          ),
        };
      }
    }

    // 3. Rate Limit / Flood Inspection (if actionKey specified)
    if (options.actionKey) {
      const rateLimitCheck = await evaluateRateLimit({
        userId,
        anonymousId,
        ipHash,
        actionKey: options.actionKey,
        maxRequests: options.maxRequests || 20,
        windowSeconds: options.windowSeconds || 60,
      });

      if (!rateLimitCheck.allowed) {
        await recordSecurityViolation({
          userId,
          userEmail: options.userEmail,
          userDisplayName: options.userDisplayName,
          anonymousId,
          ipHash,
          violationType: "rapid_requests",
          reason: `Thao tác quá nhanh (${rateLimitCheck.currentCount} req / ${rateLimitCheck.windowSeconds}s)`,
          device,
          browser,
        });

        return {
          passed: false,
          response: NextResponse.json(
            {
              error: "Bạn đang thao tác quá nhanh. Vui lòng chờ một chút trước khi thử lại.",
            },
            { status: 429 }
          ),
        };
      }
    }

    return { passed: true };
  } catch (err) {
    console.error("[runSecurityGuard] Error:", err);
    // Fail-open to avoid disrupting legitimate users
    return { passed: true };
  }
}
