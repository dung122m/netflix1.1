/**
 * Dịch vị trí thi đấu bóng đá sang Tiếng Việt chuẩn xác
 */
export function translatePosition(pos?: string): string {
  if (!pos) return "Cầu thủ";
  const p = pos.trim().toLowerCase();

  // Thủ môn
  if (/\b(goalkeeper|gk|g)\b/.test(p)) return "Thủ môn";

  // Hậu vệ
  if (p.includes("center left defender") || /\bcd-l|cb-l\b/.test(p)) return "Trung vệ lệch trái";
  if (p.includes("center right defender") || /\bcd-r|cb-r\b/.test(p)) return "Trung vệ lệch phải";
  if (p.includes("center defender") || p.includes("centre-back") || p.includes("centre back") || /\bcb\b/.test(p)) return "Trung vệ";
  if (p.includes("left wing back") || /\blwb\b/.test(p)) return "Hậu vệ biên trái";
  if (p.includes("right wing back") || /\brwb\b/.test(p)) return "Hậu vệ biên phải";
  if (p.includes("left back") || /\blb\b/.test(p)) return "Hậu vệ cánh trái";
  if (p.includes("right back") || /\brb\b/.test(p)) return "Hậu vệ cánh phải";
  if (p.includes("wing back") || /\bwb\b/.test(p)) return "Hậu vệ biên";
  if (p.includes("defender") || /\bd\b/.test(p)) return "Hậu vệ";

  // Tiền vệ
  if (p.includes("defensive midfielder") || /\b(dm|cdm)\b/.test(p)) return "Tiền vệ phòng ngự";
  if (p.includes("attacking midfielder left") || /\bam-l|lam\b/.test(p)) return "Tiền vệ tấn công lệch trái";
  if (p.includes("attacking midfielder right") || /\bam-r|ram\b/.test(p)) return "Tiền vệ tấn công lệch phải";
  if (p.includes("attacking midfielder") || /\b(am|cam)\b/.test(p)) return "Tiền vệ tấn công";
  if (p.includes("center left midfielder") || /\b(cm-l|lcm)\b/.test(p)) return "Tiền vệ lệch trái";
  if (p.includes("center right midfielder") || /\b(cm-r|rcm)\b/.test(p)) return "Tiền vệ lệch phải";
  if (p.includes("left midfielder") || /\blm\b/.test(p)) return "Tiền vệ cánh trái";
  if (p.includes("right midfielder") || /\brm\b/.test(p)) return "Tiền vệ cánh phải";
  if (p.includes("center midfielder") || p.includes("centre midfielder") || p.includes("central midfielder") || /\bcm\b/.test(p)) return "Tiền vệ trung tâm";
  if (p.includes("midfielder") || /\bm\b/.test(p)) return "Tiền vệ";

  // Tiền đạo
  if (p.includes("second striker") || /\bss\b/.test(p)) return "Hộ công";
  if (p.includes("center left forward") || /\b(cf-l|st-l)\b/.test(p)) return "Tiền đạo trung tâm";
  if (p.includes("center right forward") || /\b(cf-r|st-r)\b/.test(p)) return "Tiền đạo trung tâm";
  if (p.includes("center forward") || /\bcf\b/.test(p)) return "Tiền đạo trung tâm";
  if (p.includes("striker") || /\bst\b/.test(p)) return "Tiền đạo cắm";
  if (p.includes("left wing") || p.includes("left winger") || /\blw\b/.test(p)) return "Tiền đạo cánh trái";
  if (p.includes("right wing") || p.includes("right winger") || /\brw\b/.test(p)) return "Tiền đạo cánh phải";
  if (p.includes("left forward") || /\blf\b/.test(p)) return "Tiền đạo cánh trái";
  if (p.includes("right forward") || /\brf\b/.test(p)) return "Tiền đạo cánh phải";
  if (p.includes("forward") || /\bfw|f\b/.test(p)) return "Tiền đạo";

  return pos;
}

/**
 * Dịch nhãn thống kê thi đấu của cầu thủ sang Tiếng Việt
 */
export function translateStatName(name?: string): string {
  if (!name) return "";
  const key = name.trim().toLowerCase();

  const statDict: Record<string, string> = {
    appearances: "Số trận ra sân",
    "fouls committed": "Phạm lỗi",
    "fouls suffered": "Bị phạm lỗi",
    "own goals": "Phản lưới nhà",
    "red cards": "Thẻ đỏ",
    "substitute appearances": "Vào sân dự bị",
    "yellow cards": "Thẻ vàng",
    "goals against": "Bàn thua",
    "shots faced": "Cú sút phải đối mặt",
    assists: "Kiến tạo",
    offsides: "Việt vị",
    "shots on goal": "Sút trúng đích",
    "shots on target": "Sút trúng đích",
    "total goals": "Bàn thắng",
    goals: "Bàn thắng",
    shots: "Tổng cú sút",
    "total shots": "Tổng cú sút",
    passes: "Đường chuyền",
    "total passes": "Đường chuyền",
    "pass accuracy": "Chính xác đường chuyền",
    "passing accuracy": "Chính xác đường chuyền",
    tackles: "Tranh chấp / Tắc bóng",
    interceptions: "Cắt bóng",
    clearances: "Phá bóng",
    saves: "Cứu thua",
    "minutes played": "Số phút thi đấu",
    "key passes": "Đường chuyền quyết định",
    dribbles: "Rê bóng",
    "aerial duels won": "Không chiến thành công",
    crosses: "Tạt bóng",
    touches: "Chạm bóng",
    corners: "Phạt góc",
  };

  return statDict[key] || name;
}

