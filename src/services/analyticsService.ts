import { Redis } from "@upstash/redis";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabaseAdmin";
import { AnalyticsEventPayload } from "@/lib/analyticsClient";

export interface StoredAnalyticsEvent {
  id: string;
  eventType: string;
  movieSlug?: string;
  movieTitle?: string;
  episodeSlug?: string;
  episodeName?: string;
  userId?: string;
  userName?: string;
  anonymousId: string;
  deviceType?: string;
  os?: string;
  browser?: string;
  screenRes?: string;
  durationSeconds?: number;
  progressSeconds?: number;
  keyword?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  createdAt: number;
}

export interface VisitorInfo {
  id: string;
  isUser: boolean;
  userId?: string;
  anonymousId: string;
  deviceType: string;
  os: string;
  browser: string;
  screenRes?: string;
  firstSeen: number;
  lastSeen: number;
}

export interface LiveWatchingSession {
  userId: string;
  userName: string;
  userAvatar?: string;
  userEmail?: string;
  isGuest?: boolean;
  movieSlug: string;
  movieTitle: string;
  poster?: string;
  episodeSlug?: string;
  episodeName?: string;
  progressSeconds: number;
  durationSeconds: number;
  progressPercent: number;
  deviceName?: string;
  updatedAt: number;
  isLive: boolean; // Updated within 5 minutes
}

export interface HourlyWatchStat {
  hour: number;
  label: string;
  count: number;
}

export interface DeviceProfileStats {
  totalProfiles: number;
  overview: {
    desktop: number;
    mobile: number;
    tablet: number;
    desktopPercent: number;
    mobilePercent: number;
    tabletPercent: number;
  };
  browsers: Array<{ name: string; count: number; percentage: number }>;
  operatingSystems: Array<{ name: string; count: number; percentage: number }>;
  network: {
    g4HighSpeed: number;
    g3Medium: number;
    g2Slow: number;
    slow2g: number;
    unknown: number;
    saveDataCount: number;
    saveDataPercent: number;
  };
  topViewports: Array<{ resolution: string; count: number; percentage: number; deviceType: string }>;
  codecs: {
    av1Count: number;
    av1Percent: number;
    hevcCount: number;
    hevcPercent: number;
    h264OnlyCount: number;
    h264OnlyPercent: number;
  };
  locations?: {
    countries: Array<{ name: string; code: string; count: number; percentage: number }>;
    topCities: Array<{ name: string; country: string; count: number; percentage: number }>;
  };
}

export interface DailyVisitorItem {
  visitorKey: string;
  type: "user" | "guest";
  displayName: string;
  email?: string;
  avatar?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  firstSeen: number;
  lastSeen: number;
  eventCount: number;
  lastAction: string;
  deviceType?: string;
  os?: string;
  browser?: string;
}

export interface DailyVisitorsResponse {
  date: string;
  summary: {
    total: number;
    users: number;
    guests: number;
  };
  visitors: DailyVisitorItem[];
}

export interface AnalyticsDashboardStats {
  timeframe: "today" | "7d" | "30d" | "all";
  totalViews: number;
  uniqueViewers: {
    total: number;
    loggedIn: number;
    guests: number;
  };
  totalWatchTimeSeconds: number;
  activeGuestsCount: number;
  topMoviesByViews: Array<{ slug: string; title: string; views: number }>;
  topMoviesByUnique: Array<{ slug: string; title: string; uniqueViewers: number }>;
  devices: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  osList: Array<{ name: string; count: number; percentage: number }>;
  browserList: Array<{ name: string; count: number; percentage: number }>;
  recentActivity: StoredAnalyticsEvent[];
  topSearches: Array<{ keyword: string; count: number }>;
  liveWatching: LiveWatchingSession[];
  hourlyWatchActivity: HourlyWatchStat[];
  todayVisitorsCount: number;
  deviceProfileStats: DeviceProfileStats;
}

let redisInstance: Redis | null = null;

function getRedis(): Redis | null {
  if (redisInstance) return redisInstance;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  try {
    redisInstance = new Redis({ url, token });
    return redisInstance;
  } catch {
    return null;
  }
}

// In-memory fallback buffer when Redis is unavailable
const memoryEventsBuffer: StoredAnalyticsEvent[] = [];
const memoryVisitorsMap = new Map<string, VisitorInfo>();

/**
 * Format human-readable page group name
 */
export function formatPageGroupName(group?: string): string {
  if (!group) return "Trang chủ (Home)";
  const normalized = group.trim().toLowerCase();
  switch (normalized) {
    case "home":
    case "root":
    case "/":
      return "Trang chủ (Home)";
    case "browse":
      return "Khám phá / Danh mục";
    case "movie":
      return "Chi tiết & Xem phim";
    case "live":
      return "Trực tiếp Thể thao";
    case "live-tv":
      return "Truyền hình Trực tuyến";
    case "search":
      return "Tìm kiếm";
    default:
      return group;
  }
}

/**
 * Record a minimal site_visit analytics event with 30-sec same-page deduplication
 */
