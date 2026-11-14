"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  HelpCircle,
  Search,
  ChevronDown,
  Tv,
  MonitorSmartphone,
  Compass,
  LifeBuoy,
  Film,
  BookOpen,
  Smartphone,
  Cast,
  Keyboard,
  RefreshCw,
  CheckCircle2,
  AlertOctagon,
  MessageSquare,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Tooltip } from "@/components/ui/Tooltip";
import { PageHeader } from "@/components/ui/PageHeader";

interface FAQItem {
  id: string;
  category: "guide" | "player" | "ai" | "account" | "content" | "troubleshoot";
  categoryLabel: string;
  question: string;
  answer: string;
  tips?: string;
}

const QUICK_GUIDES = [
  {
    id: "guide-pwa",
    icon: Smartphone,
    color: "text-rose-400",
    bgColor: "bg-rose-500/10 ",
    badge: "iOS & Android",
    title: "Cài Đặt App Lên Màn Hình Chính (PWA)",
    summary: "Xem phim toàn màn hình không viền trình duyệt, khởi động tức thì từ màn hình chính như một ứng dụng Native cao cấp.",
    steps: [
      {
        device: "Dành cho iPhone / iPad (Trình duyệt Safari):",
        desc: "Mở Nanaflix trên Safari → Bấm nút Chia sẻ (biểu tượng ô vuông có mũi tên hướng lên ở thanh đáy) → Cuộn xuống và chọn 'Thêm vào MH chính' (Add to Home Screen) → Bấm 'Thêm' ở góc trên bên phải.",
      },
      {
        device: "Dành cho điện thoại Android (Trình duyệt Google Chrome):",
        desc: "Mở Nanaflix trên Chrome → Bấm vào biểu tượng 3 chấm (⋮) ở góc trên bên phải → Chọn 'Cài đặt ứng dụng' (Install App) hoặc bấm vào nút 'Cài đặt PWA' ở thanh công cụ dưới chân trang web.",
      },
      {
        device: "Trải nghiệm sau khi cài đặt:",
        desc: "Ứng dụng sẽ hoạt động độc lập, ẩn toàn bộ thanh địa chỉ URL của trình duyệt, tối ưu 100% diện tích hiển thị và tăng tốc độ tải trang nhờ bộ nhớ đệm Offline Service Worker.",
      },
    ],
  },
  {
    id: "guide-tv",
    icon: Cast,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 ",
    badge: "Smart TV & AirPlay",
    title: "Truyền Phim Lên Màn Hình Lớn (Smart TV)",
    summary: "Thưởng thức chất lượng hình ảnh điện ảnh cùng âm thanh sống động trên TV phòng khách cùng gia đình và bạn bè.",
    steps: [
      {
        device: "Cách 1: Truyền không dây qua AirPlay / Google Cast (Khuyên Dùng)",
        desc: "Đảm bảo điện thoại/máy tính và Smart TV đang kết nối vào cùng một mạng Wi-Fi. Khi đang phát phim trên Nanaflix, bấm vào biểu tượng Cast / AirPlay ngay trên thanh điều khiển của trình phát video để chuyển phát trực tiếp lên TV.",
      },
      {
        device: "Cách 2: Mở trực tiếp bằng trình duyệt trên Smart TV",
        desc: "Khởi động ứng dụng Web Browser trên TV (hỗ trợ tốt trên Samsung Tizen OS, LG webOS, Google TV, Sony Bravia và Android TV Box), nhập địa chỉ website Nanaflix và chuyển sang chế độ Toàn màn hình (Full Screen).",
      },
      {
        device: "Cách 3: Kết nối cáp HDMI / Type-C DisplayPort từ Laptop",
        desc: "Cắm dây cáp từ máy tính sang TV, bật chế độ rạp chiếu (Theater Mode) hoặc Full Screen để có chất lượng truyền dẫn bitrate cao nhất và độ trễ bằng 0.",
      },
    ],
  },
  {
    id: "guide-shortcuts",
    icon: Keyboard,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/20",
    badge: "Bàn Phím Máy Tính",
    title: "Bảng Phím Tắt Điều Khiển Trình Phát",
    summary: "Thao tác mượt mà chuyên nghiệp như xem trên các nền tảng quốc tế mà không cần dùng chuột.",
    shortcuts: [
      { key: "Space / K", desc: "Tạm dừng / Tiếp tục phát video" },
      { key: "← / →", desc: "Tua lùi / Tua tiến 10 giây" },
      { key: "J / L", desc: "Tua nhanh 10 giây (YouTube style)" },
      { key: "↑ / ↓", desc: "Tăng / Giảm âm lượng 10%" },
      { key: "F", desc: "Bật / Tắt chế độ Toàn màn hình" },
      { key: "T", desc: "Bật / Tắt chế độ rạp chiếu (Theater)" },
      { key: "M", desc: "Tắt / Mở tiếng nhanh (Mute)" },
      { key: "P / N", desc: "Chuyển Tập trước / Tập kế tiếp (Phim bộ)" },
      { key: "0 ... 9", desc: "Nhảy tới 0% ... 90% thời lượng phim" },
      { key: "> / <", desc: "Tăng / Giảm tốc độ phát (Speed)" },
    ],
  },
  {
    id: "guide-sync",
    icon: RefreshCw,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10 ",
    badge: "Cloud Handoff",
    title: "Đồng Bộ Tiến Trình Đa Thiết Bị (Handoff)",
    summary: "Đang xem dở một tập phim trên máy tính, tối về mở điện thoại là tiếp tục đúng từng giây đang dừng.",
    steps: [
      {
        device: "Bước 1: Đăng nhập tài khoản Nanaflix",
        desc: "Bấm nút 'Đăng nhập' ở góc trên bên phải bằng tài khoản Google hoặc Email của bạn.",
      },
      {
        device: "Bước 2: Hệ thống tự động lưu vị trí",
        desc: "Trong suốt quá trình xem phim, trình phát tự động ghi nhận vị trí giây và số tập phim hiện tại gửi lên hệ thống đám mây Supabase an toàn.",
      },
      {
        device: "Bước 3: Mở thiết bị mới và tiếp tục xem",
        desc: "Khi bạn đăng nhập cùng tài khoản trên điện thoại, tablet hay TV, thanh 'Tiếp tục xem' ở ngay đầu trang chủ sẽ hiển thị tập phim bạn đang xem dở cùng thanh tiến trình trực quan.",
      },
    ],
  },
];

