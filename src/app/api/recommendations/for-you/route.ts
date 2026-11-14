import { NextRequest, NextResponse } from "next/server";
import { normalizeMovie, formatGenreName } from "@/lib/movieMedia";
import { movieApi } from "@/services/movies/service";
import { cacheService } from "@/lib/cache";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";

export const maxDuration = 20;

import {
  FOR_YOU_L1_CACHE,
  L1_TTL_MS,
  buildUserTasteProfile,
  GUEST_THEMES,
  extractGenresFromText,
  extractCountriesFromText,
  detectMovieFormat,
  type MovieFormat,
  type FormatPreference,
  type WatchHistoryInputItem,
} from "@/services/movies/forYouService";

export type { MovieFormat, FormatPreference, WatchHistoryInputItem };

interface RecommendationInput {
  genres?: string[];
  historyItems?: WatchHistoryInputItem[];
  watchedSlugs?: string[];
  refreshSeed?: number;
  currentSlugs?: string[];
}

interface RecommendationResult {
  success: boolean;
  context: string;
  items: unknown[];
  cached?: boolean;
}

async function generateForYouRecommendations(input: RecommendationInput): Promise<RecommendationResult> {
  try {
    const {
      genres = [],
      historyItems = [],
      watchedSlugs = [],
      refreshSeed = 0,
      currentSlugs = [],
    } = input || {};

    const seed = Number(refreshSeed) || 0;
    const isRefresh = seed > 0;

    // 1. TẠO USER TASTE PROFILE ĐA CHIỀU (Tích hợp lịch sử + Profile)
    const profile = buildUserTasteProfile(historyItems, genres, watchedSlugs);

    // BẮT BUỘC 100%: Phim đã có trong lịch sử xem không bao giờ gợi ý lại
    const watchedHistorySet = new Set<string>(profile.historySlugs);

    // Phim đang hiển thị trên màn hình: CHỈ loại bỏ khi người dùng chủ động bấm 'Đổi gợi ý' (seed > 0)
    // Khi tải trang / reload (seed === 0), tuyệt đối KHÔNG loại bỏ để luôn hiển thị danh sách đầy đủ, tối ưu nhất
    const currentOnScreenSet = new Set<string>(
      isRefresh ? ((currentSlugs as string[]) || []).map((s: string) => s.toLowerCase().trim()) : []
    );

    let tasteHash: string;
    if (profile.isGuest) {
      tasteHash = `guest-${seed % GUEST_THEMES.length}`;
    } else {
      const gPart = profile.genres.map((g) => g.slug).join(",");
      const cPart = profile.countries.map((c) => c.slug).join(",");
      const tPart = profile.types.map((t) => t.slug).join(",");
      tasteHash = `g:${gPart}|c:${cPart}|t:${tPart}|f:${profile.formatPreference}`;
    }

    const pageOffset = (seed % 4) + 1;
    const kvForYouKey = `foryou:taste:${tasteHash}:p${pageOffset}`;

    // 0. Thử lấy từ L1 In-Memory RAM Cache (0ms, 0 Redis calls, 0 CPU)
    const l1Cached = FOR_YOU_L1_CACHE.get(kvForYouKey);
    if (l1Cached && l1Cached.expireAt > Date.now()) {
      return l1Cached.data as RecommendationResult;
    }

    // 1. Thử lấy từ L2 Redis Cache
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cachedPool = await cacheService.get<{ context: string; movies: any[] }>(kvForYouKey);
    if (cachedPool && Array.isArray(cachedPool.movies) && cachedPool.movies.length >= 14) {
      const filtered = cachedPool.movies.filter(
        (m) =>
          m &&
          m.slug &&
          !watchedHistorySet.has(m.slug.toLowerCase().trim()) &&
          (!isRefresh || !currentOnScreenSet.has(m.slug.toLowerCase().trim()))
      );
      // Chỉ dùng cache nếu còn đủ số lượng phong phú (>= 14 phim)
      if (filtered.length >= 14) {
        const payload = {
          success: true,
          context: cachedPool.context,
          items: filtered.slice(0, 20),
          cached: true,
        };
        FOR_YOU_L1_CACHE.set(kvForYouKey, { data: payload, expireAt: Date.now() + L1_TTL_MS });
        return payload;
      }
    }

    // 3. MULTI-SIGNAL CANDIDATE RETRIEVAL (2-3 TRUY VẤN SONG SONG TỪ CATALOG)
    const topGenre = profile.genres[0];
    const secondGenre = profile.genres[1];
    const thirdGenre = profile.genres[2];
    const topCountry = profile.countries[0];
    const prefType = profile.types[0];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queryPromises: Promise<any>[] = [];

    if (!profile.isGuest && topGenre) {
      // Query 1: Top Genre theo lượt xem cao nhất
      queryPromises.push(
        movieApi.getMovies({
          category: topGenre.slug,
          limit: 24,
          page: pageOffset,
          sort: "views",
        })
      );

      // Query 2: Thể loại thứ hai HOẶC Quốc gia yêu thích
      if (secondGenre) {
        queryPromises.push(
          movieApi.getMovies({
            category: secondGenre.slug,
            limit: 24,
            page: pageOffset,
            sort: "views",
          })
        );
      } else if (topCountry) {
        queryPromises.push(
          movieApi.getMovies({
            country: topCountry.slug,
            limit: 24,
            page: pageOffset,
            sort: "views",
          })
        );
      } else {
        queryPromises.push(
          movieApi.getMovies({
            category: topGenre.slug,
            limit: 24,
            page: pageOffset + 1,
            sort: "rating",
          })
        );
      }

      // Query 3: Thể loại thứ ba HOẶC Định dạng yêu thích (phim lẻ / phim bộ) HOẶC Phim mới phát hành
      if (thirdGenre) {
        queryPromises.push(
          movieApi.getMovies({
            category: thirdGenre.slug,
            limit: 20,
            page: (seed % 2) + 1,
            sort: "views",
          })
        );
      } else if (prefType) {
        queryPromises.push(
          movieApi.getMovies({
            type: prefType.slug,
            limit: 20,
            page: (seed % 3) + 1,
            sort: "latest",
          })
        );
      } else {
        queryPromises.push(
          movieApi.getMovies({
            limit: 20,
            page: (seed % 3) + 1,
            sort: "views",
          })
        );
      }
    } else {
      // Người dùng mới / Guest: Lấy theo bộ chủ đề chất lượng xoay vòng theo seed
      const guestTheme = GUEST_THEMES[seed % GUEST_THEMES.length];
      queryPromises.push(
        movieApi.getMovies({
          category: guestTheme.genres[0],
          limit: 24,
          page: pageOffset,
          sort: "views",
        })
      );
      queryPromises.push(
        movieApi.getMovies({
          category: guestTheme.genres[1] || "hanh-dong",
          limit: 24,
          page: pageOffset,
          sort: "rating",
        })
      );
      queryPromises.push(
        movieApi.getMovies({
          country: guestTheme.country,
          limit: 20,
          page: (seed % 2) + 1,
          sort: "views",
        })
      );
    }

    // Thực thi song song và chống sập nếu 1 query lỗi
    const settledResults = await Promise.allSettled(queryPromises);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candidateRawPool: any[] = [];
    for (const res of settledResults) {
      if (res.status === "fulfilled" && res.value?.items && Array.isArray(res.value.items)) {
        candidateRawPool.push(...res.value.items);
      }
    }

    // 4. LỌC PHIM ĐÃ XEM VÀ KHỬ TRÙNG LẶP
    const seenSlugs = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candidateNormalized: any[] = [];

    for (const raw of candidateRawPool) {
      const norm = normalizeMovie(raw);
      if (!norm.slug) continue;
      const cleanSlug = norm.slug.toLowerCase().trim();

      // BẮT BUỘC 100%: Loại bỏ triệt để phim đã có trong lịch sử xem của người dùng
      if (watchedHistorySet.has(cleanSlug) || seenSlugs.has(cleanSlug)) {
        continue;
      }
      // Khi người dùng chủ động nhấn 'Đổi gợi ý' (isRefresh), ưu tiên phim mới chưa có trên màn hình
      if (isRefresh && currentOnScreenSet.has(cleanSlug)) {
        continue;
      }
      seenSlugs.add(cleanSlug);
      candidateNormalized.push(norm);
    }

    // 5. CHẤM ĐIỂM CÁ NHÂN HOÁ (RULE-BASED DETERMINISTIC SCORING)
    const scoredCandidates = candidateNormalized.map((norm) => {
      let score = 0;
      const matchedAspects: string[] = [];

      // Bóc tách toàn bộ thể loại của phim từ categories, raw category, genre, title, slug
      const rawCatNames = [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(norm.categories?.map((c: any) => c.name) || []),
        ...(Array.isArray(norm.raw?.category)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? norm.raw.category.map((c: any) => (typeof c === "string" ? c : c?.name || ""))
          : []),
        norm.genre || "",
      ].filter(Boolean);

      const candidateGenreSlugs = new Set<string>();
      for (const catName of rawCatNames) {
        const extracted = extractGenresFromText(catName);
        for (const g of extracted) {
          candidateGenreSlugs.add(g.slug);
        }
      }
      const titleExtracted = extractGenresFromText(`${norm.title} ${norm.slug}`);
      for (const g of titleExtracted) {
        candidateGenreSlugs.add(g.slug);
      }

      // 1. GENRE MATCHING (Không double-count, chỉ lấy mức cao nhất + multi-genre bonus nhỏ)
      let genreScore = 0;
      let matchedTopGenre = false;
      let matchedSecondGenre = false;
      let matchedThirdGenre = false;

      if (topGenre && candidateGenreSlugs.has(topGenre.slug)) {
        genreScore = 50;
        matchedTopGenre = true;
        matchedAspects.push(topGenre.name);
      } else if (secondGenre && candidateGenreSlugs.has(secondGenre.slug)) {
        genreScore = 20;
        matchedSecondGenre = true;
        matchedAspects.push(secondGenre.name);
      } else if (thirdGenre && candidateGenreSlugs.has(thirdGenre.slug)) {
        genreScore = 10;
        matchedThirdGenre = true;
        matchedAspects.push(thirdGenre.name);
      }

      // Multi-genre intersection bonus: Tối đa +5 nếu vừa match Top 1 vừa match thêm Top 2 hoặc Top 3
      if (
        matchedTopGenre &&
        ((secondGenre && candidateGenreSlugs.has(secondGenre.slug)) ||
          (thirdGenre && candidateGenreSlugs.has(thirdGenre.slug)))
      ) {
        genreScore += 5;
      }
      score += genreScore;

      // 2. COUNTRY MATCHING (Top: +20, Second: +10)
      let countryScore = 0;
      const rawCountryNames = [
        norm.country || "",
        ...(Array.isArray(norm.raw?.country)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? norm.raw.country.map((c: any) => (typeof c === "string" ? c : c?.name || ""))
          : []),
      ].filter(Boolean);

      const candidateCountrySlugs = new Set<string>();
      for (const cName of rawCountryNames) {
        const extracted = extractCountriesFromText(cName);
        for (const c of extracted) {
          candidateCountrySlugs.add(c.slug);
        }
      }

      let matchedCountryName = "";
      if (topCountry && candidateCountrySlugs.has(topCountry.slug)) {
        countryScore = 20;
        matchedCountryName = topCountry.name;
        matchedAspects.push(`phim ${topCountry.name}`);
      } else if (profile.countries[1] && candidateCountrySlugs.has(profile.countries[1].slug)) {
        countryScore = 10;
        matchedCountryName = profile.countries[1].name;
      }
      score += countryScore;

      // 3. PREFERRED TYPE (Phim bộ / Phim lẻ: +10)
      let typeScore = 0;
      let matchedTypeName = "";
      if (prefType) {
        const isPhimBo =
          norm.type_name === "Phim bộ" || (norm.time && String(norm.time).toLowerCase().includes("tập"));
        const isPhimLe = norm.type_name === "Phim lẻ" || norm.type_name === "Phim rạp";
        const isHoatHinh = norm.type_name === "Hoạt hình" || candidateGenreSlugs.has("hoat-hinh");

        const typeMatched =
          (prefType.slug === "phim-bo" && isPhimBo) ||
          (prefType.slug === "phim-le" && isPhimLe) ||
          (prefType.slug === "hoat-hinh" && isHoatHinh) ||
          (prefType.slug === "tv-shows" && norm.type_name === "TV Shows");

        if (typeMatched) {
          typeScore = 10;
          matchedTypeName = prefType.name;
          matchedAspects.push(prefType.name);
        }
      }
      score += typeScore;

      // 4. RATING (0..8 điểm, clamp, 0 nếu không có rating)
      let ratingScore = 0;
      const numScore = Number(norm.score);
      if (!isNaN(numScore) && numScore > 0) {
        ratingScore = Math.min(8, Math.max(0, Math.round(numScore * 0.8 * 10) / 10));
      }
      score += ratingScore;

      // 5. RECENCY (2026: +5, 2025: +4, 2024: +3, 2023: +1, older: 0)
      let recencyScore = 0;
      const yr = Number(norm.year);
      if (!isNaN(yr) && yr > 0) {
        if (yr >= 2026) recencyScore = 5;
        else if (yr === 2025) recencyScore = 4;
        else if (yr === 2024) recencyScore = 3;
        else if (yr === 2023) recencyScore = 1;
      }
      score += recencyScore;

      // 6. FORMAT ADJUSTMENT (-25 -> +15)
      const candidateFormat = detectMovieFormat({
        type: norm.raw?.type || norm.type,
        type_name: norm.type_name,
        category: norm.raw?.category,
        categories: norm.categories,
        title: norm.title,
        slug: norm.slug,
        raw: norm.raw,
      });

      let formatAdjustment = 0;
      if (profile.formatPreference === "live_action_preferred") {
        if (candidateFormat === "animation") {
          formatAdjustment = -25;
        } else if (candidateFormat === "live_action") {
          formatAdjustment = 5;
        }
      } else if (profile.formatPreference === "animation_preferred") {
        if (candidateFormat === "animation") {
          formatAdjustment = 15;
        } else if (candidateFormat === "live_action") {
          formatAdjustment = -5;
        }
      }
      score += formatAdjustment;

      // 7. MATCH PERCENTAGE PHẢN ÁNH ĐIỂM TỔNG & FORMAT: clamp(round(70 + (score / 100) * 28), 72, 98)
      const matchPercentage = Math.min(
        98,
        Math.max(72, Math.round(70 + (Math.max(0, score) / 100) * 28))
      );

      // 8. TẠO MATCH REASON CHÂN THỰC (ĐÚNG TÍN HIỆU THỰC TẾ, KHÔNG TỰ BỊA "BẠN THÍCH HOẠT HÌNH")
      let matchReason = "Siêu phẩm thịnh hành được đánh giá cao";
      if (!profile.isGuest) {
        if (profile.formatPreference === "live_action_preferred" && candidateFormat === "live_action") {
          if (matchedTopGenre && matchedCountryName) {
            matchReason = `Phù hợp với gu ${topGenre.name}, phim ${matchedCountryName} và ưu tiên phim người đóng của bạn`;
          } else if (matchedTopGenre) {
            matchReason = `Khớp gu ${topGenre.name} và ưu tiên phim người đóng của bạn`;
          } else if (matchedSecondGenre) {
            matchReason = `Phim người đóng thể loại ${secondGenre.name} phù hợp với bạn`;
          } else if (matchedCountryName) {
            matchReason = `Phim ${matchedCountryName} người đóng thịnh hành dành cho bạn`;
          } else {
            matchReason = "Phim người đóng thịnh hành phù hợp với bạn";
          }
        } else if (candidateFormat === "animation") {
          if (profile.formatPreference === "animation_preferred") {
            if (matchedTopGenre) {
              matchReason = `Hoạt hình/Anime thể loại ${topGenre.name} chuẩn gu của bạn`;
            } else {
              matchReason = "Khớp dòng hoạt hình/anime bạn yêu thích";
            }
          } else if (profile.formatPreference === "live_action_preferred") {
            if (matchedTopGenre) {
              matchReason = `Tác phẩm hoạt hình thể loại ${topGenre.name} có thể bạn muốn đổi gió`;
            } else {
              matchReason = "Tác phẩm hoạt hình thịnh hành";
            }
          } else {
            // Mixed
            if (matchedTopGenre) {
              matchReason = `Hoạt hình/Anime ${topGenre.name} dựa trên lịch sử xem của bạn`;
            } else {
              matchReason = "Khớp dòng hoạt hình/anime bạn từng xem";
            }
          }
        } else {
          // Live action or unknown with mixed preference
          if (matchedTopGenre && matchedCountryName && matchedTypeName) {
            matchReason = `Phù hợp với gu ${topGenre.name}, phim ${matchedCountryName} và ${matchedTypeName} của bạn`;
          } else if (matchedTopGenre && matchedCountryName) {
            matchReason = `Phù hợp với gu phim ${matchedCountryName} và ${topGenre.name} của bạn`;
          } else if (matchedTopGenre && (matchedSecondGenre || matchedThirdGenre)) {
            const secondName = matchedSecondGenre ? secondGenre?.name : thirdGenre?.name;
            matchReason = `Kết hợp giữa ${topGenre.name} & ${secondName} đúng sở thích`;
          } else if (matchedTopGenre) {
            matchReason = `Cùng thể loại ${topGenre.name} mà bạn thường xem`;
          } else if (matchedSecondGenre && matchedCountryName) {
            matchReason = `Mang màu sắc ${matchedCountryName} và thể loại ${secondGenre?.name} mà bạn cũng hay xem`;
          } else if (matchedSecondGenre) {
            matchReason = `Thuộc thể loại ${secondGenre?.name} mà bạn thỉnh thoảng xem`;
          } else if (matchedThirdGenre) {
            matchReason = `Thuộc thể loại ${thirdGenre?.name} trong sở thích của bạn`;
          } else if (matchedCountryName) {
            matchReason = `Tác phẩm phim ${matchedCountryName} nổi bật được quan tâm gần đây`;
          } else {
            matchReason = "Bộ phim thịnh hành có thể bạn sẽ quan tâm";
          }
        }
      }

      // 9. GENRE HIỂN THỊ TRÊN CARD (GIỮ NGUYÊN METADATA THẬT CỦA CANDIDATE, CHUẨN HOÁ TIẾNG VIỆT CÓ DẤU)
      // Tuyệt đối KHÔNG dùng displayGenreName = topGenre.name để ghi đè thể loại gốc
      let displayGenreName = formatGenreName(norm.genre) || norm.type_name || "Đề Xuất";
      if (candidateFormat === "animation") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasHoatHinhCat = norm.categories?.some((c: any) =>
          c.name?.toLowerCase().includes("hoạt hình")
        );
        if (hasHoatHinhCat || norm.type_name === "Hoạt hình") {
          displayGenreName = "Hoạt Hình";
        }
      }

      return {
        norm,
        score,
        genreScore,
        countryScore,
        candidateFormat,
        formatAdjustment,
        matchPercentage,
        matchReason,
        displayGenreName,
      };
    });

    // Sắp xếp ứng viên theo điểm số giảm dần
    scoredCandidates.sort((a, b) => b.score - a.score);

    // LOGGING DEV (Chỉ log server-side trong development để audit)
    if (process.env.NODE_ENV !== "production") {
      console.log("[for-you recommendations] Taste Profile:", {
        topGenres: profile.genres.map((g) => `${g.name} (${g.score})`),
        topCountries: profile.countries.map((c) => `${c.name} (${c.score})`),
        topTypes: profile.types.map((t) => `${t.name} (${t.score})`),
        formatPreference: profile.formatPreference,
        liveActionScore: profile.liveActionScore,
        animationScore: profile.animationScore,
      });

      if (scoredCandidates.length > 0) {
        console.log(
          "[for-you recommendations] Candidates sample:",
          scoredCandidates.slice(0, 8).map((c) => ({
            title: c.norm.title,
            format: c.candidateFormat,
            genreScore: c.genreScore,
            countryScore: c.countryScore,
            formatAdj: c.formatAdjustment,
            finalScore: c.score,
            matchPercentage: c.matchPercentage,
            displayGenre: c.displayGenreName,
          }))
        );
      }
    }

    // 6. DIVERSITY RE-RANKING (CHỐNG LẶP THỂ LOẠI / QUỐC GIA LIÊN TIẾP)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const selectedFinalMovies: any[] = [];
    const remainingCandidates = [...scoredCandidates];
    let lastGenre = "";

    while (remainingCandidates.length > 0 && selectedFinalMovies.length < 20) {
      // Tìm ứng viên có điểm cao nhất nhưng không trùng lặp liên tiếp thể loại hiển thị
      let pickIdx = remainingCandidates.findIndex(
        (c) => (c.displayGenreName || c.norm.genre || "") !== lastGenre
      );
      if (pickIdx === -1) pickIdx = 0;

      const [picked] = remainingCandidates.splice(pickIdx, 1);
      lastGenre = picked.displayGenreName || picked.norm.genre || "";

      selectedFinalMovies.push({
        slug: picked.norm.slug,
        name: picked.norm.title,
        title: picked.norm.title,
        origin_name: picked.norm.origin_name,
        poster_url: picked.norm.posterUrl || picked.norm.imageUrl || "/default-poster.jpg",
        thumb_url: picked.norm.thumbUrl || picked.norm.posterUrl || "/default-hero.jpg",
        year: picked.norm.year,
        quality: picked.norm.quality || "Full HD",
        category: [{ name: picked.displayGenreName }],
        matchPercentage: picked.matchPercentage,
        matchReason: picked.matchReason,
      });
    }

    // 7. BACKFILL BẢO VỆ CAROUSEL LUÔN ĐẦY ĐỦ >= 18 PHIM NẾU THIẾU
    if (selectedFinalMovies.length < 18) {
      try {
        const backfillPages = [1, 2];
        for (const p of backfillPages) {
          if (selectedFinalMovies.length >= 20) break;
          const fallbackRes = await movieApi.getMovies({
            page: p,
            limit: 24,
            sort: p === 1 ? "views" : "rating",
          });
          for (const raw of fallbackRes?.items || []) {
            const norm = normalizeMovie(raw);
            if (!norm.slug) continue;
            const cleanSlug = norm.slug.toLowerCase().trim();
            if (watchedHistorySet.has(cleanSlug) || seenSlugs.has(cleanSlug)) {
              continue;
            }
            seenSlugs.add(cleanSlug);
            selectedFinalMovies.push({
              slug: norm.slug,
              name: norm.title,
              title: norm.title,
              origin_name: norm.origin_name,
              poster_url: norm.posterUrl || norm.imageUrl || "/default-poster.jpg",
              thumb_url: norm.thumbUrl || norm.posterUrl || "/default-hero.jpg",
              year: norm.year,
              quality: norm.quality || "Full HD",
              category: [{ name: formatGenreName(norm.genre) || norm.type_name || "Đề Xuất" }],
              matchPercentage: 88,
              matchReason: "Siêu phẩm thịnh hành được yêu thích nhất",
            });
            if (selectedFinalMovies.length >= 20) break;
          }
        }
      } catch (backfillErr) {
        console.warn("[for-you recommendations] Backfill error:", backfillErr);
      }
    }

    // TẠO CONTEXT HIỂN THỊ CHÂN THỰC
    let matchContext = "Tuyển tập siêu phẩm thịnh hành được đánh giá cao nhất";
    if (!profile.isGuest) {
      if (topCountry && topGenre) {
        matchContext = `Tuyển tập phim ${topCountry.name} & ${topGenre.name} chuẩn gu của bạn`;
      } else if (topGenre && secondGenre) {
        matchContext = `Tuyển tập ${topGenre.name} & ${secondGenre.name} tuyển chọn riêng cho bạn`;
      } else if (topGenre) {
        matchContext = `Tuyển tập đỉnh cao ${topGenre.name} dựa trên lịch sử xem`;
      }
    }

    // 8. LƯU VÀO CACHE VỚI TTL 2 GIỜ (7200s) CHỈ KHI ĐẠT ĐỦ >= 14 PHIM
    if (selectedFinalMovies.length >= 14) {
      cacheService.set(
        kvForYouKey,
        {
          context: matchContext,
          movies: selectedFinalMovies,
        },
        7200
      ).catch(() => {});
    }

    const finalPayload: RecommendationResult = {
      success: true,
      context: matchContext,
      items: selectedFinalMovies,
      cached: false,
    };
    FOR_YOU_L1_CACHE.set(kvForYouKey, { data: finalPayload, expireAt: Date.now() + L1_TTL_MS });

    return finalPayload;
  } catch (err) {
    console.error("[generateForYouRecommendations] Error:", err);
    return { success: false, context: "Tuyển chọn chuẩn gu cho bạn", items: [] };
  }
}

