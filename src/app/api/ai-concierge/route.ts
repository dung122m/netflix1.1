import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movieApi";
import { kvCache } from "@/services/kvCacheService";
import { SuggestionCard, MatchOptions, ConciergeApiResponse, CacheEntry } from "./types";
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

    const body = await req.json();
    const prompt: string = body.prompt?.trim() || "";
    const userApiKey: string = body.apiKey?.trim() || "";

    if (!prompt) {
      return NextResponse.json(
        { error: "Vui lòng nhập tâm trạng hoặc câu hỏi phim của bạn." },
        { status: 400 }
      );
    }

    // 1. Kiểm tra cache hit (L1 Memory Map & L2 Cloudflare KV)
    const cacheKey = normalizeQuery(prompt);
    if (body.clearCache) {
      AI_RESPONSE_CACHE.clear();
      await kvCache.delete(`ai:concierge:${cacheKey}`);
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

    const kvCached = await kvCache.get<ConciergeApiResponse>(`ai:concierge:${cacheKey}`);
    if (kvCached && kvCached.movies && kvCached.movies.length > 0) {
      AI_RESPONSE_CACHE.set(cacheKey, { ...kvCached, cachedAt: Date.now() });
      return NextResponse.json({
        ...kvCached,
        cached: true,
      });
    }

    const currentYear = new Date().getFullYear();

    // 2. Phân tích ngữ nghĩa & trích xuất ý định bằng AI
    const { parsed: aiParsed, provider: aiProviderName } = await analyzeUserPrompt(prompt, userApiKey);

    // 3. Chuẩn hóa bộ lọc (Slugs & Constraints)
    const promptCharMatch =
      prompt.match(/(?:phim\s+)?(?:có|co)\s+(?:nhân\s+vật|nhan\s+vat)\s+([^\.,\?!]+)/i) ||
      prompt.match(/(?:nhân\s+vật|nhan\s+vat)\s+(?:tên\s+là|tên)\s+([^\.,\?!]+)/i);
    const rawPromptChar = promptCharMatch ? promptCharMatch[1].trim() : "";

    const detectedChar =
      resolveCharacter(prompt) ||
      (aiParsed?.character ? resolveCharacter(aiParsed.character) : null) ||
      (rawPromptChar ? resolveCharacter(rawPromptChar) : null);
    const rawCharacter = detectedChar
      ? detectedChar.name
      : (aiParsed?.character?.trim() || rawPromptChar);
    const hasCharacterIntent = Boolean(
      detectedChar || (detectCharacterIntent(prompt) && rawCharacter)
    );

    const rawActor = aiParsed?.actor || "";
    const rawCountry = aiParsed?.country || "";
    const rawDirector = aiParsed?.director || "";
    const rawKeyword = aiParsed?.keyword || "";

    const rawGenreList = Array.isArray(aiParsed?.genres)
      ? aiParsed.genres
      : aiParsed?.genre
      ? [aiParsed.genre]
      : [];

    const targetGenreSlug =
      rawGenreList.map(resolveGenreSlug).find(Boolean) ||
      resolveGenreSlug(prompt);
    const targetCountrySlug =
      resolveCountrySlug(rawCountry) || resolveCountrySlug(prompt);

    // TUYỆT ĐỐI KHÔNG gán tên nhân vật vào targetActorSlug khi người dùng đang tìm kiếm nhân vật!
    const targetActorSlug = hasCharacterIntent
      ? ""
      : resolveActorSlug(rawActor, prompt) || resolveActorSlug(prompt);

    const lowerPrompt = prompt.toLowerCase();
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

    let yearFrom = aiParsed?.years?.from || aiParsed?.year_from || 0;
    let yearTo = aiParsed?.years?.to || aiParsed?.year_to || 0;

    if (isLatest) {
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
    for (const rawEx of aiParsed?.excluded_countries || []) {
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
    for (const rawEx of aiParsed?.excluded_genres || []) {
      const s = resolveGenreSlug(rawEx);
      if (s && !excludedGenreSlugs.includes(s)) excludedGenreSlugs.push(s);
    }

    const matchOptions: MatchOptions = {
      expectedCountry: targetCountrySlug || undefined,
      expectedGenre: targetGenreSlug || undefined,
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
    const seenSlugs = new Set<string>();

    // 3.5. ƯU TIÊN SỐ 1: TÌM KIẾM DỮ LIỆU THẬT TRONG CATALOG CHO NHÂN VẬT (CHARACTER SEARCH)
    if (hasCharacterIntent && (detectedChar || rawCharacter)) {
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
        for (const res of charResults) {
          if (res.status === "fulfilled" && Array.isArray(res.value?.items)) {
            for (const it of res.value.items) {
              if (it && it.slug && !seenSlugs.has(it.slug)) {
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

        for (const sc of scoredCharMovies) {
          if (cards.length >= 4) break;
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
      } catch (charErr) {
        console.warn("[ai-concierge] Error in character catalog search:", charErr);
      }
    }

    // 4. Pass 1: Tra cứu song song toàn bộ gợi ý do AI đề xuất
    const candidateMovieList = [
      ...(aiParsed?.suggested_movies || aiParsed?.movies || []),
    ];

    if (candidateMovieList.length > 0 && cards.length < 4) {
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

      const lookupPromises = filteredSuggestions.slice(0, 35).map(async (m) => {
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

      const resolved = await Promise.all(lookupPromises);

      for (const item of resolved) {
        if (cards.length >= 4) break;
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
    }

    // 5. Pass 2: Khám phá thêm từ Database nếu chưa đủ 4 phim
    const isTrapOrOffTopic = Boolean(
      (aiParsed?.is_trap && !hasCharacterIntent) || aiParsed?.is_off_topic
    );
    if (
      cards.length < 4 &&
      !isTrapOrOffTopic &&
      (targetActorSlug ||
        targetGenreSlug ||
        targetCountrySlug ||
        rawKeyword ||
        rawDirector ||
        isLatest ||
        (hasCharacterIntent && rawCharacter))
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const queryTasks: Promise<any>[] = [];

      if (hasCharacterIntent && rawCharacter) {
        queryTasks.push(
          movieApi.getMovies({ keyword: rawCharacter, limit: 16 })
        );
      }

      if (targetActorSlug) {
        const aliases = getActorAliases(targetActorSlug);
        const mainName = aliases[0] || targetActorSlug.replace(/-/g, " ");
        queryTasks.push(movieApi.getMovies({ keyword: mainName, limit: 20 }));
        if (aliases[1]) {
          queryTasks.push(
            movieApi.getMovies({ keyword: aliases[1], limit: 20 })
          );
        }
      }

      if (
        !targetActorSlug &&
        !hasCharacterIntent &&
        rawKeyword &&
        rawKeyword.trim().length >= 2
      ) {
        queryTasks.push(
          movieApi.getMovies({ keyword: rawKeyword.trim(), limit: 16 })
        );
      }

      if (
        !targetActorSlug &&
        !hasCharacterIntent &&
        (targetGenreSlug || targetCountrySlug || isLatest)
      ) {
        if (isLatest) {
          queryTasks.push(
            movieApi.getMovies({
              category: targetGenreSlug || undefined,
              country: targetCountrySlug || undefined,
              year: String(currentYear),
              limit: 20,
              sort: "latest",
            })
          );
        } else {
          queryTasks.push(
            movieApi.getMovies({
              category: targetGenreSlug || undefined,
              country: targetCountrySlug || undefined,
              limit: 20,
              sort: "rating",
            })
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
              if (it && it.slug && !seenSlugs.has(it.slug)) {
                candidatePool.push(it);
              }
            }
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const scoredCandidates: Array<{ item: any; score: number }> = [];

        for (const it of candidatePool) {
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

          let score = 0;

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
            } else {
              // Bỏ qua phim không liên quan nhân vật
              continue;
            }
          }

          if (targetCountrySlug) {
            if (matchesCountry(itemCountry, targetCountrySlug)) score += 35;
            else if (itemCountry) score -= 30;
          }

          if (targetGenreSlug) {
            if (matchesGenre(itemCategory, targetGenreSlug)) score += 25;
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

          if (score >= 30) {
            scoredCandidates.push({ item: it, score });
          }
        }

        scoredCandidates.sort((a, b) => b.score - a.score);

        for (const sc of scoredCandidates) {
          if (cards.length >= 4) break;
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
      } catch (err) {
        console.warn("[ai-concierge] Error in Pass 2 discovery:", err);
      }
    }

    // 6. Pass 3: Fallback nới lỏng nếu không có phim nào khớp
    // TUYỆT ĐỐI KHÔNG fallback sang phim ngẫu nhiên nếu người dùng tìm kiếm nhân vật cụ thể!
    let isFallbackRelaxed = false;
    if (
      cards.length === 0 &&
      !hasCharacterIntent &&
      !aiParsed?.is_trap &&
      !aiParsed?.is_off_topic
    ) {
      isFallbackRelaxed = true;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fallbackTasks: Promise<any>[] = [];

        if (targetGenreSlug) {
          fallbackTasks.push(
            movieApi.getMovies({
              category: targetGenreSlug,
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
        fallbackTasks.push(movieApi.getMovies({ sort: "rating", limit: 16 }));

        const fallbackResults = await Promise.allSettled(fallbackTasks);
        for (const res of fallbackResults) {
          if (res.status === "fulfilled" && Array.isArray(res.value?.items)) {
            for (const it of res.value.items) {
              if (it && it.slug && !seenSlugs.has(it.slug)) {
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
                if (cards.length >= 4) break;
              }
            }
          }
          if (cards.length >= 4) break;
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
          "Nana AI chưa tìm thấy tác phẩm khớp tuyệt đối 100% mọi điều kiện chi tiết, nhưng đã nới lỏng bộ lọc để tuyển chọn ngay 3-4 bộ phim có phong cách và chủ đề gần gũi nhất dưới đây để bạn thưởng thức nhé! ✨🍿";
      }
      finalMood = aiParsed?.mood || "Gợi Ý Tương Đồng Cho Bạn 🎬✨";
    } else if (cards.length === 0) {
      if (aiParsed?.analysis && (aiParsed.is_trap || aiParsed.is_off_topic)) {
        finalAnalysis = aiParsed.analysis.trim();
      } else {
        finalAnalysis =
          "Chào bạn! Hiện tại kho phim chưa có bản phát hành khớp hoàn toàn với yêu cầu này. Bạn có thể thử tìm kiếm theo tên phim cụ thể hoặc khám phá các thể loại thịnh hành trên thanh điều hướng nhé! ✨🍿";
      }
      finalMood = aiParsed?.mood || "Gợi Ý Cho Bạn 🎬";
    } else {
      finalAnalysis =
        aiParsed?.analysis?.trim() ||
        `Chào bạn! Dưới đây là danh sách các siêu phẩm điện ảnh được Nana AI tuyển chọn phù hợp nhất với yêu cầu "${prompt}":`;
      finalMood = aiParsed?.mood || "Điện Ảnh Tuyển Chọn ⭐";
    }

    const finalPayload: ConciergeApiResponse = {
      reply: finalAnalysis,
      mood: finalMood,
      movies: cards.slice(0, 4),
      provider: aiProviderName,
    };

    if (cards.length > 0) {
      if (AI_RESPONSE_CACHE.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = AI_RESPONSE_CACHE.keys().next().value;
        if (oldestKey) AI_RESPONSE_CACHE.delete(oldestKey);
      }
      AI_RESPONSE_CACHE.set(cacheKey, { ...finalPayload, cachedAt: Date.now() });

      // Lưu vào Cloudflare KV với TTL 3 ngày (259200s)
      kvCache.set(`ai:concierge:${cacheKey}`, finalPayload, 3 * 86400).catch((err) => {
        console.warn("[AI Concierge] Lỗi ghi KV cache:", err);
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
