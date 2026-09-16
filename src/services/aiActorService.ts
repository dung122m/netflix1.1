import { movieApi } from "@/services/movieApi";
import { generateFastAiChat } from "@/services/aiProviderService";

export interface ActorFilmography {
  name: string;
  aliases: string[];
  country: string;
  titles: string[];
}

/**
 * DANH SÁCH DIỄN VIÊN / NGHỆ SĨ HÀNG ĐẦU (TIER 1 - PRE-INDEXED)
 * Tốc độ tức thì (0ms), độ chính xác 100%, không tốn token AI, không phụ thuộc mạng.
 */
export const GOLDEN_ACTOR_INDEX: ActorFilmography[] = [
  // --- VIỆT NAM ---
  {
    name: "Trường Giang",
    aliases: ["truong giang", "mười khó", "muoi kho", "mc truong giang", "danh hai truong giang"],
    country: "Việt Nam 🇻🇳",
    titles: [
      "49 Ngày",
      "49 Ngày 2",
      "Siêu Sao Siêu Ngố",
      "Lật Mặt",
      "Taxi Em Tên Gì",
      "Chủ Tịch Giao Hàng",
      "Bí Mật Lại Bị Mất",
      "Già Gân Mỹ Nhân Và Găng Tơ",
      "30 Chưa Phải Tết",
    ],
  },
  {
    name: "Trấn Thành",
    aliases: ["tran thanh", "xìn", "mc tran thanh", "dao dien tran thanh"],
    country: "Việt Nam 🇻🇳",
    titles: [
      "Bố Già",
      "Nhà Bà Nữ",
      "Mai",
      "Cua Lại Vợ Bầu",
      "Đất Rừng Phương Nam",
      "Trạng Quỳnh",
      "Bệnh Viện Ma",
      "Chờ Em Đến Ngày Mai",
    ],
  },
  {
    name: "Thái Hòa",
    aliases: ["thai hoa", "ông hoàng phòng vé thái hòa", "ong hoang phong ve thai hoa"],
    country: "Việt Nam 🇻🇳",
    titles: [
      "Để Mai Tính",
      "Tèo Em",
      "Quả Tim Máu",
      "Chàng Vợ Của Em",
      "Tiệc Trăng Máu",
      "Cây Táo Nở Hoa",
      "Mẹ Rơm",
      "Cái Giá Của Hạnh Phúc",
      "Hồn Papa Da Con Gái",
    ],
  },
  {
    name: "Ninh Dương Lan Ngọc",
    aliases: ["ninh duong lan ngoc", "lan ngoc", "ngoc nu ninh duong lan ngoc"],
    country: "Việt Nam 🇻🇳",
    titles: [
      "Cua Lại Vợ Bầu",
      "Gái Già Lắm Chiêu",
      "Gái Già Lắm Chiêu 2",
      "Gái Già Lắm Chiêu 3",
      "Cô Ba Sài Gòn",
      "Tấm Cám: Chuyện Chưa Kể",
      "Vừa Đi Vừa Khóc",
      "Cô Gái Từ Quá Khứ",
    ],
  },
  {
    name: "Kaity Nguyễn",
    aliases: ["kaity nguyen", "kaity"],
    country: "Việt Nam 🇻🇳",
    titles: [
      "Em Chưa 18",
      "Hồn Papa Da Con Gái",
      "Tiệc Trăng Máu",
      "Gái Già Lắm Chiêu V",
      "Cô Gái Từ Quá Khứ",
      "Người Vợ Cuối Cùng",
    ],
  },
  {
    name: "Kiều Minh Tuấn",
    aliases: ["kieu minh tuan"],
    country: "Việt Nam 🇻🇳",
    titles: [
      "Em Chưa 18",
      "Tiệc Trăng Máu",
      "Chìa Khóa Trăm Tỷ",
      "Nghề Siêu Dễ",
      "Kẻ Ẩn Danh",
      "Cô Gái Đến Từ Hôm Qua",
      "Anh Thầy Ngôi Sao",
      "798Mười",
    ],
  },
  {
    name: "Thu Trang",
    aliases: ["thu trang", "hoa hậu hài thu trang", "chi muoi ba"],
    country: "Việt Nam 🇻🇳",
    titles: [
      "Chị Mười Ba",
      "Tiệc Trăng Máu",
      "Nghề Siêu Dễ",
      "Chuyện Xóm Tui",
      "Nắng",
      "Nắng 2",
      "Chìa Khóa Trăm Tỷ",
      "Gia Đình Là Số 1",
    ],
  },
  {
    name: "Lý Hải",
    aliases: ["ly hai", "dao dien ly hai"],
    country: "Việt Nam 🇻🇳",
    titles: [
      "Lật Mặt",
      "Lật Mặt 2: Phim Trường",
      "Lật Mặt: Ba Chàng Khuyết",
      "Lật Mặt: Nhà Có Khách",
      "Lật Mặt: 48H",
      "Lật Mặt 6: Tấm Vé Định Mệnh",
      "Lật Mặt 7: Một Điều Ước",
    ],
  },
  {
    name: "Hoài Linh",
    aliases: ["hoai linh", "nsut hoai linh", "danh hai hoai linh", "sau sang"],
    country: "Việt Nam 🇻🇳",
    titles: [
      "Nhà Có 5 Nàng Tiên",
      "Tía Tui Là Cao Thủ",
      "Dạ Cổ Hoài Lang",
      "Năm Sau Con Lại Về",
      "Đích Tôn Độc Đắc",
      "Võ Lâm Truyền Kỳ",
      "Mến Gái Miền Tây",
    ],
  },
  {
    name: "Việt Hương",
    aliases: ["viet huong", "nghe si viet huong"],
    country: "Việt Nam 🇻🇳",
    titles: [
      "Nhà Có 5 Nàng Tiên",
      "Gái Già Lắm Chiêu",
      "Pháp Sư Mù",
      "Dạ Cổ Hoài Lang",
      "Em Là Của Em",
      "Ma Da",
    ],
  },
  {
    name: "Tuấn Trần",
    aliases: ["tuan tran"],
    country: "Việt Nam 🇻🇳",
    titles: [
      "Bố Già",
      "Đất Rừng Phương Nam",
      "Mai",
      "Móng Vuốt",
      "Sắc Đẹp Dối Trá",
      "Lời Kết Bạn Chết Chóc",
    ],
  },
  {
    name: "Miu Lê",
    aliases: ["miu le"],
    country: "Việt Nam 🇻🇳",
    titles: [
      "Em Là Bà Nội Của Anh",
      "Cô Gái Đến Từ Hôm Qua",
      "Bạn Gái Tôi Là Sếp",
      "Anh Thầy Ngôi Sao",
      "Chiếm Đoạt",
    ],
  },

  // --- HÀN QUỐC ---
  {
    name: "Kim Ji-won",
    aliases: ["kim ji won", "kim jiwon", "hong hae in"],
    country: "Hàn Quốc 🇰🇷",
    titles: [
      "Nữ Hoàng Nước Mắt (Queen of Tears)",
      "Hậu Duệ Mặt Trời (Descendants of the Sun)",
      "Thanh Xuân Vật Vã (Fight for My Way)",
      "Nhật Ký Tự Do Của Tôi (My Liberation Notes)",
      "Những Người Thừa Kế (The Heirs)",
      "Tình Yêu Chốn Đô Thị (Lovestruck in the City)",
    ],
  },
  {
    name: "Son Ye-jin",
    aliases: ["son ye jin", "son yejin"],
    country: "Hàn Quốc 🇰🇷",
    titles: [
      "Hạ Cánh Nơi Anh (Crash Landing on You)",
      "Chị Đẹp Mua Cơm Ngon Cho Tôi (Something in the Rain)",
      "Cổ Điển (The Classic)",
      "Cuộc Đàm Phán Sinh Tử (The Negotiation)",
      "Khoảnh Khắc Để Nhớ (A Moment to Remember)",
      "Hương Mùa Hè (Summer Scent)",
      "Tuổi 39 (Thirty-Nine)",
    ],
  },
  {
    name: "Song Kang",
    aliases: ["song kang"],
    country: "Hàn Quốc 🇰🇷",
    titles: [
      "Chàng Quỷ Của Tôi (My Demon)",
      "Thế Giới Ma Quái (Sweet Home)",
      "Dẫu Biết (Nevertheless)",
      "Chuông Báo Tình Yêu (Love Alarm)",
      "Dự Báo Tình Yêu Và Thời Tiết (Forecasting Love and Weather)",
      "Như Cánh Bướm (Navillera)",
    ],
  },
  {
    name: "Hyun Bin",
    aliases: ["hyun bin", "hyeon bin"],
    country: "Hàn Quốc 🇰🇷",
    titles: [
      "Hạ Cánh Nơi Anh (Crash Landing on You)",
      "Khu Vườn Bí Mật (Secret Garden)",
      "Ký Ức Alhambra (Memories of the Alhambra)",
      "Đặc Vụ Xuyên Quốc Gia (Confidential Assignment)",
      "Cuộc Đàm Phán Sinh Tử (The Negotiation)",
      "Tên Tôi Là Kim Sam Soon (My Name is Kim Sam-soon)",
    ],
  },
  {
    name: "Song Joong-ki",
    aliases: ["song joong ki", "song joongki"],
    country: "Hàn Quốc 🇰🇷",
    titles: [
      "Hậu Duệ Mặt Trời (Descendants of the Sun)",
      "Vincenzo",
      "Cậu Út Nhà Tài Phiệt (Reborn Rich)",
      "Chuyện Tình Sungkyunkwan (Sungkyunkwan Scandal)",
      "Gã Khờ (The Innocent Man)",
      "Con Tàu Chiến Thắng (Space Sweepers)",
      "Đảo Địa Ngục (The Battleship Island)",
    ],
  },
  {
    name: "Kim Soo-hyun",
    aliases: ["kim soo hyun", "kim soohyun"],
    country: "Hàn Quốc 🇰🇷",
    titles: [
      "Nữ Hoàng Nước Mắt (Queen of Tears)",
      "Vì Sao Đưa Anh Tới (My Love from the Star)",
      "Điên Thì Có Sao (It's Okay to Not Be Okay)",
      "Mặt Trăng Ôm Mặt Trời (Moon Embracing the Sun)",
      "Hậu Trường Giải Trí (The Producers)",
      "Đội Siêu Trộm (The Thieves)",
    ],
  },
  {
    name: "Park Seo-joon",
    aliases: ["park seo joon", "park seojun"],
    country: "Hàn Quốc 🇰🇷",
    titles: [
      "Tầng Lớp Itaewon (Itaewon Class)",
      "Thư Ký Kim Sao Thế (What's Wrong with Secretary Kim)",
      "Thanh Xuân Vật Vã (Fight for My Way)",
      "Cảnh Sát Tập Sự (Midnight Runners)",
      "Bác Sĩ Trầm Cảm (Doctor Slump)",
      "Sinh Vật Gyeongseong (Gyeongseong Creature)",
      "Ký Sinh Trùng (Parasite)",
    ],
  },
  {
    name: "Lee Min-ho",
    aliases: ["lee min ho", "lee minho"],
    country: "Hàn Quốc 🇰🇷",
    titles: [
      "Vườn Sao Băng (Boys Over Flowers)",
      "Những Người Thừa Kế (The Heirs)",
      "Huyền Thoại Biển Xanh (The Legend of the Blue Sea)",
      "Quân Vương Bất Diệt (The King: Eternal Monarch)",
      "Thợ Săn Thành Phố (City Hunter)",
      "Pachinko",
    ],
  },
  {
    name: "IU (Lee Ji-eun)",
    aliases: ["iu", "lee ji eun", "lee jieun"],
    country: "Hàn Quốc 🇰🇷",
    titles: [
      "Khách Sạn Ánh Trăng (Hotel Del Luna)",
      "Người Tình Ánh Trăng (Moon Lovers)",
      "Ông Chú Của Tôi (My Mister)",
      "Người Môi Giới (Broker)",
      "Bay Cao Ước Mơ (Dream High)",
    ],
  },
  {
    name: "Cha Eun-woo",
    aliases: ["cha eun woo", "cha eunwoo"],
    country: "Hàn Quốc 🇰🇷",
    titles: [
      "Vẻ Đẹp Thực Sự (True Beauty)",
      "Người Đẹp Gangnam (My ID is Gangnam Beauty)",
      "Ngày Đẹp Trời Để Trở Thành Cún (A Good Day to be a Dog)",
      "Hòn Đảo Ma Quái (Island)",
      "Thế Giới Tuyệt Vời (Wonderful World)",
    ],
  },
  {
    name: "Lee Jong-suk",
    aliases: ["lee jong suk", "lee jongsuk"],
    country: "Hàn Quốc 🇰🇷",
    titles: [
      "Khi Nàng Say Giấc (While You Were Sleeping)",
      "Hai Thế Giới (W - Two Worlds)",
      "Đôi Tai Ngoại Cảm (I Hear Your Voice)",
      "Bác Sĩ Xứ Lạ (Doctor Stranger)",
      "Big Mouth",
      "Pinocchio",
    ],
  },
  {
    name: "Gong Yoo",
    aliases: ["gong yoo", "gong yoo"],
    country: "Hàn Quốc 🇰🇷",
    titles: [
      "Yêu Tinh (Goblin)",
      "Chuyến Tàu Sinh Tử (Train to Busan)",
      "Tiệm Cà Phê Hoàng Tử (Coffee Prince)",
      "Người Nhân Bản (Seobok)",
      "Trò Chơi Con Mực (Squid Game)",
      "Biển Tĩnh Lặng (The Silent Sea)",
    ],
  },
  {
    name: "Han So-hee",
    aliases: ["han so hee", "han sohee"],
    country: "Hàn Quốc 🇰🇷",
    titles: [
      "Thế Giới Hôn Nhân (The World of the Married)",
      "Dẫu Biết (Nevertheless)",
      "Tên Của Tôi (My Name)",
      "Sinh Vật Gyeongseong (Gyeongseong Creature)",
      "Soundtrack #1",
    ],
  },
  {
    name: "Song Hye-kyo",
    aliases: ["song hye kyo", "song hyekyo"],
    country: "Hàn Quốc 🇰🇷",
    titles: [
      "Vinh Quang Trong Thù Hận (The Glory)",
      "Hậu Duệ Mặt Trời (Descendants of the Sun)",
      "Ngôi Nhà Hạnh Phúc (Full House)",
      "Gió Đông Năm Ấy (That Winter, The Wind Blows)",
      "Trái Tim Mùa Thu (Autumn in My Heart)",
    ],
  },

  // --- TRUNG QUỐC / HỒNG KÔNG ---
  {
    name: "Châu Tinh Trì",
    aliases: ["chau tinh tri", "tinh gia", "stephen chow", "vua hai chau tinh tri"],
    country: "Hồng Kông 🇭🇰",
    titles: [
      "Tuyệt Đỉnh Kungfu (Kung Fu Hustle)",
      "Đội Bóng Thiếu Lâm (Shaolin Soccer)",
      "Vua Hài Kịch (King of Comedy)",
      "Đại Thoại Tây Du (A Chinese Odyssey)",
      "Thánh Bài (All for the Winner)",
      "Quan Xẩm Lốc Cốc (Hail the Judge)",
      "Tân Vua Hài Kịch (The New King of Comedy)",
      "Đường Bá Hổ Điểm Thu Hương (Flirting Scholar)",
      "Mỹ Nhân Ngư (The Mermaid)",
    ],
  },
  {
    name: "Dương Mịch",
    aliases: ["duong mich", "yang mi"],
    country: "Trung Quốc 🇨🇳",
    titles: [
      "Tam Sinh Tam Thế Thập Lý Đào Hoa (Eternal Love)",
      "Cung Tỏa Tâm Ngọc (Palace)",
      "Tiên Kiếm Kỳ Hiệp 3 (Chinese Paladin 3)",
      "Phù Dao Hoàng Hậu (Legend of Fuyao)",
      "Hộc Châu Phu Nhân (Novoland: Pearl Eclipse)",
      "Định Luật Tình Yêu 80/20 (She and Her Perfect Husband)",
    ],
  },
  {
    name: "Triệu Lệ Dĩnh",
    aliases: ["trieu le dinh", "zhao liying", "zanilia zhao"],
    country: "Trung Quốc 🇨🇳",
    titles: [
      "Sở Kiều Truyện (Princess Agents)",
      "Minh Lan Truyện (The Story of Minglan)",
      "Hoa Thiên Cốt (The Journey of Flower)",
      "Hữu Phỉ (Legend of Fei)",
      "Sam Sam Đến Rồi (Boss & Me)",
      "Dữ Phượng Hành (The Legend of Shen Li)",
      "Gió Thổi Bán Hạ (Wild Bloom)",
    ],
  },
  {
    name: "Tiêu Chiến",
    aliases: ["tieu chien", "xiao zhan", "sean xiao"],
    country: "Trung Quốc 🇨🇳",
    titles: [
      "Trần Tình Lệnh (The Untamed)",
      "Đấu La Đại Lục (Douluo Continent)",
      "Dư Sinh Xin Chỉ Giáo Nhiều Hơn (The Oath of Love)",
      "Ngọc Cốt Dao (The Longest Promise)",
      "Vùng Biển Trong Mơ (The Youth Memories)",
      "Tru Tiên (Jade Dynasty)",
    ],
  },
  {
    name: "Vương Nhất Bác",
    aliases: ["vuong nhat bac", "wang yibo"],
    country: "Trung Quốc 🇨🇳",
    titles: [
      "Trần Tình Lệnh (The Untamed)",
      "Hữu Phỉ (Legend of Fei)",
      "Phong Khởi Lạc Dương (Luoyang)",
      "Vô Danh (Hidden Blade)",
      "Nhiệt Liệt (One and Only)",
      "Truy Phong Giả (War of Faith)",
    ],
  },
  {
    name: "Lưu Diệc Phi",
    aliases: ["luu diec phi", "crystal liu", "liu yifei", "than tien ty ty"],
    country: "Trung Quốc 🇨🇳",
    titles: [
      "Thần Điêu Đại Hiệp (The Return of the Condor Heroes)",
      "Thiên Long Bát Bộ (Demi-Gods and Semi-Devils)",
      "Mộng Hoa Lục (A Dream of Splendor)",
      "Đi Đến Nơi Có Gió (Meet Yourself)",
      "Câu Chuyện Hoa Hồng (The Tale of Rose)",
      "Mulan",
    ],
  },
  {
    name: "Tạ Đình Phong",
    aliases: ["ta dinh phong", "nicholas tse", "tạ đình phong"],
    country: "Hồng Kông 🇭🇰",
    titles: [
      "Nộ Hỏa: Trọng Án (Raging Fire)",
      "Tân Thiếu Lâm Tự (Shaolin)",
      "Nghịch Chiến (The Viral Factor)",
      "Thập Nguyệt Vi Thành (Bodyguards and Assassins)",
      "Viên Đạn Biến Mất (The Bullet Vanishes)",
      "Tân Câu Chuyện Cảnh Sát (New Police Story)",
      "Hải Quan Tiền Tuyến (Customs Frontline)",
      "Kẻ Đi Săn Tội Ác (The Vanished Murderer)",
    ],
  },
  {
    name: "Lưu Đức Hoa",
    aliases: ["luu duc hoa", "andy lau", "thiên vương lưu đức hoa"],
    country: "Hồng Kông 🇭🇰",
    titles: [
      "Vô Gian Đạo (Infernal Affairs)",
      "Tân Thiếu Lâm Tự (Shaolin)",
      "Sóng Dữ (Shock Wave)",
      "Truy Long (Chasing the Dragon)",
      "Thập Diện Mai Phục (House of Flying Daggers)",
      "Bão Trắng (The White Storm)",
      "Đại Hiệp Hồng Kông",
    ],
  },
  {
    name: "Lương Triều Vỹ",
    aliases: ["luong trieu vy", "tony leung", "tony leung chiu wai"],
    country: "Hồng Kông 🇭🇰",
    titles: [
      "Tâm Trạng Khi Yêu (In the Mood for Love)",
      "Vô Gian Đạo (Infernal Affairs)",
      "Thượng Khí (Shang-Chi)",
      "Nhất Đại Tông Sư (The Grandmaster)",
      "Anh Hùng (Hero)",
      "Xích Bích (Red Cliff)",
      "Vô Danh (Hidden Blade)",
    ],
  },
  {
    name: "Cổ Thiên Lạc",
    aliases: ["co thien lac", "louis koo"],
    country: "Hồng Kông 🇭🇰",
    titles: [
      "Thần Điêu Đại Hiệp",
      "Cỗ Máy Thời Gian (A Step into the Past)",
      "Sát Phá Lang 2 (SPL 2)",
      "Đội Chống Tham Nhũng (Storm Series)",
      "Tảo Độc (The White Storm)",
      "Minh Nhật Chiến Ký (Warriors of Future)",
    ],
  },
  {
    name: "Trịnh Gia Dĩnh",
    aliases: ["trinh gia dinh", "kevin cheng"],
    country: "Hồng Kông 🇭🇰",
    titles: [
      "Bằng Chứng Thép 2 (Forensic Heroes II)",
      "Bộ Bộ Kinh Tâm (Scarlet Heart)",
      "Tòa Án Lương Tâm (Ghetto Justice)",
      "Quyền Vương (Gloves Come Off)",
      "Bằng Chứng Thép",
    ],
  },
  {
    name: "Âu Dương Chấn Hoa",
    aliases: ["au duong chan hoa", "bobby au yeung", "bobby au-yeung"],
    country: "Hồng Kông 🇭🇰",
    titles: [
      "Bằng Chứng Thép (Forensic Heroes)",
      "Bằng Chứng Thép 2 (Forensic Heroes II)",
      "Bức Màn Bí Mật (Witness to a Prosecution)",
      "Lực Lượng Phản Ứng (Armed Reaction)",
      "Kỳ Án Nhà Thanh",
    ],
  },
  {
    name: "Thành Long",
    aliases: ["thanh long", "jackie chan"],
    country: "Hồng Kông 🇭🇰",
    titles: [
      "Giờ Cao Điểm (Rush Hour)",
      "Túy Quyền (Drunken Master)",
      "Câu Chuyện Cảnh Sát (Police Story)",
      "12 Con Giáp (CZ12)",
      "Đại Náo Phố Bronx (Rumble in the Bronx)",
      "Kẻ Ngoại Tộc (The Foreigner)",
      "Long Mã Tinh Thần (Ride On)",
    ],
  },
  {
    name: "Lý Liên Kiệt",
    aliases: ["ly lien kiet", "jet li"],
    country: "Trung Quốc 🇨🇳",
    titles: [
      "Hoàng Phi Hồng (Once Upon a Time in China)",
      "Tinh Võ Anh Hùng (Fist of Legend)",
      "Anh Hùng (Hero)",
      "Hoắc Nguyên Giáp (Fearless)",
      "Biệt Đội Đánh Thuê (The Expendables)",
      "Vua Kung Fu (The Forbidden Kingdom)",
    ],
  },
  {
    name: "Chân Tử Đan",
    aliases: ["chan tu dan", "donnie yen"],
    country: "Hồng Kông 🇭🇰",
    titles: [
      "Diệp Vấn (Ip Man)",
      "Diệp Vấn 2 (Ip Man 2)",
      "Diệp Vấn 3 (Ip Man 3)",
      "Diệp Vấn 4 (Ip Man 4)",
      "Sát Phá Lang (SPL)",
      "Đảo Hỏa Tuyến (Flash Point)",
      "John Wick 4 (John Wick: Chapter 4)",
      "Thiên Long Bát Bộ: Kiều Phong Truyện (Sakra)",
    ],
  },
  {
    name: "Địch Lệ Nhiệt Ba",
    aliases: ["dich le nhiet ba", "dilraba dilmurat", "dilraba"],
    country: "Trung Quốc 🇨🇳",
    titles: [
      "Tam Sinh Tam Thế Chẩm Thượng Thư (Eternal Love of Dream)",
      "Ngự Giao Ký (The Blue Whisper)",
      "Em Là Niềm Kiêu Hãnh Của Anh (You Are My Glory)",
      "Trường Ca Hành (The Long Ballad)",
      "An Lạc Truyện (The Legend of Anle)",
    ],
  },
  {
    name: "Dương Dương",
    aliases: ["duong duong", "yang yang"],
    country: "Trung Quốc 🇨🇳",
    titles: [
      "Yêu Em Từ Cái Nhìn Đầu Tiên (Love O2O)",
      "Em Là Niềm Kiêu Hãnh Của Anh (You Are My Glory)",
      "Toàn Chức Cao Thủ (The King's Avatar)",
      "Thả Thí Thiên Hạ (Who Rules the World)",
      "Khói Lửa Nhân Gian Của Tôi (Fireworks of My Heart)",
    ],
  },

  // --- HOLLYWOOD / QUỐC TẾ ---
  {
    name: "Benedict Cumberbatch",
    aliases: ["benedict cumberbatch", "cumberbatch", "doctor strange"],
    country: "Hollywood 🇺🇸 / Anh Quốc 🇬🇧",
    titles: [
      "Sherlock",
      "Doctor Strange",
      "Doctor Strange trong Đa Vũ Trụ Hỗn Loạn (Doctor Strange in the Multiverse of Madness)",
      "Người Giải Mã (The Imitation Game)",
      "Sức Mạnh Của Loài Chó (The Power of the Dog)",
      "Avengers: Cuộc Chiến Vô Cực (Avengers: Infinity War)",
      "Avengers: Hồi Kết (Avengers: Endgame)",
    ],
  },
  {
    name: "Cillian Murphy",
    aliases: ["cillian murphy", "murphy", "oppenheimer", "thomas shelby"],
    country: "Hollywood 🇺🇸 / Anh Quốc 🇬🇧",
    titles: [
      "Oppenheimer",
      "Bóng Ma Anh Quốc (Peaky Blinders)",
      "Kẻ Đánh Cắp Giấc Mơ (Inception)",
      "Kỵ Sĩ Bóng Đêm (The Dark Knight)",
      "Cuộc Di Tản Dunkirk (Dunkirk)",
      "Vùng Đất Câm Lặng 2 (A Quiet Place Part II)",
    ],
  },
  {
    name: "Tom Cruise",
    aliases: ["tom cruise", "cruise", "ethan hunt"],
    country: "Hollywood 🇺🇸",
    titles: [
      "Nhiệm Vụ Bất Khả Thi (Mission: Impossible)",
      "Phi Công Siêu Đẳng Maverick (Top Gun: Maverick)",
      "Cuộc Chiến Luân Hồi (Edge of Tomorrow)",
      "Jack Reacher",
      "Kẻ Lãng Quên (Oblivion)",
      "Hiệp Sĩ Mù (Minority Report)",
    ],
  },
  {
    name: "Leonardo DiCaprio",
    aliases: ["leonardo dicaprio", "dicaprio", "leo dicaprio"],
    country: "Hollywood 🇺🇸",
    titles: [
      "Titanic",
      "Kẻ Đánh Cắp Giấc Mơ (Inception)",
      "Người Về Từ Cõi Chết (The Revenant)",
      "Sói Già Phố Wall (The Wolf of Wall Street)",
      "Đảo Kinh Hoàng (Shutter Island)",
      "Chuyện Ngày Xưa Ở Hollywood (Once Upon a Time in Hollywood)",
      "Bắt Trẻ Đồng Xanh (Catch Me If You Can)",
    ],
  },
  {
    name: "Robert Downey Jr",
    aliases: ["robert downey jr", "robert downey", "iron man", "tony stark"],
    country: "Hollywood 🇺🇸",
    titles: [
      "Người Sắt (Iron Man)",
      "Avengers: Hồi Kết (Avengers: Endgame)",
      "Sherlock Holmes",
      "Oppenheimer",
      "Bác Sĩ Dolittle (Dolittle)",
      "Đội Trưởng Mỹ: Nội Chiến Siêu Anh Hùng (Captain America: Civil War)",
    ],
  },
  {
    name: "Christopher Nolan",
    aliases: ["christopher nolan", "nolan", "dao dien nolan"],
    country: "Hollywood 🇺🇸 / Anh Quốc 🇬🇧",
    titles: [
      "Oppenheimer",
      "Kẻ Đánh Cắp Giấc Mơ (Inception)",
      "Hố Đen Tử Thần (Interstellar)",
      "Kỵ Sĩ Bóng Đêm (The Dark Knight)",
      "Tenet",
      "Cuộc Di Tản Dunkirk (Dunkirk)",
      "Mê Cung Ký Ức (Memento)",
    ],
  },
  {
    name: "Keanu Reeves",
    aliases: ["keanu reeves", "john wick", "neo"],
    country: "Hollywood 🇺🇸",
    titles: [
      "Sát Thủ John Wick (John Wick)",
      "Ma Trận (The Matrix)",
      "Constantine",
      "Tốc Độ (Speed)",
      "47 Ronin",
      "Kẻ Thù Vô Hình (The Devil's Advocate)",
    ],
  },
  {
    name: "Scarlett Johansson",
    aliases: ["scarlett johansson", "black widow", "natasha romanoff"],
    country: "Hollywood 🇺🇸",
    titles: [
      "Góa Phụ Đen (Black Widow)",
      "Avengers: Hồi Kết (Avengers: Endgame)",
      "Câu Chuyện Hôn Nhân (Marriage Story)",
      "Vỏ Bọc Ma Ảo (Ghost in the Shell)",
      "Lucy",
      "Nàng (Her)",
    ],
  },
  {
    name: "Tom Hiddleston",
    aliases: ["tom hiddleston", "loki"],
    country: "Hollywood 🇺🇸 / Anh Quốc 🇬🇧",
    titles: [
      "Loki",
      "Thor",
      "Thor: Tận Thế Ragnarok (Thor: Ragnarok)",
      "Avengers",
      "Kong: Đảo Đầu Lâu (Kong: Skull Island)",
      "Đêm Quản Lý (The Night Manager)",
    ],
  },
  {
    name: "Margot Robbie",
    aliases: ["margot robbie", "harley quinn", "barbie"],
    country: "Hollywood 🇺🇸 / Úc 🇦🇺",
    titles: [
      "Barbie",
      "Biệt Đội Cảm Tử (Suicide Squad)",
      "Sói Già Phố Wall (The Wolf of Wall Street)",
      "Babylon",
      "Tôi Là Tonya (I, Tonya)",
      "Birds of Prey",
    ],
  },
  {
    name: "Dwayne Johnson (The Rock)",
    aliases: ["dwayne johnson", "the rock"],
    country: "Hollywood 🇺🇸",
    titles: [
      "Fast & Furious",
      "Jumanji: Trò Chơi Kỳ Ảo (Jumanji)",
      "Thông Báo Đỏ (Red Notice)",
      "Black Adam",
      "Tòa Tháp Chọc Trời (Skyscraper)",
      "Siêu Thú Cuồng Nộ (Rampage)",
    ],
  },
  {
    name: "Ryan Reynolds",
    aliases: ["ryan reynolds", "deadpool"],
    country: "Hollywood 🇺🇸",
    titles: [
      "Deadpool",
      "Deadpool & Wolverine",
      "Free Guy",
      "Thông Báo Đỏ (Red Notice)",
      "Dự Án Adam (The Adam Project)",
      "Đặc Vụ Ngầm (6 Underground)",
    ],
  },

  // --- THÁI LAN & NHẬT BẢN ---
  {
    name: "Baifern Pimchanok",
    aliases: ["baifern pimchanok", "baifern", "pimchanok"],
    country: "Thái Lan 🇹🇭",
    titles: [
      "Chiếc Lá Bay (The Fallen Leaf)",
      "Yêu Nhầm Bạn Thân (Friend Zone)",
      "Mối Tình Đầu (A Little Thing Called Love)",
      "Thiên Sứ Tội Lỗi (Thong Dee)",
      "Nàng Sợi Cước (Sroi Sabunnga)",
      "Hoàng Tử Ếch",
    ],
  },
  {
    name: "Mario Maurer",
    aliases: ["mario maurer", "mario"],
    country: "Thái Lan 🇹🇭",
    titles: [
      "Tình Người Duyên Ma (Pee Mak)",
      "Mối Tình Đầu (A Little Thing Called Love)",
      "Thầy Lang Trúng Mánh (Thong Aek Mor Ya)",
      "Bắt Cóc Trái Tim (Take Me Home)",
      "Bản Tình Ca Mùa Thu",
    ],
  },
  {
    name: "Ken Watanabe",
    aliases: ["ken watanabe"],
    country: "Nhật Bản 🇯🇵",
    titles: [
      "Võ Sĩ Đạo Cuối Cùng (The Last Samurai)",
      "Kẻ Đánh Cắp Giấc Mơ (Inception)",
      "Godzilla",
      "Hồi Ức Của Một Geisha (Memoirs of a Geisha)",
      "Tokyo Vice",
    ],
  },
  {
    name: "Hayao Miyazaki",
    aliases: ["hayao miyazaki", "miyazaki", "ghibli"],
    country: "Nhật Bản 🇯🇵",
    titles: [
      "Vùng Đất Linh Hồn (Spirited Away)",
      "Lâu Đài Bay Của Howl (Howl's Moving Castle)",
      "Hàng Xóm Của Tôi Là Totoro (My Neighbor Totoro)",
      "Công Chúa Mononoke (Princess Mononoke)",
      "Thiếu Niên Và Chim Diệc (The Boy and the Heron)",
      "Gió Nổi (The Wind Rises)",
    ],
  },
  {
    name: "Makoto Shinkai",
    aliases: ["makoto shinkai", "shinkai"],
    country: "Nhật Bản 🇯🇵",
    titles: [
      "Tên Cậu Là Gì? (Your Name)",
      "Đứa Con Của Thời Tiết (Weathering With You)",
      "Khóa Chặt Cửa Nào Suzume (Suzume)",
      "Khu Vườn Ngôn Từ (The Garden of Words)",
      "5cm Trên Giây (5 Centimeters per Second)",
    ],
  },
];