/**
 * GET /api/recommendations/for-you?seed=0
 * Dành cho Guest/Khách: CDN Edge Cache 1 giờ, 0ms latency, 0 Serverless CPU
 */
export async function GET(req: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.PUBLIC_IN_MEMORY_READ);
    if (!rateLimit.allowed) {
      return buildRateLimitResponse(rateLimit);
    }

    const { searchParams } = new URL(req.url);
    const seed = Number(searchParams.get("seed")) || 0;

    const result = await generateForYouRecommendations({
      genres: [],
      historyItems: [],
      watchedSlugs: [],
      refreshSeed: seed,
      currentSlugs: [],
    });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        "CDN-Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        "Vercel-CDN-Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (err) {
    console.error("[for-you recommendations GET] Error:", err);
    return NextResponse.json({ success: false, items: [] }, { status: 500 });
  }
}

/**
 * POST /api/recommendations/for-you
 * Dành cho người dùng đã đăng nhập hoặc có lịch sử xem cá nhân
 */
export async function POST(req: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.RECOMMENDATIONS_IN_MEMORY);
    if (!rateLimit.allowed) {
      return buildRateLimitResponse(rateLimit);
    }

    const body = (await req.json().catch(() => null)) || {};
    const result = await generateForYouRecommendations(body);

    const isGuest =
      (!body.historyItems || body.historyItems.length === 0) &&
      (!body.genres || body.genres.length === 0);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": isGuest
          ? "public, s-maxage=1800, stale-while-revalidate=3600"
          : "private, max-age=900",
      },
    });
  } catch (err) {
    console.error("[for-you recommendations POST] Error:", err);
    return NextResponse.json({ success: false, items: [] }, { status: 500 });
  }
}
