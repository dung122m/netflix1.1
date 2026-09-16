import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movieApi";
import { sanitizeImageUrl } from "@/lib/movieMedia";
import { cleanHtmlText } from "@/lib/cleanHtml";
import { generateFastAiChat } from "@/services/aiProviderService";

export const maxDuration = 15;

export interface SuggestionCard {
  slug: string;
  title: string;
  poster: string;
  year?: string | number;
  quality?: string;
  rating?: string | number;
  category?: string;
  country?: string;
  actors?: string[];
  reason?: string;
}

// ============================================================================
// LAYER 1: BẢNG ÁNH XẠ DIỄN VIÊN THÔNG MINH (ACTOR SLUG MAP)
// ============================================================================
export const ACTOR_SLUG_MAP: Record<string, string[]> = {
  "thanh-long": ["thanh long", "thành long", "jackie chan", "chan kong sang", "sing lung"],
  "chau-tinh-tri": ["chau tinh tri", "châu tinh trì", "stephen chow", "chow sing chi", "tinh gia"],
  "chan-tu-dan": ["chan tu dan", "chân tử đan", "donnie yen", "yen ji dan"],
  "ly-lien-kiet": ["ly lien kiet", "lý liên kiệt", "jet li", "li lian jie"],
  "ngo-kinh": ["ngo kinh", "ngô kinh", "wu jing"],
  "luu-duc-hoa": ["luu duc hoa", "lưu đức hoa", "andy lau"],
  "luong-trieu-vy": ["luong trieu vy", "lương triều vỹ", "tony leung"],
  "quach-phu-thanh": ["quach phu thanh", "quách phú thành", "aaron kwok"],
  "co-thien-lac": ["co thien lac", "cổ thiên lạc", "louis koo"],
  "truong-gia-huy": ["truong gia huy", "trương gia huy", "nick cheung"],
  "ta-dinh-phong": ["ta dinh phong", "tạ đình phong", "nicholas tse"],
  "hong-kim-bao": ["hong kim bao", "hồng kim bảo", "sammo hung"],
  "nguyen-biao": ["nguyen biao", "nguyên tiêu", "yuen biao"],
  "tran-thanh": ["tran thanh", "trấn thành", "mc tran thanh"],
  "truong-giang": ["truong giang", "trường giang", "mc truong giang"],
  "thai-hoa": ["thai hoa", "thái hòa"],
  "ninh-duong-lan-ngoc": ["ninh duong lan ngoc", "ninh dương lan ngọc"],
  "kieu-minh-tuan": ["kieu minh tuan", "kiều minh tuấn"],
  "thu-trang": ["thu trang"],
  "ly-hai": ["ly hai", "lý hải"],
  "hoai-linh": ["hoai linh", "hoài linh"],
  "tom-cruise": ["tom cruise", "thomas cruise mapother"],
  "keanu-reeves": ["keanu reeves", "keanu charles reeves"],
  "leonardo-dicaprio": ["leonardo dicaprio", "leo dicaprio"],
  "dwayne-johnson": ["dwayne johnson", "the rock"],
  "jason-statham": ["jason statham"],
  "brad-pitt": ["brad pitt", "william bradley pitt"],
  "will-smith": ["will smith"],
  "robert-downey-jr": ["robert downey jr", "robert downey"],
  "chris-evans": ["chris evans"],
  "chris-hemsworth": ["chris hemsworth"],
  "scarlett-johansson": ["scarlett johansson"],
  "ryan-reynolds": ["ryan reynolds"],
  "cillian-murphy": ["cillian murphy"],
  "christian-bale": ["christian bale"],
  "song-joong-ki": ["song joong ki", "song joong-ki"],
  "kim-soo-hyun": ["kim soo hyun", "kim soo-hyun"],
  "hyun-bin": ["hyun bin"],
  "lee-min-ho": ["lee min ho", "lee min-ho"],
  "park-seo-joon": ["park seo joon", "park seo-jun"],
  "son-ye-jin": ["son ye jin", "son ye-jin"],
  "kim-ji-won": ["kim ji won", "kim ji-won"],
  "song-kang": ["song kang"],
  "iu": ["iu", "lee ji eun", "lee ji-eun"],
  "huynh-hieu-minh": ["huynh hieu minh", "huỳnh hiểu minh", "huang xiaoming"],
  "trieu-le-dinh": ["trieu le dinh", "triệu lệ dĩnh", "zhao liying"],
  "duong-mich": ["duong mich", "dương mịch", "yang mi"],
  "dich-le-nhiet-ba": ["dich le nhiet ba", "địch lệ nhiệt ba", "dilraba dilmurat"],
  "tieu-chien": ["tieu chien", "tiêu chiến", "xiao zhan"],
  "vuong-nhat-bac": ["vuong nhat bac", "vương nhất bác", "wang yibo"],
};

