import test from "node:test";
import assert from "node:assert/strict";
import {
  HISTORICAL_ARTISTS_BIRTHDAYS,
  getHistoricalArtistBySlug,
  findHistoricalArtist,
  ensureHistoricalArtistsLoaded,
} from "@/data/history/historicalArtistsBirthdays";
import { normalizeForMatch } from "@/lib/stringUtils";

test("Historical Artist Birthdays Dataset & Flexible Matching — Invariant Tests", async (t) => {
  await ensureHistoricalArtistsLoaded();
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

  await t.test("5. Dataset integrity: 208+ historical artists preserved with unique slugs", () => {
    assert.ok(HISTORICAL_ARTISTS_BIRTHDAYS.length >= 208, "Must maintain at least 208 historical artists");
    const slugs = HISTORICAL_ARTISTS_BIRTHDAYS.map((a) => a.slug);
    const uniqueSlugs = new Set(slugs);
    assert.equal(uniqueSlugs.size, HISTORICAL_ARTISTS_BIRTHDAYS.length, "All artist slugs must be unique");
  });

  await t.test("6. Unicode preservation in normalizeForMatch for CJK, Thai, Korean & Japanese", () => {
    // Chinese characters must NOT be wiped out
    assert.equal(normalizeForMatch("胡可"), "胡可");
    assert.equal(normalizeForMatch("刘宇桥"), "刘宇桥");
    assert.equal(normalizeForMatch("何佳怡"), "何佳怡");
    assert.equal(normalizeForMatch("水浒传"), "水浒传");

    // Thai characters and vowels must be preserved
    assert.equal(normalizeForMatch("ใบเฟิร์น พิมพ์ชนก"), "ใบเฟิร์น พิมพ์ชนก");
    assert.equal(normalizeForMatch("ใหม่ ดาวิกา"), "ใหม่ ดาวิกา");

    // Korean & Japanese must be preserved
    assert.equal(normalizeForMatch("송혜교"), "송혜교");
    assert.equal(normalizeForMatch("新垣結衣"), "新垣結衣");

    // Vietnamese diacritics must be stripped for fuzzy searching
    assert.equal(normalizeForMatch("Trương Hàm Dư"), "truong ham du");
    assert.equal(normalizeForMatch("Lữ Lương Vỹ"), "lu luong vy");

    // Punctuation and brackets must be stripped
    assert.equal(
      normalizeForMatch("Tân Thủy Hử (2011) [Full HD]"),
      "tan thuy hu 2011 full hd"
    );
  });

  await t.test("7. matchesActorAliases correctly matches CJK actors in movie casts", async () => {
    const { matchesActorAliases } = await import("@/services/aiActorService");

    const castList = ["Trương Hàm Dư", "Lữ Lương Vỹ", "胡可 (Cố Đại Tẩu)", "刘宇桥", "何佳怡"];

    // Exact Chinese match
    assert.ok(matchesActorAliases(castList, ["胡可"]), "Must match '胡可' even with character annotation");
    assert.ok(matchesActorAliases(castList, ["刘宇桥"]), "Must match '刘宇桥'");
    assert.ok(matchesActorAliases(castList, ["何佳怡"]), "Must match '何佳怡'");
    assert.ok(matchesActorAliases(castList, ["truong ham du"]), "Must match normalized Vietnamese 'truong ham du'");

    // Negative match
    assert.ok(!matchesActorAliases(castList, ["Châu Tinh Trì"]), "Must not match unlisted actor");
  });

  await t.test("8. isAsianScript correctly detects Hanzi, Hangul, Kana, Thai and rejects Latin", async () => {
    const { isAsianScript } = await import("@/lib/stringUtils");

    assert.equal(isAsianScript("马芯妤"), true, "Must detect Chinese Hanzi");
    assert.equal(isAsianScript("李嘉欣"), true, "Must detect Chinese Hanzi");
    assert.equal(isAsianScript("구교환"), true, "Must detect Korean Hangul");
    assert.equal(isAsianScript("손석구"), true, "Must detect Korean Hangul");
    assert.equal(isAsianScript("ソン・ジュンギ"), true, "Must detect Japanese Katakana");
    assert.equal(isAsianScript("ใบเฟิร์น พิมพ์ชนก"), true, "Must detect Thai");

    assert.equal(isAsianScript("Sydney Sweeney"), false, "Must reject English/Latin");
    assert.equal(isAsianScript("Trấn Thành"), false, "Must reject Vietnamese Latin");
    assert.equal(isAsianScript("Michelle Reis"), false, "Must reject English/Latin");
    assert.equal(isAsianScript(""), false, "Must reject empty string");
    assert.equal(isAsianScript(null), false, "Must reject null");
  });

  await t.test("9. Michelle Reis & iconic HK artists lookup across aliases", () => {
    // Michelle Reis (Lý Gia Hân)
    const m1 = findHistoricalArtist("Michelle Reis");
    const m2 = findHistoricalArtist("michele reis");
    const m3 = findHistoricalArtist("Lý Gia Hân");
    const m4 = findHistoricalArtist("ly gia han");
    const m5 = findHistoricalArtist("李嘉欣");

    assert.ok(m1 && m1.slug === "ly-gia-han", "Must match Michelle Reis");
    assert.ok(m2 && m2.slug === "ly-gia-han", "Must match michele reis");
    assert.ok(m3 && m3.slug === "ly-gia-han", "Must match Lý Gia Hân");
    assert.ok(m4 && m4.slug === "ly-gia-han", "Must match ly gia han");
    assert.ok(m5 && m5.slug === "ly-gia-han", "Must match Chinese 李嘉欣");

    // Chingmy Yau (Khâu Thục Trinh)
    const c1 = findHistoricalArtist("Chingmy Yau");
    const c2 = findHistoricalArtist("Khâu Thục Trinh");
    assert.ok(c1 && c1.slug === "khau-thuc-trinh", "Must match Chingmy Yau");
    assert.ok(c2 && c2.slug === "khau-thuc-trinh", "Must match Khâu Thục Trinh");

    // Sharla Cheung (Trương Mẫn)
    const s1 = findHistoricalArtist("Sharla Cheung");
    const s2 = findHistoricalArtist("Trương Mẫn");
    assert.ok(s1 && s1.slug === "truong-man", "Must match Sharla Cheung");
    assert.ok(s2 && s2.slug === "truong-man", "Must match Trương Mẫn");

    // Anita Mui (Mai Diễm Phương)
    const a1 = findHistoricalArtist("Anita Mui");
    const a2 = findHistoricalArtist("Mai Diễm Phương");
    assert.ok(a1 && a1.slug === "mai-diem-phuong", "Must match Anita Mui");
    assert.ok(a2 && a2.slug === "mai-diem-phuong", "Must match Mai Diễm Phương");
  });

  await t.test("10. resolveActorInternationalName dynamically handles various world actors", async () => {
    const { resolveActorInternationalName } = await import("@/app/dien-vien/[slug]/page");

    // Case 1: Chinese actress (Ma Xinyu / 马芯妤)
    const res1 = resolveActorInternationalName({
      canonicalName: "马芯妤",
      country: "Trung Quốc",
      tmdbDetail: {
        id: 2282092,
        name: "马芯妤",
        also_known_as: ["Ma Xinyu", "Ma Xin-Yu", "Xinyu Ma", "马芯妤"],
        popularity: 5.2,
      },
    });
    assert.equal(res1, "Ma Xinyu", "Must resolve Ma Xinyu from also_known_as");

    // Case 2: Korean actor (Koo Kyo-hwan / 구교환)
    const res2 = resolveActorInternationalName({
      canonicalName: "구교환",
      country: "Hàn Quốc",
      tmdbDetail: {
        id: 1530962,
        name: "구교환",
        also_known_as: ["Koo Kyo-hwan", "Gu Gyo-hwan", "Koo Kyo Hwan"],
        popularity: 12.4,
      },
    });
    assert.equal(res2, "Koo Kyo-Hwan", "Must resolve Koo Kyo-Hwan from also_known_as");

    // Case 3: Korean actor (Son Suk-ku / 손석구)
    const res3 = resolveActorInternationalName({
      canonicalName: "손석구",
      country: "Hàn Quốc",
      tmdbDetail: {
        id: 2024198,
        name: "손석구",
        also_known_as: ["Son Suk-ku", "Son Seok-koo", "Suk-ku Son"],
        popularity: 14.8,
      },
    });
    assert.equal(res3, "Son Suk-Ku", "Must resolve Son Suk-Ku from also_known_as");

    // Case 4: Japanese actress (Yui Aragaki / 新垣結衣)
    const res4 = resolveActorInternationalName({
      canonicalName: "新垣結衣",
      country: "Nhật Bản",
      tmdbDetail: {
        id: 128913,
        name: "新垣結衣",
        also_known_as: ["Yui Aragaki", "Aragaki Yui", "Gakki"],
        popularity: 18.2,
      },
    });
    assert.equal(res4, "Yui Aragaki", "Must resolve Yui Aragaki from also_known_as");

    // Case 5: Hollywood actress (Sydney Sweeney) - Already Latin, must NOT duplicate as (Sydney Sweeney)
    const res5 = resolveActorInternationalName({
      canonicalName: "Sydney Sweeney",
      country: "Mỹ",
      tmdbDetail: {
        id: 115440,
        name: "Sydney Sweeney",
        also_known_as: ["Sydney Sweeney"],
        popularity: 88.5,
      },
    });
    assert.equal(res5, undefined, "Hollywood/Western actor whose canonical name is already English must not duplicate international name");

    // Case 5b: Sino-Vietnamese canonical name (Lý Gia Hân) -> Should resolve English name (Michelle Reis)
    const res5b = resolveActorInternationalName({
      canonicalName: "Lý Gia Hân",
      country: "Hồng Kông",
      tmdbDetail: {
        id: 59378,
        name: "Michelle Reis",
        english_name: "Michelle Reis",
        also_known_as: ["Michelle Monique Reis", "Li Jiaxin", "李嘉欣"],
        popularity: 15.2,
      },
    });
    assert.equal(res5b, "Michelle Reis", "Must resolve Michelle Reis for Sino-Vietnamese name Lý Gia Hân");

    // Case 6: Vietnamese artist (Trấn Thành) - Must return undefined (no international name needed)
    const res6 = resolveActorInternationalName({
      canonicalName: "Trấn Thành",
      country: "Việt Nam",
      tmdbDetail: {
        id: 1594385,
        name: "Tran Thanh",
        popularity: 10,
      },
    });
    assert.equal(res6, undefined, "Vietnamese artists must not display an international name");

    // Case 7: Bio extraction fallback
    const res7 = resolveActorInternationalName({
      canonicalName: "구교환",
      country: "Hàn Quốc",
      bioText: "Koo Kyo-hwan (Korean: 구교환; born December 14, 1982) is a South Korean actor...",
    });
    assert.equal(res7, "Koo Kyo-Hwan", "Must extract Koo Kyo-Hwan from Wikipedia bio pattern");
  });

  await t.test("11. Dynamic TMDb Actor Resolution preserves canonical name (châu tỉ lợi -> Chu Tỉ Lợi without hardcoded presets)", async () => {
    const { resolveActorMovies } = await import("@/services/aiActorService");

    // Dynamic resolution via TMDb Person search & Sino-Vietnamese variant matching
    const actorRes = await resolveActorMovies("châu tỉ lợi");
    assert.equal(actorRes.isActor, true);
    assert.equal(actorRes.actorName, "Chu Tỉ Lợi", "resolveActorMovies must return Chu Tỉ Lợi from TMDb, NOT raw input 'châu tỉ lợi'");
    assert.equal(actorRes.source, "tmdb", "Must resolve dynamically from tmdb, not hardcoded preset");
    assert.equal(actorRes.tmdbPersonId, 239961, "Must match TMDb Person ID 239961");
  });

  await t.test("12. resolveActorProfile dynamically preserves canonical Chu Tỉ Lợi even when URL slug has variant 'chau-ti-loi'", async () => {
    const { resolveActorProfile } = await import("@/services/actor/actorInternationalName");

    const profile = await resolveActorProfile("239961-chau-ti-loi");
    assert.equal(profile.canonicalName, "Chu Tỉ Lợi", "canonicalName must be Chu Tỉ Lợi, not Chau Ti Loi");
    assert.ok(profile.englishName === "Chow Bee-Lee" || profile.englishName === "Billy Chow", "Must resolve legitimate international name from TMDb");
  });
});
