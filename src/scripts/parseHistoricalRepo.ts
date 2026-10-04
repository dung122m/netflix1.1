import fs from "fs";
import path from "path";
import { CURATED_NANAFLIX_MILESTONES } from "../data/history/curatedSeed";
import { HistoricalEvent, HistoricalPeriodId, HistoricalVisualTheme } from "../data/history/types";

const contentPath = "C:/Users/a0326/.gemini/antigravity-ide/brain/d589f4aa-b226-494c-8163-e2d9f6794cb9/.system_generated/steps/2144/content.md";
const outputPath = path.resolve(__dirname, "../data/history/featuredHistory.ts");

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

function parseTimeHeader(header: string): {
  precision: "exact_day" | "month_year" | "year_only" | "era_approx";
  day?: number;
  month?: number;
  year?: number;
  isTcn?: boolean;
} {
  const isTcn = /TCN|Trước CN|năm trước/i.test(header);
  if (isTcn) {
    const yMatch = header.match(/\b(\d+)\s*(?:TCN|Trước CN)/i);
    return { precision: "era_approx", year: yMatch ? parseInt(yMatch[1], 10) : undefined, isTcn: true };
  }

  const exactMatch1 = header.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{3,4})\b/);
  if (exactMatch1) {
    const d = parseInt(exactMatch1[1], 10);
    const m = parseInt(exactMatch1[2], 10);
    const y = parseInt(exactMatch1[3], 10);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      return { precision: "exact_day", day: d, month: m, year: y };
    }
  }

  const exactMatchVN = header.match(/Ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})(?:\s+năm\s+(\d{3,4}))?/i);
  if (exactMatchVN) {
    const d = parseInt(exactMatchVN[1], 10);
    const m = parseInt(exactMatchVN[2], 10);
    const y = exactMatchVN[3] ? parseInt(exactMatchVN[3], 10) : undefined;
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      return { precision: "exact_day", day: d, month: m, year: y };
    }
  }

  const myMatch = header.match(/Tháng\s+(\d{1,2})[\/\-\s]+(?:năm\s+)?(\d{3,4})/i) || header.match(/\b(\d{1,2})[\/\-](\d{3,4})\b/);
  if (myMatch) {
    const m = parseInt(myMatch[1], 10);
    const y = parseInt(myMatch[2], 10);
    if (m >= 1 && m <= 12) {
      return { precision: "month_year", month: m, year: y };
    }
  }

  const yOnlyMatch = header.match(/\b(1\d{3}|20\d{2}|\d{3,4})\b/);
  if (yOnlyMatch && !/thế kỷ/i.test(header)) {
    const y = parseInt(yOnlyMatch[1], 10);
    return { precision: "year_only", year: y };
  }

  return { precision: "era_approx" };
}

function getPeriod(year?: number, isTcn?: boolean): HistoricalPeriodId {
  if (isTcn) return "tien-su-hung-vuong";
  if (!year) return "chua-xac-dinh";
  if (year < 938) return "bac-thuoc";
  if (year <= 1009) return "ngo-dinh-tien-le";
  if (year <= 1407) return "ly-tran-ho";
  if (year <= 1788) return "hau-le-mac-trung-hung";
  if (year <= 1802) return "tay-son";
  if (year <= 1883) return "nha-nguyen";
  if (year < 1945) return "phap-thuoc";
  if (year <= 1954) return "khang-chien-chong-phap";
  if (year <= 1975) return "khang-chien-chong-my";
  return "hien-dai-doi-moi";
}

function assignTheme(title: string, summary: string, year?: number): HistoricalVisualTheme {
  const t = (title + " " + summary).toLowerCase();
  if (t.includes("ba đình") || t.includes("tuyên ngôn độc lập") || year === 1945) return "ba-dinh-1945";
  if (t.includes("điện biên phủ") || t.includes("võ nguyên giáp")) return "dien-bien-phu";
  if (t.includes("giải phóng thủ đô") || t.includes("hà nội")) return "giai-phong-thu-do";
  if (t.includes("giải phóng miền nam") || t.includes("thống nhất") || year === 1975) return "thong-nhat-1975";
  if (t.includes("đống đa") || t.includes("ngọc hồi") || t.includes("quang trung")) return "dong-da";
  if (t.includes("hai bà trưng")) return "hai-ba-trung";
  if (t.includes("bạch đằng")) return "bach-dang";
  if (t.includes("hồ chí minh") || t.includes("bác hồ") || t.includes("tìm đường cứu nước")) return "bac-ho-cuu-nuoc";
  if (t.includes("kháng chiến") || t.includes("chiến dịch") || t.includes("khởi nghĩa")) return "khang-chien";
  return "general-history";
}