// Kho danh sách tác phẩm kinh điển của các siêu sao (Filmography Ground Truth)
export const ACTOR_TOP_TITLES: Record<string, string[]> = {
  "tom-cruise": [
    "Phi Công Siêu Đẳng Maverick (Top Gun: Maverick)",
    "Phi Công Siêu Đẳng (Top Gun)",
    "Nhiệm Vụ Bất Khả Thi: Nghiệp Báo Phần 1 (Mission: Impossible - Dead Reckoning Part One)",
    "Nhiệm Vụ Bất Khả Thi: Sụp Đổ (Mission: Impossible - Fallout)",
    "Nhiệm Vụ Bất Khả Thi: Quốc Gia Bí Ẩn (Mission: Impossible - Rogue Nation)",
    "Nhiệm Vụ Bất Khả Thi: Chiến Dịch Bóng Ma (Mission: Impossible - Ghost Protocol)",
    "Nhiệm Vụ Bất Khả Thi 3 (Mission: Impossible III)",
    "Nhiệm Vụ Bất Khả Thi 2 (Mission: Impossible II)",
    "Nhiệm Vụ Bất Khả Thi (Mission: Impossible)",
    "Cuộc Chiến Luân Hồi (Edge of Tomorrow)",
    "Bí Mật Trái Đất Diệt Vong (Oblivion)",
    "Phát Súng Cuối Cùng (Jack Reacher)",
    "Jack Reacher: Không Quay Đầu (Jack Reacher: Never Go Back)",
    "Báo Cáo Thiểu Số (Minority Report)",
    "Đại Chiến Thế Giới (War of the Worlds)",
    "Võ Sĩ Đạo Cuối Cùng (The Last Samurai)",
    "Hiệp Sĩ Mù (Knight and Day)",
    "Xác Ướp (The Mummy)",
    "Điệp Vụ Valkyrie (Valkyrie)",
    "Sát Thủ Gợi Cảm (Collateral)",
    "Người Trong Mộng (Vanilla Sky)",
    "Jerry Maguire",
  ],
  "keanu-reeves": [
    "Sát Thủ John Wick 4 (John Wick: Chapter 4)",
    "Sát Thủ John Wick 3: Chuẩn Bị Chiến Tranh (John Wick: Chapter 3 - Parabellum)",
    "Sát Thủ John Wick 2 (John Wick: Chapter 2)",
    "Sát Thủ John Wick (John Wick)",
    "Ma Trận: Hồi Sinh (The Matrix Resurrections)",
    "Ma Trận (The Matrix)",
    "Ma Trận: Tái Nạp (The Matrix Reloaded)",
    "Ma Trận: Cuộc Cách Mạng (The Matrix Revolutions)",
    "Kẻ Cứu Rỗi Linh Hồn (Constantine)",
    "Tốc Độ (Speed)",
    "47 Ronin",
    "Điểm Gãy (Point Break)",
    "Luật Sư Của Quỷ (The Devil's Advocate)",
    "Kẻ Bắn Tỉa (Street Kings)",
  ],
  "leonardo-dicaprio": [
    "Titanic",
    "Kẻ Đánh Cắp Giấc Mơ (Inception)",
    "Sói Già Phố Wall (The Wolf of Wall Street)",
    "Đảo Kinh Hoàng (Shutter Island)",
    "Người Về Từ Cõi Chết (The Revenant)",
    "Hãy Bắt Tôi Nếu Có Thể (Catch Me If You Can)",
    "Điệp Vụ Boston (The Departed)",
    "Kim Cương Máu (Blood Diamond)",
    "Hành Trình Django (Django Unchained)",
    "Chuyện Ngày Xưa Ở Hollywood (Once Upon a Time in Hollywood)",
    "Đại Gia Gatsby (The Great Gatsby)",
  ],
  "dwayne-johnson": [
    "Quá Nhanh Quá Nguy Hiểm: Hobbs & Shaw (Fast & Furious: Hobbs & Shaw)",
    "Quá Nhanh Quá Nguy Hiểm 8 (The Fate of the Furious)",
    "Quá Nhanh Quá Nguy Hiểm 7 (Furious 7)",
    "Quá Nhanh Quá Nguy Hiểm 6 (Fast & Furious 6)",
    "Quá Nhanh Quá Nguy Hiểm 5 (Fast Five)",
    "Jumanji: Trò Chơi Kỳ Ảo (Jumanji: Welcome to the Jungle)",
    "Jumanji: Vòng Đua Sinh Tử (Jumanji: The Next Level)",
    "Black Adam",
    "Thông Báo Đỏ (Red Notice)",
    "Siêu Thú Cuồng Nộ (Rampage)",
    "Khe Nứt San Andreas (San Andreas)",
    "Tòa Tháp Chọc Trời (Skyscraper)",
    "Điệp Viên Không Hoàn Hảo (Central Intelligence)",
  ],
  "jason-statham": [
    "Mật Vụ Ong (The Beekeeper)",
    "Cơn Thịnh Nộ Của Kẻ Báo Thù (Wrath of Man)",
    "Cá Mập Siêu Bạo Chúa (The Meg)",
    "Cá Mập Siêu Bạo Chúa 2 (Meg 2: The Trench)",
    "Người Vận Chuyển (The Transporter)",
    "Người Vận Chuyển 2 (The Transporter 2)",
    "Người Vận Chuyển 3 (The Transporter 3)",
    "Sát Thủ Thợ Máy (The Mechanic)",
    "Sát Thủ Thợ Máy: Sự Tái Xuất (Mechanic: Resurrection)",
    "Kẻ Lập Dị (Crank)",
    "Kẻ Lập Dị 2 (Crank: High Voltage)",
    "Biệt Đội Đánh Thuê (The Expendables)",
    "Quá Nhanh Quá Nguy Hiểm: Hobbs & Shaw (Fast & Furious: Hobbs & Shaw)",
  ],
  "thanh-long": [
    "Câu Chuyện Cảnh Sát (Police Story)",
    "Câu Chuyện Cảnh Sát 2 (Police Story 2)",
    "Câu Chuyện Cảnh Sát 3 (Police Story 3: Super Cop)",
    "Câu Chuyện Cảnh Sát 4: Nhiệm Vụ Đơn Độc (First Strike)",
    "Tân Câu Chuyện Cảnh Sát (New Police Story)",
    "Giờ Cao Điểm (Rush Hour)",
    "Giờ Cao Điểm 2 (Rush Hour 2)",
    "Giờ Cao Điểm 3 (Rush Hour 3)",
    "Túy Quyền (Drunken Master)",
    "Túy Quyền 2 (Drunken Master II)",
    "Kế Hoạch A (Project A)",
    "Kế Hoạch A 2 (Project A 2)",
    "Đại Náo Phố Bronx (Rumble in the Bronx)",
    "Thần Thoại (The Myth)",
    "12 Con Giáp (CZ12 / Chinese Zodiac)",
    "Kẻ Ngoại Tộc (The Foreigner)",
    "Đại Náo Shinjuku (Shinjuku Incident)",
    "Hiệp Khách Thượng Hải (Shanghai Knights)",
    "Trưa Thượng Hải (Shanghai Noon)",
    "Cậu Bé Karate (The Karate Kid)",
    "Phi Ưng Vút Bay (Armour of God II: Operation Condor)",
    "Kế Hoạch Baby (Rob-B-Hood)",
    "Vua Kung Fu (The Forbidden Kingdom)",
    "Long Huynh Hổ Đệ (Armour of God)",
    "Long Mã Tinh Thần (Ride On)",
  ],
  "chau-tinh-tri": [
    "Tuyệt Đỉnh Kungfu (Kung Fu Hustle)",
    "Đội Bóng Thiếu Lâm (Shaolin Soccer)",
    "Tây Du Ký: Nguyệt Quang Bảo Hợp (A Chinese Odyssey Part 1)",
    "Tây Du Ký: Tiên Lý Kỳ Duyên (A Chinese Odyssey Part 2)",
    "Vua Hài Kịch (King of Comedy)",
    "Thần Ăn (The God of Cookery)",
    "Quan Xẩm Lốc Cốc (Hail the Judge)",
    "Đường Bá Hổ Điểm Thu Hương (Flirting Scholar)",
    "Thánh Bài (All for the Winner)",
    "Thánh Bài 2 (God of Gamblers II)",
    "Trường Học Uy Long (Fight Back to School)",
    "Trường Học Uy Long 2 (Fight Back to School 2)",
    "Quốc Sản 007 (From Beijing with Love)",
    "Mỹ Nhân Ngư (The Mermaid)",
    "Gia Hữu Hỷ Sự (All's Well, Ends Well)",
  ],
  "chan-tu-dan": [
    "Diệp Vấn (Ip Man)",
    "Diệp Vấn 2 (Ip Man 2)",
    "Diệp Vấn 3 (Ip Man 3)",
    "Diệp Vấn 4: Hồi Cuối (Ip Man 4: The Finale)",
    "Sát Phá Lang (SPL: Kill Zone)",
    "Đảo Hỏa Tuyến (Flash Point)",
    "Trùm Hương Cảng (Chasing the Dragon)",
    "Huyền Thoại Trần Chân (Legend of the Fist)",
    "Kẻ Săn Đêm (Raging Fire)",
    "Hiệp Sĩ Mù (Blind War)",
  ],
  "ly-lien-kiet": [
    "Hoàng Phi Hồng (Once Upon a Time in China)",
    "Hoàng Phi Hồng 2 (Once Upon a Time in China II)",
    "Hoàng Phi Hồng 3 (Once Upon a Time in China III)",
    "Tinh Võ Anh Hùng (Fist of Legend)",
    "Phương Thế Ngọc (Fong Sai-yuk)",
    "Nụ Hôn Của Rồng (Kiss of the Dragon)",
    "Đấu Quyết (Fearless / Hoắc Nguyên Giáp)",
    "Anh Hùng (Hero)",
    "Vua Kung Fu (The Forbidden Kingdom)",
    "Biệt Đội Đánh Thuê (The Expendables)",
  ],
  "tran-thanh": [
    "Bố Già (Dad, I'm Sorry)",
    "Nhà Bà Nữ (The House of No Man)",
    "Mai",
    "Cua Lại Vợ Bầu",
    "Trạng Quỳnh",
    "Bệnh Viện Ma",
    "Đất Rừng Phương Nam",
    "Chờ Em Đến Ngày Mai",
  ],
  "thai-hoa": [
    "Để Mai Tính",
    "Để Mai Tính 2",
    "Tèo Em",
    "Cưới Ngay Kẻo Lỡ",
    "Quả Tim Máu",
    "Tiệc Trăng Máu",
    "Chàng Vợ Của Em",
    "Con Nhót Mót Chồng",
    "Cái Giá Của Hạnh Phúc",
  ],
  "ly-hai": [
    "Lật Mặt (Face Off)",
    "Lật Mặt 2: Phim Trường",
    "Lật Mặt 3: Ba Chàng Khuyết",
    "Lật Mặt 4: Nhà Có Khách",
    "Lật Mặt 5: 48H",
    "Lật Mặt 6: Tấm Vé Định Mệnh",
    "Lật Mặt 7: Một Điều Ước",
  ],
  "song-joong-ki": [
    "Hậu Duệ Mặt Trời (Descendants of the Sun)",
    "Vincenzo",
    "Cậu Út Nhà Tài Phiệt (Reborn Rich)",
    "Tàu Quét Rác Không Gian (Space Sweepers)",
    "Đảo Địa Ngục (The Battleship Island)",
    "Tên Tôi Là Loh Kiwan (My Name is Loh Kiwan)",
    "Chàng Trai Tốt Bụng (The Innocent Man)",
    "Cậu Bé Người Sói (A Werewolf Boy)",
  ],
  "hyun-bin": [
    "Hạ Cánh Nơi Anh (Crash Landing on You)",
    "Khu Vườn Bí Mật (Secret Garden)",
    "Đặc Vụ Xuyên Quốc Gia (Confidential Assignment)",
    "Đặc Vụ Xuyên Quốc Gia 2 (Confidential Assignment 2: International)",
    "Đàm Phán (The Point Men)",
    "Cuộc Đàm Phán Sinh Tử (The Negotiation)",
    "Ký Ức Alhambra (Memories of the Alhambra)",
  ],
  "kim-soo-hyun": [
    "Nữ Hoàng Nước Mắt (Queen of Tears)",
    "Vì Sao Đưa Anh Tới (My Love from the Star)",
    "Mặt Trăng Ôm Mặt Trời (Moon Embracing the Sun)",
    "Điên Thì Có Sao (It's Okay to Not Be Okay)",
    "Đội Siêu Trộm (The Thieves)",
    "Ẩn Thân (Secretly, Greatly)",
  ],
  "lee-min-ho": [
    "Vườn Sao Băng (Boys Over Flowers)",
    "Thợ Săn Thành Phố (City Hunter)",
    "Người Thừa Kế (The Heirs)",
    "Huyền Thoại Biển Xanh (The Legend of the Blue Sea)",
    "Quân Vương Bất Diệt (The King: Eternal Monarch)",
    "Bụi Đời Gangnam (Gangnam Blues)",
    "Pachinko",
  ],
  "park-seo-joon": [
    "Tầng Lớp Itaewon (Itaewon Class)",
    "Thư Ký Kim Sao Thế (What's Wrong with Secretary Kim)",
    "Cảnh Sát Tập Sự (Midnight Runners)",
    "Bàn Tay Diệt Quỷ (The Divine Fury)",
    "Đội Bóng Dream (Dream)",
    "Sinh Vật Gyeongseong (Gyeongseong Creature)",
  ],
  "son-ye-jin": [
    "Hạ Cánh Nơi Anh (Crash Landing on You)",
    "Chị Đẹp Mua Cơm Ngon Cho Tôi (Something in the Rain)",
    "Cổ Điển (The Classic)",
    "Cuộc Đàm Phán Sinh Tử (The Negotiation)",
    "Và Em Sẽ Đến (Be With You)",
    "Hải Tặc (The Pirates)",
  ],
};

// ============================================================================
// BẢNG ÁNH XẠ CHUẨN HÓA (SLUG MAPPERS - CODE DETERMINISTIC)
// ============================================================================
export const COUNTRY_SLUG_MAP: Record<string, string[]> = {
  "au-my": ["au-my", "us", "usa", "hollywood", "my", "mỹ", "hoa ky", "hoa kỳ", "au my", "âu mỹ", "anh", "uk", "phap", "pháp", "france", "duc", "đức", "germany", "y", "ý", "italy", "tay ban nha", "tây ban nha", "spain", "canada", "uc", "úc", "australia"],
  "thai-lan": ["thai-lan", "thailand", "thai lan", "thái lan", "thai", "xiem"],
  "han-quoc": ["han-quoc", "korea", "han quoc", "hàn quốc", "south korea", "han", "hàn"],
  "trung-quoc": ["trung-quoc", "china", "trung quoc", "trung quốc", "chinese", "hoa ngu", "hoa ngữ", "dai luc", "đại lục"],
  "hong-kong": ["hong-kong", "hong kong", "hongkong", "hồng kông", "hk", "tvb"],
  "nhat-ban": ["nhat-ban", "japan", "nhat ban", "nhật bản", "japanese", "anime", "nhat", "nhật"],
  "viet-nam": ["viet-nam", "vietnam", "viet nam", "việt nam", "vn"],
  "dai-loan": ["dai-loan", "taiwan", "dai loan", "đài loan"],
  "an-do": ["an-do", "india", "an do", "ấn độ", "bollywood"],
};

