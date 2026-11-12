/**
 * MOVIE_CARD_TOKENS — Bộ thông số kích thước & tỷ lệ dùng chung cho toàn bộ Movie Cards
 * Đảm bảo tính nhất quán pixel-perfect trên toàn hệ thống Nanaflix.
 */
export const MOVIE_CARD_TOKENS = {
  // 1. Thẻ phim chân dung chuẩn (MediaCard, WatchlistCard) - Tỷ lệ 2:3
  portrait: {
    aspect: "aspect-[2/3]",
    radius: "rounded-xl sm:rounded-2xl",
    carouselWidth: "w-[140px] sm:w-[175px] md:w-[190px]",
    gridCols: "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
    gap: "gap-3 sm:gap-4 md:gap-4 lg:gap-5",
    spacing: {
      imageToTitle: "pt-2 sm:pt-2.5",
      titleToMeta: "mt-1",
    },
  },

  // 2. Thẻ phim bảng xếp hạng có số thứ tự Top 20 (TmdbTopTrending, CommunityTopTrending)
  ranked: {
    numberCol: "w-[50px] sm:w-[70px] md:w-[88px] h-[210px] sm:h-[262px] md:h-[285px] -mr-4 sm:-mr-6 md:-mr-8",
    numberColDouble: "w-[74px] sm:w-[94px] md:w-[110px] h-[210px] sm:h-[262px] md:h-[285px] -mr-4 sm:-mr-6 md:-mr-8",
    posterWidth: "w-[140px] sm:w-[175px] md:w-[190px]",
    radius: "rounded-xl",
  },

  // 3. Thẻ tiếp tục xem (ContinueWatchingRow) - Tỷ lệ 2:3 kèm thanh tiến trình
  continueWatching: {
    aspect: "aspect-[2/3]",
    width: "w-[132px] min-[380px]:w-[144px] sm:w-[155px] md:w-[170px]",
    radius: "rounded-xl",
  },

  // 4. Thẻ phim phong cách điện ảnh ngang (RecommendationTabs, Watch Sidebar) - Tỷ lệ 16:9
  landscape: {
    aspect: "aspect-video",
    radius: "rounded-2xl",
    sidebarThumbWidth: "w-[115px] sm:w-[130px]",
    sidebarRadius: "rounded-lg",
  },

  // 5. Thẻ thumbnail nhỏ gọn (NavSearchBar Suggestion)
  mini: {
    width: "w-10",
    height: "h-14",
    radius: "rounded",
  },
} as const;
