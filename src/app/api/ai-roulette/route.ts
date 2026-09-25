import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movieApi";
import { sanitizeImageUrl } from "@/lib/movieMedia";
import { searchMoviesBySemantic } from "@/services/aiVectorService";
import { generateFastAiChat } from "@/services/aiProviderService";
import { checkRateLimit, getClientIp } from "@/lib/security";
import { cacheService } from "@/lib/cache";

export const maxDuration = 15;

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
    categorySlug: "vien-tuong",
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
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface ItemMeta {
  id?: string;
  name?: string;
  slug?: string;
  [key: string]: unknown;
}

interface RouletteMovieCandidate {
  slug?: string;
  name?: string;
  title?: string;
  time?: string | number;
  duration?: string | number;
  runtime?: string | number;
  durationMinutes?: number;
  category?: string | (string | ItemMeta)[];
  country?: string | (string | ItemMeta)[];
  [key: string]: unknown;
}

/**
 * Trích xuất thời lượng phim thực tế (tính bằng phút) từ metadata.
 * Dựa trên field thực tế: time, duration, runtime, durationMinutes.
 * Tuyệt đối không tự suy đoán từ title hoặc fabricate dữ liệu.
 * Phim bộ / tập nhiều phần ("45 phút/tập") trả về null để tránh nhận diện sai thành phim ngắn.
 */
export function getMovieDurationMinutes(movie: RouletteMovieCandidate | null | undefined): number | null {
  if (!movie || typeof movie !== "object") return null;

  // Real fields in metadata: time, duration, runtime, durationMinutes, duration_minutes
  const raw =
    movie.time ??
    movie.duration ??
    movie.runtime ??
    movie.durationMinutes ??
    movie.duration_minutes;

  if (raw === undefined || raw === null || raw === "") return null;

  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : null;
  }

  if (typeof raw !== "string") return null;

  const str = raw.trim().toLowerCase();
  if (!str) return null;

  // Episodic indicators: nếu có "/tập" thì đây là thời lượng 1 tập của phim bộ, không phải tổng thời lượng
  if (str.includes("/tập") || str.includes("/tap") || str.includes("/ tập")) {
    return null;
  }

  // Định dạng: "1h 30m", "1h30m", "1h 30p", "1h", "2 hours 15 mins"
  const hourMinMatch = str.match(/(\d+)\s*(?:h|giờ|gio|hours?)(?:\s*(\d+)\s*(?:m|p|phút|phut|mins?|minutes?))?/i);
  if (hourMinMatch) {
    const hours = parseInt(hourMinMatch[1], 10);
    const mins = hourMinMatch[2] ? parseInt(hourMinMatch[2], 10) : 0;
    if (!isNaN(hours)) {
      return hours * 60 + (isNaN(mins) ? 0 : mins);
    }
  }

  // Định dạng: "85 phút", "120 phut", "90 min", "105m"
  const minMatch = str.match(/(\d+)\s*(?:phút|phut|min|mins|minutes|p|m)\b/i) || str.match(/^(\d+)\s*(?:phút|phut|min|mins|minutes|p)$/i);
  if (minMatch) {
    const mins = parseInt(minMatch[1], 10);
    if (!isNaN(mins) && mins > 0) return mins;
  }

  // Chuỗi số nguyên thuần túy: "105"
  if (/^\d+$/.test(str)) {
    const mins = parseInt(str, 10);
    if (!isNaN(mins) && mins > 0) return mins;
  }

  return null;
}

/**
 * Kiểm tra xem số phút thực tế có thuộc khoảng thời lượng đã chọn hay không.
 * Xử lý biên rõ ràng:
 * 89  → <90
 * 90  → 90–120
 * 120 → 90–120
 * 121 → 120–150
 * 150 → 120–150
 * 151 → ngoài các nhóm trên
 */
