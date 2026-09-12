import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { movieApi } from "@/services/movieApi";
import { sanitizeImageUrl } from "@/lib/movieMedia";

export const maxDuration = 15;

// In-memory cache cho các kết hợp roulette
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ROULETTE_CACHE = new Map<string, { data: any; cachedAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 tiếng

// Metadata phân loại chi tiết theo tâm trạng người dùng
const MOOD_META: Record<
  string,
  { label: string; desc: string; categorySlug: string; defaultPunchline: string; defaultBadges: string[] }
> = {
  "xa-stress": {
    label: "Xả Stress",
    desc: "Hài hước, vui tươi, dí dỏm, mang lại tiếng cười sảng khoái và năng lượng tích cực",
    categorySlug: "hai-huoc",
    defaultPunchline: "Liều thuốc chữa lành mọi căng thẳng với những tình huống tấu hài cười ra nước mắt!",
    defaultBadges: ["Hài Hước", "Xả Stress", "Giải Trí"],
  },
  "mau-lua": {
    label: "Máu Lửa",
    desc: "Hành động, đấm đá, rượt đuổi, khói lửa mãn nhãn và nhịp phim dồn dập nghẹt thở",
    categorySlug: "hanh-dong",
    defaultPunchline: "Bữa tiệc hành động đỉnh cao với những pha cận chiến và rượt đuổi mãn nhãn nghẹt thở!",
    defaultBadges: ["Hành Động", "Mãn Nhãn", "Kịch Tính"],
  },
  "hack-nao": {
    label: "Hack Não",
    desc: "Trinh thám, đấu trí, cốt truyện xoắn não, cú twist giật gân bất ngờ không thể đoán trước",
    categorySlug: "tam-ly",
    defaultPunchline: "Mê cung bí ẩn cùng những cú bẻ lái bất ngờ sẽ khiến bạn không thể rời mắt!",
    defaultBadges: ["Hack Não", "Trinh Thám", "Plot Twist"],
  },
  "ngot-ngao": {
    label: "Ngọt Ngào",
    desc: "Tình cảm lãng mạn, rung động trái tim, ngọt ngào và chữa lành tâm hồn",
    categorySlug: "tinh-cam",
    defaultPunchline: "Bản tình ca ngọt ngào mang lại cảm giác xao xuyến và chữa lành mọi vết thương lòng.",
    defaultBadges: ["Lãng Mạn", "Ngọt Ngào", "Cảm Xúc"],
  },
  "tram-lang": {
    label: "Trầm Lắng",
    desc: "Sâu sắc, cảm động, giàu triết lý và tính nhân văn, lắng đọng tâm hồn",
    categorySlug: "chinh-kich",
    defaultPunchline: "Một tác phẩm nhân văn sâu sắc lay động những góc khuất tinh tế nhất trong tâm hồn.",
    defaultBadges: ["Sâu Sắc", "Nhân Văn", "Cảm Động"],
  },
  "kinh-di": {
    label: "Kinh Dị",
    desc: "Rùng rợn, giật gân, thót tim, ma mị và căng thẳng tột độ",
    categorySlug: "kinh-di",
    defaultPunchline: "Nỗi sợ hãi ma mị và không khí rùng rợn sẽ làm bạn lạnh gáy suốt đêm nay.",
    defaultBadges: ["Kinh Dị", "Rùng Rợn", "Thót Tim"],
  },
  "vien-tuong": {
    label: "Viễn Tưởng",
    desc: "Khoa học viễn tưởng, không gian vũ trụ, thế giới tương lai hoặc kỳ ảo siêu nhiên",
    categorySlug: "khoa-hoc-vien-tuong",
    defaultPunchline: "Hành trình vượt không gian và thời gian mở ra chân trời kỳ vĩ ngoài sức tưởng tượng!",
    defaultBadges: ["Viễn Tưởng", "Vũ Trụ", "Kỳ Ảo"],
  },
  "anime": {
    label: "Hoạt Hình / Anime",
    desc: "Anime Nhật Bản hoặc hoạt hình 3D, phiêu lưu kỳ thú, đồ họa đẹp và cảm xúc",
    categorySlug: "hoat-hinh",
    defaultPunchline: "Thế giới hoạt hình diệu kỳ rực rỡ sắc màu cùng những thông điệp lay động lòng người.",
    defaultBadges: ["Hoạt Hình", "Anime", "Phiêu Lưu"],
  },
  "co-trang": {
    label: "Cổ Trang",
    desc: "Cung đấu, kiếm hiệp võ hiệp, dã sử hoặc tiên hiệp huyền ảo Trung Hoa",
    categorySlug: "co-trang",
    defaultPunchline: "Bức tranh giang hồ ân oán và cung đình diễm lệ cuốn hút từng phân cảnh.",
    defaultBadges: ["Cổ Trang", "Kiếm Hiệp", "Huyền Ảo"],
  },
  "toi-pham": {
    label: "Tội Phạm",
    desc: "Băng đảng mafia, thế giới ngầm, hình sự điều tra phá án nghẹt thở",
    categorySlug: "hinh-su",
    defaultPunchline: "Cuộc chiến cân não giữa thiện và ác trong thế giới ngầm không khoan nhượng.",
    defaultBadges: ["Tội Phạm", "Hình Sự", "Nghẹt Thở"],
  },
};

const COMPANION_META: Record<string, string> = {
  "mot-minh": "Xem một mình (Cần phim cuốn hút, trọn vẹn cảm xúc cá nhân)",
  "nguoi-yeu": "Xem cùng người yêu (Cần phim lãng mạn, ngọt ngào, tinh tế hoặc gắn kết hai người)",
  "gia-dinh": "Xem cùng gia đình (Cần phim ấm áp, ý nghĩa, không cảnh nóng, phù hợp mọi lứa tuổi)",
  "ban-be": "Xem cùng bạn bè (Cần phim sôi động, hồi hộp, hài hước hoặc kịch tính để bàn tán)",
};

const DURATION_META: Record<string, { desc: string; typeSlug?: string }> = {
  "phim-le": {
    desc: "Phim Lẻ (Phim điện ảnh 1 tập kết thúc trọn vẹn trong 90 - 120 phút. BẮT BUỘC KHÔNG CHỌN phim bộ nhiều tập)",
    typeSlug: "phim-le",
  },
  "chieu-rap": {
    desc: "Bom Tấn Rạp (Phim lẻ chiếu rạp hoành tráng, mãn nhãn. BẮT BUỘC là phim lẻ chiếu rạp)",
    typeSlug: "phim-chieu-rap",
  },
  "phim-bo": {
    desc: "Phim Bộ / Series (TV Series nhiều tập cuốn hút để cày đêm. BẮT BUỘC KHÔNG CHỌN phim lẻ)",
    typeSlug: "phim-bo",
  },
  "bat-ky": {
    desc: "Bất kỳ định dạng nào (Phim lẻ hoặc phim bộ đều được)",
  },
};

const COUNTRY_META: Record<string, { label: string; slug?: string }> = {
  all: { label: "Toàn cầu (Mọi quốc gia)" },
  "han-quoc": { label: "Hàn Quốc", slug: "han-quoc" },
  "au-my": { label: "Âu Mỹ / Hollywood", slug: "au-my" },
  "trung-quoc": { label: "Trung Quốc / Hồng Kông", slug: "trung-quoc" },
  "nhat-ban": { label: "Nhật Bản", slug: "nhat-ban" },
  "viet-nam": { label: "Việt Nam", slug: "viet-nam" },
  "thai-lan": { label: "Thái Lan", slug: "thai-lan" },
};

// Bộ phim dự phòng offline chất lượng cao, xác thực 100% có trên hệ thống
const CURATED_OFFLINE_PICKS: Record<
  string,
  { title: string; originalTitle: string; punchline: string; badges: string[]; country?: string }[]
> = {
  "xa-stress": [
    {
      title: "Tuyệt Đỉnh Kungfu",
      originalTitle: "Kung Fu Hustle",
      punchline: "Cười ra nước mắt với tuyệt kỹ võ thuật và khiếu hài hước đỉnh cao của Châu Tinh Trì!",
      badges: ["Hài Hước", "Võ Thuật", "Kinh Điển"],
      country: "Trung Quốc",
    },
    {
      title: "Nghề Siêu Khó",
      originalTitle: "Extreme Job",
      punchline: "Đội cảnh sát ngầm bán gà rán siêu đắt hàng, tấu hài cực mạnh và hành động cực đã!",
      badges: ["Hài Hước", "Hàn Quốc", "Đỉnh Cao"],
      country: "Hàn Quốc",
    },
    {
      title: "Kế Hoạch Baby",
      originalTitle: "Rob-B-Hood",
      punchline: "Bộ đôi trộm vặt Thành Long & Cổ Thiên Lạc vướng vào phi vụ trông em bé dở khóc dở cười.",
      badges: ["Gia Đình", "Hành Động", "Ấm Áp"],
      country: "Trung Quốc",
    },
    {
      title: "Chàng Nữ Phi Công",
      originalTitle: "Pilot",
      punchline: "Màn giả gái làm cơ trưởng máy bay cười bể bụng và tràn ngập năng lượng tích cực.",
      badges: ["Hài Hước", "Hàn Quốc", "Mới Lạ"],
      country: "Hàn Quốc",
    },
    {
      title: "Bố Già",
      originalTitle: "Dad, I'm Sorry",
      punchline: "Câu chuyện gia đình xóm lao động vừa cười ngả nghiêng vừa xúc động rơi nước mắt.",
      badges: ["Gia Đình", "Việt Nam", "Cảm Động"],
      country: "Việt Nam",
    },
    {
      title: "Điệp Viên Không Không Thấy",
      originalTitle: "Johnny English",
      punchline: "Chàng điệp viên vụng về nhưng may mắn hết phần thiên hạ mang lại tràng cười thả ga.",
      badges: ["Hài Hước", "Âu Mỹ", "Điệp Viên"],
      country: "Âu Mỹ",
    },
  ],
  "mau-lua": [
    {
      title: "Sát Thủ John Wick",
      originalTitle: "John Wick",
      punchline: "Những pha cận chiến võ thuật súng đỉnh cao và mãn nhãn nghẹt thở từ phút đầu tới phút cuối.",
      badges: ["Hành Động", "Xạ Thủ", "Mãn Nhãn"],
      country: "Âu Mỹ",
    },
    {
      title: "Vây Hãm: Kẻ Trừng Phạt",
      originalTitle: "The Roundup",
      punchline: "Cú đấm thép uy lực của Ma Dong-seok mang lại trải nghiệm hành động cực kỳ sướng mắt!",
      badges: ["Hành Động", "Đấm Đá", "Ma Dong Seok"],
      country: "Hàn Quốc",
    },
    {
      title: "Max Điên Cuồng: Con Đường Tử Thần",
      originalTitle: "Mad Max: Fury Road",
      punchline: "Bữa tiệc tốc độ, khói lửa và hoang dã gầm rú làm bùng nổ mọi giác quan của bạn!",
      badges: ["Tốc Độ", "Hậu Tận Thế", "Cháy Bỏng"],
      country: "Âu Mỹ",
    },
    {
      title: "Diệp Vấn",
      originalTitle: "Ip Man",
      punchline: "Vịnh Xuân Quyền dũng mãnh, tinh thần thượng võ kiên cường đốn tim người hâm mộ.",
      badges: ["Võ Thuật", "Hành Động", "Chân Tử Đan"],
      country: "Trung Quốc",
    },
    {
      title: "Hai Phượng",
      originalTitle: "Furie",
      punchline: "Ngô Thanh Vân đại náo giới giang hồ để giải cứu con gái với những pha hành động nghẹt thở.",
      badges: ["Hành Động", "Việt Nam", "Võ Thuật"],
      country: "Việt Nam",
    },
  ],
  "hack-nao": [
    {
      title: "Kẻ Đánh Cắp Giấc Mơ",
      originalTitle: "Inception",
      punchline: "Lạc vào mê cung đa tầng giấc mơ đỉnh cao khiến bạn phải tua lại từng khung hình!",
      badges: ["Hack Não", "Kịch Tính", "Siêu Phẩm"],
      country: "Âu Mỹ",
    },
    {
      title: "Đảo Kinh Hoàng",
      originalTitle: "Shutter Island",
      punchline: "Cú 'quay xe' chấn động điện ảnh khiến bạn nghi ngờ toàn bộ những gì mình vừa nhìn thấy.",
      badges: ["Tâm Lý", "Trinh Thám", "Bất Ngờ"],
      country: "Âu Mỹ",
    },
    {
      title: "Ký Sinh Trùng",
      originalTitle: "Parasite",
      punchline: "Kiệt tác đoạt 4 giải Oscar vạch trần hố sâu giai cấp với những nút thắt nghẹt thở.",
      badges: ["Tâm Lý", "Kịch Tính", "Oscar"],
      country: "Hàn Quốc",
    },
    {
      title: "Hố Đen Tử Thần",
      originalTitle: "Interstellar",
      punchline: "Hành trình xuyên không gian cảm động kết hợp khoa học viễn tưởng vĩ đại.",
      badges: ["Vũ Trụ", "Tình Phụ Tử", "Kiệt Tác"],
      country: "Âu Mỹ",
    },
    {
      title: "Cô Gái Mất Tích",
      originalTitle: "Gone Girl",
      punchline: "Màn đấu trí hôn nhân lạnh sống lưng cùng những cú plot-twist không thể lường trước.",
      badges: ["Trinh Thám", "Hồi Hộp", "Tâm Lý"],
      country: "Âu Mỹ",
    },
  ],
  "ngot-ngao": [
    {
      title: "Hạ Cánh Nơi Anh",
      originalTitle: "Crash Landing on You",
      punchline: "Chuyện tình vượt biên giới đẹp như mơ đốn tim hàng triệu khán giả khắp thế giới.",
      badges: ["Lãng Mạn", "Hàn Quốc", "Cực Ngọt"],
      country: "Hàn Quốc",
    },
    {
      title: "Yêu Lại Từ Đầu",
      originalTitle: "About Time",
      punchline: "Một chuyện tình du hành thời gian nhẹ nhàng, ấm áp và đong đầy triết lý nhân sinh.",
      badges: ["Xúc Động", "Gia Đình", "Chữa Lành"],
      country: "Âu Mỹ",
    },
    {
      title: "Vụng Trộm Không Thể Giấu",
      originalTitle: "Hidden Love",
      punchline: "Mối tình thanh xuân ngọt ngào ngập tràn mật đường giữa Tang Trĩ và Đoàn Gia Hứa.",
      badges: ["Thanh Xuân", "Ngọt Ngào", "Trung Quốc"],
      country: "Trung Quốc",
    },
    {
      title: "La La Land: Những Kẻ Khờ Mộng Mơ",
      originalTitle: "La La Land",
      punchline: "Khúc ca tình yêu và ước mơ giữa lòng Los Angeles đẹp lung linh và day dứt khôn nguôi.",
      badges: ["Âm Nhạc", "Lãng Mạn", "Kinh Điển"],
      country: "Âu Mỹ",
    },
    {
      title: "Mắt Biếc",
      originalTitle: "Dreamy Eyes",
      punchline: "Bản tình ca đượm buồn của làng Đo Đo cùng ánh mắt biếc ám ảnh cả một đời người.",
      badges: ["Việt Nam", "Hoài Niệm", "Chữa Lành"],
      country: "Việt Nam",
    },
  ],
  "tram-lang": [
    {
      title: "Nhà Tù Shawshank",
      originalTitle: "The Shawshank Redemption",
      punchline: "Bộ phim số 1 lịch sử điện ảnh về hy vọng, lòng kiên nhẫn và tự do đích thực.",
      badges: ["Kiệt Tác", "Hy Vọng", "Số 1 IMDb"],
      country: "Âu Mỹ",
    },
    {
      title: "Điều Kỳ Diệu Ở Phòng Giam Số 7",
      originalTitle: "Miracle in Cell No. 7",
      punchline: "Tình cha con bất diệt lay động hàng triệu trái tim, chuẩn bị sẵn khăn giấy trước khi xem.",
      badges: ["Gia Đình", "Cảm Động", "Lấy Nước Mắt"],
      country: "Hàn Quốc",
    },
    {
      title: "Kẻ Đuổi Theo Bóng Ma",
      originalTitle: "Manchester by the Sea",
      punchline: "Hành trình đối diện với nỗi đau và học cách sống tiếp một cách chân thực nhất.",
      badges: ["Tâm Lý", "Lắng Đọng", "Sâu Sắc"],
      country: "Âu Mỹ",
    },
  ],
  "kinh-di": [
    {
      title: "Ám Ảnh Kinh Hoàng",
      originalTitle: "The Conjuring",
      punchline: "Đỉnh cao kinh dị trừ tà có thật của vợ chồng nhà Warren sẽ làm bạn lạnh gáy trong đêm tối.",
      badges: ["Rùng Rợn", "Trừ Tà", "Căng Thẳng"],
      country: "Âu Mỹ",
    },
    {
      title: "Quỷ Ám",
      originalTitle: "Exhuma",
      punchline: "Màn quật mộ khai quật bí mật kinh hoàng làm khuynh đảo phòng vé châu Á.",
      badges: ["Hàn Quốc", "Kinh Dị", "Tâm Linh"],
      country: "Hàn Quốc",
    },
    {
      title: "Âm Hồn Nhập Xác",
      originalTitle: "The Medium",
      punchline: "Phong cách giả tài liệu rùng rợn vùng Đông Bắc Thái Lan về thế giới tâm linh tà thuật.",
      badges: ["Thái Lan", "Tâm Linh", "Ám Ảnh"],
      country: "Thái Lan",
    },
    {
      title: "Chuyện Ma Gần Nhà",
      originalTitle: "Vietnamese Horror Story",
      punchline: "Tuyển tập những truyền thuyết đô thị ma mị đậm màu sắc văn hóa dân gian Việt Nam.",
      badges: ["Việt Nam", "Ma Quái", "Hồi Hộp"],
      country: "Việt Nam",
    },
  ],
  "vien-tuong": [
    {
      title: "Thế Thân: Dòng Chảy Của Nước",
      originalTitle: "Avatar: The Way of Water",
      punchline: "Bữa tiệc thị giác đỉnh cao đưa bạn đắm chìm vào đại dương kỳ vĩ của hành tinh Pandora.",
      badges: ["3D Đỉnh Cao", "Vũ Trụ", "Bom Tấn"],
      country: "Âu Mỹ",
    },
    {
      title: "Hành Tinh Cát",
      originalTitle: "Dune: Part Two",
      punchline: "Sử thi điện ảnh không gian vĩ đại với âm thanh và hình ảnh xứng tầm kiệt tác.",
      badges: ["Khoa Học", "Sử Thi", "Mãn Nhãn"],
      country: "Âu Mỹ",
    },
    {
      title: "Ma Trận",
      originalTitle: "The Matrix",
      punchline: "Khái niệm thế giới ảo định hình cả một thời đại cùng phong cách hành động huyền thoại.",
      badges: ["Kinh Điển", "Khoa Học", "Hành Động"],
      country: "Âu Mỹ",
    },
  ],
  "anime": [
    {
      title: "Vùng Đất Linh Hồn",
      originalTitle: "Spirited Away",
      punchline: "Hành trình trưởng thành kỳ diệu của cô bé Chihiro trong thế giới thần linh rực rỡ.",
      badges: ["Ghibli", "Oscar", "Kiệt Tác"],
      country: "Nhật Bản",
    },
    {
      title: "Tên Cậu Là Gì?",
      originalTitle: "Your Name",
      punchline: "Sợi dây duyên phận vượt không gian và thời gian với phần đồ họa và âm nhạc đẹp mê hồn.",
      badges: ["Makoto Shinkai", "Cảm Động", "Lãng Mạn"],
      country: "Nhật Bản",
    },
    {
      title: "Thanh Gươm Diệt Quỷ: Chuyến Tàu Vô Tận",
      originalTitle: "Demon Slayer: Mugen Train",
      punchline: "Trận chiến rực lửa của Viêm Trụ Rengoku khiến cả khán phòng bùng nổ cảm xúc!",
      badges: ["Anime", "Hành Động", "Xúc Động"],
      country: "Nhật Bản",
    },
  ],
  "co-trang": [
    {
      title: "Trần Tình Lệnh",
      originalTitle: "The Untamed",
      punchline: "Tuyệt phẩm tiên hiệp huynh đệ kinh điển làm mưa làm gió toàn châu Á.",
      badges: ["Tiên Hiệp", "Trung Quốc", "Huyền Thoại"],
      country: "Trung Quốc",
    },
    {
      title: "Chân Hoàn Truyện",
      originalTitle: "Empresses in the Palace",
      punchline: "Bức tranh cung đấu đỉnh cao với những màn tranh sủng và đấu trí tàn khốc bậc nhất.",
      badges: ["Cung Đấu", "Kinh Điển", "Trung Quốc"],
      country: "Trung Quốc",
    },
    {
      title: "Khánh Dư Niên",
      originalTitle: "Joy of Life",
      punchline: "Màn xuyên không đấu trí quyền mưu lôi cuốn hài hước nhưng không kém phần kịch tính.",
      badges: ["Quyền Mưu", "Cổ Trang", "Hài Hước"],
      country: "Trung Quốc",
    },
  ],
  "toi-pham": [
    {
      title: "Bố Già",
      originalTitle: "The Godfather",
      punchline: "Bức tượng đài bất hủ của dòng phim mafia với những bài học cuộc đời sâu sắc.",
      badges: ["Mafia", "Kinh Điển", "Kiệt Tác"],
      country: "Âu Mỹ",
    },
    {
      title: "Kỵ Sĩ Bóng Đêm",
      originalTitle: "The Dark Knight",
      punchline: "Màn đối đầu lịch sử giữa Batman và Joker - phản diện xuất sắc nhất mọi thời đại.",
      badges: ["Batman", "Joker", "Đỉnh Cao"],
      country: "Âu Mỹ",
    },
    {
      title: "Vô Gian Đạo",
      originalTitle: "Infernal Affairs",
      punchline: "Cuộc chiến nội gián cân não giữa cảnh sát và xã hội đen Hồng Kông không thể nào quên.",
      badges: ["Hồng Kông", "Nội Gián", "Kinh Điển"],
      country: "Trung Quốc",
    },
  ],
};

// Helper chuẩn hóa chuỗi tiếng Việt để so khớp chính xác
function cleanNormalizedString(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findBestMatchMovie(items: any[], query: string, originalQuery?: string): any {
  if (!items || items.length === 0) return null;
  const cleanQ = cleanNormalizedString(query || "");
  const cleanOq = cleanNormalizedString(originalQuery || "");

  let bestItem = null;
  let bestScore = -999;

  for (const it of items) {
    const name = cleanNormalizedString(it.name || it.title || "");
    const orig = cleanNormalizedString(it.origin_name || "");
    const slug = cleanNormalizedString(it.slug || "");

    let score = 0;

    // 1. Khớp chính xác tên tiếng Việt hoặc tên gốc -> Ưu tiên hàng đầu (+100)
    if (name === cleanQ || (cleanOq && (name === cleanOq || orig === cleanOq))) {
      score += 100;
    } else if (slug === cleanQ.replace(/\s+/g, "-") || (cleanOq && slug === cleanOq.replace(/\s+/g, "-"))) {
      score += 90;
    } else if (name.startsWith(cleanQ) || (cleanOq && (name.startsWith(cleanOq) || orig.startsWith(cleanOq)))) {
      score += 70;
    } else if (name.includes(cleanQ) || (cleanOq && (name.includes(cleanOq) || orig.includes(cleanOq)))) {
      score += 50;
    } else {
      // Khớp theo tập từ (ví dụ: "Vây Hãm: Kẻ Trừng Phạt" khớp với "Vây Hãm 4: Kẻ Trừng Phạt")
      const qWords = cleanQ.split(" ").filter((w) => w.length > 1);
      if (qWords.length > 1) {
        const matchWords = qWords.filter((w) => name.includes(w) || (orig && orig.includes(w)));
        const ratio = matchWords.length / qWords.length;
        if (ratio >= 0.6) score += Math.round(ratio * 45);
      }
    }

    // 2. Phạt nếu độ dài chênh lệch quá nhiều
    const lenDiff = Math.abs(name.length - cleanQ.length);
    score -= Math.min(20, lenDiff * 1.2);

    // 3. Ưu tiên phim có ảnh bìa
    if (it.thumb_url || it.poster_url) score += 10;

    if (score > bestScore) {
      bestScore = score;
      bestItem = it;
    }
  }

  return bestScore > 10 ? bestItem : (items[0] || null);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function queryPhimApiDirect(keyword: string, originalKeyword?: string): Promise<any> {
  if (!keyword?.trim()) return null;
  try {
    const res = await fetch(
      `https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword.trim())}&limit=6`,
      { signal: AbortSignal.timeout(2500), next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const items = json?.data?.items || [];
    if (items.length > 0) {
      const best = findBestMatchMovie(items, keyword, originalKeyword);
      if (!best) return null;

      const imageDomain = (json.data?.APP_DOMAIN_CDN_IMAGE || "https://phimimg.com/").replace(/\/+$/, "");
      const formatImg = (p?: string) => {
        if (!p) return "";
        if (p.startsWith("http://") || p.startsWith("https://")) return p;
        return `${imageDomain}/${p.replace(/^\/+/, "")}`;
      };
      return {
        ...best,
        thumb_url: formatImg(best.thumb_url) || formatImg(best.poster_url),
        poster_url: formatImg(best.poster_url) || formatImg(best.thumb_url),
      };
    }
  } catch {}
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ROULETTE_TITLE_CACHE = new Map<string, { item: any; expireAt: number }>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function searchSingleMovieFast(title: string, originalTitle: string): Promise<any> {
  const cleanTitle = (title || "").replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "").trim();
  const cleanOriginal = (originalTitle || "").replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "").trim();
  const key = `${cleanTitle}__${cleanOriginal}`.toLowerCase();

  const cached = ROULETTE_TITLE_CACHE.get(key);
  if (cached && Date.now() < cached.expireAt) return cached.item;

  let foundItem = null;

  // 1. Thử tìm trên PhimAPI direct
  if (cleanTitle) {
    foundItem = await queryPhimApiDirect(cleanTitle, cleanOriginal);
    // Nếu có dấu hai chấm và chưa tìm ra, thử tìm tên chính trước dấu hai chấm
    if (!foundItem && cleanTitle.includes(":")) {
      const mainPart = cleanTitle.split(":")[0].trim();
      if (mainPart.length >= 3) {
        foundItem = await queryPhimApiDirect(mainPart, cleanOriginal);
      }
    }
  }

  // 2. Thử tìm theo tên gốc nếu chưa thấy
  if (!foundItem && cleanOriginal && cleanOriginal !== cleanTitle) {
    foundItem = await queryPhimApiDirect(cleanOriginal, cleanTitle);
  }

  // 3. Fallback qua movieApi.getMovies với timeout an toàn
  if (!foundItem && cleanTitle) {
    try {
      const res1 = await Promise.race([
        movieApi.getMovies({ keyword: cleanTitle, page: 1, limit: 5 }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
      ]);
      if (res1?.items && res1.items.length > 0) {
        foundItem = findBestMatchMovie(res1.items, cleanTitle, cleanOriginal);
      }
    } catch {}
  }

  if (!foundItem && cleanOriginal && cleanOriginal !== cleanTitle) {
    try {
      const res2 = await Promise.race([
        movieApi.getMovies({ keyword: cleanOriginal, page: 1, limit: 5 }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
      ]);
      if (res2?.items && res2.items.length > 0) {
        foundItem = findBestMatchMovie(res2.items, cleanOriginal, cleanTitle);
      }
    } catch {}
  }

  if (foundItem) {
    ROULETTE_TITLE_CACHE.set(key, { item: foundItem, expireAt: Date.now() + 1000 * 60 * 60 * 24 });
  } else {
    ROULETTE_TITLE_CACHE.set(key, { item: null, expireAt: Date.now() + 1000 * 30 });
  }

  return foundItem;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSafePoster(item: any): string {
  if (!item) return "/default-poster.svg";
  const poster = sanitizeImageUrl(item.poster_url || item.posterUrl || "");
  if (poster) return poster;
  const thumb = sanitizeImageUrl(item.thumb_url || item.thumbUrl || "");
  if (thumb) return thumb;
  return "/default-poster.svg";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const mood: string = body.mood || "xa-stress";
    const country: string = body.country || "all";
    const companion: string = body.companion || "mot-minh";
    const duration: string = body.duration || "phim-le";
    const excludeSlugs: string[] = Array.isArray(body.excludeSlugs) ? body.excludeSlugs : [];
    const excludeTitles: string[] = Array.isArray(body.excludeTitles) ? body.excludeTitles : [];
    const userApiKey: string = body.apiKey || "";

    const moodMeta = MOOD_META[mood] || MOOD_META["xa-stress"];
    const countryMeta = COUNTRY_META[country] || COUNTRY_META["all"];
    const companionDesc = COMPANION_META[companion] || COMPANION_META["mot-minh"];
    const durationMeta = DURATION_META[duration] || DURATION_META["phim-le"];

    const hasExclusions = excludeSlugs.length > 0 || excludeTitles.length > 0;

    // Cache key chỉ dùng khi quay lần đầu không có exclusion
    const cacheKey = `${mood}_${country}_${companion}_${duration}_${Math.floor(Date.now() / (1000 * 60 * 30))}`;
    if (!hasExclusions) {
      const cached = ROULETTE_CACHE.get(cacheKey);
      if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        return NextResponse.json({ ...cached.data, fromCache: true });
      }
    }

    const envKeys = (process.env.GEMINI_API_KEY || "")
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 5);

    const candidateKeys = Array.from(
      new Set(
        [...envKeys, userApiKey?.trim()].filter(
          (k): k is string => Boolean(k && k.length > 5)
        )
      )
    );

    const allExclusions = Array.from(
      new Set([...excludeTitles, ...excludeSlugs].map((s) => s.toLowerCase().trim()))
    );

    const isExcluded = (nameOrSlug?: string) => {
      if (!nameOrSlug) return false;
      const clean = nameOrSlug.toLowerCase().trim();
      return allExclusions.includes(clean);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let foundMovie: any = null;
    let finalPunchline = "";
    let finalBadges: string[] = [];
    let finalMatchScore = 98;
    const provider = "Nana AI";

    // 1. GỌI GEMINI NẾU CÓ KEY VỚI PROMPT TỐI ƯU ĐỘ CHÍNH XÁC CAO
    if (candidateKeys.length > 0) {
      try {
        const countryConstraint =
          country !== "all"
            ? `\n- QUY TẮC BẮT BUỘC: Bộ phim BẮT BUỘC phải thuộc quốc gia "${countryMeta.label}". TUYỆT ĐỐI KHÔNG chọn phim của nước khác!`
            : "";

        const excludePrompt = hasExclusions
          ? `\n- TUYỆT ĐỐI KHÔNG CHỌN bất kỳ phim nào trong danh sách đã xem sau: [${allExclusions.slice(-15).join(", ")}].`
          : "";

        const promptText = `Bạn là Trợ lý Nana của Nanaflix đang bốc quẻ 'Suất Chiếu Định Mệnh' cho người dùng:
- Tâm trạng: "${moodMeta.label} - ${moodMeta.desc}"
- Người xem cùng: "${companionDesc}"
- Thời lượng/Định dạng: "${durationMeta.desc}"${countryConstraint}${excludePrompt}

HÃY CHỌN 2 ỨNG VIÊN PHIM ĐẶC SẮC (ỨNG VIÊN 1 VÀ ỨNG VIÊN DỰ PHÒNG), ĐẢM BẢO:
1. Phim PHẢI CÓ THẬT, CỰC KỲ NỔI TIẾNG, CÓ ĐIỂM ĐÁNH GIÁ CAO trên các trang xem phim tại Việt Nam (PhimAPI, Ophim, Netflix).
2. TUÂN THỦ 100% định dạng (phim lẻ vs phim bộ) và quốc gia được yêu cầu.
3. Tên phim: "title" là tên tiếng Việt chuẩn nhất (KHÔNG ghi năm hay hậu tố vào title, ví dụ: "Vây Hãm: Kẻ Trừng Phạt", "Ký Sinh Trùng", "Hạ Cánh Nơi Anh").
4. "punchline": 1 câu giật gân, cuốn hút hoặc hài hước (dưới 25 từ) lý giải vì sao bộ phim này là định mệnh dành cho người dùng lúc này.

Trả về DUY NHẤT một chuỗi JSON hợp lệ:
{
  "primary": {
    "title": "Tên tiếng Việt",
    "originalTitle": "Tên gốc tiếng Anh/bản địa",
    "punchline": "1 câu cuốn hút",
    "badges": ["3 từ khóa ngắn", "chuẩn vibe"],
    "matchScore": 99
  },
  "secondary": {
    "title": "Tên tiếng Việt dự phòng",
    "originalTitle": "Tên gốc tiếng Anh/bản địa dự phòng",
    "punchline": "1 câu cuốn hút dự phòng",
    "badges": ["3 từ khóa"],
    "matchScore": 96
  }
}`;

        const MODELS = ["gemini-3.5-flash", "gemini-3.6-flash"];
        let raceResult: string | null = null;

        keyLoop: for (const currentKey of candidateKeys) {
          try {
            const ai = new GoogleGenAI({ apiKey: currentKey, vertexai: false });
            for (const model of MODELS) {
              try {
                const is35 = model.includes("3.5");
                const res = await Promise.race([
                  ai.models.generateContent({
                    model,
                    contents: promptText,
                    config: {
                      responseMimeType: "application/json",
                      temperature: 0.35,
                      maxOutputTokens: 500,
                      ...(is35
                        ? { thinkingConfig: { thinkingBudget: 0 } }
                        : { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }),
                    },
                  }),
                  new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error(`${model} roulette timeout`)), 4500)
                  ),
                ]);

                const text = res.text?.trim();
                if (text) {
                  raceResult = text;
                  break keyLoop;
                }
              } catch (mErr) {
                console.warn(`[ai-roulette] ${model} failed:`, mErr instanceof Error ? mErr.message : mErr);
              }
            }
          } catch (kErr) {
            console.warn("[ai-roulette] Key failed, trying next key:", kErr instanceof Error ? kErr.message : kErr);
          }
        }

        if (raceResult) {
          let cleaned = raceResult.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
          if (jsonMatch) cleaned = jsonMatch[0];

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let parsed: any = null;
          try {
            parsed = JSON.parse(cleaned);
          } catch {}

          if (parsed) {
            const candidates = [
              parsed.primary,
              parsed.secondary,
              parsed.title ? parsed : null, // hỗ trợ định dạng đơn cũ
            ].filter(Boolean);

            for (const cand of candidates) {
              const candTitle = (cand.title || "").trim();
              const candOrig = (cand.originalTitle || "").trim();
              if (!candTitle) continue;
              if (isExcluded(candTitle) || isExcluded(candOrig)) continue;

              const matched = await searchSingleMovieFast(candTitle, candOrig);
              if (matched && matched.slug && !isExcluded(matched.slug)) {
                foundMovie = matched;
                finalPunchline = cand.punchline || moodMeta.defaultPunchline;
                finalBadges = Array.isArray(cand.badges) ? cand.badges.slice(0, 3) : moodMeta.defaultBadges;
                finalMatchScore = typeof cand.matchScore === "number" ? cand.matchScore : 98;
                break;
              }
            }
          }
        }
      } catch (geminiErr) {
        console.warn("[ai-roulette] Gemini fallback:", geminiErr instanceof Error ? geminiErr.message : geminiErr);
      }
    }

    // 2. NẾU GEMINI CHƯA RA HOẶC PHIM KHÔNG TỒN TẠI TRÊN KHO -> DÙNG KHO OFFLINE TUYỂN CHỌN
    if (!foundMovie) {
      let pool = CURATED_OFFLINE_PICKS[mood] || CURATED_OFFLINE_PICKS["xa-stress"];

      if (country !== "all") {
        const countryLabel = countryMeta.label;
        const filtered = pool.filter((p) => p.country && countryLabel.includes(p.country));
        if (filtered.length > 0) pool = filtered;
      }

      let available = pool.filter(
        (p) => !isExcluded(p.title) && !isExcluded(p.originalTitle)
      );

      if (available.length === 0) {
        const allPool = Object.values(CURATED_OFFLINE_PICKS).flat();
        available = allPool.filter(
          (p) => !isExcluded(p.title) && !isExcluded(p.originalTitle)
        );
      }

      if (available.length === 0) available = pool;

      // Xáo trộn để quay ngẫu nhiên
      const shuffled = [...available].sort(() => Math.random() - 0.5);

      for (const pick of shuffled) {
        const matched = await searchSingleMovieFast(pick.title, pick.originalTitle);
        if (matched && matched.slug && !isExcluded(matched.slug)) {
          foundMovie = matched;
          finalPunchline = pick.punchline || moodMeta.defaultPunchline;
          finalBadges = pick.badges || moodMeta.defaultBadges;
          finalMatchScore = 96;
          break;
        }
      }
    }

    // 3. NẾU VẪN CHƯA CÓ -> TRUY VẤN TRỰC TIẾP CATALOG THEO THỂ LOẠI / QUỐC GIA / ĐỊNH DẠNG
    if (!foundMovie) {
      try {
        const catRes = await movieApi.getMovies({
          category: moodMeta.categorySlug,
          country: countryMeta.slug,
          type: durationMeta.typeSlug,
          limit: 12,
        });

        if (catRes?.items?.length) {
          const valid = catRes.items.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (it: any) => it.slug && !isExcluded(it.slug) && !isExcluded(it.name)
          );
          if (valid.length > 0) {
            foundMovie = valid[Math.floor(Math.random() * valid.length)];
            const catName = foundMovie.category?.[0]?.name || moodMeta.label;
            finalPunchline = `Tuyệt phẩm ${catName} chuẩn gu được định mệnh chọn cho bạn: bùng nổ cảm xúc và trọn vẹn từng khoảnh khắc!`;
            finalBadges = [catName, foundMovie.country?.[0]?.name || "Đặc Sắc", "Bốc Quẻ Chuẩn"];
            finalMatchScore = 94;
          }
        }
      } catch {}
    }

    // 4. NẾU VẪN TRẮNG TAY (HIẾM GẶP) -> LẤY PHIM HOT TỪ TOÀN KHO
    if (!foundMovie) {
      try {
        const hotRes = await movieApi.getMovies({ page: 1, limit: 12 });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fallbackList = (hotRes?.items || []).filter((it: any) => it.slug && !isExcluded(it.slug));
        foundMovie = fallbackList[0] || hotRes?.items?.[0];
        finalPunchline = moodMeta.defaultPunchline;
        finalBadges = moodMeta.defaultBadges;
        finalMatchScore = 92;
      } catch {}
    }

    if (!foundMovie || !foundMovie.slug) {
      return NextResponse.json(
        { error: "Tạm thời không thể bốc quẻ, vui lòng thử lại sau giây lát!" },
        { status: 503 }
      );
    }

    const payload = {
      movie: {
        slug: foundMovie.slug,
        title: foundMovie.name || foundMovie.title || "Tác Phẩm Đặc Sắc",
        originalTitle: foundMovie.origin_name || "",
        poster: toSafePoster(foundMovie),
        year: foundMovie.year || 2024,
        quality: foundMovie.quality || "FHD",
        category: foundMovie.category?.[0]?.name || moodMeta.label,
        country: foundMovie.country?.[0]?.name || countryMeta.label,
        episodeCurrent: foundMovie.episode_current || "Trọn bộ",
      },
      punchline: finalPunchline || moodMeta.defaultPunchline,
      badges: finalBadges.length > 0 ? finalBadges : moodMeta.defaultBadges,
      matchScore: Math.min(99, Math.max(92, finalMatchScore)),
      provider,
    };

    if (!hasExclusions) {
      ROULETTE_CACHE.set(cacheKey, { data: payload, cachedAt: Date.now() });
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[ai-roulette] Internal Error:", error);
    return NextResponse.json(
      { error: "Không thể quay suất chiếu lúc này, vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
