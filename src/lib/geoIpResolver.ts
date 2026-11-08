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

interface CacheEntry {
  data: GeoResolution;
  expiresAt: number;
}

// In-Memory L1 Cache for resolved IPs (TTL: 24h, max 5000 items)
const geoL1Cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

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
  const cfCountry = headers.get("cf-ipcountry")?.trim().toUpperCase();
  const cfCityRaw = headers.get("cf-ipcity")?.trim();
  const cfRegionRaw = headers.get("cf-region")?.trim();
  const realIp = (
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0] ||
    ""
  ).trim();

  // 1. Kiểm tra cache L1 theo IP
  if (realIp && geoL1Cache.has(realIp)) {
    const cached = geoL1Cache.get(realIp)!;
    if (cached.expiresAt > Date.now()) {
      return cached.data;
    }
    geoL1Cache.delete(realIp);
  }

  let resolvedCountryCode = cfCountry || undefined;
  let resolvedCity: string | undefined = undefined;
  let resolvedRegion: string | undefined = cfRegionRaw || undefined;

  // 2. Nếu có cf-ipcity từ Cloudflare Edge và KHÔNG PHẢI là datacenter proxy
  if (cfCityRaw && cfCityRaw.toLowerCase() !== "hong kong" && cfCityRaw.toLowerCase() !== "singapore") {
    try {
      resolvedCity = decodeURIComponent(cfCityRaw).trim();
    } catch {
      resolvedCity = cfCityRaw;
    }
  }

  // 3. Nếu là IP người dùng Việt Nam (hoặc city bị lệch sang Hong Kong/Singapore do proxy datacenter)
  const isVn = resolvedCountryCode === "VN" || (!resolvedCountryCode && !realIp.startsWith("127."));
  const isCitySuspicious = !resolvedCity || resolvedCity.toLowerCase() === "hong kong" || resolvedCity.toLowerCase() === "singapore";

  if (realIp && (isCitySuspicious || !resolvedCity)) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const res = await fetch(`https://ipinfo.io/${encodeURIComponent(realIp)}/json`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = await res.json();
        if (data.country) resolvedCountryCode = data.country.trim().toUpperCase();
        if (data.city) resolvedCity = data.city;
        if (data.region) resolvedRegion = data.region;
      }
    } catch {
      // Fail-open: bỏ qua lỗi timeout để không ảnh hưởng đến tốc độ request
    }
  }

  // 4. Chuẩn hóa tên tỉnh / thành phố tiếng Việt
  if (resolvedCountryCode === "VN") {
    resolvedCity = normalizeVietnameseCity(resolvedCity, resolvedRegion);
  }

  // 5. Chuẩn hóa tên quốc gia thân thiện
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

  const result: GeoResolution = {
    city: resolvedCity,
    region: resolvedRegion,
    country: resolvedCountry,
    countryCode: resolvedCountryCode,
  };

  // 6. Lưu vào cache L1 trong RAM
  if (realIp && (result.city || result.countryCode)) {
    if (geoL1Cache.size >= 5000) {
      const firstKey = geoL1Cache.keys().next().value;
      if (firstKey !== undefined) geoL1Cache.delete(firstKey);
    }
    geoL1Cache.set(realIp, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  return result;
}
