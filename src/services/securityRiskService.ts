/**
 * Security Risk Engine & Audit Service for Nanaflix
 * - Objective, proof-based behavioral detection only (No speculation).
 * - Multi-factor identity: userId, anonymousId, hashed IP (Zero raw IP storage).
 * - Dynamic 0-100 Risk Score with time-decay.
 * - Non-offensive user-facing warnings.
 */

import { Redis } from "@upstash/redis";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabaseAdmin";
import crypto from "crypto";

export type SecurityViolationType =
  | "rapid_flood"
  | "duplicate_spam"
  | "comment_flood"
  | "rapid_requests"
  | "xss_pattern"
  | "sqli_pattern"
  | "path_traversal"
  | "auth_abuse"
  | "malformed_payload";

export type SecurityActionType =
  | "warning"
  | "temp_block"
  | "high_alert"
  | "blocked_request";

export type SecurityIncidentStatus =
  | "active"
  | "blocked"
  | "resolved"
  | "auto_decayed";

export interface SecurityIncident {
  id: string;
  userId?: string | null;
  userDisplayName?: string | null;
  userEmail?: string | null;
  anonymousId: string;
  ipHash: string;
  entityType: "user" | "guest" | "ip";
  entityId: string;
  riskScore: number;
  actionType: SecurityActionType;
  violationType: SecurityViolationType;
  reason: string;
  payloadSnippet?: string;
  endpoint?: string;
  method?: string;
  device?: string;
  deviceType?: string;
  os?: string;
  browser?: string;
  status: SecurityIncidentStatus;
  resolvedAt?: number | null;
  resolvedBy?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface SecurityWarning {
  id: string;
  targetKey: string;
  userId?: string | null;
  anonymousId?: string;
  riskScore: number;
  message: string;
  violationType: SecurityViolationType;
  isActive: boolean;
  expiresAt: number;
  createdAt: number;
}

export interface SecurityStats {
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  tempBlockedEntities: number;
  highAlertEntities: number;
  incidentsToday: number;
  topViolationTypes: Array<{ type: SecurityViolationType; label: string; count: number }>;
}

// Secret salt for irreversibly hashing IP addresses (No raw IP stored in memory or DB)
const IP_HASH_SALT = process.env.UPSTASH_REDIS_REST_TOKEN || "nanaflix_sec_salt_2026";

/**
 * Hash raw IP address into an anonymous, irreversible SHA-256 fingerprint
 */
export function hashClientIp(rawIp?: string | null): string {
  if (!rawIp || rawIp === "anonymous-client" || rawIp === "127.0.0.1") {
    return "iph_local_anon";
  }
  return (
    "iph_" +
    crypto
      .createHmac("sha256", IP_HASH_SALT)
      .update(rawIp.trim())
      .digest("hex")
      .slice(0, 16)
  );
}

let redisClient: Redis | null = null;
let isRedisInit = false;

function getSecurityRedis(): Redis | null {
  if (isRedisInit) return redisClient;
  isRedisInit = true;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    redisClient = null;
    return null;
  }

  try {
    redisClient = new Redis({ url, token });
    return redisClient;
  } catch {
    redisClient = null;
    return null;
  }
}

// In-Memory fallback store for incidents and active blocks
const inMemoryIncidents: SecurityIncident[] = [];
const inMemoryBlocks = new Map<string, { riskScore: number; expiresAt: number; reason: string }>();
const inMemoryRateLimits = new Map<string, { count: number; resetAt: number }>();

// -------------------------------------------------------------
// PROOF-BASED BEHAVIORAL PATTERN MATCHERS (STRICTLY EVIDENCE-BASED)
// -------------------------------------------------------------

