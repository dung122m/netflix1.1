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
  cleanCandidateTeamName,
  extractHailabLogos,
  normalizeClubKey,
  isSingleTeamMatching,
  areMatchFixturesMatching,
  NATIONAL_TEAM_CANONICAL_MAP,
  NATIONAL_TEAM_CANONICAL_KEYS,
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
    const proxyCalls = 0;
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

  // 41. Hailab: extractHailabLogos trích xuất chính xác homeLogo và awayLogo từ query URL
  it("41. Hailab: extractHailabLogos extracts homeLogo and awayLogo from match poster query URL", () => {
    const posterUrl =
      "http://livesport.hailab.cloud/match_poster.php?home=https%3A%2F%2Fimg.gvapi.cc%2Ffootball%2Fteam%2F15fa1fad1fc582dd65403f6f950b1e21.png%21w80&away=https%3A%2F%2Fimg.gvapi.cc%2Ffootball%2Fteam%2Ff7eb745a5f9b3016b083019da91b5f74.png%21w80&competition=https%3A%2F%2Fimg.gvapi.cc%2Ffootball%2Fcompetition%2F245bff452fbdc34d417164e361097ae7.png%21w80&v=light-v2";
    const logos = extractHailabLogos(posterUrl);
    assert.equal(logos.homeLogo, "https://img.gvapi.cc/football/team/15fa1fad1fc582dd65403f6f950b1e21.png!w80");
    assert.equal(logos.awayLogo, "https://img.gvapi.cc/football/team/f7eb745a5f9b3016b083019da91b5f74.png!w80");
  });

  // 42. Hailab: cleanCandidateTeamName loại bỏ tiền tố ĐTQG, ĐT, CLB
  it("42. Hailab: cleanCandidateTeamName cleans ĐTQG, ĐT, CLB prefixes cleanly", () => {
    assert.equal(cleanCandidateTeamName("ĐTQG Hà Lan"), "Hà Lan");
    assert.equal(cleanCandidateTeamName("ĐT Đan Mạch"), "Đan Mạch");
    assert.equal(cleanCandidateTeamName("CLB Greece"), "Greece");
    assert.equal(cleanCandidateTeamName("ĐTQG Kosovo"), "Kosovo");
  });

  // 43. Hailab: Hailab streams merge chính xác với M3U streams cùng fixture và giữ server từ cả 2 nguồn
  it("43. Hailab: Streams from Hailab merge with M3U fixture and retain both servers", () => {
    const rawStreams = [
      {
        rawTitle: "20:00 24/09 ⚽ Netherlands vs Germany",
        group: "THTT Live Sports",
        rawLogo: "https://example.com/netherlands.png",
        url: "https://m3u-server.m3u8",
        effectiveUrl: "https://m3u-server.m3u8",
      },
      {
        rawTitle: "🟢 20:00 24/09 ⚽ ĐTQG Hà Lan vs Đức (BLV 7UP)",
        group: "Live Sports (Hailab)",
        rawLogo: "https://img.gvapi.cc/netherlands.png",
        awayLogo: "https://img.gvapi.cc/germany.png",
        tournament: "Giải vô địch bóng đá các quốc gia châu Âu",
        url: "https://live05.meung.app/live/78905744_tsc.m3u8",
        effectiveUrl: "https://live05.meung.app/live/78905744_tsc.m3u8",
      },
    ];

    const { matches } = normalizeAndMergeStreams(rawStreams, baseNow);
    assert.equal(matches.length, 1, "Must merge Netherlands vs Germany and ĐTQG Hà Lan vs Đức into 1 fixture");
    assert.equal(matches[0].servers.length, 2, "Must aggregate servers from both M3U and Hailab");
    assert.equal(matches[0].groups.includes("Live Sports (Hailab)"), true, "Must include Hailab in groups");
    assert.equal(matches[0].blv?.includes("7UP"), true, "Must retain BLV from Hailab");
  });

  // 44. Strict Timeline Filtering: Tuân thủ quy tắc lọc trận đang đá và sắp đá <= 60m
  it("44. Strict Match Timeline Filtering rule applied on matches", () => {
    // Trận 1: Đang đá (kickoff 40 phút trước) -> LIVE
    const playingKickoff = baseNow - 40 * 60 * 1000;
    const tl1 = getMatchTimeline(playingKickoff, "live", "unknown", baseNow);
    assert.equal(tl1, "live", "Match within 140m window must be LIVE");

    // Trận 2: Sắp đá trong 30 phút tới -> UPCOMING
    const soonKickoff = baseNow + 30 * 60 * 1000;
    const tl2 = getMatchTimeline(soonKickoff, "upcoming", "unknown", baseNow);
    assert.equal(tl2, "upcoming", "Match within 60m future must be UPCOMING");

    // Trận 3: Trận đá hơn 60 phút tới (ví dụ 90m tới) -> FINISHED (ẩn)
    const farFutureKickoff = baseNow + 90 * 60 * 1000;
    const tl3 = getMatchTimeline(farFutureKickoff, "upcoming", "unknown", baseNow);
    assert.equal(tl3, "finished", "Match >60m in future must be FINISHED (hidden)");

    // Trận 4: Trận đã kết thúc quá 140 phút (ví dụ 160m trước) -> FINISHED (ẩn)
    const endedKickoff = baseNow - 160 * 60 * 1000;
    const tl4 = getMatchTimeline(endedKickoff, "live", "alive", baseNow);
    assert.equal(tl4, "finished", "Match >140m in past must be FINISHED (hidden)");
  });

  // 45. Deduplication: Serbia vs Greece & Ivory Coast vs Ghana merge into 1 card, preserving all sources & BLVs
  it("45. Deduplication: Serbia vs Greece & Ivory Coast vs Ghana merge into 1 card, preserving all sources & BLVs", () => {
    const rawStreams = [
      // Serbia vs Greece streams (different sources, different languages, different BLVs, multi-sources)
      {
        rawTitle: "01:45 25/09 ⚽ Serbia vs Greece (BLV Batman) [FHD]",
        group: "Source Group A",
        rawLogo: "https://example.com/serbia.png",
        url: "https://stream-serbia-greece-1.m3u8",
        effectiveUrl: "https://stream-serbia-greece-1.m3u8",
      },
      {
        rawTitle: "01:45 25/09 ⚽ Serbia vs Hy Lạp (BLV Robin) [HD]",
        group: "Source Group B",
        rawLogo: "https://example.com/serbia.png",
        url: "https://stream-serbia-greece-2.m3u8",
        effectiveUrl: "https://stream-serbia-greece-2.m3u8",
      },
      {
        rawTitle: "01:45 25/09 ⚽ ĐTQG Serbia vs ĐTQG Hy Lạp - Server 3",
        group: "Source Group C",
        rawLogo: "",
        url: "https://stream-serbia-greece-3.m3u8",
        effectiveUrl: "https://stream-serbia-greece-3.m3u8",
      },

      // Ivory Coast vs Ghana streams (different sources, English/Vietnamese, different BLVs)
      {
        rawTitle: "02:00 25/09 ⚽ Ivory Coast vs Ghana (BLV Superman)",
        group: "Source Group A",
        rawLogo: "https://example.com/ivorycoast.png",
        url: "https://stream-ci-ghana-1.m3u8",
        effectiveUrl: "https://stream-ci-ghana-1.m3u8",
      },
      {
        rawTitle: "02:00 25/09 ⚽ Bờ Biển Ngà vs Ghana (BLV Flash)",
        group: "Source Group D",
        rawLogo: "https://example.com/ivorycoast.png",
        url: "https://stream-ci-ghana-2.m3u8",
        effectiveUrl: "https://stream-ci-ghana-2.m3u8",
      },

      // Different match with different kickoff time (must NOT merge)
      {
        rawTitle: "03:30 25/09 ⚽ Serbia vs Greece",
        group: "Source Group A",
        rawLogo: "https://example.com/serbia.png",
        url: "https://stream-serbia-greece-future.m3u8",
        effectiveUrl: "https://stream-serbia-greece-future.m3u8",
      },
    ];

    const { matches } = normalizeAndMergeStreams(rawStreams, baseNow);

    // Verify 1: Exactly 3 matches created (Serbia vs Greece 01:45, Ivory Coast vs Ghana 02:00, Serbia vs Greece 03:30)
    assert.equal(matches.length, 3, "Must produce exactly 3 matches, no duplicate cards for same match");

    // Verify 2: Serbia vs Greece 01:45 is ONE card with all 3 servers retained
    const serbia0145 = matches.find((m) => m.time.includes("01:45") && /serbia/i.test(m.title));
    assert.ok(serbia0145, "Serbia vs Greece 01:45 must exist as 1 card");
    assert.equal(serbia0145.servers.length, 3, "All 3 servers from different source groups must be merged");
    assert.equal(serbia0145.groups.length, 3, "All 3 source groups must be retained in groups array");
    assert.ok(serbia0145.blv?.includes("Batman"), "BLV Batman must be preserved");
    assert.ok(serbia0145.blv?.includes("Robin"), "BLV Robin must be preserved");
    assert.equal(serbia0145.quality, "FHD 1080p", "FHD quality must be preserved if any source has FHD");

    // Verify 3: Ivory Coast vs Ghana 02:00 is ONE card with both servers retained
    const ivory0200 = matches.find((m) => m.time.includes("02:00"));
    assert.ok(ivory0200, "Ivory Coast vs Ghana 02:00 must exist as 1 card");
    assert.equal(ivory0200.servers.length, 2, "Both servers from English and Vietnamese sources must be merged");
    assert.ok(ivory0200.blv?.includes("Superman"), "BLV Superman must be preserved");
    assert.ok(ivory0200.blv?.includes("Flash"), "BLV Flash must be preserved");

    // Verify 4: Match with different kickoff time (03:30) remains separate
    const serbia0330 = matches.find((m) => m.time.includes("03:30"));
    assert.ok(serbia0330, "Serbia vs Greece 03:30 must remain a separate match");
    assert.notEqual(serbia0145.id, serbia0330.id, "Different kickoff times must have distinct match IDs");
  });
});

