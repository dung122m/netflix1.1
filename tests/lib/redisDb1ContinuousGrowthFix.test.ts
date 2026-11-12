/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  cacheService,
  _resetRedisClientsForTesting,
  _setMockRedisClientForTesting,
} from "@/lib/cache";
import { movieApi, buildMovieCacheKey } from "@/services/movies/service";
import {
  getTopTrendingCommunitySupabase,
  recordMovieViewSupabase,
} from "@/services/communityWatchService";

class MockRedisDB1 {
  public store = new Map<string, any>();
  public commandCounts = {
    get: 0,
    set: 0,
    del: 0,
    mget: 0,
  };

  resetCounts() {
    this.commandCounts = { get: 0, set: 0, del: 0, mget: 0 };
  }

  async get<T>(key: string): Promise<T | null> {
    this.commandCounts.get++;
    const item = this.store.get(key);
    return item !== undefined ? (item as T) : null;
  }

  async set(key: string, value: any, opts?: any): Promise<string> {
    this.commandCounts.set++;
    this.store.set(key, value);
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    this.commandCounts.del += keys.length;
    let count = 0;
    for (const k of keys) {
      if (this.store.delete(k)) count++;
    }
    return count;
  }

  async mget<T>(...keys: string[]): Promise<(T | null)[]> {
    this.commandCounts.mget++;
    return keys.map((k) => {
      const item = this.store.get(k);
      return item !== undefined ? (item as T) : null;
    });
  }

  pipeline() {
    const commands: Array<() => void> = [];
    return {
      set: (key: string, val: any) => {
        commands.push(() => {
          this.commandCounts.set++;
          this.store.set(key, val);
        });
      },
      exec: async () => {
        for (const cmd of commands) cmd();
        return [];
      },
    };
  }
}

