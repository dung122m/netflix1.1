/* eslint-disable @typescript-eslint/no-explicit-any */
import dns from "dns";
import https from "https";
import { cacheService } from "@/lib/cache";
import { normalizeForMatch as cleanStringForMatch } from "@/lib/stringUtils";

// =========================================================================
// CẤU HÌNH TMDB API (LẤY TỪ BIẾN MÔI TRƯỜNG, BẢO MẬT PHÍA SERVER)
// =========================================================================
const TMDB_API_KEY =
  process.env.TMDB_API_KEY ||
  process.env.NEXT_PUBLIC_TMDB_API_KEY ||
  "3fd2be6f0c70a2a598f084ddfb75487c";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

export interface TmdbPerson {
  id: number;
  name: string;
  original_name?: string;
  profile_path?: string | null;
  popularity: number;
  known_for_department?: string;
}

export interface TmdbMovieCredit {
  id: number; // tmdb_id
  title: string;
  original_title: string;
  release_date?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  character?: string;
  department?: string;
  job?: string;
  imdb_id?: string;
  media_type?: string;
}

// =========================================================================
// BỘ NHỚ ĐỆM IN-MEMORY (SWR CACHE) TRÁNH GỌI LẶP LẠI VÀ ĐẠT TỐC ĐỘ 0MS
// =========================================================================
interface CacheEntry<T> {
  data: T;
  expireAt: number;
  staleUntil: number;
}

// 1. Cache kết quả tìm kiếm diễn viên (24h)
const TMDB_PERSON_CACHE = new Map<string, CacheEntry<TmdbPerson | null>>();

// 2. Cache toàn bộ filmography của diễn viên (24h)
const TMDB_CREDITS_CACHE = new Map<number, CacheEntry<TmdbMovieCredit[]>>();

// 3. Cache danh sách phim đã merge của diễn viên (2h tươi, 24h stale)
const TMDB_ACTOR_MOVIES_CACHE = new Map<string, CacheEntry<any[]>>();

// 3.1. Cache danh sách phim thịnh hành TMDB Trending (3h tươi, 12h stale)
const TMDB_TRENDING_MOVIES_CACHE = new Map<string, CacheEntry<any[]>>();

// 4. CACHE ĐỐI CHIẾU TỪNG PHIM THEO TMDB ID (QUAN TRỌNG NHẤT: TRÁNH RE-CHECK PHIM ĐÃ TỪNG MATCH)
// Lưu trữ: tmdb_id -> Movie (nếu tìm thấy) hoặc null (nếu không có nguồn phát)
interface SingleMovieMatchEntry {
  movie: any | null;
  expireAt: number;
}
const TMDB_SINGLE_MOVIE_MATCH_CACHE = new Map<number, SingleMovieMatchEntry>();
export function clearTmdbSingleMatchCache(): void {
  TMDB_SINGLE_MOVIE_MATCH_CACHE.clear();
}

// 5. CACHE BACKDROP CHO HERO BANNER (24h tươi)
const TMDB_BACKDROP_CACHE = new Map<string, { url: string | null; expireAt: number }>();

export async function getTmdbBackdropUrl(
  tmdbId: string | number | undefined | null,
  type: string = "movie"
): Promise<string | null> {
  if (!tmdbId) return null;
  const cleanId = String(tmdbId).trim();
  if (!cleanId || cleanId === "0" || cleanId === "null" || cleanId === "undefined") return null;

  const cleanType = type === "tv" || type === "series" ? "tv" : "movie";
  const cacheKey = `${cleanType}:${cleanId}`;

  const now = Date.now();
  const memoryHit = TMDB_BACKDROP_CACHE.get(cacheKey);
  if (memoryHit && memoryHit.expireAt > now) {
    return memoryHit.url;
  }

  const kvKey = `tmdb:backdrop:${cleanType}:${cleanId}`;
  const backdropUrl = await cacheService.fetchOrSet(
    kvKey,
    async () => {
      try {
        let data = await fetchTmdbEndpoint(`/${cleanType}/${cleanId}`);
        if (!data?.backdrop_path && !data?.id) {
          // Thử loại hình thay thế nếu phim bị phân loại nhầm giữa tv/movie
          const altType = cleanType === "tv" ? "movie" : "tv";
          data = await fetchTmdbEndpoint(`/${altType}/${cleanId}`);
        }
        if (data?.backdrop_path) {
          return `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`;
        }
        return null;
      } catch (err) {
        console.warn(`[TMDB] Error fetching backdrop for ${cleanType}/${cleanId}:`, err);
        return null;
      }
    },
    7 * 86400 // 7 ngày trên KV
  );

  TMDB_BACKDROP_CACHE.set(cacheKey, {
    url: backdropUrl,
    expireAt: now + (backdropUrl ? 24 * 3600 * 1000 : 3600 * 1000),
  });

  return backdropUrl;
}