const XSS_REGEX = /(<\s*script\b|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|on(?:error|load|click|mouseover|submit|focus)\s*=|document\.(?:cookie|location|domain)|window\.(?:location|eval)|eval\s*\()/i;
const SQLI_REGEX = /(\b(?:UNION\s+ALL\s+SELECT|UNION\s+SELECT|DROP\s+TABLE|ALTER\s+TABLE|INFORMATION_SCHEMA|SLEEP\s*\(\s*\d+\s*\))\b|'\s*(?:OR|AND)\s+'?1'?\s*=\s*'?1|--\s*$|;\s*--)/i;
const PATH_TRAVERSAL_REGEX = /(?:\.\.[\\/]|%2e%2e(?:%2f|%5c)|%252e%252e|\/etc\/(?:passwd|shadow)|\/proc\/self)/i;

/**
 * Inspect raw string content for deterministic injection patterns
 */
export function inspectContentPatterns(content: string): {
  hasViolation: boolean;
  violationType?: SecurityViolationType;
  reason?: string;
  payloadSnippet?: string;
} {
  if (!content || typeof content !== "string") {
    return { hasViolation: false };
  }

  if (XSS_REGEX.test(content)) {
    const match = content.match(XSS_REGEX);
    return {
      hasViolation: true,
      violationType: "xss_pattern",
      reason: "Phát hiện cú pháp thẻ hoặc mã thực thi không an toàn (XSS)",
      payloadSnippet: match ? match[0] : content.slice(0, 60),
    };
  }

  if (SQLI_REGEX.test(content)) {
    const match = content.match(SQLI_REGEX);
    return {
      hasViolation: true,
      violationType: "sqli_pattern",
      reason: "Phát hiện cú pháp truy vấn cơ sở dữ liệu bất thường (SQL Injection)",
      payloadSnippet: match ? match[0] : content.slice(0, 60),
    };
  }

  if (PATH_TRAVERSAL_REGEX.test(content)) {
    const match = content.match(PATH_TRAVERSAL_REGEX);
    return {
      hasViolation: true,
      violationType: "path_traversal",
      reason: "Phát hiện đường dẫn điều hướng thư mục vượt cấp (Path Traversal)",
      payloadSnippet: match ? match[0] : content.slice(0, 60),
    };
  }

  return { hasViolation: false };
}

/**
 * Evaluate payload for injection attacks (alias for security guard)
 */
export function evaluateSecurityPayload(content: string): {
  detected: boolean;
  violationType?: SecurityViolationType;
  reason?: string;
  payloadSnippet?: string;
} {
  const res = inspectContentPatterns(content);
  return {
    detected: res.hasViolation,
    violationType: res.violationType,
    reason: res.reason,
    payloadSnippet: res.payloadSnippet,
  };
}

/**
 * Format violation type into friendly Vietnamese label
 */
export function getViolationLabel(type: SecurityViolationType): string {
  switch (type) {
    case "rapid_flood":
    case "rapid_requests":
      return "Tần suất gửi yêu cầu quá nhanh";
    case "duplicate_spam":
      return "Nội dung gửi lặp lại liên tiếp";
    case "comment_flood":
      return "Gửi bình luận quá nhanh";
    case "xss_pattern":
      return "Cú pháp dữ liệu không an toàn (XSS)";
    case "sqli_pattern":
      return "Cú pháp truy vấn không hợp lệ (SQLi)";
    case "path_traversal":
      return "Đường dẫn không hợp lệ (Traversal)";
    case "auth_abuse":
      return "Xác thực không hợp lệ liên tục";
    case "malformed_payload":
      return "Gói tin bị lỗi cấu trúc";
    default:
      return "Hành vi bất thường";
  }
}

/**
 * Determine dynamic Risk Score increment based on violation type
 */
function getViolationRiskScore(type: SecurityViolationType): number {
  switch (type) {
    case "xss_pattern":
    case "sqli_pattern":
    case "path_traversal":
      return 65; // Immediate Temporary Block threshold
    case "auth_abuse":
      return 40;
    case "comment_flood":
      return 35;
    case "duplicate_spam":
      return 30;
    case "rapid_flood":
    case "rapid_requests":
      return 25;
    case "malformed_payload":
      return 20;
    default:
      return 15;
  }
}

/**
 * Get current decay-adjusted risk score for a target key
 */
export async function getEntityRiskScore(targetKey: string): Promise<number> {
  const redis = getSecurityRedis();
  const now = Date.now();

  if (redis) {
    try {
      const data = await redis.get<{ score: number; updatedAt: number }>(`sec:risk:${targetKey}`);
      if (!data || !data.score) return 0;

      // Risk score decays over time: -10 points per 15 minutes of quiet time
      const elapsedMinutes = (now - (data.updatedAt || now)) / (15 * 60 * 1000);
      const decayedScore = Math.max(0, Math.round(data.score - elapsedMinutes * 10));
      return decayedScore;
    } catch {
      // Fallback below
    }
  }

  const block = inMemoryBlocks.get(targetKey);
  if (block && block.expiresAt > now) {
    return block.riskScore;
  }
  return 0;
}

/**
 * Rate limit evaluator for sliding window rate limiting
 */
export async function evaluateRateLimit(options: {
  userId?: string;
  anonymousId?: string;
  ipHash?: string;
  actionKey: string;
  maxRequests: number;
  windowSeconds: number;
}): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number;
  windowSeconds: number;
}> {
  const target = options.userId
    ? `user:${options.userId}`
    : options.anonymousId
    ? `anon:${options.anonymousId}`
    : `ip:${options.ipHash || "unknown"}`;

  const key = `sec:rl:${options.actionKey}:${target}`;
  const now = Date.now();
  const redis = getSecurityRedis();

  if (redis) {
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, options.windowSeconds);
      }
      return {
        allowed: count <= options.maxRequests,
        currentCount: count,
        limit: options.maxRequests,
        windowSeconds: options.windowSeconds,
      };
    } catch {
      // Fallback to in-memory
    }
  }

  const existing = inMemoryRateLimits.get(key);
  if (!existing || existing.resetAt < now) {
    inMemoryRateLimits.set(key, { count: 1, resetAt: now + options.windowSeconds * 1000 });
    return {
      allowed: true,
      currentCount: 1,
      limit: options.maxRequests,
      windowSeconds: options.windowSeconds,
    };
  }

  existing.count++;
  return {
    allowed: existing.count <= options.maxRequests,
    currentCount: existing.count,
    limit: options.maxRequests,
    windowSeconds: options.windowSeconds,
  };
}

