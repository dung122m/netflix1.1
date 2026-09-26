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

export async function fetchActorProfile(actorName: string): Promise<ActorProfile | null> {
  const cleanName = actorName.trim();
  if (!cleanName) return null;

  if (wikiCache.has(cleanName)) {
    return wikiCache.get(cleanName) || null;
  }

  // Danh sách các tiêu đề Wikipedia cần thử theo thứ tự ưu tiên
  // Giải quyết triệt để các trường hợp trùng tên với địa danh/sông/tổ chức (vd: "Trường Giang (nghệ sĩ)", "Thái Hòa (diễn viên)")
  const titlesToTry = [
    `${cleanName} (nghệ sĩ)`,
    `${cleanName} (diễn viên)`,
    `${cleanName} (đạo diễn)`,
    cleanName,
    `${cleanName} (ca sĩ)`,
    `${cleanName} (actor)`,
    `${cleanName} (actress)`,
    `${cleanName} (director)`,
  ];

  try {
    for (const titleCandidate of titlesToTry) {
      // 1. Thử Wikipedia Tiếng Việt trước
      let res = await fetch(
        `https://vi.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titleCandidate)}`,
        {
          headers: { "User-Agent": "Nanaflix/2.0 (contact@nanaflix.tv)" },
          next: { revalidate: 86400 }, // Cache 24h
          signal: AbortSignal.timeout(3000),
        }
      );

      // 2. Nếu tiếng Việt không có kết quả hợp lệ, thử Wikipedia Tiếng Anh
      if (!res.ok) {
        res = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titleCandidate)}`,
          {
            headers: { "User-Agent": "Nanaflix/2.0 (contact@nanaflix.tv)" },
            next: { revalidate: 86400 },
            signal: AbortSignal.timeout(3000),
          }
        );
      }

      if (res.ok) {
        const data = await res.json();
        if (data.type === "disambiguation" || data.title === "Not found.") {
          continue;
        }

        const desc = data.description || "";
        const extract = data.extract || "";

        // BỎ QUA NẾU LÀ ĐỊA DANH / SÔNG / TỔ CHỨC / KHÔNG PHẢI NGƯỜI
        if (isNonPersonEntity(desc, extract) && !isPersonSignal(desc, extract)) {
          continue;
        }

        // XÁC THỰC LÀ CON NGƯỜI / NGHỆ SĨ
        if (isPersonSignal(desc, extract) || (!isNonPersonEntity(desc, extract) && desc)) {
          const profile: ActorProfile = {
            name: cleanName,
            title: data.title || cleanName,
            description: data.description || "Nghệ sĩ / Diễn viên điện ảnh",
            extract: data.extract || undefined,
            thumbnail: data.thumbnail?.source || undefined,
            wikiUrl:
              data.content_urls?.desktop?.page ||
              `https://vi.wikipedia.org/wiki/${encodeURIComponent(data.title || cleanName)}`,
          };

          wikiCache.set(cleanName, profile);
          return profile;
        }
      }
    }
  } catch (err) {
    console.error("Lỗi lấy thông tin diễn viên từ Wikipedia:", err);
  }

  wikiCache.set(cleanName, null);
  return null;
}
