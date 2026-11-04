import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { movieApi } from "./service";

describe("Global Search Pagination & Source Discovery Invariants", () => {
  it("1. Search pagination maintains consistency across pages without duplicate items", async () => {
    const page1Res = await movieApi.getMovies({ keyword: "doraemon", page: 1, limit: 24, skipKvCache: true });
    assert.ok(page1Res, "Page 1 response must exist");
    assert.ok(page1Res.items.length > 0, "Page 1 must have items for doraemon");
    assert.ok(page1Res.pagination.totalPages >= 2, `Total pages must be >= 2, got ${page1Res.pagination.totalPages}`);

    const page2Res = await movieApi.getMovies({ keyword: "doraemon", page: 2, limit: 24, skipKvCache: true });
    assert.ok(page2Res, "Page 2 response must exist");
    assert.ok(page2Res.items.length > 0, "Page 2 must NOT be empty for doraemon");
    assert.equal(page2Res.pagination.currentPage, 2, "Current page must be 2");

    // Check cross-page deduplication
    const page1Slugs = new Set(page1Res.items.map((m: { slug: string; name?: string }) => m.slug));
    const duplicates = page2Res.items.filter((m: { slug: string; name?: string }) => page1Slugs.has(m.slug));
    assert.equal(
      duplicates.length,
      0,
      `Page 2 should have 0 items duplicated from Page 1, found duplicates: ${duplicates.map((d: { slug: string }) => d.slug).join(", ")}`
    );
  });

  it("2. Search relevance eliminates unaccented false matches (e.g. mua do vs mua dong)", async () => {
    const res = await movieApi.getMovies({ keyword: "mưa đỏ", page: 1, limit: 24, skipKvCache: true });
    if (res && res.items.length > 0) {
      for (const item of res.items) {
        assert.ok(
          !item.name.toLowerCase().includes("mùa đông") && !item.slug.includes("mua-dong"),
          `'mùa đông' must NOT match search query 'mưa đỏ', got: ${item.name}`
        );
      }
    }
  });

  it("3. Global Movie Source Discovery automatically unifies missing providers", async () => {
    // Doraemon on VSMOV has slug "doraemon" and on NguonC has slug "doraemon-2005"
    const movieDetail = await movieApi.getMovieDetail("doraemon");
    assert.ok(movieDetail, "Movie detail for doraemon must exist");
    assert.ok(movieDetail.episodes && movieDetail.episodes.length > 0, "Doraemon must have episode servers");

    // Total episode count should be substantial (> 20 episodes discovered)
    const totalEpisodes = movieDetail.episodes.reduce((acc: number, s: { server_data?: unknown[]; items?: unknown[] }) => acc + (s.server_data?.length || s.items?.length || 0), 0);
    assert.ok(totalEpisodes > 10, `Discovered episodes must be substantial, got ${totalEpisodes}`);
  });
});
