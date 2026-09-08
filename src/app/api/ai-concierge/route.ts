import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movieApi";

interface SuggestionCard {
  slug: string;
  title: string;
  poster: string;
  year?: string | number;
  quality?: string;
  rating?: string | number;
  category?: string;
  reason?: string;
}

interface UserIntent {
  category?: string;
  country?: string;
  type?: string;
  moodLabel: string;
  defaultAnalysis: string;
  reasons: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSafePoster(item: any): string {
  if (typeof item?.poster_url === "string" && item.poster_url.startsWith("http")) {
    return item.poster_url;
  }
  if (typeof item?.thumb_url === "string" && item.thumb_url.startsWith("http")) {
    return item.thumb_url;
  }
  return "/default-hero.jpg";
}

// BỘ NHẬN DIỆN Ý ĐỊNH & NGỮ NGHĨA TỰ NHIÊN ĐA CHIỀU (QUỐC GIA + THỂ LOẠI + CHỦ ĐỀ)
function parseUserIntent(prompt: string): UserIntent {
  const p = prompt.toLowerCase();

  // 1. Nhận diện Quốc gia (Country)
  let country = "";
  let countryName = "";
  if (
    p.includes("trung quốc") ||
    p.includes("trung quoc") ||
    p.includes("trung hoa") ||
    p.includes("phim trung") ||
    p.includes("hoa ngữ") ||
    p.includes("cbiz") ||
    p.includes("đại lục")
  ) {
    country = "trung-quoc";
    countryName = "Trung Hoa 🇨🇳";
  } else if (
    p.includes("hàn quốc") ||
    p.includes("han quoc") ||
    p.includes("phim hàn") ||
    p.includes("hàn xẻng") ||
    p.includes("xứ kim chi") ||
    p.includes("kbiz") ||
    p.includes("k-drama") ||
    p.includes("kdrama")
  ) {
    country = "han-quoc";
    countryName = "Hàn Quốc 🇰🇷";
  } else if (
    p.includes("âu mỹ") ||
    p.includes("au my") ||
    p.includes("phim mỹ") ||
    p.includes("hollywood") ||
    p.includes("us-uk") ||
    p.includes("usuk") ||
    p.includes("phương tây")
  ) {
    country = "au-my";
    countryName = "Hollywood & Âu Mỹ 🇺🇸";
  } else if (
    p.includes("nhật bản") ||
    p.includes("nhat ban") ||
    p.includes("phim nhật") ||
    p.includes("j-drama")
  ) {
    country = "nhat-ban";
    countryName = "Nhật Bản 🇯🇵";
  } else if (
    p.includes("thái lan") ||
    p.includes("thai lan") ||
    p.includes("phim thái")
  ) {
    country = "thai-lan";
    countryName = "Thái Lan 🇹🇭";
  } else if (
    p.includes("việt nam") ||
    p.includes("viet nam") ||
    p.includes("phim việt") ||
    p.includes("vbiz")
  ) {
    country = "viet-nam";
    countryName = "Việt Nam 🇻🇳";
  } else if (
    p.includes("hồng kông") ||
    p.includes("hong kong") ||
    p.includes("tvb")
  ) {
    country = "hong-kong";
    countryName = "Hồng Kông 🇭🇰";
  } else if (p.includes("ấn độ") || p.includes("an do") || p.includes("bollywood")) {
    country = "an-do";
    countryName = "Ấn Độ 🇮🇳";
  }

  // 2. Nhận diện Hình thức (Type)
  let type = "";
  if (p.includes("chiếu rạp") || p.includes("bom tấn") || p.includes("rạp")) {
    type = "phim-chieu-rap";
  } else if (p.includes("phim bộ") || p.includes("nhiều tập") || p.includes("series")) {
    type = "phim-bo";
  } else if (p.includes("phim lẻ") || p.includes("một tập") || p.includes("điện ảnh")) {
    type = "phim-le";
  }

  // 3. Nhận diện Chủ đề đặc thù (Visual / Diễn viên)
  const isFemaleBeauty =
    p.includes("nữ đẹp") ||
    p.includes("diễn viên nữ") ||
    p.includes("nữ chính") ||
    p.includes("gái xinh") ||
    p.includes("mỹ nhân") ||
    p.includes("xinh gái") ||
    p.includes("xinh đẹp") ||
    p.includes("nữ thần") ||
    p.includes("hot girl") ||
    p.includes("tuyệt sắc");

  const isMaleBeauty =
    p.includes("nam đẹp") ||
    p.includes("diễn viên nam") ||
    p.includes("nam chính") ||
    p.includes("trai đẹp") ||
    p.includes("soái ca") ||
    p.includes("nam thần") ||
    p.includes("đẹp trai");

  const isFamily =
    p.includes("gia đình") ||
    p.includes("mẹ") ||
    p.includes("cha") ||
    p.includes("bố") ||
    p.includes("con cái") ||
    p.includes("tình thân") ||
    p.includes("chữa lành");

  // 4. Nhận diện Thể loại chính (Category)
  let category = "";
  let moodLabel = "";
  let defaultAnalysis = "";
  let reasons: string[] = [];

  // 4.1 VÕ THUẬT (Võ thuật, kungfu, chưởng, đánh võ, quyền cước, diệp vấn...)
  if (
    p.includes("võ thuật") ||
    p.includes("vo thuat") ||
    p.includes("kungfu") ||
    p.includes("kung fu") ||
    p.includes("võ") ||
    p.includes("đánh võ") ||
    p.includes("chưởng") ||
    p.includes("võ lâm") ||
    p.includes("tinh võ") ||
    p.includes("thiếu lâm") ||
    p.includes("quyền cước") ||
    p.includes("diệp vấn") ||
    p.includes("lý tiểu long") ||
    p.includes("thành long") ||
    p.includes("chân tử đan") ||
    p.includes("ngô kinh")
  ) {
    category = "vo-thuat";
    if (country === "trung-quoc") {
      moodLabel = "Võ Thuật & Tinh Hoa Công Phu Trung Hoa 🥋🇨🇳";
      defaultAnalysis =
        "Tuyển tập những siêu phẩm võ thuật Trung Quốc đỉnh cao với những màn thế võ chân thực, công phu điêu luyện và mãn nhãn:";
      reasons = [
        "Những thế võ công phu chân thực, động tác dứt khoát mãn nhãn",
        "Kịch bản kịch tính tôn vinh tinh thần thượng võ truyền thống",
        "Dàn cao thủ võ thuật thực lực phô diễn những màn tỷ thí để đời",
        "Âm thanh va chạm sống động, nhịp độ dồn dập nghẹt thở",
      ];
    } else {
      moodLabel = countryName
        ? `Võ Thuật & Quyền Cước ${countryName} 🥋`
        : "Võ Thuật & Tinh Hoa Đối Kháng 🥋";
      defaultAnalysis =
        "Thưởng thức những trận thư hùng đỉnh cao với những đòn thế võ thuật uy lực và tinh thần thượng võ rực lửa:";
      reasons = [
        "Những pha ra đòn uy lực, kỹ thuật thượng thừa",
        "Nhịp phim dồn dập, những pha giao tranh nghẹt thở",
        "Mãn nhãn từng khung hình với các thế võ đỉnh cao",
      ];
    }
  }
  // 4.2 CỔ TRANG & KIẾM HIỆP
  else if (
    p.includes("cổ trang") ||
    p.includes("kiếm hiệp") ||
    p.includes("tiên hiệp") ||
    p.includes("cung đấu") ||
    p.includes("hoàng cung") ||
    p.includes("triều đình") ||
    p.includes("dã sử")
  ) {
    category = "co-trang";
    moodLabel = country === "trung-quoc"
      ? "Cổ Trang & Kiếm Hiệp Kỳ Ảo Trung Hoa 🏯🇨🇳"
      : "Cổ Trang & Dã Sử Kỳ Ảo 🏯";
    defaultAnalysis =
      "Bước vào thế giới cung đình diễm lệ, giang hồ nghĩa hiệp hoặc tiên hiệp huyền ảo đầy mê hoặc:";
    reasons = [
      "Bối cảnh tráng lệ, tạo hình nhân vật cổ phong tuyệt mỹ",
      "Ân oán tình thù giang hồ khắc cốt ghi tâm",
      "Kỹ xảo tiên hiệp huyền ảo mãn nhãn từng phân cảnh",
    ];
  }
  // 4.3 DIỄN VIÊN NỮ ĐẸP / MỸ NHÂN
  else if (isFemaleBeauty) {
    category = "tinh-cam";
    moodLabel = countryName
      ? `Nữ Thần & Mỹ Nhân Màn Ảnh ${countryName} ✨`
      : "Nữ Thần & Mỹ Nhân Màn Ảnh Tuyệt Sắc ✨";
    defaultAnalysis =
      "Dành riêng cho bạn những tác phẩm quy tụ dàn nữ chính sở hữu visual cực phẩm, thần thái cuốn hút và diễn xuất đỉnh chóp:";
    reasons = [
      "Nữ chính sở hữu nhan sắc cực phẩm, thần thái hút hồn từng khung hình",
      "Tạo hình thời thượng, khí chất ngút ngàn và nụ cười tỏa nắng",
      "Nhan sắc mãn nhãn đi cùng cốt truyện lôi cuốn không thể rời mắt",
      "Tương tác ngọt ngào đốn tim người hâm mộ",
    ];
  }
  // 4.4 DIỄN VIÊN NAM ĐẸP / SOÁI CA
  else if (isMaleBeauty) {
    category = "tinh-cam";
    moodLabel = countryName
      ? `Nam Thần & Soái Ca Màn Ảnh ${countryName} ⭐`
      : "Nam Thần & Soái Ca Màn Ảnh ⭐";
    defaultAnalysis =
      "Tuyển tập những bộ phim có dàn nam chính visual đỉnh cao, phong thái lịch lãm đốn tim hàng triệu khán giả:";
    reasons = [
      "Nam thần visual cực phẩm, góc nghiêng thần thánh",
      "Hình tượng soái ca thâm tình, quyến rũ khó cưỡng",
      "Tương tác bùng nổ phản ứng hóa học cực kỳ cuốn hút",
    ];
  }
  // 4.5 HOẠT HÌNH / ANIME
  else if (
    p.includes("hoạt hình") ||
    p.includes("anime") ||
    p.includes("manga") ||
    p.includes("thiếu nhi") ||
    p.includes("tuổi thơ") ||
    p.includes("ghibli")
  ) {
    category = "hoat-hinh";
    moodLabel = country === "nhat-ban"
      ? "Anime & Hoạt Hình Nhật Bản Diệu Kỳ 🎨🇯🇵"
      : "Thế Giới Hoạt Hình & Anime Diệu Kỳ 🎨";
    defaultAnalysis =
      "Tìm lại sự trong trẻo, mộng mơ hoặc bước vào những thế giới hoạt hình diệu kỳ, giàu cảm xúc:";
    reasons = [
      "Nét vẽ tuyệt đẹp cùng những thông điệp nhân văn lay động lòng người",
      "Âm nhạc du dương, giàu chất thơ và chữa lành tâm hồn",
      "Chuyến phiêu lưu đầy màu sắc vượt qua giới hạn tưởng tượng",
    ];
  }
  // 4.6 KINH DỊ & MA QUỶ
  else if (
    p.includes("kinh dị") ||
    p.includes("ma") ||
    p.includes("quỷ") ||
    p.includes("rùng rợn") ||
    p.includes("lạnh gáy") ||
    p.includes("tâm linh") ||
    p.includes("bùa ngải") ||
    p.includes("zombie") ||
    p.includes("xác sống") ||
    p.includes("ám ảnh")
  ) {
    category = "kinh-di";
    moodLabel = country === "thai-lan"
      ? "Kinh Dị & Tâm Linh Xứ Chùa Vàng 👻🇹🇭"
      : "Hồi Hộp & Lạnh Gáy Rùng Rợn 👻";
    defaultAnalysis =
      "Nếu bạn muốn thử thách lòng dũng cảm trong bóng tối, hãy chuẩn bị tinh thần cho những thước phim rùng rợn này:";
    reasons = [
      "Bầu không khí u ám, giật gân nghẹt thở",
      "Cốt truyện tâm linh bí ẩn khơi dậy nỗi sợ sâu thẳm",
      "Cú jumpscare chất lượng cao làm tim bạn đập loạn nhịp",
    ];
  }
  // 4.7 HÀI HƯỚC & XẢ STRESS
  else if (
    p.includes("hài") ||
    p.includes("cười") ||
    p.includes("stress") ||
    p.includes("vui") ||
    p.includes("lầy") ||
    p.includes("giải trí")
  ) {
    category = "hai-huoc";
    moodLabel = "Hài Hước & Giải Tỏa Stress 🤣";
    defaultAnalysis =
      "Cười thả ga để xua tan mọi áp lực! Dưới đây là những bộ phim hài hước duyên dáng giúp bạn nạp đầy năng lượng tích cực:";
    reasons = [
      "Những tình huống dở khóc dở cười cực kỳ duyên dáng",
      "Nhẹ nhàng, thư giãn tuyệt đối cho ngày dài mệt mỏi",
      "Dàn diễn viên dí dỏm với những màn đối đáp đỉnh chóp",
    ];
  }
  // 4.8 GIA ĐÌNH & CHỮA LÀNH
  else if (isFamily) {
    category = "tinh-cam";
    moodLabel = "Gia Đình & Tình Thân Chữa Lành 👨‍👩‍👧";
    defaultAnalysis =
      "Tình cảm gia đình và những khoảnh khắc đời thường ấm áp sẽ mang lại sự bình yên và nhiều xúc cảm cho bạn:";
    reasons = [
      "Tình thân gia đình sâu sắc chạm đến trái tim người xem",
      "Những bài học cuộc sống giản dị mà thấm thía",
      "Cốt truyện ấm áp, kết thúc trọn vẹn chữa lành tâm hồn",
    ];
  }
  // 4.9 PHIM BUỒN, LẤY NƯỚC MẮT & BI KỊCH
  else if (
    p.includes("buồn") ||
    p.includes("khóc") ||
    p.includes("nước mắt") ||
    p.includes("bi kịch") ||
    p.includes("đau lòng") ||
    p.includes("chia ly") ||
    p.includes("thương tâm") ||
    p.includes("mất mát") ||
    p.includes("tang thương")
  ) {
    category = "tam-ly";
    moodLabel = "Đẫm Nước Mắt & Bi Kịch Cảm Động 💧😭";
    defaultAnalysis =
      "Những thước phim giàu xúc cảm, lấy đi bao nước mắt và chạm đến những góc khuất sâu lắng nhất trong tâm hồn bạn:";
    reasons = [
      "Cốt truyện bi kịch xúc động lấy đi bao nước mắt của khán giả",
      "Những phân cảnh chia ly nghẹn ngào, đau đáu khôn nguôi",
      "Diễn xuất xuất thần chạm đến sâu thẳm trái tim người xem",
    ];
  }
  // 4.10 TÌNH CẢM & LÃNG MẠN / NGÔN TÌNH
  else if (
    p.includes("tình cảm") ||
    p.includes("yêu") ||
    p.includes("lãng mạn") ||
    p.includes("ngôn tình") ||
    p.includes("ngọt ngào") ||
    p.includes("thanh xuân") ||
    p.includes("học đường")
  ) {
    category = "tinh-cam";
    moodLabel = country === "han-quoc"
      ? "Lãng Mạn & Ngôn Tình Xứ Hàn 💖🇰🇷"
      : (country === "trung-quoc"
          ? "Ngôn Tình & Lãng Mạn Trung Hoa 💖🇨🇳"
          : "Lãng Mạn & Ngọt Ngào 💖");
    defaultAnalysis =
      "Một chút ngọt ngào và rung động sẽ xoa dịu tâm hồn bạn. Đây là những tác phẩm tình cảm đắt giá nhất dành cho bạn:";
    reasons = [
      "Câu chuyện tình yêu đầy cảm xúc chạm đến trái tim",
      "Phản ứng hóa học bùng nổ giữa các nhân vật chính",
      "Hình ảnh thơ mộng, âm nhạc lắng đọng đi vào lòng người",
    ];
  }
  // 4.10 HÀNH ĐỘNG & KỊCH TÍNH
  else if (
    p.includes("hành động") ||
    p.includes("đánh đấm") ||
    p.includes("bắn súng") ||
    p.includes("sát thủ") ||
    p.includes("rượt đuổi") ||
    p.includes("điệp viên") ||
    p.includes("xã hội đen")
  ) {
    category = "hanh-dong";
    moodLabel = country === "au-my"
      ? "Bom Tấn Hành Động Hollywood 💥🇺🇸"
      : "Máu Lửa & Hành Động Kịch Tính 💥";
    defaultAnalysis =
      "Tăng lượng adrenaline với những pha hành động mãn nhãn, kỹ xảo đỉnh cao và rượt đuổi nghẹt thở:";
    reasons = [
      "Các pha giao tranh đỉnh cao, mãn nhãn từng khung hình",
      "Nhịp phim dồn dập không cho bạn rời mắt",
      "Kịch bản gay cấn với những cú lật bàn bất ngờ",
    ];
  }
  // 4.11 VIỄN TƯỞNG & VŨ TRỤ
  else if (
    p.includes("viễn tưởng") ||
    p.includes("vũ trụ") ||
    p.includes("du hành") ||
    p.includes("tương lai") ||
    p.includes("robot") ||
    p.includes("siêu anh hùng")
  ) {
    category = "vien-tuong";
    moodLabel = "Vũ Trụ & Khám Phá Viễn Tưởng 🛸";
    defaultAnalysis =
      "Mở rộng trí tưởng tượng vượt qua không - thời gian với những kỳ quan vũ trụ và tương lai công nghệ:";
    reasons = [
      "Thế giới viễn tưởng kỳ vĩ với kỹ xảo choáng ngợp",
      "Những giả thuyết khoa học và triết học sâu sắc",
      "Trải nghiệm thị giác vượt qua giới hạn thực tế",
    ];
  }
  // 4.12 TRINH THÁM & ĐẤU TRÍ
  else if (
    p.includes("hack não") ||
    p.includes("trinh thám") ||
    p.includes("đấu trí") ||
    p.includes("bí ẩn") ||
    p.includes("tâm lý") ||
    p.includes("hình sự") ||
    p.includes("phá án") ||
    p.includes("twist")
  ) {
    category = "tam-ly";
    moodLabel = "Căng Não & Trinh Thám Đấu Trí 🧠";
    defaultAnalysis =
      "Dành cho những bộ não thích suy luận và bóc tách từng lớp bí mật. Những cú 'plot-twist' này sẽ làm bạn ngỡ ngàng:";
    reasons = [
      "Kịch bản trinh thám tầng tầng lớp lớp cực kỳ tinh vi",
      "Cú lật mặt kinh điển không thể đoán trước",
      "Chiều sâu tâm lý nhân vật được khắc họa xuất sắc",
    ];
  }
  // 4.13 PHIM CHIẾU RẠP / BOM TẤN
  else if (type === "phim-chieu-rap") {
    moodLabel = "Bom Tấn Chiếu Rạp 🎬";
    defaultAnalysis =
      "Thưởng thức chuẩn trải nghiệm điện ảnh rạp chiếu với các bom tấn có kinh phí khủng và dàn sao hạng A:";
    reasons = [
      "Quy mô sản xuất khủng, âm thanh hình ảnh đạt chuẩn rạp",
      "Từng làm mưa làm gió tại các phòng vé toàn cầu",
      "Trải nghiệm giải trí trọn vẹn từng phút giây",
    ];
  }
  // 4.14 MẶC ĐỊNH: NẾU CHỈ CÓ QUỐC GIA MÀ KHÔNG CÓ THỂ LOẠI
  else if (country) {
    moodLabel = `Siêu Phẩm Điện Ảnh ${countryName} ⭐`;
    defaultAnalysis = `Dưới đây là những tác phẩm điện ảnh xuất sắc nhất của nền điện ảnh ${countryName} được khán giả yêu thích:`;
    reasons = [
      "Đậm đà bản sắc văn hóa và phong cách điện ảnh đặc trưng",
      "Diễn xuất thực lực cùng cốt truyện lay động lòng người",
      "Tác phẩm ăn khách hàng đầu với lượng đánh giá cao",
    ];
  }
  // 4.15 MẶC ĐỊNH TOÀN DIỆN
  else {
    moodLabel = "Tác Phẩm Đặc Sắc Thịnh Hành ⭐";
    defaultAnalysis =
      "Dưới đây là những siêu phẩm điện ảnh được đông đảo khán giả yêu thích và đánh giá cao nhất hiện nay:";
    reasons = [
      "Tác phẩm có điểm đánh giá xuất sắc và lượt xem kỷ lục",
      "Cốt truyện lôi cuốn, giữ chân người xem từ đầu đến cuối",
      "Dàn diễn viên chất lượng cùng kịch bản xuất sắc",
    ];
  }

  return {
    category,
    country,
    type,
    moodLabel,
    defaultAnalysis,
    reasons,
  };
}

export async function GET() {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  return NextResponse.json({
    hasServerKey: hasKey,
    activeModel: "Google Gemini 3.5 Flash",
    status: hasKey ? "ready" : "fallback_only",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt: string = body.prompt?.trim() || "";
    const userApiKey: string = body.apiKey?.trim() || "";

    if (!prompt) {
      return NextResponse.json(
        { error: "Vui lòng nhập tâm trạng hoặc sở thích phim của bạn." },
        { status: 400 }
      );
    }

    const candidateKeys = Array.from(
      new Set(
        [userApiKey?.trim(), process.env.GEMINI_API_KEY?.trim()].filter(
          (k): k is string => Boolean(k && k.length > 5)
        )
      )
    );

    // 1. NẾU CÓ GEMINI API KEY -> GỌI GEMINI ĐỂ PHÂN TÍCH CHUYÊN SÂU
    if (candidateKeys.length > 0) {
      try {
        const systemPrompt = `Bạn là Nanaflix AI Concierge - chuyên gia tư vấn phim điện ảnh hàng đầu.
Người dùng yêu cầu: "${prompt}".
Nhiệm vụ của bạn là thấu hiểu cảm xúc, chủ đề và gợi ý 4 bộ phim nổi tiếng, kinh điển hoặc đúng nhất với yêu cầu (ưu tiên phim có trên các nền tảng phim phổ biến như Netflix, phim Châu Á, phim Rạp).
Đặc biệt: Hãy cung cấp cả tên tiếng Việt phổ biến và tên gốc/tiếng Anh (original_title) của mỗi phim để hệ thống dễ dàng tra cứu chính xác trong kho phim.
Trả về DUY NHẤT một chuỗi JSON hợp lệ (không bao bọc bởi markdown code block):
{
  "analysis": "1 đến 2 câu ngắn gọn, giải thích vì sao chọn nhóm phim này cho người xem",
  "mood": "Tên tâm trạng đại diện (ví dụ: 'Đau Thắt Lòng & Bi Thương 💧😭', 'Võ Thuật Trung Hoa 🥋🇨🇳', 'Nữ Thần Màn Ảnh ✨')",
  "genre_slug": "slug thể loại phù hợp nhất trong các slug: vo-thuat, tinh-cam, hanh-dong, hai-huoc, kinh-di, tam-ly, vien-tuong, hoat-hinh, co-trang",
  "country_slug": "slug quốc gia nếu có: trung-quoc, han-quoc, au-my, nhat-ban, thai-lan, viet-nam, hong-kong, an-do (hoặc để trống)",
  "movies": [
    {
      "title": "Tên phim tiếng Việt phổ biến (vd: 'Điều Kì Diệu Ở Phòng Giam Số 7', 'Cô Gái Năm Ấy Chúng Ta Cùng Theo Đuổi', 'Mộ Đom Đóm', 'Hachiko Chú Chó Trung Thành')",
      "original_title": "Tên gốc hoặc tiếng Anh (vd: 'Miracle in Cell No. 7', 'Grave of the Fireflies', 'Hachi: A Dog\\'s Tale')",
      "reason": "Lý do gợi ý phim này (1 câu ngắn gọn)"
    }
  ]
}`;

        const candidateModels = [
          "gemini-3.5-flash-lite",
          "gemini-flash-lite-latest",
          "gemini-3.6-flash",
          "gemini-flash-latest",
        ];
        let geminiRes: Response | null = null;

        keyLoop: for (const currentKey of candidateKeys) {
          for (const model of candidateModels) {
            try {
              const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: systemPrompt }] }],
                    generationConfig: {
                      responseMimeType: "application/json",
                      temperature: 0.7,
                    },
                  }),
                  signal: AbortSignal.timeout(10000),
                }
              );
              if (res.ok) {
                geminiRes = res;
                break keyLoop;
              }
            } catch {
              // Thử model / key tiếp theo
            }
          }
        }

        if (geminiRes && geminiRes.ok) {
          const geminiData = await geminiRes.json();
          let rawText =
            geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";
          rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
          const parsed = JSON.parse(rawText);

          // Hỗ trợ cả 2 định dạng: mảng movies [{title, original_title, reason}] hoặc mảng movie_titles
          type SuggestedItem = { title: string; original_title?: string; reason?: string };
          let suggestedItems: SuggestedItem[] = [];

          if (Array.isArray(parsed.movies) && parsed.movies.length > 0) {
            suggestedItems = parsed.movies.map((m: Record<string, string>) => ({
              title: m.title || "",
              original_title: m.original_title || "",
              reason: m.reason || "",
            }));
          } else if (Array.isArray(parsed.movie_titles) && parsed.movie_titles.length > 0) {
            suggestedItems = parsed.movie_titles.map((t: string, idx: number) => ({
              title: t,
              reason: parsed.reasons?.[idx] || "",
            }));
          }

          const genreSlug: string = parsed.genre_slug || "";
          const countrySlug: string = parsed.country_slug || "";
          const cards: SuggestionCard[] = [];
          const seenSlugs = new Set<string>();

          // Tìm kiếm các phim song song bằng Promise.all
          const searchTasks = suggestedItems.slice(0, 4).map(async (itemObj) => {
            const cleanTitle = (itemObj.title || "")
              .replace(/\([^)]*\)/g, "")
              .replace(/\[[^\]]*\]/g, "")
              .trim();
            const cleanOriginal = (itemObj.original_title || "")
              .replace(/\([^)]*\)/g, "")
              .replace(/\[[^\]]*\]/g, "")
              .trim();

            let foundItem = null;

            // 1. Thử tìm bằng tên tiếng Việt
            if (cleanTitle) {
              const res1 = await movieApi.getMovies({
                keyword: cleanTitle,
                page: 1,
                limit: 3,
              });
              if (res1?.items && res1.items.length > 0) {
                foundItem = res1.items[0];
              }
            }

            // 2. Nếu không ra và có tên gốc / tiếng Anh -> Thử tìm bằng original_title
            if (!foundItem && cleanOriginal) {
              const res2 = await movieApi.getMovies({
                keyword: cleanOriginal,
                page: 1,
                limit: 3,
              });
              if (res2?.items && res2.items.length > 0) {
                foundItem = res2.items[0];
              }
            }

            // 3. Xử lý chính tả i/y (ví dụ: Kì Diệu <-> Kỳ Diệu)
            if (!foundItem && cleanTitle.includes("Kỳ Diệu")) {
              const alt = cleanTitle.replace("Kỳ Diệu", "Kì Diệu");
              const res3 = await movieApi.getMovies({ keyword: alt, page: 1, limit: 3 });
              if (res3?.items && res3.items.length > 0) foundItem = res3.items[0];
            } else if (!foundItem && cleanTitle.includes("Kì Diệu")) {
              const alt = cleanTitle.replace("Kì Diệu", "Kỳ Diệu");
              const res3 = await movieApi.getMovies({ keyword: alt, page: 1, limit: 3 });
              if (res3?.items && res3.items.length > 0) foundItem = res3.items[0];
            }

            // 4. Nếu vẫn không thấy và tên dài, thử lấy 3 từ khóa đầu
            if (!foundItem && cleanTitle) {
              const words = cleanTitle.split(/\s+/);
              if (words.length >= 4) {
                const shortTitle = words.slice(0, 3).join(" ");
                const res4 = await movieApi.getMovies({
                  keyword: shortTitle,
                  page: 1,
                  limit: 3,
                });
                if (res4?.items && res4.items.length > 0) {
                  foundItem = res4.items[0];
                }
              }
            }

            return {
              item: foundItem,
              fallbackTitle: cleanTitle || cleanOriginal,
              reason: itemObj.reason,
            };
          });

          const searchResults = await Promise.all(searchTasks);
          for (const r of searchResults) {
            if (r.item && !seenSlugs.has(r.item.slug)) {
              seenSlugs.add(r.item.slug);
              cards.push({
                slug: r.item.slug,
                title: r.item.name || r.item.title || r.fallbackTitle,
                poster: toSafePoster(r.item),
                year: r.item.year,
                quality: r.item.quality || "FHD",
                category: r.item.category?.[0]?.name || "Đặc sắc",
                reason: r.reason || "Rất phù hợp với tâm trạng của bạn lúc này",
              });
            }
          }

          // Nếu một số phim không có trong kho, tự động bù thêm phim cùng thể loại/quốc gia
          if (cards.length < 3 && (genreSlug || countrySlug)) {
            const backupRes = await movieApi.getMovies({
              category: genreSlug,
              country: countrySlug,
              sort: "rating",
              page: 1,
              limit: 6,
            });
            for (const item of backupRes?.items || []) {
              if (!seenSlugs.has(item.slug)) {
                seenSlugs.add(item.slug);
                cards.push({
                  slug: item.slug,
                  title: item.name || item.title || "Phim Hay",
                  poster: toSafePoster(item),
                  year: item.year || 2024,
                  quality: item.quality || "FHD",
                  category: item.category?.[0]?.name || "Đặc sắc",
                  reason: "Tác phẩm tiêu biểu cùng thể loại được đánh giá rất cao",
                });
              }
              if (cards.length >= 4) break;
            }
          }

          if (cards.length > 0) {
            return NextResponse.json({
              reply:
                parsed.analysis ||
                "Dưới đây là các tác phẩm được AI tuyển chọn kỹ lưỡng dành riêng cho bạn:",
              mood: parsed.mood || "Gợi Ý Cho Bạn",
              movies: cards,
              provider: "Google Gemini Flash",
            });
          }
        }
      } catch (geminiError) {
        console.warn("Gemini API error, falling back to Semantic Engine:", geminiError);
      }
    }

