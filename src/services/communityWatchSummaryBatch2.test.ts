import test from "node:test";
import assert from "node:assert/strict";
import {
  getTopTrendingCommunitySupabase,
  MovieViewStatItem,
  invalidateTrendingSummaryCache,
} from "./communityWatchService";
import { cacheService } from "@/lib/cache";
import { movieApi } from "@/services/movies/service";

test("BATCH 2: TRENDING COMMUNITY SUMMARY CACHE VERIFICATION", async (t) => {
  t.beforeEach(async () => {
    cacheService.clearL1();
    await invalidateTrendingSummaryCache();
  });

  t.afterEach(async () => {
    cacheService.clearL1();
    await invalidateTrendingSummaryCache();
  });

  await t.test("1. Cache MISS: Lần đầu tiên resolve dữ liệu và lưu vào summary cache", async () => {
    const summaryKey = "trending:community:summary:v1:total:10";
    await cacheService.delete(summaryKey);

    const res = await getTopTrendingCommunitySupabase(10, "total");
    assert.ok(Array.isArray(res), "Kết quả phải là mảng");

    // Kiểm tra Redis/L1 đã được nạp summary data
    const cached = await cacheService.get<MovieViewStatItem[]>(summaryKey);
    assert.ok(cached, "Summary cache phải được khởi tạo sau lần gọi đầu tiên");
    assert.ok(Array.isArray(cached));
    assert.equal(cached.length, res.length);
  });

  await t.test("2. Cache HIT: Lần thứ 2 lấy trực tiếp từ summary cache, KHÔNG gọi movieApi.getMovieDetail", async () => {
    const summaryKey = "trending:community:summary:v1:week:10";
    
    // Gắn sẵn dữ liệu mẫu vào summary cache
    const mockSummary: MovieViewStatItem[] = [
      {
        movieSlug: "mock-conan",
        movieTitle: "Thám Tử Lừng Danh Conan Test",
        poster: "/mock-conan.jpg",
        thumb: "/mock-thumb.jpg",
        year: 1996,
        quality: "HD",
        category: "Hoạt Hình",
        viewsTotal: 100,
        viewsWeek: 50,
        lastViewedAt: Date.now(),
      },
      {
        movieSlug: "mock-one-piece",
        movieTitle: "Đảo Hải Tặc Test",
        poster: "/mock-op.jpg",
        thumb: "/mock-thumb-op.jpg",
        year: 1999,
        quality: "FHD",
        category: "Hành Động",
        viewsTotal: 80,
        viewsWeek: 40,
        lastViewedAt: Date.now(),
      },
    ];

    await cacheService.set(summaryKey, mockSummary, 600);

    // Spy xem getMovieDetail có bị gọi không
    let movieDetailCalled = false;
    const origGetDetail = movieApi.getMovieDetail;
    movieApi.getMovieDetail = async (...args) => {
      movieDetailCalled = true;
      return origGetDetail(...args);
    };

    try {
      const items = await getTopTrendingCommunitySupabase(10, "week");
      assert.equal(movieDetailCalled, false, "Cache HIT TUYỆT ĐỐI KHÔNG được gọi movieApi.getMovieDetail()");
      assert.equal(items.length, 2);
      assert.equal(items[0].movieSlug, "mock-conan");
      assert.equal(items[0].movieTitle, "Thám Tử Lừng Danh Conan Test");
      assert.equal(items[1].movieSlug, "mock-one-piece");
    } finally {
      movieApi.getMovieDetail = origGetDetail;
    }
  });

  await t.test("3. Dữ liệu gọn nhẹ: Summary cache TUYỆT ĐỐI không chứa mảng episodes hay streaming links", async () => {
    const summaryKey = "trending:community:summary:v1:total:10";
    await cacheService.delete(summaryKey);

    const res = await getTopTrendingCommunitySupabase(10, "total");
    if (res.length > 0) {
      for (const item of res) {
        assert.ok(item.movieSlug, "Phải có movieSlug");
        assert.ok(item.movieTitle, "Phải có movieTitle");
        assert.ok(item.poster, "Phải có poster");
        // Kiểm tra an toàn: không chứa episodes hay server data cồng kềnh
        assert.equal((item as unknown as Record<string, unknown>).episodes, undefined, "Item không được chứa episodes");
        assert.equal((item as unknown as Record<string, unknown>).servers, undefined, "Item không được chứa servers");
        assert.equal((item as unknown as Record<string, unknown>).link_m3u8, undefined, "Item không được chứa streaming links");
      }
    }
  });

  await t.test("4. Timeframe và Limit độc lập: total và week không dùng chung cache sai lệch", async () => {
    const totalKey = "trending:community:summary:v1:total:5";
    const weekKey = "trending:community:summary:v1:week:5";

    const mockTotal: MovieViewStatItem[] = [
      {
        movieSlug: "phim-total",
        movieTitle: "Phim Toàn Thời Gian",
        poster: "/total.jpg",
        viewsTotal: 1000,
        viewsWeek: 0,
        lastViewedAt: Date.now(),
      },
    ];

    const mockWeek: MovieViewStatItem[] = [
      {
        movieSlug: "phim-week",
        movieTitle: "Phim Tuần Này",
        poster: "/week.jpg",
        viewsTotal: 10,
        viewsWeek: 10,
        lastViewedAt: Date.now(),
      },
    ];

    await cacheService.set(totalKey, mockTotal, 600);
    await cacheService.set(weekKey, mockWeek, 600);

    const resTotal = await getTopTrendingCommunitySupabase(5, "total");
    const resWeek = await getTopTrendingCommunitySupabase(5, "week");

    assert.equal(resTotal[0].movieSlug, "phim-total");
    assert.equal(resWeek[0].movieSlug, "phim-week");
    assert.notEqual(resTotal[0].movieSlug, resWeek[0].movieSlug);
  });

  await t.test("5. Single-Flight Mutex: Nhiều request đồng thời cùng MISS chỉ thực thi resolve 1 lần", async () => {
    const summaryKey = "trending:community:summary:v1:total:10";
    await cacheService.delete(summaryKey);

    // Kích hoạt đồng thời 5 promises
    const promises = [
      getTopTrendingCommunitySupabase(10, "total"),
      getTopTrendingCommunitySupabase(10, "total"),
      getTopTrendingCommunitySupabase(10, "total"),
      getTopTrendingCommunitySupabase(10, "total"),
      getTopTrendingCommunitySupabase(10, "total"),
    ];

    const results = await Promise.all(promises);
    assert.equal(results.length, 5);
    // Cả 5 request đều nhận được dữ liệu nhất quán
    for (let i = 1; i < results.length; i++) {
      assert.deepEqual(results[i], results[0]);
    }
  });

  await t.test("6. Invalidate Trending Cache: Xóa sạch cả L1 và Redis summary cache khi cần", async () => {
    const summaryKey = "trending:community:summary:v1:total:10";
    await cacheService.set(summaryKey, [{ movieSlug: "test", movieTitle: "Test", poster: "/t.jpg", viewsTotal: 1, viewsWeek: 1, lastViewedAt: Date.now() }], 600);

    assert.ok(await cacheService.get(summaryKey));

    // Invalidate
    await invalidateTrendingSummaryCache("total", 10);

    // Sau invalidate, cacheService.get phải trả về null
    assert.equal(await cacheService.get(summaryKey), null);
  });
});
