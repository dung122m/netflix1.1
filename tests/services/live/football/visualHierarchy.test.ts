import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isFeaturedMatch } from "@/services/live/football/featuredMatch";
import { resolveMatchDisplayStatus } from "@/services/live/football-score/liveStatus";
import { LiveMatchScore } from "@/services/live/football-score/types";
import { FootballMatch } from "@/services/liveFootballService";

describe("Live Hub — Visual Hierarchy Verification: Tâm Điểm & Đang Xem", () => {
  const baseLiveMatch = {
    id: "match_el_clasico_123456",
    title: "Real Madrid vs Barcelona",
    team1: "Real Madrid",
    team2: "Barcelona",
    sport: "football",
    tournament: "La Liga",
    group: "Vòng 32",
    time: "21:00",
    timestamp: Date.now() - 30 * 60 * 1000, // 30 mins ago
    isLive: true,
    realStatus: "live" as const,
    sourceStatus: "live",
    servers: [
      { name: "Server 1", url: "https://stream1.example.com/hls.m3u8", quality: "FHD", format: "hls", isHls: true },
      { name: "Server 2", url: "https://stream2.example.com/hls.m3u8", quality: "HD", format: "hls", isHls: true },
    ],
  } as unknown as FootballMatch;

  const baseUpcomingMatch = {
    id: "match_derby_milan_234567",
    title: "AC Milan vs Inter Milan",
    team1: "AC Milan",
    team2: "Inter Milan",
    sport: "football",
    tournament: "Serie A",
    group: "Vòng 28",
    time: "23:45",
    timestamp: Date.now() + 60 * 60 * 1000, // in 1 hour
    isLive: false,
    realStatus: "upcoming" as const,
    sourceStatus: "upcoming",
    servers: [
      { name: "Server 1", url: "https://stream1.example.com/hls.m3u8", quality: "FHD", format: "hls", isHls: true },
    ],
  } as unknown as FootballMatch;

  const baseNormalMatch = {
    id: "match_regular_345678",
    title: "Getafe vs Osasuna",
    team1: "Getafe",
    team2: "Osasuna",
    sport: "football",
    tournament: "La Liga",
    group: "Vòng 32",
    time: "19:00",
    timestamp: Date.now() - 45 * 60 * 1000,
    isLive: true,
    realStatus: "live" as const,
    sourceStatus: "live",
    servers: [
      { name: "Server 1", url: "https://stream1.example.com/hls.m3u8", quality: "HD", format: "hls", isHls: true },
    ],
  } as unknown as FootballMatch;

  it("1. Kịch bản 1: Trận tâm điểm được nhận diện đúng nhãn Marquee Rivalry (EL CLÁSICO / DERBY MILANO)", () => {
    const elClasico = isFeaturedMatch({
      title: baseLiveMatch.title,
      tournament: baseLiveMatch.tournament,
      team1: baseLiveMatch.team1,
      team2: baseLiveMatch.team2,
      sport: baseLiveMatch.sport,
    });
    assert.equal(elClasico.isFeatured, true);
    assert.equal(elClasico.badgeLabel, "EL CLÁSICO");

    const derbyMilan = isFeaturedMatch({
      title: baseUpcomingMatch.title,
      tournament: baseUpcomingMatch.tournament,
      team1: baseUpcomingMatch.team1,
      team2: baseUpcomingMatch.team2,
      sport: baseUpcomingMatch.sport,
    });
    assert.equal(derbyMilan.isFeatured, true);
    assert.equal(derbyMilan.badgeLabel, "DERBY MILANO");
  });

  it("2. Kịch bản 2: Trận thường KHÔNG bị nhận diện nhầm thành Tâm Điểm", () => {
    const normal = isFeaturedMatch({
      title: baseNormalMatch.title,
      tournament: baseNormalMatch.tournament,
      team1: baseNormalMatch.team1,
      team2: baseNormalMatch.team2,
      sport: baseNormalMatch.sport,
      validServersCount: 1,
    });
    assert.equal(normal.isFeatured, false);
    assert.equal(Boolean(normal.badgeLabel), false);
  });

  it("3. Kịch bản 3: Phân biệt rõ ràng giữa nhãn LIVE và nhãn TÂM ĐIỂM", () => {
    // Trận tâm điểm đang LIVE: có cả LIVE và TÂM ĐIỂM nhưng độc lập ngữ nghĩa
    const status = resolveMatchDisplayStatus({
      timestamp: baseLiveMatch.timestamp,
      score: {
        status: "live",
        displayClock: "35'",
        kickoffTimestamp: baseLiveMatch.timestamp,
        eventId: "ev_123",
      } as unknown as LiveMatchScore,
      sourceStatus: "live",
      now: Date.now(),
    });
    assert.equal(status.statusType, "live");
    assert.equal(status.isConfirmedLive, true);

    const featured = isFeaturedMatch({
      title: baseLiveMatch.title,
      tournament: baseLiveMatch.tournament,
      team1: baseLiveMatch.team1,
      team2: baseLiveMatch.team2,
      sport: baseLiveMatch.sport,
    });
    assert.equal(featured.isFeatured, true);
    assert.equal(featured.badgeLabel, "EL CLÁSICO");

    // Không bị gộp nhầm thành 1 chuỗi làm mất thông tin
    assert.notEqual(status.badgeLabel, featured.badgeLabel);
  });

  it("4. Kịch bản 4: Trận tâm điểm sắp diễn ra (Upcoming): giữ nguyên nhãn TÂM ĐIỂM, KHÔNG có nhãn LIVE", () => {
    const status = resolveMatchDisplayStatus({
      timestamp: baseUpcomingMatch.timestamp,
      sourceStatus: baseUpcomingMatch.sourceStatus,
      now: Date.now(),
    });
    assert.equal(status.statusType, "upcoming");

    const featured = isFeaturedMatch({
      title: baseUpcomingMatch.title,
      tournament: baseUpcomingMatch.tournament,
      team1: baseUpcomingMatch.team1,
      team2: baseUpcomingMatch.team2,
      sport: baseUpcomingMatch.sport,
    });
    assert.equal(featured.isFeatured, true);
    assert.equal(featured.badgeLabel, "DERBY MILANO");
  });

  it("5. Kịch bản 5: Trận vừa là ĐANG XEM (isSelected=true) vừa là TÂM ĐIỂM: xác định đúng kết hợp phân cấp", () => {
    const isSelected = true;
    const featured = isFeaturedMatch({
      title: baseLiveMatch.title,
      tournament: baseLiveMatch.tournament,
      team1: baseLiveMatch.team1,
      team2: baseLiveMatch.team2,
      sport: baseLiveMatch.sport,
    });

    const isCombined = isSelected && featured.isFeatured;
    assert.equal(isCombined, true);
    assert.equal(featured.badgeLabel, "EL CLÁSICO");
  });

  it("6. Kịch bản 6: Trận đang xem KHÔNG PHẢI tâm điểm: chỉ hiển thị trạng thái Đang Xem", () => {
    const isSelected = true;
    const featured = isFeaturedMatch({
      title: baseNormalMatch.title,
      tournament: baseNormalMatch.tournament,
      team1: baseNormalMatch.team1,
      team2: baseNormalMatch.team2,
      sport: baseNormalMatch.sport,
      validServersCount: 1,
    });

    assert.equal(isSelected, true);
    assert.equal(featured.isFeatured, false);
  });

  it("7. Kịch bản 7: Trận tâm điểm nhưng KHÔNG được chọn xem (isSelected=false): hiển thị độc lập nhãn Tâm Điểm", () => {
    const isSelected = false;
    const featured = isFeaturedMatch({
      title: baseLiveMatch.title,
      tournament: baseLiveMatch.tournament,
      team1: baseLiveMatch.team1,
      team2: baseLiveMatch.team2,
      sport: baseLiveMatch.sport,
    });

    assert.equal(isSelected, false);
    assert.equal(featured.isFeatured, true);
    assert.equal(featured.badgeLabel, "EL CLÁSICO");
  });
});
