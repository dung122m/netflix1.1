export const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 giờ
export const MAX_CACHE_ENTRIES = 300;
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 40;
export const MAX_DURATION = 15;

// ============================================================================
// BẢNG ÁNH XẠ CHUẨN HÓA QUỐC GIA (COUNTRY SLUG MAP)
// ============================================================================
export const COUNTRY_SLUG_MAP: Record<string, string[]> = {
  "au-my": [
    "au-my", "us", "usa", "hollywood", "my", "mỹ", "hoa ky", "hoa kỳ",
    "au my", "âu mỹ", "anh", "uk", "phap", "pháp", "france", "duc",
    "đức", "germany", "y", "ý", "italy", "tay ban nha", "tây ban nha",
    "spain", "canada", "uc", "úc", "australia"
  ],
  "thai-lan": ["thai-lan", "thailand", "thai lan", "thái lan", "thai", "xiem"],
  "han-quoc": ["han-quoc", "korea", "han quoc", "hàn quốc", "south korea", "han", "hàn"],
  "trung-quoc": ["trung-quoc", "china", "trung quoc", "trung quốc", "chinese", "hoa ngu", "hoa ngữ", "dai luc", "đại lục"],
  "hong-kong": ["hong-kong", "hong kong", "hongkong", "hồng kông", "hk", "tvb"],
  "nhat-ban": ["nhat-ban", "japan", "nhat ban", "nhật bản", "japanese", "anime", "nhat", "nhật"],
  "viet-nam": ["viet-nam", "vietnam", "viet nam", "việt nam", "vn"],
  "dai-loan": ["dai-loan", "taiwan", "dai loan", "đài loan"],
  "an-do": ["an-do", "india", "an do", "ấn độ", "bollywood"],
};

// ============================================================================
// BẢNG ÁNH XẠ CHUẨN HÓA THỂ LOẠI (GENRE SLUG MAP)
// ============================================================================
export const GENRE_SLUG_MAP: Record<string, string[]> = {
  "hanh-dong": [
    "hanh-dong", "hanh dong", "hành động", "hanh dong giat gan", "hành động giật gân",
    "giat gan", "giật gân", "action", "thriller", "ban sung", "bắn súng", "truy duoi",
    "truy đuổi", "cuop", "cướp", "cuop ngan hang", "cướp ngân hàng", "heist"
  ],
  "kinh-di": [
    "kinh-di", "kinh di", "kinh dị", "horror", "ma", "ma quai", "ma quái",
    "rung ron", "rùng rợn", "am anh", "ám ảnh", "quy", "quỷ", "tam linh", "tâm linh"
  ],
  "hai-huoc": ["hai-huoc", "hai huoc", "hài hước", "hai", "hài", "comedy", "vui nhon", "vui nhộn", "cuoi", "cười"],
  "tinh-cam": [
    "tinh-cam", "tinh cam", "tình cảm", "lang man", "lãng mạn", "romance",
    "tinh yeu", "tình yêu", "ngon tinh", "ngôn tình", "chua lanh", "chữa lành",
    "dong que", "đồng quê", "slice of life"
  ],
  "hoat-hinh": ["hoat-hinh", "hoat hinh", "hoạt hình", "anime", "animation", "manga"],
  "vien-tuong": [
    "vien-tuong", "vien tuong", "viễn tưởng", "khoa hoc vien tuong", "khoa học viễn tưởng",
    "sci-fi", "scifi", "time loop", "vong lap", "vòng lặp", "du hanh", "du hành"
  ],
  "co-trang": ["co-trang", "co trang", "cổ trang", "tien hiep", "tiên hiệp", "cung dau", "cung đấu", "trieu dai", "triều đại"],
  "tam-ly": ["tam-ly", "tam ly", "tâm lý", "drama", "chinh kich", "chính kịch", "gia dinh", "gia đình"],
  "hinh-su": [
    "hinh-su", "hinh su", "hình sự", "trinh-tham", "trinh tham", "trinh thám", "pha an", "phá án",
    "toi pham", "tội phạm", "crime", "canh sat", "cảnh sát", "investigation", "tham tu", "thám tử"
  ],
  "bi-an": ["bi-an", "bi an", "bí ẩn", "mystery", "hack nao", "hack não", "dau tri", "đấu trí"],
  "vo-thuat": ["vo-thuat", "vo thuat", "võ thuật", "kungfu", "kung fu", "martial arts", "danh nhau", "đánh nhau"],
  "chien-tranh": ["chien-tranh", "chien tranh", "chiến tranh", "war", "quan su", "quân sự"],
  "tai-lieu": ["tai-lieu", "tai lieu", "tài liệu", "documentary"],
  "phieu-luu": ["phieu-luu", "phieu luu", "phiêu lưu", "adventure", "kham pha", "khám phá", "sinh ton", "sinh tồn"],
};
