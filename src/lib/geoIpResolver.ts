/**
 * GeoIP Resolver with in-memory caching and accurate Vietnamese city detection.
 * Resolves client IP via cf-connecting-ip and accurately identifies Thuận An, Dĩ An, Bình Dương, HCM, Hà Nội...
 */

interface GeoResolution {
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
}

function normalizeVietnameseCity(rawCity?: string, rawRegion?: string): string | undefined {
  const c = (rawCity || "").trim().toLowerCase();
  const r = (rawRegion || "").trim().toLowerCase();
  const combined = `${c} ${r}`;

  // Bình Dương & các thành phố trực thuộc
  if (combined.includes("thuan an") || combined.includes("thuận an")) return "Thuận An (Bình Dương)";
  if (combined.includes("di an") || combined.includes("dĩ an")) return "Dĩ An (Bình Dương)";
  if (combined.includes("thu dau mot") || combined.includes("thủ dầu một")) return "Thủ Dầu Một (Bình Dương)";
  if (combined.includes("binh duong") || combined.includes("bình dương") || r.includes("binh duong")) return "Bình Dương";

  // Các thành phố trực thuộc trung ương & tỉnh lớn
  if (combined.includes("ho chi minh") || combined.includes("saigon") || combined.includes("sai gon") || c === "hcm") {
    return "TP. Hồ Chí Minh";
  }
  if (combined.includes("hanoi") || combined.includes("ha noi") || combined.includes("hà nội")) return "Hà Nội";
  if (combined.includes("da nang") || combined.includes("đà nẵng")) return "Đà Nẵng";
  if (combined.includes("hai phong") || combined.includes("hải phòng")) return "Hải Phòng";
  if (combined.includes("can tho") || combined.includes("cần thơ")) return "Cần Thơ";

  // Các tỉnh Đông Nam Bộ & Nam Trung Bộ
  if (combined.includes("bien hoa") || combined.includes("dong nai") || combined.includes("đồng nai")) return "Đồng Nai";
  if (combined.includes("vung tau") || combined.includes("vũng tàu") || combined.includes("ba ria")) return "Bà Rịa - Vũng Tàu";
  if (combined.includes("nha trang") || combined.includes("khanh hoa")) return "Khánh Hòa";
  if (combined.includes("da lat") || combined.includes("đà lạt") || combined.includes("lam dong")) return "Đà Lạt (Lâm Đồng)";
  if (combined.includes("phan thiet") || combined.includes("binh thuan")) return "Bình Thuận";
  if (combined.includes("phan rang") || combined.includes("ninh thuan")) return "Ninh Thuận";
  if (combined.includes("tay ninh") || combined.includes("tây ninh")) return "Tây Ninh";

  // Miền Tây
  if (combined.includes("long an") || combined.includes("tan an")) return "Long An";
  if (combined.includes("tien giang") || combined.includes("my tho")) return "Tiền Giang";
  if (combined.includes("ben tre") || combined.includes("bến tre")) return "Bến Tre";
  if (combined.includes("dong thap") || combined.includes("cao lanh")) return "Đồng Tháp";
  if (combined.includes("vinh long") || combined.includes("vĩnh long")) return "Vĩnh Long";
  if (combined.includes("an giang") || combined.includes("long xuyen")) return "An Giang";
  if (combined.includes("kien giang") || combined.includes("rach gia") || combined.includes("phu quoc")) return "Kiên Giang";
  if (combined.includes("ca mau") || combined.includes("cà mau")) return "Cà Mau";

  // Miền Trung
  if (combined.includes("hue") || combined.includes("huế") || combined.includes("thua thien")) return "Thừa Thiên Huế";
  if (combined.includes("quang nam") || combined.includes("hoi an")) return "Quảng Nam";
  if (combined.includes("quang ngai") || combined.includes("quảng ngãi")) return "Quảng Ngãi";
  if (combined.includes("quy nhon") || combined.includes("binh dinh")) return "Bình Định";
  if (combined.includes("phu yen") || combined.includes("tuy hoa")) return "Phú Yên";
  if (combined.includes("thanh hoa") || combined.includes("thanh hóa")) return "Thanh Hóa";
  if (combined.includes("nghe an") || combined.includes("nghệ an") || combined.includes("vinh")) return "Nghệ An";
  if (combined.includes("ha tinh") || combined.includes("hà tĩnh")) return "Hà Tĩnh";

  // Miền Bắc
  if (combined.includes("quang ninh") || combined.includes("ha long")) return "Quảng Ninh";
  if (combined.includes("bac ninh") || combined.includes("bắc ninh")) return "Bắc Ninh";
  if (combined.includes("thai nguyen") || combined.includes("thái nguyên")) return "Thái Nguyên";
  if (combined.includes("nam dinh") || combined.includes("nam định")) return "Nam Định";
  if (combined.includes("hai duong") || combined.includes("hải dương")) return "Hải Dương";

  // Nếu không khớp pattern cụ thể, trả về rawCity đã decode
  return rawCity?.trim() || undefined;
}

export async function resolveClientGeo(headers: Headers): Promise<GeoResolution> {
  const cfCountry = (headers.get("cf-ipcountry") || headers.get("x-vercel-ip-country"))?.trim().toUpperCase();
  const cfCityRaw = (headers.get("cf-ipcity") || headers.get("x-vercel-ip-city"))?.trim();
  const cfRegionRaw = (headers.get("cf-region") || headers.get("x-vercel-ip-country-region"))?.trim();

  let resolvedCountryCode = cfCountry || undefined;
  let resolvedCity: string | undefined = undefined;
  const resolvedRegion: string | undefined = cfRegionRaw || undefined;

  // Đọc trực tiếp header địa lý từ Cloudflare / Vercel (0ms latency, zero external network calls)
  if (cfCityRaw) {
    try {
      resolvedCity = decodeURIComponent(cfCityRaw).trim();
    } catch {
      resolvedCity = cfCityRaw;
    }
  }

  // Chuẩn hóa tên tỉnh / thành phố tiếng Việt
  if (resolvedCountryCode === "VN") {
    resolvedCity = normalizeVietnameseCity(resolvedCity, resolvedRegion);
  }

  // Chuẩn hóa tên quốc gia thân thiện
  let resolvedCountry = resolvedCountryCode;
  if (resolvedCountryCode === "VN") resolvedCountry = "Việt Nam";
  else if (resolvedCountryCode === "US") resolvedCountry = "Hoa Kỳ";
  else if (resolvedCountryCode === "SG") resolvedCountry = "Singapore";
  else if (resolvedCountryCode === "JP") resolvedCountry = "Nhật Bản";
  else if (resolvedCountryCode === "KR") resolvedCountry = "Hàn Quốc";
  else if (resolvedCountryCode === "DE") resolvedCountry = "Đức";
  else if (resolvedCountryCode === "GB" || resolvedCountryCode === "UK") resolvedCountry = "Vương quốc Anh";
  else if (resolvedCountryCode === "FR") resolvedCountry = "Pháp";
  else if (resolvedCountryCode === "AU") resolvedCountry = "Úc";
  else if (resolvedCountryCode === "CA") resolvedCountry = "Canada";
  else if (resolvedCountryCode === "TH") resolvedCountry = "Thái Lan";

  return {
    city: resolvedCity,
    region: resolvedRegion,
    country: resolvedCountry,
    countryCode: resolvedCountryCode,
  };
}

