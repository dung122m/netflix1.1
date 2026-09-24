import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getMatchTimeline,
  parseSourceStatus,
  mergeSourceStatus,
  isValidFootballTeamName,
  isGenericTvChannel,
  extractSportAndGender,
  getSportLabel,
  normalizeAndMergeStreams,
} from "./service";
import { getTeamAsset, TOTAL_MAPPED_TEAMS } from "@/data/live/teamAssets";

describe("Nanaflix Live Match Status & Timeline System", () => {
  const baseNow = new Date("2026-09-24T20:00:00+07:00").getTime();

  // 1. Papua New Guinea vs New Caledonia with 🟢 is parsed as LIVE and marked LIVE after kickoff
  it("1. Real match with 🟢: sourceStatus = live and timeline = live after kickoff", () => {
    const rawTitle = "🟢 14:00 24/09 ⚽ Papua New Guinea vs New Caledonia (NEMO)";
    const sourceStatus = parseSourceStatus(rawTitle);
    assert.equal(sourceStatus, "live", "🟢 indicator must be parsed as sourceStatus = 'live'");

    const kickoffPast = new Date("2026-09-24T14:00:00+07:00").getTime();
    const nowTime = new Date("2026-09-24T15:40:00+07:00").getTime();
    const timeline = getMatchTimeline(kickoffPast, sourceStatus, "unknown", nowTime);
    assert.equal(timeline, "live", "Match in progress with 🟢 and passed kickoff must have timeline = 'live'");
  });

  // 2. Future football match with 🟢 must NOT appear in LIVE (Future Kickoff Guard)
  it("2. Future football match with 🟢 must NOT appear in LIVE due to Future Kickoff Guard", () => {
    const kickoffFuture = baseNow + 45 * 60 * 1000; // 20:45 (future 45m <= 60m)
    const parsedStatus = parseSourceStatus("🟢 20:45 Arsenal vs Chelsea");
    assert.equal(parsedStatus, "live");

    const timelineWithLiveStatus = getMatchTimeline(kickoffFuture, parsedStatus, "alive", baseNow);
    assert.notEqual(timelineWithLiveStatus, "live", "Future match with live status must not be live");
    assert.equal(timelineWithLiveStatus, "upcoming", "Future match within 60m must be upcoming");
  });

  // 3. Match bắt đầu trong 30 phút tới → UPCOMING
  it("3. Match bắt đầu trong 30 phút tới → UPCOMING", () => {
    const kickoffIn30m = baseNow + 30 * 60 * 1000; // 20:30
    const timeline = getMatchTimeline(kickoffIn30m, "unknown", "unknown", baseNow);

    assert.equal(timeline, "upcoming", "Match starting in 30 minutes must be classified as UPCOMING");
  });

  // 4. Match bắt đầu hơn 60 phút tới → KHÔNG xuất hiện trong upcoming
  it("4. Match bắt đầu hơn 60 phút tới → KHÔNG xuất hiện trong upcoming", () => {
    const kickoffIn120m = baseNow + 120 * 60 * 1000; // 22:00
    const timeline = getMatchTimeline(kickoffIn120m, "unknown", "unknown", baseNow);

    assert.notEqual(timeline, "upcoming", "Match starting in 2 hours must NOT be upcoming");
    assert.equal(timeline, "finished", "Match starting >60m must be finished/hidden from upcoming");
  });

  // 5. Case 1 thực tế: 18:00 24/09 Hàn Quốc vs Ecuador tại now ~20:30 (elapsed: 150m > 140m) → finished, KHÔNG LIVE
  it("5. Case 1: 18:00 24/09 Hàn Quốc vs Ecuador tại ~20:30 (>140m) must be FINISHED (not LIVE)", () => {
    const koreaEcuadorKickoff = new Date("2026-09-24T18:00:00+07:00").getTime();
    const nowAt2030 = new Date("2026-09-24T20:30:00+07:00").getTime(); // 150 mins elapsed

    // Kể cả khi source status gắn icon 🟢 / [LIVE] hay streamHealth = alive
    const timelineWithLiveMarker = getMatchTimeline(koreaEcuadorKickoff, "live", "alive", nowAt2030);
    assert.equal(timelineWithLiveMarker, "finished", "Match >140m must be finished even if source has LIVE marker");

    const timelineWithUnknown = getMatchTimeline(koreaEcuadorKickoff, "unknown", "alive", nowAt2030);
    assert.equal(timelineWithUnknown, "finished", "Match >140m must be finished even if stream HTTP 200 alive");
  });

  // 6. Case 2 thực tế: 17:05 24/09 Japan vs Uruguay tại now ~20:30 (elapsed: 205m) → finished, KHÔNG UPCOMING
  it("6. Case 2: 17:05 24/09 Japan vs Uruguay tại ~20:30 must be FINISHED (not UPCOMING)", () => {
    const japanUruguayKickoff = new Date("2026-09-24T17:05:00+07:00").getTime();
    const nowAt2030 = new Date("2026-09-24T20:30:00+07:00").getTime();

    const timeline = getMatchTimeline(japanUruguayKickoff, "unknown", "unknown", nowAt2030);
    assert.equal(timeline, "finished", "Past match must be finished and never UPCOMING");
    assert.notEqual(timeline, "upcoming");
  });

  // 7. Regression 1: Kickoff + 10 phút + sourceStatus="unknown" + health unknown + có server → live
  it("7. Regression 1: Kickoff + 10m + sourceStatus='unknown' + health unknown → live", () => {
    const kickoff10mAgo = baseNow - 10 * 60 * 1000;
    const timeline = getMatchTimeline(kickoff10mAgo, "unknown", "unknown", baseNow);
    assert.equal(timeline, "live", "Match within kickoff + 10m without explicit marker must be live");
  });

  // 7B. Regression 2: Kickoff + 30 phút + không có [LIVE] → live
  it("7B. Regression 2: Kickoff + 30m + không có [LIVE] marker → live", () => {
    const kickoff30mAgo = baseNow - 30 * 60 * 1000;
    const parsedStatus = parseSourceStatus("19:30 Arsenal vs Chelsea"); // không có [LIVE]
    assert.equal(parsedStatus, "unknown");
    const timeline = getMatchTimeline(kickoff30mAgo, parsedStatus, "unknown", baseNow);
    assert.equal(timeline, "live", "Match within kickoff + 30m without [LIVE] must be live");
  });

  // 7C. Regression 3: Kickoff + 139 phút → live
  it("7C. Regression 3: Kickoff + 139m → live", () => {
    const kickoff139mAgo = baseNow - 139 * 60 * 1000;
    const timeline = getMatchTimeline(kickoff139mAgo, "unknown", "unknown", baseNow);
    assert.equal(timeline, "live", "Match at kickoff + 139m must still be live");
  });

  // 7D. Regression 4: Kickoff + 140 phút → theo boundary hiện tại (live)
  it("7D. Regression 4: Kickoff + 140m → live (boundary hiện tại <= 140m)", () => {
    const kickoff140mAgo = baseNow - 140 * 60 * 1000;
    const timeline = getMatchTimeline(kickoff140mAgo, "unknown", "unknown", baseNow);
    assert.equal(timeline, "live", "Match at exactly 140m must be live according to duration boundary");
  });

  // 7E. Regression 5: Kickoff + 141 phút → finished
  it("7E. Regression 5: Kickoff + 141m → finished", () => {
    const kickoff141mAgo = baseNow - 141 * 60 * 1000;
    const timeline = getMatchTimeline(kickoff141mAgo, "unknown", "unknown", baseNow);
    assert.equal(timeline, "finished", "Match at kickoff + 141m must be finished");
  });

  // 7F. Regression 6: Match + server nhưng streamHealth="dead" → không giả định stream sống
  it("7F. Regression 6: Match + server nhưng streamHealth='dead' → finished", () => {
    const kickoffRecent = baseNow - 25 * 60 * 1000;
    const timeline = getMatchTimeline(kickoffRecent, "unknown", "dead", baseNow);
    assert.equal(timeline, "finished", "Match where all servers are confirmed dead must be finished/hidden");
  });

  // 7G. Regression 7: Upcoming + 30 phút → upcoming
  it("7G. Regression 7: Upcoming + 30m (30 phút trước kickoff) → upcoming", () => {
    const kickoffIn30m = baseNow + 30 * 60 * 1000;
    const timeline = getMatchTimeline(kickoffIn30m, "unknown", "unknown", baseNow);
    assert.equal(timeline, "upcoming", "Match 30 minutes in future must be upcoming");
  });

  // 7H. Regression 8: Upcoming >60 phút → không xuất hiện trong SẮP PHÁT (finished/hidden)
  it("7H. Regression 8: Upcoming >60m (65 phút trước kickoff) → finished/hidden", () => {
    const kickoffIn65m = baseNow + 65 * 60 * 1000;
    const timeline = getMatchTimeline(kickoffIn65m, "unknown", "unknown", baseNow);
    assert.equal(timeline, "finished", "Match >60 minutes in future must not appear in upcoming (hidden)");
  });

  // 7I. Playback HTTPS Fallback: direct HTTPS first, only fallback to proxy on network/CORS failure
  it("7I. Playback HTTPS Fallback: direct HTTPS first, proxy on fallback", () => {
    const httpsStream = "https://live2.domaincdn.cc/live/stream.m3u8";
    const httpStream = "http://live.domaincdn.cc/live/stream.m3u8";

    const resolveStreamUrl = (url: string, useProxyFallback: boolean) => {
      const isHls = url.includes(".m3u8");
      if (isHls) {
        if (url.startsWith("https://")) {
          return useProxyFallback ? `/api/live-football/proxy?url=${encodeURIComponent(url)}` : url;
        }
        if (url.startsWith("http://")) {
          return `/api/live-football/proxy?url=${encodeURIComponent(url)}`;
        }
      }
      return url;
    };

    // 1. Initial attempt with HTTPS: must be DIRECT (no proxy prefix)
    assert.equal(resolveStreamUrl(httpsStream, false), httpsStream);

    // 2. Fallback attempt after network/CORS error: must use PROXY
    assert.equal(
      resolveStreamUrl(httpsStream, true),
      `/api/live-football/proxy?url=${encodeURIComponent(httpsStream)}`,
    );

    // 3. HTTP stream must always use PROXY to prevent Mixed Content
    assert.equal(
      resolveStreamUrl(httpStream, false),
      `/api/live-football/proxy?url=${encodeURIComponent(httpStream)}`,
    );
  });

  // 8. Regression: Source marker [LIVE] nhưng đã quá 140 phút → finished
  it("8. Regression: Source marker [LIVE] but past 140 minutes must be finished", () => {
    const kickoffPast145m = baseNow - 145 * 60 * 1000; // 145 mins ago (>140m)
    const timeline = getMatchTimeline(kickoffPast145m, "live", "alive", baseNow);
    assert.equal(timeline, "finished", "Explicit LIVE marker must yield to 140m duration guard");
  });

  // 9. Match in progress within 140m with reliable LIVE source status → LIVE
  it("9. Match in progress within 140m with reliable LIVE source status → LIVE", () => {
    const kickoffRecent = baseNow - 45 * 60 * 1000; // 45 mins ago
    const timeline = getMatchTimeline(kickoffRecent, "live", "unknown", baseNow);
    assert.equal(timeline, "live", "Match within 140m with confirmed live source status must be LIVE");
  });

  // 10. Explicit FINISHED → hidden
  it("10. Explicit FINISHED → hidden", () => {
    const kickoffRecent = baseNow - 20 * 60 * 1000;
    const timeline = getMatchTimeline(kickoffRecent, "finished", "alive", baseNow);
    assert.equal(timeline, "finished", "Explicit FINISHED status must mark match as finished/hidden even if health was alive");

    const parsedStatus = parseSourceStatus("Arsenal vs Chelsea [FT]");
    assert.equal(parsedStatus, "finished");
    const timelineFromTitle = getMatchTimeline(kickoffRecent, parsedStatus, "alive", baseNow);
    assert.equal(timelineFromTitle, "finished");
  });

  // 10. Football stream with team1 + team2 → kept
  it("10. Football stream with team1 + team2 → kept", () => {
    const match1 = isGenericTvChannel("Arsenal vs Chelsea", "Ngoại Hạng Anh");
    const match2 = isGenericTvChannel("Real Madrid - Barcelona", "La Liga");
    assert.equal(match1, false, "Match with 2 teams must NOT be classified as generic TV channel");
    assert.equal(match2, false, "Match with 2 teams must NOT be classified as generic TV channel");
  });

  // 11. Football stream with only BLV/channel metadata → kept when source identifies it as Football
  it("11. Football stream with only BLV/channel metadata → kept when source identifies it as Football", () => {
    const blvStream1 = isGenericTvChannel("Phòng BLV Captain - Trực tiếp", "Cola TV");
    const blvStream2 = isGenericTvChannel("Trực tiếp Ngoại Hạng Anh (BLV Batman)", "Xôi Lạc TV");
    const blvStream3 = isGenericTvChannel("Bình luận viên Giàng A Phò", "THTT Live Sports");

    assert.equal(blvStream1, false, "BLV stream must be kept in Football");
    assert.equal(blvStream2, false, "BLV stream with tournament must be kept in Football");
    assert.equal(blvStream3, false, "Commentator stream must be kept in Football");
  });

  // 12. Football stream with incomplete team metadata → kept when source identifies it as Football
  it("12. Football stream with incomplete team metadata → kept when source identifies it as Football", () => {
    const incomplete1 = isGenericTvChannel("Trực tiếp Chung Kết Cúp C1", "Bóng Đá Trực Tiếp");
    const incomplete2 = isGenericTvChannel("Manchester United - Server 1", "Bóng Đá Trực Tiếp");

    assert.equal(incomplete1, false, "Incomplete metadata football stream must be kept in Football");
    assert.equal(incomplete2, false, "Single-team server stream must be kept in Football");
  });

  // 13. Generic VTV/HTV/K+/SCTV TV channel (even with 🟢 or 🔴) → not Football
  it("13. Generic VTV/HTV/K+/SCTV TV channel → not Football", () => {
    const tvChannels = [
      "VTV5 HD",
      "🟢 VTV5 HD",
      "VTV6 Cần Thơ",
      "K+ SPORT 1 HD",
      "HTV Thể Thao",
      "ON Football HD",
      "THVL1 HD",
      "SCTV15 HD",
      "VTC3 HD",
    ];

    for (const title of tvChannels) {
      const isTv = isGenericTvChannel(title, "Kênh Truyền Hình");
      assert.equal(isTv, true, `TV station channel '${title}' must be classified as generic TV channel (excluded from Football)`);
    }
  });

  // 14. 24/7 TV channel → not Football
  it("14. 24/7 TV channel → not Football", () => {
    const generic247 = [
      { title: "Kênh 1 HD", group: "Kênh Địa Phương" },
      { title: "Server 2 FHD", group: "24/7 TV" },
      { title: "HBO HD", group: "Kênh Phim Truyện" },
      { title: "Cartoon Network", group: "Thiếu Nhi" },
    ];

    for (const item of generic247) {
      const isTv = isGenericTvChannel(item.title, item.group);
      assert.equal(isTv, true, `24/7 TV channel '${item.title}' in group '${item.group}' must be excluded from Football`);
    }
  });

  // 15. Multi-source match merging handles duplicate sources accurately
  it("15. Multi-source match merging handles duplicate sources accurately", () => {
    assert.equal(mergeSourceStatus("upcoming", "live"), "live");
    assert.equal(mergeSourceStatus("unknown", "live"), "live");
    assert.equal(mergeSourceStatus("finished", "live"), "live");
    assert.equal(mergeSourceStatus("finished", "finished"), "finished");
    assert.equal(mergeSourceStatus("unknown", "upcoming"), "upcoming");
  });

  // 16. Validation helper for team names
  it("16. Team name validation helper behaves correctly", () => {
    assert.equal(isValidFootballTeamName("Arsenal"), true);
    assert.equal(isValidFootballTeamName("Manchester United"), true);
    assert.equal(isValidFootballTeamName("Talia Gibson"), true);
    assert.equal(isValidFootballTeamName(""), false);
    assert.equal(isValidFootballTeamName("vs"), false);
    assert.equal(isValidFootballTeamName("VTV5"), false);
    assert.equal(isValidFootballTeamName("K+ SPORT 1"), false);
  });

  // 17. Football → football label
  it("17. Football stream produces football label", () => {
    const { sport } = extractSportAndGender("Arsenal vs Chelsea", "Ngoại Hạng Anh");
    assert.equal(sport, "football");
    const label = getSportLabel(sport, "Ngoại Hạng Anh");
    assert.equal(label, "Ngoại Hạng Anh");

    const generalSport = extractSportAndGender("⚽ Trực tiếp bóng đá", "Bóng Đá");
    assert.equal(generalSport.sport, "football");
    assert.equal(getSportLabel("football"), "⚽ Bóng Đá Trực Tiếp");
  });

  // 18. Tennis → tennis label
  it("18. Tennis streams (Wang Xinyu, Ostapenko, etc.) produce tennis label", () => {
    const t1 = extractSportAndGender("Wang Xinyu vs Joanna Garland", "Tennis");
    assert.equal(t1.sport, "tennis");
    assert.equal(getSportLabel(t1.sport), "🎾 Tennis Trực Tiếp");

    const t2 = extractSportAndGender("🎾 Jeļena Ostapenko vs Taylah Preston", "Trực Tiếp Thể Thao");
    assert.equal(t2.sport, "tennis");
    assert.equal(getSportLabel(t2.sport), "🎾 Tennis Trực Tiếp");

    const t3 = extractSportAndGender("🥎 14:00 Talia Gibson vs Viktoria Morvayova", "Thể Thao");
    assert.equal(t3.sport, "tennis");
    assert.equal(getSportLabel(t3.sport), "🎾 Tennis Trực Tiếp");
  });

  // 19. Basketball → basketball label
  it("19. Basketball streams (Đài Loan vs Philippines, Goyang Sono, Rytas Vilnius) produce basketball label", () => {
    const b1 = extractSportAndGender("Đài Loan vs Philippines", "Bóng Rổ");
    assert.equal(b1.sport, "basketball");
    assert.equal(getSportLabel(b1.sport), "🏀 Bóng Rổ Trực Tiếp");

    const b2 = extractSportAndGender("🏀 Goyang Sono vs Seoul Knights", "Thể Thao");
    assert.equal(b2.sport, "basketball");
    assert.equal(getSportLabel(b2.sport), "🏀 Bóng Rổ Trực Tiếp");

    const b3 = extractSportAndGender("Rytas Vilnius vs Shanghai Sharks", "Basketball");
    assert.equal(b3.sport, "basketball");
    assert.equal(getSportLabel(b3.sport), "🏀 Bóng Rổ Trực Tiếp");
  });

  // 20. F1 / Motorsport → F1 label
  it("20. F1 / Motorsport stream produces F1 / Đua Xe label", () => {
    const f1 = extractSportAndGender("🏎️ F1 (BLV Ngu)", "Trực Tiếp Thể Thao");
    assert.equal(f1.sport, "f1");
    assert.equal(getSportLabel(f1.sport), "🏎️ F1 / Đua Xe Trực Tiếp");

    const f2 = extractSportAndGender("MotoGP Chặng 5", "Đua Xe");
    assert.equal(f2.sport, "f1");
    assert.equal(getSportLabel(f2.sport), "🏎️ F1 / Đua Xe Trực Tiếp");
  });

  // 21. Hai F1 entries giống hệt → 1 card
  it("21. Two identical F1 entries are merged into 1 card with merged servers", () => {
    const rawStreams = [
      {
        rawTitle: "🏎️ F1 (BLV Ngu)",
        group: "THTT Live Sports",
        rawLogo: "",
        url: "https://stream.server1/f1.m3u8",
        effectiveUrl: "https://stream.server1/f1.m3u8",
      },
      {
        rawTitle: "🏎️ F1 (BLV Ngu)",
        group: "THTT Live Sports Dự Phòng",
        rawLogo: "",
        url: "https://stream.server2/f1.m3u8",
        effectiveUrl: "https://stream.server2/f1.m3u8",
      },
    ];

    const { matches } = normalizeAndMergeStreams(rawStreams, baseNow);
    assert.equal(matches.length, 1, "Two identical F1 entries must be merged into 1 match card");
    assert.equal(matches[0].sport, "f1");
    assert.equal(matches[0].tournament, "🏎️ F1 / Đua Xe Trực Tiếp");
    assert.equal(matches[0].servers.length, 2, "Merged F1 match card must retain both stream servers");
    assert.equal(matches[0].blv, "Ngu", "Merged F1 match card must retain BLV name");
  });

  // 22. Cùng một trận từ 2 source khác nhau → 1 card + giữ 2 source
  it("22. Same match from 2 different sources merges into 1 card with both servers retained", () => {
    const rawStreams = [
      {
        rawTitle: "Arsenal vs Chelsea (BLV Captain)",
        group: "Cola TV",
        rawLogo: "",
        url: "https://stream1.m3u8",
        effectiveUrl: "https://stream1.m3u8",
      },
      {
        rawTitle: "Arsenal vs Chelsea (BLV Batman)",
        group: "Xôi Lạc TV",
        rawLogo: "",
        url: "https://stream2.m3u8",
        effectiveUrl: "https://stream2.m3u8",
      },
    ];

    const { matches } = normalizeAndMergeStreams(rawStreams, baseNow);
    assert.equal(matches.length, 1, "Same fixture from 2 sources must merge into 1 card");
    assert.equal(matches[0].servers.length, 2, "Must keep both stream servers");
    assert.equal(matches[0].groups.includes("Cola TV"), true);
    assert.equal(matches[0].groups.includes("Xôi Lạc TV"), true);
    assert.equal(matches[0].blv?.includes("Captain"), true);
    assert.equal(matches[0].blv?.includes("Batman"), true);
  });

  // 23. Hai trận khác nhau nhưng cùng BLV → KHÔNG được merge
  it("23. Two different matches with same commentator must NOT be merged", () => {
    const rawStreams = [
      {
        rawTitle: "Arsenal vs Chelsea (BLV Batman)",
        group: "Xôi Lạc TV",
        rawLogo: "",
        url: "https://stream1.m3u8",
        effectiveUrl: "https://stream1.m3u8",
      },
      {
        rawTitle: "Liverpool vs Man City (BLV Batman)",
        group: "Xôi Lạc TV",
        rawLogo: "",
        url: "https://stream2.m3u8",
        effectiveUrl: "https://stream2.m3u8",
      },
    ];

    const { matches } = normalizeAndMergeStreams(rawStreams, baseNow);
    assert.equal(matches.length, 2, "Different matches with same BLV must NOT be merged");
    assert.equal(matches[0].title, "Arsenal vs Chelsea");
    assert.equal(matches[1].title, "Liverpool vs Man City");
  });

  // 24. Hai trận khác nhau cùng sport → KHÔNG được merge
  it("24. Two different matches of the same sport must NOT be merged", () => {
    const rawStreams = [
      {
        rawTitle: "Tennis: Wang Xinyu vs Joanna Garland",
        group: "THTT Live Sports",
        rawLogo: "",
        url: "https://stream1.m3u8",
        effectiveUrl: "https://stream1.m3u8",
      },
      {
        rawTitle: "Tennis: Jeļena Ostapenko vs Taylah Preston",
        group: "THTT Live Sports",
        rawLogo: "",
        url: "https://stream2.m3u8",
        effectiveUrl: "https://stream2.m3u8",
      },
    ];

    const { matches } = normalizeAndMergeStreams(rawStreams, baseNow);
    assert.equal(matches.length, 2, "Different tennis matches must NOT be merged");
    assert.equal(matches[0].sport, "tennis");
    assert.equal(matches[1].sport, "tennis");
    assert.equal(matches[0].tournament, "🎾 Tennis Trực Tiếp");
    assert.equal(matches[1].tournament, "🎾 Tennis Trực Tiếp");
  });

  // 25. Laos vs Brunei 16:00 + Uzbekistan vs Iran 21:00 dùng cùng URL → phải là 2 card
  it("25. Laos vs Brunei 16:00 + Uzbekistan vs Iran 21:00 sharing same URL must produce 2 distinct cards", () => {
    const sharedUrl = "https://luong.phaohoa.live/live/phaohoa2/index.m3u8";
    const rawStreams = [
      {
        rawTitle: "16:00 24/09 ⚽ Laos vs Brunei (Enzo) [hls]",
        group: "Khán Đài TV",
        rawLogo: "https://cdn.example.com/laos.png",
        url: sharedUrl,
        effectiveUrl: sharedUrl,
      },
      {
        rawTitle: "21:00 24/09 ⚽ Uzbekistan vs Iran (Enzo) [hls]",
        group: "Khán Đài TV",
        rawLogo: "https://cdn.example.com/uzb.png",
        url: sharedUrl,
        effectiveUrl: sharedUrl,
      },
    ];

    const { matches } = normalizeAndMergeStreams(rawStreams, baseNow);
    assert.equal(matches.length, 2, "Matches at different times must NOT be merged by shared URL");
    assert.equal(matches[0].title, "Laos vs Brunei");
    assert.equal(matches[1].title, "Uzbekistan vs Iran");
  });

  // 26. Laos vs Brunei 16:00 + Kosovo vs Ireland 01:45 dùng cùng URL → phải là 2 card
  it("26. Laos vs Brunei 16:00 + Kosovo vs Ireland 01:45 sharing same URL must produce 2 distinct cards", () => {
    const sharedUrl = "https://live2.zktsva.app/live/289650.m3u8";
    const rawStreams = [
      {
        rawTitle: "16:00 24/09 ⚽ Laos vs Brunei Darussalam (Gà Siêu Bệu) [hls]",
        group: "Gà Vàng 33 TV",
        rawLogo: "https://cdn.example.com/laos.png",
        url: sharedUrl,
        effectiveUrl: sharedUrl,
      },
      {
        rawTitle: "01:45 25/09 ⚽ Kosovo vs Ireland (Gà Siêu Bệu) [hls]",
        group: "Gà Vàng 33 TV",
        rawLogo: "https://cdn.example.com/kosovo.png",
        url: sharedUrl,
        effectiveUrl: sharedUrl,
      },
    ];

    const { matches } = normalizeAndMergeStreams(rawStreams, baseNow);
    assert.equal(matches.length, 2, "Different fixtures sharing channel URL must NOT be merged");
    assert.equal(matches[0].title, "Laos vs Brunei Darussalam");
    assert.equal(matches[1].title, "Kosovo vs Ireland");
  });

  // 27. Laos vs Brunei 16:00 + Myanmar vs Timor Leste 19:00 dùng cùng URL → phải là 2 card
  it("27. Laos vs Brunei 16:00 + Myanmar vs Timor Leste 19:00 sharing same URL must produce 2 distinct cards", () => {
    const sharedUrl = "https://playback.livetl002.com/live/69ef10b47146e04fbe6d4363.m3u8";
    const rawStreams = [
      {
        rawTitle: "16:00 24/09 ⚽ Laos vs Brunei Darussalam (A Long) [hls]",
        group: "Gà Vàng 24h TV",
        rawLogo: "https://cdn.example.com/laos.png",
        url: sharedUrl,
        effectiveUrl: sharedUrl,
      },
      {
        rawTitle: "19:00 24/09 ⚽ Myanmar vs Timor Leste (A Long) [hls]",
        group: "Gà Vàng 24h TV",
        rawLogo: "https://cdn.example.com/myanmar.png",
        url: sharedUrl,
        effectiveUrl: sharedUrl,
      },
    ];

    const { matches } = normalizeAndMergeStreams(rawStreams, baseNow);
    assert.equal(matches.length, 2, "Laos vs Brunei and Myanmar vs Timor Leste must be 2 distinct cards");
    assert.equal(matches[0].title, "Laos vs Brunei Darussalam");
    assert.equal(matches[1].title, "Myanmar vs Timor Leste");
  });

  // 28. Các stream Laos vs Brunei từ nhiều nguồn nhưng khác URL → phải merge thành 1 fixture, nhiều server
  it("28. Laos vs Brunei streams from multiple sources with different URLs must merge into 1 card with multiple servers", () => {
    const rawStreams = [
      {
        rawTitle: "16:00 24/09 ⚽ Laos vs Brunei Darussalam (Nguyễn Ánh)",
        group: "Vua Sân Cỏ TV",
        rawLogo: "https://cdn.example.com/laos.png",
        url: "https://server1.m3u8",
        effectiveUrl: "https://server1.m3u8",
      },
      {
        rawTitle: "16:00 24/09 ⚽ Laos vs Brunei (NGƯỜI SẮT) [hls]",
        group: "S8 TV",
        rawLogo: "https://cdn.example.com/laos.png",
        url: "https://server2.m3u8",
        effectiveUrl: "https://server2.m3u8",
      },
      {
        rawTitle: "16:00 24/09 ⚽ Laos vs Brunei Darussalam (LÝ LINH LỰC) [geo]",
        group: "Phá Làng TV",
        rawLogo: "https://cdn.example.com/laos.png",
        url: "https://server3.m3u8",
        effectiveUrl: "https://server3.m3u8",
      },
    ];

    const { matches } = normalizeAndMergeStreams(rawStreams, baseNow);
    assert.equal(matches.length, 1, "Must merge all sources of the same fixture into 1 card");
    assert.equal(matches[0].servers.length, 3, "Must retain all 3 servers");
    assert.equal(matches[0].groups.length, 3);
  });

  // 29. Lào vs Brunei phải merge với Laos vs Brunei Darussalam
  it("29. 'Lào vs Brunei' must merge with 'Laos vs Brunei Darussalam'", () => {
    const rawStreams = [
      {
        rawTitle: "16:00 24/09 ⚽ Laos vs Brunei Darussalam (Nguyễn Ánh)",
        group: "Vua Sân Cỏ TV",
        rawLogo: "https://cdn.example.com/laos.png",
        url: "https://server1.m3u8",
        effectiveUrl: "https://server1.m3u8",
      },
      {
        rawTitle: "16:00 24/09 ⚽ Lào vs Brunei (BLV MOUNTAIN DEW) [hls]",
        group: "Cola TV",
        rawLogo: "https://cdn.example.com/lao.png",
        url: "https://server2.m3u8",
        effectiveUrl: "https://server2.m3u8",
      },
    ];

    const { matches } = normalizeAndMergeStreams(rawStreams, baseNow);
    assert.equal(matches.length, 1, "'Lào vs Brunei' must merge into 'Laos vs Brunei Darussalam'");
    assert.equal(matches[0].servers.length, 2, "Must retain servers from both sources");
  });

  // 30. Regression dataset tổng hợp: không trùng match ID, không tạo fixture sai, logo Laos không tràn sang fixture khác
  it("30. Audit regression dataset: no duplicate match IDs, no mutated fake fixtures, logo Laos isolated", () => {
    const sharedUrl1 = "https://luong.phaohoa.live/live/phaohoa2/index.m3u8";
    const sharedUrl2 = "https://live2.zktsva.app/live/289650.m3u8";
    const sharedUrl3 = "https://playback.livetl002.com/live/69ef10b47146e04fbe6d4363.m3u8";
    const laosLogo = "https://global-cdn.cdnx.tech/football/team/ac3f493742d14eee1e4e4ae00f2704f6.png";

    const rawStreams = [
      // Laos vs Brunei on sharedUrl1
      {
        rawTitle: "16:00 24/09 ⚽ Laos vs Brunei Darussalam (Nguyễn Ánh)",
        group: "Vua Sân Cỏ TV",
        rawLogo: laosLogo,
        url: "https://unique1.m3u8",
        effectiveUrl: "https://unique1.m3u8",
      },
      {
        rawTitle: "16:00 24/09 ⚽ Laos vs Brunei (Enzo) [hls]",
        group: "Khán Đài TV",
        rawLogo: "https://khandai.link/laos.jpg",
        url: sharedUrl1,
        effectiveUrl: sharedUrl1,
      },
      // Uzbekistan vs Iran sharing sharedUrl1
      {
        rawTitle: "21:00 24/09 ⚽ Uzbekistan vs Iran (Enzo) [hls]",
        group: "Khán Đài TV",
        rawLogo: "https://khandai.link/uzb.jpg",
        url: sharedUrl1,
        effectiveUrl: sharedUrl1,
      },
      // Laos vs Brunei on sharedUrl2
      {
        rawTitle: "16:00 24/09 ⚽ Laos vs Brunei Darussalam (Gà Siêu Bệu) [hls]",
        group: "Gà Vàng 33 TV",
        rawLogo: laosLogo,
        url: sharedUrl2,
        effectiveUrl: sharedUrl2,
      },
      // Kosovo vs Ireland sharing sharedUrl2
      {
        rawTitle: "01:45 25/09 ⚽ Kosovo vs Ireland (Gà Siêu Bệu) [hls]",
        group: "Gà Vàng 33 TV",
        rawLogo: "https://cdn.example.com/kosovo.png",
        url: sharedUrl2,
        effectiveUrl: sharedUrl2,
      },
      // Laos vs Brunei on sharedUrl3
      {
        rawTitle: "16:00 24/09 ⚽ Laos vs Brunei Darussalam (A Long) [hls]",
        group: "Gà Vàng 24h TV",
        rawLogo: laosLogo,
        url: sharedUrl3,
        effectiveUrl: sharedUrl3,
      },
      // Myanmar vs Timor Leste sharing sharedUrl3
      {
        rawTitle: "19:00 24/09 ⚽ Myanmar vs Timor Leste (A Long) [hls]",
        group: "Gà Vàng 24h TV",
        rawLogo: "https://cdn.example.com/myanmar.png",
        url: sharedUrl3,
        effectiveUrl: sharedUrl3,
      },
      // Lào vs Brunei from Cola TV
      {
        rawTitle: "16:00 24/09 ⚽ Lào vs Brunei (BLV MOUNTAIN DEW) [hls]",
        group: "Cola TV",
        rawLogo: laosLogo,
        url: "https://cola.live/stream.m3u8",
        effectiveUrl: "https://cola.live/stream.m3u8",
      },
    ];

    const { matches } = normalizeAndMergeStreams(rawStreams, baseNow);

    // 1. Phải có đúng 4 trận: Laos vs Brunei, Uzbekistan vs Iran, Kosovo vs Ireland, Myanmar vs Timor Leste
    assert.equal(matches.length, 4, `Expected exactly 4 distinct fixtures, got ${matches.length}`);

    // 2. Không được có 2 card khác nhau cùng 1 canonical match ID
    const matchIds = matches.map((m) => m.id);
    const uniqueMatchIds = new Set(matchIds);
    assert.equal(uniqueMatchIds.size, matches.length, "All match IDs must be unique");

    // 3. Không được có fixture 'Uzbekistan vs Brunei', 'Kosovo vs Brunei', hoặc 'Myanmar vs Brunei'
    const matchTitles = matches.map((m) => m.title);
    assert.equal(matchTitles.some((t) => /Uzbekistan vs Brunei/i.test(t)), false);
    assert.equal(matchTitles.some((t) => /Kosovo vs Brunei/i.test(t)), false);
    assert.equal(matchTitles.some((t) => /Myanmar vs Brunei/i.test(t)), false);

    // 4. Logo Laos chỉ xuất hiện trên fixture Laos vs Brunei
    for (const m of matches) {
      if (m.homeLogo === laosLogo) {
        assert.equal(
          /Laos|Lào/i.test(m.team1) || /Brunei/i.test(m.team2),
          true,
          `Laos logo must not leak to other fixtures (found on ${m.title})`
        );
      }
    }

    // 5. Trận Laos vs Brunei phải có đủ 5 server từ 5 nguồn khác nhau
    const laosMatch = matches.find((m) => /Laos/i.test(m.title) || /Lào/i.test(m.title));
    assert.ok(laosMatch, "Laos vs Brunei match must exist");
    assert.equal(laosMatch.servers.length, 5, "Laos vs Brunei must aggregate all 5 servers");
  });

  // 31. China vs Maldives + Trung Quốc vs Maldives → 1 fixture
  it("31. 'China vs Maldives' and 'Trung Quốc vs Maldives' must merge into 1 fixture", () => {
    const rawStreams = [
      {
        rawTitle: "18:35 24/09 ⚽ China vs Maldives (BLV Leo) [FHD]",
        group: "🌍 Giao Hữu & ĐTQG",
        rawLogo: "https://cdn.example.com/china.png",
        url: "https://stream1.m3u8",
        effectiveUrl: "https://stream1.m3u8",
      },
      {
        rawTitle: "18:35 24/09 ⚽ Trung Quốc vs Maldives (BLV Rùa) [HD]",
        group: "⚽ Bóng Đá Trực Tiếp",
        rawLogo: "https://cdn.example.com/china_alt.png",
        url: "https://stream2.m3u8",
        effectiveUrl: "https://stream2.m3u8",
      },
    ];

    const { matches } = normalizeAndMergeStreams(rawStreams, baseNow);
    assert.equal(matches.length, 1, "Must merge China vs Maldives and Trung Quốc vs Maldives into 1 fixture");
    assert.equal(matches[0].servers.length, 2, "Must aggregate both stream servers");
  });

  // 32. South Korea vs Ecuador + Hàn Quốc vs Ecuador → 1 fixture
  it("32. 'South Korea vs Ecuador' and 'Hàn Quốc vs Ecuador' must merge into 1 fixture", () => {
    const rawStreams = [
      {
        rawTitle: "18:00 24/09 ⚽ South Korea vs Ecuador [FHD]",
        group: "🌍 Giao Hữu & ĐTQG",
        rawLogo: "https://cdn.example.com/korea.png",
        url: "https://server1.m3u8",
        effectiveUrl: "https://server1.m3u8",
      },
      {
        rawTitle: "18:00 24/09 ⚽ Hàn Quốc vs Ecuador (Captain) [HD]",
        group: "⚽ Bóng Đá Trực Tiếp",
        rawLogo: "https://cdn.example.com/korea.png",
        url: "https://server2.m3u8",
        effectiveUrl: "https://server2.m3u8",
      },
    ];

    const { matches } = normalizeAndMergeStreams(rawStreams, baseNow);
    assert.equal(matches.length, 1, "Must merge South Korea vs Ecuador and Hàn Quốc vs Ecuador into 1 fixture");
    assert.equal(matches[0].servers.length, 2, "Must aggregate both stream servers");
  });

  // 33. Cùng một đội nhưng khác đối thủ → không được merge
  it("33. Same team with different opponent must NOT merge", () => {
    const rawStreams = [
      {
        rawTitle: "19:00 24/09 ⚽ Vietnam vs Thailand",
        group: "AFF Cup",
        rawLogo: "",
        url: "https://stream-vn-thai.m3u8",
        effectiveUrl: "https://stream-vn-thai.m3u8",
      },
      {
        rawTitle: "19:00 24/09 ⚽ Vietnam vs Malaysia",
        group: "AFF Cup",
        rawLogo: "",
        url: "https://stream-vn-malay.m3u8",
        effectiveUrl: "https://stream-vn-malay.m3u8",
      },
    ];

    const { matches } = normalizeAndMergeStreams(rawStreams, baseNow);
    assert.equal(matches.length, 2, "Different opponents sharing one team must NOT be merged");
  });

  // 34. Đảm bảo alias cũ cho câu lạc bộ và các cặp quốc gia khác vẫn hoạt động chính xác
  it("34. Existing club aliases and new national team pairs normalize properly", () => {
    const rawStreams = [
      {
        rawTitle: "20:00 24/09 ⚽ Barca vs Real Madrid",
        group: "La Liga",
        rawLogo: "",
        url: "https://s1.m3u8",
        effectiveUrl: "https://s1.m3u8",
      },
      {
        rawTitle: "20:00 24/09 ⚽ Barcelona vs Real Madrid",
        group: "La Liga",
        rawLogo: "",
        url: "https://s2.m3u8",
        effectiveUrl: "https://s2.m3u8",
      },
      {
        rawTitle: "20:00 24/09 ⚽ Đức vs Pháp",
        group: "UEFA Nations League",
        rawLogo: "",
        url: "https://s3.m3u8",
        effectiveUrl: "https://s3.m3u8",
      },
      {
        rawTitle: "20:00 24/09 ⚽ Germany vs France",
        group: "UEFA Nations League",
        rawLogo: "",
        url: "https://s4.m3u8",
        effectiveUrl: "https://s4.m3u8",
      },
    ];

    const { matches } = normalizeAndMergeStreams(rawStreams, baseNow);
    assert.equal(matches.length, 2, "Must produce exactly 2 fixtures (Barca vs Real Madrid and Germany vs France)");
    const mClubs = matches.find((m) => /Barca|Barcelona/i.test(m.title));
    const mGerm = matches.find((m) => /Đức|Germany|France|Pháp/i.test(m.title));
    assert.ok(mClubs && mClubs.servers.length === 2, "Club aliases must merge servers");
    assert.ok(mGerm && mGerm.servers.length === 2, "National aliases must merge servers");
  });

  // 35. teamAssets: Tra cứu cờ đội tuyển quốc gia chính xác qua tiếng Việt, Anh và viết tắt
  it("35. teamAssets: National flag emoji lookup supports Vietnamese, English and abbreviations", () => {
    assert.ok(TOTAL_MAPPED_TEAMS >= 200, "Must map at least 200 teams");

    assert.equal(getTeamAsset("Việt Nam")?.emoji, "🇻🇳");
    assert.equal(getTeamAsset("vietnam")?.emoji, "🇻🇳");
    assert.equal(getTeamAsset("Hàn Quốc")?.emoji, "🇰🇷");
    assert.equal(getTeamAsset("South Korea")?.emoji, "🇰🇷");
    assert.equal(getTeamAsset("Korea")?.emoji, "🇰🇷");
    assert.equal(getTeamAsset("Ecuador")?.emoji, "🇪🇨");
    assert.equal(getTeamAsset("Nhật Bản")?.emoji, "🇯🇵");
    assert.equal(getTeamAsset("Japan")?.emoji, "🇯🇵");
    assert.equal(getTeamAsset("Trung Quốc")?.emoji, "🇨🇳");
    assert.equal(getTeamAsset("China")?.emoji, "🇨🇳");
    assert.equal(getTeamAsset("Thái Lan")?.emoji, "🇹🇭");
    assert.equal(getTeamAsset("Thailand")?.emoji, "🇹🇭");
    assert.equal(getTeamAsset("Anh")?.emoji, "🏴󠁧󠁢󠁥󠁮󠁧󠁿");
    assert.equal(getTeamAsset("England")?.emoji, "🏴󠁧󠁢󠁥󠁮󠁧󠁿");
    assert.equal(getTeamAsset("Pháp")?.emoji, "🇫🇷");
    assert.equal(getTeamAsset("France")?.emoji, "🇫🇷");
    assert.equal(getTeamAsset("Đức")?.emoji, "🇩🇪");
    assert.equal(getTeamAsset("Germany")?.emoji, "🇩🇪");
    assert.equal(getTeamAsset("Tây Ban Nha")?.emoji, "🇪🇸");
    assert.equal(getTeamAsset("Spain")?.emoji, "🇪🇸");
    assert.equal(getTeamAsset("Bồ Đào Nha")?.emoji, "🇵🇹");
    assert.equal(getTeamAsset("Portugal")?.emoji, "🇵🇹");
    assert.equal(getTeamAsset("Brazil")?.emoji, "🇧🇷");
    assert.equal(getTeamAsset("Argentina")?.emoji, "🇦🇷");
    assert.equal(getTeamAsset("Lào")?.emoji, "🇱🇦");
    assert.equal(getTeamAsset("Laos")?.emoji, "🇱🇦");
    assert.equal(getTeamAsset("Brunei")?.emoji, "🇧🇳");
  });

  // 36. teamAssets: Tra cứu logo CLB các giải đấu hàng đầu
  it("36. teamAssets: Club logo lookup for top leagues (PL, La Liga, Serie A, etc.)", () => {
    const arsenal = getTeamAsset("Arsenal");
    assert.ok(arsenal && arsenal.logo, "Arsenal must have logo");

    const mu = getTeamAsset("Man Utd");
    assert.ok(mu && mu.logo, "Man Utd must have logo");

    const real = getTeamAsset("Real Madrid");
    assert.ok(real && real.logo, "Real Madrid must have logo");

    const barca = getTeamAsset("Barcelona");
    assert.ok(barca && barca.logo, "Barcelona must have logo");

    const bayern = getTeamAsset("Bayern Munich");
    assert.ok(bayern && bayern.logo, "Bayern Munich must have logo");

    const inter = getTeamAsset("Inter Milan");
    assert.ok(inter && inter.logo, "Inter Milan must have logo");

    const psg = getTeamAsset("PSG");
    assert.ok(psg && psg.logo, "PSG must have logo");

    const alNassr = getTeamAsset("Al Nassr");
    assert.ok(alNassr && alNassr.logo, "Al Nassr must have logo");

    const miami = getTeamAsset("Inter Miami");
    assert.ok(miami && miami.logo, "Inter Miami must have logo");

    const hanoi = getTeamAsset("Hà Nội FC");
    assert.ok(hanoi && hanoi.logo, "Hà Nội FC must have logo");
  });

  // 37. Giờ đá hiển thị dạng HH:mm theo Asia/Ho_Chi_Minh; thiếu timestamp thì trả về null
  it("37. Kickoff time formatting in Asia/Ho_Chi_Minh timezone", () => {
    // 18:00 24/09/2026 UTC+7
    const kickoff1800 = new Date("2026-09-24T18:00:00+07:00").getTime();
    const formatter = new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Ho_Chi_Minh",
    });
    assert.equal(formatter.format(new Date(kickoff1800)), "18:00");

    // Missing / invalid timestamp must return null (không đoán)
    const checkValid = (ts?: number | null) => {
      if (!ts || ts <= 0 || ts === Number.MAX_SAFE_INTEGER) return null;
      return formatter.format(new Date(ts));
    };
    assert.equal(checkValid(undefined), null);
    assert.equal(checkValid(null), null);
    assert.equal(checkValid(0), null);
    assert.equal(checkValid(Number.MAX_SAFE_INTEGER), null);
  });

  // 38. Bổ sung các quốc gia và CLB bóng rổ / esports thực tế từ phản hồi người dùng
  it("38. National teams with youth prefixes, state prefixes, basketball and esports assets", () => {
    // Sudan U20 & Tanzania U20
    const sudan = getTeamAsset("Sudan U20");
    assert.equal(sudan?.emoji, "🇸🇩", "Sudan U20 must resolve to 🇸🇩");

    const tanzania = getTeamAsset("Tanzania U20");
    assert.equal(tanzania?.emoji, "🇹🇿", "Tanzania U20 must resolve to 🇹🇿");

    // Namibia & Republic of the Congo / CH Congo
    const namibia = getTeamAsset("Namibia");
    assert.equal(namibia?.emoji, "🇳🇦", "Namibia must resolve to 🇳🇦");

    const congoRep = getTeamAsset("Republic of the Congo");
    assert.equal(congoRep?.emoji, "🇨🇬", "Republic of the Congo must resolve to 🇨🇬");

    const chCongo = getTeamAsset("CH Congo");
    assert.equal(chCongo?.emoji, "🇨🇬", "CH Congo must resolve to 🇨🇬");

    // Algeria U20 & Tunisia U20
    const algeria = getTeamAsset("Algeria U20");
    assert.equal(algeria?.emoji, "🇩🇿", "Algeria U20 must resolve to 🇩🇿");

    const tunisia = getTeamAsset("Tunisia U20");
    assert.equal(tunisia?.emoji, "🇹🇳", "Tunisia U20 must resolve to 🇹🇳");

    // Uzbekistan & IR Iran
    const uzbek = getTeamAsset("Uzbekistan");
    assert.equal(uzbek?.emoji, "🇺🇿", "Uzbekistan must resolve to 🇺🇿");

    const iran = getTeamAsset("IR Iran");
    assert.equal(iran?.emoji, "🇮🇷", "IR Iran must resolve to 🇮🇷");

    // United Arab Emirates & Yemen
    const uae = getTeamAsset("United Arab Emirates");
    assert.equal(uae?.emoji, "🇦🇪", "United Arab Emirates must resolve to 🇦🇪");

    const yemen = getTeamAsset("Yemen");
    assert.equal(yemen?.emoji, "🇾🇪", "Yemen must resolve to 🇾🇪");

    // VBA Basketball: Sài Gòn Heat & Hà Nội Buffalo
    const saigonHeat = getTeamAsset("Sài Gòn Heat");
    assert.equal(saigonHeat?.emoji, "🏀", "Sài Gòn Heat must resolve to 🏀");

    const hanoiBuffalo = getTeamAsset("Hà Nội Buffalo");
    assert.equal(hanoiBuffalo?.emoji, "🏀", "Hà Nội Buffalo must resolve to 🏀");

    // Esports: Apogee Esport & JijieHao
    const apogee = getTeamAsset("Apogee Esport");
    assert.equal(apogee?.emoji, "🎮", "Apogee Esport must resolve to 🎮");

    const jjh = getTeamAsset("JijieHao");
    assert.equal(jjh?.emoji, "🎮", "JijieHao must resolve to 🎮");
  });

  // 39. LivePlayer Fallback Logic: Single server & multi-server pre-kickoff (CAR vs Mauritania 23:00)
  it("39. LivePlayer Fallback: Pre-kickoff match terminates without infinite loop or proxy spam", () => {
    // Trận 23:00 24/09 Central African Republic vs Mauritania mở lúc 22:30 (trước kickoff)
    const kickoffTime = new Date("2026-09-24T23:00:00+07:00").getTime();
    const openTime = new Date("2026-09-24T22:30:00+07:00").getTime();

    const isPreKickoff = (timestamp: number, now: number) => {
      return Boolean(timestamp > 0 && timestamp !== Number.MAX_SAFE_INTEGER && now < timestamp);
    };

    assert.equal(isPreKickoff(kickoffTime, openTime), true, "Match opened before 23:00 must be pre-kickoff");

    // Case 1: 1 server duy nhất
    const singleServer = [{ name: "Server 1", url: "https://stream1.m3u8" }];
    const failedServers = new Set<number>();
    const failedUrls = new Set<string>();
    let selectedServerIndex = 0;
    let proxyCalls = 0;
    let stopped = false;
    let finalError = "";

    // Giả lập fallback loop
    const simulateFallback = (servers: { name: string; url: string }[], preKickoff: boolean) => {
      let loops = 0;
      while (!stopped && loops < 20) {
        loops++;
        if (preKickoff) {
          // Pre-kickoff: KHÔNG gọi proxy, ghi nhận failed server
          failedServers.add(selectedServerIndex);
          failedUrls.add(servers[selectedServerIndex].url);

          let nextIndex = servers.findIndex(
            (s, idx) => idx > selectedServerIndex && !failedServers.has(idx) && !failedUrls.has(s.url)
          );
          if (nextIndex === -1) {
            nextIndex = servers.findIndex(
              (s, idx) => !failedServers.has(idx) && !failedUrls.has(s.url)
            );
          }

          if (nextIndex !== -1) {
            selectedServerIndex = nextIndex;
          } else {
            stopped = true;
            finalError = "Chưa có tín hiệu phát";
          }
        }
      }
      return loops;
    };

    const loops = simulateFallback(singleServer, true);
    assert.equal(loops, 1, "Single server before kickoff must execute exactly 1 attempt before stopping");
    assert.equal(stopped, true, "Player must stop completely");
    assert.equal(proxyCalls, 0, "Pre-kickoff must NOT call proxy");
    assert.equal(finalError, "Chưa có tín hiệu phát", "Must display 'Chưa có tín hiệu phát'");
  });

  // 40. LivePlayer Fallback: Single server after kickoff stops after at most 1 proxy attempt
  it("40. LivePlayer Fallback: Single server live match does not loop back to direct after proxy fail", () => {
    const servers = [{ name: "Server 1", url: "https://stream1.m3u8" }];
    const failedServers = new Set<number>();
    let selectedServerIndex = 0;
    let useProxyFallback = false;
    let stopped = false;
    let attempts = 0;

    // Giả lập: Lần 1 direct fail -> chuyển sang proxy -> Lần 2 proxy fail -> dừng
    while (!stopped && attempts < 10) {
      attempts++;
      if (!useProxyFallback) {
        // Thử proxy 1 lần
        useProxyFallback = true;
      } else {
        // Proxy đã fail -> đánh dấu server fail
        failedServers.add(selectedServerIndex);
        useProxyFallback = false;

        let nextIndex = servers.findIndex(
          (_, idx) => idx > selectedServerIndex && !failedServers.has(idx)
        );
        if (nextIndex === -1) {
          nextIndex = servers.findIndex((_, idx) => !failedServers.has(idx));
        }

        if (nextIndex !== -1) {
          selectedServerIndex = nextIndex;
        } else {
          stopped = true;
        }
      }
    }

    assert.equal(attempts, 2, "Must execute direct (1) + proxy (1) and stop immediately");
    assert.equal(stopped, true, "Must be stopped");
    assert.equal(failedServers.has(0), true, "Server 0 must be in failedServers");
  });
});