// DNS IP cache nhằm khắc phục việc một số nhà mạng VNPT/Viettel chặn hoặc lỗi phân giải api.themoviedb.org
let cachedTmdbIp: string | null = null;
let lastIpResolveTime = 0;

async function resolveTmdbIp(): Promise<string> {
  const now = Date.now();
  if (cachedTmdbIp && now - lastIpResolveTime < 3600000) {
    return cachedTmdbIp;
  }
  try {
    const resolver = new dns.promises.Resolver();
    resolver.setServers(["8.8.8.8", "1.1.1.1"]);
    const ips = await resolver.resolve4("api.themoviedb.org");
    if (ips && ips.length > 0) {
      cachedTmdbIp = ips[0];
      lastIpResolveTime = now;
      return cachedTmdbIp;
    }
  } catch {}
  return "api.themoviedb.org";
}

/**
 * Gọi TMDB API bền bỉ và tối ưu:
 * 1. Thử fetch chuẩn của Node/Next.js có next.revalidate.
 * 2. Nếu gặp lỗi DNS ENOTFOUND do nhà mạng chặn, tự động fallback sang DNS Google 8.8.8.8 + https agent.
 */
async function fetchTmdbEndpoint(endpointPath: string, revalidateSeconds = 3600): Promise<any> {
  const sep = endpointPath.includes("?") ? "&" : "?";
  const authQuery = TMDB_API_KEY ? `api_key=${TMDB_API_KEY}` : "";
  const fullRelativePath = `${endpointPath}${sep}${authQuery}`;
  const fullUrl = `${TMDB_BASE_URL}${fullRelativePath}`;

  // 1. Thử gọi native fetch
  try {
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Nanaflix/1.0",
      Accept: "application/json",
    };
    if (TMDB_API_KEY && TMDB_API_KEY.startsWith("eyJ")) {
      headers["Authorization"] = `Bearer ${TMDB_API_KEY}`;
    }

    const res = await fetch(fullUrl, {
      headers,
      signal: AbortSignal.timeout(4000),
      next: { revalidate: revalidateSeconds },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    const msg = String(err?.message || "");
    if (!msg.includes("ENOTFOUND") && !msg.includes("fetch failed") && !msg.includes("timeout")) {
      console.warn("[TMDB] Native fetch error:", msg);
    }
  }

  // 2. Fallback sang https qua Resolved IP với Google/Cloudflare DNS
  try {
    const ip = await resolveTmdbIp();
    return await new Promise((resolve, reject) => {
      const reqHeaders: Record<string, string> = {
        Host: "api.themoviedb.org",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Nanaflix/1.0",
        Accept: "application/json",
        Connection: "close",
      };
      if (TMDB_API_KEY && TMDB_API_KEY.startsWith("eyJ")) {
        reqHeaders["Authorization"] = `Bearer ${TMDB_API_KEY}`;
      }

      const req = https.request(
        {
          host: ip,
          path: `/3${fullRelativePath}`,
          headers: reqHeaders,
          servername: "api.themoviedb.org",
          method: "GET",
          agent: false,
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            try {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                resolve(JSON.parse(body));
              } else {
                reject(new Error(`TMDB responded with status ${res.statusCode}`));
              }
            } catch (parseErr) {
              reject(parseErr);
            }
          });
        }
      );

      req.on("error", reject);
      req.setTimeout(4500, () => {
        req.destroy();
        reject(new Error("TMDB fallback request timeout"));
      });
      req.end();
    });
  } catch (fallbackErr) {
    console.warn("[TMDB] Fallback fetch error:", fallbackErr);
    return null;
  }
}

/**
 * 2. TÌM KIẾM DIỄN VIÊN / ĐẠO DIỄN TRÊN TMDB (SEARCH PERSON)
 * 3. LỰA CHỌN ĐÚNG DIỄN VIÊN NẾU CÓ NHIỀU NGƯỜI TRÙNG TÊN:
 *    - Khớp chính xác tên chuẩn (canonicalName) hoặc bí danh (aliases)
 *    - Ưu tiên phòng ban diễn xuất (Acting) hoặc đạo diễn (Directing)
 *    - Ưu tiên độ nổi tiếng (popularity) cao nhất
 * 4. LẤY person_id
 */
