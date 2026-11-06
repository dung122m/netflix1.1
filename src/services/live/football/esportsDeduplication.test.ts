import { describe, it } from "node:test";
import assert from "node:assert";
import {
  resolveEsportsTeam,
  isEsportsTeamMatch,
  getTeamAsset,
} from "@/data/live/teamAssets";
import {
  isSingleTeamMatching,
  normalizeAndMergeStreams,
  RawStreamItem,
} from "@/services/live/football/service";
import { enrichMatchLogosSync } from "@/services/live/football-logo/service";

describe("Esports Match Deduplication & Team Logo Resolution Test Suite", () => {
  // =========================================================================
  // 1. TEST CASE TRỌNG TÂM CỦA NGƯỜI DÙNG: DK / DPLUS VÀ BLG / BILIBILI GAMING
  // =========================================================================
  it("DK phải được nhận diện là Dplus KIA (Esports), tuyệt đối không phải Đan Mạch 🇩🇰", () => {
    const dkAsset = getTeamAsset("DK");
    assert.ok(dkAsset, "DK asset phải tồn tại");
    assert.strictEqual(dkAsset.name, "Dplus KIA");
    assert.strictEqual(dkAsset.isCountry, false);
    assert.strictEqual(dkAsset.emoji, "🎮");
    assert.ok(dkAsset.logo && dkAsset.logo.includes("DPlus_KIA_Logo"), "Logo DK phải là logo Dplus KIA");

    const espDK = resolveEsportsTeam("DK");
    assert.ok(espDK, "resolveEsportsTeam('DK') phải trả về định nghĩa Dplus KIA");
    assert.strictEqual(espDK.canonicalKey, "dpluskia");
  });

  it("DK và Dplus / Dplus KIA phải khớp nhau 100% qua isEsportsTeamMatch và isSingleTeamMatching", () => {
    assert.strictEqual(isEsportsTeamMatch("DK", "Dplus"), true);
    assert.strictEqual(isEsportsTeamMatch("DK", "Dplus KIA"), true);
    assert.strictEqual(isEsportsTeamMatch("Dplus", "DK"), true);
    assert.strictEqual(isEsportsTeamMatch("DWG KIA", "DK"), true);

    assert.strictEqual(isSingleTeamMatching("DK", "Dplus"), true);
    assert.strictEqual(isSingleTeamMatching("DK", "Dplus KIA"), true);
  });

  it("BLG và Bilibili Gaming phải khớp nhau 100%", () => {
    assert.strictEqual(isEsportsTeamMatch("BLG", "Bilibili Gaming"), true);
    assert.strictEqual(isSingleTeamMatching("BLG", "Bilibili Gaming"), true);

    const blgAsset = getTeamAsset("BLG");
    assert.ok(blgAsset, "BLG asset phải tồn tại");
    assert.strictEqual(blgAsset.name, "Bilibili Gaming");
    assert.strictEqual(blgAsset.isCountry, false);
  });

  it("Hai luồng 'DK vs BLG' (1 server) và 'Dplus vs Bilibili Gaming' (2 servers) phải GỘP thành 1 trận duy nhất với 3 servers", () => {
    const now = Date.now();
    const rawStreams: RawStreamItem[] = [
      {
        url: "https://example.com/stream1.m3u8",
        effectiveUrl: "https://example.com/stream1.m3u8",
        group: "Thể Thao Điện Tử",
        rawTitle: "[LIVE] 05:00 DK vs BLG - BLV Cận",
        rawLogo: "",
        tournament: "LCK Mùa Xuân 2025",
      },
      {
        url: "https://example.com/stream2.m3u8",
        effectiveUrl: "https://example.com/stream2.m3u8",
        group: "Thể Thao Điện Tử",
        rawTitle: "[LIVE] 05:00 Dplus vs Bilibili Gaming - BLV MARTY [FHD]",
        rawLogo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/DPlus_KIA_Logo.svg/500px-DPlus_KIA_Logo.svg.png",
        awayLogo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Bilibili_Gaming_logo.svg/500px-Bilibili_Gaming_logo.svg.png",
        tournament: "LCK Mùa Xuân 2025",
      },
      {
        url: "https://example.com/stream3.m3u8",
        effectiveUrl: "https://example.com/stream3.m3u8",
        group: "Thể Thao Điện Tử",
        rawTitle: "[LIVE] 05:00 Dplus vs Bilibili Gaming - HD MARTY [FHD]",
        rawLogo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/DPlus_KIA_Logo.svg/500px-DPlus_KIA_Logo.svg.png",
        awayLogo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Bilibili_Gaming_logo.svg/500px-Bilibili_Gaming_logo.svg.png",
        tournament: "LCK Mùa Xuân 2025",
      },
    ];

    const result = normalizeAndMergeStreams(rawStreams, now);
    assert.strictEqual(result.matches.length, 1, "Phải gộp chính xác thành 1 trận duy nhất");

    const merged = result.matches[0];
    assert.strictEqual(merged.servers.length, 3, "Trận đấu phải tổng hợp đủ 3 nguồn server");
    assert.ok(merged.blv?.includes("Cận"), "BLV phải có BLV Cận");
    assert.ok(merged.blv?.includes("MARTY"), "BLV phải có MARTY");
    assert.strictEqual(merged.team1, "Dplus", "Tên đội phải ưu tiên phiên bản đầy đủ hơn (Dplus thay vì DK)");
    assert.strictEqual(merged.team2, "Bilibili Gaming", "Tên đội 2 phải là Bilibili Gaming");
    assert.ok(merged.homeLogo && merged.homeLogo.includes("DPlus_KIA_Logo"), "Home logo phải là logo Dplus KIA");
    assert.ok(merged.awayLogo && merged.awayLogo.includes("Bilibili_Gaming_logo"), "Away logo phải là logo BLG");
  });

  // =========================================================================
  // 2. MỞ RỘNG TOÀN DIỆN CHO TẤT CẢ CÁC ĐỘI ESPORTS KHÁC
  // =========================================================================
  it("T1 và SKT / SKT T1 phải khớp nhau và có logo chuẩn", () => {
    assert.strictEqual(isEsportsTeamMatch("T1", "SKT"), true);
    assert.strictEqual(isEsportsTeamMatch("T1", "SKT T1"), true);
    assert.strictEqual(isSingleTeamMatching("T1", "SKT"), true);
    const asset = getTeamAsset("T1");
    assert.strictEqual(asset?.isCountry, false);
    assert.ok(asset?.logo);
  });

  it("Gen.G và GEN / Samsung Galaxy phải khớp nhau", () => {
    assert.strictEqual(isEsportsTeamMatch("Gen.G", "GEN"), true);
    assert.strictEqual(isEsportsTeamMatch("Gen.G", "Samsung Galaxy"), true);
    assert.strictEqual(isSingleTeamMatching("Gen.G", "GEN"), true);
  });

  it("Hanwha Life Esports và HLE phải khớp nhau", () => {
    assert.strictEqual(isEsportsTeamMatch("Hanwha Life", "HLE"), true);
    assert.strictEqual(isEsportsTeamMatch("Hanwha Life Esports", "HLE"), true);
    assert.strictEqual(isSingleTeamMatching("Hanwha Life", "HLE"), true);
  });

  it("Top Esports và TES phải khớp nhau", () => {
    assert.strictEqual(isEsportsTeamMatch("Top Esports", "TES"), true);
    assert.strictEqual(isSingleTeamMatching("Top Esports", "TES"), true);
  });

  it("Weibo Gaming và WBG phải khớp nhau", () => {
    assert.strictEqual(isEsportsTeamMatch("Weibo Gaming", "WBG"), true);
    assert.strictEqual(isSingleTeamMatching("Weibo Gaming", "WBG"), true);
  });

  it("GAM Esports và GAM phải khớp nhau", () => {
    assert.strictEqual(isEsportsTeamMatch("GAM Esports", "GAM"), true);
    assert.strictEqual(isSingleTeamMatching("GAM Esports", "GAM"), true);
  });

  it("Team Whales và TW phải khớp nhau (VCS)", () => {
    assert.strictEqual(isEsportsTeamMatch("Team Whales", "TW"), true);
    assert.strictEqual(isSingleTeamMatching("Team Whales", "TW"), true);
  });

  it("Saigon Phantom và SGP phải khớp nhau (Liên Quân)", () => {
    assert.strictEqual(isEsportsTeamMatch("Saigon Phantom", "SGP"), true);
    assert.strictEqual(isSingleTeamMatching("Saigon Phantom", "SGP"), true);
  });

  it("V Gaming và VGM / VGP phải khớp nhau", () => {
    assert.strictEqual(isEsportsTeamMatch("V Gaming", "VGM"), true);
    assert.strictEqual(isEsportsTeamMatch("V Gaming", "VGP"), true);
    assert.strictEqual(isSingleTeamMatching("V Gaming", "VGM"), true);
  });

  it("G2 Esports và G2 phải khớp nhau", () => {
    assert.strictEqual(isEsportsTeamMatch("G2 Esports", "G2"), true);
    assert.strictEqual(isSingleTeamMatching("G2 Esports", "G2"), true);
  });

  it("Fnatic và FNC phải khớp nhau", () => {
    assert.strictEqual(isEsportsTeamMatch("Fnatic", "FNC"), true);
    assert.strictEqual(isSingleTeamMatching("Fnatic", "FNC"), true);
  });

  it("Team Liquid và TL phải khớp nhau", () => {
    assert.strictEqual(isEsportsTeamMatch("Team Liquid", "TL"), true);
    assert.strictEqual(isSingleTeamMatching("Team Liquid", "TL"), true);
  });

  // =========================================================================
  // 3. BẢO VỆ CHỐNG NHẦM LẪN VỚI CỜ QUỐC GIA (ZERO TOLERANCE)
  // =========================================================================
  it("Các mã viết tắt esports (DK, TW, TL, AL, TT) không được bị nhận diện nhầm thành quốc gia", () => {
    const dk = getTeamAsset("DK");
    assert.strictEqual(dk?.isCountry, false);
    assert.notStrictEqual(dk?.emoji, "🇩🇰");

    const tw = getTeamAsset("TW");
    assert.strictEqual(tw?.isCountry, false);
    assert.notStrictEqual(tw?.emoji, "🇹🇼");

    const tl = getTeamAsset("TL");
    assert.strictEqual(tl?.isCountry, false);
    assert.notStrictEqual(tl?.emoji, "🇹🇱");

    const al = getTeamAsset("AL");
    assert.strictEqual(al?.isCountry, false);
    assert.notStrictEqual(al?.emoji, "🇦🇱");

    const tt = getTeamAsset("TT");
    assert.strictEqual(tt?.isCountry, false);
    assert.notStrictEqual(tt?.emoji, "🇹🇹");
  });

  it("enrichMatchLogosSync tự động điền logo HD cho các đội esports khi chưa có logo", () => {
    const matches: Array<{ team1: string; team2: string; sport: string; homeLogo?: string; awayLogo?: string }> = [
      { team1: "DK", team2: "BLG", sport: "esports" },
      { team1: "T1", team2: "HLE", sport: "esports" },
    ];
    const enriched = enrichMatchLogosSync(matches);

    assert.ok(enriched[0].homeLogo && enriched[0].homeLogo.includes("DPlus_KIA_Logo"));
    assert.ok(enriched[0].awayLogo && enriched[0].awayLogo.includes("Bilibili_Gaming_logo"));
    assert.ok(enriched[1].homeLogo && enriched[1].homeLogo.includes("4o02u71705664404.png"));
    assert.ok(enriched[1].awayLogo && enriched[1].awayLogo.includes("Hanwha_Life_Esports_logo"));
  });
});