export function matchesDurationRange(
  minutes: number | null,
  targetDuration?: string
): boolean {
  if (
    !targetDuration ||
    targetDuration === "all" ||
    targetDuration === "bat-ky" ||
    targetDuration === "phim-le" ||
    targetDuration === "chieu-rap" ||
    targetDuration === "phim-bo"
  ) {
    return true; // all = không filter
  }

  if (minutes === null || minutes === undefined) {
    // Nếu user chọn một range cụ thể thì movie thiếu duration không được coi là match
    return false;
  }

  const norm = cleanNormalizedString(targetDuration).replace(/\s+/g, "-");
  if (
    norm === "duoi-90" ||
    norm === "90" ||
    norm === "under-90" ||
    targetDuration === "<90" ||
    targetDuration === "< 90"
  ) {
    return minutes < 90;
  }

  if (
    norm === "90-120" ||
    targetDuration === "90–120" ||
    targetDuration === "90-120"
  ) {
    return minutes >= 90 && minutes <= 120;
  }

  if (
    norm === "120-150" ||
    targetDuration === "120–150" ||
    targetDuration === "120-150"
  ) {
    return minutes >= 121 && minutes <= 150;
  }

  return false;
}

export function calculateCandidateRawPopularity(movie: RouletteMovieCandidate | null | undefined): number {
  if (!movie || typeof movie !== "object") return 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawMovie = movie as any;
  const tmdbVotes = Number(rawMovie.tmdb?.vote_count || 0);
  const imdbVotes = Number(rawMovie.imdb?.vote_count || 0);
  const views = Number(rawMovie.view || rawMovie.views || 0);
  return tmdbVotes * 15 + imdbVotes * 10 + views;
}

export function calculateCandidateQualityScore(movie: RouletteMovieCandidate | null | undefined): number {
  if (!movie || typeof movie !== "object") return 60;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawMovie = movie as any;
  const tmdbVote = Number(rawMovie.tmdb?.vote_average || 0);
  const imdbVote = Number(rawMovie.imdb?.vote_average || 0);
  const generalRating = Number(rawMovie.rating || 0);
  const rating10 = Math.max(tmdbVote, imdbVote, generalRating);
  return rating10 > 0 ? Math.min(100, rating10 * 10) : 60;
}

/**
 * TÍNH ĐIỂM ĐỘ BẤT NGỜ (SURPRISE SCORE):
 * Điều chỉnh độ ưu tiên giữa các ứng viên HỢP LỆ đã vượt qua matchesCriteria().
 * Hỗ trợ nhận percentile tương đối (0..100) khi xếp hạng theo pool,
 * hoặc tự ước tính nếu gọi độc lập cho 1 phim đơn lẻ.
 *
 * 🛡️ An toàn (an-toan): Ưu tiên rating cao, độ phổ biến cao.
 * ⚖️ Cân bằng (can-bang): Cân bằng giữa rating, độ phổ biến và tính khám phá.
 * 🎰 Liều một phen (lieu): Ưu tiên hidden gems, phim ít phổ biến trong pool, giảm áp đảo của blockbusters.
 */
export function scoreSurprise(
  movie: RouletteMovieCandidate | null | undefined,
  surpriseMode: string = "can-bang",
  candidatePercentile?: number
): number {
  if (!movie) return 0;

  const qualityScore = calculateCandidateQualityScore(movie);
  const normMode = cleanNormalizedString(surpriseMode).replace(/\s+/g, "-");

  // Tính percentile: nếu được truyền vào từ pool xếp hạng thì dùng trực tiếp,
  // nếu không thì tính xấp xỉ log10 0..100
  let percentile = candidatePercentile;
  if (percentile === undefined || percentile === null || isNaN(percentile)) {
    const rawPop = calculateCandidateRawPopularity(movie);
    percentile = Math.min(100, Math.log10(Math.max(1, rawPop)) * 20);
  }
  percentile = Math.max(0, Math.min(100, percentile));

  const discoveryScore = 100 - percentile;

  if (normMode === "an-toan" || normMode === "safe") {
    // Ưu tiên tác phẩm nổi tiếng và điểm chất lượng cao, jitter nhỏ (±2)
    const jitter = (Math.random() - 0.5) * 4;
    return qualityScore * 0.45 + percentile * 0.55 + jitter;
  }

  if (normMode === "lieu" || normMode === "risky" || normMode === "lieu-mot-phen") {
    // 🎰 LIỀU MỘT PHEN: Ưu tiên hidden gems (discovery cao), giảm áp đảo của blockbusters
    // Nhưng vẫn giữ trọng số chất lượng (quality) để phim rác không thể thắng chỉ vì ít người xem
    const jitter = (Math.random() - 0.5) * 8;
    return qualityScore * 0.40 + discoveryScore * 0.70 - percentile * 0.20 + jitter;
  }

  // Mặc định: "can-bang" / "balanced"
  // Kết hợp hài hòa giữa chất lượng, độ phổ biến và tính khám phá tầm trung, jitter ±3
  const midRangeBonus = Math.max(0, 100 - Math.abs(50 - percentile) * 1.6);
  const jitter = (Math.random() - 0.5) * 6;
  return qualityScore * 0.45 + midRangeBonus * 0.25 + percentile * 0.20 + jitter;
}

