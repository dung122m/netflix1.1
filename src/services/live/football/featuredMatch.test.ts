import { describe, it } from "node:test";
import assert from "node:assert";
import { isFeaturedMatch, isProminentTeam, countUniqueServers } from "./featuredMatch";
import { getTeamAsset } from "@/data/live/teamAssets";

describe("Featured Match (Trận Cầu Tâm Điểm) Multi-Criteria Classification System", () => {
  // =========================================================================
  // 1. MARQUEE RIVALRIES / DERBIES HIỆN CÓ VÀ MỚI BỔ SUNG
  // =========================================================================
  it("1. Marquee Rivalry: Real Madrid vs Barcelona được phân loại là EL CLÁSICO", () => {
    const res = isFeaturedMatch({
      title: "Real Madrid vs Barcelona",
      team1: "Real Madrid",
      team2: "Barcelona",
      tournament: "La Liga",
    });
    assert.strictEqual(res.isFeatured, true);
    assert.strictEqual(res.badgeLabel, "EL CLÁSICO");
    assert.strictEqual(res.reason, "marquee_derby");
  });

  it("2. Marquee Rivalry: Đổi thứ tự sân (Barcelona vs Real Madrid) vẫn nhận diện đúng", () => {
    const res = isFeaturedMatch({
      title: "Barcelona vs Real Madrid",
      team1: "Barcelona",
      team2: "Real Madrid",
      tournament: "La Liga",
    });
    assert.strictEqual(res.isFeatured, true);
    assert.strictEqual(res.badgeLabel, "EL CLÁSICO");
    assert.strictEqual(res.reason, "marquee_derby");
  });

  it("3. Marquee Rivalry: Manchester City vs Manchester United -> MANCHESTER DERBY", () => {
    const res = isFeaturedMatch({
      title: "Manchester City vs Manchester United",
      team1: "Manchester City",
      team2: "Manchester United",
      tournament: "Ngoại Hạng Anh",
    });
    assert.strictEqual(res.isFeatured, true);
    assert.strictEqual(res.badgeLabel, "MANCHESTER DERBY");
    assert.strictEqual(res.reason, "marquee_derby");
  });

  it("4. Marquee Rivalry: AC Milan vs Inter Milan -> DERBY MILANO", () => {
    const res = isFeaturedMatch({
      title: "AC Milan vs Inter Milan",
      team1: "AC Milan",
      team2: "Inter Milan",
      tournament: "Serie A",
    });
    assert.strictEqual(res.isFeatured, true);
    assert.strictEqual(res.badgeLabel, "DERBY MILANO");
    assert.strictEqual(res.reason, "marquee_derby");
  });

  it("5. Marquee Rivalry mới: Liverpool vs Everton -> MERSEYSIDE DERBY", () => {
    const res1 = isFeaturedMatch({
      title: "Liverpool vs Everton",
      team1: "Liverpool",
      team2: "Everton",
      tournament: "Premier League",
    });
    assert.strictEqual(res1.isFeatured, true);
    assert.strictEqual(res1.badgeLabel, "MERSEYSIDE DERBY");
    assert.strictEqual(res1.reason, "marquee_derby");

    const res2 = isFeaturedMatch({
      title: "Everton vs Liverpool",
      team1: "Everton",
      team2: "Liverpool",
      tournament: "Premier League",
    });
    assert.strictEqual(res2.isFeatured, true);
    assert.strictEqual(res2.badgeLabel, "MERSEYSIDE DERBY");
  });

  it("6. Marquee Rivalry mới: Al Hilal vs Al Nassr -> RIYADH DERBY", () => {
    const res = isFeaturedMatch({
      title: "Al Hilal vs Al Nassr",
      team1: "Al Hilal",
      team2: "Al Nassr",
      tournament: "Saudi Pro League",
    });
    assert.strictEqual(res.isFeatured, true);
    assert.strictEqual(res.badgeLabel, "RIYADH DERBY");
    assert.strictEqual(res.reason, "marquee_derby");
  });

  it("7. Marquee Rivalry mới: Benfica vs Porto -> O CLÁSSICO", () => {
    const res = isFeaturedMatch({
      title: "Benfica vs Porto",
      team1: "Benfica",
      team2: "Porto",
      tournament: "Primeira Liga",
    });
    assert.strictEqual(res.isFeatured, true);
    assert.strictEqual(res.badgeLabel, "O CLÁSSICO");
    assert.strictEqual(res.reason, "marquee_derby");
  });

  it("8. Marquee Rivalry mới: Hà Nội FC vs Công An Hà Nội -> DERBY HÀ NỘI", () => {
    const res = isFeaturedMatch({
      title: "Hà Nội FC vs Công An Hà Nội",
      team1: "Hà Nội FC",
      team2: "Công An Hà Nội",
      tournament: "V-League",
    });
    assert.strictEqual(res.isFeatured, true);
    assert.strictEqual(res.badgeLabel, "DERBY HÀ NỘI");
    assert.strictEqual(res.reason, "marquee_derby");
  });

  // =========================================================================
  // 2. CHỐNG NHẬN DIỆN NHẦM ĐỘI BÓNG (P0 FALSE POSITIVE GUARD)
  // =========================================================================
  it("9. Chống nhận diện nhầm CLB: Newcastle Jets không phải Newcastle United", () => {
    assert.strictEqual(isProminentTeam("Newcastle Jets"), false);
    const asset = getTeamAsset("Newcastle Jets");
    assert.notStrictEqual(asset?.name, "Newcastle United");
  });

  it("10. Chống nhận diện nhầm CLB: Real Salt Lake không phải Real Madrid", () => {
    assert.strictEqual(isProminentTeam("Real Salt Lake"), false);
    const asset = getTeamAsset("Real Salt Lake");
    assert.notStrictEqual(asset?.name, "Real Madrid");
  });

  it("11. Chống nhận diện nhầm CLB: Inter Turku không phải Inter Milan", () => {
    assert.strictEqual(isProminentTeam("Inter Turku"), false);
    const asset = getTeamAsset("Inter Turku");
    assert.notStrictEqual(asset?.name, "Inter Milan");
  });

  it("12. Chống nhận diện nhầm CLB: Paris FC không phải PSG", () => {
    assert.strictEqual(isProminentTeam("Paris FC"), false);
    const asset = getTeamAsset("Paris FC");
    assert.notStrictEqual(asset?.name, "Paris Saint-Germain");
  });

  it("13. Chống nhận diện nhầm CLB: Barcelona SC không phải Barcelona", () => {
    assert.strictEqual(isProminentTeam("Barcelona SC"), false);
    const asset = getTeamAsset("Barcelona SC");
    assert.notStrictEqual(asset?.name, "Barcelona");
  });

  it("14. Chống nhận diện nhầm CLB: Sporting Kansas City không phải Sporting CP", () => {
    assert.strictEqual(isProminentTeam("Sporting Kansas City"), false);
    const asset = getTeamAsset("Sporting Kansas City");
    assert.notStrictEqual(asset?.name, "Sporting CP");
  });

  it("15. Trận giữa 2 đội không nổi bật (Newcastle Jets vs Real Salt Lake) < 20 nguồn -> KHÔNG Tâm Điểm", () => {
    const res = isFeaturedMatch({
      title: "Newcastle Jets vs Real Salt Lake",
      team1: "Newcastle Jets",
      team2: "Real Salt Lake",
      tournament: "Club Friendly",
      validServersCount: 5,
    });
    assert.strictEqual(res.isFeatured, false);
  });

  it("16. Trận Paris FC vs Barcelona SC < 20 nguồn -> KHÔNG Tâm Điểm", () => {
    const res = isFeaturedMatch({
      title: "Paris FC vs Barcelona SC",
      team1: "Paris FC",
      team2: "Barcelona SC",
      tournament: "Club Friendly",
      validServersCount: 8,
    });
    assert.strictEqual(res.isFeatured, false);
  });

  // =========================================================================
  // 3. TRƯỜNG HỢP HỢP LỆ VÀ CÁC CLB V-LEAGUE ĐÃ XÁC MINH
  // =========================================================================
  it("17. Các CLB lớn vẫn được nhận diện chính xác là Prominent", () => {
    assert.strictEqual(isProminentTeam("Real Madrid"), true);
    assert.strictEqual(isProminentTeam("Manchester City"), true);
    assert.strictEqual(isProminentTeam("Barcelona"), true);
    assert.strictEqual(isProminentTeam("AC Milan"), true);
    assert.strictEqual(isProminentTeam("Inter Milan"), true);
    assert.strictEqual(isProminentTeam("PSG"), true);
    assert.strictEqual(isProminentTeam("Paris Saint-Germain"), true);
    assert.strictEqual(isProminentTeam("Sporting CP"), true);
    assert.strictEqual(isProminentTeam("Newcastle United"), true);
  });

  it("18. Các CLB V-League đã xác minh được nhận diện là Prominent", () => {
    assert.strictEqual(isProminentTeam("Hà Nội FC"), true);
    assert.strictEqual(isProminentTeam("Công An Hà Nội"), true);
    assert.strictEqual(isProminentTeam("Thép Xanh Nam Định"), true);
    assert.strictEqual(isProminentTeam("Thể Công - Viettel"), true);
    assert.strictEqual(isProminentTeam("Hoàng Anh Gia Lai"), true);
    assert.strictEqual(isProminentTeam("HAGL"), true);
    assert.strictEqual(isProminentTeam("Sông Lam Nghệ An"), true);
    assert.strictEqual(isProminentTeam("SLNA"), true);
    assert.strictEqual(isProminentTeam("Hải Phòng"), true);
    assert.strictEqual(isProminentTeam("Hải Phòng FC"), true);
  });

  it("19. Trận có CLB V-League nổi bật (Hà Nội FC vs Hải Phòng) -> TÂM ĐIỂM", () => {
    const res = isFeaturedMatch({
      title: "Hà Nội FC vs Hải Phòng",
      team1: "Hà Nội FC",
      team2: "Hải Phòng",
      tournament: "V-League",
    });
    assert.strictEqual(res.isFeatured, true);
    assert.strictEqual(res.badgeLabel, "TÂM ĐIỂM");
    assert.strictEqual(res.reason, "prominent_team");
  });

  // =========================================================================
  // 4. VÒNG ĐẤU CÚP (FINAL, SEMI, QUARTER, SUPER CUP & ROUND OF 16)
  // =========================================================================
  it("20. Vòng chung kết (Final) -> CHUNG KẾT", () => {
    const res = isFeaturedMatch({
      title: "Chung kết Cúp C1: PSG vs Dortmund",
      team1: "PSG",
      team2: "Dortmund",
      tournament: "UEFA Champions League",
    });
    assert.strictEqual(res.isFeatured, true);
    assert.strictEqual(res.badgeLabel, "CHUNG KẾT");
    assert.strictEqual(res.reason, "final");
  });

  it("21. Vòng bán kết (Semi-final) -> BÁN KẾT", () => {
    const res = isFeaturedMatch({
      title: "Bán kết FA Cup: Coventry City vs Manchester United",
      team1: "Coventry City",
      team2: "Manchester United",
      tournament: "FA Cup",
    });
    assert.strictEqual(res.isFeatured, true);
    assert.strictEqual(res.badgeLabel, "BÁN KẾT");
    assert.strictEqual(res.reason, "semi_final");
  });

  it("22. Vòng tứ kết (Quarter-final) -> TỨ KẾT", () => {
    const res = isFeaturedMatch({
      title: "Tứ kết Cúp Quốc Gia: Hải Phòng vs Nam Định",
      team1: "Hải Phòng",
      team2: "Nam Định",
      tournament: "Cúp Quốc Gia",
    });
    assert.strictEqual(res.isFeatured, true);
    assert.strictEqual(res.badgeLabel, "TỨ KẾT");
    assert.strictEqual(res.reason, "quarter_final");
  });

  it("23. Siêu cúp (Super Cup) -> SIÊU CÚP", () => {
    const res = isFeaturedMatch({
      title: "Siêu cúp Châu Âu: Real Madrid vs Atalanta",
      team1: "Real Madrid",
      team2: "Atalanta",
      tournament: "UEFA Super Cup",
    });
    assert.strictEqual(res.isFeatured, true);
    assert.strictEqual(res.badgeLabel, "SIÊU CÚP");
    assert.strictEqual(res.reason, "super_cup");
  });

  it("24. Vòng 1/8 cúp (Round of 16 / R16 / Vòng 1/8) -> VÒNG 1/8", () => {
    const res1 = isFeaturedMatch({
      title: "Vòng 1/8 Cúp C1: Lazio vs Bayern Munich",
      team1: "Lazio",
      team2: "Bayern Munich",
      tournament: "UEFA Champions League",
    });
    assert.strictEqual(res1.isFeatured, true);
    assert.strictEqual(res1.badgeLabel, "VÒNG 1/8");
    assert.strictEqual(res1.reason, "round_of_16");

    const res2 = isFeaturedMatch({
      title: "UEFA Champions League Round of 16",
      team1: "Porto",
      team2: "Arsenal",
      stage: "round_of_16",
    });
    assert.strictEqual(res2.isFeatured, true);
    assert.strictEqual(res2.badgeLabel, "VÒNG 1/8");
    assert.strictEqual(res2.reason, "round_of_16");

    const res3 = isFeaturedMatch({
      title: "Cúp Quốc Gia Vòng 16 đội: Huế vs Bình Phước",
      team1: "Huế",
      team2: "Bình Phước",
      tournament: "Cúp Quốc Gia",
    });
    assert.strictEqual(res3.isFeatured, true);
    assert.strictEqual(res3.badgeLabel, "VÒNG 1/8");
  });

  it("25. Vòng play-off KHÔNG bị nhầm thành Vòng 1/8", () => {
    const res = isFeaturedMatch({
      title: "Play-off Cúp C1: Young Boys vs Galatasaray",
      team1: "Young Boys",
      team2: "Galatasaray",
      tournament: "UEFA Champions League",
      stage: "play-off",
      validServersCount: 5,
    });
    assert.notStrictEqual(res.badgeLabel, "VÒNG 1/8");
  });

  // =========================================================================
  // 5. TÍCH HỢP NGƯỠNG 20 NGUỒN PHÁT & DEDUPLICATION (P0)
  // =========================================================================
  it("26. Ngưỡng nguồn phát: 0 nguồn -> KHÔNG Tâm Điểm", () => {
    const res = isFeaturedMatch({
      title: "Fulham vs Brentford",
      team1: "Fulham",
      team2: "Brentford",
      tournament: "Ngoại Hạng Anh",
      validServersCount: 0,
    });
    assert.strictEqual(res.isFeatured, false);
  });

  it("27. Ngưỡng nguồn phát: 1 nguồn -> KHÔNG Tâm Điểm", () => {
    const res = isFeaturedMatch({
      title: "Fulham vs Brentford",
      team1: "Fulham",
      team2: "Brentford",
      tournament: "Ngoại Hạng Anh",
      validServersCount: 1,
    });
    assert.strictEqual(res.isFeatured, false);
  });

  it("28. Ngưỡng nguồn phát: 19 nguồn -> KHÔNG Tâm Điểm", () => {
    const res = isFeaturedMatch({
      title: "Fulham vs Brentford",
      team1: "Fulham",
      team2: "Brentford",
      tournament: "Ngoại Hạng Anh",
      validServersCount: 19,
    });
    assert.strictEqual(res.isFeatured, false);
  });

  it("29. Ngưỡng nguồn phát: Đạt 20 nguồn hợp lệ -> Gắn nhãn chung TÂM ĐIỂM", () => {
    const res = isFeaturedMatch({
      title: "Fulham vs Brentford",
      team1: "Fulham",
      team2: "Brentford",
      tournament: "Ngoại Hạng Anh",
      validServersCount: 20,
    });
    assert.strictEqual(res.isFeatured, true);
    assert.strictEqual(res.badgeLabel, "TÂM ĐIỂM");
    assert.strictEqual(res.reason, "high_demand_sources");
  });

  it("30. Ngưỡng nguồn phát: 21 nguồn -> Gắn nhãn chung TÂM ĐIỂM", () => {
    const res = isFeaturedMatch({
      title: "Fulham vs Brentford",
      team1: "Fulham",
      team2: "Brentford",
      tournament: "Ngoại Hạng Anh",
      validServersCount: 21,
    });
    assert.strictEqual(res.isFeatured, true);
    assert.strictEqual(res.badgeLabel, "TÂM ĐIỂM");
    assert.strictEqual(res.reason, "high_demand_sources");
  });

  it("31. Deduplication: 25 bản ghi server nhưng chỉ có 19 URL khác nhau sau chuẩn hóa -> KHÔNG đạt 20 nguồn", () => {
    // 19 base URLs khác nhau
    const baseUrls = Array.from({ length: 19 }, (_, i) => `https://stream-cdn-${i + 1}.example.com/live/stream.m3u8`);
    // Tạo 25 servers trong đó 6 server bị trùng URL (qua proxy unwrap hoặc query param)
    const servers: Array<{ url: string }> = [
      ...baseUrls.map((url) => ({ url })),
      // 6 bản ghi trùng lặp:
      { url: `https://stream-cdn-1.example.com/live/stream.m3u8?token=xyz123` },
      { url: `/api/live-football/proxy?url=${encodeURIComponent("https://stream-cdn-2.example.com/live/stream.m3u8")}` },
      { url: `/api/live-football/proxy?url=${encodeURIComponent("https://stream-cdn-3.example.com/live/stream.m3u8?auth=abc")}` },
      { url: `https://stream-cdn-4.example.com/live/stream.m3u8` },
      { url: `https://stream-cdn-5.example.com/live/stream.m3u8` },
      { url: `/api/live-football/proxy?url=${encodeURIComponent("https://stream-cdn-1.example.com/live/stream.m3u8")}` },
    ];

    assert.strictEqual(servers.length, 25, "Tổng số bản ghi server thô là 25");
    const uniqueCount = countUniqueServers(servers);
    assert.strictEqual(uniqueCount, 19, "Sau chuẩn hóa unwrap/query strip chỉ còn đúng 19 nguồn độc lập");

    const res = isFeaturedMatch({
      title: "Getafe vs Osasuna",
      team1: "Getafe",
      team2: "Osasuna",
      tournament: "La Liga",
      servers,
    });
    assert.strictEqual(res.isFeatured, false, "19 nguồn độc lập không được coi là đạt ngưỡng 20");
  });

  it("32. Deduplication: 20 nguồn độc lập thực sự qua danh sách servers -> Đạt Tâm Điểm", () => {
    const servers = Array.from({ length: 20 }, (_, i) => ({
      url: `https://source-${i + 1}.livecdn.net/hls/feed.m3u8`,
    }));
    const uniqueCount = countUniqueServers(servers);
    assert.strictEqual(uniqueCount, 20);

    const res = isFeaturedMatch({
      title: "Getafe vs Osasuna",
      team1: "Getafe",
      team2: "Osasuna",
      tournament: "La Liga",
      servers,
    });
    assert.strictEqual(res.isFeatured, true);
    assert.strictEqual(res.badgeLabel, "TÂM ĐIỂM");
    assert.strictEqual(res.reason, "high_demand_sources");
  });

  // =========================================================================
  // 6. THỨ TỰ ƯU TIÊN (P2 ORDER PRESERVATION)
  // =========================================================================
  it("33. Thứ tự ưu tiên: Derby có < 20 nguồn vẫn giữ nguyên nhãn derby cụ thể", () => {
    const res = isFeaturedMatch({
      title: "Everton vs Liverpool",
      team1: "Everton",
      team2: "Liverpool",
      tournament: "Premier League",
      validServersCount: 3,
    });
    assert.strictEqual(res.isFeatured, true);
    assert.strictEqual(res.badgeLabel, "MERSEYSIDE DERBY");
    assert.strictEqual(res.reason, "marquee_derby");
  });

  it("34. Thứ tự ưu tiên: Derby có >= 20 nguồn VẪN GIỮ nhãn derby cụ thể (KHÔNG bị đè thành TÂM ĐIỂM)", () => {
    const res = isFeaturedMatch({
      title: "AC Milan vs Inter Milan",
      team1: "AC Milan",
      team2: "Inter Milan",
      tournament: "Serie A",
      validServersCount: 35,
    });
    assert.strictEqual(res.isFeatured, true);
    assert.strictEqual(res.badgeLabel, "DERBY MILANO", "Ngưỡng 20 nguồn không được ghi đè nhãn DERBY MILANO");
    assert.strictEqual(res.reason, "marquee_derby");
  });

  it("35. Thứ tự ưu tiên: Chung kết có 30 nguồn VẪN GIỮ nhãn CHUNG KẾT", () => {
    const res = isFeaturedMatch({
      title: "Chung kết Champions League",
      team1: "Arsenal",
      team2: "Bayern Munich",
      tournament: "UEFA Champions League",
      validServersCount: 40,
    });
    assert.strictEqual(res.isFeatured, true);
    assert.strictEqual(res.badgeLabel, "CHUNG KẾT");
    assert.strictEqual(res.reason, "final");
  });

  it("36. Thứ tự ưu tiên: Vòng 1/8 có 25 nguồn VẪN GIỮ nhãn VÒNG 1/8", () => {
    const res = isFeaturedMatch({
      title: "Vòng 1/8 Cúp C1: Real Madrid vs Leipzig",
      team1: "Real Madrid",
      team2: "Leipzig",
      tournament: "UEFA Champions League",
      validServersCount: 25,
    });
    assert.strictEqual(res.isFeatured, true);
    assert.strictEqual(res.badgeLabel, "VÒNG 1/8");
    assert.strictEqual(res.reason, "round_of_16");
  });

  it("37. Sport Guard: Môn khác bóng đá (basketball/tennis/esports) có >= 20 nguồn KHÔNG được gắn nhãn Tâm Điểm", () => {
    const resBasketball = isFeaturedMatch({
      title: "Los Angeles Lakers vs Golden State Warriors",
      team1: "Los Angeles Lakers",
      team2: "Golden State Warriors",
      sport: "basketball",
      validServersCount: 30,
    });
    assert.strictEqual(resBasketball.isFeatured, false, "Bóng rổ nhiều nguồn không được thành Tâm Điểm bóng đá");

    const resTennis = isFeaturedMatch({
      title: "Alcaraz vs Sinner Tennis Final",
      sport: "tennis",
      validServersCount: 25,
    });
    assert.strictEqual(resTennis.isFeatured, false, "Tennis nhiều nguồn không được thành Tâm Điểm bóng đá");
  });

  it("38. Trận đấu thông thường thiếu metadata và < 20 nguồn -> isFeatured = false", () => {
    const res = isFeaturedMatch({
      title: "Trận Đấu Chưa Xác Định",
      tournament: "",
    });
    assert.strictEqual(res.isFeatured, false);
  });
});
