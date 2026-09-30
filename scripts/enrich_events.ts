import fs from "fs";
import path from "path";
import { VietnamEvent } from "../src/data/events/types";

// Helper to determine activities if not present
function buildActivities(ev: VietnamEvent): string[] {
  if (ev.activities && ev.activities.length > 0) return ev.activities;

  const id = ev.id.toLowerCase();
  const title = ev.title.toLowerCase();
  const cat = ev.category;
  const nat = ev.nature;

  // Specific event mappings
  if (id.includes("nguoi-cao-tuoi") || title.includes("người cao tuổi")) {
    return [
      "Thăm hỏi, chúc thọ và chăm sóc sức khỏe cho ông bà, cha mẹ",
      "Tổ chức các hoạt động văn nghệ, thể dục dưỡng sinh cho người cao tuổi",
      "Gìn giữ nếp nhà 'Kính lão đắc thọ' và lắng nghe những lời khuyên quý báu của thế hệ đi trước"
    ];
  }
  if (id.includes("ca-phe") || title.includes("cà phê")) {
    return [
      "Thưởng thức một ly cà phê phin nguyên chất thơm nồng cùng bạn bè",
      "Tìm hiểu về hành trình của hạt cà phê Robusta và Arabica từ nông trường đến tách cà phê",
      "Tôn vinh và ủng hộ những người nông dân trồng cà phê tại vùng đất Tây Nguyên đất đỏ"
    ];
  }
  if (id.includes("khuyen-hoc") || title.includes("khuyến học")) {
    return [
      "Trao học bổng khuyến học cho học sinh nghèo hiếu học",
      "Xây dựng thói quen đọc sách và tự học tập suốt đời trong gia đình và cơ quan",
      "Biểu dương các gương sáng tự học thành tài trong cộng đồng"
    ];
  }
  if (id.includes("nha-giao") || title.includes("nhà giáo") || title.includes("thầy cô")) {
    return [
      "Về thăm trường xưa, tri ân thầy cô giáo đã tận tụy dìu dắt bao thế hệ",
      "Gửi những bó hoa tươi thắm và lời chúc chân thành đến các thầy cô",
      "Phát động các phong trào thi đua học tốt, rèn luyện chăm ngoan"
    ];
  }
  if (id.includes("phu-nu") || title.includes("phụ nữ")) {
    return [
      "Tặng hoa, thiệp và những món quà ý nghĩa gửi đến bà, mẹ, vợ và đồng nghiệp nữ",
      "Tổ chức các buổi tọa đàm tôn vinh vai trò của phụ nữ trong gia đình và xã hội",
      "Chia sẻ công việc nhà và lan tỏa tình yêu thương, sự trân trọng tới phái đẹp"
    ];
  }
  if (id.includes("gia-dinh") || title.includes("gia đình")) {
    return [
      "Quây quần bên mâm cơm gia đình ấm cúng, chia sẻ những câu chuyện thường nhật",
      "Cùng các thành viên tham gia hoạt động dã ngoại hoặc chụp ảnh kỷ niệm",
      "Bày tỏ lòng yêu thương và sự thấu hiểu giữa các thế hệ trong gia đình"
    ];
  }
  if (id.includes("moi-truong") || title.includes("môi trường") || title.includes("trai-dat") || title.includes("trai dat")) {
    return [
      "Trồng thêm cây xanh tại khu dân cư, ban công hoặc nơi làm việc",
      "Hạn chế sử dụng đồ nhựa dùng một lần và phân loại rác thải tại nguồn",
      "Tắt bớt các thiết bị điện không cần thiết và sử dụng phương tiện giao thông thân thiện môi trường"
    ];
  }
  if (id.includes("sach") || title.includes("sách")) {
    return [
      "Đọc ít nhất một chương sách hay hoặc chia sẻ cuốn sách tâm đắc với bạn bè",
      "Tham gia các hội sách, hội thảo văn hóa đọc hoặc tặng sách cho thư viện cộng đồng",
      "Hình thành không gian đọc yên tĩnh và thói quen đọc sách mỗi ngày"
    ];
  }
  if (id.includes("suc-khoe") || id.includes("y-te") || title.includes("sức khỏe") || title.includes("tim mạch") || title.includes("thầy thuốc")) {
    return [
      "Kiểm tra sức khỏe định kỳ và rèn luyện thể dục thể thao đều đặn",
      "Xây dựng chế độ dinh dưỡng lành mạnh, ăn nhiều rau xanh và uống đủ nước",
      "Gửi lời tri ân đến các y bác sĩ và nhân viên y tế đang ngày đêm chăm sóc sức khỏe nhân dân"
    ];
  }
  if (id.includes("dien-anh") || id.includes("phim") || title.includes("điện ảnh") || title.includes("phim")) {
    return [
      "Thưởng thức những tác phẩm điện ảnh xuất sắc giàu giá trị nhân văn",
      "Tìm hiểu hậu trường sáng tạo và hành trình lao động nghệ thuật của các nhà làm phim",
      "Giao lưu và chia sẻ cảm nhận nghệ thuật cùng cộng đồng yêu phim"
    ];
  }

  // Category based defaults
  if (cat === "vietnam-history" || nat === "historical-anniversary") {
    return [
      "Dâng hương tưởng niệm các anh hùng liệt sĩ tại đài tưởng niệm và nghĩa trang liệt sĩ",
      "Tham quan các bảo tàng, di tích lịch sử để tìm hiểu mốc son vẻ vang của dân tộc",
      "Kể lại những câu chuyện lịch sử hào hùng cho thế hệ trẻ gìn giữ truyền thống yêu nước"
    ];
  }

  if (cat === "traditional-culture" || nat === "traditional-festival") {
    return [
      "Chuẩn bị lễ vật chu đáo và thực hiện các nghi thức truyền thống trang nghiêm",
      "Sum vầy bên gia đình, thưởng thức các món ăn mang phong vị đặc trưng lễ hội",
      "Tham gia các trò chơi dân gian và tìm hiểu nguồn gốc phong tục cổ truyền"
    ];
  }

  if (cat === "national-holiday" || nat === "official-holiday") {
    return [
      "Treo cờ Tổ quốc trang trọng tại nhà và nơi làm việc chào mừng ngày lễ lớn",
      "Tham gia các sự kiện văn hóa, biểu diễn nghệ thuật và pháo hoa kỷ niệm",
      "Dành thời gian nghỉ ngơi trọn vẹn, sum họp và du lịch cùng người thân"
    ];
  }

  if (cat === "international" || nat === "international-day") {
    return [
      "Tìm hiểu thông điệp và chủ đề toàn cầu của Liên Hợp Quốc cho ngày kỷ niệm",
      "Lan tỏa nhận thức tích cực trên mạng xã hội và cộng đồng xung quanh",
      "Tham gia các hoạt động tình nguyện hoặc đóng góp thiết thực cho cộng đồng"
    ];
  }

  if (cat === "social-family" || nat === "social-observance") {
    return [
      "Gửi gắm những lời chúc tốt đẹp và tình cảm ấm áp đến những người thân yêu",
      "Tổ chức các buổi gặp gỡ, họp mặt ý nghĩa để thắt chặt tình đoàn kết",
      "Thực hiện những việc làm tử tế, sẻ chia khó khăn với những hoàn cảnh kém may mắn"
    ];
  }

  return [
    "Khám phá ý nghĩa đặc biệt và những câu chuyện truyền cảm hứng của ngày này",
    "Chia sẻ thông điệp tích cực và năng lượng lạc quan tới bạn bè, người thân",
    "Dành thời gian thư giãn và trải nghiệm những khoảnh khắc ý nghĩa trong cuộc sống"
  ];
}