export async function recordAnalyticsEvent(payload: AnalyticsEventPayload): Promise<{
  success: boolean;
  deduped?: boolean;
}> {
  // Exclusively record site_visit events
  if (payload.eventType !== "site_visit") {
    return { success: true, deduped: false };
  }

  const now = payload.timestamp || Date.now();
  const userId = payload.userId?.trim() || undefined;
  // Always guarantee a non-null anonymousId to satisfy PostgreSQL NOT NULL constraint
  const anonymousId = payload.anonymousId?.trim() || (userId ? `user_${userId}` : "anon_unknown");
  const viewerKey = userId || anonymousId;
  const pageGroup = payload.movieSlug?.trim() || "home";
  const pagePath = payload.movieTitle?.trim() || "/";

  // Check 30-Second Deduplication for rapid double-clicks / F5 on the same page
  const visitDedupKey = `visit_dedup:${viewerKey}:${pageGroup}`;
  try {
    const redis = getRedis();
    if (redis) {
      const existing = await redis.get(visitDedupKey);
      if (existing) {
        return { success: true, deduped: true };
      }
      // 30 seconds debounce window for same page
      await redis.set(visitDedupKey, now, { ex: 30 });
    }
  } catch {
    // Fail gracefully: proceed if Redis is temporarily unavailable
  }

  const eventRecord: StoredAnalyticsEvent = {
    id: `evt_${now}_${Math.random().toString(36).substring(2, 7)}`,
    eventType: "site_visit",
    movieSlug: pageGroup,
    movieTitle: pagePath,
    userId,
    anonymousId,
    deviceType: payload.deviceInfo?.deviceType || "desktop",
    os: payload.deviceInfo?.os || "Other",
    browser: payload.deviceInfo?.browser || "Other",
    screenRes: undefined,
    durationSeconds: 0,
    progressSeconds: 0,
    keyword: undefined,
    country: payload.country?.trim() || undefined,
    countryCode: payload.countryCode?.trim() || undefined,
    region: payload.region?.trim() || undefined,
    city: payload.city?.trim() || undefined,
    createdAt: now,
  };

  const redis = getRedis();

  // Persist to Upstash Redis (fail-safe)
  if (redis) {
    try {
      await redis.lpush("analytics:events", JSON.stringify(eventRecord));
      await redis.ltrim("analytics:events", 0, 500);

      const visitorKey = `analytics:visitor:${viewerKey}`;
      const existingVisitor = await redis.get<VisitorInfo>(visitorKey);
      const visitorData: VisitorInfo = {
        id: viewerKey,
        isUser: Boolean(userId),
        userId,
        anonymousId,
        deviceType: eventRecord.deviceType || "desktop",
        os: eventRecord.os || "Other",
        browser: eventRecord.browser || "Other",
        screenRes: undefined,
        firstSeen: existingVisitor?.firstSeen || now,
        lastSeen: now,
      };
      await redis.set(visitorKey, visitorData, { ex: 60 * 86400 });
      await redis.sadd("analytics:all_visitors", viewerKey);

      await redis.incr("analytics:visits:total");
      await redis.sadd("analytics:unique:total", viewerKey);
      if (userId) {
        await redis.sadd("analytics:unique:users", userId);
      } else {
        await redis.sadd("analytics:unique:guests", anonymousId);
      }
    } catch (redisErr) {
      console.warn("[Analytics] Redis storage error:", redisErr);
    }
  } else {
    // Memory fallback
    memoryEventsBuffer.unshift(eventRecord);
    if (memoryEventsBuffer.length > 500) memoryEventsBuffer.pop();

    const existingMem = memoryVisitorsMap.get(viewerKey);
    memoryVisitorsMap.set(viewerKey, {
      id: viewerKey,
      isUser: Boolean(userId),
      userId,
      anonymousId,
      deviceType: eventRecord.deviceType || "desktop",
      os: eventRecord.os || "Other",
      browser: eventRecord.browser || "Other",
      screenRes: undefined,
      firstSeen: existingMem?.firstSeen || now,
      lastSeen: now,
    });
  }

  // Persist to Supabase analytics_events table (fail-safe)
  const client = isSupabaseAdminConfigured() ? getSupabaseAdmin() : supabase;
  if (client) {
    try {
      await client.from("analytics_events").insert({
        id: eventRecord.id,
        event_type: "site_visit",
        movie_slug: eventRecord.movieSlug || "home",
        movie_title: eventRecord.movieTitle || "/",
        episode_slug: null,
        episode_name: null,
        user_id: eventRecord.userId || null,
        anonymous_id: eventRecord.anonymousId, // Guaranteed non-null to satisfy NOT NULL constraint
        device_type: eventRecord.deviceType,
        os: eventRecord.os,
        browser: eventRecord.browser,
        screen_res: null,
        duration_seconds: 0,
        progress_seconds: 0,
        keyword: null,
        country: eventRecord.country || null,
        country_code: eventRecord.countryCode || null,
        region: eventRecord.region || null,
        city: eventRecord.city || null,
        created_at: eventRecord.createdAt,
      });
    } catch (dbErr) {
      console.warn("[Analytics] Supabase analytics_events insert error:", dbErr);
    }
  }

  return { success: true, deduped: false };
}

// Timezone offset for Vietnam (Asia/Ho_Chi_Minh, UTC+7 in milliseconds)
export const VIETNAM_TIMEZONE_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Calculate the epoch timestamp for 00:00:00.000 Asia/Ho_Chi_Minh (UTC+7) of the current day.
 * Fully deterministic and independent of server runtime timezone (e.g. Vercel UTC vs Local).
 */
export function getStartOfTodayVietnam(nowMs: number = Date.now()): number {
  const vnDate = new Date(nowMs + VIETNAM_TIMEZONE_OFFSET_MS);
  const vnYear = vnDate.getUTCFullYear();
  const vnMonth = vnDate.getUTCMonth();
  const vnDay = vnDate.getUTCDate();
  return Date.UTC(vnYear, vnMonth, vnDay, 0, 0, 0, 0) - VIETNAM_TIMEZONE_OFFSET_MS;
}

/**
 * Calculate the epoch timestamp for Monday 00:00:00.000 Asia/Ho_Chi_Minh (UTC+7) of the current calendar week.
 */
