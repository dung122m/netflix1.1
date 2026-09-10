import { NextResponse } from "next/server";
import { movieApi } from "@/services/movieApi";
import { liveFootballService, FootballMatch } from "@/services/liveFootballService";
import { pickBestMovieImage } from "@/lib/movieMedia";

export interface SystemNotification {
  id: string;
  type: "movie" | "live" | "hot";
  title: string;
  message: string;
  time: string;
  link: string;
  image: string;
  badge?: string;
  badgeColor?: string;
}

export async function GET() {
  const notifications: SystemNotification[] = [];

  try {
    // 1. Lấy phim mới cập nhật nhất từ nguồn phim thực
    const latestRes = await movieApi.getMovies({ sort: "latest", limit: 6 });
    const movies = latestRes.items || [];

    if (movies.length > 0) {
      // Phim số 1: Vừa lên sóng
      const m1 = movies[0];
      notifications.push({
        id: `movie-${m1.slug}`,
        type: "movie",
        title: "Tập Mới Lên Sóng",
        message: `${m1.name} ${m1.episode_current ? `(${m1.episode_current})` : ""} - Đã có bản ${m1.quality || "FHD"} Vietsub`,
        time: "Vừa cập nhật",
        link: `/movies/${m1.slug}`,
        image: pickBestMovieImage(m1, "/default-hero.jpg"),
        badge: "TẬP MỚI",
        badgeColor: "bg-netflix-red text-white",
      });

      // Phim số 2: Phim nổi bật
      if (movies.length > 1) {
        const m2 = movies[1];
        notifications.push({
          id: `movie-${m2.slug}`,
          type: "hot",
          title: "Được Xem Nhiều Nhất",
          message: `${m2.name} (${m2.year || "2026"}) - Được khán giả bình chọn điểm cao`,
          time: "Hôm nay",
          link: `/movies/${m2.slug}`,
          image: pickBestMovieImage(m2, "/default-hero.jpg"),
          badge: "HOT",
          badgeColor: "bg-amber-500 text-black",
        });
      }

      // Phim số 3
      if (movies.length > 2) {
        const m3 = movies[2];
        notifications.push({
          id: `movie-${m3.slug}`,
          type: "movie",
          title: "Đề Xuất Cho Bạn",
          message: `${m3.name} - ${m3.category?.[0]?.name || "Phim đặc sắc"} đang thu hút lượt xem`,
          time: "1 giờ trước",
          link: `/movies/${m3.slug}`,
          image: pickBestMovieImage(m3, "/default-hero.jpg"),
          badge: "GỢI Ý",
          badgeColor: "bg-blue-600 text-white",
        });
      }
    }

    // 2. Lấy trận bóng đá trực tiếp hôm nay
    try {
      const footballData = await liveFootballService.getFootballMatches();
      const liveOrUpcoming = footballData.matches?.find(
        (m: FootballMatch) => m.timeline === "live" || (m.time && m.time.includes(":"))
      );
      if (liveOrUpcoming) {
        const isLive = liveOrUpcoming.timeline === "live";
        notifications.splice(1, 0, {
          id: `match-${liveOrUpcoming.id}`,
          type: "live",
          title: isLive ? "⚽ Đang Phát Sóng Trực Tiếp" : "⚽ Tâm Điểm Thể Thao",
          message: `${liveOrUpcoming.team1} vs ${liveOrUpcoming.team2} ${liveOrUpcoming.time ? `• ${liveOrUpcoming.time}` : ""}${liveOrUpcoming.blv ? ` (BLV ${liveOrUpcoming.blv})` : ""}`,
          time: isLive ? "Đang diễn ra" : "Hôm nay",
          link: `/live?matchId=${liveOrUpcoming.id}`,
          image: liveOrUpcoming.homeLogo || "/images/channels/htv-thethao.svg",
          badge: isLive ? "LIVE" : "SẮP ĐÁ",
          badgeColor: isLive ? "bg-red-600 text-white animate-pulse" : "bg-emerald-600 text-white",
        });
      }
    } catch {
      // Ignore football fetch error if offline
    }

    return NextResponse.json({ items: notifications });
  } catch (error) {
    console.error("Lỗi lấy thông báo động:", error);
    return NextResponse.json({
      items: [
        {
          id: "default-1",
          type: "movie",
          title: "Phim Mới Lên Sóng",
          message: "Khám phá hàng chục siêu phẩm điện ảnh Full HD vừa được cập nhật hôm nay",
          time: "Hôm nay",
          link: "/browse?sort=latest",
          image: "/default-hero.jpg",
          badge: "MỚI",
          badgeColor: "bg-netflix-red text-white",
        },
      ],
    });
  }
}