/**
 * Record a security violation, calculate new Risk Score, and trigger Warning or Temporary Block
 */
export async function recordSecurityViolation(params: {
  userId?: string | null;
  userDisplayName?: string | null;
  userEmail?: string | null;
  anonymousId?: string;
  ipHash?: string;
  violationType: SecurityViolationType;
  reason?: string;
  payloadSnippet?: string;
  endpoint?: string;
  method?: string;
  device?: string;
  deviceType?: string;
  os?: string;
  browser?: string;
  metadata?: Record<string, unknown>;
}): Promise<{
  incident: SecurityIncident;
  currentRiskScore: number;
  action: SecurityActionType;
  isBlocked: boolean;
  userWarningMessage?: string;
}> {
  const now = Date.now();
  const redis = getSecurityRedis();
  const baseIncrement = getViolationRiskScore(params.violationType);

  const anonId = params.anonymousId || "anon_unknown";
  const ipHash = params.ipHash || "iph_local_anon";

  // Target Key precedence: user:{uid} > anon:{anon_id} > ip:{ipHash}
  const entityType: "user" | "guest" | "ip" = params.userId ? "user" : params.anonymousId ? "guest" : "ip";
  const entityId = params.userId ? params.userId : params.anonymousId ? params.anonymousId : ipHash;
  const primaryKey = `${entityType}:${entityId}`;

  const currentScore = await getEntityRiskScore(primaryKey);
  const newScore = Math.min(100, currentScore + baseIncrement);

  // Determine Action Level based on dynamic 0-100 Score
  let actionType: SecurityActionType = "warning";
  let isBlocked = false;
  let blockDurationSeconds = 0;

  if (newScore >= 80) {
    actionType = "high_alert";
    isBlocked = true;
    blockDurationSeconds = 30 * 60; // 30 mins
  } else if (newScore >= 60) {
    actionType = "temp_block";
    isBlocked = true;
    blockDurationSeconds = 10 * 60; // 10 mins
  } else if (newScore >= 30) {
    actionType = "warning";
  }

  const reason =
    params.reason ||
    `${getViolationLabel(params.violationType)}. Điểm rủi ro: ${newScore}/100.`;

  const incident: SecurityIncident = {
    id: `sec_${now}_${Math.random().toString(36).substring(2, 8)}`,
    userId: params.userId || null,
    userDisplayName: params.userDisplayName || null,
    userEmail: params.userEmail || null,
    anonymousId: anonId,
    ipHash,
    entityType,
    entityId,
    riskScore: newScore,
    actionType,
    violationType: params.violationType,
    reason,
    payloadSnippet: params.payloadSnippet,
    endpoint: params.endpoint,
    method: params.method || "POST",
    device: params.device || params.deviceType || "Desktop",
    deviceType: params.deviceType || params.device || "Desktop",
    os: params.os || "Other",
    browser: params.browser || "Chrome",
    status: isBlocked ? "blocked" : "active",
    metadata: params.metadata,
    createdAt: now,
  };

  // Neutral, non-offensive message for the user
  let userWarningMessage: string | undefined;
  if (isBlocked) {
    userWarningMessage =
      "Hệ thống phát hiện tần suất gửi yêu cầu bất thường. Để bảo vệ kết nối, tính năng tạm dừng trong ít phút. Vui lòng thử lại sau.";
  } else if (newScore >= 30) {
    userWarningMessage =
      "Cảnh báo bảo mật: Vui lòng kiểm tra lại nội dung và tránh gửi yêu cầu liên tục quá nhanh.";
  }

  // 1. Persist to Redis
  if (redis) {
    try {
      await redis.set(`sec:risk:${primaryKey}`, { score: newScore, updatedAt: now }, { ex: 86400 });

      if (isBlocked && blockDurationSeconds > 0) {
        await redis.set(
          `sec:block:${primaryKey}`,
          { riskScore: newScore, reason, expiresAt: now + blockDurationSeconds * 1000 },
          { ex: blockDurationSeconds }
        );
      }

      await redis.lpush("sec:incidents", JSON.stringify(incident));
      await redis.ltrim("sec:incidents", 0, 500);

      if (userWarningMessage) {
        await redis.set(
          `sec:warn:${primaryKey}`,
          {
            id: incident.id,
            targetKey: primaryKey,
            userId: params.userId,
            anonymousId: anonId,
            riskScore: newScore,
            message: userWarningMessage,
            violationType: params.violationType,
            expiresAt: now + (blockDurationSeconds || 300) * 1000,
          },
          { ex: blockDurationSeconds || 300 }
        );
      }
    } catch {}
  }

  // 2. In-Memory fallback
  inMemoryIncidents.unshift(incident);
  if (inMemoryIncidents.length > 500) inMemoryIncidents.pop();

  if (isBlocked && blockDurationSeconds > 0) {
    inMemoryBlocks.set(primaryKey, {
      riskScore: newScore,
      expiresAt: now + blockDurationSeconds * 1000,
      reason,
    });
  }

  // 3. Supabase Audit Log (Fail-safe)
  const client = isSupabaseAdminConfigured() ? getSupabaseAdmin() : supabase;
  if (client) {
    try {
      await client.from("security_incidents").insert({
        id: incident.id,
        user_id: incident.userId,
        anonymous_id: incident.anonymousId,
        ip_hash: incident.ipHash,
        risk_score: incident.riskScore,
        action_type: incident.actionType,
        violation_type: incident.violationType,
        reason: incident.reason,
        endpoint: incident.endpoint,
        method: incident.method,
        device_type: incident.device,
        os: incident.os,
        browser: incident.browser,
        status: incident.status,
        metadata: {
          ...incident.metadata,
          userDisplayName: incident.userDisplayName,
          userEmail: incident.userEmail,
          payloadSnippet: incident.payloadSnippet,
        },
        created_at: incident.createdAt,
      });

      if (userWarningMessage) {
        await client.from("security_warnings").insert({
          id: `warn_${now}_${Math.random().toString(36).substring(2, 6)}`,
          target_key: primaryKey,
          user_id: params.userId || null,
          anonymous_id: anonId || null,
          risk_score: newScore,
          message: userWarningMessage,
          violation_type: params.violationType,
          is_active: true,
          expires_at: now + (blockDurationSeconds || 300) * 1000,
          created_at: now,
        });
      }
    } catch {}
  }

  return {
    incident,
    currentRiskScore: newScore,
    action: actionType,
    isBlocked,
    userWarningMessage,
  };
}

