import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  damerauLevenshteinDistance,
  calculateDamerauLevenshteinSimilarity,
  slugify,
} from "@/lib/stringUtils";
import {
  getDynamicTaxonomy,
  parseSearchFilterIntent,
} from "@/services/movies/dynamicTaxonomy";
import { executeSmartSearch } from "@/services/movies/smartSearchService";

describe("Smart Search Pipeline (Zero-AI, Zero-Hardcode)", () => {
  describe("1. Local Damerau-Levenshtein & Slug Normalization", () => {
    it("slugify converts complex strings to clean URL slugs", () => {
      assert.equal(slugify("Lật Mặt 7: Một Điều Ước"), "lat-mat-7-mot-dieu-uoc");
      assert.equal(slugify("  phim kinh dị hàn quốc 2024  "), "phim-kinh-di-han-quoc-2024");
      assert.equal(slugify("Spider-Man: No Way Home!"), "spider-man-no-way-home");
    });

    it("calculates exact Damerau-Levenshtein distance & similarity", () => {
      // 1. Identical strings
      assert.equal(damerauLevenshteinDistance("oppenheimer", "oppenheimer"), 0);
      assert.equal(calculateDamerauLevenshteinSimilarity("oppenheimer", "oppenheimer"), 1.0);

      // 2. Adjacent transposition
      assert.equal(damerauLevenshteinDistance("spidre", "spider"), 1);
      assert.ok(calculateDamerauLevenshteinSimilarity("spidre", "spider") >= 0.8);

      // 3. Typo: 'squid gam' vs 'squid game' (1 insertion)
      const simSquid = calculateDamerauLevenshteinSimilarity("squid gam", "squid game");
      assert.ok(simSquid >= 0.8, `Expected similarity >= 0.8, got ${simSquid}`);

      // 4. Typo: 'openeimer' vs 'oppenheimer' (2 edits)
      const simOppen = calculateDamerauLevenshteinSimilarity("openeimer", "oppenheimer");
      assert.ok(simOppen >= 0.8, `Expected similarity >= 0.8, got ${simOppen}`);

      // 5. Completely different strings
      const simDiff = calculateDamerauLevenshteinSimilarity("doraemon", "oppenheimer");
      assert.ok(simDiff < 0.4, `Expected similarity < 0.4, got ${simDiff}`);
    });
  });

  describe("2. Tầng 1 — Dynamic Taxonomy & Smart Filter Tokenizer", () => {
    it("loads dynamic taxonomy from API / cache without hardcoded static lists", async () => {
      const taxonomy = await getDynamicTaxonomy();
      assert.ok(taxonomy, "Dynamic taxonomy must exist");
      assert.ok(Array.isArray(taxonomy.genres) && taxonomy.genres.length >= 15, "Must have dynamic genres");
      assert.ok(Array.isArray(taxonomy.countries) && taxonomy.countries.length >= 15, "Must have dynamic countries");
    });

    it("extracts filter intent for 'phim kinh dị hàn quốc 2024'", async () => {
      const taxonomy = await getDynamicTaxonomy();
      const intent = parseSearchFilterIntent("phim kinh dị hàn quốc 2024", taxonomy);

      assert.equal(intent.hasFilter, true, "Must have filter");
      assert.equal(intent.filter.year, "2024", "Year must be 2024");
      assert.equal(intent.filter.category, "kinh-di", "Category must be kinh-di");
      assert.equal(intent.filter.country, "han-quoc", "Country must be han-quoc");
      assert.equal(intent.remainingQuery, "", "Remaining query should be empty after removing filters & filler words");
    });

    it("extracts filter intent for 'hoạt hình nhật bản chiếu rạp'", async () => {
      const taxonomy = await getDynamicTaxonomy();
      const intent = parseSearchFilterIntent("hoạt hình nhật bản chiếu rạp", taxonomy);

      assert.equal(intent.hasFilter, true, "Must have filter");
      assert.equal(intent.filter.category, "hoat-hinh", "Category must be hoat-hinh");
      assert.equal(intent.filter.country, "nhat-ban", "Country must be nhat-ban");
      assert.equal(intent.filter.type, "phim-chieu-rap", "Type must be phim-chieu-rap");
    });

    it("preserves keyword when searching with filters like 'doraemon hoạt hình nhật bản'", async () => {
      const taxonomy = await getDynamicTaxonomy();
      const intent = parseSearchFilterIntent("doraemon hoạt hình nhật bản", taxonomy);

      assert.equal(intent.hasFilter, true, "Must have filter");
      assert.equal(intent.filter.country, "nhat-ban", "Country must be nhat-ban");
      assert.equal(intent.remainingQuery, "doraemon", "Keyword 'doraemon' must be preserved");
    });

    it("leaves standard movie titles without filters for Tier 2/3", async () => {
      const taxonomy = await getDynamicTaxonomy();
      const intent = parseSearchFilterIntent("lật mặt 7", taxonomy);

      assert.equal(intent.hasFilter, false, "Must NOT have false positive filters");
      assert.equal(intent.remainingQuery, "lat mat 7", "Title must be preserved");
    });
  });

  describe("3. 3-Tier Search Execution", () => {
    it("Tier 1: executes dynamic filter search successfully", async () => {
      const res = await executeSmartSearch({
        query: "phim kinh dị hàn quốc 2024",
        limit: 12,
        skipKvCache: true,
      });

      assert.ok(res, "Result must exist");
      assert.equal(res.tier, "tier1_filter", "Tier must be tier1_filter");
      assert.ok(res.items.length > 0, "Must return movies");
    });

    it("Tier 2: executes direct catalog search for known movie titles", async () => {
      const res = await executeSmartSearch({
        query: "lật mặt 6",
        limit: 12,
        skipKvCache: true,
      });

      assert.ok(res, "Result must exist");
      assert.equal(res.tier, "tier2_direct", "Tier must be tier2_direct");
      assert.ok(res.items.length > 0, "Must return movie items");
      assert.ok(
        res.items.some((m) => m.name?.includes("Lật Mặt 6") || m.slug?.includes("lat-mat-6")),
        "Must contain Lật Mặt 6"
      );
    });

    it("Tier 3: falls back to TMDb multi-search with typo tolerance for 'squid gam'", async () => {
      const res = await executeSmartSearch({
        query: "squid gam",
        limit: 12,
        skipKvCache: true,
      });

      assert.ok(res, "Result must exist");
      assert.equal(res.tier, "tier3_tmdb", "Tier must be tier3_tmdb");
      assert.ok(res.items.length > 0, "Must return matched movies");
      assert.ok(res.correctedQuery, "Must have detected correctedQuery");
    });

    it("Tier 3: falls back to TMDb with typo tolerance for 'openeimer'", async () => {
      const res = await executeSmartSearch({
        query: "openeimer",
        limit: 12,
        skipKvCache: true,
      });

      assert.ok(res, "Result must exist");
      assert.equal(res.tier, "tier3_tmdb", "Tier must be tier3_tmdb");
      assert.ok(res.items.length > 0, "Must return matched movie");
      assert.equal(res.correctedQuery, "Oppenheimer", "Must correct query to Oppenheimer");
    });

    it("Empty State: returns empty tier for nonexistent query", async () => {
      const res = await executeSmartSearch({
        query: "phim khong the tim thay xyz123456789",
        limit: 12,
        skipKvCache: true,
      });

      assert.ok(res, "Result must exist");
      assert.equal(res.tier, "empty", "Tier must be empty");
      assert.equal(res.items.length, 0, "Items must be empty");
      assert.equal(res.totalItems, 0, "Total items must be 0");
    });
  });
});
