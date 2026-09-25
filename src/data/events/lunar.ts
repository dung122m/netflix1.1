import { VietnamEvent } from "./types";

export const LUNAR_EVENTS: VietnamEvent[] = [
  {
    "id": "lunar-tet-ong-tao",
    "title": "Tết Ông Công Ông Táo (23 Tháng Chạp)",
    "shortDescription": "Tập tục thả cá chép tiễn Táo Quân chầu trời bẩm báo một năm nếp nhà ấm êm thuận hòa.",
    "category": "traditional-culture",
    "categoryLabel": "Văn hóa truyền thống",
    "nature": "traditional-festival",
    "natureLabel": "Lễ hội cổ truyền",
    "priority": 90,
    "lunarDate": {
      "lunarMonth": 12,
      "lunarDay": 23
    },
    "displayDate": "23 Tháng Chạp (Âm lịch)",
    "lunarDisplayDate": "23/12 Âm lịch",
    "origin": "Tín ngưỡng dân gian thờ cúng ba vị Thần Táo định phúc cai quản bếp núc và nề nếp gia phong.",
    "significance": "Thả cá chép đỏ phóng sinh với ước vọng cá chép vượt vũ môn hóa rồng, mang lại may mắn và phước lành.",
    "didYouKnow": "Cá chép đỏ được chọn làm phương tiện đưa Táo Quân chầu trời vì tượng trưng cho sự kiên trì vượt khó và thăng hoa.",
    "milestones": [
      "Bao sái bàn thờ gia tiên tinh tươm",
      "Thả cá chép đỏ phóng sinh tại sông hồ tự nhiên văn minh"
    ],
    "quote": "Cá chép hóa rồng chở Táo lên mây, mang theo phúc lộc gửi về nhân gian.",
    "tag": "Phong tục cổ truyền",
    "imageUrl": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80",
    "accentGradient": "from-orange-600/30 via-amber-600/20 to-zinc-950"
  },
  {
    "id": "lunar-giao-thua",
    "title": "Đêm Giao Thừa Tết Nguyên Đán",
    "shortDescription": "Thời khắc thiêng liêng đất trời giao hòa, vạn nhà sum vầy đón xuân mới bình an cát tường.",
    "category": "traditional-culture",
    "categoryLabel": "Văn hóa truyền thống",
    "nature": "traditional-festival",
    "natureLabel": "Lễ hội cổ truyền",
    "priority": 100,
    "effect": "tet",
    "lunarDate": {
      "lunarMonth": 12,
      "lunarDay": 30,
      "isNewYearEve": true
    },
    "displayDate": "Đêm Giao Thừa (30 Tết)",
    "lunarDisplayDate": "Đêm 29/30 Tháng Chạp",
    "origin": "Nghi lễ Trừ tịch trong văn hóa ngàn năm của người Việt xua tan bóng tối năm cũ nghênh đón cát khí năm mới.",
    "significance": "Xua đuổi mọi xui rủi của năm cũ, đón rước cát tường và sum họp gia đình trọn vẹn bên mâm cơm Tất niên.",
    "didYouKnow": "Mâm cúng Giao thừa gồm hai lễ: một lễ ngoài trời nghênh đón quan Hành khiển mới, và một lễ trong nhà dâng cúng tổ tiên.",
    "milestones": [
      "Bữa cơm Tất niên chiều 30 Tết",
      "Lễ cúng Giao thừa ngoài trời và trong nhà thời khắc 00:00",
      "Tục xông đất và hái lộc đầu xuân"
    ],
    "quote": "Thịt mỡ dưa hành câu đối đỏ / Cây nêu tràng pháo bánh chưng xanh.",
    "tag": "Đoàn viên dân tộc",
    "imageUrl": "https://images.unsplash.com/photo-1548625361-16eb1d746536?auto=format&fit=crop&w=1200&q=80",
    "accentGradient": "from-red-600/40 via-yellow-600/20 to-zinc-950"
  },
  {
    "id": "lunar-tet-nguyen-dan",
    "title": "Tết Nguyên Đán (Tết Cổ Truyền)",
    "shortDescription": "Đại lễ thiêng liêng nhất của người Việt — cội nguồn sum vầy, tri ân tổ tiên và đón rước phúc lộc.",
    "category": "national-holiday",
    "categoryLabel": "Ngày lễ chính thức",
    "nature": "official-holiday",
    "natureLabel": "Quốc lễ cổ truyền",
    "priority": 100,
    "effect": "tet",
    "lunarDate": {
      "lunarMonth": 1,
      "lunarDay": 1,
      "endLunarDay": 3
    },
    "displayDate": "Mùng 1 - Mùng 3 Tết Âm lịch",
    "lunarDisplayDate": "01/01 - 03/01 Âm lịch",
    "origin": "Gắn liền với nền văn minh lúa nước sông Hồng, đánh dấu điểm khởi đầu của tiết xuân mới và mùa gieo cấy hy vọng.",
    "significance": "Dịp đoàn tụ linh thiêng của mọi gia đình Việt, thể hiện truyền thống uống nước nhớ nguồn và đạo lý hiếu kính tiền nhân.",
    "didYouKnow": "Thành ngữ 'Mùng 1 Tết cha, mùng 2 Tết mẹ, mùng 3 Tết thầy' là nét đẹp tôn sư trọng đạo và hiếu nghĩa sâu sắc của người Việt.",
    "milestones": [
      "Mùng 1: Chúc Tết nội tộc, mừng tuổi lì xì đỏ may mắn",
      "Mùng 2: Thăm chúc họ ngoại và người thân",
      "Mùng 3: Chúc Tết thầy cô khai xuân tao nhã"
    ],
    "quote": "Dù đi bốn phương trời, lòng người Việt luôn hướng về mâm cơm đoàn viên ngày Tết.",
    "tag": "Lễ hội lớn nhất năm",
    "imageUrl": "https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=1200&q=80",
    "accentGradient": "from-red-600/40 via-amber-500/20 to-zinc-950"
  },
  {
    "id": "lunar-chua-huong",
    "title": "Khai Hội Chùa Hương & Hội Gióng Đền Sóc",
    "shortDescription": "Hành hương miền đất Phật linh thiêng trên dòng suối Yến thanh bình và trẩy hội non thiêng.",
    "category": "traditional-culture",
    "categoryLabel": "Văn hóa truyền thống",
    "nature": "traditional-festival",
    "natureLabel": "Lễ hội dân gian",
    "priority": 85,
    "lunarDate": {
      "lunarMonth": 1,
      "lunarDay": 6
    },
    "displayDate": "Mùng 6 Tháng Giêng (Âm lịch)",
    "lunarDisplayDate": "06/01 Âm lịch",
    "origin": "Lễ hội Chùa Hương (Mỹ Đức, Hà Nội) là lễ hội dài nhất Việt Nam kéo dài từ mùng 6 tháng Giêng đến hết tháng 3 Âm lịch.",
    "significance": "Cầu mong một năm mới an lạc, mưa thuận gió hòa và chiêm bái động Hương Tích 'Nam thiên đệ nhất động'.",
    "didYouKnow": "Thả thuyền trôi bồng bềnh trên dòng suối Yến ngắm hoa gạo đỏ rực là trải nghiệm thi vị độc nhất vô nhị.",
    "milestones": [
      "Khai hội Chùa Hương mùng 6 tháng Giêng",
      "Hội Gióng Đền Sóc tưởng nhớ Phù Đổng Thiên Vương"
    ],
    "tag": "Hành hương đất Phật",
    "imageUrl": "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80",
    "accentGradient": "from-purple-800/30 via-emerald-800/20 to-zinc-950"
  },
  {
    "id": "lunar-via-than-tai",
    "title": "Ngày Vía Thần Tài (Mùng 10 Tháng Giêng)",
    "shortDescription": "Tập tục nghênh đón Thần Tài cát tường, cầu mong một năm kinh doanh buôn bán hanh thông phát đạt.",
    "category": "traditional-culture",
    "categoryLabel": "Văn hóa truyền thống",
    "nature": "traditional-festival",
    "natureLabel": "Phong tục dân gian",
    "priority": 80,
    "lunarDate": {
      "lunarMonth": 1,
      "lunarDay": 10
    },
    "displayDate": "Mùng 10 Tháng Giêng (Âm lịch)",
    "lunarDisplayDate": "10/01 Âm lịch",
    "origin": "Tín ngưỡng dân gian thờ Thần Tài mang lại tài lộc, may mắn và thịnh vượng cho gia chủ.",
    "significance": "Nhiều người dân có tục mua một chút vàng may mắn lấy may đầu năm cho cả năm sung túc.",
    "didYouKnow": "Mâm cúng Vía Thần Tài thường có bộ 'tam sên' gồm thịt heo luộc, trứng luộc và tôm hoặc cua biển.",
    "milestones": [
      "Mua vàng lấy may mùng 10 tháng Giêng",
      "Lễ cúng tạ ơn Thần Tài linh thiêng"
    ],
    "tag": "Tài lộc đầu xuân",
    "imageUrl": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80",
    "accentGradient": "from-yellow-600/40 via-amber-600/20 to-zinc-950"
  },
  {
    "id": "lunar-hoi-lim",
    "title": "Hội Lim Bắc Ninh — Di Sản Quan Họ",
    "shortDescription": "Câu quan họ trao duyên 'Người ơi người ở đừng về' ngọt ngào đằm thắm của liền anh liền chị Kinh Bắc.",
    "category": "traditional-culture",
    "categoryLabel": "Văn hóa truyền thống",
    "nature": "traditional-festival",
    "natureLabel": "Di sản phi vật thể",
    "priority": 85,
    "lunarDate": {
      "lunarMonth": 1,
      "lunarDay": 13,
      "endLunarDay": 15
    },
    "displayDate": "13 - 15 Tháng Giêng (Âm lịch)",
    "lunarDisplayDate": "13/01 - 15/01 Âm lịch",
    "origin": "Hội Lim tổ chức tại huyện Tiên Du (Bắc Ninh) tôn vinh Dân ca Quan họ được UNESCO vinh danh Di sản nhân loại.",
    "significance": "Nét sinh hoạt văn hóa dân gian độc đáo với các canh hát đối đáp giao duyên mượt mà trên thuyền rồng.",
    "didYouKnow": "Trang phục quan họ với nón quai thao, áo tứ thân mớ ba mớ bảy và miếng trầu têm cánh phượng tạo nên cốt cách tao nhã riêng có.",
    "milestones": [
      "Hát quan họ đối đáp trên thuyền rồng",
      "Tục têm trầu cánh phượng mời khách"
    ],
    "quote": "Người ơi người ở đừng về.",
    "tag": "Di sản Quan họ",
    "imageUrl": "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80",
    "accentGradient": "from-rose-700/30 via-amber-600/20 to-zinc-950"
  },
  {
    "id": "lunar-khai-an-den-tran",
    "title": "Lễ Khai Ấn Đền Trần (Nam Định)",
    "shortDescription": "Hào khí Đông A muôn thuở — cầu quốc thái dân an, thiên hạ thái bình và phúc lộc toàn dân.",
    "category": "traditional-culture",
    "categoryLabel": "Văn hóa truyền thống",
    "nature": "traditional-festival",
    "natureLabel": "Hào khí Đông A",
    "priority": 85,
    "lunarDate": {
      "lunarMonth": 1,
      "lunarDay": 14,
      "endLunarDay": 15
    },
    "displayDate": "Đêm 14 rạng sáng 15 Tháng Giêng (Âm lịch)",
    "lunarDisplayDate": "14/01 - 15/01 Âm lịch",
    "origin": "Lễ hội Đền Trần (Nam Định) tưởng nhớ công đức 14 vị vua Trần và Quốc công Tiết chế Hưng Đạo Đại vương Trần Quốc Tuấn.",
    "significance": "Tái hiện nghi thức khai ấn triều Trần vào đầu xuân, nhắc nhở bổn phận liêm chính, vì dân vì nước của kẻ sĩ.",
    "didYouKnow": "Bốn chữ khắc trên ấn Trần là 'Tích phúc vô cương' nghĩa là ban phúc lộc không cùng cho muôn dân trăm họ.",
    "milestones": [
      "Nghi lễ rước kiệu ấn thiêng liêng lúc nửa đêm",
      "Phát ấn lộc đền Trần cho nhân dân đầu xuân"
    ],
    "tag": "Hào khí Đông A",
    "imageUrl": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80",
    "accentGradient": "from-red-600/40 via-yellow-600/20 to-zinc-950"
  },
  {
    "id": "lunar-tet-nguyen-tieu",
    "title": "Tết Nguyên Tiêu & Ngày Thơ Việt Nam (15/01 AL)",
    "shortDescription": "Đêm rằm trăng tròn đầu tiên trong năm — thi vị tao nhã của Ngày Thơ dân tộc.",
    "category": "traditional-culture",
    "categoryLabel": "Văn hóa truyền thống",
    "nature": "traditional-festival",
    "natureLabel": "Đêm rằm thi vị",
    "priority": 90,
    "lunarDate": {
      "lunarMonth": 1,
      "lunarDay": 15
    },
    "displayDate": "Rằm Tháng Giêng (15/01 Âm lịch)",
    "lunarDisplayDate": "15/01 Âm lịch",
    "origin": "Đêm rằm Thượng Nguyên trong phong tục Á Đông, trùng với sự kiện Bác Hồ viết bài thơ bất hủ 'Nguyên tiêu' trên dòng sông Đáy năm 1948.",
    "significance": "Dân gian quan niệm: 'Cả năm được rằm tháng bảy, không bằng cả thảy rằm tháng Giêng', cầu an và thưởng nguyệt thanh cao.",
    "didYouKnow": "Tại Văn Miếu - Quốc Tử Giám, tiếng trống khai hội Ngày Thơ Việt Nam vang lên rộn rã quy tụ các thế hệ thi sĩ.",
    "milestones": [
      "Lễ Phật cầu bình an đầu năm",
      "Hội Ngày Thơ Việt Nam ngâm thơ bình thơ tao nhã"
    ],
    "quote": "Kim dạ nguyên tiêu nguyệt chính viên / Xuân giang xuân thủy tiếp xuân thiên. — Hồ Chí Minh",
    "tag": "Đêm rằm thi vị",
    "imageUrl": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80",
    "accentGradient": "from-purple-900/30 via-red-900/20 to-zinc-950"
  },
  {
    "id": "lunar-tet-han-thuc",
    "title": "Tết Hàn Thực (Bánh Trôi - Bánh Chay - 03/03 AL)",
    "shortDescription": "Tập tục làm đĩa bánh trôi tròn đầy, bát bánh chay thanh ngọt dâng cúng tổ tiên cội nguồn.",
    "category": "traditional-culture",
    "categoryLabel": "Văn hóa truyền thống",
    "nature": "traditional-festival",
    "natureLabel": "Ẩm thực dân gian",
    "priority": 85,
    "lunarDate": {
      "lunarMonth": 3,
      "lunarDay": 3
    },
    "displayDate": "Mùng 3 Tháng 3 (Âm lịch)",
    "lunarDisplayDate": "03/03 Âm lịch",
    "origin": "Hòa quyện với văn hóa ẩm thực bản địa Việt Nam, trở thành ngày lễ hướng về cội nguồn tổ tiên gia tộc.",
    "significance": "Bánh trôi tròn tượng trưng cho trời, bánh chay phẳng tượng trưng cho đất, thể hiện tấm lòng hiếu kính thanh bạch.",
    "didYouKnow": "Bài thơ trứ danh 'Bánh trôi nước' của Hồ Xuân Hương đã mượn hình tượng chiếc bánh trôi để ca ngợi phẩm giá kiên trinh của người phụ nữ.",
    "milestones": [
      "Cả nhà quây quần nặn bánh trôi đường phèn",
      "Nấu bánh chay nước bột sắn hoa bưởi thanh khiết"
    ],
    "quote": "Thân em vừa trắng lại vừa tròn / Bảy nổi ba chìm với nước non.",
    "tag": "Ẩm thực truyền thống",
    "imageUrl": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80",
    "accentGradient": "from-amber-600/30 via-stone-600/20 to-zinc-950"
  },
  {
    "id": "lunar-gio-to-hung-vuong",
    "title": "Giỗ Tổ Hùng Vương (Mùng 10 Tháng 3 Âm Lịch)",
    "shortDescription": "Ngày hội non sông hướng về nguồn cội — tri ân công đức dựng nước của các Vua Hùng.",
    "category": "national-holiday",
    "categoryLabel": "Ngày lễ chính thức",
    "nature": "official-holiday",
    "natureLabel": "Quốc giỗ thiêng liêng",
    "priority": 100,
    "lunarDate": {
      "lunarMonth": 3,
      "lunarDay": 10
    },
    "displayDate": "Mùng 10 Tháng 3 (Âm lịch)",
    "lunarDisplayDate": "10/03 Âm lịch",
    "origin": "Tín ngưỡng thờ cúng Hùng Vương có từ hàng nghìn năm tại Phong Châu (Phú Thọ), được UNESCO vinh danh Di sản văn hóa phi vật thể của nhân loại.",
    "significance": "Biểu tượng thiêng liêng gắn kết khối đại đoàn kết 54 dân tộc anh em cùng chung bọc trăm trứng mẹ Âu Cơ.",
    "didYouKnow": "Việt Nam là quốc gia duy nhất trên thế giới có chung một ngày Quốc giỗ tưởng nhớ những vị vua khai sáng lập quốc.",
    "milestones": [
      "Đại lễ dâng hương tưởng niệm các Vua Hùng tại Đền Hùng",
      "Hội thi gói bánh chưng, giã bánh giầy truyền thống",
      "Kỳ nghỉ lễ chính thức của toàn dân"
    ],
    "quote": "Dù ai đi ngược về xuôi / Nhớ ngày Giỗ Tổ mùng mười tháng ba.",
    "tag": "Nghỉ lễ toàn quốc",
    "imageUrl": "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80",
    "accentGradient": "from-red-600/40 via-yellow-600/20 to-zinc-950"
  },
  {
    "id": "lunar-phat-dan",
    "title": "Đại Lễ Phật Đản (Vesak - 15/04 AL)",
    "shortDescription": "Kỷ niệm Đức Phật Thích Ca đản sinh — lan tỏa thông điệp hòa bình, từ bi và trí tuệ cứu khổ nhân loại.",
    "category": "traditional-culture",
    "categoryLabel": "Văn hóa truyền thống",
    "nature": "traditional-festival",
    "natureLabel": "Lễ hội tâm linh",
    "priority": 85,
    "lunarDate": {
      "lunarMonth": 4,
      "lunarDay": 15
    },
    "displayDate": "Rằm Tháng Tư (15/04 Âm lịch)",
    "lunarDisplayDate": "15/04 Âm lịch",
    "origin": "Kỷ niệm ba sự kiện trọng đại trong cuộc đời Đức Phật: Đản sinh, Thành đạo và Nhập Niết bàn, được Liên Hợp Quốc công nhận là ngày lễ văn hóa thế giới (Vesak).",
    "significance": "Khuyên răn con người sống thiện lương, từ bi hỷ xả, tránh xa điều ác và yêu thương muôn loài.",
    "didYouKnow": "Nghi thức Tắm Phật thiêng liêng gội sạch bụi trần phiền não trong tâm trí mỗi Phật tử.",
    "milestones": [
      "Nghi thức Tắm Phật trang nghiêm tại các tự viện",
      "Thả hoa đăng cầu quốc thái dân an trên sông"
    ],
    "tag": "Từ bi hỷ xả",
    "imageUrl": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    "accentGradient": "from-amber-600/35 via-yellow-600/20 to-zinc-950"
  },
  {
    "id": "lunar-tet-doan-ngo",
    "title": "Tết Đoan Ngọ (Tết Giết Sâu Bọ - 05/05 AL)",
    "shortDescription": "Tập tục ăn rượu nếp cái hoa vàng, mận chua đầu hè tẩy trừ bệnh tật, cầu mong sức khỏe dồi dào.",
    "category": "traditional-culture",
    "categoryLabel": "Văn hóa truyền thống",
    "nature": "traditional-festival",
    "natureLabel": "Ẩm thực dân gian",
    "priority": 85,
    "lunarDate": {
      "lunarMonth": 5,
      "lunarDay": 5
    },
    "displayDate": "Mùng 5 Tháng 5 (Âm lịch)",
    "lunarDisplayDate": "05/05 Âm lịch",
    "origin": "Tiết khí Đoan Dương giữa mùa hè khi thời tiết chuyển biến nóng bức, sâu bọ dịch bệnh phát sinh.",
    "significance": "Tẩy uế cơ thể theo y học cổ truyền, thưởng thức các loại hoa quả đầu mùa xua tan dịch bệnh.",
    "didYouKnow": "Sáng sớm mùng 5/5, người Việt ăn cơm rượu nếp, quả vải, mận hậu chín ngay khi vừa thức dậy để 'giết sâu bọ' đường ruột.",
    "milestones": [
      "Nấu cơm rượu nếp cẩm thơm nồng",
      "Chuẩn bị mâm hoa quả vải thiều, mận hậu chín đỏ",
      "Tục lệ hái lá thuốc nam vào giờ Ngọ"
    ],
    "quote": "Tháng Năm ngày Tết Đoan Dương / Rượu nếp thơm nồng ấm áp tình quê.",
    "tag": "Ẩm thực dân gian",
    "imageUrl": "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=80",
    "accentGradient": "from-amber-600/30 via-red-600/20 to-zinc-950"
  },
  {
    "id": "lunar-le-vu-lan",
    "title": "Đại Lễ Vu Lan Báo Hiếu (Rằm Tháng 7 AL)",
    "shortDescription": "Bông hồng cài áo — mùa tri ân công ơn sinh thành dưỡng dục bao la như biển trời của cha mẹ.",
    "category": "traditional-culture",
    "categoryLabel": "Văn hóa truyền thống",
    "nature": "traditional-festival",
    "natureLabel": "Hiếu hạnh vẹn tròn",
    "priority": 90,
    "lunarDate": {
      "lunarMonth": 7,
      "lunarDay": 15
    },
    "displayDate": "Rằm Tháng 7 (Âm lịch)",
    "lunarDisplayDate": "15/07 Âm lịch",
    "origin": "Tích chuyện Bồ tát Mục Kiền Liên cứu mẹ khỏi kiếp ngạ quỷ trong kinh Vu Lan Bồn.",
    "significance": "Ngày hội văn hóa thiêng liêng nhắc nhở đạo làm con nhớ ơn tổ tiên, cha mẹ và cầu siêu xá tội vong nhân.",
    "didYouKnow": "Nghi thức Bông hồng cài áo do Thiền sư Thích Nhất Hạnh khởi xướng: cài hoa hồng đỏ nếu còn mẹ, cài hoa hồng trắng nếu mẹ đã khuất núi.",
    "milestones": [
      "Nghi thức bông hồng cài áo xúc động tại các chùa",
      "Lễ cúng rằm tháng bảy xá tội vong nhân",
      "Nấu mâm cơm chay thanh đạm dâng cúng tổ tiên"
    ],
    "quote": "Công cha như núi Thái Sơn / Nghĩa mẹ như nước trong nguồn chảy ra.",
    "tag": "Hiếu hạnh vẹn tròn",
    "imageUrl": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    "accentGradient": "from-rose-600/30 via-purple-700/20 to-zinc-950"
  },
  {
    "id": "lunar-ngay-san-khau",
    "title": "Ngày Sân Khấu Việt Nam (12/08 AL)",
    "shortDescription": "Giỗ Tổ nghề Sân khấu — tri ân các bậc tiền nhân khai sáng nền nghệ thuật tuồng, chèo, cải lương, kịch nói.",
    "category": "entertainment",
    "categoryLabel": "Văn hóa nghệ thuật",
    "nature": "arts-culture",
    "natureLabel": "Giỗ tổ ngành nghề",
    "priority": 80,
    "lunarDate": {
      "lunarMonth": 8,
      "lunarDay": 12
    },
    "displayDate": "12 Tháng 8 (Âm lịch)",
    "lunarDisplayDate": "12/08 Âm lịch",
    "origin": "Thủ tướng Chính phủ ban hành Quyết định lấy ngày 12 tháng 8 Âm lịch làm Ngày Sân khấu Việt Nam từ năm 2010.",
    "significance": "Tôn vinh các thế hệ nghệ sĩ cống hiến trọn đời cho sân khấu kịch, mang lại tiếng cười và giọt nước mắt nhân văn cho đời.",
    "didYouKnow": "Nghệ sĩ sân khấu trên khắp ba miền đều lập bàn thờ Tổ nghiệp linh thiêng và thắp nén nhang thành kính vào ngày này.",
    "milestones": [
      "Lễ dâng hương Giỗ Tổ nghề Sân khấu tại các nhà hát",
      "Biểu diễn các trích đoạn cải lương, chèo cổ mẫu mực"
    ],
    "tag": "Tổ nghiệp sân khấu",
    "imageUrl": "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=1200&q=80",
    "accentGradient": "from-red-700/30 via-amber-600/20 to-zinc-950"
  },
  {
    "id": "lunar-tet-trung-thu",
    "title": "Tết Trung Thu (Tết Trông Trăng - 15/08 AL)",
    "shortDescription": "Đêm rằm rước đèn ông sao, múa lân rộn rã, thưởng thức bánh nướng bánh dẻo dưới ánh trăng rằm.",
    "category": "traditional-culture",
    "categoryLabel": "Văn hóa truyền thống",
    "nature": "traditional-festival",
    "natureLabel": "Đêm rằm trăng tròn",
    "priority": 95,
    "effect": "mid-autumn",
    "lunarDate": {
      "lunarMonth": 8,
      "lunarDay": 15
    },
    "displayDate": "Rằm Tháng 8 (Âm lịch)",
    "lunarDisplayDate": "15/08 Âm lịch",
    "origin": "Gắn liền với hình tượng Chú Cuội gốc đa, Chị Hằng Nga và truyền thống đón mừng mùa trăng tròn sáng nhất năm.",
    "significance": "Tết đoàn viên của gia đình, ngày hội tưng bừng của trẻ thơ với tiếng trống lân rộn rã và mâm cỗ trông trăng.",
    "didYouKnow": "Bánh dẻo hình tròn tượng trưng cho vầng trăng khuyết rồi lại tròn, bánh nướng hình vuông tượng trưng cho đất đai trù phú.",
    "milestones": [
      "Lễ hội rước đèn ông sao, đèn kéo quân phố phường",
      "Múa lân sư rồng sôi động rộn rã",
      "Phá cỗ trông trăng thưởng trà sen cùng gia đình"
    ],
    "quote": "Tết Trung Thu rước đèn đi chơi / Em rước đèn đi khắp phố phường.",
    "tag": "Đoàn viên trăng rằm",
    "imageUrl": "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=80",
    "accentGradient": "from-amber-600/30 via-yellow-600/20 to-zinc-950"
  },
  {
    "id": "lunar-trung-cuu",
    "title": "Tết Trùng Cửu (Lễ Hội Hoa Cúc - 09/09 AL)",
    "shortDescription": "Đăng cao ngắm cảnh, thưởng trà hoa cúc và cầu chúc ông bà cha mẹ sống lâu trăm tuổi.",
    "category": "traditional-culture",
    "categoryLabel": "Văn hóa truyền thống",
    "nature": "traditional-festival",
    "natureLabel": "Phong tục tao nhã",
    "priority": 75,
    "lunarDate": {
      "lunarMonth": 9,
      "lunarDay": 9
    },
    "displayDate": "Mùng 9 Tháng 9 (Âm lịch)",
    "lunarDisplayDate": "09/09 Âm lịch",
    "origin": "Con số 9 là số cực dương tượng trưng cho sự trường thọ, bền vững trong văn hóa Á Đông.",
    "significance": "Tục leo núi cao ngắm cảnh thu trong lành, thưởng trà hoa cúc vàng thanh nhiệt và chúc thọ đấng sinh thành.",
    "didYouKnow": "Hoa cúc vàng nở rộ vào mùa thu là biểu tượng thanh tao của người quân tử không màng danh lợi.",
    "milestones": [
      "Thưởng thức tách trà hoa cúc mật ong",
      "Leo núi dã ngoại ngắm cảnh sắc mùa thu"
    ],
    "tag": "Trường thọ thanh tao",
    "imageUrl": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80",
    "accentGradient": "from-yellow-600/30 via-amber-700/20 to-zinc-950"
  },
  {
    "id": "lunar-tet-ha-nguyen",
    "title": "Tết Hạ Nguyên (Tết Cơm Mới - 15/10 AL)",
    "shortDescription": "Gặt hái mùa vàng — nấu mâm cơm gạo mới dâng cúng tổ tiên tạ ơn đất trời mưa thuận gió hòa.",
    "category": "traditional-culture",
    "categoryLabel": "Văn hóa truyền thống",
    "nature": "traditional-festival",
    "natureLabel": "Tạ ơn mùa màng",
    "priority": 80,
    "lunarDate": {
      "lunarMonth": 10,
      "lunarDay": 15
    },
    "displayDate": "Rằm Tháng Mười (15/10 Âm lịch)",
    "lunarDisplayDate": "15/10 Âm lịch",
    "origin": "Lễ hội mừng lúa mới của cư dân nông nghiệp lúa nước sau khi thu hoạch vụ mùa bội thu.",
    "significance": "Bày tỏ lòng biết ơn mẹ thiên nhiên đã ban tặng đất đai màu mỡ, hạt gạo trắng ngần nuôi sống con người.",
    "didYouKnow": "Mâm cúng Tết Cơm mới luôn có bát cơm thơm dẻo từ gạo vừa gặt và các món bánh cổ truyền từ nếp mới.",
    "milestones": [
      "Nấu nồi xôi nếp mới dâng cúng gia tiên",
      "Thưởng thức hạt gạo mùa mới thơm dẻo cùng gia đình"
    ],
    "tag": "Mùa vàng no ấm",
    "imageUrl": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80",
    "accentGradient": "from-amber-600/35 via-yellow-600/20 to-zinc-950"
  },
  {
    "id": "lunar-ooc-om-boc",
    "title": "Lễ Hội Oóc Om Bóc & Đua Ghe Ngo Khmer (15/11 AL)",
    "shortDescription": "Tiếng reo hò dậy sóng trên dòng sông Maspero — lễ cúng trăng và hội đua ghe Ngo rực rỡ sắc màu Tây Nam Bộ.",
    "category": "traditional-culture",
    "categoryLabel": "Văn hóa truyền thống",
    "nature": "traditional-festival",
    "natureLabel": "Di sản phi vật thể",
    "priority": 85,
    "lunarDate": {
      "lunarMonth": 11,
      "lunarDay": 15
    },
    "displayDate": "Rằm Tháng Mười Một (15/11 Âm lịch)",
    "lunarDisplayDate": "15/11 Âm lịch",
    "origin": "Lễ cúng trăng tạ ơn Thần Mặt Trăng của đồng bào dân tộc Khmer Nam Bộ sau mùa thu hoạch lúa.",
    "significance": "Đua ghe Ngo truyền thống với hàng chục đội ghe dài hơn 30 mét tranh tài thể hiện tinh thần thượng võ và đoàn kết.",
    "didYouKnow": "Món cốm dẹp (Om Bóc) thơm lừng giã từ nếp mới trộn dừa nạo và đường thốt nốt là linh hồn của lễ hội.",
    "milestones": [
      "Hội đua ghe Ngo rực lửa tại Sóc Trăng",
      "Lễ cúng trăng và đút cốm dẹp cho trẻ em chúc phúc"
    ],
    "tag": "Sông nước Cửu Long",
    "imageUrl": "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80",
    "accentGradient": "from-amber-600/30 via-red-600/20 to-zinc-950"
  }
];
