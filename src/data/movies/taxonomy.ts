/**
 * Movie & TV taxonomy data mappings:
 * - Countries and their display names / slugs / ISO codes
 * - Genres and their display names / slugs
 * - TMDB genre and language-to-country safe mappings
 * - NguonC MD5 hash translation
 */

export const KNOWN_COUNTRIES = [
  "Hàn Quốc",
  "Trung Quốc",
  "Mỹ",
  "Âu Mỹ",
  "Nhật Bản",
  "Thái Lan",
  "Việt Nam",
  "Đài Loan",
  "Ấn Độ",
  "Hồng Kông",
  "Anh",
  "Pháp",
  "Tây Ban Nha",
  "Thổ Nhĩ Kỳ",
  "Đức",
  "Ý",
  "Nga",
  "Canada",
  "Úc",
  "Philippines",
  "Indonesia",
  "Malaysia",
  "Singapore",
  "Mexico",
  "Brazil",
];

// Bảng ánh xạ toàn diện mã quốc gia ISO, slug API (viet-nam, trung-quoc...) và tên thông dụng sang tiếng Việt chuẩn có dấu

export const COUNTRY_DISPLAY_MAP: Record<string, string> = {
  // Việt Nam
  "viet-nam": "Việt Nam",
  "vietnam": "Việt Nam",
  "viet nam": "Việt Nam",
  "việt nam": "Việt Nam",
  vn: "Việt Nam",
  vnm: "Việt Nam",

  // Trung Quốc
  "trung-quoc": "Trung Quốc",
  "trung quoc": "Trung Quốc",
  "trung quốc": "Trung Quốc",
  china: "Trung Quốc",
  cn: "Trung Quốc",
  chn: "Trung Quốc",

  // Hàn Quốc
  "han-quoc": "Hàn Quốc",
  "han quoc": "Hàn Quốc",
  "hàn quốc": "Hàn Quốc",
  korea: "Hàn Quốc",
  "south korea": "Hàn Quốc",
  "south-korea": "Hàn Quốc",
  kr: "Hàn Quốc",
  kor: "Hàn Quốc",

  // Nhật Bản
  "nhat-ban": "Nhật Bản",
  "nhat ban": "Nhật Bản",
  "nhật bản": "Nhật Bản",
  japan: "Nhật Bản",
  jp: "Nhật Bản",
  jpn: "Nhật Bản",

  // Mỹ / Hoa Kỳ
  my: "Mỹ",
  mỹ: "Mỹ",
  "hoa-ky": "Mỹ",
  "hoa ky": "Mỹ",
  "hoa kỳ": "Mỹ",
  "hợp chúng quốc hoa kỳ": "Mỹ",
  "united states": "Mỹ",
  "united-states": "Mỹ",
  us: "Mỹ",
  usa: "Mỹ",

  // Âu Mỹ
  "au-my": "Âu Mỹ",
  "au my": "Âu Mỹ",
  "âu mỹ": "Âu Mỹ",

  // Thái Lan
  "thai-lan": "Thái Lan",
  "thai lan": "Thái Lan",
  "thái lan": "Thái Lan",
  thailand: "Thái Lan",
  th: "Thái Lan",
  tha: "Thái Lan",

  // Đài Loan
  "dai-loan": "Đài Loan",
  "dai loan": "Đài Loan",
  "đài loan": "Đài Loan",
  taiwan: "Đài Loan",
  tw: "Đài Loan",
  twn: "Đài Loan",

  // Hồng Kông
  "hong-kong": "Hồng Kông",
  "hong kong": "Hồng Kông",
  hongkong: "Hồng Kông",
  "hồng kông": "Hồng Kông",
  hk: "Hồng Kông",
  hkg: "Hồng Kông",

  // Ấn Độ
  "an-do": "Ấn Độ",
  "an do": "Ấn Độ",
  "ấn độ": "Ấn Độ",
  india: "Ấn Độ",
  in: "Ấn Độ",
  ind: "Ấn Độ",

  // Anh / Vương quốc Anh
  anh: "Anh",
  "vuong-quoc-anh": "Anh",
  "vuong quoc anh": "Anh",
  "vương quốc anh": "Anh",
  "united kingdom": "Anh",
  "united-kingdom": "Anh",
  "great britain": "Anh",
  uk: "Anh",
  gb: "Anh",
  gbr: "Anh",

  // Pháp
  phap: "Pháp",
  pháp: "Pháp",
  france: "Pháp",
  fr: "Pháp",
  fra: "Pháp",

  // Canada
  canada: "Canada",
  ca: "Canada",
  can: "Canada",

  // Đức
  duc: "Đức",
  đức: "Đức",
  germany: "Đức",
  de: "Đức",
  deu: "Đức",

  // Tây Ban Nha
  "tay-ban-nha": "Tây Ban Nha",
  "tay ban nha": "Tây Ban Nha",
  "tây ban nha": "Tây Ban Nha",
  spain: "Tây Ban Nha",
  es: "Tây Ban Nha",
  esp: "Tây Ban Nha",

  // Thổ Nhĩ Kỳ
  "tho-nhi-ky": "Thổ Nhĩ Kỳ",
  "tho nhi ky": "Thổ Nhĩ Kỳ",
  "thổ nhĩ kỳ": "Thổ Nhĩ Kỳ",
  turkey: "Thổ Nhĩ Kỳ",
  tr: "Thổ Nhĩ Kỳ",
  tur: "Thổ Nhĩ Kỳ",

  // Nga
  nga: "Nga",
  russia: "Nga",
  ru: "Nga",
  rus: "Nga",

  // Úc
  uc: "Úc",
  úc: "Úc",
  australia: "Úc",
  au: "Úc",
  aus: "Úc",

  // Philippines
  philippines: "Philippines",
  ph: "Philippines",
  phl: "Philippines",

  // Singapore
  singapore: "Singapore",
  sg: "Singapore",
  sgp: "Singapore",

  // Malaysia
  malaysia: "Malaysia",
  mys: "Malaysia",

  // Indonesia
  indonesia: "Indonesia",
  id: "Indonesia",
  idn: "Indonesia",

  // Ý / Italia
  y: "Ý",
  ý: "Ý",
  "y-quoc": "Ý",
  "y quoc": "Ý",
  "ý quốc": "Ý",
  italia: "Ý",
  italy: "Ý",
  it: "Ý",
  ita: "Ý",

  // Mexico
  mexico: "Mexico",
  mx: "Mexico",
  mex: "Mexico",

  // Brazil
  brazil: "Brazil",
  br: "Brazil",
  bra: "Brazil",

  // Hà Lan
  "ha-lan": "Hà Lan",
  "ha lan": "Hà Lan",
  "hà lan": "Hà Lan",
  netherlands: "Hà Lan",
  nl: "Hà Lan",
  nld: "Hà Lan",

  // Thụy Điển
  "thuy-dien": "Thụy Điển",
  "thuy dien": "Thụy Điển",
  "thụy điển": "Thụy Điển",
  sweden: "Thụy Điển",
  se: "Thụy Điển",
  swe: "Thụy Điển",

  // Na Uy
  "na-uy": "Na Uy",
  "na uy": "Na Uy",
  norway: "Na Uy",
  no: "Na Uy",
  nor: "Na Uy",

  // Đan Mạch
  "dan-mach": "Đan Mạch",
  "dan mach": "Đan Mạch",
  "đan mạch": "Đan Mạch",
  denmark: "Đan Mạch",
  dk: "Đan Mạch",
  dnk: "Đan Mạch",

  // Ba Lan
  "ba-lan": "Ba Lan",
  "ba lan": "Ba Lan",
  poland: "Ba Lan",
  pl: "Ba Lan",
  pol: "Ba Lan",

  // Bỉ
  bi: "Bỉ",
  bỉ: "Bỉ",
  belgium: "Bỉ",
  be: "Bỉ",
  bel: "Bỉ",

  // Thụy Sĩ
  "thuy-si": "Thụy Sĩ",
  "thuy si": "Thụy Sĩ",
  "thụy sĩ": "Thụy Sĩ",
  switzerland: "Thụy Sĩ",
  ch: "Thụy Sĩ",
  che: "Thụy Sĩ",

  // Bồ Đào Nha
  "bo-dao-nha": "Bồ Đào Nha",
  "bo dao nha": "Bồ Đào Nha",
  "bồ đào nha": "Bồ Đào Nha",
  portugal: "Bồ Đào Nha",
  pt: "Bồ Đào Nha",
  prt: "Bồ Đào Nha",

  // Hy Lạp
  "hy-lap": "Hy Lạp",
  "hy lap": "Hy Lạp",
  "hy lạp": "Hy Lạp",
  greece: "Hy Lạp",
  gr: "Hy Lạp",
  grc: "Hy Lạp",

  // Argentina
  argentina: "Argentina",
  ar: "Argentina",
  arg: "Argentina",

  // Colombia
  colombia: "Colombia",
  co: "Colombia",
  col: "Colombia",

  // Chile
  chile: "Chile",
  cl: "Chile",
  chl: "Chile",

  // New Zealand
  "new-zealand": "New Zealand",
  "new zealand": "New Zealand",
  nz: "New Zealand",
  nzl: "New Zealand",

  // Ukraine
  ukraine: "Ukraine",
  ua: "Ukraine",
  ukr: "Ukraine",

  // Triều Tiên
  "trieu-tien": "Triều Tiên",
  "trieu tien": "Triều Tiên",
  "triều tiên": "Triều Tiên",
  "north korea": "Triều Tiên",
  kp: "Triều Tiên",
  prk: "Triều Tiên",

  // Nam Phi
  "nam-phi": "Nam Phi",
  "nam phi": "Nam Phi",
  "south africa": "Nam Phi",
  za: "Nam Phi",
  zaf: "Nam Phi",

  // Quốc tế
  "quoc-te": "Quốc Tế",
  "quốc tế": "Quốc Tế",
  international: "Quốc Tế",
};