// Helper to determine whyItMatters if not present (only keep authentic, event-specific content; avoid generic boilerplates)
function buildWhyItMatters(ev: VietnamEvent): string | null {
  if (ev.whyItMatters && ev.whyItMatters.trim().length > 0) {
    if (
      ev.whyItMatters.includes("giải quyết những thách thức toàn cầu") ||
      ev.whyItMatters.includes("Mỗi ngày trong năm đều mang một thông điệp") ||
      ev.whyItMatters.includes("là nhịp cầu nối liền quá khứ") ||
      ev.whyItMatters.includes("Nghệ thuật và văn hóa là suối nguồn") ||
      ev.whyItMatters.includes("Đây là ngày hội non sông thiêng liêng") ||
      ev.whyItMatters.includes("Sự kiện lịch sử này là minh chứng hào hùng") ||
      ev.whyItMatters.includes("Ngày kỷ niệm là dịp đặc biệt để tôn vinh những giá trị nhân văn")
    ) {
      return null;
    }
    return ev.whyItMatters;
  }
  return null;
}

// Helper to determine message if not present
function buildMessage(ev: VietnamEvent): string {
  if (ev.message && ev.message.trim().length > 0) return ev.message;
  if (ev.quote && ev.quote.trim().length > 0) return ev.quote;

  const title = ev.title.toLowerCase();
  const cat = ev.category;

  if (title.includes("người cao tuổi")) {
    return "Kính chúc các bậc cao niên luôn dồi dào sức khỏe, an khang trường thọ và mãi là chỗ dựa tinh thần vững chắc cho con cháu.";
  }
  if (title.includes("cà phê")) {
    return "Chúc bạn một ngày mới ngập tràn năng lượng và hứng khởi bên tách cà phê thơm nồng đậm đà bản sắc Việt.";
  }
  if (title.includes("khuyến học")) {
    return "Học để biết, học để làm, học để chung sống và học để khẳng định giá trị bản thân mỗi ngày.";
  }
  if (title.includes("phụ nữ")) {
    return "Chúc một nửa thế giới luôn rạng ngời, tự tin, hạnh phúc và tràn đầy yêu thương trên mọi nẻo đường cuộc sống.";
  }
  if (title.includes("nhà giáo") || title.includes("thầy cô")) {
    return "Kính chúc quý thầy cô luôn giữ trọn ngọn lửa nhiệt huyết, dồi dào sức khỏe để chắp cánh ước mơ cho bao thế hệ học trò.";
  }
  if (title.includes("thầy thuốc") || title.includes("y tế")) {
    return "Tri ân sâu sắc những chiến sĩ áo trắng thầm lặng cống hiến vì sức khỏe và sự sống của nhân dân.";
  }

  if (cat === "vietnam-history" || cat === "national-holiday") {
    return "Tự hào truyền thống vẻ vang của dân tộc, vững bước tương lai kiến thiết đất nước giàu mạnh.";
  }
  if (cat === "traditional-culture") {
    return "Gìn giữ bản sắc truyền thống ngàn đời, thắp sáng ngọn lửa ấm cúng và nghĩa tình gia đình.";
  }
  if (cat === "international") {
    return "Chung tay hành động vì một thế giới hòa bình, xanh sạch và ngập tràn tình yêu thương.";
  }

  return "Chúc bạn có một ngày trọn vẹn niềm vui, hạnh phúc và gặt hái nhiều điều tốt đẹp.";
}

