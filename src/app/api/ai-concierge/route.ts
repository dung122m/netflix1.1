import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movieApi";
import { cacheService } from "@/lib/cache";
import { SuggestionCard, MatchOptions, ConciergeApiResponse, CacheEntry, SearchIntent } from "./types";
import {
  CACHE_TTL_MS,
  MAX_CACHE_ENTRIES,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
} from "./constants";
import {
  cleanNormalizedString,
  normalizeQuery,
  extractMovieYear,
  resolveActorSlug,
  getActorAliases,
  matchesActor,
  resolveCountrySlug,
  resolveGenreSlug,
  matchesCountry,
  matchesGenre,
  resolveCharacter,
  detectCharacterIntent,
} from "./taxonomy";
import {
  toSafePoster,
  toSafeActors,
  toSafeCountry,
  toSafeCategory,
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
import { queryMoviesByActor } from "@/services/aiActorService";

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
// RATE LIMITING VÀ RESPONSE CACHING
// ============================================================================
const AI_RESPONSE_CACHE = new Map<string, CacheEntry>();
const ipRequestMap = new Map<string, { count: number; expiresAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRequestMap.get(ip);
  if (!record || record.expiresAt < now) {
    ipRequestMap.set(ip, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  record.count += 1;
  return true;
}

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
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "anonymous_client";

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        {
          error: "Bạn đang gửi yêu cầu quá nhanh. Vui lòng chờ 30 giây rồi thử lại để bảo vệ hệ thống.",
        },
        { status: 429 }
      );
    }

    const t0_req = performance.now();
    let t_ai_ms = 0;
    let t_search_ms = 0;

    const body = await req.json();
    const prompt: string = body.prompt?.trim() || "";
    const userApiKey: string = body.apiKey?.trim() || "";

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
    const cacheKey = `${baseKey}${excludeSnippet}`;

    if (body.clearCache) {
      AI_RESPONSE_CACHE.clear();
      await cacheService.delete(`ai:concierge:${cacheKey}`);
    }
    const cachedItem = AI_RESPONSE_CACHE.get(cacheKey);
    if (cachedItem && Date.now() - cachedItem.cachedAt < CACHE_TTL_MS) {
      return NextResponse.json({
        reply: cachedItem.reply,
        mood: cachedItem.mood,
        movies: cachedItem.movies,
        provider: cachedItem.provider || "Nana AI",
        cached: true,
      });
    }

    const cacheRes = await cacheService.get<ConciergeApiResponse>(`ai:concierge:${cacheKey}`);
    if (cacheRes && cacheRes.movies && cacheRes.movies.length > 0) {
      AI_RESPONSE_CACHE.set(cacheKey, { ...cacheRes, cachedAt: Date.now() });
      return NextResponse.json({
        ...cacheRes,
        cached: true,
      });
    }

    const currentYear = new Date().getFullYear();

    // 2. Phân tích ngữ nghĩa & trích xuất ý định bằng AI (Kèm ngữ cảnh cuộc hội thoại)
    const t_ai_start = performance.now();
    const { parsed: aiParsed, provider: aiProviderName } = await analyzeUserPrompt(prompt, userApiKey, conversationHistory);
    t_ai_ms = Math.round(performance.now() - t_ai_start);

    // 3. Chuẩn hóa bộ lọc (Slugs & Constraints)
    const excludedTitles: string[] = [
      ...(aiParsed?.exclude?.titles || []),
    ].map((t) => t.trim().toLowerCase()).filter(Boolean);

    // Heuristic: "phim giống X nhưng không phải X" / "không lấy phim X"
    const excludePatternMatch = prompt.match(/(?:nhưng\s+không\s+phải|nhung\s+khong\s+phai|không\s+lấy|khong\s+lay|trừ|loại\s+trừ)\s+([^\.,\?!]+)/i);
    if (excludePatternMatch && excludePatternMatch[1]) {
      const rawEx = excludePatternMatch[1].trim().toLowerCase();
      if (rawEx && !excludedTitles.includes(rawEx)) {
        excludedTitles.push(rawEx);
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

    const parsedActor =
      aiParsed?.people?.find((p) => p.role === "actor" || !p.role)?.name ||
      aiParsed?.actor ||
      "";
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

    const targetGenreSlug =
      rawGenreList.map(resolveGenreSlug).find(Boolean) ||
      resolveGenreSlug(prompt);
    const targetCountrySlug =
      rawCountryList.map(resolveCountrySlug).find(Boolean) ||
      resolveCountrySlug(prompt);

    // TUYỆT ĐỐI KHÔNG gán tên nhân vật vào targetActorSlug khi người dùng đang tìm kiếm nhân vật!
    const targetActorSlug = hasCharacterIntent
      ? ""
      : resolveActorSlug(parsedActor, prompt) || resolveActorSlug(prompt);

    const lowerPrompt = prompt.toLowerCase();
    const cleanPrompt = cleanNormalizedString(prompt);

    // 2.5. Xác định Search Intent (Phân biệt movie_title, actor, character, genre, country, theme, mood, mixed, unknown)
    const activeConcepts = detectedConcepts;
    let searchIntent: SearchIntent = (aiParsed?.intent as SearchIntent) || "unknown";

    const genericThemeMatch = cleanPrompt.match(
      /^(?:phim\s+)?(?:ve|chu de|noi ve|ke ve|xoay quanh|de tai)\s+(.+)$/i
    );

    if (isGibberishQuery(prompt)) {
      searchIntent = "unknown";
    } else if (activeConcepts.length > 0) {
      searchIntent = "theme";
    } else if (hasCharacterIntent && (detectedChar || rawCharacter)) {
      searchIntent = "character";
    } else if (targetActorSlug) {
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
      } else if ((targetGenreSlug && targetCountrySlug) || (targetActorSlug && (targetGenreSlug || targetCountrySlug))) {
        searchIntent = "mixed";
      } else if (targetGenreSlug) {
        searchIntent = "genre";
      } else if (targetCountrySlug) {
        searchIntent = "country";
      } else if (lowerPrompt.includes("chua lanh") || lowerPrompt.includes("chữa lành") || lowerPrompt.includes("xa stress")) {
        searchIntent = "mood";
      } else if (!isGibberishQuery(prompt) && !genericThemeMatch) {
        const isQuestion = /(?:phim\s+(?:gì|gi|nào|nao)|tại\s+sao|như\s+thế\s+nào)/i.test(lowerPrompt);
        if (!isQuestion && prompt.trim().split(/\s+/).length <= 4) {
          searchIntent = "movie_title";
        }
      }
    }

    // Nhận diện năm phát hành cụ thể (ví dụ: "phim năm 2024", "phim 2023", "sau 2018", "sau 2020")
    const afterYearMatch = prompt.match(/(?:sau|tu|từ)\s*(\d{4})/i);
    const explicitYearMatch = prompt.match(/(?:năm|nam)\s*(\d{4})/i) || prompt.match(/\b(19\d{2}|20\d{2})\b/);
    const targetExplicitYear = explicitYearMatch ? parseInt(explicitYearMatch[1], 10) : 0;
    const targetAfterYear = afterYearMatch ? parseInt(afterYearMatch[1], 10) : 0;

    if (targetExplicitYear >= 1900 && targetExplicitYear <= currentYear + 2 && !targetAfterYear) {
      if (searchIntent === "unknown" || (searchIntent === "movie_title" && prompt.trim().split(/\s+/).length <= 3)) {
        searchIntent = "year";
      }
    }

    // Bảo vệ: Nếu là chủ đề (theme), tựa phim (movie_title), năm (year) hoặc unknown nhưng người dùng không hề yêu cầu phim hành động,
    // xóa bỏ genre "hanh-dong" ảo giác do LLM tự điền
    const userExplicitAction = lowerPrompt.includes("hành động") || lowerPrompt.includes("hanh dong") || lowerPrompt.includes("action") || isTokusatsuConcept;
    let effectiveGenreSlug = targetGenreSlug;
    if ((searchIntent === "theme" || searchIntent === "movie_title" || searchIntent === "year" || searchIntent === "unknown") && !userExplicitAction) {
      effectiveGenreSlug = "";
    }

    const isLatest =
      Boolean(aiParsed?.is_latest) ||
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

    let yearFrom = aiParsed?.yearRange?.from || aiParsed?.years?.from || aiParsed?.year_from || 0;
    let yearTo = aiParsed?.yearRange?.to || aiParsed?.years?.to || aiParsed?.year_to || 0;

    if (targetAfterYear >= 1900) {
      yearFrom = targetAfterYear;
      yearTo = currentYear;
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

    const matchOptions: MatchOptions = {
      expectedCountry: targetCountrySlug || undefined,
      expectedGenre: effectiveGenreSlug || undefined,
      expectedActorSlug: targetActorSlug || undefined,
      expectedCharacter: rawCharacter || undefined,
      yearFrom: yearFrom || undefined,
      yearTo: yearTo || undefined,
      isLatest: isLatest || undefined,
      excludedCountries: excludedCountrySlugs.length
        ? excludedCountrySlugs
        : undefined,
      excludedGenres: excludedGenreSlugs.length
        ? excludedGenreSlugs
        : undefined,
    };

    const cards: SuggestionCard[] = [];
    const seenSlugs = new Set<string>(excludeSlugs);

    // 4. Khởi chạy SONG SONG (CONCURRENT) cả 3 nhánh tìm kiếm:
    // - Nhánh 1: Character / Person Lookup (nếu có character intent)
    // - Nhánh 2: Pass 1 (AI Movie Suggestions Lookup)
    // - Nhánh 3: Pass 2 (Database Catalog & Vector Search)
    const t_search_start = performance.now();

    const isTrapOrOffTopic = Boolean(
      (aiParsed?.is_trap && !hasCharacterIntent) ||
      aiParsed?.is_off_topic ||
      isGibberishQuery(prompt) ||
      isVagueQuery(prompt)
    );

    // Task 0: Tìm kiếm dữ liệu thật trong catalog cho nhân vật (Character Search)
    const runCharacterSearch = async (): Promise<SuggestionCard[]> => {
      if (!hasCharacterIntent || (!detectedChar && !rawCharacter) || isTrapOrOffTopic) return [];

      const charKeywords = detectedChar?.searchKeywords?.length
        ? detectedChar.searchKeywords
        : [rawCharacter, cleanNormalizedString(rawCharacter)].filter(Boolean);

      const charSearchTasks = charKeywords.slice(0, 4).map((kw) =>
        movieApi.getMovies({ keyword: kw, limit: 16 })
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
              toSafeCountry(it) || (targetCountrySlug ? "Âu Mỹ" : "Quốc Tế"),
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

    // Task A: Tra cứu nhanh các gợi ý do AI đề xuất (Tối đa 8 phim)
    const runPass1Lookup = async () => {
      if (isTrapOrOffTopic || searchIntent === "unknown") return [];

      let candidateMovieList = [
        ...(aiParsed?.suggested_movies || aiParsed?.movies || []),
      ];

      // Nếu là tìm tựa phim cụ thể: luôn bổ sung chính prompt vào danh sách tìm kiếm
      if (searchIntent === "movie_title") {
        candidateMovieList = [
          { title: prompt.trim(), original_title: prompt.trim(), reason: "" },
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
            movieApi.getMovies({ keyword: kw.trim(), limit: 12 }).catch(() => null)
          );
        }
      }

      if (hasCharacterIntent && rawCharacter) {
        queryTasks.push(
          movieApi.getMovies({ keyword: rawCharacter, limit: 16 }).catch(() => null)
        );
      }

      if (targetActorSlug) {
        const aliases = getActorAliases(targetActorSlug);
        const mainName = aliases[0] || targetActorSlug.replace(/-/g, " ");
        queryTasks.push(
          queryMoviesByActor(mainName, aliases, undefined, 20)
            .then((movies) => ({ items: movies }))
            .catch(() => null)
        );
        queryTasks.push(movieApi.getMovies({ keyword: mainName, limit: 20 }).catch(() => null));
        if (aliases[1]) {
          queryTasks.push(
            movieApi.getMovies({ keyword: aliases[1], limit: 20 }).catch(() => null)
          );
        }
      }

      if (searchIntent === "movie_title") {
        queryTasks.push(
          movieApi.getMovies({ keyword: prompt.trim(), limit: 16 }).catch(() => null)
        );
      }

      if (
        searchIntent !== "theme" &&
        searchIntent !== "movie_title" &&
        !targetActorSlug &&
        !hasCharacterIntent &&
        rawKeyword &&
        rawKeyword.trim().length >= 2
      ) {
        queryTasks.push(
          movieApi.getMovies({ keyword: rawKeyword.trim(), limit: 16 }).catch(() => null)
        );
      }

      if (
        searchIntent !== "theme" &&
        searchIntent !== "movie_title" &&
        !targetActorSlug &&
        !hasCharacterIntent &&
        (effectiveGenreSlug || targetCountrySlug || isLatest || targetExplicitYear > 0)
      ) {
        if (targetExplicitYear > 0) {
          queryTasks.push(
            movieApi.getMovies({
              category: effectiveGenreSlug || undefined,
              country: targetCountrySlug || undefined,
              year: String(targetExplicitYear),
              limit: 20,
              sort: "latest",
            }).catch(() => null)
          );
        } else if (isLatest) {
          queryTasks.push(
            movieApi.getMovies({
              category: effectiveGenreSlug || undefined,
              country: targetCountrySlug || undefined,
              year: String(currentYear),
              limit: 20,
              sort: "latest",
            }).catch(() => null)
          );
        } else {
          queryTasks.push(
            movieApi.getMovies({
              category: effectiveGenreSlug || undefined,
              country: targetCountrySlug || undefined,
              limit: 20,
              sort: "rating",
            }).catch(() => null)
          );
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

    // Khởi chạy song song cả 3 nhánh tìm kiếm
    const [characterCards, pass1Resolved, pass2CandidatePool] = await Promise.all([
      runCharacterSearch(),
      runPass1Lookup(),
      runPass2Catalog(),
    ]);

    t_search_ms = Math.round(performance.now() - t_search_start);

    // Bước 4.0: Thêm kết quả từ Character Search (nếu có)
    for (const c of characterCards) {
      if (cards.length >= 16) break;
      if (!seenSlugs.has(c.slug)) {
        seenSlugs.add(c.slug);
        cards.push(c);
      }
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
          if (!hasActor && itemActors.length > 0) {
            const cleanTitle = cleanNormalizedString(item.suggested.title);
            const cleanOrig = cleanNormalizedString(
              item.suggested.original_title || ""
            );
            const foundName = cleanNormalizedString(item.found.name || "");
            const foundOrig = cleanNormalizedString(
              item.found.origin_name || ""
            );
            const isExactTitle =
              (cleanTitle && foundName === cleanTitle) ||
              (cleanOrig &&
                (foundOrig === cleanOrig || foundName === cleanOrig));
            if (!isExactTitle) continue;
          }
        }

        if (isLatest && itemYear > 0 && itemYear < currentYear - 1) {
          continue;
        }

        if (
          targetCountrySlug &&
          itemCountry &&
          !matchesCountry(itemCountry, targetCountrySlug)
        ) {
          const cleanTitle = cleanNormalizedString(item.suggested.title);
          const cleanOrig = cleanNormalizedString(
            item.suggested.original_title || ""
          );
          const foundName = cleanNormalizedString(item.found.name || "");
          const foundOrig = cleanNormalizedString(
            item.found.origin_name || ""
          );
          const isExactTitle =
            (cleanTitle && foundName === cleanTitle) ||
            (cleanOrig &&
              (foundOrig === cleanOrig || foundName === cleanOrig));
          if (!isExactTitle) continue;
        }

        // CỔNG KIỂM DUYỆT RELEVANCE NGHIÊM NGẶT CHO PASS 1 (AI SUGGESTIONS)
        const relCheck = isRelevantToQuery(item.found, searchIntent, {
          originalQuery: prompt,
          keywords: aiParsed?.keywords,
          semanticQuery: aiParsed?.semanticQuery,
          concepts: aiParsed?.concepts || activeConcepts.map((c) => c.id),
          expectedActorSlug: targetActorSlug,
          expectedCharacter: rawCharacter,
          targetGenreSlug: effectiveGenreSlug || undefined,
          targetCountrySlug: targetCountrySlug || undefined,
          targetYear: targetExplicitYear > 0 ? targetExplicitYear : undefined,
          yearFrom: yearFrom || undefined,
          yearTo: yearTo || undefined,
          detectedChar,
          excludedTitles,
          excludedCountries: excludedCountrySlugs,
          excludedGenres: excludedGenreSlugs,
          franchises: aiParsed?.franchises,
          themes: aiParsed?.themes,
        });
        if (!relCheck.relevant) {
          continue;
        }

        seenSlugs.add(item.found.slug);
        const rawFoundName = item.found.name || item.found.title || "";
        const isBizarre =
          rawFoundName.toLowerCase().includes("cầy mangut") ||
          rawFoundName.toLowerCase().includes("cay mangut");
        const safeTitle =
          isBizarre && (item.suggested.title || item.found.origin_name)
            ? item.suggested.title || item.found.origin_name
            : rawFoundName || item.suggested.title;

        cards.push({
          slug: item.found.slug,
          title: safeTitle,
          poster: toSafePoster(item.found),
          year: itemYear || 2024,
          quality: item.found.quality || "HD",
          category: itemCategory,
          country: itemCountry || (targetCountrySlug ? "Âu Mỹ" : "Quốc Tế"),
          actors: itemActors,
          reason: getMovieHighlight(item.found, item.suggested.reason),
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
          excludedGenreSlugs.some((ex) => matchesGenre(itemCategory, ex))
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
          expectedCharacter: rawCharacter,
          targetGenreSlug: effectiveGenreSlug || undefined,
          targetCountrySlug: targetCountrySlug || undefined,
          targetYear: targetExplicitYear > 0 ? targetExplicitYear : undefined,
          yearFrom: yearFrom || undefined,
          yearTo: yearTo || undefined,
          detectedChar,
          excludedTitles,
          excludedCountries: excludedCountrySlugs,
          excludedGenres: excludedGenreSlugs,
          franchises: aiParsed?.franchises,
          themes: aiParsed?.themes,
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
          if (matchesGenre(itemCategory, effectiveGenreSlug)) score += 25;
        }

        if (targetActorSlug) {
          const hasActor = matchesActor(itemActors, targetActorSlug);
          if (hasActor) {
            score += 70;
          } else if (itemActors.length > 0) {
            continue;
          } else {
            score -= 40;
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
        if (!seenSlugs.has(it.slug)) {
          seenSlugs.add(it.slug);
          const itemYear = extractMovieYear(it);
          cards.push({
            slug: it.slug,
            title: it.name || it.title || "Phim Hay",
            poster: toSafePoster(it),
            year: itemYear || 2024,
            quality: it.quality || "HD",
            category: toSafeCategory(it),
            country:
              toSafeCountry(it) || (targetCountrySlug ? "Âu Mỹ" : "Quốc Tế"),
            actors: toSafeActors(it),
            reason: getMovieHighlight(it),
          });
        }
      }
    }

    // 6. Pass 3: Fallback nới lỏng CHỈ CHO TRUY VẤN THỂ LOẠI / QUỐC GIA CỤ THỂ
    // TUYỆT ĐỐI KHÔNG fallback cho theme, actor, character, movie_title, unknown!
    // TUYỆT ĐỐI KHÔNG lấy Top Rating toàn kho ({ sort: "rating", limit: 20 })!
    let isFallbackRelaxed = false;
    if (
      cards.length === 0 &&
      (searchIntent === "genre" || searchIntent === "country" || searchIntent === "mixed") &&
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
            movieApi.getMovies({
              category: effectiveGenreSlug,
              limit: 16,
              sort: "rating",
            })
          );
        }
        if (targetCountrySlug) {
          fallbackTasks.push(
            movieApi.getMovies({
              country: targetCountrySlug,
              limit: 16,
              sort: "rating",
            })
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
                  targetCountrySlug: targetCountrySlug || undefined,
                });
                if (!rel.relevant) continue;

                seenSlugs.add(it.slug);
                cards.push({
                  slug: it.slug,
                  title: it.name || it.title || "Phim Hay",
                  poster: toSafePoster(it),
                  year: extractMovieYear(it) || 2024,
                  quality: it.quality || "HD",
                  category: toSafeCategory(it),
                  country: toSafeCountry(it) || "Quốc Tế",
                  actors: toSafeActors(it),
                  reason: getMovieHighlight(it),
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

    if (hasCharacterIntent) {
      const charName = detectedChar ? detectedChar.name : rawCharacter;
      if (cards.length > 0) {
        if (
          aiParsed?.analysis &&
          !aiParsed.is_trap &&
          !aiParsed.is_off_topic &&
          !aiParsed.analysis.toLowerCase().includes("không có nhân vật")
        ) {
          finalAnalysis = aiParsed.analysis.trim();
        } else {
          finalAnalysis = `Chào bạn! Nhân vật ${charName} là một hình tượng điện ảnh nổi tiếng. Dưới đây là các tác phẩm tiêu biểu về ${charName} mà Nana AI đã tuyển chọn từ kho phim để bạn thưởng thức:`;
        }
        finalMood =
          aiParsed?.mood && !aiParsed.is_trap
            ? aiParsed.mood
            : `Nhân Vật: ${charName} 🎬✨`;
      } else {
        finalAnalysis = `Chào bạn! Rất tiếc hiện tại kho dữ liệu phim của Nanaflix chưa có tác phẩm nào về nhân vật "${charName}". Bạn có thể thử tìm kiếm theo tên phim cụ thể hoặc khám phá các danh mục khác trên hệ thống nhé! ✨🍿`;
        finalMood = `Nhân Vật: ${charName} 🎬`;
      }
    } else if (isFallbackRelaxed && cards.length > 0) {
      if (aiParsed?.analysis && (aiParsed.is_trap || aiParsed.is_off_topic)) {
        finalAnalysis = aiParsed.analysis.trim();
      } else {
        finalAnalysis =
          "Nana AI chưa tìm thấy tác phẩm khớp tuyệt đối 100% mọi điều kiện chi tiết, nhưng đã nới lỏng bộ lọc để tuyển chọn ngay các bộ phim có phong cách và chủ đề gần gũi nhất dưới đây để bạn thưởng thức nhé! ✨🍿";
      }
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
      movies: cards.slice(0, 16),
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