// Bảng ánh xạ slug thể loại sang tiếng Việt có dấu chuẩn giao diện điện ảnh cao cấp

export const GENRE_DISPLAY_MAP: Record<string, string> = {
  "hanh-dong": "Hành Động",
  "hanh dong": "Hành Động",
  "action": "Hành Động",
  "tinh-cam": "Tình Cảm",
  "tinh cam": "Tình Cảm",
  "romance": "Tình Cảm",
  "kinh-di": "Kinh Dị",
  "kinh di": "Kinh Dị",
  "horror": "Kinh Dị",
  "hai-huoc": "Hài Hước",
  "hai huoc": "Hài Hước",
  "comedy": "Hài Hước",
  "vien-tuong": "Viễn Tưởng",
  "vien tuong": "Viễn Tưởng",
  "sci-fi": "Viễn Tưởng",
  "co-trang": "Cổ Trang",
  "co trang": "Cổ Trang",
  "tam-ly": "Tâm Lý",
  "tam ly": "Tâm Lý",
  "drama": "Tâm Lý",
  "vo-thuat": "Võ Thuật",
  "vo thuat": "Võ Thuật",
  "martial-arts": "Võ Thuật",
  "trinh-tham": "Trinh Thám",
  "trinh tham": "Trinh Thám",
  "detective": "Trinh Thám",
  "chien-tranh": "Chiến Tranh",
  "chien tranh": "Chiến Tranh",
  "war": "Chiến Tranh",
  "war & politics": "Chiến Tranh",
  "war-politics": "Chiến Tranh",
  "war and politics": "Chiến Tranh",
  "action & adventure": "Hành Động",
  "action-adventure": "Hành Động",
  "action and adventure": "Hành Động",
  "sci-fi & fantasy": "Viễn Tưởng",
  "sci-fi-fantasy": "Viễn Tưởng",
  "sci-fi and fantasy": "Viễn Tưởng",
  "history": "Lịch Sử",
  "historical": "Lịch Sử",
  "lich-su": "Lịch Sử",
  "lich su": "Lịch Sử",
  "politics": "Chính Trị",
  "chinh-tri": "Chính Trị",
  "western": "Miền Tây",
  "mien-tay": "Miền Tây",
  "kids": "Thiếu Nhi",
  "thieu-nhi": "Thiếu Nhi",
  "reality": "Thực Tế",
  "talk": "Talk Show",
  "news": "Thời Sự",
  "thoi-su": "Thời Sự",
  "phieu-luu": "Phiêu Lưu",
  "phieu luu": "Phiêu Lưu",
  "adventure": "Phiêu Lưu",
  "am-nhac": "Âm Nhạc",
  "am nhac": "Âm Nhạc",
  "music": "Âm Nhạc",
  "the-thao": "Thể Thao",
  "the thao": "Thể Thao",
  "sport": "Thể Thao",
  "sports": "Thể Thao",
  "tai-lieu": "Tài Liệu",
  "tai lieu": "Tài Liệu",
  "documentary": "Tài Liệu",
  "bi-an": "Bí Ẩn",
  "bi an": "Bí Ẩn",
  "mystery": "Bí Ẩn",
  "hoc-duong": "Học Đường",
  "hoc duong": "Học Đường",
  "school": "Học Đường",
  "gia-dinh": "Gia Đình",
  "gia dinh": "Gia Đình",
  "family": "Gia Đình",
  "khoa-hoc": "Khoa Học",
  "khoa hoc": "Khoa Học",
  "science": "Khoa Học",
  "than-thoai": "Thần Thoại",
  "than thoai": "Thần Thoại",
  "mythology": "Thần Thoại",
  "fantasy": "Thần Thoại",
  "hoat-hinh": "Hoạt Hình",
  "hoat hinh": "Hoạt Hình",
  "animation": "Hoạt Hình",
  "anime": "Hoạt Hình",
  "hinh-su": "Hình Sự",
  "hinh su": "Hình Sự",
  "crime": "Hình Sự",
  "chieu-rap": "Chiếu Rạp",
  "chieu rap": "Chiếu Rạp",
  "phim-chieu-rap": "Chiếu Rạp",
  "chinh-kich": "Chính Kịch",
  "chinh kich": "Chính Kịch",
  "lang-man": "Lãng Mạn",
  "lang man": "Lãng Mạn",
  "giat-gan": "Giật Gân",
  "giat gan": "Giật Gân",
  "thriller": "Giật Gân",
  "gay-can": "Gây Cấn",
  "gay can": "Gây Cấn",
  "phim-bo": "Phim Bộ",
  "phim bo": "Phim Bộ",
  "series": "Phim Bộ",
  "phim-le": "Phim Lẻ",
  "phim le": "Phim Lẻ",
  "single": "Phim Lẻ",
  "tv-shows": "TV Shows",
  "tv shows": "TV Shows",
};