export const GENRE_SLUG_MAP: Record<string, string[]> = {
  "hanh-dong": ["hanh-dong", "hanh dong", "hành động", "hanh dong giat gan", "hành động giật gân", "giat gan", "giật gân", "action", "thriller", "ban sung", "bắn súng", "truy duoi", "truy đuổi", "cuop", "cướp", "cuop ngan hang", "cướp ngân hàng", "heist", "toi pham", "tội phạm", "hinh su", "hình sự"],
  "kinh-di": ["kinh-di", "kinh di", "kinh dị", "horror", "ma", "ma quai", "ma quái", "rung ron", "rùng rợn", "am anh", "ám ảnh", "quy", "quỷ", "tam linh", "tâm linh"],
  "hai-huoc": ["hai-huoc", "hai huoc", "hài hước", "hai", "hài", "comedy", "vui nhon", "vui nhộn", "cuoi", "cười"],
  "tinh-cam": ["tinh-cam", "tinh cam", "tình cảm", "lang man", "lãng mạn", "romance", "tinh yeu", "tình yêu", "ngon tinh", "ngôn tình", "chua lanh", "chữa lành", "dong que", "đồng quê", "slice of life"],
  "hoat-hinh": ["hoat-hinh", "hoat hinh", "hoạt hình", "anime", "animation", "manga"],
  "vien-tuong": ["vien-tuong", "vien tuong", "viễn tưởng", "khoa hoc vien tuong", "khoa học viễn tưởng", "sci-fi", "scifi", "time loop", "vong lap", "vòng lặp", "du hanh", "du hành"],
  "co-trang": ["co-trang", "co trang", "cổ trang", "kiem hiep", "kiếm hiệp", "tien hiep", "tiên hiệp", "cung dau", "cung đấu"],
  "tam-ly": ["tam-ly", "tam ly", "tâm lý", "drama", "chinh kich", "chính kịch", "gia dinh", "gia đình"],
  "trinh-tham": ["trinh-tham", "trinh tham", "trinh thám", "bi an", "bí ẩn", "mystery", "pha an", "phá án", "hack nao", "hack não", "dau tri", "đấu trí", "investigation"],
  "vo-thuat": ["vo-thuat", "vo thuat", "võ thuật", "kungfu", "martial arts", "danh nhau", "đánh nhau"],
  "chien-tranh": ["chien-tranh", "chien tranh", "chiến tranh", "war", "quan su", "quân sự"],
  "tai-lieu": ["tai-lieu", "tai lieu", "tài liệu", "documentary"],
  "phieu-luu": ["phieu-luu", "phieu luu", "phiêu lưu", "adventure", "kham pha", "khám phá", "sinh ton", "sinh tồn"],
};

function cleanNormalizedString(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Trích xuất năm an toàn (xử lý cả '1995', '1995-12-01', 1995)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractMovieYear(item: any): number {
  if (!item) return 0;
  const raw = item.year || item.movie?.year || item.release_date || item.publish_date || item.created_at || "";
  const match = String(raw).match(/\b(19\d{2}|20\d{2})\b/);
  return match ? parseInt(match[1], 10) : 0;
}

export function resolveActorSlug(rawActor?: string): string {
  if (!rawActor) return "";
  const clean = cleanNormalizedString(rawActor);
  for (const [slug, aliases] of Object.entries(ACTOR_SLUG_MAP)) {
    if (aliases.some((a) => clean === cleanNormalizedString(a))) {
      return slug;
    }
  }
  for (const [slug, aliases] of Object.entries(ACTOR_SLUG_MAP)) {
    if (aliases.some((a) => clean.includes(cleanNormalizedString(a)) || cleanNormalizedString(a).includes(clean))) {
      return slug;
    }
  }
  return "";
}

export function getActorAliases(actorSlug: string): string[] {
  return ACTOR_SLUG_MAP[actorSlug] || [actorSlug.replace(/-/g, " ")];
}

export function matchesActor(itemActors: string[], actorSlug: string): boolean {
  if (!actorSlug || !itemActors || itemActors.length === 0) return false;
  const aliases = getActorAliases(actorSlug).map(cleanNormalizedString);
  const cleanActors = itemActors.map(cleanNormalizedString);
  return cleanActors.some((act) => aliases.some((alias) => act.includes(alias) || alias.includes(act)));
}

export function isActorTopTitle(name: string, origName: string, actorSlug: string): boolean {
  const topList = ACTOR_TOP_TITLES[actorSlug];
  if (!topList || topList.length === 0) return false;
  const cleanN = cleanNormalizedString(name);
  const cleanO = cleanNormalizedString(origName);
  for (const t of topList) {
    const viTitle = cleanNormalizedString(t.replace(/\([^)]*\)/g, ""));
    const matchEng = t.match(/\(([^)]+)\)/);
    const engTitle = matchEng ? cleanNormalizedString(matchEng[1]) : "";
    if (viTitle && (cleanN === viTitle || cleanO === viTitle || (cleanN.length >= 6 && cleanN.includes(viTitle)) || (cleanO.length >= 6 && cleanO.includes(viTitle)))) {
      return true;
    }
    if (engTitle && (cleanN === engTitle || cleanO === engTitle || (cleanN.length >= 6 && cleanN.includes(engTitle)) || (cleanO.length >= 6 && cleanO.includes(engTitle)))) {
      return true;
    }
  }
  return false;
}

export function resolveCountrySlug(rawCountry?: string): string {
  if (!rawCountry) return "";
  const clean = cleanNormalizedString(rawCountry);
  for (const [slug, aliases] of Object.entries(COUNTRY_SLUG_MAP)) {
    if (aliases.some((a) => clean === cleanNormalizedString(a))) {
      return slug;
    }
  }
  for (const [slug, aliases] of Object.entries(COUNTRY_SLUG_MAP)) {
    if (aliases.some((a) => clean.includes(cleanNormalizedString(a)) || cleanNormalizedString(a).includes(clean))) {
      return slug;
    }
  }
  return "";
}

export function resolveGenreSlug(rawGenre?: string): string {
  if (!rawGenre) return "";
  const clean = cleanNormalizedString(rawGenre);
  for (const [slug, aliases] of Object.entries(GENRE_SLUG_MAP)) {
    if (aliases.some((a) => clean === cleanNormalizedString(a))) {
      return slug;
    }
  }
  for (const [slug, aliases] of Object.entries(GENRE_SLUG_MAP)) {
    if (aliases.some((a) => clean.includes(cleanNormalizedString(a)) || cleanNormalizedString(a).includes(clean))) {
      return slug;
    }
  }
  return "";
}

export function matchesCountry(itemCountryStr: string, targetCountrySlug: string): boolean {
  if (!targetCountrySlug || !itemCountryStr) return true;
  const cleanItem = cleanNormalizedString(itemCountryStr);
  const targetAliases = COUNTRY_SLUG_MAP[targetCountrySlug] || [targetCountrySlug];
  return targetAliases.some((alias) => cleanItem.includes(cleanNormalizedString(alias)));
}

