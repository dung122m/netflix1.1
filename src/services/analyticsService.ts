import { Redis } from "@upstash/redis";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabaseAdmin";
import { cacheService } from "@/lib/cache";
import { AnalyticsEventPayload } from "@/lib/analyticsClient";

export interface StoredAnalyticsEvent {
  id: string;
  eventType: string;
  movieSlug?: string;
  movieTitle?: string;
  episodeSlug?: string;
  episodeName?: string;
  userId?: string;
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

const ALLOWED_CORE_EVENT_TYPES = new Set<string>([
  "site_visit",
  "movie_view",
  "watch_start",
  "watch_progress",
  "watch_end",
  "search",
]);

/**
 * Record an analytics event with 30-min movie_view deduplication
 */
export async function recordAnalyticsEvent(payload: AnalyticsEventPayload): Promise<{
  success: boolean;
  deduped?: boolean;
}> {
  if (!ALLOWED_CORE_EVENT_TYPES.has(payload.eventType)) {
    return { success: true, deduped: false };
  }

  const now = payload.timestamp || Date.now();
  const anonymousId = payload.anonymousId || "anon_unknown";
  const userId = payload.userId?.trim() || undefined;
  const viewerKey = userId || anonymousId;
  const movieSlug = payload.movieSlug?.trim() || undefined;

  // 1. Check 30-Minute Deduplication for movie_view
  if (payload.eventType === "movie_view" && movieSlug) {
    const dedupKey = `view_dedup:${movieSlug}:${viewerKey}`;
    try {
      const existing = await cacheService.get<number>(dedupKey);
      if (existing) {
        return { success: true, deduped: true };
      }
      // Lock for 30 minutes (1800 seconds)
      await cacheService.set(dedupKey, now, 1800);
    } catch {
      // In case of cache error, proceed gracefully
    }
  }

  // 2. Check Deduplication for site_visit (30-minute window per viewerKey)
  if (payload.eventType === "site_visit") {
    const visitDedupKey = `visit_dedup:${viewerKey}`;
    try {
      const redis = getRedis();
      if (redis) {
        const existing = await redis.get(visitDedupKey);
        if (existing) {
          return { success: true, deduped: true };
        }
        await redis.set(visitDedupKey, now, { ex: 1800 });
      }
    } catch {
      // Fail gracefully
    }
  }

  const eventRecord: StoredAnalyticsEvent = {
    id: `evt_${now}_${Math.random().toString(36).substring(2, 7)}`,
    eventType: payload.eventType,
    movieSlug,
    movieTitle: payload.movieTitle?.trim() || movieSlug,
    episodeSlug: payload.episodeSlug?.trim(),
    episodeName: payload.episodeName?.trim(),
    userId,
    anonymousId,
    deviceType: payload.deviceInfo?.deviceType || "desktop",
    os: payload.deviceInfo?.os || "Other",
    browser: payload.deviceInfo?.browser || "Other",
    screenRes: payload.deviceInfo?.screenRes || undefined,
    durationSeconds: payload.durationSeconds || 0,
    progressSeconds: payload.progressSeconds || 0,
    keyword: payload.keyword?.trim(),
    country: payload.country?.trim() || undefined,
    countryCode: payload.countryCode?.trim() || undefined,
    region: payload.region?.trim() || undefined,
    city: payload.city?.trim() || undefined,
    createdAt: now,
  };

  const redis = getRedis();

  // 2. Persist to Upstash Redis (if configured)
  if (redis) {
    try {
      // A. Store in recent events list (keep last 500)
      await redis.lpush("analytics:events", JSON.stringify(eventRecord));
      await redis.ltrim("analytics:events", 0, 500);

      // B. Update visitor tracking
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
        screenRes: eventRecord.screenRes || undefined,
        firstSeen: existingVisitor?.firstSeen || now,
        lastSeen: now,
      };
      // Keep visitor record with 60 days TTL
      await redis.set(visitorKey, visitorData, { ex: 60 * 86400 });
      await redis.sadd("analytics:all_visitors", viewerKey);

      // C. Update specific metrics
      if (payload.eventType === "movie_view" && movieSlug) {
        await redis.incr("analytics:views:total");
        await redis.zincrby("analytics:views:movies", 1, movieSlug);
        if (payload.movieTitle) {
          await redis.hset("analytics:movie_titles", { [movieSlug]: payload.movieTitle });
        }
        await redis.sadd("analytics:unique:total", viewerKey);
        if (userId) {
          await redis.sadd("analytics:unique:users", userId);
        } else {
          await redis.sadd("analytics:unique:guests", anonymousId);
        }
        await redis.sadd(`analytics:unique:movie:${movieSlug}`, viewerKey);
      } else if (payload.eventType === "watch_progress" || payload.eventType === "watch_end") {
        if (movieSlug) {
          const currentProg = Math.max(0, payload.progressSeconds || 0);
          const maxDuration = payload.durationSeconds && payload.durationSeconds > 0 ? payload.durationSeconds : Infinity;
          const effectiveProg = Math.min(currentProg, maxDuration);

          if (effectiveProg > 0) {
            const sessionProgKey = `analytics:prog:${viewerKey}:${movieSlug}:${payload.episodeSlug || "full"}`;
            const prevProg = (await redis.get<number>(sessionProgKey)) || 0;

            if (effectiveProg > prevProg) {
              const delta = Math.round(effectiveProg - prevProg);
              // Cap single delta to max 300s to prevent giant manual seeks from blowing up total watch time
              if (delta > 0 && delta <= 300) {
                await redis.incrby("analytics:watch_time_sec", delta);
              }
              await redis.set(sessionProgKey, effectiveProg, { ex: 7 * 86400 });
            }
          }
          await redis.zincrby("analytics:watching:movies", 1, movieSlug);
        }
      } else if (payload.eventType === "search" && payload.keyword) {
        const kw = payload.keyword.toLowerCase().trim();
        await redis.zincrby("analytics:search_counts", 1, kw);
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
      screenRes: eventRecord.screenRes || undefined,
      firstSeen: existingMem?.firstSeen || now,
      lastSeen: now,
    });
  }