// Tập hợp tất cả slug và tên thể loại (viết thường) để loại trừ tuyệt đối không nhầm sang quốc gia

export const KNOWN_GENRE_SET = new Set<string>([
  ...Object.keys(GENRE_DISPLAY_MAP).map((k) => k.toLowerCase()),
  ...Object.values(GENRE_DISPLAY_MAP).map((v) => v.toLowerCase()),
  ...Object.values(GENRE_DISPLAY_MAP).map((v) => v.toLowerCase().replace(/\s+/g, "-")),
  "hanh dong",
  "tinh cam",
  "kinh di",
  "hai huoc",
  "vien tuong",
  "co trang",
  "tam ly",
  "vo thuat",
  "trinh tham",
  "chien tranh",
  "lich su",
  "chinh tri",
  "mien tay",
  "thieu nhi",
  "thuc te",
  "thoi su",
  "phieu luu",
  "am nhac",
  "the thao",
  "tai lieu",
  "bi an",
  "hoc duong",
  "gia dinh",
  "khoa hoc",
  "than thoai",
  "hoat hinh",
  "hinh su",
  "chieu rap",
  "chinh kich",
  "lang man",
  "giat gan",
  "gay can",
  "phim bo",
  "phim le",
  "tv shows",
]);

/**
 * Chuẩn hóa tên quốc gia từ slug (viet-nam, trung-quoc...), mã ISO hoặc tên thô sang tiếng Việt chuẩn có dấu.
 */