export function matchesGenre(itemCategoryStr: string, targetGenreSlug: string): boolean {
  if (!targetGenreSlug || !itemCategoryStr) return true;
  const cleanItem = cleanNormalizedString(itemCategoryStr);
  const targetAliases = GENRE_SLUG_MAP[targetGenreSlug] || [targetGenreSlug];
  return targetAliases.some((alias) => cleanItem.includes(cleanNormalizedString(alias)));
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSafeActors(item: any): string[] {
  if (Array.isArray(item?.actor)) {
    return item.actor.map(String).map((s: string) => s.trim()).filter(Boolean);
  }
  if (typeof item?.actor === "string" && item.actor.trim()) {
    return item.actor.split(",").map((s: string) => s.trim()).filter(Boolean);
  }
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSafeCountry(item: any): string {
  if (Array.isArray(item?.country) && item.country.length > 0) {
    return item.country[0]?.name || item.country[0]?.slug || "";
  }
  if (typeof item?.country === "string") return item.country;
  return "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSafeCategory(item: any): string {
  if (Array.isArray(item?.category) && item.category.length > 0) {
    return item.category[0]?.name || item.category[0]?.slug || "Điện Ảnh";
  }
  if (typeof item?.category === "string") return item.category;
  return "Điện Ảnh";
}

// ============================================================================
// HÀM TRÍCH XUẤT MÔ TẢ ĐỘC BẢN CHO TỪNG BỘ PHIM (CHỐNG RẬP KHUÔN)
// ============================================================================
export const MOVIE_SPECIFIC_HIGHLIGHTS: Array<{ patterns: string[]; highlight: string }> = [
  // Tom Cruise
  {
    patterns: ["top gun maverick", "phi cong sieu dang maverick"],
    highlight: "Những màn không chiến phản lực F/A-18 nghẹt thở và phi vụ cảm tử đòi hỏi kỹ năng bay đỉnh cao của đại úy Pete 'Maverick' Mitchell.",
  },
  {
    patterns: ["top gun", "phi cong sieu dang"],
    highlight: "Khúc tráng ca của những phi công tiêm kích tài hoa tại trường huấn luyện Top Gun với các pha lượn cánh trên tầng không kinh điển.",
  },
  {
    patterns: ["mission impossible dead reckoning", "nghiep bao"],
    highlight: "Cuộc truy kích AI thực thể tối mật toàn cầu với phân cảnh Ethan Hunt phóng mô tô từ vách núi và đánh giáp lá cà trên nóc tàu cao tốc.",
  },
  {
    patterns: ["mission impossible fallout", "sup do"],
    highlight: "Màn rượt đuổi trực thăng nghẹt thở qua dãy núi hiểm trở và cú nhảy HALO mạo hiểm đỉnh cao của điệp viên Ethan Hunt.",
  },
  {
    patterns: ["mission impossible rogue nation", "quoc gia bi an"],
    highlight: "Cú bám thân máy bay phản lực Airbus A400M lúc cất cánh và màn đối đầu trí tuệ với tổ chức bóng ma Syndicate.",
  },
  {
    patterns: ["mission impossible ghost protocol", "chien dich bong ma"],
    highlight: "Pha leo tường kính nghẹt thở ở độ cao chót vót trên tòa tháp Burj Khalifa giữa cơn bão cát Dubai khốc liệt.",
  },
  {
    patterns: ["mission impossible 3", "nhiem vu bat kha thi 3"],
    highlight: "Cuộc giải cứu nghẹt thở trên cầu vượt và màn đối đầu cân não với tay buôn vũ khí máu lạnh Owen Davian.",
  },
  {
    patterns: ["mission impossible 2", "nhiem vu bat kha thi 2"],
    highlight: "Những pha đấu súng hai tay và màn rượt đuổi mô tô phân khối lớn mang đậm phong cách đạo diễn Ngô Vũ Sâm.",
  },
  {
    patterns: ["mission impossible", "nhiem vu bat kha thi"],
    highlight: "Pha đu dây đột nhập phòng máy chủ CIA kinh điển và các màn lừa bóng gián điệp đỉnh cao của điệp viên Ethan Hunt.",
  },
  {
    patterns: ["edge of tomorrow", "cuoc chien luan hoi"],
    highlight: "Vòng lặp thời gian nghẹt thở nơi chiến binh phải chết đi sống lại hàng trăm lần trên chiến trường để tìm điểm yếu tiêu diệt người ngoài hành tinh.",
  },
  {
    patterns: ["oblivion", "bi mat trai dat diet vong"],
    highlight: "Hành trình khám phá sự thật chấn động đằng sau Trái Đất hậu tận thế và danh tính thực sự của các trạm không gian.",
  },
  {
    patterns: ["jack reacher"],
    highlight: "Những màn đấu trí sắc bén cùng các đòn cận chiến thực dụng của cựu điều tra viên quân đội khi bóc trần âm mưu ám sát bí ẩn.",
  },
  {
    patterns: ["minority report", "bao cao thieu so"],
    highlight: "Thế giới tương lai nơi tội ác được dự đoán trước khi xảy ra, kéo theo cuộc đào tẩu nghẹt thở khi người thực thi lại bị gắn mác thủ phạm.",
  },
  {
    patterns: ["war of the worlds", "dai chien the gioi"],
    highlight: "Cuộc đào tẩu sinh tồn đẫm nước mắt của người cha đưa hai con chạy trốn khỏi sự tàn phá hủy diệt của cỗ máy người ngoài hành tinh Tripods.",
  },
  {
    patterns: ["the last samurai", "vo si dao cuoi cung"],
    highlight: "Màn giác ngộ văn hóa danh dự và tinh thần bất khuất của người sĩ quan phương Tây bên cạnh những kiếm sĩ Samurai huyền thoại.",
  },
  {
    patterns: ["knight and day", "hiep si mu"],
    highlight: "Những pha đấu súng hành động hài hước kết hợp rượt đuổi tốc độ cao vòng quanh thế giới của điệp viên siêu hạng.",
  },
  {
    patterns: ["collateral", "sat thu goi cam"],
    highlight: "Đêm định mệnh tại Los Angeles khi người tài xế taxi bị một sát thủ máu lạnh khống chế để thực hiện chuỗi hợp đồng ám sát liên hoàn.",
  },
  {
    patterns: ["vanilla sky", "nguoi trong mong"],
    highlight: "Mê cung giữa hiện thực và ảo ảnh tâm lý sau một tai nạn xe hơi làm đảo lộn toàn bộ cuộc đời người thừa kế giàu có.",
  },
  {
    patterns: ["jerry maguire"],
    highlight: "Hành trình khởi nghiệp lại từ con số không đầy cảm xúc của chuyên viên môi giới thể thao với câu nói bất hủ 'Show me the money'.",
  },
  // Keanu Reeves
  {
    patterns: ["john wick"],
    highlight: "Nghệ thuật xả súng Gun-Fu mãn nhãn và thế giới ngầm đầy quy tắc nghiêm ngặt của sát thủ huyền thoại 'Ông Kẹ'.",
  },
  {
    patterns: ["the matrix", "ma tran"],
    highlight: "Kiệt tác cách mạng khoa học viễn tưởng với hiệu ứng Bullet-time kinh điển và cuộc chiến giải phóng nhân loại khỏi thế giới ảo.",
  },
  {
    patterns: ["constantine", "ke cuu roi linh hon"],
    highlight: "Hành trình trừ tà săn quỷ đen tối với những nghi thức ma thuật và ranh giới sinh tử giữa Thiên Đàng và Địa Ngục.",
  },
  {
    patterns: ["speed", "toc do"],
    highlight: "Cuộc chạy đua nghẹt thở trên chiếc xe buýt gắn bom kích nổ nếu tốc độ giảm xuống dưới 50 dặm/giờ giữa lòng thành phố.",
  },
  // Leonardo DiCaprio
  {
    patterns: ["titanic"],
    highlight: "Thiên tình sử bất hủ vượt qua ranh giới giai cấp giữa Jack và Rose trên con tàu định mệnh vĩ đại nhất thế kỷ.",
  },
  {
    patterns: ["inception", "ke danh cap giac mo"],
    highlight: "Nghệ thuật thâm nhập các tầng giấc mơ đa tầng đầy hack não với những định luật vật lý bị bẻ cong ngoạn mục.",
  },
  {
    patterns: ["the wolf of wall street", "soi gia pho wall"],
    highlight: "Bức tranh trần trụi, hoang dã và điên cuồng về giới tài chính phố Wall cùng những phi vụ làm giàu chớp nhoáng đầy cạm bẫy.",
  },
  {
    patterns: ["shutter island", "dao kinh hoang"],
    highlight: "Nút thắt tâm lý kinh điển tại bệnh viện tâm thần biệt lập giữa biển khơi nơi ranh giới giữa điều tra viên và bệnh nhân bị xóa nhòa.",
  },
  {
    patterns: ["the revenant", "nguoi ve tu coi chet"],
    highlight: "Bản năng sinh tồn phi thường giữa mùa đông tuyết trắng khắc nghiệt và hành trình báo thù đẫm máu của người thợ săn.",
  },
  // Châu Tinh Trì
  {
    patterns: ["tuyet dinh kungfu", "kung fu hustle"],
    highlight: "Bữa tiệc võ thuật đỉnh cao kết hợp phong cách hài vô lý đặc trưng và màn giác ngộ Như Lai Thần Chưởng thần thánh.",
  },
  {
    patterns: ["doi bong thieu lam", "shaolin soccer"],
    highlight: "Sự kết hợp bùng nổ giữa tuyệt kỹ công phu Thiếu Lâm và môn thể thao vua với những đường bóng siêu thực kinh điển.",
  },
  {
    patterns: ["tay du ky", "nguyet quang bao hop", "tien ly ky duyen"],
    highlight: "Chuyện tình bi hài vượt thời gian của Chí Tôn Bảo cùng nỗi giằng xé giữa tình yêu cá nhân và sứ mệnh thỉnh kinh.",
  },
  // Thành Long
  {
    patterns: ["cau chuyen canh sat", "police story"],
    highlight: "Những pha hành động mạo hiểm nguy hiểm đến tính mạng không cần đóng thế cùng kỹ năng cận chiến sáng tạo với mọi đạo cụ.",
  },
  {
    patterns: ["gio cao diem", "rush hour"],
    highlight: "Màn tung hứng hài hước bất hủ giữa chàng cảnh sát Hồng Kông nghiêm túc và viên thanh tra cảnh sát Mỹ lẻo mép.",
  },
  {
    patterns: ["tuy quyen", "drunken master"],
    highlight: "Đỉnh cao võ thuật túy quyền với các thế đánh uyển chuyển như say nhưng chuẩn xác và biến hóa khôn lường.",
  },
  // Chân Tử Đan
  {
    patterns: ["diep van", "ip man"],
    highlight: "Những bài quyền Vịnh Xuân quyền liên hoàn cước nhanh như chớp và tinh thần võ đạo kiên cường bảo vệ danh dự dân tộc.",
  },
  // Phim Thập niên 90 / Cướp ngân hàng
  {
    patterns: ["heat", "ky phung dich thu"],
    highlight: "Cuộc đối đầu huyền thoại giữa tay trùm cướp nhà băng mưu trí và viên thanh tra mẫn cán với màn đấu súng đường phố chân thực nhất lịch sử.",
  },
  {
    patterns: ["point break", "diem gay"],
    highlight: "Màn thâm nhập ngầm vào băng cướp ngân hàng lướt sóng kỳ dị đeo mặt nạ cựu tổng thống Mỹ với những cú nhảy dù sinh tử.",
  },
  {
    patterns: ["the town", "thi tran toi ac"],
    highlight: "Những phi vụ đột kích kho tiền ngân hàng tinh vi tại Boston và sự giằng xé giữa tình yêu với con đường hoàn lương.",
  },
];

function isGenericBoilerplate(text?: string): boolean {
  if (!text) return true;
  const lower = text.toLowerCase();
  return (
    lower.includes("tác phẩm tiêu biểu") ||
    lower.includes("tác phẩm đặc sắc") ||
    lower.includes("tác phẩm kinh điển gắn liền") ||
    lower.includes("gắn liền với tên tuổi") ||
    lower.includes("phong cách diễn xuất") ||
    lower.includes("siêu phẩm điện ảnh thịnh hành") ||
    lower.includes("phù hợp hoàn hảo với yêu cầu") ||
    lower.includes("sẵn sàng thưởng thức trên nền tảng") ||
    lower.includes("khớp chuẩn xác với yêu cầu") ||
    lower.includes("đạt điểm đánh giá cao") ||
    lower.includes("có điểm đánh giá cao") ||
    lower.includes("phim hay chất lượng cao")
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractUniqueMovieDescription(item: any, customReason?: string): string {
  if (customReason && customReason.trim().length >= 15 && !isGenericBoilerplate(customReason)) {
    return customReason.trim();
  }

  const rawName = cleanNormalizedString(item?.name || item?.title || "");
  const rawOrig = cleanNormalizedString(item?.origin_name || "");

  // 1. Kiểm tra từ điển Highlight độc bản của các siêu phẩm nổi tiếng
  for (const h of MOVIE_SPECIFIC_HIGHLIGHTS) {
    if (h.patterns.some((p) => rawName.includes(p) || (rawOrig && rawOrig.includes(p)))) {
      return h.highlight;
    }
  }

  // 2. Trích xuất từ tóm tắt cốt truyện trong Database nếu có
  const rawContent =
    item?.content ||
    item?.description ||
    item?.overview ||
    item?.movie?.content ||
    item?.movie?.description ||
    "";

  const clean = cleanHtmlText(rawContent).trim();
  if (clean.length > 20) {
    const sentences = clean.split(/(?<=[.?!])\s+/);
    if (sentences[0] && sentences[0].length >= 30 && sentences[0].length <= 150) {
      return sentences[0];
    }
    if (clean.length > 140) {
      return clean.slice(0, 137).trim() + "...";
    }
    return clean;
  }

  // 3. Tạo mô tả động cá nhân hóa theo diễn viên và thể loại
  const title = item?.name || item?.title || "Bộ phim";
  const orig = item?.origin_name ? ` (${item.origin_name})` : "";
  const actors = toSafeActors(item);
  const category = toSafeCategory(item);
  const year = extractMovieYear(item) ? ` (${extractMovieYear(item)})` : "";

  if (actors.length > 0) {
    return `${title}${orig}${year} gây ấn tượng với màn hóa thân của ${actors.slice(0, 2).join(", ")} trong câu chuyện ${category.toLowerCase()} kịch tính và lôi cuốn.`;
  }

  return `${title}${orig}${year} là tác phẩm ${category.toLowerCase()} hấp dẫn với những nút thắt cao trào và tình tiết đầy bất ngờ.`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TITLE_LOOKUP_CACHE = new Map<string, { item: any; expireAt: number }>();

export interface MatchOptions {
  expectedCountry?: string;
  expectedGenre?: string;
  expectedActorSlug?: string;
  yearFrom?: number;
  yearTo?: number;
  isLatest?: boolean;
  excludedCountries?: string[];
  excludedGenres?: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findBestMatchMovie(items: any[], query: string, originalQuery?: string, options?: MatchOptions): any {
  if (!items || items.length === 0) return null;
  const cleanQ = cleanNormalizedString(query || "");
  const cleanOq = cleanNormalizedString(originalQuery || "");

  let bestItem = null;
  let bestScore = -999;

  for (const it of items) {
    const name = cleanNormalizedString(it.name || it.title || "");
    const orig = cleanNormalizedString(it.origin_name || "");
    const slug = cleanNormalizedString(it.slug || "");
    const country = toSafeCountry(it);
    const category = toSafeCategory(it);
    const itemYear = extractMovieYear(it);
    const itemActors = toSafeActors(it);

    // 1. Kiểm tra loại trừ quốc gia/thể loại bị cấm (Hard negative constraint)
    if (options?.excludedCountries && options.excludedCountries.length > 0) {
      if (options.excludedCountries.some((ex) => matchesCountry(country, ex))) {
        continue;
      }
    }
    if (options?.excludedGenres && options.excludedGenres.length > 0) {
      if (options.excludedGenres.some((ex) => matchesGenre(category, ex))) {
        continue;
      }
    }

    // 2. Hard filter khi người dùng tìm phim mới nhất (2025-2026)
    if (options?.isLatest) {
      const curYear = new Date().getFullYear();
      if (itemYear > 0 && itemYear < curYear - 1) {
        continue; // Tuyệt đối không lấy phim cũ khi người dùng yêu cầu mới nhất
      }
    }

    let score = 0;

    // So khớp tiêu đề (Title Match)
    if (name === cleanQ || (cleanOq && (name === cleanOq || orig === cleanOq))) {
      score += 100;
    } else if (slug === cleanQ.replace(/\s+/g, "-") || (cleanOq && slug === cleanOq.replace(/\s+/g, "-"))) {
      score += 90;
    } else if (name.startsWith(cleanQ) || (cleanOq && (name.startsWith(cleanOq) || orig.startsWith(cleanOq)))) {
      score += 75;
    } else if (name.includes(cleanQ) || (cleanOq && (name.includes(cleanOq) || orig.includes(cleanOq)))) {
      score += 55;
    } else {
      const qWords = (cleanOq || cleanQ).split(" ").filter((w) => w.length > 1);
      if (qWords.length > 1) {
        const matchWords = qWords.filter((w) => name.includes(w) || (orig && orig.includes(w)));
        const ratio = matchWords.length / qWords.length;
        if (ratio >= 0.5) score += Math.round(ratio * 50);
      }
    }

    const lenDiff = Math.abs(name.length - cleanQ.length);
    score -= Math.min(20, lenDiff * 1.2);

    if (it.thumb_url || it.poster_url) score += 10;

    // SCORING: Điểm thưởng & Phạt mềm thay vì Hard AND Drop
    if (options?.expectedCountry) {
      if (matchesCountry(country, options.expectedCountry)) {
        score += 30;
      } else if (country && !matchesCountry(country, options.expectedCountry)) {
        score -= 25; // Phạt vừa phải nếu lệch quốc gia
      }
    }

    if (options?.expectedGenre) {
      if (matchesGenre(category, options.expectedGenre)) {
        score += 20;
      }
    }

    // Kiểm tra loại trừ diễn viên nếu expectedActorSlug được chỉ định (Field Separation)
    if (options?.expectedActorSlug) {
      const hasActor = matchesActor(itemActors, options.expectedActorSlug);
      const isKnownFilm = isActorTopTitle(name, orig, options.expectedActorSlug);
      if (hasActor) {
        score += 50;
      } else if (isKnownFilm) {
        score += 40;
      } else if (itemActors.length > 0) {
        // Có danh sách diễn viên cụ thể nhưng không chứa diễn viên cần tìm -> Loại bỏ ngay để tránh nhầm lẫn title
        continue;
      } else {
        score -= 30;
      }
    }

    // Kiểm tra năm theo khoảng
    if (itemYear > 0 && options?.yearFrom && options?.yearTo) {
      if (itemYear >= options.yearFrom && itemYear <= options.yearTo) {
        score += 30;
      } else if (Math.abs(itemYear - options.yearFrom) <= 3 || Math.abs(itemYear - options.yearTo) <= 3) {
        score += 10; // Gần đúng thập niên
      } else {
        score -= 25; // Lệch xa thập niên thì trừ điểm
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestItem = it;
    }
  }

  return bestScore >= 40 ? bestItem : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function queryPhimApiDirect(keyword: string, originalKeyword?: string, options?: MatchOptions): Promise<any> {
  if (!keyword?.trim()) return null;
  try {
    const res = await fetch(
      `https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword.trim())}&limit=8`,
      { signal: AbortSignal.timeout(2400), next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const items = json?.data?.items || [];
    if (items.length > 0) {
      const best = findBestMatchMovie(items, keyword, originalKeyword, options);
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
async function searchSingleMovieFast(title: string, originalTitle?: string, options?: MatchOptions): Promise<any> {
  const cleanTitle = (title || "").replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "").trim();
  const cleanOriginal = (originalTitle || "").replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "").trim();
  if (!cleanTitle && !cleanOriginal) return null;

  const key = `${cleanTitle}__${cleanOriginal}__${options?.expectedCountry || ""}__${options?.expectedGenre || ""}__${options?.yearFrom || ""}`.toLowerCase();
  const cached = TITLE_LOOKUP_CACHE.get(key);
  if (cached && Date.now() < cached.expireAt) return cached.item;

  let foundItem = null;

  if (cleanTitle) {
    foundItem = await queryPhimApiDirect(cleanTitle, cleanOriginal, options);
  }

  if (!foundItem && cleanOriginal && cleanOriginal !== cleanTitle) {
    foundItem = await queryPhimApiDirect(cleanOriginal, cleanTitle, options);
  }

  if (!foundItem && cleanTitle) {
    try {
      const res1 = await Promise.race([
        movieApi.getMovies({ keyword: cleanTitle, page: 1, limit: 6 }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
      ]);
      if (res1?.items && res1.items.length > 0) {
        foundItem = findBestMatchMovie(res1.items, cleanTitle, cleanOriginal, options);
      }
    } catch {}
  }

  if (!foundItem && cleanOriginal && cleanOriginal !== cleanTitle) {
    try {
      const res2 = await Promise.race([
        movieApi.getMovies({ keyword: cleanOriginal, page: 1, limit: 6 }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
      ]);
      if (res2?.items && res2.items.length > 0) {
        foundItem = findBestMatchMovie(res2.items, cleanOriginal, cleanTitle, options);
      }
    } catch {}
  }

  if (foundItem) {
    TITLE_LOOKUP_CACHE.set(key, { item: foundItem, expireAt: Date.now() + 1000 * 60 * 60 * 24 });
  } else {
    TITLE_LOOKUP_CACHE.set(key, { item: null, expireAt: Date.now() + 1000 * 60 });
  }

  return foundItem;
}

interface CacheEntry {
  reply: string;
  mood: string;
  movies: SuggestionCard[];
  provider: string;
  cachedAt: number;
}

const AI_RESPONSE_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 300;

function normalizeQuery(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'<>]/g, "")
    .replace(/\s+/g, " ");
}

const ipRequestMap = new Map<string, { count: number; expiresAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRequestMap.get(ip);
  if (!record || record.expiresAt < now) {
    ipRequestMap.set(ip, { count: 1, expiresAt: now + 60_000 });
    return true;
  }
  if (record.count >= 40) {
    return false;
  }
  record.count += 1;
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeParseAiJson(rawText: string): any {
  if (!rawText) return null;
  let cleaned = rawText.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];

  try {
    return JSON.parse(cleaned);
  } catch {
    try {
      const sanitized = cleaned
        .replace(/,\s*([\}\]])/g, "$1")
        .replace(/[\u0000-\u001F]+/g, " ");
      return JSON.parse(sanitized);
    } catch {
      try {
        let repaired = cleaned;
        const openBraces = (repaired.match(/\{/g) || []).length;
        const closeBraces = (repaired.match(/\}/g) || []).length;
        const openBrackets = (repaired.match(/\[/g) || []).length;
        const closeBrackets = (repaired.match(/\]/g) || []).length;

        if (repaired.lastIndexOf('"') !== -1 && (repaired.match(/"/g) || []).length % 2 !== 0) {
          repaired += '"';
        }
        for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += "]";
        for (let i = 0; i < openBraces - closeBraces; i++) repaired += "}";

        return JSON.parse(repaired);
      } catch {
        const analysisMatch = cleaned.match(/"analysis"\s*:\s*"((?:\\.|[^"\\])*)"/);
        const moodMatch = cleaned.match(/"mood"\s*:\s*"((?:\\.|[^"\\])*)"/);
        const genreMatch = cleaned.match(/"genres?"\s*:\s*"((?:\\.|[^"\\])*)"/);
        const countryMatch = cleaned.match(/"country"\s*:\s*"((?:\\.|[^"\\])*)"/);
        const actorMatch = cleaned.match(/"actor"\s*:\s*"((?:\\.|[^"\\])*)"/);

        const movies: Array<{ title: string; original_title?: string; reason?: string }> = [];
        const movieRegex = /"title"\s*:\s*"((?:\\.|[^"\\])*)"(?:[^{}]*?"original_title"\s*:\s*"((?:\\.|[^"\\])*)")?(?:[^{}]*?"reason"\s*:\s*"((?:\\.|[^"\\])*)")?/g;
        let m;
        while ((m = movieRegex.exec(cleaned)) !== null) {
          if (m[1] && m[1].trim()) {
            movies.push({
              title: m[1].trim(),
              original_title: m[2]?.trim() || "",
              reason: m[3]?.trim() || "",
            });
          }
        }

        if (movies.length > 0 || analysisMatch) {
          return {
            analysis: analysisMatch ? analysisMatch[1] : "",
            mood: moodMatch ? moodMatch[1] : "",
            genres: genreMatch ? [genreMatch[1]] : [],
            country: countryMatch ? countryMatch[1] : "",
            actor: actorMatch ? actorMatch[1] : "",
            movies,
          };
        }
        return null;
      }
    }
  }
}

