/**
 * Tiện ích hỗ trợ tạo & xử lý Avatar người dùng (Fallback mượt mà, không bao giờ bị lỗi ảnh vỡ)
 */

const AVATAR_GRADIENTS = [
  "from-red-600 to-rose-700",
  "from-zinc-700 to-zinc-900",
  "from-amber-500 to-orange-600",
  "from-emerald-600 to-teal-700",
  "from-sky-600 to-blue-700",
  "from-rose-600 to-red-800",
  "from-zinc-800 to-black",
  "from-orange-600 to-amber-700",
];

/**
 * Trả về chuỗi gradient màu Tailwind nhất quán dựa trên tên/email/ID người dùng
 */
export function getAvatarGradient(seed?: string | null): string {
  if (!seed || !seed.trim()) return AVATAR_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}

/**
 * Lấy ký tự đầu tiên viết hoa của tên hoặc email để làm chữ cái đại diện
 */
export function getAvatarInitial(nameOrEmail?: string | null): string {
  if (!nameOrEmail) return "U";
  const trimmed = nameOrEmail.trim();
  if (!trimmed) return "U";
  
  // Nếu là email, lấy phần trước @ nếu tên rỗng
  const cleanName = trimmed.includes("@") ? trimmed.split("@")[0] : trimmed;
  const match = cleanName.match(/[a-zA-Z0-9\u00C0-\u1EF9]/);
  return (match ? match[0] : cleanName.charAt(0)).toUpperCase() || "U";
}

/**
 * Danh sách Avatar  mẫu cho hệ thống Nanaflix
 */
export const PRESET_AVATARS = [
  { id: "netflix-red", name: "🍿 Bắp Rạp", url: "https://media.nanaflix.asia/avatars/preset-nanaflix-1.svg" },
  { id: "gold-star", name: "🌟 Sao Vàng", url: "https://media.nanaflix.asia/avatars/preset-nanaflix-2.svg" },
  { id: "cyber-gamer", name: "🎮 Cyberpunk", url: "https://media.nanaflix.asia/avatars/preset-nanaflix-3.svg" },
  { id: "anime-magic", name: "✨ Anime", url: "https://media.nanaflix.asia/avatars/preset-nanaflix-4.svg" },
  { id: "director-film", name: "🎬 Đạo Diễn", url: "https://media.nanaflix.asia/avatars/preset-nanaflix-5.svg" },
  { id: "retro-headphones", name: "🎧 Chill Music", url: "https://media.nanaflix.asia/avatars/preset-nanaflix-6.svg" },
  { id: "fire-flame", name: "🔥 Siêu Cấp", url: "https://media.nanaflix.asia/avatars/preset-nanaflix-7.svg" },
  { id: "king-crown", name: "👑 Vương Miện", url: "https://media.nanaflix.asia/avatars/preset-nanaflix-8.svg" },
  { id: "ghost-vampire", name: "👻 Cương Thi", url: "https://media.nanaflix.asia/avatars/preset-nanaflix-9.svg" },
  { id: "rabbit-cosmic", name: "🐰 Thỏ Vũ Trụ", url: "https://media.nanaflix.asia/avatars/preset-nanaflix-10.svg" },
  { id: "dragon-hero", name: "🐉 Rồng Đỏ", url: "https://media.nanaflix.asia/avatars/preset-nanaflix-11.svg" },
  { id: "cat-cinema", name: "🐱 Mèo Cinema", url: "https://media.nanaflix.asia/avatars/preset-nanaflix-12.svg" },
];
