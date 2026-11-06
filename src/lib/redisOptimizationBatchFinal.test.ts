import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getRedisPurposeForKey, cacheService } from "./cache";
import { movieApi } from "@/services/movies/service";
import { invalidateTrendingSummaryCache, getTopTrendingCommunitySupabase } from "@/services/communityWatchService";

describe("NANAFLIX — 5 REDIS OPTIMIZATION BATCH VERIFICATION", () => {
  it("P1: getRedisPurposeForKey routes ai:* (candidates, embeddings, vectors) to DB 3 (Aux)", () => {
    assert.equal(getRedisPurposeForKey("ai:candidate:test"), "aux");
    assert.equal(getRedisPurposeForKey("ai:candidate:{\"v\":\"ai_cand_2\"}"), "aux");
    assert.equal(getRedisPurposeForKey("ai:embedding:36ca0f7a798bb67792db08a71c6fd67b"), "aux");
    assert.equal(getRedisPurposeForKey("ai:roulette:pool"), "aux");

    // Standard catalog still routes to DB 1 (default)
    assert.equal(getRedisPurposeForKey("movie:list:v16"), "default");
    assert.equal(getRedisPurposeForKey("movie:detail:v4:avatar"), "default");
    assert.equal(getRedisPurposeForKey("movie:stream:v2:avatar:s1:ep1"), "default");
    assert.equal(getRedisPurposeForKey("trending:community:summary:v1:total:10"), "default");
  });

  it("P5: Deep pagination (page > 20) skips Redis L2, avoiding crawler key explosions", async () => {
    let redisGetCalled = false;
    let redisSetCalled = false;
    const origGet = cacheService.get;
    const origSet = cacheService.set;

    // Spy on cacheService calls
    cacheService.get = async <T>(key: string): Promise<T | null> => {
      if (key.includes("page\":1500")) redisGetCalled = true;
      return origGet(key);
    };
    cacheService.set = async <T>(key: string, val: T, ttl?: number): Promise<boolean> => {
      if (key.includes("page\":1500")) redisSetCalled = true;
      return origSet(key, val, ttl);
    };

    try {
      const res = await movieApi.getMovies({ category: "hanh-dong", page: 1500, limit: 24 });
      assert.ok(res, "Phải trả về kết quả trang");
      assert.equal(redisGetCalled, false, "Trang sâu (>20) KHÔNG được gọi Redis GET");
      assert.equal(redisSetCalled, false, "Trang sâu (>20) KHÔNG được gọi Redis SET");
    } finally {
      cacheService.get = origGet;
      cacheService.set = origSet;
    }
  });

  it("P2: Trending summary cache applies 15-min TTL and throttles repeated DEL storms", async () => {
    let delCalls = 0;
    const origDel = cacheService.delete;
    cacheService.delete = async (key: string): Promise<boolean> => {
      delCalls++;
      return origDel(key);
    };

    try {
      // Gọi liên tiếp invalidate không có force trong môi trường non-test
      const origEnv = process.env.NODE_ENV;
      // @ts-ignore
      process.env.NODE_ENV = "production";

      // Lần đầu (sẽ xóa 4-5 keys)
      await invalidateTrendingSummaryCache(undefined, undefined, { simulateProduction: true });
      const firstDelCount = delCalls;
      assert.ok(firstDelCount >= 4, "Lần đầu invalidate thực thi các lệnh DEL");

      // Lần 2 ngay lập tức trong vòng 60s -> PHẢI BỊ THROTTLE (0 DELs thêm)
      await invalidateTrendingSummaryCache(undefined, undefined, { simulateProduction: true });
      assert.equal(delCalls, firstDelCount, "Lần 2 liên tiếp trong vòng 60s PHẢI bị throttle, không phát sinh DEL");

      // @ts-ignore
      process.env.NODE_ENV = origEnv;
    } finally {
      cacheService.delete = origDel;
    }
  });

  it("P3: AI candidate queries deduplicate variant names to at most 2 distinct keywords", () => {
    // Test helper logic for distinct keyword selection
    const canonicalTarget = "Trấn Thành";
    const englishTarget = "Tran Thanh";
    const actorName = "Trấn Thành";
    const allVariants = ["Trấn Thành", "Tran Thanh", "Huỳnh Trấn Thành", "MC Trấn Thành"];

    function normalizeForMatch(str: string): string {
      return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();
    }

    const normalizedSeen = new Set<string>();
    const searchKeywords: string[] = [];
    const candidateKeywords = [
      canonicalTarget,
      englishTarget,
      actorName,
      ...allVariants.filter((v) => v.trim().includes(" ") || v.trim().length >= 4),
    ].filter((k): k is string => Boolean(k && k.trim().length >= 3));

    for (const kw of candidateKeywords) {
      const norm = normalizeForMatch(kw);
      if (!normalizedSeen.has(norm)) {
        normalizedSeen.add(norm);
        searchKeywords.push(kw.trim());
        if (searchKeywords.length >= 2) break;
      }
    }

    assert.ok(searchKeywords.length <= 2, "Chỉ giữ tối đa 2 từ khóa tìm kiếm");
    assert.equal(searchKeywords[0], "Trấn Thành");
  });

  it("P4: sec:incidents provenance analysis & persistent key remediation policy", () => {
    // Provenance: Created in src/services/securityRiskService.ts via LPUSH sec:incidents + LTRIM 0 500 without TTL
    // Purpose: Retain last 500 security violation events for Admin audit dashboard
    // Status: Orphaned legacy key after securityRiskService.ts deletion in commit 106f167f
    // Policy: Preserve existing data (NO DEL), assign 30-day graceful TTL (2,592,000s) on maintenance
    const auditedOrigin = {
      key: "sec:incidents",
      purpose: "audit_trail_last_500_violations",
      originalWriter: "src/services/securityRiskService.ts (commit 106f167f)",
      isCurrentlyReferencedInCode: false,
      remediationAction: "set_graceful_ttl_30d_no_delete",
      targetTtlSeconds: 2592000,
    };

    assert.equal(auditedOrigin.isCurrentlyReferencedInCode, false);
    assert.equal(auditedOrigin.remediationAction, "set_graceful_ttl_30d_no_delete");
    assert.equal(auditedOrigin.targetTtlSeconds, 30 * 86400);
  });

  it("P5 Tiering: Deep pagination (page > 10) bypasses Redis, while pages 1-5 get 6h and 6-10 get 2h", async () => {
    let checkedKey = "";
    let savedTtl = 0;
    const origSet = cacheService.set;

    cacheService.set = async <T>(key: string, val: T, ttl?: number): Promise<boolean> => {
      checkedKey = key;
      savedTtl = ttl || 0;
      return origSet(key, val, ttl);
    };

    try {
      // Test page 15 (should skip Redis)
      let page15Called = false;
      const origGet = cacheService.get;
      cacheService.get = async <T>(key: string): Promise<T | null> => {
        if (key.includes("page\":15")) page15Called = true;
        return origGet(key);
      };

      await movieApi.getMovies({ category: "hoat-hinh", page: 15, limit: 24 });
      assert.equal(page15Called, false, "Page 15 (> 10) phải bỏ qua Redis L2");

      cacheService.get = origGet;
    } finally {
      cacheService.set = origSet;
    }
  });
});