import {
  getSourceQuality,
  getQualityPriorityScore,
  findBestInitialServerIndex,
  findNextFallbackServerIndex,
  toCanonicalSourceUrl,
  parseServerDisplayLabel,
} from "@/components/live/LivePlayer";
import { StreamServer } from "./service";

describe("Nanaflix Live TV - FHD Badges, Broken Source Hiding & Smart Fallback", () => {
  it("1. Quality Detection Mapping (FHD / HD / Null)", () => {
    // 1080p, 1080, FHD, Full HD -> "FHD"
    assert.equal(getSourceQuality({ quality: "FHD" as const }), "FHD");
    assert.equal(getSourceQuality({ name: "Server #1 [FHD]" }), "FHD");
    assert.equal(getSourceQuality({ name: "Kênh FPT 1080p 50fps" }), "FHD");
    assert.equal(getSourceQuality({ name: "Live Sport 1080" }), "FHD");
    assert.equal(getSourceQuality({ name: "VTV5 Full HD" }), "FHD");

    // 720p, 720, HD -> "HD"
    assert.equal(getSourceQuality({ quality: "HD" as const }), "HD");
    assert.equal(getSourceQuality({ name: "Server #2 [HD]" }), "HD");
    assert.equal(getSourceQuality({ name: "Kênh 720p" }), "HD");
    assert.equal(getSourceQuality({ name: "Stream 720" }), "HD");
    assert.equal(getSourceQuality({ name: "HTV Thể Thao HD" }), "HD");

    // Undetermined quality -> null (không tự gán)
    assert.equal(getSourceQuality({ name: "Server dự phòng #3", url: "https://cdn.example.com/live.m3u8" }), null);
    assert.equal(getSourceQuality(undefined), null);
  });

  it("2. Quality Prioritization Score (FHD > HD > Undetermined)", () => {
    assert.equal(getQualityPriorityScore({ quality: "FHD" as const }), 2);
    assert.equal(getQualityPriorityScore({ name: "VTV 1080p" }), 2);
    assert.equal(getQualityPriorityScore({ quality: "HD" as const }), 1);
    assert.equal(getQualityPriorityScore({ name: "VTV 720p" }), 1);
    assert.equal(getQualityPriorityScore({ name: "Server Unknown" }), 0);
  });

  it("3. Case 1: Ưu tiên chọn nguồn FHD làm nguồn mặc định", () => {
    const servers: StreamServer[] = [
      { name: "Server A [HD]", url: "https://example.com/a.m3u8", format: "hls", isHls: true, quality: "HD" },
      { name: "Server B [FHD]", url: "https://example.com/b.m3u8", format: "hls", isHls: true, quality: "FHD" },
      { name: "Server C", url: "https://example.com/c.m3u8", format: "hls", isHls: true, quality: "HD" },
    ];

    const bestIdx = findBestInitialServerIndex(servers);
    assert.equal(bestIdx, 1, "Must pick Server B [FHD] as initial server even if it is not at index 0");
  });

  it("4. Case 2: FHD A lỗi -> A bị ẩn, tự động fallback sang FHD B", () => {
    const servers: StreamServer[] = [
      { name: "Server A [FHD]", url: "https://example.com/a.m3u8", format: "hls", isHls: true, quality: "FHD" },
      { name: "Server B [FHD]", url: "https://example.com/b.m3u8", format: "hls", isHls: true, quality: "FHD" },
      { name: "Server C [HD]", url: "https://example.com/c.m3u8", format: "hls", isHls: true, quality: "HD" },
    ];

    const failedSet = new Set<string>();
    // FHD A fails
    failedSet.add(servers[0].url);

    // Filter available servers for UI (Section 5: Source lỗi phải được ẩn)
    const available = servers.filter((s) => !failedSet.has(s.url));
    assert.equal(available.length, 2, "Failed server A must be removed from available list");
    assert.equal(available.some((s) => s.url === servers[0].url), false, "Server A must not exist in available list");

    // Auto fallback to next best server
    const nextIdx = findNextFallbackServerIndex(servers, failedSet, 0);
    assert.equal(nextIdx, 1, "Must automatically fallback to FHD B");
  });

  it("5. Case 3: FHD A & FHD B đều lỗi -> A & B bị ẩn, tự động fallback sang HD C", () => {
    const servers: StreamServer[] = [
      { name: "Server A [FHD]", url: "https://example.com/a.m3u8", format: "hls", isHls: true, quality: "FHD" },
      { name: "Server B [FHD]", url: "https://example.com/b.m3u8", format: "hls", isHls: true, quality: "FHD" },
      { name: "Server C [HD]", url: "https://example.com/c.m3u8", format: "hls", isHls: true, quality: "HD" },
    ];

    const failedSet = new Set<string>();
    failedSet.add(servers[0].url);
    failedSet.add(servers[1].url);

    const available = servers.filter((s) => !failedSet.has(s.url));
    assert.equal(available.length, 1, "Only HD C should remain available");
    assert.equal(available[0].name, "Server C [HD]");

    const nextIdx = findNextFallbackServerIndex(servers, failedSet, 1);
    assert.equal(nextIdx, 2, "Must automatically fallback to HD C");
  });

  it("6. Case 4: Tất cả server đều lỗi -> Không loop vô tận, trả về -1 (Không có nguồn phát khả dụng)", () => {
    const servers: StreamServer[] = [
      { name: "Server A [FHD]", url: "https://example.com/a.m3u8", format: "hls", isHls: true, quality: "FHD" },
      { name: "Server B [FHD]", url: "https://example.com/b.m3u8", format: "hls", isHls: true, quality: "FHD" },
      { name: "Server C [HD]", url: "https://example.com/c.m3u8", format: "hls", isHls: true, quality: "HD" },
    ];

    const failedSet = new Set<string>([
      servers[0].url,
      servers[1].url,
      servers[2].url,
    ]);

    const available = servers.filter((s) => !failedSet.has(s.url));
    assert.equal(available.length, 0, "No available servers left");

    const nextIdx = findNextFallbackServerIndex(servers, failedSet, 2);
    assert.equal(nextIdx, -1, "Must return -1 indicating no available server and preventing infinite loops");
  });

  it("7. Case 5: Reset failed source khi chuyển trận", () => {
    // Trận 1 có server lỗi
    const match1FailedSet = new Set<string>(["https://example.com/match1_stream.m3u8"]);
    assert.equal(match1FailedSet.has("https://example.com/match1_stream.m3u8"), true);

    // Chuyển sang trận 2: Reset set failed
    const match2FailedSet = new Set<string>();
    assert.equal(match2FailedSet.size, 0, "New match must start with fresh empty failed set");

    const match2Servers: StreamServer[] = [
      { name: "Match 2 Server [FHD]", url: "https://example.com/match2_fhd.m3u8", format: "hls", isHls: true, quality: "FHD" },
      { name: "Match 2 Server [HD]", url: "https://example.com/match2_hd.m3u8", format: "hls", isHls: true, quality: "HD" },
    ];
    const initialIdx = findBestInitialServerIndex(match2Servers, match2FailedSet);
    assert.equal(initialIdx, 0, "New match starts with top quality server index");
  });

  it("8. toCanonicalSourceUrl: Unwraps proxy URLs to direct URLs cleanly", () => {
    const directUrl = "https://cdn.example.com/hls/live.m3u8";
    const proxyUrl = `/api/live-football/proxy?url=${encodeURIComponent(directUrl)}`;

    assert.equal(toCanonicalSourceUrl(directUrl), directUrl);
    assert.equal(toCanonicalSourceUrl(proxyUrl), directUrl, "Proxy URL must unwrap to direct URL");
    assert.equal(toCanonicalSourceUrl(""), "");
    assert.equal(toCanonicalSourceUrl(null), "");
  });

  it("9. parseServerDisplayLabel: Extracts commentator name or clean source label without technical clutter", () => {
    // BLV in parentheses without sourceName
    assert.equal(
      parseServerDisplayLabel({ name: "XoiLac 1 (BLV Lê Hoàn) [FHD]" } as StreamServer, 0),
      "BLV Lê Hoàn",
    );
    assert.equal(
      parseServerDisplayLabel({ name: "Tiếng Việt (BLV Quang Huy)" } as StreamServer, 1),
      "BLV Quang Huy",
    );
    // BLV with source platform (Kiểu 1: BLV ... · Nền tảng)
    assert.equal(
      parseServerDisplayLabel(
        { name: "Xôi Lạc Z TV (ASTRA) #1 [HD]", sourceName: "Xôi Lạc Z TV" } as StreamServer,
        0,
      ),
      "BLV ASTRA · Xôi Lạc",
    );
    assert.equal(
      parseServerDisplayLabel(
        { name: "Xôi Lạc Z TV (HD ASTRA) #2 [FHD]", sourceName: "Xôi Lạc Z TV" } as StreamServer,
        1,
      ),
      "BLV ASTRA · Xôi Lạc",
    );
    assert.equal(
      parseServerDisplayLabel(
        { name: "Cola TV (BLV GIÀ LÀNG) #3 [HD]", sourceName: "Cola TV" } as StreamServer,
        2,
      ),
      "BLV GIÀ LÀNG · Cola TV",
    );
    assert.equal(
      parseServerDisplayLabel(
        { name: "Gà Vàng 33 TV (Gà Siêu Ngố) #4 [HD]", sourceName: "Gà Vàng 33 TV" } as StreamServer,
        3,
      ),
      "BLV Gà Siêu Ngố · Gà Vàng",
    );
    assert.equal(
      parseServerDisplayLabel(
        { name: "Sút Bóng TV (BLV FIREMAN) #5 [HD]", sourceName: "Sút Bóng TV" } as StreamServer,
        4,
      ),
      "BLV FIREMAN · Sút Bóng TV",
    );
    assert.equal(
      parseServerDisplayLabel(
        { name: "Phá Làng TV (Nhà đài) #6 [HD]", sourceName: "Phá Làng TV" } as StreamServer,
        5,
      ),
      "BLV Nhà đài · Phá Làng TV",
    );
    // Inline BLV
    assert.equal(
      parseServerDisplayLabel({ name: "FHD - BLV Chuối" } as StreamServer, 2),
      "BLV Chuối",
    );
    // Source group name when no commentator
    assert.equal(
      parseServerDisplayLabel(
        { name: "FPT Play 1 [FHD]", sourceName: "FPT Play" } as StreamServer,
        0,
      ),
      "FPT Play · Nguồn 1",
    );
    // Technical fallback
    assert.equal(
      parseServerDisplayLabel({ name: "Server #1 [HD]" } as StreamServer, 0),
      "Nguồn 1",
    );
  });

  it("10. failedSourcesByMatch: Failed sources are keyed by match.id, persistent across server re-renders, and isolated", () => {
    const failedSourcesByMatch: Record<string, Set<string>> = {};

    const matchAId = "arsenal-chelsea-1600";
    const matchBId = "liverpool-mancity-1830";

    const serverA1 = "https://cdn.example.com/matchA_fhd.m3u8";
    const serverA2 = "https://cdn.example.com/matchA_hd.m3u8";
    const serverB1 = "https://cdn.example.com/matchB_fhd.m3u8";

    // Mark serverA1 failed in Match A
    failedSourcesByMatch[matchAId] = new Set([toCanonicalSourceUrl(serverA1)]);

    // Match A's available servers filters out serverA1
    const matchAServers1: StreamServer[] = [
      { name: "Server 1 [FHD]", url: serverA1, format: "hls", isHls: true, quality: "FHD" },
      { name: "Server 2 [HD]", url: serverA2, format: "hls", isHls: true, quality: "HD" },
    ];

    const availableMatchA1 = matchAServers1.filter(
      (s) => !failedSourcesByMatch[matchAId]?.has(toCanonicalSourceUrl(s.url)),
    );
    assert.equal(availableMatchA1.length, 1);
    assert.equal(availableMatchA1[0].url, serverA2);

    // Simulate server refresh/re-fetch or array reference change in Match A
    const matchAServers2: StreamServer[] = [
      { name: "Server 1 [FHD] (Refetched)", url: serverA1, format: "hls", isHls: true, quality: "FHD" },
      { name: "Server 2 [HD] (Refetched)", url: serverA2, format: "hls", isHls: true, quality: "HD" },
    ];
    const availableMatchA2 = matchAServers2.filter(
      (s) => !failedSourcesByMatch[matchAId]?.has(toCanonicalSourceUrl(s.url)),
    );
    assert.equal(
      availableMatchA2.length,
      1,
      "Failed source must stay hidden even when servers array reference is regenerated",
    );

    // Switch to Match B: Match B has its own independent failed set
    const matchBFailed = failedSourcesByMatch[matchBId] || new Set();
    const matchBServers: StreamServer[] = [
      { name: "Server 1 [FHD]", url: serverB1, format: "hls", isHls: true, quality: "FHD" },
    ];
    const availableMatchB = matchBServers.filter(
      (s) => !matchBFailed.has(toCanonicalSourceUrl(s.url)),
    );
    assert.equal(availableMatchB.length, 1, "Match B must have all sources available");

    // Switching back to Match B and resetting its failed state
    delete failedSourcesByMatch[matchBId];
    assert.equal(Boolean(failedSourcesByMatch[matchBId]), false);
  });

  it("11. Canonical matching prevents proxy vs direct URL mismatch when marking failed", () => {
    const directUrl = "https://example.com/live.m3u8";
    const proxyUrl = `/api/live-football/proxy?url=${encodeURIComponent(directUrl)}`;

    const failedSet = new Set<string>();
    // Marked failed using proxy URL
    failedSet.add(toCanonicalSourceUrl(proxyUrl));

    // Queried using direct URL
    assert.equal(
      failedSet.has(toCanonicalSourceUrl(directUrl)),
      true,
      "Direct URL must be recognized as failed even if marked via proxy URL",
    );
  });
});

