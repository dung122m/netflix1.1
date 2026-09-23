/**
 * Tiện ích hỗ trợ tạo & xử lý Avatar người dùng (Fallback mượt mà, không bao giờ bị lỗi ảnh vỡ)
 */

const AVATAR_GRADIENTS = [
  "from-red-600 to-rose-700",
  "from-indigo-600 to-purple-700",
  "from-amber-500 to-orange-600",
  "from-emerald-600 to-teal-700",
  "from-blue-600 to-cyan-700",
  "from-fuchsia-600 to-pink-700",
  "from-violet-600 to-indigo-800",
  "from-rose-500 to-amber-600",
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
 * Danh sách Avatar VIP mẫu cho hệ thống Nanaflix
 */
export const PRESET_AVATARS = [
  { id: "netflix-red", name: "🍿 Bắp Rạp", url: "https://api.dicebear.com/9.x/bottts/svg?seed=Nanaflix1" },
  { id: "gold-star", name: "🌟 Sao Vàng", url: "https://api.dicebear.com/9.x/bottts/svg?seed=Nanaflix2" },
  { id: "cyber-gamer", name: "🎮 Cyberpunk", url: "https://api.dicebear.com/9.x/bottts/svg?seed=Nanaflix3" },
  { id: "anime-magic", name: "✨ Anime", url: "https://api.dicebear.com/9.x/bottts/svg?seed=Nanaflix4" },
  { id: "director-film", name: "🎬 Đạo Diễn", url: "https://api.dicebear.com/9.x/bottts/svg?seed=Nanaflix5" },
  { id: "retro-headphones", name: "🎧 Chill Music", url: "https://api.dicebear.com/9.x/bottts/svg?seed=Nanaflix6" },
  { id: "fire-flame", name: "🔥 Siêu Cấp", url: "https://api.dicebear.com/9.x/bottts/svg?seed=Nanaflix7" },
  { id: "king-crown", name: "👑 Vương Miện", url: "https://api.dicebear.com/9.x/bottts/svg?seed=Nanaflix8" },
  { id: "ghost-vampire", name: "👻 Cương Thi", url: "https://api.dicebear.com/9.x/bottts/svg?seed=Nanaflix9" },
  { id: "rabbit-cosmic", name: "🐰 Thỏ Vũ Trụ", url: "https://api.dicebear.com/9.x/bottts/svg?seed=Nanaflix10" },
  { id: "dragon-hero", name: "🐉 Rồng Đỏ", url: "https://api.dicebear.com/9.x/bottts/svg?seed=Nanaflix11" },
  { id: "cat-cinema", name: "🐱 Mèo Cinema", url: "https://api.dicebear.com/9.x/bottts/svg?seed=Nanaflix12" },
];
