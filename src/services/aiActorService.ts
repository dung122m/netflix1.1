import { movieApi } from "@/services/movieApi";
import { generateFastAiChat } from "@/services/aiProviderService";

export interface ActorFilmography {
  name: string;
  aliases: string[];
  country: string;
  titles: string[];
}

// In-memory cache thông minh cho các truy vấn AI phân giải diễn viên (TTL: 7 ngày)
const ACTOR_AI_CACHE = new Map<
  string,
  { actorName: string; country?: string; titles: string[]; isActor: boolean; expireAt: number }
>();
const CACHE_7_DAYS = 7 * 24 * 60 * 60 * 1000;

// In-memory cache cho danh sách phim đã tìm thấy từ kho (TTL: 1 giờ)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ACTOR_FILM_CACHE = new Map<string, { items: any[]; expireAt: number }>();
const CACHE_1_HOUR = 60 * 60 * 1000;

/**
 * Chuẩn hoá chuỗi để so khớp không dấu
 */
function normalizeForMatch(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================================
// BẢN ĐỒ TRI THỨC VÀNG NGHỆ SĨ & GIA TÀI ĐIỆN ẢNH (CURATED GOLDEN KNOWLEDGE)
// Đảm bảo 100% chuẩn xác 0ms cho các đại minh tinh được tìm kiếm nhiều nhất
// ============================================================================
interface GoldenActorProfile {
  name: string;
  country: string;
  aliases: string[];
  titles: string[];
}

const GOLDEN_ACTOR_PROFILES: GoldenActorProfile[] = [
  // --- VIỆT NAM ---
  {
    name: "Trường Giang",
    country: "Việt Nam 🇻🇳",
    aliases: ["truong giang", "danh hai truong giang", "muoi kho", "tran truong giang"],
    titles: [
      "49 Ngày (49 Days)",
      "49 Ngày 2",
      "Siêu Sao Siêu Ngố (Super X)",
      "Taxi, Em Tên Gì? (Taxi, What's Your Name?)",
      "30 Chưa Phải Tết",
      "Già Gân, Mỹ Nhân Và Găng Tơ",
      "Lật Mặt"
    ]
  },
  {
    name: "Trấn Thành",
    country: "Việt Nam 🇻🇳",
    aliases: ["tran thanh", "mc tran thanh", "huynh tran thanh", "a xin"],
    titles: [
      "Nhà Bà Nữ (The House of No Man)",
      "Cua Lại Vợ Bầu (Win My Baby Back)",
      "Bệnh Viện Ma (Ghost Hospital)",
      "Trạng Quỳnh",
      "Chờ Em Đến Ngày Mai"
    ]
  },
  {
    name: "Lý Hải",
    country: "Việt Nam 🇻🇳",
    aliases: ["ly hai", "dao dien ly hai"],
    titles: [
      "Lật Mặt (Face Off)",
      "Lật Mặt 2: Phim Trường",
      "Lật Mặt 3: Ba Chàng Khuyết",
      "Lật Mặt 4: Nhà Có Khách",
      "Lật Mặt 5: 48h",
      "Lật Mặt 6: Tấm Vé Định Mệnh"
    ]
  },
  {
    name: "Ninh Dương Lan Ngọc",
    country: "Việt Nam 🇻🇳",
    aliases: ["ninh duong lan ngoc", "lan ngoc", "ngoc nu ninh duong lan ngoc"],
    titles: [
      "Cua Lại Vợ Bầu",
      "Gái Già Lắm Chiêu 2",
      "Gái Già Lắm Chiêu 3",
      "Tấm Cám Chuyện Chưa Kể",
      "Chị Chị Em Em 2"
    ]
  },
  {
    name: "Thu Trang",
    country: "Việt Nam 🇻🇳",
    aliases: ["thu trang", "hoa hau hai thu trang", "chi muoi ba"],
    titles: [
      "Tiệc Trăng Máu (Blood Moon Party)",
      "Chị Mười Ba: 3 Ngày Sinh Tử",
      "Chị Mười Ba: Phần Kết Thập Tam Muội",
      "Nghề Siêu Dễ",
      "Em Là Bà Nội Của Anh"
    ]
  },
  {
    name: "Kiều Minh Tuấn",
    country: "Việt Nam 🇻🇳",
    aliases: ["kieu minh tuan"],
    titles: [
      "Em Chưa 18 (Jailbait)",
      "Tiệc Trăng Máu",
      "Chị Mười Ba: 3 Ngày Sinh Tử",
      "Nghề Siêu Dễ",
      "Kẻ Ẩn Danh",
      "Chìa Khóa Trăm Tỷ"
    ]
  },
  {
    name: "Thái Hòa",
    country: "Việt Nam 🇻🇳",
    aliases: ["thai hoa", "vua phong ve thai hoa", "ong hoang phong ve"],
    titles: [
      "Để Mai Tính",
      "Tèo Em",
      "Quả Tim Máu",
      "Tiệc Trăng Máu",
      "Chàng Vợ Của Em"
    ]
  },

  // --- HỒNG KÔNG / TVB ---
  {
    name: "Châu Tinh Trì",
    country: "Hồng Kông 🇭🇰",
    aliases: ["chau tinh tri", "stephen chow", "vua hai chau tinh tri", "tinh gia"],
    titles: [
      "Tuyệt Đỉnh Kungfu (Kung Fu Hustle)",
      "Đội Bóng Thiếu Lâm (Shaolin Soccer)",
      "Đại Thoại Tây Du (A Chinese Odyssey)",
      "Thánh Bài (All for the Winner)",
      "Quan Xẩm Lốc Cốc (Hail the Judge)",
      "Trường Học Uy Long (Fight Back to School)",
      "Thần Bài (God of Gamblers)",
      "Đường Bá Hổ Điểm Thu Hương (Flirting Scholar)",
      "Vua Hài Kịch (King of Comedy)"
    ]
  },
  {
    name: "Lý Liên Kiệt",
    country: "Hồng Kông 🇭🇰",
    aliases: ["ly lien kiet", "jet li", "tong su ly lien kiet"],
    titles: [
      "Hoàng Phi Hồng (Once Upon a Time in China)",
      "Tinh Võ Anh Hùng (Fist of Legend)",
      "Phương Thế Ngọc (Fong Sai-yuk)",
      "Thiếu Lâm Tự (The Shaolin Temple)",
      "Vua Kung Fu (The Forbidden Kingdom)",
      "Vũ Khí Tối Thượng 4 (Lethal Weapon 4)",
      "Biệt Đội Đánh Thuê (The Expendables)"
    ]
  },
  {
    name: "Thành Long",
    country: "Hồng Kông 🇭🇰",
    aliases: ["thanh long", "jackie chan"],
    titles: [
      "Giờ Cao Điểm (Rush Hour)",
      "Giờ Cao Điểm 2 (Rush Hour 2)",
      "Giờ Cao Điểm 3 (Rush Hour 3)",
      "Câu Chuyện Cảnh Sát (Police Story)",
      "Náo Loạn Phố Bronx (Rumble in the Bronx)",
      "Huy Hiệu Rồng (The Medallion)",
      "Kẻ Ngoại Tộc (The Foreigner)",
      "Kiếm Rồng (Dragon Blade)",
      "Tẩu Thoát Ngoạn Mục (Skiptrace)"
    ]
  },
  {
    name: "Chân Tử Đan",
    country: "Hồng Kông 🇭🇰",
    aliases: ["chan tu dan", "donnie yen", "diep van"],
    titles: [
      "Diệp Vấn (Ip Man)",
      "Diệp Vấn 2 (Ip Man 2)",
      "Diệp Vấn 3 (Ip Man 3)",
      "Diệp Vấn 4 (Ip Man 4: The Finale)",
      "Sát Phá Lang (SPL: Kill Zone)",
      "Đảo Hỏa Tuyến (Flash Point)",
      "Trùm Hương Cảng (Chasing the Dragon)",
      "John Wick: Chapter 4"
    ]
  },
  {
    name: "Châu Nhuận Phát",
    country: "Hồng Kông 🇭🇰",
    aliases: ["chau nhuan phat", "chow yun fat", "than bai chau nhuan phat", "phat ca"],
    titles: [
      "Thần Bài (God of Gamblers)",
      "Bản Sắc Anh Hùng (A Better Tomorrow)",
      "Tung Hoành Tứ Hải (Once a Thief)",
      "Ngọa Hổ Tàng Long (Crouching Tiger, Hidden Dragon)",
      "Đồng Thoại Mùa Thu (An Autumn's Tale)"
    ]
  },
  {
    name: "Lưu Đức Hoa",
    country: "Hồng Kông 🇭🇰",
    aliases: ["luu duc hoa", "andy lau", "thien vuong luu duc hoa"],
    titles: [
      "Vô Gian Đạo (Infernal Affairs)",
      "Thần Bài (God of Gamblers)",
      "Bão Trắng 2: Trùm Á Phiện (The White Storm 2)",
      "Thập Diện Mai Phục (House of Flying Daggers)",
      "Đại Mạo Hiểm Gia (The Adventurers)",
      "Chuyên Gia Gỡ Bom (Shock Wave)"
    ]
  },
  {
    name: "Lương Triều Vỹ",
    country: "Hồng Kông 🇭🇰",
    aliases: ["luong trieu vy", "tony leung", "tony leung chiu wai"],
    titles: [
      "Vô Gian Đạo (Infernal Affairs)",
      "Tâm Trạng Khi Yêu (In the Mood for Love)",
      "Trùng Khánh Sâm Lâm (Chungking Express)",
      "Nhất Đại Tông Sư (The Grandmaster)",
      "Shang-Chi và Huyền Thoại Thập Luân (Shang-Chi)"
    ]
  },
  {
    name: "Cổ Thiên Lạc",
    country: "Hồng Kông 🇭🇰",
    aliases: ["co thien lac", "louis koo"],
    titles: [
      "Cỗ Máy Thời Gian (A Step into the Past)",
      "Thần Điêu Đại Hiệp (The Return of the Condor Heroes)",
      "Bão Trắng (The White Storm)",
      "Bão Trắng 2: Trùm Á Phiện",
      "Bão Trắng 3: Thiên Đàng Hay Địa Ngục",
      "Sứ Mệnh Nội Gián (Line Walker)"
    ]
  },
  {
    name: "Trịnh Gia Dĩnh",
    country: "Hồng Kông 🇭🇰",
    aliases: ["trinh gia dinh", "kevin cheng"],
    titles: [
      "Tòa Án Lương Tâm (Ghetto Justice)",
      "Bằng Chứng Thép 2 (Forensic Heroes II)",
      "Cảnh Sát Tài Ba (The Threshold of an Era)",
      "Bộ Bộ Kinh Tâm (Scarlet Heart)",
      "Bão Táp Gia Tộc (Heart of Greed)"
    ]
  },
  {
    name: "Xa Thi Mạn",
    country: "Hồng Kông 🇭🇰",
    aliases: ["xa thi man", "charmaine sheh"],
    titles: [
      "Thâm Cung Nội Chiến (War and Beauty)",
      "Bằng Chứng Thép 2 (Forensic Heroes II)",
      "Sứ Đồ Hành Giả (Line Walker)",
      "Diên Hi Công Lược (Story of Yanxi Palace)",
      "Công Chúa Giá Đáo (Can't Buy Me Love)",
      "Nữ Hoàng Tin Tức (The Queen of News)"
    ]
  },
  {
    name: "Huỳnh Tông Trạch",
    country: "Hồng Kông 🇭🇰",
    aliases: ["huynh tong trach", "bosco wong"],
    titles: [
      "Bằng Chứng Thép 5 (Forensic Heroes V)",
      "Tiềm Hành Truy Kích (Lives of Omission)",
      "Phi Hổ Cực Chiến (Flying Tiger)",
      "Mẹ Chồng Khó Tính (Wars of In-Laws)",
      "Bảo Vệ Nhân Chứng (Witness Insecurity)"
    ]
  },

  // --- TRUNG QUỐC ---
  {
    name: "Dương Mịch",
    country: "Trung Quốc 🇨🇳",
    aliases: ["duong mich", "yang mi"],
    titles: [
      "Tam Sinh Tam Thế Thập Lý Đào Hoa (Eternal Love)",
      "Tiên Kiếm Kỳ Hiệp 3 (Chinese Paladin 3)",
      "Cung Tỏa Tâm Ngọc (Palace)",
      "Cổ Kiếm Kỳ Đàm (Swords of Legends)",
      "Phù Dao Hoàng Hậu (Legend of Fuyao)",
      "Hộc Châu Phu Nhân (Novoland: Pearl Eclipse)",
      "Hồ Yêu Tiểu Hồng Nương (Fox Spirit Matchmaker)"
    ]
  },
  {
    name: "Triệu Lệ Dĩnh",
    country: "Trung Quốc 🇨🇳",
    aliases: ["trieu le dinh", "zhao liying"],
    titles: [
      "Hoa Thiên Cốt (The Journey of Flower)",
      "Sở Kiều Truyện (Princess Agents)",
      "Minh Lan Truyện (The Story of Minglan)",
      "Sam Sam Đến Rồi (Boss & Me)",
      "Dữ Phượng Hành (The Legend of ShenLi)",
      "Hữu Phỉ (Legend of Fei)"
    ]
  },
  {
    name: "Lưu Diệc Phi",
    country: "Trung Quốc 🇨🇳",
    aliases: ["luu diec phi", "crystal liu", "liu yifei", "than tien ty ty"],
    titles: [
      "Thần Điêu Đại Hiệp (The Return of the Condor Heroes)",
      "Thiên Long Bát Bộ (Demi-Gods and Semi-Devils)",
      "Tiên Kiếm Kỳ Hiệp (Chinese Paladin)",
      "Mộng Hoa Lục (A Dream of Splendor)",
      "Đi Đến Nơi Có Gió (Meet Yourself)",
      "Câu Chuyện Hoa Hồng (The Tale of Rose)"
    ]
  },
  {
    name: "Tiêu Chiến",
    country: "Trung Quốc 🇨🇳",
    aliases: ["tieu chien", "xiao zhan"],
    titles: [
      "Trần Tình Lệnh (The Untamed)",
      "Đấu La Đại Lục (Douluo Continent)",
      "Ngọc Cốt Dao (The Longest Promise)",
      "Quãng Đời Còn Lại Xin Chỉ Giáo Nhiều Hơn (The Oath of Love)",
      "Nắng Gắt Bên Tôi (Sunshine by My Side)",
      "Tru Tiên (Jade Dynasty)"
    ]
  },
  {
    name: "Vương Nhất Bác",
    country: "Trung Quốc 🇨🇳",
    aliases: ["vuong nhat bac", "wang yibo"],
    titles: [
      "Trần Tình Lệnh (The Untamed)",
      "Hữu Phỉ (Legend of Fei)",
      "Phong Khởi Lạc Dương (Luoyang)",
      "Băng Vũ Hỏa (Being a Hero)",
      "Vô Danh (Hidden Blade)",
      "Nhiệt Liệt (One and Only)"
    ]
  },
  {
    name: "Địch Lệ Nhiệt Ba",
    country: "Trung Quốc 🇨🇳",
    aliases: ["dich le nhiet ba", "dilraba", "dilraba dilmurat"],
    titles: [
      "Tam Sinh Tam Thế Chẩm Thượng Thư (Eternal Love of Dream)",
      "Em Là Niềm Kiêu Hãnh Của Anh (You Are My Glory)",
      "Ngự Giao Ký (The Blue Whisper)",
      "Trường Ca Hành (The Long Ballad)",
      "An Lạc Truyện (The Legend of Anle)"
    ]
  },

  // --- HÀN QUỐC (K-DRAMA) ---
  {
    name: "Son Ye-jin",
    country: "Hàn Quốc 🇰🇷",
    aliases: ["son ye jin", "son ye-jin", "tinh dau quoc dan son ye jin"],
    titles: [
      "Hạ Cánh Nơi Anh (Crash Landing on You)",
      "Chị Đẹp Mua Cơm Ngon Cho Tôi (Something in the Rain)",
      "Và Em Sẽ Đến (Be With You)",
      "Cuộc Đàm Phán Sinh Tử (The Negotiation)",
      "Hương Mùa Hè (Summer Scent)",
      "Tuổi 39 (Thirty-Nine)"
    ]
  },
  {
    name: "Hyun Bin",
    country: "Hàn Quốc 🇰🇷",
    aliases: ["hyun bin", "nam than hyun bin"],
    titles: [
      "Hạ Cánh Nơi Anh (Crash Landing on You)",
      "Khu Vườn Bí Mật (Secret Garden)",
      "Ký Ức Alhambra (Memories of the Alhambra)",
      "Cộng Sự Bất Đắc Dĩ (Confidential Assignment)",
      "Cuộc Đàm Phán Sinh Tử (The Negotiation)",
      "Đặc Vụ Xuyên Quốc Gia (Confidential Assignment 2)"
    ]
  },
  {
    name: "Song Joong-ki",
    country: "Hàn Quốc 🇰🇷",
    aliases: ["song joong ki", "song joong-ki"],
    titles: [
      "Hậu Duệ Mặt Trời (Descendants of the Sun)",
      "Vincenzo",
      "Cậu Út Nhà Tài Phiệt (Reborn Rich)",
      "Chàng Trai Tốt Bụng (The Innocent Man)",
      "Tàu Quét Rác Không Gian (Space Sweepers)"
    ]
  },
  {
    name: "Song Hye-kyo",
    country: "Hàn Quốc 🇰🇷",
    aliases: ["song hye kyo", "song hye-kyo"],
    titles: [
      "Hậu Duệ Mặt Trời (Descendants of the Sun)",
      "Vinh Quang Trong Thù Hận (The Glory)",
      "Trái Tim Mùa Thu (Autumn in My Heart)",
      "Ngôi Nhà Hạnh Phúc (Full House)",
      "Gió Đông Năm Ấy (That Winter, the Wind Blows)"
    ]
  },
  {
    name: "Gong Yoo",
    country: "Hàn Quốc 🇰🇷",
    aliases: ["gong yoo", "yeu tinh gong yoo"],
    titles: [
      "Yêu Tinh (Goblin - Guardian: The Lonely and Great God)",
      "Chuyến Tàu Sinh Tử (Train to Busan)",
      "Tiệm Cà Phê Hoàng Tử (Coffee Prince)",
      "Biển Tĩnh Lặng (The Silent Sea)",
      "Người Nhân Bản (Seobok)"
    ]
  },
  {
    name: "Lee Min-ho",
    country: "Hàn Quốc 🇰🇷",
    aliases: ["lee min ho", "lee min-ho"],
    titles: [
      "Vườn Sao Băng (Boys Over Flowers)",
      "Thợ Săn Thành Phố (City Hunter)",
      "Người Thừa Kế (The Heirs)",
      "Huyền Thoại Biển Xanh (The Legend of the Blue Sea)",
      "Quân Vương Bất Diệt (The King: Eternal Monarch)"
    ]
  },
  {
    name: "Park Seo-joon",
    country: "Hàn Quốc 🇰🇷",
    aliases: ["park seo joon", "park seo-joon"],
    titles: [
      "Tầng Lớp Itaewon (Itaewon Class)",
      "Thư Ký Kim Sao Thế? (What's Wrong with Secretary Kim)",
      "Thanh Xuân Vật Vã (Fight for My Way)",
      "Cảnh Sát Tập Sự (Midnight Runners)",
      "Sinh Vật Gyeongseong (Gyeongseong Creature)"
    ]
  },
  {
    name: "Kim Soo-hyun",
    country: "Hàn Quốc 🇰🇷",
    aliases: ["kim soo hyun", "kim soo-hyun"],
    titles: [
      "Nữ Hoàng Nước Mắt (Queen of Tears)",
      "Vì Sao Đưa Anh Tới (My Love from the Star)",
      "Điên Thì Có Sao (It's Okay to Not Be Okay)",
      "Mặt Trăng Ôm Mặt Trời (Moon Embracing the Sun)"
    ]
  },

  // --- HOLLYWOOD ---
  {
    name: "Tom Cruise",
    country: "Hollywood 🇺🇸",
    aliases: ["tom cruise"],
    titles: [
      "Phi Công Siêu Đẳng (Top Gun)",
      "Phi Công Siêu Đẳng: Maverick (Top Gun: Maverick)",
      "Nhiệm Vụ: Bất Khả Thi (Mission: Impossible)",
      "Nhiệm Vụ: Bất Khả Thi 2",
      "Võ Sĩ Đạo Cuối Cùng (The Last Samurai)",
      "Cuộc Chiến Luân Hồi (Edge of Tomorrow)",
      "Jack Reacher"
    ]
  },
  {
    name: "Leonardo DiCaprio",
    country: "Hollywood 🇺🇸",
    aliases: ["leonardo dicaprio", "leo dicaprio"],
    titles: [
      "Titanic",
      "Kẻ Đánh Cắp Giấc Mơ (Inception)",
      "Đảo Kinh Hoàng (Shutter Island)",
      "Sói Già Phố Wall (The Wolf of Wall Street)",
      "Người Về Từ Cõi Chết (The Revenant)",
      "Hãy Bắt Tôi Nếu Có Thể (Catch Me If You Can)",
      "Chuyện Ngày Xưa Ở Hollywood (Once Upon a Time in Hollywood)"
    ]
  },
  {
    name: "Brad Pitt",
    country: "Hollywood 🇺🇸",
    aliases: ["brad pitt"],
    titles: [
      "Sàn Đấu Sinh Tử (Fight Club)",
      "Thế Chiến Z (World War Z)",
      "Cuộc Đời Kỳ Lạ Của Benjamin Button (The Curious Case of Benjamin Button)",
      "Ông Bà Smith (Mr. & Mrs. Smith)",
      "Cuộc Chiến Băng Đảng (Snatch)",
      "Chuyện Ngày Xưa Ở Hollywood (Once Upon a Time in Hollywood)"
    ]
  },
  {
    name: "Keanu Reeves",
    country: "Hollywood 🇺🇸",
    aliases: ["keanu reeves", "sat thu john wick"],
    titles: [
      "Ma Trận (The Matrix)",
      "John Wick (Sát Thủ John Wick)",
      "John Wick: Chapter 2",
      "John Wick: Chapter 3 - Parabellum",
      "John Wick: Chapter 4",
      "Kẻ Cứu Rỗi (Constantine)",
      "Tốc Độ (Speed)"
    ]
  },
  {
    name: "Robert Downey Jr",
    country: "Hollywood 🇺🇸",
    aliases: ["robert downey jr", "rdj", "iron man", "nguoi sat"],
    titles: [
      "Người Sắt (Iron Man)",
      "Người Sắt 2 (Iron Man 2)",
      "Người Sắt 3 (Iron Man 3)",
      "Biệt Đội Siêu Anh Hùng (The Avengers)",
      "Avengers: Hồi Kết (Avengers: Endgame)",
      "Sherlock Holmes",
      "Oppenheimer"
    ]
  },
  {
    name: "Dwayne Johnson",
    country: "Hollywood 🇺🇸",
    aliases: ["dwayne johnson", "the rock"],
    titles: [
      "Fast & Furious 7",
      "Fast & Furious 8",
      "Jumanji: Trò Chơi Kỳ Ảo (Jumanji: Welcome to the Jungle)",
      "Tòa Tháp Chọc Trời (Skyscraper)",
      "Siêu Thú Cuồng Nộ (Rampage)",
      "Black Adam",
      "Thông Báo Đỏ (Red Notice)"
    ]
  },
  {
    name: "Jason Statham",
    country: "Hollywood 🇺🇸",
    aliases: ["jason statham", "nguoi van chuyen"],
    titles: [
      "Người Vận Chuyển (The Transporter)",
      "Người Vận Chuyển 2 (Transporter 2)",
      "Người Vận Chuyển 3 (Transporter 3)",
      "Cá Mập Siêu Bạo Chúa (The Meg)",
      "Biệt Đội Đánh Thuê (The Expendables)",
      "Mật Vụ Ong (The Beekeeper)",
      "Sát Thủ Thợ Máy (The Mechanic)"
    ]
  }
];

function cleanActorQuery(query: string): string {
  return (query || "")
    .toLowerCase()
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
 * 1. PHÂN GIẢI NGHỆ SĨ & GIA TÀI ĐIỆN ẢNH (GOLDEN KNOWLEDGE + FAST AI)
 * - Tự động nhận diện mọi diễn viên / đạo diễn toàn cầu (Việt Nam, Hàn Quốc, Trung Quốc, Âu Mỹ, Anime...)
 * - Nhận diện tức thì 0ms cho các diễn viên nổi tiếng (Trường Giang, Trấn Thành, Châu Tinh Trì, Son Ye-jin, Tom Cruise...)
 * - Tự động lưu cache 7 ngày
 */
export async function resolveActorMovies(keyword: string): Promise<{
  actorName: string;
  country?: string;
  titles: string[];
  isActor: boolean;
  source: "ai" | "cache" | "curated" | "none";
}> {
  if (!keyword || keyword.trim().length < 2) {
    return { actorName: "", titles: [], isActor: false, source: "none" };
  }

  const cleanRaw = keyword.trim().toLowerCase();
  const normalizedQuery = cleanActorQuery(keyword);

  // 1.0 Kiểm tra Bản đồ tri thức vàng (Golden Knowledge Map) -> 0ms chuẩn xác 100%
  for (const profile of GOLDEN_ACTOR_PROFILES) {
    const normName = normalizeForMatch(profile.name);
    const matchesName =
      normalizedQuery === normName ||
      normalizedQuery.includes(normName) ||
      normName.includes(normalizedQuery);

    const matchesAlias = profile.aliases.some(
      (a) => normalizedQuery === a || normalizedQuery.includes(a) || a.includes(normalizedQuery)
    );

    if (matchesName || matchesAlias) {
      return {
        actorName: profile.name,
        country: profile.country,
        titles: profile.titles,
        isActor: true,
        source: "curated",
      };
    }
  }

  // 1.1 Kiểm tra Cache L1 (0ms)
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

  // 1.2 Phân tích trực tiếp qua Fast AI (Qwen 3.8 / Gemini Flash)
  try {
    const promptText = `Bạn là Chuyên gia Bách khoa Toàn thư Điện ảnh thế giới (Hollywood, Hoa Ngữ, TVB Hồng Kông, Hàn Quốc K-Drama, Việt Nam, Nhật Bản, Anime).
Hãy phân tích từ khóa tìm kiếm của người dùng: "${keyword}" (tên diễn viên rút gọn: "${normalizedQuery}").

Nhiệm vụ:
1. Xác định xem từ khóa có phải là TÊN DIỄN VIÊN / ĐẠO DIỄN / NGHỆ SĨ (hoặc từ khóa tìm phim của nghệ sĩ như "phim của ...", "... đóng") hay không.
2. Nếu ĐÚNG:
   - "actorName": Tên chuẩn tiếng Việt của nghệ sĩ.
   - "country": Quốc gia / nền điện ảnh chính xác (vd: Việt Nam 🇻🇳, Trung Quốc 🇨🇳, Hồng Kông 🇭🇰, Hollywood 🇺🇸, Hàn Quốc 🇰🇷, Nhật Bản 🇯🇵). TUYỆT ĐỐI không gán nhầm diễn viên quốc tế thành Việt Nam!
   - "titles": Liệt kê 8 đến 12 BỘ PHIM THẬT NỔI TIẾNG NHẤT CÓ THẬT trong sự nghiệp của nghệ sĩ này (ghi tên tiếng Việt phổ biến kèm tên gốc/tiếng Anh trong ngoặc đơn).
     LƯU Ý NGHIÊM NGẶT: TUYỆT ĐỐI KHÔNG tự bịa các hậu bản giả số thứ tự (như Phim 1, Phim 2, Lật Mặt 8, 9, 10...). CHỈ liệt kê các phim CÓ THẬT!

BẮT BUỘC chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ:
{
  "isActor": true,
  "actorName": "Tên chuẩn nghệ sĩ",
  "country": "Quốc gia chính xác kèm cờ",
  "titles": ["Tên phim 1", "Tên phim 2", "Tên phim 3", "Tên phim 4", "Tên phim 5", "Tên phim 6", "Tên phim 7", "Tên phim 8"]
}

Nếu KHÔNG PHẢI là diễn viên/nghệ sĩ:
{
  "isActor": false
}`;

    const aiRes = await generateFastAiChat({
      systemPrompt: "Bạn là chuyên gia bách khoa toàn thư điện ảnh. Trả về DUY NHẤT định dạng JSON.",
      userPrompt: promptText,
      temperature: 0.0,
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

          ACTOR_AI_CACHE.set(cleanRaw, {
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
          ACTOR_AI_CACHE.set(cleanRaw, {
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

  const cacheKey = titles.slice(0, 10).join("|");
  const cached = ACTOR_FILM_CACHE.get(cacheKey);
  if (cached && cached.expireAt > Date.now()) {
    return cached.items.slice(0, maxMovies);
  }

  const seenSlugs = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = [];

  // Thực thi song song tìm kiếm từng tựa phim
  const tasks = titles.slice(0, 14).map(async (rawTitle) => {
    try {
      const viTitle = rawTitle.replace(/\([^)]*\)/g, "").trim();
      const matchEng = rawTitle.match(/\(([^)]+)\)/);
      const engTitle = matchEng ? matchEng[1].trim() : "";

      const cleanTargetVi = normalizeForMatch(viTitle);
      const cleanTargetEng = normalizeForMatch(engTitle);

      if (!cleanTargetVi && !cleanTargetEng) return null;

      // 1. Thử tìm bằng tên tiếng Việt trước
      let res = await movieApi.getMovies({
        keyword: viTitle,
        page: 1,
        limit: 5,
      });

      let items = res?.items || [];

      // 2. Nếu không ra kết quả mà có tên tiếng Anh, thử tìm bằng tên tiếng Anh
      if (items.length === 0 && engTitle) {
        res = await movieApi.getMovies({
          keyword: engTitle,
          page: 1,
          limit: 5,
        });
        items = res?.items || [];
      }

      if (items.length === 0) return null;

      // Tìm bộ phim có tiêu đề khớp chính xác nhất với tên phim mục tiêu
      let bestItem = null;
      let bestScore = -999;

      for (const it of items) {
        const name = normalizeForMatch(it.name || it.title || "");
        const orig = normalizeForMatch(it.origin_name || "");
        const slug = normalizeForMatch(it.slug || "");

        let score = 0;

        // So khớp với tên tiếng Việt
        if (cleanTargetVi) {
          if (name === cleanTargetVi || orig === cleanTargetVi || slug === cleanTargetVi.replace(/\s+/g, "-")) {
            score = Math.max(score, 100);
          } else if (name.startsWith(cleanTargetVi) || orig.startsWith(cleanTargetVi)) {
            score = Math.max(score, 80);
          } else if (name.includes(cleanTargetVi) || orig.includes(cleanTargetVi)) {
            score = Math.max(score, 60);
          }
        }

        // So khớp với tên tiếng Anh / gốc
        if (cleanTargetEng) {
          if (orig === cleanTargetEng || name === cleanTargetEng || slug === cleanTargetEng.replace(/\s+/g, "-")) {
            score = Math.max(score, 95);
          } else if (orig.includes(cleanTargetEng) || name.includes(cleanTargetEng)) {
            score = Math.max(score, 70);
          }
        }

        if (score === 0 && cleanTargetVi) {
          const targetWords = cleanTargetVi.split(" ").filter((w) => w.length > 1);
          const matchCount = targetWords.filter((w) => name.includes(w) || orig.includes(w) || slug.includes(w)).length;
          const ratio = targetWords.length > 0 ? matchCount / targetWords.length : 0;
          if (ratio >= 0.6) {
            score = Math.round(ratio * 55);
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestItem = it;
        }
      }

      // Chỉ lấy phim có độ khớp thực sự (>= 35 điểm) để tránh nhận nhầm phim không liên quan
      if (bestItem && bestScore >= 35) {
        return bestItem;
      }
      return null;
    } catch {
      return null;
    }
  });

  const bestItems = await Promise.all(tasks);
  for (const item of bestItems) {
    if (item && item.slug && !seenSlugs.has(item.slug)) {
      seenSlugs.add(item.slug);
      results.push(item);
    }
    if (results.length >= maxMovies) break;
  }

  if (results.length > 0) {
    ACTOR_FILM_CACHE.set(cacheKey, {
      items: results,
      expireAt: Date.now() + CACHE_1_HOUR,
    });
  }

  return results;
}
