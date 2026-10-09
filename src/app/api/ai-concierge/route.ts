import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movieApi";
import { cacheService } from "@/lib/cache";
import { verifyServerAuth } from "@/lib/serverAuth";
import {
  evaluateRateLimit,
  hashClientIp,
  isEntityBlocked,
  recordSecurityViolation,
} from "@/services/securityRiskService";
import { SuggestionCard, MatchOptions, ConciergeApiResponse, CacheEntry, SearchIntent } from "./types";
import {
  CACHE_TTL_MS,
  MAX_CACHE_ENTRIES,
  GUEST_AI_REQUEST_LIMIT,
  TOTAL_REQUEST_LIMIT,
  RATE_LIMIT_WINDOW_SECONDS,
  AI_CONCIERGE_CACHE_VERSION,
} from "./constants";
import {
  cleanNormalizedString,
  extractCleanSearchKeywords,
  normalizeQuery,
  extractMovieYear,
  resolveActorSlug,
  getActorAliases,
  matchesActor,
  matchesDirector,
  extractEpisodeTotal,
  parseEpisodeConstraint,
  getCountryDisplayName,
  resolveCountrySlug,
  resolveGenreSlug,
  resolveGenreSlugs,
  resolveTypeSlug,
  matchesCountry,
  matchesGenre,
  resolveCharacter,
  detectCharacterIntent,
  isExplicitAllPartsRequest,
  extractFranchiseKey,
  hasWordMatch,
  ACTOR_SLUG_MAP,
} from "./taxonomy";
import {
  toSafePoster,
  toSafeActors,
  toSafeCountry,
  toSafeCategory,
  toSafeCategories,
  getMovieHighlight,
} from "./movieFormatter";
import { searchSingleMovieFast } from "./movieSearch";
import { analyzeUserPrompt } from "./aiAnalyzer";
import { searchMoviesBySemantic } from "@/services/aiVectorService";
import {
  isRelevantToQuery,
  extractContentKeywords,
  isGibberishQuery,
  isVagueQuery,
  VIETNAMESE_STOP_WORDS,
  GENERIC_SINGLE_WORDS,
} from "./relevanceGate";
import { resolveConcepts } from "./conceptRegistry";
import { queryMoviesByActor, isAmbiguousShortActorKeyword } from "@/services/aiActorService";
import {
  searchTmdbMedia,
  getTmdbMovieRecommendations,
  discoverTmdbConceptMovies,
} from "@/services/tmdbService";

export const maxDuration = 15;

// Re-export types & helpers cho tương thích ngược
export type { SuggestionCard, MatchOptions, ConciergeApiResponse };
export {
  extractMovieYear,
  resolveActorSlug,
  getActorAliases,
  matchesActor,
  resolveCountrySlug,
  resolveGenreSlug,
  matchesCountry,
  matchesGenre,
  getMovieHighlight,
};

// ============================================================================
// RESPONSE CACHING
// ============================================================================
const AI_RESPONSE_CACHE = new Map<string, CacheEntry>();

// ============================================================================
// GET: HEALTH CHECK & STATUS
// ============================================================================
export async function GET() {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  return NextResponse.json({
    hasServerKey: hasKey,
    activeModel: "Google Gemini Flash & Groq Universal Reasoning",
    status: hasKey ? "ready" : "fallback_only",
    cacheSize: AI_RESPONSE_CACHE.size,
  });
}

function normalizeExcludeSlugs(slugs: unknown[]): string[] {
  if (!Array.isArray(slugs) || slugs.length === 0) return [];
  const normalized = slugs
    .map((s) => (typeof s === "string" ? s.trim().toLowerCase() : ""))
    .filter(Boolean);
  return Array.from(new Set(normalized)).sort();
}