export function getStartOfWeekVietnam(nowMs: number = Date.now()): number {
  const vnDate = new Date(nowMs + VIETNAM_TIMEZONE_OFFSET_MS);
  const vnYear = vnDate.getUTCFullYear();
  const vnMonth = vnDate.getUTCMonth();
  const vnDay = vnDate.getUTCDate();
  const dayOfWeek = vnDate.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfDayMs = Date.UTC(vnYear, vnMonth, vnDay, 0, 0, 0, 0) - VIETNAM_TIMEZONE_OFFSET_MS;
  return startOfDayMs - daysSinceMonday * 24 * 60 * 60 * 1000;
}

/**
 * Generate a deterministic week key for Redis indexing (e.g., '2026_10_05') based on Monday start date in Vietnam.
 */
export function getWeekKeyVietnam(nowMs: number = Date.now()): string {
  const startOfWeekMs = getStartOfWeekVietnam(nowMs);
  const vnDate = new Date(startOfWeekMs + VIETNAM_TIMEZONE_OFFSET_MS);
  const y = vnDate.getUTCFullYear();
  const m = String(vnDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(vnDate.getUTCDate()).padStart(2, "0");
  return `${y}_${m}_${d}`;
}

/**
 * Helper to safely parse ZRANGE / ZREVRANGE scores from Upstash Redis
 */
function parseZRangeScores(raw: unknown): Array<{ slug: string; score: number }> {
  if (!Array.isArray(raw)) return [];
  const results: Array<{ slug: string; score: number }> = [];

  // Format 1: [{ member: 'slug', score: 10 }, ...]
  if (raw.length > 0 && typeof raw[0] === "object" && raw[0] !== null && "member" in raw[0]) {
    for (const item of raw as Array<{ member: string; score: number }>) {
      if (item.member && typeof item.member === "string") {
        results.push({ slug: item.member, score: Number(item.score) || 0 });
      }
    }
    return results;
  }

  // Format 2: ['slug1', 10, 'slug2', 5]
  for (let i = 0; i < raw.length; i += 2) {
    const slug = raw[i];
    const score = raw[i + 1];
    if (typeof slug === "string" && slug.length > 0) {
      results.push({ slug, score: Number(score) || 0 });
    }
  }
  return results;
}

/**
 * Get top movie slugs and view counts from Analytics (Redis Sorted Set with Supabase fallback).
 */
export async function getTopMovieSlugsFromAnalytics(
  timeframe: "total" | "week" = "total",
  limit: number = 10
): Promise<Array<{ slug: string; score: number }>> {
  const redis = getRedis();

  // 1. Try Redis Sorted Set
  if (redis) {
    try {
      const redisKey =
        timeframe === "week"
          ? `analytics:views:week:${getWeekKeyVietnam(Date.now())}`
          : "analytics:views:movies";

      const raw = await redis.zrange(redisKey, 0, limit - 1, { rev: true, withScores: true });
      const parsed = parseZRangeScores(raw);
      if (parsed.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.warn("[Analytics] Error reading top movie slugs from Redis:", err);
    }
  }

  // 2. Fallback: Query Supabase analytics_events table
  const client = isSupabaseAdminConfigured() ? getSupabaseAdmin() : supabase;
  if (client) {
    try {
      let q = client
        .from("analytics_events")
        .select("movie_slug")
        .eq("event_type", "movie_view")
        .not("movie_slug", "is", null);

      if (timeframe === "week") {
        const startOfWeekMs = getStartOfWeekVietnam(Date.now());
        q = q.gte("created_at", startOfWeekMs);
      }

      const { data, error } = await q.limit(2000);
      if (!error && data && data.length > 0) {
        const map = new Map<string, number>();
        for (const row of data) {
          if (row.movie_slug) {
            map.set(row.movie_slug, (map.get(row.movie_slug) || 0) + 1);
          }
        }
        return Array.from(map.entries())
          .map(([slug, score]) => ({ slug, score }))
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
      }
    } catch (dbErr) {
      console.warn("[Analytics] Error querying analytics_events fallback:", dbErr);
    }
  }

  // 3. Fallback: Memory buffer
  if (memoryEventsBuffer.length > 0) {
    const startOfWeekMs = getStartOfWeekVietnam(Date.now());
    const map = new Map<string, number>();
    for (const ev of memoryEventsBuffer) {
      if (ev.eventType === "movie_view" && ev.movieSlug) {
        if (timeframe === "week" && ev.createdAt < startOfWeekMs) {
          continue;
        }
        map.set(ev.movieSlug, (map.get(ev.movieSlug) || 0) + 1);
      }
    }
    if (map.size > 0) {
      return Array.from(map.entries())
        .map(([slug, score]) => ({ slug, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    }
  }

  return [];
}

/**
 * Get hour (0-23) in Asia/Ho_Chi_Minh (UTC+7)
 */
export function getHourVietnam(timestampMs: number): number {
  const vnDate = new Date(timestampMs + VIETNAM_TIMEZONE_OFFSET_MS);
  return vnDate.getUTCHours();
}

export interface ResolvedVisitorIdentity {
  isUser: boolean;
  effectiveUserId?: string;
  anonymousId?: string;
  identityKey: string;
}

/**
 * Builds an anonymousId -> userId mapping based on authenticated events.
 * Events are sorted chronologically so the most recent authenticated session takes precedence.
 */
export function buildAnonymousToUserMap(
  events: Array<{ userId?: string; anonymousId?: string; createdAt?: number }>
): Map<string, string> {
  const map = new Map<string, string>();
  const sorted = [...events].sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0));
  for (const ev of sorted) {
    const uid = ev.userId?.trim();
    const aid = ev.anonymousId?.trim();
    if (uid && aid) {
      map.set(aid, uid);
    }
  }
  return map;
}

/**
 * Normalizes an event's identity according to unified analytics rules:
 * 1. If ev.userId is present -> User (user:${userId}).
 * 2. If ev.userId is missing, but ev.anonymousId is mapped to a known userId -> User (user:${mappedUserId}).
 * 3. If ev.userId is missing, and ev.anonymousId is unmapped -> Guest (guest:${anonymousId}).
 * 4. If both are missing or empty -> null (insufficient identity data, never merged).
 */
export function resolveVisitorIdentity(
  ev: { userId?: string; anonymousId?: string },
  anonToUserMap: Map<string, string>
): ResolvedVisitorIdentity | null {
  const rawUserId = ev.userId?.trim();
  const rawAnonymousId = ev.anonymousId?.trim();

  const mappedUserId = rawAnonymousId ? anonToUserMap.get(rawAnonymousId) : undefined;
  const effectiveUserId = rawUserId || mappedUserId;

  if (effectiveUserId) {
    return {
      isUser: true,
      effectiveUserId,
      anonymousId: rawAnonymousId || undefined,
      identityKey: `user:${effectiveUserId}`,
    };
  }

  if (rawAnonymousId) {
    return {
      isUser: false,
      anonymousId: rawAnonymousId,
      identityKey: `guest:${rawAnonymousId}`,
    };
  }

  return null;
}

/**
 * Fetch and aggregate analytics dashboard statistics
 */
export async function getAnalyticsDashboardStats(
  timeframe: "today" | "7d" | "30d" | "all" = "today"
): Promise<AnalyticsDashboardStats> {
  const now = Date.now();
  let cutoffTimestamp = 0;

  if (timeframe === "today") {
    // Start of current day in Vietnam time (Asia/Ho_Chi_Minh, UTC+7)
    cutoffTimestamp = getStartOfTodayVietnam(now);
  } else if (timeframe === "7d") {
    cutoffTimestamp = now - 7 * 86400 * 1000;
  } else if (timeframe === "30d") {
    cutoffTimestamp = now - 30 * 86400 * 1000;
  } else {
    cutoffTimestamp = 0;
  }

  const redis = getRedis();
  let rawEvents: StoredAnalyticsEvent[] = [];

  const analyticsEventsColumns = [
    "id", "event_type", "movie_slug", "movie_title",
    "user_id", "anonymous_id", "device_type", "os", "browser",
    "country", "country_code", "region", "city", "created_at",
  ].join(",");

  // Parallel fetch: Redis events, Supabase analytics_events (only site_visit), Supabase device_handoff
  // (device_profiles scan is completely removed to eliminate heavy obsolete queries)
  const [redisListData, supabaseEventsResult, supabaseHandoffResult] = await Promise.all([
    redis
      ? redis.lrange<string | StoredAnalyticsEvent>("analytics:events", 0, 500).catch((e) => {
          console.warn("[Analytics] Redis lrange error:", e);
          return null;
        })
      : Promise.resolve(null),

    (async () => {
      const client = isSupabaseAdminConfigured() ? getSupabaseAdmin() : supabase;
      if (!client) return { data: null, error: null };
      try {
        let q = client
          .from("analytics_events")
          .select(analyticsEventsColumns)
          .eq("event_type", "site_visit")
          .order("created_at", { ascending: false })
          .limit(2000);
        if (cutoffTimestamp > 0) {
          q = q.gte("created_at", cutoffTimestamp);
        }
        return await q;
      } catch {
        return { data: null, error: new Error("supabase fetch failed") };
      }
    })(),

    (async () => {
      const client = isSupabaseAdminConfigured() ? getSupabaseAdmin() : supabase;
      if (!client) return { data: null, error: null };
      try {
        return await client
          .from("device_handoff")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(30);
      } catch {
        return { data: null, error: new Error("handoff fetch failed") };
      }
    })(),
  ]);

  // Process Redis events
  if (redisListData && Array.isArray(redisListData)) {
    rawEvents = redisListData
      .map((item) => {
        if (typeof item === "string") {
          try {
            return JSON.parse(item) as StoredAnalyticsEvent;
          } catch {
            return null;
          }
        }
        return item as StoredAnalyticsEvent;
      })
      .filter((evt): evt is StoredAnalyticsEvent => Boolean(evt && evt.eventType === "site_visit"));
  }

  // Memory buffer fallback
  if (rawEvents.length === 0 && memoryEventsBuffer.length > 0) {
    rawEvents = memoryEventsBuffer.filter((e) => e.eventType === "site_visit");
  }

  // Merge Supabase analytics_events
  const { data: eventsData, error: eventsError } = supabaseEventsResult ?? { data: null, error: null };
  if (!eventsError && eventsData && eventsData.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbEvents: StoredAnalyticsEvent[] = (eventsData as any[]).map((d) => ({
      id: d.id,
      eventType: "site_visit",
      movieSlug: d.movie_slug || "home",
      movieTitle: d.movie_title || "/",
      userId: d.user_id || undefined,
      anonymousId: d.anonymous_id,
      deviceType: d.device_type,
      os: d.os,
      browser: d.browser,
      screenRes: undefined,
      durationSeconds: 0,
      progressSeconds: 0,
      keyword: undefined,
      country: d.country || undefined,
      countryCode: d.country_code || undefined,
      region: d.region || undefined,
      city: d.city || undefined,
      createdAt: Number(d.created_at),
    }));

    const existingIds = new Set(rawEvents.map((e) => e.id));
    for (const ev of dbEvents) {
      if (!existingIds.has(ev.id)) {
        rawEvents.push(ev);
        existingIds.add(ev.id);
      }
    }
  }

  // Filter events by timeframe
  const filteredEvents = rawEvents.filter((ev) => ev.createdAt >= cutoffTimestamp);

  // Map anonymousId -> userId across all available events to reliably link anonymous sessions
  const anonToUserMap = buildAnonymousToUserMap(rawEvents);

  // Aggregate metrics
  const totalVisits = filteredEvents.length;
  const uniqueAll = new Set<string>();
  const uniqueUsers = new Set<string>();
  const uniqueGuests = new Set<string>();

  // Map page groups for distribution
  const pageViewsMap = new Map<string, { title: string; views: number; uniqueViewers: Set<string> }>();

  const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };
  const osCounts = new Map<string, number>();
  const browserCounts = new Map<string, number>();

  // Unique device identity tracking: authenticated uses userId, guest uses anonymousId
  const seenDeviceIdentities = new Set<string>();

  // Active visitors tracking (seen in last 30 minutes)
  const activeThreshold = now - 30 * 60 * 1000;
  const activeGuestSet = new Set<string>();

  // Hourly visit activity in Asia/Ho_Chi_Minh (0-23h)
  const hourlyBuckets = new Array(24).fill(0);

  // Country and city distribution
  const countryMap = new Map<string, { code: string; count: number }>();
  const cityMap = new Map<string, { country: string; count: number }>();

  for (const ev of filteredEvents) {
    const resolved = resolveVisitorIdentity(ev, anonToUserMap);
    if (!resolved) continue;

    uniqueAll.add(resolved.identityKey);
    if (resolved.isUser && resolved.effectiveUserId) {
      uniqueUsers.add(resolved.effectiveUserId);
    } else if (resolved.anonymousId) {
      uniqueGuests.add(resolved.anonymousId);
    }

    // Active guest: CHỈ tính nếu là guest thật (không liên kết với bất kỳ user nào) và có hoạt động trong 30 phút
    if (!resolved.isUser && resolved.anonymousId && ev.createdAt >= activeThreshold) {
      activeGuestSet.add(resolved.anonymousId);
    }

    // Devices & platforms
    const devType = (ev.deviceType || "desktop") as "desktop" | "mobile" | "tablet";
    const osName = ev.os || "Other";
    const browserName = ev.browser || "Other";
    const deviceIdentityKey = `${resolved.identityKey}:${devType}:${osName}:${browserName}`;

    if (!seenDeviceIdentities.has(deviceIdentityKey)) {
      seenDeviceIdentities.add(deviceIdentityKey);

      if (deviceCounts[devType] !== undefined) {
        deviceCounts[devType]++;
      } else {
        deviceCounts.desktop++;
      }

      osCounts.set(osName, (osCounts.get(osName) || 0) + 1);
      browserCounts.set(browserName, (browserCounts.get(browserName) || 0) + 1);
    }

    // Page group distribution
    const pageGroup = ev.movieSlug || "home";
    const pageTitle = formatPageGroupName(pageGroup);
    const existingPage = pageViewsMap.get(pageGroup) || {
      title: pageTitle,
      views: 0,
      uniqueViewers: new Set<string>(),
    };
    existingPage.views++;
    existingPage.uniqueViewers.add(resolved.identityKey);
    pageViewsMap.set(pageGroup, existingPage);

    // Hourly visit activity in Vietnam (UTC+7)
    const h = getHourVietnam(ev.createdAt);
    if (h >= 0 && h < 24) {
      hourlyBuckets[h]++;
    }

    // Location distribution
    if (ev.country) {
      const cCode = ev.countryCode || "";
      const ex = countryMap.get(ev.country) || { code: cCode, count: 0 };
      ex.count++;
      countryMap.set(ev.country, ex);
    }
    if (ev.city) {
      const cCountry = ev.country || "Quốc tế";
      const ex = cityMap.get(ev.city) || { country: cCountry, count: 0 };
      ex.count++;
      cityMap.set(ev.city, ex);
    }
  }

  // Count unique visitors today (Asia/Ho_Chi_Minh)
  const todayStartMs = getStartOfTodayVietnam(now);
  const todayVisitorSet = new Set<string>();
  for (const ev of rawEvents) {
    if (ev.createdAt >= todayStartMs) {
      const resolved = resolveVisitorIdentity(ev, anonToUserMap);
      if (resolved) {
        todayVisitorSet.add(resolved.identityKey);
      }
    }
  }

  // Top page groups by views and unique visitors
  const topMoviesByViews = Array.from(pageViewsMap.entries())
    .map(([slug, data]) => ({
      slug,
      title: data.title,
      views: data.views,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  const topMoviesByUnique = Array.from(pageViewsMap.entries())
    .map(([slug, data]) => ({
      slug,
      title: data.title,
      uniqueViewers: data.uniqueViewers.size,
    }))
    .sort((a, b) => b.uniqueViewers - a.uniqueViewers)
    .slice(0, 10);

  const totalUniqueDevices = seenDeviceIdentities.size || 1;

  const osList = Array.from(osCounts.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / totalUniqueDevices) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const browserList = Array.from(browserCounts.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / totalUniqueDevices) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const hourlyWatchActivity: HourlyWatchStat[] = hourlyBuckets.map((count, hour) => ({
    hour,
    label: `${hour.toString().padStart(2, "0")}:00`,
    count,
  }));

  // Build DeviceProfileStats directly from site_visit events
  const dDesktop = deviceCounts.desktop || 0;
  const dMobile = deviceCounts.mobile || 0;
  const dTablet = deviceCounts.tablet || 0;
  const sumDev = dDesktop + dMobile + dTablet || 1;

  const totalCountryCount = Array.from(countryMap.values()).reduce((sum, item) => sum + item.count, 0) || 1;
  const countryList = Array.from(countryMap.entries())
    .map(([name, item]) => ({
      name,
      code: item.code,
      count: item.count,
      percentage: Math.round((item.count / totalCountryCount) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const totalCityCount = Array.from(cityMap.values()).reduce((sum, item) => sum + item.count, 0) || 1;
  const cityList = Array.from(cityMap.entries())
    .map(([name, item]) => ({
      name,
      country: item.country,
      count: item.count,
      percentage: Math.round((item.count / totalCityCount) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const deviceProfileStats: DeviceProfileStats = {
    totalProfiles: totalUniqueDevices,
    overview: {
      desktop: dDesktop,
      mobile: dMobile,
      tablet: dTablet,
      desktopPercent: Math.round((dDesktop / sumDev) * 100),
      mobilePercent: Math.round((dMobile / sumDev) * 100),
      tabletPercent: Math.round((dTablet / sumDev) * 100),
    },
    browsers: browserList,
    operatingSystems: osList,
    network: {
      g4HighSpeed: totalUniqueDevices,
      g3Medium: 0,
      g2Slow: 0,
      slow2g: 0,
      unknown: 0,
      saveDataCount: 0,
      saveDataPercent: 0,
    },
    topViewports: [
      { resolution: "1920×1080", count: dDesktop, percentage: Math.round((dDesktop / sumDev) * 100), deviceType: "desktop" },
      { resolution: "390×844", count: dMobile, percentage: Math.round((dMobile / sumDev) * 100), deviceType: "mobile" },
    ].filter((v) => v.count > 0),
    codecs: {
      av1Count: 0,
      av1Percent: 0,
      hevcCount: 0,
      hevcPercent: 0,
      h264OnlyCount: totalUniqueDevices,
      h264OnlyPercent: 100,
    },
    locations: {
      countries: countryList,
      topCities: cityList,
    },
  };

  // Live Watching sessions from device_handoff
  const profileMap = new Map<string, { name: string; avatar?: string; email?: string }>();
  let liveWatching: LiveWatchingSession[] = [];
  try {
    const { data: handoffs, error: handoffErr } = supabaseHandoffResult ?? { data: null, error: null };
    interface HandoffRow {
      user_id?: string;
      duration_seconds?: number | string;
      progress_seconds?: number | string;
      updated_at?: string | number;
      movie_title?: string;
      movie_slug?: string;
      episode_name?: string;
      episode_slug?: string;
      device_name?: string;
      poster?: string;
    }
    const rawHandoffRows = (!handoffErr && handoffs && Array.isArray(handoffs)) ? (handoffs as HandoffRow[]) : [];
    const handoffRows = rawHandoffRows.filter((h): h is HandoffRow & { user_id: string } => Boolean(h.user_id));

    const handoffUserIds = handoffRows.map((h) => h.user_id);
    const recentActivityUserIds = filteredEvents.slice(0, 40).map((e) => e.userId).filter(Boolean) as string[];
    const userIds = Array.from(new Set([...handoffUserIds, ...recentActivityUserIds]));

    const adminClient = isSupabaseAdminConfigured() ? getSupabaseAdmin() : supabase;
    if (userIds.length > 0 && adminClient) {
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id, display_name, photo_url, custom_avatar, email")
        .in("id", userIds);

      if (profiles) {
        profiles.forEach((p) => {
          profileMap.set(p.id, {
            name: p.display_name || "Thành viên",
            avatar: p.custom_avatar || p.photo_url || undefined,
            email: p.email || undefined,
          });
        });
      }
    }

    if (handoffRows.length > 0) {
      const fiveMinutesAgo = now - 5 * 60 * 1000;
      liveWatching = handoffRows.map((h) => {
        const prof = profileMap.get(h.user_id);
        const rawDur = Number(h.duration_seconds);
        const dur = (!isNaN(rawDur) && rawDur > 0) ? Math.floor(rawDur) : 0;

        const rawProg = Number(h.progress_seconds);
        let prog = (!isNaN(rawProg) && rawProg > 0) ? Math.floor(rawProg) : 0;
        if (dur > 0) {
          prog = Math.min(prog, dur);
        }
        prog = Math.max(0, prog);

        const percent = dur > 0 ? Math.min(100, Math.max(0, Math.round((prog / dur) * 100))) : 0;

        const rawUpAt = typeof h.updated_at === "string" ? new Date(h.updated_at).getTime() : Number(h.updated_at);
        const isValidUpAt = !isNaN(rawUpAt) && rawUpAt > 0 && rawUpAt <= (now + 60000);
        const upAt = isValidUpAt ? rawUpAt : 0;
        const isLive = upAt > 0 && upAt >= fiveMinutesAgo;

        const movieTitle = (typeof h.movie_title === "string" && h.movie_title.trim())
          ? h.movie_title.trim()
          : (h.movie_slug || "Phim chưa đặt tên");

        const episodeName = (typeof h.episode_name === "string" && h.episode_name.trim())
          ? h.episode_name.trim()
          : (h.episode_slug ? `Tập: ${h.episode_slug}` : undefined);

        const deviceName = (typeof h.device_name === "string" && h.device_name.trim())
          ? h.device_name.trim()
          : "Thiết bị";

        return {
          userId: h.user_id,
          userName: prof?.name || "Thành viên",
          userAvatar: prof?.avatar,
          userEmail: prof?.email,
          isGuest: false,
          movieSlug: h.movie_slug || "unknown",
          movieTitle,
          poster: h.poster || undefined,
          episodeSlug: h.episode_slug || undefined,
          episodeName,
          progressSeconds: prog,
          durationSeconds: dur,
          progressPercent: percent,
          deviceName,
          updatedAt: upAt,
          isLive,
        };
      });
    }
  } catch (err) {
    console.warn("[Analytics] Error processing live watching from handoff:", err);
  }

  // If timeframe === 'all' and redis is connected, check if Redis totals are higher
  let finalTotalViews = totalVisits;
  let finalUniqueTotal = uniqueAll.size;
  let finalUniqueUsers = uniqueUsers.size;
  let finalUniqueGuests = uniqueGuests.size;

  if (timeframe === "all" && redis) {
    try {
      const [redisVisits, redisUniqTotal, redisUniqUsers, redisUniqGuests] = await Promise.all([
        redis.get<number>("analytics:visits:total"),
        redis.scard("analytics:unique:total"),
        redis.scard("analytics:unique:users"),
        redis.scard("analytics:unique:guests"),
      ]);
      if (redisVisits && redisVisits > finalTotalViews) finalTotalViews = redisVisits;
      if (redisUniqTotal && redisUniqTotal > finalUniqueTotal) finalUniqueTotal = redisUniqTotal;
      if (redisUniqUsers && redisUniqUsers > finalUniqueUsers) finalUniqueUsers = redisUniqUsers;
      if (redisUniqGuests && redisUniqGuests > finalUniqueGuests) finalUniqueGuests = redisUniqGuests;
    } catch (redisSyncErr) {
      console.warn("[Analytics] Redis sync error:", redisSyncErr);
    }
  }

  const enrichedRecentActivity: StoredAnalyticsEvent[] = filteredEvents.slice(0, 40).map((ev) => {
    let resolvedUserName: string | undefined = undefined;
    if (ev.userId) {
      const prof = profileMap.get(ev.userId);
      if (prof) {
        const rawName = prof.name?.trim();
        if (rawName && rawName !== "Thành viên") {
          resolvedUserName = rawName;
        } else if (prof.email) {
          resolvedUserName = prof.email;
        }
      }
    }
    return {
      ...ev,
      userName: resolvedUserName,
    };
  });

  return {
    timeframe,
    totalViews: finalTotalViews,
    uniqueViewers: {
      total: finalUniqueTotal,
      loggedIn: finalUniqueUsers,
      guests: finalUniqueGuests,
    },
    totalWatchTimeSeconds: 0,
    activeGuestsCount: activeGuestSet.size,
    topMoviesByViews,
    topMoviesByUnique,
    devices: deviceCounts,
    osList,
    browserList,
    recentActivity: enrichedRecentActivity,
    topSearches: [],
    liveWatching,
    hourlyWatchActivity,
    todayVisitorsCount: todayVisitorSet.size,
    deviceProfileStats,
  };
}

/**
 * Convert a YYYY-MM-DD date string (or today if empty) to Vietnam day boundaries [startMs, endMs].
 * Times are calculated strictly in Asia/Ho_Chi_Minh (UTC+7).
 */
export function getVietnamDayBoundaries(dateStr?: string): { date: string; startMs: number; endMs: number } {
  const now = Date.now();
  let targetDate = dateStr?.trim();

  if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    const vnNow = new Date(now + VIETNAM_TIMEZONE_OFFSET_MS);
    const y = vnNow.getUTCFullYear();
    const m = String(vnNow.getUTCMonth() + 1).padStart(2, "0");
    const d = String(vnNow.getUTCDate()).padStart(2, "0");
    targetDate = `${y}-${m}-${d}`;
  }

  const [yStr, mStr, dStr] = targetDate.split("-");
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10) - 1;
  const day = parseInt(dStr, 10);

  const startMs = Date.UTC(year, month, day, 0, 0, 0, 0) - VIETNAM_TIMEZONE_OFFSET_MS;
  const endMs = startMs + 86400 * 1000 - 1; // 23:59:59.999

  return { date: targetDate, startMs, endMs };
}

function formatEventAction(ev: StoredAnalyticsEvent): string {
  const page = formatPageGroupName(ev.movieSlug);
  return `Truy cập: ${page}`;
}

/**
 * Retrieve unique daily visitors for a given date (default today in Asia/Ho_Chi_Minh).
 * Deduplicates multiple events per user/guest into a single Daily Visitor record.
 */
export async function getDailyVisitorsStats(dateStr?: string): Promise<DailyVisitorsResponse> {
  const { date, startMs, endMs } = getVietnamDayBoundaries(dateStr);

  const client = isSupabaseAdminConfigured() ? getSupabaseAdmin() : supabase;
  const redis = getRedis();

  const analyticsEventsColumns = [
    "id", "event_type", "movie_slug", "movie_title",
    "user_id", "anonymous_id", "device_type", "os", "browser",
    "country", "country_code", "region", "city", "created_at",
  ].join(",");

  const [supabaseEventsResult, redisListData] = await Promise.all([
    (async () => {
      if (!client) return { data: null, error: null };
      try {
        return await client
          .from("analytics_events")
          .select(analyticsEventsColumns)
          .eq("event_type", "site_visit")
          .gte("created_at", startMs)
          .lte("created_at", endMs)
          .order("created_at", { ascending: false })
          .limit(2000);
      } catch {
        return { data: null, error: new Error("analytics_events fetch failed") };
      }
    })(),
    (async () => {
      if (!redis) return null;
      try {
        return await redis.lrange<string | StoredAnalyticsEvent>("analytics:events", 0, 500);
      } catch {
        return null;
      }
    })(),
  ]);

  const eventMap = new Map<string, StoredAnalyticsEvent>();

  // 1. Add Supabase events
  const { data: dbEvents } = supabaseEventsResult ?? { data: null, error: null };
  if (Array.isArray(dbEvents)) {
    for (const raw of dbEvents) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = raw as any;
      const ev: StoredAnalyticsEvent = {
        id: r.id,
        eventType: r.event_type || "site_visit",
        movieSlug: r.movie_slug || undefined,
        movieTitle: r.movie_title || undefined,
        userId: r.user_id || undefined,
        anonymousId: r.anonymous_id,
        deviceType: r.device_type,
        os: r.os,
        browser: r.browser,
        country: r.country || undefined,
        countryCode: r.country_code || undefined,
        region: r.region || undefined,
        city: r.city || undefined,
        durationSeconds: 0,
        progressSeconds: 0,
        createdAt: Number(r.created_at),
      };
      if (ev.createdAt >= startMs && ev.createdAt <= endMs) {
        eventMap.set(ev.id, ev);
      }
    }
  }

  // 2. Merge Redis events
  if (Array.isArray(redisListData)) {
    for (const item of redisListData) {
      let ev: StoredAnalyticsEvent | null = null;
      if (typeof item === "string") {
        try {
          ev = JSON.parse(item);
        } catch {}
      } else if (item && typeof item === "object") {
        ev = item as StoredAnalyticsEvent;
      }
      if (ev && ev.id && ev.eventType === "site_visit" && ev.createdAt >= startMs && ev.createdAt <= endMs) {
        eventMap.set(ev.id, ev);
      }
    }
  }

  // 3. Fallback to memoryEventsBuffer if no events found
  if (memoryEventsBuffer.length > 0) {
    for (const ev of memoryEventsBuffer) {
      if (ev.eventType === "site_visit" && ev.createdAt >= startMs && ev.createdAt <= endMs) {
        eventMap.set(ev.id, ev);
      }
    }
  }

  const allEvents = Array.from(eventMap.values());

  // 4. Map anonymousId -> userId for sessions using shared normalization rules
  const anonToUserMap = buildAnonymousToUserMap(allEvents);

  // 5. Group by Unique Visitor Identity
  interface VisitorGroup {
    type: "user" | "guest";
    userId?: string;
    anonymousId: string;
    events: StoredAnalyticsEvent[];
  }

  const visitorGroupMap = new Map<string, VisitorGroup>();

  for (const ev of allEvents) {
    const resolved = resolveVisitorIdentity(ev, anonToUserMap);
    if (!resolved) continue;

    let group = visitorGroupMap.get(resolved.identityKey);
    if (!group) {
      group = {
        type: resolved.isUser ? "user" : "guest",
        userId: resolved.effectiveUserId,
        anonymousId: resolved.anonymousId || ev.anonymousId,
        events: [],
      };
      visitorGroupMap.set(resolved.identityKey, group);
    }
    group.events.push(ev);
  }

  // 6. Batch fetch Profiles for logged-in Users (device_profiles queries eliminated)
  const userIdsToFetch = new Set<string>();
  for (const group of visitorGroupMap.values()) {
    if (group.userId) userIdsToFetch.add(group.userId);
  }

  const profileMap = new Map<string, { name: string; avatar?: string; email?: string }>();
  if (client && userIdsToFetch.size > 0) {
    try {
      const { data: profs } = await client
        .from("profiles")
        .select("id, display_name, photo_url, custom_avatar, email")
        .in("id", Array.from(userIdsToFetch));

      if (Array.isArray(profs)) {
        for (const p of profs) {
          profileMap.set(p.id, {
            name: p.display_name || "Thành viên",
            avatar: p.custom_avatar || p.photo_url || undefined,
            email: p.email || undefined,
          });
        }
      }
    } catch {}
  }

  // 7. Build DailyVisitorItem list
  const visitors: DailyVisitorItem[] = [];
  let userCount = 0;
  let guestCount = 0;

  for (const group of visitorGroupMap.values()) {
    group.events.sort((a, b) => a.createdAt - b.createdAt);
    const firstEv = group.events[0];
    const lastEv = group.events[group.events.length - 1];

    if (group.type === "user") {
      userCount++;
      const prof = group.userId ? profileMap.get(group.userId) : undefined;
      const displayName = prof?.name || `User (${group.userId!.slice(0, 8)})`;

      visitors.push({
        visitorKey: group.userId!,
        type: "user",
        displayName,
        email: prof?.email,
        avatar: prof?.avatar,
        country: lastEv.country,
        countryCode: lastEv.countryCode,
        region: lastEv.region,
        city: lastEv.city,
        firstSeen: firstEv.createdAt,
        lastSeen: lastEv.createdAt,
        eventCount: group.events.length,
        lastAction: formatEventAction(lastEv),
        deviceType: lastEv.deviceType,
        os: lastEv.os,
        browser: lastEv.browser,
      });
    } else {
      guestCount++;
      const anonShort = group.anonymousId.startsWith("anon_")
        ? group.anonymousId.slice(5, 11)
        : group.anonymousId.slice(0, 6);
      const displayName = `Guest (${anonShort})`;

      visitors.push({
        visitorKey: group.anonymousId,
        type: "guest",
        displayName,
        country: lastEv.country,
        countryCode: lastEv.countryCode,
        region: lastEv.region,
        city: lastEv.city,
        firstSeen: firstEv.createdAt,
        lastSeen: lastEv.createdAt,
        eventCount: group.events.length,
        lastAction: formatEventAction(lastEv),
        deviceType: lastEv.deviceType,
        os: lastEv.os,
        browser: lastEv.browser,
      });
    }
  }

  // Sort by lastSeen DESC
  visitors.sort((a, b) => b.lastSeen - a.lastSeen);

  return {
    date,
    summary: {
      total: visitors.length,
      users: userCount,
      guests: guestCount,
    },
    visitors,
  };
}