// Helper to determine interestingFacts if not present
function buildInterestingFacts(ev: VietnamEvent): string[] {
  if (ev.interestingFacts && ev.interestingFacts.length > 0) return ev.interestingFacts;
  if (ev.didYouKnow && ev.didYouKnow.trim().length > 0) {
    return [ev.didYouKnow];
  }
  return [
    "Sự kiện này được ghi nhận và hưởng ứng rộng rãi, mang lại nhiều giá trị tích cực cho cộng đồng.",
    "Mỗi năm, các tổ chức văn hóa và xã hội đều đưa ra những chủ đề mới nhằm lan tỏa thông điệp sâu sắc hơn."
  ];
}

// Helper to synthesize a dedicated, high-quality, rich Banner Description (45 - 90 words, 2-4 sentences)
function buildBannerDescription(ev: VietnamEvent): string {
  if (ev.bannerDescription && ev.bannerDescription.trim().length >= 100) {
    return ev.bannerDescription;
  }

  const parts: string[] = [];

  // Sentence 1: Origin or Background
  let s1 = ev.origin ? ev.origin.trim() : "";
  if (s1 && !s1.endsWith(".")) s1 += ".";

  // Sentence 2: Significance / Cultural Meaning
  let s2 = (ev.meaning || ev.significance) ? (ev.meaning || ev.significance)!.trim() : "";
  if (s2 && !s2.endsWith(".")) s2 += ".";

  if (s1 && s2 && s1.toLowerCase() !== s2.toLowerCase()) {
    parts.push(s1);
    parts.push(s2);
  } else if (s1) {
    parts.push(s1);
  } else if (s2) {
    parts.push(s2);
  }

  // Sentence 3: Concrete action, tradition, or call to reflection
  if (ev.traditions && ev.traditions.length > 0) {
    const t = ev.traditions[0].trim();
    const cleanT = t.endsWith(".") ? t.slice(0, -1) : t;
    parts.push(`Người dân và các gia đình thường ${cleanT.charAt(0).toLowerCase() + cleanT.slice(1)}.`);
  } else if (ev.activities && ev.activities.length > 0) {
    const a = ev.activities[0].trim();
    const cleanA = a.endsWith(".") ? a.slice(0, -1) : a;
    parts.push(`Đây là dịp ý nghĩa để ${cleanA.charAt(0).toLowerCase() + cleanA.slice(1)}.`);
  } else if (ev.didYouKnow && ev.didYouKnow.trim().length > 0) {
    let d = ev.didYouKnow.trim();
    if (!d.endsWith(".")) d += ".";
    if (!parts.some((p) => p.includes(d.slice(0, 25)))) {
      parts.push(d);
    }
  }

  let text = parts.join(" ");

  // Ensure healthy length (around 45-85 words)
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 40 && ev.message && !text.includes(ev.message)) {
    text += ` ${ev.message}`;
  }

  return text.trim();
}

