import test from "node:test";
import assert from "node:assert/strict";
import {
  HISTORICAL_ARTISTS_BIRTHDAYS,
  getHistoricalArtistBySlug,
  findHistoricalArtist,
} from "@/data/history/historicalArtistsBirthdays";
import { normalizeForMatch } from "@/lib/stringUtils";

test("Historical Artist Birthdays Dataset & Flexible Matching — Invariant Tests", async (t) => {
  await t.test("1. Kim Ji-won entry verification in historical birthdays", () => {
    const kim = getHistoricalArtistBySlug("kim-ji-won");
    assert.ok(kim, "Kim Ji-won must exist in historical birthdays");
    assert.equal(kim.tmdbPersonId, 582130, "Kim Ji-won must have correct TMDB Person ID 582130");
    assert.equal(kim.birthday, "1992-10-19", "Kim Ji-won birthday must be 1992-10-19");
    assert.ok(
      kim.avatarUrl && kim.avatarUrl.includes("lX7W1j9kg4jV6XNn5XEE3rKsd3x"),
      "Must have correct TMDB profile image path"
    );
    assert.equal(kim.countryCode, "kr", "Country code must be kr");
    assert.ok(kim.aliases.includes("kim jiwon"), "Aliases must include kim jiwon");
  });

  await t.test("2. getHistoricalArtistBySlug handles hyphen and no-hyphen slug variations", () => {
    const bySlug = getHistoricalArtistBySlug("kim-ji-won");
    const byNoDash = getHistoricalArtistBySlug("kim ji won");
    const byNoSpace = getHistoricalArtistBySlug("kimjiwon");

    assert.ok(bySlug, "Must find by standard slug");
    assert.ok(byNoDash, "Must find by spaced slug");
    assert.ok(byNoSpace, "Must find by compact slug");
    assert.equal(bySlug.slug, "kim-ji-won");
    assert.equal(byNoDash.slug, "kim-ji-won");
    assert.equal(byNoSpace.slug, "kim-ji-won");
  });

  await t.test("3. findHistoricalArtist handles various space and hyphen queries", () => {
    const q1 = findHistoricalArtist("Kim Ji-won");
    const q2 = findHistoricalArtist("Kim Ji Won");
    const q3 = findHistoricalArtist("kim jiwon");
    const q4 = findHistoricalArtist("kimjiwon");

    assert.ok(q1 && q1.slug === "kim-ji-won", "Must match 'Kim Ji-won'");
    assert.ok(q2 && q2.slug === "kim-ji-won", "Must match 'Kim Ji Won'");
    assert.ok(q3 && q3.slug === "kim-ji-won", "Must match 'kim jiwon'");
    assert.ok(q4 && q4.slug === "kim-ji-won", "Must match 'kimjiwon'");
  });

  await t.test("4. Flexible matching logic matches space/hyphen variations for historical artists", () => {
    const artists = HISTORICAL_ARTISTS_BIRTHDAYS;

    function matchArtist(artist: typeof artists[0], query: string): boolean {
      const qNorm = normalizeForMatch(query);
      const qNoSpace = qNorm.replace(/\s+/g, "");
      if (!qNorm) return true;

      const checkField = (field?: string | null) => {
        if (!field) return false;
        const norm = normalizeForMatch(field);
        if (norm.includes(qNorm)) return true;
        if (qNoSpace && norm.replace(/\s+/g, "").includes(qNoSpace)) return true;
        return false;
      };

      return (
        checkField(artist.name) ||
        checkField(artist.englishName) ||
        checkField(artist.roles) ||
        (artist.aliases || []).some(checkField)
      );
    }

    // Kim Ji-won variations
    const kimQueries = ["Kim Ji-won", "Kim Ji Won", "kim jiwon", "kimjiwon", "ji-won", "jiwon"];
    for (const q of kimQueries) {
      const results = artists.filter((a) => matchArtist(a, q));
      assert.ok(
        results.some((a) => a.slug === "kim-ji-won"),
        `Query '${q}' must find Kim Ji-won`
      );
    }

    // Asian & Vietnamese actor variations
    const testCases: [string[], string][] = [
      [["Châu Tinh Trì", "Chau Tinh Tri", "chautinhtri"], "chau-tinh-tri"],
      [["Trấn Thành", "Tran Thanh", "tranthanh"], "tran-thanh"],
      [["Song Hye-kyo", "Song Hye Kyo", "songhyekyo"], "song-hye-kyo"],
    ];

    for (const [queries, expectedSlug] of testCases) {
      for (const q of queries) {
        const results = artists.filter((a) => matchArtist(a, q));
        assert.ok(
          results.some((a) => a.slug === expectedSlug),
          `Query '${q}' must find artist with slug '${expectedSlug}'`
        );
      }
    }
  });

  await t.test("5. Dataset integrity: 208 historical artists preserved with unique slugs", () => {
    assert.equal(HISTORICAL_ARTISTS_BIRTHDAYS.length, 208, "Must maintain exactly 208 historical artists");
    const slugs = HISTORICAL_ARTISTS_BIRTHDAYS.map((a) => a.slug);
    const uniqueSlugs = new Set(slugs);
    assert.equal(uniqueSlugs.size, HISTORICAL_ARTISTS_BIRTHDAYS.length, "All artist slugs must be unique");
  });
});