export async function searchTmdbPerson(
  actorQuery: string,
  canonicalName?: string,
  aliases: string[] = []
): Promise<TmdbPerson | null> {
  const trimmed = actorQuery.trim();
  if (!trimmed) return null;

  const cacheKey = `PERSON:${cleanStringForMatch(trimmed)}_${cleanStringForMatch(canonicalName)}`;
  const now = Date.now();
  const cached = TMDB_PERSON_CACHE.get(cacheKey);
  if (cached && cached.expireAt > now) {
    return cached.data;
  }

  const kvKey = `tmdb:person:${cleanStringForMatch(trimmed)}_${cleanStringForMatch(canonicalName)}`;
  return await cacheService.fetchOrSet(
    kvKey,
    async () => {
      // Thu thập các từ khóa tên để tra cứu trên TMDB
      const queriesToTry = Array.from(
        new Set([trimmed, canonicalName, ...aliases].filter((q): q is string => Boolean(q && q.trim().length >= 2)))
      );

      let bestPerson: TmdbPerson | null = null;
      let highestScore = -1;

      const targetNamesNormalized = queriesToTry.map(cleanStringForMatch).filter(Boolean);

      for (const q of queriesToTry.slice(0, 3)) {
        // 1. Thử gọi vi-VN trước để lấy tên tiếng Việt của diễn viên châu Á (ví dụ: Trần Khôn, Bạch Vũ, Lý Hiện)
        let data = await fetchTmdbEndpoint(
          `/search/person?query=${encodeURIComponent(q)}&language=vi-VN&include_adult=false`
        );

        let results = (data?.results || []) as any[];

        const evaluateCandidates = (items: any[]) => {
          for (const p of items) {
            if (!p || !p.id) continue;
            const pName = cleanStringForMatch(p.name);
            const pOrig = cleanStringForMatch(p.original_name);
            const pNameWords = pName.split(" ").filter(Boolean);
            const pOrigWords = pOrig.split(" ").filter(Boolean);

            let score = 0;

            // 1. Khớp chính xác tên tuyệt đối sau khi chuẩn hóa
            if (targetNamesNormalized.includes(pName) || targetNamesNormalized.includes(pOrig)) {
              score += 100;
            } else if (
              targetNamesNormalized.some((t) => {
                const tWords = t.split(" ").filter(Boolean);
                return (
                  (tWords.length >= 2 && pNameWords.length === tWords.length && tWords.every((w) => pNameWords.includes(w))) ||
                  (tWords.length >= 2 && pOrigWords.length === tWords.length && tWords.every((w) => pOrigWords.includes(w)))
                );
              })
            ) {
              // 2. Khớp tập hợp từ (ví dụ đảo thứ tự họ tên: "Lam Tan" vs "Tan Lam")
              score += 90;
            } else if (
              targetNamesNormalized.some((t) => t.length >= 6 && (pName.includes(t) || pOrig.includes(t)))
            ) {
              score += 30;
            }

            // Khớp ban diễn xuất hoặc đạo diễn
            if (p.known_for_department === "Acting") score += 25;
            else if (p.known_for_department === "Directing") score += 20;

            // Độ nổi tiếng chỉ dùng làm tie-breaker phụ, không dùng để loại bỏ diễn viên
            score += Math.min(10, Number(p.popularity || 0));

            // Có ảnh profile
            if (p.profile_path) score += 5;

            if (score > highestScore && score >= 115) {
              highestScore = score;
              bestPerson = {
                id: p.id,
                name: p.name,
                original_name: p.original_name,
                profile_path: p.profile_path ? `${TMDB_IMAGE_BASE}${p.profile_path}` : null,
                popularity: p.popularity,
                known_for_department: p.known_for_department,
              };
            }
          }
        };

        evaluateCandidates(results);

        // 2. Nếu chưa tìm được người khớp, thử gọi không chỉ định ngôn ngữ (lấy tên Romanized/tiếng Anh như Kang Ha-neul)
        if (!bestPerson) {
          data = await fetchTmdbEndpoint(
            `/search/person?query=${encodeURIComponent(q)}&include_adult=false`
          );
          results = (data?.results || []) as any[];
          evaluateCandidates(results);
        }

        if (bestPerson && highestScore >= 120) {
          break;
        }
      }

      // Lưu cache RAM 24h
      TMDB_PERSON_CACHE.set(cacheKey, {
        data: bestPerson,
        expireAt: Date.now() + 24 * 3600 * 1000,
        staleUntil: Date.now() + 48 * 3600 * 1000,
      });

      return bestPerson;
    },
    30 * 86400 // 30 ngày trên Cloudflare KV
  );
}

/**
 * 5. GỌI TMDB person/{person_id}/movie_credits ĐỂ LẤY TOÀN BỘ PHIM DIỄN VIÊN THAM GIA
 * 6. TIỀN LỌC (PRE-FILTER) & SẮP XẾP THÔNG MINH TRƯỚC KHI ĐỐI CHIẾU:
 *    - Khử trùng lặp ID (Deduplication)
 *    - Lọc bỏ phim chưa phát hành quá xa (release_date > currentYear + 1)
 *    - Lọc bỏ credit không phải diễn xuất (special thanks, archive footage, cameo tự thân)
 *    - Sắp xếp ưu tiên các tác phẩm nổi tiếng/kinh điển nhất lên đầu
 */
