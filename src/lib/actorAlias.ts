import { normalizeForMatch } from "./stringUtils";

/**
 * Nhóm alias diễn viên phổ biến để so khớp đa ngôn ngữ (EN / VN / ZH).
 * Chỉ liệt kê các diễn viên đã được xác nhận trong dữ liệu thực tế của PhimAPI.
 */
const ACTOR_ALIAS_GROUPS: readonly string[][] = [
  // Donnie Yen: tên EN, VN, và biến thể VN khác nhau giữa các phim
  ["Donnie Yen", "Chân Tử Đan", "Chung Tử Đơn"],
  // Jackie Chan
  ["Jackie Chan", "Thành Long"],
  // Jet Li
  ["Jet Li", "Lý Liên Kiệt"],
  // Chow Yun-fat
  ["Chow Yun-fat", "Chow Yun Fat", "Châu Nhuận Phát"],
  // Stephen Chow
  ["Stephen Chow", "Châu Tinh Trì"],
];

/**
 * Trả về tập hợp tất cả các chuỗi so khớp (gốc chữ thường + khử dấu)
 * cho một diễn viên, bao gồm tất cả alias trong cùng nhóm.
 */
export function getActorMatchTerms(actorName?: string): string[] {
  if (!actorName) return [];

  const raw = actorName.toLowerCase().trim();
  const norm = normalizeForMatch(actorName);
  const termsSet = new Set<string>();

  if (raw) termsSet.add(raw);
  if (norm) termsSet.add(norm);

  // Tìm nhóm alias chứa diễn viên này
  for (const group of ACTOR_ALIAS_GROUPS) {
    const isMember = group.some(
      (member) =>
        member.toLowerCase().trim() === raw ||
        normalizeForMatch(member) === norm
    );

    if (isMember) {
      for (const member of group) {
        const mRaw = member.toLowerCase().trim();
        const mNorm = normalizeForMatch(member);
        if (mRaw) termsSet.add(mRaw);
        if (mNorm) termsSet.add(mNorm);
      }
      break; // mỗi diễn viên chỉ thuộc 1 nhóm
    }
  }

  return Array.from(termsSet);
}

/**
 * Kiểm tra xem candidate movie có cùng diễn viên chính với primaryActor hay không,
 * bao gồm tất cả alias EN/VN đã biết. Trả về true nếu khớp bất kỳ alias nào.
 * Chỉ trả về true 1 lần (không cộng điểm trùng) — caller quyết định điểm.
 */
export function matchesActorAlias(
  primaryActor: string | undefined,
  candidateActors: string[],
  movieName?: string,
  originName?: string
): boolean {
  if (!primaryActor) return false;

  const matchTerms = getActorMatchTerms(primaryActor);
  if (matchTerms.length === 0) return false;

  // Chuẩn bị danh sách so sánh của candidate (giữ cả raw và norm)
  const candidateNorms = candidateActors.map((a) => normalizeForMatch(String(a)));
  const candidateRaws = candidateActors.map((a) => String(a).toLowerCase().trim());

  const normMovieName = movieName ? normalizeForMatch(String(movieName)) : "";
  const rawMovieName = movieName ? String(movieName).toLowerCase() : "";
  const rawOriginName = originName ? String(originName).toLowerCase() : "";

  for (const term of matchTerms) {
    if (!term) continue;

    // 1. Kiểm tra danh sách diễn viên
    for (let i = 0; i < candidateRaws.length; i++) {
      const cRaw = candidateRaws[i];
      const cNorm = candidateNorms[i];
      if (
        (cRaw && (cRaw.includes(term) || term.includes(cRaw))) ||
        (cNorm && (cNorm.includes(term) || term.includes(cNorm)))
      ) {
        return true;
      }
    }

    // 2. Kiểm tra tên phim / tên gốc (fallback, như logic cũ)
    if (
      (rawMovieName && rawMovieName.includes(term)) ||
      (normMovieName && normMovieName.includes(term)) ||
      (rawOriginName && rawOriginName.includes(term))
    ) {
      return true;
    }
  }

  return false;
}
