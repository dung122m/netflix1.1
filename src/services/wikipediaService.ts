export interface ActorProfile {
  name: string;
  title: string;
  description?: string;
  extract?: string;
  thumbnail?: string;
  wikiUrl?: string;
  birthYear?: string;
}

const wikiCache = new Map<string, ActorProfile | null>();

/**
 * Kiểm tra xem một đoạn mô tả/tóm tắt có chứa các dấu hiệu phi nhân tính (địa danh, con sông, tổ chức...) không
 */
function isNonPersonEntity(desc = "", extract = ""): boolean {
  const text = `${desc} ${extract}`.toLowerCase();
  const nonPersonKeywords = [
    "sông",
    "dòng sông",
    "con sông",
    "thành phố",
    "thủ đô",
    "quốc gia",
    "tỉnh",
    "huyện",
    "núi",
    "dãy núi",
    "đảo",
    "quần đảo",
    "hồ nước",
    "biển",
    "công ty",
    "tập đoàn",
    "định hướng",
    "loài thực vật",
    "loài động vật",
    "bộ phim",
    "bài hát",
    "album",
    "river",
    "city",
    "country",
    "province",
    "district",
    "mountain",
    "island",
    "company",
    "organization",
    "disambiguation",
  ];
  return nonPersonKeywords.some((kw) => text.includes(kw));
}

/**
 * Kiểm tra xem một đoạn mô tả/tóm tắt có chứa các tín hiệu xác thực là NGƯỜI / NGHỆ SĨ không
 */
function isPersonSignal(desc = "", extract = ""): boolean {
  const text = `${desc} ${extract}`.toLowerCase();
  const personKeywords = [
    "sinh ngày",
    "sinh năm",
    "sinh ",
    "diễn viên",
    "nghệ sĩ",
    "đạo diễn",
    "người dẫn chương trình",
    "danh hài",
    "ca sĩ",
    "người mẫu",
    "nhà làm phim",
    "biên kịch",
    "nhà sản xuất",
    "người việt nam",
    "người hàn quốc",
    "người trung quốc",
    "người hồng kông",
    "người mỹ",
    "người nhật bản",
    "người thái lan",
    "người anh",
    "nam diễn viên",
    "nữ diễn viên",
    "born",
    "actor",
    "actress",
    "director",
    "producer",
    "comedian",
    "singer",
    "filmmaker",
    "screenwriter",
    "television host",
  ];
  return personKeywords.some((kw) => text.includes(kw));
}

/**
 * Lấy nội dung chi tiết mở rộng (Tiểu sử, Cuộc đời & Sự nghiệp) từ MediaWiki API khi đoạn tóm tắt quá ngắn
 */
/**
 * Làm sạch hoàn toàn các tàn dư mã wiki, đề mục rỗng, danh sách phim dang dở và ký hiệu chú thích
 */
export function cleanBioExtract(raw: string): string {
  if (!raw) return "";

  let text = raw;

  // 1. Cắt bỏ các phần danh sách phim, giải thưởng, liên kết ngoài...
  const cutKeywords = [
    "== Danh sách phim",
    "== Phim đã tham gia",
    "== Các phim tham gia",
    "== Các tác phẩm",
    "== Danh sách tác phẩm",
    "== Sự nghiệp điện ảnh",
    "== Danh sách chương trình",
    "== Chương trình truyền hình",
    "== Chương trình tham gia",
    "== Gameshow",
    "== Giải thưởng",
    "== Thành tựu",
    "== Đề cử",
    "== Danh sách đĩa",
    "== Đĩa nhạc",
    "== Video âm nhạc",
    "== Ghi chú",
    "== Chú thích",
    "== Vinh danh",
    "== Xem thêm",
    "== Sự cố",
    "== Tranh cãi",
    "== Tham khảo",
    "== Liên kết ngoài",
    "== Hoạt động khác",
    "== Thống kê",
    "== Awards",
    "== References",
    "== External links",
    "== Filmography",
  ];

  let minCutIndex = -1;
  for (const kw of cutKeywords) {
    const idx = text.indexOf(kw);
    if (idx !== -1 && (minCutIndex === -1 || idx < minCutIndex)) {
      minCutIndex = idx;
    }
  }
  if (minCutIndex !== -1 && minCutIndex > 200) {
    text = text.slice(0, minCutIndex);
  }

  // 2. Chuyển tiêu đề wiki == Tiêu đề == thành Tiêu đề:
  text = text.replace(/==+\s*([^=]+?)\s*==+/g, "\n\n$1:\n");

  // 3. Xóa các chú thích kiểu [1], [2], [cần dẫn nguồn], [ghi chú 1]
  text = text.replace(/\[(?:\d+|cần dẫn nguồn|note \d+|ghi chú \d+|[a-z])\]/gi, "");

  // 4. Xóa các tiêu đề rỗng nằm kề nhau (ví dụ: Danh sách phim:\nTruyền hình:\nĐiện ảnh:)
  text = text.replace(/\n\s*([^\n:]{2,40}):\s*(?=\n\s*[^\n:]{2,40}:|\n*$)/gi, "\n");

  // 5. Xóa triệt để các đề mục treo lơ lửng ở cuối văn bản
  text = text.replace(/(?:\n\s*(?:danh sách phim|truyền hình|điện ảnh|web drama|phim đã đóng|tác phẩm|chương trình|giải thưởng|tham khảo|liên kết ngoài|video|gameshow|hoạt động khác|sự nghiệp|đầu đời|tiểu sử)\s*[:：]?\s*)+$/gi, "");

  // 6. Xóa các dòng chỉ chứa dấu gạch đầu dòng hoặc dấu hoa thị trơ trọi
  text = text.replace(/^\s*[-*•]\s*$/gm, "");

  // 7. Chuẩn hóa khoảng trắng và dòng trống
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return text;
}