export interface ScoredCandidateItem {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  movie: any;
  punchline?: string;
  badges?: string[];
  matchScore?: number;
  relevanceScore?: number;
  surpriseScore?: number;
  finalScore?: number;
  provider?: string;
}

/**
 * Xếp hạng tập ứng viên hợp lệ theo Percentile Độ Bất Ngờ trong candidate pool.
 * Đảm bảo:
 * 1. An toàn: Ưu tiên top percentile phổ biến.
 * 2. Cân bằng: Ưu tiên tầm trung & cân bằng khám phá.
 * 3. Liều một phen: Dành cơ hội thật sự cho hidden gems (percentile thấp) mà không làm mất tính liên quan/chất lượng.
 */
export function rankCandidatesBySurprise(
  candidates: ScoredCandidateItem[],
  surpriseMode: string = "can-bang"
): ScoredCandidateItem[] {
  if (!candidates || candidates.length === 0) return [];
  if (candidates.length === 1) {
    const single = candidates[0];
    const score = scoreSurprise(single.movie, surpriseMode, 50);
    return [{ ...single, surpriseScore: score, finalScore: score }];
  }

  // 1. Tính raw popularity cho từng candidate
  const withRawPop = candidates.map((cand, originalIndex) => ({
    cand,
    rawPop: calculateCandidateRawPopularity(cand.movie),
    originalIndex,
  }));

  // 2. Sắp xếp tăng dần theo rawPop để tính percentile thứ hạng (0 = ít phổ biến nhất, 100 = phổ biến nhất)
  withRawPop.sort((a, b) => {
    if (a.rawPop !== b.rawPop) return a.rawPop - b.rawPop;
    return a.originalIndex - b.originalIndex;
  });

  const n = withRawPop.length;
  const scoredList: ScoredCandidateItem[] = withRawPop.map((item, index) => {
    // Percentile từ 0 (ít phổ biến nhất trong pool) đến 100 (phổ biến nhất trong pool)
    const percentile = (index / (n - 1)) * 100;
    const surScore = scoreSurprise(item.cand.movie, surpriseMode, percentile);
    const relevance = item.cand.relevanceScore ?? item.cand.matchScore ?? 90;
    // Điểm tổng hợp cuối cùng: kết hợp độ liên quan và surprise score
    const finalScore = relevance * 0.35 + surScore;

    return {
      ...item.cand,
      surpriseScore: surScore,
      finalScore,
    };
  });

  // 3. Sắp xếp giảm dần theo điểm tổng hợp
  scoredList.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));

  return scoredList;
}

/**
 * CỔNG KIỂM DUYỆT CHUẨN XÁC (SAFETY GATE):
 * Kiểm tra xem movie có thỏa mãn đồng thời category, country, duration và exclusion hay không.
 * Hỗ trợ multi-category và multi-country với .some().
 * Category AND Country AND Duration AND Exclusion.
 * Tuyệt đối không dùng tên phim để suy đoán.
 */