interface RawMovieItem {
  slug?: string;
  name?: string;
  title?: string;
  poster_url?: string;
  thumb_url?: string;
  year?: number | string;
  quality?: string;
  category?: Array<{ name?: string }>;
}

    // 2. NẾU KHÔNG CÓ GEMINI HOẶC GEMINI QUÁ TẢI (503) -> DÙNG NANAFLIX NEURAL ENGINE
    const intent = parseUserIntent(prompt);
    let movieList: RawMovieItem[] = [];

    // Kiểm tra xem prompt có phải tên phim cụ thể (Avatar, Doraemon, Conan, Naruto) hay câu miêu tả
    const lowerPrompt = prompt.toLowerCase();
    const isDescriptive =
      lowerPrompt.includes("phim") ||
      lowerPrompt.includes("muốn") ||
      lowerPrompt.includes("thích") ||
      lowerPrompt.includes("gợi ý") ||
      lowerPrompt.includes("có ") ||
      lowerPrompt.includes("đẹp") ||
      lowerPrompt.includes("hay") ||
      lowerPrompt.includes("nào") ||
      lowerPrompt.includes("buồn") ||
      lowerPrompt.includes("vui") ||
      lowerPrompt.includes("võ") ||
      lowerPrompt.includes("trung quốc") ||
      lowerPrompt.includes("hàn quốc") ||
      lowerPrompt.includes("xem");

    if (!isDescriptive && prompt.trim().length > 1) {
      // Tìm trực tiếp theo tên phim người dùng nhập
      const directSearch = await movieApi.getMovies({
        keyword: prompt.trim(),
        page: 1,
        limit: 6,
      });
      if (directSearch?.items && directSearch.items.length > 0) {
        movieList = directSearch.items as RawMovieItem[];
      }
    }

    // Lọc theo kết hợp Category + Country + Type
    if (movieList.length === 0) {
      const queryParams: Record<string, string | number> = {
        sort: "rating",
        page: 1,
        limit: 10,
      };
      if (intent.category) queryParams.category = intent.category;
      if (intent.country) queryParams.country = intent.country;
      if (intent.type) queryParams.type = intent.type;

      const res = await movieApi.getMovies(queryParams);
      movieList = (res?.items || []) as RawMovieItem[];
    }

    // Nếu kết hợp cả category + country trả về ít hơn 3 phim, nới lỏng tìm theo category
    if (movieList.length < 3 && intent.category) {
      const resCat = await movieApi.getMovies({
        category: intent.category,
        sort: "rating",
        page: 1,
        limit: 8,
      });
      for (const item of (resCat?.items || []) as RawMovieItem[]) {
        if (!movieList.some((m) => m.slug === item.slug)) {
          movieList.push(item);
        }
        if (movieList.length >= 6) break;
      }
    }

    // Nếu vẫn trống, nới lỏng tìm theo country
    if (movieList.length < 3 && intent.country) {
      const resCountry = await movieApi.getMovies({
        country: intent.country,
        sort: "rating",
        page: 1,
        limit: 8,
      });
      for (const item of (resCountry?.items || []) as RawMovieItem[]) {
        if (!movieList.some((m) => m.slug === item.slug)) {
          movieList.push(item);
        }
        if (movieList.length >= 6) break;
      }
    }

    // Bảo đảm luôn có phim gợi ý thịnh hành
    if (movieList.length === 0) {
      const fallbackRes = await movieApi.getMovies({
        sort: "rating",
        page: 1,
        limit: 8,
      });
      movieList = (fallbackRes?.items || []) as RawMovieItem[];
    }

    // Trộn ngẫu nhiên để mỗi lần gợi ý đều tươi mới
    const shuffled = movieList.sort(() => 0.5 - Math.random()).slice(0, 4);

    const cards: SuggestionCard[] = shuffled.map((item: RawMovieItem, idx: number) => ({
      slug: item.slug || "",
      title: item.name || item.title || "Phim Hay",
      poster: toSafePoster(item),
      year: item.year || 2024,
      quality: item.quality || "FHD",
      category: item.category?.[0]?.name || "Đặc sắc",
      reason:
        intent.reasons[idx % intent.reasons.length] ||
        "Tác phẩm có cốt truyện hấp dẫn và đánh giá cao",
    }));

    return NextResponse.json({
      reply: `${intent.defaultAnalysis}`,
      mood: intent.moodLabel,
      movies: cards,
      provider: "Nanaflix Neural Engine",
    });
  } catch (error) {
    console.error("Lỗi AI Concierge:", error);
    return NextResponse.json(
      {
        reply:
          "Rất tiếc, đã có sự gián đoạn kết nối. Nhưng bạn có thể thử các thể loại phổ biến trên thanh điều hướng nhé!",
        mood: "Gợi ý",
        movies: [],
      },
      { status: 500 }
    );
  }
}
