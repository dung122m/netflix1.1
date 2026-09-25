/**
 * VIETNAM HISTORICAL MILESTONES DATASET
 * Fact-checked historical events in Vietnamese history with verified dates and sources.
 * Maintained separately from cultural holidays to preserve clean domain boundaries.
 */

export type HistoricalVisualTheme =
  | "ba-dinh-1945"
  | "dien-bien-phu"
  | "giai-phong-thu-do"
  | "thong-nhat-1975"
  | "dong-da"
  | "hai-ba-trung"
  | "bach-dang"
  | "bac-ho-cuu-nuoc"
  | "khang-chien"
  | "general-history";

export interface VietnamHistoricalEvent {
  id: string;
  solarDate: { month: number; day: number };
  lunarDate?: { lunarMonth: number; lunarDay: number };
  year: number;
  title: string;
  summary: string;
  context?: string;
  significance: string;
  figures?: string[];
  location?: string;
  keyFacts?: string[];
  didYouKnow?: string;
  visualTheme: HistoricalVisualTheme;
  sources: string[];
}

export const VIETNAM_HISTORICAL_EVENTS: VietnamHistoricalEvent[] = [
  {
    id: "hist-01-06-tong-tuyen-cu-1946",
    solarDate: { month: 1, day: 6 },
    year: 1946,
    title: "Cuộc Tổng tuyển cử đầu tiên bầu Quốc hội nước Việt Nam",
    summary:
      "Ngày 06/01/1946, hơn 89% cử tri cả nước bất chấp bom đạn khiêu khích của kẻ thù đã nô nức đi bỏ phiếu, bầu ra Quốc hội đầu tiên của nước Việt Nam Dân chủ Cộng hòa gồm 333 đại biểu. Đây là mốc son chói lọi đánh dấu bước trưởng thành vượt bậc của nền dân chủ cách mạng non trẻ.",
    context:
      "Sau thắng lợi Cách mạng Tháng Tám 1945, chính quyền công nông non trẻ đứng trước muôn vàn thử thách hiểm nghèo 'nghìn cân treo sợi tóc' với thù trong giặc ngoài, giặc đói và giặc dốt bủa vây.",
    significance:
      "Khẳng định quyền làm chủ thiêng liêng của nhân dân Việt Nam, thiết lập tính hợp hiến, hợp pháp vững chắc của nhà nước công nông đầu tiên ở Đông Nam Á trên trường quốc tế.",
    figures: ["Chủ tịch Hồ Chí Minh", "Cụ Huỳnh Thúc Kháng", "Đồng chí Tôn Đức Thắng"],
    location: "Toàn quốc (Hà Nội, các tỉnh miền Bắc, Trung, Nam)",
    keyFacts: [
      "Hơn 89% cử tri toàn quốc tham gia bỏ phiếu",
      "Bầu ra 333 đại biểu Quốc hội khóa I",
      "Chủ tịch Hồ Chí Minh trúng cử tại Hà Nội với 98,4% số phiếu"
    ],
    didYouKnow:
      "Tại miền Nam, thực dân Pháp ném bom, bắn phá dữ dội các điểm bỏ phiếu nhưng đồng bào vẫn dũng cảm đi bầu; 42 cán bộ, chiến sĩ đã anh dũng hy sinh trong khi làm nhiệm vụ Tổng tuyển cử.",
    visualTheme: "ba-dinh-1945",
    sources: [
      "Văn phòng Quốc hội nước CHXHCN Việt Nam",
      "Bảo tàng Lịch sử Quốc gia",
      "Lịch sử Quốc hội Việt Nam (Tập 1)"
    ]
  },
  {
    id: "hist-01-27-hiep-dinh-paris-1973",
    solarDate: { month: 1, day: 27 },
    year: 1973,
    title: "Ký kết Hiệp định Paris về chấm dứt chiến tranh ở Việt Nam",
    summary:
      "Tại Trung tâm Hội nghị Quốc tế Kléber (Paris, Pháp), Hiệp định Paris về chấm dứt chiến tranh, lập lại hòa bình ở Việt Nam chính thức được ký kết sau gần 5 năm đàm phán cam go với 201 phiên họp công khai. Văn kiện buộc Mỹ phải cam kết tôn trọng độc lập, chủ quyền, thống nhất và toàn vẹn lãnh thổ của Việt Nam.",
    context:
      "Mỹ buộc phải ngồi vào bàn ký kết sau thất bại thảm hại của cuộc tập kích chiến lược đường không bằng máy bay B-52 vào Hà Nội và Hải Phòng cuối tháng 12/1972 ('Điện Biên Phủ trên không').",
    significance:
      "Thắng lợi ngoại giao quân sự mang tính bước ngoặt, tạo tiền đề trực tiếp để quân và dân ta tiến lên giải phóng hoàn toàn miền Nam, thống nhất đất nước vào mùa Xuân 1975.",
    figures: ["Cố vấn Lê Đức Thọ", "Bộ trưởng Ngoại giao Nguyễn Duy Trinh", "Bộ trưởng Nguyễn Thị Bình"],
    location: "Trung tâm Hội nghị Kléber, Paris, Pháp",
    keyFacts: [
      "Đàm phán kéo dài 4 năm 8 tháng 14 ngày (1968 - 1973)",
      "Trải qua 201 phiên họp công khai và 45 cuộc gặp riêng cấp cao",
      "Buộc quân đội Mỹ và đồng minh rút hoàn toàn khỏi miền Nam Việt Nam"
    ],
    didYouKnow:
      "Bà Nguyễn Thị Bình, Trưởng đoàn đàm phán Chính phủ Cách mạng lâm thời Cộng hòa miền Nam Việt Nam, là người phụ nữ duy nhất đặt bút ký vào bản Hiệp định lịch sử này.",
    visualTheme: "thong-nhat-1975",
    sources: [
      "Bộ Ngoại giao nước CHXHCN Việt Nam",
      "Viện Lịch sử Quân sự Việt Nam",
      "Bảo tàng Lịch sử Quốc gia"
    ]
  },
  {
    id: "hist-01-30-ngoc-hoi-dong-da-1789",
    solarDate: { month: 1, day: 30 },
    lunarDate: { lunarMonth: 1, lunarDay: 5 },
    year: 1789,
    title: "Chiến thắng Ngọc Hồi - Đống Đa đại phá 29 vạn quân Mãn Thanh",
    summary:
      "Rạng sáng mùng 5 Tết Kỷ Dậu (30/01/1789), cánh quân Tây Sơn do Hoàng đế Quang Trung đích thân chỉ huy xông thẳng vào đồn Ngọc Hồi, đồng thời đạo quân của Đô đốc Long bất ngờ tập kích đồn Khương Thượng (Đống Đa). Quân Tây Sơn giải phóng kinh thành Thăng Long trong sự hoảng loạn tháo chạy của quân xâm lược Mãn Thanh.",
    context:
      "Cuối năm 1788, vua Lê Chiêu Thống cầu viện nhà Thanh; Tổng đốc Lưỡng Quảng Tôn Sĩ Nghị xua 29 vạn quân tràn sang chiếm đóng kinh thành Thăng Long.",
    significance:
      "Một trong những chiến công chống giặc ngoại xâm oanh liệt bậc nhất lịch sử dân tộc, thể hiện đỉnh cao nghệ thuật quân sự thần tốc, táo bạo của Hoàng đế Quang Trung.",
    figures: ["Hoàng đế Quang Trung (Nguyễn Huệ)", "Đô đốc Đặng Tiến Đông", "Đô đốc Ngô Văn Sở"],
    location: "Kinh thành Thăng Long (gò Đống Đa, đồn Ngọc Hồi, Hà Nội)",
    keyFacts: [
      "Đại phá 29 vạn quân Mãn Thanh chỉ trong 5 ngày đêm Tết Kỷ Dậu",
      "Tướng giặc Sầm Nghi Đống thắt cổ tự tử ở gò Đống Đa",
      "Chủ tướng Tôn Sĩ Nghị không kịp mặc giáp, vứt bỏ ấn tín tháo chạy qua cầu phao sông Hồng",
      "Mùng 5 tháng Giêng Âm lịch vừa là ngày đại thắng lịch sử, vừa là ngày hội truyền thống Gò Đống Đa tổ chức hàng năm để tưởng nhớ công đức vua Quang Trung"
    ],
    didYouKnow:
      "Hoàng đế Quang Trung đã cho quân ăn Tết sớm từ ngày 30 tháng Chạp tại Tam Điệp và hẹn trước với ba quân tướng sĩ: 'Mùng 7 Tết sẽ vào thành Thăng Long ăn Tết mừng chiến thắng', nhưng thực tế mùng 5 Tết đại quân đã ca khúc khải hoàn.",
    visualTheme: "dong-da",
    sources: [
      "Đại Việt Sử ký Toàn thư",
      "Khâm định Việt sử Thông giám Cương mục",
      "Viện Sử học Việt Nam"
    ]
  },
  {
    id: "hist-02-03-thanh-lap-dang-1930",
    solarDate: { month: 2, day: 3 },
    year: 1930,
    title: "Thành lập Đảng Cộng sản Việt Nam",
    summary:
      "Từ ngày 06/01 đến đầu tháng 02/1930, Hội nghị hợp nhất các tổ chức cộng sản Việt Nam diễn ra tại bán đảo Cửu Long (Hương Cảng, Trung Quốc) dưới sự chủ trì của đồng chí Nguyễn Ái Quốc. Hội nghị quyết định thống nhất ba tổ chức cộng sản thành một chính đảng duy nhất lấy tên là Đảng Cộng sản Việt Nam.",
    context:
      "Đầu thế kỷ XX, các phong trào yêu nước chống thực dân Pháp liên tiếp thất bại vì thiếu một đường lối cách mạng đúng đắn và giai cấp tiên phong lãnh đạo.",
    significance:
      "Mốc son lịch sử mở ra bước ngoặt quyết định cho cách mạng Việt Nam, chấm dứt thời kỳ khủng hoảng sâu sắc về đường lối cứu nước suốt nhiều thập kỷ.",
    figures: ["Lãnh tụ Nguyễn Ái Quốc", "Đồng chí Trịnh Đình Cửu", "Đồng chí Châu Văn Liêm"],
    location: "Cửu Long (Kowloon), Hương Cảng (Hong Kong)",
    keyFacts: [
      "Hợp nhất: Đông Dương Cộng sản Đảng, An Nam Cộng sản Đảng và Đông Dương Cộng sản Liên đoàn",
      "Thông qua Chánh cương vắn tắt, Sách lược vắn tắt do Nguyễn Ái Quốc soạn thảo",
      "Đại hội đại biểu toàn quốc lần thứ III (1960) quyết nghị lấy ngày 03/02 làm ngày kỷ niệm thành lập Đảng"
    ],
    didYouKnow:
      "Hội nghị thành lập Đảng được tổ chức bí mật tại một khán đài bóng đá ở Hương Cảng để ngụy trang tránh sự theo dõi gắt gao của mật thám thực dân Pháp và cảnh sát Anh.",
    visualTheme: "bac-ho-cuu-nuoc",
    sources: [
      "Viện Lịch sử Đảng - Học viện Chính trị Quốc gia Hồ Chí Minh",
      "Bảo tàng Lịch sử Quốc gia",
      "Văn kiện Đảng Toàn tập (Tập 2)"
    ]
  },
  {
    id: "hist-02-08-bac-ho-ve-nuoc-1941",
    solarDate: { month: 2, day: 8 },
    year: 1941,
    title: "Lãnh tụ Nguyễn Ái Quốc về nước tại Pác Bó (Cao Bằng)",
    summary:
      "Ngày 28/01/1941 (mùng 2 Tết Tân Tỵ), lãnh tụ Nguyễn Ái Quốc vượt qua mốc 108 biên giới Việt - Trung trở về Tổ quốc sau 30 năm bôn ba khắp bốn biển năm châu. Đến ngày 08/02/1941, Người chính thức chuyển vào ở và làm việc tại hang Cốc Bó (Pác Bó, Hà Quảng, Cao Bằng) để trực tiếp lãnh đạo cách mạng Việt Nam.",
    context:
      "Chiến tranh thế giới thứ hai bùng nổ, thực dân Pháp đầu hàng phát xít Nhật tại Đông Dương; thời cơ giải phóng dân tộc đang chín muồi.",
    significance:
      "Người trực tiếp lãnh đạo phong trào cách mạng trong nước, thành lập Mặt trận Việt Minh và chỉ đạo chuẩn bị mọi mặt cho cuộc Tổng khởi nghĩa Tháng Tám 1945.",
    figures: ["Lãnh tụ Nguyễn Ái Quốc (Bác Hồ)", "Đồng chí Phùng Chí Kiên", "Đồng chí Lê Quảng Ba"],
    location: "Cột mốc 108, Hang Cốc Bó, Pác Bó, Hà Quảng, Cao Bằng",
    keyFacts: [
      "Vượt qua mốc 108 trở về Tổ quốc ngày 28/01/1941 (mùng 2 Tết Tân Tỵ)",
      "Ngày 08/02/1941: Chuyển vào ở và làm việc tại hang Cốc Bó, đặt tên Núi Các Mác, Suối Lênin",
      "Nơi ra đời bài thơ bất hủ 'Pác Bó hùng vĩ': 'Sáng ra bờ suối, tối vào hang / Cháo bẹ rau măng vẫn sẵn sàng...'"
    ],
    didYouKnow:
      "Khi đặt chân qua mốc 108 trên biên cương Tổ quốc, Người đã lặng đi cúi mình hôn lên nắm đất quê hương sau ba thập kỷ xa cách.",
    visualTheme: "bac-ho-cuu-nuoc",
    sources: [
      "Khu di tích Quốc gia đặc biệt Pác Bó",
      "Bảo tàng Hồ Chí Minh",
      "Hồ Chí Minh Biên niên tiểu sử"
    ]
  },
  {
    id: "hist-03-08-khoi-nghia-hai-ba-trung-40",
    solarDate: { month: 3, day: 8 },
    lunarDate: { lunarMonth: 2, lunarDay: 6 },
    year: 40,
    title: "Khởi nghĩa Hai Bà Trưng bùng nổ tại Hát Môn",
    summary:
      "Mùa xuân năm Canh Tý (năm 40 sau Công nguyên), Hai Bà Trưng (Trưng Trắc và Trưng Nhị) phất cờ khởi nghĩa tại cửa sông Hát (Hát Môn, Phúc Thọ, Hà Nội). Nghĩa quân nhanh chóng quét sạch chính quyền đô hộ, chiếm lại 65 thành trì đất Lĩnh Nam, Trưng Trắc được tôn làm Vua (Trưng Nữ Vương).",
    context:
      "Thái thú nhà Đông Hán là Tô Định cai trị tàn bạo, thi hành chính sách bóc lột hà khắc và giết hại Thi Sách (chồng bà Trưng Trắc). Khởi nghĩa nổ ra vào mùa xuân năm Canh Tý (năm 40 SCN); ngày Mùng 6 tháng 2 Âm lịch là ngày Lễ hội truyền thống tưởng nhớ Hai Bà Trưng tại Đền Mê Linh và Đền Hát Môn; ngày 8/3 Dương lịch là ngày kỷ niệm cấp quốc gia gắn với truyền thống phụ nữ Việt Nam.",
    significance:
      "Cuộc khởi nghĩa vũ trang đầu tiên trong lịch sử chống ách đô hộ phong kiến phương Bắc, khẳng định ý chí độc lập bất khuất và vai trò anh hùng của phụ nữ Việt Nam.",
    figures: ["Trưng Trắc", "Trưng Nhị", "Bát Nàn Đại tướng quân", "Lê Chân"],
    location: "Cửa sông Hát (Hát Môn), Mê Linh, thành Luy Lâu",
    keyFacts: [
      "Thu phục 65 thành trì trên toàn cõi Lĩnh Nam",
      "Tô Định hoảng sợ cắt tóc, cạo râu lẻn trốn về Nam Hải",
      "Trưng Trắc xưng vương, đóng đô tại Mê Linh, miễn thuế 2 năm cho dân chúng",
      "Mùng 6 tháng 2 Âm lịch là ngày lễ hội truyền thống; ngày 8/3 Dương lịch là mốc kỷ niệm cấp quốc gia"
    ],
    didYouKnow:
      "Bốn câu thề xuất quân vang vọng non sông: 'Một xin rửa sạch nước thù / Hai xin dựng lại nghiệp xưa họ Hùng / Ba kêu oan ức lòng chồng / Bốn xin vẹn vẹn sở công lênh này'.",
    visualTheme: "hai-ba-trung",
    sources: [
      "Đại Việt Sử ký Toàn thư",
      "Việt sử lược",
      "Bảo tàng Lịch sử Quốc gia"
    ]
  },
  {
    id: "hist-03-13-mo-man-dien-bien-phu-1954",
    solarDate: { month: 3, day: 13 },
    year: 1954,
    title: "Nổ súng mở màn Chiến dịch Điện Biên Phủ",
    summary:
      "Đúng 17 giờ 05 phút ngày 13/03/1954, pháo binh của quân đội ta đồng loạt gầm vang nã đạn vào trung tâm đề kháng Him Lam, mở màn chiến dịch Điện Biên Phủ lịch sử. Chỉ sau vài giờ chiến đấu ngoan cường, cụm cứ điểm bất khả xâm phạm Him Lam đã bị tiêu diệt hoàn toàn.",
    context:
      "Thực dân Pháp xây dựng Điện Biên Phủ thành tập đoàn cứ điểm quân sự khổng lồ gồm 49 cứ điểm với sân bay, xe tăng và pháo hạng nặng, tự tin tuyên bố đây là 'pháo đài bất khả chiến bại'.",
    significance:
      "Đòn giáng sấm sét làm rung chuyển toàn bộ tuyến phòng ngự của địch, mở thông cánh cửa thép để đại quân ta tiến vào lòng chảo Mường Thanh suốt 56 ngày đêm rực lửa.",
    figures: ["Đại tướng Võ Nguyên Giáp", "Anh hùng Phan Đình Giót", "Trung đoàn trưởng Nguyễn Hữu An"],
    location: "Cụm cứ điểm Him Lam, lòng chảo Điện Biên Phủ",
    keyFacts: [
      "Hơn 40 khẩu pháo 105mm và súng cối hạng nặng của ta đồng loạt phát hỏa",
      "Tiêu diệt trung tâm đề kháng Him Lam trong đêm 13/03",
      "Anh hùng Phan Đình Giót lấy thân mình lấp lỗ châu mai mở đường cho đồng đội xông lên"
    ],
    didYouKnow:
      "Chỉ huy trưởng phân khu Him Lam là Thiếu tá Paul Pégot tử trận ngay trong hầm chỉ huy từ những loạt đạn pháo đầu tiên của ta.",
    visualTheme: "dien-bien-phu",
    sources: [
      "Bảo tàng Chiến thắng Lịch sử Điện Biên Phủ",
      "Điện Biên Phủ - Điểm hẹn lịch sử (Đại tướng Võ Nguyên Giáp)",
      "Viện Lịch sử Quân sự Việt Nam"
    ]
  },
  {
    id: "hist-03-26-thanh-lap-doan-1931",
    solarDate: { month: 3, day: 26 },
    year: 1931,
    title: "Thành lập Đoàn Thanh niên Cộng sản Đông Dương",
    summary:
      "Tại Hội nghị Ban Chấp hành Trung ương Đảng lần thứ 2 họp tại Sài Gòn cuối tháng 3/1931, Trung ương Đảng đã dành riêng một ngày để thảo luận và quyết định thành lập tổ chức Đoàn Thanh niên Cộng sản Đông Dương (nay là Đoàn TNCS Hồ Chí Minh).",
    context:
      "Cao trào cách mạng 1930 - 1931 với đỉnh cao Xô Viết Nghệ Tĩnh bùng nổ, hàng vạn thanh niên đã hăng hái đứng lên xông pha nơi tiền tuyến.",
    significance:
      "Tập hợp thế hệ trẻ Việt Nam thành lực lượng xung kích kiên cường, cánh tay đắc lực và đội dự bị tin cậy của Đảng trong sự nghiệp đấu tranh giải phóng dân tộc.",
    figures: ["Đồng chí Trần Phú", "Anh hùng Lý Tự Trọng"],
    location: "Sài Gòn",
    keyFacts: [
      "Ra đời trong ngọn lửa cao trào Xô Viết Nghệ Tĩnh 1930 - 1931",
      "Đại hội Đoàn toàn quốc lần thứ 3 (1961) quyết định chọn ngày 26/03 làm ngày truyền thống",
      "Câu nói bất hủ của người đoàn viên đầu tiên Lý Tự Trọng: 'Con đường của thanh niên chỉ là con đường cách mạng, không thể có con đường nào khác'"
    ],
    didYouKnow:
      "Người đoàn viên TNCS đầu tiên ngã xuống trước mũi súng quân thù là Lý Tự Trọng, khi anh mới tròn 17 tuổi.",
    visualTheme: "khang-chien",
    sources: [
      "Trung ương Đoàn Thanh niên Cộng sản Hồ Chí Minh",
      "Bảo tàng Tuổi trẻ Việt Nam",
      "Văn kiện Đảng Toàn tập"
    ]
  },
  {
    id: "hist-03-29-giai-phong-da-nang-1975",
    solarDate: { month: 3, day: 29 },
    year: 1975,
    title: "Giải phóng thành phố Đà Nẵng",
    summary:
      "Sau khi giải phóng Huế, sáng ngày 29/03/1975, các cánh quân chủ lực của Quân đoàn 2 và Quân khu 5 thần tốc tiến công từ nhiều hướng, đánh chiếm căn cứ quân sự liên hợp Đà Nẵng, đập tan toàn bộ Quân đoàn 1 ngụy quyền Sài Gòn.",
    context:
      "Đà Nẵng là căn cứ quân sự liên hợp hiện đại bậc nhất miền Nam của Mỹ - ngụy, được xem là 'bất khả xâm phạm' án ngữ dải đất miền Trung.",
    significance:
      "Làm tan rã toàn bộ cụm phòng thủ chiến lược miền Trung, mở toang hành lang để đại quân ta thần tốc hành quân vào tham gia chiến dịch giải phóng Sài Gòn.",
    figures: ["Trung tướng Lê Trọng Tấn", "Đại tướng Chu Huy Mân"],
    location: "Thành phố Đà Nẵng, Bán đảo Sơn Trà",
    keyFacts: [
      "Giải phóng thành phố lớn thứ hai miền Nam chỉ sau 3 ngày tiến công",
      "Loại khỏi vòng chiến đấu hơn 10 vạn quân địch",
      "Thu giữ toàn bộ kho tàng, sân bay quân sự Đà Nẵng và cảng Tiên Sa nguyên vẹn"
    ],
    didYouKnow:
      "Đại tướng Võ Nguyên Giáp sau thắng lợi Đà Nẵng đã phát đi bức điện lịch sử chỉ đạo: 'Thần tốc, thần tốc hơn nữa; táo bạo, táo bạo hơn nữa; tranh thủ từng giờ, từng phút, xốc tới mặt trận, giải phóng miền Nam!'.",
    visualTheme: "thong-nhat-1975",
    sources: [
      "Bảo tàng Quân khu 5",
      "Bảo tàng Đà Nẵng",
      "Tổng kết cuộc Kháng chiến chống Mỹ cứu nước (Bộ Tổng Tham mưu)"
    ]
  },
  {
    id: "hist-04-09-dai-thang-bach-dang-1288",
    solarDate: { month: 4, day: 9 },
    lunarDate: { lunarMonth: 3, lunarDay: 8 },
    year: 1288,
    title: "Đại thắng Bạch Đằng - Đập tan thủy binh Nguyên Mông",
    summary:
      "Ngày 09/04/1288 (tức ngày 08 tháng 3 năm Mậu Tý), Quốc công Tiết chế Trần Hưng Đạo cùng quân dân Đại Việt đã làm nên chiến công hiển hách trên sông Bạch Đằng, chôn vùi toàn bộ đoàn thuyền chiến giặc Nguyên Mông, bắt sống tướng giặc Ô Mã Nhi và Phàn Tiếp.",
    context:
      "Quân xâm lược Nguyên Mông lần thứ ba kéo sang Đại Việt nhưng bị sa lầy; tướng giặc Thoát Hoan và Ô Mã Nhi buộc phải rút lui theo hai ngả thủy bộ.",
    significance:
      "Chiến thắng đỉnh cao đập tan hoàn toàn mộng xâm lược của đế chế Mông - Nguyên hùng mạnh nhất thế giới thời bấy giờ, bảo vệ vững chắc nền độc lập non sông muôn đời.",
    figures: ["Hưng Đạo Đại vương Trần Quốc Tuấn", "Vua Trần Nhân Tông", "Tướng quân Trần Khánh Dư"],
    location: "Sông Bạch Đằng (Quảng Ninh - Hải Phòng)",
    keyFacts: [
      "Lợi dụng con nước triều rút để bãi cọc gỗ lim đâm chìm toàn bộ thuyền giặc",
      "Bắt sống các đại tướng chỉ huy sừng sỏ Ô Mã Nhi, Phàn Tiếp",
      "Kết thúc thắng lợi vẻ vang ba lần kháng chiến chống quân Nguyên Mông",
      "Chiến thắng diễn ra ngày 08/03 Âm lịch (tức 09/04/1288 Dương lịch), cũng là ngày Lễ hội truyền thống Bạch Đằng hàng năm"
    ],
    didYouKnow:
      "Bãi cọc Bạch Đằng tại di tích Yên Giang (Quảng Ninh) với những thân cây gỗ lim vót nhọn cắm sâu dưới lòng phù sa suốt hơn 700 năm là minh chứng lịch sử bất hủ cho thiên tài quân sự Việt Nam.",
    visualTheme: "bach-dang",
    sources: [
      "Đại Việt Sử ký Toàn thư",
      "Khu di tích Quốc gia đặc biệt Bạch Đằng",
      "Bảo tàng Lịch sử Quốc gia"
    ]
  },
  {
    id: "hist-04-21-xuan-loc-1975",
    solarDate: { month: 4, day: 21 },
    year: 1975,
    title: "Chiến thắng Xuân Lộc - Đập tan 'Cánh cửa thép' bảo vệ Sài Gòn",
    summary:
      "Sau 12 ngày đêm tiến công dũng mãnh và ngoan cường (09/04 - 21/04/1975), Quân đoàn 4 cùng lực lượng vũ trang địa phương đã đập tan phòng tuyến Xuân Lộc (Long Khánh) - tuyến phòng ngự kiên cố cuối cùng bảo vệ Sài Gòn của quân ngụy.",
    context:
      "Xuân Lộc được ngụy quyền Sài Gòn ví như 'Cánh cửa thép' và quyết định 'tử thủ đến cùng' để ngăn chặn đại quân ta tiến vào Sài Gòn.",
    significance:
      "Xóa sổ hoàn toàn tuyến phòng ngự từ xa then chốt nhất của địch, làm sụp đổ hoàn toàn tinh thần của ngụy quyền Sài Gòn, Nguyễn Văn Thiệu buộc phải tuyên bố từ chức tổng thống.",
    figures: ["Thiếu tướng Hoàng Cầm", "Đại tá Bùi Gia Tuệ"],
    location: "Thị xã Xuân Lộc, tỉnh Long Khánh (nay thuộc tỉnh Đồng Nai)",
    keyFacts: [
      "Chiến sự ác liệt kéo dài 12 ngày đêm",
      "Địch sử dụng cả bom ngạt CBU-55 có sức hủy diệt khủng khiếp",
      "Mở toang cửa ngõ phía Đông Bắc để 5 cánh quân tiến vào Sài Gòn"
    ],
    didYouKnow:
      "Chiến thắng Xuân Lộc diễn ra ác liệt đến mức báo chí phương Tây thời điểm đó gọi đây là 'trận Verdun của miền Nam Việt Nam'.",
    visualTheme: "thong-nhat-1975",
    sources: [
      "Bảo tàng Quân đoàn 4",
      "Bảo tàng Chiến dịch Hồ Chí Minh",
      "Viện Lịch sử Quân sự Việt Nam"
    ]
  },
  {
    id: "hist-04-26-mo-man-cd-ho-chi-minh-1975",
    solarDate: { month: 4, day: 26 },
    year: 1975,
    title: "Mở màn Chiến dịch Hồ Chí Minh lịch sử",
    summary:
      "Đúng 17 giờ ngày 26/04/1975, tiếng súng tiến công của 5 cánh quân khổng lồ với sức mạnh áp đảo từ các hướng đồng loạt phát hỏa dữ dội vào các tuyến phòng thủ của địch, chính thức mở màn Chiến dịch Hồ Chí Minh lịch sử.",
    context:
      "Bộ Chính trị Trung ương Đảng quyết định lấy tên Chủ tịch Hồ Chí Minh đặt cho chiến dịch giải phóng Sài Gòn - Gia Định với mục tiêu giải phóng hoàn toàn miền Nam trước mùa mưa.",
    significance:
      "Chiến dịch quyết chiến chiến lược lớn nhất trong lịch sử quân sự cách mạng Việt Nam, mở đầu đòn sấm sét quyết định kết thúc cuộc kháng chiến chống Mỹ.",
    figures: ["Đại tướng Văn Tiến Dũng", "Đồng chí Phạm Hùng", "Thượng tướng Trần Văn Trà"],
    location: "Chiến trường Sài Gòn - Gia Định",
    keyFacts: [
      "Tập trung 5 cánh quân gồm các quân đoàn 1, 2, 3, 4 và Đoàn 232",
      "Quy mô lực lượng tham gia chiến dịch hơn 25 vạn quân chủ lực",
      "Hơn 1.000 khẩu pháo các loại và hàng trăm xe tăng, xe bọc thép xung trận"
    ],
    didYouKnow:
      "Bức điện mật ngày 14/04/1975 của Ban Bí thư thông báo ý kiến Bộ Chính trị: 'Đồng ý chiến dịch giải phóng Sài Gòn - Gia Định lấy tên là Chiến dịch Hồ Chí Minh'.",
    visualTheme: "thong-nhat-1975",
    sources: [
      "Bảo tàng Chiến dịch Hồ Chí Minh",
      "Đại thắng Mùa xuân 1975 (Đại tướng Văn Tiến Dũng)",
      "Bảo tàng Lịch sử Quân sự Việt Nam"
    ]
  },
  {
    id: "hist-04-30-giai-phong-mien-nam-1975",
    solarDate: { month: 4, day: 30 },
    year: 1975,
    title: "Giải phóng hoàn toàn miền Nam, Thống nhất non sông",
    summary:
      "Đúng 11 giờ 30 phút ngày 30/04/1975, chiếc xe tăng mang số hiệu 390 và 843 thuộc Lữ đoàn xe tăng 203 húc đổ cổng sắt Dinh Độc Lập; Trung úy Bùi Quang Thận cắm lá cờ giải phóng trên nóc Dinh. Tổng thống ngụy quyền Dương Văn Minh tuyên bố đầu hàng vô điều kiện.",
    context:
      "Chiến dịch Hồ Chí Minh lịch sử toàn thắng sau 4 ngày đêm tiến công thần tốc và dũng mãnh của 5 cánh quân hợp điểm tại trung tâm Sài Gòn.",
    significance:
      "Mốc son chói lọi kết thúc vẻ vang 30 năm chiến tranh giải phóng dân tộc và bảo vệ Tổ quốc, chấm dứt hoàn toàn ách thống trị của chủ nghĩa đế quốc, giang sơn thu về một mối.",
    figures: ["Đại úy Vũ Đăng Toàn", "Trung úy Bùi Quang Thận", "Đại đội trưởng Bùi Đức Mai"],
    location: "Dinh Độc Lập, Sài Gòn (nay là Dinh Thống Nhất, TP. Hồ Chí Minh)",
    keyFacts: [
      "11h30 trưa ngày 30/4/1975: Cờ Mặt trận Dân tộc Giải phóng tung bay trên nóc Dinh Độc Lập",
      "Xe tăng 390 (Bảo vật Quốc gia) húc đổ cổng chính Dinh Độc Lập",
      "Sài Gòn được giải phóng gần như nguyên vẹn cơ sở hạ tầng"
    ],
    didYouKnow:
      "Lá cờ cắm trên nóc Dinh Độc Lập lúc 11h30 do Trung úy Bùi Quang Thận mang từ nóc tháp pháo xe tăng 843 chạy thẳng lên tầng cao nhất của Dinh.",
    visualTheme: "thong-nhat-1975",
    sources: [
      "Bảo tàng Lịch sử Quốc gia",
      "Bảo tàng Chiến dịch Hồ Chí Minh",
      "Hồ sơ Bảo vật Quốc gia Xe tăng T-54B số hiệu 390"
    ]
  },
  {
    id: "hist-05-07-chien-thang-dien-bien-phu-1954",
    solarDate: { month: 5, day: 7 },
    year: 1954,
    title: "Chiến thắng lịch sử Điện Biên Phủ 'Lừng lẫy năm châu'",
    summary:
      "17 giờ 30 phút ngày 07/05/1954, lá cờ Quyết chiến Quyết thắng của quân đội ta tung bay ngạo nghễ trên nóc hầm chỉ huy tướng De Castries; toàn bộ ban chỉ huy tập đoàn cứ điểm Điện Biên Phủ bị bắt sống. Chiến dịch lịch sử toàn thắng sau 56 ngày đêm chiến đấu ngoan cường.",
    context:
      "Tập đoàn cứ điểm Điện Biên Phủ gồm 16.200 quân tinh nhuệ Pháp với pháo binh và không quân yểm trợ bị tiêu diệt và bắt sống hoàn toàn.",
    significance:
      "Chiến thắng 'lừng lẫy năm châu, chấn động địa cầu', đập tan ý chí xâm lược của thực dân Pháp, buộc Pháp ký Hiệp định Genève công nhận nền độc lập, chủ quyền của Việt Nam.",
    figures: ["Đại tướng Võ Nguyên Giáp", "Anh hùng Bế Văn Đàn", "Anh hùng Tô Vĩnh Diện"],
    location: "Lòng chảo Mường Thanh, Điện Biên Phủ",
    keyFacts: [
      "Tiêu diệt và bắt sống toàn bộ 16.200 tên địch",
      "Bắt sống tướng De Castries và toàn bộ Bộ chỉ huy tập đoàn cứ điểm",
      "56 ngày đêm 'khoét núi, ngủ hầm, mưa dầm, cơm vắt, máu trộn bùn non'"
    ],
    didYouKnow:
      "Quyết định chuyển từ phương châm tác chiến 'Đánh nhanh, thắng nhanh' sang 'Đánh chắc, tiến chắc' của Đại tướng Tổng tư lệnh Võ Nguyên Giáp được xem là quyết định khó khăn nhất trong cuộc đời chỉ huy của ông nhưng mang lại thắng lợi trọn vẹn.",
    visualTheme: "dien-bien-phu",
    sources: [
      "Bảo tàng Chiến thắng Lịch sử Điện Biên Phủ",
      "Viện Lịch sử Quân sự Việt Nam",
      "Bảo tàng Lịch sử Quốc gia"
    ]
  },
  {
    id: "hist-05-19-sinh-nhat-bac-ho-1890",
    solarDate: { month: 5, day: 19 },
    year: 1890,
    title: "Ngày sinh Chủ tịch Hồ Chí Minh vĩ đại",
    summary:
      "Ngày 19/05/1890, tại làng Hoàng Trù (quê ngoại) và làng Kim Liên (quê nội), xã Kim Liên, huyện Nam Đàn, tỉnh Nghệ An, cậu bé Nguyễn Sinh Cung (Chủ tịch Hồ Chí Minh) đã cất tiếng khóc chào đời. Người là vị lãnh tụ thiên tài, người thầy vĩ đại của cách mạng Việt Nam, Anh hùng giải phóng dân tộc và Danh nhân văn hóa kiệt xuất thế giới.",
    context:
      "Dưới ách thống trị hà khắc của thực dân Pháp, các phong trào yêu nước liên tiếp bị dìm trong biển máu; dân tộc chìm trong đêm dài nô lệ.",
    significance:
      "Khởi nguồn của mọi thắng lợi vĩ đại của cách mạng Việt Nam; Người để lại cho non sông đất nước một di sản tư tưởng và tấm gương đạo đức sáng ngời ngàn năm.",
    figures: ["Chủ tịch Hồ Chí Minh (Nguyễn Sinh Cung, Nguyễn Tất Thành, Nguyễn Ái Quốc)", "Cụ Phó bảng Nguyễn Sinh Sắc", "Bà Hoàng Thị Loan"],
    location: "Làng Kim Liên, Nam Đàn, Nghệ An",
    keyFacts: [
      "Sinh ngày 19/05/1890 tại làng Sen quê cha và làng Hoàng Trù quê mẹ",
      "UNESCO ra Nghị quyết tôn vinh là 'Anh hùng giải phóng dân tộc, Danh nhân văn hóa kiệt xuất' (1987)",
      "Cả cuộc đời Người tận tụy hy sinh vì độc lập của Tổ quốc, hạnh phúc của nhân dân"
    ],
    didYouKnow:
      "Lần đầu tiên ngày sinh của Bác được công khai tổ chức kỷ niệm là ngày 19/05/1946 tại Bắc Bộ Phủ; khi đó Người đáp lại tình cảm của quốc dân đồng bào: 'Tôi xin cảm tạ tấm lòng của anh chị em. Tôi chưa có công lao gì đối với Tổ quốc...'",
    visualTheme: "bac-ho-cuu-nuoc",
    sources: [
      "Khu di tích Kim Liên, Nam Đàn, Nghệ An",
      "Khu di tích Phủ Chủ tịch",
      "Bảo tàng Hồ Chí Minh"
    ]
  },
  {
    id: "hist-05-19-doan-559-truong-son-1959",
    solarDate: { month: 5, day: 19 },
    year: 1959,
    title: "Thành lập Đoàn 559 mở Đường Trường Sơn huyền thoại",
    summary:
      "Ngày 19/05/1959, Thường trực Tổng Quân ủy Trung ương họp quyết định thành lập 'Đoàn công tác quân sự đặc biệt' (Đoàn 559) có nhiệm vụ soi đường, mở lối tiếp viện nhân lực, vũ khí cho chiến trường miền Nam. Tuyến đường huyết mạch này vinh dự mang tên Chủ tịch Hồ Chí Minh kính yêu.",
    context:
      "Thực hiện Nghị quyết 15 của Trung ương Đảng về chuyển hướng phong trào cách mạng miền Nam kết hợp đấu tranh chính trị với đấu tranh vũ trang.",
    significance:
      "Tuyến chi viện chiến lược vĩ đại dài gần 20.000km, 'con đường huyền thoại' quyết định trực tiếp thắng lợi của cuộc kháng chiến chống Mỹ cứu nước.",
    figures: ["Thượng tướng Võ Bẩm", "Trung tướng Đồng Sỹ Nguyên"],
    location: "Dãy núi Trường Sơn hùng vĩ",
    keyFacts: [
      "Khởi đầu với khẩu hiệu: 'Đi không dấu, nấu không khói, nói không tiếng'",
      "Hệ thống gần 20.000km đường xe cơ giới, 5 trục dọc và 21 trục ngang",
      "Vận chuyển hơn 1 triệu tấn vũ khí, hàng hóa và hàng triệu lượt cán bộ, chiến sĩ"
    ],
    didYouKnow:
      "Đế quốc Mỹ đã trút xuống Đường Trường Sơn hơn 3 triệu tấn bom đạn (gấp hơn 3 lần số bom đạn ném xuống nước Đức trong Thế chiến II), nhưng con đường vẫn đứng vững, thông suốt.",
    visualTheme: "khang-chien",
    sources: [
      "Bảo tàng Đường Hồ Chí Minh",
      "Binh đoàn 12 (Tổng công ty Xây dựng Trường Sơn)",
      "Viện Lịch sử Quân sự Việt Nam"
    ]
  },
  {
    id: "hist-06-05-bac-ho-ra-di-tim-duong-1911",
    solarDate: { month: 6, day: 5 },
    year: 1911,
    title: "Nguyễn Tất Thành rời Bến Nhà Rồng ra đi tìm đường cứu nước",
    summary:
      "Ngày 05/06/1911, tại Bến cảng Nhà Rồng (Sài Gòn), người thanh niên yêu nước Nguyễn Tất Thành (lấy tên là Văn Ba) đã bước lên con tàu Amiral Latouche-Tréville làm phụ bếp, rời Tổ quốc ra đi tìm con đường cứu nước giải phóng dân tộc.",
    context:
      "Đất nước chìm trong ách nô lệ; các bậc tiền bối như Phan Bội Châu, Phan Châu Trinh, Hoàng Hoa Thám đều lần lượt thất bại.",
    significance:
      "Sự kiện có ý nghĩa bước ngoặt lịch sử dân tộc, khởi đầu hành trình 30 năm bôn ba qua 3 đại dương, 4 châu lục để tìm ra chân lý cách mạng vô sản của thời đại.",
    figures: ["Chàng thanh niên yêu nước Nguyễn Tất Thành (Văn Ba)"],
    location: "Bến Nhà Rồng, Sài Gòn (nay là Bảo tàng Hồ Chí Minh, TP. Hồ Chí Minh)",
    keyFacts: [
      "Rời Tổ quốc với hai bàn tay trắng và một trái tim yêu nước nồng nàn",
      "Hành trình kéo dài suốt 30 năm (1911 - 1941) qua gần 30 quốc gia",
      "Đến với 'Sơ thảo lần thứ nhất những luận cương về vấn đề dân tộc và vấn đề thuộc địa' của Lênin năm 1920"
    ],
    didYouKnow:
      "Khi được người bạn hỏi: 'Tiền đâu mà đi?', Nguyễn Tất Thành giơ hai bàn tay lên và trả lời: 'Đây, tiền đây! Chúng ta sẽ làm bất cứ việc gì để sống và để đi'.",
    visualTheme: "bac-ho-cuu-nuoc",
    sources: [
      "Bảo tàng Hồ Chí Minh - Chi nhánh TP. Hồ Chí Minh",
      "Bảo tàng Lịch sử Quốc gia",
      "Tiểu sử Chủ tịch Hồ Chí Minh"
    ]
  },
  {
    id: "hist-06-21-bao-thanh-nien-1925",
    solarDate: { month: 6, day: 21 },
    year: 1925,
    title: "Báo 'Thanh Niên' xuất bản số đầu tiên - Ngày Báo chí Cách mạng",
    summary:
      "Ngày 21/06/1925, tại Quảng Châu (Trung Quốc), tờ báo 'Thanh Niên' - cơ quan ngôn luận của Hội Việt Nam Cách mạng Thanh niên do lãnh tụ Nguyễn Ái Quốc sáng lập - xuất bản số đầu tiên, đặt nền móng cho nền Báo chí Cách mạng Việt Nam.",
    context:
      "Lãnh tụ Nguyễn Ái Quốc chuẩn bị về mặt chính trị, tư tưởng và tổ chức cho sự ra đời của chính đảng vô sản ở Việt Nam.",
    significance:
      "Tiếng kèn xung trận truyền bá chủ nghĩa Mác - Lênin và chủ nghĩa yêu nước vào quần chúng công nông, khơi dậy tinh thần phản kháng dân tộc.",
    figures: ["Lãnh tụ Nguyễn Ái Quốc", "Đồng chí Hồ Tùng Mậu", "Đồng chí Lê Hồng Sơn"],
    location: "Quảng Châu, Trung Quốc",
    keyFacts: [
      "Báo Thanh Niên xuất bản hơn 200 số từ năm 1925 đến 1930",
      "In bằng mực tím trên giấy sáp, viết tay bằng chữ quốc ngữ",
      "Ban Bí thư Trung ương Đảng quyết định lấy ngày 21/06 làm Ngày Báo chí Cách mạng Việt Nam"
    ],
    didYouKnow:
      "Bác Hồ vừa là người sáng lập, vừa trực tiếp chỉ đạo, viết bài xã luận, vẽ tranh minh họa và tổ chức đường dây bí mật chuyển báo về nước.",
    visualTheme: "bac-ho-cuu-nuoc",
    sources: [
      "Bảo tàng Báo chí Việt Nam",
      "Hội Nhà báo Việt Nam",
      "Bảo tàng Hồ Chí Minh"
    ]
  },
  {
    id: "hist-07-27-thuong-binh-liet-si-1947",
    solarDate: { month: 7, day: 27 },
    year: 1947,
    title: "Ngày Thương binh - Liệt sĩ đầu tiên của dân tộc",
    summary:
      "Chiều ngày 27/07/1947, tại xóm Bàn Cờ, xã Hùng Sơn, huyện Đại Từ, tỉnh Thái Nguyên, khoảng 300 cán bộ, bộ đội và nhân dân địa phương đã tổ chức cuộc mít tinh công bố bức thư của Chủ tịch Hồ Chí Minh chính thức lấy ngày 27/07 làm 'Ngày Thương binh toàn quốc'.",
    context:
      "Cuộc kháng chiến toàn quốc bùng nổ, hàng vạn chiến sĩ và đồng bào đã anh dũng hy sinh hoặc để lại một phần xương máu ngoài chiến trường bảo vệ nền độc lập.",
    significance:
      "Biểu tượng sáng ngời của truyền thống đạo lý 'Uống nước nhớ nguồn', 'Đền ơn đáp nghĩa' thiêng liêng của toàn Đảng, toàn quân và toàn dân tộc Việt Nam.",
    figures: ["Chủ tịch Hồ Chí Minh", "Bác sĩ Vũ Đình Tụng"],
    location: "Xã Hùng Sơn, huyện Đại Từ, tỉnh Thái Nguyên",
    keyFacts: [
      "Bác Hồ đã gửi chiếc áo lụa và một tháng lương của Người ủng hộ thương binh",
      "Bức thư bất hủ của Bác: 'Thương binh là những người đã hy sinh gia đình, hy sinh xương máu để bảo vệ Tổ quốc, bảo vệ đồng bào...'",
      "Được công nhận là Di tích Lịch sử Quốc gia đặc biệt năm 2017"
    ],
    didYouKnow:
      "Ban đầu ngày này có tên là 'Ngày Thương binh toàn quốc', đến năm 1955 sau chiến thắng Điện Biên Phủ được đổi thành 'Ngày Thương binh - Liệt sĩ'.",
    visualTheme: "khang-chien",
    sources: [
      "Bộ Lao động - Thương binh và Xã hội",
      "Khu di tích Lịch sử Quốc gia 27/7 Đại Từ, Thái Nguyên",
      "Bảo tàng Lịch sử Quốc gia"
    ]
  },
  {
    id: "hist-08-05-tran-dau-danh-thang-1964",
    solarDate: { month: 8, day: 5 },
    year: 1964,
    title: "Trận đầu đánh thắng không quân Mỹ của Hải quân nhân dân Việt Nam",
    summary:
      "Ngày 05/08/1964, đế quốc Mỹ mở chiến dịch 'Mũi Tên Xuyên' sử dụng 64 lượt máy bay phản lực ồ ạt ném bom nhiều mục tiêu ven biển miền Bắc; Hải quân nhân dân Việt Nam cùng bộ đội phòng không đã anh dũng đánh trả, bắn rơi 8 máy bay Mỹ và bắt sống viên phi công đầu tiên.",
    context:
      "Sau 'Sự kiện Vịnh Bắc Bộ' do chính quyền Mỹ dựng lên để lấy cớ leo thang chiến tranh phá hoại miền Bắc nước ta.",
    significance:
      "Trận đầu đánh thắng vang dội, đập tan huyền thoại 'sức mạnh không lực Hoa Kỳ', mở đầu trang sử chiến đấu vẻ vang của Hải quân nhân dân Việt Nam.",
    figures: ["Anh hùng Đặng Đình Long", "Thuyền trưởng Nguyễn Văn Giản"],
    location: "Vùng biển Bến Thủy (Vinh), Lạch Trường (Thanh Hóa), Bãi Cháy (Quảng Ninh)",
    keyFacts: [
      "Bắn rơi 8 máy bay phản lực hiện đại của Mỹ",
      "Bắt sống Trung úy phi công Everett Alvarez Jr. lái chiếc A-4 Skyhawk",
      "Ngày 05/08 trở thành ngày truyền thống đánh thắng trận đầu của Hải quân Việt Nam"
    ],
    didYouKnow:
      "Viên phi công Mỹ đầu tiên bị bắt sống Everett Alvarez Jr. bị giam giữ tại nhà tù Hỏa Lò hơn 8 năm cho đến khi Hiệp định Paris được ký kết năm 1973.",
    visualTheme: "khang-chien",
    sources: [
      "Bảo tàng Hải quân nhân dân Việt Nam",
      "Bảo tàng Phòng không - Không quân",
      "Viện Lịch sử Quân sự Việt Nam"
    ]
  },
  {
    id: "hist-08-19-khoi-nghia-ha-noi-1945",
    solarDate: { month: 8, day: 19 },
    year: 1945,
    title: "Tổng khởi nghĩa giành chính quyền thắng lợi tại Hà Nội",
    summary:
      "Ngày 19/08/1945, hàng vạn người dân Hà Nội giương cao cờ đỏ sao vàng đã tổ chức mít tinh khổng lồ tại Quảng trường Nhà hát Lớn, sau đó biến thành cuộc tuần hành vũ trang đánh chiếm Phủ Khâm sai Bắc Bộ, Trại lính Bảo an, Tòa Thị chính, giành trọn vẹn chính quyền về tay nhân dân.",
    context:
      "Phát xít Nhật đầu hàng Đồng minh vô điều kiện; lệnh Tổng khởi nghĩa của Ủy ban Khởi nghĩa toàn quốc phát đi như lời hiệu triệu non sông.",
    significance:
      "Thắng lợi quyết định tại trung tâm đầu não Hà Nội đã tạo hiệu ứng dây chuyền thần tốc cổ vũ nhân dân cả nước nổi dậy giành toàn thắng trong Cách mạng Tháng Tám.",
    figures: ["Đồng chí Nguyễn Khang", "Đồng chí Trần Tử Bình", "Đồng chí Nguyễn Quyết"],
    location: "Quảng trường Nhà hát Lớn, Phủ Khâm sai (Bắc Bộ Phủ), Hà Nội",
    keyFacts: [
      "Hơn 10 vạn quần chúng nhân dân tham gia tuần hành vũ trang",
      "Giành trọn vẹn chính quyền chỉ trong một ngày mà không đổ máu lớn",
      "Được chọn làm ngày truyền thống của lực lượng Công an nhân dân Việt Nam"
    ],
    didYouKnow:
      "Bài hát 'Tiến quân ca' của nhạc sĩ Văn Cao đã lần đầu tiên được hàng vạn quần chúng nhân dân đồng thanh hát vang rợp trời tại Quảng trường Nhà hát Lớn trong buổi sáng lịch sử này.",
    visualTheme: "ba-dinh-1945",
    sources: [
      "Bảo tàng Lịch sử Quốc gia",
      "Viện Lịch sử Đảng",
      "Hà Nội 60 năm Cách mạng Tháng Tám (NXB Hà Nội)"
    ]
  },
  {
    id: "hist-08-25-khoi-nghia-sai-gon-1945",
    solarDate: { month: 8, day: 25 },
    year: 1945,
    title: "Tổng khởi nghĩa giành chính quyền thắng lợi tại Sài Gòn",
    summary:
      "Sáng ngày 25/08/1945, hơn 1 triệu đồng bào Sài Gòn - Chợ Lớn và các tỉnh lân cận đã rầm rộ xuống đường biểu tình thị uy, đánh chiếm các cơ quan đầu não của ngụy quyền thân Nhật, giành chính quyền về tay Ủy ban Hành chính lâm thời Nam Bộ.",
    context:
      "Tiếp nối thắng lợi rực rỡ của cuộc khởi nghĩa tại Hà Nội (19/8) và Cố đô Huế (23/8).",
    significance:
      "Khẳng định sự nhất tề nổi dậy của toàn thể nhân dân miền Nam, hoàn thành cuộc Tổng khởi nghĩa tại ba trung tâm đầu não của cả nước.",
    figures: ["Đồng chí Trần Văn Giàu", "Đồng chí Huỳnh Tấn Phát", "Nhà báo Nguyễn Văn Nguyễn"],
    location: "Đại lộ Bonard (Lê Lợi), Dinh Thống đốc Nam Kỳ, Sài Gòn",
    keyFacts: [
      "Hơn 1 triệu người dân miền Nam biểu tình với cờ đỏ sao vàng rợp trời",
      "Lực lượng Thanh niên Tiền phong đóng vai trò nòng cốt xung kích",
      "Toàn bộ chính quyền Sài Gòn - Gia Định về tay nhân dân trong êm đẹp"
    ],
    didYouKnow:
      "Đồng chí Trần Văn Giàu thay mặt Ủy ban Khởi nghĩa Nam Bộ đã đọc diễn văn tuyên bố chính quyền về tay nhân dân trong tiếng reo hò dậy sóng của hàng triệu đồng bào.",
    visualTheme: "thong-nhat-1975",
    sources: [
      "Bảo tàng TP. Hồ Chí Minh",
      "Lịch sử Nam Bộ Kháng chiến (Hội đồng Chỉ đạo biên soạn)",
      "Viện Lịch sử Đảng"
    ]
  },
  {
    id: "hist-08-30-bao-dai-thoai-vi-1945",
    solarDate: { month: 8, day: 30 },
    year: 1945,
    title: "Lễ thoái vị của Vua Bảo Đại - Chấm dứt chế độ phong kiến",
    summary:
      "Chiều ngày 30/08/1945, tại cửa Ngọ Môn (Cố đô Huế), trước sự chứng kiến của 5 vạn đồng bào, Vua Bảo Đại đã đọc Chiếu thoái vị và trao lại ấn vàng, kiếm ngọc cho đại diện Chính phủ Cách mạng lâm thời, chính thức chấm dứt chế độ phong kiến tồn tại hàng nghìn năm ở Việt Nam.",
    context:
      "Cuộc khởi nghĩa giành chính quyền tại Thừa Thiên Huế toàn thắng vào ngày 23/08/1945.",
    significance:
      "Sự kiện có ý nghĩa biểu tượng lịch sử to lớn, khép lại hoàn toàn vương triều nhà Nguyễn và chế độ quân chủ chuyên chế, mở đường cho thể chế Dân chủ Cộng hòa.",
    figures: ["Vua Bảo Đại (Nguyễn Phúc Vĩnh Thụy)", "Đồng chí Trần Huy Liệu", "Đồng chí Cù Huy Cận"],
    location: "Lầu Ngọ Môn, Kinh thành Huế",
    keyFacts: [
      "Vua Bảo Đại trao quốc bảo: Kim ấn 'Hoàng đế chi bảo' và thanh bảo kiếm nạm ngọc",
      "Tuyên bố câu nói nổi tiếng: 'Trẫm thà làm dân một nước độc lập, hơn làm vua một nước nô lệ'",
      "Cờ đỏ sao vàng được kéo lên đỉnh cột cờ Kỳ Đài Huế thay thế cờ quẻ ly triều đình"
    ],
    didYouKnow:
      "Thanh bảo kiếm nạm ngọc khi được Vua Bảo Đại rút ra khỏi vỏ nạm ngọc đã tỏa ánh hào quang sáng lòa, sau đó Người kính cẩn trao lại cho phái đoàn cách mạng.",
    visualTheme: "ba-dinh-1945",
    sources: [
      "Trung tâm Bảo tồn Di tích Cố đô Huế",
      "Bảo tàng Lịch sử Quốc gia",
      "Hồi ký 'Con rồng Việt Nam' (Bảo Đại)"
    ]
  },
  {
    id: "hist-09-02-tuyen-ngon-doc-lap-1945",
    solarDate: { month: 9, day: 2 },
    year: 1945,
    title: "Chủ tịch Hồ Chí Minh đọc bản Tuyên ngôn Độc lập",
    summary:
      "Đúng 14 giờ ngày 02/09/1945, tại Quảng trường Ba Đình (Hà Nội), trước hơn 50 vạn đồng bào, Chủ tịch Hồ Chí Minh thay mặt Chính phủ Cách mạng lâm thời trang nghiêm đọc bản Tuyên ngôn Độc lập lịch sử, khai sinh ra nước Việt Nam Dân chủ Cộng hòa.",
    context:
      "Cuộc Cách mạng Tháng Tám toàn thắng oanh liệt trên toàn quốc, đập tan xiềng xích thực dân gần một thế kỷ và chế độ phong kiến nghìn năm.",
    significance:
      "Văn kiện lập quốc vĩ đại mở ra kỷ nguyên mới của dân tộc Việt Nam: kỷ nguyên độc lập tự do gắn liền với chủ nghĩa xã hội; nhân dân ta từ thân phận nô lệ trở thành người làm chủ đất nước.",
    figures: ["Chủ tịch Hồ Chí Minh", "Các thành viên Chính phủ Cách mạng lâm thời"],
    location: "Quảng trường Ba Đình, Hà Nội",
    keyFacts: [
      "Hơn 50 vạn nhân dân thủ đô và các vùng lân cận dự lễ độc lập",
      "Mở đầu bằng chân lý bất hủ trích từ Tuyên ngôn Độc lập Mỹ (1776) và Tuyên ngôn Nhân quyền Pháp (1789)",
      "Tuyên bố đanh thép: 'Nước Việt Nam có quyền hưởng tự do và độc lập, và sự thật đã thành một nước tự do, độc lập'"
    ],
    didYouKnow:
      "Khi đang đọc dở bản Tuyên ngôn, Bác bất ngờ dừng lại và ân cần hỏi đồng bào: 'Tôi nói đồng bào nghe rõ không?'. Hàng chục vạn người đã đồng thanh hô vang như sấm dậy: 'Rõ!', tạo nên khoảnh khắc xúc động thiêng liêng nhất lịch sử dân tộc.",
    visualTheme: "ba-dinh-1945",
    sources: [
      "Bảo tàng Lịch sử Quốc gia",
      "Khu di tích Chủ tịch Hồ Chí Minh tại Phủ Chủ tịch",
      "Hồ Chí Minh Toàn tập (Tập 4)"
    ]
  },
  {
    id: "hist-09-02-chu-tich-ho-chi-minh-qua-doi-1969",
    solarDate: { month: 9, day: 2 },
    year: 1969,
    title: "Ngày Chủ tịch Hồ Chí Minh đi vào cõi vĩnh hằng và Di chúc thiêng liêng",
    summary:
      "Hồi 9 giờ 47 phút ngày 02/09/1969, trái tim lớn của Chủ tịch Hồ Chí Minh đã ngừng đập ở tuổi 79. Người ra đi để lại muôn vàn tình thân yêu cho toàn dân, toàn Đảng, toàn quân và bản Di chúc lịch sử vô giá soi đường cho sự nghiệp giải phóng miền Nam, thống nhất đất nước.",
    context:
      "Cuộc kháng chiến chống Mỹ cứu nước đang bước vào giai đoạn quyết liệt; đồng bào cả nước hướng về Thủ đô Hà Nội trong niềm tiếc thương vô hạn.",
    significance:
      "Bản Di chúc thiêng liêng kết tinh tư tưởng, đạo đức, phong cách Hồ Chí Minh, trở thành ngọn cờ dẫn dắt cách mạng Việt Nam đi từ thắng lợi này đến thắng lợi khác.",
    figures: ["Chủ tịch Hồ Chí Minh", "Các đồng chí lãnh đạo Đảng và Nhà nước"],
    location: "Nhà 67, Khu di tích Phủ Chủ tịch, Hà Nội",
    keyFacts: [
      "Bác trút hơi thở cuối cùng lúc 9h47 ngày 02/09/1969",
      "Bản Di chúc được Người khởi thảo từ tháng 5/1965 và sửa chữa, hoàn thiện qua từng năm",
      "Lời căn dặn bất hủ: 'Điều mong muốn cuối cùng của tôi là: Toàn Đảng, toàn dân ta đoàn kết phấn đấu, xây dựng một nước Việt Nam hòa bình, thống nhất, độc lập, dân chủ và giàu mạnh'"
    ],
    didYouKnow:
      "Để tránh trùng vào ngày Tết Độc lập thiêng liêng của toàn dân tộc và tổ chức Quốc tang trang nghiêm nhất, thời điểm năm 1969 Trung ương đã công bố ngày Bác mất là 03/09; sau này Bộ Chính trị đã công bố chính xác lại là ngày 02/09 theo đúng thực tế lịch sử.",
    visualTheme: "ba-dinh-1945",
    sources: [
      "Khu di tích Chủ tịch Hồ Chí Minh tại Phủ Chủ tịch",
      "Bảo tàng Hồ Chí Minh",
      "Bảo vật Quốc gia Di chúc Chủ tịch Hồ Chí Minh"
    ]
  },
  {
    id: "hist-09-12-xo-viet-nghe-tinh-1930",
    solarDate: { month: 9, day: 12 },
    year: 1930,
    title: "Đỉnh cao phong trào Xô Viết Nghệ Tĩnh",
    summary:
      "Ngày 12/09/1930, khoảng 8.000 nông dân huyện Hưng Nguyên (Nghệ An) giương cao cờ đỏ búa liềm tuần hành thị uy tiến về thành phố Vinh. Thực dân Pháp cho máy bay ném bom xả đạn tàn bạo vào đoàn biểu tình nhưng ngọn lửa đấu tranh không hề tắt, chính quyền Xô Viết nông dân đầu tiên được thành lập.",
    context:
      "Phong trào cách mạng bùng nổ mạnh mẽ ngay sau khi Đảng Cộng sản Việt Nam ra đời, dưới sự áp bức bóc lột cùng cực của đế quốc phong kiến.",
    significance:
      "Cuộc diễn tập đầu tiên của quần chúng nhân dân dưới sự lãnh đạo của Đảng, khẳng định khối liên minh công nông kiên cường chuẩn bị cho thắng lợi Cách mạng Tháng Tám.",
    figures: ["Đồng chí Lê Mao", "Đồng chí Nguyễn Phong Sắc", "Đồng chí Lê Viết Thuật"],
    location: "Hưng Nguyên, Nam Đàn, Thanh Chương (Nghệ An) và Hà Tĩnh",
    keyFacts: [
      "Chính quyền Xô Viết đầu tiên thành lập tại các làng xã Nghệ - Tĩnh",
      "Thực hiện chính quyền của dân, chia lại ruộng đất công, xóa bỏ thuế khóa bất công",
      "Ngày 12/09 được chọn làm ngày tưởng niệm các anh hùng liệt sĩ Xô Viết Nghệ Tĩnh"
    ],
    didYouKnow:
      "Tuy chỉ tồn tại trong 4-5 tháng nhưng chính quyền Xô Viết Nghệ Tĩnh đã thể hiện bản chất ưu việt: mở lớp dạy chữ Quốc ngữ, xóa bỏ tệ nạn xã hội, trật tự trị an do các đội Tự vệ đỏ gìn giữ.",
    visualTheme: "khang-chien",
    sources: [
      "Bảo tàng Xô Viết Nghệ Tĩnh",
      "Viện Lịch sử Đảng",
      "Lịch sử Đảng Cộng sản Việt Nam"
    ]
  },
  {
    id: "hist-09-23-nam-bo-khang-chien-1945",
    solarDate: { month: 9, day: 23 },
    year: 1945,
    title: "Ngày Nam Bộ kháng chiến",
    summary:
      "Đêm 22 rạng sáng ngày 23/09/1945, thực dân Pháp được quân Anh bảo trợ nổ súng đánh úp trụ sở UBND Nam Bộ tại Sài Gòn. Sáng sớm 23/9, Xứ ủy và Ủy ban Kháng chiến Nam Bộ họp khẩn tại phố Cây Mai (Chợ Lớn) ra lời kêu gọi đồng bào nhất tề đứng lên kháng chiến bảo vệ nền độc lập non trẻ.",
    context:
      "Chỉ 21 ngày sau khi Chủ tịch Hồ Chí Minh đọc bản Tuyên ngôn Độc lập, thực dân Pháp đã dã tâm dùng vũ lực toan cướp nước ta một lần nữa.",
    significance:
      "Mở đầu cuộc kháng chiến trường kỳ 30 năm chống ngoại xâm oanh liệt của dân tộc; khẳng định chân lý sắt đá: 'Nam Bộ là máu của máu Việt Nam, là thịt của thịt Việt Nam'.",
    figures: ["Đồng chí Trần Văn Giàu", "Đồng chí Hoàng Quốc Việt", "Bác sĩ Phạm Ngọc Thạch"],
    location: "Sài Gòn - Chợ Lớn (Cột cờ Thủ Ngữ, Cầu Bến Phân, Cây Mai)",
    keyFacts: [
      "Tiếng súng kháng chiến bùng nổ chỉ 21 ngày sau Tuyên ngôn Độc lập",
      "Lời kêu gọi non sông: 'Từ giờ phút này, nhiệm vụ hàng đầu của chúng ta là tiêu diệt giặc Pháp và tay sai!'",
      "Đoàn quân 'Nam tiến' từ miền Bắc và miền Trung lập tức lên đường chi viện"
    ],
    didYouKnow:
      "Bài ca bất hủ 'Nam Bộ kháng chiến' của nhạc sĩ Tạ Thanh Sơn ra đời ngay sau sự kiện với giai điệu hào sảng: 'Mùa thu rồi ngày hai mươi ba / Ta đi theo tiếng kêu sơn hà nguy biến...'.",
    visualTheme: "thong-nhat-1975",
    sources: [
      "Bảo tàng TP. Hồ Chí Minh",
      "Lịch sử Nam Bộ Kháng chiến (Hội đồng Biên soạn)",
      "Viện Lịch sử Quân sự Việt Nam"
    ]
  },
  {
    id: "hist-10-10-giai-phong-thu-do-1954",
    solarDate: { month: 10, day: 10 },
    year: 1954,
    title: "Ngày Giải phóng Thủ đô Hà Nội",
    summary:
      "Đúng 8 giờ sáng ngày 10/10/1954, các đơn vị Đại đoàn 308 (Quân Tiên phong) chia làm nhiều cánh quân rầm rộ tiến vào tiếp quản 5 cửa ô Hà Nội giữa rừng cờ hoa và tiếng reo hò vỡ òa của 20 vạn người dân. 15 giờ cùng ngày, lễ chào cờ lịch sử diễn ra trang nghiêm tại sân vận động Cột Cờ.",
    context:
      "Sau thắng lợi vang dội của chiến dịch Điện Biên Phủ và Hiệp định Genève được ký kết, thực dân Pháp buộc phải rút hết quân khỏi miền Bắc.",
    significance:
      "Mốc son lịch sử chói lọi đánh dấu sự kết thúc 9 năm kháng chiến chống Pháp trường kỳ gian khổ, mở ra thời kỳ xây dựng chủ nghĩa xã hội ở miền Bắc và làm hậu phương chi viện miền Nam.",
    figures: ["Thiếu tướng Vương Thừa Vũ", "Bác sĩ Trần Duy Hưng", "Đại tướng Võ Nguyên Giáp"],
    location: "Hà Nội (5 cửa ô, Cột cờ Hà Nội, Nhà hát Lớn)",
    keyFacts: [
      "Đúng 8h sáng: Đại đoàn 308 tiến vào tiếp quản Thủ đô qua các cửa ô",
      "15h chiều: Còi Nhà hát Lớn nổi lên, lễ chào cờ lịch sử đầu tiên tại Cột cờ Hà Nội",
      "Hơn 20 vạn đồng bào Thủ đô nô nức đổ ra đường đón mừng đoàn quân chiến thắng"
    ],
    didYouKnow:
      "Chiếc xe Zeep mui trần chở Chủ tịch Ủy ban Quân quản Hà Nội - Thiếu tướng Vương Thừa Vũ và Phó Chủ tịch - Bác sĩ Trần Duy Hưng đi qua phố Hàng Đào ngập tràn trong những cơn mưa hoa của thiếu nữ Hà thành.",
    visualTheme: "giai-phong-thu-do",
    sources: [
      "Bảo tàng Hà Nội",
      "Bảo tàng Lịch sử Quân sự Việt Nam",
      "Hà Nội ngày tiếp quản (NXB Hà Nội)"
    ]
  },
  {
    id: "hist-10-20-thanh-lap-hoi-phu-nu-1930",
    solarDate: { month: 10, day: 20 },
    year: 1930,
    title: "Thành lập Hội Phụ nữ Phản đế Việt Nam",
    summary:
      "Ngày 20/10/1930, Hội Phụ nữ Phản đế Việt Nam (nay là Hội Liên hiệp Phụ nữ Việt Nam) chính thức được thành lập tại Hội nghị Ban Chấp hành Trung ương Đảng họp tại Hương Cảng. Đây là lần đầu tiên trong lịch sử dân tộc, phụ nữ Việt Nam có một tổ chức đoàn thể cách mạng riêng.",
    context:
      "Giai cấp công nông quật khởi trong cao trào cách mạng 1930 - 1931, phụ nữ Việt Nam đã hăng hái tham gia bãi công, biểu tình thị uy chống áp bức bóc lột.",
    significance:
      "Khẳng định vị thế to lớn và quyền bình đẳng thiêng liêng của người phụ nữ trong sự nghiệp đấu tranh giải phóng dân tộc và xây dựng đất nước.",
    figures: ["Đồng chí Nguyễn Thị Minh Khai", "Đồng chí Thái Thị Bôi", "Đồng chí Nguyễn Thị Thập"],
    location: "Hương Cảng (Trung Quốc) và phong trào phụ nữ toàn quốc",
    keyFacts: [
      "Cương lĩnh đầu tiên của Đảng nhấn mạnh: 'Nam nữ bình quyền'",
      "Đảng lấy ngày 20/10 làm ngày truyền thống Phụ nữ Việt Nam",
      "Chủ tịch Hồ Chí Minh tặng 8 chữ vàng: 'Anh hùng, bất khuất, trung hậu, đảm đang'"
    ],
    didYouKnow:
      "Đồng chí Nguyễn Thị Minh Khai, một trong những nữ chiến sĩ cộng sản kiên trung đầu tiên của cách mạng Việt Nam, đã dõng dạc phát biểu tại Đại hội VII Quốc tế Cộng sản năm 1935 về phong trào phụ nữ Đông Dương.",
    visualTheme: "khang-chien",
    sources: [
      "Bảo tàng Phụ nữ Việt Nam",
      "Trung ương Hội Liên hiệp Phụ nữ Việt Nam",
      "Lịch sử Phong trào Phụ nữ Việt Nam"
    ]
  },
  {
    id: "hist-10-23-duong-ho-chi-minh-tren-bien-1961",
    solarDate: { month: 10, day: 23 },
    year: 1961,
    title: "Mở Đường Hồ Chí Minh trên biển - Tàu Không số",
    summary:
      "Ngày 23/10/1961, Bộ Quốc phòng ra Quyết định số 97/QP thành lập Đoàn 759 (tiền thân Lữ đoàn 125 Hải quân) với mật danh 'Đoàn tàu Không số', có nhiệm vụ vận chuyển vũ khí, cán bộ chi viện bí mật cho chiến trường miền Nam bằng đường biển.",
    context:
      "Đế quốc Mỹ và ngụy quyền thực hiện chiến lược 'Chiến tranh đặc biệt', phong tỏa gắt gao bờ biển và cô lập các chiến khu miền Nam.",
    significance:
      "Con đường vận tải chiến lược trên biển độc đáo và huyền thoại, thể hiện đỉnh cao trí tuệ, lòng quả cảm và nghệ thuật quân sự độc nhất vô nhị của Việt Nam.",
    figures: ["Đại tá Đoàn Hồng Phước", "Anh hùng Bông Văn Đĩa", "Thuyền trưởng Nguyễn Phan Vinh"],
    location: "Bến K15 (Đồ Sơn, Hải Phòng) đến Vũng Rô, Thạnh Phong, Bến Tre, Cà Mau",
    keyFacts: [
      "Xuất phát từ bến K15 (Đồ Sơn, Hải Phòng)",
      "Những con tàu gỗ, tàu sắt không mang số hiệu ngụy trang thành tàu đánh cá",
      "Vận chuyển hàng trăm nghìn tấn vũ khí đạn dược vào tận chiến trường Nam Bộ và Nam Trung Bộ"
    ],
    didYouKnow:
      "Mỗi con tàu Không số ra khơi đều chuẩn bị sẵn một khối thuốc nổ cực mạnh; các chiến sĩ xác định sẵn sàng kích nổ hy sinh cùng con tàu để không để lọt vũ khí và bí mật vào tay địch.",
    visualTheme: "khang-chien",
    sources: [
      "Bảo tàng Hải quân nhân dân Việt Nam",
      "Lữ đoàn 125 Hải quân",
      "Khu di tích Bến K15 Đồ Sơn"
    ]
  },
  {
    id: "hist-11-23-khoi-nghia-nam-ky-1940",
    solarDate: { month: 11, day: 23 },
    year: 1940,
    title: "Khởi nghĩa Nam Kỳ bùng nổ - Lá cờ đỏ sao vàng xuất hiện",
    summary:
      "Đêm 22 rạng ngày 23/11/1940, cuộc khởi nghĩa Nam Kỳ bùng nổ dữ dội ở hầu khắp các tỉnh Nam Bộ. Đây là sự kiện lịch sử đặc biệt khi lá cờ đỏ sao vàng năm cánh lần đầu tiên tung bay kiêu hãnh trên nóc các công sở chính quyền cách mạng và trong các cuộc biểu tình của nhân dân.",
    context:
      "Nhân dân Nam Kỳ sục sôi căm phẫn trước ách áp bức tàn bạo của liên minh thực dân Pháp - phát xít Nhật và chính sách bắt lính sang chiến trường Đông Dương - Thái Lan.",
    significance:
      "'Tiếng súng báo hiệu cho cuộc khởi nghĩa toàn quốc, là bước đấu tranh đầu tiên của các dân tộc Đông Dương' (Chủ tịch Hồ Chí Minh); khai sinh lá cờ Tổ quốc.",
    figures: ["Đồng chí Phan Đăng Lưu", "Đồng chí Hà Huy Tập", "Đồng chí Nguyễn Thị Minh Khai"],
    location: "Gia Định, Chợ Lớn, Mỹ Tho, Vĩnh Long, Cần Thơ, Hóc Môn",
    keyFacts: [
      "Khởi nghĩa bùng nổ tại 18 trong tổng số 21 tỉnh Nam Bộ",
      "Lá cờ đỏ sao vàng đầu tiên do đồng chí Nguyễn Hữu Tiến vẽ theo chỉ thị của Xứ ủy",
      "Lần đầu tiên cờ đỏ sao vàng xuất hiện trước công chúng tại đình Long Hưng (Mỹ Tho)"
    ],
    didYouKnow:
      "Tác giả vẽ mẫu lá cờ đỏ sao vàng năm cánh là thầy giáo, chiến sĩ cộng sản Nguyễn Hữu Tiến; anh đã viết bài thơ nhắn nhủ đồng bào trước lúc ra pháp trường: 'Hỡi những ai máu đỏ da vàng / Hãy chiến đấu dưới cờ thiêng Tổ quốc!'",
    visualTheme: "khang-chien",
    sources: [
      "Bảo tàng Lịch sử Quốc gia",
      "Khu tưởng niệm Di tích Lịch sử Ngã Ba Giồng",
      "Viện Lịch sử Đảng"
    ]
  },
  {
    id: "hist-12-18-dien-bien-phu-tren-khong-1972",
    solarDate: { month: 12, day: 18 },
    year: 1972,
    title: "Mở màn Chiến dịch 'Điện Biên Phủ trên không' 12 ngày đêm",
    summary:
      "Đêm 18/12/1972, Tổng thống Mỹ Richard Nixon ra lệnh mở chiến dịch Linebacker II dùng pháo đài bay B-52 ném bom rải thảm tàn bạo xuống Hà Nội, Hải Phòng. Quân và dân ta đã anh dũng bắn rơi ngay chiếc B-52 đầu tiên tại cánh đồng Chuôm (xã Phù Lỗ, huyện Sóc Sơn, Hà Nội).",
    context:
      "Mưu đồ của đế quốc Mỹ hòng 'đưa miền Bắc trở về thời kỳ đồ đá' để đè bẹp ý chí đấu tranh và giành ưu thế ép ta tại bàn đàm phán Paris.",
    significance:
      "Mở màn 12 ngày đêm kiên cường bất khuất làm nên bản hùng ca 'Điện Biên Phủ trên không' vĩ đại, đập tan hoàn toàn sức mạnh không lực Hoa Kỳ.",
    figures: ["Đại tướng Võ Nguyên Giáp", "Anh hùng Phạm Tuân", "Anh hùng Vũ Xuân Thiều"],
    location: "Bầu trời Hà Nội, Hải Phòng và các tỉnh miền Bắc",
    keyFacts: [
      "Mỹ huy động gần 200 máy bay chiến lược B-52 và hơn 1.000 máy bay chiến thuật",
      "Đúng 20h13 ngày 18/12: Tiểu đoàn 59 Trung đoàn Tên lửa 261 bắn rơi chiếc B-52 đầu tiên",
      "Mở đầu chiến dịch tiêu diệt 81 máy bay Mỹ (trong đó có 34 chiếc B-52)"
    ],
    didYouKnow:
      "Tướng Thomas Power, Tư lệnh Không quân Chiến lược Mỹ, từng ngạo mạn tuyên bố: 'B-52 là vũ khí tối tân chưa từng bị đánh bại'. Nhưng chỉ trong 12 ngày đêm ở Hà Nội, 34 pháo đài bay B-52 đã bị bắn rơi tan xác.",
    visualTheme: "giai-phong-thu-do",
    sources: [
      "Bảo tàng Chiến thắng B-52 Hà Nội",
      "Bảo tàng Phòng không - Không quân",
      "Bảo tàng Lịch sử Quân sự Việt Nam"
    ]
  },
  {
    id: "hist-12-19-toan-quoc-khang-chien-1946",
    solarDate: { month: 12, day: 19 },
    year: 1946,
    title: "Chủ tịch Hồ Chí Minh ra Lời kêu gọi Toàn quốc kháng chiến",
    summary:
      "20 giờ ngày 19/12/1946, pháo đài Láng nã những loạt đạn đầu tiên vào quân Pháp đóng trong thành Hà Nội; Đài Tiếng nói Việt Nam phát đi Lời kêu gọi Toàn quốc kháng chiến thiêng liêng của Chủ tịch Hồ Chí Minh: 'Không! Chúng ta thà hy sinh tất cả, chứ nhất định không chịu mất nước, nhất định không chịu làm nô lệ!'.",
    context:
      "Thực dân Pháp dã tâm xé bỏ Hiệp định Sơ bộ 6/3 và Tạm ước 14/9, gửi tối hậu thư đòi ta giải tán lực lượng tự vệ và nộp quyền kiểm soát Thủ đô.",
    significance:
      "Hiệu triệu triệu trái tim người Việt đứng lên bước vào cuộc kháng chiến trường kỳ 9 năm vì độc lập, tự do cho Tổ quốc.",
    figures: ["Chủ tịch Hồ Chí Minh", "Chiến sĩ Quyết tử quân Thủ đô"],
    location: "Làng Vạn Phúc (Hà Đông), Pháo đài Láng, Liên khu I Hà Nội",
    keyFacts: [
      "Lời kêu gọi thiêng liêng: 'Ai có súng dùng súng. Ai có gươm dùng gươm, không có gươm thì dùng cuốc, thuổng, gậy gộc...'",
      "Chiến sĩ Quyết tử quân Thủ đô cầm bom ba càng ôm lấy xe tăng địch",
      "Giam chân địch suốt 60 ngày đêm ở Hà Nội để Trung ương Đảng và chính phủ rút lên căn cứ Việt Bắc an toàn"
    ],
    didYouKnow:
      "Bác Hồ đã viết Lời kêu gọi Toàn quốc kháng chiến tại ngôi nhà của ông Nguyễn Văn Dương ở làng Vạn Phúc, Hà Đông vào đêm 18, rạng sáng ngày 19/12/1946.",
    visualTheme: "khang-chien",
    sources: [
      "Khu di tích Vạn Phúc, Hà Đông",
      "Bảo tàng Lịch sử Quân sự Việt Nam",
      "Hồ Chí Minh Toàn tập (Tập 4)"
    ]
  },
  {
    id: "hist-12-22-thanh-lap-qdnd-1944",
    solarDate: { month: 12, day: 22 },
    year: 1944,
    title: "Thành lập Đội Việt Nam Tuyên truyền Giải phóng quân",
    summary:
      "Ngày 22/12/1944, tại khu rừng Sam Cao thuộc vùng rừng Trần Hưng Đạo (xã Tam Kim, huyện Nguyên Bình, tỉnh Cao Bằng), Đội Việt Nam Tuyên truyền Giải phóng quân gồm 34 chiến sĩ do đồng chí Võ Nguyên Giáp trực tiếp chỉ huy làm lễ tuyên thệ thành lập.",
    context:
      "Chỉ thị lịch sử của lãnh tụ Hồ Chí Minh nêu rõ: 'Tên Đội Việt Nam Tuyên truyền Giải phóng quân, nghĩa là chính trị trọng hơn quân sự... Tuy lúc đầu quy mô của nó nhỏ, nhưng tiền đồ của nó rất vẻ vang'.",
    significance:
      "Đánh dấu sự ra đời của Quân đội nhân dân Việt Nam anh hùng - đội quân bách chiến bách thắng 'từ nhân dân mà ra, vì nhân dân mà chiến đấu'.",
    figures: ["Đại tướng Võ Nguyên Giáp", "Đồng chí Hoàng Sâm (Đội trưởng)", "Đồng chí Xích Thắng (Chính trị viên)"],
    location: "Khu rừng Trần Hưng Đạo, Nguyên Bình, Cao Bằng",
    keyFacts: [
      "Lực lượng ban đầu gồm 34 chiến sĩ (3 nữ, 31 nam) với vũ khí thô sơ",
      "Ngay sau khi thành lập đã mưu trí diệt đồn Phai Khắt (25/12) và Nà Ngần (26/12)",
      "Được chọn làm Ngày thành lập Quân đội nhân dân Việt Nam và Ngày hội Quốc phòng toàn dân"
    ],
    didYouKnow:
      "10 lời thề danh dự vang lên trong buổi lễ thành lập dưới lá cờ đỏ sao vàng giữa đại ngàn Cao Bằng đã trở thành lời thề bất tử của người lính Bộ đội Cụ Hồ suốt 8 thập kỷ qua.",
    visualTheme: "khang-chien",
    sources: [
      "Bảo tàng Lịch sử Quân sự Việt Nam",
      "Khu di tích Quốc gia đặc biệt rừng Trần Hưng Đạo",
      "Lịch sử Quân đội nhân dân Việt Nam (Tập 1)"
    ]
  }
];

/**
 * Helper to retrieve historical events occurring on a specific solar or lunar day
 */
export function getHistoricalEventsForDate(
  month: number,
  day: number,
  lunarMonth?: number,
  lunarDay?: number
): VietnamHistoricalEvent[] {
  return VIETNAM_HISTORICAL_EVENTS.filter((ev) => {
    // 1. Solar match
    if (ev.solarDate.month === month && ev.solarDate.day === day) {
      return true;
    }
    // 2. Lunar match (if applicable)
    if (
      ev.lunarDate &&
      lunarMonth !== undefined &&
      lunarDay !== undefined &&
      ev.lunarDate.lunarMonth === lunarMonth &&
      ev.lunarDate.lunarDay === lunarDay
    ) {
      return true;
    }
    return false;
  });
}
