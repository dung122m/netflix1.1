/**
 * Dynamic Home Moods & Time-slot Content Generator
 * Xác định khung giờ trong ngày (Sáng / Trưa / Tối / Khuya) và thứ trong tuần (Thứ 2 - CN).
 * Chọn lọc copy/mood ổn định theo ngày (deterministic), không bị random khi F5/reload.
 */

export type TimeSlot = "morning" | "afternoon" | "evening" | "latenight";

export interface TimeSlotMoodConfig {
  slot: TimeSlot;
  timeLabel: string;
  badgeText: string;
  badgeIcon: string; // emoji
  accentGradient: string;
  borderColor: string;
  glowColor: string;
  bgImageUrl: string;
  title: string;
  subtitle: string;
  suggestedTags: Array<{ label: string; query: string; icon?: string }>;
}

interface MoodPoolItem {
  title: string;
  subtitle: string;
  tags: Array<{ label: string; query: string; icon?: string }>;
}

// Kho nội dung phong phú theo từng khung giờ và thứ trong tuần
const MOOD_COLLECTIONS: Record<TimeSlot, MoodPoolItem[]> = {
  morning: [
    {
      title: "Khởi Đầu Ngày Mới Tràn Năng Lượng",
      subtitle: "Nạp hứng khởi với những thước phim phiêu lưu, hoạt hình tươi sáng và hài hước.",
      tags: [
        { label: "Hoạt hình vui nhộn", query: "category=hoat-hinh" },
        { label: "Hài hước giải trí", query: "category=hai-huoc" },
        { label: "Phiêu lưu kỳ thú", query: "category=phieu-luu" },
      ],
    },
    {
      title: "Cà Phê Sáng Cùng Phim Hay",
      subtitle: "Tuyển tập phim truyền cảm hứng, nhẹ nhàng khởi đầu ngày làm việc đầy sáng tạo.",
      tags: [
        { label: "Chính kịch sâu sắc", query: "category=chinh-kich" },
        { label: "Gia đình ấm áp", query: "category=gia-dinh" },
        { label: "Tâm lý cảm xúc", query: "category=tam-ly" },
      ],
    },
  ],
  afternoon: [
    {
      title: "Nghỉ Trưa Thư Giãn, Tái Tạo Năng Lượng",
      subtitle: "Phim ngắn tập, sitcom hài duyên dáng phù hợp cho giờ nghỉ trưa thư thái.",
      tags: [
        { label: "Sitcom ngắn tập", query: "category=hai-huoc" },
        { label: "Hành động ngắn", query: "category=hanh-dong" },
        { label: "Khoa học viễn tưởng", query: "category=vien-tuong" },
      ],
    },
    {
      title: "Nạp Hứng Khởi Buổi Chiều",
      subtitle: "Giải tỏa căng thẳng với những màn rượt đuổi nghẹt thở và kỹ xảo đỉnh cao.",
      tags: [
        { label: "Hành động kịch tính", query: "category=hanh-dong" },
        { label: "Võ thuật đỉnh cao", query: "category=vo-thuat" },
        { label: "Chiếu rạp nổi bật", query: "category=chieu-rap" },
      ],
    },
  ],
  evening: [
    {
      title: "Đêm Nay Nanaflix: Rạp Chiếu Tại Gia",
      subtitle: "Bữa tiệc điện ảnh thịnh soạn tối nay — bom tấn Hollywood, siêu phẩm Châu Á đang chờ bạn.",
      tags: [
        { label: "Bom tấn hành động", query: "category=hanh-dong" },
        { label: "Viễn tưởng mãn nhãn", query: "category=vien-tuong" },
        { label: "Kinh dị kịch tính", query: "category=kinh-di" },
        { label: "Tình cảm lãng mạn", query: "category=tinh-cam" },
      ],
    },
    {
      title: "Đêm Nay Nanaflix: Tận Hưởng Từng Khung Hình",
      subtitle: "Tắt đèn, bật màn hình lớn và đắm chìm vào những câu chuyện điện ảnh bất hủ.",
      tags: [
        { label: "Phim Chiếu Rạp Mới", query: "category=chieu-rap" },
        { label: "Hình sự giật gân", query: "category=hinh-su" },
        { label: "Bí ẩn ly kỳ", query: "category=bi-an" },
        { label: "Hàn Quốc hot", query: "country=han-quoc" },
      ],
    },
    {
      title: "Đêm Nay Nanaflix: Giờ Vàng Phim Hay",
      subtitle: "Lựa chọn hoàn hảo để xem cùng người thân, bạn bè sau một ngày bận rộn.",
      tags: [
        { label: "Top Thịnh Hành", query: "sort=views" },
        { label: "Gia đình & Hài", query: "category=gia-dinh" },
        { label: "Âu Mỹ đỉnh cao", query: "country=au-my" },
      ],
    },
  ],
  latenight: [
    {
      title: "Đêm Khuya Nanaflix: Rạp Chiếu Lúc Nửa Đêm",
      subtitle: "Không gian tĩnh lặng dành riêng cho cú đêm — phim kinh dị rùng rợn, tâm lý giật gân và bí ẩn.",
      tags: [
        { label: "Kinh dị rùng rợn", query: "category=kinh-di" },
        { label: "Tâm lý giật gân (Thriller)", query: "category=tam-ly" },
        { label: "Bí ẩn rợn người", query: "category=bi-an" },
        { label: "Hình sự tội phạm", query: "category=hinh-su" },
      ],
    },
    {
      title: "Đêm Khuya Nanaflix: Dành Cho Những Kẻ Mộng Mơ",
      subtitle: "Lắng đọng cùng những bản tình ca điện ảnh sâu lắng và thế giới anime kỳ diệu xuyên màn đêm.",
      tags: [
        { label: "Anime chữa lành", query: "category=hoat-hinh" },
        { label: "Tình cảm sâu lắng", query: "category=tinh-cam" },
        { label: "Tâm lý nghệ thuật", query: "category=chinh-kich" },
      ],
    },
  ],
};

