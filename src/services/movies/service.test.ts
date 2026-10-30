import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { movieApi, deduplicateServerEpisodes, buildMovieCacheKey, deduplicateMovieItems } from "./service";
import { formatCountryName, extractMovieCountry, normalizeMovie } from "@/lib/movieMedia";

describe("Nanaflix Movie Browse Pagination & Filter Service", () => {
  // A. /browse?category=hai-huoc&page=1
  it("A. /browse?category=hai-huoc&page=1 returns valid items, pagination, and totalPages", async () => {
    const res = await movieApi.getMovies({ category: "hai-huoc", page: 1, limit: 24, skipKvCache: true });
    assert.equal(res.status, true);
    assert.ok(Array.isArray(res.items));
    assert.ok(res.items.length > 0 && res.items.length <= 24, "Page 1 of hai-huoc should return <= 24 items");
    assert.equal(res.pagination.currentPage, 1);
    assert.ok(res.pagination.totalItems > 0, "totalItems should be greater than 0");
    assert.equal(
      res.pagination.totalPages,
      Math.ceil(res.pagination.totalItems / 24),
      "totalPages must equal Math.ceil(totalItems / 24)"
    );
  });

  // B. /browse?category=hai-huoc&page=<lastPage>
  it("B. /browse?category=hai-huoc&page=<lastPage> returns non-empty slice <= 24 items", async () => {
    const resP1 = await movieApi.getMovies({ category: "hai-huoc", page: 1, limit: 24, skipKvCache: true });
    const lastPage = resP1.pagination.totalPages;
    assert.ok(lastPage >= 1, "lastPage should be at least 1");

    const resLast = await movieApi.getMovies({ category: "hai-huoc", page: lastPage, limit: 24, skipKvCache: true });
    assert.equal(resLast.status, true);
    assert.ok(resLast.items.length > 0, "Last page of hai-huoc must NOT be empty");
    assert.ok(resLast.items.length <= 24, "Last page items count must be <= 24");
    assert.equal(resLast.pagination.currentPage, lastPage);
    assert.equal(
      resLast.pagination.totalPages,
      Math.ceil(resLast.pagination.totalItems / 24),
      "totalPages must equal Math.ceil(totalItems / 24)"
    );
  });

  // C. /browse?country=thai-lan&page=1
  it("C. /browse?country=thai-lan&page=1 returns valid items and correct pagination", async () => {
    const res = await movieApi.getMovies({ country: "thai-lan", page: 1, limit: 24, skipKvCache: true });
    assert.equal(res.status, true);
    assert.ok(Array.isArray(res.items));
    assert.equal(res.items.length, 24, "Page 1 of thai-lan should return 24 items");
    assert.equal(res.pagination.currentPage, 1);
    assert.ok(res.pagination.totalItems > 0);
    assert.equal(
      res.pagination.totalPages,
      Math.ceil(res.pagination.totalItems / 24),
      "totalPages must equal Math.ceil(totalItems / 24)"
    );
  });

  // D. /browse?country=thai-lan&page=<lastPage>
  it("D. /browse?country=thai-lan&page=<lastPage> returns non-empty slice <= 24 items", async () => {
    const resP1 = await movieApi.getMovies({ country: "thai-lan", page: 1, limit: 24, skipKvCache: true });
    const lastPage = resP1.pagination.totalPages;
    assert.ok(lastPage >= 1, "lastPage should be at least 1");

    const resLast = await movieApi.getMovies({ country: "thai-lan", page: lastPage, limit: 24, skipKvCache: true });
    assert.equal(resLast.status, true);
    assert.ok(resLast.items.length > 0, "Last page of thai-lan must NOT be empty");
    assert.ok(resLast.items.length <= 24, "Last page items count must be <= 24");
    assert.equal(resLast.pagination.currentPage, lastPage);
    assert.equal(
      resLast.pagination.totalPages,
      Math.ceil(resLast.pagination.totalItems / 24),
      "totalPages must equal Math.ceil(totalItems / 24)"
    );
  });

  // E. /browse?category=tai-lieu&page=<lastPage>
  it("E. /browse?category=tai-lieu&page=<lastPage> returns non-empty slice <= 24 items", async () => {
    const resP1 = await movieApi.getMovies({ category: "tai-lieu", page: 1, limit: 24, skipKvCache: true });
    const lastPage = resP1.pagination.totalPages;
    assert.ok(lastPage >= 1, "lastPage should be at least 1");

    const resLast = await movieApi.getMovies({ category: "tai-lieu", page: lastPage, limit: 24, skipKvCache: true });
    assert.equal(resLast.status, true);
    assert.ok(resLast.items.length > 0, "Last page of tai-lieu must NOT be empty");
    assert.ok(resLast.items.length <= 24, "Last page items count must be <= 24");
    assert.equal(resLast.pagination.currentPage, lastPage);
    assert.equal(
      resLast.pagination.totalPages,
      Math.ceil(resLast.pagination.totalItems / 24),
      "totalPages must equal Math.ceil(totalItems / 24)"
    );
  });

  // F. Một case có movie chỉ tồn tại ở PhimAPI
  it("F. Movie existing only in PhimAPI is retained in dataset", async () => {
    const res = await movieApi.getMovies({ category: "tai-lieu", page: 1, limit: 24, skipKvCache: true });
    // Verify that items from PhimAPI domain or format are included
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasPhimApiItem = res.items.some((item: any) =>
      item.thumb_url?.includes("phimimg.com") ||
      (Array.isArray(item.category) && item.category.length > 1)
    );
    assert.ok(hasPhimApiItem, "Dataset must retain movies from PhimAPI");
  });

  // G. Một case có movie chỉ tồn tại ở NguonC
  it("G. Movie existing only in NguonC is retained in dataset and not dropped by filter", async () => {
    const res = await movieApi.getMovies({ category: "tai-lieu", page: 1, limit: 24, skipKvCache: true });
    // Verify NguonC items are present
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasNguonCItem = res.items.some((item: any) =>
      item.thumb_url?.includes("phim.nguonc.com") ||
      item.poster_url?.includes("phim.nguonc.com") ||
      item.thumb_url?.includes("img.nguonc.com") ||
      item.poster_url?.includes("img.nguonc.com")
    );
    assert.ok(hasNguonCItem, "Dataset must retain movies from NguonC without dropping them");
  });

  // H. Một case movie tồn tại ở cả hai source với cùng slug → chỉ 1 movie
  it("H. Movie existing in both sources with same slug is deduplicated to exactly 1 movie", async () => {
    const resP1 = await movieApi.getMovies({ category: "tai-lieu", page: 1, limit: 100, skipKvCache: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const slugs = resP1.items.map((m: any) => m.slug);
    const uniqueSlugs = new Set(slugs);
    assert.equal(
      slugs.length,
      uniqueSlugs.size,
      "There must be no duplicate slugs in the returned items"
    );
  });

  // I. Case hai source có các movie khác nhau → không được mất movie chỉ vì merge
  it("I. Two sources with different movies are both preserved without loss", async () => {
    const res = await movieApi.getMovies({ category: "tai-lieu", page: 1, limit: 24, skipKvCache: true });
    // Both sources contribute items to the browsable list
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sourcePhimApi = res.items.filter((i: any) => i.thumb_url?.includes("phimimg.com")).length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sourceNguonC = res.items.filter((i: any) =>
      i.thumb_url?.includes("nguonc") || i.poster_url?.includes("nguonc")
    ).length;
    assert.ok(sourcePhimApi > 0, "PhimAPI items must be preserved");
    assert.ok(sourceNguonC > 0, "NguonC items must be preserved");
  });

  // J. Kiểm tra page cuối không trả [] nếu totalItems > 0
  it("J. Last page never returns empty array [] when totalItems > 0", async () => {
    const testCases = [
      { category: "tai-lieu" },
      { country: "thai-lan" },
      { category: "hai-huoc" },
    ];
    for (const tc of testCases) {
      const p1 = await movieApi.getMovies({ ...tc, page: 1, limit: 24, skipKvCache: true });
      if (p1.pagination.totalItems > 0) {
        const lastPage = p1.pagination.totalPages;
        const pLast = await movieApi.getMovies({ ...tc, page: lastPage, limit: 24, skipKvCache: true });
        assert.ok(
          pLast.items.length > 0,
          `Last page ${lastPage} for filter ${JSON.stringify(tc)} must not be empty []`
        );
      }
    }
  });

  // K. Kiểm tra: items.length <= 24 và totalPages === Math.ceil(totalItems / 24)
  it("K. Strict invariant: items.length <= 24 and totalPages === Math.ceil(totalItems / 24)", async () => {
    const queries = [
      { category: "hai-huoc", page: 1 },
      { country: "thai-lan", page: 1 },
      { category: "tai-lieu", page: 1 },
      { type: "phim-bo", page: 1 },
      { type: "phim-le", page: 1 },
    ];

    for (const q of queries) {
      const res = await movieApi.getMovies({ ...q, limit: 24, skipKvCache: true });
      assert.ok(
        res.items.length <= 24,
        `Query ${JSON.stringify(q)} returned ${res.items.length} items, which exceeds 24`
      );
      assert.equal(
        res.pagination.totalPages,
        Math.ceil(res.pagination.totalItems / 24),
        `Query ${JSON.stringify(q)} totalPages must equal Math.ceil(totalItems / 24)`
      );
    }
  });

  // L. Regression: totalItems and totalPages must be strictly invariant across page=1, page=20, page=last
  it("L. Regression: totalItems and totalPages are strictly invariant across page=1, page=20, page=last", async () => {
    const resP1 = await movieApi.getMovies({ category: "hai-huoc", page: 1, limit: 24, skipKvCache: true });
    const lastPage = resP1.pagination.totalPages;

    const resP20 = await movieApi.getMovies({ category: "hai-huoc", page: 20, limit: 24, skipKvCache: true });
    const resLast = await movieApi.getMovies({ category: "hai-huoc", page: lastPage, limit: 24, skipKvCache: true });

    assert.equal(resP20.pagination.totalItems, resP1.pagination.totalItems, "totalItems on page 20 must equal page 1");
    assert.equal(resP20.pagination.totalPages, resP1.pagination.totalPages, "totalPages on page 20 must equal page 1");

    assert.equal(resLast.pagination.totalItems, resP1.pagination.totalItems, "totalItems on last page must equal page 1");
    assert.equal(resLast.pagination.totalPages, resP1.pagination.totalPages, "totalPages on last page must equal page 1");
  });

  // Q. Valid slice and metadata on search or filter query
  it("Q. Valid slice and metadata on search or filter query", async () => {
    const res = await movieApi.getMovies({
      country: "an-do",
      page: 1,
      limit: 24,
      skipKvCache: true,
    });
    assert.equal(res.status, true);
    assert.ok(Array.isArray(res.items));
    assert.ok(res.pagination.totalItems >= 0);
    assert.equal(res.pagination.totalPages, Math.max(1, Math.ceil(res.pagination.totalItems / 24)));
  });

  // R. deduplicateServerEpisodes correctly deduplicates duplicate episodes by slug and name
  it("R. deduplicateServerEpisodes removes duplicate episodes like tap-14, tap-15 cleanly", () => {
    const rawEpisodes = [
      { name: "Tập 13", slug: "tap-13", link_m3u8: "url-13" },
      { name: "Tập 14", slug: "tap-14", link_m3u8: "url-14-a" },
      { name: "Tập 14", slug: "tap-14", link_m3u8: "url-14-b" },
      { name: "Tập 15", slug: "tap-15", link_m3u8: "url-15-a" },
      { name: "Tập 15", slug: "tap-15", link_m3u8: "url-15-b" },
      { name: "Tập 16", slug: "tap-16", link_m3u8: "url-16" },
    ];

    const deduplicated = deduplicateServerEpisodes(rawEpisodes);
    assert.equal(deduplicated.length, 4, "Must deduplicate from 6 to 4 episodes");
    assert.deepEqual(
      deduplicated.map((e) => e.slug),
      ["tap-13", "tap-14", "tap-15", "tap-16"]
    );
    assert.equal(deduplicated[1].link_m3u8, "url-14-a", "Must retain first valid stream");
  });

  // S. movieApi.getMovieDetail for 'di-giua-troi-ruc-ro' has strictly unique episodes without duplicate keys
  it("S. getMovieDetail deduplicates episodes for 'di-giua-troi-ruc-ro'", async () => {
    const detail = await movieApi.getMovieDetail("di-giua-troi-ruc-ro");
    assert.ok(detail, "Movie detail must exist");
    const episodes = detail.episodes || detail.movie?.episodes || [];
    assert.ok(episodes.length > 0, "Must have episode servers");

    for (const srv of episodes) {
      const serverData = srv.server_data || [];
      const slugs = serverData.map((e: { slug?: string }) => e.slug);
      const uniqueSlugs = new Set(slugs);
      assert.equal(
        slugs.length,
        uniqueSlugs.size,
        `All episode slugs in server '${srv.server_name}' must be strictly unique (found duplicates: ${slugs.length} vs ${uniqueSlugs.size})`
      );
    }
  });

  // T. Toàn bộ loại phim (phim-le, phim-bo, hoat-hinh, tv-shows) tuân thủ công thức phân trang
  it("T. All movie types (phim-le, phim-bo, hoat-hinh, tv-shows) obey pagination invariants", async () => {
    const types = ["phim-le", "phim-bo", "hoat-hinh", "tv-shows"] as const;
    for (const t of types) {
      const res = await movieApi.getMovies({ type: t, page: 1, limit: 24, skipKvCache: true });
      assert.equal(res.status, true);
      assert.ok(res.items.length > 0 && res.items.length <= 24, `Type ${t} must return 1-24 items`);
      assert.ok(res.pagination.totalItems > 0, `Type ${t} totalItems must be > 0`);
      assert.equal(
        res.pagination.totalPages,
        Math.ceil(res.pagination.totalItems / 24),
        `Type ${t} totalPages must equal Math.ceil(totalItems / 24)`
      );
    }
  });

  // U. Compound filter (type + country, type + category) metadata invariance across page 1 and page 2
  it("U. Compound filter (type + country) metadata is invariant across page 1 and page 2", async () => {
    const p1 = await movieApi.getMovies({
      type: "phim-le",
      country: "han-quoc",
      page: 1,
      limit: 24,
      skipKvCache: true,
    });
    const p2 = await movieApi.getMovies({
      type: "phim-le",
      country: "han-quoc",
      page: 2,
      limit: 24,
      skipKvCache: true,
    });
    assert.equal(p1.status, true);
    assert.equal(p2.status, true);
    assert.ok(p1.pagination.totalItems > 0, "Compound filter must return items");
    assert.equal(p2.pagination.totalItems, p1.pagination.totalItems, "totalItems must match across pages");
    assert.equal(p2.pagination.totalPages, p1.pagination.totalPages, "totalPages must match across pages");
  });

  // V. Keyword search pagination metadata consistency
  it("V. Search query has consistent pagination metadata and non-empty items", async () => {
    const res = await movieApi.getMovies({
      keyword: "tinh yeu",
      page: 1,
      limit: 24,
      skipKvCache: true,
    });
    assert.equal(res.status, true);
    assert.ok(Array.isArray(res.items));
    assert.ok(res.pagination.totalItems >= res.items.length);
    assert.equal(
      res.pagination.totalPages,
      Math.max(1, Math.ceil(res.pagination.totalItems / 24))
    );
  });

  // W. Cache key generation produces correct version 12 and includes all filter fields
  it("W. buildMovieCacheKey generates version 13 with normalized filter parameters", () => {
    const key = buildMovieCacheKey({
      type: "phim-le",
      category: "hanh-dong",
      country: "han-quoc",
      year: "2024",
      page: 2,
      limit: 24,
      sort: "rating",
    });
    const parsed = JSON.parse(key);
    assert.equal(parsed.v, 13, "Cache key version must be 13");
    assert.equal(parsed.type, "phim-le");
    assert.equal(parsed.category, "hanh-dong");
    assert.equal(parsed.country, "han-quoc");
    assert.equal(parsed.year, "2024");
    assert.equal(parsed.page, 2);
    assert.equal(parsed.sort, "rating");
  });

  // X. Country name normalization and slug formatting
  it("X. formatCountryName maps raw slug strings and ISO codes to proper Vietnamese names", () => {
    assert.equal(formatCountryName("viet-nam"), "Việt Nam");
    assert.equal(formatCountryName("Viet-nam"), "Việt Nam");
    assert.equal(formatCountryName("trung-quoc"), "Trung Quốc");
    assert.equal(formatCountryName("Trung-quoc"), "Trung Quốc");
    assert.equal(formatCountryName("han-quoc"), "Hàn Quốc");
    assert.equal(formatCountryName("nhat-ban"), "Nhật Bản");
    assert.equal(formatCountryName("thai-lan"), "Thái Lan");
    assert.equal(formatCountryName("au-my"), "Âu Mỹ");
    assert.equal(formatCountryName("dai-loan"), "Đài Loan");
    assert.equal(formatCountryName("hong-kong"), "Hồng Kông");
    assert.equal(formatCountryName("an-do"), "Ấn Độ");
    assert.equal(formatCountryName("phap"), "Pháp");
    assert.equal(formatCountryName("duc"), "Đức");
    assert.equal(formatCountryName("y"), "Ý");
    assert.equal(formatCountryName("uc"), "Úc");
    assert.equal(formatCountryName("my"), "Mỹ");
    assert.equal(formatCountryName("tay-ban-nha"), "Tây Ban Nha");
    assert.equal(formatCountryName("tho-nhi-ky"), "Thổ Nhĩ Kỳ");
    assert.equal(formatCountryName("philippines"), "Philippines");

    // Object and array inputs
    assert.equal(formatCountryName({ name: "viet-nam", slug: "viet-nam" }), "Việt Nam");
    assert.equal(formatCountryName({ slug: "trung-quoc" }), "Trung Quốc");

    // extractMovieCountry integration
    assert.equal(extractMovieCountry({ country: [{ name: "viet-nam" }] }), "Việt Nam");
    assert.equal(extractMovieCountry({ country: [{ name: "trung-quoc", slug: "trung-quoc" }] }), "Trung Quốc");
    assert.equal(extractMovieCountry({ country_name: "Viet-nam" }), "Việt Nam");
    assert.equal(extractMovieCountry({ countries: ["han-quoc"] }), "Hàn Quốc");
  });

  // =========================================================================
  // GIAI ĐOẠN C — KIỂM THỬ HỒI QUY METADATA MEDIACARD (9 TRƯỜNG HỢP)
  // =========================================================================
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function computeMediaCardMeta(rawMovie: any) {
    const norm = normalizeMovie(rawMovie);

    const displayYear = (() => {
      if (!norm.year) return "";
      const parsed = typeof norm.year === "number" ? norm.year : parseInt(String(norm.year).trim(), 10);
      const maxYear = new Date().getFullYear() + 2;
      if (Number.isFinite(parsed) && parsed >= 1920 && parsed <= maxYear) {
        return String(parsed);
      }
      return "";
    })();

    const mainGenre = (() => {
      if (!norm.genre || typeof norm.genre !== "string") return "";
      const parts = norm.genre
        .split(/[,/]/)
        .map((s) => s.trim())
        .filter(Boolean);

      for (const part of parts) {
        const lower = part.toLowerCase();
        if (
          lower === "phim lẻ" ||
          lower === "phim bộ" ||
          lower === "phimle" ||
          lower === "phimbo" ||
          lower === "hoạt hình" ||
          lower === "tv shows" ||
          lower === "tvshows"
        ) {
          continue;
        }
        return part;
      }
      return "";
    })();

    const displayCountry = (() => {
      let raw = "";
      if (typeof norm.country === "string" && norm.country.trim()) {
        raw = formatCountryName(norm.country);
      } else if (norm.country && typeof norm.country === "object") {
        const record = norm.country as Record<string, unknown>;
        const list = Array.isArray(norm.country) ? (norm.country as unknown[]) : null;
        const firstItem = list && list.length > 0 ? (list[0] as Record<string, unknown>) : null;
        const maybeName =
          (record?.name as string | undefined) ||
          (record?.slug as string | undefined) ||
          (firstItem?.name as string | undefined) ||
          (firstItem?.slug as string | undefined);
        if (typeof maybeName === "string") raw = formatCountryName(maybeName);
      }

      if (!raw) {
        raw = extractMovieCountry({
          origin_name: norm.origin_name,
          title: norm.title,
          name: norm.title,
        }) || "";
      }
      if (!raw) return "";
      const formatted = formatCountryName(raw);
      if (mainGenre && formatted.toLowerCase() === mainGenre.toLowerCase()) {
        return "";
      }
      return formatted;
    })();

    const parts: string[] = [];
    if (displayYear) parts.push(displayYear);
    if (displayCountry && !parts.some((p) => p.toLowerCase() === displayCountry.toLowerCase())) {
      parts.push(displayCountry);
    }
    if (mainGenre && !parts.some((p) => p.toLowerCase() === mainGenre.toLowerCase())) {
      parts.push(mainGenre);
    }
    return parts.join(" • ");
  }

  // 1. Phim có đầy đủ năm, quốc gia và thể loại
  it("Y1. Phim có đầy đủ năm, quốc gia và thể loại hiển thị đầy đủ", () => {
    const movie = {
      name: "Matchbox: Phim Điện Ảnh",
      year: 2026,
      country: [{ name: "Âu Mỹ", slug: "au-my" }],
      category: [{ name: "Hành Động", slug: "hanh-dong" }],
    };
    const meta = computeMediaCardMeta(movie);
    assert.equal(meta, "2026 • Âu Mỹ • Hành Động");
  });

  // 2. Phim chỉ có năm, không có quốc gia hoặc thể loại
  it("Y2. Phim chỉ có năm, không có quốc gia hoặc thể loại chỉ hiển thị năm", () => {
    const movie = {
      name: "Unknown Old Film",
      year: 2015,
    };
    const meta = computeMediaCardMeta(movie);
    assert.equal(meta, "2015");
  });

  // 3. Phim TMDB có genre_ids nhưng chưa có tên thể loại
  it("Y3. Phim TMDB có genre_ids được ánh xạ sang tên thể loại tiếng Việt chuẩn", () => {
    const movie = {
      name: "Straight Outta Compton",
      year: 2015,
      genre_ids: [18, 10402, 36], // Tâm Lý, Âm Nhạc, Lịch Sử
      category: [],
    };
    const norm = normalizeMovie(movie);
    assert.equal(norm.genre, "Tâm Lý");
    assert.ok(norm.categories?.some((c) => c.name === "Tâm Lý"));
    assert.ok(norm.categories?.some((c) => c.name === "Âm Nhạc"));
    assert.ok(norm.categories?.some((c) => c.name === "Lịch Sử"));
    const meta = computeMediaCardMeta(movie);
    assert.equal(meta, "2015 • Tâm Lý");
  });

  // 4. Phim có category: [] từ một nguồn nhưng nguồn khác có thể loại hợp lệ
  it("Y4. Phim có category: [] không ghi đè thể loại hợp lệ từ nguồn khác", () => {
    const items = [
      { slug: "film-a", name: "Film A", year: 2023, category: [], source: "nguonc" },
      { slug: "film-a", name: "Film A", year: 2023, category: [{ name: "Hành Động", slug: "hanh-dong" }], source: "phimapi" },
    ];
    const deduplicated = deduplicateMovieItems(items);
    assert.equal(deduplicated.length, 1);
    assert.ok(Array.isArray(deduplicated[0].category) && deduplicated[0].category.length > 0);
    assert.equal(deduplicated[0].category[0].name, "Hành Động");
  });

  // 5. Phim có country: [] nhưng nguồn khác có quốc gia hợp lệ
  it("Y5. Phim có country: [] không ghi đè quốc gia hợp lệ từ nguồn khác", () => {
    const items = [
      { slug: "film-b", name: "Film B", year: 2022, country: [], source: "nguonc" },
      { slug: "film-b", name: "Film B", year: 2022, country: [{ name: "Hàn Quốc", slug: "han-quoc" }], source: "phimapi" },
    ];
    const deduplicated = deduplicateMovieItems(items);
    assert.equal(deduplicated.length, 1);
    assert.ok(Array.isArray(deduplicated[0].country) && deduplicated[0].country.length > 0);
    assert.equal(deduplicated[0].country[0].name, "Hàn Quốc");
  });

  // 6. Phim tiếng Anh nhưng quốc gia chưa xác định
  it("Y6. Phim có original_language = en không suy diễn thành Âu Mỹ nếu thiếu bằng chứng", () => {
    const movie = {
      name: "Random English Title",
      year: 2020,
      original_language: "en",
      genre_ids: [28],
    };
    const country = extractMovieCountry(movie);
    assert.equal(country, undefined, "English original_language must NOT map to Âu Mỹ or any country");
    const meta = computeMediaCardMeta(movie);
    assert.equal(meta, "2020 • Hành Động");
  });

  // 7. Phim Hàn Quốc hoặc Nhật Bản có metadata hợp lệ
  it("Y7. Phim Hàn Quốc hoặc Nhật Bản có metadata ngôn ngữ/chữ viết hợp lệ", () => {
    assert.equal(extractMovieCountry({ original_language: "ko" }), "Hàn Quốc");
    assert.equal(extractMovieCountry({ original_language: "ja" }), "Nhật Bản");
    assert.equal(extractMovieCountry({ origin_name: "기생충 (Parasite)" }), "Hàn Quốc");
    assert.equal(extractMovieCountry({ origin_name: "千と千尋の神隠し" }), "Nhật Bản");

    const krMovie = {
      name: "Ký Sinh Trùng",
      origin_name: "기생충",
      year: 2019,
      genre_ids: [18, 53],
    };
    assert.equal(computeMediaCardMeta(krMovie), "2019 • Hàn Quốc • Tâm Lý");
  });

  // 8. Phim có nhiều thể loại và nhiều quốc gia
  it("Y8. Phim có nhiều thể loại và nhiều quốc gia bảo toàn danh sách và chọn đại diện thanh lịch", () => {
    const multiMovie = {
      name: "Multi Metadata Film",
      year: 2024,
      country: [{ name: "Hàn Quốc", slug: "han-quoc" }, { name: "Mỹ", slug: "my" }],
      category: [{ name: "Hành Động", slug: "hanh-dong" }, { name: "Phiêu Lưu", slug: "phieu-luu" }],
    };
    const norm = normalizeMovie(multiMovie);
    assert.equal(norm.categories?.length, 2);
    assert.equal(norm.country, "Hàn Quốc");
    assert.equal(computeMediaCardMeta(multiMovie), "2024 • Hàn Quốc • Hành Động");
  });

  // 9. Phim không có metadata và không đủ căn cứ để fallback
  it("Y9. Phim không có metadata và không đủ căn cứ fallback chỉ hiển thị năm", () => {
    const bareMovie = {
      name: "Mystery Project",
      origin_name: "Mystery Project",
      year: 1995,
    };
    const meta = computeMediaCardMeta(bareMovie);
    assert.equal(meta, "1995", "Phim không có metadata chỉ hiển thị năm, không có dấu chấm thừa hay nhãn chung chung");
  });

  // 10. Phim chỉ có thể loại và không có quốc gia: không bị lặp thể loại 2 lần (ví dụ: Chiến Binh Ánh Sáng TEO)
  it("Y10. Phim chỉ có thể loại và không có quốc gia không bị lặp thể loại 2 lần", () => {
    const movie = {
      name: "Chiến Binh Ánh Sáng TEO",
      year: 2026,
      category: [{ name: "Hành Động", slug: "hanh-dong" }],
    };
    const norm = normalizeMovie(movie);
    assert.equal(norm.genre, "Hành Động");
    assert.equal(norm.country, undefined, "Thể loại 'Hành Động' không được coi là quốc gia");
    const meta = computeMediaCardMeta(movie);
    assert.equal(meta, "2026 • Hành Động", "Không được in lặp '2026 • Hành Động • Hành Động'");
  });
});



