import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isCorruptedTmdbId,
  isTmdbPayloadMatchingMovie,
  sanitizeMovieAltNames,
} from "@/services/tmdb/tmdbSanityGuard";
import { getTmdbMediaImagesById, getTmdbMovieCredits } from "@/services/tmdbService";
import { buildMovieDetailPageData } from "@/services/movies/detailPageData";

describe("TMDb Sanity Guard & Anti-Corruption Suite", () => {
  describe("1. isCorruptedTmdbId Detection", () => {
    it("Rejects corrupted / invalid TMDb ID values structurally without hardcoding", () => {
      assert.strictEqual(isCorruptedTmdbId(null), true);
      assert.strictEqual(isCorruptedTmdbId(undefined), true);
      assert.strictEqual(isCorruptedTmdbId(""), true);
      assert.strictEqual(isCorruptedTmdbId("   "), true);
      assert.strictEqual(isCorruptedTmdbId("0"), true);
      assert.strictEqual(isCorruptedTmdbId("null"), true);
      assert.strictEqual(isCorruptedTmdbId("undefined"), true);
      assert.strictEqual(isCorruptedTmdbId("abc"), true);
      assert.strictEqual(isCorruptedTmdbId("tt10078772"), true);
      assert.strictEqual(isCorruptedTmdbId("-50"), true);
    });

    it("Accepts valid numeric TMDb ID format", () => {
      assert.strictEqual(isCorruptedTmdbId("1126166"), false);
      assert.strictEqual(isCorruptedTmdbId("893030"), false);
      assert.strictEqual(isCorruptedTmdbId("272846"), false);
      assert.strictEqual(isCorruptedTmdbId(1126166), false);
    });
  });

  describe("2. isTmdbPayloadMatchingMovie Cross-Validation", () => {
    it("Rejects payload when release year differs by > 2 years and titles do not match", () => {
      const movie = { name: "Cánh Đồng Hoang", year: 1979, slug: "canh-dong-hoang" };
      const bogusTmdbPayload = {
        id: 1126166,
        title: "Cuộc Đào Tẩu Trên Không",
        original_title: "Flight Risk",
        release_date: "2025-01-22",
      };

      assert.strictEqual(isTmdbPayloadMatchingMovie(bogusTmdbPayload, movie), false);
    });

    it("Rejects payload when titles are completely mismatched even if year is the same", () => {
      const binhMinhDo = { name: "Bình Minh Đỏ", year: 2022, slug: "binh-minh-do-2022" };
      const nhungDuaTreTmdb = {
        id: 893030,
        title: "Những Đứa Trẻ Trong Sương",
        original_title: "Children of the Mist",
        release_date: "2022-09-08",
      };

      assert.strictEqual(isTmdbPayloadMatchingMovie(nhungDuaTreTmdb, binhMinhDo), false);
    });

    it("Accepts payload when title matches even if year is close", () => {
      const movie = { name: "Cánh Đồng Hoang", origin_name: "The Wild Field", year: 1979 };
      const realTmdbPayload = {
        id: 272846,
        title: "Cánh Đồng Hoang",
        original_title: "Cánh đồng hoang",
        release_date: "1979-04-30",
      };

      assert.strictEqual(isTmdbPayloadMatchingMovie(realTmdbPayload, movie), true);
    });

    it("Accepts legitimate title variations (sequel numbers, roman numerals, vowel variants) within same year", () => {
      // 1. Lật Mặt 5: 48h vs Lật Mặt: 48H
      const latMat5 = { name: "Lật Mặt 5: 48h", year: 2021 };
      const tmdbLatMat = { title: "Lật Mặt: 48H", release_date: "2021-04-16" };
      assert.strictEqual(isTmdbPayloadMatchingMovie(tmdbLatMat, latMat5), true);

      // 2. Vô Gian Đạo 3 vs Vô Gian Đạo III
      const voGianDao3 = { name: "Vô Gian Đạo 3", year: 2003 };
      const tmdbVoGianDao = { title: "Vô Gian Đạo III", release_date: "2003-12-12" };
      assert.strictEqual(isTmdbPayloadMatchingMovie(tmdbVoGianDao, voGianDao3), true);

      // 3. Tiên Kiếm Kỳ Hiệp 3 vs Tiên Kiếm Kì Hiệp 3
      const tienKiem = { name: "Tiên Kiếm Kỳ Hiệp 3", year: 2009 };
      const tmdbTienKiem = { title: "Tiên Kiếm Kì Hiệp 3", release_date: "2009-06-28" };
      assert.strictEqual(isTmdbPayloadMatchingMovie(tmdbTienKiem, tienKiem), true);
    });
  });

  describe("3. sanitizeMovieAltNames", () => {
    it("Strips Flight Risk polluted names from Vietnamese movies", () => {
      const movie = {
        name: "Cánh Đồng Hoang",
        origin_name: "The Wild Field",
        year: 1979,
        country: "Việt Nam",
      };
      const rawAlt = ["插翅难飞", "Vol à Haut Risque", "Flight Risk", "The Wild Field"];
      const cleaned = sanitizeMovieAltNames(rawAlt, movie);

      assert.deepStrictEqual(cleaned, ["The Wild Field"]);
    });

    it("Preserves Flight Risk names for the actual Flight Risk movie", () => {
      const movie = { name: "Cuộc Đào Tẩu Trên Không", origin_name: "Flight Risk" };
      const rawAlt = ["Vol à Haut Risque", "Flight Risk"];
      const cleaned = sanitizeMovieAltNames(rawAlt, movie);

      assert.deepStrictEqual(cleaned, ["Vol à Haut Risque", "Flight Risk"]);
    });
  });

  describe("4. End-to-End Image & Cast Safeguards", () => {
    it("getTmdbMediaImagesById returns null when corrupted ID is passed with expected movie", async () => {
      const movie = { name: "Cánh Đồng Hoang", year: 1979, slug: "canh-dong-hoang" };
      const res = await getTmdbMediaImagesById("1126166", "movie", undefined, movie);

      assert.strictEqual(res.posterUrl, null);
      assert.strictEqual(res.backdropUrl, null);
    });

    it("getTmdbMovieCredits returns empty array when corrupted ID is passed with expected movie", async () => {
      const movie = { name: "Cánh Đồng Hoang", year: 1979, slug: "canh-dong-hoang" };
      const credits = await getTmdbMovieCredits("1126166", "movie", movie);

      assert.deepStrictEqual(credits, []);
    });

    it("buildMovieDetailPageData for canh-dong-hoang eliminates Mark Wahlberg and uses authentic data", async () => {
      const pageData = await buildMovieDetailPageData("canh-dong-hoang", {});
      assert.ok(pageData, "Page data must exist");

      // Verify that alternative names do NOT contain Flight Risk
      assert.strictEqual(
        pageData.altNames.some((n) => n.toLowerCase().includes("flight risk")),
        false,
        "altNames must not contain Flight Risk"
      );

      // Verify that actorList contains the authentic Vietnamese actors
      assert.ok(
        pageData.actorList.includes("Lâm Tới") || pageData.actorList.some((a) => a.includes("Lâm Tới")),
        "actorList must contain Lâm Tới"
      );

      // Verify tmdbId is NOT 1126166
      assert.notStrictEqual(String(pageData.tmdbId), "1126166", "tmdbId must not be 1126166");
    });
  });
});
