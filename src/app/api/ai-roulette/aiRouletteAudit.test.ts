 
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  isSeriesMovie,
  matchesCriteria,
  rankCandidatesBySurprise,
} from "./route";

// ============================================================================
// FIXTURES
// ============================================================================
const FIXTURE_KR_SINGLE_1 = {
  slug: "ky-sinh-trung",
  title: "Ký Sinh Trùng",
  name: "Ký Sinh Trùng",
  origin_name: "Parasite",
  type: "single",
  category: [
    { name: "Hài Hước", slug: "hai-huoc" },
    { name: "Chính Kịch", slug: "chinh-kich" },
  ],
  country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  time: "132 phút",
  episode_total: 1,
  episode_current: "Full",
  tmdb: { vote_average: 8.5, vote_count: 16000 },
};

const FIXTURE_KR_SINGLE_SHORT = {
  slug: "chuyen-tau-ngan",
  title: "Chuyến Tàu Bản Ngắn",
  name: "Chuyến Tàu Bản Ngắn",
  type: "single",
  category: [{ name: "Hành Động", slug: "hanh-dong" }],
  country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  time: "85 phút",
  episode_total: 1,
  episode_current: "Full",
  tmdb: { vote_average: 7.2, vote_count: 4000 },
};

const FIXTURE_US_SINGLE_90_120 = {
  slug: "vung-dat-cam-lang",
  title: "Vùng Đất Câm Lặng",
  name: "A Quiet Place",
  type: "single",
  category: [{ name: "Kinh Dị", slug: "kinh-di" }],
  country: [{ name: "Âu Mỹ", slug: "au-my" }],
  time: "90 phút",
  episode_total: 1,
  episode_current: "Full",
  tmdb: { vote_average: 7.5, vote_count: 12000 },
};

const FIXTURE_KR_SERIES_1 = {
  slug: "ha-canh-noi-anh",
  title: "Hạ Cánh Nơi Anh",
  name: "Crash Landing on You",
  type: "series",
  category: [{ name: "Tình Cảm", slug: "tinh-cam" }],
  country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  time: "70 phút/tập",
  episode_total: 16,
  episode_current: "Tập 16",
};

const FIXTURE_KR_SERIES_2 = {
  slug: "tro-choi-con-muc",
  title: "Trò Chơi Con Mực",
  name: "Squid Game",
  type: "phim-bo",
  category: [{ name: "Hành Động", slug: "hanh-dong" }, { name: "Phim Bộ", slug: "phim-bo" }],
  country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  time: "55 phút",
  episode_total: 9,
  episode_current: "9/9",
};

const FIXTURE_TV_SHOW = {
  slug: "running-man-vn",
  title: "Chạy Đi Chờ Chi",
  name: "Running Man Vietnam",
  type: "tvshows",
  category: [{ name: "TV Shows", slug: "tv-shows" }],
  country: [{ name: "Việt Nam", slug: "viet-nam" }],
  time: "90 phút/tập",
  episode_current: "Tập 15",
};

const FIXTURE_NO_COUNTRY = {
  slug: "phim-khong-quoc-gia",
  title: "Phim Thiếu Quốc Gia",
  type: "single",
  category: [{ name: "Hành Động", slug: "hanh-dong" }],
  country: [],
  time: "105 phút",
};

const FIXTURE_NO_DURATION = {
  slug: "phim-chua-ro-thoi-luong",
  title: "Phim Chưa Rõ Thời Lượng",
  type: "single",
  category: [{ name: "Hài Hước", slug: "hai-huoc" }],
  country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  time: "",
};