const FAQ_DATA: FAQItem[] = [
  // 1. HƯỚNG DẪN & SỬ DỤNG
  {
    id: "g1",
    category: "guide",
    categoryLabel: "Hướng Dẫn & Sử Dụng",
    question: "Làm sao để tìm kiếm phim nhanh hoặc lọc theo nhiều tiêu chí?",
    answer:
      "Bạn có thể sử dụng tổ hợp phím tắt Ctrl + K (hoặc Cmd + K trên macOS) tại bất kỳ trang nào để mở thanh tìm kiếm thông minh hỗ trợ gõ tiếng Việt có dấu hoặc không dấu. Nếu muốn duyệt phim chuyên sâu, hãy truy cập trang 'Khám Phá' (/browse) — nơi trang bị bộ lọc đa chiều kết hợp cùng lúc: Thể loại, Quốc gia sản xuất, Năm phát hành, Loại phim (Phim lẻ / Phim bộ) và Trạng thái hoàn thành.",
    tips: "Mẹo nhỏ: Bạn cũng có thể tìm kiếm phim theo tên diễn viên hoặc đạo diễn để xem toàn bộ danh mục tác phẩm có họ tham gia.",
  },
  {
    id: "g2",
    category: "guide",
    categoryLabel: "Hướng Dẫn & Sử Dụng",
    question: "Làm thế nào để lưu phim vào danh sách yêu thích cá nhân?",
    answer:
      "Khi xem chi tiết bất kỳ bộ phim nào, bạn chỉ cần bấm vào nút 'Lưu vào danh sách' (biểu tượng Bookmark / Dấu trang). Bộ phim sẽ ngay lập tức được đưa vào trang 'Danh sách của tôi' (/my-list) để bạn dễ dàng theo dõi lại khi có thời gian rảnh.",
  },
  {
    id: "g3",
    category: "guide",
    categoryLabel: "Hướng Dẫn & Sử Dụng",
    question: "Nanaflix có chức năng xem lại lịch sử xem không?",
    answer:
      "Có. Tại trang cá nhân và mục 'Tiếp tục xem' trên trang chủ, hệ thống hiển thị danh sách toàn bộ các bộ phim bạn đã từng bấm xem cùng mốc thời gian xem gần nhất. Bạn có thể bấm vào thẻ phim để xem tiếp ngay, hoặc bấm nút biểu tượng Thùng rác để gỡ bỏ khỏi lịch sử nếu không muốn theo dõi nữa.",
  },

  // 2. TRÌNH PHÁT & VIDEO
  {
    id: "p1",
    category: "player",
    categoryLabel: "Trình Phát & Video",
    question: "Tại sao video bị đứng hình hoặc tải chậm (buffering) khi đang xem?",
    answer:
      "Tốc độ tải phim phụ thuộc vào 2 yếu tố chính: Tốc độ đường truyền Internet nội mạng của bạn và băng thông của máy chủ phát lúc cao điểm. Trình phát của Nanaflix được tích hợp công nghệ HLS Adaptive Bitrate tự động cân chỉnh độ nét theo tốc độ mạng tức thời để tránh đứng hình.",
    tips: "Cách xử lý nhanh: Bấm vào nút 'Server phát' trên thanh điều khiển của video để chuyển sang Server Dự Phòng (Backup HLS Server) hoặc hạ độ phân giải từ 1080p xuống 720p.",
  },
  {
    id: "p2",
    category: "player",
    categoryLabel: "Trình Phát & Video",
    question: "Nanaflix hỗ trợ những chuẩn chất lượng video nào?",
    answer:
      "Hầu hết các bộ phim điện ảnh và series truyền hình nổi bật trên Nanaflix đều được cung cấp nguồn phát chất lượng Full HD 1080p và HD 720p với tốc độ tải nhanh, hình ảnh sắc nét và âm thanh rõ ràng.",
  },
  {
    id: "p3",
    category: "player",
    categoryLabel: "Trình Phát & Video",
    question: "Nếu video bị mất âm thanh hoặc lệch tiếng thì xử lý như thế nào?",
    answer:
      "Khi video tự động phát, một số chính sách bảo mật của trình duyệt web (Autoplay Policy trên Chrome/Safari) có thể tạm thời tắt tiếng (Mute). Bạn chỉ cần bấm vào biểu tượng chiếc Loa ở góc dưới video để bật lại. Nếu âm thanh bị lệch so với khẩu hình diễn viên do sự cố mã hóa nguồn phát, hãy bấm đổi sang Server Dự Phòng khác trong danh sách tập phim.",
  },
  {
    id: "p4",
    category: "player",
    categoryLabel: "Trình Phát & Video",
    question: "Nanaflix có các phiên bản Vietsub, Thuyết minh và Lồng tiếng không?",
    answer:
      "Có! Các bộ phim nước ngoài trên Nanaflix chủ yếu được phát với bản Phụ đề tiếng Việt (Vietsub) chất lượng cao hiển thị sắc nét. Ngoài ra, bạn có thể chọn các bản Thuyết minh hoặc Lồng tiếng bằng cách sử dụng bộ lọc tại trang Khám Phá (/browse) hoặc chọn server tương ứng trong danh sách tập phim.",
  },
  {
    id: "p5",
    category: "player",
    categoryLabel: "Trình Phát & Video",
    question: "Chế độ 'Theater Mode' (Rạp chiếu) khác gì với Toàn màn hình?",
    answer:
      "Theater Mode mở rộng khung video chiếm trọn chiều rộng của cửa sổ trình duyệt nhưng vẫn giữ lại các thông tin mô tả phim, danh sách tập và đề xuất bên dưới để bạn vừa xem vừa có thể đổi tập nhanh chóng mà không cần thoát khỏi chế độ Full Screen.",
  },

  // 3. GỢI Ý & TÌM KIẾM THÔNG MINH
  {
    id: "ai1",
    category: "ai",
    categoryLabel: "Gợi Ý & Tìm Kiếm",
    question: "Hệ thống gợi ý phim thông minh hoạt động như thế nào?",
    answer:
      "Nanaflix tự động ghi nhận lịch sử xem và đánh giá của bạn để xây dựng hồ sơ sở thích (Taste Profile). Từ đó, danh mục 'Dành Riêng Cho Bạn' (For You) trên trang chủ sẽ ưu tiên đề xuất các tác phẩm điện ảnh tương thích cao nhất về thể loại, phong cách và diễn viên yêu thích.",
    tips: "Mẹo nhỏ: Càng xem và đánh giá nhiều phim, hệ thống gợi ý càng hiểu đúng gu thưởng thức của bạn.",
  },
  {
    id: "ai2",
    category: "ai",
    categoryLabel: "Gợi Ý & Tìm Kiếm",
    question: "Tôi có thể tìm kiếm phim theo diễn viên hoặc đạo diễn không?",
    answer:
      "Có! Bạn chỉ cần gõ tên diễn viên hoặc đạo diễn vào thanh tìm kiếm. Nanaflix tích hợp cơ sở dữ liệu tra cứu đa ngôn ngữ và tiểu sử nghệ sĩ, giúp bạn nhanh chóng xem toàn bộ danh sách các tác phẩm có sự tham gia của thần tượng.",
  },
  {
    id: "ai3",
    category: "ai",
    categoryLabel: "Gợi Ý & Tìm Kiếm",
    question: "Tính năng tóm tắt cốt truyện không tiết lộ nội dung (No Spoilers) là gì?",
    answer:
      "Mỗi bộ phim trên Nanaflix đều được cung cấp phần tóm tắt ngắn gọn, làm nổi bật thông điệp chính và dàn diễn viên mà không làm lộ các tình tiết bất ngờ hay kết thúc phim, giúp bạn an tâm tham khảo trước khi bấm xem.",
  },

  // 4. TÀI KHOẢN & BẢO MẬT
  {
    id: "a1",
    category: "account",
    categoryLabel: "Tài Khoản & Bảo Mật",
    question: "Không đăng ký tài khoản có thể xem phim được không?",
    answer:
      "Hoàn toàn được! Bạn có thể xem toàn bộ kho phim không giới hạn dưới tư cách Khách (Guest). Tuy nhiên, việc đăng ký tài khoản miễn phí (chỉ mất 10 giây qua nút Google Sign-In) sẽ mở khóa các tính năng cao cấp: Lưu lịch sử xem lên đám mây, Đồng bộ tiến trình đa thiết bị, Đánh giá phim và Lưu bộ sưu tập cá nhân.",
  },
  {
    id: "a2",
    category: "account",
    categoryLabel: "Tài Khoản & Bảo Mật",
    question: "Làm thế nào để đổi ảnh đại diện hoặc tên hiển thị?",
    answer:
      "Bấm vào biểu tượng ảnh đại diện tài khoản ở góc trên cùng bên phải màn hình để mở bảng Hồ sơ cá nhân (Profile Modal). Tại đây, bạn có thể chọn các bộ Avatar phong cách điện ảnh có sẵn, tùy chỉnh Tên hiển thị và quản lý các thiết bị đang đăng nhập.",
  },
  {
    id: "a3",
    category: "account",
    categoryLabel: "Tài Khoản & Bảo Mật",
    question: "Nếu tôi muốn xóa hoàn toàn tài khoản và dữ liệu thì làm thế nào?",
    answer:
      "Chúng tôi tôn trọng tuyệt đối quyền tự chủ dữ liệu của bạn theo tiêu chuẩn GDPR. Tại mục Cài đặt tài khoản, bạn có thể chọn 'Xóa vĩnh viễn tài khoản'. Toàn bộ thông tin hồ sơ, lịch sử xem và danh sách phim của bạn trong cơ sở dữ liệu sẽ bị xóa sạch ngay lập tức.",
  },

  // 5. NGUỒN PHIM & NỘI DUNG
  {
    id: "c1",
    category: "content",
    categoryLabel: "Nguồn Phim & Nội Dung",
    question: "Các bộ phim truyền hình đang chiếu được cập nhật bao lâu sau khi phát sóng?",
    answer:
      "Đối với các series phim bộ Hàn Quốc, Trung Quốc, US-UK hay Anime đang phát sóng, tập phim mới thường được tự động đồng bộ và cập nhật chỉ sau 1 đến 3 giờ kể từ thời điểm phát sóng chính thức tại nước sở tại.",
  },
  {
    id: "c2",
    category: "content",
    categoryLabel: "Nguồn Phim & Nội Dung",
    question: "Phim trên Nanaflix là bản Phụ đề (Vietsub) hay Thuyết minh/Lồng tiếng?",
    answer:
      "Hầu hết các phim đều có sẵn bản Phụ đề tiếng Việt (Vietsub) chuẩn nét. Nhiều phim hoạt hình chiếu rạp bom tấn hoặc phim bộ đình đám có hỗ trợ thêm các tùy chọn luồng âm thanh Thuyết minh hoặc Lồng tiếng giọng chuẩn để phục vụ khán giả mọi lứa tuổi.",
  },
  {
    id: "c3",
    category: "content",
    categoryLabel: "Nguồn Phim & Nội Dung",
    question: "Tôi có thể yêu cầu bổ sung bộ phim mà mình muốn xem không?",
    answer:
      "Rất hoan nghênh! Bạn có thể gửi tên bộ phim mong muốn qua mục 'Trợ giúp & Báo lỗi' (/about#contact) hoặc gửi email trực tiếp tới contact@nanaflix.id.vn. Chúng tôi sẽ cố gắng tìm kiếm nguồn phát chất lượng cao nhất để bổ sung vào hệ thống trong thời gian sớm nhất.",
  },

  // 6. XỬ LÝ SỰ CỐ & TRÌNH DUYỆT
  {
    id: "t1",
    category: "troubleshoot",
    categoryLabel: "Xử Lý Sự Cố Kỹ Thuật",
    question: "Tại sao trình phát hiện màn hình đen hoặc thông báo 'Không thể tải luồng video'?",
    answer:
      "Lỗi này thường xảy ra do: 1) Một số tiện ích mở rộng chặn quảng cáo (AdBlock) bên ngoài bị cấu hình quá nghiêm ngặt chặn nhầm tệp dữ liệu HLS (.m3u8); 2) Bộ nhớ đệm trình duyệt bị lỗi thời; hoặc 3) Nguồn phát video tạm thời bảo trì. Hãy thử tắt AdBlock cho tên miền nanaflix, tải lại trang bằng Ctrl + F5 hoặc chuyển sang Server Dự Phòng.",
  },
  {
    id: "t2",
    category: "troubleshoot",
    categoryLabel: "Xử Lý Sự Cố Kỹ Thuật",
    question: "Nên sử dụng trình duyệt web nào để có trải nghiệm xem phim tốt nhất?",
    answer:
      "Nanaflix được tối ưu hóa hoàn hảo cho các trình duyệt hiện đại: Google Chrome, Apple Safari, Microsoft Edge, Brave và Mozilla Firefox. Khuyến nghị cập nhật trình duyệt lên phiên bản mới nhất để tận dụng phần cứng GPU tăng tốc giải mã video HLS mượt mà và tiết kiệm pin.",
  },
];