  // 3. Persist to Supabase analytics_events table (fail-safe)
  if (supabase) {
    try {
      await supabase.from("analytics_events").insert({
        id: eventRecord.id,
        event_type: eventRecord.eventType,
        movie_slug: eventRecord.movieSlug || null,
        movie_title: eventRecord.movieTitle || null,
        episode_slug: eventRecord.episodeSlug || null,
        episode_name: eventRecord.episodeName || null,
        user_id: eventRecord.userId || null,
        anonymous_id: eventRecord.anonymousId,
        device_type: eventRecord.deviceType,
        os: eventRecord.os,
        browser: eventRecord.browser,
        screen_res: null, // Discontinued screen_res for new events
        duration_seconds: eventRecord.durationSeconds || 0,
        progress_seconds: eventRecord.progressSeconds || 0,
        keyword: eventRecord.keyword || null,
        created_at: eventRecord.createdAt,
      });
    } catch {
      // Table may not exist yet or connection blip: fail silently
    }
  }

  return { success: true, deduped: false };
}

// Timezone offset for Vietnam (Asia/Ho_Chi_Minh, UTC+7 in milliseconds)
const VIETNAM_TIMEZONE_OFFSET_MS = 7 * 60 * 60 * 1000;

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
 * Get hour (0-23) in Asia/Ho_Chi_Minh (UTC+7)
 */