const figuresList = [
  { name: "Hồ Chí Minh", regex: /\b(Hồ Chí Minh|Nguyễn Ái Quốc|Nguyễn Tất Thành|Bác Hồ|Chủ tịch Hồ Chí Minh)\b/i },
  { name: "Võ Nguyên Giáp", regex: /\b(Võ Nguyên Giáp|Đại tướng Võ Nguyên Giáp)\b/i },
  { name: "Trần Hưng Đạo", regex: /\b(Trần Hưng Đạo|Trần Quốc Tuấn|Hưng Đạo Đại Vương)\b/i },
  { name: "Lý Thường Kiệt", regex: /\b(Lý Thường Kiệt)\b/i },
  { name: "Quang Trung", regex: /\b(Quang Trung|Nguyễn Huệ|Bắc Bình Vương)\b/i },
  { name: "Lê Lợi", regex: /\b(Lê Lợi|Lê Thái Tổ|Bình Định Vương)\b/i },
  { name: "Ngô Quyền", regex: /\b(Ngô Quyền|Tiền Ngô Vương)\b/i },
  { name: "Hai Bà Trưng", regex: /\b(Hai Bà Trưng|Trưng Trắc|Trưng Nhị)\b/i },
  { name: "Bà Triệu", regex: /\b(Bà Triệu|Triệu Thị Trinh|Triệu Quốc Đạt)\b/i },
  { name: "Đinh Bộ Lĩnh", regex: /\b(Đinh Bộ Lĩnh|Đinh Tiên Hoàng)\b/i },
  { name: "Lý Công Uẩn", regex: /\b(Lý Công Uẩn|Lý Thái Tổ)\b/i },
  { name: "Trần Nhân Tông", regex: /\b(Trần Nhân Tông|Trần Khâm)\b/i },
  { name: "Nguyễn Trãi", regex: /\b(Nguyễn Trãi)\b/i },
  { name: "Phan Bội Châu", regex: /\b(Phan Bội Châu)\b/i },
  { name: "Phan Châu Trinh", regex: /\b(Phan Châu Trinh)\b/i },
  { name: "Trần Phú", regex: /\b(Trần Phú)\b/i },
  { name: "Lê Hồng Phong", regex: /\b(Lê Hồng Phong)\b/i },
  { name: "Nguyễn Văn Cừ", regex: /\b(Nguyễn Văn Cừ)\b/i },
  { name: "Nguyễn Thị Minh Khai", regex: /\b(Nguyễn Thị Minh Khai)\b/i },
  { name: "Võ Thị Sáu", regex: /\b(Võ Thị Sáu)\b/i }
];