/**
 * Check if an entity is currently subject to a temporary block
 */
export async function isEntityBlocked(keys: {
  userId?: string | null;
  anonymousId?: string;
  ipHash?: string;
}): Promise<{ isBlocked: boolean; riskScore?: number; reason?: string; resetSeconds?: number }> {
  const now = Date.now();
  const redis = getSecurityRedis();

  const candidates = [
    keys.userId ? `user:${keys.userId}` : null,
    keys.anonymousId ? `anon:${keys.anonymousId}` : null,
    keys.ipHash ? `ip:${keys.ipHash}` : null,
  ].filter(Boolean) as string[];

  for (const k of candidates) {
    if (redis) {
      try {
        const block = await redis.get<{ riskScore: number; reason: string; expiresAt: number }>(
          `sec:block:${k}`
        );
        if (block && block.expiresAt > now) {
          return {
            isBlocked: true,
            riskScore: block.riskScore,
            reason: block.reason,
            resetSeconds: Math.ceil((block.expiresAt - now) / 1000),
          };
        }
      } catch {}
    }

    const memBlock = inMemoryBlocks.get(k);
    if (memBlock && memBlock.expiresAt > now) {
      return {
        isBlocked: true,
        riskScore: memBlock.riskScore,
        reason: memBlock.reason,
        resetSeconds: Math.ceil((memBlock.expiresAt - now) / 1000),
      };
    }
  }

  return { isBlocked: false };
}

