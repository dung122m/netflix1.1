import { Redis } from "@upstash/redis";
import { supabase } from "@/lib/supabase";
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
  screenRes: string;
  firstSeen: number;
  lastSeen: number;
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
  topWatching: Array<{ slug: string; title: string; episodeName?: string; watchCount: number; totalSeconds: number }>;
  devices: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  osList: Array<{ name: string; count: number; percentage: number }>;
  browserList: Array<{ name: string; count: number; percentage: number }>;
  recentActivity: StoredAnalyticsEvent[];
  topSearches: Array<{ keyword: string; count: number }>;
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
 * Record an analytics event with 30-min movie_view deduplication
 */
export async function recordAnalyticsEvent(payload: AnalyticsEventPayload): Promise<{
  success: boolean;
  deduped?: boolean;
}> {
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
    screenRes: payload.deviceInfo?.screenRes || "1920x1080",
    durationSeconds: payload.durationSeconds || 0,
    progressSeconds: payload.progressSeconds || 0,
    keyword: payload.keyword?.trim(),
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
        screenRes: eventRecord.screenRes || "1920x1080",
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
        const watchSec = payload.durationSeconds || payload.progressSeconds || 30;
        await redis.incrby("analytics:watch_time_sec", Math.max(0, watchSec));
        if (movieSlug) {
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
      screenRes: eventRecord.screenRes || "1920x1080",
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
        screen_res: eventRecord.screenRes,
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

/**
 * Fetch and aggregate analytics dashboard statistics
 */
export async function getAnalyticsDashboardStats(
  timeframe: "today" | "7d" | "30d" | "all" = "today"
): Promise<AnalyticsDashboardStats> {
  const now = Date.now();
  let cutoffTimestamp = 0;

  if (timeframe === "today") {
    // Start of current day (local time approx)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    cutoffTimestamp = today.getTime();
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

  // 1. Retrieve raw events
  if (redis) {
    try {
      const listData = await redis.lrange<string | StoredAnalyticsEvent>("analytics:events", 0, 500);
      if (listData && Array.isArray(listData)) {
        rawEvents = listData
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

      // Pre-load movie title cache
      const storedTitles = await redis.hgetall<Record<string, string>>("analytics:movie_titles");
      if (storedTitles) {
        Object.entries(storedTitles).forEach(([k, v]) => titleMap.set(k, v));
      }
    } catch (e) {
      console.warn("[Analytics] Redis query error:", e);
    }
  }

  // Fallback or augment with memory buffer
  if (rawEvents.length === 0 && memoryEventsBuffer.length > 0) {
    rawEvents = [...memoryEventsBuffer];
  }

  // Try querying Supabase if table exists
  if (supabase) {
    try {
      let query = supabase.from("analytics_events").select("*").order("created_at", { ascending: false }).limit(300);
      if (cutoffTimestamp > 0) {
        query = query.gte("created_at", cutoffTimestamp);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        // Merge Supabase events
        const dbEvents: StoredAnalyticsEvent[] = data.map((d) => ({
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
          screenRes: d.screen_res,
          durationSeconds: d.duration_seconds,
          progressSeconds: d.progress_seconds,
          keyword: d.keyword,
          createdAt: Number(d.created_at),
        }));

        // Combine unique events
        const existingIds = new Set(rawEvents.map((e) => e.id));
        for (const ev of dbEvents) {
          if (!existingIds.has(ev.id)) {
            rawEvents.push(ev);
            existingIds.add(ev.id);
          }
        }
      }
    } catch {
      // Ignore Supabase errors
    }
  }

  // Filter events by timeframe
  const filteredEvents = rawEvents.filter((ev) => ev.createdAt >= cutoffTimestamp);

  // 2. Aggregate metrics
  let totalViews = 0;
  let totalWatchTimeSeconds = 0;
  const uniqueAll = new Set<string>();
  const uniqueUsers = new Set<string>();
  const uniqueGuests = new Set<string>();

  const movieViewsMap = new Map<string, { title: string; views: number; uniqueViewers: Set<string> }>();
  const movieWatchingMap = new Map<string, { title: string; episodeName?: string; count: number; seconds: number }>();
  const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };
  const osCounts = new Map<string, number>();
  const browserCounts = new Map<string, number>();
  const searchMap = new Map<string, number>();

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

    // Devices & platforms
    const devType = (ev.deviceType || "desktop") as "desktop" | "mobile" | "tablet";
    if (deviceCounts[devType] !== undefined) {
      deviceCounts[devType]++;
    } else {
      deviceCounts.desktop++;
    }

    const osName = ev.os || "Other";
    osCounts.set(osName, (osCounts.get(osName) || 0) + 1);

    const browserName = ev.browser || "Other";
    browserCounts.set(browserName, (browserCounts.get(browserName) || 0) + 1);

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

    // Watch events
    if (ev.eventType === "watch_progress" || ev.eventType === "watch_end" || ev.eventType === "watch_start") {
      const sec = ev.durationSeconds || ev.progressSeconds || 30;
      totalWatchTimeSeconds += sec;

      if (ev.movieSlug) {
        const title = ev.movieTitle || titleMap.get(ev.movieSlug) || ev.movieSlug;
        const watchKey = `${ev.movieSlug}:${ev.episodeSlug || "full"}`;
        const existing = movieWatchingMap.get(watchKey) || {
          title,
          episodeName: ev.episodeName,
          count: 0,
          seconds: 0,
        };
        existing.count++;
        existing.seconds += sec;
        movieWatchingMap.set(watchKey, existing);
      }
    }

    // Search events
    if (ev.eventType === "search" && ev.keyword) {
      const kw = ev.keyword.trim();
      searchMap.set(kw, (searchMap.get(kw) || 0) + 1);
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

  const topWatching = Array.from(movieWatchingMap.entries())
    .map(([key, data]) => {
      const [slug] = key.split(":");
      return {
        slug,
        title: data.title,
        episodeName: data.episodeName,
        watchCount: data.count,
        totalSeconds: data.seconds,
      };
    })
    .sort((a, b) => b.totalSeconds - a.totalSeconds)
    .slice(0, 10);

  const totalPlatformHits = filteredEvents.length || 1;

  const osList = Array.from(osCounts.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / totalPlatformHits) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const browserList = Array.from(browserCounts.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / totalPlatformHits) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const topSearches = Array.from(searchMap.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // If filtered events are empty (e.g. fresh system), also query Redis totals if timeframe === 'all'
  let finalTotalViews = totalViews;
  let finalUniqueTotal = uniqueAll.size;
  let finalUniqueUsers = uniqueUsers.size;
  let finalUniqueGuests = uniqueGuests.size;
  let finalWatchSec = totalWatchTimeSeconds;

  if (timeframe === "all" && redis) {
    try {
      const [redisViews, redisWatchSec, redisUniqTotal, redisUniqUsers, redisUniqGuests] = await Promise.all([
        redis.get<number>("analytics:views:total"),
        redis.get<number>("analytics:watch_time_sec"),
        redis.scard("analytics:unique:total"),
        redis.scard("analytics:unique:users"),
        redis.scard("analytics:unique:guests"),
      ]);
      if (redisViews && redisViews > finalTotalViews) finalTotalViews = redisViews;
      if (redisWatchSec && redisWatchSec > finalWatchSec) finalWatchSec = redisWatchSec;
      if (redisUniqTotal && redisUniqTotal > finalUniqueTotal) finalUniqueTotal = redisUniqTotal;
      if (redisUniqUsers && redisUniqUsers > finalUniqueUsers) finalUniqueUsers = redisUniqUsers;
      if (redisUniqGuests && redisUniqGuests > finalUniqueGuests) finalUniqueGuests = redisUniqGuests;
    } catch {}
  }

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
    topWatching,
    devices: deviceCounts,
    osList,
    browserList,
    recentActivity: filteredEvents.slice(0, 30),
    topSearches,
  };
}
