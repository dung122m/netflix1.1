# PIXEL-PERFECT & DESIGN TASTE FRAMEWORK — NANAFLIX

Tài liệu này xác lập bộ tiêu chuẩn UI/UX và quy tắc kỹ thuật giao diện dùng lâu dài cho toàn bộ dự án Nanaflix, định hướng trải nghiệm streaming cao cấp (chuẩn Apple TV / Netflix).

---

## 1. Pixel-Perfect Layout

- **Alignment & Horizontal Baseline:** Các thành phần trong cùng một hàng hoặc cùng một lưới (Grid/Carousel) phải giữ căn thẳng hàng (alignment) tuyệt đối, không được xô lệch đáy hay so le tiêu đề.
- **Hệ thống khoảng cách (Spacing Grid):** Ưu tiên hệ spacing 4px/8px (các bước: 2px, 4px, 6px, 8px, 10px, 12px, 16px, 20px, 24px). Không ép buộc máy móc nếu thiết kế hoặc typography hiện tại có lý do hợp lý cần khoảng đệm đặc thù.
- **Phòng chống Overflow & Layout Shift:**
  - Tuyệt đối không để phát sinh thanh cuộn ngang ngoài ý muốn trên toàn trang (`overflow-x: hidden` có chủ đích hoặc container co giãn an toàn).
  - Khung ảnh poster, thumbnail video bắt buộc có tỷ lệ khung hình xác định trước (`aspect-[2/3]`, `aspect-video`) kèm màu nền placeholder để tránh giật khung hình (CLS - Cumulative Layout Shift) khi ảnh đang tải.
- **Responsive Viewport Testing:** Kiểm tra tối thiểu từ viewport nhỏ (320px, 375px, 390px), trung bình (640px, 768px, 1024px) đến lớn (1280px+).
- **Nguyên tắc bảo toàn kích thước:** Không tùy tiện thay đổi kích thước, độ rộng card nếu chưa đánh giá toàn diện ảnh hưởng đến mật độ hiển thị và trải nghiệm cuộn của trang.

---

## 2. Typography & Xử Lý Chữ Tiếng Việt

- **Phân cấp thị giác rõ rệt (Typographic Hierarchy):**
  - Giữ khoảng cách chênh lệch tối thiểu 2–3px giữa các cấp chữ cạnh nhau (ví dụ: Tiêu đề 13–14px semibold sáng màu; Thông tin phụ 11px medium xám dịu).
  - Tránh để hai cấp chữ liền kề có kích cỡ xấp xỉ nhau (như 13px và 12px) gây cảm giác tranh chấp không gian và chật chội.
- **An toàn dấu tiếng Việt (Diacritics Safety):**
  - Tiêu đề nhiều dòng tiếng Việt bắt buộc có `line-height` tối thiểu `leading-[1.4]` (hoặc `leading-snug`).
  - Khi cố định chiều cao (`h-*`), bắt buộc tính toán: `Chiều cao = (Cỡ font × line-height × số dòng) + khoảng đệm dấu thanh`. Tuyệt đối không ép chiều cao quá sát khiến dấu mũ (`ấ, ế, ố, ứ`) hoặc dấu nặng/hỏi bị `overflow: hidden` xén mất.
- **Kỷ luật Truncation & Flexbox:**
  - Mọi container flexbox/grid chứa nội dung text động bắt buộc phải có `min-w-0` để ngăn flex child bung quá chiều rộng cha.
  - Sử dụng `line-clamp-*` khi giới hạn số dòng (kèm container `min-w-0`).
  - Chỉ dùng `truncate` (`overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`) khi giới hạn đúng 1 dòng.
  - Không mặc định `display: flex` luôn làm hỏng ellipsis; phải kiểm tra xem text node nằm trực tiếp trong flex container hay nằm trong flex item có `min-w-0`. Nếu phần tử cha là flex container không có `min-w-0`, chuyển sang `block truncate` hoặc bọc text vào flex item con có `min-w-0`.
- **Độ tương phản (Contrast):** Không hạ màu chữ metadata quá mức (giữ tối thiểu mức `text-zinc-400/90` hoặc `text-neutral-400` trên nền tối) để bảo đảm khả năng đọc rõ ràng theo chuẩn tiếp cận WCAG.