export function matchesCriteria(
  movie: RouletteMovieCandidate | null | undefined,
  targetCategorySlug?: string,
  targetCountrySlug?: string,
  targetDuration?: string,
  excludeSlugs?: string[]
): boolean {
  if (!movie) return false;

  // 0. Kiểm tra Exclusion
  if (excludeSlugs && excludeSlugs.length > 0) {
    const slug = cleanNormalizedString(movie.slug || "");
    const title = cleanNormalizedString(movie.name || movie.title || "");
    const isExcluded = excludeSlugs.some((ex) => {
      const cleanEx = cleanNormalizedString(ex);
      return cleanEx && (cleanEx === slug || cleanEx === title);
    });
    if (isExcluded) return false;
  }

  // 1. Kiểm tra Category
  if (targetCategorySlug && targetCategorySlug !== "all") {
    const rawCategories: (string | ItemMeta)[] = Array.isArray(movie.category)
      ? movie.category
      : typeof movie.category === "string" && movie.category.trim()
      ? [{ name: movie.category, slug: cleanNormalizedString(movie.category).replace(/\s+/g, "-") }]
      : [];

    if (rawCategories.length === 0) return false;

    const normTarget = cleanNormalizedString(targetCategorySlug);
    const hasCategoryMatch = rawCategories.some((c) => {
      if (!c) return false;
      const cSlug = cleanNormalizedString(typeof c === "string" ? c : c.slug || "");
      const cName = cleanNormalizedString(typeof c === "string" ? c : c.name || "");
      if (cSlug === normTarget || cName === normTarget) return true;
      if (cSlug.replace(/\s+/g, "-") === normTarget.replace(/\s+/g, "-")) return true;
      return false;
    });

    if (!hasCategoryMatch) return false;
  }

  // 2. Kiểm tra Country
  if (targetCountrySlug && targetCountrySlug !== "all") {
    const rawCountries: (string | ItemMeta)[] = Array.isArray(movie.country)
      ? movie.country
      : typeof movie.country === "string" && movie.country.trim()
      ? [{ name: movie.country, slug: cleanNormalizedString(movie.country).replace(/\s+/g, "-") }]
      : [];

    if (rawCountries.length === 0) return false;

    const normTargetCountry = cleanNormalizedString(targetCountrySlug);
    const hasCountryMatch = rawCountries.some((c) => {
      if (!c) return false;
      const cSlug = cleanNormalizedString(typeof c === "string" ? c : c.slug || "");
      const cName = cleanNormalizedString(typeof c === "string" ? c : c.name || "");

      if (cSlug === normTargetCountry || cName === normTargetCountry) return true;
      if (cSlug.replace(/\s+/g, "-") === normTargetCountry.replace(/\s+/g, "-")) return true;

      // Hỗ trợ cụm khu vực tương đương chuẩn hóa
      if (normTargetCountry.includes("au my")) {
        if (
          cSlug === "au-my" ||
          cSlug === "my" ||
          cName.includes("au my") ||
          /\b(my|hoa ky)\b/.test(cName)
        ) {
          return true;
        }
      }
      if (normTargetCountry.includes("trung quoc")) {
        if (
          cSlug === "trung-quoc" ||
          cSlug === "hong-kong" ||
          cSlug === "dai-loan" ||
          cName.includes("trung quoc") ||
          cName.includes("hong kong") ||
          cName.includes("dai loan")
        ) {
          return true;
        }
      }
      return false;
    });

    if (!hasCountryMatch) return false;
  }

  // 3. Kiểm tra Thời lượng (Duration)
  if (targetDuration && targetDuration !== "all") {
    const mins = getMovieDurationMinutes(movie);
    if (!matchesDurationRange(mins, targetDuration)) {
      return false;
    }
  }

  return true;
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

// In-memory cache với dung lượng giới hạn tối đa 500 entries và cơ chế dọn dẹp FIFO/LRU chống tràn RAM
const MAX_ROULETTE_CACHE_SIZE = 500;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ROULETTE_TITLE_CACHE = new Map<string, { item: any; expireAt: number }>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setRouletteTitleCache(key: string, item: any, ttlMs: number) {
  if (ROULETTE_TITLE_CACHE.size >= MAX_ROULETTE_CACHE_SIZE) {
    const oldestKey = ROULETTE_TITLE_CACHE.keys().next().value;
    if (oldestKey !== undefined) {
      ROULETTE_TITLE_CACHE.delete(oldestKey);
    }
  }
  ROULETTE_TITLE_CACHE.set(key, { item, expireAt: Date.now() + ttlMs });
}

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
    setRouletteTitleCache(key, foundItem, 1000 * 60 * 60 * 24);
  } else {
    setRouletteTitleCache(key, null, 1000 * 30);
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
    // 1. Giới hạn tần suất theo IP (15 requests / 60s) - bảo vệ quota AI & tránh spam
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(`ai_roulette_${clientIp}`, 15, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Bạn đang quay quẻ quá nhanh. Vui lòng chờ 30 giây rồi thử lại để bảo vệ hệ thống.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.resetSeconds) },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const mood: string = body.mood || "xa-stress";
    const country: string = body.country || "all";
    const companion: string = body.companion || "mot-minh";
    const duration: string = body.duration || "all";
    const surprise: string = body.surprise || "can-bang";
    const excludeSlugs: string[] = Array.isArray(body.excludeSlugs) ? body.excludeSlugs : [];
    const excludeTitles: string[] = Array.isArray(body.excludeTitles) ? body.excludeTitles : [];
    const userApiKey: string = body.apiKey || "";

    const moodMeta = MOOD_META[mood] || MOOD_META["xa-stress"];
    const countryMeta = COUNTRY_META[country] || COUNTRY_META["all"];
    const companionDesc = COMPANION_META[companion] || COMPANION_META["mot-minh"];

    let durationDesc = "Bất kỳ thời lượng nào";
    if (duration === "duoi-90" || duration === "<90" || duration === "under-90") {
      durationDesc = "Phim ngắn gọn dưới 90 phút";
    } else if (duration === "90-120") {
      durationDesc = "Thời lượng tiêu chuẩn 90 đến 120 phút";
    } else if (duration === "120-150") {
      durationDesc = "Phim dài 120 đến 150 phút";
    } else if (DURATION_META[duration]?.desc) {
      durationDesc = DURATION_META[duration].desc;
    }

    const hasExclusions = excludeSlugs.length > 0 || excludeTitles.length > 0;

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
    let provider = "Nana AI";

    const targetCategorySlug = moodMeta.categorySlug;
    const targetCountrySlug = country !== "all" ? (countryMeta.slug || country) : undefined;

    // BỘ THU THẬP ỨNG VIÊN ĐA NGUỒN (UNIFIED CANDIDATE POOL):
    // Thay vì early-exit ngắt sớm ở từng stage khiến 'Liều' chỉ nhận 1-2 phim nổi tiếng,
    // ta gom ứng viên hợp lệ từ Catalog (đa page), AI, Curated Vault và Vector Search.
    // Toàn bộ candidate ĐỀU BẮT BUỘC vượt qua matchesCriteria()!
    const candidateMap = new Map<string, ScoredCandidateItem>();

    const addCandidateToPool = (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      movieItem: any,
      options: {
        punchline?: string;
        badges?: string[];
        relevanceScore?: number;
        provider?: string;
      } = {}
    ) => {
      if (!movieItem || !movieItem.slug) return;
      const slug = cleanNormalizedString(movieItem.slug);
      if (isExcluded(slug) || isExcluded(movieItem.name) || isExcluded(movieItem.title)) return;
      if (candidateMap.has(slug)) return;

      // CỔNG KIỂM DUYỆT BẮT BUỘC: Category AND Country AND Duration AND Exclusion
      if (!matchesCriteria(movieItem, targetCategorySlug, targetCountrySlug, duration, allExclusions)) {
        return;
      }

      candidateMap.set(slug, {
        movie: movieItem,
        punchline: options.punchline,
        badges: options.badges,
        relevanceScore: options.relevanceScore ?? 92,
        provider: options.provider || "Catalog Engine",
      });
    };

    // 2. KIỂM TRA CACHE CANDIDATE POOL (1 GIỜ) ĐỂ TÁI SỬ DỤNG CHO CÙNG BỘ TIÊU CHÍ
    const poolCacheKey = `ai:roulette:pool:${mood}:${country}:${companion}:${duration}:${surprise}`;
    let isPoolFromCache = false;

    try {
      const cachedPool = await cacheService.get<ScoredCandidateItem[]>(poolCacheKey);
      if (Array.isArray(cachedPool) && cachedPool.length > 0) {
        for (const item of cachedPool) {
          if (item?.movie) {
            addCandidateToPool(item.movie, {
              punchline: item.punchline,
              badges: item.badges,
              relevanceScore: item.relevanceScore,
              provider: item.provider,
            });
          }
        }
        if (candidateMap.size > 0) {
          isPoolFromCache = true;
        }
      }
    } catch {
      // Cache miss hoặc kết nối cache lỗi: tiếp tục truy vấn catalog
    }

    if (!isPoolFromCache) {
      // 1. TRUY VẤN CATALOG ĐA TẦNG (CATALOG ENGINE RETRIEVAL)
      // Tùy theo chế độ bất ngờ, lấy số trang phù hợp:
      // - "lieu": lấy song song page 1, 2, 3 (đến 72+ ứng viên) để gom cả top hot, tầm trung và hidden gems ít người biết.
      // - "can-bang": lấy page 1, 2 (đến 48 ứng viên).
      // - "an-toan": lấy page 1 (36 ứng viên hot nhất).
      const pagesToFetch = surprise === "lieu" ? [1, 2, 3] : surprise === "can-bang" ? [1, 2] : [1];
      try {
        const catalogResponses = await Promise.all(
          pagesToFetch.map((p) =>
            movieApi.getMovies({
              category: targetCategorySlug,
              country: targetCountrySlug,
              type: duration === "phim-bo" ? "phim-bo" : "phim-le",
              page: p,
              limit: 24,
            }).catch((err) => {
              console.warn(`[ai-roulette] Catalog page ${p} fetch failed:`, err);
              return null;
            })
          )
        );

        for (const catRes of catalogResponses) {
          if (catRes?.items?.length) {
            for (const item of catRes.items) {
              const catName = item.category?.[0]?.name || moodMeta.label;
              addCandidateToPool(item, {
                punchline: `Tuyệt phẩm ${catName} chuẩn gu định mệnh: bùng nổ cảm xúc và trọn vẹn từng phút giây!`,
                badges: [catName, item.country?.[0]?.name || "Đặc Sắc", "Bốc Quẻ Chuẩn"],
                relevanceScore: 92,
                provider: "Catalog Engine",
              });
            }
          }
        }
      } catch (catErr) {
        console.warn("[ai-roulette] Catalog engine phase error:", catErr);
      }

      // 2. BỔ SUNG TỪ SUPABASE PGVECTOR (NẾU CÓ)
      try {
        const vectorSearchTerm = `${moodMeta.label} ${moodMeta.desc} ${companionDesc} ${country !== "all" ? countryMeta.label : ""}`.trim();
        const vectorPicks = await searchMoviesBySemantic(vectorSearchTerm, 8, 0.42, userApiKey);

        for (const vp of vectorPicks) {
          if (!vp.id || isExcluded(vp.id) || isExcluded(vp.title)) continue;
          const candidateDetail = await searchSingleMovieFast(vp.title, vp.originalName || "");
          if (candidateDetail && candidateDetail.slug) {
            addCandidateToPool(candidateDetail, {
              punchline: moodMeta.defaultPunchline,
              badges: moodMeta.defaultBadges,
              relevanceScore: Math.min(99, Math.round(88 + (vp.similarity || 0.5) * 15)),
              provider: "Supabase Vector Engine",
            });
          }
        }
      } catch (vErr) {
        console.warn("[ai-roulette] Vector search phase skipped:", vErr);
      }

      // 3. BỔ SUNG TỪ FAST AI HYBRID (CHỈ GỌI KHI CẦN THÊM HOẶC THIẾU ỨNG VIÊN)
      // Nếu candidate pool hiện tại còn mỏng (< 6 phim) thì mới gọi AI để tiết kiệm quota
      if (candidateMap.size < 6) {
        try {
          const countryConstraint =
            country !== "all"
              ? `\n- QUY TẮC BẮT BUỘC: Bộ phim BẮT BUỘC phải thuộc quốc gia "${countryMeta.label}". TUYỆT ĐỐI KHÔNG chọn phim của nước khác!`
              : "";

          const durationConstraint =
            duration !== "all"
              ? `\n- QUY TẮC THỜI LƯỢNG: Ưu tiên phim có thời lượng ${durationDesc}.`
              : "";

          const surpriseConstraint =
            surprise === "an-toan"
              ? "\n- GU CHỌN: Ưu tiên các kiệt tác cực kỳ nổi tiếng, kinh điển, điểm IMDb/TMDB cao nhất."
              : surprise === "lieu"
              ? "\n- GU CHỌN: Ưu tiên tác phẩm độc lạ, hidden gem, indie, cult classic, ít phổ biến đại trà nhưng có kịch bản cuốn hút đặc sắc."
              : "\n- GU CHỌN: Cân bằng giữa phim phổ biến và tác phẩm giàu tính khám phá.";

          const excludePrompt = hasExclusions
            ? `\n- TUYỆT ĐỐI KHÔNG CHỌN bất kỳ phim nào trong danh sách đã xem sau: [${allExclusions.slice(-15).join(", ")}].`
            : "";

          const promptRequirements =
            surprise === "lieu"
              ? `1. Phim PHẢI CÓ THẬT trên các trang xem phim tại Việt Nam (PhimAPI, Ophim), ưu tiên các tác phẩm ẩn mình (hidden gems), độc đáo, ít người biết nhưng chất lượng kịch bản xuất sắc.`
              : `1. Phim PHẢI CÓ THẬT, CỰC KỲ NỔI TIẾNG, CÓ ĐIỂM ĐÁNH GIÁ CAO trên các trang xem phim tại Việt Nam (PhimAPI, Ophim, Netflix).`;

          const promptText = `Bạn là Trợ lý Nana của Nanaflix đang bốc quẻ 'Suất Chiếu Định Mệnh' cho người dùng:
- Tâm trạng: "${moodMeta.label} - ${moodMeta.desc}"
- Người xem cùng: "${companionDesc}"
- Thời lượng yêu cầu: "${durationDesc}"${countryConstraint}${durationConstraint}${surpriseConstraint}${excludePrompt}

HÃY CHỌN 2 ỨNG VIÊN PHIM ĐẶC SẮC (ỨNG VIÊN 1 VÀ ỨNG VIÊN DỰ PHÒNG), ĐẢM BẢO:
${promptRequirements}
2. TUÂN THỦ 100% định dạng và quốc gia được yêu cầu.
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

          const aiRes = await generateFastAiChat({
            userPrompt: promptText,
            temperature: surprise === "lieu" ? 0.6 : 0.35,
            maxTokens: 500,
            jsonMode: true,
            customApiKey: userApiKey,
            timeoutMs: 5000,
          });

          if (aiRes && aiRes.text) {
            let cleaned = aiRes.text.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
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
                parsed.title ? parsed : null,
              ].filter(Boolean);

              for (const cand of candidates) {
                const candTitle = (cand.title || "").trim();
                const candOrig = (cand.originalTitle || "").trim();
                if (!candTitle) continue;
                if (isExcluded(candTitle) || isExcluded(candOrig)) continue;

                const matched = await searchSingleMovieFast(candTitle, candOrig);
                if (matched && matched.slug) {
                  addCandidateToPool(matched, {
                    punchline: cand.punchline || moodMeta.defaultPunchline,
                    badges: Array.isArray(cand.badges) ? cand.badges.slice(0, 3) : moodMeta.defaultBadges,
                    relevanceScore: typeof cand.matchScore === "number" ? cand.matchScore : 97,
                    provider: "Nana AI",
                  });
                }
              }
            }
          }
        } catch (geminiErr) {
          console.warn("[ai-roulette] AI candidates phase skipped:", geminiErr instanceof Error ? geminiErr.message : geminiErr);
        }
      }

      // 4. BỔ SUNG TỪ KHO OFFLINE TUYỂN CHỌN (CURATED VAULT)
      if (candidateMap.size < 6) {
        let pool = CURATED_OFFLINE_PICKS[mood] || [];
        if (country !== "all") {
          const countryLabel = countryMeta.label;
          pool = pool.filter((p) => p.country && countryLabel.includes(p.country));
        }

        const available = pool.filter(
          (p) => !isExcluded(p.title) && !isExcluded(p.originalTitle)
        );

        for (const pick of available) {
          const matched = await searchSingleMovieFast(pick.title, pick.originalTitle);
          if (matched && matched.slug) {
            addCandidateToPool(matched, {
              punchline: pick.punchline || moodMeta.defaultPunchline,
              badges: pick.badges || moodMeta.defaultBadges,
              relevanceScore: 95,
              provider: "Curated Vault",
            });
          }
        }
      }

      // Lưu candidate pool vào cache 1 giờ để các lượt quay tiếp theo tái sử dụng tức thì
      if (candidateMap.size > 0) {
        cacheService.set(poolCacheKey, Array.from(candidateMap.values()), 3600).catch(() => {});
      }
    }

    // 5. CỔNG AN TOÀN & XẾP HẠNG BẤT NGỜ (PERCENTILE RANKING)
    const validCandidates = Array.from(candidateMap.values());

    // Nếu sau tất cả các nguồn vẫn không có ứng viên nào thỏa mãn:
    // Tuyệt đối không fallback sang phim hot ngẫu nhiên sai tiêu chí!
    if (validCandidates.length === 0) {
      return NextResponse.json(
        {
          notFound: true,
          error: "🎴 Chưa tìm thấy suất chiếu phù hợp với quẻ này.",
        },
        { status: 404 }
      );
    }

    // Áp dụng thuật toán xếp hạng Percentile theo chế độ bất ngờ
    const rankedCandidates = rankCandidatesBySurprise(validCandidates, surprise);

    // Dynamic Weighted Random Sampling trong top ứng viên phù hợp:
    // Đảm bảo cùng một bộ filter thì mỗi lượt quay ngẫu nhiên sẽ lấy ra các phim khác nhau,
    // nhưng vẫn đảm bảo tính chuẩn xác và chất lượng cao nhất.
    let selectedWinner: ScoredCandidateItem;
    if (rankedCandidates.length === 1) {
      selectedWinner = rankedCandidates[0];
    } else {
      const topPoolSize = Math.min(rankedCandidates.length, surprise === "lieu" ? 12 : 8);
      const topCandidates = rankedCandidates.slice(0, topPoolSize);
      
      const weights = topCandidates.map((_, idx) => Math.max(1, Math.round((topPoolSize - idx) ** 1.4)));
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      let rand = Math.random() * totalWeight;
      selectedWinner = topCandidates[0];
      for (let i = 0; i < topCandidates.length; i++) {
        if (rand < weights[i]) {
          selectedWinner = topCandidates[i];
          break;
        }
        rand -= weights[i];
      }
    }

    foundMovie = selectedWinner.movie;
    finalPunchline = selectedWinner.punchline || moodMeta.defaultPunchline;
    finalBadges = selectedWinner.badges && selectedWinner.badges.length > 0 ? selectedWinner.badges : moodMeta.defaultBadges;
    finalMatchScore = selectedWinner.matchScore || selectedWinner.relevanceScore || 96;
    provider = selectedWinner.provider || "Catalog Engine";

    // CỔNG AN TOÀN CUỐI CÙNG (FINAL SAFETY GATE):
    if (
      !foundMovie ||
      !foundMovie.slug ||
      !matchesCriteria(foundMovie, targetCategorySlug, targetCountrySlug, duration, allExclusions)
    ) {
      return NextResponse.json(
        {
          notFound: true,
          error: "🎴 Chưa tìm thấy suất chiếu phù hợp với quẻ này.",
        },
        { status: 404 }
      );
    }

    const firstValidCatName =
      (Array.isArray(foundMovie.category)
        ? foundMovie.category.find((c: ItemMeta | string) => {
            const cSlug = cleanNormalizedString(typeof c === "string" ? c : c?.slug || c?.name || "");
            return cSlug === cleanNormalizedString(targetCategorySlug);
          })
        : null
      )?.name ||
      (Array.isArray(foundMovie.category) ? foundMovie.category[0]?.name : null) ||
      moodMeta.label;

    const firstValidCountryName =
      (Array.isArray(foundMovie.country)
        ? foundMovie.country.find((c: ItemMeta | string) => {
            const cSlug = cleanNormalizedString(typeof c === "string" ? c : c?.slug || c?.name || "");
            return cSlug === cleanNormalizedString(targetCountrySlug || "");
          })
        : null
      )?.name ||
      (Array.isArray(foundMovie.country) ? foundMovie.country[0]?.name : null) ||
      countryMeta.label;

    const movieMins = getMovieDurationMinutes(foundMovie);
    const formattedDuration = movieMins ? `${movieMins} phút` : (typeof foundMovie.time === "string" ? foundMovie.time : undefined);

    const payload = {
      movie: {
        slug: foundMovie.slug,
        title: foundMovie.name || foundMovie.title || "Tác Phẩm Đặc Sắc",
        originalTitle: foundMovie.origin_name || "",
        poster: toSafePoster(foundMovie),
        year: foundMovie.year || 2024,
        quality: foundMovie.quality || "FHD",
        category: firstValidCatName,
        country: firstValidCountryName,
        episodeCurrent: foundMovie.episode_current || "Trọn bộ",
        duration: formattedDuration,
      },
      punchline: finalPunchline || moodMeta.defaultPunchline,
      badges: finalBadges.length > 0 ? finalBadges : moodMeta.defaultBadges,
      matchScore: Math.min(99, Math.max(92, finalMatchScore)),
      provider,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[ai-roulette] Internal Error:", error);
    return NextResponse.json(
      { error: "Không thể quay suất chiếu lúc này, vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}