const MONTH_FILES = [
  "january.ts",
  "february.ts",
  "march.ts",
  "april.ts",
  "may.ts",
  "june.ts",
  "july.ts",
  "august.ts",
  "september.ts",
  "october.ts",
  "november.ts",
  "december.ts",
  "lunar.ts",
];

const DATA_DIR = path.resolve(__dirname, "../src/data/events");

let totalProcessed = 0;
let totalWords = 0;

for (const fileName of MONTH_FILES) {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    continue;
  }

  const content = fs.readFileSync(filePath, "utf-8");

  // Extract array name and JSON structure
  const match = content.match(/export const (\w+):\s*VietnamEvent\[\]\s*=\s*(\[[\s\S]*\]);?/);
  if (!match) {
    console.warn(`Could not parse export in ${fileName}`);
    continue;
  }

  const exportVarName = match[1];
  const jsonRaw = match[2];

  let events: VietnamEvent[];
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    events = JSON.parse(jsonRaw);
  } catch (err) {
    console.error(`Error parsing JSON in ${fileName}:`, err);
    continue;
  }

  const enrichedEvents = events.map((ev) => {
    totalProcessed++;
    const activities = buildActivities(ev);
    const whyItMatters = buildWhyItMatters(ev);
    const message = buildMessage(ev);
    const interestingFacts = buildInterestingFacts(ev);
    const tempEv = { ...ev, activities, whyItMatters, message, interestingFacts };
    const bannerDescription = buildBannerDescription(tempEv);

    const wCount = bannerDescription.split(/\s+/).filter(Boolean).length;
    totalWords += wCount;

    return {
      ...tempEv,
      bannerDescription,
      description: ev.description || bannerDescription,
    };
  });

  const updatedCode = `import { VietnamEvent } from "./types";\n\nexport const ${exportVarName}: VietnamEvent[] = ${JSON.stringify(
    enrichedEvents,
    null,
    2
  )};\n`;

  fs.writeFileSync(filePath, updatedCode, "utf-8");
  console.log(`Enriched ${enrichedEvents.length} events in ${fileName}`);
}

const avgWords = Math.round(totalWords / totalProcessed);
console.log(`\nDONE! Successfully enriched ${totalProcessed} events across all 13 event datasets.`);
console.log(`Average bannerDescription word count: ~${avgWords} words.`);