---

## 3. Spacing & Component Consistency

- **Khoảng thở có chủ đích (Intentional Spacing):**
  - Khoảng cách giữa hình ảnh (poster) và tiêu đề: 8–10px (`pt-2` hoặc `pt-2.5`).
  - Khoảng cách giữa tiêu đề và thông tin phụ: 4–6px (`mt-1` hoặc `mt-1.5`).
- **Chiều cao cố định có kiểm soát:**
  - Chỉ cố định chiều cao vùng tiêu đề khi các card nằm trong cùng một hàng/grid ngang cần giữ thẳng tắp đường chân trời cho dòng metadata bên dưới.
  - Không áp đặt cấu trúc cứng nhắc giống nhau cho các component có bản chất khác nhau (ví dụ: thẻ phim chân dung `MediaCard` khác với thẻ lịch thi đấu `MatchCard`).

---

## 4. Dark Theme & Vật Liệu Giao Diện

- **Tôn trọng Design System:** Sử dụng bảng màu gốc của Nanaflix (nền đen điện ảnh, đỏ thương hiệu `netflix-red`, điểm nhấn vàng hổ phách `amber-400`).
- **Chiều sâu bề mặt (Layered Dark Surfaces):**
  - Tránh lạm dụng màu đen tuyền `#000000` cho mọi bề mặt card và modal.
  - Ưu tiên cấu trúc phân lớp: Nền trang (`bg-zinc-950` / `bg-black`) ➔ Nền card (`bg-zinc-900/80` hoặc `from-zinc-800/70 via-zinc-900 to-zinc-950`) ➔ Lớp nổi / Dropdown (`bg-zinc-900/95 backdrop-blur-md`).
- **Đường viền siêu mảnh (Hairline Borders):** Sử dụng `border border-white/10` (hover: `border-white/25`) để định hình ranh giới mà không gây thô cứng.
- **Glassmorphism có chọn lọc:** Áp dụng `backdrop-blur-md` kết hợp `bg-black/60` cho các huy hiệu (badge chất lượng, rating, nút hành động nổi) để làm nổi bật thông tin trên nền poster ảnh động.

---

## 5. Motion & Tương Tác

- **Đường cong chuyển động:** Áp dụng easing mượt mà `transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`.
- **Hover Scale tinh tế:** Card chỉ phóng to nhẹ (`scale-[1.02]` đến `scale-[1.03]`), tuyệt đối không scale quá lớn (`> 1.05`) gây che khuất nội dung card lân cận.
- **Khả năng tiếp cận (Accessibility):**
  - Luôn hỗ trợ `motion-reduce:transform-none` cho người dùng nhạy cảm chuyển động.
  - Không phụ thuộc vào hover cho các chức năng cốt lõi (trên mobile/tablet phải có nút bấm chạm trực tiếp hoặc thao tác tap).
  - Giữ nguyên trạng thái `focus-visible` phục vụ điều hướng bằng bàn phím.

---

## 6. Quy Trình Khi AI Agent Chỉnh Sửa UI

Mọi AI Agent khi thực hiện tác vụ sửa đổi giao diện trên Nanaflix bắt buộc tuân thủ 2 bước:

### Trước khi sửa:
1. Xác định chính xác component và mọi nơi đang tái sử dụng component đó.
2. Kiểm tra code thực tế, không dựa vào suy đoán hoặc quy tắc giả định.
3. Xác định phạm vi thay đổi tối thiểu cần thiết để đạt mục tiêu, không refactor lan man.

### Sau khi sửa:
1. Kiểm tra responsive ở các breakpoint liên quan (đặc biệt là 320px, 375px, 390px trên mobile và 768px, 1280px trên desktop).
2. Kiểm tra regression: đảm bảo không làm thay đổi logic dữ liệu, tương tác, hoặc làm vỡ bố cục các trang khác.
3. Chạy kiểm tra kỹ thuật của dự án: `npm run typecheck`, unit test liên quan.
4. Báo cáo trung thực những gì đã kiểm chứng và giới hạn kiểm thử (nếu có).