export function getHourVietnam(timestampMs: number): number {
  const vnDate = new Date(timestampMs + VIETNAM_TIMEZONE_OFFSET_MS);
  return vnDate.getUTCHours();
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
  const titleMap = new Map<string, string>();

  // 1. Fan-out: fetch Redis events, Redis title cache, Supabase analytics_events, and
  //    Supabase device_handoff all in parallel — none of these depend on each other.
  const analyticsEventsColumns = [
    "id", "event_type", "movie_slug", "movie_title", "episode_slug", "episode_name",
    "user_id", "anonymous_id", "device_type", "os", "browser",
    "duration_seconds", "progress_seconds", "keyword", "created_at",
  ].join(",");

  const [redisListData, redisTitleData, supabaseEventsResult, supabaseHandoffResult, supabaseDeviceProfilesResult] =
    await Promise.all([
      // B1: Redis recent events list
      redis
        ? redis.lrange<string | StoredAnalyticsEvent>("analytics:events", 0, 500).catch((e) => {
            console.warn("[Analytics] Redis lrange error:", e);
            return null;
          })
        : Promise.resolve(null),

      // B2: Redis movie title map
      redis
        ? redis.hgetall<Record<string, string>>("analytics:movie_titles").catch(() => null)
        : Promise.resolve(null),

      // C: Supabase analytics_events (explicit columns only — no screen_res, no extras)
      (async () => {
        if (!supabase) return { data: null, error: null };
        try {
          let q = supabase
            .from("analytics_events")
            .select(analyticsEventsColumns)
            .order("created_at", { ascending: false })
            .limit(1000);
          if (cutoffTimestamp > 0) {
            q = q.gte("created_at", cutoffTimestamp);
          }
          return await q;
        } catch {
          return { data: null, error: new Error("supabase fetch failed") };
        }
      })(),

      // D: Supabase device_handoff (independent of analytics_events)
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

      // E: Supabase device_profiles (Unified Device Profile telemetry)
      (async () => {
        const client = isSupabaseAdminConfigured() ? getSupabaseAdmin() : supabase;
        if (!client) return { data: null, error: null };
        try {
          let q = client
            .from("device_profiles")
            .select("*")
            .order("last_seen", { ascending: false })
            .limit(2000);
          if (cutoffTimestamp > 0) {
            q = q.gte("last_seen", cutoffTimestamp);
          }
          return await q;
        } catch {
          return { data: null, error: new Error("device_profiles fetch failed") };
        }
      })(),
    ]);

  // Process B1: Redis events
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
      .filter((evt): evt is StoredAnalyticsEvent => Boolean(evt));
  }

  // Process B2: Redis title map
  if (redisTitleData) {
    Object.entries(redisTitleData as Record<string, string>).forEach(([k, v]) => titleMap.set(k, v));
  }

  // Fallback or augment with memory buffer
  if (rawEvents.length === 0 && memoryEventsBuffer.length > 0) {
    rawEvents = [...memoryEventsBuffer];
  }

  // Process C: Supabase analytics_events — merge into rawEvents
  const { data: eventsData, error: eventsError } = supabaseEventsResult ?? { data: null, error: null };
  if (!eventsError && eventsData && eventsData.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbEvents: StoredAnalyticsEvent[] = (eventsData as any[]).map((d) => ({
      id: d.id,
      eventType: d.event_type,
      movieSlug: d.movie_slug,
      movieTitle: d.movie_title,
      episodeSlug: d.episode_slug,
      episodeName: d.episode_name,
      userId: d.user_id,
      anonymousId: d.anonymous_id,
      deviceType: d.device_type,
      os: d.os,
      browser: d.browser,
      screenRes: undefined, // no longer fetched from DB; field kept for type compat
      durationSeconds: d.duration_seconds,
      progressSeconds: d.progress_seconds,
      keyword: d.keyword,
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

  // 2. Aggregate metrics
  let totalViews = 0;
  const uniqueAll = new Set<string>();
  const uniqueUsers = new Set<string>();
  const uniqueGuests = new Set<string>();

  const movieViewsMap = new Map<string, { title: string; views: number; uniqueViewers: Set<string> }>();
  
  // Session-based progress tracking: Map<sessionKey, SessionProgress>
  // sessionKey = `${viewerKey}:${movieSlug}:${episodeSlug || 'full'}`
  interface SessionProgress {
    viewerKey: string;
    movieSlug: string;
    movieTitle: string;
    episodeName?: string;
    episodeSlug?: string;
    maxProgress: number;
    duration: number;
    eventCount: number;
  }
  const sessionProgressMap = new Map<string, SessionProgress>();

  const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };
  const osCounts = new Map<string, number>();
  const browserCounts = new Map<string, number>();
  const searchMap = new Map<string, number>();

  // Unique device identity tracking: authenticated uses userId, guest uses anonymousId
  const seenDeviceIdentities = new Set<string>();

  // Active visitors tracking (seen in last 30 minutes)
  const activeThreshold = now - 30 * 60 * 1000;
  const activeGuestSet = new Set<string>();

  for (const ev of filteredEvents) {
    const viewerKey = ev.userId || ev.anonymousId;

    // Track unique viewers
    uniqueAll.add(viewerKey);
    if (ev.userId) {
      uniqueUsers.add(ev.userId);
    } else {
      uniqueGuests.add(ev.anonymousId);
    }

    // Active guests in last 30 minutes
    if (!ev.userId && ev.createdAt >= activeThreshold) {
      activeGuestSet.add(ev.anonymousId);
    }

    // Devices & platforms (Unique Device Identity aggregation in timeframe)
    const devType = (ev.deviceType || "desktop") as "desktop" | "mobile" | "tablet";
    const osName = ev.os || "Other";
    const browserName = ev.browser || "Other";
    const identityPrefix = ev.userId ? `user:${ev.userId}` : `guest:${ev.anonymousId}`;
    const deviceIdentityKey = `${identityPrefix}:${devType}:${osName}:${browserName}`;

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

    // Movie views
    if (ev.eventType === "movie_view" && ev.movieSlug) {
      totalViews++;
      const currentTitle = ev.movieTitle || titleMap.get(ev.movieSlug) || ev.movieSlug;
      const existing = movieViewsMap.get(ev.movieSlug) || {
        title: currentTitle,
        views: 0,
        uniqueViewers: new Set<string>(),
      };
      existing.views++;
      existing.uniqueViewers.add(viewerKey);
      movieViewsMap.set(ev.movieSlug, existing);
    }

    // Watch events: group by unique session (viewer + movie + episode)
    if (
      (ev.eventType === "watch_progress" || ev.eventType === "watch_end" || ev.eventType === "watch_start") &&
      ev.movieSlug
    ) {
      const sessionKey = `${viewerKey}:${ev.movieSlug}:${ev.episodeSlug || "full"}`;
      const title = ev.movieTitle || titleMap.get(ev.movieSlug) || ev.movieSlug;
      const existing = sessionProgressMap.get(sessionKey) || {
        viewerKey,
        movieSlug: ev.movieSlug,
        movieTitle: title,
        episodeName: ev.episodeName,
        episodeSlug: ev.episodeSlug,
        maxProgress: 0,
        duration: 0,
        eventCount: 0,
      };

      existing.eventCount++;
      if (ev.progressSeconds && ev.progressSeconds > 0) {
        existing.maxProgress = Math.max(existing.maxProgress, ev.progressSeconds);
      }
      if (ev.durationSeconds && ev.durationSeconds > 0) {
        existing.duration = Math.max(existing.duration, ev.durationSeconds);
      }
      if (ev.movieTitle) {
        existing.movieTitle = ev.movieTitle;
      }
      if (ev.episodeName) {
        existing.episodeName = ev.episodeName;
      }
      sessionProgressMap.set(sessionKey, existing);
    }

    // Search events
    if (ev.eventType === "search" && ev.keyword) {
      const kw = ev.keyword.trim();
      searchMap.set(kw, (searchMap.get(kw) || 0) + 1);
    }
  }

  // Calculate actual totalWatchTimeSeconds from sessionProgressMap
  let totalWatchTimeSeconds = 0;

  for (const session of sessionProgressMap.values()) {
    let sessionSec = session.maxProgress;
    // Cap session watch time by video duration if valid
    if (session.duration > 0 && sessionSec > session.duration) {
      sessionSec = session.duration;
    }
    // Fallback: If only watch_start occurred (progress is 0), count minimal 30s
    if (sessionSec === 0 && session.eventCount > 0) {
      sessionSec = 30;
    }

    totalWatchTimeSeconds += sessionSec;
  }

  // Count unique visitors today (unique viewerKeys with site_visit events within today boundary)
  const todayStartMs = getStartOfTodayVietnam(now);
  const todayVisitorSet = new Set<string>();
  for (const ev of rawEvents) {
    if (ev.eventType === "site_visit" && ev.createdAt >= todayStartMs) {
      todayVisitorSet.add(ev.userId || ev.anonymousId);
    }
  }

  // 3. Sort and structure results
  const topMoviesByViews = Array.from(movieViewsMap.entries())
    .map(([slug, data]) => ({
      slug,
      title: data.title,
      views: data.views,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  const topMoviesByUnique = Array.from(movieViewsMap.entries())
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

  // 3B. Compute Unified Device Profile stats from device_profiles table
  const { data: deviceProfileRows } = supabaseDeviceProfilesResult ?? { data: null, error: null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawProfiles = Array.isArray(deviceProfileRows) ? (deviceProfileRows as any[]) : [];

  let deviceProfileStats: DeviceProfileStats;

  if (rawProfiles.length > 0) {
    const totalP = rawProfiles.length;
    let dDesktop = 0;
    let dMobile = 0;
    let dTablet = 0;

    const bMap = new Map<string, number>();
    const osMap = new Map<string, number>();
    const netCounts = {
      g4HighSpeed: 0,
      g3Medium: 0,
      g2Slow: 0,
      slow2g: 0,
      unknown: 0,
      saveDataCount: 0,
      saveDataPercent: 0,
    };
    const vpMap = new Map<string, { count: number; deviceType: string }>();
    let av1Count = 0;
    let hevcCount = 0;
    let h264OnlyCount = 0;

    const countryMap = new Map<string, { code: string; count: number }>();
    const cityMap = new Map<string, { country: string; count: number }>();

    for (const p of rawProfiles) {
      // Device Type
      const dt = String(p.device_type || "").toLowerCase();
      if (dt === "mobile") dMobile++;
      else if (dt === "tablet") dTablet++;
      else dDesktop++;

      // Browser & OS
      const bName = p.browser || "Other";
      const oName = p.os || "Other";
      bMap.set(bName, (bMap.get(bName) || 0) + 1);
      osMap.set(oName, (osMap.get(oName) || 0) + 1);

      // Location (Approximate Country & City)
      if (p.country) {
        const cName = p.country;
        const cCode = p.country_code || "";
        const ex = countryMap.get(cName) || { code: cCode, count: 0 };
        ex.count++;
        countryMap.set(cName, ex);
      }
      if (p.city) {
        const ctName = p.city;
        const cName = p.country || "Quốc tế";
        const ex = cityMap.get(ctName) || { country: cName, count: 0 };
        ex.count++;
        cityMap.set(ctName, ex);
      }

      // Network Quality (W3C Network Information API standard tiers)
      const netType = String(p.network_effective_type || "").toLowerCase();
      if (netType === "4g") netCounts.g4HighSpeed++;
      else if (netType === "3g") netCounts.g3Medium++;
      else if (netType === "2g") netCounts.g2Slow++;
      else if (netType === "slow-2g") netCounts.slow2g++;
      else netCounts.unknown++;

      if (p.network_save_data) {
        netCounts.saveDataCount++;
      }

      // Viewports
      const w = Number(p.viewport_width) || Number(p.screen_width) || 0;
      const h = Number(p.viewport_height) || Number(p.screen_height) || 0;
      if (w > 0 && h > 0) {
        const vpKey = `${w}×${h}`;
        const existingVp = vpMap.get(vpKey) || { count: 0, deviceType: dt || "desktop" };
        existingVp.count++;
        vpMap.set(vpKey, existingVp);
      }

      // Codecs
      const hasAv1 = Boolean(p.codec_av1);
      const hasHevc = Boolean(p.codec_hevc);
      const hasH264 = Boolean(p.codec_h264 ?? true);

      if (hasAv1) av1Count++;
      if (hasHevc) hevcCount++;
      if (hasH264 && !hasHevc && !hasAv1) h264OnlyCount++;
    }

    netCounts.saveDataPercent = totalP > 0 ? Math.round((netCounts.saveDataCount / totalP) * 100) : 0;

    const bList = Array.from(bMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / totalP) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    const osL = Array.from(osMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / totalP) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    const topVpList = Array.from(vpMap.entries())
      .map(([res, item]) => ({
        resolution: res,
        count: item.count,
        percentage: Math.round((item.count / totalP) * 100),
        deviceType: item.deviceType,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const countryList = Array.from(countryMap.entries())
      .map(([name, item]) => ({
        name,
        code: item.code,
        count: item.count,
        percentage: Math.round((item.count / totalP) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    const cityList = Array.from(cityMap.entries())
      .map(([name, item]) => ({
        name,
        country: item.country,
        count: item.count,
        percentage: Math.round((item.count / totalP) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    deviceProfileStats = {
      totalProfiles: totalP,
      overview: {
        desktop: dDesktop,
        mobile: dMobile,
        tablet: dTablet,
        desktopPercent: Math.round((dDesktop / totalP) * 100),
        mobilePercent: Math.round((dMobile / totalP) * 100),
        tabletPercent: Math.round((dTablet / totalP) * 100),
      },
      browsers: bList,
      operatingSystems: osL,
      network: netCounts,
      topViewports: topVpList,
      codecs: {
        av1Count,
        av1Percent: Math.round((av1Count / totalP) * 100),
        hevcCount,
        hevcPercent: Math.round((hevcCount / totalP) * 100),
        h264OnlyCount,
        h264OnlyPercent: Math.round((h264OnlyCount / totalP) * 100),
      },
      locations: {
        countries: countryList,
        topCities: cityList,
      },
    };
  } else {
    // Graceful fallback from session events
    const dDesktop = deviceCounts.desktop || 0;
    const dMobile = deviceCounts.mobile || 0;
    const dTablet = deviceCounts.tablet || 0;
    const sumDev = dDesktop + dMobile + dTablet || 1;

    deviceProfileStats = {
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
    };
  }

  const topSearches = Array.from(searchMap.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 3. Hourly Watch Activity (0-23h) - only watching events
  const watchEventTypes = new Set(["watch_start", "watch_progress", "watch_end", "movie_view"]);
  const hourlyBuckets = new Array(24).fill(0);

  for (const ev of filteredEvents) {
    if (watchEventTypes.has(ev.eventType)) {
      const h = getHourVietnam(ev.createdAt);
      if (h >= 0 && h < 24) {
        hourlyBuckets[h]++;
      }
    }
  }

  const hourlyWatchActivity: HourlyWatchStat[] = hourlyBuckets.map((count, hour) => ({
    hour,
    label: `${hour.toString().padStart(2, "0")}:00`,
    count,
  }));

  // 4. Live Watching sessions — built from the device_handoff result already fetched in
  //    parallel above (supabaseHandoffResult). Profiles query runs here because it has a
  //    real data dependency on the returned handoff user IDs.
  let liveWatching: LiveWatchingSession[] = [];
  try {
    const { data: handoffs, error: handoffErr } = supabaseHandoffResult ?? { data: null, error: null };

    if (!handoffErr && handoffs && handoffs.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handoffRows = handoffs as any[];
      const userIds = Array.from(new Set(handoffRows.map((h) => h.user_id).filter(Boolean)));
      const profileMap = new Map<string, { name: string; avatar?: string; email?: string }>();

      // Profiles query is sequential here by necessity: we need handoff user IDs first
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

  // 4B. Live Watching for Guests (scanned from recent watch_progress / watch_start in rawEvents)
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  const latestGuestWatchMap = new Map<string, StoredAnalyticsEvent>();

  for (const ev of rawEvents) {
    if (
      !ev.userId &&
      ev.anonymousId &&
      ev.movieSlug &&
      (ev.eventType === "watch_progress" || ev.eventType === "watch_start" || ev.eventType === "watch_end")
    ) {
      const existing = latestGuestWatchMap.get(ev.anonymousId);
      if (!existing || ev.createdAt > existing.createdAt) {
        latestGuestWatchMap.set(ev.anonymousId, ev);
      }
    }
  }

  const guestLiveSessions: LiveWatchingSession[] = [];
  for (const [anonId, ev] of latestGuestWatchMap.entries()) {
    if (ev.createdAt >= fiveMinutesAgo && ev.eventType !== "watch_end" && ev.movieSlug) {
      const rawDur = Number(ev.durationSeconds) || 0;
      const dur = rawDur > 0 ? Math.floor(rawDur) : 0;
      const rawProg = Number(ev.progressSeconds) || 0;
      let prog = rawProg > 0 ? Math.floor(rawProg) : 0;
      if (dur > 0) prog = Math.min(prog, dur);
      prog = Math.max(0, prog);
      const percent = dur > 0 ? Math.min(100, Math.max(0, Math.round((prog / dur) * 100))) : 0;

      const currentTitle = ev.movieTitle || titleMap.get(ev.movieSlug) || ev.movieSlug;
      const devTypeStr = ev.deviceType === "mobile" ? "Điện thoại" : ev.deviceType === "tablet" ? "Tablet" : "Máy tính";
      const deviceLabel = `${devTypeStr} • ${ev.os || "Web"}`;

      guestLiveSessions.push({
        userId: anonId,
        userName: `Guest (${anonId.slice(5, 11)})`,
        isGuest: true,
        movieSlug: ev.movieSlug,
        movieTitle: currentTitle,
        episodeSlug: ev.episodeSlug,
        episodeName: ev.episodeName,
        progressSeconds: prog,
        durationSeconds: dur,
        progressPercent: percent,
        deviceName: deviceLabel,
        updatedAt: ev.createdAt,
        isLive: true,
      });
    }
  }

  // Combine User handoffs + Guest live sessions, ordered by most recent activity
  liveWatching = [...liveWatching, ...guestLiveSessions].sort((a, b) => b.updatedAt - a.updatedAt);

  // If filtered events are empty (e.g. fresh system), also query Redis totals if timeframe === 'all'
  let finalTotalViews = totalViews;
  let finalUniqueTotal = uniqueAll.size;
  let finalUniqueUsers = uniqueUsers.size;
  let finalUniqueGuests = uniqueGuests.size;
  const finalWatchSec = totalWatchTimeSeconds;

  if (timeframe === "all" && redis) {
    try {
      const [redisViews, redisUniqTotal, redisUniqUsers, redisUniqGuests] = await Promise.all([
        redis.get<number>("analytics:views:total"),
        redis.scard("analytics:unique:total"),
        redis.scard("analytics:unique:users"),
        redis.scard("analytics:unique:guests"),
      ]);
      if (redisViews && redisViews > finalTotalViews) finalTotalViews = redisViews;
      if (redisUniqTotal && redisUniqTotal > finalUniqueTotal) finalUniqueTotal = redisUniqTotal;
      if (redisUniqUsers && redisUniqUsers > finalUniqueUsers) finalUniqueUsers = redisUniqUsers;
      if (redisUniqGuests && redisUniqGuests > finalUniqueGuests) finalUniqueGuests = redisUniqGuests;

      // Rebuild and synchronize Redis analytics:watch_time_sec with accurate analytics_events total
      await redis.set("analytics:watch_time_sec", finalWatchSec);
    } catch (redisSyncErr) {
      console.warn("[Analytics] Redis sync error:", redisSyncErr);
    }
  }

  // Map device profiles to location for enriching recentActivity
  const profileLocationMap = new Map<string, { country?: string; countryCode?: string; region?: string; city?: string }>();
  for (const p of rawProfiles) {
    const loc = {
      country: p.country || undefined,
      countryCode: p.country_code || undefined,
      region: p.region || undefined,
      city: p.city || undefined,
    };
    if (p.guest_id) profileLocationMap.set(p.guest_id, loc);
    if (p.user_id) profileLocationMap.set(p.user_id, loc);
  }

  const enrichedRecentActivity: StoredAnalyticsEvent[] = filteredEvents.slice(0, 40).map((ev) => {
    const fallbackLoc = (ev.userId ? profileLocationMap.get(ev.userId) : null) || profileLocationMap.get(ev.anonymousId);
    return {
      ...ev,
      country: ev.country || fallbackLoc?.country,
      countryCode: ev.countryCode || fallbackLoc?.countryCode,
      region: ev.region || fallbackLoc?.region,
      city: ev.city || fallbackLoc?.city,
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
    totalWatchTimeSeconds: finalWatchSec,
    activeGuestsCount: activeGuestSet.size,
    topMoviesByViews,
    topMoviesByUnique,
    devices: deviceCounts,
    osList,
    browserList,
    recentActivity: enrichedRecentActivity,
    topSearches,
    liveWatching,
    hourlyWatchActivity,
    todayVisitorsCount: todayVisitorSet.size,
    deviceProfileStats,
  };
}

/**
 * Rebuild and synchronize Redis `analytics:watch_time_sec` counter from valid Supabase `analytics_events`.
 * Resets the corrupt value (e.g. 71h 28m) and restores exact session-based total watch time.
 */
export async function rebuildWatchTimeCounter(): Promise<{ previousSeconds: number; newSeconds: number }> {
  const redis = getRedis();
  let prevSec = 0;
  if (redis) {
    try {
      prevSec = (await redis.get<number>("analytics:watch_time_sec")) || 0;
    } catch {}
  }

  const stats = await getAnalyticsDashboardStats("all");

  if (redis) {
    try {
      await redis.set("analytics:watch_time_sec", stats.totalWatchTimeSeconds);
    } catch {}
  }

  return {
    previousSeconds: prevSec,
    newSeconds: stats.totalWatchTimeSeconds,
  };
}