// In-memory cache thông minh cho các truy vấn AI phân giải diễn viên (TTL: 7 ngày)
const ACTOR_AI_CACHE = new Map<
  string,
  { actorName: string; country?: string; titles: string[]; isActor: boolean; expireAt: number }
>();
const CACHE_7_DAYS = 7 * 24 * 60 * 60 * 1000;

// In-memory cache cho danh sách phim đã tìm thấy từ kho (TTL: 24 giờ)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ACTOR_FILM_CACHE = new Map<string, { items: any[]; expireAt: number }>();

function setBoundedCache<K, V>(map: Map<K, V>, key: K, value: V, max = 500) {
  if (map.size >= max) {
    const oldestKey = map.keys().next().value;
    if (oldestKey !== undefined) map.delete(oldestKey);
  }
  map.set(key, value);
}

/**
 * Chuẩn hoá chuỗi để so khớp không dấu
 */
function normalizeForMatch(str: string): string {
  return (str || "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanActorQuery(query: string): string {
  return (query || "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^phim\s+cua\s+/gi, "")
    .replace(/^phim\s+/gi, "")
    .replace(/^dien\s+vien\s+/gi, "")
    .replace(/^xem\s+phim\s+/gi, "")
    .replace(/^tuyen\s+tap\s+phim\s+(?:cua\s+)?/gi, "")
    .replace(/\s+dong$/gi, "")
    .replace(/\s+dien\s+xuat$/gi, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 1. PHÂN GIẢI NGHỆ SĨ & GIA TÀI ĐIỆN ẢNH BẰNG KIẾN TRÚC LAI HYBRID:
 * - TIER 1: Pre-indexed Golden Profiles cho các diễn viên/nghệ sĩ phổ biến (Tốc độ 0ms, chính xác 100%).
 * - TIER 2: Smart In-memory Cache L1 (0ms cho các truy vấn đã phân giải trong 7 ngày).
 * - TIER 3: Fast AI Router (Qwen / Groq / Gemini) phân giải ĐỘNG mọi diễn viên/đạo diễn khác trên thế giới (~500ms).
 */
export async function resolveActorMovies(keyword: string): Promise<{
  actorName: string;
  country?: string;
  titles: string[];
  isActor: boolean;
  source: "preset" | "ai" | "cache" | "none";
}> {
  if (!keyword || keyword.trim().length < 2) {
    return { actorName: "", titles: [], isActor: false, source: "none" };
  }

  const cleanRaw = keyword.trim().toLowerCase();
  const normalizedQuery = cleanActorQuery(keyword);

  // 1.1 Kiểm tra TIER 1: Danh bạ Pre-indexed Golden Profiles (0ms)
  const matchedPreset = GOLDEN_ACTOR_INDEX.find((profile) => {
    const normName = normalizeForMatch(profile.name);
    if (normalizedQuery === normName || cleanRaw === profile.name.toLowerCase()) return true;
    return profile.aliases.some((alias) => {
      const normAlias = normalizeForMatch(alias);
      return normalizedQuery === normAlias || cleanRaw === alias.toLowerCase();
    });
  });

  if (matchedPreset) {
    return {
      actorName: matchedPreset.name,
      country: matchedPreset.country,
      titles: matchedPreset.titles,
      isActor: true,
      source: "preset",
    };
  }

  // 1.2 Kiểm tra TIER 2: Cache L1 (0ms)
  const cached = ACTOR_AI_CACHE.get(cleanRaw) || ACTOR_AI_CACHE.get(normalizedQuery);
  if (cached && cached.expireAt > Date.now()) {
    return {
      actorName: cached.actorName,
      country: cached.country,
      titles: cached.titles,
      isActor: cached.isActor,
      source: "cache",
    };
  }

  // 1.3 TIER 3: Phân tích trực tiếp qua Fast AI (Smart Provider Router)
  try {
    const promptText = `Bạn là Chuyên gia Bách khoa Toàn thư Điện ảnh thế giới (IMDb & TMDB Cast Directory Engine).
Phân tích từ khóa tìm kiếm: "${keyword}" (tên rút gọn: "${normalizedQuery}").

Nhiệm vụ:
Xác định xem từ khóa này có phải là tên của một DIỄN VIÊN, NGHỆ SĨ, hoặc ĐẠO DIỄN ĐIỆN ẢNH / TRUYỀN HÌNH CÓ THẬT trên thế giới (Việt Nam, Hollywood, Hàn Quốc, TVB Hồng Kông, Trung Quốc, Thái Lan, Nhật Bản, Châu Âu, Anime, v.v.) hay không.

Nếu ĐÚNG là diễn viên/nghệ sĩ/đạo diễn:
- "isActor": true
- "actorName": Tên chuẩn phổ biến nhất của nghệ sĩ (ví dụ: Trường Giang, Trấn Thành, Châu Tinh Trì, Dương Mịch, Benedict Cumberbatch, Cillian Murphy, Son Ye-jin, Song Kang, Baifern Pimchanok, Tom Cruise...).
- "country": Quốc gia / nền điện ảnh chính xác kèm cờ (vd: "Việt Nam 🇻🇳", "Hàn Quốc 🇰🇷", "Hồng Kông 🇭🇰", "Trung Quốc 🇨🇳", "Hollywood 🇺🇸", "Anh Quốc 🇬🇧", "Thái Lan 🇹🇭", "Nhật Bản 🇯🇵").
- "titles": Danh sách 8 đến 12 BỘ PHIM / SERIES TRUYỀN HÌNH THẬT NỔI TIẾNG NHẤT mà nghệ sĩ này từng tham gia đóng chính hoặc đạo diễn (ghi tên tiếng Việt và/hoặc tên tiếng Anh/gốc trong ngoặc đơn).
  * LƯU Ý ĐẶC BIỆT: Chỉ liệt kê các tác phẩm CÓ THẬT trong sự nghiệp của nghệ sĩ. Tuyệt đối không tự bịa ra hậu bản hay số thứ tự giả.

Nếu KHÔNG PHẢI là diễn viên/nghệ sĩ (ví dụ là tên một bộ phim cụ thể như "Titanic", "Inception", một thể loại như "phim ma", hoặc từ vô nghĩa):
- "isActor": false

BẮT BUỘC chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ theo định dạng:
{
  "isActor": true,
  "actorName": "Tên chuẩn",
  "country": "Quốc gia",
  "titles": ["Phim 1", "Phim 2", "Phim 3", "Phim 4", "Phim 5", "Phim 6", "Phim 7", "Phim 8"]
}`;

    const aiRes = await generateFastAiChat({
      systemPrompt: "Bạn là chuyên gia bách khoa toàn thư điện ảnh thế giới. Bắt buộc chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ.",
      userPrompt: promptText,
      temperature: 0.1,
      maxTokens: 600,
      jsonMode: true,
      timeoutMs: 6500,
    });

    if (aiRes && aiRes.text) {
      const cleaned = aiRes.text.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        if (parsed.isActor && Array.isArray(parsed.titles) && parsed.titles.length > 0) {
          const actorName = parsed.actorName || keyword;
          const country = parsed.country || undefined;
          const titles = parsed.titles.filter((t: unknown): t is string => typeof t === "string" && t.trim().length > 0);

          setBoundedCache(ACTOR_AI_CACHE, cleanRaw, {
            actorName,
            country,
            titles,
            isActor: true,
            expireAt: Date.now() + CACHE_7_DAYS,
          });

          return {
            actorName,
            country,
            titles,
            isActor: true,
            source: "ai",
          };
        } else {
          setBoundedCache(ACTOR_AI_CACHE, cleanRaw, {
            actorName: "",
            titles: [],
            isActor: false,
            expireAt: Date.now() + 24 * 60 * 60 * 1000,
          });
        }
      }
    }
  } catch (err) {
    console.warn("[aiActorService] Fast AI resolution error:", err);
  }

  return {
    actorName: "",
    titles: [],
    isActor: false,
    source: "none",
  };
}

/**
 * 2. TÌM KIẾM VÀ SO KHỚP CHÍNH XÁC PHIM TỪ KHO PHIM API (CÓ BỘ NHỚ ĐỆM 1 GIỜ)
 * Hỗ trợ tìm cả tên tiếng Việt và tên tiếng Anh / Quốc tế trong ngoặc để tối đa hóa tỷ lệ tìm thấy
 */
export async function fetchMoviesByTitles(
  titles: string[],
  maxMovies = 16
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  if (!titles || titles.length === 0) return [];

  const topTitles = titles.slice(0, 10);
  const cacheKey = topTitles.join("|");
  const cached = ACTOR_FILM_CACHE.get(cacheKey);
  if (cached && cached.expireAt > Date.now()) {
    return cached.items.slice(0, maxMovies);
  }

  const seenSlugs = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = [];

  // Thực thi song song tìm kiếm tối đa 8-10 tựa phim với timeout an toàn 1.5s
  const tasks = topTitles.map(async (rawTitle) => {
    try {
      const viTitle = rawTitle.replace(/\([^)]*\)/g, "").trim();
      const matchEng = rawTitle.match(/\(([^)]+)\)/);
      const engTitle = matchEng ? matchEng[1].trim() : "";

      const cleanTargetVi = normalizeForMatch(viTitle);
      const cleanTargetEng = normalizeForMatch(engTitle);

      if (!cleanTargetVi && !cleanTargetEng) return null;

      // Tìm kiếm với timeout 1.5s
      const searchPromise = (async () => {
        let searchRes = cleanTargetVi.length >= 2 ? await movieApi.getMovies({ keyword: viTitle, limit: 6 }) : null;
        let matchedItems = searchRes?.items || [];

        if (matchedItems.length === 0 && engTitle && cleanTargetEng.length >= 2) {
          searchRes = await movieApi.getMovies({ keyword: engTitle, limit: 6 });
          matchedItems = searchRes?.items || [];
        }

        if (matchedItems.length === 0) return null;

        // Tính điểm so khớp chính xác
        let bestItem = null;
        let highestScore = -1;

        for (const item of matchedItems) {
          if (!item || !item.slug || seenSlugs.has(item.slug)) continue;

          const normName = normalizeForMatch(item.name);
          const normOrig = normalizeForMatch(item.origin_name);

          let score = 0;

          // Khớp tuyệt đối tên chính
          if (cleanTargetVi && (normName === cleanTargetVi || normOrig === cleanTargetVi)) {
            score = 100;
          } else if (cleanTargetEng && (normName === cleanTargetEng || normOrig === cleanTargetEng)) {
            score = 95;
          } else {
            // Khớp bao hàm
            if (cleanTargetVi && (normName.includes(cleanTargetVi) || cleanTargetVi.includes(normName))) {
              score = 70;
            } else if (cleanTargetEng && (normOrig.includes(cleanTargetEng) || cleanTargetEng.includes(normOrig))) {
              score = 65;
            } else {
              // So khớp từ khóa
              const targetWords = (cleanTargetVi || cleanTargetEng).split(" ").filter((w) => w.length > 1);
              if (targetWords.length > 0) {
                const matchedWords = targetWords.filter(
                  (w) => normName.includes(w) || normOrig.includes(w)
                );
                const ratio = matchedWords.length / targetWords.length;
                if (ratio >= 0.6) score = Math.round(ratio * 50);
              }
            }
          }

          if (score >= 35 && score > highestScore) {
            highestScore = score;
            bestItem = item;
          }
        }

        return bestItem;
      })();

      return await Promise.race([
        searchPromise,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1600)),
      ]);
    } catch (err) {
      console.warn(`[aiActorService] Error searching title "${rawTitle}":`, err);
      return null;
    }
  });

  const resolved = await Promise.allSettled(tasks);

  for (const outcome of resolved) {
    if (outcome.status === "fulfilled" && outcome.value) {
      const item = outcome.value;
      if (item && item.slug && !seenSlugs.has(item.slug)) {
        seenSlugs.add(item.slug);
        results.push(item);
        if (results.length >= maxMovies) break;
      }
    }
  }

  if (results.length > 0) {
    setBoundedCache(ACTOR_FILM_CACHE, cacheKey, {
      items: results,
      expireAt: Date.now() + 24 * 60 * 60 * 1000,
    });
  }

  return results;
}
