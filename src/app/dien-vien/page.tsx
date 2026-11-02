import { permanentRedirect } from "next/navigation";

/**
 * Route /dien-vien (Danh bạ diễn viên hardcode cũ đã được loại bỏ).
 * Thực hiện permanent redirect về /browse (Khám phá phim).
 * Lưu ý: Next.js App Router xử lý route tĩnh /dien-vien độc lập với dynamic route /dien-vien/[slug],
 * đảm bảo /dien-vien/[slug] vẫn phục vụ hồ sơ diễn viên theo nhu cầu (On-Demand).
 */
export default function DienVienDirectoryPage() {
  permanentRedirect("/browse");
}