const CATEGORIES = [
  { id: "all", label: "Tất cả", icon: Compass },
  { id: "guide", label: "Hướng Dẫn & Sử Dụng", icon: BookOpen },
  { id: "player", label: "Trình Phát & Video", icon: Tv },
  { id: "ai", label: "Gợi Ý & Tìm Kiếm", icon: Compass },
  { id: "account", label: "Tài Khoản & Bảo Mật", icon: MonitorSmartphone },
  { id: "content", label: "Nguồn Phim & Lịch Chiếu", icon: Film },
  { id: "troubleshoot", label: "Xử Lý Sự Cố", icon: AlertOctagon },
];

export default function FAQPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [openGuideId, setOpenGuideId] = useState<string | null>("guide-pwa");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    g1: true,
    p1: true,
    ai1: true,
    a1: true,
  });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredFAQs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return FAQ_DATA.filter((item) => {
      const matchCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchSearch =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-dvh bg-[#050505] text-zinc-100 flex flex-col selection:bg-netflix-red selection:text-white font-sans antialiased overflow-x-clip">
      <Navbar />

      <main className="flex-1 pt-24 sm:pt-32 pb-24 px-4 sm:px-8 md:px-12 max-w-6xl mx-auto w-full space-y-14 sm:space-y-20">

        {/* ================= 1. HERO HEADER DÙNG CHUNG ================= */}
        <PageHeader
          align="center"
          size="large"
          badge={
            <>
              <HelpCircle size={14} className="text-netflix-red" />
              <span>Trung tâm trợ giúp & cẩm nang sử dụng</span>
            </>
          }
          title={
            <>
              Hướng Dẫn & <span className="text-netflix-red">Hỏi Đáp</span>
            </>
          }
          subtitle="Tổng hợp bí kíp làm chủ các tính năng cao cấp, hướng dẫn cài đặt app, truyền phim lên Smart TV và giải đáp cặn kẽ mọi thắc mắc."
          actions={
            <div className="w-full max-w-xl mx-auto relative pt-2">
              <div className="relative flex items-center">
                <Search size={18} className="absolute left-4 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm hướng dẫn (ví dụ: cài app, xem trên TV, phím tắt, giật lag, phụ đề...)"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-zinc-950/80 border border-white/[0.1] focus:border-netflix-red/60 focus:bg-black text-base sm:text-sm text-white placeholder-zinc-500 focus:outline-none transition-all shadow-2xl backdrop-blur-xl"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-zinc-400 hover:text-white transition cursor-pointer"
                  >
                    Xóa
                  </button>
                )}
              </div>
            </div>
          }
        />

        {/* ================= 2. 4 INTERACTIVE QUICK GUIDES ================= */}
        {(!searchQuery || searchQuery.length === 0) && (selectedCategory === "all" || selectedCategory === "guide") && (
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-netflix-red">
                <BookOpen size={16} />
                <span>Hướng dẫn thao tác nhanh</span>
              </div>
              <span className="text-xs text-zinc-500 font-sans tabular-nums">4 Cẩm Nang Thực Hành</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {QUICK_GUIDES.map((guide) => {
                const Icon = guide.icon;
                const isExpanded = openGuideId === guide.id;

                return (
                  <div
                    key={guide.id}
                    className={`p-6 sm:p-7 rounded-2xl transition-colors duration-200 space-y-4 ${
                      isExpanded
                        ? "bg-zinc-900/80 ring-1 ring-netflix-red/40 shadow-xl"
                        : "bg-zinc-900/50 hover:bg-zinc-900/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-2xl ${guide.bgColor} ${guide.color} flex-shrink-0`}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <span className="text-[10px] font-sans tabular-nums font-bold px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300">
                            {guide.badge}
                          </span>
                          <h3 className="text-base font-bold text-white mt-1">{guide.title}</h3>
                        </div>
                      </div>

                      <Tooltip content={isExpanded ? "Thu gọn" : "Xem chi tiết"} side="top">
                        <button
                          type="button"
                          onClick={() => setOpenGuideId(isExpanded ? null : guide.id)}
                          aria-label={isExpanded ? "Thu gọn" : "Xem chi tiết"}
                          className={`p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-transform cursor-pointer ${
                            isExpanded ? "rotate-180 bg-netflix-red/20 text-netflix-red" : ""
                          }`}
                        >
                          <ChevronDown size={16} />
                        </button>
                      </Tooltip>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed">{guide.summary}</p>

                    {/* Expandable Steps or Shortcuts */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-white/[0.06] space-y-3 animate-fadeIn">
                        {guide.steps && (
                          <div className="space-y-2.5">
                            {guide.steps.map((s, idx) => (
                              <div key={idx} className="p-3.5 rounded-2xl bg-black/45 space-y-1">
                                <div className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                  <span>{s.device}</span>
                                </div>
                                <div className="text-[11px] text-zinc-400 leading-relaxed pl-5">{s.desc}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {guide.shortcuts && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {guide.shortcuts.map((sc, idx) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-xl bg-black/45 flex items-center justify-between gap-2 text-xs"
                              >
                                <span className="text-[11px] text-zinc-400">{sc.desc}</span>
                                <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-white font-sans tabular-nums text-[10px] font-bold shrink-0">
                                  {sc.key}
                                </kbd>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ================= 3. CATEGORY TABS ================= */}
        <section className="space-y-6">
          <div className="flex items-center justify-center gap-2 flex-wrap pb-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? "bg-netflix-red text-white shadow-md shadow-black/50 scale-[1.02]"
                      : "bg-zinc-900/70 hover:bg-zinc-800/80 text-zinc-400 hover:text-white"
                  }`}
                >
                  <Icon size={14} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* ================= 4. ACCORDION FAQ LIST ================= */}
          <div className="space-y-4">
            {filteredFAQs.length === 0 ? (
              <div className="p-6 sm:p-12 text-center rounded-2xl bg-zinc-900/50 text-zinc-400 space-y-3">
                <HelpCircle size={32} className="mx-auto text-zinc-500 opacity-60" />
                <p className="text-sm font-medium">Không tìm thấy câu hỏi phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                  className="text-xs text-netflix-red hover:underline font-semibold cursor-pointer"
                >
                  Xem toàn bộ danh mục câu hỏi
                </button>
              </div>
            ) : (
              <div className="rounded-2xl sm:rounded-3xl bg-zinc-900/50 divide-y divide-white/[0.06] overflow-hidden">
                {filteredFAQs.map((faq) => {
                  const isOpen = Boolean(openItems[faq.id]);
                  return (
                    <div
                      key={faq.id}
                      className={`transition-colors duration-200 ${
                        isOpen ? "bg-zinc-900/70" : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleItem(faq.id)}
                        className="w-full p-4 sm:p-5 text-left flex items-start justify-between gap-4 cursor-pointer select-none"
                      >
                        <div className="space-y-1 min-w-0">
                          <span className="text-[11px] font-sans tabular-nums text-netflix-red font-medium">
                            {faq.categoryLabel}
                          </span>
                          <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                            {faq.question}
                          </h3>
                        </div>
                        <div
                          className={`p-2 rounded-xl bg-white/[0.05] text-zinc-400 flex-shrink-0 transition-transform duration-300 ${
                            isOpen ? "rotate-180 bg-netflix-red/20 text-netflix-red" : ""
                          }`}
                        >
                          <ChevronDown size={16} />
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-5 sm:px-6 pb-6 pt-2 space-y-3 text-xs sm:text-sm text-zinc-300 leading-relaxed border-t border-white/[0.06]">
                          <p>{faq.answer}</p>
                          {faq.tips && (
                            <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-300 text-xs flex items-start gap-2.5">
                              <CheckCircle2 size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                              <span>{faq.tips}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ================= 5. STILL NEED HELP CTA ================= */}
        <section className="p-5 sm:p-10 rounded-3xl bg-zinc-900/60 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-netflix-red text-xs font-semibold">
              <LifeBuoy size={14} />
              <span>Chưa Tìm Thấy Lời Giải Đáp?</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              Gửi thông tin sự cố trực tiếp tới đội ngũ kỹ thuật Nanaflix
            </h3>
            <p className="text-xs text-zinc-400">
              Chúng tôi luôn sẵn sàng hỗ trợ kiểm tra đường truyền và khắc phục lỗi sớm nhất.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-center flex-shrink-0">
            <Link
              href="/about#contact"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-netflix-red hover:brightness-110 active:brightness-95 text-xs font-bold text-white transition shadow-md shadow-black/50"
            >
              <MessageSquare size={14} />
              <span>Báo Lỗi & Trợ Giúp</span>
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-bold text-white transition backdrop-blur-md"
            >
              <Film size={14} />
              <span>Giới Thiệu Dự Án</span>
            </Link>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