export function runParseAndGenerate() {
  const text = fs.readFileSync(contentPath, "utf8");
  const rawLines = text.split("\n").filter(l => l.trim().startsWith("*   **") || l.trim().startsWith("* **") || l.trim().startsWith("- **"));

  const featured: HistoricalEvent[] = [];
  const seenDatesAndKeys = new Set<string>();

  // 1. First, preserve all gold-standard curated Nanaflix historical events
  for (const cur of CURATED_NANAFLIX_MILESTONES) {
    const d = cur.date.day || 1;
    const m = cur.date.month || 1;
    const y = cur.year || 0;
    const dateKey = `${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}-${y}`;
    seenDatesAndKeys.add(dateKey);
    seenDatesAndKeys.add(`${m}-${d}-${normalize(cur.title).slice(0, 20)}`);

    featured.push(cur);
  }

  // 2. Parse repo events and select top historical milestones
  let addedCount = 0;
  let dupCount = 0;

  for (const line of rawLines) {
    const match = line.match(/\*\*(.*?)\*\*/);
    if (!match) continue;
    const rawHeader = match[1].trim();
    const rawDesc = line.replace(/\*\*.*?\*\*/, "").replace(/^[\*\-\s:]+/, "").trim();
    if (!rawDesc) continue;

    const timeInfo = parseTimeHeader(rawHeader);
    if (timeInfo.precision !== "exact_day" || !timeInfo.day || !timeInfo.month || !timeInfo.year) {
      continue;
    }

    const d = timeInfo.day;
    const m = timeInfo.month;
    const y = timeInfo.year;

    const dateKey = `${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}-${y}`;
    const titleKey = `${m}-${d}-${normalize(rawDesc).slice(0, 20)}`;

    let isDup = false;
    if (seenDatesAndKeys.has(dateKey) || seenDatesAndKeys.has(titleKey)) {
      isDup = true;
    } else {
      for (const cur of CURATED_NANAFLIX_MILESTONES) {
        if (cur.date.day === d && cur.date.month === m) {
          const normC = normalize(cur.title);
          const normR = normalize(rawDesc);
          if (normR.includes(normC.slice(0, 15)) || (cur.year === y && (normR.includes("tuyen ngon") || normR.includes("dien bien phu") || normR.includes("giai phong") || normR.includes("vo nguyen giap")))) {
            isDup = true;
            break;
          }
        }
      }
    }

    if (isDup) {
      dupCount++;
      continue;
    }

    // Identify importance
    const isSTier = /(Tuyên ngôn Độc lập|Chiến thắng Điện Biên Phủ|Giải phóng miền Nam|Tổng tuyển cử đầu tiên|Thành lập Đảng|Khởi nghĩa Nam Kỳ|Cách mạng Tháng Tám|Bạch Đằng|Ngọc Hồi|Đống Đa|Võ Nguyên Giáp|Hồ Chí Minh|Lê Lợi|Ngô Quyền|Trần Hưng Đạo|Lý Thường Kiệt|Quang Trung|Đinh Bộ Lĩnh|Hai Bà Trưng|Bà Triệu)/i.test(line);
    const isATier = /(Chiến dịch|Hiệp định|Đại thắng|Giải phóng|Thành lập nước|Lên ngôi|Dời đô|Bảo vệ tổ quốc|Quốc khánh|Thống nhất|Khởi nghĩa|Toàn quốc kháng chiến)/i.test(line);

    // Focus on top S-tier and major A-tier historical milestones (target ~220-260 events total)
    if ((isSTier || isATier) && addedCount < 230) {
      seenDatesAndKeys.add(dateKey);
      seenDatesAndKeys.add(titleKey);

      let title = rawDesc.split(/[.:;]/)[0].trim();
      if (title.length > 85) title = title.slice(0, 82) + "...";

      const detectedFigures: string[] = [];
      for (const f of figuresList) {
        if (f.regex.test(line)) {
          detectedFigures.push(f.name);
        }
      }

      const cleanId = `hist-repo-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}-${y}-${normalize(title).replace(/\s+/g, "-").slice(0, 25)}`;

      featured.push({
        id: cleanId,
        date: {
          day: d,
          month: m,
          year: y,
          precision: "exact_day"
        },
        displayDate: `${d.toString().padStart(2, "0")}/${m.toString().padStart(2, "0")}/${y}`,
        year: y,
        title,
        summary: rawDesc,
        significance: "Sự kiện lịch sử tiêu biểu trong tiến trình dựng nước và giữ nước của dân tộc Việt Nam.",
        periodId: getPeriod(y),
        figures: detectedFigures.length > 0 ? detectedFigures : undefined,
        priorityTier: isSTier ? "S" : "A",
        priorityScore: isSTier ? 98 : 88,
        visualTheme: assignTheme(title, rawDesc, y),
        sources: ["vietnamese-historical-events (CC0)"]
      });
      addedCount++;
    }
  }

  // Sort featured events by month, day, year
  featured.sort((a, b) => {
    const ma = a.date.month || 0;
    const mb = b.date.month || 0;
    if (ma !== mb) return ma - mb;
    const da = a.date.day || 0;
    const db = b.date.day || 0;
    if (da !== db) return da - db;
    return (a.year || 0) - (b.year || 0);
  });

  // Output 1: Featured Events dataset (265 events)
  const featuredFileContent = `/**
 * NANAFLIX FEATURED HISTORICAL MILESTONES DATASET
 * Curated high-impact historical events synthesized from Nanaflix Fact-checked records
 * and David-LeK/vietnamese-historical-events (CC0 License).
 * Auto-generated by src/scripts/parseHistoricalRepo.ts
 */

import { HistoricalEvent } from "./types";

export const FEATURED_HISTORICAL_EVENTS: HistoricalEvent[] = ${JSON.stringify(featured, null, 2)};

export function getHistoricalEventsForDate(month: number, day: number): HistoricalEvent[] {
  return FEATURED_HISTORICAL_EVENTS.filter(
    (e) => e.date.month === month && e.date.day === day
  );
}
`;

  fs.writeFileSync(outputPath, featuredFileContent, "utf8");

  // Output 2: ALL Historical Events catalog (~3,388 events for /history)
  const catalogDir = path.resolve(__dirname, "../data/history/catalog");
  if (!fs.existsSync(catalogDir)) {
    fs.mkdirSync(catalogDir, { recursive: true });
  }

  const allEvents: HistoricalEvent[] = [];
  let eventSeq = 1;

  for (const line of rawLines) {
    const match = line.match(/\*\*(.*?)\*\*/);
    if (!match) continue;
    const rawHeader = match[1].trim();
    const rawDesc = line.replace(/\*\*.*?\*\*/, "").replace(/^[\*\-\s:]+/, "").trim();
    if (!rawDesc) continue;

    const timeInfo = parseTimeHeader(rawHeader);
    let title = rawDesc.split(/[.:;]/)[0].trim();
    if (title.length > 90) title = title.slice(0, 87) + "...";

    const detectedFigures: string[] = [];
    for (const f of figuresList) {
      if (f.regex.test(line)) {
        detectedFigures.push(f.name);
      }
    }

    const isSTier = /(Tuyên ngôn Độc lập|Chiến thắng Điện Biên Phủ|Giải phóng miền Nam|Tổng tuyển cử đầu tiên|Thành lập Đảng|Khởi nghĩa Nam Kỳ|Cách mạng Tháng Tám|Bạch Đằng|Ngọc Hồi|Đống Đa|Võ Nguyên Giáp|Hồ Chí Minh|Lê Lợi|Ngô Quyền|Trần Hưng Đạo|Lý Thường Kiệt|Quang Trung|Đinh Bộ Lĩnh|Hai Bà Trưng|Bà Triệu)/i.test(line);
    const isATier = /(Chiến dịch|Hiệp định|Đại thắng|Giải phóng|Thành lập nước|Lên ngôi|Dời đô|Bảo vệ tổ quốc|Quốc khánh|Thống nhất|Khởi nghĩa|Toàn quốc kháng chiến)/i.test(line);

    let displayDate = rawHeader;
    if (timeInfo.precision === "exact_day" && timeInfo.day && timeInfo.month && timeInfo.year) {
      displayDate = `${timeInfo.day.toString().padStart(2, "0")}/${timeInfo.month.toString().padStart(2, "0")}/${timeInfo.year}`;
    } else if (timeInfo.precision === "month_year" && timeInfo.month && timeInfo.year) {
      displayDate = `Tháng ${timeInfo.month}/${timeInfo.year}`;
    } else if (timeInfo.precision === "year_only" && timeInfo.year) {
      displayDate = `Năm ${timeInfo.year}`;
    }

    const id = `he-${eventSeq.toString().padStart(4, "0")}-${(timeInfo.year || 0).toString().replace("-", "bce")}`;

    allEvents.push({
      id,
      date: {
        day: timeInfo.day,
        month: timeInfo.month,
        year: timeInfo.year,
        precision: timeInfo.precision,
        isBce: timeInfo.isTcn
      },
      displayDate,
      year: timeInfo.year,
      title,
      summary: rawDesc,
      significance: "Sự kiện trong dòng thời gian lịch sử Việt Nam.",
      periodId: getPeriod(timeInfo.year, timeInfo.isTcn),
      figures: detectedFigures.length > 0 ? detectedFigures : undefined,
      priorityTier: isSTier ? "S" : isATier ? "A" : "B",
      priorityScore: isSTier ? 100 : isATier ? 85 : 70,
      visualTheme: assignTheme(title, rawDesc, timeInfo.year),
      sources: ["vietnamese-historical-events (CC0)"]
    });

    eventSeq++;
  }

  const allHistoryJsonPath = path.join(catalogDir, "allHistory.json");
  fs.writeFileSync(allHistoryJsonPath, JSON.stringify(allEvents, null, 2), "utf8");

  console.log(`=== PARSE & GENERATE REPORT ===`);
  console.log(`- FEATURED Events: ${featured.length} events -> ${outputPath}`);
  console.log(`  + Curated existing: ${CURATED_NANAFLIX_MILESTONES.length}`);
  console.log(`  + Added from repo: ${addedCount}`);
  console.log(`  + Duplicates skipped: ${dupCount}`);
  console.log(`- ALL Historical Events: ${allEvents.length} events -> ${allHistoryJsonPath}`);
}

runParseAndGenerate();