describe("NANAFLIX — CONTINUOUS REDIS DB1 COMMAND GROWTH FIX", () => {
  let mockRedis: MockRedisDB1;

  beforeEach(() => {
    mockRedis = new MockRedisDB1();
    _setMockRedisClientForTesting(mockRedis as any, "default");
    cacheService.clearL1();
  });

  afterEach(() => {
    _resetRedisClientsForTesting();
    cacheService.clearL1();
  });

  it("Scenario 1: Ghi nhận nhiều lượt xem liên tiếp phát sinh 0 lệnh REDIS DEL trên DB1", async () => {
    // Giả lập ghi nhận 10 lượt xem liên tiếp (từ client hoặc player heartbeat)
    const slugs = [
      "phim-a", "phim-b", "phim-c", "phim-d", "phim-e",
      "phim-a", "phim-b", "phim-c", "phim-d", "phim-e",
    ];

    for (const slug of slugs) {
      try {
        await recordMovieViewSupabase({
          slug,
          title: `Phim ${slug}`,
          userId: "test-user-db1",
        });
      } catch {
        // Supabase mock / test fallback
      }
    }

    // Xác minh: Quá trình ghi nhận lượt xem TUYỆT ĐỐI không gọi lệnh Redis DEL nào trên DB1
    assert.equal(
      mockRedis.commandCounts.del,
      0,
      "Ghi nhận lượt xem phim tuyệt đối KHÔNG được gửi lệnh Redis DEL xóa summary cache"
    );
  });

  it("Scenario 2: Đọc Trending Community nhiều lần: Lần 1 nạp từ Redis, các lần sau phục vụ tức thì từ L1 RAM (0 Redis commands)", async () => {
    const summaryKey = "trending:community:summary:v1:total:10";
    const mockSummaryData = [
      {
        movieSlug: "phim-thinh-hanh-1",
        movieTitle: "Phim Thịnh Hành 1",
        poster: "/poster1.jpg",
        viewsTotal: 1500,
        viewsWeek: 450,
        lastViewedAt: Date.now(),
      },
      {
        movieSlug: "phim-thinh-hanh-2",
        movieTitle: "Phim Thịnh Hành 2",
        poster: "/poster2.jpg",
        viewsTotal: 1200,
        viewsWeek: 320,
        lastViewedAt: Date.now(),
      },
    ];

    // Nạp sẵn dữ liệu hợp lệ vào Redis DB1
    mockRedis.store.set(summaryKey, mockSummaryData);
    mockRedis.resetCounts();

    // Lần 1: Cache MISS L1 -> Đọc từ Redis DB1 (1 lệnh Redis GET) và tự động ghi nhớ vào L1 RAM
    const firstRead = await getTopTrendingCommunitySupabase(10, "total");
    assert.ok(Array.isArray(firstRead));
    assert.equal(firstRead.length, 2);
    assert.equal(firstRead[0].movieSlug, "phim-thinh-hanh-1");
    assert.equal(mockRedis.commandCounts.get, 1, "Lần đầu: gọi đúng 1 lệnh Redis GET trên DB1");
    assert.equal(mockRedis.commandCounts.set, 0, "Đã có cache: không ghi đè lệnh Redis SET");

    // Lần 2 đến 10: Phải được lấy tức thì từ L1 Memory Cache -> 0 Redis commands phát sinh thêm!
    for (let i = 2; i <= 10; i++) {
      const subsequentRead = await getTopTrendingCommunitySupabase(10, "total");
      assert.ok(Array.isArray(subsequentRead));
      assert.equal(subsequentRead.length, 2);
    }

    assert.equal(
      mockRedis.commandCounts.get,
      1,
      "Các lần đọc tiếp theo (2..10) TUYỆT ĐỐI không gọi thêm Redis GET (phục vụ 100% từ L1 RAM)"
    );
    assert.equal(
      mockRedis.commandCounts.set,
      0,
      "Các lần đọc tiếp theo TUYỆT ĐỐI không phát sinh lệnh Redis SET"
    );
    assert.equal(
      mockRedis.commandCounts.del,
      0,
      "Các lần đọc tiếp theo TUYỆT ĐỐI không phát sinh lệnh Redis DEL"
    );
  });

  it("Scenario 3: Movie detail: Redis cache HIT nạp ngay vào L1 RAM, các lần đọc tiếp theo phát sinh 0 Redis commands", async () => {
    const testSlug = "test-db1-movie-detail-hit";
    const kvKeyV3 = `movie:detail:v6:${testSlug}:any`;

    // Giả lập movie detail payload trong Redis DB1
    const mockDetail = {
      _isCompactV3: true,
      movie: {
        _id: "m123",
        name: "Test Movie DB1",
        slug: testSlug,
        origin_name: "Test Movie Original",
        content: "Nội dung phim test",
        type: "single",
        status: "completed",
        year: 2026,
        quality: "HD",
        source: "ophim",
        episodes: [
          {
            server_name: "Server #1",
            server_data: [
              {
                name: "Tập 1",
                slug: "tap-1",
                filename: "tap1",
                link_embed: "https://example.com/embed/1",
                link_m3u8: "https://example.com/hls/1.m3u8",
              },
            ],
          },
        ],
      },
      episodes: [
        {
          server_name: "Server #1",
          server_data: [
            {
              name: "Tập 1",
              slug: "tap-1",
              filename: "tap1",
              link_embed: "https://example.com/embed/1",
              link_m3u8: "https://example.com/hls/1.m3u8",
            },
          ],
        },
      ],
    };

    mockRedis.store.set(kvKeyV3, mockDetail);
    mockRedis.resetCounts();

    // Lần 1: L1 rỗng, đọc từ Redis -> phát sinh 1 Redis GET, nạp vào L1 RAM
    const detail1 = await movieApi.getMovieDetail(testSlug);
    assert.ok(detail1?.movie, "Phải lấy được thông tin phim từ Redis");
    assert.equal(detail1?.movie?.name, "Test Movie DB1");
    assert.equal(mockRedis.commandCounts.get, 1, "Lần 1: Gọi đúng 1 lệnh Redis GET");

    // Lần 2 đến 10: Phải được lấy từ movieDetailMemoryCache (L1 RAM) -> phát sinh 0 Redis GETs!
    for (let i = 2; i <= 10; i++) {
      const detailNext = await movieApi.getMovieDetail(testSlug);
      assert.ok(detailNext?.movie);
      assert.equal(detailNext?.movie?.name, "Test Movie DB1");
    }

    assert.equal(
      mockRedis.commandCounts.get,
      1,
      "Lần 2 đến 10 TUYỆT ĐỐI KHÔNG gọi thêm Redis GET (L1 RAM bảo vệ DB1)"
    );
  });

  it("Scenario 4: Nhiều request cùng lúc cho danh mục phim được gom qua Single-Flight Mutex (chỉ 1 Redis GET)", async () => {
    const testCategory = "test-concurrent-category";
    const filter = { category: testCategory, page: 1, limit: 24, sort: "latest" as const };
    const kvKey = `movie:list:${buildMovieCacheKey(filter)}`;

    // Nạp dữ liệu danh mục vào Redis DB1
    mockRedis.store.set(kvKey, {
      items: [
        {
          _id: "cat_m1",
          name: "Phim Danh Mục 1",
          slug: "phim-danh-muc-1",
          origin_name: "Category Movie 1",
          poster_url: "cat1.jpg",
          thumb_url: "cat1_thumb.jpg",
          year: 2026,
        },
      ],
      pagination: {
        totalItems: 1,
        totalItemsPerPage: 24,
        currentPage: 1,
        totalPages: 1,
      },
    });
    mockRedis.resetCounts();

    // Gửi đồng thời 8 requests cho cùng một danh mục
    const promises = Array.from({ length: 8 }, () => movieApi.getMovies(filter));
    const results = await Promise.all(promises);

    assert.equal(results.length, 8);
    for (const res of results) {
      assert.ok(res?.items && res.items.length === 1);
      assert.equal(res.items[0].slug, "phim-danh-muc-1");
    }

    // Nhờ inFlightGetMovies single-flight gom các requests đồng thời:
    // Chỉ duy nhất 1 request thực thi Redis GET trên DB1!
    assert.equal(
      mockRedis.commandCounts.get,
      1,
      "8 requests đồng thời chỉ phát sinh ĐÚNG 1 lệnh Redis GET trên DB1 nhờ Single-Flight Mutex"
    );
    assert.equal(
      mockRedis.commandCounts.set,
      0,
      "Không phát sinh lệnh Redis SET lặp lại"
    );
  });
});