/**
 * Get security incidents list with optional filtering
 */
export async function getSecurityIncidents(options: {
  limit?: number;
  status?: "all" | "active" | "resolved" | string;
  minRisk?: number;
} = {}): Promise<SecurityIncident[]> {
  const limit = options.limit || 50;
  const incidentMap = new Map<string, SecurityIncident>();

  // 1. Fetch from Supabase
  const client = isSupabaseAdminConfigured() ? getSupabaseAdmin() : supabase;
  if (client) {
    try {
      let query = client
        .from("security_incidents")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (options.status && options.status !== "all") {
        query = query.eq("status", options.status);
      }
      if (options.minRisk) {
        query = query.gte("risk_score", options.minRisk);
      }

      const { data } = await query;
      if (data && Array.isArray(data)) {
        for (const row of data) {
          const inc: SecurityIncident = {
            id: row.id,
            userId: row.user_id,
            userDisplayName: row.metadata?.userDisplayName || null,
            userEmail: row.metadata?.userEmail || null,
            anonymousId: row.anonymous_id,
            ipHash: row.ip_hash,
            entityType: row.user_id ? "user" : row.anonymous_id ? "guest" : "ip",
            entityId: row.user_id || row.anonymous_id || row.ip_hash,
            riskScore: row.risk_score,
            actionType: row.action_type,
            violationType: row.violation_type,
            reason: row.reason,
            payloadSnippet: row.metadata?.payloadSnippet,
            endpoint: row.endpoint,
            method: row.method,
            device: row.device_type,
            deviceType: row.device_type,
            os: row.os,
            browser: row.browser,
            status: row.status,
            resolvedAt: row.resolved_at,
            resolvedBy: row.resolved_by,
            metadata: row.metadata,
            createdAt: row.created_at,
          };
          incidentMap.set(inc.id, inc);
        }
      }
    } catch {}
  }

  // 2. Fetch from Redis
  const redis = getSecurityRedis();
  if (redis) {
    try {
      const rawList = await redis.lrange("sec:incidents", 0, limit);
      if (rawList && rawList.length > 0) {
        for (const item of rawList) {
          const inc = typeof item === "string" ? JSON.parse(item) : item;
          if (inc && inc.id && !incidentMap.has(inc.id)) {
            incidentMap.set(inc.id, inc);
          }
        }
      }
    } catch {}
  }

  // 3. Merge Memory incidents
  for (const inc of inMemoryIncidents) {
    if (!incidentMap.has(inc.id)) {
      incidentMap.set(inc.id, inc);
    }
  }

  let list = Array.from(incidentMap.values()).sort((a, b) => b.createdAt - a.createdAt);

  if (options.status && options.status !== "all") {
    list = list.filter((i) => i.status === options.status);
  }
  if (options.minRisk) {
    list = list.filter((i) => i.riskScore >= options.minRisk!);
  }

  return list.slice(0, limit);
}

/**
 * Get aggregate security statistics
 */