export const TMDB_GENRE_ID_MAP: Record<number, string> = {
  28: "Hành Động",
  12: "Phiêu Lưu",
  16: "Hoạt Hình",
  35: "Hài Hước",
  80: "Hình Sự",
  99: "Tài Liệu",
  18: "Tâm Lý",
  10751: "Gia Đình",
  14: "Thần Thoại",
  36: "Lịch Sử",
  27: "Kinh Dị",
  10402: "Âm Nhạc",
  9648: "Bí Ẩn",
  10749: "Tình Cảm",
  878: "Viễn Tưởng",
  10770: "Phim Điện Ảnh",
  53: "Bí Ẩn",
  10752: "Chiến Tranh",
  37: "Miền Tây",
  // TMDB TV Series Genres
  10759: "Hành Động", // Action & Adventure
  10762: "Thiếu Nhi", // Kids
  10763: "Thời Sự",   // News
  10764: "Thực Tế",   // Reality
  10765: "Viễn Tưởng", // Sci-Fi & Fantasy
  10766: "Tâm Lý",    // Soap
  10767: "Talk Show",
  10768: "Chiến Tranh", // War & Politics
};

export const TMDB_SAFE_LANGUAGE_COUNTRY_MAP: Record<string, string> = {
  ko: "Hàn Quốc",
  kor: "Hàn Quốc",
  ja: "Nhật Bản",
  jpn: "Nhật Bản",
  zh: "Trung Quốc",
  zho: "Trung Quốc",
  chi: "Trung Quốc",
  cn: "Trung Quốc",
  th: "Thái Lan",
  tha: "Thái Lan",
  vi: "Việt Nam",
  vie: "Việt Nam",
  fr: "Pháp",
  fra: "Pháp",
  fre: "Pháp",
  de: "Đức",
  deu: "Đức",
  ger: "Đức",
  it: "Ý",
  ita: "Ý",
  es: "Tây Ban Nha",
  spa: "Tây Ban Nha",
  ru: "Nga",
  rus: "Nga",
  hi: "Ấn Độ",
  hin: "Ấn Độ",
  tr: "Thổ Nhĩ Kỳ",
  tur: "Thổ Nhĩ Kỳ",
  pl: "Ba Lan",
  pol: "Ba Lan",
  nl: "Hà Lan",
  nld: "Hà Lan",
  dut: "Hà Lan",
  sv: "Thụy Điển",
  swe: "Thụy Điển",
  no: "Na Uy",
  nor: "Na Uy",
  da: "Đan Mạch",
  dan: "Đan Mạch",
  fi: "Phần Lan",
  fin: "Phần Lan",
  el: "Hy Lạp",
  ell: "Hy Lạp",
  gre: "Hy Lạp",
  id: "Indonesia",
  ind: "Indonesia",
  tl: "Philippines",
  tgl: "Philippines",
  fil: "Philippines",
};