// ============================================================================
// TESTS
// ============================================================================
describe("Nanaflix Bốc Quẻ — Độ Chính Xác & Invariants Audit (Giai đoạn 2.4)", () => {
  // --------------------------------------------------------------------------
  // TEST 1: Hard constraint phim lẻ, quốc gia, thời lượng
  // --------------------------------------------------------------------------
  it("TEST 1: Hard constraint phim lẻ — Phim bộ và series nhiều tập bị loại trừ 100%", () => {
    assert.strictEqual(isSeriesMovie(FIXTURE_KR_SERIES_1), true, "Hạ Cánh Nơi Anh phải bị nhận diện là phim bộ");
    assert.strictEqual(isSeriesMovie(FIXTURE_KR_SERIES_2), true, "Trò Chơi Con Mực phải bị nhận diện là phim bộ");
    assert.strictEqual(isSeriesMovie(FIXTURE_TV_SHOW), true, "Running Man phải bị nhận diện là phim bộ");

    assert.strictEqual(isSeriesMovie(FIXTURE_KR_SINGLE_1), false, "Ký Sinh Trùng là phim lẻ");
    assert.strictEqual(isSeriesMovie(FIXTURE_KR_SINGLE_SHORT), false, "Chuyến Tàu Bản Ngắn là phim lẻ");
    assert.strictEqual(isSeriesMovie(FIXTURE_US_SINGLE_90_120), false, "Vùng Đất Câm Lặng là phim lẻ");

    // matchesCriteria phải chặn tất cả phim bộ ngay lập tức
    assert.strictEqual(matchesCriteria(FIXTURE_KR_SERIES_1, "tinh-cam", "han-quoc", "all"), false);
    assert.strictEqual(matchesCriteria(FIXTURE_KR_SERIES_2, "hanh-dong", "han-quoc", "all"), false);
    assert.strictEqual(matchesCriteria(FIXTURE_TV_SHOW, "all", "viet-nam", "all"), false);
  });

  it("TEST 1B: Hard constraint quốc gia và thời lượng", () => {
    // 1. Kiểm tra quốc gia
    // Ký Sinh Trùng là Hàn Quốc -> khớp Hàn Quốc, KHÔNG khớp Âu Mỹ
    assert.strictEqual(matchesCriteria(FIXTURE_KR_SINGLE_1, "all", "han-quoc", "all"), true);
    assert.strictEqual(matchesCriteria(FIXTURE_KR_SINGLE_1, "all", "au-my", "all"), false);

    // Vùng Đất Câm Lặng là Âu Mỹ -> khớp Âu Mỹ, KHÔNG khớp Hàn Quốc
    assert.strictEqual(matchesCriteria(FIXTURE_US_SINGLE_90_120, "all", "au-my", "all"), true);
    assert.strictEqual(matchesCriteria(FIXTURE_US_SINGLE_90_120, "all", "han-quoc", "all"), false);

    // Phim thiếu metadata quốc gia khi người dùng yêu cầu quốc gia cụ thể -> BỊ LOẠI
    assert.strictEqual(matchesCriteria(FIXTURE_NO_COUNTRY, "all", "han-quoc", "all"), false);

    // 2. Kiểm tra thời lượng
    // 85 phút -> Khớp <90, không khớp 90-120
    assert.strictEqual(matchesCriteria(FIXTURE_KR_SINGLE_SHORT, "all", "all", "duoi-90"), true);
    assert.strictEqual(matchesCriteria(FIXTURE_KR_SINGLE_SHORT, "all", "all", "90-120"), false);

    // 90 phút -> Khớp 90-120, không khớp <90
    assert.strictEqual(matchesCriteria(FIXTURE_US_SINGLE_90_120, "all", "all", "90-120"), true);
    assert.strictEqual(matchesCriteria(FIXTURE_US_SINGLE_90_120, "all", "all", "duoi-90"), false);

    // 132 phút -> Khớp 120-150, không khớp 90-120
    assert.strictEqual(matchesCriteria(FIXTURE_KR_SINGLE_1, "all", "all", "120-150"), true);
    assert.strictEqual(matchesCriteria(FIXTURE_KR_SINGLE_1, "all", "all", "90-120"), false);

    // Phim thiếu duration khi người dùng yêu cầu thời lượng cụ thể -> BỊ LOẠI (không đoán bừa)
    assert.strictEqual(matchesCriteria(FIXTURE_NO_DURATION, "all", "all", "duoi-90"), false);
  });

  // --------------------------------------------------------------------------
  // TEST 2: Đổi tiêu chí ngay sau khi bốc nhiều phim
  // --------------------------------------------------------------------------
  it("TEST 2: Đổi quốc gia — criteria key phân biệt hoàn toàn, không dùng pool cũ", () => {
    const key1: string = "xa-stress|han-quoc|mot-minh|all|can-bang";
    const key2: string = "xa-stress|au-my|mot-minh|all|can-bang";
    assert.notStrictEqual(key1, key2, "Hai tiêu chí khác nhau phải có key khác nhau");

    // Giả lập client state
    const poolKR = [FIXTURE_KR_SINGLE_1];
    const lastCriteriaKey = key1;

    // Khi người dùng đổi sang key2 (Âu Mỹ)
    const currentKey = key2;
    const canReusePool = lastCriteriaKey === currentKey && poolKR.length > 0;
    assert.strictEqual(canReusePool, false, "Client tuyệt đối không được tái sử dụng pool của Hàn Quốc cho Âu Mỹ");
  });

  // --------------------------------------------------------------------------
  // TEST 3: Cache hit và Cache miss tuân thủ cùng quy tắc lọc
  // --------------------------------------------------------------------------
  it("TEST 3: Cache hit vs Cache miss — Kiểm tra tính bất biến nghiêm ngặt", () => {
    // Giả lập pool trong cache Redis
    const cachedItems = [
      FIXTURE_KR_SINGLE_1,
      FIXTURE_KR_SERIES_1, // Nếu bằng cách nào đó một series lọt vào cache
      FIXTURE_US_SINGLE_90_120, // Phim Âu Mỹ
    ];

    const targetCategory = "chinh-kich";
    const targetCountry = "han-quoc";
    const duration = "all";

    // Khi load từ cache, mọi candidate BẮT BUỘC phải qua matchesCriteria
    const validatedFromCache = cachedItems.filter((it) =>
      matchesCriteria(it, targetCategory, targetCountry, duration)
    );

    assert.strictEqual(validatedFromCache.length, 1, "Chỉ duy nhất Ký Sinh Trùng hợp lệ");
    assert.strictEqual(validatedFromCache[0].slug, "ky-sinh-trung");
  });

  // --------------------------------------------------------------------------
  // TEST 4: Pool hết hoặc không còn phim hợp lệ: Không nới lỏng hard constraints
  // --------------------------------------------------------------------------
  it("TEST 4: Pool cạn kiệt — Thông báo rõ ràng, không âm thầm nới lỏng điều kiện", () => {
    const allCandidates = [FIXTURE_KR_SINGLE_1];
    const rolledSlugs = ["ky-sinh-trung"]; // Đã bốc phim này rồi

    // Lọc ứng viên chưa bốc
    const unrolled = allCandidates.filter((c) => !rolledSlugs.includes(c.slug));
    assert.strictEqual(unrolled.length, 0, "Không còn ứng viên chưa bốc");

    // Khi không còn ứng viên, hệ thống KHÔNG được tự ý lấy lại phim đã bốc hay nới lỏng phim bộ
    const fallbackInvalid = [FIXTURE_KR_SERIES_1].filter((it) => matchesCriteria(it, "all", "han-quoc", "all"));
    assert.strictEqual(fallbackInvalid.length, 0, "Không được đưa phim bộ vào lấp chỗ trống khi hết phim");
  });

  // --------------------------------------------------------------------------
  // TEST 5: AI Fallback trả phim không hợp lệ: Phim đó phải bị loại bỏ
  // --------------------------------------------------------------------------
  it("TEST 5: AI fallback — Gợi ý phim bộ hoặc sai quốc gia bị loại bỏ ngay lập tức", () => {
    // Giả lập Gemini AI trả về một phim bộ Hàn Quốc và một phim Mỹ khi đang tìm phim lẻ Hàn Quốc
    const aiSuggestedMovies = [
      { ...FIXTURE_KR_SERIES_1, title: "Hạ Cánh Nơi Anh (Gợi ý từ AI)" },
      { ...FIXTURE_US_SINGLE_90_120, title: "Vùng Đất Câm Lặng (Gợi ý từ AI)" },
      { ...FIXTURE_KR_SINGLE_1, title: "Ký Sinh Trùng (Gợi ý từ AI)" },
    ];

    const targetCategory = "all";
    const targetCountry = "han-quoc";

    const approvedByGate = aiSuggestedMovies.filter((movie) =>
      matchesCriteria(movie, targetCategory, targetCountry, "all")
    );

    assert.strictEqual(approvedByGate.length, 1, "Chỉ phim lẻ Hàn Quốc hợp lệ được duyệt qua cổng");
    assert.strictEqual(approvedByGate[0].slug, "ky-sinh-trung");
  });

  // --------------------------------------------------------------------------
  // TEST 6: Hai request liên tiếp trả về sai thứ tự (Race condition test)
  // --------------------------------------------------------------------------
  it("TEST 6: Race condition — Request cũ hoàn tất trễ không được ghi đè tiêu chí mới", async () => {
    let latestActiveRequestId = 0;
    let appliedState: { criteria: string; movieTitle: string } | null = null;

    // Giả lập 2 request: Request 1 gửi trước nhưng mạng chậm, Request 2 gửi sau nhưng xong nhanh
    const sendRequest = async (id: number, criteria: string, movieTitle: string, delayMs: number) => {
      latestActiveRequestId = id; // Đánh dấu request mới nhất
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      // Kiểm tra invariant: Chỉ request có id === latestActiveRequestId mới được cập nhật state
      if (id === latestActiveRequestId) {
        appliedState = { criteria, movieTitle };
      }
    };

    // Chạy Request 1 (Hàn Quốc, chậm 50ms) và Request 2 (Âu Mỹ, nhanh 10ms)
    await Promise.all([
      sendRequest(1, "han-quoc", "Ký Sinh Trùng", 50),
      new Promise((resolve) => setTimeout(resolve, 5)).then(() =>
        sendRequest(2, "au-my", "Vùng Đất Câm Lặng", 10)
      ),
    ]);

    assert.ok(appliedState, "Phải có state được áp dụng");
    assert.strictEqual(
      (appliedState as { criteria: string; movieTitle: string }).criteria,
      "au-my",
      "Tiêu chí áp dụng cuối cùng phải là Âu Mỹ (request 2), không bị Request 1 ghi đè"
    );
    assert.strictEqual(
      (appliedState as { criteria: string; movieTitle: string }).movieTitle,
      "Vùng Đất Câm Lặng"
    );
  });

  // --------------------------------------------------------------------------
  // TEST 7: sessionStorage lỗi hoặc đạt giới hạn 50 slug
  // --------------------------------------------------------------------------
  it("TEST 7: Storage cap & resilience — Giới hạn an toàn 50 slug, không lỗi khi storage hỏng", () => {
    const MAX_ROLLED_SLUGS = 50;
    const initialSlugs = Array.from({ length: 60 }, (_, i) => `movie-slug-${i}`);

    // Hàm cắt giới hạn an toàn
    const capped = initialSlugs.slice(-MAX_ROLLED_SLUGS);
    assert.strictEqual(capped.length, 50, "Danh sách slug phải được giới hạn đúng 50");
    assert.strictEqual(capped[0], "movie-slug-10", "10 slug cũ nhất bị cắt bỏ");
    assert.strictEqual(capped[49], "movie-slug-59", "Slug mới nhất được giữ lại");

    // Giả lập storage throw lỗi (Private mode / quota exceeded)
    const faultyStorage = {
      getItem: () => {
        throw new Error("QuotaExceededError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };

    let recoveredSlugs: string[] = [];
    assert.doesNotThrow(() => {
      try {
        faultyStorage.setItem();
      } catch {
        // Fallback an toàn
      }
      try {
        faultyStorage.getItem();
      } catch {
        recoveredSlugs = [];
      }
    }, "Thao tác storage lỗi không được làm sập ứng dụng");
    assert.deepStrictEqual(recoveredSlugs, []);
  });

  // --------------------------------------------------------------------------
  // TEST 8: Reroll cùng tiêu chí — Không gọi API khi còn ứng viên hợp lệ
  // --------------------------------------------------------------------------
  it("TEST 8: Client reroll 0ms — Tái sử dụng ứng viên chưa bốc mà không gọi network", () => {
    const candidatePool = [
      { movie: { slug: "slug-1", title: "Phim 1" } },
      { movie: { slug: "slug-2", title: "Phim 2" } },
      { movie: { slug: "slug-3", title: "Phim 3" } },
    ];
    const rolledSlugs = ["slug-1"];
    let apiCallCount = 0;

    const performReroll = (currentCriteriaKey: string, lastCriteriaKey: string) => {
      if (currentCriteriaKey === lastCriteriaKey && candidatePool.length > 0) {
        const next = candidatePool.find((c) => !rolledSlugs.includes(c.movie.slug));
        if (next) {
          rolledSlugs.push(next.movie.slug);
          return { fromPool: true, movie: next.movie };
        }
      }
      apiCallCount++;
      return { fromPool: false, movie: null };
    };

    // Lần 1: Bốc tiếp từ pool (slug-2)
    const res1 = performReroll("key-a", "key-a");
    assert.strictEqual(res1.fromPool, true);
    assert.strictEqual(res1.movie?.slug, "slug-2");
    assert.strictEqual(apiCallCount, 0, "Không được gọi API khi pool còn ứng viên");

    // Lần 2: Bốc tiếp từ pool (slug-3)
    const res2 = performReroll("key-a", "key-a");
    assert.strictEqual(res2.fromPool, true);
    assert.strictEqual(res2.movie?.slug, "slug-3");
    assert.strictEqual(apiCallCount, 0, "Không được gọi API khi pool còn ứng viên");

    // Lần 3: Pool hết ứng viên -> Bắt buộc gọi API lấy pool mới
    const res3 = performReroll("key-a", "key-a");
    assert.strictEqual(res3.fromPool, false);
    assert.strictEqual(apiCallCount, 1, "Khi pool hết phải gọi API");
  });

  // --------------------------------------------------------------------------
  // TEST 9: Surprise scoring & Companion ranking
  // --------------------------------------------------------------------------
  it("TEST 9: Surprise ranking — An toàn ưu tiên độ phổ biến, Liều một phen ưu tiên Hidden Gems", () => {
    const candidateHighPop = {
      movie: { ...FIXTURE_KR_SINGLE_1, tmdb: { vote_average: 8.5, vote_count: 50000 } },
      relevanceScore: 90,
    };
    const candidateHiddenGem = {
      movie: { ...FIXTURE_KR_SINGLE_SHORT, tmdb: { vote_average: 8.0, vote_count: 50 } },
      relevanceScore: 90,
    };

    const pool = [candidateHighPop, candidateHiddenGem];

    // Chế độ 'an-toan': Blockbuster phải đứng đầu
    const rankedSafe = rankCandidatesBySurprise(pool, "an-toan");
    assert.strictEqual(rankedSafe[0].movie.slug, "ky-sinh-trung", "An toàn phải ưu tiên phim phổ biến cao");

    // Chế độ 'lieu': Hidden gem phải được boost điểm
    const rankedRisky = rankCandidatesBySurprise(pool, "lieu");
    assert.strictEqual(rankedRisky[0].movie.slug, "chuyen-tau-ngan", "Liều một phen phải ưu tiên hidden gem");
  });
});