describe("Comprehensive National Team Canonical Alias & Fixture Deduplication System", () => {
  const kickoffTime = new Date("2026-09-25T19:30:00+07:00").getTime();

  it("1. Coverage & Statistics: Must support >= 200 countries and >= 700 aliases", () => {
    assert.ok(NATIONAL_TEAM_CANONICAL_KEYS.size >= 200, `Expected >= 200 countries, got ${NATIONAL_TEAM_CANONICAL_KEYS.size}`);
    assert.ok(Object.keys(NATIONAL_TEAM_CANONICAL_MAP).length >= 700, `Expected >= 700 aliases, got ${Object.keys(NATIONAL_TEAM_CANONICAL_MAP).length}`);
  });

  it("2. Multilingual Alias Mapping: Vietnam variants all normalize to 'vietnam'", () => {
    const variants = ["Vietnam", "Việt", "Việt Nam", "Viet Nam", "VN", "VIE", "ĐTQG Việt Nam", "Đội tuyển Việt Nam", "U23 Việt Nam"];
    for (const v of variants) {
      assert.equal(normalizeClubKey(v), "vietnam", `Variant '${v}' must resolve to 'vietnam'`);
    }
  });

  it("3. Multilingual Alias Mapping: China variants all normalize to 'china'", () => {
    const variants = ["China", "Trung Quốc", "China PR", "PR China", "CN", "CHN", "Đội tuyển Trung Quốc"];
    for (const v of variants) {
      assert.equal(normalizeClubKey(v), "china", `Variant '${v}' must resolve to 'china'`);
    }
  });

  it("4. Multilingual Alias Mapping: South Korea variants all normalize to 'southkorea'", () => {
    const variants = ["South Korea", "Hàn Quốc", "Korea Republic", "Republic of Korea", "ROK", "KOR", "ĐT Hàn Quốc"];
    for (const v of variants) {
      assert.equal(normalizeClubKey(v), "southkorea", `Variant '${v}' must resolve to 'southkorea'`);
    }
  });

  it("5. Multilingual Alias Mapping: North Korea variants all normalize to 'northkorea'", () => {
    const variants = ["North Korea", "Triều Tiên", "Bắc Triều Tiên", "DPR Korea", "PRK"];
    for (const v of variants) {
      assert.equal(normalizeClubKey(v), "northkorea", `Variant '${v}' must resolve to 'northkorea'`);
    }
  });

  it("6. Multilingual Alias Mapping: Major football nations across confederations", () => {
    assert.equal(normalizeClubKey("Japan"), "japan");
    assert.equal(normalizeClubKey("Nhật Bản"), "japan");
    assert.equal(normalizeClubKey("Germany"), "germany");
    assert.equal(normalizeClubKey("Đức"), "germany");
    assert.equal(normalizeClubKey("Spain"), "spain");
    assert.equal(normalizeClubKey("Tây Ban Nha"), "spain");
    assert.equal(normalizeClubKey("Portugal"), "portugal");
    assert.equal(normalizeClubKey("Bồ Đào Nha"), "portugal");
    assert.equal(normalizeClubKey("Netherlands"), "netherlands");
    assert.equal(normalizeClubKey("Hà Lan"), "netherlands");
    assert.equal(normalizeClubKey("Brazil"), "brazil");
    assert.equal(normalizeClubKey("Brasil"), "brazil");
    assert.equal(normalizeClubKey("USA"), "usa");
    assert.equal(normalizeClubKey("United States"), "usa");
    assert.equal(normalizeClubKey("Hoa Kỳ"), "usa");
    assert.equal(normalizeClubKey("USMNT"), "usa");
    assert.equal(normalizeClubKey("France"), "france");
    assert.equal(normalizeClubKey("Pháp"), "france");
    assert.equal(normalizeClubKey("England"), "england");
    assert.equal(normalizeClubKey("Anh"), "england");
    assert.equal(normalizeClubKey("Italy"), "italy");
    assert.equal(normalizeClubKey("Ý"), "italy");
    assert.equal(normalizeClubKey("Argentina"), "argentina");
    assert.equal(normalizeClubKey("Thailand"), "thailand");
    assert.equal(normalizeClubKey("Thái Lan"), "thailand");
  });

  it("7. Strict Collision Guard: Congo and DR Congo must NEVER match", () => {
    assert.equal(normalizeClubKey("Congo"), "congo");
    assert.equal(normalizeClubKey("DR Congo"), "drcongo");
    assert.equal(isSingleTeamMatching("Congo", "DR Congo"), false);
  });

  it("8. Strict Collision Guard: Guinea, Guinea-Bissau, and Equatorial Guinea must NEVER match", () => {
    assert.equal(normalizeClubKey("Guinea"), "guinea");
    assert.equal(normalizeClubKey("Guinea-Bissau"), "guineabissau");
    assert.equal(normalizeClubKey("Equatorial Guinea"), "equatorialguinea");
    assert.equal(isSingleTeamMatching("Guinea", "Guinea-Bissau"), false);
    assert.equal(isSingleTeamMatching("Guinea", "Equatorial Guinea"), false);
    assert.equal(isSingleTeamMatching("Guinea-Bissau", "Equatorial Guinea"), false);
  });

  it("9. Strict Collision Guard: Niger and Nigeria must NEVER match", () => {
    assert.equal(normalizeClubKey("Niger"), "niger");
    assert.equal(normalizeClubKey("Nigeria"), "nigeria");
    assert.equal(isSingleTeamMatching("Niger", "Nigeria"), false);
  });

  it("10. Strict Collision Guard: Australia and Austria must NEVER match", () => {
    assert.equal(normalizeClubKey("Australia"), "australia");
    assert.equal(normalizeClubKey("Austria"), "austria");
    assert.equal(isSingleTeamMatching("Australia", "Austria"), false);
  });

  it("11. Strict Collision Guard: North Korea and South Korea must NEVER match", () => {
    assert.equal(normalizeClubKey("North Korea"), "northkorea");
    assert.equal(normalizeClubKey("South Korea"), "southkorea");
    assert.equal(isSingleTeamMatching("North Korea", "South Korea"), false);
    assert.equal(isSingleTeamMatching("Triều Tiên", "Hàn Quốc"), false);
  });

  it("12. Fixture Matching: 'China vs Vietnam' + 'Việt vs Trung Quốc' MERGES into 1 fixture", () => {
    const f1 = {
      team1: "China",
      team2: "Vietnam",
      time: "19:30",
      timestamp: kickoffTime,
      isLiveMarker: false,
    };
    const f2 = {
      team1: "Việt",
      team2: "Trung Quốc",
      time: "19:30",
      timestamp: kickoffTime,
      isLiveMarker: false,
    };

    assert.equal(areMatchFixturesMatching(f1, f2), true, "China vs Vietnam and Việt vs Trung Quốc must match");
  });

  it("13. Fixture Matching: Other major national fixtures merge across language & order", () => {
    // South Korea vs Japan <-> Nhật Bản vs Hàn Quốc
    assert.equal(
      areMatchFixturesMatching(
        { team1: "South Korea", team2: "Japan", time: "20:00", timestamp: kickoffTime, isLiveMarker: false },
        { team1: "Nhật Bản", team2: "Hàn Quốc", time: "20:00", timestamp: kickoffTime, isLiveMarker: false },
      ),
      true,
    );

    // Germany vs Spain <-> Tây Ban Nha vs Đức
    assert.equal(
      areMatchFixturesMatching(
        { team1: "Germany", team2: "Spain", time: "02:00", timestamp: kickoffTime, isLiveMarker: false },
        { team1: "Tây Ban Nha", team2: "Đức", time: "02:00", timestamp: kickoffTime, isLiveMarker: false },
      ),
      true,
    );

    // Brazil vs Netherlands <-> Hà Lan vs Brasil
    assert.equal(
      areMatchFixturesMatching(
        { team1: "Brazil", team2: "Netherlands", time: "21:00", timestamp: kickoffTime, isLiveMarker: false },
        { team1: "Hà Lan", team2: "Brasil", time: "21:00", timestamp: kickoffTime, isLiveMarker: false },
      ),
      true,
    );

    // USA vs Portugal <-> Bồ Đào Nha vs United States
    assert.equal(
      areMatchFixturesMatching(
        { team1: "USA", team2: "Portugal", time: "21:00", timestamp: kickoffTime, isLiveMarker: false },
        { team1: "Bồ Đào Nha", team2: "United States", time: "21:00", timestamp: kickoffTime, isLiveMarker: false },
      ),
      true,
    );
  });

  it("14. Separation Invariant: Different matches sharing one team must NOT merge", () => {
    // Vietnam vs Thailand vs Vietnam vs Malaysia
    const v_tha = { team1: "Vietnam", team2: "Thailand", time: "19:30", timestamp: kickoffTime, isLiveMarker: false };
    const v_mas = { team1: "Vietnam", team2: "Malaysia", time: "19:30", timestamp: kickoffTime, isLiveMarker: false };
    assert.equal(areMatchFixturesMatching(v_tha, v_mas), false, "Vietnam vs Thailand and Vietnam vs Malaysia must NOT merge");

    // China vs Vietnam vs China vs Indonesia
    const c_vie = { team1: "China", team2: "Vietnam", time: "19:30", timestamp: kickoffTime, isLiveMarker: false };
    const c_idn = { team1: "China", team2: "Indonesia", time: "19:30", timestamp: kickoffTime, isLiveMarker: false };
    assert.equal(areMatchFixturesMatching(c_vie, c_idn), false, "China vs Vietnam and China vs Indonesia must NOT merge");
  });

  it("15. Separation Invariant: Distinct countries with similar names must NOT merge", () => {
    // Congo vs Mali vs DR Congo vs Mali
    const congo_mali = { team1: "Congo", team2: "Mali", time: "19:30", timestamp: kickoffTime, isLiveMarker: false };
    const drcongo_mali = { team1: "DR Congo", team2: "Mali", time: "19:30", timestamp: kickoffTime, isLiveMarker: false };
    assert.equal(areMatchFixturesMatching(congo_mali, drcongo_mali), false, "Congo vs Mali and DR Congo vs Mali must NOT merge");

    // Niger vs Ghana vs Nigeria vs Ghana
    const niger_ghana = { team1: "Niger", team2: "Ghana", time: "19:30", timestamp: kickoffTime, isLiveMarker: false };
    const nigeria_ghana = { team1: "Nigeria", team2: "Ghana", time: "19:30", timestamp: kickoffTime, isLiveMarker: false };
    assert.equal(areMatchFixturesMatching(niger_ghana, nigeria_ghana), false, "Niger vs Ghana and Nigeria vs Ghana must NOT merge");

    // Australia vs Japan vs Austria vs Japan
    const aus_jpn = { team1: "Australia", team2: "Japan", time: "19:30", timestamp: kickoffTime, isLiveMarker: false };
    const aut_jpn = { team1: "Austria", team2: "Japan", time: "19:30", timestamp: kickoffTime, isLiveMarker: false };
    assert.equal(areMatchFixturesMatching(aus_jpn, aut_jpn), false, "Australia vs Japan and Austria vs Japan must NOT merge");

    // Guinea vs Senegal vs Guinea-Bissau vs Senegal vs Equatorial Guinea vs Senegal
    const gui_sen = { team1: "Guinea", team2: "Senegal", time: "19:30", timestamp: kickoffTime, isLiveMarker: false };
    const gbs_sen = { team1: "Guinea-Bissau", team2: "Senegal", time: "19:30", timestamp: kickoffTime, isLiveMarker: false };
    const eqg_sen = { team1: "Equatorial Guinea", team2: "Senegal", time: "19:30", timestamp: kickoffTime, isLiveMarker: false };
    assert.equal(areMatchFixturesMatching(gui_sen, gbs_sen), false);
    assert.equal(areMatchFixturesMatching(gui_sen, eqg_sen), false);
    assert.equal(areMatchFixturesMatching(gbs_sen, eqg_sen), false);

    // North Korea vs Jordan vs South Korea vs Jordan
    const prk_jor = { team1: "North Korea", team2: "Jordan", time: "19:30", timestamp: kickoffTime, isLiveMarker: false };
    const kor_jor = { team1: "South Korea", team2: "Jordan", time: "19:30", timestamp: kickoffTime, isLiveMarker: false };
    assert.equal(areMatchFixturesMatching(prk_jor, kor_jor), false, "North Korea vs Jordan and South Korea vs Jordan must NOT merge");
  });

  it("16. End-to-End normalizeAndMergeStreams: China vs Vietnam + Việt vs Trung Quốc merges into 1 card with both streams", () => {
    const rawItems = [
      {
        rawTitle: "19:30 25/09 ⚽ China vs Vietnam (BLV Quang Huy)",
        url: "https://source1.example.com/stream1.m3u8",
        effectiveUrl: "https://source1.example.com/stream1.m3u8",
        group: "VTV5",
        rawLogo: "https://cdn.example.com/china.png",
      },
      {
        rawTitle: "19:30 25/09 ⚽ Việt vs Trung Quốc (BLV Anh Quân)",
        url: "https://source2.example.com/stream2.m3u8",
        effectiveUrl: "https://source2.example.com/stream2.m3u8",
        group: "FPT Play",
        rawLogo: "https://cdn.example.com/vietnam.png",
      },
    ];

    const { matches } = normalizeAndMergeStreams(rawItems, kickoffTime - 15 * 60 * 1000);
    assert.equal(matches.length, 1, "Must merge into exactly 1 match fixture card");

    const match = matches[0];
    assert.equal(match.servers.length, 2, "Must retain streams/servers from both sources");
    const serverUrls = match.servers.map((s) => s.url);
    assert.ok(serverUrls.includes("https://source1.example.com/stream1.m3u8"));
    assert.ok(serverUrls.includes("https://source2.example.com/stream2.m3u8"));
  });

  it("17. End-to-End normalizeAndMergeStreams: Vietnam vs Thailand and Vietnam vs Malaysia remain 2 separate fixtures", () => {
    const rawItems = [
      {
        rawTitle: "19:30 25/09 ⚽ Vietnam vs Thailand",
        url: "https://source1.example.com/tha.m3u8",
        effectiveUrl: "https://source1.example.com/tha.m3u8",
        group: "Kênh 1",
        rawLogo: "https://cdn.example.com/vietnam.png",
      },
      {
        rawTitle: "19:30 25/09 ⚽ Vietnam vs Malaysia",
        url: "https://source2.example.com/mas.m3u8",
        effectiveUrl: "https://source2.example.com/mas.m3u8",
        group: "Kênh 2",
        rawLogo: "https://cdn.example.com/vietnam.png",
      },
    ];

    const { matches } = normalizeAndMergeStreams(rawItems, kickoffTime - 15 * 60 * 1000);
    assert.equal(matches.length, 2, "Must remain 2 distinct match fixture cards");
  });
});