export async function getSecurityStats(): Promise<SecurityStats> {
  const incidents = await getSecurityIncidents({ limit: 500, status: "all" });
  const now = Date.now();
  const startOfToday = now - (now % 86400000);
  const violationCounts = new Map<SecurityViolationType, number>();

  let activeIncidents = 0;
  let resolvedIncidents = 0;
  let tempBlockedEntities = 0;
  let highAlertEntities = 0;
  let incidentsToday = 0;

  for (const inc of incidents) {
    if (inc.createdAt >= startOfToday) {
      incidentsToday++;
    }
    if (inc.status === "resolved") {
      resolvedIncidents++;
    } else {
      activeIncidents++;
    }

    if (inc.riskScore >= 80) {
      highAlertEntities++;
    } else if (inc.riskScore >= 60) {
      tempBlockedEntities++;
    }

    violationCounts.set(inc.violationType, (violationCounts.get(inc.violationType) || 0) + 1);
  }

  const topViolationTypes = Array.from(violationCounts.entries())
    .map(([type, count]) => ({
      type,
      label: getViolationLabel(type),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalIncidents: incidents.length,
    activeIncidents,
    resolvedIncidents,
    tempBlockedEntities,
    highAlertEntities,
    incidentsToday,
    topViolationTypes,
  };
}

/**
 * Mark a security incident as resolved
 */
export async function resolveSecurityIncident(
  incidentId: string,
  resolvedBy: string
): Promise<{ success: boolean }> {
  const client = isSupabaseAdminConfigured() ? getSupabaseAdmin() : supabase;
  const now = Date.now();

  if (client) {
    try {
      await client
        .from("security_incidents")
        .update({
          status: "resolved",
          resolved_at: now,
          resolved_by: resolvedBy,
        })
        .eq("id", incidentId);
    } catch {}
  }

  // Update in memory
  const found = inMemoryIncidents.find((i) => i.id === incidentId);
  if (found) {
    found.status = "resolved";
    found.resolvedAt = now;
    found.resolvedBy = resolvedBy;
  }

  return { success: true };
}

/**
 * Unblock an entity and reset their risk score
 */
export async function unblockSecurityEntity(
  entityTypeOrKey: string,
  entityIdOrUnblocker?: string,
  unblockedBy?: string
): Promise<{ success: boolean }> {
  const redis = getSecurityRedis();
  let normalizedKey = entityTypeOrKey.replace(/^sec:(?:block|risk):/, "");

  if (entityIdOrUnblocker && !entityIdOrUnblocker.includes("@") && entityIdOrUnblocker !== "admin") {
    normalizedKey = `${entityTypeOrKey}:${entityIdOrUnblocker}`;
  }

  if (redis) {
    try {
      await redis.del(`sec:block:${normalizedKey}`);
      await redis.del(`sec:risk:${normalizedKey}`);
      await redis.del(`sec:warn:${normalizedKey}`);
    } catch {}
  }

  inMemoryBlocks.delete(normalizedKey);

  // Update incidents status in Supabase
  const client = isSupabaseAdminConfigured() ? getSupabaseAdmin() : supabase;
  if (client) {
    try {
      const resolvedAt = Date.now();
      const resolver = unblockedBy || "admin";
      if (normalizedKey.startsWith("user:")) {
        const uid = normalizedKey.replace("user:", "");
        await client
          .from("security_incidents")
          .update({ status: "resolved", resolved_by: resolver, resolved_at: resolvedAt })
          .eq("user_id", uid);
      } else if (normalizedKey.startsWith("anon:") || normalizedKey.startsWith("guest:")) {
        const anon = normalizedKey.replace(/^(?:anon|guest):/, "");
        await client
          .from("security_incidents")
          .update({ status: "resolved", resolved_by: resolver, resolved_at: resolvedAt })
          .eq("anonymous_id", anon);
      }
    } catch {}
  }

  return { success: true };
}

/**
 * Get active user-facing warning if any
 */
export async function getActiveSecurityWarning(keys: {
  userId?: string | null;
  anonymousId?: string;
  ipHash?: string;
}): Promise<SecurityWarning | null> {
  const now = Date.now();
  const redis = getSecurityRedis();
  if (!redis) return null;

  const candidates = [
    keys.userId ? `user:${keys.userId}` : null,
    keys.anonymousId ? `anon:${keys.anonymousId}` : null,
    keys.ipHash ? `ip:${keys.ipHash}` : null,
  ].filter(Boolean) as string[];

  if (candidates.length === 0) return null;

  try {
    // Kiểm tra song song đồng thời tất cả candidate keys thay vì tuần tự
    const results = await Promise.all(
      candidates.map(async (k) => {
        try {
          return await redis.get<SecurityWarning>(`sec:warn:${k}`);
        } catch {
          return null;
        }
      })
    );

    // Giữ nguyên thứ tự ưu tiên: user -> anon -> ip
    for (const warn of results) {
      if (warn && warn.expiresAt > now) {
        return warn;
      }
    }
  } catch {}

  return null;
}