/**
 * Lấy khung giờ hiện tại theo giờ Việt Nam (UTC+7)
 */
export function getCurrentVietnamTimeSlot(overrideDate?: Date): {
  slot: TimeSlot;
  hour: number;
  dayOfWeek: number; // 0 = CN, 1 = T2, ..., 6 = T7
  dayOfWeekText: string;
  formattedDate: string;
} {
  const now = overrideDate || new Date();
  
  // Chuyển sang UTC+7
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const vnTime = new Date(utc + 3600000 * 7);

  const hour = vnTime.getHours();
  const dayOfWeek = vnTime.getDay();
  const day = vnTime.getDate();
  const month = vnTime.getMonth() + 1;
  const year = vnTime.getFullYear();

  const daysMap = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];

  let slot: TimeSlot = "evening";
  if (hour >= 5 && hour < 11) {
    slot = "morning";
  } else if (hour >= 11 && hour < 17) {
    slot = "afternoon";
  } else if (hour >= 17 && hour < 22) {
    slot = "evening";
  } else {
    slot = "latenight";
  }

  return {
    slot,
    hour,
    dayOfWeek,
    dayOfWeekText: daysMap[dayOfWeek] || "Hôm nay",
    formattedDate: `${day}/${month}/${year}`,
  };
}

/**
 * Trả về cấu hình Mood ổn định theo ngày & khung giờ (Deterministic Seed)
 */
export function getTonightMoodConfig(overrideDate?: Date): TimeSlotMoodConfig {
  const { slot, dayOfWeekText, dayOfWeek } = getCurrentVietnamTimeSlot(overrideDate);
  const now = overrideDate || new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const vnTime = new Date(utc + 3600000 * 7);
  
  const day = vnTime.getDate();
  const month = vnTime.getMonth() + 1;
  const year = vnTime.getFullYear();

  // Seed cố định theo ngày + tháng + năm + slot để không bao giờ random lại khi F5
  const pool = MOOD_COLLECTIONS[slot];
  const seed = (year * 10000 + month * 100 + day + (slot === "morning" ? 1 : slot === "afternoon" ? 2 : slot === "evening" ? 3 : 4)) % pool.length;
  const selectedMood = pool[seed] || pool[0];

  // Visual themes theo từng khung giờ
  switch (slot) {
    case "morning":
      return {
        slot,
        timeLabel: `${dayOfWeekText} • Buổi Sáng`,
        badgeText: "Chào Buổi Sáng",
        badgeIcon: "☀️",
        accentGradient: "from-amber-500/20 via-orange-500/10 to-transparent",
        borderColor: "border-amber-500/30",
        glowColor: "rgba(245, 158, 11, 0.15)",
        bgImageUrl: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1200&q=80",
        title: selectedMood.title,
        subtitle: selectedMood.subtitle,
        suggestedTags: selectedMood.tags,
      };
    case "afternoon":
      return {
        slot,
        timeLabel: `${dayOfWeekText} • Buổi Trưa & Chiều`,
        badgeText: "Thư Giãn Giữa Giờ",
        badgeIcon: "☕",
        accentGradient: "from-sky-500/20 via-blue-500/10 to-transparent",
        borderColor: "border-sky-500/30",
        glowColor: "rgba(14, 165, 233, 0.15)",
        bgImageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
        title: selectedMood.title,
        subtitle: selectedMood.subtitle,
        suggestedTags: selectedMood.tags,
      };
    case "latenight":
      return {
        slot,
        timeLabel: `${dayOfWeekText} • Nửa Đêm & Rạng Sáng`,
        badgeText: "Rạp Chiếu Đêm Khuya",
        badgeIcon: "🌌",
        accentGradient: "from-purple-900/35 via-indigo-950/20 to-transparent",
        borderColor: "border-purple-500/35",
        glowColor: "rgba(168, 85, 247, 0.2)",
        bgImageUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80",
        title: selectedMood.title,
        subtitle: selectedMood.subtitle,
        suggestedTags: selectedMood.tags,
      };
    case "evening":
    default:
      return {
        slot: "evening",
        timeLabel: `${dayOfWeekText} • Giờ Vàng Buổi Tối`,
        badgeText: dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0 ? "Cuối Tuần Xem Gì" : "Đêm Nay Nanaflix",
        badgeIcon: "🌙",
        accentGradient: "from-rose-950/40 via-netflix-red/15 to-transparent",
        borderColor: "border-netflix-red/35",
        glowColor: "rgba(229, 9, 20, 0.25)",
        bgImageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
        title: selectedMood.title,
        subtitle: selectedMood.subtitle,
        suggestedTags: selectedMood.tags,
      };
  }
}