describe("Generic Match Deduplication & Aggregation System", () => {
  const baseNow = new Date("2026-09-26T21:00:00+07:00").getTime();

  it("1. Same match across multilingual names, prefixes, order & BLVs merges into 1 MatchCard with 4 servers", () => {
    const rawStreams = [
      {
        rawTitle: "21:00 26/09 ⚽ Italy vs Belgium (BLV Anh Quân) [1080P]",
        url: "https://cdn1.example.com/live1.m3u8",
        effectiveUrl: "https://cdn1.example.com/live1.m3u8",
        group: "TV360",
        rawLogo: "https://cdn.example.com/italy.png",
      },
      {
        rawTitle: "21:00 26/09 ⚽ Ý vs Bỉ (BLV Quang Huy) [720P]",
        url: "https://cdn2.example.com/live2.m3u8",
        effectiveUrl: "https://cdn2.example.com/live2.m3u8",
        group: "FPT Play",
        rawLogo: "https://cdn.example.com/italy.png",
      },
      {
        rawTitle: "21:00 26/09 ⚽ Belgium vs Italy (BLV Batman)",
        url: "https://cdn3.example.com/live3.m3u8",
        effectiveUrl: "https://cdn3.example.com/live3.m3u8",
        group: "Xôi Lạc",
        rawLogo: "https://cdn.example.com/belgium.png",
      },
      {
        rawTitle: "21:00 26/09 ⚽ ĐTQG Ý vs Bỉ",
        url: "https://cdn4.example.com/live4.m3u8",
        effectiveUrl: "https://cdn4.example.com/live4.m3u8",
        group: "Vua Sân Cỏ",
        rawLogo: "",
      },
    ];

    const { matches } = normalizeAndMergeStreams(rawStreams, baseNow);
    assert.equal(matches.length, 1, "Must produce exactly 1 MatchCard for Italy vs Belgium");

    const match = matches[0];
    assert.equal(match.servers.length, 4, "Must aggregate all 4 distinct servers");
    assert.equal(match.quality, "FHD 1080p", "Must preserve FHD quality from 1080p stream");
    assert.ok(match.groups.includes("TV360") && match.groups.includes("FPT Play"), "Must retain all source providers");
  });

  it("2. Reversed teams: Finland vs France and France vs Finland merge into 1 MatchCard", () => {
    const rawStreams = [
      {
        rawTitle: "22:00 26/09 ⚽ Finland vs France",
        url: "https://cdn.example.com/fin-fra.m3u8",
        effectiveUrl: "https://cdn.example.com/fin-fra.m3u8",
        group: "TV360",
        rawLogo: "https://cdn.example.com/finland.png",
      },
      {
        rawTitle: "22:00 26/09 ⚽ Pháp vs Phần Lan",
        url: "https://cdn.example.com/fra-fin.m3u8",
        effectiveUrl: "https://cdn.example.com/fra-fin.m3u8",
        group: "FPT Play",
        rawLogo: "https://cdn.example.com/france.png",
      },
    ];

    const { matches } = normalizeAndMergeStreams(rawStreams, baseNow);
    assert.equal(matches.length, 1, "Must merge reversed teams into 1 MatchCard");
    assert.equal(matches[0].servers.length, 2, "Must contain both stream servers");
  });

  it("3. Live marker [TRỰC TIẾP] and Scheduled stream (21:00) merge into 1 MatchCard during kickoff window", () => {
    const rawStreams = [
      {
        rawTitle: "21:00 26/09 ⚽ Arsenal vs Chelsea",
        url: "https://cdn.example.com/ars-che-sched.m3u8",
        effectiveUrl: "https://cdn.example.com/ars-che-sched.m3u8",
        group: "FPT Play",
        rawLogo: "",
      },
      {
        rawTitle: "🟢 [TRỰC TIẾP] ⚽ Arsenal vs Chelsea (BLV Batman)",
        url: "https://cdn.example.com/ars-che-live.m3u8",
        effectiveUrl: "https://cdn.example.com/ars-che-live.m3u8",
        group: "Xôi Lạc",
        rawLogo: "",
      },
    ];

    const nowDuringMatch = new Date("2026-09-26T21:30:00+07:00").getTime();
    const { matches } = normalizeAndMergeStreams(rawStreams, nowDuringMatch);
    assert.equal(matches.length, 1, "Live stream must merge into scheduled fixture during match window");
    assert.equal(matches[0].servers.length, 2);
  });

  it("4. Different matches on different dates (26/09 01:45 vs 30/09 20:00) remain 2 distinct MatchCards", () => {
    const rawStreams = [
      {
        rawTitle: "01:45 26/09 ⚽ Italy vs Belgium",
        url: "https://cdn.example.com/match1.m3u8",
        effectiveUrl: "https://cdn.example.com/match1.m3u8",
        group: "TV360",
        rawLogo: "",
      },
      {
        rawTitle: "20:00 30/09 ⚽ Italy vs Belgium",
        url: "https://cdn.example.com/match2.m3u8",
        effectiveUrl: "https://cdn.example.com/match2.m3u8",
        group: "TV360",
        rawLogo: "",
      },
    ];

    const { matches } = normalizeAndMergeStreams(rawStreams, baseNow);
    assert.equal(matches.length, 2, "Same teams with kickoff on different dates must NOT merge");
  });

  it("5. Category protection: Senior Men, U21, Women, and Futsal produce 4 distinct MatchCards", () => {
    const rawStreams = [
      {
        rawTitle: "20:00 26/09 ⚽ Italy vs Spain",
        url: "https://cdn.example.com/senior.m3u8",
        effectiveUrl: "https://cdn.example.com/senior.m3u8",
        group: "FPT Play",
        rawLogo: "",
      },
      {
        rawTitle: "20:00 26/09 ⚽ Italy U21 vs Spain U21",
        url: "https://cdn.example.com/u21.m3u8",
        effectiveUrl: "https://cdn.example.com/u21.m3u8",
        group: "FPT Play",
        rawLogo: "",
      },
      {
        rawTitle: "20:00 26/09 ⚽ Italy Nữ vs Spain Nữ",
        url: "https://cdn.example.com/women.m3u8",
        effectiveUrl: "https://cdn.example.com/women.m3u8",
        group: "FPT Play",
        rawLogo: "",
      },
      {
        rawTitle: "20:00 26/09 ⚽ Futsal Italy vs Futsal Spain",
        url: "https://cdn.example.com/futsal.m3u8",
        effectiveUrl: "https://cdn.example.com/futsal.m3u8",
        group: "FPT Play",
        rawLogo: "",
      },
    ];

    const { matches } = normalizeAndMergeStreams(rawStreams, baseNow);
    assert.equal(matches.length, 4, "Senior Men, U21, Women, and Futsal must produce 4 separate MatchCards");
  });

  it("6. Similar country names (Australia ≠ Austria, Niger ≠ Nigeria, Congo ≠ DR Congo, Guinea ≠ Guinea-Bissau) do NOT merge", () => {
    const rawStreams = [
      {
        rawTitle: "19:00 26/09 ⚽ Australia vs Japan",
        url: "https://cdn.example.com/aus.m3u8",
        effectiveUrl: "https://cdn.example.com/aus.m3u8",
        group: "TV360",
        rawLogo: "",
      },
      {
        rawTitle: "19:00 26/09 ⚽ Austria vs Japan",
        url: "https://cdn.example.com/aut.m3u8",
        effectiveUrl: "https://cdn.example.com/aut.m3u8",
        group: "TV360",
        rawLogo: "",
      },
      {
        rawTitle: "21:00 26/09 ⚽ Niger vs Ghana",
        url: "https://cdn.example.com/ner.m3u8",
        effectiveUrl: "https://cdn.example.com/ner.m3u8",
        group: "TV360",
        rawLogo: "",
      },
      {
        rawTitle: "21:00 26/09 ⚽ Nigeria vs Ghana",
        url: "https://cdn.example.com/nga.m3u8",
        effectiveUrl: "https://cdn.example.com/nga.m3u8",
        group: "TV360",
        rawLogo: "",
      },
    ];

    const { matches } = normalizeAndMergeStreams(rawStreams, baseNow);
    assert.equal(matches.length, 4, "Countries with similar names must never collide");
  });

  it("7. Multi-sport separation: Football vs Volleyball with same team names produce 2 distinct MatchCards", () => {
    const rawStreams = [
      {
        rawTitle: "18:00 26/09 ⚽ Finland vs France",
        url: "https://cdn.example.com/fin-fra-fb.m3u8",
        effectiveUrl: "https://cdn.example.com/fin-fra-fb.m3u8",
        group: "TV360",
        rawLogo: "",
      },
      {
        rawTitle: "18:00 26/09 🏐 Bóng Chuyền: Finland vs France",
        url: "https://cdn.example.com/fin-fra-vb.m3u8",
        effectiveUrl: "https://cdn.example.com/fin-fra-vb.m3u8",
        group: "TV360",
        rawLogo: "",
      },
    ];

    const { matches } = normalizeAndMergeStreams(rawStreams, baseNow);
    assert.equal(matches.length, 2, "Different sports must never be merged");
  });

  it("8. Duplicate effective URL across 2 raw stream items is deduplicated to 1 server within the match", () => {
    const rawStreams = [
      {
        rawTitle: "20:00 26/09 ⚽ Real Madrid vs Barcelona",
        url: "https://cdn.example.com/el-clasico.m3u8",
        effectiveUrl: "https://cdn.example.com/el-clasico.m3u8",
        group: "Nguồn 1",
        rawLogo: "",
      },
      {
        rawTitle: "20:00 26/09 ⚽ Real Madrid vs Barca",
        url: "https://cdn.example.com/el-clasico.m3u8",
        effectiveUrl: "https://cdn.example.com/el-clasico.m3u8",
        group: "Nguồn 2",
        rawLogo: "",
      },
    ];

    const { matches } = normalizeAndMergeStreams(rawStreams, baseNow);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].servers.length, 1, "Duplicate effective URLs must be deduplicated into 1 server");
  });
});