export async function getTmdbPersonMovieCredits(personId: number): Promise<TmdbMovieCredit[]> {
  if (!personId) return [];

  const now = Date.now();
  const cached = TMDB_CREDITS_CACHE.get(personId);
  if (cached && cached.expireAt > now) {
    return cached.data;
  }

  const kvKey = `tmdb:credits:${personId}`;
  return await cacheService.fetchOrSet(
    kvKey,
    async () => {
      // Gọi TMDB combined_credits với ngôn ngữ vi-VN để có cả phim lẻ, phim bộ lẫn tên Việt và tên gốc
      const data = await fetchTmdbEndpoint(`/person/${personId}/combined_credits?language=vi-VN`);

      const rawCast = Array.isArray(data?.cast) ? data.cast : [];
      const rawCrew = Array.isArray(data?.crew) ? data.crew : [];

      // Lọc thêm các tác phẩm làm đạo diễn (nếu là đạo diễn / diễn viên kép như Châu Tinh Trì, Trấn Thành, Thành Long)
      const directingCrew = rawCrew.filter((c: any) => c.department === "Directing");

      const combined = [...rawCast, ...directingCrew];
      const uniqueMap = new Map<number, TmdbMovieCredit>();

      const currentYear = new Date().getFullYear();

  for (const m of combined) {
    if (!m || !m.id || uniqueMap.has(m.id)) continue;

    const releaseDate = m.release_date || m.first_air_date || "";
    // LỌC BỎ PHIM CHƯA PHÁT HÀNH TRONG TƯƠNG LAI XA
    if (releaseDate) {
      const year = parseInt(releaseDate.slice(0, 4), 10);
      if (year > currentYear + 1) continue;
    }

    // LỌC BỎ CÁC CREDIT KHÔNG PHẢI DIỄN XUẤT CHÍNH
    const charLower = (m.character || "").toLowerCase();
    const jobLower = (m.job || "").toLowerCase();
    if (
      charLower.includes("uncredited") &&
      (charLower.includes("archive") || charLower.includes("thanks"))
    ) {
      continue;
    }
    if (jobLower.includes("special thanks") || jobLower.includes("thanks")) {
      continue;
    }

    uniqueMap.set(m.id, {
      id: m.id,
      title: m.title || m.name || m.original_name || m.original_title || "",
      original_title: m.original_title || m.original_name || m.title || m.name || "",
      release_date: releaseDate,
      vote_average: Number(m.vote_average || 0),
      vote_count: Number(m.vote_count || 0),
      popularity: Number(m.popularity || 0),
      poster_path: m.poster_path || null,
      backdrop_path: m.backdrop_path || null,
      overview: m.overview || "",
      character: m.character || "",
      department: m.department || "",
      job: m.job || "",
      media_type: m.media_type || (m.first_air_date ? "tv" : "movie"),
    });
  }

  // SẮP XẾP ƯU TIÊN:
  // 1. Phim có lượt bình chọn (vote_count) và độ nổi tiếng (popularity) cao nhất
  // 2. Năm phát hành mới nhất để các tác phẩm gần đây và kinh điển nhất được match trước
  const sortedCredits = Array.from(uniqueMap.values()).sort((a, b) => {
    const scoreA = (a.vote_count || 0) * 0.7 + (a.popularity || 0) * 10;
    const scoreB = (b.vote_count || 0) * 0.7 + (b.popularity || 0) * 10;
    return scoreB - scoreA;
  });

      // Lưu cache 24h
      TMDB_CREDITS_CACHE.set(personId, {
        data: sortedCredits,
        expireAt: Date.now() + 24 * 3600 * 1000,
        staleUntil: Date.now() + 48 * 3600 * 1000,
      });

      return sortedCredits;
    },
    14 * 86400 // 14 ngày trên Cloudflare KV
  );
}

/**
 * HÀM POOL GIỚI HẠN CONCURRENCY (ASYNC POOL):
 * Giới hạn số lượng request song song (ví dụ 6 request cùng lúc),
 * tránh gửi hàng trăm request cùng lúc gây tắc nghẽn hoặc bị chặn 429.
 */
