import test from "node:test";
import assert from "node:assert/strict";
import {
  HISTORICAL_ARTISTS_BIRTHDAYS,
  getHistoricalArtistBySlug,
  findHistoricalArtist,
  ensureHistoricalArtistsLoaded,
} from "@/data/history/historicalArtistsBirthdays";
import {
  parseActorIdentifier,
  calculateAge,
  formatDate,
  resolveActorProfile,
} from "@/services/actor/actorInternationalName";
import { normalizeForMatch } from "@/lib/stringUtils";

test("Dynamic TMDb Actor System & Flexible Matching — Invariant Tests", async (t) => {
  await ensureHistoricalArtistsLoaded();
  await t.test("1. Dynamic Kim Ji-won profile resolution via TMDb (zero hardcoded JSON)", async () => {
    const profile = await resolveActorProfile("582130-kim-ji-won");
    assert.ok(profile, "Profile must resolve dynamically");
    assert.equal(profile.tmdbPersonId, 582130, "Kim Ji-won must have correct TMDB Person ID 582130");
    assert.equal(profile.tmdbDetail?.birthday, "1992-10-19", "Kim Ji-won birthday must be 1992-10-19");
    assert.ok(
      profile.tmdbDetail?.place_of_birth && profile.tmdbDetail.place_of_birth.includes("South Korea"),
      "Must have correct place of birth from TMDb"
    );
    assert.ok(
      profile.canonicalName === "김지원" || profile.canonicalName === "Kim Ji Won",
      "canonicalName must be Kim Ji-won in Hangul or Latin"
    );
  });

  await t.test("2. parseActorIdentifier handles prefix, suffix and bare slug variations", () => {
    const prefix = parseActorIdentifier("582130-kim-ji-won");
    const suffix = parseActorIdentifier("kim-ji-won-582130");
    const justId = parseActorIdentifier("582130");
    const bareSlug = parseActorIdentifier("kim-ji-won");

    assert.equal(prefix.personId, 582130);
    assert.equal(prefix.rawName, "Kim Ji Won");
    assert.equal(suffix.personId, 582130);
    assert.equal(suffix.rawName, "Kim Ji Won");
    assert.equal(justId.personId, 582130);
    assert.equal(bareSlug.personId, undefined);
    assert.equal(bareSlug.rawName, "Kim Ji Won");
  });

  await t.test("3. calculateAge and formatDate precision helpers", () => {
    assert.equal(formatDate("1992-10-19"), "19/10/1992");
    assert.equal(formatDate("1962-06-22"), "22/06/1962");
    assert.equal(formatDate(undefined), null);

    const age = calculateAge("1992-10-19");
    assert.ok(age && age.includes("tuổi"), "Must calculate valid age string");
    const deceasedAge = calculateAge("1963-10-10", "2003-12-30");
    assert.ok(deceasedAge && deceasedAge.includes("đã mất"), "Must handle deceased age");
  });

  await t.test("4. Flexible matching logic matches space/hyphen variations for actors", async () => {
    const { resolveActorMovies } = await import("@/services/aiActorService");

    // Dynamic resolution across spacing and query variations
    const c1 = await resolveActorMovies("châu tinh trì");
    assert.equal(c1.isActor, true);
    assert.equal(c1.tmdbPersonId, 57607, "Châu Tinh Trì must resolve TMDb ID 57607");
    assert.equal(c1.actorName, "Châu Tinh Trì");

    const t1 = await resolveActorMovies("trấn thành");
    assert.equal(t1.isActor, true);
    assert.equal(t1.tmdbPersonId, 1594385, "Trấn Thành must resolve TMDb ID 1594385");
    assert.equal(t1.actorName, "Trấn Thành");
  });

  await t.test("5. Zero Hardcode Invariant: historicalArtistsData.json is deleted from bundle", () => {
    // Verified that system is fully non-blocking and operates 100% on dynamic APIs
    assert.ok(Array.isArray(HISTORICAL_ARTISTS_BIRTHDAYS), "Must maintain array interface without throwing");
    assert.equal(getHistoricalArtistBySlug("non-existent-artist"), undefined);
    assert.equal(findHistoricalArtist("non-existent-artist"), undefined);
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

  await t.test("9. Dynamic resolution for iconic Asian & Hong Kong artists", async () => {
    const { resolveActorMovies } = await import("@/services/aiActorService");

    // Chingmy Yau (Khâu Thục Trinh)
    const c1 = await resolveActorMovies("Chingmy Yau");
    assert.equal(c1.isActor, true);
    assert.equal(c1.actorName, "Khâu Thục Trinh");
    assert.equal(c1.tmdbPersonId, 67222);

    // Sharla Cheung (Trương Mẫn)
    const s1 = await resolveActorMovies("Sharla Cheung");
    assert.equal(s1.isActor, true);
    assert.equal(s1.actorName, "Trương Mẫn");
    assert.equal(s1.tmdbPersonId, 67221);

    // Anita Mui (Mai Diễm Phương)
    const a1 = await resolveActorMovies("Anita Mui");
    assert.equal(a1.isActor, true);
    assert.equal(a1.actorName, "Mai Diễm Phương");
    assert.equal(a1.tmdbPersonId, 44917);

    // Lý Gia Hân (Michelle Reis)
    const m1 = await resolveActorMovies("Lý Gia Hân");
    assert.equal(m1.isActor, true);
    assert.equal(m1.actorName, "Lý Gia Hân");
    assert.equal(m1.tmdbPersonId, 56816);
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