export const NGUONC_HASH_MAP: Record<string, { type: "genre" | "country"; slug: string }> = {
  "8f14e45fceea167a5a36dedd4bea2543": { type: "genre", slug: "hanh-dong" },
  "1f0e3dad99908345f7439f8ffabdffc4": { type: "genre", slug: "bi-an" },
  "3c59dc048e8850243be8079a5c74d079": { type: "genre", slug: "vien-tuong" },
  "6512bd43d9caa6e02c990b0a82652dca": { type: "genre", slug: "hinh-su" },
  "c51ce410c124a10e0db5e4b97fc2af39": { type: "genre", slug: "chinh-kich" },
  "70efdf2ec9b086079795c442636b55fb": { type: "genre", slug: "kinh-di" },
  "a8baa56554f96369ab93e4f3bb068c22": { type: "genre", slug: "co-trang" },
  "2a79ea27c279e471f4d180b08d62b00a": { type: "genre", slug: "tinh-cam" },
  "b6d767d2f8ed5d21a44b0e5886680cb9": { type: "genre", slug: "gay-can" },
  "c74d97b01eae257e44aa9d5bade97baf": { type: "genre", slug: "lich-su" },
  "c9f0f895fb98ab9159f51fd0297e236d": { type: "genre", slug: "phieu-luu" },
  "45c48cce2e2d7fbdea1afc51c7c6ad26": { type: "genre", slug: "hoat-hinh" },
  "aab3238922bcc25a6f606eb525ffdc56": { type: "genre", slug: "gia-dinh" },
  "903ce9225fca3e988c2af215d4e544d3": { type: "genre", slug: "tam-ly" },
  "9bf31c7ff062936a96d3c8bd1f8f2ff3": { type: "genre", slug: "vien-tuong" },
  "32bb90e8976aab5298d5da10fe66f21d": { type: "country", slug: "han-quoc" },
  "9a1158154dfa42caddbd0694a4e9bdc8": { type: "country", slug: "viet-nam" },
  "26657d5ff9020d2abefe558796b99584": { type: "country", slug: "an-do" },
  "c0c7c76d30bd3dcaefc96f40275bdc0a": { type: "country", slug: "trung-quoc" },
  "d2ddea18f00665ce8623e36bd4e3c7c5": { type: "country", slug: "nhat-ban" },
  "e2c420d928d4bf8ce0ff2ec19b371514": { type: "country", slug: "hong-kong" },
};