async function runWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (true) {
      const idx = currentIndex++;
      if (idx >= items.length) break;
      try {
        results[idx] = await fn(items[idx], idx);
      } catch {
        // Safe skip on error
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * 7. ĐỐI CHIẾU TMDB MOVIE VỚI KKPHIM VÀ NGUONC CHẠY SONG SONG (PARALLEL FETCH)
 * 8. ÁP DỤNG BỘ NHỚ ĐỆM TỪNG PHIM (TMDB_SINGLE_MOVIE_MATCH_CACHE) ĐẠT TỐC ĐỘ 0MS
 *
 * ƯU TIÊN MATCH THEO THỨ TỰ NGHIÊM NGẶT:
 * Priority 1: TMDB ID (so khớp tmdb.id)
 * Priority 2: IMDB ID (so khớp imdb.id)
 * Priority 3: Title + Year (tiêu đề khớp + năm trong khoảng ±1)
 */
export async function matchTmdbMoviesWithSources(
  credits: TmdbMovieCredit[],
  maxCheckCount = 80,
  concurrency = 8
): Promise<any[]> {
  if (!credits || credits.length === 0) return [];

  const tStart = performance.now();
  const candidateCredits = credits.slice(0, maxCheckCount);

  const matchedMovies: any[] = [];
  const seenSlugs = new Set<string>();

  // Danh sách các phim cần gọi API (chưa có trong cache từng phim)
  const creditsToFetch: TmdbMovieCredit[] = [];

  const now = Date.now();

  // BƯỚC 1: KIỂM TRA BỘ NHỚ ĐỆM TỪNG PHIM TRONG RAM (0MS)
  // Chỉ dùng in-memory cache TMDB_SINGLE_MOVIE_MATCH_CACHE, TUYỆT ĐỐI không đọc/ghi Cloudflare KV cho từng credit
  for (const credit of candidateCredits) {
    const memEntry = TMDB_SINGLE_MOVIE_MATCH_CACHE.get(credit.id);
    if (memEntry && memEntry.expireAt > now) {
      if (memEntry.movie) {
        if (!seenSlugs.has(memEntry.movie.slug)) {
          seenSlugs.add(memEntry.movie.slug);
          matchedMovies.push(memEntry.movie);
        }
      }
      // Nếu memEntry.movie === null: đã kiểm tra trước đó và phim không có trên cả 2 nguồn -> BỎ QUA 0MS!
      continue;
    }

    creditsToFetch.push(credit);
  }

  // BƯỚC 2: ƯU TIÊN PHIMAPI TRƯỚC, CHỈ FALLBACK SANG NGUONC KHI CẦN THIẾT
  if (creditsToFetch.length > 0) {
    await runWithConcurrencyLimit(creditsToFetch, concurrency, async (credit) => {
      const tmdbIdStr = String(credit.id);
      const tmdbYear = credit.release_date ? parseInt(credit.release_date.slice(0, 4), 10) : undefined;
      const cleanOrig = cleanStringForMatch(credit.original_title);
      const cleanVi = cleanStringForMatch(credit.title);

      const isLatinOriginal =
        credit.original_title && /^[A-Za-z0-9\s\-':,.]+$/.test(credit.original_title);

      const cleanOrigTitle = credit.original_title ? credit.original_title.replace(/[:\-']/g, " ").replace(/\s+/g, " ").trim() : "";
      const cleanViTitle = credit.title ? credit.title.replace(/[:\-']/g, " ").replace(/\s+/g, " ").trim() : "";

      const primarySearchKw = isLatinOriginal ? cleanOrigTitle : (cleanViTitle || cleanOrigTitle);
      const secondarySearchKw = isLatinOriginal ? cleanViTitle : cleanOrigTitle;

      if ((!primarySearchKw || primarySearchKw.length < 2) && (!secondarySearchKw || secondarySearchKw.length < 2)) {
        TMDB_SINGLE_MOVIE_MATCH_CACHE.set(credit.id, { movie: null, expireAt: now + 12 * 3600 * 1000 });
        return;
      }

      try {
        const trySearchAndMatch = async (searchKw: string): Promise<{ candidate: any; matchType: "tmdb_id" | "imdb_id" | "title_year" } | null> => {
          if (!searchKw || searchKw.length < 2) return null;

          // 2.1 Gọi trước PhimAPI (KKPhim)
          const phimApiRes = await fetch(
            `https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(searchKw)}&limit=6`,
            { signal: AbortSignal.timeout(2200), next: { revalidate: 3600 } }
          )
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null);

          const phimApiItems: any[] = phimApiRes?.data?.items || [];

          // 2.2 Ưu tiên cao nhất: Khớp tuyệt đối qua TMDB ID trên PhimAPI
          for (const item of phimApiItems) {
            if (item?.tmdb?.id && String(item.tmdb.id) === tmdbIdStr) {
              return { candidate: item, matchType: "tmdb_id" };
            }
          }

          // 2.3 Ưu tiên thứ hai: Khớp qua IMDB ID trên PhimAPI
          if (credit.imdb_id) {
            for (const item of phimApiItems) {
              if (item?.imdb?.id && String(item.imdb.id) === credit.imdb_id) {
                return { candidate: item, matchType: "imdb_id" };
              }
            }
          }

          // 2.4 Ưu tiên thứ ba: Khớp qua Title + Year trên PhimAPI
          for (const item of phimApiItems) {
            const cOrig = cleanStringForMatch(item.origin_name);
            const cName = cleanStringForMatch(item.name);
            const cYear = item.year ? parseInt(String(item.year), 10) : undefined;

            const isTitleMatch =
              (cleanOrig && (cOrig === cleanOrig || cName === cleanOrig)) ||
              (cleanVi && (cName === cleanVi || cOrig === cleanVi)) ||
              (cleanOrig.length >= 6 && (cOrig.includes(cleanOrig) || cleanOrig.includes(cOrig)));

            const isYearMatch =
              !cYear || !tmdbYear || Math.abs(cYear - tmdbYear) <= 1;

            if (isTitleMatch && isYearMatch) {
              return { candidate: item, matchType: "title_year" };
            }
          }

          // 2.5 CHỈ FALLBACK SANG NGUONC khi PhimAPI hoàn toàn không khớp
          const nguonCRes = await fetch(
            `https://phim.nguonc.com/api/films/search?keyword=${encodeURIComponent(searchKw)}`,
            { signal: AbortSignal.timeout(2200), next: { revalidate: 3600 } }
          )
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null);

          const nguonCItems: any[] = Array.isArray(nguonCRes?.items) ? nguonCRes.items : [];
          if (nguonCItems.length > 0) {
            for (const nc of nguonCItems) {
              const ncName = cleanStringForMatch(nc.name);
              const ncOrig = cleanStringForMatch(nc.original_name);
              const ncYear = nc.year ? parseInt(String(nc.year), 10) : undefined;

              const isTitleMatch =
                (cleanOrig && (ncOrig === cleanOrig || ncName === cleanOrig)) ||
                (cleanVi && (ncName === cleanVi || ncOrig === cleanVi));

              const isYearMatch =
                !ncYear || !tmdbYear || Math.abs(ncYear - tmdbYear) <= 1;

              if (isTitleMatch && isYearMatch) {
                const formattedNc = {
                  ...nc,
                  origin_name: nc.original_name || nc.name,
                  poster_url: nc.poster_url || nc.thumb_url,
                  thumb_url: nc.thumb_url || nc.poster_url,
                  quality: nc.quality || "HD",
                  lang: nc.language || "Vietsub",
                };
                return { candidate: formattedNc, matchType: "title_year" };
              }
            }
          }

          return null;
        };

        // Thử tên đang dùng hiện tại trước
        let matchResult = await trySearchAndMatch(primarySearchKw);

        // Nếu không match được, thử tiếp với tên còn lại (original_title hoặc title)
        if (!matchResult && secondarySearchKw && secondarySearchKw !== primarySearchKw) {
          matchResult = await trySearchAndMatch(secondarySearchKw);
        }

        const matchedCandidate = matchResult?.candidate || null;
        const matchType = matchResult?.matchType || null;

        // 1.5 Format về định dạng Movie chuẩn
        if (matchedCandidate && matchedCandidate.slug) {
          const posterImg =
            matchedCandidate.poster_url ||
            matchedCandidate.thumb_url ||
            (credit.poster_path ? `https://image.tmdb.org/t/p/w500${credit.poster_path}` : "");

          const tmdbBackdrop = credit.backdrop_path
            ? `https://image.tmdb.org/t/p/w1280${credit.backdrop_path}`
            : "";

          const thumbImg =
            tmdbBackdrop ||
            matchedCandidate.thumb_url ||
            matchedCandidate.poster_url ||
            posterImg;

          const formattedMovie = {
            _id: matchedCandidate._id || matchedCandidate.id || matchedCandidate.slug,
            name: matchedCandidate.name || credit.title,
            slug: matchedCandidate.slug,
            origin_name: matchedCandidate.origin_name || credit.original_title || matchedCandidate.name,
            poster_url: posterImg,
            thumb_url: thumbImg,
            backdrop_url: tmdbBackdrop || matchedCandidate.backdrop_url || matchedCandidate.backdropUrl || undefined,
            backdrop_path: credit.backdrop_path || undefined,
            year: matchedCandidate.year || tmdbYear,
            time: matchedCandidate.time || "",
            type: matchedCandidate.type || (credit.media_type === "tv" ? "series" : (credit.media_type === "movie" ? "single" : "")),
            episode_current: matchedCandidate.episode_current || (credit.media_type === "tv" ? "Tập mới" : ""),
            episode_total: matchedCandidate.episode_total || matchedCandidate.total_episodes || "",
            quality: matchedCandidate.quality || "HD",
            lang: matchedCandidate.lang || matchedCandidate.language || "Vietsub",
            category: matchedCandidate.category || [],
            country: matchedCandidate.country || [],
            tmdb: {
              id: tmdbIdStr,
              vote_average: credit.vote_average || matchedCandidate.tmdb?.vote_average || 0,
              vote_count: credit.vote_count || matchedCandidate.tmdb?.vote_count || 0,
            },
            isActorFilmography: true,
            matchBy: matchType,
          };

          // Lưu cache phim thành công vào RAM (TTL 60 phút)
          TMDB_SINGLE_MOVIE_MATCH_CACHE.set(credit.id, {
            movie: formattedMovie,
            expireAt: now + 60 * 60 * 1000,
          });

          if (!seenSlugs.has(formattedMovie.slug)) {
            seenSlugs.add(formattedMovie.slug);
            matchedMovies.push(formattedMovie);
          }
        } else {
          // Lưu cache phim không tìm thấy nguồn vào RAM (TTL 60 phút) để lần sau bỏ qua ngay lập tức (0ms)
          TMDB_SINGLE_MOVIE_MATCH_CACHE.set(credit.id, {
            movie: null,
            expireAt: now + 60 * 60 * 1000,
          });
        }
      } catch {
        // Bỏ qua lỗi từng phim để không làm crash toàn bộ danh sách
      }
    });
  }

  const tEnd = performance.now();
  console.log(
    `[TMDB Perf] Matched ${matchedMovies.length}/${candidateCredits.length} movies in ${(tEnd - tStart).toFixed(0)}ms (Cache Hits: ${candidateCredits.length - creditsToFetch.length})`
  );

  return matchedMovies;
}

/**
 * 9. TỔNG HỢP TOÀN BỘ FLOW VỚI ĐO LƯỜNG HIỆU NĂNG:
 * Tên diễn viên → TMDB Search Person → person_id → TMDB Filmography (movie_credits)
 * → Danh sách TMDB movie IDs → Đối chiếu KKPhim / NguonC theo TMDB ID → Format Movie → MovieGrid
 */
export async function getActorFilmographyFromTmdb(
  actorQuery: string,
  canonicalName?: string,
  aliases: string[] = [],
  maxMovies = 250,
  concurrency = 8
): Promise<any[]> {
  const cleanKey = cleanStringForMatch(actorQuery) || cleanStringForMatch(canonicalName);
  if (!cleanKey) return [];

  const cacheKey = `TMDB_ACTOR_FLOW_V3:${cleanKey}`;
  const now = Date.now();
  const cached = TMDB_ACTOR_MOVIES_CACHE.get(cacheKey);

  if (cached) {
    if (cached.expireAt > now) {
      return cached.data.slice(0, maxMovies);
    }
    if (cached.staleUntil > now) {
      // Revalidate ngầm
      setTimeout(() => {
        executeTmdbActorFlow(actorQuery, canonicalName, aliases, cacheKey, maxMovies, concurrency).catch(() => {});
      }, 100);
      return cached.data.slice(0, maxMovies);
    }
  }

  const kvKey = `tmdb:actor_flow_v3:${cleanKey}:${maxMovies}`;
  return await cacheService.fetchOrSet(
    kvKey,
    () => executeTmdbActorFlow(actorQuery, canonicalName, aliases, cacheKey, maxMovies, concurrency),
    14 * 86400 // 14 ngày
  );
}

async function executeTmdbActorFlow(
  actorQuery: string,
  canonicalName: string | undefined,
  aliases: string[],
  cacheKey: string,
  maxMovies = 250,
  concurrency = 8
): Promise<any[]> {
  const tTotalStart = performance.now();
  try {
    // 1. Tìm diễn viên trên TMDB
    const tPersonStart = performance.now();
    const person = await searchTmdbPerson(actorQuery, canonicalName, aliases);
    const tPersonEnd = performance.now();

    if (!person || !person.id) {
      return [];
    }

    // 2. Lấy danh sách phim mà diễn viên tham gia từ TMDB
    const tCreditsStart = performance.now();
    const credits = await getTmdbPersonMovieCredits(person.id);
    const tCreditsEnd = performance.now();

    if (!credits || credits.length === 0) {
      return [];
    }

    // 3. Đối chiếu TMDB ID với KKPhim và NguonC (Giới hạn động theo maxMovies, tối đa 80 phim)
    const tMatchStart = performance.now();
    const checkLimit = Math.min(maxMovies, 80);
    const matchedMovies = await matchTmdbMoviesWithSources(credits, checkLimit, concurrency);
    const tMatchEnd = performance.now();

    const tTotalEnd = performance.now();
    console.log(
      `[TMDB Actor Flow: ${person.name}] Person: ${(tPersonEnd - tPersonStart).toFixed(0)}ms | Credits: ${(tCreditsEnd - tCreditsStart).toFixed(0)}ms | Sources Match: ${(tMatchEnd - tMatchStart).toFixed(0)}ms | Total: ${(tTotalEnd - tTotalStart).toFixed(0)}ms`
    );

    // Lưu cache 2 giờ tươi, 24 giờ stale
    const now = Date.now();
    TMDB_ACTOR_MOVIES_CACHE.set(cacheKey, {
      data: matchedMovies,
      expireAt: now + 2 * 3600 * 1000,
      staleUntil: now + 24 * 3600 * 1000,
    });

    return matchedMovies.slice(0, maxMovies);
  } catch (err) {
    console.error("[TMDB Actor Flow] Execution error:", err);
    return [];
  }
}

export type TmdbRankType = "week" | "month" | "top_rated";

/**
 * 10. LẤY DANH SÁCH BẢNG XẾP HẠNG TMDB (WEEK / MONTH / TOP_RATED) ĐÃ ĐỐI CHIẾU CATALOG NANAFLIX
 * - week: TMDB /trending/movie/week (Thịnh hành trong tuần)
 * - month: TMDB /movie/popular (Nổi bật trong tháng)
 * - top_rated: TMDB /movie/top_rated (Top phim hay nhất mọi thời đại, vote_count >= 300)
 * - Đối chiếu PhimAPI & NguonC qua matchTmdbMoviesWithSources()
 * - SWR Cache In-Memory: Phản hồi 0ms
 */
export async function getTmdbRankedMovies(
  type: TmdbRankType = "week",
  limit = 10,
  concurrency = 8
): Promise<any[]> {
  const cacheKey = `TMDB_RANKED_${type}_V3`;
  const now = Date.now();
  const cached = TMDB_TRENDING_MOVIES_CACHE.get(cacheKey);

  if (cached) {
    if (cached.expireAt > now) {
      return cached.data.slice(0, limit);
    }
    if (cached.staleUntil > now) {
      setTimeout(() => {
        executeTmdbRankingQuery(type, cacheKey, limit, concurrency).catch(() => {});
      }, 100);
      return cached.data.slice(0, limit);
    }
  }

  const kvKey = `tmdb:ranked_movies:${type}:${limit}:v3`;
  return await cacheService.fetchOrSet(
    kvKey,
    () => executeTmdbRankingQuery(type, cacheKey, limit, concurrency),
    12 * 3600 // 12 giờ trên Cloudflare KV / Redis
  );
}

// Backward-compatible alias
export async function getTmdbTrendingMovies(
  timeWindow: "day" | "week" = "week",
  limit = 10,
  concurrency = 8
): Promise<any[]> {
  return getTmdbRankedMovies(timeWindow === "day" ? "week" : "week", limit, concurrency);
}

async function executeTmdbRankingQuery(
  type: TmdbRankType,
  cacheKey: string,
  limit: number,
  concurrency: number
): Promise<any[]> {
  try {
    let endpoint = `/trending/movie/week?language=vi-VN`;
    let revalidateTime = 21600; // 6 giờ cho trending tuần

    if (type === "month") {
      endpoint = `/movie/popular?language=vi-VN`;
      revalidateTime = 21600; // 6 giờ cho popular tháng
    } else if (type === "top_rated") {
      endpoint = `/movie/top_rated?language=vi-VN`;
      revalidateTime = 86400; // 24 giờ cho top rated
    }

    const data = await fetchTmdbEndpoint(endpoint, revalidateTime);
    let rawResults = Array.isArray(data?.results) ? data.results : [];
    if (rawResults.length === 0) return [];

    // Đối với top_rated: lọc bỏ phim có quá ít lượt vote để đảm bảo danh sách uy tín
    if (type === "top_rated") {
      rawResults = rawResults.filter((m: any) => Number(m.vote_count || 0) >= 300);
    }

    const credits: TmdbMovieCredit[] = rawResults.map((m: any) => ({
      id: m.id,
      title: m.title || m.name || "",
      original_title: m.original_title || m.original_name || "",
      release_date: m.release_date || m.first_air_date || "",
      vote_average: Number(m.vote_average || 0),
      vote_count: Number(m.vote_count || 0),
      popularity: Number(m.popularity || 0),
      poster_path: m.poster_path || null,
      backdrop_path: m.backdrop_path || null,
      overview: m.overview || "",
      media_type: m.media_type || "movie",
    }));

    const matchedMovies = await matchTmdbMoviesWithSources(credits, 25, concurrency);

    const now = Date.now();
    TMDB_TRENDING_MOVIES_CACHE.set(cacheKey, {
      data: matchedMovies,
      expireAt: now + 6 * 3600 * 1000, // 6h tươi
      staleUntil: now + 24 * 3600 * 1000, // 24h stale
    });

    return matchedMovies.slice(0, limit);
  } catch (err) {
    console.warn(`[TMDB Ranking Query: ${type}] Error fetching ranking:`, err);
    return [];
  }
}