/**
 * Lấy nội dung chi tiết mở rộng (Tiểu sử, Cuộc đời & Sự nghiệp) từ MediaWiki API khi đoạn tóm tắt quá ngắn
 */
async function fetchExtendedWikiExtract(
  pageTitle: string,
  lang: "vi" | "en" = "vi"
): Promise<string | null> {
  try {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=${encodeURIComponent(
      pageTitle
    )}&format=json`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Nanaflix/2.0 (contact@nanaflix.tv)" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0] as { extract?: string };
    if (!page || !page.extract || page.extract.length < 150) return null;

    const cleaned = cleanBioExtract(page.extract);
    return cleaned.length >= 200 ? cleaned : null;
  } catch {
    return null;
  }
}

async function fetchSummary(
  title: string,
  lang: "vi" | "en"
): Promise<ActorProfile | null> {
  try {
    const res = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      {
        headers: { "User-Agent": "Nanaflix/2.0 (contact@nanaflix.tv)" },
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(1500),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.type === "disambiguation" || data.title === "Not found.") return null;

    const desc = data.description || "";
    let extract = data.extract ? cleanBioExtract(data.extract) : "";

    if (isNonPersonEntity(desc, extract) && !isPersonSignal(desc, extract)) {
      return null;
    }

    if (isPersonSignal(desc, extract) || (!isNonPersonEntity(desc, extract) && (desc || data.thumbnail))) {
      // Nếu đoạn tóm tắt ngắn (dưới 350 ký tự), lấy thêm bài viết chi tiết
      if (extract.length < 350) {
        const extended = await fetchExtendedWikiExtract(data.title || title, lang);
        if (extended && extended.length > extract.length) {
          extract = extended;
        }
      }

      return {
        name: title,
        title: data.title || title,
        description: data.description || "Nghệ sĩ / Diễn viên điện ảnh",
        extract: extract || undefined,
        thumbnail: data.thumbnail?.source || undefined,
        wikiUrl:
          data.content_urls?.desktop?.page ||
          `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(data.title || title)}`,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchActorProfile(
  actorName: string,
  aliases: string[] = []
): Promise<ActorProfile | null> {
  const cleanName = actorName.trim();
  if (!cleanName) return null;

  if (wikiCache.has(cleanName)) {
    return wikiCache.get(cleanName) || null;
  }

  const queriesToTry = Array.from(
    new Set([cleanName, ...aliases].map((q) => q.trim()).filter((q) => q.length >= 2))
  );

  for (const q of queriesToTry) {
    try {
      // 1. Quét song song trên cả Wikipedia Tiếng Việt và Tiếng Anh (~150-300ms)
      const [summaryVi, summaryEn] = await Promise.all([
        fetchSummary(q, "vi"),
        fetchSummary(q, "en"),
      ]);

      if (summaryVi) {
        wikiCache.set(cleanName, summaryVi);
        return summaryVi;
      }
      if (summaryEn) {
        wikiCache.set(cleanName, summaryEn);
        return summaryEn;
      }

      // 2. Thử các danh xưng định hướng (vd: Trường Giang (nghệ sĩ))
      const disambiguationCandidates = [
        fetchSummary(`${q} (diễn viên)`, "vi"),
        fetchSummary(`${q} (nghệ sĩ)`, "vi"),
        fetchSummary(`${q} (actor)`, "en"),
        fetchSummary(`${q} (actress)`, "en"),
      ];

      const disambiguationResults = await Promise.all(disambiguationCandidates);
      const validDisambiguation = disambiguationResults.find(Boolean);

      if (validDisambiguation) {
        wikiCache.set(cleanName, validDisambiguation);
        return validDisambiguation;
      }
    } catch (err) {
      console.error("Lỗi lấy thông tin diễn viên từ Wikipedia:", err);
    }
  }

  wikiCache.set(cleanName, null);
  return null;
}

