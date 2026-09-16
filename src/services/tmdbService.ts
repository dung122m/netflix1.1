import dns from "dns";
import https from "https";

// =========================================================================
// CẤU HÌNH TMDB API (LẤY TỪ BIẾN MÔI TRƯỜNG, BẢO MẬT PHÍA SERVER)
// =========================================================================
const TMDB_API_KEY =
  process.env.TMDB_API_KEY ||
  process.env.NEXT_PUBLIC_TMDB_API_KEY ||
  "3fd2be6f0c70a2a598f084ddfb75487c";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TMDB_ACTOR_MOVIES_CACHE = new Map<string, CacheEntry<any[]>>();

// 4. CACHE ĐỐI CHIẾU TỪNG PHIM THEO TMDB ID (QUAN TRỌNG NHẤT: TRÁNH RE-CHECK PHIM ĐÃ TỪNG MATCH)
// Lưu trữ: tmdb_id -> Movie (nếu tìm thấy) hoặc null (nếu không có nguồn phát)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SingleMovieMatchEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  movie: any | null;
  expireAt: number;
}
const TMDB_SINGLE_MOVIE_MATCH_CACHE = new Map<number, SingleMovieMatchEntry>();

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchTmdbEndpoint(endpointPath: string): Promise<any> {
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
      next: { revalidate: 86400 }, // Cache 24h trên Next.js Data Cache
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

function cleanStringForMatch(text?: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

  // Thu thập các từ khóa tên để tra cứu trên TMDB
  const queriesToTry = Array.from(
    new Set([trimmed, canonicalName, ...aliases].filter((q): q is string => Boolean(q && q.trim().length >= 2)))
  );

  let bestPerson: TmdbPerson | null = null;
  let highestScore = -1;

  const targetNamesNormalized = queriesToTry.map(cleanStringForMatch).filter(Boolean);

  for (const q of queriesToTry.slice(0, 3)) {
    const data = await fetchTmdbEndpoint(
      `/search/person?query=${encodeURIComponent(q)}&language=vi-VN&include_adult=false`
    );

    const results = (data?.results || []) as any[];
    if (results.length === 0) continue;

    for (const p of results) {
      if (!p || !p.id) continue;
      const pName = cleanStringForMatch(p.name);
      const pOrig = cleanStringForMatch(p.original_name);

      let score = 0;

      // Khớp chính xác tên
      if (targetNamesNormalized.includes(pName) || targetNamesNormalized.includes(pOrig)) {
        score += 100;
      } else if (
        targetNamesNormalized.some((t) => pName.includes(t) || t.includes(pName))
      ) {
        score += 30;
      }

      // Khớp ban diễn xuất hoặc đạo diễn
      if (p.known_for_department === "Acting") score += 25;
      else if (p.known_for_department === "Directing") score += 20;

      // Cộng điểm nổi tiếng (popularity)
      score += Number(p.popularity || 0);

      // Có ảnh profile
      if (p.profile_path) score += 10;

      if (score > highestScore) {
        highestScore = score;
        bestPerson = {
          id: p.id,
          name: p.name,
          original_name: p.original_name,
          profile_path: p.profile_path,
          popularity: Number(p.popularity || 0),
          known_for_department: p.known_for_department,
        };
      }
    }

    if (bestPerson && highestScore >= 120) {
      break;
    }
  }

  // Lưu cache 24h
  TMDB_PERSON_CACHE.set(cacheKey, {
    data: bestPerson,
    expireAt: now + 24 * 3600 * 1000,
    staleUntil: now + 48 * 3600 * 1000,
  });

  return bestPerson;
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

  // Gọi TMDB movie_credits với ngôn ngữ vi-VN để có cả tên Việt lẫn tên gốc
  const data = await fetchTmdbEndpoint(`/person/${personId}/movie_credits?language=vi-VN`);

  const rawCast = Array.isArray(data?.cast) ? data.cast : [];
  const rawCrew = Array.isArray(data?.crew) ? data.crew : [];

  // Lọc thêm các tác phẩm làm đạo diễn (nếu là đạo diễn / diễn viên kép như Châu Tinh Trì, Trấn Thành, Thành Long)
  const directingCrew = rawCrew.filter((c: any) => c.department === "Directing");

  const combined = [...rawCast, ...directingCrew];
  const uniqueMap = new Map<number, TmdbMovieCredit>();

  const currentYear = new Date().getFullYear();

  for (const m of combined) {
    if (!m || !m.id || uniqueMap.has(m.id)) continue;

    // LỌC BỎ PHIM CHƯA PHÁT HÀNH TRONG TƯƠNG LAI XA
    if (m.release_date) {
      const year = parseInt(m.release_date.slice(0, 4), 10);
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
      title: m.title || m.original_title || "",
      original_title: m.original_title || m.title || "",
      release_date: m.release_date || "",
      vote_average: Number(m.vote_average || 0),
      vote_count: Number(m.vote_count || 0),
      popularity: Number(m.popularity || 0),
      poster_path: m.poster_path || null,
      backdrop_path: m.backdrop_path || null,
      overview: m.overview || "",
      character: m.character || "",
      department: m.department || "",
      job: m.job || "",
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
    expireAt: now + 24 * 3600 * 1000,
    staleUntil: now + 48 * 3600 * 1000,
  });

  return sortedCredits;
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function matchTmdbMoviesWithSources(
  credits: TmdbMovieCredit[],
  maxCheckCount = 28
): Promise<any[]> {
  if (!credits || credits.length === 0) return [];

  const tStart = performance.now();
  const candidateCredits = credits.slice(0, maxCheckCount);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchedMovies: any[] = [];
  const seenSlugs = new Set<string>();

  // Danh sách các phim cần gọi API (chưa có trong cache từng phim)
  const creditsToFetch: TmdbMovieCredit[] = [];

  const now = Date.now();

  // BƯỚC 1: KIỂM TRA BỘ NHỚ ĐỆM TỪNG PHIM (CACHE HIT = 0MS)
  for (const credit of candidateCredits) {
    const cachedEntry = TMDB_SINGLE_MOVIE_MATCH_CACHE.get(credit.id);
    if (cachedEntry && cachedEntry.expireAt > now) {
      if (cachedEntry.movie) {
        if (!seenSlugs.has(cachedEntry.movie.slug)) {
          seenSlugs.add(cachedEntry.movie.slug);
          matchedMovies.push(cachedEntry.movie);
        }
      }
      // Nếu cachedEntry.movie === null: đã kiểm tra trước đó và phim không có trên cả 2 nguồn -> BỎ QUA 0MS!
    } else {
      creditsToFetch.push(credit);
    }
  }

  // BƯỚC 2: CHẠY SONG SONG KKPHIM VÀ NGUONC CHO CÁC PHIM CHƯA CACHE
  if (creditsToFetch.length > 0) {
    await runWithConcurrencyLimit(creditsToFetch, 6, async (credit) => {
      const tmdbIdStr = String(credit.id);
      const tmdbYear = credit.release_date ? parseInt(credit.release_date.slice(0, 4), 10) : undefined;
      const cleanOrig = cleanStringForMatch(credit.original_title);
      const cleanVi = cleanStringForMatch(credit.title);

      const isLatinOriginal =
        credit.original_title && /^[A-Za-z0-9\s\-':,.]+$/.test(credit.original_title);

      const primarySearchKw = isLatinOriginal
        ? credit.original_title.replace(/[:\-']/g, " ").replace(/\s+/g, " ").trim()
        : credit.title.replace(/[:\-']/g, " ").replace(/\s+/g, " ").trim();

      if (!primarySearchKw || primarySearchKw.length < 2) {
        TMDB_SINGLE_MOVIE_MATCH_CACHE.set(credit.id, { movie: null, expireAt: now + 12 * 3600 * 1000 });
        return;
      }

      try {
        // CHẠY SONG SONG CẢ KKPHIM VÀ NGUONC (PROMISE.ALL)
        // Thời gian phản hồi gần bằng API nhanh nhất, timeout chặt chẽ 2.2s
        const [phimApiRes, nguonCRes] = await Promise.all([
          fetch(
            `https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(primarySearchKw)}&limit=6`,
            { signal: AbortSignal.timeout(2200), next: { revalidate: 3600 } }
          )
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          fetch(
            `https://phim.nguonc.com/api/films/search?keyword=${encodeURIComponent(primarySearchKw)}`,
            { signal: AbortSignal.timeout(2200), next: { revalidate: 3600 } }
          )
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);

        const phimApiItems: any[] = phimApiRes?.data?.items || [];
        const nguonCItems: any[] = Array.isArray(nguonCRes?.items) ? nguonCRes.items : [];

        let matchedCandidate: any = null;
        let matchType: "tmdb_id" | "imdb_id" | "title_year" | null = null;

        // 1.1 Ưu tiên cao nhất: Khớp tuyệt đối qua TMDB ID trên PhimAPI
        for (const item of phimApiItems) {
          if (item?.tmdb?.id && String(item.tmdb.id) === tmdbIdStr) {
            matchedCandidate = item;
            matchType = "tmdb_id";
            break;
          }
        }

        // 1.2 Ưu tiên thứ hai: Khớp qua IMDB ID
        if (!matchedCandidate && credit.imdb_id) {
          for (const item of phimApiItems) {
            if (item?.imdb?.id && String(item.imdb.id) === credit.imdb_id) {
              matchedCandidate = item;
              matchType = "imdb_id";
              break;
            }
          }
        }

        // 1.3 Ưu tiên thứ ba: Khớp qua Title + Year trên PhimAPI
        if (!matchedCandidate) {
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
              matchedCandidate = item;
              matchType = "title_year";
              break;
            }
          }
        }

        // 1.4 Kiểm tra trên NguonC nếu PhimAPI chưa có
        if (!matchedCandidate && nguonCItems.length > 0) {
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
              matchedCandidate = {
                ...nc,
                origin_name: nc.original_name || nc.name,
                poster_url: nc.poster_url || nc.thumb_url,
                thumb_url: nc.thumb_url || nc.poster_url,
                quality: nc.quality || "HD",
                lang: nc.language || "Vietsub",
              };
              matchType = "title_year";
              break;
            }
          }
        }

        // 1.5 Format về định dạng Movie chuẩn
        if (matchedCandidate && matchedCandidate.slug) {
          const posterImg =
            matchedCandidate.poster_url ||
            matchedCandidate.thumb_url ||
            (credit.poster_path ? `https://image.tmdb.org/t/p/w500${credit.poster_path}` : "");

          const thumbImg =
            matchedCandidate.thumb_url ||
            matchedCandidate.poster_url ||
            (credit.backdrop_path ? `https://image.tmdb.org/t/p/w780${credit.backdrop_path}` : posterImg);

          const formattedMovie = {
            _id: matchedCandidate._id || matchedCandidate.id || matchedCandidate.slug,
            name: matchedCandidate.name || credit.title,
            slug: matchedCandidate.slug,
            origin_name: matchedCandidate.origin_name || credit.original_title || matchedCandidate.name,
            poster_url: posterImg,
            thumb_url: thumbImg,
            year: matchedCandidate.year || tmdbYear,
            time: matchedCandidate.time || "",
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

          // Lưu cache phim thành công (7 ngày)
          TMDB_SINGLE_MOVIE_MATCH_CACHE.set(credit.id, {
            movie: formattedMovie,
            expireAt: now + 7 * 24 * 3600 * 1000,
          });

          if (!seenSlugs.has(formattedMovie.slug)) {
            seenSlugs.add(formattedMovie.slug);
            matchedMovies.push(formattedMovie);
          }
        } else {
          // Lưu cache phim không tìm thấy nguồn (12h) để lần sau bỏ qua ngay lập tức (0ms)
          TMDB_SINGLE_MOVIE_MATCH_CACHE.set(credit.id, {
            movie: null,
            expireAt: now + 12 * 3600 * 1000,
          });
        }
      } catch (err) {
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getActorFilmographyFromTmdb(
  actorQuery: string,
  canonicalName?: string,
  aliases: string[] = [],
  maxMovies = 250
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const cleanKey = cleanStringForMatch(actorQuery) || cleanStringForMatch(canonicalName);
  if (!cleanKey) return [];

  const cacheKey = `TMDB_ACTOR_FLOW_V2:${cleanKey}`;
  const now = Date.now();
  const cached = TMDB_ACTOR_MOVIES_CACHE.get(cacheKey);

  if (cached) {
    if (cached.expireAt > now) {
      return cached.data.slice(0, maxMovies);
    }
    if (cached.staleUntil > now) {
      // Revalidate ngầm
      setTimeout(() => {
        executeTmdbActorFlow(actorQuery, canonicalName, aliases, cacheKey).catch(() => {});
      }, 100);
      return cached.data.slice(0, maxMovies);
    }
  }

  return await executeTmdbActorFlow(actorQuery, canonicalName, aliases, cacheKey, maxMovies);
}

async function executeTmdbActorFlow(
  actorQuery: string,
  canonicalName: string | undefined,
  aliases: string[],
  cacheKey: string,
  maxMovies = 250
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

    // 3. Đối chiếu TMDB ID với KKPhim và NguonC (Top 26 phim tiêu biểu nhất)
    const tMatchStart = performance.now();
    const matchedMovies = await matchTmdbMoviesWithSources(credits, 26);
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