export async function GET() {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  return NextResponse.json({
    hasServerKey: hasKey,
    activeModel: "Google Gemini Flash & Groq Universal Reasoning",
    status: hasKey ? "ready" : "fallback_only",
    cacheSize: AI_RESPONSE_CACHE.size,
  });
}

// ============================================================================
// BƯỚC 1: USER INPUT & POST CONTROLLER
// ============================================================================
export async function POST(req: NextRequest) {
  try {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "anonymous_client";

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        {
          error: "Bạn đang gửi yêu cầu quá nhanh. Vui lòng chờ 30 giây rồi thử lại để bảo vệ hệ thống.",
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const prompt: string = body.prompt?.trim() || "";
    const userApiKey: string = body.apiKey?.trim() || "";

    if (!prompt) {
      return NextResponse.json(
        { error: "Vui lòng nhập tâm trạng hoặc câu hỏi phim của bạn." },
        { status: 400 }
      );
    }

    // Kiểm tra cache hit
    const cacheKey = normalizeQuery(prompt);
    const cachedItem = AI_RESPONSE_CACHE.get(cacheKey);
    if (cachedItem && Date.now() - cachedItem.cachedAt < CACHE_TTL_MS) {
      return NextResponse.json({
        reply: cachedItem.reply,
        mood: cachedItem.mood,
        movies: cachedItem.movies,
        provider: cachedItem.provider || "Nana AI",
        cached: true,
      });
    }

    // ========================================================================
    // BƯỚC 2: STRUCTURED EXTRACTION (AI TRÍCH XUẤT CẤU TRÚC JSON CHUẨN)
    // ========================================================================
    const currentYear = new Date().getFullYear();

    const systemPrompt = `Bạn là Nana AI - Trợ Lý Điện Ảnh Thông Minh & Phân Tích Ý Định Tìm Kiếm Phim của Nanaflix.
MỐC THỜI GIAN HIỆN TẠI: Năm ${currentYear}.

NHIỆM VỤ:
Phân tích yêu cầu tự nhiên của người dùng (kể cả câu dài phức tạp kết hợp thể loại + quốc gia + khoảng năm/thập niên + chi tiết cốt truyện) và trích xuất thành đối tượng JSON chuẩn xác.

CÁC TRƯỜNG BẮT BUỘC TRÍCH XUẤT:
1. "genres": Mảng các thể loại chuẩn hóa về slug (ví dụ: ["hanh-dong"], ["kinh-di"], ["tinh-cam"], ["hoat-hinh"], ["vien-tuong"], ["co-trang"], ["tam-ly"], ["trinh-tham"], ["vo-thuat"]).
2. "country": Quốc gia mục tiêu chuẩn hóa về slug ("au-my" cho Mỹ/Hollywood/Âu Mỹ, "thai-lan" cho Thái Lan, "han-quoc" cho Hàn Quốc, "hong-kong" cho Hồng Kông, "nhat-ban" cho Nhật Bản, "trung-quoc" cho Trung Quốc, "viet-nam" cho Việt Nam). Nếu không có, để "".
3. "is_latest": boolean (true nếu người dùng tìm "mới nhất", "mới ra", "mới ra mắt", "vừa chiếu", "năm nay", "latest", "newest", "recently").
4. "years": Khoảng thời gian chính xác { "from": number, "to": number }.
   - Nếu người dùng tìm "mới nhất" / "năm nay" -> { "from": ${currentYear - 1}, "to": ${currentYear} }
   - "thập niên 90" -> { "from": 1990, "to": 1999 }
   - "thập niên 80" -> { "from": 1980, "to": 1989 }
   - "thập niên 2000" -> { "from": 2000, "to": 2009 }
   - "năm ${currentYear}" -> { "from": ${currentYear}, "to": ${currentYear} }
   - Nếu không nói mốc thời gian -> { "from": 0, "to": 0 }
5. "keyword": Từ khóa đặc thù cốt truyện hoặc bối cảnh (ví dụ: "cướp ngân hàng", "vòng lặp thời gian", "sóng thần", "đầu bếp", "đấu trí").
6. "actor": Diễn viên nếu có (ví dụ: "Thành Long", "Châu Tinh Trì", "Tom Cruise"...).
7. "director": Đạo diễn nếu có.
8. "excluded_countries": Mảng quốc gia người dùng yêu cầu loại trừ (ví dụ: "không lấy phim Mỹ" -> ["au-my"]).
9. "suggested_movies": Đề xuất 8-10 phim THỰC TẾ, KINH ĐIỂN khớp với quốc gia, thể loại, khoảng năm và cốt truyện.
   - BẮT BUỘC VỀ TRƯỜNG "reason": Mỗi bộ phim BẮT BUỘC PHẢI CÓ 1 ĐOẠN TÓM TẮT ĐỘC BẢN (1-2 câu) về điểm nhấn cốt truyện hoặc nút thắt kịch tính của CHÍNH BỘ PHIM ĐÓ.
   - TUYỆT ĐỐI CẤM dùng câu rập khuôn chung chung như "Tác phẩm tiêu biểu cùng chủ đề...", "Phim có đánh giá cao...".
10. KHÔNG BIAS TÊN: Tuyệt đối không tự động đưa anime "Nana" vào danh sách trừ khi người dùng đích danh tìm kiếm phim đó.
11. "analysis": Lời chào tự nhiên, sành sỏi về điện ảnh giới thiệu ngắn gọn điểm hấp dẫn nhất của nhóm phim này (KHÔNG lặp lại nguyên văn câu hỏi người dùng).

BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON (KHÔNG KÈM TEXT NGOÀI JSON):
{
  "analysis": "Lời chào tự nhiên giới thiệu nhóm phim được chọn",
  "mood": "Tên chủ đề ngắn gọn kèm Emoji (vd: 'Phim Chiếu Rạp Mới Nhất ${currentYear} 🎬✨')",
  "genres": ["hanh-dong"],
  "country": "au-my",
  "is_latest": true,
  "years": {
    "from": ${currentYear - 1},
    "to": ${currentYear}
  },
  "keyword": "",
  "actor": "",
  "director": "",
  "excluded_countries": [],
  "excluded_genres": [],
  "suggested_movies": [
    {
      "title": "Tên tiếng Việt",
      "original_title": "Tên gốc quốc tế / tiếng Anh",
      "year": ${currentYear},
      "reason": "Mô tả ngắn gọn, cụ thể về nội dung, nhân vật hoặc nút thắt cốt truyện của chính phim này"
    }
  ]
}`;

    let aiParsed: {
      analysis?: string;
      mood?: string;
      genres?: string[];
      genre?: string;
      country?: string;
      is_latest?: boolean;
      years?: { from?: number; to?: number };
      year_from?: number;
      year_to?: number;
      keyword?: string;
      actor?: string;
      director?: string;
      excluded_countries?: string[];
      excluded_genres?: string[];
      suggested_movies?: Array<{
        title: string;
        original_title?: string;
        year?: number;
        reason?: string;
      }>;
      movies?: Array<{
        title: string;
        original_title?: string;
        year?: number;
        reason?: string;
      }>;
    } | null = null;

    let aiProviderName = "Nana AI Engine";

    try {
      const aiRes = await generateFastAiChat({
        systemPrompt,
        userPrompt: `Phân tích yêu cầu tìm phim: "${prompt}". Mốc năm hiện tại là ${currentYear}. Trả về JSON theo đúng định dạng.`,
        temperature: 0.2,
        maxTokens: 1400,
        jsonMode: true,
        customApiKey: userApiKey,
        timeoutMs: 9500,
      });

      if (aiRes && aiRes.text) {
        aiParsed = safeParseAiJson(aiRes.text);
        if (aiRes.provider) aiProviderName = aiRes.provider;
      }
    } catch (aiErr) {
      console.warn("AI LLM call failed or timed out:", aiErr);
    }

    // ========================================================================
    // BƯỚC 3: RELAXED SCORING & DETERMINISTIC DATABASE RESOLUTION
    // ========================================================================
    const rawActor = aiParsed?.actor || "";
    const rawCountry = aiParsed?.country || "";
    const rawDirector = aiParsed?.director || "";
    const rawKeyword = aiParsed?.keyword || "";

    const rawGenreList = Array.isArray(aiParsed?.genres)
      ? aiParsed.genres
      : (aiParsed?.genre ? [aiParsed.genre] : []);

    const targetGenreSlug = rawGenreList.map(resolveGenreSlug).find(Boolean) || resolveGenreSlug(prompt);
    const targetCountrySlug = resolveCountrySlug(rawCountry) || resolveCountrySlug(prompt);
    const targetActorSlug = resolveActorSlug(rawActor) || resolveActorSlug(prompt);

    // Xử lý cờ "Phim mới nhất" (Latest / Newest)
    const lowerPrompt = prompt.toLowerCase();
    const isLatest =
      Boolean(aiParsed?.is_latest) ||
      lowerPrompt.includes("mới nhất") ||
      lowerPrompt.includes("moi nhat") ||
      lowerPrompt.includes("mới ra") ||
      lowerPrompt.includes("moi ra") ||
      lowerPrompt.includes("mới chiếu") ||
      lowerPrompt.includes("moi chieu") ||
      lowerPrompt.includes("vừa ra") ||
      lowerPrompt.includes("vua ra") ||
      lowerPrompt.includes("vừa chiếu") ||
      lowerPrompt.includes("vua chieu") ||
      lowerPrompt.includes("năm nay") ||
      lowerPrompt.includes("nam nay") ||
      lowerPrompt.includes("latest") ||
      lowerPrompt.includes("newest") ||
      lowerPrompt.includes("recently");

    // Xử lý khoảng năm
    let yearFrom = aiParsed?.years?.from || aiParsed?.year_from || 0;
    let yearTo = aiParsed?.years?.to || aiParsed?.year_to || 0;

    if (isLatest) {
      if (!yearFrom || yearFrom < currentYear - 1) {
        yearFrom = currentYear - 1;
        yearTo = currentYear;
      }
    } else if (!yearFrom && !yearTo) {
      if (lowerPrompt.includes("thap nien 90") || lowerPrompt.includes("thập niên 90") || lowerPrompt.includes("90s")) {
        yearFrom = 1990;
        yearTo = 1999;
      } else if (lowerPrompt.includes("thap nien 80") || lowerPrompt.includes("thập niên 80") || lowerPrompt.includes("80s")) {
        yearFrom = 1980;
        yearTo = 1989;
      } else if (lowerPrompt.includes("thap nien 2000") || lowerPrompt.includes("thập niên 2000") || lowerPrompt.includes("2000s")) {
        yearFrom = 2000;
        yearTo = 2009;
      } else if (lowerPrompt.includes("thap nien 70") || lowerPrompt.includes("thập niên 70") || lowerPrompt.includes("70s")) {
        yearFrom = 1970;
        yearTo = 1979;
      }
    }

    const excludedCountrySlugs: string[] = [];
    for (const rawEx of aiParsed?.excluded_countries || []) {
      const s = resolveCountrySlug(rawEx);
      if (s && !excludedCountrySlugs.includes(s)) excludedCountrySlugs.push(s);
      else if (rawEx && !excludedCountrySlugs.includes(rawEx.toLowerCase())) excludedCountrySlugs.push(rawEx.toLowerCase());
    }

    if (
      (lowerPrompt.includes("không lấy") || lowerPrompt.includes("trừ") || lowerPrompt.includes("loại trừ") || lowerPrompt.includes("ko lấy")) &&
      (lowerPrompt.includes("mỹ") || lowerPrompt.includes("hollywood") || lowerPrompt.includes("âu mỹ") || lowerPrompt.includes("us"))
    ) {
      if (!excludedCountrySlugs.includes("au-my")) excludedCountrySlugs.push("au-my");
    }

    const excludedGenreSlugs: string[] = [];
    for (const rawEx of aiParsed?.excluded_genres || []) {
      const s = resolveGenreSlug(rawEx);
      if (s && !excludedGenreSlugs.includes(s)) excludedGenreSlugs.push(s);
    }

    const matchOptions: MatchOptions = {
      expectedCountry: targetCountrySlug || undefined,
      expectedGenre: targetGenreSlug || undefined,
      expectedActorSlug: targetActorSlug || undefined,
      yearFrom: yearFrom || undefined,
      yearTo: yearTo || undefined,
      isLatest: isLatest || undefined,
      excludedCountries: excludedCountrySlugs.length ? excludedCountrySlugs : undefined,
      excludedGenres: excludedGenreSlugs.length ? excludedGenreSlugs : undefined,
    };

    const cards: SuggestionCard[] = [];
    const seenSlugs = new Set<string>();

    // 1. TỔNG HỢP DANH SÁCH ỨNG VIÊN ĐA NGUỒN (AI Suggestions + Filmography Top Titles)
    const candidateMovieList: Array<{ title: string; original_title?: string; year?: number; reason?: string }> = [
      ...(aiParsed?.suggested_movies || aiParsed?.movies || []),
    ];

    if (targetActorSlug && ACTOR_TOP_TITLES[targetActorSlug]) {
      for (const t of ACTOR_TOP_TITLES[targetActorSlug]) {
        const viTitle = t.replace(/\([^)]*\)/g, "").trim();
        const matchEng = t.match(/\(([^)]+)\)/);
        const engTitle = matchEng ? matchEng[1].trim() : "";
        if (!candidateMovieList.some((c) => cleanNormalizedString(c.title) === cleanNormalizedString(viTitle))) {
          candidateMovieList.push({
            title: viTitle,
            original_title: engTitle,
          });
        }
      }
    }

    // 2. Pass 1: Tra cứu song song toàn bộ danh sách ứng viên (Title Match + Soft Scoring)
    if (candidateMovieList.length > 0) {
      let filteredSuggestions = candidateMovieList;
      if (!lowerPrompt.includes("anime nana") && !lowerPrompt.includes("nana osaki") && !lowerPrompt.includes("nana komatsu")) {
        filteredSuggestions = filteredSuggestions.filter(
          (m) => m.title.toLowerCase().trim() !== "nana" && (m.original_title || "").toLowerCase().trim() !== "nana"
        );
      }

      const lookupPromises = filteredSuggestions.slice(0, 35).map(async (m) => {
        const found = await searchSingleMovieFast(m.title, m.original_title, matchOptions);
        return {
          suggested: m,
          found,
        };
      });

      const resolved = await Promise.all(lookupPromises);

      for (const item of resolved) {
        if (item.found && item.found.slug && !seenSlugs.has(item.found.slug)) {
          const itemCountry = toSafeCountry(item.found);
          const itemCategory = toSafeCategory(item.found);
          const itemYear = extractMovieYear(item.found) || extractMovieYear(item.suggested) || 0;
          const itemActors = toSafeActors(item.found);

          // Loại trừ hard negative
          if (excludedCountrySlugs.some((ex) => matchesCountry(itemCountry, ex))) continue;
          if (excludedGenreSlugs.some((ex) => matchesGenre(itemCategory, ex))) continue;

          // Kiểm tra khớp diễn viên chặt chẽ nếu người dùng tìm theo diễn viên (Field Separation)
          if (targetActorSlug) {
            const hasActor = matchesActor(itemActors, targetActorSlug);
            const isKnownFilm = isActorTopTitle(item.found.name || "", item.found.origin_name || "", targetActorSlug);
            if (!hasActor && !isKnownFilm && itemActors.length > 0) {
              continue;
            }
          }

          // Hard filter: Nếu người dùng tìm phim mới nhất, loại bỏ phim cũ (< currentYear - 1)
          if (isLatest && itemYear > 0 && itemYear < currentYear - 1) {
            continue;
          }

          // Nếu lệch hoàn toàn quốc gia khi người dùng yêu cầu rõ ràng (ví dụ hỏi Mỹ mà ra Trung Quốc)
          if (targetCountrySlug && itemCountry && !matchesCountry(itemCountry, targetCountrySlug)) {
            // Cho phép nếu tiêu đề khớp 100% tên phim quốc tế (tránh lỗi database gán sai country tag)
            const cleanTitle = cleanNormalizedString(item.suggested.title);
            const cleanOrig = cleanNormalizedString(item.suggested.original_title || "");
            const foundName = cleanNormalizedString(item.found.name || "");
            const foundOrig = cleanNormalizedString(item.found.origin_name || "");
            const isExactTitle = (cleanTitle && foundName === cleanTitle) || (cleanOrig && (foundOrig === cleanOrig || foundName === cleanOrig));
            if (!isExactTitle) continue;
          }

          seenSlugs.add(item.found.slug);
          cards.push({
            slug: item.found.slug,
            title: item.found.name || item.found.title || item.suggested.title,
            poster: toSafePoster(item.found),
            year: itemYear || 2024,
            quality: item.found.quality || "HD",
            category: itemCategory,
            country: itemCountry || (targetCountrySlug ? "Âu Mỹ" : "Quốc Tế"),
            actors: itemActors,
            reason: extractUniqueMovieDescription(item.found, item.suggested.reason),
          });
        }
      }
    }

    // 3. Pass 2: Truy vấn Phân Tầng Thông Minh (Pool Discovery & Relevance Scoring)
    if (cards.length < 24 && (targetActorSlug || targetGenreSlug || targetCountrySlug || rawKeyword || rawDirector || isLatest)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const queryTasks: Promise<any>[] = [];

      // Query 1: Theo Actor aliases nếu có (tìm theo đúng tên diễn viên, không dùng từ khóa gây nhiễu)
      if (targetActorSlug) {
        const aliases = getActorAliases(targetActorSlug);
        const mainName = aliases[0] || targetActorSlug.replace(/-/g, " ");
        queryTasks.push(movieApi.getMovies({ keyword: mainName, limit: 20 }));
        if (aliases[1]) {
          queryTasks.push(movieApi.getMovies({ keyword: aliases[1], limit: 20 }));
        }
      }

      // Query 2: Theo Keyword cốt truyện (chỉ áp dụng khi không phải tìm thuần diễn viên)
      if (!targetActorSlug && rawKeyword && rawKeyword.trim().length >= 2) {
        queryTasks.push(movieApi.getMovies({ keyword: rawKeyword.trim(), limit: 16 }));
        const firstWord = rawKeyword.split(" ")[0];
        if (firstWord && firstWord !== rawKeyword && firstWord.length >= 3) {
          queryTasks.push(movieApi.getMovies({ keyword: firstWord, limit: 12 }));
        }
      }

      // Query 3: Theo Genre + Country (hoặc truy vấn theo năm mới nhất 2025-2026)
      if (!targetActorSlug && (targetGenreSlug || targetCountrySlug || isLatest)) {
        if (isLatest) {
          queryTasks.push(
            movieApi.getMovies({
              category: targetGenreSlug || undefined,
              country: targetCountrySlug || undefined,
              year: currentYear,
              limit: 20,
              sort: "modified",
            })
          );
          queryTasks.push(
            movieApi.getMovies({
              category: targetGenreSlug || undefined,
              country: targetCountrySlug || undefined,
              year: currentYear - 1,
              limit: 20,
              sort: "modified",
            })
          );
        } else {
          queryTasks.push(
            movieApi.getMovies({
              category: targetGenreSlug || undefined,
              country: targetCountrySlug || undefined,
              limit: 20,
              sort: "rating",
            })
          );
        }
      }

      try {
        const poolResults = await Promise.allSettled(queryTasks);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const candidatePool: any[] = [];

        for (const res of poolResults) {
          if (res.status === "fulfilled" && res.value?.items && Array.isArray(res.value.items)) {
            for (const it of res.value.items) {
              if (it && it.slug && !seenSlugs.has(it.slug)) {
                candidatePool.push(it);
              }
            }
          }
        }

        // TÍNH ĐIỂM PHÙ HỢP (RELEVANCE SCORING) CHO TOÀN BỘ POOL
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const scoredCandidates: Array<{ item: any; score: number }> = [];

        for (const it of candidatePool) {
          const itemCountry = toSafeCountry(it);
          const itemCategory = toSafeCategory(it);
          const itemActors = toSafeActors(it);
          const itemYear = extractMovieYear(it);
          const itemName = cleanNormalizedString(it.name || "");
          const itemOrig = cleanNormalizedString(it.origin_name || "");
          const itemDesc = cleanNormalizedString(it.content || it.description || "");

          if (excludedCountrySlugs.some((ex) => matchesCountry(itemCountry, ex))) continue;
          if (excludedGenreSlugs.some((ex) => matchesGenre(itemCategory, ex))) continue;

          // Hard Filter: Phim mới nhất bắt buộc phải từ currentYear - 1 (2025-2026)
          if (isLatest) {
            if (itemYear > 0 && itemYear < currentYear - 1) {
              continue; // Bỏ qua phim cũ hơn 2 năm, không nhận vơ là mới nhất
            }
          }

          let score = 0;

          // Điểm khớp quốc gia
          if (targetCountrySlug) {
            if (matchesCountry(itemCountry, targetCountrySlug)) {
              score += 35;
            } else if (itemCountry) {
              score -= 30; // Trừ điểm nếu lệch hẳn quốc gia
            }
          }

          // Điểm khớp thể loại
          if (targetGenreSlug) {
            if (matchesGenre(itemCategory, targetGenreSlug)) {
              score += 25;
            }
          }

          // Điểm khớp diễn viên (Field Separation)
          if (targetActorSlug) {
            const hasActor = matchesActor(itemActors, targetActorSlug);
            const isKnownFilm = isActorTopTitle(itemName, itemOrig, targetActorSlug);
            if (hasActor) {
              score += 70;
            } else if (isKnownFilm) {
              score += 60;
            } else if (itemActors.length > 0) {
              // Có danh sách diễn viên cụ thể nhưng không có diễn viên đang tìm -> Loại bỏ
              continue;
            } else {
              score -= 40;
            }
          }

          // Điểm khớp từ khóa cốt truyện
          if (rawKeyword) {
            const cleanKw = cleanNormalizedString(rawKeyword);
            const kwWords = cleanKw.split(" ").filter((w) => w.length > 1);
            if (itemName.includes(cleanKw) || itemOrig.includes(cleanKw) || itemDesc.includes(cleanKw)) {
              score += 40;
            } else if (kwWords.some((w) => itemName.includes(w) || itemDesc.includes(w))) {
              score += 20;
            }
          }

          // Điểm khớp khoảng năm hoặc phim mới nhất
          if (isLatest) {
            if (itemYear >= currentYear) {
              score += 60;
            } else if (itemYear === currentYear - 1) {
              score += 45;
            }
          } else if (itemYear > 0 && yearFrom && yearTo) {
            if (itemYear >= yearFrom && itemYear <= yearTo) {
              score += 30;
            } else if (Math.abs(itemYear - yearFrom) <= 3 || Math.abs(itemYear - yearTo) <= 3) {
              score += 10;
            } else {
              score -= 35; // Lệch năm nhiều thì trừ điểm
            }
          }

          if (score >= 30) {
            scoredCandidates.push({ item: it, score });
          }
        }

        // Sắp xếp: Ưu tiên năm mới nhất (release_year DESC) nếu người dùng tìm mới nhất
        scoredCandidates.sort((a, b) => {
          if (isLatest) {
            const yA = extractMovieYear(a.item);
            const yB = extractMovieYear(b.item);
            if (yB !== yA) return yB - yA;
          }
          return b.score - a.score;
        });

        for (const sc of scoredCandidates) {
          if (cards.length >= 24) break;
          const it = sc.item;
          if (!seenSlugs.has(it.slug)) {
            seenSlugs.add(it.slug);
            const itemYear = extractMovieYear(it);
            cards.push({
              slug: it.slug,
              title: it.name || it.title || "Phim Hay",
              poster: toSafePoster(it),
              year: itemYear || 2024,
              quality: it.quality || "HD",
              category: toSafeCategory(it),
              country: toSafeCountry(it) || (targetCountrySlug ? "Âu Mỹ" : "Quốc Tế"),
              actors: toSafeActors(it),
              reason: extractUniqueMovieDescription(it),
            });
          }
        }
      } catch {}
    }

    // ========================================================================
    // BƯỚC 4: FALLBACK HANDLING (XỬ LÝ KHI KHÔNG CÓ PHIM)
    // TUYỆT ĐỐI KHÔNG LẤY PHIM NGẪU NHIÊN / PHIM SAI TIÊU CHÍ ĐẮP VÀO
    // ========================================================================
    let finalAnalysis = "";
    let finalMood = "";

    if (cards.length === 0) {
      if (isLatest) {
        const topicDesc = [
          targetGenreSlug ? "thể loại này" : "",
          targetCountrySlug === "au-my" ? "Mỹ/Hollywood" : (targetCountrySlug || ""),
          rawKeyword ? `chủ đề "${rawKeyword}"` : "",
        ].filter(Boolean).join(" ");

        finalAnalysis = `Chào bạn! Nana AI đã tra cứu toàn bộ cơ sở dữ liệu các tác phẩm mới nhất phát hành trong giai đoạn ${currentYear - 1} - ${currentYear}. Hiện tại kho phim của Nanaflix chưa có bản cập nhật mới nhất cho danh mục ${topicDesc || "theo yêu cầu của bạn"}.\n\nĐội ngũ Nanaflix đang liên tục cập nhật thêm nhiều phim mới ra rạp mỗi ngày. Bạn có thể thử tìm kiếm theo tên phim cụ thể hoặc khám phá các tác phẩm kinh điển đạt điểm đánh giá cao nhé! ✨🍿`;
        finalMood = `Chưa Có Phim Mới ${currentYear} 🎬`;
      } else {
        const yearDesc = (yearFrom || yearTo)
          ? (yearFrom === yearTo ? `năm ${yearFrom}` : `thập niên ${yearFrom}s (${yearFrom} - ${yearTo})`)
          : "";
        const topicDesc = [
          targetGenreSlug ? "hành động/giật gân" : "",
          targetCountrySlug === "au-my" ? "Mỹ/Hollywood" : targetCountrySlug,
          yearDesc,
          rawKeyword ? `chủ đề "${rawKeyword}"` : "",
        ].filter(Boolean).join(" ");

        finalAnalysis = `Chào bạn! Nana AI đã phân tích yêu cầu "${prompt}" và tra cứu toàn bộ cơ sở dữ liệu. Hiện tại, kho phim của Nanaflix chưa có sẵn các bộ phim đáp ứng đồng thời tất cả các điều kiện khắt khe này (${topicDesc || "theo yêu cầu chi tiết của bạn"}).\n\nĐội ngũ Nanaflix đang liên tục cập nhật thêm nhiều siêu phẩm điện ảnh kinh điển. Bạn có thể thử mở rộng mốc thời gian hoặc tìm kiếm theo tựa đề phim cụ thể nhé! ✨🍿`;
        finalMood = "Chưa Có Phim Phù Hợp 🎬";
      }
    } else {
      finalAnalysis =
        aiParsed?.analysis?.trim() ||
        `Chào bạn! Dưới đây là danh sách các siêu phẩm điện ảnh được Nana AI tuyển chọn phù hợp nhất với yêu cầu "${prompt}":`;
      finalMood = aiParsed?.mood || "Điện Ảnh Tuyển Chọn ⭐";
    }

    const finalPayload = {
      reply: finalAnalysis,
      mood: finalMood,
      movies: cards.slice(0, 24),
      provider: aiProviderName,
    };

    if (cards.length > 0) {
      if (AI_RESPONSE_CACHE.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = AI_RESPONSE_CACHE.keys().next().value;
        if (oldestKey) AI_RESPONSE_CACHE.delete(oldestKey);
      }
      AI_RESPONSE_CACHE.set(cacheKey, { ...finalPayload, cachedAt: Date.now() });
    }

    return NextResponse.json(finalPayload);
  } catch (error) {
    console.error("Lỗi AI Concierge:", error);
    return NextResponse.json(
      {
        reply: "Rất tiếc, đã có sự gián đoạn kết nối. Bạn hãy thử lại hoặc khám phá các thể loại thịnh hành trên thanh điều hướng nhé!",
        mood: "Gợi ý",
        movies: [],
      },
      { status: 500 }
    );
  }
}