// ============================================================================
// POST: CONTROLLER CHÍNH
// ============================================================================
export async function POST(req: NextRequest) {
  try {
    const isTestRunner = req.headers.get("x-bypass-ratelimit") === "test_suite";

    // 1. Identify client (user:${userId} > guest:${anonymousId} > ip:${ipHash})
    const auth = await verifyServerAuth(req);
    const isUser = auth.isAuthenticated && Boolean(auth.userId);
    const userId = isUser ? auth.userId : undefined;
    const anonymousId = req.headers.get("x-anonymous-id") || undefined;
    const forwarded = req.headers.get("x-forwarded-for");
    const rawIp = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
    const ipHash = hashClientIp(rawIp);

    // 2. Check if entity is currently temporary blocked (Risk >= 60)
    if (!isTestRunner) {
      const blockedCheck = await isEntityBlocked({ userId, anonymousId, ipHash });
      if (blockedCheck.isBlocked) {
        return NextResponse.json(
          {
            error: "Hệ thống phát hiện tần suất gửi yêu cầu bất thường. Để bảo vệ kết nối, tính năng tạm dừng trong ít phút. Vui lòng thử lại sau.",
          },
          { status: 429 }
        );
      }
    }

    // 3. Evaluate Rate Limit using Upstash Redis (Cross-instance)
    const windowSeconds = RATE_LIMIT_WINDOW_SECONDS;
    const rateLimit = isTestRunner
      ? { allowed: true, currentCount: 1 }
      : await evaluateRateLimit({
          userId,
          anonymousId,
          ipHash,
          actionKey: "ai_concierge",
          maxRequests: TOTAL_REQUEST_LIMIT,
          windowSeconds,
        });

    if (!rateLimit.allowed) {
      // Record violation in Security Center
      recordSecurityViolation({
        userId,
        userEmail: auth.email,
        userDisplayName: auth.displayName,
        anonymousId,
        ipHash,
        violationType: "rapid_requests",
        reason: `Vượt giới hạn gửi yêu cầu AI Concierge (${rateLimit.currentCount}/${TOTAL_REQUEST_LIMIT} req trong ${windowSeconds}s)`,
        endpoint: "/api/ai-concierge",
        method: "POST",
      }).catch(() => {});

      return NextResponse.json(
        {
          error: "Bạn đang gửi yêu cầu quá nhanh. Vui lòng chờ 30 giây rồi thử lại để bảo vệ hệ thống.",
        },
        {
          status: 429,
          headers: { "Retry-After": "30" },
        }
      );
    }

    const t0_req = performance.now();
    let t_ai_ms = 0;
    let t_search_ms = 0;

    const body = await req.json();
    const prompt: string = body.prompt?.trim() || "";
    const userApiKey: string = body.apiKey?.trim() || "";

    // Determine if request should use Local Heuristic Fallback (Guest req 11–30 or forced test)
    const shouldUseLocalFallback = Boolean(body.forceLocalFallback) || (!isUser && rateLimit.currentCount > GUEST_AI_REQUEST_LIMIT);

    const rawExcludeSlugs = Array.isArray(body.excludeSlugs) ? body.excludeSlugs : [];
    const excludeSlugs = normalizeExcludeSlugs(rawExcludeSlugs);
    const rawHistory = Array.isArray(body.history) ? body.history : [];
    const conversationHistory = rawHistory.slice(-6).map((h: { role?: string; content?: string; text?: string }) => ({
      role: (h.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
      content: (h.content || h.text || "").trim(),
    })).filter((h: { content: string }) => Boolean(h.content));

    if (!prompt) {
      return NextResponse.json(
        { error: "Vui lòng nhập tâm trạng hoặc câu hỏi phim của bạn." },
        { status: 400 }
      );
    }

    // 1. Kiểm tra cache hit (L1 Memory Map & L2 Cloudflare KV)
    // Nếu có lịch sử đối thoại thì thêm dấu ấn ngữ cảnh vào cache key để không trả nhầm cache câu hỏi độc lập
    const lastContextSnippet = conversationHistory.length > 0
      ? conversationHistory.slice(-2).map((h: { content: string }) => normalizeQuery(h.content).slice(0, 30)).join("_")
      : "";
    const excludeSnippet = excludeSlugs.length > 0
      ? `__ex_${excludeSlugs.join(",")}`
      : "";
    const baseKey = lastContextSnippet
      ? `${normalizeQuery(prompt)}__ctx_${lastContextSnippet}`
      : normalizeQuery(prompt);
    const cacheKey = `${AI_CONCIERGE_CACHE_VERSION}:${baseKey}${excludeSnippet}`;

function isCacheValidForPrompt(
  cached: { movies?: SuggestionCard[] },
  prompt: string,
  history?: Array<{ role: string; content: string }>
): boolean {
  if (!cached || !Array.isArray(cached.movies) || cached.movies.length === 0) return false;

  // 1. Kiểm tra quốc gia
  const promptCountry =
    resolveCountrySlug(prompt) ||
    (history?.length ? history.map((h) => resolveCountrySlug(h.content)).find(Boolean) : "");
  if (promptCountry) {
    const matchingCountryCount = cached.movies.filter((m) =>
      matchesCountry(m.country || "", promptCountry)
    ).length;
    if (matchingCountryCount === 0 && cached.movies.length > 0) return false;
  }

  // 2. Kiểm tra ràng buộc số tập
  const epConstraint = parseEpisodeConstraint(prompt);
  if (epConstraint) {
    for (const m of cached.movies) {
      const epTotal = extractEpisodeTotal(m);
      if (epConstraint.requireSeries) {
        const isSeries =
          m.category?.toLowerCase().includes("bộ") ||
          m.title.toLowerCase().includes("phần") ||
          m.title.toLowerCase().includes("season") ||
          (epTotal !== null && epTotal > 1);
        if (!isSeries) return false;
      }
      if (epTotal !== null) {
        if (epConstraint.strictLessThan !== undefined && epTotal >= epConstraint.strictLessThan) {
          return false;
        }
        if (epConstraint.maxEpisodes !== undefined && epTotal > epConstraint.maxEpisodes) {
          return false;
        }
      }
    }
  }

  // 3. Kiểm tra diễn viên / nhân vật
  const actorSlug = resolveActorSlug("", prompt);
  if (actorSlug) {
    const hasAnyActor = cached.movies.some((m) => {
      const actors = m.actors || [];
      return matchesActor(actors, actorSlug) || matchesDirector(undefined, actorSlug);
    });
    if (!hasAnyActor && cached.movies.length > 0) return false;
  }

  return true;
}

    if (body.clearCache) {
      AI_RESPONSE_CACHE.clear();
      await cacheService.delete(`ai:concierge:${cacheKey}`);
    }
    const cachedItem = AI_RESPONSE_CACHE.get(cacheKey);
    if (
      cachedItem &&
      Date.now() - cachedItem.cachedAt < CACHE_TTL_MS &&
      isCacheValidForPrompt(cachedItem, prompt, conversationHistory)
    ) {
      return NextResponse.json({
        reply: cachedItem.reply,
        mood: cachedItem.mood,
        movies: cachedItem.movies.slice(0, 8),
        provider: cachedItem.provider || "Nana AI",
        cached: true,
      });
    }

    const cacheRes = await cacheService.get<ConciergeApiResponse>(`ai:concierge:${cacheKey}`);
    if (
      cacheRes &&
      cacheRes.movies &&
      cacheRes.movies.length > 0 &&
      isCacheValidForPrompt(cacheRes, prompt, conversationHistory)
    ) {
      const responsePayload = {
        ...cacheRes,
        movies: cacheRes.movies.slice(0, 8),
        cached: true,
      };
      AI_RESPONSE_CACHE.set(cacheKey, { ...responsePayload, cachedAt: Date.now() });
      return NextResponse.json(responsePayload);
    }

    const currentYear = new Date().getFullYear();

    // 2. Phân tích ngữ nghĩa & trích xuất ý định bằng AI (Kèm ngữ cảnh cuộc hội thoại)
    const t_ai_start = performance.now();
    const { parsed: aiParsed, provider: aiProviderName } = await analyzeUserPrompt(
      prompt,
      userApiKey,
      conversationHistory,
      { forceLocalFallback: shouldUseLocalFallback }
    );
    t_ai_ms = Math.round(performance.now() - t_ai_start);

    // 3. Chuẩn hóa bộ lọc (Slugs & Constraints)
    const excludedTitles: string[] = [
      ...(aiParsed?.exclude?.titles || []),
    ].map((t) => t.trim().toLowerCase()).filter(Boolean);

    // Heuristic: "phim giống X nhưng không phải X" / "không lấy phim X" / "không có yếu tố X"
    const excludePatternMatch = prompt.match(/(?:nhưng\s+không\s+phải|nhung\s+khong\s+phai|không\s+phải|khong\s+phai|không\s+lấy|khong\s+lay|không\s+có\s+(?:yếu\s+tố\s+)?|khong\s+co\s+(?:yeu\s+to\s+)?|trừ|loại\s+trừ)\s+([^\.,\?!]+)/i);
    if (excludePatternMatch && excludePatternMatch[1]) {
      const rawEx = excludePatternMatch[1].trim().toLowerCase();
      if (rawEx && !excludedTitles.includes(rawEx)) {
        excludedTitles.push(rawEx);
      }
    }

    // 2.4. Trích xuất "phim giống X" / Reference Seed Movie (Hỗ trợ cả lượt hiện tại và kế thừa từ lịch sử)
    const similarPatternMatch = prompt.match(
      /(?:phim\s+)?(?:giống|giong|tương tự|tuong tu|kiểu như|kieu nhu|same as|similar to|like)\s+(?:phim\s+)?([^\.,\?!]+)/i
    );
    let seedMovieTitle = "";
    if (similarPatternMatch && similarPatternMatch[1]) {
      const rawSeed = similarPatternMatch[1]
        .replace(/(?:nhưng|nhung|mà|ma|chứ|chu|không|khong|trừ|tru)[\s\S]*/i, "")
        .trim();
      const cleanRaw = cleanNormalizedString(rawSeed).toLowerCase();
      if (rawSeed && rawSeed.length >= 2 && !VIETNAMESE_STOP_WORDS.has(cleanRaw) && !GENERIC_SINGLE_WORDS.has(cleanRaw)) {
        seedMovieTitle = rawSeed;
      }
    }
    if (!seedMovieTitle && aiParsed?.suggested_movies && aiParsed.suggested_movies.length > 0) {
      if (/(?:giống|giong|tương tự|tuong tu|similar|like)/i.test(prompt)) {
        const firstM = aiParsed.suggested_movies[0];
        if (firstM?.original_title || firstM?.title) {
          const t = firstM.original_title || firstM.title;
          const cleanT = cleanNormalizedString(t).toLowerCase();
          if (!VIETNAMESE_STOP_WORDS.has(cleanT) && !GENERIC_SINGLE_WORDS.has(cleanT)) {
            seedMovieTitle = t;
          }
        }
      }
    }
    // Kế thừa seed movie từ hội thoại trước nếu lượt này là câu hỏi tương tự tiếp nối
    if (!seedMovieTitle && conversationHistory.length > 0) {
      for (let i = conversationHistory.length - 1; i >= 0; i--) {
        const prev = conversationHistory[i];
        if (prev.role === "user") {
          const m = prev.content.match(
            /(?:phim\s+)?(?:giống|giong|tương tự|tuong tu|kiểu như|kieu nhu|same as|similar to|like)\s+(?:phim\s+)?([^\.,\?!]+)/i
          );
          if (m && m[1]) {
            const rawSeed = m[1]
              .replace(/(?:nhưng|nhung|mà|ma|chứ|chu|không|khong|trừ|tru)[\s\S]*/i, "")
              .trim();
            const cleanRaw = cleanNormalizedString(rawSeed).toLowerCase();
            if (rawSeed && rawSeed.length >= 2 && !VIETNAMESE_STOP_WORDS.has(cleanRaw) && !GENERIC_SINGLE_WORDS.has(cleanRaw)) {
              seedMovieTitle = rawSeed;
              break;
            }
          }
        }
      }
    }

    if (seedMovieTitle) {
      const cleanSeedLower = seedMovieTitle.trim().toLowerCase();
      if (!excludedTitles.includes(cleanSeedLower)) {
        excludedTitles.push(cleanSeedLower);
      }
    }

    const promptCharMatch =
      prompt.match(/(?:phim\s+)?(?:có|co)\s+(?:nhân\s+vật|nhan\s+vat)\s+([^\.,\?!]+)/i) ||
      prompt.match(/(?:nhân\s+vật|nhan\s+vat)\s+(?:tên\s+là|tên)\s+([^\.,\?!]+)/i);
    const rawPromptChar = promptCharMatch ? promptCharMatch[1].trim() : "";

    const detectedConcepts = resolveConcepts(prompt, aiParsed?.concepts);
    const isTokusatsuConcept = detectedConcepts.some((c) => c.id === "japanese_tokusatsu");

    let detectedChar = isTokusatsuConcept
      ? null
      : resolveCharacter(prompt) ||
        (aiParsed?.character ? resolveCharacter(aiParsed.character) : null) ||
        (rawPromptChar ? resolveCharacter(rawPromptChar) : null);

    // Nếu nhân vật nằm trong danh sách loại trừ (ví dụ: "phim giống John Wick nhưng không phải John Wick")
    // thì hủy bỏ character intent
    if (detectedChar) {
      const charNameLower = detectedChar.name.toLowerCase();
      const isExcluded = excludedTitles.some((ex) => {
        const cleanEx = cleanNormalizedString(ex);
        return (
          charNameLower.includes(cleanEx) ||
          cleanEx.includes(charNameLower) ||
          detectedChar?.aliases?.some((a) => cleanNormalizedString(a) === cleanEx)
        );
      });
      if (isExcluded) {
        detectedChar = null;
      }
    }

    const rawCharacter = detectedChar
      ? detectedChar.name
      : (aiParsed?.character?.trim() || rawPromptChar);
    const hasCharacterIntent = Boolean(
      detectedChar || (detectCharacterIntent(prompt) && rawCharacter && !excludedTitles.some((ex) => rawCharacter.toLowerCase().includes(ex)))
    );

    // 2.2. Trích xuất danh sách diễn viên (Hỗ trợ truy vấn nhiều diễn viên)
    const rawActorsList: string[] = [];
    if (aiParsed?.people && Array.isArray(aiParsed.people)) {
      for (const p of aiParsed.people) {
        if (p?.name && (p.role === "actor" || !p.role)) {
          const nm = p.name.trim();
          if (nm && !rawActorsList.includes(nm)) rawActorsList.push(nm);
        }
      }
    }
    if (rawActorsList.length === 0 && aiParsed?.actor) {
      const nm = aiParsed.actor.trim();
      if (nm) rawActorsList.push(nm);
    }

    const cleanPromptLower = cleanNormalizedString(prompt).toLowerCase();

    // Quét đối chiếu với kho diễn viên ACTOR_SLUG_MAP để phát hiện thêm diễn viên
    for (const aliases of Object.values(ACTOR_SLUG_MAP)) {
      if (aliases.some((a) => cleanPromptLower.includes(cleanNormalizedString(a)))) {
        const mainName = aliases[0];
        if (!rawActorsList.some((n) => cleanNormalizedString(n) === cleanNormalizedString(mainName))) {
          rawActorsList.push(mainName);
        }
      }
    }

    // Kế thừa diễn viên từ hội thoại trước nếu lượt này là câu hỏi nối tiếp (follow-up)
    if (rawActorsList.length === 0 && conversationHistory.length > 0) {
      for (let i = conversationHistory.length - 1; i >= 0; i--) {
        const prevMsg = conversationHistory[i];
        if (prevMsg.role === "user") {
          for (const aliases of Object.values(ACTOR_SLUG_MAP)) {
            const cleanPrev = cleanNormalizedString(prevMsg.content).toLowerCase();
            if (aliases.some((a) => cleanPrev.includes(cleanNormalizedString(a)))) {
              const mainName = aliases[0];
              if (!rawActorsList.some((n) => cleanNormalizedString(n) === cleanNormalizedString(mainName))) {
                rawActorsList.push(mainName);
              }
            }
          }
          if (rawActorsList.length > 0) break;
        }
      }
    }

    const targetActorSlugs = hasCharacterIntent
      ? []
      : Array.from(new Set(rawActorsList.map((a) => resolveActorSlug(a, prompt)).filter(Boolean)));
    const targetActorNames = hasCharacterIntent ? [] : rawActorsList;

    const parsedActor = targetActorNames[0] || "";
    const rawCountryList = Array.isArray(aiParsed?.countries)
      ? aiParsed.countries
      : aiParsed?.country
      ? [aiParsed.country]
      : [];
    const rawKeyword =
      aiParsed?.keywords?.[0] || aiParsed?.keyword || "";

    const rawGenreList = Array.isArray(aiParsed?.genres)
      ? aiParsed.genres
      : aiParsed?.genre
      ? [aiParsed.genre]
      : [];

    // Kế thừa quốc gia từ lịch sử hội thoại nếu câu mới không chỉ định
    let inheritedCountrySlug = "";
    if (conversationHistory.length > 0) {
      for (let i = conversationHistory.length - 1; i >= 0; i--) {
        const prevMsg = conversationHistory[i];
        if (prevMsg.role === "user") {
          const c = resolveCountrySlug(prevMsg.content);
          if (c) {
            inheritedCountrySlug = c;
            break;
          }
        }
      }
    }

    // Kế thừa thể loại từ lịch sử hội thoại nếu câu mới không chỉ định
    let inheritedGenreSlugs: string[] = [];
    if (conversationHistory.length > 0) {
      for (let i = conversationHistory.length - 1; i >= 0; i--) {
        const prevMsg = conversationHistory[i];
        if (prevMsg.role === "user") {
          const gs = resolveGenreSlugs(undefined, prevMsg.content);
          if (gs.length > 0) {
            inheritedGenreSlugs = gs;
            break;
          }
        }
      }
    }

    const targetGenreSlugs = resolveGenreSlugs(rawGenreList, prompt);
    const effectiveTargetGenreSlugs =
      targetGenreSlugs.length > 0
        ? targetGenreSlugs
        : inheritedGenreSlugs.length > 0
        ? inheritedGenreSlugs
        : [];
    const targetGenreSlug = effectiveTargetGenreSlugs[0] || resolveGenreSlug(prompt);

    const explicitCountrySlug =
      rawCountryList.map(resolveCountrySlug).find(Boolean) ||
      resolveCountrySlug(prompt);
    const targetCountrySlug = explicitCountrySlug || inheritedCountrySlug;

    let targetTypeSlug = resolveTypeSlug(aiParsed?.type || undefined, prompt);
    const episodeConstraint = parseEpisodeConstraint(prompt);

    let targetActorSlug = hasCharacterIntent
      ? ""
      : targetActorSlugs[0] || resolveActorSlug(parsedActor, prompt) || resolveActorSlug(prompt);

    const rawActorName = !hasCharacterIntent ? parsedActor.trim() : "";
    const isAmbiguousActor = rawActorName ? isAmbiguousShortActorKeyword(rawActorName) : false;
    let effectiveActorName = targetActorSlug
      ? (getActorAliases(targetActorSlug)[0] || targetActorSlug.replace(/-/g, " "))
      : (!isAmbiguousActor && rawActorName ? rawActorName : "");

    const lowerPrompt = prompt.toLowerCase();
    const cleanPrompt = cleanNormalizedString(prompt);

    // 2.3. Xử lý Lệnh Xóa / Hủy Bỏ Bộ Lọc Trong Hội Thoại (Explicit Clear Commands / Context Filter Reset)
    const aiClearFields = aiParsed?.clearFields || [];
    const clearYearRequested =
      aiClearFields.includes("year") ||
      /(?:bo|xoa|bo qua|khong gioi han|tat ca|moi)\s+(?:dieu kien\s+)?(?:nam|thoi gian)/i.test(cleanPromptLower) ||
      /(?:bo|xoa)\s+nam/i.test(cleanPromptLower) ||
      /(?:khong|chua)\s+(?:can|gioi han)\s+nam/i.test(cleanPromptLower);

    const clearCountryRequested =
      aiClearFields.includes("country") ||
      /(?:bo|xoa|khong gioi han|tat ca|moi)\s+(?:dieu kien\s+)?(?:quoc gia|nuoc)/i.test(cleanPromptLower) ||
      /(?:bo|xoa)\s+quoc gia/i.test(cleanPromptLower);

    const clearGenreRequested =
      aiClearFields.includes("genre") ||
      /(?:bo|xoa|khong gioi han)\s+(?:dieu kien\s+)?(?:the loai|loai phim)/i.test(cleanPromptLower) ||
      /(?:bo|xoa)\s+the loai/i.test(cleanPromptLower);

    const clearTypeRequested =
      aiClearFields.includes("type") ||
      /(?:bo|xoa)\s+(?:dieu kien\s+)?(?:dinh dang|phim bo|phim le)/i.test(cleanPromptLower);

    const clearActorRequested =
      aiClearFields.includes("actor") ||
      /(?:bo|xoa)\s+(?:dieu kien\s+)?(?:dien vien|nguoi nay)/i.test(cleanPromptLower);

    const effectiveCountrySlug = clearCountryRequested ? "" : targetCountrySlug;
    let effectiveGenreSlugs = clearGenreRequested ? [] : effectiveTargetGenreSlugs;
    let effectiveGenreSlug = clearGenreRequested ? "" : targetGenreSlug;
    if (clearActorRequested) {
      targetActorSlug = "";
      effectiveActorName = "";
      targetActorSlugs.length = 0;
      targetActorNames.length = 0;
    }
    if (clearTypeRequested) {
      targetTypeSlug = "";
    }

    // 2.5. Xác định Search Intent (Phân biệt movie_title, actor, character, genre, country, theme, mood, mixed, unknown)
    const activeConcepts = detectedConcepts;
    let searchIntent: SearchIntent = (aiParsed?.intent as SearchIntent) || "unknown";

    const genericThemeMatch = cleanPrompt.match(
      /^(?:phim\s+)?(?:ve|chu de|noi ve|ke ve|xoay quanh|de tai)\s+(.+)$/i
    );

    const hasExplicitActorCue =
      /(?:phim\s+(?:cua|của|co|có|do)|dong\s+phim|đóng\s+phim|dien\s+vien|diễn\s+viên|dong\s+chinh|đóng\s+chính|tham\s+gia)/i.test(prompt);

    if (isGibberishQuery(prompt)) {
      searchIntent = "unknown";
    } else if (activeConcepts.length > 0) {
      searchIntent = "theme";
    } else if (hasCharacterIntent && (detectedChar || rawCharacter)) {
      searchIntent = "character";
    } else if (
      targetActorSlug ||
      (effectiveActorName &&
        (aiParsed?.intent === "actor" ||
          hasExplicitActorCue ||
          (aiParsed?.people && aiParsed.people.length > 0)))
    ) {
      searchIntent = "actor";
    } else if (genericThemeMatch) {
      const subject = genericThemeMatch[1].trim();
      const pureGenre = resolveGenreSlug(subject);
      const isExplicitProfession = /(?:ca\s*si|bac\s*si|giao\s*vien|luat\s*su|canh\s*sat|dau\s*bep|phi\s*cong|nha\s*bao|van\s*dong\s*vien|dien\s*vien|hoc\s*sinh|thay\s*giao)/i.test(subject);
      if (!pureGenre || isExplicitProfession) {
        searchIntent = "theme";
      }
    }

    if (searchIntent === "unknown" || searchIntent === "genre" || searchIntent === "mood") {
      const isThemeCue = [
        "dau bep",
        "nau an",
        "nau banh",
        "lam banh",
        "nuong banh",
        "am thuc",
        "mon an",
        "nha hang",
        "chef",
        "cook",
        "bakery",
        "bac si",
        "y khoa",
        "benh vien",
        "truong hoc",
        "hoc duong",
        "thanh xuan",
        "hoc sinh",
        "giao vien",
        "thay co",
        "lop hoc",
        "giang duong",
        "sinh ton",
        "dao hoang",
        "du hanh",
        "thoi gian",
        "vong lap",
        "cuop ngan hang",
        "vu tru",
        "sat thu",
        "nguoi may",
        "robot",
        "zombie",
        "xac song",
        "quai vat",
        "sieu nhan",
        "tokusatsu",
        "bien hinh",
      ].some((cue) => cleanPrompt.includes(cue));

      if (isThemeCue || genericThemeMatch) {
        searchIntent = "theme";
      } else if (isGibberishQuery(prompt)) {
        searchIntent = "unknown";
      } else if (
        (targetGenreSlug && effectiveCountrySlug) ||
        ((targetActorSlug || effectiveActorName) &&
          (targetGenreSlug || effectiveCountrySlug))
      ) {
        searchIntent = "mixed";
      } else if (targetGenreSlug) {
        searchIntent = "genre";
      } else if (effectiveCountrySlug) {
        searchIntent = "country";
      } else if (lowerPrompt.includes("chua lanh") || lowerPrompt.includes("chữa lành") || lowerPrompt.includes("xa stress")) {
        searchIntent = "mood";
      } else if (!isGibberishQuery(prompt) && !genericThemeMatch) {
        const isQuestion = /(?:phim\s+(?:gì|gi|nào|nao)|tại\s+sao|như\s+thế\s+nào)/i.test(lowerPrompt);
        const cleanTitleWords = extractCleanSearchKeywords(prompt).trim().split(/\s+/);
        if (!isQuestion && cleanTitleWords.length >= 1 && cleanTitleWords.length <= 4) {
          searchIntent = "movie_title";
        }
      }
    }

    // Nhận diện năm phát hành cụ thể (ví dụ: "phim năm 2024", "phim 2023", "sau 2018", "sau 2020", "từ năm 2020 trở đi")
    const afterYearMatch = prompt.match(/(?:sau|tu|từ)\s*(?:năm\s+|nam\s+)?(\d{4})/i);
    const explicitYearMatch = prompt.match(/(?:năm|nam)\s*(\d{4})/i) || prompt.match(/\b(19\d{2}|20\d{2})\b/);
    let targetExplicitYear = explicitYearMatch ? parseInt(explicitYearMatch[1], 10) : 0;
    let targetAfterYear = afterYearMatch ? parseInt(afterYearMatch[1], 10) : 0;

    if (clearYearRequested) {
      targetExplicitYear = 0;
      targetAfterYear = 0;
      if (searchIntent === "year") {
        if (targetGenreSlug && effectiveCountrySlug) searchIntent = "mixed";
        else if (targetGenreSlug) searchIntent = "genre";
        else if (effectiveCountrySlug) searchIntent = "country";
        else searchIntent = "unknown";
      }
    } else if (targetExplicitYear >= 1900 && targetExplicitYear <= currentYear + 2 && !targetAfterYear) {
      if (searchIntent === "unknown" || (searchIntent === "movie_title" && prompt.trim().split(/\s+/).length <= 3)) {
        searchIntent = "year";
      }
    }

    // Bảo vệ: Nếu là chủ đề (theme), tựa phim (movie_title), năm (year) hoặc unknown nhưng người dùng không hề yêu cầu phim hành động,
    // xóa bỏ genre "hanh-dong" ảo giác do LLM tự điền
    const userExplicitAction = lowerPrompt.includes("hành động") || lowerPrompt.includes("hanh dong") || lowerPrompt.includes("action") || isTokusatsuConcept;
    if ((searchIntent === "theme" || searchIntent === "movie_title" || searchIntent === "year" || searchIntent === "unknown") && !userExplicitAction) {
      effectiveGenreSlug = "";
      effectiveGenreSlugs = effectiveGenreSlugs.filter((g) => g !== "hanh-dong");
    }

    const isLatest = clearYearRequested
      ? false
      : Boolean(aiParsed?.is_latest) ||
        lowerPrompt.includes("mới nhất") ||
        lowerPrompt.includes("moi nhat") ||
        lowerPrompt.includes("mới ra") ||
        lowerPrompt.includes("moi ra") ||
        lowerPrompt.includes("mới chiếu") ||
        lowerPrompt.includes("moi chieu") ||
        lowerPrompt.includes("vừa ra") ||
        lowerPrompt.includes("vua ra") ||
        lowerPrompt.includes("năm nay") ||
        lowerPrompt.includes("nam nay") ||
        lowerPrompt.includes("latest") ||
        lowerPrompt.includes("newest") ||
        lowerPrompt.includes("recently");

    const rangeMatch = prompt.match(
      /(?:từ|tu)\s+(?:năm\s+|nam\s+)?(19\d{2}|20\d{2})\s+(?:đến|den|tới|toi)\s+(?:năm\s+|nam\s+)?(19\d{2}|20\d{2})/i
    );
    let yearFrom = clearYearRequested ? 0 : aiParsed?.yearRange?.from || aiParsed?.years?.from || aiParsed?.year_from || 0;
    let yearTo = clearYearRequested ? 0 : aiParsed?.yearRange?.to || aiParsed?.years?.to || aiParsed?.year_to || 0;

    if (!clearYearRequested) {
      if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
        yearFrom = parseInt(rangeMatch[1], 10);
        yearTo = parseInt(rangeMatch[2], 10);
      } else if (targetAfterYear >= 1900) {
        yearFrom = targetAfterYear;
        yearTo = currentYear;
      } else if (aiParsed?.yearRange?.from) {
        yearFrom = aiParsed.yearRange.from;
        yearTo = aiParsed.yearRange.to || currentYear;
      } else if (targetExplicitYear >= 1900 && targetExplicitYear <= currentYear + 2) {
        yearFrom = targetExplicitYear;
        yearTo = targetExplicitYear;
      } else if (aiParsed?.year && typeof aiParsed.year === "number" && !yearFrom && !yearTo) {
        yearFrom = aiParsed.year;
        yearTo = aiParsed.year;
      } else if (isLatest) {
        if (!yearFrom || yearFrom < currentYear - 1) {
          yearFrom = currentYear - 1;
          yearTo = currentYear;
        }
      }
    } else if (!yearFrom && !yearTo) {
      if (
        lowerPrompt.includes("thap nien 90") ||
        lowerPrompt.includes("thập niên 90") ||
        lowerPrompt.includes("90s")
      ) {
        yearFrom = 1990;
        yearTo = 1999;
      } else if (
        lowerPrompt.includes("thap nien 80") ||
        lowerPrompt.includes("thập niên 80") ||
        lowerPrompt.includes("80s")
      ) {
        yearFrom = 1980;
        yearTo = 1989;
      } else if (
        lowerPrompt.includes("thap nien 2000") ||
        lowerPrompt.includes("thập niên 2000") ||
        lowerPrompt.includes("2000s")
      ) {
        yearFrom = 2000;
        yearTo = 2009;
      } else if (
        lowerPrompt.includes("thap nien 70") ||
        lowerPrompt.includes("thập niên 70") ||
        lowerPrompt.includes("70s")
      ) {
        yearFrom = 1970;
        yearTo = 1979;
      }
    }

    const excludedCountrySlugs: string[] = [];
    const rawExCountries = [
      ...(aiParsed?.exclude?.countries || []),
      ...(aiParsed?.excluded_countries || []),
    ];
    for (const rawEx of rawExCountries) {
      const s = resolveCountrySlug(rawEx);
      if (s && !excludedCountrySlugs.includes(s)) excludedCountrySlugs.push(s);
      else if (rawEx && !excludedCountrySlugs.includes(rawEx.toLowerCase()))
        excludedCountrySlugs.push(rawEx.toLowerCase());
    }

    if (
      (lowerPrompt.includes("không lấy") ||
        lowerPrompt.includes("trừ") ||
        lowerPrompt.includes("loại trừ") ||
        lowerPrompt.includes("ko lấy")) &&
      (lowerPrompt.includes("mỹ") ||
        lowerPrompt.includes("hollywood") ||
        lowerPrompt.includes("âu mỹ") ||
        lowerPrompt.includes("us"))
    ) {
      if (!excludedCountrySlugs.includes("au-my"))
        excludedCountrySlugs.push("au-my");
    }

    const excludedGenreSlugs: string[] = [];
    const rawExGenres = [
      ...(aiParsed?.exclude?.genres || []),
      ...(aiParsed?.excluded_genres || []),
    ];
    for (const rawEx of rawExGenres) {
      const s = resolveGenreSlug(rawEx);
      if (s && !excludedGenreSlugs.includes(s)) excludedGenreSlugs.push(s);
    }

    if (excludePatternMatch && excludePatternMatch[1]) {
      const s = resolveGenreSlug(excludePatternMatch[1]);
      if (s && !excludedGenreSlugs.includes(s)) excludedGenreSlugs.push(s);
    }

    if (/(?:khong\s+phai|không\s+phải|khong\s+muon|không\s+muốn|trừ|tru)\s+(?:phim\s+)?(?:horror|kinh\s+di|kinh\s+dị|ma)/i.test(lowerPrompt)) {
      if (!excludedGenreSlugs.includes("kinh-di")) excludedGenreSlugs.push("kinh-di");
    }
    if (/(?:khong\s+phai|không\s+phải|khong\s+muon|không\s+muốn|trừ|tru)\s+(?:phim\s+)?(?:tinh\s+cam|tình\s+cảm|lang\s+man|lãng\s+mạn|romance)/i.test(lowerPrompt)) {
      if (!excludedGenreSlugs.includes("tinh-cam")) excludedGenreSlugs.push("tinh-cam");
    }
    if (/(?:khong\s+phai|không\s+phải|khong\s+muon|không\s+muốn|trừ|tru)\s+(?:phim\s+)?(?:hai|hài|comedy)/i.test(lowerPrompt)) {
      if (!excludedGenreSlugs.includes("hai-huoc")) excludedGenreSlugs.push("hai-huoc");
    }
    if (/(?:khong\s+phai|không\s+phải|khong\s+muon|không\s+muốn|trừ|tru)\s+(?:phim\s+)?(?:co\s+trang|cổ\s+trang)/i.test(lowerPrompt)) {
      if (!excludedGenreSlugs.includes("co-trang")) excludedGenreSlugs.push("co-trang");
    }

    const matchOptions: MatchOptions & {
      expectedActorSlugs?: string[];
      expectedActorNames?: string[];
      expectedGenreSlugs?: string[];
    } = {
      expectedCountry: effectiveCountrySlug || undefined,
      expectedGenre: effectiveGenreSlug || undefined,
      expectedGenreSlugs: effectiveGenreSlugs.length > 1 ? effectiveGenreSlugs : undefined,
      expectedActorSlug: targetActorSlug || undefined,
      expectedActorName: effectiveActorName || undefined,
      expectedDirector: effectiveActorName || undefined,
      expectedActorSlugs: targetActorSlugs.length > 1 ? targetActorSlugs : undefined,
      expectedActorNames: targetActorNames.length > 1 ? targetActorNames : undefined,
      expectedCharacter: rawCharacter || undefined,
      expectedTypeSlug: targetTypeSlug || undefined,
      yearFrom: yearFrom || undefined,
      yearTo: yearTo || undefined,
      isLatest: isLatest || undefined,
      excludedCountries: excludedCountrySlugs.length
        ? excludedCountrySlugs
        : undefined,
      excludedGenres: excludedGenreSlugs.length
        ? excludedGenreSlugs
        : undefined,
      episodeConstraint: episodeConstraint || undefined,
    };

    const cards: SuggestionCard[] = [];
    const seenSlugs = new Set<string>(excludeSlugs);
    const seenFranchiseCounts = new Map<string, number>();
    const isExplicitAllParts = isExplicitAllPartsRequest(prompt);

    const tryAddCard = async (card: SuggestionCard): Promise<boolean> => {
      if (cards.length >= 16) return false;
      if (!card || !card.slug || seenSlugs.has(card.slug)) return false;

      // Kiểm tra ràng buộc số tập
      if (episodeConstraint) {
        let epTotal = extractEpisodeTotal(card);
        const isSeriesHint =
          card.type === "series" ||
          card.type === "phim-bo" ||
          card.category?.toLowerCase().includes("bộ") ||
          (card.year && typeof card.year === "string" && card.year.toLowerCase().includes("season")) ||
          card.title.toLowerCase().includes("phần") ||
          card.title.toLowerCase().includes("season") ||
          (epTotal !== null && epTotal > 1);

        if (episodeConstraint.requireSeries && !isSeriesHint) {
          return false;
        }

        // Nếu chưa có epTotal hoặc là phim bộ đang tìm kiếm theo số tập
        if (epTotal === null && (isSeriesHint || episodeConstraint.requireSeries)) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const detailRes = await movieApi.getMovieDetail(card.slug);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const detailMovie = (detailRes as any)?.movie || detailRes;
            if (detailMovie) {
              epTotal = extractEpisodeTotal(detailMovie);
              if (detailMovie.episode_total) {
                card.quality = detailMovie.episode_total;
              }
            }
          } catch {
            // Failed to fetch detail -> unverified
          }
        }

        if (epTotal === null) {
          return false;
        }

        if (episodeConstraint.strictLessThan !== undefined && epTotal >= episodeConstraint.strictLessThan) {
          return false;
        }
        if (episodeConstraint.maxEpisodes !== undefined && epTotal > episodeConstraint.maxEpisodes) {
          return false;
        }
      }

      const fKey = extractFranchiseKey(card.slug, card.title);
      const count = seenFranchiseCounts.get(fKey) || 0;
      if (!isExplicitAllParts && count >= 2) {
        return false;
      }

      seenSlugs.add(card.slug);
      seenFranchiseCounts.set(fKey, count + 1);
      cards.push(card);
      return true;
    };

    // 4. Khởi chạy SONG SONG (CONCURRENT) cả 3 nhánh tìm kiếm:
    // - Nhánh 1: Character / Person Lookup (nếu có character intent)
    // - Nhánh 2: Pass 1 (AI Movie Suggestions Lookup)
    // - Nhánh 3: Pass 2 (Database Catalog & Vector Search)
    const t_search_start = performance.now();

    const hasContextualTarget = Boolean(
      seedMovieTitle ||
      hasCharacterIntent ||
      targetActorSlug ||
      effectiveActorName ||
      effectiveGenreSlug ||
      effectiveCountrySlug ||
      targetTypeSlug ||
      (conversationHistory.length > 0 && (aiParsed?.suggested_movies?.length || 0) > 0)
    );

    const isTrapOrOffTopic = Boolean(
      (aiParsed?.is_trap && !hasCharacterIntent) ||
      aiParsed?.is_off_topic ||
      isGibberishQuery(prompt) ||
      (!hasContextualTarget && isVagueQuery(prompt))
    );

    // Task 0: Tìm kiếm dữ liệu thật trong catalog cho nhân vật (Character Search)
    const runCharacterSearch = async (): Promise<SuggestionCard[]> => {
      if (!hasCharacterIntent || (!detectedChar && !rawCharacter) || isTrapOrOffTopic) return [];

      const charKeywords = detectedChar?.searchKeywords?.length
        ? detectedChar.searchKeywords
        : [rawCharacter, cleanNormalizedString(rawCharacter)].filter(Boolean);

      const charSearchTasks = charKeywords.slice(0, 4).map((kw) =>
        movieApi.getAiCandidates({ keyword: kw, limit: 16 }, { minCandidates: 8 })
      );

      try {
        const charResults = await Promise.allSettled(charSearchTasks);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const charPool: any[] = [];
        const localSeen = new Set<string>();
        for (const res of charResults) {
          if (res.status === "fulfilled" && Array.isArray(res.value?.items)) {
            for (const it of res.value.items) {
              if (it && it.slug && !localSeen.has(it.slug)) {
                localSeen.add(it.slug);
                charPool.push(it);
              }
            }
          }
        }

        const charAliases =
          detectedChar?.aliases?.map(cleanNormalizedString) || [
            cleanNormalizedString(rawCharacter),
          ];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const scoredCharMovies: Array<{ item: any; score: number }> = [];

        for (const it of charPool) {
          const name = cleanNormalizedString(it.name || "");
          const orig = cleanNormalizedString(it.origin_name || "");
          const slug = cleanNormalizedString(it.slug || "");
          const desc = cleanNormalizedString(
            it.content || it.description || ""
          );

          let score = 0;
          if (
            charAliases.some(
              (a) =>
                name.includes(a) ||
                orig.includes(a) ||
                slug.includes(a.replace(/\s+/g, "-"))
            )
          ) {
            score += 100;
          }
          if (charAliases.some((a) => a.length >= 4 && desc.includes(a))) {
            score += 60;
          }
          if (
            detectedChar?.defaultTitles?.some((dt) => {
              const cdt = cleanNormalizedString(dt);
              return (
                name.includes(cdt) ||
                orig.includes(cdt) ||
                slug.includes(cdt.replace(/\s+/g, "-"))
              );
            })
          ) {
            score += 50;
          }

          if (score >= 40) {
            scoredCharMovies.push({ item: it, score });
          }
        }

        scoredCharMovies.sort((a, b) => b.score - a.score);

        const foundCards: SuggestionCard[] = [];
        for (const sc of scoredCharMovies) {
          if (foundCards.length >= 16) break;
          const it = sc.item;
          const relCheck = isRelevantToQuery(it, "character", {
            originalQuery: prompt,
            expectedCharacter: rawCharacter,
            detectedChar,
          });
          if (!relCheck.relevant) continue;

          const itemYear = extractMovieYear(it);
          foundCards.push({
            slug: it.slug,
            title: it.name || it.title || "Phim Hay",
            poster: toSafePoster(it),
            year: itemYear || 2024,
            quality: it.quality || "HD",
            category: toSafeCategory(it),
            country:
              toSafeCountry(it) || (effectiveCountrySlug ? getCountryDisplayName(effectiveCountrySlug) : "Quốc Tế"),
            actors: toSafeActors(it),
            reason: getMovieHighlight(it),
          });
        }
        return foundCards;
      } catch (charErr) {
        console.warn("[ai-concierge] Error in character catalog search:", charErr);
        return [];
      }
    };

    // Task S: TMDB Discovery Graph cho "Phim giống X" (Recommendations & Similar)
    const runSimilarMovieDiscovery = async (): Promise<SuggestionCard[]> => {
      if (!seedMovieTitle || isTrapOrOffTopic) return [];
      try {
        const tmdbMedia = await searchTmdbMedia(seedMovieTitle);
        if (!tmdbMedia || !tmdbMedia.id) return [];

        const recs = await getTmdbMovieRecommendations(tmdbMedia.id, tmdbMedia.type, undefined, 16);
        if (!recs || recs.length === 0) return [];

        const similarCards: SuggestionCard[] = [];
        for (const m of recs) {
          if (!m || !m.slug || seenSlugs.has(m.slug)) continue;

          const itemCountry = toSafeCountry(m);
          const itemCategory = toSafeCategory(m);
          const itemCategories = toSafeCategories(m);
          const itemCategoryStr = itemCategories.length > 0 ? itemCategories.join(" ") : itemCategory;
          const itemYear = extractMovieYear(m) || 2024;
          const mName = cleanNormalizedString(m.name || "");
          const mOrig = cleanNormalizedString(m.origin_name || "");

          // 1. Kiểm tra loại trừ tiêu đề
          if (
            excludedTitles.some((ex) => {
              const cleanEx = cleanNormalizedString(ex);
              return cleanEx && (mName === cleanEx || mOrig === cleanEx || m.slug === cleanEx.replace(/\s+/g, "-"));
            })
          ) {
            continue;
          }

          // 2. Kiểm tra loại trừ quốc gia & thể loại
          if (excludedCountrySlugs.some((ex) => matchesCountry(itemCountry, ex))) continue;
          if (
            excludedGenreSlugs.some(
              (ex) =>
                itemCategories.some((c) => matchesGenre(c, ex)) ||
                matchesGenre(itemCategoryStr, ex)
            )
          ) {
            continue;
          }

          // 3. Khớp quốc gia / thể loại nếu có bộ lọc cụ thể từ người dùng
          if (effectiveCountrySlug && !matchesCountry(itemCountry, effectiveCountrySlug)) continue;
          if (
            effectiveGenreSlug &&
            !itemCategories.some((c) => matchesGenre(c, effectiveGenreSlug)) &&
            !matchesGenre(itemCategoryStr, effectiveGenreSlug)
          ) {
            continue;
          }

          // 4. Khớp năm
          if (yearFrom && itemYear < yearFrom) continue;
          if (yearTo && itemYear > yearTo) continue;

          similarCards.push({
            slug: m.slug,
            title: m.name || m.title || "Phim Hay",
            poster: toSafePoster(m),
            year: itemYear,
            quality: m.quality || "HD",
            category: itemCategory,
            country: itemCountry || (effectiveCountrySlug ? getCountryDisplayName(effectiveCountrySlug) : "Quốc Tế"),
            actors: toSafeActors(m),
            reason: getMovieHighlight(m, `Gợi ý tương đồng với ${seedMovieTitle}`),
          });
        }
        return similarCards;
      } catch (err) {
        console.warn("[ai-concierge] TMDB similar discovery error:", err);
        return [];
      }
    };

    // Task A: Tra cứu nhanh các gợi ý do AI đề xuất (Tối đa 8 phim)
    const runPass1Lookup = async () => {
      if (isTrapOrOffTopic || searchIntent === "unknown") return [];

      let candidateMovieList = [
        ...(aiParsed?.suggested_movies || aiParsed?.movies || []),
      ];

      // Nếu là tìm tựa phim cụ thể: luôn bổ sung chính prompt vào danh sách tìm kiếm
      if (searchIntent === "movie_title") {
        const cleanTitle = extractCleanSearchKeywords(prompt);
        candidateMovieList = [
          { title: cleanTitle, original_title: cleanTitle, reason: "" },
          ...candidateMovieList,
        ];
      }

      if (candidateMovieList.length === 0) return [];
      let filteredSuggestions = candidateMovieList;
      if (
        !lowerPrompt.includes("anime nana") &&
        !lowerPrompt.includes("nana osaki") &&
        !lowerPrompt.includes("nana komatsu")
      ) {
        filteredSuggestions = filteredSuggestions.filter(
          (m) =>
            m.title.toLowerCase().trim() !== "nana" &&
            (m.original_title || "").toLowerCase().trim() !== "nana"
        );
      }

      // Loại bỏ trùng lặp tiêu đề trước khi tra cứu
      const seenTitles = new Set<string>();
      const dedupedSuggestions = filteredSuggestions.filter((m) => {
        const k = (m.title || "").toLowerCase().trim();
        if (!k || seenTitles.has(k)) return false;
        seenTitles.add(k);
        return true;
      });

      const lookupPromises = dedupedSuggestions.slice(0, 10).map(async (m) => {
        const found = await searchSingleMovieFast(
          m.title,
          m.original_title,
          matchOptions
        );
        return {
          suggested: m,
          found,
        };
      });

      return Promise.all(lookupPromises);
    };

    // Task B: Truy vấn sẵn catalog từ Database và Vector Search để sẵn sàng bổ sung ứng viên
    const runPass2Catalog = async () => {
      if (isTrapOrOffTopic || searchIntent === "unknown") return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const queryTasks: Promise<any>[] = [];

      // 1. ƯU TIÊN CHỦ ĐỀ (THEME QUERY): Tìm kiếm ngữ nghĩa bằng Supabase Vector Search & Decomposed Keywords
      if (searchIntent === "theme") {
        const conceptDiscoveryKeywords = activeConcepts.flatMap((c) => c.discoveryKeywords);
        const vectorQuery =
          aiParsed?.semanticQuery ||
          (conceptDiscoveryKeywords.length > 0
            ? `${prompt} ${conceptDiscoveryKeywords.join(" ")}`
            : prompt);

        queryTasks.push(
          searchMoviesBySemantic(vectorQuery, 12, 0.45)
            .then((vectorItems) => {
              return {
                items: vectorItems.map((v) => ({
                  slug: v.id,
                  name: v.title,
                  origin_name: v.originalName,
                  poster_url: v.posterUrl,
                  thumb_url: v.thumbUrl,
                  year: v.year,
                  quality: v.quality,
                  category: v.category ? [{ name: v.category, slug: v.category }] : [],
                  content: v.description,
                  description: v.description,
                })),
              };
            })
            .catch(() => null)
        );

        const coreSubject = cleanPrompt
          .replace(/^(?:phim\s+)?(?:ve|chu de|noi ve|ke ve|xoay quanh|de tai)\s+/i, "")
          .trim();

        const combinedKeywords = Array.from(
          new Set([
            ...conceptDiscoveryKeywords,
            ...(aiParsed?.keywords || []),
            coreSubject,
            ...extractContentKeywords(prompt),
          ])
        ).filter((kw) => {
          if (!kw || kw.length < 2) return false;
          const cleanKw = cleanNormalizedString(kw);
          if (cleanKw.length < 2) return false;
          if (VIETNAMESE_STOP_WORDS.has(cleanKw) || GENERIC_SINGLE_WORDS.has(cleanKw)) return false;
          return true;
        });

        for (const kw of combinedKeywords.slice(0, 6)) {
          queryTasks.push(
            movieApi.getAiCandidates({ keyword: kw.trim(), limit: 12 }, { minCandidates: 6 }).catch(() => null)
          );
        }

        // Bổ sung TMDB Discovery Graph cho chủ đề/concept nếu có từ khóa hợp lệ
        if (combinedKeywords.length > 0) {
          queryTasks.push(
            discoverTmdbConceptMovies(combinedKeywords, 12, excludeSlugs)
              .then((items) => ({ items }))
              .catch(() => null)
          );
        }
      }

      if (hasCharacterIntent && rawCharacter) {
        queryTasks.push(
          movieApi.getAiCandidates({ keyword: rawCharacter, limit: 16 }, { minCandidates: 8 }).catch(() => null)
        );
      }

      if (targetActorSlugs.length > 0 || targetActorNames.length > 0 || targetActorSlug || effectiveActorName) {
        const uniqueActorSlugs = targetActorSlugs.length > 0 ? targetActorSlugs : targetActorSlug ? [targetActorSlug] : [];
        const uniqueActorNames = targetActorNames.length > 0 ? targetActorNames : effectiveActorName ? [effectiveActorName] : [];

        for (const slug of uniqueActorSlugs) {
          const aliases = getActorAliases(slug);
          const mainName = aliases[0] || slug.replace(/-/g, " ");
          queryTasks.push(
            queryMoviesByActor(mainName, aliases, targetCountrySlug || undefined, 20)
              .then((movies) => ({ items: movies }))
              .catch(() => null)
          );
          queryTasks.push(movieApi.getAiCandidates({ keyword: mainName, limit: 20 }, { minCandidates: 8 }).catch(() => null));
          if (aliases[1]) {
            queryTasks.push(
              movieApi.getAiCandidates({ keyword: aliases[1], limit: 20 }, { minCandidates: 8 }).catch(() => null)
            );
          }
        }

        for (const name of uniqueActorNames) {
          if (!uniqueActorSlugs.some((s) => getActorAliases(s).some((a) => cleanNormalizedString(a) === cleanNormalizedString(name)))) {
            queryTasks.push(movieApi.getAiCandidates({ keyword: name, limit: 20 }, { minCandidates: 8 }).catch(() => null));
          }
        }
      }

      if (searchIntent === "movie_title") {
        const cleanTitle = extractCleanSearchKeywords(prompt);
        queryTasks.push(
          movieApi.getAiCandidates({ keyword: cleanTitle, limit: 16 }, { minCandidates: 8 }).catch(() => null)
        );
        if (cleanTitle !== prompt.trim()) {
          queryTasks.push(
            movieApi.getAiCandidates({ keyword: prompt.trim(), limit: 16 }, { minCandidates: 8 }).catch(() => null)
          );
        }
        queryTasks.push(
          searchSingleMovieFast(cleanTitle).then((single) => single ? { items: [single] } : null).catch(() => null)
        );
      }

      if (
        searchIntent !== "theme" &&
        searchIntent !== "movie_title" &&
        !targetActorSlug &&
        !effectiveActorName &&
        !hasCharacterIntent &&
        rawKeyword &&
        rawKeyword.trim().length >= 2
      ) {
        queryTasks.push(
          movieApi.getAiCandidates({ keyword: rawKeyword.trim(), limit: 16 }, { minCandidates: 8 }).catch(() => null)
        );
      }

      if (
        searchIntent !== "theme" &&
        searchIntent !== "movie_title" &&
        !targetActorSlug &&
        !effectiveActorName &&
        !hasCharacterIntent &&
        (effectiveGenreSlug || effectiveCountrySlug || targetTypeSlug || isLatest || targetExplicitYear > 0)
      ) {
        if (targetExplicitYear > 0) {
          queryTasks.push(
            movieApi.getAiCandidates({
              type: targetTypeSlug || undefined,
              category: effectiveGenreSlug || undefined,
              country: effectiveCountrySlug || undefined,
              year: String(targetExplicitYear),
              limit: 20,
              sort: "latest",
            }, { minCandidates: 8 }).catch(() => null)
          );
        } else if (isLatest) {
          queryTasks.push(
            movieApi.getAiCandidates({
              type: targetTypeSlug || undefined,
              category: effectiveGenreSlug || undefined,
              country: effectiveCountrySlug || undefined,
              year: String(currentYear),
              limit: 20,
              sort: "latest",
            }, { minCandidates: 8 }).catch(() => null)
          );
        } else {
          // 1. Truy vấn thể loại chính (primary genre)
          queryTasks.push(
            movieApi.getAiCandidates({
              type: targetTypeSlug || undefined,
              category: effectiveGenreSlug || undefined,
              country: effectiveCountrySlug || undefined,
              limit: 20,
              sort: "rating",
            }, { minCandidates: 8 }).catch(() => null)
          );

          // 2. Nếu có nhiều thể loại kết hợp (ví dụ: vừa võ thuật vừa hành động), truy vấn thêm thể loại phụ
          if (effectiveGenreSlugs.length > 1) {
            for (const secGenre of effectiveGenreSlugs.slice(1, 3)) {
              queryTasks.push(
                movieApi.getAiCandidates({
                  type: targetTypeSlug || undefined,
                  category: secGenre,
                  country: effectiveCountrySlug || undefined,
                  limit: 16,
                  sort: "rating",
                }, { minCandidates: 6 }).catch(() => null)
              );
            }
          }

          // 3. Nếu có yêu cầu võ thuật/cận chiến, truy vấn thêm từ khóa bổ trợ trong catalog
          if (
            effectiveGenreSlugs.includes("vo-thuat") ||
            /(?:vo\s+thuat|võ\s+thuật|can\s+chien|cận\s+chiến|thuc\s+chien|thực\s+chiến|kungfu|kung\s+fu|danh\s+vo|đánh\s+võ)/i.test(prompt)
          ) {
            queryTasks.push(
              movieApi.getAiCandidates({ keyword: "võ thuật", limit: 16 }, { minCandidates: 6 }).catch(() => null),
              movieApi.getAiCandidates({ keyword: "kung fu", limit: 16 }, { minCandidates: 6 }).catch(() => null)
            );
          }
        }
      }

      try {
        const poolResults = await Promise.allSettled(queryTasks);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const candidatePool: any[] = [];
        for (const res of poolResults) {
          if (
            res.status === "fulfilled" &&
            res.value?.items &&
            Array.isArray(res.value.items)
          ) {
            for (const it of res.value.items) {
              if (it && it.slug) {
                candidatePool.push(it);
              }
            }
          }
        }
        return candidatePool;
      } catch {
        return [];
      }
    };

    // Khởi chạy song song các nhánh tìm kiếm
    const [characterCards, similarCards, pass1Resolved, pass2CandidatePool] = await Promise.all([
      runCharacterSearch(),
      runSimilarMovieDiscovery(),
      runPass1Lookup(),
      runPass2Catalog(),
    ]);

    t_search_ms = Math.round(performance.now() - t_search_start);

    // Bước 4.0: Thêm kết quả từ Character Search (nếu có)
    for (const c of characterCards) {
      if (cards.length >= 16) break;
      await tryAddCard(c);
    }

    // Bước 4.0b: Thêm kết quả từ TMDB Similar Movie Discovery (nếu có)
    for (const s of similarCards) {
      if (cards.length >= 16) break;
      await tryAddCard(s);
    }

    // Bước 4.1: Điền các phim tuyển chọn từ AI vào cards trước (Ưu tiên hàng đầu)
    for (const item of pass1Resolved) {
      if (cards.length >= 16) break;
      if (item.found && item.found.slug && !seenSlugs.has(item.found.slug)) {
        const itemCountry = toSafeCountry(item.found);
        const itemCategory = toSafeCategory(item.found);
        const itemYear =
          extractMovieYear(item.found) ||
          extractMovieYear(item.suggested) ||
          0;
        const itemActors = toSafeActors(item.found);

        if (
          excludedCountrySlugs.some((ex) => matchesCountry(itemCountry, ex))
        )
          continue;
        if (
          excludedGenreSlugs.some((ex) => matchesGenre(itemCategory, ex))
        )
          continue;

        // Nếu người dùng tìm kiếm nhân vật cụ thể: chỉ nhận phim từ AI nếu có liên quan tới nhân vật
        if (hasCharacterIntent && rawCharacter) {
          const charAliases =
            detectedChar?.aliases?.map(cleanNormalizedString) || [
              cleanNormalizedString(rawCharacter),
            ];
          const name = cleanNormalizedString(item.found.name || "");
          const orig = cleanNormalizedString(item.found.origin_name || "");
          const desc = cleanNormalizedString(
            item.found.content || item.found.description || ""
          );
          const sugTitle = cleanNormalizedString(item.suggested.title || "");
          const isRelevant = charAliases.some(
            (a) =>
              name.includes(a) ||
              orig.includes(a) ||
              desc.includes(a) ||
              sugTitle.includes(a)
          );
          if (!isRelevant) {
            continue;
          }
        }

        // Kiểm tra diễn viên nếu có (chỉ áp dụng cho tìm diễn viên thực tế)
        if (targetActorSlug) {
          const hasActor = matchesActor(itemActors, targetActorSlug);
          const hasDirector = matchesDirector(item.found.director || item.found.directors, targetActorSlug);
          if (!hasActor && !hasDirector && itemActors.length > 0) {
            continue;
          }
        }

        if (isLatest && itemYear > 0 && itemYear < currentYear - 1) {
          continue;
        }

        if (
          effectiveCountrySlug &&
          itemCountry &&
          !matchesCountry(itemCountry, effectiveCountrySlug)
        ) {
          continue;
        }

        // CỔNG KIỂM DUYỆT RELEVANCE NGHIÊM NGẶT CHO PASS 1 (AI SUGGESTIONS)
        const relCheck = isRelevantToQuery(item.found, searchIntent, {
          originalQuery: prompt,
          keywords: aiParsed?.keywords,
          semanticQuery: aiParsed?.semanticQuery,
          concepts: aiParsed?.concepts || activeConcepts.map((c) => c.id),
          expectedActorSlug: targetActorSlug,
          expectedActorName: effectiveActorName || undefined,
          expectedDirector: effectiveActorName || undefined,
          expectedActorSlugs: targetActorSlugs.length > 1 ? targetActorSlugs : undefined,
          expectedActorNames: targetActorNames.length > 1 ? targetActorNames : undefined,
          expectedCharacter: rawCharacter,
          targetGenreSlug: effectiveGenreSlug || undefined,
          targetGenreSlugs: effectiveGenreSlugs.length > 0 ? effectiveGenreSlugs : undefined,
          targetCountrySlug: effectiveCountrySlug || undefined,
          targetTypeSlug: targetTypeSlug || undefined,
          targetYear: targetExplicitYear > 0 ? targetExplicitYear : undefined,
          yearFrom: yearFrom || undefined,
          yearTo: yearTo || undefined,
          detectedChar,
          excludedTitles,
          excludedCountries: excludedCountrySlugs,
          excludedGenres: excludedGenreSlugs,
          franchises: aiParsed?.franchises,
          themes: aiParsed?.themes,
          episodeConstraint: episodeConstraint || undefined,
        });
        if (!relCheck.relevant) {
          continue;
        }

        const rawFoundName = item.found.name || item.found.title || "";
        const isBizarre =
          rawFoundName.toLowerCase().includes("cầy mangut") ||
          rawFoundName.toLowerCase().includes("cay mangut");
        const safeTitle =
          isBizarre && (item.suggested.title || item.found.origin_name)
            ? item.suggested.title || item.found.origin_name
            : rawFoundName || item.suggested.title;

        await tryAddCard({
          slug: item.found.slug,
          title: safeTitle,
          poster: toSafePoster(item.found),
          year: itemYear || 2024,
          quality: item.found.quality || "HD",
          category: itemCategory,
          country: itemCountry || (effectiveCountrySlug ? getCountryDisplayName(effectiveCountrySlug) : "Quốc Tế"),
          actors: itemActors,
          reason: getMovieHighlight(item.found, item.suggested.reason),
          episode_total: item.found.episode_total || item.found.total_episodes || item.found.episodes_total || item.found.quality,
          type: item.found.type,
        });
      }
    }

    // Bước 4.2: Nếu sau Pass 1 chưa đủ 16 phim, bổ sung ngay từ Catalog Database & Vector Search
    if (cards.length < 16 && pass2CandidatePool.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scoredCandidates: Array<{ item: any; score: number }> = [];

      for (const it of pass2CandidatePool) {
        if (!it?.slug || seenSlugs.has(it.slug)) continue;

        const itemCountry = toSafeCountry(it);
        const itemCategory = toSafeCategory(it);
        const itemCategories = toSafeCategories(it);
        const itemCategoryStr = itemCategories.length > 0 ? itemCategories.join(" ") : itemCategory;
        const itemActors = toSafeActors(it);
        const itemYear = extractMovieYear(it);
        const itemName = cleanNormalizedString(it.name || "");
        const itemOrig = cleanNormalizedString(it.origin_name || "");
        const itemDesc = cleanNormalizedString(
          it.content || it.description || ""
        );

        if (
          excludedCountrySlugs.some((ex) => matchesCountry(itemCountry, ex))
        )
          continue;
        if (
          excludedGenreSlugs.some(
            (ex) =>
              itemCategories.some((c) => matchesGenre(c, ex)) ||
              matchesGenre(itemCategoryStr, ex)
          )
        )
          continue;

        if (isLatest && itemYear > 0 && itemYear < currentYear - 1) {
          continue;
        }

        // CỔNG KIỂM DUYỆT RELEVANCE NGHIÊM NGẶT CHO PASS 2 (CATALOG & VECTOR)
        const relCheck = isRelevantToQuery(it, searchIntent, {
          originalQuery: prompt,
          keywords: aiParsed?.keywords,
          semanticQuery: aiParsed?.semanticQuery,
          concepts: aiParsed?.concepts || activeConcepts.map((c) => c.id),
          expectedActorSlug: targetActorSlug,
          expectedActorName: effectiveActorName || undefined,
          expectedDirector: effectiveActorName || undefined,
          expectedActorSlugs: targetActorSlugs.length > 1 ? targetActorSlugs : undefined,
          expectedActorNames: targetActorNames.length > 1 ? targetActorNames : undefined,
          expectedCharacter: rawCharacter,
          targetGenreSlug: effectiveGenreSlug || undefined,
          targetGenreSlugs: effectiveGenreSlugs.length > 0 ? effectiveGenreSlugs : undefined,
          targetCountrySlug: effectiveCountrySlug || undefined,
          targetTypeSlug: targetTypeSlug || undefined,
          targetYear: targetExplicitYear > 0 ? targetExplicitYear : undefined,
          yearFrom: yearFrom || undefined,
          yearTo: yearTo || undefined,
          detectedChar,
          excludedTitles,
          excludedCountries: excludedCountrySlugs,
          excludedGenres: excludedGenreSlugs,
          franchises: aiParsed?.franchises,
          themes: aiParsed?.themes,
          episodeConstraint: episodeConstraint || undefined,
        });
        if (!relCheck.relevant) {
          continue;
        }

        let score = relCheck.score || 0;

        if (hasCharacterIntent && rawCharacter) {
          const charAliases =
            detectedChar?.aliases?.map(cleanNormalizedString) || [
              cleanNormalizedString(rawCharacter),
            ];
          if (
            charAliases.some(
              (a) =>
                itemName.includes(a) ||
                itemOrig.includes(a) ||
                it.slug.includes(a.replace(/\s+/g, "-"))
            )
          ) {
            score += 80;
          } else if (
            charAliases.some((a) => a.length >= 4 && itemDesc.includes(a))
          ) {
            score += 50;
          }
        }

        if (targetCountrySlug) {
          if (matchesCountry(itemCountry, targetCountrySlug)) score += 35;
          else if (itemCountry) score -= 30;
        }

        if (effectiveGenreSlug) {
          if (
            itemCategories.some((c) => matchesGenre(c, effectiveGenreSlug)) ||
            matchesGenre(itemCategoryStr, effectiveGenreSlug)
          )
            score += 25;
        }

        if (targetActorSlugs.length > 1) {
          const allMatched = targetActorSlugs.every((slug) => {
            if (matchesActor(itemActors, slug)) return true;
            if (matchesDirector(it.director || it.directors, slug)) return true;
            const aliases = getActorAliases(slug).map(cleanNormalizedString);
            return aliases.some((a) => a && (hasWordMatch(itemName, a) || hasWordMatch(itemOrig, a)));
          });
          if (allMatched) {
            score += 100;
          } else {
            continue;
          }
        } else if (targetActorSlug) {
          const hasActor = matchesActor(itemActors, targetActorSlug);
          const hasDirector = matchesDirector(it.director || it.directors, targetActorSlug);
          if (hasActor || hasDirector) {
            score += 70;
          } else {
            continue;
          }
        } else if (effectiveActorName) {
          const cleanTarget = cleanNormalizedString(effectiveActorName);
          const hasActor = itemActors.some((a) => {
            const cleanA = cleanNormalizedString(a);
            return (
              cleanA === cleanTarget ||
              cleanA.includes(cleanTarget) ||
              cleanTarget.includes(cleanA) ||
              hasWordMatch(cleanA, cleanTarget)
            );
          });
          const hasDirector = matchesDirector(it.director || it.directors, effectiveActorName);
          if (hasActor || hasDirector) {
            score += 70;
          } else if ((!itemActors || itemActors.length === 0) && (!it.director && !it.directors)) {
            if (hasWordMatch(itemName, cleanTarget) || hasWordMatch(itemOrig, cleanTarget)) {
              score += 40;
            } else {
              continue;
            }
          } else {
            continue;
          }
        }

        if (rawKeyword && !hasCharacterIntent) {
          const cleanKw = cleanNormalizedString(rawKeyword);
          if (
            itemName.includes(cleanKw) ||
            itemOrig.includes(cleanKw) ||
            itemDesc.includes(cleanKw)
          ) {
            score += 40;
          }
        }

        if (isLatest) {
          if (itemYear >= currentYear) score += 60;
          else if (itemYear === currentYear - 1) score += 45;
        }

        scoredCandidates.push({ item: it, score });
      }

      scoredCandidates.sort((a, b) => b.score - a.score);

      for (const sc of scoredCandidates) {
        if (cards.length >= 16) break;
        const it = sc.item;
        const itemYear = extractMovieYear(it);
        await tryAddCard({
          slug: it.slug,
          title: it.name || it.title || "Phim Hay",
          poster: toSafePoster(it),
          year: itemYear || 2024,
          quality: it.quality || "HD",
          category: toSafeCategory(it),
          country:
            toSafeCountry(it) || (effectiveCountrySlug ? getCountryDisplayName(effectiveCountrySlug) : "Quốc Tế"),
          actors: toSafeActors(it),
          reason: getMovieHighlight(it),
          episode_total: it.episode_total || it.total_episodes || it.episodes_total || it.quality,
          type: it.type,
        });
      }
    }

    // 6. Pass 3: Fallback nới lỏng CHỈ CHO TRUY VẤN THỂ LOẠI / QUỐC GIA CỤ THỂ
    // TUYỆT ĐỐI KHÔNG fallback cho theme, actor, character, movie_title, unknown!
    // TUYỆT ĐỐI KHÔNG lấy Top Rating toàn kho ({ sort: "rating", limit: 20 })!
    let isFallbackRelaxed = false;
    if (
      cards.length === 0 &&
      (searchIntent === "genre" || searchIntent === "country" || searchIntent === "mixed" || Boolean(targetTypeSlug)) &&
      !hasCharacterIntent &&
      !targetActorSlug &&
      !aiParsed?.is_trap &&
      !aiParsed?.is_off_topic
    ) {
      isFallbackRelaxed = true;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fallbackTasks: Promise<any>[] = [];

        if (effectiveGenreSlug) {
          fallbackTasks.push(
            movieApi.getAiCandidates({
              category: effectiveGenreSlug,
              country: targetCountrySlug || undefined,
              type: targetTypeSlug || undefined,
              limit: 16,
              sort: "rating",
            }, { minCandidates: 6 })
          );
        }
        if (targetCountrySlug && !effectiveGenreSlug) {
          fallbackTasks.push(
            movieApi.getAiCandidates({
              country: targetCountrySlug,
              type: targetTypeSlug || undefined,
              limit: 16,
              sort: "rating",
            }, { minCandidates: 6 })
          );
        }
        if (targetTypeSlug && !effectiveGenreSlug && !targetCountrySlug) {
          fallbackTasks.push(
            movieApi.getAiCandidates({
              type: targetTypeSlug,
              limit: 16,
              sort: "rating",
            }, { minCandidates: 6 })
          );
        }

        const fallbackResults = await Promise.allSettled(fallbackTasks);
        for (const res of fallbackResults) {
          if (res.status === "fulfilled" && Array.isArray(res.value?.items)) {
            for (const it of res.value.items) {
              if (it && it.slug && !seenSlugs.has(it.slug)) {
                // Kiểm tra relevance ngay cả trong fallback
                const rel = isRelevantToQuery(it, searchIntent, {
                  originalQuery: prompt,
                  targetGenreSlug: effectiveGenreSlug || undefined,
                  targetGenreSlugs: effectiveGenreSlugs.length > 0 ? effectiveGenreSlugs : undefined,
                  targetCountrySlug: targetCountrySlug || undefined,
                  expectedActorSlug: targetActorSlug || undefined,
                  expectedActorName: effectiveActorName || undefined,
                  episodeConstraint: episodeConstraint || undefined,
                });
                if (!rel.relevant) continue;

                await tryAddCard({
                  slug: it.slug,
                  title: it.name || it.title || "Phim Hay",
                  poster: toSafePoster(it),
                  year: extractMovieYear(it) || 2024,
                  quality: it.quality || "HD",
                  category: toSafeCategory(it),
                  country: toSafeCountry(it) || "Quốc Tế",
                  actors: toSafeActors(it),
                  reason: getMovieHighlight(it),
                  episode_total: it.episode_total || it.total_episodes || it.episodes_total || it.quality,
                  type: it.type,
                });
                if (cards.length >= 16) break;
              }
            }
          }
          if (cards.length >= 16) break;
        }
      } catch (err) {
        console.warn("[ai-concierge] Fallback query error:", err);
      }
    }

    // 7. Tạo câu phản hồi và tiêu đề tâm trạng (Final Payload)
    let finalAnalysis = "";
    let finalMood = "";

    if (aiParsed?.is_trap || aiParsed?.is_off_topic) {
      finalAnalysis = aiParsed.analysis?.trim() || "Dữ liệu hoặc câu hỏi không đúng thực tế.";
      finalMood = aiParsed.mood || "Đính Chính Thông Tin ⚠️";
    } else if (hasCharacterIntent) {
      const charName = detectedChar ? detectedChar.name : rawCharacter;
      if (cards.length > 0) {
        if (
          aiParsed?.analysis &&
          !aiParsed.analysis.toLowerCase().includes("không có nhân vật")
        ) {
          finalAnalysis = aiParsed.analysis.trim();
        } else {
          finalAnalysis = `Chào bạn! Nhân vật ${charName} là một hình tượng điện ảnh nổi tiếng. Dưới đây là các tác phẩm tiêu biểu về ${charName} mà Nana AI đã tuyển chọn từ kho phim để bạn thưởng thức:`;
        }
        finalMood = aiParsed?.mood || `Nhân Vật: ${charName} 🎬✨`;
      } else {
        finalAnalysis = `Chào bạn! Rất tiếc hiện tại kho dữ liệu phim của Nanaflix chưa có tác phẩm nào về nhân vật "${charName}". Bạn có thể thử tìm kiếm theo tên phim cụ thể hoặc khám phá các danh mục khác trên hệ thống nhé! ✨🍿`;
        finalMood = `Nhân Vật: ${charName} 🎬`;
      }
    } else if (isFallbackRelaxed && cards.length > 0) {
      finalAnalysis =
        aiParsed?.analysis?.trim() ||
        "Nana AI chưa tìm thấy tác phẩm khớp tuyệt đối 100% mọi điều kiện chi tiết, nhưng đã nới lỏng bộ lọc để tuyển chọn ngay các bộ phim có phong cách và chủ đề gần gũi nhất dưới đây để bạn thưởng thức nhé! ✨🍿";
      finalMood = aiParsed?.mood || "Gợi Ý Tương Đồng Cho Bạn 🎬✨";
    } else if (cards.length === 0) {
      if (aiParsed?.analysis && (aiParsed.is_trap || aiParsed.is_off_topic)) {
        finalAnalysis = aiParsed.analysis.trim();
      } else {
        finalAnalysis = `😅 Nana chưa tìm thấy phim đủ phù hợp với yêu cầu "${prompt}".\n\nBạn có thể thử:\n• đổi từ khóa ngắn gọn hơn\n• nói cụ thể hơn\n• bỏ bớt một điều kiện`;
      }
      finalMood = aiParsed?.mood || "Chưa Tìm Thấy Phim 🎬";
    } else {
      finalAnalysis =
        aiParsed?.analysis?.trim() ||
        `Chào bạn! Dưới đây là danh sách các siêu phẩm điện ảnh được Nana AI tuyển chọn phù hợp nhất với yêu cầu "${prompt}":`;
      finalMood = aiParsed?.mood || "Điện Ảnh Tuyển Chọn ⭐";
    }

    const totalMs = Math.round(performance.now() - t0_req);
    if (process.env.NODE_ENV !== "production") {
      console.log(`[AI Concierge Timing] Total: ${totalMs}ms | AI: ${t_ai_ms}ms | Search: ${t_search_ms}ms | Cards: ${cards.length}`);
    }

    const finalPayload: ConciergeApiResponse & { timing?: { totalMs: number; aiMs: number; searchMs: number } } = {
      reply: finalAnalysis,
      mood: finalMood,
      movies: cards.slice(0, 8),
      provider: aiProviderName,
      ...(process.env.NODE_ENV !== "production" ? { timing: { totalMs, aiMs: t_ai_ms, searchMs: t_search_ms } } : {}),
    };

    if (cards.length > 0) {
      if (AI_RESPONSE_CACHE.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = AI_RESPONSE_CACHE.keys().next().value;
        if (oldestKey) AI_RESPONSE_CACHE.delete(oldestKey);
      }
      AI_RESPONSE_CACHE.set(cacheKey, { ...finalPayload, cachedAt: Date.now() });

      // Lưu vào Cache với TTL 3 ngày (259200s)
      cacheService.set(`ai:concierge:${cacheKey}`, finalPayload, 3 * 86400).catch((err) => {
        console.warn("[AI Concierge] Lỗi ghi cache:", err);
      });
    }

    return NextResponse.json(finalPayload);
  } catch (error) {
    console.error("Lỗi AI Concierge:", error);
    return NextResponse.json(
      {
        reply: "Rất tiếc, đã có sự gián đoạn kết nối. Bạn hãy thử lại hoặc khám phá các thể loại thịnh hành trên thanh điều hướng nhé!",
        mood: "Gợi ý",
        movies: [],
      },
      { status: 500 }
    );
  }
}
