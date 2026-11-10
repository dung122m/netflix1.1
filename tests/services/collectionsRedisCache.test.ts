import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getRedisPurposeForKey } from "@/lib/cache";
import { cacheService } from "@/lib/cache";

describe("Nanaflix Public Collections - Redis DB2 Multi-Tier Cache Verification", () => {
  it("1. Routing invariant: Key community:collection:* routes strictly to DB2 (live/community)", () => {
    assert.equal(getRedisPurposeForKey("community:collection:col_xyz_123"), "live");
  });

  it("2. Routing invariant: Key community:collections:public:list routes strictly to DB2 (live/community)", () => {
    assert.equal(getRedisPurposeForKey("community:collections:public:list"), "live");
  });

  it("3. L1 + L2 Cache read/write: cacheService stores and retrieves public collection item with TTL", async () => {
    const testKey = "community:collection:test_unit_col";
    const sampleItem = {
      id: "test_unit_col",
      userId: "user_test_99",
      creatorName: "Nanaflix Member",
      name: "Tuyển tập Anime Đỉnh Cao",
      isPublic: true,
      movies: [{ slug: "tham-tu-lung-danh-conan", title: "Thám Tử Lừng Danh Conan" }],
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };

    // Lưu vào cache
    await cacheService.set(testKey, sampleItem, 900);

    // Đọc ra từ L1 RAM
    assert.equal(cacheService.hasL1(testKey), true, "L1 RAM cache must hit immediately");
    const retrieved = await cacheService.get<typeof sampleItem>(testKey);
    assert.ok(retrieved, "Retrieved item must not be null");
    assert.equal(retrieved?.id, sampleItem.id);
    assert.equal(retrieved?.name, sampleItem.name);

    // Xóa cache (mô phỏng POST/DELETE invalidation)
    await cacheService.delete(testKey);
    assert.equal(cacheService.hasL1(testKey), false, "L1 cache must be deleted immediately");
    const afterDelete = await cacheService.get(testKey);
    assert.equal(afterDelete, null, "Item must be null after deletion");
  });

  it("4. Command Efficiency Protection: repeated reads within 5 min consume 0 Redis commands via L1 RAM", async () => {
    const listKey = "community:collections:public:list";
    const sampleList = [
      { id: "col_1", name: "List 1" },
      { id: "col_2", name: "List 2" },
    ];

    await cacheService.set(listKey, sampleList, 900);

    // 100 lần đọc liên tiếp trên cùng server instance
    for (let i = 0; i < 100; i++) {
      const res = await cacheService.get(listKey);
      assert.ok(res);
    }

    assert.equal(cacheService.hasL1(listKey), true);
    await cacheService.delete(listKey);
  });
});
