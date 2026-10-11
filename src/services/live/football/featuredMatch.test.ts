import { describe, it } from "node:test";
import assert from "node:assert";
import { isFeaturedMatch, isProminentTeam } from "./featuredMatch";

describe("Featured Match (Trận Cầu Tâm Điểm) Multi-Criteria Classification System", () => {
  // 1. Marquee Rivalries / Derbies
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

  // 2. Một đội nổi bật gặp đội thông thường -> TÂM ĐIỂM
  it("5. Một đội nổi bật gặp đội thông thường: Manchester City vs Fulham -> TÂM ĐIỂM", () => {
    const res = isFeaturedMatch({
      title: "Manchester City vs Fulham",
      team1: "Manchester City",
      team2: "Fulham",
      tournament: "Ngoại Hạng Anh",
    });
    assert.strictEqual(res.isFeatured, true);
    assert.strictEqual(res.badgeLabel, "TÂM ĐIỂM");
    assert.strictEqual(res.reason, "prominent_team");
  });

  it("6. Một đội nổi bật gặp đội thông thường: Real Madrid vs Getafe -> TÂM ĐIỂM", () => {
    const res = isFeaturedMatch({
      title: "Real Madrid vs Getafe",
      team1: "Real Madrid",
      team2: "Getafe",
      tournament: "La Liga",
    });
    assert.strictEqual(res.isFeatured, true);
    assert.strictEqual(res.badgeLabel, "TÂM ĐIỂM");
    assert.strictEqual(res.reason, "prominent_team");
  });

  it("7. Một đội nổi bật gặp đội thông thường: PSG vs Le Havre -> TÂM ĐIỂM", () => {
    const res = isFeaturedMatch({
      title: "PSG vs Le Havre",
      team1: "PSG",
      team2: "Le Havre",
      tournament: "Ligue 1",
    });
    assert.strictEqual(res.isFeatured, true);
    assert.strictEqual(res.badgeLabel, "TÂM ĐIỂM");
    assert.strictEqual(res.reason, "prominent_team");
  });

  it("8. ĐTQG nổi bật thi đấu: Việt Nam vs Philippines -> TÂM ĐIỂM", () => {
    const res = isFeaturedMatch({
      title: "Việt Nam vs Philippines",
      team1: "Việt Nam",
      team2: "Philippines",
      tournament: "AFF Cup",
    });
    assert.strictEqual(res.isFeatured, true);
    assert.strictEqual(res.badgeLabel, "TÂM ĐIỂM");
    assert.strictEqual(res.reason, "prominent_team");
  });

  // 3. Hai đội nổi bật gặp nhau (không thuộc danh sách derby thủ công)
  it("9. Hai đội nổi bật gặp nhau (không thuộc derby thủ công): Bayern Munich vs PSG -> TÂM ĐIỂM", () => {
    const res = isFeaturedMatch({
      title: "Bayern Munich vs PSG",
      team1: "Bayern Munich",
      team2: "PSG",
      tournament: "UEFA Champions League",
    });
    assert.strictEqual(res.isFeatured, true);
    assert.strictEqual(res.badgeLabel, "TÂM ĐIỂM");
    assert.strictEqual(res.reason, "prominent_team");
  });

  it("10. Hai đội nổi bật gặp nhau: Real Madrid vs Arsenal -> TÂM ĐIỂM", () => {
    const res = isFeaturedMatch({
      title: "Real Madrid vs Arsenal",
      team1: "Real Madrid",
      team2: "Arsenal",
      tournament: "UEFA Champions League",
    });
    assert.strictEqual(res.isFeatured, true);
    assert.strictEqual(res.badgeLabel, "TÂM ĐIỂM");
    assert.strictEqual(res.reason, "prominent_team");
  });

  // 4. Tính chất vòng đấu cúp đặc biệt (Ưu tiên cao nhất)
  it("11. Vòng chung kết cúp (Final) -> Được gắn nhãn CHUNG KẾT dù 2 đội bất kỳ", () => {
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

  it("12. Vòng bán kết (Semi-final) -> Được gắn nhãn BÁN KẾT", () => {
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

  it("13. Vòng tứ kết (Quarter-final) -> Được gắn nhãn TỨ KẾT", () => {
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

  it("14. Siêu cúp (Super Cup) -> Được gắn nhãn SIÊU CÚP", () => {
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

  // 5. Trận đấu thông thường (không thỏa mãn tiêu chí nào)
  it("15. Trận đấu thông thường (2 đội không nổi bật, không vòng cúp): Fulham vs Brentford -> KHÔNG nổi bật", () => {
    const res = isFeaturedMatch({
      title: "Fulham vs Brentford",
      team1: "Fulham",
      team2: "Brentford",
      tournament: "Ngoại Hạng Anh",
    });
    assert.strictEqual(res.isFeatured, false);
    assert.strictEqual(res.badgeLabel, undefined);
  });

  it("16. Trận đấu thông thường: Getafe vs Osasuna -> KHÔNG nổi bật", () => {
    const res = isFeaturedMatch({
      title: "Getafe vs Osasuna",
      team1: "Getafe",
      team2: "Osasuna",
      tournament: "La Liga",
    });
    assert.strictEqual(res.isFeatured, false);
  });

  // 6. Nhận diện tên viết tắt và tên đầy đủ
  it("17. Tên viết tắt và biến thể (MU, Man Utd, Barca, Spurs) nhận diện chính xác", () => {
    assert.strictEqual(isProminentTeam("Man Utd"), true);
    assert.strictEqual(isProminentTeam("MU"), true);
    assert.strictEqual(isProminentTeam("Barca"), true);
    assert.strictEqual(isProminentTeam("Spurs"), true);
    assert.strictEqual(isProminentTeam("PSG"), true);
    assert.strictEqual(isProminentTeam("BVB"), true);
    assert.strictEqual(isProminentTeam("ĐTQG Việt Nam"), true);
    assert.strictEqual(isProminentTeam("Fulham"), false);
  });

  // 7. Thiếu dữ liệu đội bóng -> Fallback an toàn
  it("18. Thiếu metadata để phân loại -> Hiển thị trận đấu bình thường (isFeatured = false)", () => {
    const res = isFeaturedMatch({
      title: "Trận Đấu Chưa Xác Định",
      tournament: "",
    });
    assert.strictEqual(res.isFeatured, false);
  });

  // 8. Môn thể thao không phải bóng đá -> Sport guard ngăn chặn
  it("19. Môn thể thao không phải bóng đá (basketball) -> KHÔNG gắn nhãn dù có tên đội trùng", () => {
    const res = isFeaturedMatch({
      title: "Real Madrid vs Barcelona Basketball",
      team1: "Real Madrid",
      team2: "Barcelona",
      sport: "basketball",
      tournament: "EuroLeague",
    });
    assert.strictEqual(res.isFeatured, false, "Bóng rổ không áp dụng danh sách bóng đá");
  });
});
