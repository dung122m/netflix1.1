import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { movieApi } from "./service";

describe("Nanaflix Movie Browse Pagination & Filter Service", () => {
  // A. /browse?category=hai-huoc&page=1
  it("A. /browse?category=hai-huoc&page=1 returns valid items, pagination, and totalPages", async () => {
    const res = await movieApi.getMovies({ category: "hai-huoc", page: 1, limit: 24, skipKvCache: true });
    assert.equal(res.status, true);
    assert.ok(Array.isArray(res.items));
    assert.equal(res.items.length, 24, "Page 1 of hai-huoc should return 24 items");
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
});



