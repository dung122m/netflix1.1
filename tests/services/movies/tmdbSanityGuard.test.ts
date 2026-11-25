import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isCorruptedTmdbId,
  isTmdbPayloadMatchingMovie,
  sanitizeMovieAltNames,
} from "@/services/tmdb/tmdbSanityGuard";
import { getTmdbMediaImagesById, getTmdbMovieCredits, searchTmdbPosterByTitle } from "@/services/tmdbService";
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

    it("Rejects foreign candidate (Hamlet) from matching Vietnamese movie (Xóm Nhỏ) despite origin_name translation", () => {
      const xomNho = {
        name: "Xóm Nhỏ",
        origin_name: "Hamlet",
        year: 2026,
        country: "Việt Nam",
        slug: "xom-nho",
      };
      const foreignHamlet = {
        id: 843342,
        title: "Hamlet",
        original_title: "Hamlet",
        release_date: "2026-02-06",
      };

      assert.strictEqual(isTmdbPayloadMatchingMovie(foreignHamlet, xomNho), false);

      // Xác minh tuyệt đối an toàn ngay cả khi danh sách phim thiếu trường country (undefined)
      const xomNhoNoCountry = {
        name: "Xóm Nhỏ",
        origin_name: "Hamlet",
        year: 2026,
        slug: "xom-nho",
      };
      assert.strictEqual(isTmdbPayloadMatchingMovie(foreignHamlet, xomNhoNoCountry), false);
    });

    it("Accepts authentic Vietnamese candidate (Xóm nhỏ) matching Vietnamese movie even with missing air date and missing country", () => {
      const xomNho = {
        name: "Xóm Nhỏ",
        origin_name: "Hamlet",
        year: 2026,
        slug: "xom-nho",
      };
      const authenticXomNhoTmdb = {
        id: 339621,
        title: "Xóm nhỏ",
        original_title: "Xóm nhỏ",
        first_air_date: "",
      };

      assert.strictEqual(isTmdbPayloadMatchingMovie(authenticXomNhoTmdb, xomNho), true);
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

    it("Accepts foreign movies with Vietnamese translated titles matching international TMDb entries", () => {
      // 1. Colossal (Cô Gái Và Gã Khổng Lồ)
      const colossal = {
        name: "Cô Gái Và Gã Khổng Lồ",
        origin_name: "Colossal",
        year: 2017,
        country: "Âu Mỹ",
        slug: "co-gai-va-ga-khong-lo",
      };
      const tmdbColossal = {
        id: 339967,
        title: "Colossal",
        original_title: "Colossal",
        release_date: "2017-04-06",
      };
      assert.strictEqual(isTmdbPayloadMatchingMovie(tmdbColossal, colossal), true);

      // 2. High Heat (Tức Giận Tột Cùng)
      const highHeat = {
        name: "Tức Giận Tột Cùng",
        origin_name: "High Heat",
        year: 2022,
        country: "Âu Mỹ",
        slug: "tuc-gian-tot-cung",
      };
      const tmdbHighHeat = {
        id: 1015963,
        title: "High Heat",
        original_title: "High Heat",
        release_date: "2022-12-16",
      };
      assert.strictEqual(isTmdbPayloadMatchingMovie(tmdbHighHeat, highHeat), true);

      // 3. Hoppers (Hoppers: Cú Nhảy Kỳ Diệu)
      const hoppers = {
        name: "Hoppers: Cú Nhảy Kỳ Diệu",
        origin_name: "Hoppers",
        year: 2026,
        slug: "hoppers-cu-nhay-ky-dieu",
      };
      const tmdbHoppers = {
        id: 111111,
        title: "Hoppers",
        original_title: "Hoppers",
        release_date: "2026-03-06",
      };
      assert.strictEqual(isTmdbPayloadMatchingMovie(tmdbHoppers, hoppers), true);

      // 4. Ngoại phim rõ quốc gia có 2 bản dịch tiếng Việt khác nhau nhưng cùng năm & tmdbId chuẩn
      // (vd: "Đảo Hỏa Tuyến" vs TMDb "Ngòi Nổ" cùng năm 2007 cho Flash Point)
      const daoHoaTuyen = {
        name: "Đảo Hỏa Tuyến",
        origin_name: "Flash Point",
        year: 2007,
        country: "Hồng Kông",
        slug: "dao-hoa-tuyen",
      };
      const tmdbFlashPoint = {
        id: 35854,
        title: "Ngòi Nổ",
        original_title: "導火線",
        release_date: "2007-07-26",
      };
      assert.strictEqual(isTmdbPayloadMatchingMovie(tmdbFlashPoint, daoHoaTuyen), true);
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

    it("searchTmdbPosterByTitle for Xóm Nhỏ matches authentic Vietnamese TMDb record and never matches Hamlet", async () => {
      const res = await searchTmdbPosterByTitle("Xóm Nhỏ", 2026, "tv", undefined, "VN");
      assert.ok(res, "Result must exist");
      assert.strictEqual(
        res.posterUrl?.includes("7azHIOSrxo0VC5wYiwtGOnVehsH"),
        false,
        "Must NOT match Riz Ahmed's Hamlet"
      );
      assert.ok(
        res.posterUrl?.includes("bA5NTUg4c1G7xi256yzBcQJaHgD"),
        "Must match authentic Xóm Nhỏ poster (bA5NTUg4c1G7xi256yzBcQJaHgD)"
      );
    });
  });
});
