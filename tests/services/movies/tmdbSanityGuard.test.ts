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
    it("Rejects corrupted TMDb ID 1126166 for classic Vietnamese movies", () => {
      const canhDongHoang = { name: "Cánh Đồng Hoang", year: 1979, slug: "canh-dong-hoang" };
      const noiBinhYen = { name: "Nơi Bình Yên Chim Hót", year: 1986, slug: "noi-binh-yen-chim-hot" };
      const muaGioChuong = { name: "Mùa Gió Chướng", year: 1978, slug: "mua-gio-chuong" };
      const honDat = { name: "Hòn Đất Và Biển", year: 1983, slug: "hon-dat-va-bien" };

      assert.strictEqual(isCorruptedTmdbId("1126166", canhDongHoang), true);
      assert.strictEqual(isCorruptedTmdbId("1126166", noiBinhYen), true);
      assert.strictEqual(isCorruptedTmdbId("1126166", muaGioChuong), true);
      assert.strictEqual(isCorruptedTmdbId("1126166", honDat), true);
    });

    it("Allows TMDb ID 1126166 for the real Flight Risk movie", () => {
      const realFlightRisk = {
        name: "Cuộc Đào Tẩu Trên Không",
        origin_name: "Flight Risk",
        year: 2025,
        slug: "cuoc-dao-tau-tren-khong",
      };
      assert.strictEqual(isCorruptedTmdbId("1126166", realFlightRisk), false);
    });

    it("Rejects corrupted TMDb ID 893030 for Bình Minh Đỏ but allows for Những Đứa Trẻ Trong Sương", () => {
      const binhMinhDo = { name: "Bình Minh Đỏ", year: 2022, slug: "binh-minh-do-2022" };
      const nhungDuaTre = { name: "Những Đứa Trẻ Trong Sương", year: 2022, slug: "nhung-dua-tre-trong-suong" };

      assert.strictEqual(isCorruptedTmdbId("893030", binhMinhDo), true);
      assert.strictEqual(isCorruptedTmdbId("893030", nhungDuaTre), false);
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
      const movie = { name: "Cánh Đồng Hoang", year: 1979 };
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