// Bảng ánh xạ slug thể loại sang NguonC
export const NGUONC_GENRE_MAP: Record<string, string> = {
  "hai-huoc": "phim-hai",
  "vien-tuong": "khoa-hoc-vien-tuong",
  "am-nhac": "phim-nhac",
  "vo-thuat": "hanh-dong",
  "than-thoai": "gia-tuong",
  "hoc-duong": "tam-ly",
  "the-thao": "tam-ly",
  "khoa-hoc": "khoa-hoc-vien-tuong",
};

export const DEFAULT_GENRES = [
  { name: "Hành Động", slug: "hanh-dong" },
  { name: "Tình Cảm", slug: "tinh-cam" },
  { name: "Cổ Trang", slug: "co-trang" },
  { name: "Tâm Lý", slug: "tam-ly" },
  { name: "Hài Hước", slug: "hai-huoc" },
  { name: "Hoạt Hình", slug: "hoat-hinh" },
  { name: "Kinh Dị", slug: "kinh-di" },
  { name: "Viễn Tưởng", slug: "vien-tuong" },
  { name: "Võ Thuật", slug: "vo-thuat" },
  { name: "Phiêu Lưu", slug: "phieu-luu" },
  { name: "Hình Sự", slug: "hinh-su" },
  { name: "Chiến Tranh", slug: "chien-tranh" },
  { name: "Tài Liệu", slug: "tai-lieu" },
  { name: "Bí Ẩn", slug: "bi-an" },
  { name: "Học Đường", slug: "hoc-duong" },
  { name: "Gia Đình", slug: "gia-dinh" },
  { name: "Âm Nhạc", slug: "am-nhac" },
  { name: "Thể Thao", slug: "the-thao" },
  { name: "Khoa Học", slug: "khoa-hoc" },
  { name: "Thần Thoại", slug: "than-thoai" },
];

export const DEFAULT_COUNTRIES = [
  { name: "Việt Nam", slug: "viet-nam" },
  { name: "Trung Quốc", slug: "trung-quoc" },
  { name: "Hàn Quốc", slug: "han-quoc" },
  { name: "Nhật Bản", slug: "nhat-ban" },
  { name: "Thái Lan", slug: "thai-lan" },
  { name: "Âu Mỹ", slug: "au-my" },
  { name: "Đài Loan", slug: "dai-loan" },
  { name: "Hồng Kông", slug: "hong-kong" },
  { name: "Ấn Độ", slug: "an-do" },
  { name: "Anh", slug: "anh" },
  { name: "Pháp", slug: "phap" },
  { name: "Canada", slug: "canada" },
  { name: "Đức", slug: "duc" },
  { name: "Tây Ban Nha", slug: "tay-ban-nha" },
  { name: "Thổ Nhĩ Kỳ", slug: "tho-nhi-ky" },
  { name: "Nga", slug: "nga" },
  { name: "Úc", slug: "uc" },
];
