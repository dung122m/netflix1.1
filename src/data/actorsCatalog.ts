export interface ActorCatalogItem {
  slug: string;
  name: string;
  englishName?: string;
  country: string;
  countryCode: "vn" | "hk" | "cn" | "kr" | "jp" | "th" | "us_uk" | "in";
  gender?: 1 | 2; // 1: Nữ, 2: Nam
  tags?: string[];
  roles?: string;
  avatarUrl?: string;
  tmdbPersonId?: number;
  birthday?: string;
  deathday?: string;
  placeOfBirth?: string;
  bio?: string;
  wikiUrl?: string;
  aliases: string[];
  featured?: boolean;
}

export const ACTORS_CATALOG: ActorCatalogItem[] = [
  {
    "slug": "tran-thanh",
    "name": "Trấn Thành",
    "englishName": "Huỳnh Trấn Thành",
    "country": "Việt Nam 🇻🇳",
    "countryCode": "vn",
    "gender": 2,
    "tags": [
      "Hài",
      "Chính kịch",
      "Tình cảm"
    ],
    "roles": "Đạo diễn • Diễn viên • MC",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/srIchVGBqzMVJ1mracvGV9qHUmM.jpg",
    "tmdbPersonId": 1594385,
    "birthday": "1987-02-05",
    "placeOfBirth": "Ho Chi Minh City, Vietnam",
    "bio": "Huỳnh Trấn Thành, thường được biết đến với nghệ danh Trấn Thành, là một nam diễn viên, nghệ sĩ hài, người dẫn chương trình truyền hình, doanh nhân kiêm nhà làm phim người Việt Nam. Anh bắt đầu sự nghiệp và thành công với vai trò người dẫn chương trình sau khi đoạt giải ba cuộc thi Én Vàng 2006. Được đánh giá là một trong những diễn viên Việt Nam xuất sắc nhất trong thế hệ của mình, sáu bộ phim mà anh tham gia nằm trong số những phim có doanh thu cao nhất lịch sử Việt Nam, tất cả đều đạt trên 100 tỷ VND.",
    "aliases": [
      "trấn thành",
      "tran thanh",
      "huynh tran thanh",
      "a xin",
      "a xìn",
      "mc tran thanh",
      "dao dien tran thanh"
    ],
    "featured": true
  },
  {
    "slug": "truong-giang",
    "name": "Trường Giang",
    "englishName": "Võ Vũ Trường Giang",
    "country": "Việt Nam 🇻🇳",
    "countryCode": "vn",
    "gender": 2,
    "tags": [
      "Hài",
      "Tình cảm",
      "Chính kịch"
    ],
    "roles": "Danh hài • Diễn viên • MC",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/tOAkgIMbNHmTnXuz4EHnqBmALk1.jpg",
    "tmdbPersonId": 1674570,
    "bio": "Võ Vũ Trường Giang (sinh ngày 20 tháng 4 năm 1983), được biết đến với nghệ danh Trường Giang, là một nam diễn viên, nghệ sĩ hài, nhạc sĩ kiêm người dẫn chương trình truyền hình người Việt Nam.\n\nTiểu sử:\n\nVõ Vũ Trường Giang sinh ngày 20 tháng 4 năm 1983 tại xã Tân Hiệp, huyện Long Thành, tỉnh Đồng Nai (nay là xã Phước Thái, thành phố Đồng Nai), có quê gốc ở Tam Kỳ, Quảng Nam (nay là phường Tam Kỳ, thành phố Đà Nẵng).\nLà con kế út trong một gia đình nghèo khó có sáu anh chị em (bốn trai, hai gái); chị cả là Võ Thị Hoàng Yến, anh trai là Võ Quang Vũ, dưới Trường Giang có một em gái. Cha mẹ và họ hàng nội ngoại của Trường Giang quê quán ở Tam Kỳ, Quảng Nam (nay là thành phố Đà Nẵng). Học xong trung học, Trường Giang thi vào trường Sư phạm Đồng Nai nhưng không đỗ. Sau đó, anh đăng ký học trường Sân khấu Điện ảnh nhưng nhiều lần bị đuổi học vì không có tiền đóng học phí. Năm 2007, sau một lần đóng thế vai quần chúng của một người bạn, anh được cố nghệ sĩ Hữu Lộc phát hiện và cho gia nhập sân khấu kịch Nụ cười Mới.\n\nSự nghiệp:\n\nSau vài năm ở Nụ cười Mới, tháng 7 năm 2011 đánh dấu bước ngoặt sự nghiệp của Trường Giang, khi anh được nam ca sĩ Đàm Vĩnh Hưng mời viết kịch bản và diễn trong tiểu phẩm hài Khó ở liveshow Bước chân miền Trung. Trong vai diễn Mười Khó, anh gây ấn tượng mạnh cho khán giả qua hình ảnh ông già Quảng Nam khó tính nhưng duyên dáng, hài hước. Sau vai diễn này, tên tuổi của Trường Giang bắt đầu được công chúng biết đến, anh thực hiện nhiều minishow ăn khách, diễn chung với các nghệ sĩ nổi tiếng như Hoài Linh, Chí Tài, Trấn Thành, Việt Hương, Lâm Vỹ Dạ và tham gia các chương trình truyền hình thực tế. Cũng từ vai diễn này mà anh còn được công chúng gọi với biệt danh Mười Khó.\nNăm 2015 là một năm thành công của Trường Giang. Ở lĩnh vực phim ảnh, anh góp mặt trong hai dự án đình đám: Lật Mặt (thu về 25 tỷ đồng sau một tuần công chiếu) và 49 Ngày (thu về 15 tỷ đồng sau 3 ngày công chiếu). Với thành công của bộ phim 49 Ngày, Trường Giang được báo chí phong tặng danh hiệu \"hoàng tử phòng vé\" của điện ảnh Việt. Không chỉ đóng phim, Trường Giang còn xuất hiện trong nhiều chương trình truyền hình như Ơn giời cậu đây rồi!, Bí mật đêm Chủ Nhật và Hội ngộ danh hài. Anh còn dẫn các chương trình thực tế như Bước nhảy ngàn cân, Chung sức, Thiên đường ẩm thực, Ca sĩ giấu mặt, Giọng ải giọng ai và Mặt nạ ngôi sao. Đặc biệt, Trường Giang đã có tổ chức liveshow đầu tiên mang tên \"Chàng hề xứ Quảng\" sau 8 năm bước vào nghề diễn hài. Ngày 23 tháng 1 năm 2016 anh đã nhận được Giải Mai Vàng cho hạng mục \"Nam diễn viên hài\" và \"Nam diễn viên sân khấu\".\nTại lễ trao Giải Mai Vàng 2016 vào ngày 20 tháng 1 năm 2017, Trường Giang đã chiến thắng bốn giải tại bốn hạng mục mà anh được đề cử: \"Nam diễn viên sân khấu\", \"Diễn viên hài\", \"Nam diễn viên điện ảnh/phim truyền hình\" và \"Người dẫn chương trình\".",
    "aliases": [
      "trường giang",
      "truong giang",
      "muoi kho",
      "mười khó",
      "mc truong giang",
      "danh hai truong giang",
      "vo vu truong giang"
    ],
    "featured": true
  },
  {
    "slug": "thai-hoa",
    "name": "Thái Hòa",
    "englishName": "Hồ Thái Hòa",
    "country": "Việt Nam 🇻🇳",
    "countryCode": "vn",
    "gender": 2,
    "tags": [
      "Hài",
      "Chính kịch",
      "Hành động"
    ],
    "roles": "Ông hoàng phòng vé • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/lKtQkjmtIkzbVdFrLhDCqCP1Cjc.jpg",
    "tmdbPersonId": 1157996,
    "birthday": "1974-08-10",
    "placeOfBirth": "Saigon, Vietnam",
    "bio": "Hồ Thái Hòa, thường được biết đến với nghệ danh Thái Hòa (sinh ngày 10 tháng 8 năm 1974), là một nam diễn viên người Việt Nam. Nổi tiếng nhờ khả năng biến hóa thần sầu trong từng vai diễn, anh được đánh giá là một trong những diễn viên Việt Nam xuất sắc nhất trong thế hệ của mình.\n\nTiểu sử:\n\nThái Hòa sinh ngày 10 tháng 8 năm 1974 tại tại xóm Lò Heo, gần chợ Bà Chiểu (nay thuộc phường Gia Định, Thành phố Hồ Chí Minh). Gia đình không có ai theo nghệ thuật, nhưng do đam mê, anh thi vào Trường đại học Sân khấu - Điện ảnh TP.HCM để làm diễn viên hài. Bắt đầu hoạt động chuyên nghiệp từ năm 1998, anh ghi dấu ấn đầu tiên trong lòng công chúng qua vai chàng sinh viên nghèo trong vở kịch Phòng trọ ba người.\nNhững năm 2000, Thái Hòa trở thành gương mặt tiêu biểu trên các sân khấu hài kịch và cả chính kịch. Không chỉ dừng lại ở vai trò diễn viên, anh còn bộc lộ tài năng trong việc dàn dựng và viết kịch bản, là \"cha đẻ\" của hai tác phẩm sân khấu kinh điển: Người vợ ma và Quả tim máu.\nTuy nhiên chỉ khi đến với điện ảnh, cái tên Thái Hoà mới vụt sáng thành sao và \"phủ sóng\" rộng khắp. Từ bộ phim truyền hình đầu tay Những đứa con thành phố, Thái Hòa sau đó liên tiếp gây tiếng vang với hàng loạt dự án điện ảnh ăn khách như Để Mai tính, Long Ruồi, Cưới ngay kẻo lỡ, Tèo em, Để Mai tính 2, Quả tim máu... Năm 2020, diễn viên đóng Tiệc trăng máu của đạo diễn Nguyễn Quang Dũng - tác phẩm vào top năm doanh thu phim Việt cao nhất mọi thời khi đó (175 tỷ đồng).\n\nNăm 2021, anh tiếp tục gây chú ý qua vai người anh cả tảo tần trong phim truyền hình Cây táo nở hoa. Bằng ánh mắt và cử chỉ tinh tế, anh đã lột tả trọn vẹn tình yêu thương vô bờ bến dành cho gia đình, chạm đến trái tim của những khán giả.Năm 2023, anh đoạt hai danh hiệu Nam diễn viên chính xuất sắc điện ảnh (Con Nhót mót chồng) lẫn truyền hình (Mẹ Rơm) tại giải Cánh Diều. Thái Hòa cũng giành Nam diễn viên chính xuất sắc tại Liên hoan phim Việt Nam 2023. Suốt một thập kỷ diễn xuất, Thái Hòa luôn tìm cách làm mới bản thân, chú trọng thể hiện nhân vật một cách tự nhiên để thuyết phục khán giả. Hầu hết các bộ phim anh đóng đều gặt hái thành công từ doanh thu đến đánh giá chuyên môn. Đây cũng là lý do mà Thái Hòa được khán giả ưu ái gọi là \"ông vua phòng vé\", hay \"diễn viên triệu đô\". Tuy nhiên, nam diễn viên luôn tỏ ra khiêm tốn trước danh hiệu này. Chia sẻ với báo chí, anh cho biết bản thân cũng từng trải qua những dự án không thành công và mong muốn được nhìn nhận như một diễn viên bình thường đang cống hiến hết mình cho nghệ thuật.\nVề đời tư, sau cuộc hôn nhân đầu với diễn viên Cát Phượng, anh hiện đang có cuộc sống bình yên, kín tiếng bên vợ (Hà Huỳnh Hồng Thu) và các con. Anh ít khi xuất hiện tại các sự kiện hào nhoáng, thay vào đó tập trung tối đa thời gian cho việc sáng tạo nghệ thuật. Năm 2025, Hồ Thái Thiên Minh (Bom) – con trai của diễn viên Thái Hòa và nghệ sĩ Cát Phượng chính thức có vai diễn đầu tay cùng cha trong phim Tử chiến trên không.",
    "aliases": [
      "thái hòa",
      "thai hoa",
      "ong hoang phong ve thai hoa",
      "ông hoàng phòng vé",
      "ho thai hoa"
    ],
    "featured": true
  },
  {
    "slug": "ninh-duong-lan-ngoc",
    "name": "Ninh Dương Lan Ngọc",
    "englishName": "Lan Ngọc",
    "country": "Việt Nam 🇻🇳",
    "countryCode": "vn",
    "gender": 1,
    "tags": [
      "Chính kịch",
      "Tình cảm",
      "Hài"
    ],
    "roles": "Ngọc nữ điện ảnh • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/ypwd4glGKnAoiLMWH0DuxDkPvKE.jpg",
    "tmdbPersonId": 1386822,
    "birthday": "1990-04-04",
    "placeOfBirth": "Ho Chi Minh City, Vietnam",
    "bio": "Ninh Dương Lan Ngọc (sinh ngày 4 tháng 4 năm 1990) là một nữ diễn viên người Việt Nam. Cô được đánh giá là một trong những nữ diễn viên Việt Nam xuất sắc nhất trong thế hệ của mình, cô bắt đầu được biết đến qua vai diễn Nương trong bộ phim Cánh đồng bất tận.\n\nCuộc đời và sự nghiệp:\n\n1990–2009: Những năm thiếu thời và khởi đầu sự nghiệp:\n\nNinh Dương Lan Ngọc sinh ngày 4 tháng 4 năm 1990 ở Thành phố Hồ Chí Minh. Cô là cựu học sinh Trường THPT Nguyễn Hữu Huân và là cựu sinh viên Trường Đại học Sân khấu - Điện ảnh Thành phố Hồ Chí Minh.\nVào những năm 2008 - 2009, khi vẫn còn là sinh viên, cô tham gia một số phim quảng cáo, video ca nhạc cho một số ca sĩ nhưng chưa thật sự có tên tuổi. Ninh Dương Lan Ngọc từng vào vai phụ trong phim truyền hình Gia đình phép thuật.\n\n2010–nay: Thành công qua bộ phim Cánh đồng bất tận và phát triển sự nghiệp:\n\nNăm 2010, Ninh Dương Lan Ngọc thủ vai Nương trong phim Cánh đồng bất tận. Đây là vai diễn đầu tay, cũng là vai diễn giúp cô đoạt giải Cánh Diều Vàng.\nNăm 2012, cô đầu quân về công ty Vietnam Artist Agency (VAA) (sau này là Studio68) của Ngô Thanh Vân cho đến năm 2013.\nĐầu năm 2015, cô đoạt giải quán quân của chương trình Bước nhảy hoàn vũ 2015.\nNăm 2016, cô đầu quân về công ty Light On Agency của Lê Duy Tường.\nNinh Dương Lan Ngọc cái tên ăn khách của phòng vé với các tác phẩm như: Cô Ba Sài Gòn, Tấm Cám: Chuyện chưa kể, Gái già lắm chiêu... Đặc biệt, Lan Ngọc là còn được mệnh danh là \"quý cô trăm tỉ\" với hai tác phẩm đạt doanh thu trên 100 tỉ đồng mà cô góp mặt là: Cua lại vợ bầu và Gái già lắm chiêu 3. Cô cũng tham gia trong các game show, phim điện ảnh, trong đó có chương trình Running Man (Chạy đi chờ chi).\nNăm 2023, Ninh Dương Lan Ngọc tham gia chương trình Chị đẹp đạp gió rẽ sóng của VTV3. Kết quả, cô xuất sắc thành đoàn ở vị trí 2 dựa vào tổng số điểm bình chọn cá nhân cao nhất trong 7 đêm công diễn là 1027 điểm và có giải phụ Chị đẹp tỏa sáng.\nNăm 2024, Ninh Dương Lan Ngọc cùng các chị đẹp từ chương trình Chị đẹp đạp gió rẽ sóng thành lập nhóm nhạc mang tên LUNAS. Cô cùng với nhóm LUNAS đã khiến khán giả bất ngờ khi được mời sang Trung Quốc trình diễn trong chương trình Đạp gió 2024 và nhận về phản hồi tích cực ở nước bạn.\nNăm 2025, Ninh Dương Lan Ngọc đã tham gia chương trình truyền hình thực tế Sao Nhập Ngũ 2025 – Khi Tổ Quốc Gọi Tên. Tuy nhiên, sau ba tập phát sóng, cô đã phải rút lui do chấn thương chưa hồi phục hoàn toàn. Trong tập 3, phát sóng ngày 20/8/2025, Lan Ngọc chia sẻ quyết định này trong một buổi chia tay ấm cúng cùng các đồng đội, bày tỏ niềm tự hào khi được khoác lên mình màu xanh áo lính .\nTháng 5 năm 2026, Lan Ngọc xác nhận trở lại màn ảnh rộng sau 4 năm với vai tình báo trong phim Mật mã Đông Dương trong buổi họp báo công bố dự án.",
    "aliases": [
      "ninh dương lan ngọc",
      "ninh duong lan ngoc",
      "lan ngoc",
      "ngoc nu ninh duong lan ngoc"
    ],
    "featured": true
  },
  {
    "slug": "ly-hai",
    "name": "Lý Hải",
    "englishName": "Nguyễn Văn Hải",
    "country": "Việt Nam 🇻🇳",
    "countryCode": "vn",
    "gender": 2,
    "tags": [
      "Hành động",
      "Hài",
      "Chính kịch"
    ],
    "roles": "Đạo diễn franchise Lật Mặt • Ca sĩ",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/qmPEmGwDEINEoiQywHuGR0dCz0A.jpg",
    "tmdbPersonId": 1675405,
    "birthday": "1968-09-28",
    "placeOfBirth": " Vietnam",
    "bio": "Nguyễn Văn Hải, thường được biết đến với nghệ danh Lý Hải (sinh ngày 28 tháng 9 năm 1968), là một nam ca sĩ, diễn viên, doanh nhân kiêm nhà làm phim người Việt Nam. Bước chân vào lĩnh vực ca hát từ năm 1993, song tên tuổi của ông chỉ thật sự thành danh khi cho ra đời chuỗi album ca nhạc phim Trọn đời bên em vào năm 2001. Thành công của loạt album này đã giúp ông xây dựng thành công thương hiệu cho riêng mình và trở thành một trong những nam ca sĩ ăn khách nhất thời điểm bấy giờ, đặc biệt là đối với khán giả miền Tây Nam Bộ. Với sở trường trình bày những ca khúc thuộc thể loại nhạc trẻ và nhạc Hoa lời Việt bằng giai điệu và ca từ đơn giản, ông từng được mệnh danh là \"Ngôi sao ca nhạc bình dân\".\nNgoài sự nghiệp âm nhạc, Lý Hải còn lấn sân sang sự nghiệp điện ảnh. Là người sáng lập ra hãng phim mang tên mình, Lý Hải Productions, ông còn được biết đến khi là người sáng tạo ra thương hiệu điện ảnh Lật mặt. Thương hiệu khi ra mắt lần đầu vào năm 2015 đã giúp ông thành công thu về hơn 1 nghìn tỷ VND và những phần phim do ông thực hiện cũng thường nhận được hầu hết những lời khen ngợi từ giới chuyên môn.\n\nCuộc đời và sự nghiệp:\n\nLý Hải sinh ngày 28 tháng 9 năm 1968 tại huyện Châu Thành, tỉnh Mỹ Tho (nay là phường Mỹ Tho, tỉnh Đồng Tháp). Ông là con út trong một gia đình có 9 anh chị em. Có giả thiết Lý Hải là người gốc Hoa. Tham gia rất nhiều hoạt động văn nghệ của trường khi còn học phổ thông, đến năm lớp 11, ông đăng ký dự thi và trúng tuyển vào lớp diễn viên kịch do Trường Nghệ thuật Sân khấu 2 tổ chức tại Mỹ Tho. Năm 1987, ông chuyển lên Thành phố Hồ Chí Minh để theo học tại trường. Trong thời gian học, Lý Hải có điều kiện làm quen với ca hát bằng việc tham gia các đội xung kích của trường, và từng được đạo diễn Xuân Phước giới thiệu đi hát tại một số tụ điểm. Sau khi học xong, Lý Hải lâm vào cảnh thất nghiệp do vào thời điểm đó kịch nói đang ở trong giai đoạn xuống dốc vì thiếu vắng khán giả. Năm 1991, ông trở thành diễn viên đoàn Kịch Nói Trẻ, nhưng không lâu sau ông trở về quê để đi học nghề may rồi quay lại Thành phố Hồ Chí Minh. Trong thời gian này, Lý Hải học thanh nhạc với sự hướng dẫn của các giáo viên trong trường Nghệ thuật Sân khấu 2. Năm 1993, ông chuyển hẳn sang lĩnh vực ca hát và quyết tâm trở thành một ca sĩ chuyên nghiệp. Thời gian đầu, Lý Hải cùng 2 người bạn là Hữu Bình và Hữu Thượng lập một nhóm nhạc nhưng hợp tác được 2 năm thì nhóm tan rã. Ông liên tục đi hát tại một số tụ điểm kể cả những tour diễn tại thủ đô Hà Nội. Ông chuyển sang phong cách hát đơn có múa phụ họa và bắt đầu được khán giả biết đến với các ca khúc \"Trọn đời bên em\", \"Người yêu hỡi\".\nNăm 2000, Lý Hải gặp Vĩnh Thuyên (người trước đó từng là quản lý cho ca sĩ Phương Thanh) và được người này giúp định hình lại phong cách âm nhạc, từ chỗ chỉ tập trung vào những ca khúc sôi động sang hát cả nhạc sôi động lẫn trữ tình. Sau đó, Vĩnh Thuyên chính thức trở thành người quản lý cho Lý Hải.",
    "aliases": [
      "lý hải",
      "ly hai",
      "dao dien ly hai",
      "nguyen van hai"
    ],
    "featured": true
  },
  {
    "slug": "hoai-linh",
    "name": "Hoài Linh",
    "englishName": "Võ Hoài Linh",
    "country": "Việt Nam 🇻🇳",
    "countryCode": "vn",
    "gender": 2,
    "tags": [
      "Hài",
      "Chính kịch",
      "Tình cảm"
    ],
    "roles": "Nghệ sĩ ưu tú • Danh hài gạo cội",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/sUTrL2w0i1ctXc8LNZnmetQz8e4.jpg",
    "tmdbPersonId": 1260871,
    "birthday": "1969-12-18",
    "bio": "Võ Nguyễn Hoài Linh (sinh ngày 18 tháng 12 năm 1969 tại Khánh Hòa), thường được biết đến với nghệ danh Hoài Linh, là một nam diễn viên kiêm nghệ sĩ hài người Việt Nam. Ông là một trong những diễn viên hài nổi bật nhất thập niên 2000 và 2010 tại Việt Nam, và là chủ nhân của giải Mai Vàng. Năm 2015, ông trở thành nghệ sĩ hải ngoại đầu tiên được phong tặng danh hiệu Nghệ sĩ Ưu tú.\n\nTiểu sử và sự nghiệp:\n\nHoài Linh sinh ngày 18 tháng 12 năm 1969 tại Cam Ranh, Khánh Hòa trong một gia đình Công giáo có tất cả 6 người con gồm 3 nam, 3 nữ, và anh là con thứ 3 và là con trai trưởng trong gia đình. Cha mẹ anh quê ở Đại Lộc, Quảng Nam (nay là xã Đại Lộc, thành phố Đà Nẵng). Ngoài một người chị cả đã có gia đình còn ở lại Việt Nam, gia đình anh đã sang Hoa Kỳ theo diện HO vào năm 1995 vì trước đó cha anh, ông Võ Tòa, phục vụ trong Lực lượng đặc biệt Việt Nam Cộng hòa với chức vụ Đại úy, bị tù cải tạo 6 năm tại Biên Hòa, cho đến năm 1982 mới được tha về. Mẹ anh, bà Nguyễn Thị Lệ Phương, điều hành một nhà hộ sinh tư ở Cam Ranh.\nHoài Linh sống ở Cam Ranh đến năm 1975 sau đó theo gia đình di tản đến Dầu Giây, Đồng Nai, anh học hết bậc trung học ở trường phổ thông trung học Thống Nhất A (huyện Trảng Bom; nay là phường Trảng Bom, tỉnh Đồng Nai). Vào năm 1988, gia đình anh trở về Cam Ranh để lo thủ tục xin hoàn lại nhà cửa bị tịch thu, sau đó vào Thành phố Hồ Chí Minh năm 1992 cho đến ngày sang Hoa Kỳ cuối năm 1993. Trong thời gian này, Hoài Linh gia nhập đoàn ca múa nhạc Ponaga, sau đó theo học tại trường múa chuyên tu (tu nghiệp chuyên môn) cho đến năm 1994 lại quay về với đoàn múa.\nKhi Hoài Linh có ý định theo múa, gia đình ông đã không đồng ý và tìm cách ngăn cản vì cha mẹ ông muốn anh theo ngành sư phạm nhưng vì vấn đề lý lịch nên không thành. Trong thời gian cộng tác với đoàn múa Ponaga, anh đã đi lưu diễn khắp các tỉnh miền Trung và một số tỉnh miền Nam.\nVũ sư Đặng Hùng là người đã dạy anh về bộ môn múa trong khi về dân ca thì ông tự học. Vào năm 1991, ông tham dự cuộc thi Những giọng hát hay tại Nha Trang và được giải thưởng. Tại Nha Trang, ông gặp Thanh Lộc (một diễn viên của ban kịch tỉnh Khánh Hòa mới giải tán, gia nhập đoàn Ponaga), mời ông phối hợp để làm một cặp hài diễn chung trong chương trình của đoàn. Hoài Linh vui vẻ nhận lời, hai người diễn thử và có kết quả tốt. Rồi từ đó anh chính thức bước vào lĩnh vực hài kịch. Lần diễn đầu tiên tại Diên Khánh với màn Tô Ánh Nguyệt tân thời với Thanh Lộc.\nHoài Linh còn có một năng khiếu đặc biệt khác là nói được nhiều giọng địa phương Việt Nam. Do khi di tản đến Long Khánh, ông đã có dịp nói chuyện với rất nhiều người đến từ các miền khác nhau, nhờ vậy nên Hoài Linh dễ thu nhập được để bắt chước được giọng của nhiều miền trong khi thường ngày anh vẫn nói giọng Quảng Nam với gia đình.\nNgoài khả năng về múa, hát dân ca, diễn hài, Hoài Linh còn hát được cả tân nhạc.",
    "aliases": [
      "hoài linh",
      "hoai linh",
      "nsut hoai linh",
      "sau banh",
      "vo hoai linh"
    ],
    "featured": true
  },
  {
    "slug": "kaity-nguyen",
    "name": "Kaity Nguyễn",
    "englishName": "Kaity Nguyễn",
    "country": "Việt Nam 🇻🇳",
    "countryCode": "vn",
    "gender": 1,
    "tags": [
      "Chính kịch",
      "Kinh dị",
      "Tình cảm"
    ],
    "roles": "Diễn viên điện ảnh xuất sắc",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/n78QM4icCLlhWLBn1eXhRSX21Lg.jpg",
    "tmdbPersonId": 1841663,
    "placeOfBirth": "Ho Chi Minh City, Vietnam",
    "bio": "Nguyễn Ngọc Bình An, thường được biết đến với nghệ danh Kaity Nguyễn (sinh ngày 9 tháng 4 năm 1999), là một nữ diễn viên kiêm người mẫu người Mỹ gốc Việt hiện đang hoạt động tại Việt Nam. Cô trở nên nổi tiếng với vai diễn Linh Đan trong bộ phim Em chưa 18 (2017).\n\nTuổi thơ:\n\nKaity Nguyễn sinh ngày 9 tháng 4 năm 1999 tại Thành phố Hồ Chí Minh với tên khai sinh là Nguyễn Ngọc Bình An. Theo lời Kaity thì bố mẹ cô đều là \"Việt kiều\". Khi lên lớp năm, cô đã cùng gia đình di cư sang Mỹ để sinh sống và học tập. Đến năm lớp tám, cô đã trở về Việt Nam để sinh sống, và vì có nhiều người thân ở Mỹ nên cô vẫn thường xuyên qua lại giữa 2 nước.\n\nPhim:\n\nĐiện ảnh:\n\n=",
    "aliases": [
      "kaity nguyễn",
      "kaity nguyen",
      "kaity"
    ],
    "featured": false
  },
  {
    "slug": "kieu-minh-tuan",
    "name": "Kiều Minh Tuấn",
    "englishName": "Kiều Minh Tuấn",
    "country": "Việt Nam 🇻🇳",
    "countryCode": "vn",
    "gender": 2,
    "tags": [
      "Hài",
      "Hành động",
      "Chính kịch"
    ],
    "roles": "Diễn viên điện ảnh",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/8htmGyEcsF9ClSHEkpQJWkHB7lL.jpg",
    "tmdbPersonId": 1330249,
    "birthday": "1988-02-26",
    "placeOfBirth": "Bà Rịa - Vũng Tàu, Việt Nam",
    "bio": "Kiều Minh Tuấn (sinh ngày 26 tháng 2 năm 1988) là một nam diễn viên người Việt Nam.\nAnh được biết đến và nổi tiếng qua các tác phẩm điện ảnh như: Bụi đời Chợ Lớn (2013), Scandal: Hào quang trở lại (2014), Em chưa 18 (2017), Lật mặt: Ba chàng khuyết (2018), Hạnh phúc của mẹ (2019), Anh trai yêu quái (2019), Nắng 3: Lời hứa của cha (2020), Chị Mười Ba: Ba ngày sinh tử (2020), Tiệc trăng máu (2020), Chìa khóa trăm tỷ (2022).\n\nThời thơ ấu:\n\nKiều Minh Tuấn sinh ra tại làng chài Phước Tỉnh, huyện Long Điền, tỉnh Bà Rịa - Vũng Tàu (nay thuộc xã Long Hải, Thành phố Hồ Chí Minh), là con thứ hai trong một gia đình làm nghề đi biển. Lúc Kiều Minh Tuấn được 8 tuổi cha anh qua đời. Mất đi lao động chính trong gia đình, cuộc sống của anh cùng mẹ, chị gái và hai em gái từ đó cũng trở nên khó khăn hơn. Sau khi tốt nghiệp cấp 3 anh thi vào trường Đại học Kiến Trúc TP HCM nhưng không trúng tuyển vì thiếu nửa điểm. Tuy nhiên anh đã đậu vào trường Đại học Sân khấu - Điện ảnh TP HCM và theo học tại đây cùng với các nghệ sĩ Vân Trang, Thái Quốc Nguyên, Sỹ Toàn vv...\n\nSự nghiệp:\n\nKiều Minh Tuấn xuất hiện lần đầu tiên bằng một vai quần chúng trong bộ phim truyền hình \"Cổng Mặt Trời\" (2010).\nVai chính đầu tiên của Kiều Minh Tuấn là một họa sĩ tên Thành trong bộ phim truyền hình \"Đời\" trong cùng năm. Anh đã gặp rất nhiều áp lực khi phải đảm đương một vai diễn lớn trong khi chưa có nhiều kinh nghiệm.\nNăm 2011, Kiều Minh Tuấn tham gia vở kịch đầu tiên tại sân khấu kịch 5B mang tên \"Chưa yêu sao hiểu\".Trong \"Chưa yêu sao hiểu\", Kiều Minh Tuấn vào vai Nam – một gã chuyên đòi nợ mướn nhưng rất có nghĩa khí. Vì hoàn cảnh của mình, nhân vật này chạy trốn tình yêu của Trâm – cô cháu gái của một gia đình giàu có.\nTrong thời gian đầu sự nghiệp Kiều Minh Tuấn chủ yếu tham gia các vai quần chúng, vai phụ trong phim điện ảnh lẫn phim truyền hình, song song với việc tham gia các tiểu phẩm hài. Anh chỉ bắt đầu được khán giả chú ý hơn qua vai diễn \"Tiến ngọng\" – một tên du côn trong bộ phim điện ảnh \"Bụi đời Chợ Lớn\". Đây là cây cười duy nhất trong bộ phim đầy bi thương, chết chóc. Giới chuyên môn nhận xét rằng anh sẽ tỏa sáng với \"Bụi đời Chợ Lớn\". Tuy nhiên \"Bụi đời Chợ Lớn\" gặp sự cố bị cấm chiếu và tung lên mạng, sự nghiệp của Kiều Minh Tuấn rơi vào khủng hoảng, suốt 2 năm liền anh không có lời mời đóng phim nào. Kinh tế dần trở nên khó khăn và anh phải mưu sinh bằng việc đi tấu hài ở các tụ điểm hằng đêm. Thời gian này Kiều Minh Tuấn đã nghĩ tới việc bỏ nghề.\nNăm 2014, cơ hội lần nữa đến với Kiều Minh Tuấn khi anh được đảm nhận vai phụ trong bộ phim điện ảnh \"Scandal 2: Hào quang trở lại\" của đạo diễn Victor Vũ. Kiều Minh Tuấn quyết định nắm lấy cơ hội cuối cùng này, nếu không thành công anh sẽ thật sự từ bỏ nghiệp diễn.Lối diễn hài hước, hoạt ngôn cùng gương mặt nhiều cảm xúc của anh tiếp tục gây ấn tượng mạnh với khán giả sau khi phim công chiếu và tiếp thêm động lực để anh đi tiếp trên con đường của một diễn viên.",
    "aliases": [
      "kiều minh tuấn",
      "kieu minh tuan"
    ],
    "featured": false
  },
  {
    "slug": "thu-trang",
    "name": "Thu Trang",
    "englishName": "Thu Trang",
    "country": "Việt Nam 🇻🇳",
    "countryCode": "vn",
    "gender": 1,
    "tags": [
      "Hài",
      "Hành động",
      "Chính kịch"
    ],
    "roles": "Hoa hậu hài • Nhà sản xuất",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/2CjKnc69UGBfmrQ5pW9YkrCoslR.jpg",
    "tmdbPersonId": 1841829,
    "birthday": "1984-01-01",
    "placeOfBirth": "Ho Chi Minh City, Vietnam",
    "bio": "Trần Ngọc Thu Trang, thường được biết đến với nghệ danh Thu Trang (sinh ngày 23 tháng 9 năm 1984), là một nữ diễn viên kiêm nhà sản xuất phim người Việt Nam. Cô được biết đến qua các vai diễn từ các bộ phim như Em là bà nội của anh, 798Mười, Tiệc trăng máu, Gia đình là số 1 và Thập Tam Muội.\n\nTiểu sử và sự nghiệp:\n\nTừ năm 2002, khi đang học năm nhất trường Cao đẳng Sân khấu – Điện ảnh Thành phố Hồ Chí Minh (sau là trường Đại học Sân khấu – Điện ảnh Thành phố Hồ Chí Minh), Trang đã bắt đầu đi diễn hài cùng các nghệ sĩ đàn anh để kiếm thêm thu nhập hỗ trợ cho gia đình. Sau 1 thời gian, Trang nhận được những lời mời đi đóng phim nên cuộc sống dần ổn định.\nTrang kết hôn với diễn viên Tiến Luật vào năm 2011. Cả 2 đã cùng nhau đóng những bộ phim, tham gia những gameshow truyền hình thực tế.\nTháng 12 năm 2014, Trang tham dự chương trình hài kịch Ơn giời cậu đây rồi.\nNăm 2016, Trang cùng chồng là diễn viên Tiến Luật làm giám khảo trong cuộc thi Đấu trường tiếu lâm.\nNăm 2020, Trang tham dự bộ phim Tiệc trăng máu và Chị Mười Ba - 3 ngày sinh tử (phần tiếp theo của bộ phim điện ảnh chuyển thể từ phim chiếu mạng trước đó Chị Mười Ba - Phần kết Thập Tam Muội).\n\nTác phẩm:",
    "aliases": [
      "thu trang",
      "hoa hau hai thu trang"
    ],
    "featured": false
  },
  {
    "slug": "viet-huong",
    "name": "Việt Hương",
    "englishName": "Việt Hương",
    "country": "Việt Nam 🇻🇳",
    "countryCode": "vn",
    "gender": 1,
    "tags": [
      "Hài",
      "Chính kịch",
      "Kinh dị"
    ],
    "roles": "Danh hài • Nữ nghệ sĩ nổi tiếng",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/9v9E5OM91kILN7zkkE2pBSRNHbZ.jpg",
    "tmdbPersonId": 1594383,
    "birthday": "1976-10-15",
    "placeOfBirth": "Saigon, Vietnam",
    "bio": "Nguyễn Việt Hương (sinh ngày 15 tháng 10 năm 1976), thường được biết đến với nghệ danh Việt Hương, là một nữ diễn viên, nghệ sĩ hài kiêm người dẫn chương trình truyền hình người Việt Nam.\n\nTiểu sử:\n\nViệt Hương sinh ra và lớn lên tại Thành phố Hồ Chí Minh. Cha bà là nghệ sĩ xiếc Nguyễn Lâm Bằng (1936–2019) và mẹ bà là Huỳnh Kiều Oanh (1943–2013).\nSau khi cha mẹ chia tay, bà đã trải qua những ngày tháng buồn nhất của cuộc đời vì thiếu vắng tình thương đầy đủ của gia đình. Để có tiền phụ giúp mẹ, bà phải trải qua rất nhiều công việc. Bà nhận show đi hát ở nhà hàng, quán ăn. Không chỉ đi hát, bà còn nhận làm cả những công việc lao động vất vả để kiếm tiền.\nViệt Hương từng theo học tại Trường Nghệ thuật Sân khấu II (nay gọi là Trường Đại học Sân khấu – Điện ảnh Thành phố Hồ Chí Minh) là học trò của nghệ sĩ Công Ninh khi còn học dự thính 1 năm trước khi chính thức trở thành sinh viên của trường. Lớp của bà do nghệ sĩ Minh Nhí chủ nhiệm, lúc đó bà đảm nhiệm vai trò lớp trưởng. Cùng lớp thời đó của bà có nhiều nghệ sĩ nổi tiếng sau này như Thúy Nga, Tiết Cương, Hạnh Thúy và Cao Minh Đạt.\nKể từ khi còn là sinh viên Trường Nghệ thuật Sân khấu II (nay gọi là Trường Đại học Sân khấu – Điện ảnh Thành phố Hồ Chí Minh), bà đã được Huy chương Bạc cho Diễn viên xuất sắc trong Hội diễn Sân khấu Kịch nói Chuyên nghiệp Toàn quốc vào năm 1995 với vai Liên trong vở Trò Đùa Người Lớn. Ngay sau khi tốt nghiệp vào năm 1997, bà được mời vào nhiều vai diễn kịch dài như vở Nữ Sinh, Hoài Thu Của Tôi... Từ năm 1998 đến 2004, bà là một trong những diễn viên chính của Sân khấu Kịch Sài Gòn (đường Pasteur, Quận 1). Năm 1999, bà một lần nữa giành được Huy chương Vàng cho Diễn viên Xuất sắc trong Liên hoan Sân khấu Chuyên nghiệp Toàn quốc.\nSau khi được mời diễn cùng nhiều nhóm hài đình đám thời đó, bà đã quyết định lập nhóm hài riêng của mình vào năm 2002. Ba năm liên tiếp, từ năm 2003 đến năm 2005, bà đoạt Nhóm Hài được yêu thích nhất trong Gala Cười (VTV3 – Đài Truyền hình Việt Nam). Tạp chí Sân khấu bình chọn bà làm Nữ Diễn viên xuất sắc nhất của năm 2004. Trong năm 2005, bà đoạt giải Mai Vàng cho Diễn viên Chính Kịch vở Sự cám dỗ dịu dàng, một trong những giải thưởng uy tín của Báo Người Lao động. Năm 2007, bà được khán giả bình chọn là Nghệ sĩ Hài được yêu thích nhất giải HTV Award (Đài truyền hình Thành phố Hồ Chí Minh). Bà còn lấn sân sang lĩnh vực sân khấu cải lương trong những vở Hoa đồng cỏ nội, Chiếc áo Thiên Nga, Thúy Kiều.\nTừ khi lấy nhạc sĩ, nhạc công saxophone Nguyễn Hoài Phương (người Mỹ gốc Việt), Việt Hương định cư tại California, Hoa Kỳ. Vào cuối năm 2007 cho đến nay, Việt Hương liên tục cộng tác với Trung tâm Thúy Nga và xuất hiện trong nhiều cuốn DVD Paris by Night, một sản phẩm giải trí được nhiều người xem nhất của người Việt tại hải ngoại.\nLà một trong số những diễn viên hài Việt Nam được yêu thích nhất, bà cùng bạn diễn Hoài Tâm lưu diễn khắp nơi trên thế giới như: Đức, Pháp, Ba Lan, Nga, Úc, New Zealand, Nhật Bản, Đài Loan, Singapore, Canada...",
    "aliases": [
      "việt hương",
      "viet huong",
      "danh hai viet huong"
    ],
    "featured": false
  },
  {
    "slug": "tuan-tran",
    "name": "Tuấn Trần",
    "englishName": "Trần Duy Tuấn",
    "country": "Việt Nam 🇻🇳",
    "countryCode": "vn",
    "gender": 2,
    "tags": [
      "Chính kịch",
      "Tình cảm",
      "Hành động"
    ],
    "roles": "Nam diễn viên Bố Già • Mai • Đất Rừng Phương Nam",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/6ruyYz6Lah3UYSuFYCR02jsAGRW.jpg",
    "tmdbPersonId": 2012866,
    "birthday": "1992-11-20",
    "placeOfBirth": "Ho Chi Minh City, Vietnam",
    "bio": "Trần Duy Tuấn (sinh ngày 20 tháng 11 năm 1992), thường được biết đến với nghệ danh Tuấn Trần, là một nam diễn viên kiêm người mẫu người Việt Nam.\n\nTiểu sử:\n\nTuấn Trần sinh ra và lớn lên tại Thành phố Hồ Chí Minh, trong một gia đình trung lưu, truyền thống không có ai theo nghệ thuật. Trải qua tuổi thơ không mấy hạnh phúc khi chứng kiến mẹ thường xuyên bị cha đánh đập, từ năm 3 tuổi đã phải theo mẹ rong ruổi khắp nơi bán vé số dạo mưu sinh, anh trở thành một chàng trai trưởng thành và sống nội tâm, cũng như phải đi làm từ rất sớm để lo cho bản thân, đỡ đần gánh nặng một phần kinh tế của gia đình. Tuấn Trần từng theo học chuyên ngành quản trị kinh doanh tại Đại học Sài Gòn, và sau khi vừa mới tốt nghiệp Đại học, anh đã biết là mình thích nghệ thuật và quyết định chuyển sang chủ đề đó.\n\nSự nghiệp:\n\nTrong một lần đi casting phim Mùa oải hương năm ấy, lúc đầu Tuấn Trần chỉ đi với mục đích lên tivi cho mẹ vui, nhưng không ngờ anh lại nhận được sự chú ý của nhiều vị đạo diễn. Sau khi có màn ra mắt khán giả khá thành công với vai diễn đầu tay trong bộ phim Mùa oải hương năm ấy, Tuấn Trần bắt tay cùng với ca sĩ Hari Won đóng chính trong MV \"Anh cứ đi đi\". Chưa dừng lại ở đó, anh chàng còn hợp tác với nữ diễn viên Hàn Quốc trong một số dự án web drama khác như Thiên ý, Gia đình Mén.\nAnh có vai diễn chính đầu tiên trong bộ phim Chị em nhà Đông Các, sau đó là những bộ phim khác cứ nối tiếp đến với anh như: Xưởng 13, Lao công bí ẩn, Chạm vào danh vọng, Kén mẹ chồng,… Với ngoại hình thư sinh, khuôn mặt điển trai, đó cũng là một lợi thế khiến Tuấn Trần dễ đóng đinh trong những vai diễn như công tử, con nhà giàu,... Thế nhưng anh luôn cố gắng để khắc phục bản thân, thử thách mình với những dạng vai diễn khác nhau, cố gắng thể hiện cảm xúc nhân vật thật đa dạng.\nCuối năm 2019, Tuấn Trần cho ra mắt web drama Thần chết tập sự cùng với sự tham dự của nhiều nghệ sĩ: Anh Đức, Emma, Đỗ Hoàng Dương, Bo Bắp… Đầu năm 2020, anh tham gia nhiều hoạt động diễn xuất với các dự án lớn như web drama đình đám Bố già của Trấn Thành, hay phim điện ảnh Sắc đẹp dối trá của đạo diễn Kay Nguyễn. Đầu tháng 7 năm 2020, anh cho ra mắt web drama tiếp theo mang tên Xin chào Papa, bộ phim cũng được khán giả đón nhận nhiệt tình.\nĐầu năm 2021, anh tham gia bộ phim điện ảnh Bố già dựa trên web drama cùng tên của Trấn Thành, trong phim anh vào vai Quắn, một nhân vật có nhiều cảm xúc, nhiều màu sắc, theo như chia sẻ của anh thì đây là vai diễn khó nhất anh từng đóng trong sự nghiệp điện ảnh của mình. Trong quá trình quay phim, anh đã bị chấn thương tay, nguyên nhân được cho là anh diễn xuất quá nhập tâm. Cũng theo tiết lộ của Tuấn Trần, anh đã phải giảm 9 kg để thay đổi phong cách hoàn toàn cho hợp vai nhân vật. Bố già đã khuấy đảo phòng vé Việt khi liên tục phá vỡ và lập nên những kỷ lục mới cho ngành phim điện ảnh Việt.",
    "aliases": [
      "tuấn trần",
      "tuan tran",
      "tran duy tuan"
    ],
    "featured": false
  },
  {
    "slug": "miu-le",
    "name": "Miu Lê",
    "englishName": "Lê Ánh Nhật",
    "country": "Việt Nam 🇻🇳",
    "countryCode": "vn",
    "gender": 1,
    "tags": [
      "Hài",
      "Tình cảm",
      "Chính kịch"
    ],
    "roles": "Em Là Bà Nội Của Anh • Cô Gái Đến Từ Hôm Qua",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/wX94axgpRMiP5dwYcPJMDepSutk.jpg",
    "tmdbPersonId": 1259011,
    "birthday": "1991-07-05",
    "placeOfBirth": "Saigon, Vietnam",
    "bio": "Lê Ánh Nhật (sinh ngày 5 tháng 7 năm 1991), thường được biết đến với nghệ danh Miu Lê, là một nữ ca sĩ kiêm diễn viên người Việt Nam. Cô bắt đầu sự nghiệp với vai trò diễn viên qua bộ phim truyền hình Những thiên thần áo trắng (2009) của đạo diễn Lê Hoàng, sau đó chuyển hướng sang ca hát và ghi dấu ấn bằng các bản hit như \"Giả vờ nhưng em yêu anh\", \"Yêu một người có lẽ\", \"Gác lại âu lo\", và đặc biệt là \"Vì mẹ anh bắt chia tay\" (2022) – ca khúc đạt vị trí số một trên bảng xếp hạng YouTube Top Trending Việt Nam và vượt 130 triệu lượt xem.\nỞ lĩnh vực diễn xuất, Miu Lê ghi dấu ấn qua các phim Em là bà nội của anh (2015) – tác phẩm từng lập kỷ lục doanh thu phòng vé Việt Nam, Cô gái đến từ hôm qua (2017), Chiếm đoạt (2023), và Đại tiệc trăng máu 8 (2026), cũng như tham gia lồng tiếng cho loạt phim hoạt hình quốc tế gồm Xì Trum 2 (2013), Những mảnh ghép cảm xúc (2015), và Kỷ băng hà 5: Trời sập (2016). Năm 2025, Miu Lê tham gia chương trình truyền hình thực tế Em xinh \"say hi\" và lọt vào top 10 chung cuộc, trước khi cô vướng vào bê bối sử dụng ma túy vào năm 2026.\n\nThân thế và giáo dục:\n\nMiu Lê có tên khai sinh là Lê Ánh Nhật, sinh ngày 5 tháng 7 năm 1991 tại tỉnh Thuận Hải (nay thuộc tỉnh Khánh Hòa), có quê gốc ở Huế, trong một gia đình Công giáo. Từ khi còn rất nhỏ, cô theo gia đình vào Thành phố Hồ Chí Minh sinh sống và lớn lên tại đây.\nKhi Miu Lê lên năm tuổi, cha cô sang Canada định cư; sau khi cô tốt nghiệp trung học phổ thông, mẹ cô cũng ra nước ngoài. Một mình ở lại Việt Nam từ sớm, Miu Lê sớm học cách tự lập. Cô từng học tại Trường Trung học phổ thông Võ Thị Sáu ở Thành phố Hồ Chí Minh, sau đó theo học đại học nhưng đã bỏ dở vào năm thứ hai để theo đuổi con đường nghệ thuật chuyên nghiệp. Miu Lê từng bày tỏ sự tiếc nuối về quyết định nghỉ học và cho rằng nếu có bằng cấp, bản thân sẽ có những bước tiến xa hơn trong sự nghiệp.\nCơ duyên đến với nghệ thuật của Miu Lê khá tình cờ. Mẹ cô cho cô theo học một lớp người mẫu để giữ dáng và giảm cân. Tại đây, cô được đạo diễn Lê Hoàng chú ý và mời tham gia một bộ phim nhưng dự án sau đó không được công chiếu.\n\nSự nghiệp:\n\n2009–2011: Khởi đầu và lấn sân ca hát:\n\nMiu Lê chính thức bước chân vào làng giải trí năm 2009 với vai July Miu – nữ chính trong bộ phim truyền hình Những thiên thần áo trắng của đạo diễn Lê Hoàng. Nghệ danh \"Miu Lê\" được ghép từ tên nhân vật July Miu và họ thật của cô.\nSau thành công ban đầu với diễn xuất, Miu Lê chuyển hướng sang ca hát vào cuối năm 2009 dưới sự quản lý của công ty NewGen Entertainment. Album đầu tay Công chúa mắt nai và các đĩa đơn \"Không gian vắng\", \"Riêng mình em\" chưa tạo được tiếng vang lớn. Đến cuối năm 2011, cô gia nhập Avatar Entertainment và thay đổi hoàn toàn phong cách âm nhạc lẫn hình ảnh. Các ca khúc \"Em nhớ anh\", \"Ngày anh xa\" liên tục lọt vào tốp đầu các bảng xếp hạng âm nhạc trong nước, giúp cô dần định vị được tên tuổi.\n\n2012–2015: Thăng hoa và \"Em là bà nội của anh\":",
    "aliases": [
      "miu lê",
      "miu le",
      "le anh nhat"
    ],
    "featured": false
  },
  {
    "slug": "ly-lien-kiet",
    "name": "Lý Liên Kiệt",
    "englishName": "Jet Li",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "gender": 2,
    "tags": [
      "Võ thuật",
      "Hành động",
      "Hollywood"
    ],
    "roles": "Vua Kungfu • Hoàng Phi Hồng",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/c4s8INzU0ZAujCQ1YmphCmcsNzl.jpg",
    "tmdbPersonId": 1336,
    "birthday": "1963-04-26",
    "placeOfBirth": "Beijing, China",
    "bio": "Lý Liên Kiệt (sinh ngày 26 tháng 4 năm 1963) là một nam diễn viên võ thuật nổi tiếng người Trung Quốc, ngoài ra ông còn là nhà sản xuất, nhà hoạt động từ thiện. Cho đến nay ông được mọi người biết đến qua hai vai diễn chính cùng tên trong hai bộ phim Hoàng Phi Hồng và Hoắc Nguyên Giáp, các vai diễn trong phim Anh hùng, Long môn phi giáp, Đầu danh trạng, Truyền thuyết Bạch Xà và Hoa Mộc Lan.\nVào năm 2017, Lý Liên Kiệt đã giới thiệu tới công chúng môn võ Công Thủ Đạo với tư cách là người sáng lập dựa trên nền tảng của Thái cực quyền.\n\nTiểu sử:\n\nLý Liên Kiệt tập wushu từ 8 tuổi với võ sư Ngô Bân, cùng một sư phụ với Chân Tử Đan, ông đã sớm bộc lộ năng khiếu và tư chất để trở thành một cao thủ.\nThuở nhỏ, giống như đàn anh Lý Tiểu Long, Lý Liên Kiệt không có một thể trạng tốt cho việc học võ. Ông yếu đuối, lại sống trong một gia đình có quá nhiều áp lực, nên nhiều lần đã định bỏ cuộc. Nhưng được sư phụ động viên, ông đã vượt qua được.\nNăm 1974, Lý Liên Kiệt mới 11 tuổi, đã trở thành nhà vô địch giải Wushu trẻ toàn Trung Quốc. Mọi người gọi ông là \"thần đồng võ thuật\". Lúc này Lý Liên Kiệt đã nhận được nhiều lời mời đóng phim và quảng cáo, nhưng nghĩ mình chưa đạt tới trình độ siêu đẳng, ông trở về với sư phụ Hồ Bình.\nTên tuổi của ông được nhiều người trên thế giới biết đến sau khi biểu diễn cho Tổng thống Hoa Kỳ Richard Nixon xem tại Nhà Trắng năm 1974.\nNhiều năm sau, Lý Liên Kiệt liên tục giật giải quán quân trong các kỳ thi võ thuật, với màn múa thương và kiếm rất đẹp mắt (1975, 1977, 1978). Đến năm 1979, ông đoạt giải thành tựu Vàng của Tổng hội võ thuật Trung Quốc khi mới 16 tuổi.\n3 năm sau, Lý Liên Kiệt tham gia bộ phim điện ảnh đầu tiên: Thiếu Lâm tự, bộ phim làm ngất ngây khán giả hâm mộ phim võ thuật, đưa tên tuổi của ông vào hàng ngôi sao mới của điện ảnh Trung Quốc, bắt đầu có ảnh hưởng đến khán giả ở Đông Nam Á, Nhật và Mỹ. Ông tiếp tục đóng các phim về Thiếu Lâm và gây được tiếng vang rất lớn.",
    "aliases": [
      "lý liên kiệt",
      "ly lien kiet",
      "jet li",
      "hoang phi hong"
    ],
    "featured": true
  },
  {
    "slug": "ngo-kinh",
    "name": "Ngô Kinh",
    "englishName": "Wu Jing",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "roles": "Chiến Lang • Ông hoàng phòng vé Trung Quốc",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/pgE2SqqtbT6dNo8waDMTpYuVVCj.jpg",
    "tmdbPersonId": 78871,
    "birthday": "1974-04-03",
    "placeOfBirth": "Beijing, China",
    "bio": "Ngô Kinh là một nam diễn viên, võ sĩ và đạo diễn người Trung Quốc. Anh nổi tiếng với thể loại phim truyền hình và điện ảnh võ thuật, với bước ngoặt đến từ Chiến lang (2015) – tác phẩm do anh giữ vai trò đạo diễn kiêm đóng chính. Một số bộ phim tiêu biểu khác của Ngô Kinh có thể kể đến Tiểu Lý phi đao (1999), loạt phim Sát Phá Lang, loạt phim Địa Cầu lưu lạc, Trận chiến hồ Trường Tân (2021), và Blades of the Guardians (2026). Anh từng xếp hạng 1 trong Danh sách 100 ngôi sao nổi tiếng Trung Quốc theo Forbes năm 2019 và thứ 23 năm 2020.",
    "aliases": [
      "ngô kinh",
      "ngo kinh",
      "wu jing",
      "chien lang"
    ],
    "featured": true,
    "gender": 2,
    "tags": [
      "Võ thuật",
      "Hành động",
      "Chính kịch"
    ]
  },
  {
    "slug": "luu-diec-phi",
    "name": "Lưu Diệc Phi",
    "englishName": "Crystal Liu",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "roles": "Thần Tiên Tỷ Tỷ • Mulan",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/cL6JccAYqiZQEAIEFObEUC9LTt7.jpg",
    "tmdbPersonId": 122503,
    "birthday": "1987-08-25",
    "placeOfBirth": "Wuhan, Hubei, China",
    "bio": "Lưu Diệc Phi, tên khai sinh An Phong, là một nữ diễn viên, người mẫu kiêm ca sĩ người Mỹ gốc Hoa. Được đánh giá là một trong những nữ diễn viên Trung Quốc xuất sắc nhất trong thế hệ của mình, cô đã nhiều lần xuất hiện trong danh sách 100 ngôi sao nổi tiếng nhất Trung Quốc theo Forbes và được vinh danh là một trong Tứ Tiểu Hoa Đán của Trung Quốc vào năm 2009. Bên cạnh đó, cô còn được biết đến rộng rãi với biệt danh \"Thần tiên tỷ tỷ\" ở Trung Quốc.",
    "aliases": [
      "lưu diệc phi",
      "luu diec phi",
      "crystal liu",
      "than tien ty ty"
    ],
    "featured": true,
    "gender": 1,
    "tags": [
      "Cổ trang",
      "Tình cảm",
      "Võ thuật"
    ]
  },
  {
    "slug": "trieu-le-dinh",
    "name": "Triệu Lệ Dĩnh",
    "englishName": "Zanilia Zhao",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "gender": 1,
    "tags": [
      "Cổ trang",
      "Chính kịch",
      "Tình cảm"
    ],
    "roles": "Nữ hoàng rating • Sở Kiều Truyện",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/kaVjQKPCrhTBlPGlyvbkCfq2TP5.jpg",
    "tmdbPersonId": 1260868,
    "birthday": "1987-10-16",
    "placeOfBirth": "中国, 河北, 廊坊",
    "bio": "Triệu Lệ Dĩnh (giản thể: 赵丽颖; phồn thể: 趙麗穎; bính âm: Zhào Lìyǐng; sinh ngày 16 tháng 10 năm 1987) là một nữ diễn viên người Trung Quốc.\n\nSự nghiệp:\n\n2006 - 2012: Khởi đầu sự nghiệp:\n\nNăm 2006, Triệu Lệ Dĩnh tham gia cuộc thi Ngôi sao tìm kiếm do Yahoo tổ chức và giành ngôi vị quán quân. Sau đó, cô ký hợp đồng với Hoa Nghị Huynh Đệ với tư cách là nghệ sĩ mới. Năm 2007, cô có vai diễn đầu tiên trên màn ảnh nhỏ trong bộ phim truyền hình đề tài gia đình Đám cưới vàng do đạo diễn Trịnh Hiểu Long thực hiện.\nNăm 2009, Triệu Lệ Dĩnh lần đầu tham gia một bộ phim cổ trang với vai diễn trong Thương Khung Chi Mão. Bộ phim được phát sóng trên kênh NHK của Nhật Bản và nhận được nhiều đánh giá tích cực từ giới chuyên môn. Nhờ màn thể hiện ấn tượng, cô đã giành giải Nữ diễn viên được yêu thích nhất tại Chinese Creative Short Video Awards.\nNăm 2010, Triệu Lệ Dĩnh bắt đầu được khán giả Trung Quốc đại lục chú ý khi tham gia bộ phim truyền hình Tân Hồng lâu mộng, được chuyển thể từ tiểu thuyết cùng tên của Tào Tuyết Cần. Đến năm 2011, tên tuổi của cô tiếp tục được biết đến rộng rãi hơn nhờ vai Công chúa Tình Nhi trong Tân Hoàn Châu Cách cách.\nNăm 2012, Triệu Lệ Dĩnh lần đầu đảm nhận vai nữ chính trong bộ phim truyền hình Thác điểm uyên ương (Se nhầm nhân duyên).\n\n2013 - 2015: Sự nghiệp đột phá của nàng tiểu hoa đán:\n\nNăm 2013, Triệu Lệ Dĩnh đảm nhận vai nữ chính trong bộ phim cổ trang Lục Trinh truyền kỳ, kể về hành trình của một cô gái xuất thân bình thường vươn lên trở thành nữ tể tướng đầu tiên trong lịch sử. Bộ phim đạt thành công lớn tại Trung Quốc, đồng thời được đón nhận tích cực ở nhiều quốc gia như Hàn Quốc và Nhật Bản, giúp tên tuổi của cô ngày càng được biết đến rộng rãi trong khu vực. Nhờ vai diễn này, Triệu Lệ Dĩnh cũng giành được nhiều giải thưởng dành cho diễn viên triển vọng và được yêu thích tại các lễ trao giải. Cùng năm, cô tiếp tục góp mặt với vai nữ chính trong bộ phim điện ảnh cổ trang Cung tỏa trầm hương. Khác với hình tượng hiền lành, trong sáng thường thấy, Triệu Lệ Dĩnh hóa thân thành một công chúa mưu mô, tàn nhẫn, cho thấy sự đa dạng trong khả năng diễn xuất của mình.\nNăm 2014, Triệu Lệ Dĩnh đảm nhận vai nữ chính trong bộ phim hài lãng mạn Sam Sam tới rồi, được chuyển thể từ tiểu thuyết cùng tên của Cố Mạn. Bộ phim đạt tỷ suất người xem cao trong thời gian phát sóng tại Trung Quốc và cũng nhận được sự yêu thích của khán giả ở nhiều quốc gia, góp phần đưa tên tuổi của cô vươn xa trên thị trường quốc tế. Cùng năm, cô tiếp tục ghi dấu ấn qua các bộ phim truyền hình Truy ngư truyền kỳ và Bí mật của người vợ đều nhận được sự quan tâm và đánh giá tích cực từ khán giả. Nhờ hàng loạt tác phẩm thành công, Triệu Lệ Dĩnh được trao danh hiệu Nữ thần Kim Ưng tại Liên hoan phim truyền hình Kim Ưng lần thứ 10 và vinh dự đảm nhận tiết mục mở màn của lễ trao giải.\nNăm 2015, Triệu Lệ Dĩnh đảm nhận vai nữ chính trong bộ phim truyền hình tiên hiệp Hoa Thiên Cốt.",
    "aliases": [
      "triệu lệ dĩnh",
      "trieu le dinh",
      "zhao liying",
      "zanilia zhao"
    ],
    "featured": true
  },
  {
    "slug": "duong-mich",
    "name": "Dương Mịch",
    "englishName": "Yang Mi",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "gender": 1,
    "tags": [
      "Cổ trang",
      "Tình cảm",
      "Chính kịch"
    ],
    "roles": "Tam Sinh Tam Thế • Nữ hoàng cổ trang",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/x5EsYXKH2Kdc6QPYhoaSoAsnsjw.jpg",
    "tmdbPersonId": 572043,
    "birthday": "1986-09-12",
    "placeOfBirth": "Beijing, China",
    "bio": "Dương Mịch (tiếng Trung: 杨幂, bính âm: Yáng Mì, sinh ngày 12 tháng 9 năm 1986) là một nữ diễn viên, người mẫu, ca sĩ và nhà sản xuất phim người Trung Quốc. Năm 2011, cô tham gia các phim truyền hình ăn khách như Cung toả tâm ngọc và phim điện ảnh Cô đảo kinh hoàng và nhanh chóng nổi tiếng, lấn sân sang nhiều lĩnh vực đầu tư và sản xuất phim truyền hình.\n\nTiểu sử:\n\nDương Mịch sinh ra trong gia đình cơ bản tại khu Tuyên Vũ (宣武区) nay được hợp nhất với quận Tây Thành, Bắc Kinh, Trung Quốc. Cha cô tên là Dương Hiểu Lâm (杨晓林) làm nghề cảnh sát, mẹ cô từng là giáo viên sau đó về làm nội trợ. Ba thành viên trong nhà đều mang họ \"Dương\" (杨), từ đó đặt tên cho cô theo chữ \"幂\"（có nghĩa là lũy thừa bậc 3 trong toán học). Bác ruột là giáo sư Dương Hiểu Kinh giảng dạy môn số học bậc cao tại Đại học Thanh Hoa.\nLúc nhỏ, Mịch khá nghịch ngợm và ít nói nên cha mẹ đã ghi danh con gái vào lớp đào tạo diễn xuất của Xưởng phim thiếu nhi Trung Quốc (中国儿童电影制片厂). Năm 1990, đoàn làm phim Đường Minh Hoàng (唐明皇) tới hãng phim để tuyển diễn viên nhí, khi đó cô bé Mịch 4 tuổi may mắn được chọn vào vai Hàm Nghi công chúa (咸宜公主) trong lịch sử.\nSự nghiệp diễn xuất của cô bắt đầu từ đó. Mịch trở thành diễn viên nhí trong phim cổ trang Võ Trạng nguyên Tô Khất Nhi (武状元苏乞儿), phim truyền hình Hầu Oa (猴娃) và một số phim khác sau đó. Mặc dù lúc đó Mịch còn nhỏ nhưng thái độ nghiêm túc của cô trên phim trường đã để lại ấn tượng sâu sắc với Lý Tiểu Uyển (李小婉), đạo diễn của phim Hầu Oa.\n\nSự nghiệp:\n\nNăm 2006, cô thủ vai Quách Tương trong Thần điêu đại hiệp của đạo diễn Vu Mẫn. Năm 2009, cô để lại nhiều ấn tượng cho khán giả với vai diễn Tuyết Kiến đóng cặp với Hồ Ca trong phim truyền hình Tiên kiếm kỳ hiệp 3. Năm 2011, bộ phim truyền hình Cung tỏa tâm ngọc mang tới thành công cho sự nghiệp phim ảnh của Mịch. Cô được mệnh danh nữ hoàng rating phim truyền hình 2012.\nBộ phim truyền hình Tam sinh tam thế thập lý đào hoa với sự tham gia của Dương Mịch lên sóng song song trên truyền hình vệ tinh Chiết Giang và Đông Phương vào ngày 30 tháng 1 năm 2017. Tại Đài Loan sẽ được phát sóng độc quyền bởi iQiyi Đài Loan. Vào tháng 2 năm 2017, bộ phim đã được lên sóng các kênh vệ tinh. Vào ngày phim truyền hình được phát sóng, tổng số lượt xem trên mạng internet đã vượt quá 30 tỷ lượt. Tính đến tháng 6/2020 bộ phim đạt hơn 54 tỷ lượt xem là bộ phim có lượt xem online cao nhất.\n\nĐầu tư:\n\nNgoài việc là một nghệ sĩ, Mịch tiếp tục mở rộng sự nghiệp của mình theo những cách khác: một mặt, cô trở thành cổ đông trong công ty Hoan Thuỵ Thế Kỷ. Mặt khác, sau khi độc lập phòng công tác riêng (studio), một công ty mới, công ty truyền thông Gia Hành được thành lập.\n\nRời công ty Gia Hành:",
    "aliases": [
      "dương mịch",
      "duong mich",
      "yang mi"
    ],
    "featured": true
  },
  {
    "slug": "tieu-chien",
    "name": "Tiêu Chiến",
    "englishName": "Xiao Zhan",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "gender": 2,
    "tags": [
      "Cổ trang",
      "Chính kịch",
      "Tình cảm"
    ],
    "roles": "Trần Tình Lệnh • Đỉnh lưu C-Biz",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/468n73j2sSJIbfZvsIZvDpvUaS8.jpg",
    "tmdbPersonId": 2084790,
    "birthday": "1991-10-05",
    "placeOfBirth": "Chongqing, China",
    "bio": "Tiêu Chiến (giản thể: 肖战; phồn thể: 肖戰; bính âm: Xiāo Zhàn, sinh ngày 5 tháng 10 năm 1991) là một diễn viên và ca sĩ người Trung Quốc. Tiêu Chiến bắt đầu bước chân vào làng giải trí khi tham gia chương trình sống còn thần tượng X-Fire và ra mắt với tư cách là thành viên của nhóm nhạc XNINE. Anh ấy bắt đầu sự nghiệp diễn xuất của mình vào năm 2016 và kể từ đó đã giành được sự chú ý rộng rãi với các bộ phim truyền hình của mình, bao gồm Trần Tình Lệnh (2019), Khánh Dư Niên (2019), Lang Điện Hạ (2020) và Đấu La Đại Lục (2021).\nVới tư cách là một ca sĩ, Tiêu Chiến đã phát hành một đĩa đơn \"Điểm Sáng\" vào cuối tháng 4 năm 2020. Với số lượng bán ra là 25,48 triệu bản, nó đã lập kỷ lục Guinness thế giới cho album kỹ thuật số bán nhanh nhất trong vòng 24 giờ kể từ phát hành. Vào ngày 22 tháng 4, anh xuất hiện trên sân khấu với vai chính trong phiên bản phim truyền hình dài 8 tiếng \"Như Mộng Chi Mộng\" ở Vũ Hán.\n\nTiểu sử:\n\nTiêu Chiến sinh ngày 5 tháng 10 năm 1991 tại Trùng Khánh, Trung Quốc. Từ nhỏ, Tiêu Chiến bắt đầu học vẽ và chơi violin. Tiêu Chiến theo học tại Học viện Thiết kế - Nghệ thuật trực thuộc Đại học Công thương Trùng Khánh. Trong những ngày học đại học, Tiêu Chiến đã tham gia đội hợp xướng nhà trường. Năm thứ hai Đại học, Tiêu Chiến cùng một số người bạn cùng nhau thành lập công ty chuyên thiết kế logo; đồng thời cũng cùng tham gia mở một studio nhiếp ảnh và là thợ ảnh chính. Sau khi tốt nghiệp đại học, Tiêu Chiến làm việc trong một công ty thiết kế trước khi ra mắt hoạt động nghệ thuật.\n\nSự nghiệp âm nhạc:\n\nTháng 6 năm 2015, sau lời giới thiệu của giáo viên, Tiêu Chiến tham gia chương trình truyền hình thực tế X-Fire, nơi anh được đào tạo để trở thành thần tượng cùng với 15 thực tập sinh khác. Anh cũng tham gia ghi hình chương trình Teen Channel của Tencent.\nSân khấu biểu diễn đầu tiên của anh ấy là tại Buổi hòa nhạc chào năm mới của Đài truyền hình Chiết Giang 2016, nơi anh ấy biểu diễn đĩa đơn \"Freeze\" cũng như bài hát chủ đề \"Be A Man\" cùng với các thành viên trong nhóm của mình. Anh ấy ra mắt cùng với 8 thực tập sinh khác trong nhóm nhạc thần tượng XNINE vào năm 2016, đảm nhận vị trí hát chính. XNINE phát hành mini album đầu tiên X Jiu vào tháng 9 năm 2016. Tháng 3 năm 2016, Tiêu Chiến nhận được đề cử cho giải thưởng thần tượng mới nổi tiếng nhất trong Lễ trao giải Phong Vân lần XVI (TOP Chinese Music Awards).\nNăm 2018, Xiao Zhan đã hát nhạc phim cho bộ phim truyền hình Ôi! Hoàng Đế Bệ Hạ Của Ta trong đó anh ấy cũng tham gia diễn xuất, có tựa đề \"Bước Theo Bóng Hình\".\nTừ năm 2019 đến năm 2021, Tiêu Chiến tiếp tục hát cho các bộ phim truyền hình mà anh đóng vai chính. Anh và Vương Nhất Bác đã phát hành bản song ca mang tên \"Vô Ky\" cho bộ phim truyền hình Trần Tình Lệnh. Đối với Khánh Dư Niên, Xiao Zhan đã hát bài hát chủ đề kết thúc \"Dư niên\". Tiêu Chiến cũng đóng góp vào OST của bộ phim truyền hình Đấu La Đại Lục năm 2021 của anh ấy với đĩa đơn \"Thiếu niên thúc ngựa\".",
    "aliases": [
      "tiêu chiến",
      "tieu chien",
      "xiao zhan"
    ],
    "featured": true
  },
  {
    "slug": "vuong-nhat-bac",
    "name": "Vương Nhất Bác",
    "englishName": "Wang Yibo",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "gender": 2,
    "tags": [
      "Cổ trang",
      "Hành động",
      "Chính kịch"
    ],
    "roles": "Vô Danh • Nhiệt Liệt • Đỉnh lưu",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/5akr656RvJX8hl1pa1qZckfiQeF.jpg",
    "tmdbPersonId": 1594612,
    "birthday": "1997-08-05",
    "placeOfBirth": "Luoyang, Henan, China",
    "bio": "Vương Nhất Bác (tiếng Trung: 王一博; bính âm: Wáng Yībó, tiếng Hàn: 왕이보, sinh ngày 5 tháng 8 năm 1997) là một ca sĩ, diễn viên, người dẫn chương trình và tay đua motor chuyên nghiệp người Trung Quốc. Anh là thành viên của nhóm nhạc nam Hàn-Trung UNIQ. Theo truyền thông Trung Quốc, anh hiện là một trong những ngôi sao có giá trị thương mại cao nhất tại Trung Quốc và cũng là một trong những lưu lượng hàng đầu được đánh giá cao, sở hữu nhiều tác phẩm phim ảnh nổi tiếng và âm nhạc ấn tượng.\n\nTuổi thơ và giáo dục ban đầu:\n\nVương Nhất Bác sinh ngày 5 tháng 8 năm 1997 tại Lạc Dương, Hà Nam, Trung Quốc. Anh bắt đầu học khiêu vũ khi còn nhỏ. Vào năm 2011, Vương Nhất Bác đã tham gia cuộc thi nhảy IBD, đạt được vị trí top 16 toàn quốc với thể loại hip-hop, sau đó anh trở thành thực tập sinh của Yuehua Entertainment. Trước khi ra mắt, Vương Nhất Bác được đào tạo tại YG Entertainment trong thời gian ngắn\n\nSự nghiệp:\n\n2014: Ra mắt với UNIQ:\n\nTừ năm 13 tuổi (năm 2011), khi đang còn là học sinh trung học, Vương Nhất Bác đã đăng ký tham gia cuộc thi nhảy toàn quốc I'm the best dancer và lọt vào top 16 người của team Hiphop. Từ cuộc thi này đã được phát hiện và trở thành thực tập sinh của công ty Yuehua Entertainment.\nHai năm sau đó, được công ty đưa sang Hàn Quốc đào tạo và thực tập tại công ty YG Entertainment trong chương trình hợp tác đào tạo giữa YG và Yuehua.\nNgày 16 tháng 10 năm 2014, Vương Nhất Bác chính thức ra mắt trong nhóm nhạc nam Hàn Quốc-Trung Quốc UNIQ trên sân khấu M! Countdown với bài hát \"Falling in Love\" cùng với các thành viên Châu Nghệ Hiên, Lý Vấn Hàn, Kim Sungjoo và Cho Seung-youn, đảm nhiệm vai trò nhảy chính, rapper và là thành viên ít tuổi nhất trong nhóm\n\n2016 - 2017: Phát triển cá nhân:\n\nTừ năm 2016, Vương Nhất Bác đã đẩy mạnh tham gia các hoạt động cá nhân trên nhiều lĩnh vực khác nhau như người dẫn chương trình, đóng phim và âm nhạc.\nTháng 1 năm 2016, tham gia chương trình nổi tiếng Ngày ngày tiến lên (Thiên thiên hướng thượng/Day day up/天天向上) với vai trò thành viên của \"Thiên thiên tiểu huynh đệ\". Ngày 29 tháng 4 năm 2016, trở thành MC chính thức của chương trình, thành viên của \"Thiên thiên huynh đệ\". Đây là bước phát triển quan trọng trong sự nghiệp giúp Vương Nhất Bác nổi tiếng và được công chúng biết đến. Cuối 2016, được bình chọn là một trong \"Tứ tiểu thiên vương sinh sau năm 1995\" tại Trung Quốc đại lục.\nNăm 2016, tham gia diễn xuất lần đầu trong hai bộ phim điện ảnh Đối tác hoàn hảo và Im lặng! Yêu đi. Sau đó, tham gia phim Đại thoại Tây du 3 trong vai Hồng Hài Nhi. Cùng năm nhận vai thứ chính trong bộ phim Thanh đạm là mỹ vị nhân gian hợp tác với Trần Kiều Ân và Đồng Đại Vỹ.\nNăm 2017, lần đầu tiên đảm nhận vai nam chính Đằng Tịnh trong bộ phim tiên hiệp hiện đại Học viện tư lập Thục Sơn. Cuối năm 2017, đóng vai nam chính trong bộ phim hài thanh xuân Năng lực siêu phàm (Super Talent).\n\n2018 - nay: Danh tiếng tăng cao:",
    "aliases": [
      "vương nhất bác",
      "vuong nhat bac",
      "wang yibo"
    ],
    "featured": true
  },
  {
    "slug": "dich-le-nhiet-ba",
    "name": "Địch Lệ Nhiệt Ba",
    "englishName": "Dilraba Dilmurat",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "gender": 1,
    "tags": [
      "Cổ trang",
      "Tình cảm",
      "Chính kịch"
    ],
    "roles": "Mỹ nhân Tân Cương • Em Là Niềm Kiêu Hãnh Của Anh",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/vrgYSOBnySesIUS5XvyjSYz7qZ0.jpg",
    "tmdbPersonId": 1557698,
    "birthday": "1992-06-03",
    "placeOfBirth": "Urumqi, Xinjiang, China",
    "bio": "Địch-Lệ-Nhiệt-Ba Địch-Lực-Mộc-Lạp-Đề (tiếng Duy Ngô Nhĩ: دىلرەبا دىلمۇرات Dilraba Dilmurat, tiếng Trung: 迪丽热巴·迪力木拉提; bính âm: Dílìrèbā Dílìmùlātí, sinh ngày 3 tháng 6 năm 1992), thường được gọi tắt là Địch Lệ Nhiệt Ba hoặc Nhiệt Ba, là một nữ diễn viên, ca sĩ và người mẫu người Trung Quốc. Cô là người dân tộc Duy Ngô Nhĩ đến từ Ürümqi, Tân Cương.\n\nTiểu sử:\n\nNhiệt Ba sinh ngày 3 tháng 6 năm 1992 tại thành phố Ürümqi, Tân Cương, Trung Quốc. Cha cô là Dilmurat Abdullah, là ca sĩ đơn ca, được trao tặng danh hiệu \"Diễn viên hạng nhất quốc gia\" thuộc Đoàn Ca múa nhạc Tân Cương. Chịu ảnh hưởng lớn từ cha, Nhiệt Ba từ nhỏ đã tỏ ra hứng thú với các bộ môn nghệ thuật, cô cũng chủ động theo học đàn piano, violin, vũ đạo, các loại hình nghệ thuật. Tên đầy đủ Dilraba Dilmurat là tên khai sinh do chính cha cô đặt. Tên gọi này theo tiếng Duy Ngô Nhĩ mang ý nghĩa là người đẹp của lòng tôi và cũng là hàm ý mà cha cô muốn nhắn gửi cho cả thế giới biết rằng con gái ông ấy là người đẹp yêu dấu nhất trong lòng ông ấy.\nNăm 2001, Nhiệt Ba mới 9 tuổi đã được cha đưa đến Học viện Nghệ thuật dự thi, lúc đó cô nghĩ chỉ là tham gia lớp văn nghệ, sau khi trúng tuyển Nhiệt Ba mới biết đó là Học viện Vũ đạo chuyên nghiệp. Nhiệt Ba cũng bắt đầu theo học múa dân tộc từ đây.\nNăm 2007, sau khi tốt nghiệp Trường Trung cấp Nghệ thuật trực thuộc Học viện Nghệ thuật Tân Cương (chuyên ngành biểu diễn múa), cô trở thành diễn viên múa của đoàn Ca múa nhạc Tân Cương. Năm 2009, Nhiệt Ba học một năm dự bị tại Trường đại học Sư Phạm Đông Bắc ở Jilin, đồng thời trong thời gian này cô tham gia Cuộc thi Tân Ca dành cho các dân tộc thiểu số lần thứ nhất của tỉnh Cát Lâm (吉林省首届少数民族新歌大赛) và đạt được giải ba chung cuộc. Năm 2010, cô nhập học khoa biểu diễn của Học viện Hí kịch Thượng Hải, chuyên ngành kịch, điện ảnh và truyền hình. Cùng năm đó, cô tham gia thử vai cho dự án mới The Last Supper của đạo diễn Lục Xuyên.\nNăm 2013, Nhiệt Ba chính thức ra mắt với vai chính trong bộ phim truyền hình A Na Nhĩ Hãn. Năm 2014, cô tốt nghiệp Học viện Hí Kịch Thượng Hải khoa biểu diễn và gia nhập công ty Gia Hành Thiên Hạ, bắt đầu bước chân vào giới giải trí.\nNăm 2014, Nhiệt Ba tốt nghiệp Học viện Hý kịch Thượng Hải khoa biểu diễn.\n\nSự nghiệp:\n\n2011 - 2016 - Khởi đầu sự nghiệp:",
    "aliases": [
      "địch lệ nhiệt ba",
      "dich le nhiet ba",
      "dilraba dilmurat"
    ],
    "featured": true
  },
  {
    "slug": "duong-duong",
    "name": "Dương Dương",
    "englishName": "Yang Yang",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "gender": 2,
    "tags": [
      "Cổ trang",
      "Tình cảm",
      "Chính kịch"
    ],
    "roles": "Yêu Em Từ Cái Nhìn Đầu Tiên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/lEBuoN1XItYMLpgsMmtORrEx1BY.jpg",
    "tmdbPersonId": 1635792,
    "birthday": "1991-09-09",
    "placeOfBirth": "Shanghai, China",
    "bio": "Dương Dương (giản thể: 杨洋; phồn thể: 楊洋, tiếng Latinh: Yang Yang, sinh ngày 9 tháng 9 năm 1991) là một nam diễn viên Trung Quốc. Anh được khán giả biết đến với vai diễn Tào Thực trong phim truyền hình Tân Lạc Thần. Năm 2008, anh được chọn vào vai Giả Bảo Ngọc trong phim Tân Hồng Lâu Mộng (2010). Năm 2015, anh gây ấn tượng với nhiều vai diễn: sư huynh Taekwondo Cố Nhược Bạch với nhiệt huyết tuổi trẻ (Thiếu nữ toàn phong), một Trương Khởi Linh lạnh lùng hết lòng vì bạn (Đạo mộ bút ký), hóa thân thành Vô Tình lạnh nhạt với trái tim chung của Tân thiếu niên tứ đại danh bổ, Hứa Dực nổi loạn cùng chuyện tình buồn với Ba Lạp và Lý Nhĩ (Tả Nhĩ). Năm 2016, Dương Dương sắm vai Tiêu Nại trong Yêu em từ cái nhìn đầu tiên (2016). Và mới đây nhất là Thả Thí Thiên Hạ vai Hắc Phong Tức/Phong Lan Tức (2022). Hiện tại, Dương Dương được đánh giá là nam diễn viên trẻ đầy triển vọng của nền điện ảnh Trung Quốc và Châu Á. ...\n\nTiểu sử:\n\nDương Dương từng có ý định ghi danh vào Trường múa Thượng Hải (nay thuộc Học viện Hí kịch Thượng Hải) nhưng sau đó quyết định theo học khoa vũ đạo tại Học viện Nghệ thuật Quân đội Giải phóng Nhân dân Trung Quốc và tốt nghiệp năm 2008. \n\nSự nghiệp:\n\nTháng 12 năm 2008, kiệt tác kinh điển Hồng Lâu Mộng được phục chế, đoàn làm phim lựa chọn từ Học viện Nghệ thuật Quân đội Giải phóng Nhân dân Trung Quốc ra 15 diễn viên để thi tuyển, trong đó có Dương Dương. Sau khi đạo diễn Lý Thiếu Hồng tự mình chọn lựa, Dương Dương cuối cùng trở thành người sắm vai Giả Bảo Ngọc trưởng thành trong Tân Hồng Lâu Mộng.\nNăm 2010, Tân Hồng Lâu Mộng phát sóng, Dương Dương từ bộ phim này đã đạt được giải thưởng \"Diễn viên mới xuất sắc nhất\"  trên \"Bảng bầu chọn người yêu thích thường niên của tạp chí BQ\". Cho dù nhận được nhiều phản hồi trái chiều nhau từ dư luận, nhưng theo độ nổi của bộ phim đầu tiên mình tham gia này, Dương Dương cũng bắt đầu nghiệp diễn của mình kể từ đây.\nNăm 2011, Dương Dương nhận được vai chính trong bộ phim thứ hai của mình, Giai điệu tuổi trẻ, phim giờ vàng do đài truyền hình Trung ương Trung Quốc phát sóng, đóng Ninh Hạo. Ngày 15/6, bộ phim điện ảnh lần đầu tiên Dương Dương tham gia Kiến Đảng Vĩ Nghiệp chính thức công chiếu, doanh thu phòng bán vé đột phá 3 triệu nhân dân tệ. Vai của Dương Dương trong phim là Dương Khai Trí, anh trai của Dương Khai Tuệ (nữ chính).\nNgày 23/3/2012, Dương Dương, Hoắc Tư Yến, Quy Á Lôi, Lam Chính Long, cùng chờ đợi bộ phim mình giữ vai chính Ẩm thực nam nữ 2012 được công chiếu. Đây là phim điện ảnh thứ hai của Dương Dương. Ngày 21/9, Dương Dương đóng vai chính trong phim điện ảnh Nước mắt chiến tranh, Giang Tô vệ thị phát hành, diễn tiểu hồng quân công nông Trung Quốc – Đỗ Trường Hữu.\nNăm 2013, Dương Dương tham gia Tân Lạc Thần Truyền Kỳ của Giản Viễn Tín, là nam chính Tào Thực, được bầu là Tào Thực hay nhất từ trước đến nay. Tháng 6, Dương Dương lại cùng Trương Hàn, Cổ Thanh chờ bộ phim cổ trang thần bí võ hiệp Tân thiếu niên tứ đại danh bộ hoàn thành, Dương Dương trong vai Vô Tình.",
    "aliases": [
      "dương dương",
      "duong duong",
      "yang yang"
    ],
    "featured": false
  },
  {
    "slug": "thanh-long",
    "name": "Thành Long",
    "englishName": "Jackie Chan",
    "country": "Hồng Kông 🇭🇰",
    "countryCode": "hk",
    "gender": 2,
    "tags": [
      "Võ thuật",
      "Hành động",
      "Hài"
    ],
    "roles": "Vua hài võ thuật • Huyền thoại điện ảnh",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/nraZoTzwJQPHspAVsKfgl3RXKKa.jpg",
    "tmdbPersonId": 18897,
    "birthday": "1954-04-07",
    "placeOfBirth": "Victoria Peak, Hong Kong",
    "bio": "Phòng Sĩ Long (tiếng Trung: 房仕龍, tiếng Anh: Fang Shi-long), tên khai sinh là Trần Cảng Sinh  (tiếng Trung: 陳港生, tiếng Anh: Chan Kong-sang), hay thường được biết đến với nghệ danh Thành Long (giản thể: 成龙; phồn thể: 成龍; bính âm: Chéng Lóng; Việt bính: Cheng2 Lung2, tiếng Anh: Jackie Chan; sinh ngày 7 tháng 4 năm 1954), là một nam diễn viên, chỉ đạo võ thuật kiêm nhà làm phim người Hồng Kông. Được mệnh danh là \"vua hành động của châu Á\", ông được đánh giá là một trong những nhân vật điện ảnh nổi tiếng và có tầm ảnh hưởng nhất trên toàn thế giới.\nXuyên suốt sự nghiệp của mình, ông nhận được sự hâm mộ rộng rãi ở cả hai bán cầu Đông và Tây, và đã được lưu danh trên Đại lộ Ngôi sao Hồng Kông và Đại lộ Danh vọng Hollywood. Ông được giới thiệu trong nhiều bài hát nhạc pop, phim hoạt hình và trò chơi điện tử. Ông là một ca sĩ được đào tạo bài bản và cũng là một ngôi sao của dòng nhạc Cantopop và Mandopop, đã phát hành một số album và bài hát nhạc phim mà ông thủ vai chính. Ông cũng là một nhà từ thiện nổi tiếng toàn cầu và được tạp chí Forbes vinh danh là một trong 10 người nổi tiếng làm từ thiện nhiều nhất. Năm 2015, Forbes ước tính giá trị tài sản ròng của ông là 350 triệu USD và tính đến năm 2016, ông là diễn viên kiếm tiền nhiều thứ hai trên thế giới.\nKể từ năm 2013, Thành Long là một chính trị gia thân Đảng Cộng sản, từng đảm nhận hai nhiệm kỳ làm đại biểu của Hội nghị Hiệp thương Chính trị Nhân dân Trung Quốc. Với những đóng góp to lớn cho ngành điện ảnh Hồng Kông, Trung Quốc và Hollywood, ông được Viện Hàn lâm Khoa học và Nghệ thuật Điện ảnh trao giải Oscar danh dự vào năm 2016.\n\nTiểu sử:\n\nThành Long sinh ngày 7 tháng 4 năm 1954 tại Núi Thái Bình, Hồng Kông với tên khai sinh là Trần Cảng Sinh (tiếng Trung: 陳港生; nghĩa đen 'sinh ra ở Hồng Kông'). Quê tổ của ông tại huyện Vu Hồ, tỉnh An Huy. Cha mẹ ông là những người di cư do cuộc Nội chiến Trung Quốc. Ông có biệt danh là Pháo Pháo (tiếng Trung: 炮炮) vì sở thích lăn lộn khi còn nhỏ của mình. Do cha mẹ ông làm việc cho Lãnh sự quán Pháp tại Hồng Kông, Thành Long đã trải qua thời ấu thơ tại khu vực của lãnh sự quán ở quận Núi Thái Bình.\nThành Long đi học trường Tiểu học Nah-Hwa ở Đảo Hồng Kông, năm học đầu tiên ông bị ở lại lớp, rồi bỏ học do cha mẹ rút tên ông khỏi trường. Vào năm 1960, cha ông nhập cư vào Canberra, Úc để làm bếp trưởng cho đại sứ quán Hoa Kỳ, Thành Long được gửi tới học tại Học viện Hý kịch Trung ương, một ngôi trường do sư phụ Vu Chiêm Nguyên điều hành.\nThành Long đã phải trải qua quá trình huấn luyện khắt khe trong thời gian dài, đặc biệt là huấn luyện về võ thuật và nhào lộn. Ông gia nhập nhóm Thất Tiểu Phúc, một nhóm gồm những học sinh xuất sắc nhất của trường được chọn để đi đóng phim, và lấy nghệ danh là Nguyên Lâu để tỏ lòng kính trọng sư phụ. Thành Long trở nên thân thiết với các thành viên trong nhóm như Hồng Kim Bảo và Nguyên Bưu.",
    "aliases": [
      "thành long",
      "thanh long",
      "jackie chan",
      "chan kong-sang",
      "sing lung"
    ],
    "featured": true
  },
  {
    "slug": "chau-nhuan-phat",
    "name": "Châu Nhuận Phát",
    "englishName": "Chow Yun-fat",
    "country": "Hồng Kông 🇭🇰",
    "countryCode": "hk",
    "roles": "Thần Bài • Bến Thượng Hải • Huyền thoại",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/yATfb52VXqGjQksjo9wf4WYu2pQ.jpg",
    "tmdbPersonId": 1619,
    "birthday": "1955-05-18",
    "placeOfBirth": "Hong Kong, China",
    "bio": "Châu Nhuận Phát là một nam diễn viên người Hồng Kông, được biết đến khi hợp tác với đạo diễn Ngô Vũ Sâm trong các bộ phim hành động xã hội đen như Anh hùng bản sắc, Điệp huyết song hùng, và Lạt thủ thần thám, và ở phương Tây với các vai Lý Mộ Bạch trong Ngọa hổ tàng long và Sao Feng trong Cướp biển vùng Caribbean 3: Nơi tận cùng thế giới. Ông chủ yếu đóng phim chính kịch, và đã giành được ba Giải thưởng Điện ảnh Hồng Kông cho Nam diễn viên xuất sắc nhất và hai Giải Kim Mã cho Nam diễn viên xuất sắc nhất ở Đài Loan.",
    "aliases": [
      "châu nhuận phát",
      "chau nhuan phat",
      "chow yun-fat",
      "than bai"
    ],
    "featured": true,
    "gender": 2,
    "tags": [
      "Hành động",
      "Tội phạm",
      "TVB"
    ]
  },
  {
    "slug": "chau-tinh-tri",
    "name": "Châu Tinh Trì",
    "englishName": "Stephen Chow",
    "country": "Hồng Kông 🇭🇰",
    "countryCode": "hk",
    "gender": 2,
    "tags": [
      "Hài",
      "Võ thuật",
      "TVB"
    ],
    "roles": "Vua Hài Kịch • Đạo diễn điện ảnh",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/j5DWs54BGZfp92G43c9OyHPvkNG.jpg",
    "tmdbPersonId": 57607,
    "birthday": "1962-06-22",
    "placeOfBirth": "Hong Kong, British Crown Colony [now China]",
    "bio": "Châu Tinh Trì (giản thể: 周星驰; phồn thể: 周星馳; bính âm: Zhōuxīngchí; Việt bính: Zau1 Sing1ci4, tiếng Anh: Stephen Chow Sing-chi, sinh ngày 22 tháng 6 năm 1962) là một nam nhà làm phim, cựu diễn viên kiêm nghệ sĩ hài người Hồng Kông. Được mệnh danh là \"vua hài châu Á\", ông được đánh giá là một trong những diễn viên hài vĩ đại nhất mọi thời đại của điện ảnh Hồng Kông.\nNgoài sự nghiệp diễn xuất, ông còn được biết đến với vai trò là đạo diễn. Hai tác phẩm Đội bóng Thiếu Lâm và Tuyệt đỉnh Kungfu của ông đều được giới chuyên môn và khán giả đánh giá cao và giành được vô số giải thưởng cao quý, trong đó có Phim hay nhất và Đạo diễn xuất sắc nhất cho cá nhân ông tại giải thưởng điện ảnh Hồng Kông.\nÔng còn là cố vấn chính trị của Hội nghị Hiệp thương Chính trị Nhân dân Trung Quốc.\n\nTiểu sử:\n\nChâu Tinh Trì sinh ngày 22 tháng 6 năm 1962 tại Cửu Long, Hồng Kông thuộc Anh. Ông là con của Lăng Bảo Nhi (凌寶兒), một cựu sinh viên của Đại học Sư phạm Quảng Châu, và Châu Dịch Thượng (周驛尚), một người nhập cư từ Ninh Ba, Chiết Giang. Ông có một chị gái tên là Châu Văn Cơ (周文姬) và một em gái tên là Châu Tinh Hà (周星霞). Sau khi cha mẹ ly hôn khi ông bảy tuổi, Châu Tinh Trì được mẹ nuôi dưỡng. Châu Tinh Trì theo học trường tiểu học Heep Woh, một trường truyền giáo trực thuộc Hội đồng Giáo hội Cơ Đốc giáo Trung Hoa tại Hồng Kông trên đường Prince Edward, bán đảo Cửu Long. Khi lên chín tuổi, ông xem phim Đường Sơn đại huynh của Lý Tiểu Long, bộ phim đã truyền cảm hứng cho ông trở thành một ngôi sao võ thuật. Ông học trường trung học San Marino, nơi ông học cùng với Lý Quang Diệu. Sau khi tốt nghiệp, ông tham gia các lớp diễn xuất của TVB. \n\nSự nghiệp:\n\nKhi còn nhỏ, Châu Tinh Trì rất thích Kung fu nhưng phải học võ qua truyền hình vì cha mẹ ông không đủ tiền cho con theo học các lớp chính quy. Sau đó thì ông theo học Vịnh Xuân quyền và trở thành một người hâm mộ diễn viên Lý Tiểu Long. Cho đến tận ngày nay, ông vẫn giữ niềm đam mê này và những bộ phim của Châu Tinh Trì thường có những cảnh gợi nhớ đến những tác phẩm Lý Tiểu Long tham gia diễn xuất. Cụ thể trong bộ phim Tuyệt đỉnh Kungfu của mình, Châu Tinh Trì đã mượn chiếc quần của Lý Tiểu Long từ người con gái của họ Lý. Nhiều động tác võ thuật và phong cách trình diễn được Châu Tinh Trì thể hiện lấy cảm hứng từ Lý Tiểu Long.\nChâu Tinh Trì tốt nghiệp lớp diễn viên của hãng TVB năm 1982 và bắt đầu tham gia vào công nghiệp giải trí với vai trò người dẫn chương trình cho tiết mục thiếu nhi 430 Shuttle của đài TVB. Trong hơn 5 năm, anh cũng tham gia vào một số phim truyền hình của TVB nhưng không có vai diễn nào nổi bật, và anh vẫn chỉ là một diễn viên ít được chú ý.\nBước ngoặt trong sự nghiệp diễn xuất của Châu Tinh Trì đến khi ông tham gia bộ phim Final Justice - Phích lịch tiên phong (1988). Trong bộ phim này, Châu Tinh Trì đóng vai Boy, một tên trộm xe và thần tượng một thẩm phán biến chất vừa ra tù.",
    "aliases": [
      "châu tinh trì",
      "chau tinh tri",
      "stephen chow",
      "tinh gia",
      "vua hai kịch"
    ],
    "featured": true
  },
  {
    "slug": "chan-tu-dan",
    "name": "Chân Tử Đan",
    "englishName": "Donnie Yen",
    "country": "Hồng Kông 🇭🇰",
    "countryCode": "hk",
    "roles": "Nhất đại tông sư Diệp Vấn",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/hTlhrrZMj8hZVvD17j4KyAFWBHc.jpg",
    "tmdbPersonId": 1341,
    "birthday": "1963-07-27",
    "placeOfBirth": "Guangzhou, Guangdong, China",
    "bio": "Chân Tử Đan (tiếng Trung: 甄子丹, tiếng Anh: Donnie Yen Ji-dan, sinh ngày 27 tháng 7 năm 1963) là một nam diễn viên, võ sư, chỉ đạo võ thuật kiêm nhà làm phim người Hồng Kông. Ông nổi tiếng trên màn ảnh truyền hình và màn ảnh rộng qua những vai diễn có sử dụng võ thuật, và được đánh giá là một trong những ngôi sao võ thuật hàng đầu của châu Á và Hollywood.\nVề diễn xuất, ông từng hai lần nhận được đề cử giải Kim Tượng. Ông được xem là người trẻ nhất trong số những nhà chỉ đạo võ thuật xuất sắc nhất thế giới, từng nhiều lần được trao giải thưởng về chỉ đạo võ thuật tại các liên hoan phim Hồng Kông và châu Á.\n\nTiểu sử:\n\nChân Tử Đan sinh ra ở Quảng Châu, Quảng Đông, Trung Quốc, là con của nữ danh sư Thái cực quyền Mạch Bảo Thiền (麥寶嬋) và ông Chân Vân Long (甄雲龍), một nhà biên tập báo. Năm hơn 1 tuổi, ông theo ba tới Hồng Kông, trong khi mẹ ở lại Quảng Đông vì lý do thủ tục. Đến năm 9 tuổi mẹ ông mới sang được Hồng Kông, gia đình lại chuyển sang Boston, tiểu bang Massachusetts, Hoa Kỳ, nơi mẹ ông sẽ mở viện nghiên cứu võ thuật Trung Hoa. Bấy giờ ông rất tích cực học võ và đàn dương cầm cổ điển. Người em gái của ông, cô Chân Tử Tinh (甄子菁) cũng có học võ, sau này cũng trở thành diễn viên, sau khi tham gia bộ phim Adventures of Johnny Tao: Rock Around the Dragon.\nTừ nhỏ ông rất thích học và nghiên cứu võ thuật, từng là đệ tử của nhiều phái võ khác nhau như Thái Cực Đạo, Wushu. Thần tượng của ông lúc này là Lý Tiểu Long, ông hâm mộ đến mức bắt chước cột một dải lụa ở ống chân để giắt cây côn nhị khúc. Sự say mê võ thuật khiến ông lơ là, chán nản việc học. Ông bỏ học, gia nhập băng đảng và thường tham gia những cuộc đánh lộn, có khi băng đảng của ông đã gây ra án mạng. Điều đó khiến cha mẹ ông lo sợ, họ đưa ông trở về Quảng Đông.\nTrở về quê nhà, ông đi theo con đường của một võ sĩ Wushu. Ông đến Bắc Kinh để luyện tập trong đội tuyển Wushu Trung Quốc. Thời gian đầu ông đến Quảng Châu tập luyện với võ sư Lý. Ông Lý là người đã làm cho Chân Tử Đan bỏ đi phong cách Híp-pi lập dị kiểu Mĩ. Thời gian này ông còn học võ với sư phụ Ngô Bân, người từng dạy võ cho Lý Liên Kiệt.\nNăm 1983, khi sắp trở về Mĩ, Chân Tử Đan làm một chuyến du lịch ở Hồng Kông. Lúc này đạo diễn Viên Hoà Bình đang quay phim Tiếu Thái Cực, ông đã tìm rất lâu nhưng không ra một nam diễn viên phù hợp cho vai chính. Chị của Viên Hòa Bình, người từng theo học võ của mẹ Chân Tử Đan, đã giới thiệu \"con trai của Mạch sư phụ\" cho họ Viên, và Viên Hoà Bình đã mời ông thử đóng bộ phim Thiên sư chàng tà của ông Viên, trong vai trò một người đóng thế.\n\nSự nghiệp:\n\nThời gian đầu:",
    "aliases": [
      "chân tử đan",
      "chan tu dan",
      "chung tử đơn",
      "chung tu don",
      "chung tử đan",
      "chung tu dan",
      "donnie yen"
    ],
    "featured": true,
    "gender": 2,
    "tags": [
      "Võ thuật",
      "Hành động",
      "Chính kịch"
    ]
  },
  {
    "slug": "luu-duc-hoa",
    "name": "Lưu Đức Hoa",
    "englishName": "Andy Lau",
    "country": "Hồng Kông 🇭🇰",
    "countryCode": "hk",
    "gender": 2,
    "tags": [
      "Hành động",
      "Tội phạm",
      "TVB"
    ],
    "roles": "Tứ Đại Thiên Vương • Vô Gian Đạo",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/z9R2yerjfgxwDWIH8sjiS0hhcre.jpg",
    "tmdbPersonId": 25246,
    "birthday": "1961-09-27",
    "placeOfBirth": "Tai Po, Hong Kong, China",
    "bio": "Lưu Đức Hoa (tiếng Trung: 劉德華; Việt bính: Lau4 Dak1-waa4; tên khai sinh: Lưu Phúc Vinh; sinh ngày 27 tháng 9 năm 1961), là một nam diễn viên kiêm ca sĩ nổi tiếng người Hồng Kông. Ông được vinh danh là một trong \"Ngũ Đại Hổ Tướng\" của đài TVB thập niên 1980 và là một trong \"Tứ Đại Thiên Vương\" của làng giải trí Hồng Kông thập niên 1990.\nTrong suốt sự nghiệp diễn xuất, Lưu Đức Hoa từng 3 lần chiến thắng nam diễn viên chính xuất sắc nhất tại Giải thưởng Điện ảnh Hồng Kông (Kim Tượng) và 2 lần giành giải nam diễn viên chính xuất sắc nhất tại Giải Kim Mã. Ở mảng âm nhạc, ông đã được ghi danh vào Sách Kỷ lục Guinness thế giới ở mục \"Nam ca sĩ nhạc Cantopop giành được nhiều giải thưởng nhất\" vào năm 2000, với tổng cộng 444 giải thưởng âm nhạc tính đến năm 2006.\nNăm 2018, Lưu Đức Hoa chính thức trở thành thành viên của Viện Hàn lâm Khoa học và Nghệ thuật Điện ảnh Mỹ. Đến năm 2024, ông được bầu làm Phó Chủ tịch Hiệp hội Điện ảnh Trung Quốc khóa 11. Trải dài qua hơn 4 thập kỷ hoạt động nghệ thuật, Lưu Đức Hoa luôn giữ vững vị thế là một trong những nghệ sĩ thành công nhất cả về mặt thương mại lẫn nghệ thuật trong cộng đồng người nói tiếng Hoa.\n\nTiểu sử:\n\nLưu Đức Hoa sinh ra tại Đại Bộ, Hồng Kông, là con trai của Lưu Tuyền (劉禮), một lính cứu hỏa. Khi còn bé, Lưu Đức Hoa từng phải đi xách nước cho gia đình 8 lần một ngày vì nhà không có tiền lắp ống nước. Ông tốt nghiệp trường trung học Khả Lập, thuộc nhóm Band 1 (chất lượng giảng dạy và học tập tốt nhất) ở khu Tân Bồ Cương (San Po Kong), Cửu Long, Hồng Kông. Ông cũng theo học thư pháp. Lưu Đức Hoa chuyển sang Đạo Phật trong thập niên 1980. Ông lớn lên trong gia đình theo đạo Phật và hiện là một tín đồ của ngôi đền Núi Lingyan ở Đài Loan.\n\nĐời tư:\n\nNăm 2008, Lưu Đức Hoa kết hôn với Chu Lệ Thiến (giản thể: 朱丽倩; phồn thể: 朱麗倩), còn có tên Chu Lệ Khanh (朱丽卿) là người Hoa kiều tại Penang, Malaysia sau 24 năm hẹn hò bí mật. Cô là con gái của ông Chu Kiến Thành (朱建成) hay còn gọi là Chu Kim Thành (朱金城), người Phúc Kiến. Gia đình kinh doanh đa ngành trong đó mở nhà hàng hải sản. Năm 1983, cô cùng chị gái Chu Lệ Trân (朱丽珍) tham gia chụp ảnh bìa cho tạp chí New Wave. Năm 1991, mẹ cô qua đời, gia đình đóng cửa công việc kinh doanh nhà hàng. Chú của Lệ Thiến là đại gia Trần Chí Viễn (Vincent Tan, 陈志远), Chủ tịch Tập đoàn Berjaya.\nCả hai đăng ký kết hôn tại Clark County, Nevada, Mỹ. Ngày 9 tháng 5 năm 2012, sinh con gái đầu lòng đặt tên là Lưu Hướng Huệ (Hanna, 劉向蕙).",
    "aliases": [
      "lưu đức hoa",
      "luu duc hoa",
      "andy lau",
      "tu dai thien vuong"
    ],
    "featured": true
  },
  {
    "slug": "luong-trieu-vy",
    "name": "Lương Triều Vỹ",
    "englishName": "Tony Leung Chiu-wai",
    "country": "Hồng Kông 🇭🇰",
    "countryCode": "hk",
    "roles": "Ảnh đế Cannes • Tâm trạng khi yêu",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/idGzkwbm0BiLdrrKfcXecFNXbDu.jpg",
    "tmdbPersonId": 1337,
    "birthday": "1962-06-27",
    "placeOfBirth": "Hong Kong, China",
    "bio": "Lương Triều Vỹ (tiếng Trung: 梁朝偉, tiếng Anh: Tony Leung Chiu-wai, sinh ngày 27 tháng 6 năm 1962) là một diễn viên người Hồng Kông. Ông là nam diễn viên Hồng Kông đầu tiên giành giải Nam diễn viên xuất sắc nhất tại Liên hoan phim Cannes với bộ phim Tâm trạng khi yêu (2000), và hiện đang giữ kỷ lục về số lần chiến thắng giải Nam diễn viên chính xuất sắc nhất tại cả Giải thưởng Điện ảnh Hồng Kông lẫn Giải Kim Mã.\nLương Triều Vỹ được biết đến nhiều nhất qua các bộ phim hợp tác với đạo diễn Vương Gia Vệ – bao gồm A Phi chính truyện (1990), Trùng Khánh Sâm Lâm (1994), Đông Tà, Tây Độc (1994), Xuân quang xạ tiết (1997), Tâm trạng khi yêu (2000), 2046 (2004) và Nhất đại tông sư (2013). Ông tham gia diễn xuất trong ba bộ phim đoạt giải Sư tử vàng tại Liên hoan phim Venice là Bi tình thành thị (1989), Xích lô (1995) và Sắc, Giới (2007). Lương Triều Vỹ cũng góp mặt trong bộ phim Anh hùng (2002) của đạo diễn Trương Nghệ Mưu, được đề cử Phim nói tiếng nước ngoài hay nhất tại Giải Oscar lần thứ 75.\n\nTiểu sử:\n\nLương Triều Vỹ sinh ngày 27 tháng 6 năm 1962 tại Hồng Kông, trong một gia đình khó khăn, cha mẹ không hạnh phúc. Thuở nhỏ, ông rất hiếu động, thường xuyên đánh nhau với bạn bè và hay bị phê bình kiểm điểm ở trường. Năm Lương Triều Vỹ 10 tuổi, mẹ ông ly hôn với cha ông, một mình nuôi hai đứa con, vì không chịu được tính nết của người chồng cờ bạc, say xỉn. Năm 15 tuổi, ông phải bỏ học để đi làm kiếm tiền giúp mẹ, trải qua nhiều công việc khác nhau như bán báo, làm nhân viên giới thiệu sản phẩm, tạp vụ. Năm 19 tuổi, Lương Triều Vỹ xin được công việc ở một cửa hàng đồ điện gia dụng, có thu nhập tạm ổn. Ông từng chia sẻ rằng vào thời điểm đó, nếu không có biến động gì, bản thân sẽ phấn đấu lên chức giám đốc bán hàng. Bạn thân của Lương Triều Vỹ là Châu Tinh Trì – bấy giờ rất đam mê diễn xuất – đã không ngừng rủ ông cùng thi vào lớp đào tạo diễn xuất của đài TVB. Dù bị mẹ phản đối kịch liệt, Lương Triều Vỹ vẫn nghe theo lời Châu Tinh Trì, quyết định trở thành một diễn viên.\n\nSự nghiệp:\n\n1982 – 1988: Khởi đầu sự nghiệp với phim truyền hình:",
    "aliases": [
      "lương triều vỹ",
      "luong trieu vy",
      "tony leung",
      "tony leung chiu-wai"
    ],
    "featured": true,
    "gender": 2,
    "tags": [
      "Chính kịch",
      "Tội phạm",
      "Marvel",
      "TVB"
    ]
  },
  {
    "slug": "co-thien-lac",
    "name": "Cổ Thiên Lạc",
    "englishName": "Louis Koo",
    "country": "Hồng Kông 🇭🇰",
    "countryCode": "hk",
    "gender": 2,
    "tags": [
      "Hành động",
      "Tội phạm",
      "TVB"
    ],
    "roles": "Thần Điêu Đại Hiệp • Chủ tịch Hiệp hội Điện ảnh HK",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/yQuDBTzm7xWlJICNvl20OmcJP80.jpg",
    "tmdbPersonId": 78875,
    "birthday": "1970-10-21",
    "placeOfBirth": "Hong Kong, British Crown Colony [now China]",
    "bio": "Cổ Thiên Lạc (tiếng Trung: 古天樂, tiếng Anh: Louis Koo Tin-Lok; sinh ngày 21 tháng 10 năm 1970) là một nam diễn viên, ca sĩ, nhà sản xuất điện ảnh kiêm doanh nhân người Hồng Kông. Anh từng là gương mặt nổi bật và diễn viên chủ chốt của đài truyền hình TVB.\n\nTiểu sử và sự nghiệp:\n\nTrước khi đến với điện ảnh, Cổ Thiên Lạc đã từng ngồi tù vì tội ăn cắp. Anh làm nhiều công việc khác nhau như hầu bàn, bán đồ ăn nhanh, bảo vệ,... cho đến khi anh tình cờ được phát hiện và mời làm người mẫu cho những cuốn băng karaoke MTV nhờ đẹp trai (trường hợp tương tự xảy ra với Takeshi Kaneshiro). Cho đến năm 1993 thì TVB ký hợp đồng với Cổ Thiên Lạc.\nSau giải thưởng năm 1999, đến năm 2001, Cổ Thiên Lạc một lần nữa được bầu làm nam diễn viên được yêu thích nhất cho vai Hạng Thiếu Long (項少龍) trong bộ phim truyền hình TVB \"Cỗ máy thời gian\" (尋秦記, A Step into the Past dựa trên tác phẩm Tầm Tần Ký của Huỳnh Dị), đồng thời kiêm luôn giải \"Nam nghệ sĩ có phong cách thời trang nhất\" (The Most Stylish Personality Award and Men of Power) cùng trong năm 2001.\nNhững phim truyền hình Cổ Thiên Lạc để lại ấn tượng là vai Dương Quá (楊過) trong \"Thần điêu hiệp lữ 1995\" (神鵰俠侶) đóng cặp với Lý Nhược Đồng; vai trung sĩ cảnh sát Từ Phi trong phim \"Hồ Sơ Trinh Sát 4\" cùng với Tuyên Huyên, Trần Cẩm Hồng, Xa Thi Mạn, vai phản diện Trương Tự Lực trong \"Thử Thách Nghiệt Ngã \" (創世紀II天地有情), và Hạng Thiếu Long trong phim Cỗ máy thời gian cùng vô số các vai diễn khác trước đó trong \"Giáo sư ưu ái\", \"Liệt hỏa hùng tâm\", \"Lệnh truy nã\", \"Duyên tình đôi chủ\"...\nSau thời gian đóng phim lẻ xã hội đen và một loạt phim ma trong series \"Âm Dương Lộ\" (Troublesome Night), khoảng thời gian đầu những năm 2000 Cổ Thiên Lạc chuyển sang những vai hài, lãng mạn trong những cuốn phim tình cảm nhẹ nhàng.\nAlbum được chú ý nhất của Cổ Thiên Lạc là \"Mr.Cool\". Từ đó fan hâm mộ kêu anh luôn bằng biệt danh này \"Mister Cool\" thì thấy hợp với tên của anh. Tên tiếng Anh của Cổ Thiên Lạc là Louis Koo, hay là Koo Louis. Viết tắt sẽ thành \"Koo L\". Viết gần nhau thì thành \"KooL\", đọc tương tự như \"cool\". Anh còn biệt danh khác là Cool Jay.\nVai phản diện tiêu biểu của Cổ Thiên Lạc là tay xã hội đen sát máu Jimmy trong Election (phần 1 và 2). Anh nhận được những lời ngợi khen của nhiều chuyên gia quốc tế qua vai diễn xuất sắc này khi bộ phim Election 2 (còn gọi là Triad Election) được đem đi trình chiếu tại liên hoan phim Cannes năm 2006.\n\nĐời tư cá nhân:\n\nPhim và Chương trình truyền hình:\n\nTruyền hình TVB:\n\n2001:\n\nCỗ máy thời gian (phim truyền hình) (尋秦記) - vai: Hạng Thiếu Long (項少龍)\n2000:\n\nThử thách nghiệt ngã II (phim truyền hình 2000) (創世紀天地有情) - vai: Trương Tự Lực (張自力)\n1999:\n\nHồ sơ trinh sát IV (刑事偵緝檔案IV) - vai: Từ Phi (徐飛)\nChú chó thông minh (phim truyền hình 1999) (宠物情缘) - vai: Đới Triển Thạc (戴占石)\n1998:",
    "aliases": [
      "cổ thiên lạc",
      "co thien lac",
      "louis koo"
    ],
    "featured": true
  },
  {
    "slug": "ta-dinh-phong",
    "name": "Tạ Đình Phong",
    "englishName": "Nicholas Tse",
    "country": "Hồng Kông 🇭🇰",
    "countryCode": "hk",
    "roles": "Tài tử điện ảnh • Nộ Hỏa",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/2oqpaOhEoKLdM4dePxOHJrI45n.jpg",
    "tmdbPersonId": 70106,
    "birthday": "1980-08-29",
    "placeOfBirth": "Hong Kong, China",
    "bio": "Tạ Đình Phong (tiếng Trung: 謝霆鋒, tiếng Anh: Nicholas Tse Ting-Fung; sinh ngày 29 tháng 8 năm 1980) là một nam ca sĩ, nhạc sĩ, diễn viên, kiêm đầu bếp người Hồng Kông.\nAnh chính thức gia nhập giới giải trí với tư cách là ca sĩ vào năm 1996. Phim điện ảnh đầu tay năm 1998 là Thiếu niên Hạo Nam (phim 1998) đã giúp anh giành Giải thưởng Điện ảnh Hồng Kông trong hạng mục Nam diễn viên mới xuất sắc nhất.\n\nTiểu sử:\n\nTạ Đình Phong sinh ra tại bệnh viện Pháp ở Hồng Kông, có cha là nam diễn viên Tạ Hiền và mẹ là Hoa hậu Hồng Kông năm 1973, diễn viên Địch Ba Lạp (狄波拉). Bà Địch Ba Lạp còn được biết đến với tên Lý Mẫn Nghi (李敏儀), sinh năm 1951 tại Hồng Kông, mẹ bà là người Trung Quốc còn cha là người Ireland. Nhiều người lầm tưởng bà mang họ Địch nhưng bà khẳng định đó chỉ là phiên âm Hán tự (狄寶娜摩亞) còn họ tên thật bằng tiếng Anh là Deborah Moore. Bà sử dụng tiếng Quảng Đông nhưng không rành viết chữ Hán cũng giống như nhiều người lai và Hoa kiều khác.\nTạ Đình Phong có một em gái là Tạ Đình Đình (謝婷婷). Năm 1987, cả gia đình anh chuyển sang sinh sống ở Vancouver, Canada.\nTạ Đình Phong theo học tại trường nam sinh St. George's School (Vancouver) và trường Quốc tế Hồng Kông một năm trước khi bỏ học vào năm lớp 10. Tạ Đình Phong chuyển đến sống tại Phoenix, Arizona trong 1 năm sau đó quay trở lại Vancouver. Anh từng học nhạc tại Nhật Bản trước khi quay về Hồng Kông. Hiện anh mang quốc tịch Canada và Hồng Kông.\n\nSự nghiệp:\n\nNăm 4 tuổi, lần đầu tiên Tạ Đình Phong cầm 2 dùi đánh trống, và ước mơ âm nhạc của anh bắt đầu. Năm 13 tuổi với cây đàn guitar và người thầy Steve, Nicholas đã bắt đầu nền tảng âm nhạc của mình.\nSau đó, gia đình anh trở về Hồng Kông. Năm 16 tuổi, trước khi ra mắt làng giải trí, anh đến Nhật Bản để học nhạc khoảng 4 tháng ở Tokyo. Lúc đó, anh sống ở thành phố Warabi, Saitama, mỗi ngày đi xe điện 2 tiếng đến Tokyo học nhạc. Buổi sáng Đình Phong đi học, tối biểu diễn ở quán bars, như thế vừa kiếm được tiền vừa luyện tập khả năng biểu diễn. Có lần anh biểu diễn đến tận gần 1 giờ sáng trong khi đó thì ga Tokyo 12 giờ đã đóng cửa, không đủ tiền để đi xe khác như taxi để về nhà nên Đình Phong đã ở lại một khách sạn rất cũ. Ở Nhật Bản, anh đã trải qua những tháng ngày cơ cực nhất và đó là quãng thời gian khó quên của anh. Trong thời gian ở Nhật Bản, Tạ Đình Phong đã viết ca khúc đầu tiên: \"Dự Tính Sai Lầm\" (估计错误)\nCuối năm 1996, Tạ Đình Phong chính thức trở thành ca sĩ bằng một hợp đồng với công ty đĩa hát Phi Đồ (hiện nay là Anh Hoàng).\nPhải đến những năm 1999, 2000 Tạ Đình Phong mới được khán giả đón nhận như một nghệ sĩ thật sự tài hoa, anh thoát khỏi cái bóng của cha mẹ, tự mình vươn lên thành một siêu thần tượng của giới trẻ châu Á. Năm 2002, Tạ Đình Phong vinh dự là nghệ sĩ người Hoa trẻ tuổi nhất nhận được giải thưởng âm nhạc thế giới (World Music Award).\n\nÂm nhạc:",
    "aliases": [
      "tạ đình phong",
      "ta dinh phong",
      "nicholas tse"
    ],
    "featured": false,
    "gender": 2,
    "tags": [
      "Hành động",
      "Tội phạm",
      "Võ thuật"
    ]
  },
  {
    "slug": "song-kang-ho",
    "name": "Song Kang-ho",
    "englishName": "Song Kang-ho",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "roles": "Ảnh đế Ký Sinh Trùng (Parasite) • Cannes",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/kBM9UTPYXUA2RNk210DXhztLFns.jpg",
    "tmdbPersonId": 20738,
    "birthday": "1967-01-17",
    "placeOfBirth": "Gimhae, South Gyeongsang, South Korea",
    "bio": "Đây là một tên người Triều Tiên, họ là Song.\n\nSong Kang-ho (Hàn ngôn: 송강호, Hán-Việt: Tống Khang Hạo; sinh ngày 17 tháng 1 năm 1967) là một nam diễn viên nổi tiếng người Hàn Quốc.\n\nSự nghiệp:\n\nSong Kang-ho không phải là một diễn viên được đào tạo một cách bài bản, chuyên nghiệp ngay từ đầu. Anh bắt đầu sự nghiệp của mình trong các nhóm sân khấu xã hội sau khi tốt nghiệp Trường Trung học Gimhae. Sau khi nhận chứng chỉ phát thanh do Đại học Busan Kyungsang cấp, anh gia nhập công ty sân khấu điện ảnh của Kee Kuk-seo. Năm 1991, anh lần đầu tiên xuất hiện trên sân khấu với một vai diễn trong vở kịch Dongseung. Sau đó, anh nhận lời đóng một vai phụ trong phim The Day a Pig Fell into the Well của đạo diễn Hong Sang-soo vào năm 1996.\nMột năm sau, Song kang-ho đóng vai một người vô gia cư trong Bad Movie của đạo diễn Jang Sun-woo. Anh bắt đầu được khán giả biết đến khi vào vai một gangster đào tạo một nhóm tân binh trẻ trong phim No.3 của đạo diễn Song Neung-han và giành được giải thưởng diễn viên phụ xuất sắc nhất tại Blue Dragon Film Awards. Sau đó, anh tham gia vai diễn phụ trong phim The Quiet Family và xuất hiện cùng Han Suk-kyu trong phim bom tấn Shiri của đạo diễn Kang Je-gyu.\nĐầu năm 2000, Song Kang-ho vào vai chính đầu tiên trong bộ phim an khách The Foul King, anh tự thực hiện hầu hết các pha nguy hiểm của mình. Tuy nhiên vai diễn trung sĩ Triều Tiên trong Joint Security Area mới là vai diễn đưa Song Kang-ho trở thành một trong những diễn viên sáng giá nhất của điện ảnh Hàn Quốc. Anh cũng vào vai chính trong Sympathy for Mr. Vengeance của đạo diễn Park Chan-wook, kể về một người cha truy tìm kẻ bắt cóc con gái mình.\nNăm 2002, Song Kang-ho đóng vai chính trong một bộ phim sản xuất bởi hãng Myung Films, Baseball Team YMCA, nói về đội bóng chày đầu tiên của Hàn Quốc được thành lập trong những năm đầu của thế kỷ 20. Một năm sau, anh đóng vai một thám tử nông thôn trong Memories of Murder của đạo diễn trẻ Bong Joon-ho.\nNăm 2004, Song Kang-ho đóng vai chính trong bộ phim của đạo diễn đầu tay của Im Charn-sang kể về nhân vật hư cấu là thợ cắt tóc riêng của Tổng thống Hàn Quốc Park Chung-hee. Năm 2005, anh tham gia bộ phim Antarctic Journal, một dự án phim đầu tay của Yim Pil-sung, kẻ về một cuộc thám hiểm ở Nam Cực.\nNăm 2006, Song Kang-ho tái hợp với đạo diễn Bong Joon-ho trong bộ phim đạt doanh thu kỷ lục The Host. Tuy đã thành danh tại màn bạc xứ Hàn từ rất lâu, nhưng đến khi tham gia bộ phim The Host, anh mới thật sự đưa tên tuổi của mình vượt ra ngoài biên giới Hàn Quốc. Trong phim, anh thủ vai người đàn ông độc thân Park Gang-du bị bệnh đãng trí và rơi vào cảnh buồn chán khi phải \"gà trống nuôi con\". Bằng lối diễn xuất vừa tinh tế vừa cuồng nhiệt trong vai Park Gang-du, Song Kang Ho đã thuyết phục người xem hoàn toàn. Với vai diễn hơi \"đần độn\" này của mình Kang-ho đã ghi một dấu mốc quan trọng trong sự nghiệp diễn xuất lừng lẫy của mình.",
    "aliases": [
      "song kang-ho",
      "song kang ho"
    ],
    "featured": true,
    "gender": 2,
    "tags": [
      "Chính kịch",
      "Tội phạm",
      "Hài"
    ]
  },
  {
    "slug": "lee-byung-hun",
    "name": "Lee Byung-hun",
    "englishName": "Lee Byung-hun",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "roles": "Quý Ngài Ánh Dương • Squid Game",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/j7SUd9Qi8iOxgrQGb3nQyEYcXur.jpg",
    "tmdbPersonId": 25002,
    "birthday": "1970-07-12",
    "placeOfBirth": "Seongnam, Gyeonggi, South Korea",
    "bio": "Lee Byung-hun (tiếng Hàn: 이병헌; sinh ngày 12 tháng 7 năm 1970) là một nam diễn viên và ca sĩ người Hàn Quốc. Anh được giới phê bình đánh giá vì đã thành công ở nhiều thể loại vai diễn khác nhau, nổi bật như các bộ phim điện ảnh Khu vực an ninh chung (2000), Ngọt đắng cuộc đời (2005), Thiện, ác, quái (2008), hay các bộ phim truyền hình như Mật danh Iris (2009), Ác quỷ đội lốt (2010), Hoàng đế giả mạo (2012) và Quý ngài Ánh dương (2018). Phim điện ảnh Điệp vụ kép (2015) được giới mộ điệu đánh giá cao và đã mang về cho anh giải thưởng Nam diễn viên chính xuất sắc nhất tại các lễ trao giải nghệ thuật danh giá bậc nhất Hàn Quốc như Giải thưởng nghệ thuật Baeksang lần thứ 52, Giải thưởng điện ảnh Rồng Xanh lần thứ 37 và Giải thưởng điện ảnh Đại Chung lần thứ 53. Khu vực an ninh chung, Ngọt đắng cuộc đời, Hoàng đế giả mạo, Điệp vụ kép và Ông trùm là những phim anh tham gia diễn xuất lọt danh sách phim điện ảnh có doanh thu cao nhất tại Hàn Quốc. Anh được bình chọn là diễn viên điện ảnh của năm của Gallup Korea vào năm 2012 và ở mảng truyền hình vào năm 2018. Năm 2021, anh tham gia loạt phim sinh tồn kinh dị Trò chơi con mực của Netflix. Trong phim, anh vào vai Front Man. Anh được mệnh danh là một trong những diễn viên nổi tiếng nhất mọi thời đại của Hàn Quốc và cũng là 1 Diễn viên có Thực lực Xuất sắc \nSau những thành công ở quê nhà, nam diễn viên bắt đầu dấn bước vào ngành điện ảnh Hollywood. Anh được biết đến với vai Storm Shadow trong loạt phim Biệt đội G.I. Joe: Cuộc chiến Mãng xà (2009) và phần hậu truyện G.I. Joe: Báo thù (2013). Năm 2013, anh đảm nhiệm vai diễn trong bộ phim hành động hài C.I.A tái xuất 2 do DC Entertainment sản xuất. Trong phim anh vào vai Han Cho Bai, một sát thủ và cựu đặc vụ NIS, đóng cùng với nam diễn viên Bruce Willis. Năm 2015, anh vào vai nhân vật T-1000 trong bộ phim điện ảnh Kẻ hủy diệt: Thời đại Genisys. Năm 2016, anh đảm nhận vai Billy Rocks trong bộ phim điện ảnh hành động viễn tưởng Bảy tay súng huyền thoại. Lee Byung Hun là diễn viên Hàn Quốc đầu tiên xuất hiện trên sân khấu của Lễ trao giải Oscar hàng năm ở Los Angeles và là thành viên của Viện Hàn lâm Khoa học và Nghệ thuật Điện ảnh. Lee Byung Hun và Ahn Sung-ki là những diễn viên Hàn Quốc đầu tiên được in dấu tay trên Đại lộ Danh vọng Hollywood lịch sử ở bên ngoài Nhà hát Grauman's Chinese.\n\nSự nghiệp:\n\nKhởi đầu sự nghiệp và đột phá:",
    "aliases": [
      "lee byung-hun",
      "lee byung hun"
    ],
    "featured": true,
    "gender": 2,
    "tags": [
      "Hành động",
      "Chính kịch",
      "K-Drama",
      "Hollywood"
    ]
  },
  {
    "slug": "ma-dong-seok",
    "name": "Ma Dong-seok",
    "englishName": "Don Lee",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "roles": "Ông trùm hành động The Roundup • Marvel",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/xqnARIEzfyr3BalhFBWHmCusLKH.jpg",
    "tmdbPersonId": 1024395,
    "birthday": "1971-03-01",
    "placeOfBirth": "Seoul, South Korea",
    "bio": "Ma Dong-seok, tên tiếng Anh là Don Lee, là một nam diễn viên và võ sĩ người Mỹ gốc Hàn, anh nổi tiếng với những vai diễn trong các bộ phim Chuyến tàu sinh tử, The Neighbor, Nameless Gangster, The Unjust, Norigae hay Murderer. Năm 2021, anh vào vai Gilgamesh trong bộ phim Chủng tộc bất tử thuộc Vũ trụ Điện ảnh Marvel. Ông được đánh giá là một trong những Nam Diễn viên Hàn Quốc Nổi tiếng nhất thế hệ của mình",
    "aliases": [
      "ma dong-seok",
      "ma dong seok",
      "don lee"
    ],
    "featured": true,
    "gender": 2,
    "tags": [
      "Hành động",
      "Tội phạm",
      "Hài",
      "Marvel"
    ]
  },
  {
    "slug": "gong-yoo",
    "name": "Gong Yoo",
    "englishName": "Gong Yoo",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 2,
    "tags": [
      "K-Drama",
      "Hành động",
      "Chính kịch"
    ],
    "roles": "Yêu Tinh Goblin • Train to Busan",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/ocGoFb6TrK3uWGXt4WnuibUG1vD.jpg",
    "tmdbPersonId": 150903,
    "birthday": "1979-07-10",
    "placeOfBirth": "Busan, South Korea",
    "bio": "Đây là một tên người Triều Tiên, họ là Gong.\n\nGong Ji-cheol (tiếng Hàn: 공지철, Hanja: 孔地哲, sinh ngày 10 tháng 7 năm 1979), thường được biết tới bằng nghệ danh Gong Yoo (tiếng Hàn: 공유, Hanja: 孔劉), là một nam diễn viên người Hàn Quốc. Nghệ danh của Gong Yoo được ghép từ họ của bố anh là Gong (tiếng Hàn: 공) và của mẹ anh là Yoo (tiếng Hàn: 유)\n\nSự nghiệp:\n\nGong Yoo tốt nghiệp bằng B.A (Bachelor of Arts; tạm dịch: Bằng Cử nhân Nghệ thuật) khoa Sân khấu tại trường Đại học Kyung Hee. Anh bắt đầu sự nghiệp với những vai nhỏ lẻ trong vài bộ drama và phim, vai diễn đầu tay của Gong Yoo là một nhân vật trong bộ phim School 4 chiếu năm 2001. Năm 2005, anh có được vai chính đầu tiên trong bộ phim Biscuit Teacher and Star Candy của đài SBS đóng cặp với Gong Hyo-jin. Khả năng diễn xuất của Gong Yoo đã lọt vào mắt xanh của các đạo diễn và cả người xem, trở thành một trong những gương mặt tiềm năng đáng mong chờ. Tiếp đó Gong Yoo tham gia vào bộ phim hài lãng mạn Quán cà phê hoàng tử của đài MBC, vai diễn Choi Han-kyul trong phim chính là một trong những vai diễn đáng chú ý nhất của anh. Độ nổi tiếng của bộ phim đã đưa Gong Yoo trở thành một trong những người dẫn đầu trào lưu Hallyu.\nGong Yoo đi nghĩa vụ quân sự bắt buộc vào ngày 14 tháng 1 năm 2008, và kết thúc nghĩa vụ vào ngày 8 tháng 12 năm 2009. Anh quay trở lại với sự nghiệp bằng phim hài lãng mạn Finding Mr. Destiny, phim khá thành công tại các phòng vé.\nGong Yoo tiếp tục đóng cặp cùng Lee Min-jung trong bộ phim Hoán đổi linh hồn được viết bởi chị em nhà Hong. Mặc dù lúc đầu bộ phim nhận được nhiều lời khen và phản hồi tích cực, nhưng cái kết của phim lại bị chỉ trích nặng nề.\nNăm 2013, anh trở lại với màn ảnh lớn sau 2 năm kể từ bộ phim The Suspect. Anh vào vai một điệp viên Triều Tiên bị tổ quốc phản bội. Vào tháng 11 năm 2013, Gong Yoo được chọn làm người đại diện của Quỹ Nhi đồng Liên Hợp Quốc (UNICEF) tại Hàn Quốc, trùng với lễ kỉ niệm 24 năm kể từ khi Công ước về Quyền trẻ em (CRC) được thông qua.\nNgày 7 tháng 7 năm 2014, Gong Yoo được chọn làm đại sứ cho Dịch vụ Thuế Quốc gia cùng với diễn viên Ha Ji-won.\nNăm 2016, sau 2 năm vắng bóng, Gong Yoo quay trở lại mạnh mẽ hơn bao giờ hết. Anh tham gia bộ phim A Man and a Woman cùng với Jeon Do-yeon, đóng vai chính trong bộ phim bom tấn về đại dịch xác sống Chuyến tàu sinh tử. Tiếp đó anh còn tham gia phim The Age of Shadows, cũng rất thành công về mặt thương mại.\nTháng 12 năm 2016, Gong Yoo, cùng với Lee Dong-wook và Kim Go-eun đóng vai chính trong bộ phim viễn tưởng lãng mạn kỷ niệm 10 năm của đài tvN, Tình chàng Yêu tinh, anh vào vai Kim Shin, một yêu tinh bất tử.",
    "aliases": [
      "gong yoo",
      "goblin"
    ],
    "featured": true
  },
  {
    "slug": "lee-jung-jae",
    "name": "Lee Jung-jae",
    "englishName": "Lee Jung-jae",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "roles": "Squid Game • Star Wars: The Acolyte",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/lx8oiTXL9lIx78KOXlrlvNfoz43.jpg",
    "tmdbPersonId": 73249,
    "birthday": "1972-12-15",
    "placeOfBirth": "Icheon, Gyeonggi-do, South Korea",
    "bio": "Đây là một tên người Triều Tiên, họ là Lee.\n\nLee Jung-jae (tiếng Hàn: 이정재; sinh ngày 15 tháng 12 năm 1972) là một nam diễn viên người Hàn Quốc. Được đánh giá là một trong những nam diễn viên Hàn Quốc xuất sắc nhất trong thế hệ của mình, ông nhận được nhiều giải thưởng danh giá xuyên suốt sự nghiệp, bao gồm giải Primetime Emmy, giải SAG, giải Critics' Choice Television, sáu giải Baeksang, cùng với các đề cử của giải Quả cầu vàng và giải Gotham. Ngoài sự nghiệp diễn xuất, Lee còn là một doanh nhân thông qua việc khai trương một chuỗi nhà hàng tại Seoul, đồng thời còn tham gia sáng lập một số doanh nghiệp, bao gồm công ty phát triển Seorim C&D. Ông sở hữu nhiều doanh nghiệp cùng với người bạn thân và cũng là diễn viên Jung Woo-sung.\nSinh ra và lớn lên tại Seoul, Lee bắt đầu sự nghiệp với vai trò người mẫu thời trang, sau đó ông chuyển sang diễn xuất trên truyền hình và trở nên nổi bật với bộ phim truyền hình Sandglass (1995). Sau bước đột phá trong diễn xuất với bộ phim An Affair (1998), sự nghiệp điện ảnh của Lee đã phát triển mạnh mẽ. Ông đã tham gia diễn xuất trong nhiều thể loại phim khác nhau, bao gồm City of the Rising Sun (1999), Il Mare (2000), Last Present (2001), Oh! Brothers (2003), Typhoon (2005), The Housemaid (2010), Đội quân siêu trộm (2012), New World (2013), Sứ mệnh truy sát (2015), Operation Chromite (2016), Ác quỷ đối đầu (2020), và Hunt (2022). Với vai diễn trong The Face Reader (2013), ông từng giành giải Baeksang cho Nam diễn viên phụ xuất sắc nhất.\nNăm 2021, tên tuổi của Lee bắt đầu được công chúng quốc tế biết đến rộng rãi qua vai diễn Seong Gi-hun, nhân vật chính trong bộ phim truyền hình sinh tồn Trò chơi con mực của Netflix. Với màn trình diễn xuất thần trong mùa đầu tiên của loạt phim, ông đã nhận được nhiều đề cử danh giá, bao gồm giải Critics' Choice Television cho Nam diễn viên kịch truyền hình xuất sắc nhất, giải Quả cầu vàng cho Nam diễn viên kịch truyền hình xuất sắc nhất, giải Primetime Emmy cho Nam diễn viên kịch truyền hình xuất sắc nhất, và giải SAG cho Nam diễn viên kịch truyền hình xuất sắc nhất, trở thành nam diễn viên Hàn Quốc và châu Á đầu tiên nhận được các đề cử cá nhân trong những hạng mục này tại cả bốn giải thưởng truyền hình, với chiến thắng ở hai giải thưởng sau đó cũng thiết lập cột mốc lịch sử cho các giải thưởng kể trên. Tháng 12 năm 2021, Lee được lựa chọn là Diễn viên điện ảnh của năm của Gallup Korea. Đến năm 2024, ông được Gold House vinh danh là một những người châu Á có ảnh hưởng nhất trong danh sách A100.\n\nĐầu đời:\n\nLee Jung-jae sinh ngày 15 tháng 12 năm 1972, tại Seoul, Hàn Quốc. Ông đăng ký học tại Đại học Dongguk, và được trao bằng thạc sĩ tại Khoa Nghệ thuật Sân khấu & Điện ảnh của trường Đại học Nghệ thuật Văn hóa, vào tháng 8 năm 2008.",
    "aliases": [
      "lee jung-jae",
      "lee jung jae"
    ],
    "featured": true,
    "gender": 2,
    "tags": [
      "Chính kịch",
      "Tội phạm",
      "K-Drama"
    ]
  },
  {
    "slug": "hyun-bin",
    "name": "Hyun Bin",
    "englishName": "Hyun Bin",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 2,
    "tags": [
      "K-Drama",
      "Tình cảm",
      "Hành động"
    ],
    "roles": "Hạ Cánh Nơi Anh (Crash Landing on You)",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/JQFzhO9j8HRiyr7leGPj6cqhvM.jpg",
    "tmdbPersonId": 544107,
    "birthday": "1982-09-25",
    "placeOfBirth": "Seoul, South Korea",
    "bio": "Kim Tae-pyung (tiếng Hàn: 김태평, sinh ngày 25 tháng 9 năm 1982), thường được biết đến với nghệ danh Hyun Bin (현빈), là một nam diễn viên người Hàn Quốc.\nAnh được biết đến rộng rãi nhờ vai diễn trong bộ phim truyền hình hài lãng mạn Tên tôi là Kim Sam Soon năm 2005. Kể từ đó, anh đảm nhận nhiều vai chính trong các chương trình truyền hình thành công khác, bao gồm bộ phim giả tưởng lãng mạn Khu vườn bí mật (2010–2011), Ký ức Alhambra (2018–2019) và bộ phim tình cảm lãng mạn Báo động khẩn, tình yêu hạ cánh (2019– 2020). Sự nổi tiếng của Hyun Bin càng được mở rộng khi đóng vai chính trong một loạt thành công phòng vé: Cộng sự bất đắc dĩ (2017) và phần tiếp theo năm 2022, Vòng xoáy lừa đảo (2017), Cuộc đàm phán sinh tử (2018).\nTrong suốt sự nghiệp điện ảnh và truyền hình của mình, anh ấy đã được đề cử cho một số giải thưởng mang tính biểu tượng, bao gồm năm giải thưởng tại Giải thưởng Nghệ thuật Baeksang, và giành được nhiều giải thưởng cho sự công nhận diễn xuất của mình, bao gồm Giải thưởng lớn (Daesang) cho TV tại Giải thưởng Nghệ thuật Baeksang lần thứ 47.\n\nSự nghiệp:\n\n2004–2009: Sự khởi đầu:\n\nHyun Bin ra mắt với tư cách là một diễn viên trong bộ phim truyền hình Bodyguard năm 2003. Sau đó, anh đóng vai chính trong bộ phim sitcom Nonstop 4 và bộ phim tình cảm lãng mạn kỳ quặc Ireland, và ra mắt bộ phim cùng năm trong bộ phim thể thao dành cho giới trẻ Spin Kick. Hyun Bin trở thành ngôi sao với bộ phim hài lãng mạn năm 2005 My Lovely Sam Soon với Kim Sun-a. Bộ phim là một cú hit lớn với rating trung bình hơn 37% và 50,5% cho tập cuối, giúp Hyun Bin giành giải thưởng nhiều giải thưởng lớn tại MBC Drama Awards.\nSau thành công của My Lovely Sam Soon, anh đóng vai chính trong bộ phim đầu tiên của mình với tư cách là một diễn viên chính trong A Millionaire's First Love. Bộ phim được nhiều khán giả tuổi teen đón nhận.\nTuy nhiên, dự án truyền hình tiếp theo, The Snow Queen đã không thành công. Anh bắt đầu chọn nhiều dự án có chiều sâu hơn, như Worlds Within năm 2008 được chắp bút bởi biên kịch Noh Hee-kyung, I Am Happy - bộ phim được chọn trình chiếu tại Liên hoan phim quốc tế Busan 2008. Năm 2009, anh đã thu hút được sự hoan nghênh phê phán trong vai diễn xã hội học trong Friend, Our Legend.\n\n2010–2013: Sự nổi tiếng trên thế giới:",
    "aliases": [
      "hyun bin",
      "kim tae-pyung"
    ],
    "featured": true
  },
  {
    "slug": "song-joong-ki",
    "name": "Song Joong-ki",
    "englishName": "Song Joong-ki",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 2,
    "tags": [
      "K-Drama",
      "Hành động",
      "Tình cảm"
    ],
    "roles": "Hậu Duệ Mặt Trời • Vincenzo",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/kgjb5OppOVTh5tz3hhnfDVnTvDv.jpg",
    "tmdbPersonId": 150698,
    "birthday": "1985-09-19",
    "placeOfBirth": "Daejeon, South Korea",
    "bio": "Đây là một tên người Triều Tiên, họ là Song.\n\nSong Joong-ki (Hangul: 송중기; sinh ngày 19 tháng 9 năm 1985) là một nam diễn viên người Hàn Quốc. Anh nổi danh từ bộ phim truyền hình Sungkyunkwan Scandal (2010) và chương trình giải trí Running Man với vai trò là một thành viên cố định ban đầu. Kể từ đó, anh đã tham gia vào các bộ phim truyền hình như Chàng trai tốt bụng (2012), Hậu duệ Mặt Trời (2016), Biên niên sử Arthdal (2019), Vincenzo (2021) và Cậu út nhà tài phiệt (2022), cũng như các bộ phim điện ảnh Cậu bé người sói (2012), Đảo địa ngục (2017) và Con tàu Chiến Thắng (2021).\nSong Joong-ki là nam diễn viên truyền hình của năm theo Gallup Korea vào năm 2012, và năm 2017. Anh lần đầu tiên xuất hiện trong danh sách người nổi tiếng quyền lực nhất Hàn Quốc của Forbes Korea vào năm 2013 với vị trí số 7, và sau đó đứng ở vị trí số 2 vào năm 2017 và số 7 vào năm 2018. Thành công từ các tác phẩm của anh trên phạm vi quốc tế đã đưa anh trở thành một ngôi sao Hallyu hàng đầu, và là một trong những diễn viên có thu nhập cao nhất tại Hàn Quốc.\n\nTiểu sử:\n\nSong Joong-ki sinh ngày 19 tháng 9 năm 1985 và lớn lên ở vùng nông thôn ngoại ô của Daejeon. Anh là con thứ trong gia đình có 3 anh chị em, anh trai sinh năm 1983 và em gái sinh năm 1992. Anh từng là một vận động viên trượt băng tốc độ cự ly ngắn, và 3 lần đại diện cho thành phố quê hương Daejeon của anh tham dự giải trượt băng tốc độ quốc gia (anh từng đảm nhận vai vận động viên trượt băng tốc độ quốc gia trong bộ phim truyền hình Triple). Tuy nhiên, anh đã phải từ bỏ môn thể thao này sau khi gặp phải sự cố chấn thương ở đầu gối trong năm đầu tiên ở trường trung học. Gác lại giấc mơ vận động viên, Song Joong-ki sau đó hoàn toàn tập trung vào việc học và điểm số của anh đã được cải thiện đáng kể, thậm chí đạt được điểm cao nhất cho tất cả các môn học của mình. Anh đã đạt được nhiều thành tích xuất sắc trong suốt quá trình học tại trường trung học và đạt được 380 điểm trong số 400 điểm cho kỳ thi tuyển sinh đại học quốc gia, được nhận vào trường Đại học Sungkyunkwan danh tiếng. Khi chuẩn bị cho bài kiểm tra kỳ thi tuyển sinh ở Seoul, anh đã được tuyển chọn trên tàu điện ngầm bởi một nhân viên của một công ty nhưng không lập tức nhận lời vì anh vẫn còn mơ hồ về con đường sự nghiệp của mình, và cũng vì ban đầu cha anh đã phản đối việc anh trở thành một diễn viên. Anh tiếp tục học sau khi quyết định tham gia vào ngành giải trí trong năm thứ ba đại học, cuối cùng tốt nghiệp ngành quản trị kinh doanh và văn bằng hai là phát thanh truyền hình vào năm 2012.\nSong Joong-ki xuất hiện lần đầu tiên trên truyền hình với tư cách thí sinh trên chương trình Quiz Korea của KBS, thay thế cho một đàn anh bị ốm, và đạt vị trí số 2 ở vòng chung kết. Điều này mang lại cho anh sự chú ý và trở thành người mẫu trang bìa tạp chí College dành cho sinh viên.\n\nSự nghiệp:\n\n2008–2011: Khởi đầu và đột phá:",
    "aliases": [
      "song joong-ki",
      "song joong ki",
      "vincenzo"
    ],
    "featured": true
  },
  {
    "slug": "kim-soo-hyun",
    "name": "Kim Soo-hyun",
    "englishName": "Kim Soo-hyun",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 2,
    "tags": [
      "K-Drama",
      "Tình cảm",
      "Hài"
    ],
    "roles": "Nữ Hoàng Nước Mắt • Vì Sao Đưa Anh Tới",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/vrSb5qYUzHX4Sifbc8PKR7j9Y6I.jpg",
    "tmdbPersonId": 4301482,
    "birthday": "1985-12-21",
    "bio": "Đây là một tên người Triều Tiên, họ là Kim.\n\nKim Soo Hyun (sinh ngày 16 tháng 2 năm 1988) là một nam diễn viên người Hàn Quốc. Anh bắt đầu đóng phim vào năm 2007 với phim sitcom Kimchi Cheese Smile. Anh được biết đến với các tác phẩm như Bầu sô tập sư, Mặt trăng ôm mặt trời, Vì sao đưa anh tới, Điên thì có sao và Nữ hoàng nước mắt.",
    "aliases": [
      "kim soo-hyun",
      "kim soo hyun"
    ],
    "featured": true
  },
  {
    "slug": "son-ye-jin",
    "name": "Son Ye-jin",
    "englishName": "Son Ye-jin",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 1,
    "tags": [
      "K-Drama",
      "Tình cảm",
      "Chính kịch"
    ],
    "roles": "Tình đầu quốc dân • Hạ Cánh Nơi Anh",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/i6fASFvO3mUceZJvipn4RiLHA44.jpg",
    "tmdbPersonId": 86889,
    "birthday": "1982-01-11",
    "placeOfBirth": "Daegu, South Korea",
    "bio": "Son Ye-jin (sinh ngày 11 tháng 1 năm 1982) là một nữ diễn viên người Hàn Quốc. Cô được khán giả biết đến qua các bộ phim điện ảnh và truyền hình lãng mạn như The Classic (2003), Summer Scent (2003), A Moment to Remember (2004) và April Snow (2005). Cô được giới chuyên môn đánh giá cao về kỹ năng diễn xuất nhờ lối diễn xuất đa dạng trong nhiều thể loại vai diễn khác nhau, lột tả được sâu sắc những diễn biến tâm lý của nhân vật ở nhiều khía cạnh với những vai diễn tâm lý nặng, đặc biệt là trong Alone in Love (2006), My Wife Got Married (2008), The Pirates (2014), The Truth Beneath và The Last Princess (2016). Những bộ phim truyền hình mà cô tham gia gần đây nhất là Something in the Rain (2018) và Crash Landing on You (2019–2020).",
    "aliases": [
      "son ye-jin",
      "son ye jin"
    ],
    "featured": true
  },
  {
    "slug": "jun-ji-hyun",
    "name": "Jun Ji-hyun",
    "englishName": "Gianna Jun",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "roles": "Cô Nàng Ngổ Ngáo • Vì Sao Đưa Anh Tới",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/qejOQBdIzN18e69yRcsiD0JQi4c.jpg",
    "tmdbPersonId": 63436,
    "birthday": "1981-10-30",
    "placeOfBirth": "Seoul, South Korea",
    "bio": "Wang Ji-hyun (tiếng Hàn: 왕지현; sinh ngày 30 tháng 10 năm 1981), thường được biết đến với nghệ danh là Jun Ji-hyun (tiếng Hàn: 전지현), là một nữ diễn viên và người mẫu người Hàn Quốc. Cô đã nhận được nhiều giải thưởng, trong đó có 2 giải Grand Bell Awards trong hạng mục Nữ diễn viên xuất sắc nhất và 1 giải Baeksang Art Awards trong hạng mục Daesang cho phim truyền hình.\nJun Ji-hyun trở nên nổi tiếng với vai diễn trong bộ phim điện ảnh hài lãng mạn Cô nàng ngổ ngáo (2001), một trong những bộ phim hài Hàn Quốc có doanh thu cao nhất mọi thời đại. Những bộ phim đáng chú ý khác của cô bao gồm Il Mare (2000), Ngọn gió yêu thương (2004), Đội quân siêu trộm (2012), Hồ sơ Berlin (2013) và Sứ mệnh truy sát (2015). Cô cũng vào vai chính trong bộ phim truyền hình Vì sao đưa anh tới (2013–2014) và Huyền thoại biển xanh (2016–2017). Hiện nay, cô vào vai Ashin trong bộ phim Vương triều xác sống của Netflix (2020–nay) và vai Seo Yi-kang trong bộ phim truyền hình Bí ẩn núi Jiri của tvN.\nThành công của Jun Ji-hyun trong lĩnh vực điện ảnh và truyền hình đã đưa cô trở thành ngôi sao Hallyu hàng đầu. Cô được xem như là một trong \"The Troika\" cùng với Kim Tae-hee và Song Hye-kyo, còn được gọi chung là \"Tae-Hye-Ji\" theo từ viết tắt.\n\nTiểu sử:\n\nJun Ji-hyun sinh ngày 30 tháng 10 năm 1981 tại Seoul, Hàn Quốc. Cô là con út trong một gia đình có 2 anh em, anh trai lớn hơn cô 5 tuổi. Mẹ của cô và bạn bè của mẹ cô đều khuyến khích cô làm người mẫu hoặc diễn viên vì cô sở hữu chiều cao vượt trội và vóc dáng mảnh mai. Ước mơ thời thơ ấu của cô là trở thành tiếp viên hàng không, nhưng cô đã thay đổi quyết định sau khi trải qua một chuyến bay. Năm 1997, ở tuổi 16, cô theo học trường trung học nữ Jinsun và bắt đầu sự nghiệp người mẫu trên tạp chí Ecole. Năm 1998, cô ra mắt với tư cách là một diễn viên và lấy nghệ danh Jun Ji-hyun theo lời gợi ý của một nhà sản xuất.\nCô học đại học tại Đại học Dongguk và tốt nghiệp vào năm 2004 với bằng cử nhân chuyên ngành Sân khấu và Điện ảnh. Đến năm 2011, cô ghi danh vào chương trình đào tạo sau đại học của Đại học Dongguk và lấy được bằng thạc sĩ chuyên ngành Nội dung và Truyền thông Kỹ thuật số.\n\nSự nghiệp:\n\n1997–2005: Khởi đầu sự nghiệp và đột phá:",
    "aliases": [
      "jun ji-hyun",
      "jun ji hyun",
      "gianna jun"
    ],
    "featured": true,
    "gender": 1,
    "tags": [
      "K-Drama",
      "Tình cảm",
      "Hài",
      "Hành động"
    ]
  },
  {
    "slug": "kim-ji-won",
    "name": "Kim Ji-won",
    "englishName": "Kim Ji-won",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 1,
    "tags": [
      "K-Drama",
      "Tình cảm",
      "Chính kịch"
    ],
    "roles": "Nữ Hoàng Nước Mắt • Hậu Duệ Mặt Trời",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/iU12o2aevDwBuRprF2nuJSVT5zB.jpg",
    "tmdbPersonId": 3880409,
    "birthday": "2009-01-01",
    "bio": "Kim Ji-won là một nữ diễn viên người Hàn Quốc. Cô trở nên nổi tiếng thông qua những vai diễn trong các bộ phim truyền hình Người thừa kế (2013), Hậu duệ mặt trời (2016), Thanh xuân vật vã (2017), Biên niên sử Arthdal (2019), Tình yêu chốn đô thị (2020–2021), Nhật ký tự do của tôi (2022) và Nữ hoàng nước mắt (2024). Sự thành công từ các bộ phim truyền hình của Kim Ji-won trên khắp châu Á đã giúp cô trở thành một ngôi sao được săn đón Hallyu.",
    "aliases": [
      "kim ji-won",
      "kim ji won"
    ],
    "featured": true
  },
  {
    "slug": "song-hye-kyo",
    "name": "Song Hye-kyo",
    "englishName": "Song Hye-kyo",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 1,
    "tags": [
      "K-Drama",
      "Tình cảm",
      "Chính kịch"
    ],
    "roles": "The Glory • Hậu Duệ Mặt Trời",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/tlAX3f82Mf5h0rznpVBVK7nD2om.jpg",
    "tmdbPersonId": 74421,
    "birthday": "1981-11-22",
    "placeOfBirth": "Daegu, South Korea",
    "bio": "Song Hye-kyo (sinh ngày 22 tháng 11 năm 1981) là một nữ diễn viên người Hàn Quốc. Được đánh giá là một trong những nữ diễn viên Hàn Quốc xuất sắc nhất trong thế hệ của mình, cô nổi tiếng thông qua những vai chính trong các bộ phim truyền hình gồm Trái tim mùa thu (2000), Một cho tất cả (2003), Ngôi nhà hạnh phúc (2004), Gió đông năm ấy (2013), Hậu duệ mặt trời (2016), Gặp gỡ (2018) và Vinh quang trong thù hận (2022).\nNăm 2017, cô đứng thứ 7 trong danh sách những người nổi tiếng quyền lực nhất Hàn Quốc do tạp chí Forbes bình chọn và đứng thứ 6 năm 2018. Cô được gọi là một trong \"The Troika\" cùng với Kim Tae-hee và Jun Ji-hyun, được gọi chung bằng từ viết tắt \"Tae-Hye-Ji\". Thành công của các bộ phim truyền hình của Song Hye-kyo trên quốc tế đã đưa cô trở thành một ngôi sao Hallyu hàng đầu.\n\nTiểu sử:\n\nKhi mới sinh ra, cô bị bệnh nặng đến mức bố mẹ và bác sĩ nghĩ rằng cô sẽ không qua khỏi. Sau khi hồi phục, bố mẹ của Song Hye-kyo đã đăng ký khai sinh cho cô vào ngày 26 tháng 2 năm 1982 (thay vì ngày sinh thực của cô là ngày 22 tháng 11 năm 1981).\nBố mẹ của Song Hye-kyo đã ly hôn khi cô còn nhỏ, sau đó cô được mẹ nuôi dưỡng. Họ chuyển từ nơi sinh của cô ở Daegu đến quận Gangnam ở Seoul, nơi cô được đào tạo như một vận động viên trượt băng nghệ thuật ở trường tiểu học nhưng bỏ dở khi cô học lớp 8. Song Hye-kyo tự nhận mình là người nhút nhát và sống nội tâm, nhưng khi theo học tại Trường Trung học Nữ sinh Ewha, cô được giáo viên trung học mô tả là có \"tính cách vui vẻ, hòa đồng với bạn bè và luôn có tâm trạng vui vẻ.\" Song Hye-kyo theo học Đại học Sejong, nơi cô theo học chuyên ngành Nghệ thuật Điện ảnh, cho đến học kỳ I năm 1 và xin bảo lưu kết quả. Sau đó, cô không thể sắp xếp thời gian và chính thức thôi học năm 2002.\n\nSự nghiệp:\n\n1996 - 2004: Ra mắt, đột phá và danh tiếng quốc tế:",
    "aliases": [
      "song hye-kyo",
      "song hye kyo"
    ],
    "featured": true
  },
  {
    "slug": "park-seo-joon",
    "name": "Park Seo-joon",
    "englishName": "Park Seo-joon",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 2,
    "tags": [
      "K-Drama",
      "Hài",
      "Tình cảm",
      "Chính kịch"
    ],
    "roles": "Tầng Lớp Itaewon • Thư Ký Kim",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/k1ALgZkOApYt7PIUBkUitmknXQC.jpg",
    "tmdbPersonId": 1347525,
    "birthday": "1988-12-16",
    "placeOfBirth": "Seoul, South Korea",
    "bio": "Park Yong-kyu, thường được biết đến với nghệ danh Park Seo-joon (sinh ngày 16 tháng 12 năm 1988), là một nam diễn viên người Hàn Quốc. Anh được biết đến rộng rãi nhất qua các vai chính trong những bộ phim truyền hình Tìm lại chính mình (2015), Cô nàng xinh đẹp (2015), Hoa Lang (2016–2017), Thanh xuân vật vã (2017), Thư ký Kim sao thế? (2018) và Tầng lớp Itaewon (2020). Anh cũng tham gia đóng những phim điện ảnh như Vòng xoáy tội ác (2015), Cảnh sát tập sự (2017) và Bàn tay diệt quỷ (2019).\n\nTiểu sử:\n\nPark Seo-joon (tên khai sinh là Park Yong-kyu, tiếng Hàn: 박용규) sinh ngày 16 tháng 12 năm 1988, tại Seoul, Hàn Quốc. Anh sinh ra trong một gia đình có 3 anh em, là anh cả, thuộc tầng lớp khá giả. Trong đó, hai người em lần lượt sinh năm 1991 và 1996 đều đã lập gia đình. Bố, mẹ đều hoạt động trong lĩnh vực kinh doanh, bố là doanh nhân. Hai em trai cũng đi theo con đường kinh doanh của bố mẹ, chỉ có Park Seo-joon là đi theo con đường nghệ thuật. Anh thực hiện nghĩa vụ quân sự vào năm 2008 khi anh 19 tuổi và đã được xuất ngũ vào năm 2010.\n\nSự nghiệp:\n\n2011-2015: Khởi đầu và đột phá:\n\nAnh ra mắt làng giải trí xứ Hàn vào năm 2011 thông qua video âm nhạc thuộc đĩa đơn \"I Remember\" của Bang Yong-guk. Anh tham gia đóng vai phụ trong các bộ phim truyền hình như Dream High 2 (2012), Hôn nhân vàng (2013), và Lời nói ấm áp (2013), trước khi có vai chính đầu tiên trong sự nghiệp trong Phù thủy tình yêu (2014). Từ tháng 10 năm 2013 đến tháng 4 năm 2015, anh tham gia chương trình truyền hình Music Bank, với vai trò là MC.\nNăm 2015, anh có những vai diễn đột phá trong Kill Me, Heal Me và Cô nàng xinh đẹp, cả 2 bộ phim anh đều đóng cùng nữ diễn viên Hwang Jung-eum. Cùng năm, anh tham gia dự án phim kinh dị Vòng xoáy tội ác.\n\n2016-nay: Nổi tiếng trên phạm vi quốc tế:\n\nNăm 2016, anh tham gia đóng chính trong bộ phim cổ trang Hoa lang cùng với Go Ara và Park Hyung-sik, trong phim anh vào vai một thanh niên sinh ra trong nghèo khó vượt qua bao khó khăn trong cuộc sống để trở thành một chiến binh Hoa lang huyền thoại trong triều đại Tân La.\nNăm 2017, anh đã có vai diễn thành công trong bộ phim hài lãng mạn Thanh xuân vật vã của đài KBS2, trong phim anh vào vai Go Dong-man – một cựu vận động viên Taekwondo có quá khứ đau khổ, trên còn đường tìm kiếm thành công với tư cách là võ sĩ tổng hợp, đóng cùng với nữ diễn viên Kim Ji-won. Bộ phim đã thành công vang dội ở Hàn Quốc và quốc tế, liên tục đứng đầu trong khung giờ phát sóng. Cùng năm, anh đóng vai chính đầu tiên trên màn ảnh rộng trong bộ phim hài hành động Cảnh sát tập sự, cùng với Kang Ha-neul. Anh nhận được giải Diễn viên mới xuất sắc nhất tại các lễ trao giải điện ảnh lớn như Grand Bell Awards và Giải Hiệp hội Phê bình Điện ảnh Hàn Quốc.\nNăm 2018, anh tham gia đóng chính trong bộ phim hài lãng mạn Thư ký Kim sao thế? của đài tvN, trong phim anh vào vai phó chủ tịch của tập đoàn Yumyeong, người đã phải lòng cô thư ký của mình, do Park Min Young thủ vai.",
    "aliases": [
      "park seo-joon",
      "park seo joon"
    ],
    "featured": true
  },
  {
    "slug": "lee-min-ho",
    "name": "Lee Min-ho",
    "englishName": "Lee Min-ho",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 2,
    "tags": [
      "K-Drama",
      "Tình cảm",
      "Hành động"
    ],
    "roles": "Vườn Sao Băng • Quân Vương Bất Diệt",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/iqopuz6cKuRZRUPZQrj7lFZcWWb.jpg",
    "tmdbPersonId": 1245104,
    "birthday": "1987-06-22",
    "placeOfBirth": "Seoul, South Korea",
    "bio": "Đây là một tên người Triều Tiên, họ là Lee.\n\nLee Min-ho (tiếng Hàn: 이민호; Hanja: 李敏鎬; Hán-Việt: Lý Mẫn Hạo, sinh ngày 22 tháng 6 năm 1987) là một nam diễn viên kiêm người mẫu người Hàn Quốc. Anh được biết đến với các vai diễn trong các bộ phim truyền hình Vườn sao băng (2009), Thợ săn thành phố (2011), Những người thừa kế (2013), Huyền thoại biển xanh (2016) và Quân vương bất diệt (2020).\n\nThời thơ ấu:\n\nLee Min-ho được sinh ra trong một gia đình không mấy khá giả tại Seoul. Khi còn nhỏ, anh ấy từng mơ ước trở thành một cầu thủ bóng đá chuyên nghiệp. Anh đã gia nhập vào một đội bóng đá nam do siêu sao bóng đá Cha Bum-kun làm đội trưởng và được người này huấn luyện vô cùng bài bản. Nhưng đáng tiếc thay, Lee Min-ho đã gặp phải một chấn thương ngay trong một trận bóng đá lớn và điều này đã khiến cho nam tài tử họ Lee phải từ bỏ cái giấc mơ trở thành cầu thủ bóng đá năm nào. Trong thời gian học trung học, anh chuyển hướng sang làm streamer bán mĩ phẩm.\nLee Min-ho đã tốt nghiệp chuyên ngành Điện ảnh & Nghệ thuật tại Đại học Konkuk. Sau khi tốt nghiệp, anh đã quyết định rẽ hướng sang con đường diễn xuất.\n\nSự nghiệp:\n\n2006-2008: Khởi đầu sự nghiệp:\n\nLee bắt đầu thử vai và đóng vai phụ trong một số bộ phim truyền hình tuy nhiên vẫn chưa nhận được sự chú ý từ công chúng. Đầu sự nghiệp, Lee lấy nghệ danh Lee Min vì công ty quản lý của anh nghĩ rằng tên khai sinh của anh quá bình thường. Tuy nhiên, vì nghệ danh của anh được phát âm và viết giống như từ imin trong tiếng Hàn, có nghĩa là \"nhập cư\", sau đó anh nói rằng rất khó để tìm thấy mình trong kết quả tìm kiếm trên internet. Cuối cùng anh trở lại sử dụng tên thật của mình.\nNăm 2006, sự nghiệp diễn xuất của anh bị trì hoãn trong một năm sau  tai nạn xe hơi nghiêm trọng, trong khi đi cùng với nam diễn viên Jung Il-woo. Lee bị thương nặng và phải nằm liệt giường vài tháng. Sau khi hồi phục, Lee nhận được vai chính đầu tiên của mình trong bộ phim Mackerel Run năm 2007, nhưng bộ phim đã bị giảm xuống chỉ còn tám tập do tỷ lệ người xem thấp. Năm 2008, anh xuất hiện trong nhiều vai diễn khác nhau trên truyền hình (phim truyền hình Get Up và I Am Sam) và hai bộ phim Public Enemy Returns và Our School's E.T.. Trong quá trình quay phim sau này, anh trở thành bạn tốt với nam diễn viên Kim Su-ro.\n\n2009-2013: Đột phá:\n\nBước đột phá của Lee đến vào năm 2009 với vai chính Gu Jun-pyo trong Boys Over Flowers, bộ phim chuyển thể từ bộ truyện tranh nổi tiếng cùng tên. Bộ phim đã thu hút lượng người xem rất lớn và tiếng vang lớn trên khắp Hàn Quốc trong khi phát sóng. Sau bộ phim, Lee trở thành một ngôi sao Hallyu.\nNăm 2010, Lee đóng vai chính trong bộ phim hài lãng mạn Personal Taste, trong đó anh vào vai một kiến trúc sư trẻ cầu toàn đầy tham vọng. Khi được hỏi về lý do tại sao anh chọn vai diễn này trong một cuộc phỏng vấn, anh trả lời:",
    "aliases": [
      "lee min-ho",
      "lee min ho"
    ],
    "featured": true
  },
  {
    "slug": "iu-lee-ji-eun",
    "name": "IU (Lee Ji-eun)",
    "englishName": "IU",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "roles": "Khách Sạn Ma Quái (Hotel Del Luna) • My Mister",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/uNhKOO9lIAFXF11LM6gjCrX2CJz.jpg",
    "tmdbPersonId": 1252318,
    "birthday": "1993-05-16",
    "placeOfBirth": "Seoul, South Korea",
    "bio": "Lee Ji-eun, thường được biết đến với nghệ danh IU, là một trong những nữ ca sĩ kiêm diễn viên thành công và được yêu mến nhất Hàn Quốc. Trong sự nghiệp diễn xuất, cô nhận được nhiều lời khen ngợi từ giới phê bình qua các vai diễn xuất sắc trong My Mister, Hotel Del Luna, Moon Lovers và bộ phim điện ảnh Broker của đạo diễn Kore-eda.",
    "aliases": [
      "iu (lee ji-eun)",
      "iu lee ji eun",
      "iu",
      "lee ji-eun",
      "lee ji eun"
    ],
    "featured": true,
    "gender": 1,
    "tags": [
      "K-Drama",
      "Chính kịch",
      "Tình cảm"
    ]
  },
  {
    "slug": "han-so-hee",
    "name": "Han So-hee",
    "englishName": "Han So-hee",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 1,
    "tags": [
      "K-Drama",
      "Chính kịch",
      "Hành động"
    ],
    "roles": "Sinh Vật Gyeongseong • Thế Giới Hôn Nhân",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/8IvEOnqMjqJWcci3z44haH38Ee8.jpg",
    "tmdbPersonId": 2112859,
    "birthday": "1993-11-18",
    "placeOfBirth": "Ulsan, South Korea",
    "bio": "Đây là một tên người Triều Tiên, họ là Han.\n\nHan So-hee (Hangul: 한소희, Hán-Việt: Hàn Tố Hi, sinh ngày 18 tháng 11 năm 1993), tên khai sinh là Lee So-hee, là một nữ diễn viên người Hàn Quốc. Cô đóng vai chính trong các phim truyền hình như Money Flower (2017), Lang quân 100 ngày (2018), Thế giới hôn nhân (2020), My Name (2021), Dẫu biết (2021), vai phụ trong Viên đá bí ẩn (2019), Soundtrack#1 (2022), Sinh vật Gyeongseong (2023-2024), Project Y (2026), The Intern  (2026)\n\nTiểu sử:\n\nSo-hee sinh ngày 18 tháng 11 năm 1993 tại Ulsan, cô từng theo học tại trường trung học nữ sinh Ulsan sau đó chuyển đến trường trung học nghệ thuật Ulsan và tốt nghiệp tại đây.\nSau kỳ nghỉ đông của năm thứ ba trung học, cô lên thủ đô Seoul. Vào thời điểm đó, cô không quen biết ai nên chỉ nhận được sự giúp đỡ của bà ngoại trong 2 tháng đầu đồng thời làm nhiều công việc bán thời gian khác nhau. Trong khi làm việc bán thời gian, cô nhận được lời mời làm người mẫu và bắt đầu sự nghiệp làm người mẫu quảng cáo.\n\nSự nghiệp:\n\n2017–2019: Khởi đầu sự nghiệp:\n\nHan So-hee xuất hiện trong video âm nhạc \"Tell Me What To Do\" của SHINee vào năm 2016. Cô đã xuất hiện lần đầu tiên trong lĩnh vực diễn xuất của mình với một vai nhỏ trong Thế giới hợp nhất (2017). Cô nhận được vai chính đầu tiên của mình trong Money Flower của MBC và Lang quân 100 ngày năm 2018 của tvN. Cuối năm 2018, cô đóng vai chính trong After The Rain của KBS2 và xuất hiện trong video âm nhạc \"The Hardest Part\" của Roy Kim. Vào năm 2019, cô đóng vai phụ trong Abyss, cùng với các diễn viên chính Ahn Hyo-seop và Park Bo-young.\n\n2020: Sự công nhận rộng rãi thông qua Thế giới hôn nhân:\n\nVào năm 2020, Han So-hee đóng vai chính trong bộ phim ăn khách Thế giới hôn nhân của JTBC cùng với Kim Hee-ae và Park Hae-joon, trong đó cô đóng vai một tình nhân trẻ. Bộ phim kết thúc với tư cách là phim có tỷ suất người xem cao nhất trong lịch sử truyền hình cáp Hàn Quốc. Han So-hee cũng trở nên nổi tiếng nhờ thành công vang dội của phim.\n\n2021 - Nay: Vai chính:\n\nHan So-hee đóng vai chính được phát sóng đầu tiên là trong bộ phim Dẫu biết của JTBC, phát sóng từ ngày 19 tháng 6. Cùng năm Han So-hee cũng đóng vai chính trong bộ phim truyền hình My Name của Netflix. Từ đó luôn đảm nhận các vai chính trong các bộ phim tiếp theo và trở thành ngôi sao Hallyu của Hàn Quốc. \nNăm 2025 Han So Hee tham gia phim điện ảnh Project Y và bộ phim đã đi được nhiều liên hoan phim quốc tế: LHP quốc tế hạng A Toronto, Busan, London, Mỹ...Bộ phim giúp danh tiếng của cô ấy vươn tầm quốc tế và cô ấy đã đóng tiếp thêm 1 bộ phim điện ảnh The Intern dự kiến được phát hành cuối năm 2026. \nHiện tại Han So Hee được cho là sẽ đóng vai nữ chính Cha Hae In trong bộ phim live action nổi tiếng đình đám Solo Leveling. Bộ phim được Netflix đầu tư lớn với công nghệ CGI hoành tráng, bộ phim sẽ giúp danh tiếng của Sohee tiếp cận được đến với lớp khán giả mới là những người hâm mộ Manga.\n\nDanh sách phim, MV và các chương trình:",
    "aliases": [
      "han so-hee",
      "han so hee"
    ],
    "featured": false
  },
  {
    "slug": "song-kang",
    "name": "Song Kang",
    "englishName": "Song Kang",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 2,
    "tags": [
      "K-Drama",
      "Tình cảm",
      "Kinh dị"
    ],
    "roles": "Chàng Quỷ Của Tôi (My Demon) • Sweet Home",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/83fLAMMb1LGT8YZ4dgRI0fti3az.jpg",
    "tmdbPersonId": 1878952,
    "birthday": "1994-04-23",
    "placeOfBirth": "Suwon, Gyeonggi, South Korea",
    "bio": "Đây là một tên người Triều Tiên, họ là Song.\nSong Kang (tiếng Hàn: 송강, sinh ngày 23 tháng 4 năm 1994) là một nam diễn viên, người mẫu người Hàn Quốc, anh xuất hiện lần đầu trên truyền hình trong loạt phim hài lãng mạn 2017 Kẻ nói dối và người tình. Năm 2019, anh bắt đầu được mọi người chú ý tới với vai diễn Hwang Sun-oh trong bộ phim Love Alarm.\n\nSự nghiệp:\n\nSong Kang xuất hiện lần đầu trên truyền hình trong loạt phim hài lãng mạn 2017 The Liar and His Lover, trong đó anh đóng vai người bạn thời thơ ấu của nhân vật chính Baek Jin-woo. Cùng năm, anh tham gia bộ phim gia đình Man in the Kitchen kết thúc phát sóng vào năm 2018. Anh cũng xuất hiện trong 2 video âm nhạc:\"Sweet Summer Night\"  của The Ade & \"Love Story\" của Suran. Năm 2017 anh tham gia buổi fan meeting \"Giới thiệu về tân binh\" của Namoo Actors vào ngày 8 tháng 7 năm 2017 cùng với Oh Seung-hoon và Lee Yoo-jin. Vé của buổi fan meeting đã bán hết trong vòng 30 giây. Một tuần sau đó anh ra mắt bộ phim \"Beautiful Vampire\".\nSong Kang đã từng làm MC cho chương trình âm nhạc Inkigayo phát sóng từ ngày 18 tháng 2 đến ngày 28 tháng 10 năm 2018 cùng với Mingyu của Seventeen và Jung Chae-yeon của DIA.Cùng năm, anh ấy xuất hiện trong chuyến lưu diễn San Francisco của chương trình truyền hình Salty Tour cùng Sunny và Park Chanyeol.Anh ấy cũng trở thành một thành viên cố định của chương trình tạp kỹ Village Survival, the Eight. Anh ấy được đề cử ở hạng mục \"Giải thưởng tân binh\" trong Lễ trao giải  SBS Entertainment lần thứ 12 cho các tác phẩm của anh ấy trên Inkigayo và Village Survival, the Eight.\nVào năm 2019, Song Kang xuất hiện với vai trò khách mời trong tập phim 13 Chạm vào tim em của đài tvN.  Anh cũng nhận lời đóng một vai phụ trong Khi quỷ gọi tên em, bộ phim chuyển thể từ Faust của Goethe.  Anh lần đầu đóng vai chính trong bộ phim truyền hình Netflix Love Alarm.  Anh ấy cũng xuất hiện trong video âm nhạc \"Call Me Back\" của Vibe.\nVào năm 2020, Song nhận lời đóng vai chính trong bộ phim truyền hình Sweet Home, chuyển thể từ webtoon cùng tên.",
    "aliases": [
      "song kang"
    ],
    "featured": false
  },
  {
    "slug": "cha-eun-woo",
    "name": "Cha Eun-woo",
    "englishName": "Cha Eun-woo",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 2,
    "tags": [
      "K-Drama",
      "Tình cảm",
      "Hài"
    ],
    "roles": "Vẻ Đẹp Đích Thực (True Beauty)",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/kZUO2s2ZsBRYZ8acu0wMzlGHpRS.jpg",
    "tmdbPersonId": 1604826,
    "birthday": "1997-03-30",
    "placeOfBirth": "Gunpo, Gyeonggi, South Korea",
    "bio": "Lee Dong-min (Hangul: 이동민, sinh ngày 30 tháng 3 năm 1997), còn được biết đến với nghệ danh Cha Eun-woo (Hangul: 차은우), là một nam ca sĩ, người mẫu kiêm diễn viên và MC người Hàn Quốc. Anh là thành viên của nhóm nhạc nam Astro do công ty giải trí Fantagio thành lập và quản lý. Anh được đánh giá là một trong những ngôi sao nổi tiếng hàng đầu Hàn Quốc \n\nTiểu sử:\n\nCha Eun-woo theo học tại Trường Trung học Nghệ thuật Hanlim. Vào năm 2016, anh nhập học vào trường Đại học Sungkyunkwan, chuyên ngành diễn viên và đã được nhận vào học từ tháng 11 năm 2015.\nTrước khi ra mắt chính thức cùng với ASTRO, nam idol là thực tập sinh đầu tiên được giới thiệu trước khi tiết lộ hình ảnh.\n\nNăng khiếu và tài năng:\n\nEunwoo tiết lộ rằng, anh có thể chơi đàn piano, guitar, violin. Thành viên cùng nhóm ASTRO JinJin tiết lộ rằng anh và Eunwoo là 2 người nói tiếng Anh giỏi nhất trong nhóm. Nam idol cũng thông thạo các thứ tiếng như tiếng Nhật, tiếng Trung. Cha Eun-woo gắn liền với hình tượng \"ManJjitNam\", một người đẹp trai đến từ thế giới truyện tranh. Thậm chí ở Hàn, cậu còn nổi tiếng với câu nói \"Bias là bias, Cha Eun Woo là Cha Eun Woo\" (được nhắc đến trong tập 76 của \"How do you play?\" của đài MBC). Eunwoo được dân Hàn Quốc ưu ái đặt cho biệt danh là \" Face Genius\" (gương mặt thiên tài) do gương mặt đẹp đúng tỉ lệ vàng và không góc chết như bước ra từ truyện tranh của cậu.\nNgoài ra, anh cũng tham gia nhiều chuyên ngành như thể thao (bơi lội, bóng rổ), diễn xuất, người mẫu, ...\nEunwoo cũng tiết lộ rằng: hồi còn đi học, xếp hạng cao nhất ở trên trường là top 3 và thấp nhất là top 20 do bận lịch trình chuẩn bị debut cùng các thành viên trong nhóm ASTRO. Cậu cũng là chủ tịch hội học sinh thời đó.\n\nCuộc đời và sự nghiệp:\n\n1997–2013: Những năm thiếu thời:\n\nLee Dong-min sinh ngày 30 tháng 3 năm 1997 tại thành phố Gunpo, Gyeonggi. Anh đến từ một gia đình khá giả và có một cậu em trai tên là Lee Dong-hwi sinh năm 1999.\n\n2013–2015: Sự nghiệp bắt đầu:\n\nCha Eun-woo ra mắt với tư cách là một diễn viên với một vai nhỏ trong bộ phim My Brilliant Life. Anh ấy là thực tập sinh thứ tư được giới thiệu chính thức với Fantagio iTeen Photo Test Cut. Vào tháng 8 năm 2015, Cha cùng với các thành viên khác của Astro tham gia web-drama, To Be Continued.\n\n2016–2022: Ra mắt cùng Astro, hoạt động solo và thành công:",
    "aliases": [
      "cha eun-woo",
      "cha eun woo"
    ],
    "featured": false
  },
  {
    "slug": "lee-jong-suk",
    "name": "Lee Jong-suk",
    "englishName": "Lee Jong-suk",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 2,
    "tags": [
      "K-Drama",
      "Tình cảm",
      "Hành động"
    ],
    "roles": "Big Mouth • Khi Nàng Say Giấc",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/eW73DbmKQrqb6xDC52oMbVehw6G.jpg",
    "tmdbPersonId": 1095818,
    "birthday": "1989-09-14",
    "placeOfBirth": "Suwon, Gyeonggi, South Korea",
    "bio": "Lee Jong-suk  (tiếng Hàn: 이종석; sinh ngày 14 tháng 9 năm 1989) là nam diễn viên, người mẫu người Hàn Quốc. Anh ra mắt năm 2005 với bộ phim ngắn Sympathy. Jong-suk trở thành người mẫu đại diện cho CASS Beer Fresh cùng với Kim Woo-bin và New Asics với Ha Ji Won. Anh đã giành giải \"Diễn viên mới xuất sắc nhất\" tại 2012 KBS Drama Awards cho School 2013. Năm 2013, Lee Jong-suk được xếp vị trí thứ 5 trong một cuộc khảo sát tiêu đề 'Diễn viên tỏa sáng 2013' bởi Gallup Korea, một trong những giải thưởng danh giá trong ngành giải trí Hàn Quốc.\nLee Jong-suk nổi tiếng với nhiều tác phẩm truyền hình như Đôi tai ngoại cảm (2013), Pinocchio  (2014), W (2016), Khi nàng say giấc (2017), Big Mouth (2022)...\n\nSự nghiệp:\n\nLee Jong-suk từng tham gia thi tuyển diễn viên vào đài truyền hình SBS khi anh còn là học sinh trung học và trúng tuyển vào lần tuyển dụng thứ 7  của đài SBS. Anh theo học khoa Điện ảnh nghệ thuật tại Đại học Konkuk,\nTrong lĩnh vực người mẫu, Lee Jong-suk là người mẫu nam trẻ nhất của chương trình Seoul Collection.\nNăm 2010, Lee tham gia vào 2 bộ phim truyền hình Hàn Quốc là Prosecutor Princess và Secret Garden. Jong-suk thu hút mọi người bởi chiều cao, vẻ quyến rũ của chính anh cũng như cách diễn xuất tự nhiên. Thành công và được nhiều người biết đến nhất là vai trò nhạc sĩ trong phim Secret Garden.\nTháng 9, 2011, Lee xuất hiện trong High Kick Season 3 của MBC.\nSau lần đóng bộ phim kinh dị Ghosts, Jong Suk bắt đầu đóng phim R2B: Return to Base với vai trò là diễn viên chính trong bộ phim bay đầu tiên. Anh giữ vai trò quan trọng cùng với Rain xuất hiện như một phần của đội phi công F-15K. Nó được làm lại từ bộ phim Hàn Quốc gốc năm 1964 Red Muffler/Scarf trong suốt chiến tranh Hàn Quốc.\nNăm 2012 anh vào vai học sinh cấp 3 Go Nam Soon trong bộ phim School 2013. Anh nhận được Giải xuất sắc trong dàn diễn viên nam tại Korea Drama Awards trong bộ phim truyền hình SBS: I Hear Your Voice\nNăm 2014, anh tham gia đóng bộ phim Hot Young Bloods với Park Bo-young. Ngoài ra anh còn là diễn viên chính trong phim No Breathing với Seo In-guk và Kwon Yuri của Girls' Generation.\nFanclub chính thức của Lee Jong-suk được ra đời với tên gọi With (với ý nghĩa With Jong-suk) trong buổi fanmeeting mừng sinh nhật 14 tháng 9, 2014.\nTháng 12 năm 2015, Lee Jong-suk kết thúc hợp đồng với công ty WellMade, chính thức trở thành diễn viên tự do. Đồng thời công bố tham gia vào dự án phim truyền hình đầu tiên Trung Quốc Người Tình Phỉ Thúy. Đây cũng là dự án hợp tác cuối cùng của Lee Jong-suk trước khi chính thức rời khỏi Wellmade. Bộ phim được quay tại một số địa điểm ở Trung Quốc như Thượng Hải, phim trường Hoành Điếm... kéo dài từ tháng 2 đến tháng 4, 2016.\nTháng 5 năm 2016, Lee Jong-suk chính thức gia nhập YG Entertainment, sát cánh cùng với các diễn viên kì cựu Kang Dong Won, Kim Hee Ae, Cha Seung Won, Choi Ji Woo v.v... Cùng năm, anh xác nhận tham gia bộ phim kịch tính, lãng mạn W cùng Han Hyo Joo.",
    "aliases": [
      "lee jong-suk",
      "lee jong suk"
    ],
    "featured": false
  },
  {
    "slug": "tom-hanks",
    "name": "Tom Hanks",
    "englishName": "Tom Hanks",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Chính kịch",
      "Hài"
    ],
    "roles": "Huyền thoại điện ảnh • 2 giải Oscar",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/oFvZoKI6lvU03n4YoNGAll9rkas.jpg",
    "tmdbPersonId": 31,
    "birthday": "1956-07-09",
    "placeOfBirth": "Concord, California, USA",
    "bio": "Thomas Jeffrey Hanks (sinh ngày 9 tháng 7 năm 1956) là diễn viên, đạo diễn, nhà sản xuất phim người Mỹ nổi tiếng. Ông đã đoạt 2 giải Oscar cho các vai diễn trong phim Philadelphia và Forrest Gump. Hanks là một trong ba diễn viên duy nhất từng đóng 7 phim bom tấn liên tiếp có doanh thu trên 100 triệu đô la Mỹ, ông cũng là ngôi sao mang lại doanh thu cao thứ hai trong lịch sử điện ảnh. Ông được đánh giá là một trong những nam diễn viên xuất sắc bậc nhất lịch sử Hollywood \n\nTiểu sử:\n\nHanks sinh ở thành phố Concord, California, Hoa Kỳ. Bố của ông, ông Amos Mefford Hanks là một đầu bếp, còn mẹ là Janet Marylyn Frager làm việc trong bệnh viện, hai người li dị nhau khi Hanks mới được 4 tuổi. Tom Hanks có một người chị, Sandra Hanks (hiện là một nhà văn), một người anh Lawrence M. Hanks (nhà côn trùng học) và một người em trai Jim Hanks (cũng là diễn viên và nhà sản xuất phim).\nỞ trường học, Hanks ít được giáo viên và bạn bè chú ý và quý mến, ông đã kể với tạp chí Rolling Stone: \"Khi còn là học sinh tôi rất lập dị và nhút nhát. Tuy vậy tôi lại là người có thể hét to những đoạn hội thoại buồn cười trong các bộ phim. Tôi chưa bao giờ gây ra rắc rối và luôn là một đứa trẻ ngoan, có trách nhiệm\". Khi học cấp III ở trường Skyline, thành phố Oakland, California, Tom đã tham gia đóng những vở kịch của trường, trong đó có vở nhạc kịch South Pacific. Sau đó Hanks học về diễn xuất trong 2 năm ở trường cao đẳng Chabot trước khi chuyển đến Đại học của tiểu bang California tại Sacramento (California State University, Sacramento). Hanks đã trả lời phỏng vấn báo New York Times: \"Các lớp học diễn xuất có lẽ là nơi tốt nhất cho những gã thích gây ồn ào và ưa khoa trương. Tôi đã dành rất nhiều thời gian để xem kịch. Tôi không bao giờ đi cùng ai mà cứ lái xe đến rạp, tự mua vé, ngồi vào ghế, đọc tờ chương trình và sau đó hoàn toàn nhập tâm vào vở kịch. Tôi xem rất nhiều, từ Bertolt Brecht, Tennessee Williams đến Henrik Ibsen và những người khác nữa.\"\nTrong thời gian học đại học, Hanks gặp Vincent Dowling, người phụ trách của liên hoan kịch Great Lakes Theater Festival ở Cleveland. Đồng ý với đề nghị của Dowling, Hanks trở thành người thực tập ở đây, trong 3 năm ông đã làm tất cả mọi việc từ phụ trách ánh sáng, dàn dựng đến quản lý sân khấu. Hợp đồng này buộc Hanks phải bỏ học nhưng nó lại mở ra tương lai diễn xuất cho ông. Hanks đã giành giải Nam diễn viên xuất sắc nhất của Hiệp hội phê bình Cleveland cho vai Proteus trong vở kịch của Shakespeare Hai quý ông thành Verona, đây cũng là một trong số ít lần Hanks vào vai phản diện.\n\nSự nghiệp:\n\n1979 - 1991:",
    "aliases": [
      "tom hanks"
    ],
    "featured": true
  },
  {
    "slug": "leonardo-dicaprio",
    "name": "Leonardo DiCaprio",
    "englishName": "Leonardo DiCaprio",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Chính kịch",
      "Tội phạm"
    ],
    "roles": "Nam diễn viên xuất sắc • Oscar",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/wo2hJpn04vbtmh0B9utCFdsQhxM.jpg",
    "tmdbPersonId": 6193,
    "birthday": "1974-11-11",
    "placeOfBirth": "Los Angeles, California, USA",
    "bio": "Leonardo Wilhelm DiCaprio (, ; tiếng Ý: [diˈkaːprjo]; sinh ngày 11 tháng 11 năm 1974) là một nam diễn viên kiêm nhà sản xuất điện ảnh người Mỹ. Nổi danh qua những bộ phim thuộc thể loại tiểu sử và lịch sử, anh đã nhận được nhiều giải thưởng danh giá, bao gồm một giải Oscar, một giải BAFTA, một giải SAG, một giải Emmy, một giải Gấu bạc, và ba giải Quả cầu vàng. Tính đến  năm 2019, các tác phẩm của DiCaprio thu về hơn 7 tỷ USD trên toàn cầu và anh đã 8 lần góp mặt trong danh sách nam diễn viên có thu nhập cao nhất thế giới thường niên.\nSinh ra tại Los Angeles, DiCaprio bắt đầu sự nghiệp vào cuối thập niên 1980 bằng việc góp mặt trong các quảng cáo trên truyền hình. Vào đầu thập niên 1990, anh đã có các vai diễn định kỳ trong nhiều chương trình truyền hình khác nhau, chẳng hạn như bộ phim hài tình huống Parenthood, và có vai chính đầu tiên của mình khi hóa thân thành nhà văn Tobias Wolff trong This Boy's Life (1993). Anh nhận được sự hoan nghênh của giới phê bình cũng như được đề cử giải Oscar và giải Quả cầu vàng đầu tiên cho vai diễn cậu bé khuyết tật phát triển trong What's Eating Gilbert Grape (1993). DiCaprio trở thành ngôi sao quốc tế với các bộ phim tình cảm bất hạnh Romeo + Juliet (1996) và Titanic (1997). Sau khi Titanic trở thành phim có doanh thu cao nhất thời điểm đó, anh giảm bớt khối lượng công việc của mình trong vài năm. Trong nỗ lực thoát khỏi hình tượng anh hùng lãng mạn, DiCaprio đã tìm kiếm những vai diễn ở nhiều thể loại khác nhau, bao gồm các bộ phim tội phạm Catch Me If You Can (2002) và Gangs of New York (2002); Gangs of New York đánh dấu lần hợp tác thành công đầu tiên của anh với đạo diễn Martin Scorsese.\nDiCaprio đã giành được đề cử Quả cầu vàng cho các vai diễn trong phim tiểu sử The Aviator (2004), phim chính trị giật gân Kim cương máu (2006), phim tâm lý tội phạm Điệp vụ Boston (2006) và phim chính kịch lãng mạn Khát vọng tình yêu (2008). Trong thập niên 2010, anh làm phim tài liệu về môi trường và thủ vai chính trong một số tác phẩm thành công của những đạo diễn nổi tiếng, bao gồm bộ phim hành động ly kỳ Inception (2010), phim viễn tây Hành trình Django (2012), phim tiểu sử Sói già phố Wall (2013), phim sinh tồn Người về từ cõi chết (2015)—vai diễn trong tác phẩm này mang lại cho anh giải Oscar cho nam diễn viên chính xuất sắc nhất—các bộ phim hài-chính kịch Chuyện ngày xưa ở... Hollywood (2019) và Đừng nhìn lên (2021), cùng với bộ phim hình sự miền viễn Tây Vầng trăng máu (2023).\nDiCaprio là người sáng lập Appian Way Productions—một công ty sản xuất phim ảnh đã sản xuất một số bộ phim của anh và loạt phim tài liệu Greensburg (2008–2010)—và Quỹ Leonardo DiCaprio, một tổ chức phi lợi nhuận tập trung vào việc nâng cao nhận thức của công chúng về môi trường. Là Sứ giả Hòa bình Liên Hợp Quốc, anh thường xuyên ủng hộ các hoạt động thiện nguyện.",
    "aliases": [
      "leonardo dicaprio",
      "leo dicaprio"
    ],
    "featured": true
  },
  {
    "slug": "brad-pitt",
    "name": "Brad Pitt",
    "englishName": "Brad Pitt",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Hành động",
      "Chính kịch"
    ],
    "roles": "Tài tử Hollywood • Nhà sản xuất",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/ajNaPmXVVMJFg9GWmu6MJzTaXdV.jpg",
    "tmdbPersonId": 287,
    "birthday": "1963-12-18",
    "placeOfBirth": "Shawnee, Oklahoma, USA",
    "bio": "Brad Pitt (tên thật là William Bradley Pitt sinh ngày 18 tháng 12 năm 1963) là một diễn viên và nhà sản xuất phim người Mỹ. Brad Pitt được bình chọn là một trong những người đàn ông hấp dẫn nhất thế giới. Brad Pitt từng nhận được ba đề cử cho giải Oscar và nhận được một giải Oscar và một giải Quả cầu vàng.\nPitt bắt đầu sự nghiệp diễn xuất với tư cách khách mời trên phim truyền hình, bao gồm cả vai diễn trong phim truyền hình dài tập Dallas trên kênh CBS vào năm 1987. Anh bắt đầu được chú ý qua vai cao bồi trong phim Thelma & Louise (1991). Pitt nhận được vai chính đầu tiên trong phim A River Runs Through It (1992) và Interview With The Vampire (1994). Anh đóng chung với Anthony Hopkins trong bộ phim bi kịch Legends of the Fall vào năm 1994, vai diễn này đã giúp anh nhận được một đề cử cho giải Quả cầu vàng. Năm 1995, anh được đánh giá cao qua vai diễn trong phim Se7en và Twelve Monkeys. Pitt đã nhận được đề cử cho giải Oscar và đã giành chiến thắng với giải Quả cầu vàng cho vai diễn phụ xuất sắc nhất của anh trong phim Twelve Monkeys (1996). Pitt tỏa sáng trong phim Fight Club (1999) và bộ phim nổi tiếng Ocean's Eleven (2001) cùng với các phần tiếp theo là Ocean's Twelve (2004) và Ocean's Thirteen (2007). Anh thành công lớn về mặt doanh thu qua phim Troy (2004) và Mr. & Mrs. Smith (2005). Pitt nhận được đề cử giải Oscar thứ hai cho vai diễn cùng tên trong phim The Curious Case Of Benjamin Button vào năm 2008. Những phim nổi bật khác của anh là Inglourious Basterds, Moneyball.\nSau khi kết thúc cuộc tình đẹp với nữ diễn viên Gwyneth Paltrow, Pitt đã kết hôn với nữ diễn viên Jennifer Aniston và cuộc hôn nhân của họ chỉ kéo dài được 5 năm. Năm 2009, anh chung sống với nữ diễn viên Angelina Jolie, chuyện tình của họ đã thu hút sự chú ý của giới truyền thông trên toàn thế giới. Anh cùng Jolie nhận nuôi ba đứa trẻ là Maddox, Zahara và Pax Thien (người Việt), ngoài ra họ còn sinh thêm ba đứa con là Shiloh, Knox và Vivienne. Pitt là chủ một công ty sản xuất phim tên Plan B Entertainment, công ty này đã sản xuất bộ phim giành giải Oscar Phim xuất sắc nhất năm 2007, The Departed. Kể từ lúc bắt đầu mối quan hệ với Angelina Jolie, Pitt ngày càng tham gia nhiều hoạt động xã hội cả trong và ngoài nước. Brad Pitt đã ly hôn với Angelina Jolie.\n\nThời niên thiếu:",
    "aliases": [
      "brad pitt"
    ],
    "featured": true
  },
  {
    "slug": "tom-cruise",
    "name": "Tom Cruise",
    "englishName": "Tom Cruise",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Hành động",
      "Chính kịch"
    ],
    "roles": "Siêu sao hành động • Mission Impossible",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/maf8PhSvDCdEwjEMbYfGpojR5RP.jpg",
    "tmdbPersonId": 500,
    "birthday": "1962-07-03",
    "placeOfBirth": "Syracuse, New York, USA",
    "bio": "Thomas Cruise Mapother IV (sinh ngày 3 tháng 7 năm 1962) là một nam diễn viên và nhà sản xuất phim người Mỹ. Anh bắt đầu sự nghiệp của mình ở tuổi 19 với bộ phim Endless Love. Cruise cũng được biết đến rộng rãi với vai diễn điệp viên IMF Ethan Hunt trong loạt phim Nhiệm vụ bất khả thi. Anh đã giành chiến thắng một giải Quả cầu vàng ở hạng mục \"Nam diễn viên phim chính kịch xuất sắc nhất\" vào năm 1990 cho vai diễn trong bộ phim Born on the Fourth of July; Nam diễn viên phim ca nhạc hoặc phim hài xuất sắc nhất vào năm 1997 cho Jerry Maguire; và Nam diễn viên điện ảnh phụ xuất sắc nhất vào năm 2000 cho bộ phim Magnolia. Tính tới tháng 9 năm 2017, các bộ phim có Cruise tham gia đã đạt mức doanh thu 3,7 tỉ USD tại phòng vé Mỹ và Canada, cũng như tổng 9,0 tỉ USD toàn cầu, giúp anh trở thành nam diễn viên đạt doanh thu cao thứ tám ở Bắc Mỹ và đồng thời là một trong những nam diễn viên có doanh thu phim cao nhất toàn cầu.\nNgoài ra, Cruise còn là một người ủng hộ Khoa luận giáo và các chương trình xã hội liên quan, vì tôn giáo này đã giúp anh vượt qua chứng khó đọc.\n\nThời thơ ấu:\n\nCruise được sinh ra tại Syracuse, New York, là con trai của Mary Lee (họ gốc Pfeiffer), một giáo viên giáo dục đặc biệt, và Thomas Cruise Mapother III, một kỹ sư điện, cả hai đều đến từ Louisville, Kentucky. Anh có ba chị em ruột là Lee Anne, Marian và Cass. Họ đều mang dòng máu Anh, Đức và Ireland. Một trong những kị bên họ nội của Cruise là Patrick Russell Cruise, người được sinh ra tại miền bắc Hạt Dublin vào năm 1799; ông cưới Teresa Johnson ở Hạt Meath vào năm 1825. Họ rời Ireland tới Mỹ cùng năm đó và sinh sống tại New York. Cả hai người có một con gái tên là Mary Paulina Russell Cruise, và con trai của bà, Thomas Cruise Mapother, chính là cụ của Cruise. Em họ của Cruise, William Mapother, cũng là một diễn viên; và cả hai anh em đã xuất hiện cùng nhau trong tổng cộng năm phim.\nCruise lớn lên trong gia cảnh nghèo nàn, và được nuôi dạy theo Công giáo Rôma. Cha anh là người hay bạo hành gia đình, và Cruise đã từng bị cha mình đánh đập, \"Ông ấy là loại người mà, nếu sự việc đi quá xa, ông ấy sẽ đá bạn. Đó là một bài học lớn của đời tôi—cái cách mà ông ấy ru bạn ngủ, khiến bạn cảm thấy an toàn và rồi, bốp! Đối với tôi, nó như kiểu, 'Có điều gì đó rất sai đối với người đàn ông này. Đừng tin ông ta. Hãy cẩn thận khi ở bên cạnh ông ta.'\"\nCruise có một khoảng thời gian thơ ấu sinh sống tại Canada. Gia đình anh chuyển tới Beacon Hill, Ottawa vào cuối năm 1971 để cha của Cruise có thể làm cố vấn quốc phòng trong Quân đội Canada. Tại đây, Cruise theo học lớp bốn và lớp năm tại trường Robert Hopkins Public School. Ở lớp bốn, Cruise lần đầu tiên được tham gia vào diễn xuất, dưới sự dẫn dắt của George Steinburg. Cruise cùng sáu bạn nam khác tham gia một vở nhạc kịch có tên là IT tại lễ hội kịch của trường Carleton Elementary School.",
    "aliases": [
      "tom cruise"
    ],
    "featured": true
  },
  {
    "slug": "johnny-depp",
    "name": "Johnny Depp",
    "englishName": "Johnny Depp",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Hài",
      "Chính kịch"
    ],
    "roles": "Thuyền trưởng Jack Sparrow • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/k2xt6EUxQDwYRKIyI4IBdZxfs8n.jpg",
    "tmdbPersonId": 85,
    "birthday": "1963-06-09",
    "placeOfBirth": "Owensboro, Kentucky, USA ",
    "bio": "John Christopher Depp II (sinh ngày 9 tháng 6 năm 1963) là một nam diễn viên, nhà sản xuất điện ảnh và nhạc sĩ người Mỹ. Trong suốt sự nghiệp của mình, ông là người nhận được nhiều giải thưởng khác nhau, bao gồm giải Quả cầu vàng và Giải thưởng của Nghiệp đoàn Diễn viên Màn ảnh, cùng với các đề cử cho 3 giải Oscar và 2 giải BAFTA.\nDepp xuất hiện lần đầu tiên trong bộ phim kinh dị A Nightmare on Elm Street (1984), trước khi nổi lên với tư cách là một thần tượng tuổi teen trên loạt phim truyền hình 21 Jump Street (1987–1990). Trong những năm 1990, Depp chủ yếu đóng phim độc lập, thường đóng những nhân vật lập dị. Chúng bao gồm What's eat Gilbert Grape (1993), Benny and Joon (1993), Dead Man (1995), Donnie Brasco (1997), và Fear and Loathing in Las Vegas (1998). Depp cũng bắt đầu hợp tác với đạo diễn Tim Burton, đóng vai chính trong Edward Scissorhands (1990), Ed Wood (1994) và Sleepy Hollow (1999).\nTrong những năm 2000, Depp trở thành một trong những ngôi sao điện ảnh thành công nhất về mặt thương mại khi thủ vai thuyền trưởng Jack Sparrow trong loạt phim ăn khách Cướp biển vùng Caribe (2003–nay). Anh nhận được lời khen từ giới phê bình với Finding Neverland (2004), và tiếp tục hợp tác thành công về mặt thương mại với Tim Burton với các phim Charlie and the Chocolate Factory (2005), Corpse Bride (2005), Sweeney Todd: The Demon Barber of Fleet Street (2007), và Alice in Wonderland (2010). Năm 2012, Depp là một trong những ngôi sao điện ảnh lớn nhất thế giới, và được ghi vào sách Kỷ lục Guinness Thế giới là nam diễn viên được trả lương cao nhất thế giới với 75 triệu đô la Mỹ. Trong những năm 2010, Depp bắt đầu sản xuất phim thông qua công ty của mình, Infinitum Nihil, và thành lập siêu nhóm nhạc rock Hollywood Vampires với Alice Cooper và Joe Perry.\nTừ năm 2015 đến năm 2017, Depp đã kết hôn với nữ diễn viên Amber Heard. Cuộc ly hôn của họ đã thu hút sự chú ý của giới truyền thông khi Heard cáo buộc rằng Depp đã lạm dụng trong suốt mối quan hệ của họ. Vào năm 2018, Depp tuyên bố rằng Heard đã lạm dụng anh ta trước khi anh ta kiện không thành công các nhà xuất bản của tờ báo lá cải của Anh The Sun vì tội phỉ báng theo luật của Anh. Depp sau đó đã kiện Heard vì tội phỉ báng ở Virginia sau khi cô viết một bài báo nói rằng cô là nạn nhân công khai của bạo lực gia đình. Phiên tòa xét xử Depp kiện Heard bắt đầu vào năm 2022 và kết thúc với phán quyết của bồi thẩm đoàn có lợi cho Johnny Depp. Depp cũng có mối quan hệ với ca sĩ người Pháp Vanessa Paradis từ năm 1998 đến năm 2012; họ có hai con, bao gồm nữ diễn viên kiêm người mẫu Lily-Rose Depp.\n\nĐầu đời và tổ tiên:",
    "aliases": [
      "johnny depp"
    ],
    "featured": true
  },
  {
    "slug": "denzel-washington",
    "name": "Denzel Washington",
    "englishName": "Denzel Washington",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Hành động",
      "Tội phạm"
    ],
    "roles": "Tượng đài diễn xuất • 2 giải Oscar",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/jj2Gcobpopokal0YstuCQW0ldJ4.jpg",
    "tmdbPersonId": 5292,
    "birthday": "1954-12-28",
    "placeOfBirth": "Mount Vernon, New York, USA",
    "bio": "Denzel Hayes Washington, Jr. (sinh ngày 28 tháng 12 năm 1954), thường được biết đến với tên Denzel Washington là một diễn viên rất nổi tiếng của điện ảnh Mỹ. Cho đến nay Washington đã có tổng cộng hai tượng vàng Oscar trong số 10 lần đề cử và 3 giải Quả cầu vàng trong 11 lần đề cử. Denzel thường được biết tới với các vai diễn khắc họa các nhân vật có thật như Steve Biko, Malcolm X, Rubin \"Hurricane\" Carter, Melvin B. Tolson, Frank Lucas. Ông là người Mỹ gốc Phi thứ hai sau Sidney Poitier giành được Giải Oscar cho nam diễn viên chính xuất sắc nhất với vai diễn trong Training Day (2001).\n\nTiểu sử:\n\nDenzel Washington sinh năm 1954 tại Mt. Vernon, New York. Mẹ Denzel là bà Lennis \"Lynne\", là một chủ tiệm làm đầu người gốc Georgia nhưng lớn lên ở khu Harlem còn bố của Denzel là ông Reverend Denzel Washington, Sr., một mục sư đồng thời làm việc cho Sở cấp nước và cửa hiệu bách hóa \"S. Klein\".\nDenzel Washington học đại học tại khoa Kịch và Báo chí Đại học Fordham và lấy bằng cử nhân năm 1977. Sau một thời gian phân vân trong việc chọn nghề, Denzel nghe theo lời khuyên của người bạn thử tham gia diễn xuất. Ông đăng ký vào lớp diễn viên của Trung tâm Lincoln (Lincoln Center) và bắt đầu tham gia một số vở kịch của Eugene O'Neill và William Shakespeare. Sau khi tốt nghiệp lớp diễn xuất, Denzel tiếp tục giành được học bổng để theo học trường điện ảnh danh tiếng American Conservatory Theatre ở San Francisco. Sau một năm ở San Francisco, Washington quyết định quay về thành phố New York để bắt đầu nghề diễn viên chuyên nghiệp.\n\nSự nghiệp:\n\nGiai đoạn đầu:\n\nBộ phim điện ảnh đầu tiên của Denzel Washington là Carbon Copy (1981) tuy nhiên ông được chú ý nhiều hơn trên lĩnh vực truyền hình với vai diễn trong loạt phim truyền hình nổi tiếng lúc bấy giờ là St. Elsewhere. Denzel là một trong số ít diễn viên xuất hiện trong cả sáu mùa (từ năm 1982 đến năm 1988) công chiếu St. Elsewhere. Sau thành công trên truyền hình, Denzel được đạo diễn Richard Attenborough chọn vào vai nhà đấu tranh chống phân biệt chủng tộc Steve Biko trong bộ phim Cry Freedom (1988). Vai diễn đã mang lại đề cử Giải Oscar vai nam chính đầu tiên cho Denzel và bắt đầu cho truyền thống vào vai các nhân vật có thật trong lịch sử của ông. Hai năm sau Cry Freedom, Denzel có giải Oscar đầu tiên ở hạng mục Vai nam phụ cho vai diễn người lính da đen ngang ngạnh trong Glory (1989).\n\nThập niên 1990:",
    "aliases": [
      "denzel washington"
    ],
    "featured": true
  },
  {
    "slug": "keanu-reeves",
    "name": "Keanu Reeves",
    "englishName": "Keanu Reeves",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Hành động",
      "Võ thuật"
    ],
    "roles": "Sát thủ John Wick • The Matrix",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/8RZLOyYGsoRe9p44q3xin9QkMHv.jpg",
    "tmdbPersonId": 6384,
    "birthday": "1964-09-02",
    "placeOfBirth": "Beirut, Lebanon",
    "bio": "Keanu Charles Reeves ( kee-AH-noo; sinh ngày 2 tháng 9 năm 1964), là một diễn viên, đạo diễn, nhà sản xuất và nhạc sĩ người Canada. Keanu nổi tiếng với vai Neo trong loạt phim khoa học giả tưởng Ma trận (The Matrix), John Wick trong loạt phim cùng tên và nhiều bộ phim khác như Tốc độ (Speed), Kẻ cứu rỗi nhân loại (Constantine), Ngôi nhà bên hồ (The Lake House), Vua đường phố (Street Kings), Ngày Trái Đất ngừng quay (The Day The Earth Stood Still), 47 lãng khách (47 Ronin)...\nNăm 2006, Keanu được bầu chọn là một trong 10 ngôi sao được yêu thích nhất tại Mỹ trên tạp chí ETonline. Vào ngày 31 tháng 1 năm 2005, tên anh được vinh danh trên đại lộ Danh vọng Hollywood.\n\nGia đình:\n\nKeanu sinh ngày 2 tháng 9 năm 1964 tại thủ đô Beirut, Liban, là con của bà Patricia Taylor, một nhà thiết kế trang phục và người biểu diễn ở Essex, Vương quốc Anh và ông Samuel Nowlin Reeves Jr. - một nhà địa chất học. Mẹ của anh là người Anh còn cha của anh là một người Hawaii gốc Hoa, có tổ tiên là người Anh, Ireland và Bồ Đào Nha. Trong người anh mang cả ba dòng máu Mỹ - Á - Âu.\nBà Patricia làm việc tại Beirut và đã gặp cha của anh - Samuel, đang thất nghiệp. Họ yêu nhau và cưới nhau. Nhưng sau đó, cha anh đã vào tù do phạm tội buôn bán ma túy tại sân bay quốc tế Hilo ở Hawaii. Ông bỏ rơi vợ và ly dị năm 1966 khi Keanu mới 3 tuổi, lúc đó anh chưa có ấn tượng gì về ông cho tới năm anh 6 tuổi. Lần cuối anh gặp cha mình là vào năm anh 13 tuổi trên hòn đảo Kauai.\nSau khi ly dị, mẹ anh chuyển tới Sydney, Úc, sau đó năm 1970 là thành phố New York, nơi mẹ anh gặp Paul Aaron, một đạo diễn sân khấu Broadway và Hollywood. Họ chuyển tới Toronto, Ontario và ly dị năm 1971. Keanu được làm trợ lý sản xuất cho một bộ phim của Aaron vào năm anh lên 15 tuổi. Mẹ anh sau đó cưới Robert Miller, một nhà tài trợ nhạc rock năm 1976, và ly dị năm 1980. Không lâu sau mẹ anh cưới Jack Bond, một nhà tạo mẫu tóc, và ly dị năm 1994. Phần lớn tuổi thơ anh được ông bà và bảo mẫu nuôi nấng ở khu vực Yorkville, Toronto.\nKeanu có ba người em gái, đầu tiên là Kim Reeves (sinh ngày 19 tháng 6 năm 1966 tại Sydney, Úc) từng mắc phải căn bệnh ung thư bạch cầu và đã bình phục, thứ hai là người em gái cùng mẹ khác cha là Karina Miller (sinh năm 1976 tại Toronto) là con của Robert Miller, và cuối cùng là một người em gái cùng cha khác mẹ tên Emma Reeves (sinh năm 1980 ở Hawaii) là con riêng của ông Samuel.\n\nCuộc sống:",
    "aliases": [
      "keanu reeves"
    ],
    "featured": true
  },
  {
    "slug": "will-smith",
    "name": "Will Smith",
    "englishName": "Will Smith",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Hành động",
      "Chính kịch"
    ],
    "roles": "Ngôi sao Men in Black • I Am Legend",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/8TlKqbXYgHmmaEoPBJ7djJ8Rxxa.jpg",
    "tmdbPersonId": 2888,
    "birthday": "1968-09-25",
    "placeOfBirth": "Philadelphia, Pennsylvania, USA",
    "bio": "Willard Carroll Smith II (sinh ngày 25 tháng 9, năm 1968) là một diễn viên, rapper, nhà sản xuất và nhạc sĩ người Mỹ. Tháng 4 năm 2007, Newsweek đã xem xét ông là \"nam diễn viên quyền lực nhất Hollywood\". Smith đã được đề cử cho năm giải thưởng Quả Cầu Vàng và hai lần được đề cử Giải Oscar, và đã giành được bốn giải Grammy.\nVào cuối những năm 1980, ông chỉ nổi tiếng với công việc rapper nghệ danh là The Fresh Prince. Năm 1990, anh dần trở nên nổi tiếng sau khi đóng vai chính trong bộ phim truyền hình nổi tiếng NBC The Fresh Prince of Bel-Air, dài 6 mùa (đến năm 1996). Sau khi bộ phim kết thúc bộ phim, anh chuyển qua làm diễn viên điện ảnh và trở thành ngôi sao trong nhiều bộ phim bom tấn. Anh là diễn viên duy nhất có tám bộ phim liên tiếp thu về tổng cộng hơn 100 triệu đô la ở rạp chiếu phim trong nước, 11 bộ phim liên tiếp thu về trên 150 triệu đôla trên toàn thế giới, và tám bộ phim liên tiếp mà anh đóng vai chính ở vị trí số một tại doanh thu trong nước.\nSmith đã được tạp chí Forbes bình chọn là ngôi sao \"bankable\" (diễn viên có sức hút đến mức chỉ cần xuất hiện trong phim là đủ đảm bảo doanh thu phòng vé của bộ phim đó) nhất trên toàn thế giới. Tính đến năm 2014, 17 trong số 21 bộ phim mà anh đóng vai chính đã thu được tổng thu nhập trên 100 triệu đô la Mỹ trên toàn thế giới, mỗi năm thu về hơn 500 triệu đô la Mỹ. Tính đến năm 2016, bộ phim của ông đã thu về 7,5 tỷ đô la tại các phòng vé toàn cầu. Với vai diễn trong phim Ali (2001) và The Pursuit of Happiness (2006), Smith đã nhận được đề cử giải Oscar cho mục \"Nam diễn viên xuất sắc nhất\".\n\nThân thế:\n\nWillard Carroll Smith Jr. sinh ngày 25 tháng 9 năm 1968 ở Philadelphia, Pennsylvania. Mẹ ông là Caroline (Bright), một quản trị viên trường học ở Philadelphia, và cha ông là Willard Carroll Smith, Sr (mất năm 2016), một kỹ sư điện lạnh. Ông lớn lên tại vùng ngoại ô Wynnefield của Tây Philadelphia trong một gia đình theo đạo Báp-tít. Smith có ba anh chị em, chị gái Pamela, hơn bốn tuổi, và cặp song sinh Harry và Ellen, nhỏ hơn ba tuổi. Smith học ở Our Lady of Lourdes, một trường tiểu học Công giáo tư thục ở Philadelphia. Cha mẹ ông ly thân khi ông 13 tuổi, nhưng đến năm 2000 mới ly dị.\nSmith học trường trung học Overbrook. Mặc dù được công bố rộng rãi ra đại chúng, nhưng thật ra việc Smith từ chối học bổng để theo học tại Học viện Công nghệ Massachusetts (MIT) là không đúng sự thật, ông đã không bao giờ xin học đại học vì ông muốn trở thành rapper. \"Mẹ tôi, từng làm việc cho ở trường Philadelphia, có một người bạn là cán bộ tuyển sinh của MIT. Tôi có điểm SAT khá cao và họ đang cần tuyển những đứa trẻ da đen, nên có lẽ tôi đã có thể vào. Nhưng tôi vốn không có ý định học đại học.\" Smith nói.\n\nSự nghiệp ca nhạc và diễn xuất:\n\nSự nghiệp ca nhạc ban đầu:",
    "aliases": [
      "will smith"
    ],
    "featured": true
  },
  {
    "slug": "christian-bale",
    "name": "Christian Bale",
    "englishName": "Christian Bale",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "DC",
      "Chính kịch"
    ],
    "roles": "Kỵ sĩ bóng đêm Batman • Diễn xuất biến hóa",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/7Pxez9J8fuPd2Mn9kex13YALrCQ.jpg",
    "tmdbPersonId": 3894,
    "birthday": "1974-01-30",
    "placeOfBirth": "Haverfordwest, Pembrokeshire, Wales, UK",
    "bio": "Christian Charles Philip Bale (sinh ngày 30 tháng 1 năm 1974 tại Haverfordwest, Pembrokeshire, Wales) là một nam diễn viên người Anh. Được biết đến với sự linh hoạt và khả năng biến đổi hình thể thường xuyên để thực hiện các vai diễn của mình, anh là người đảm nhận nhiều vai diễn chính trong các bộ phim thuộc nhiều thể loại. Bale là người nhận được nhiều giải thưởng khác nhau, bao gồm một giải Oscar và hai giải Quả cầu vàng. Tạp chí Time đã đưa anh vào danh sách 100 người có ảnh hưởng nhất thế giới năm 2011.\nSinh ra ở Wales với cha mẹ là người Anh, Bale có vai diễn đột phá ở tuổi 13 trong bộ phim chiến tranh Empire of the Sun năm 1987 của đạo diễn Steven Spielberg. Sau hơn một thập kỷ thể hiện các vai chính và phụ trong các bộ phim, anh đã được công nhận rộng rãi hơn nhờ vai diễn kẻ giết người hàng loạt Patrick Bateman trong bộ phim hài đen American Psycho (2000) và vai chính trong bộ phim kinh dị tâm lý The Machinist (2004). Năm 2005, Bale đóng vai siêu anh hùng Bruce Wayne / Người Dơi trong Batman Begins và thể hiện vai diễn này trong các phần tiếp theo The Dark Knight (2008) và The Dark Knight Rises (2012), nhận được sự hoan nghênh cho màn trình diễn của anh trong cả ba bộ phim, đây là một trong những loạt phim có doanh thu cao nhất.\nBale tiếp tục tham gia các vai chính trong nhiều bộ phim ngoài vai Người Dơi, bao gồm bộ phim truyền hình cổ trang The Prestige (2006), bộ phim hành động Terminator Salvation (2009), bộ phim tội phạm Public Enemies (2009), bộ phim sử thi Exodus: Gods and Kings (2014) và phim cổ trang The Promise (2016). Với vai diễn võ sĩ quyền anh Dicky Eklund trong bộ phim tiểu sử The Fighter năm 2010, Bale đã giành được giải Oscar và giải Quả cầu vàng. Những năm sau đó, các đề cử giải Oscar và giải Quả cầu vàng đã đến với anh qua các vai diễn trong bộ phim hài đen American Hustle (2013) và phim tiểu sử The Big Short (2015) và Vice (2018). Các vai diễn chính trị gia Dick Cheney của Bale trong Vice và tay đua xe Ken Miles trong bộ phim thể thao Ford v Ferrari (2019) lần lượt mang về cho anh chiến thắng thứ hai và đề cử thứ năm tại giải Quả cầu vàng.\n\nTiểu sử:",
    "aliases": [
      "christian bale",
      "batman bale"
    ],
    "featured": true
  },
  {
    "slug": "jason-statham",
    "name": "Jason Statham",
    "englishName": "Jason Statham",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Hành động",
      "Võ thuật"
    ],
    "roles": "Ngôi sao hành động Người vận chuyển",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/8l6lmrmKFDvhDjMJPj6tBpJdhaA.jpg",
    "tmdbPersonId": 976,
    "birthday": "1967-07-26",
    "placeOfBirth": "Shirebrook, Derbyshire, England, UK",
    "bio": "Jason Statham (sinh ngày 26 tháng 7 năm 1967 tại Shirebrook, Derbyshire, Anh Quốc) là một nam diễn viên điện ảnh, vận động viên nhảy cầu và võ sĩ người Anh. Xuất thân là một diễn viên võ thuật, ông được biết đến qua những vai diễn trong những bộ phim tội phạm Lock, Stock and Two Smoking Barrels, Revolver và Snatch. Ông cũng đóng vai phụ trong vài bộ phim của Mỹ như The Italian Job, cũng như vai chính trong các phim The Transporter, Crank, The Bank Job, War và Death Race.\n\nĐời tư:\n\nStatham từng trải qua một mối quan hệ kéo dài bảy năm với người mẫu Kelly Brook từ năm 1997 đến năm 2004. Từ tháng 4 năm 2010, ông hẹn hò cùng người mẫu Rosie Huntington-Whiteley của Victoria's Secret.\n\nSự nghiệp:\n\nPhim ảnh:\n\nTrò chơi:\n\nChú thích:",
    "aliases": [
      "jason statham",
      "nguoi van chuyen"
    ],
    "featured": true
  },
  {
    "slug": "dwayne-johnson",
    "name": "Dwayne Johnson",
    "englishName": "The Rock",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "DC",
      "Hành động"
    ],
    "roles": "The Rock • Ông hoàng phòng vé",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/5QApZVV8FUFlVxQpIK3Ew6cqotq.jpg",
    "tmdbPersonId": 18918,
    "birthday": "1972-05-02",
    "placeOfBirth": "Hayward, California, USA",
    "bio": "Dwayne Douglas Johnson, thường được biết đến với nghệ danh Dwayne Johnson hay The Rock (sinh ngày 2 tháng 5 năm 1972), là một nam diễn viên, doanh nhân, nhà sản xuất điện ảnh kiêm đô vật chuyên nghiệp người Mỹ.\nJohnson từng tham gia đội bóng bầu dục tại Đại học Miami, và cũng tại đây anh đã giành chức vô địch quốc gia cho đội bóng bầu dục Miami Hurricanes 1991. Sau khi bị loại khỏi đội Calgary Stampeders của Canadian Football League 2 tháng sau khi mùa giải 1995 bắt đầu, anh bắt đầu quá trình luyện tập cho sự nghiệp đấu vật chuyên nghiệp, nối tiếp nhiều thành viên trong gia đình, trong đó có ông ngoại Peter Maivia và cha của anh, Rocky Johnson.\nĐược công nhận rộng rãi là một trong những đô vật chuyên nghiệp vĩ đại nhất trong làng đô vật thế giới, Johnson bắt đầu có được nhiều danh tiếng nhờ tham gia Liên đoàn Đấu vật Thế giới WWF (nay là WWE) từ năm 1996 tới năm 2004 và là đô vật thế hệ thứ ba đầu tiên trong lịch sử công ty. Anh trở lại tham gia WWE bán thời gian từ năm 2011–2013. Johnson từng tám lần vô địch giải WWF/WWE Championship,hai lần vô địch giải WCW/World Heavyweight Championship, hai lần vô địch giải WWE Intercontinental Championship và năm lần vô địch giải World Tag Team Championship. Anh là người thứ sáu đạt danh hiệu Triple Crown ở giải WWE và giành chiến thắng ở sự kiện Royal Rumble 2000. Cuốn tự truyện The Rock Says...của anh ra mắt ở vị trí quán quân trên danh sách bán chạy của tạp chí The New York Times năm 2000.\nVai diễn chính đầu tiên của Johnson là trong phim điện ảnh Vua Bọ cạp năm 2002. Với vai diễn này, anh được trả 5,5 triệu USD, một kỷ lục mới đối với vai chính đầu tiên của một diễn viên. Một vai diễn khác đáng chú ý của anh là Luke Hobbs trong thương hiệu Fast & Furious. Anh cũng tham gia sản xuất và dẫn chương trình The Hero, một cuộc thi truyền hình thực tế và kể từ đó vẫn tiếp tục sản xuất các chương trình truyền hình và phim điện ảnh thông qua công ty sản xuất riêng là Seven Bucks Productions. Năm 2013, Forbes xếp Johnson vào vị trí thứ 25 trong danh sách Top 100 ngôi sao quyền lực nhất và kể từ đó mỗi năm anh luôn lọt vào trong top 20. Ngoài ra anh còn là diễn viên có mức thù lao cao nhất năm 2016. Năm 2021, Dwayne Johnson tuyên bố rằng anh muốn trở thành diễn viên James Bond tiếp theo.",
    "aliases": [
      "dwayne johnson",
      "the rock"
    ],
    "featured": true
  },
  {
    "slug": "ryan-reynolds",
    "name": "Ryan Reynolds",
    "englishName": "Ryan Reynolds",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Marvel",
      "Hài"
    ],
    "roles": "Deadpool • Nam thần hài hước",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/trzgptffGvAlAT6MEu01fz47cLW.jpg",
    "tmdbPersonId": 10859,
    "birthday": "1976-10-23",
    "placeOfBirth": "Vancouver, British Columbia, Canada",
    "bio": "Ryan Rodney Reynolds (sinh ngày 23 tháng 10 năm 1976) là nam diễn viên, nhà sản xuất phim người Canada. Anh bắt đầu sự nghiệp của mình với vai chính trong vở kịch xà phòng dành cho thanh thiếu niên Canada Hillside (1991–1993), và có những vai nhỏ trước khi đảm nhận vai chính trong bộ phim sitcom Two Guys and a Girl từ năm 1998 đến 2001. Sau đó Reynolds đóng vai chính trong nhiều bộ phim, bao gồm phim hài như National Lampoon's Van Wilder (2002), Waiting ... (2005), và The Proposal (2009). Anh cũng tham gia các vai chính kịch trong Buried (2010), Woman in Gold (2015) và Life (2017), đóng các phim hành động như Blade: Trinity (2004), Green Lantern (2011), 6 Underground (2019) và Free Guy (2021), và cung cấp lồng tiếng trong các bộ phim hoạt hình The Croods (2013), Turbo (2013), Pokémon: Detective Pikachu (2019) và The Croods: A New Age (2020).\nThành công thương mại lớn nhất của Reynolds đến với các bộ phim siêu anh hùng Deadpool (2016) và Deadpool 2 (2018), trong đó anh đóng vai nhân vật chính cùng tên. Người từng lập nhiều kỷ lục vào thời điểm phát hành cho một bộ phim hài xếp hạng R và màn trình diễn của anh ấy đã mang về cho anh ấy đề cử tại Giải thưởng điện ảnh lựa chọn của các nhà phê bình và Giải thưởng Quả cầu vàng.\nReynolds đã được trao một ngôi sao trên Đại lộ Danh vọng Hollywood vào năm 2017. Anh đã kết hôn hai lần: với nữ diễn viên Scarlett Johansson từ năm 2008 đến năm 2011, và từ năm 2012 với nữ diễn viên Blake Lively, người mà anh có ba cô con gái.\n\nTiểu sử:\n\nRyan Rodney Reynolds sinh ngày 23 tháng 10 năm 1976 tại Vancouver, British Columbia. Anh là con út trong gia đình có 4 người con trai. Cha của anh, James Chester Reynolds, là một Cảnh sát viên Hoàng gia Canada trước khi nghỉ hưu và chuyển sang làm công việc bán buôn thực phẩm. Mẹ anh, Tamara Lee (nhũ danh Stewart) làm việc trong lĩnh vực bán lẻ. Reynolds có hai anh trai làm việc trong ngành thực thi pháp luật ở British Columbia, một trong số họ đã theo cha tham gia RCMP. Ông nội của anh, Chester Reynolds, là một nông dân đại diện cho Stettler trong Hội đồng Lập pháp của Alberta từ năm 1940 đến năm 1944.  Reynolds có tổ tiên là người Ireland và Scotland, và lớn lên trong Nhà thờ Công giáo La Mã ở khu phố Kitsilano của Vancouver. Anh ấy đã tham gia đóng phim từ năm 13 tuổi. Anh tốt nghiệp trường trung học Kitsilano vào năm 1994, trường mà anh theo học với nam diễn viên Joshua Jackson. Reynolds đóng một số vai nhỏ trong một số phim truyền hình, nhưng chán nản và bỏ diễn ở tuổi 19 để đăng ký học tại Đại học Bách khoa Kwantlen. Vài tháng sau, anh tình cờ gặp nam diễn viên Chris William Martin, người đã thuyết phục anh ta thử lại và cùng anh ta chuyển đến Los Angeles.\n\nSự nghiệp:\n\n1991–2003:",
    "aliases": [
      "ryan reynolds"
    ],
    "featured": true
  },
  {
    "slug": "chris-hemsworth",
    "name": "Chris Hemsworth",
    "englishName": "Chris Hemsworth",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Marvel",
      "Hành động"
    ],
    "roles": "Thần Sấm Thor • Vũ trụ Marvel",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/piQGdoIQOF3C1EI5cbYZLAW1gfj.jpg",
    "tmdbPersonId": 74568,
    "birthday": "1983-08-11",
    "placeOfBirth": "Melbourne, Victoria, Australia",
    "bio": "Christopher \"Chris\" Hemsworth (sinh ngày 11 tháng 8 năm 1983) là một diễn viên người Úc. Anh được biết đến nhiều nhất qua vai diễn Thần Sấm Thor trong các bộ phim thuộc Vũ trụ Điện ảnh Marvel như Thor (2011), The Avengers (2012), Thor: The Dark World (2013), Avengers: Age of Ultron (2015), Thor: Ragnarok (2017), Avengers: Infinity War (2018), Avengers: Endgame (2019) và Thor: Love and Thunder (2022) cũng như trong series truyền hình What If...? chiếu trên Disney+. Vai diễn này đã giúp anh trở thành một trong những diễn viên hàng đầu và được trả cát-xê cao nhất thế giới.\nCác vai diễn điện ảnh khác của anh bao gồm các phim hành động Star Trek (2009), Snow White and the Huntsman (2012), Red Dawn (2012), Blackhat (2015), Men in Black: International (2019), Extraction (2020), phim kinh dị A Perfect Getaway (2009) và bộ phim hài Ghostbusters (2016). Những bộ phim được giới phê bình đánh giá cao nhất bao gồm phim kinh dị hài The Cabin in the Woods (2012) và phim thể thao tiểu sử Rush (2013) trong đó anh đóng vai James Hunt.\n\nLý lịch:\n\nChris Hemsworth chào đời ở Melbourne, Australia, mẹ anh là Leonie và cha là Craig Hemsworth. Gia đình anh sau đó chuyển đến sống tại một nông trại ở Lãnh thổ Bắc Úc. Anh học trung học tại Heathmont College và ít năm sau lại chuyển đến sống ở đảo Phillip. Anh có người anh trai Luke và em trai Liam cũng là diễn viên.\n\nSự nghiệp:\n\nHemsworth bắt đầu sự nghiệp của mình bằng cách xuất hiện trong một số phim truyền hình. Năm 2002, Hemsworth đóng vai chính trong hai tập phim truyền hình Guinevere Jones với vai Vua Arthur, cũng như xuất hiện trong loạt phim truyền hình kinh điển Neighbours và một tập phim Marshall Law. Năm tiếp theo, anh xuất hiện trong một tập của The Saddle Club. Năm 2004, anh đi diễn thử vai Robbie Hunter trong sê-ri phim truyền hình Home and Away nhưng thất bại. Sau đó, anh được gọi đến để nhận vai Kim Hyde. Anh đã thành công với vai diễn Kim Hyde và chuyển đến Sydney để tham gia dàn diễn viên Home and Away, xuất hiện trong 171 tập của sê-ri này. Hemsworth đã nhận được đề cử hai giải Logie và thắng 1 giải trong hạng mục \"Tài năng mới được yêu thích nhất\" trong Home and Away vào năm 2005. Anh ấy rời khỏi dàn diễn viên của Home and Away vào ngày 3 tháng 7 năm 2007. Sau đó, Hemsworth nó rằng mặc dù anh ấy trở nên nổi tiếng hơn sau Home and Away, nhưng tác phẩm của anh ấy về một vở kịch xà phòng (kịch xà phòng là một dạng kịch truyền thanh hoặc phim truyền hình dài tập với nội dung chủ yếu đề cập đời sống của nhiều nhân vật, thường tập trung vào các mối quan hệ tình cảm của họ, và tạo ra kịch tính cao) không khiến anh ấy được tôn trọng trong ngành công nghiệp điện ảnh.\nHemsworth là thí sinh của Dancing with the Stars Australia mùa thứ năm, hợp tác với vũ công chuyên nghiệp là Abbey Ross. Mùa giải được công chiếu vào ngày 26 tháng 9 năm 2006. Sau sáu tuần, Hemsworth bị loại vào ngày 7 tháng 11.",
    "aliases": [
      "chris hemsworth"
    ],
    "featured": true
  },
  {
    "slug": "chris-evans",
    "name": "Chris Evans",
    "englishName": "Chris Evans",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Marvel",
      "Hành động"
    ],
    "roles": "Captain America • Đội trưởng Mỹ",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/3bOGNsHlrswhyW79uvIHH1V43JI.jpg",
    "tmdbPersonId": 16828,
    "birthday": "1981-06-13",
    "placeOfBirth": "Boston, Massachusetts, USA",
    "bio": "Christopher Robert \"Chris\" Evans (sinh ngày 13 tháng 6 năm 1981) là một nam diễn viên, nhà sản xuất và đạo diễn người Mỹ. Được biết đến với vai diễn Steve Rogers / Đội trưởng Mỹ trong Vũ trụ Điện ảnh Marvel (MCU), Evans bắt đầu sự nghiệp của mình với các vai diễn trong phim truyền hình, chẳng hạn như trong Opposite Sex vào năm 2000. Sau khi xuất hiện trong một số bộ phim dành cho tuổi teen bao gồm Not Another Teen Movie năm 2001, anh đã được chú ý cho vai diễn nhân vật Johnny Storm / Human Torch của Marvel Comics trong Fantastic Four năm 2005 và phần tiếp theo của nó là Fantastic Four: Rise of the Silver Surfer (2007). Evans tiếp tục xuất hiện trong các bộ phim chuyển thể từ truyện tranh và tiểu thuyết đồ họa: TMNT (2007), Scott Pilgrim vs. the World (2010) và Snowpiercer (2013).\nAnh ấy đóng vai Steve Rogers / Đội trưởng Mỹ trong các bộ phim MCU, bao gồm Captain America: The First Avenger (2011), Captain America: The Winter Soldier (2014) và Captain America: Civil War (2016), và các bộ phim tổng hợp The Avengers (2012), Avengers: Age of Ultron (2015), Avengers: Infinity War (2018) và Avengers: Endgame (2019). Ngoài ra, anh còn xuất hiện với tư cách khách mời trong các bộ phim MCU như Ant-Man (2015), Spider-Man: Homecoming (2017), Captain Marvel (2019). Vai diễn Steve Rogers của anh trong loạt phim Marvel đã đưa anh ấy trở thành một trong những diễn viên được trả lương cao nhất thế giới.\nNgoài các vai diễn trong truyện tranh, Evans còn tham gia bộ phim Gifted (2017), bộ phim thần bí Knives Out (2019) và phim truyền hình nhỏ Defending Jacob (2020). Anh ấy đã ra mắt đạo diễn vào năm 2014 với bộ phim truyền hình lãng mạn Before We Go do anh ấy sản xuất và đóng vai chính. Evans đã xuất hiện lần đầu trên sân khấu Broadway trong sự hồi sinh năm 2018 của vở kịch Lobby Hero của Kenneth Lonergan, bộ phim đã mang về cho anh ấy một đề cử Giải thưởng Drama League.\n\nTiểu sử:\n\nEvans chào đời ngày 13 tháng 6 năm 1981, ở Boston, Massachusetts, và trưởng thành ở thị trấn gần đó có tên Sudbury. Mẹ của anh, bà Lisa (họ thời con gái là Capuano), là giám đốc sáng tạo ở rạp hát Concord Youth Theater, và cha của anh, ông Bob, là nha sĩ. Nam diễn viên người Mỹ mang dòng máu của tổ tiên có nguồn gốc từ Ý và Ireland. Cha mẹ anh ly hôn vào năm 1999.\nAnh cao 1,83 m (6 ft 0 in) và nặng 88 kg (194 lb). Khi học trung học, Evans đã nuôi mơ ước được theo đuổi nghiệp diễn xuất nên đã đến New York gõ cửa các văn phòng tuyển chọn diễn viên và tham gia một khoá học diễn xuất. Sau khi tốt nghiệp trung học, Evans ký được hợp đồng với một công ty đại diện và bắt đầu cuộc phiêu lưu của mình tại Hollywood.\n\nSự nghiệp:\n\n1997–2004: Sự nghiệp ban đầu:",
    "aliases": [
      "chris evans"
    ],
    "featured": true
  },
  {
    "slug": "robert-downey-jr",
    "name": "Robert Downey Jr.",
    "englishName": "Robert Downey Jr.",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Marvel",
      "Chính kịch"
    ],
    "roles": "Iron Man • Huyền thoại MCU",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/5qHNjhtjMD4YWH3UP0rm4tKwxCL.jpg",
    "tmdbPersonId": 3223,
    "birthday": "1965-04-04",
    "placeOfBirth": "New York City, New York, USA",
    "bio": "Robert John Downey Jr. (sinh ngày 4 tháng 4 năm 1965) là một diễn viên người Mỹ. Tham gia diễn xuất từ khi mới 5 tuổi trong phim Pound của cha ông. Ông tham gia các phim như Less Than Zero, Air America, Natural Born Killers, Soapdish, The Singing Detective, Kiss Kiss Bang Bang, A Scanner Darkly, Gothika, Zodiac, Sấm nhiệt đới, Sherlock Holmes và Sherlock Holmes: Trò chơi của bóng đêm. Downey nổi tiếng toàn cầu vai diễn Tony Stark/ Người Sắt trong các bộ phim thuộc Vũ trụ Điện ảnh Marvel như Người Sắt (2008), Người Sắt 2 (2010), Biệt đội siêu anh hùng (2012), Người Sắt 3 (2013), Avengers: Đế chế Ultron (2015), Captain America: Nội chiến siêu anh hùng (2016), Avengers: Cuộc chiến vô cực (2018) và đặc biệt là siêu bom tấn Avengers: Hồi kết (2019). Ông cũng tham gia 3 series truyền hình là: Saturday Night Live, Ally McBeal và Family Guy.\nDowney được trao 2 Giải Quả cầu vàng cho Diễn viên chính xuất sắc nhất trong phim Short Cuts (1994) và Sherlock Holmes (2010), 1 giải Quả Cầu Vàng cho diễn viên phụ xuất sắc nhất trong series truyền hình Ally McBeal. Ông từng được đề cử trao Giải Oscar cho nam diễn viên chính xuất sắc nhất với vai diễn Charlie Chaplin trong phim Chaplin (1992).\nDowney đã tham gia 6 phim mà mỗi phim đều bán được không dưới 600 triệu USD tiền vé (4 trong số đó nằm trong danh sách những phim có doanh thu cao nhất của điện ảnh Hoa Kỳ bao gồm Biệt đội siêu anh hùng, Người Sắt 3, Avengers: Đế chế Ultron, Captain America: Nội chiến siêu anh hùng và Avengers: Hồi kết với doanh thu trên 1 tỉ USD mỗi phim), Ông đứng đầu trong danh sách những nam diễn viên có thu nhập cao nhất của tạp chí Forbes năm 2013 với tổng thu nhập ước tính trên 75 triệu USD chỉ riêng trong khoảng từ tháng 6 năm 2012 tới tháng 6 năm 2013.\n\nTiểu sử:\n\nRobert Downey sinh tại Manhattan, thành phố New York. Ông là người con thứ hai của Robert Downey, Sr - một diễn viên, đạo diễn, nhà sản xuất - và Elsie Downey - cũng là một diễn viên. Gia đình ông có nguồn gốc Do Thái và Công giáo. Ban đầu, cha của ông được đặt tên là Robert Elias nhưng sau đó lại tự đổi thành Robert Downey, lấy theo tên của cha dượng là James Downey vì ông muốn được tuyển vào quân đội.\nNgay từ khi còn bé, Downey đã dính líu tới thuốc phiện. Cha ông, vốn là một kẻ nghiện thuốc, đã cho phép con mình sử dụng cần sa từ khi mới 6 tuổi. Downey nói rằng: \"Khi hai cha con tôi sử dụng thuốc cùng nhau, đó như thể là việc ông ấy cố gắng muốn bày tỏ tình yêu dành cho tôi, theo cách mà chỉ ông ấy hiểu\" (\"When my dad and I would do drugs together, it was like him trying to express his love for me in the only way he knew how.\"). Về sau, ông tiếp tục dành nhiều đêm lạm dụng rượu và thuốc.\nÔng đóng nhiều phim của cha mình từ hồi còn nhỏ trong vai những cậu bé. Vai diễn đầu tiên của ông là một cậu bé ốm yếu trong phim Pound (1970) lúc ông 5 tuổi. 7 tuổi, ông đóng phim Greaser's Palace. 10 tuổi, ông tới sống ở Luân Đôn, theo học chương trình dạy múa Ballet cổ điển.",
    "aliases": [
      "robert downey jr.",
      "robert downey jr",
      "rdj"
    ],
    "featured": true
  },
  {
    "slug": "scarlett-johansson",
    "name": "Scarlett Johansson",
    "englishName": "Scarlett Johansson",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "gender": 1,
    "tags": [
      "Hollywood",
      "Marvel",
      "Hành động"
    ],
    "roles": "Góa phụ đen Black Widow • Minh tinh",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/tgxYh3jMs5bY2Ub4d2dcp9iaz1R.jpg",
    "tmdbPersonId": 1245,
    "birthday": "1984-11-22",
    "placeOfBirth": "New York City, New York, USA",
    "bio": "Scarlett Ingrid Johansson (; sinh ngày 22 tháng 11 năm 1984) là một nữ diễn viên và ca sĩ người Mỹ. Cô là nữ diễn viên được trả thù lao cao nhất thế giới kể từ năm 2018, đồng thời cũng nhiều lần xuất hiện trong danh sách 100 người nổi tiếng quyền lực nhất thế giới của Forbes. Cô cũng được tạp chí Time bình chọn cho 100 người có sức ảnh hưởng lớn nhất thế giới sau vụ kiện làm nên lịch sử của cô với Disney. Những bộ phim cô tham gia diễn xuất đã thu về tổng cộng hơn 15 tỷ USD toàn cầu, đưa Johansson trở thành ngôi sao điện ảnh có doanh thu phòng vé cao thứ nhất mọi thời đại. Cô cũng nhận được nhiều giải thưởng cao quý, bao gồm một giải Tony và một giải BAFTA, cũng như hai đề cử giải Oscar và năm đề cử giải Quả cầu vàng.\nSinh ra và lớn lên ở Manhattan, thành phố New York, Johansson khao khát trở thành diễn viên từ khi còn nhỏ và lần đầu tiên xuất hiện trên sân khấu Off-Broadway với tư cách là một diễn viên nhí. Bộ phim đầu tay của cô là tác phẩm hài giả tưởng North (1994); cô cũng sớm được công chúng đón nhận với các vai diễn trong Manny & Lo (1996), The Horse Whisperer (1998) và Ghost World (2001). Johansson bắt đầu đảm nhiệm các vai diễn trưởng thành hơn kể từ Lạc lối ở Tokyo – bộ phim đã mang về cho cô giải BAFTA cho Nữ diễn viên chính xuất sắc nhất, và Girl with a Pearl Earring. Cô cũng được đề cử giải Quả cầu vàng cho các vai diễn trong A Love Song for Bobby Long (2004) và Match Point (2005). Một số phim điện ảnh nổi bật khác của cô trong giai đoạn này bao gồm The Prestige (2006) của đạo diễn Christopher Nolan và Vicky Cristina Barcelona (2008) của Woody Allen. Cô cũng ra mắt công chúng dưới vai trò ca sĩ qua việc phát hành hai album phòng thu: Anywhere I Lay My Head (2008), và Break Up (2009) hợp tác với Pete Yorn; cả hai album đều lọt vào bảng xếp hạng Billboard 200.\nNăm 2010, Johansson ra mắt trên sân khấu Broadway với vở kịch A View from the Bridge – mang về cho cô giải Tony cho Nữ diễn viên chính xuất sắc nhất – và bắt đầu thủ vai nhân vật Black Widow trong Vũ trụ Điện ảnh Marvel kể từ tác phẩm Người Sắt 2. Johansson tiếp tục đóng vai chính trong các bộ phim khoa học viễn tưởng Her (2013), Under the Skin (2013), Lucy (2014) và Vỏ bọc ma (2017). Cô nhận được sự hoan nghênh của giới phê bình và nhận được hai đề cử giải Oscar với vai một nữ diễn viên sắp ly hôn trong Câu chuyện hôn nhân của đạo diễn Noah Baumbach, và vai người mẹ đơn thân trong Đức Quốc Xã trong Jojo Rabbit của đạo diễn Taika Waititi.\nJohansson ngoài ra cũng là một người mẫu nổi tiếng và được nhiều phương tiện truyền thông gọi là biểu tượng tình dục của Hollywood. Cô cũng tham gia vào nhiều tổ chức từ thiện khác nhau. Johansson kết hôn với nam diễn viên người Canada Ryan Reynolds từ năm 2008 đến năm 2011 và với doanh nhân người Pháp Romain Dauriac từ năm 2014 đến năm 2017. Năm 2020, cô kết hôn với diễn viên hài Colin Jost. Johansson có hai con, một con gái với Dauriac và một con trai với Jost.",
    "aliases": [
      "scarlett johansson"
    ],
    "featured": true
  },
  {
    "slug": "angelina-jolie",
    "name": "Angelina Jolie",
    "englishName": "Angelina Jolie",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "gender": 1,
    "tags": [
      "Hollywood",
      "Hành động",
      "Chính kịch"
    ],
    "roles": "Đả nữ Maleficent • Biểu tượng quyến rũ",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/bXNxIKcJ5cNNW8QFrBPWcfTSu9x.jpg",
    "tmdbPersonId": 11701,
    "birthday": "1975-06-04",
    "placeOfBirth": "Los Angeles, California, USA ",
    "bio": "Angelina Jolie  (; tên khai sinh Angelina Jolie Voight; sinh ngày 4 tháng 6 năm 1975) là một nữ diễn viên, nhà làm phim kiêm nhà nhân đạo người Mỹ. Trong suốt sự nghiệp, cô đã nhận được một giải Oscar và ba giải Quả cầu vàng, cô cũng nhiều lần được vinh danh là nữ diễn viên kiếm tiền nhiều nhất Hollywood. Ngoài ra, cô còn được mệnh danh là người phụ nữ quyến rũ nhất hành tinh.\nJolie xuất hiện lần đầu trên màn ảnh khi còn nhỏ cùng với cha cô, Jon Voight, trong Lookin' to Get Out (1982), và sự nghiệp điện ảnh của cô chính thức bắt đầu một thập kỷ sau đó với Cyborg 2 (1993), tiếp theo là vai chính đầu tiên trong Hackers (1995). Cô đóng vai chính trong các bộ phim được giới phê bình đánh giá cao là George Wallace (1997) và Gia (1998), đồng thời giành Giải Oscar cho nữ diễn viên phụ xuất sắc nhất nhờ diễn xuất trong phim điện ảnh Girl, Interrupt năm 1999. Với vai nữ chính trong Lara Croft: Tomb Raider (2001) giúp cô trở thành một trong những đả nữ hàng đầu Hollywood. Cô tiếp tục sự nghiệp ngôi sao hành động của mình với những bộ phim thành công ở phòng vé như Mr. & Mrs. Smith (2005), Wanted (2008) và Salt (2010) và nhận được lời đánh giá cao của giới phê bình cho màn thể hiện của cô trong các bộ phim truyền hình A Mighty Heart (2007) và Changeling (2008) - bộ phim mang về cho cô một đề cử cho Giải Oscar cho nữ diễn viên chính xuất sắc nhất. Thành công thương mại lớn nhất của cô đến từ bộ phim giả tưởng Maleficent (2014). Cô cũng được biết đến với vai trò lồng tiếng trong loạt phim hoạt hình Kung Fu Panda (2008–nay). Jolie còn là đạo diễn và nhà biên kịch cho một số bộ phim truyền hình như In the Land of Blood and Honey (2011), Unbroken (2014) và bộ phim được đánh giá cao First They Killed My Father (2017).\nNgoài sự nghiệp điện ảnh, Jolie còn được biết đến với những nỗ lực nhân đạo, cô được trao tặng giải thưởng Nhân đạo Jean Hersholt và Huân chương Saint Michael và Saint George (DCMG), cùng nhiều danh hiệu khác. Cô cũng thúc đẩy các hoạt động bảo tồn, giáo dục, quyền phụ nữ và đã ủng hộ người tị nạn với tư cách là Đặc phái viên của Cao ủy Liên Hợp Quốc về người tị nạn (UNHCR). Jolie đã thực hiện nhiều nhiệm vụ thực địa trên toàn cầu tại các trại tị nạn và vùng chiến sự; các quốc gia cô đến thăm bao gồm Sierra Leone, Tanzania, Pakistan, Afghanistan, Syria và Sudan.\nLà người của công chúng, Jolie được coi là một trong những người có ảnh hưởng và quyền lực nhất ngành giải trí Mỹ. Trong nhiều năm, cô được nhiều phương tiện truyền thông bình chọn là người phụ nữ đẹp nhất thế giới. Cuộc sống cá nhân của Jolie, bao gồm các mối quan hệ, hôn nhân và sức khỏe của cô, là chủ đề quan tâm của công chúng. Cô đã ly hôn với Jonny Lee Miller và Billy Bob Thornton, và đã ly thân hợp pháp với Brad Pitt; cô và Pitt có với nhau sáu người con, ba trong số đó là con nuôi.\n\nThân thế và gia đình:",
    "aliases": [
      "angelina jolie",
      "maleficent"
    ],
    "featured": true
  },
  {
    "slug": "anne-hathaway",
    "name": "Anne Hathaway",
    "englishName": "Anne Hathaway",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "gender": 1,
    "tags": [
      "Hollywood",
      "Tình cảm",
      "Chính kịch"
    ],
    "roles": "Interstellar • Les Misérables",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/nbccV2pMoyLTCeg5DQip24Eq0Jp.jpg",
    "tmdbPersonId": 1813,
    "birthday": "1982-11-12",
    "placeOfBirth": "Brooklyn, New York City, New York, USA",
    "bio": "Anne Jacqueline Hathaway (sinh ngày 12 tháng 11 năm 1982) là một nữ diễn viên người Mỹ. Sau khi đảm nhận một vài vai diễn nhỏ trên sân khấu, cô bắt đầu xuất hiện trên loạt phim truyền hình vào năm 1999 - Get Real. Ngay từ bộ phim điện ảnh đầu tiên - The Princess Diaries (2001), Anne Hathaway đã gây ấn tượng mạnh với giới trẻ bởi vẻ đẹp vượt thời gian khi vào vai cô học sinh luộm thuộm Mia Thermopolis và ba năm sau cô tiếp tục đóng phần tiếp theo của bộ phim - The Princess Diaries 2: Royal Engagement. Kể từ đó, Hathaway đã đóng vai chính trong nhiều bộ phim gia đình, trong đó ấn tượng nhất phải kể đến là Havoc và Brokeback Mountain vào năm 2005. Bên cạnh đó, cô cũng tham gia vai diễn chính trong The Devil Wears Prada (2006) cùng nữ diễn viên tài năng và được kính trọng nhất của nước Mỹ - Meryl Streep và Becoming Jane (2007) trong vai Jane Austen.\nVới những biến chuyển tâm lý phức tạp, cảm xúc đa chiều của người phụ nữ trẻ Kym Buchman nghiện ma túy và thuốc lá trong Rachel Getting Married - vai diễn đã mang lại cho cô đề cử giải Oscar đầu tiên trong sự nghiệp ở hạng mục Nữ diễn viên chính xuất sắc nhất vào năm 2008. Đến năm 2010, cô đóng vai chính trong các bộ phim có doanh thu phòng vé rất cao như Valentine's Day, siêu phẩm đứng vị trí thứ 17 (trên một tỷ đô la Mỹ) trong các bộ phim có doanh thu cao nhất mọi thời đại - Alice in Wonderland, Love and Other Drugs và đồng thời cô đã giành được một giải Emmy ở hạng mục màn lồng tiếng xuất sắc nhất trong phim The Simpsons. Năm 2011, cô tiếp tục lồng tiếng cho bộ phim hoạt hình Rio và đóng vai chính trong bộ phim của nữ đạo diễn Lone Scherfig - One Day.\nVào năm 2012, sự nghiệp của cô tiếp tục thăng hoa khi đảm nhận vai diễn miêu nữ Selina Kyle trong The Dark Knight Rises của đạo diễn Christopher Nolan - bộ phim thứ hai của Anne Hathaway đạt doanh thu trên một tỷ đô, tiếp tục lọt vào danh sách các bộ phim có doanh thu cao nhất mọi thời đại ở vị trí thứ 11. Qua tác phẩm điện ảnh kinh điển Les Misérables của đạo diễn Tom Hooper, cô vào vai Fantine, một phụ nữ hành nghề gái điếm để kiếm tiền nuôi con cuối cùng chết do căn bệnh lao vì quá nghèo được giới phê bình và công chúng đánh giá rất cao đã mang về cho cô hàng loạt những giải thưởng điện ảnh danh giá, trong đó có giải Oscar ở hạng mục Nữ diễn viên phụ xuất sắc nhất, giải Quả cầu vàng, giải Nghiệp đoàn diễn viên màn ảnh và giải BAFTA.\nTính đến cuối tháng 9 năm 2013, tổng cộng 23 bộ phim của Anne Hathaway đã thu về hơn 5 tỷ đô la Mỹ, giúp cô lọt vào danh sách Top 100 diễn viên đem về doanh thu cao nhất mọi thời đại. Cùng với hàng loạt những vai diễn liên tiếp đạt được thành công, Anne Hathaway đã trở thành một trong những minh tinh hàng đầu Hollywood hiện nay. Tạp chí People đã đưa tên cô vào hàng ngũ những ngôi sao đột phá của năm 2001.",
    "aliases": [
      "anne hathaway"
    ],
    "featured": true
  },
  {
    "slug": "christopher-nolan",
    "name": "Christopher Nolan",
    "englishName": "Christopher Nolan",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "roles": "Đạo diễn Oppenheimer • Inception",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/xuAIuYSmsUzKlUMBFGVZaWsY3DZ.jpg",
    "tmdbPersonId": 525,
    "birthday": "1970-07-30",
    "placeOfBirth": "Westminster, London, England, UK",
    "bio": "Ngài Christopher Edward Nolan  (; sinh ngày 30 tháng 7 năm 1970) là một nam nhà làm phim kiêm doanh nhân người Mỹ gốc Anh. Nổi tiếng nhờ những tác phẩm bom tấn của Hollywood thông qua lối kể chuyện phức tạp, ông được đánh giá là một trong những nhà làm phim trụ cột của thế kỷ 21. Các tác phẩm của Nolan đã thu về hơn 8 tỷ USD trên toàn cầu, qua đó giúp ông trở thành đạo diễn có doanh thu cao thứ ba mọi thời đại. Trong suốt sự nghiệp của mình, Nolan đã giành được nhiều giải thưởng cao quý, trong đó có hai giải BAFTA, hai giải Quả cầu vàng, và hai giải Oscar.\nSinh ra và lớn lên ở Luân Đôn, Nolan nuôi dưỡng niềm đam mê làm phim từ khi còn nhỏ. Sau khi theo học ngành văn học Anh tại Đại học London, ông đã thực hiện một số bộ phim ngắn trước khi ra mắt tác phẩm điện ảnh đầu tay của mình mang tên Following (1998). Nolan bắt đầu được truyền thông quốc tế chú ý hơn với bộ phim thứ hai mang tên Memento (2000), sau đó chuyển sang làm phim cho hãng phim lớn với tác phẩm Insomnia (2002). Kể từ đó, ông trở thành đạo diễn có tên tuổi với bộ ba phim The Dark Knight Trilogy (2005–2012) và tiếp nối thành công qua các tác phẩm gồm Ảo thuật gia đấu trí (2006), Kẻ trộm giấc mơ (2010), Hố đen tử thần (2014), và Cuộc di tản Dunkirk (2017). Sau khi phát hành Tenet (2020), Nolan chia tay với hãng phim phát hành lâu năm Warner Bros. Pictures và chuyển sang cộng tác với Universal Pictures thông qua Oppenheimer (2023) và The Odyssey (2026). Oppenheimer đã giúp ông giành giải Oscar cho Đạo diễn xuất sắc nhất và Phim hay nhất.\nCác bộ phim của Nolan thường bắt nguồn từ các chủ đề tri thức luận và siêu hình học, khám phá đạo đức con người, cấu tạo của thời gian cùng bản chất dễ uốn nắn của trí nhớ và bản sắc cá nhân. Tác phẩm của ông thấm nhuần những hình ảnh và khái niệm lấy cảm hứng từ toán học, cách tường thuật phi tuyến tính độc đáo, hiệu ứng hình ảnh thực tế, thử nghiệm âm thanh, định dạng phim khổ lớn và các quan điểm duy vật. Ngoài vai trò đạo diễn, Nolan còn đảm nhiệm vai trò đồng biên kịch cho một số bộ phim của mình cùng người em trai Jonathan, đồng thời cũng tham gia điều hành công ty sản xuất Syncopy Inc. cùng với vợ ông, Emma Thomas. Với những đóng góp của mình trong ngành điện ảnh, ông được phong tặng danh hiệu Chỉ huy Đế chế Anh vào năm 2019, và sau này được phong tước hiệp sĩ vào năm 2024.",
    "aliases": [
      "christopher nolan",
      "dao dien nolan"
    ],
    "featured": true,
    "gender": 2,
    "tags": [
      "Hollywood",
      "Chính kịch",
      "Hành động"
    ]
  },
  {
    "slug": "cillian-murphy",
    "name": "Cillian Murphy",
    "englishName": "Cillian Murphy",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Chính kịch",
      "Tội phạm"
    ],
    "roles": "Oppenheimer • Peaky Blinders",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/2lKs67r7FI4bPu0AXxMUJZxmUXn.jpg",
    "tmdbPersonId": 2037,
    "birthday": "1976-05-25",
    "placeOfBirth": "Douglas, Cork, Ireland",
    "bio": "Cillian Murphy (; sinh ngày 25 tháng 5 năm 1976) là một nam diễn viên người Ireland. Khởi nghiệp là một ca sĩ, tuy nhiên anh từ chối một hợp đồng thu âm vào cuối những năm 1990 để bắt đầu tham gia diễn xuất trên sân khấu và trong các bộ phim ngắn. Các vai diễn điện ảnh đáng chú ý đầu tiên của anh bao gồm Darren trong bộ phim truyền hình Disco Pigs (2001), Jim trong phim kinh dị zombie 28 Days Later (2002), John trong bộ phim hài đen tối Intermission (2003), Jackson Rippner trong bộ phim hành động kinh dị Red Eye (2005), và Patrick \"Kitten\" Braden trong bộ phim hài - chính kịch Breakfast on Pluto (2005). Trong buổi biểu diễn cuối cùng, anh đã được đề cử Giải Quả cầu vàng cho Nam diễn viên chính xuất sắc nhất trong nhạc kịch hoặc hài kịch và giành được Giải thưởng Điện ảnh và Truyền hình Ireland cho Nam diễn viên chính xuất sắc nhất.\nMurphy được biết đến với sự hợp tác của anh với đạo diễn Christopher Nolan, đóng vai Scarecrow trong bộ ba phim siêu anh hùng The Dark Knight (2005–2012) và xuất hiện trong bộ phim giật gân hành động khoa học viễn tưởng Inception (2010), bộ phim chiến tranh Dunkirk (2017), và trong bộ phim tiểu sử Oppenheimer (2023) với tư cách là nhà vật lý tiêu biểu. Các bộ phim khác mà anh đã xuất hiện bao gồm phim chiến tranh The Wind That Shakes the Barley (2006), phim kinh dị khoa học viễn tưởng Sunshine (2007), phim hành động khoa học viễn tưởng In Time (2011), Jozef Gabčík trong phim chiến tranh Anthropoid (2016), và Emmett trong phim kinh dị A Quiet Place Part II (2021). Kể từ năm 2013, anh đóng vai Tommy Shelby trong bộ phim truyền hình tội phạm Peaky Blinders của BBC, bộ phim mà anh đã giành được Giải thưởng Điện ảnh và Truyền hình Ireland cho Nam diễn viên chính xuất sắc nhất năm 2017 và 2018.\nNăm 2011, Murphy đã giành được Giải thưởng Nhà hát của Thời báo Ireland cho Nam diễn viên chính xuất sắc nhất và Giải Bàn kịch cho Màn trình diễn solo xuất sắc với vở kịch một người là Misterman. Năm 2020, anh được xếp hạng thứ 12 trong danh sách những diễn viên điện ảnh Ireland vĩ đại nhất của The Irish Times. Anh kết hôn với nghệ sĩ thị giác người Ireland Yvonne McGuinness, người mà anh có hai con trai cùng; họ cư trú ở Dublin.\n\nĐầu đời:\n\nSự nghiệp:\n\nHình ảnh công chúng:",
    "aliases": [
      "cillian murphy",
      "thomas shelby"
    ],
    "featured": true
  },
  {
    "slug": "margot-robbie",
    "name": "Margot Robbie",
    "englishName": "Margot Robbie",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "gender": 1,
    "tags": [
      "Hollywood",
      "DC",
      "Chính kịch"
    ],
    "roles": "Barbie • Harley Quinn",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/8LqG2N6j98lFGMpuYsRUAhOunSd.jpg",
    "tmdbPersonId": 234352,
    "birthday": "1990-07-02",
    "placeOfBirth": "Dalby, Queensland, Australia",
    "bio": "Margot Elise Robbie (sinh ngày 2 tháng 7 năm 1990) là một nữ diễn viên, doanh nhân kiêm nhà sản xuất điện ảnh người Úc. Nổi tiếng nhờ khả năng diễn xuất thần sầu của mình trong cả dòng phim bom tấn và phim độc lập, cô đã nhận được nhiều giải thưởng cao quý, bao gồm đề cử cho hai giải Oscar, bốn giải Quả cầu vàng và năm giải BAFTA. Tạp chí Time đã vinh danh cô là một trong 100 người có ảnh hưởng nhất thế giới năm 2017 và cô được Forbes xếp hạng là một trong những nữ diễn viên được trả lương cao nhất thế giới vào năm 2019.\nSinh ra và lớn lên ở Queensland, Robbie bắt đầu sự nghiệp của mình vào năm 2008 trong bộ phim truyền hình Neighbors, bộ phim mà cô đóng vai chính cho đến năm 2011. Sau khi chuyển đến Mỹ, cô đã tham gia vào một số bộ phim rất được ăn khách như Đã đến lúc (2013), Sói già phố Wall (2014), Thánh lừa (2015). Giải thưởng lớn nhất mà cô đã giành được là \"Nữ diễn viên mới xuất sắc nhất\" trong lễ trao giải Empire Awards của năm 2014 sau vai diễn Naomi Lapaglia trong bộ phim Sói già phố Wall. Cô dần được công nhận phổ biến hơn với các vai chính gồm Jane Porter trong Huyền thoại Tarzan (2016) và Harley Quinn trong các bộ phim siêu anh hùng DC, Biệt đội cảm tử (2016), Birds of Prey: Cuộc lột xác huy hoàng của Harley Quinn (2020) và Điệp vụ cảm tử (2021).\nRobbie đã nhận được sự công nhận của giới phê bình và một đề cử cho giải Oscar cho Nữ diễn viên chính xuất sắc nhất cho vai diễn vận động viên trượt băng nghệ thuật bị ghẻ lạnh Tonya Harding trong bộ phim tiểu sử I, Tonya (2017). Sự công nhận này tiếp tục với vai diễn Nữ hoàng Elizabeth I trong bộ phim cổ trang Mary Queen of Scots (2018), Sharon Tate trong bộ phim hài-chính kịch Chuyện ngày xưa ở... Hollywood (2019) và một nhân viên hư cấu của Fox News trong bộ phim truyền hình Tin \"nóng\" (2019); giúp cô nhận được đề cử giải BAFTA và giải Oscar cho Nữ diễn viên phụ xuất sắc nhất. Bộ phim Barbie (2023) do cô đóng chính và đồng sản xuất đã giúp cô nhận về đề cử giải Oscar cho phim hay nhất.\nRobbie kết hôn với nhà làm phim Tom Ackerley. Họ là những người đồng sáng lập công ty sản xuất LuckyChap Entertainment, theo đó họ đã sản xuất một số bộ phim, bao gồm I, Tonya (2017), Cô gái trẻ hứa hẹn (2020), và Saltburn (2023), cũng như loạt phim truyền hình Dollface (2019–2022) và Maid (2021).\n\nTiểu sử và học vấn:",
    "aliases": [
      "margot robbie",
      "harley quinn"
    ],
    "featured": true
  },
  {
    "slug": "daniel-craig",
    "name": "Daniel Craig",
    "englishName": "Daniel Craig",
    "country": "Anh Quốc 🇬🇧",
    "countryCode": "us_uk",
    "roles": "Điệp viên 007 James Bond",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/iFerDZUmC5Fu26i4qI8xnUVEHc7.jpg",
    "tmdbPersonId": 8784,
    "birthday": "1968-03-02",
    "placeOfBirth": "Chester, Cheshire, England, UK",
    "bio": "Daniel Wroughton Craig (sinh ngày 2 tháng 3 năm 1968) là một diễn viên người Anh. Các bộ phim anh đã tham gia thủ vai có: The Power of One, A Kid in King Arthur's Court và một loạt phim truyền hình có tựa đề Sharpe's Eagle và The Young Indiana Jones Chronicles: Daredevils of the Desert.\nAnh trở thành ngôi sao khi tham gia vai diễn trong phim Layer Cake và phim Lara Croft: Tomb Raider cùng với Angelina Jolie. Tuy nhiên, anh chỉ thực sự nổi bật khi tham gia phim Road to Perdition, trong đó anh thủ vai con trai của ông trùm mafia (do Paul Newman đóng) và diễn cùng Tom Hanks, Clive Owen - đều vào vai sát thủ.\nCraig trở thành diễn viên thứ sáu trên thế giới thủ vai James Bond trong loạt phim 007. Anh bắt đầu loạt phim này với vai diễn trong bộ phim rất thành công sản xuất năm 2006 mang tựa đề Casino Royale, cuốn phim sau đó đã được đề cử giải BAFTA. Phim này đến 2008 đạt doanh số gộp 530 triệu USD trên toàn cầu và trở thành phim 007 có doanh số cao thứ hai sau Skyfall từ trước tới nay. Vai diễn 007 tiếp theo là trong bộ phim máu lửa thứ 22 về James Bond có tựa đề Quantum of Solace, phát hành ở Anh ngày 31 tháng 10 năm 2008 và ở Hoa Kỳ ngày 14 tháng 11 năm 2008, và phần 3 Skyfall.\nTheo tạp chí Men's Vogue, Craig là diễn viên được trả giá cao nhất ở Anh, tính trong thời điểm năm 2008.\n\nTiểu sử:\n\nThời thơ ấu:\n\nDaniel Craig đã được sinh ra tại Chester, Anh, con trai của Olivia (nee Williams), một giáo viên nghệ thuật, và John Timothy Wroughton Craig, - một thượng úy Hải quân và làm nhiều nghề cho đến khi ông nghỉ hưu. Ông là họ hàng của nhà văn trinh thám Joe Craig. Craig chuyển đến sống ở Wirral, Merseyside. Cha của Craig làm chủ 2 quán rượu \"Ring 'O Bells\" và \" The Boot Inn\".Craig và em trai là Adam học tại trường Hilbre High School và Calday Grange Grammar School ở West Kirby. Ông chơi cho câu lạc bộ dưới nước Hoylake.16 tuổi, Craig chuyển đến London và gia nhập vào nhà hát quốc gia.\n\nNhững năm 1990:",
    "aliases": [
      "daniel craig",
      "james bond"
    ],
    "featured": true,
    "gender": 2,
    "tags": [
      "Hành động",
      "Tội phạm",
      "Hollywood"
    ]
  },
  {
    "slug": "hugh-jackman",
    "name": "Hugh Jackman",
    "englishName": "Hugh Jackman",
    "country": "Anh / Úc 🇦🇺",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Marvel",
      "Hành động"
    ],
    "roles": "Người Sói Wolverine • The Greatest Showman",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/oX6CpXmnXCHLyqsa4NEed1DZAKx.jpg",
    "tmdbPersonId": 6968,
    "birthday": "1968-10-12",
    "placeOfBirth": "Sydney, New South Wales, Australia",
    "bio": "Hugh Michael Jackman (sinh ngày 12 tháng 10 năm 1968) là một nam diễn viên, ca sĩ, nhà sản xuất phim người Úc.\nAnh được biết đến nhiều nhất qua vai diễn Wolverine/ Logan. Jackman cũng được biết đến nhờ đóng vai chính trong nhiều bộ phim như phim hài lãng mạn Kate & Leopold (2001), phim hành động Van Helsing (2004), phim chính kịch The Prestige (2006), phim chính kịch giả tưởng The Fountain (2006), phim hài Australia (2008), phim Les Misérables (2012), Prisoners (2013), và phim âm nhạc The Greatest Showman (2017), bộ phim đã giúp anh giành được Giải Grammy cho Album Nhạc phim Xuất sắc nhất. Với việc vào vai Jean Valjean trong Les Misérables, anh đã nhận được đề cử Giải Oscar cho nam diễn viên chính xuất sắc nhất và thắng Giải Quả cầu vàng cho nam diễn viên xuất sắc nhất.\nTháng 11 năm 2008, tạp chí Open Salon đã xếp hạng Hugh Jackman là một trong những người đàn ông hấp dẫn nhất hành tinh. Cùng thời gian đó, Tạp chí People đã đặt cho Jackman danh hiệu \"Người Đàn Ông Hấp Dẫn Nhất Hành Tinh.\" (Sexiest Man Alive)\nTại Nhà hát Broadway, Jackman từng thắng Giải Tony cho nam diễn viên xuất sắc nhất hạng mục nhạc kịch năm 2004 nhờ vai diễn trong tác phẩm The Boy from Oz. Bốn lần dẫn chương trình trao Giải Tony, anh từng giành 1 Giải Emmy nhờ lần dẫn chương trình tại lễ trao giải năm 2005. Anh cũng từng là người dẫn chương trình tại lễ trao Giải Oscar lần thứ 81 vào ngày 22/2/2009.\n\nĐầu đời và giáo dục:\n\nJackman sinh ra tại Sydney, New South Wales, là con trai của Grace McNeil (nhũ danh: Greenwood) và Christopher John Jackman - 1 nhân viên kế toán. Cha mẹ của anh là người Anh và họ chuyển đến sống ở Australia trong cuộc di cư \"Ten Pound Poms\". Ông cố nội của anh là người Hy Lạp. Cha mẹ anh vốn theo đạo Thiên Chúa Giáo, nhưng họ đã cải đạo sang đạo Phúc Âm sau khi kết hôn. Jackman có 4 anh chị em ruột và anh là người con thứ 2 được sinh ra tại Australia. Anh cũng có một người chị em cùng mẹ khác cha, sau cuộc hôn nhân tiếp theo của mẹ. Bố mẹ li dị năm Jackman 8 tuổi, sau đó anh ở lại Australia sống cùng với bố và 2 người anh trai, còn mẹ thì trở về Anh cùng với 2 người chị gái. Hồi còn bé, Hugh rất thích ra ngoài, dành nhiều thời gian để tắm biển và tham gia những chuyến đi cắm trại và tham quan Australia. Anh rất thích được ngắm nhìn thế giới.\nJackman theo học tại trường tiểu học Pymble Public và sau đó học tại trường nam sinh Knox Grammar ở Sydney. Sau khi học xong trung học, anh dành 1 năm nghỉ phép để làm việc tại trường Uppingham ở Anh. Sau đó, anh trở về và học tại Đại học Công nghệ Sydney, tốt nghiệp năm 1991 với bằng BA ngành Giao tiếp.. Trog năm cuối ở đại học, anh tham gia 1 khóa học diễn xuất. Lớp học sau đó đã diễn vở kịch The Memorandum của Václav Havel do Jackman chỉ đạo. Anh từng nói rằng: \"Trong 1 tuần học tại đó với những người bạn, tôi thấy có cảm giác như ở nhà nhiều hơn là 3 năm học ở trường đại học\".\nSau khi lấy được bằng, Jackman hoàn thành khóa học 1 năm \"The Journey\" ở Trung tâm diễn xuất tại Sydney.",
    "aliases": [
      "hugh jackman"
    ],
    "featured": true
  },
  {
    "slug": "benedict-cumberbatch",
    "name": "Benedict Cumberbatch",
    "englishName": "Benedict Cumberbatch",
    "country": "Anh Quốc 🇬🇧",
    "countryCode": "us_uk",
    "roles": "Doctor Strange • Sherlock Holmes",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/wz3MRiMmoz6b5X3oSzMRC9nLxY1.jpg",
    "tmdbPersonId": 71580,
    "birthday": "1976-07-19",
    "placeOfBirth": "Hammersmith, London, England, UK",
    "bio": "Benedict Cumberbatch là nam diễn viên người Anh xuất chúng từng nhận nhiều đề cử Oscar và đoạt các giải thưởng Emmy, BAFTA. Anh vụt sáng với vai thám tử Sherlock Holmes thời hiện đại trong loạt phim truyền hình Sherlock của BBC và gia nhập Vũ trụ Điện ảnh Marvel với vai Phù thủy Tối thượng Doctor Strange. Anh cũng thể hiện khả năng diễn xuất đỉnh cao trong The Imitation Game và The Power of the Dog.",
    "aliases": [
      "benedict cumberbatch",
      "sherlock"
    ],
    "featured": true,
    "gender": 2,
    "tags": [
      "Marvel",
      "Hollywood",
      "Chính kịch"
    ]
  },
  {
    "slug": "liam-neeson",
    "name": "Liam Neeson",
    "englishName": "Liam Neeson",
    "country": "Anh / Ireland 🇮🇪",
    "countryCode": "us_uk",
    "roles": "Người cha huyền thoại phim Taken",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/sRLev3wJioBgun3ZoeAUFpkLy0D.jpg",
    "tmdbPersonId": 3896,
    "birthday": "1952-06-07",
    "placeOfBirth": "Ballymena, County Antrim, Northern Ireland, UK",
    "bio": "Liam John Neeson  (sinh ngày 7 tháng 6 năm 1952) là một diễn viên tới từ Bắc Ireland. Ông đã từng được đề cử giải Oscar, giải BAFTA và 3 giải Quả Cầu Vàng. Ông từng tham gia đóng vai chính đáng chú ý bao gồm Oskar Schindler trong Schindler's List, Michael Collins trong Michael Collins, Peyton Westlake trong Darkman, Jean Valjean trong Những người khốn khổ, Qui-Gon Jinn trong Chiến tranh giữa các vì sao: Tập I – Hiểm họa bóng ma và một tập phim của Star Wars: The Clone Wars, Alfred Kinsey trong Alfred Kinsey, Ra's al Ghul trong Batman Begins và The Dark Knight Rises cũng như lồng tiếng cho nhân vật Aslan trong loạt phim The Chronicles of Narnia. Đồng thời ông cũng tham gia nhiều bộ phim khác đáng chú ý của Hollywood như Excalibur, The Dead Pool, Nell, Rob Roy, The Haunting, Love Actually, Kingdom of Heaven, Taken, Clash of the Titans, The A-Team, Unknown.\nNeeson sinh tại Ballymena, hạt Antrim, Bắc Ailen và theo học tại trường Cao đẳng Saint Patrick's College, Cao đẳng kỹ thuật Ballymena, và Queen's University Belfast.Ông đã chuyến đến thủ đô Dublin sau khi tốt nghiệp đại học để tiếp tục theo đuổi nghiệp diễn viên, ông tham gia làm việc tại nhà hát lừng danh Abbey Theatre. Đầu những năm 90, ông một lần nữa chuyển đến Mỹ, nơi ông đạt được thành công lớn trong sự nghiệp của mình với vai diễn Oskar Schindler trong phim Schindler's List và trở nên nổi tiếng. Vợ ông đã mất và hiện ông đang sống ở New York cùng hai con trai của mình.\n\nTiểu sử:\n\nNeeson sinh 07 tháng 6 năm 1952 tại Ballymena, hạt Antrim, Bắc Ailen là con của Katherine Kitty (họ khai sinh là Brown), một người nội trợ và Bernard \"Barney\" Neeson, quản gia của một trường tiểu học Công giáo của địa phương (Ballymena Boys All Saints Primary School). Liam là tên gọi trong tiếng Ailen của William. Ông là con thứ ba trong gia đình và là con trai duy nhất trong bốn chị em. Những người chị của ông là Elizabeth, Bernadette, và Rosaline. Lên 9 tuổi, Liam bắt đầu tập Quyền anh tại All Saints Youth Club và sau đó đạt chức vô địch của giải Quyền anh nghiệp dư Ulster. Năm 11 tuổi, Liam bắt đầu bước lên sân khấu, giáo viên trong trường đã giao cho Liam vai chính trong một vở kịch của trường, ông đã chấp nhận vai diễn vì cô gái mà ông thích cũng tham gia diễn trong vở kịch đó. Từ đó ông tham gia diễn nhiều lần nữa trong các vở kịch của trường. Liam bị thu hút bởi các vai diễn và ông quyết định trở thành diễn viên và bị ảnh hưởng bởi mục sư Ian Paisley, mục sư của nhà thờ mà có lần Liam lẻn vào. Ông đã nói về Ian Paisley như sau:\" He had a magnificent presence and it was incredible to watch this six foot-plus man just bible-thumping away...It was acting but it was also great acting and stirring too. Năm 1971, Liam trúng tuyển vào ngành vật lý và khoa học máy tính của đại học Queen's University Belfast ở Belfast trước khi ông làm việc tại Guinness - một thương hiệu bia đen nổi tiếng của Ailen. Liam cũng là một tài năng bóng đá khi ông còn học Đại học.",
    "aliases": [
      "liam neeson",
      "taken"
    ],
    "featured": true,
    "gender": 2,
    "tags": [
      "Hành động",
      "Tội phạm",
      "Chính kịch",
      "Hollywood"
    ]
  },
  {
    "slug": "emma-watson",
    "name": "Emma Watson",
    "englishName": "Emma Watson",
    "country": "Anh Quốc 🇬🇧",
    "countryCode": "us_uk",
    "roles": "Hermione Granger • Người đẹp & Quái vật",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/mf0OANvWYSzU1d8yggrhyw8IbIz.jpg",
    "tmdbPersonId": 10990,
    "birthday": "1990-04-15",
    "placeOfBirth": "Paris, France",
    "bio": "Emma Charlotte Duerre Watson ( ; sinh ngày 15 tháng 4 năm 1990) là một nữ diễn viên, người mẫu kiêm nhà hoạt động xã hội người Anh. Sinh ra ở Paris và lớn lên tại Oxfordshire, Emma theo học tại Trường Brown và theo học khóa đào tạo diễn viên tại chi nhánh Oxford của trường Nghệ thuật Sân khấu Stagecoach. Cô trở nên nổi tiếng sau khi đảm nhận vai diễn đầu đời Hermione Granger trong loạt phim Harry Potter, dù trước đó cô chỉ đóng kịch ở trường. Watson xuất hiện trong cả tám phần phim Harry Potter từ năm 2001 đến 2011, đem về cho cô danh tiếng trên toàn thế giới, nhiều giải thưởng quan trọng và khối tài sản lên tới 60 triệu đô la Mỹ vào năm 2017 và khoảng 80 triệu đô-la Mỹ năm 2020. Tờ báo nổi tiếng của Mỹ New York Times từng đánh giá Watson là ngôi sao có diễn xuất ấn tượng.\nWatson cũng xuất hiện trong bộ phim truyền hình chuyển thể từ tiểu thuyết năm 2007 của Anh Đôi giày Ba-lê và tham gia lồng tiếng cho bộ phim hoạt hình Hiệp sĩ chuột (2008). Sau bộ phim Harry Potter cuối cùng, cô đảm nhận vai chính và vai phụ trong một số bộ phim như Một tuần với kiều nữ (2011), Câu chuyện tuổi teen (2012) và trong Băng trộm tuổi teen (2013). Cô xuất hiện như phiên bản cường điệu của chính mình trong Sống nốt ngày cuối (2013) và đóng vai cô con gái nuôi của nhân vật chính trong Noah: Đại hồng thủy (2014). Cô tiếp tục đóng vai chính Belle trong bộ phim nhạc kịch giả tưởng lãng mạn Người đẹp và quái vật (2017) và vai Meg March trong bộ phim Những người phụ nữ bé nhỏ (2019), bộ phim sau đó được đề cử giải Oscar cho Phim hay nhất. Các vai diễn điện ảnh khác của cô bao gồm Truy hồi ký ức (2015), Tình yêu thời bạo loạn (2015) và Vòng xoay ảo (2017).\nTừ năm 2011 đến năm 2014, Watson chia thời gian của mình giữa làm phim và tiếp tục việc học tại Đại học Brown và Cao đẳng Worcester, Oxford, và tốt nghiệp Brown với bằng cử nhân văn học Anh vào tháng 5 năm 2014. Ngoài ra Watson còn có chứng nhận dạy thiền và yoga. Công việc người mẫu của cô bao gồm các chiến dịch quảng cáo cho Burberry và Lancôme. Cô còn tham gia thiết kế trang phục và đặt tên của mình cho dòng quần áo mang mục đích nhân đạo của nhãn hiệu People Tree. Cô được Viện Hàn lâm Nghệ thuật Điện ảnh và Truyền hình Anh vinh danh năm 2014 khi Emma Watson giành giải Nghệ sĩ của năm. Cùng năm đó, cô được bổ nhiệm làm đại sứ thiện chí của Liên Hợp Quốc và giúp khởi động chiến dịch Phụ nữ Liên Hợp Quốc HeForShe, khuyến khích chung tay hướng tới việc bình đẳng giới. Watson được bổ nhiệm vào cơ quan tư vấn về quyền phụ nữ của G7 vào năm 2019, tham vấn với các nhà lãnh đạo về chính sách đối ngoại. Năm 2020, Emma Watson được bổ nhiệm vào ban giám đốc Kering, với vai trò là Chủ tịch Hội đồng Phát triển Bền vững.",
    "aliases": [
      "emma watson",
      "hermione"
    ],
    "featured": true,
    "gender": 1,
    "tags": [
      "Hollywood",
      "Chính kịch",
      "Tình cảm"
    ]
  },
  {
    "slug": "morgan-freeman",
    "name": "Morgan Freeman",
    "englishName": "Morgan Freeman",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "DC",
      "Chính kịch"
    ],
    "roles": "Huyền thoại giọng đọc & điện ảnh",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/905k0RFzH0Kd6gx8oSxRdnr6FL.jpg",
    "tmdbPersonId": 192,
    "birthday": "1937-06-01",
    "placeOfBirth": "Memphis, Tennessee, USA",
    "bio": "Morgan Freeman (sinh ngày 1 tháng 6 năm 1937) là một nam diễn viên, đạo diễn, diễn giả người Mỹ. Ông là một trong những diễn viên nổi tiếng và được ưa chuộng nhất ở Hollywood. Ông từng đoạt được Giải Oscar cho Nam diễn viên phụ xuất sắc nhất trong phim Million Dollar Baby và được nhiều đề cử cho các vai của ông trong Street Smart, Driving Miss Daisy, The Shawshank Redemption và Invictus.Ông cũng giành giải Quả Cầu Vàng và Screen Actors Guild Award. Ông cũng có tên tại Đại lộ Danh vọng ở Hollywood để vinh danh những cống hiến trong điện ảnh.\nCác phim đáng nhớ khác có ông tham gia là Unforgiven, Glory, Seven, Deep Impact, The Sum of All Fears, Bruce Almighty, ba phần phim Dark Knight, March of the Penguins, The Bucket List, Wanted, and RED.\n\nThuở nhỏ:\n\nMorgan Freeman sinh ngày 1 tháng 6 năm 1937 tại Memphis, Tennessee. Anh ấy là con trai của Mamie Edna (nhũ danh Revere; 1912–2000), một giáo viên và Morgan Porterfield Freeman (6 tháng 7 năm 1915 - 27 tháng 4 năm 1961), một thợ cắt tóc, ông qua đời vì bệnh xơ gan năm 1961. Freeman có ba anh chị em . DNA cho thấy rằng trong số tất cả tổ tiên người châu Phi của ông, hơn một phần tư đến từ khu vực trải dài từ Senegal ngày nay đến Liberia và ba phần tư đến từ vùng Congo-Angola.\n\nSự nghiệp điện ảnh:\n\nFreeman làm vũ công tại Hội chợ Thế giới năm 1964 và là thành viên của nhóm nhạc kịch Opera Ring ở San Francisco. Ông đã diễn xuất trong một phiên bản công ty lưu diễn của The Royal Hunt of the Sun, và cũng xuất hiện như một vai phụ trong bộ phim chính kịch năm 1965 của Sidney Lumet The Pawnbroker với sự tham gia của Rod Steiger. Giữa công việc diễn xuất và khiêu vũ, Freeman nhận ra rằng diễn xuất là phù hợp với mình hơn. \"Sau [The Royal Hunt of the Sun], sự nghiệp diễn xuất của tôi mới bắt đầu,\" sau này ông nhớ lại. Freeman ra mắt Off-Broadway vào năm 1967, đối diện với Viveca Lindfors trong The Nigger Lovers, một chương trình về Những kỵ sĩ tự do trong Phong trào Dân quyền Hoa Kỳ, trước khi ra mắt trên sân khấu Broadway vào năm 1968 với phiên bản toàn màu đen của Hello, Dolly! cũng có sự tham gia của Pearl Bailey và Cab Calloway. Năm 1969, Freeman cũng biểu diễn trên sân khấu trong The Dozens.\nnăm 1987, Freeman đóng vai một kẻ bạo lực trên đường phố, một vai diễn khác với các vai diễn trước đây của ônh, trong Street Smart do Christopher Reeve và Kathy Baker đóng cùng. Diễn xuất của Freeman được các nhà phê bình phim khen ngợi, trong đó có Roger Ebert.\nTrong bộ phim tiếp theo, ôny đóng vai Craig trong bộ phim truyền hình Clean and Sober cùng với các bạn diễn Michael Keaton và Kathy Baker. Mặc dù bộ phim không thành công về doanh thu phòng vé, nhưng nó đã được đánh giá công bằng; Roger Ebert đã chấm cho bộ phim 41⁄2 trên 5 sao và gọi những màn trình diễn là \"tuyệt vời\". Freeman cũng đã nhận được Giải thưởng Obie cho vai diễn nhà thuyết giáo trong vở nhạc kịch The Gospel at Colonus, và vai Hoke Colburn trong vở kịch Driving Miss Daisy, tương ứng.",
    "aliases": [
      "morgan freeman"
    ],
    "featured": false
  },
  {
    "slug": "robert-de-niro",
    "name": "Robert De Niro",
    "englishName": "Robert De Niro",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "roles": "Huyền thoại The Godfather • Oscar",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/cT8htcckIuyI1Lqwt1CvD02ynTh.jpg",
    "tmdbPersonId": 380,
    "birthday": "1943-08-17",
    "placeOfBirth": "Greenwich Village, New York City, New York, USA",
    "bio": "Robert Mario De Niro, Jr. (sinh ngày 17 tháng 8 năm 1943) thường được biết đến với tên Robert De Niro là một diễn viên, đạo diễn và nhà sản xuất phim người Mỹ, đã từng đoạt giải Oscar cho cả hai hạng mục vai chính và vai phụ.\nRobert De Niro được nhớ tới nhất với những vai diễn phản diện xuất sắc trong các bộ phim của Brian De Palma và Martin Scorsese. Các bộ phim đáng chú ý có sự góp mặt của De Niro có thể kể tới Bố già phần II (The Godfather Part II), The Deer Hunter, Taxi Driver và Raging Bull.\n\nTiểu sử:\n\nRobert Mario De Niro, Jr. sinh ngày 17 tháng 8 năm 1943 tại Thành phố New York trong một gia đình nghệ sĩ, bố ông là Robert De Niro, Sr., một họa sĩ và nhà điêu khắc, còn mẹ, bà Virginia Admiral cũng là một họa sĩ. Ông bà của Robert De Niro, Sr. là những người Ý di cư gốc ở Ferrazzano, tỉnh Campobasso thuộc Molise miền Trung nước Ý. Bố mẹ De Niro gặp nhau tại một lớp học vẽ của Hans Hofmann ở Provincetown, Massachusetts, họ ly dị khi cậu bé Robert mới lên 2.\nDe Niro lớn lên ở khu Little Italy (khu Tiểu Ý) của Manhattan. Cậu được mẹ ghi danh vào trường phổ thông nghệ thuật High School of Music and Art ở New York nhưng bỏ học khi mới 13 tuổi để gia nhập những băng đảng đường phố ở khu Tiểu Ý. Sau đó De Niro quay trở lại con đường nghệ thuật khi đăng ký vào trường kịch nghệ của Stella Adler cũng như hội nghệ sĩ Actor's Studio do Lee Strasberg đứng đầu. Ở tuổi 16 cậu có vai diễn đầu tiên trong vở kịch Con gấu của Anton Chekhov.\n\nSự nghiệp:\n\nGiai đoạn đầu:\n\nNăm 1963, ở tuổi 20, De Niro có vai diễn điện ảnh đầu tiên khi đạo diễn nổi tiếng Brian De Palma chọn De Niro vào bộ phim The Wedding Party, tác phẩm này mãi đến năm 1969 mới được phát hành. Trong suốt thập niên 1960 Robert dành phần lớn thời gian tham gia sân khấu kịch và chỉ tham gia một số bộ phim như Trois chambres à Manhattan (1965, phim Pháp, De Niro chỉ đóng vai quần chúng) và Greetings (1968, một tác phẩm khác của De Palma).\nVai diễn điện ảnh đáng chú ý đầu tiên của De Niro là vai một vận động viên bóng chày trong Bang the Drum Slowly (1973). Cùng năm này, De Niro cũng bắt đầu mối hợp tác lâu dài và thành công với đạo diễn Martin Scorsese khi tham gia bộ phim Mean Streets của đạo diễn này. Năm 1974 Robert De Niro có vai diễn bước ngoặt, đó là vai \"Bố già\" Don Vito Corleone thời trẻ trong bộ phim Bố già phần II (The Godfather Part II) của Francis Ford Coppola. Vai diễn này đã mang về cho De Niro Giải Oscar đầu tiên khi ông được trao giải Vai nam phụ xuất sắc nhất năm 1975, 2 năm sau khi Marlon Brando được trao giải Vai nam chính xuất sắc nhất cũng nhờ chính vai diễn Vito Corleone này trong Bố già (The Godfather). Brando và De Niro sau này đã cùng đòng chung trong bộ phim The Score (2001).\nMartin Scorsese có lẽ là đạo diễn hợp tác thành công nhất với Robert De Niro.",
    "aliases": [
      "robert de niro"
    ],
    "featured": false,
    "gender": 2,
    "tags": [
      "Tội phạm",
      "Chính kịch",
      "Hollywood"
    ]
  },
  {
    "slug": "al-pacino",
    "name": "Al Pacino",
    "englishName": "Al Pacino",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "roles": "Bố già Scarface • Huyền thoại",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/m8HAAjq1T75JypKk0v1FFQn4ysZ.jpg",
    "tmdbPersonId": 1158,
    "birthday": "1940-04-25",
    "placeOfBirth": "New York City, New York, USA",
    "bio": "Alfredo James Pacino (sinh ngày 25 tháng 4 năm 1940), thường được biết đến với tên Al Pacino là một diễn viên nổi tiếng của sân khấu và điện ảnh Hoa Kỳ. Ông được xem như là một trong những diễn viên vĩ đại và có sức ảnh hưởng nhất trong Lịch sử Điện ảnh.\nÔng đã từng giành giải Oscar, giải Quả cầu vàng, giải AFI, giải BAFTA, giải Emmy và giải Tony. Al Pacino được nhớ đến nhất với vai diễn Michael Corleone trong bộ ba phim Bố già và vai Tony Montana trong phim Scarface.\n\nTiểu sử:\n\nPacino sinh ngày 25 tháng 4 năm 1940 tại phía nam quận Bronx, thành phố New York trong một gia đình người Mỹ gốc Ý. Cha mẹ của Pacino là ông Salvatore Pacino và bà Rose Gerardi đã ly dị khi ông mới được hai tuổi. Ông bà ngoại của Al Pacino, Kate và James Gerardi vốn là người gốc ở Corleone trên đảo Sicilia.\nPacino sau đó vào học tại Trường nghệ thuật biểu diễn Manhattan (Manhattan's School of Performing Arts).\n\nSự nghiệp:\n\nThập niên 1960:\n\nNăm 1966, Pacino học diễn xuất dưới sự giảng dạy của Lee Strasberg (người sau này sẽ đóng cùng ông trong bộ phim năm 1974 Bố già phần II). Al nhận ra rằng ông thực sự yêu thích và có khả năng trong nghề này. Tuy nhiên cũng vì theo nghiệp diễn viên mà Al Pacino lâm vào cuộc sống khó khăn mãi đến cuối thập niên 1960, khi ông nhận được giải Obie Award cho vai diễn trong The Indian Wants the Bronx và giải Tony cho vai nam trong vở Does the Tiger Wear a Necktie?. Ông xuất hiện trên phim lần đầu tiên là trong một tập của loạt phim truyền hình N.Y.P.D. năm 1968, còn bộ phim nhựa đầu tiên của Pacino, Me, Natalie đến với ông một năm sau đó.\n\nThập niên 1970:\n\nNăm 1971 Al Pacino tham gia bộ phim The Panic in Needle Park trong vai một kẻ nghiện ma túy, chính nhờ vai diễn này mà đạo diễn Francis Ford Coppola đã biết đến ông và giao cho Al Pacino vai quan trọng Michael Corleone trong bộ phim huyền thoại năm 1972 của Coppola, Bố già. Cũng có nhiều diễn viên tên tuổi như Robert Redford, Warren Beatty hay diễn viên trẻ Robert De Niro được đóng thử cho vai Michael Corleone, đạo diễn Coppola vẫn quyết định chọn Al Pacino, một diễn viên khi đó gần như vô danh, điều này đã làm những người điều hành hãng phim không hài lòng. Al Pacino đã không phụ sự tin tưởng của đạo diễn Coppola, anh thể hiện vai Michael Corleone rất tốt và được đề cử giải Oscar đầu tiên cho Nam diễn viên phụ xuất sắc nhất.\nNăm 1973 Pacino tham gia một bộ phim thành công khác là Serpico và đóng cùng Gene Hackman trong phim Scarecrow. Một năm sau, Pacino tiếp tục vào vai trong phần kế của loạt phim Bố già, bộ phim Bố già phần II, có nhiều đất diễn hơn phần đầu, Pacino đã thể hiện cực kì xuất sắc vai Don Michael Corleone, nhiều nhà phê bình cho rằng đây là một trong những diễn xuất hay nhất trong lịch sử điện ảnh. Anh được đề cử giải Oscar Nam diễn viên chính xuất sắc nhất nhưng đáng tiếc lại để thua diễn viên Art Carney.\nNăm 1975, Al Pacino tiếp tục thành công với bộ phim Dog Day Afternoon.",
    "aliases": [
      "al pacino"
    ],
    "featured": false,
    "gender": 2,
    "tags": [
      "Tội phạm",
      "Chính kịch",
      "Hollywood"
    ]
  },
  {
    "slug": "matt-damon",
    "name": "Matt Damon",
    "englishName": "Matt Damon",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Hành động",
      "Chính kịch"
    ],
    "roles": "Điệp viên Jason Bourne • Biên kịch",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/aCvBXTAR9B1qRjIRzMBYhhbm1fR.jpg",
    "tmdbPersonId": 1892,
    "birthday": "1970-10-08",
    "placeOfBirth": "Boston, Massachusetts, USA",
    "bio": "Matthew Paige Damon, thường được biết đến với nghệ danh Matt Damon (sinh ngày 8 tháng 10 năm 1970), là một nam diễn viên, nhà sản xuất phim và nhà biên kịch người Mỹ. Anh được tạp chí Forbes bình chọn là một trong những ngôi sao bảo chứng doanh thu và là một trong những diễn viên được trả thù lao cao nhất mọi thời đại. Damon đã nhận được nhiều thành tựu trong sự nghiệp, bao gồm một giải Oscar trên tổng số 5 đề cử, hai giải Quả cầu vàng trên tổng số 8 đề cử, và đã được đề cử cho hai giải BAFTA và sáu giải Emmy.\nDamon bắt đầu sự nghiệp diễn xuất qua việc xuất hiện trong những tác phẩm sân khấu trung học và có vai diễn chuyên nghiệp đầu tiên trong phim Mystic Pizza (1988). Anh bắt đầu nổi tiếng vào năm 1997 với vai trò viết kịch bản và thủ vai chính trong Good Will Hunting bên cạnh Ben Affleck, đã giúp họ giành giải Oscar và Quả cầu vàng cho Kịch bản xuất sắc nhất, đồng thời đem lại một đề cử giải Oscar ở hạng mục Nam diễn viên chính xuất sắc nhất cho Damon. Anh tiếp tục thu hút sự chú ý từ giới phê bình với một loạt những vai diễn trong Saving Private Ryan (1998), Ngài Ripley tài ba (1999), Dogma (1999), Syriana (2005), và The Departed (2006).\nDamon cũng được biết đến với vai chính Jason Bourne trong loạt phim Bourne (2002-16) và vai một kẻ bìm bợp trong loạt phim Ocean's Trilogy (2001–07). Với vai phụ là cầu thủ bóng bầu dục Francois Pienaar trong Invictus (2009) và vai chính như là một phi hành gia bị mắc kẹt trên sao Hỏa trong The Martian (2015), Damon đã nhận được những đề cử Oscar cho Nam diễn viên phụ xuất sắc nhất và Nam diễn viên chính xuất sắc nhất. Ngoài ra, anh cũng chiến thắng giải Quả cầu vàng cho Nam diễn viên chính xuất sắc nhất với vai diễn trong The Martian. Damon đã nhận được những đề cử giải Emmy cho vai diễn Scott Thorson trong bộ phim tiểu sử Behind the Candelabra (2013) và trong vai trò sản xuất phim tài liệu truyền hình thực tế Project Greenlight. Anh cũng nhận được một đề cử giải Oscar với việc tham gia sản xuất Manchester by the Sea (2016).\nNgoài công việc diễn xuất, Damon cũng tham gia công việc lồng tiếng trong nhiều bộ phim hoạt hình và phim tài liệu và đã thành lập hai công ty sản xuất với Affleck. Anh còn tích cực tham gia vào các hoạt động từ thiện, bao gồm Chiến dịch ONE, Quỹ H2O Africa, Feeding America, và Water.org. Năm 2005, Damon kết hôn với Luciana Bozán Barroso, và họ đã có ba người con gái với nhau.\n\nPhim đã đóng:\n\nChú thích:\n\nĐọc thêm:\n\nAltman, Sheryl and Berk, Sheryl. Matt Damon and Ben Affleck: On and Off Screen. HarperCollins Publishers, 1998. ISBN 0-06-107145-5.\nBego, Mark. Matt Damon: Chasing a Dream. Andrews Mcmeel Pub, 1998. ISBN 0-8362-7131-9.\nDiamond, Maxine and Hemmings, Harriet. Matt Damon a Biography. Simon Spotlight Entertainment, 1998. ISBN 0-671-02649-6.\nNickson, Chris. Matt Damon: An Unauthorized Biography. Renaissance Books, 1999. ISBN 1-58063-072-3.",
    "aliases": [
      "matt damon",
      "jason bourne"
    ],
    "featured": false
  },
  {
    "slug": "ben-affleck",
    "name": "Ben Affleck",
    "englishName": "Ben Affleck",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "roles": "Đạo diễn Oscar • Batman",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/aTcqu8cI4wMohU17xTdqmXKTGrw.jpg",
    "tmdbPersonId": 880,
    "birthday": "1972-08-15",
    "placeOfBirth": "Berkeley, California, USA",
    "bio": "Ben Affleck (tên khai sinh Benjamin Géza Affleck-Boldt, sinh ngày 15 tháng 8 năm 1972 là một nhà biên kịch, đạo diễn, diễn viên, nhà sản xuất phim người Mỹ và là anh trai của Casey Affleck. Ben Affleck nổi lên trong giai đoạn thập niên 1990, sau khi tham gia bộ phim Mallrats. Năm 1998, anh đã trở thành biên kịch trẻ nhất trong lịch sử giành giải Oscar cho kịch bản xuất sắc nhất ở tuổi 25 khi cùng người bạn thân Matt Damon chắp bút cho bộ phim Good Will Hunting. Affleck đã tham dự khá nhiều bộ phim có kinh phí lớn, ví dụ như Armageddon, Trân Châu Cảng, Changing Lanes, The Sum of All Fears và Daredevil.\nSau mối quan hệ với nữ diễn viên Gwyneth Paltrow năm 1998, Affleck đã gây xôn xao với mối tình cùng diễn viên, ca sĩ Jennifer Lopez. Sau khi chia tay Lopez năm 2004, anh hẹn hò với Jennifer Garner. Hai người kết hôn năm 2005 và có với nhau 3 người con, gồm 2 con gái là Violet Affleck (sinh năm 2005) và Seraphina Affleck (sinh năm 2009) cùng một cậu con trai tên Samuel Garner Affleck (sinh năm 2012). 2 người li dị vào năm 2018 sau 3 năm sống li thân. Đầu năm 2021, anh tái hợp với bạn gái cũ Jennifer Lopez và tuyên bố tái đính hôn vào tháng 4 năm 2022.\nAffleck có tham gia các hoạt động chính trị, cùng với một tổ chức phi lợi nhuận dành cho trẻ em có tên là A-T. Anh đã cùng với người bạn thân thời niên thiếu Matt Damon thành lập một công ty sản xuất có tên là LivePlanet.\n\nCác bộ phim đã tham gia:\n\nChú thích:",
    "aliases": [
      "ben affleck"
    ],
    "featured": false,
    "gender": 2,
    "tags": [
      "DC",
      "Hollywood",
      "Hành động",
      "Chính kịch"
    ]
  },
  {
    "slug": "jennifer-lawrence",
    "name": "Jennifer Lawrence",
    "englishName": "Jennifer Lawrence",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "gender": 1,
    "tags": [
      "Hollywood",
      "Chính kịch",
      "Hành động"
    ],
    "roles": "The Hunger Games • Nữ diễn viên Oscar",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/k6CsASaySnS3ag0Y2Ns2vqPahVn.jpg",
    "tmdbPersonId": 72129,
    "birthday": "1990-08-15",
    "placeOfBirth": "Indian Hills, Kentucky, USA",
    "bio": "Jennifer Shrader Lawrence (sinh ngày 15 tháng 8 năm 1990) là một nữ diễn viên điện ảnh người Mỹ. Vai diễn đầu tiên của cô là một trong những nhân vật chính của loạt phim truyền hình The Bill Engvall Show (2007–2009) phát trên kênh TBS. Từ đó trở về sau cô xuất hiện trong các bộ phim độc lập như Đồng bằng rực cháy (2008) và Xương trắng (2010) - bộ phim đã mang lại cho Jennifer Lawrence đề cử giải Oscar đầu tiên trong sự nghiệp ở hạng mục Nữ diễn viên chính xuất sắc nhất vào năm 2011 khi vừa mới tròn 20 tuổi, giúp cô lập kỷ lục khi trở thành người trẻ tuổi thứ hai được đề cử ở hạng mục này tại thời điểm đó.\nNăm 22 tuổi, qua bộ phim Tình yêu tìm lại (2012), Lawrence vào vai Tiffany Maxwell - một phụ nữ trưởng thành nghiện tình dục với nhiều diễn biến tâm lý phức tạp đã mang về cho cô giải Quả cầu vàng cùng một tượng vàng giải Oscar đầu tiên, giúp cô trở thành diễn viên trẻ nhất từng hai lần được đề cử giải Oscar cho hạng mục Nữ diễn viên chính xuất sắc nhất và là người trẻ tuổi thứ hai trong lịch sử giành được giải thưởng danh giá này. Đến năm 2013, thành công tiếp tục đến với cô gái trẻ, với vai Rosalyn Rosenfeld - cô vợ của một tay lừa đảo thiên tài chuyên thực hiện các phi vụ có liên quan đến những tác phẩm nghệ thuật trong bộ phim hài của đạo diễn David O. Russell - Săn tiền kiểu Mỹ (2013) lại tiếp tục giúp cô mang về giải Quả cầu vàng, giải BAFTA và nhận được đề cử giải Oscar thứ ba trong sự nghiệp ở hạng mục nữ diễn viên phụ xuất sắc nhất.\nJennifer Lawrence cũng được biết đến nhiều hơn khi vào vai dị nhân Raven Darkhölme / Mystique qua bộ phim ăn khách X-Men: Thế hệ thứ nhất (2011) và sau đó là X-Men: Ngày cũ của tương lai (2014). Năm 2012, cô trở nên nổi tiếng trên toàn thế giới nhờ vai diễn Katniss Everdeen trong Đấu trường sinh tử - bộ phim chuyển thể từ cuốn tiểu thuyết cùng tên bán chạy nhất của nhà văn Suzanne Collins. Vai diễn được các nhà phê bình khen ngợi nhiệt liệt, The Hunger Games nằm ở vị trí thứ 3 trong danh sách những bộ phim có doanh thu phòng vé mở màn cao nhất mọi thời đại, giúp Lawrence phá vỡ thế độc tôn của hình tượng các nam anh hùng trong phim hành động Hollywood khi trở thành Nữ anh hùng màn ảnh mang lại doanh thu cao nhất mọi thời đại.\nĐến thời điểm hiện tại, sở hữu vẻ đẹp hài hòa, tài năng, hàng loạt những vai diễn thành công của Jennifer Lawrence ở cả hai lĩnh vực thương mại và nghệ thuật, cùng với một ngai vàng vững chắc ở tuổi 23 khi liên tiếp mang về rất nhiều giải thưởng danh giá đã khiến tạp chí Rolling Stone gọi cô là \"Nữ diễn viên trẻ tài năng nhất nước Mỹ.\" Năm 2013, tạp chí Time đã đưa tên cô vào danh sách 100 người có ảnh hưởng nhất trên thế giới. Vào năm 2014, Jennifer Lawrence tiếp tục vượt mặt rất nhiều ngôi sao nổi tiếng khác để đứng đầu hạng mục Nữ diễn viên quyền lực nhất Hollywood và xếp vị trí thứ 12 trong danh sách \"Celebrity 100\" (100 người nổi tiếng) được thống kê hàng năm của công ty truyền thông và xuất bản Hoa Kỳ - Forbes.",
    "aliases": [
      "jennifer lawrence"
    ],
    "featured": false
  },
  {
    "slug": "natalie-portman",
    "name": "Natalie Portman",
    "englishName": "Natalie Portman",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "gender": 1,
    "tags": [
      "Hollywood",
      "Marvel",
      "Chính kịch"
    ],
    "roles": "Thiên nga đen Black Swan • Oscar",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/edPU5HxncLWa1YkgRPNkSd68ONG.jpg",
    "tmdbPersonId": 524,
    "birthday": "1981-06-09",
    "placeOfBirth": "Jerusalem, Israel",
    "bio": "Natalie Portman (tiếng Hebrew: נטלי פורטמן, tên khai sinh: Natalie Hershlag, נטלי הרשלג), sinh ngày 9 tháng 6 năm 1981 tại Jerusalem, Israel). Cô là một nữ diễn viên người Mỹ gốc Israel từng đoạt 1 giải Oscar và 2 giải Quả Cầu Vàng.\nVai diễn đầu tay của cô là trong bộ phim độc lập Léon. Trong khi vẫn còn học trung học, cô đã nổi tiếng toàn thế giới với vai diễn Padmé Amidala trong Star Wars: Tập I - The Phantom Menace và nhận được sự ca ngợi từ giới phê bình khi đóng vai một thiếu niên già trước tuổi trong bộ phim Anywhere but Here (1999). Từ năm 1999 đến năm 2003, Portman theo học Đại học Harvard để lấy bằng cử nhân về tâm lý học. Cô tiếp tục diễn xuất trong khi ở trường đại học, tham gia vào sự hồi sinh năm 2001 của The Public Theatre trong vở kịch The Seagull của Anton Chekhov và phần tiếp theo của Star Wars: Episode II - Attack of the Clones (2002). Năm 2004, Portman được đề cử giải Oscar cho Nữ diễn viên phụ xuất sắc nhất và đoạt giải Quả cầu vàng cho vai một vũ nữ thoát y bí ẩn trong phim Closer.\nBộ ba phần tiền truyện của Star Wars kết thúc với Star Wars: Episode III - Revenge of the Sith (2005), sau đó Portman đóng rất nhiều vai diễn. Cô đóng vai Evey Hammond trong phim V for Vendetta (2006), Anne Boleyn trong The Other Boleyn Girl (2008), và một nữ diễn viên ballet trong bộ phim kinh dị tâm lý Black Swan (2010), cô giành giải Oscar cho nữ diễn viên xuất sắc nhất cho vai diễn này. Portman tiếp tục tham gia bộ phim hài lãng mạn No Strings Attached (2011) và có vai Jane Foster trong phim Thor (2011) và Thor: The Dark World (2013). Với vai diễn Jacqueline Kennedy trong bộ phim tiểu sử Jackie (2016), Portman đã nhận được đề cử Oscar thứ ba. Portman là tiếng nói về chính trị của Mỹ và Israel, và là một người ủng hộ quyền động vật và bảo vệ môi trường. Cô kết hôn với vũ công Benjamin Millepied, người mà cô có hai đứa con.\n\nTuổi thơ:",
    "aliases": [
      "natalie portman"
    ],
    "featured": false
  },
  {
    "slug": "sandra-bullock",
    "name": "Sandra Bullock",
    "englishName": "Sandra Bullock",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "roles": "Gravity • Bird Box • Minh tinh Oscar",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/4rfjISL3Flx16jfiusXoHbpt87X.jpg",
    "tmdbPersonId": 18277,
    "birthday": "1964-07-26",
    "placeOfBirth": "Arlington County, Virginia, USA",
    "bio": "Sandra Annette Bullock (phát âm /ˈbʊlək/; sinh ngày 26 tháng 7 năm 1964) là một nữ diễn viên người Mỹ. Cô bắt đầu nổi danh trong thập niên 1990, sau khi tham gia diễn xuất trong một vài bộ phim thu được thành công như Demolition Man (1993), Speed (1994), The Net (1995), While You Were Sleeping (1995), A Time to Kill (1996), và Hope Floats (1998). Sang thiên niên kỷ mới, Bullock tiếp tục xây dựng sự nghiệp của mình với các vai diễn trong phim Miss Congeniality (2000) và Crash (2004), bộ phim nhận được sự khen ngợi từ giới phê bình. Năm 2007, cô được xếp hạng 14 trong danh sách các nữ ngôi sao giàu có nhất trong ngành giải trí với tài sản ước tính 85 triệu đô-la Mỹ. Năm 2009 được ghi nhận là một trong những năm thành công nhất trong sự nghiệp của Bullock khi cô tham gia hai bộ phim The Proposal và The Blind Side đều thu được thành công về thương mại. Với The Blind Side, cô gặt hái được nhiều giải thưởng điện ảnh ở hạng mục Nữ diễn viên chính xuất sắc nhất trong đó có giải Oscar và giải Quả cầu vàng. Cô hiện là nữ diễn viên duy nhất đoạt hai giải thưởng trái ngược là Oscar (Nữ diễn viên chính xuất sắc nhất) và giải Mâm xôi vàng (Nữ diễn viên dở nhất cho All About Steve) trong cùng một năm.\nCô được ghi nhận trong Sách Kỷ lục Guinness bản năm 2012 là nữ diễn viên có thu nhập cao nhất, với 56 triệu đô-la. Năm 2013, cô góp mặt trong phim The Heat, đây là bộ phim hài thành công nhất về mặt tài chính trong năm tại phòng vé của Mỹ, và phim Gravity, được phát hành vào ngày 4 tháng 10 năm 2013 để trùng với thời điểm bắt đầu Tuần lễ Không gian Thế giới (World Space Week). Không chỉ là một trong những bộ phim có doanh thu cao nhất trong năm, Gravity còn là bộ phim thành công nhất của Bullock về mặt thương mại lẫn nghệ thuật. Vai diễn Tiến sĩ Ryan Stone trong Gravity giúp Bullock được đề cử Giải Oscar cho nữ diễn viên chính xuất sắc nhất, Giải BFCA cho nữ diễn viên chính xuất sắc nhất, Giải SAG cho nữ diễn viên chính xuất sắc nhất, Giải BAFTA cho nữ diễn viên chính xuất sắc nhất và Giải Quả cầu vàng cho nữ diễn viên phim chính kịch xuất sắc nhất.",
    "aliases": [
      "sandra bullock"
    ],
    "featured": false,
    "gender": 1,
    "tags": [
      "Hài",
      "Chính kịch",
      "Hollywood"
    ]
  },
  {
    "slug": "meryl-streep",
    "name": "Meryl Streep",
    "englishName": "Meryl Streep",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "gender": 1,
    "tags": [
      "Hollywood",
      "Chính kịch",
      "Hài"
    ],
    "roles": "3 tượng vàng Oscar • Huyền thoại diễn xuất",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/emAAzyK1rJ6aiMi0wsWYp51EC3h.jpg",
    "tmdbPersonId": 5064,
    "birthday": "1949-06-22",
    "placeOfBirth": "Summit, New Jersey, USA",
    "bio": "Mary Louise \"Meryl\" Streep (sinh ngày 22 tháng 6 năm 1949) là một nữ diễn viên và nhà nhân đạo người Mỹ. Được giới truyền thông gọi là \"nữ diễn viên xuất sắc nhất của thế hệ\", Streep nổi tiếng nhờ tài biến hóa giọng nói trong nhiều vai diễn đa dạng. Streep đã giành 21 đề cử cho giải Oscar, nhiều hơn bất kể một diễn viên nào, đồng thời là một trong sáu diễn viên duy nhất chiến thắng nhiều hơn 3 giải Oscar trong lĩnh vực diễn xuất. Bà còn mang về kỷ lục 30 đề cử giải Quả cầu vàng và thắng 8 giải, nhiều nhất trong số các diễn viên.\nVai diễn sân khấu chuyên nghiệp đầu tiên của Streep nằm trong vở Trelawny of the Wells năm 1975. Năm 1976, bà nhận đề cử giải Tony cho \"Nữ diễn viên chính kịch xuất sắc\" với vai diễn trong 27 Wagons Full of Cotton. Bà lần đầu góp mặt trên truyền hình năm 1977 bằng bộ phim The Deadliest Season, rồi cuối năm đó khởi nghiệp điện ảnh với Julia. Năm 1978, bà thắng giải Emmy cho vai diễn trong loạt phim ngắn Holocaust và nhận đề cử giải Oscar đầu tiên cho The Deer Hunter. Bà giành chiến thắng tại hạng mục \"Nữ diễn viên phụ xuất sắc nhất\" cho Kramer vs. Kramer (1979) và \"Nữ diễn viên chính xuất sắc nhất\" cho \nSophie's Choice (1982) và The Iron Lady (2011).\nNhững vai diễn giành đề cử giải Oscar khác của Streep nằm trong The French Lieutenant's Woman (1981), Silkwood (1983), Out of Africa (1985), Ironweed (1987), Evil Angels (1988), Postcards from the Edge (1990), The Bridges of Madison County (1995), One True Thing (1998), Music of the Heart (1999), Adaptation (2002), The Devil Wears Prada (2006), Doubt (2008), Julie & Julia (2009), August: Osage County (2013), Into the Woods (2014) và Florence Foster Jenkins (2016). Bà trở lại sân khấu sau hơn 20 năm trong vở The Seagull, được dàn dựng mới năm 2001 tại Nhà hát Public, giúp bà giành giải Emmy thứ hai và tiếp tục thắng giải Quả cầu vàng năm 2004 cho loạt phim đài HBO Angels in America (2003).\nStreep được trao giải Thành tựu trọn đời của Viện phim Mỹ năm 2004, giải thưởng Gala Tribute từ Hiệp hội điện ảnh Trung tâm Lincoln năm 2008 và giải thưởng danh dự của Trung tâm Kenedy năm 2011, dành cho những đóng góp của bà đến văn hóa Mỹ. Tổng thống Hoa Kỳ Barack Obama vinh danh bà bằng Huân chương Quốc gia Nghệ thuật năm 2010 và Huân chương Tự do Tổng thống năm 2014. Năm 2003, Chính phủ Pháp trao tặng bà Huân chương Order of Arts and Letters. Năm 2017, Streep nhận giải Quả cầu vàng Cecil B. DeMille.\n\nThời thơ ấu:",
    "aliases": [
      "meryl streep"
    ],
    "featured": false
  },
  {
    "slug": "tom-hiddleston",
    "name": "Tom Hiddleston",
    "englishName": "Tom Hiddleston",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "roles": "Thần Lừa Lọc Loki • MCU",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/mclHxMm8aPlCPKptP67257F5GPo.jpg",
    "tmdbPersonId": 91606,
    "birthday": "1981-02-09",
    "placeOfBirth": "Westminster, London, England, UK",
    "bio": "Thomas William Hiddleston (sinh ngày 9 tháng 2 năm 1981) là một diễn viên người Anh. Anh nổi tiếng quốc tế với vai diễn Loki trong Vũ trụ Điện ảnh Marvel (MCU), bắt đầu với Thor (2011) và gần nhất là trong loạt phim truyền hình Disney+ Loki (2021–nay).\nAnh bắt đầu sự nghiệp điện ảnh của mình trong các bộ phim Joanna Hogg Un Related (2007) và Archipelago (2010). Năm 2011, Hiddleston đóng vai F. Scott Fitzgerald trong bộ phim hài lãng mạn Midnight in Paris của Woody Allen và xuất hiện trong War Horse của Steven Spielberg. Năm đó, anh đã giành được giải thưởng Empire cho Nam diễn viên mới xuất sắc nhất và được đề cử cho Giải thưởng Ngôi sao đang lên của BAFTA . Anh tiếp tục làm việc với các auteurs trong các bộ phim độc lập bao gồm The Deep Blue Sea (2012) của Terence Davies, bộ phim lãng mạn về ma cà rồng của Jim Jarmusch Only Lovers Left Alive (2013) và Crimson Peak (2015)của Guillermo del Toro. Anh cũng đóng vai chính trong bộ phim hành động High Rise của Ben Wheatley, và đóng vai ca sĩ nhạc đồng quê rắc rối Hank Williams trong bộ phim tiểu sử I Saw The Light. Bộ phim Kong: Skull Island (2017) đánh dấu vai chính đầu tiên có kinh phí lớn bên ngoài MCU.\nHiddleston xuất hiện lần đầu trên sân khấu trong Journey's End vào năm 1999. Anh tiếp tục diễn xuất trong nhà hát, bao gồm cả các tác phẩm West End của Cymbeline (2007) và Ivanov (2008). Anh đã giành được giải thưởng Olivier cho Người mới xuất sắc nhất trong vở kịch cho vai diễn trong Cymbeline và cũng được đề cử giải thưởng tương tự cho vai diễn Cassio trong Othello (2008). Hiddleston đóng vai chính trong bộ phim Coriolanus (2013–14), giành được Giải thưởng Nhà hát Tiêu chuẩn Buổi tối cho Nam diễn viên chính xuất sắc nhất và nhận được đề cử Giải Olivier cho Nam diễn viên chính xuất sắc nhất . Anh ấy đã làm cho của mìnhLần đầu ra mắt tại Broadway trong sự hồi sinh năm 2019 của bộ phim truyền hình kinh điển Betrayal của Harold Pinter, bộ phim mà anh đã được đề cử cho Giải Tony cho Nam diễn viên chính xuất sắc nhất trong một vở kịch .\nHiddleston cũng được biết đến với những màn trình diễn trên truyền hình, bao gồm cả vai diễn trong loạt phim The Hollow Crown s Henry IV và Henry V của đài BBC năm 2012. Hiddleston đóng vai chính và điều hành sản xuất loạt phim giới hạn The Night Manager (2016) của đài AMC / BBC, bộ phim mà anh đã nhận được hai đề cử giải Primetime Emmy, và giành giải Quả cầu vàng đầu tiên cho Nam diễn viên chính xuất sắc nhất - Phim truyền hình hoặc Miniseries.\n\nĐầu đời và giáo dục:",
    "aliases": [
      "tom hiddleston",
      "loki"
    ],
    "featured": false,
    "gender": 2,
    "tags": [
      "Marvel",
      "Hollywood",
      "Chính kịch"
    ]
  },
  {
    "slug": "hugh-grant",
    "name": "Hugh Grant",
    "englishName": "Hugh Grant",
    "country": "Anh Quốc 🇬🇧",
    "countryCode": "us_uk",
    "roles": "Hoàng tử phim lãng mạn Anh Quốc",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/dvV843fOuzsEPXHtFvdzsHpy1rC.jpg",
    "tmdbPersonId": 3291,
    "birthday": "1960-09-09",
    "placeOfBirth": "London, England, UK",
    "bio": "Hugh John Mungo Grant (sinh ngày 9 tháng 9 năm 1960) là một diễn viên và nhà sản xuất phim người Anh.\nHugh đã nhận được một giải Quả cầu vàng, giải BAFTA, và Giải César danh dự. Những phim của ông đã thu được hơn 2,4 tỷ $ từ 25 cuốn phim phát hành trên toàn thế giới. Grant đạt được thành công quốc tế sau khi xuất hiện trong phim Bốn đám cưới và một đám ma với kịch bản của Richard Curtis (1994). Grant sử dụng vai trò mang tính đột phá này làm một nhân vật điện ảnh thường xuyên trong những năm 1990, cung cấp màn trình diễn hài hước trong những cuốn phim xu thế chủ đạo như Mickey Blue Eyes (1999) và Notting Hill (1999).\nBước sang thế kỷ 21, Grant đã khẳng định mình là một trong những người đứng đầu, có tay nghề với một tài năng hài hước châm biếm. Grant đã mở rộng sự nghiệp nghệ thuật của mình với những vai được ca ngợi như trong Bridget Jones's Diary (2001), About a Boy (2002), và American Dreamz (2006). Grant sau đó đóng nhiều vai trò khách mời trong bộ phim khoa học giả tưởng, Cloud Atlas (2012).\nTrong ngành công nghiệp điện ảnh, Grant được trích dẫn là một phản ngôi sao điện ảnh (anti-star) mà tiếp cận vai trò của mình như một nhân vật bất thường, và cố gắng để làm cho diễn xuất của mình có tính cách tự phát. Điểm nổi bật của kỹ năng hài hước của anh bao gồm một chút gì thờ ơ có vẻ mỉa mai / châm biếm và theo trường phái kiểu cách, cũng như các cuộc đối thoại hợp lúc và với những diễn tả qua nét mặt. Các phương tiện truyền thông giải trí tường thuật cuộc sống của Grant ngoài đời làm lu mờ công việc của ông như là một diễn viên. Grant đã thẳng thắn bày tỏ sự ác cảm của mình đối với nghề diễn xuất, và trong sự khinh thị của ông đối với nền văn hóa chuộng người nổi tiếng và sự thù ghét đối với các phương tiện truyền thông. Trong sự nghiệp kéo dài 30 năm, Grant đã nhiều lần tuyên bố rằng diễn xuất không phải là một thiên hướng thực sự của mình, mà là một sự nghiệp tình cờ phát triển một cách ngẫu nhiên.",
    "aliases": [
      "hugh grant"
    ],
    "featured": false,
    "gender": 2,
    "tags": [
      "Tình cảm",
      "Hài",
      "Hollywood"
    ]
  },
  {
    "slug": "colin-firth",
    "name": "Colin Firth",
    "englishName": "Colin Firth",
    "country": "Anh Quốc 🇬🇧",
    "countryCode": "us_uk",
    "roles": "Kingsman • The King's Speech",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/z6wxnkqSTnzO1tcBui0ss7ehdm9.jpg",
    "tmdbPersonId": 5472,
    "birthday": "1960-09-10",
    "placeOfBirth": "Grayshott, Hampshire, England, UK",
    "bio": "Colin Andrew Firth (sinh ngày 10 tháng 9 năm 1960) là một diễn viên người Anh. Ông sinh ra trong một gia đình trí thức. Cha mẹ ông đều làm giảng viên Đại học Hoàng gia Winchester.\nKhi mới được 2 tuần tuổi, cha mẹ Firth đã chuyển tới Nigeria và sau đó khi thì ở Ấn Độ, khi thì ở Mỹ. Do thời thơ ấu được chứng kiến cảnh đói nghèo ở Nigeria và thừa hưởng tính tiết kiệm của cha mẹ nên Firth không để cho cuộc sống của người nổi tiếng làm \"nhiễm\" phong cách sống của mình.\nColin Firth bắt đầu sự nghiệp của mình trong serie phim truyền hình Pride and Prejudice (1995) của kênh BBC. Sau đó, ông tiếp tục thủ vai chính trong serie phim Nhật ký tiểu thư Jones, Shakespeare in Love và Love Actually cùng nhiều phim khác. Firth cũng tham gia đóng kịch và thường xuyên diễn trên sân khấu trong thời gian 1983 - 2002. Vai diễn nổi tiếng nhất của ông cho đến nay là Vua George VI trong phim The King's Speech.",
    "aliases": [
      "colin firth",
      "kingsman"
    ],
    "featured": false,
    "gender": 2,
    "tags": [
      "Hành động",
      "Chính kịch",
      "Hollywood"
    ]
  },
  {
    "slug": "gary-oldman",
    "name": "Gary Oldman",
    "englishName": "Gary Oldman",
    "country": "Anh Quốc 🇬🇧",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "DC",
      "Chính kịch"
    ],
    "roles": "Sirius Black • Nam diễn viên Oscar",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/yhaSM5habNNI1Tf4ALRwRk3VvSZ.jpg",
    "tmdbPersonId": 64,
    "birthday": "1958-03-21",
    "placeOfBirth": "London, England, UK",
    "bio": "Gary Leonard Oldman (sinh 21 tháng 3 năm 1958) là một diễn viên và nhà làm phim người Anh. Được biết đến với sự linh hoạt và phong cách diễn xuất mãnh liệt, ông đã nhận được nhiều giải thưởng khác nhau, bao gồm một giải thưởng Viện hàn lâm, một giải Quả cầu vàng và ba giải thưởng Điện ảnh Viện hàn lâm Anh. Các bộ phim của ông đã thu về hơn 11 tỷ đô la trên toàn thế giới, khiến ông trở thành một trong những diễn viên có doanh thu cao nhất mọi thời đại.\nOldman bắt đầu tham gia diễn xuất ở nhà hát vào năm 1979 và có bộ phim đầu tay trong Remembrance (1982). Anh tiếp tục theo đuổi sự nghiệp sân khấu tại Tòa án Hoàng gia London và là thành viên của Công ty Royal Shakespeare, với các tác phẩm như Cabaret, Romeo and Juliet, Entertaining Mr Sloane, Saved, The Country Wife và Hamlet. Anh trở nên nổi tiếng trong phim Anh với các vai diễn Sid Vicious trong Sid and Nancy (1986), Joe Orton trong Prick Up Your Ears (1987) và Rosencrantz trong Rosencrantz & Guildenstern Are Dead (1990), đồng thời thu hút sự chú ý với vai thủ lĩnh của một băng nhóm côn đồ bóng đá trong bộ phim truyền hình The Firm (1989). Được coi là thành viên của \"Brit Pack\", ông đạt được sự công nhận lớn hơn với tư cách là một tay xã hội đen ở New York trong State of Grace (1990), Lee Harvey Oswald trong JFK (1991) và Bá tước Dracula trong Bram Stoker's Dracula (1992).\nOldman đã thể hiện những nhân vật phản diện trong các bộ phim như True Romance (1993), The Fifth Element (1997), Air Force One (1997) và The Contender (2000); đặc vụ tham nhũng Norman Stansfield của DEA, người mà anh đóng trong Léon: The Professional (1994), được gọi là một trong những nhân vật phản diện hay nhất của điện ảnh. Ông cũng đóng vai Ludwig van Beethoven trong Immortal Beloved (1994) và sau đó xuất hiện trong các vai nhượng quyền thương mại như Sirius Black trong loạt phim Harry Potter, James Gordon trong loạt phim The Dark Knight (2005–2012) và một nhà lãnh đạo con người, Dreyfus trong Sự khởi đầu của hành tinh khỉ (2014). Ông đã giành được Giải Oscar cho Nam diễn viên chính xuất sắc nhất cho vai diễn Winston Churchill trong Giờ đen tối (2017) và được đề cử cho vai diễn George Smiley trong Tinker Tailor Soldier Spy (2011) và Herman J. Mankiewicz trong Mank (2020).\nOldman là nhà sản xuất điều hành của các bộ phim như The Contender , Plunkett & Macleane (1999) và Nil by Mouth (1997), những bộ phim sau này do ông viết kịch bản và đạo diễn. Anh đã góp mặt trong các chương trình truyền hình như Slow Horses, Fallen Angels, Tracey Takes On... and Friends, lồng tiếng cho Ignitius và Viktor Reznov lần lượt trong các trò chơi điện tử The Legend of Spyro và Call of Duty , và xuất hiện trong các video âm nhạc của David Bowie, Guns N 'Roses và Annie Lennox.\n\nTuổi thơ:",
    "aliases": [
      "gary oldman"
    ],
    "featured": false
  },
  {
    "slug": "keira-knightley",
    "name": "Keira Knightley",
    "englishName": "Keira Knightley",
    "country": "Anh Quốc 🇬🇧",
    "countryCode": "us_uk",
    "roles": "Cướp biển vùng Caribbean • Kiêu hãnh và định kiến",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/k69IOXdz8PAvaegAI8WYvQvyyUJ.jpg",
    "tmdbPersonId": 116,
    "birthday": "1985-03-26",
    "placeOfBirth": "Teddington, London, England, UK",
    "bio": "Keira Christina Knightley (OBE, phát âm /ˌkɪərəˈnaɪtlɪ/; sinh 26 tháng 3 năm 1985) là một diễn viên, người mẫu người Anh. Cô bắt đầu sự nghiệp khi còn trẻ và trở nên nổi tiếng thế giới vào năm 2003 sau khi tham gia diễn xuất trong phim Bend It Like Beckham và Cướp biển vùng Caribbean: Lời nguyền của tàu Ngọc Trai Đen.\nKnightley xuất hiện trong một số bộ phim của Hollywood và được đề cử cho Giải Oscar cho nữ diễn viên chính xuất sắc nhất (Kiêu hãnh và Định kiến) và Giải Quả cầu vàng cho nữ diễn viên phim chính kịch xuất sắc nhất cũng như Giải BAFTA cho nữ diễn viên chính xuất sắc nhất cho vai diễn trong Atonement.\nNăm 2008, Forbes tuyên bố Knightley là nữ diễn viên có thu nhập cao thứ hai ở Hollywood, theo một báo cáo cô nhận được là 32 triệu USD trong năm 2007, trở thành nữ diễn viên duy nhất không phải người Mỹ nằm trong danh sách những diễn viên có thu nhập cao nhất.\n\nTuổi trẻ:\n\nKnightley được sinh ra ở Teddington, London, Anh, con gái của Sharman MacDonald, một nhà soạn kịch từng đoạt giải thưởng, và Will Knightley, một diễn viên nhà hát và truyền hình. Cha của cô là người Anh, và mẹ của cô là người Scotland mang một nửa dòng máu xứ Wales. Cô có một người anh trai, Caleb, anh ta sinh vào năm 1979. Knightley sống ở Richmond, theo học Stanley Junior School, Teddington School và Esher College. Cô mắc chứng khó đọc, nhưng tuy nhiên cô đã thành công trong trường học và được cho phép như vậy, để thu được một đại lý tài năng và theo đuổi sự nghiệp diễn viên. Cô đã yêu cầu một đại diện sớm nhất là khi ba tuổi và có một người khi cô lên sáu, từ mẹ của cô như là một phần thưởng cho việc học tập khó khăn. Knightley đã lưu ý rằng cô ấy đã được \"chuyên tâm về diễn xuất\" trong suốt thời thơ ấu của cô. Cô thực hiện trong một số vở diễn nghiệp dư của địa phương, trong đó có After Juliet (được viết bởi mẹ của cô) và United States (được viết bởi cô sau vở kịch giáo viên, Ian McShane, không liên quan đến diễn viên Deadwood).",
    "aliases": [
      "keira knightley"
    ],
    "featured": false,
    "gender": 1,
    "tags": [
      "Chính kịch",
      "Tình cảm",
      "Hollywood"
    ]
  },
  {
    "slug": "ken-watanabe",
    "name": "Ken Watanabe",
    "englishName": "Ken Watanabe",
    "country": "Nhật Bản 🇯🇵",
    "countryCode": "jp",
    "gender": 2,
    "tags": [
      "Hành động",
      "Chính kịch",
      "Hollywood"
    ],
    "roles": "Võ Sĩ Đạo Cuối Cùng • Inception",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/psAXOYp9SBOXvg6AXzARDedNQ9P.jpg",
    "tmdbPersonId": 3899,
    "birthday": "1959-10-21",
    "placeOfBirth": "Koide, Niigata, Japan",
    "bio": "Ken Watanabe (渡辺 謙, Watanabe Ken; born October 21, 1959) is a Japanese actor. He is best known for playing tragic hero characters, such as General Tadamichi Kuribayashi in Letters from Iwo Jima and Lord Katsumoto Moritsugu in The Last Samurai, for which he was nominated for the Academy Award for Best Supporting Actor. Among other awards, Watanabe has won the Japan Academy Film Prize for Best Actor twice, in 2007 for Memories of Tomorrow and in 2010 for The Unbroken. He is also known for his roles in Christopher Nolan's films Batman Begins and Inception, as well as Memoirs of a Geisha, and Pokémon Detective Pikachu.\nIn 2014, he starred in the reboot Godzilla as Dr. Ishiro Serizawa, a role he reprised in the sequel, Godzilla: King of the Monsters. He lent his voice to the fourth and fifth installments of the Transformers franchise respectively, Transformers: Age of Extinction and Transformers: The Last Knight, as Decepticon-turned-Autobot Drift. In 2022, he starred in the HBO Max crime drama series Tokyo Vice.\nHe made his Broadway debut in April 2015 in Lincoln Center Theater's revival production of The King and I in the title role. In 2015, Watanabe received his first Tony Award nomination for Best Performance by a Leading Actor in a Musical at the 69th Tony Awards for his role as The King. He is the first Japanese actor to be nominated in this category. Watanabe reprised his role at the London Palladium in June 2018, earning a Laurence Olivier Award nomination.\n\nEarly life:\n\nWatanabe was born on October 21, 1959, in the mountain village of Koide in Niigata Prefecture, Japan. His mother was a school teacher and his father taught calligraphy. Due to a number of relocations for his parents' work, he spent his childhood in the villages of Irihirose and Sumon, both now part of the city of Uonuma, and in Takada, now part of the city of Jōetsu. He attended Niigata Prefectural Koide High School, where he was a member of the concert band club, playing trumpet, which he had played since childhood.\nAfter graduation from high school, in 1978 he aimed to enter Musashino Academia Musicae, a conservatory in Tokyo. However, he had never received a formal musical education, and his father became seriously ill when he was in junior high school and was unable to work, which meant that his family could no longer afford to pay for his music lessons. Because of these problems, Watanabe was forced to give up his intention of entering the conservatory. He said of the decision: \"I had to give up my musical aspirations. I realised I had no talent as a musician. But I still wanted to find a way to be creative, so I decided to try acting\".\n\nCareer:\n\nJapanese roles:",
    "aliases": [
      "ken watanabe"
    ],
    "featured": true
  },
  {
    "slug": "hiroyuki-sanada",
    "name": "Hiroyuki Sanada",
    "englishName": "Hiroyuki Sanada",
    "country": "Nhật Bản 🇯🇵",
    "countryCode": "jp",
    "gender": 2,
    "tags": [
      "Võ thuật",
      "Hành động",
      "Hollywood"
    ],
    "roles": "Shōgun • John Wick 4 • Mortal Kombat",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/SOwDxhGnRccP2lAtssQ7TxCzOe.jpg",
    "tmdbPersonId": 9195,
    "birthday": "1960-10-12",
    "placeOfBirth": "Shinagawa, Tokyo, Japan",
    "bio": "Hiroyuki Sanada (Japanese: 真田 広之; né Shimozawa; born 12 October 1960) is a Japanese actor and martial artist. He has received numerous accolades, including a Golden Globe Award, two Primetime Emmy Awards, a British Academy Television Award, a Japan Academy Film Prize, two Hochi Film Awards, a Mainichi Film Award, three Blue Ribbon Awards for Best Actor, four Kinema Junpo Awards, and honors from the Yokohama Film Festival. In 2018, he received the Medal of Honor with Purple Ribbon from the Japanese government for his \"artistic developments, improvements, and accomplishments\", and in 2025, Time named him one of the 100 most influential people in the world.\nSanada began his career in the mid-1960s at the age of five, and was the protégé of actor Sonny Chiba. A black belt in Kyokushin karate, he initially gained prominence for his roles in Japanese and Hong Kong action films, later establishing himself as a dramatic actor. He is best known to international audiences for his roles as Ryuji Takayama in Ring (1998) where he played alongside Nanako Matsushima, who was also his co-star in a 1997 television drama A Story of Love. His role as the Fool in a production of the Shakespeare play King Lear (1999–2000) gave him theatrical attention, and led to his appointment as an Honorary Member of the Order of the British Empire in 2002. Beginning in the 2000s, Sanada grew his Hollywood presence with such roles as Seibei Iguchi in The Twilight Samurai (2002), Ujio in The Last Samurai (2003), and Kenji in Rush Hour 3 (2007).\nSanada's appearances in Hollywood films include Sunshine (2007), Speed Racer (2008), The Wolverine, 47 Ronin (both 2013), Minions (2015), Life (2017), Avengers: Endgame (2019), Army of the Dead (2021), as Hanzo Hasashi / Scorpion in Mortal Kombat (2021), Bullet Train (2022), and John Wick: Chapter 4 (2023). He also had roles on Lost (2010) and the HBO series Westworld (2018–2020). Sanada gained awards for his role in the FX historical drama series Shōgun (2024) as Yoshii Toranaga, a fictionalized version of Tokugawa Ieyasu.\n\nLife and career:\n\n1966–1978: Child actor:",
    "aliases": [
      "hiroyuki sanada"
    ],
    "featured": true
  },
  {
    "slug": "takuya-kimura",
    "name": "Takuya Kimura",
    "englishName": "Takuya Kimura",
    "country": "Nhật Bản 🇯🇵",
    "countryCode": "jp",
    "roles": "Thiên vương truyền hình Nhật Bản",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/sswCg8kvFsgSaVJwcIKKe4K7jOe.jpg",
    "tmdbPersonId": 12670,
    "birthday": "1972-11-13",
    "placeOfBirth": "Chiba, Chiba, Japan",
    "bio": "Takuya Kimura (Japanese: 木村 拓哉, Hepburn: Kimura Takuya; born November 13, 1972) is a Japanese actor, singer, and radio personality. He is regarded as a Japanese icon after achieving success as an actor. He was also a popular member of SMAP, one of the best-selling boy bands in Asia. In the media, he is known as a huge heartthrob in Japan, and a sex symbol, having been voted Japan's sexiest man for 15 years in a row by readers of one magazine.\nA 1996 television drama series, Long Vacation, in which he landed his first lead role, became a massive success, creating a phrase called the \"Lon-bake phenomenon\". He was given the title, \"The King of Ratings\", as his subsequent television series continued to generate high ratings and each show became a social phenomenon as it aired. Five of his most successful television series, Hero (2001), Beautiful Life (2000), Love Generation (1997), Good Luck!! (2003), and Long Vacation (1996) are ranked in the top ten highest-rated television series in Japanese history. He has received the Best Actor award at the Television Drama Academy Awards 11 times and holds the record for most wins. He also starred in blockbuster films, including Love and Honor (2006), Hero (2007) and Howl's Moving Castle (as a voice actor, 2004).\nKimura is also known for his work in the video games Judgment and Lost Judgment, portraying Takayuki Yagami.\n\nCareer:\n\nMusic:\n\nIn 1987, at age 15, Kimura auditioned to enter Johnny & Associates, a talent agency that recruits and trains young boys to become singers and members of boy bands. In Autumn 1987, twenty young boys, including Kimura, were put together into a group called The Skate Boys, which was initially created as backup dancers for a famous boy band, Hikaru Genji. In April 1988, producer Johnny Kitagawa chose six out of the twenty boys to create a new boy band; \"SMAP.\"\nThe group became one of the most successful boy bands in Asia and are regarded as an iconic group in Japan with 24 top-10 albums and 14 number-one albums. SMAP officially disbanded on December 31, 2016.\n\nSolo activities:",
    "aliases": [
      "takuya kimura",
      "kimutaku"
    ],
    "featured": true,
    "gender": 2,
    "tags": [
      "Chính kịch",
      "Hành động",
      "Tình cảm"
    ]
  },
  {
    "slug": "hayao-miyazaki",
    "name": "Hayao Miyazaki",
    "englishName": "Hayao Miyazaki",
    "country": "Nhật Bản 🇯🇵",
    "countryCode": "jp",
    "roles": "Huyền thoại hoạt hình Studio Ghibli • Oscar",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/ouhjt9KugzhWtdEyBPipihB3ic8.jpg",
    "tmdbPersonId": 608,
    "birthday": "1941-01-05",
    "placeOfBirth": "Tokyo, Japan",
    "bio": "Hayao Miyazaki (宮崎 駿 or 宮﨑 駿, Miyazaki Hayao; [mijaꜜzaki hajao]; born January 5, 1941) is a Japanese animator, filmmaker, and manga artist. He co-founded Studio Ghibli and serves as its honorary chairman. Throughout his career, Miyazaki has attained international acclaim as a masterful storyteller and creator of Japanese animated feature films, and is widely regarded as one of the greatest and most accomplished filmmakers in the history of animation.\nBorn in Tokyo City, Miyazaki expressed interest in manga and animation from an early age. He joined Toei Animation in 1963, working as an inbetween artist and key animator on films like Gulliver's Travels Beyond the Moon (1965), The Great Adventure of Horus, Prince of the Sun (1968), and Animal Treasure Island (1971), before moving to A-Pro in 1971, where he co-directed Lupin the Third Part I (1971–1972) with Isao Takahata. After moving to Zuiyō Eizō (later Nippon Animation) in 1973, Miyazaki worked as an animator on World Masterpiece Theater and directed the television series Future Boy Conan (1978). He joined Tokyo Movie Shinsha in 1979 to direct his first feature film, The Castle of Cagliostro (1979), and the television series Sherlock Hound (1984–1985). He wrote and illustrated the manga Nausicaä of the Valley of the Wind (1982–1994) and directed the 1984 film adaptation produced by Topcraft.\nMiyazaki co-founded Studio Ghibli in 1985, writing and directing films such as Laputa: Castle in the Sky (1986), My Neighbor Totoro (1988), Kiki's Delivery Service (1989), and Porco Rosso (1992), which were met with critical and commercial success in Japan. Miyazaki's Princess Mononoke (1997) was the first animated film to win the Japan Academy Film Prize for Picture of the Year and briefly became the highest-grossing film in Japan; its Western distribution increased Ghibli's worldwide popularity and influence. Spirited Away (2001) became Japan's highest-grossing film and won the Academy Award for Best Animated Feature; it is frequently ranked among the greatest films of the 21st century. Miyazaki's later films—Howl's Moving Castle (2004), Ponyo (2008), and The Wind Rises (2013)—also enjoyed critical and commercial success. He retired from feature films in 2013 but later returned to make The Boy and the Heron (2023), which won the Academy Award for Best Animated Feature.\nMiyazaki's works are frequently subject to scholarly analysis and have been characterized by the recurrence of themes such as humanity's relationship with nature and technology, the importance of art and craftsmanship, and the difficulty of maintaining a pacifist ethic in a violent world. His protagonists are often strong girls or young women, and several of his films present morally ambiguous antagonists with redeeming qualities.",
    "aliases": [
      "hayao miyazaki",
      "ghibli"
    ],
    "featured": true,
    "gender": 2,
    "tags": [
      "Anime",
      "Chính kịch"
    ]
  },
  {
    "slug": "makoto-shinkai",
    "name": "Makoto Shinkai",
    "englishName": "Makoto Shinkai",
    "country": "Nhật Bản 🇯🇵",
    "countryCode": "jp",
    "roles": "Đạo diễn Your Name • Suzume • Weathering With You",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/z8TN4Nkmhem6XqcnH2jMn5Ayf97.jpg",
    "tmdbPersonId": 74091,
    "birthday": "1973-02-09",
    "placeOfBirth": "Koumi, Nagano, Japan",
    "bio": "Makoto Niitsu (新津 誠, Niitsu Makoto; born February 9, 1973), known as\nMakoto Shinkai (新海 誠, Shinkai Makoto), is a Japanese filmmaker and novelist. A founder of CoMix Wave Films, he is known for his anime feature films enriched with visually-appealing animation and romantic stories depicting teenagers and high school students.\nShinkai began his career as a video game animator with Nihon Falcom in 1996, and gained recognition as a filmmaker with the release of the original video animation (OVA) She and Her Cat (1999). Shinkai then released the science fiction OVA Voices of a Distant Star in 2002 as his first feature with CoMix Wave, followed by his debut feature film The Place Promised in Our Early Days (2004).\nShinkai's films have consistently received highly positive reviews from both critics and audiences, and he is considered to be one of Japan's most commercially successful filmmakers. His three most recent films Your Name (2016), Weathering with You (2019), and Suzume (2022), collectively known as \"Disaster trilogy\", are all among the highest-grossing Japanese films of all time, both in Japan and worldwide at the time of their release.\n\nEarly life:\n\nMakoto Shinkai was born in Koumi, Nagano. His family runs a construction company. Shinkai studied Japanese literature at Chuo University, where he was a member of the juvenile literature club and drew picture books. Shinkai traces his passion for creation to the manga, anime and novels he was exposed to in middle school.\n\nCareer:\n\n1996–2000: Early career:\n\nAfter graduating from Chuo University Faculty of Literature in March 1996, Shinkai got a job at Nihon Falcom, a video game company. He worked there for 5 years, making video clips for games and graphic design, including web content. During this time Shinkai met musician Tenmon, who later scored many of his movies.\nIn 1999, Shinkai released She and Her Cat, a five-minute short piece done in monochrome. It won several awards, including the grand prize at the 12th DoGA CG Animation Contest (2000). The short details the life of a cat, entirely from the cat's perspective, as it passes time with its owner, a young woman.\n\n2000–2016: Rise:",
    "aliases": [
      "makoto shinkai"
    ],
    "featured": true,
    "gender": 2,
    "tags": [
      "Anime",
      "Tình cảm",
      "Chính kịch"
    ]
  },
  {
    "slug": "koji-yakusho",
    "name": "Koji Yakusho",
    "englishName": "Koji Yakusho",
    "country": "Nhật Bản 🇯🇵",
    "countryCode": "jp",
    "roles": "Ảnh đế Cannes (Perfect Days) • Memoirs of a Geisha",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/r2WyVRyl6EJgyPKUJCB7D9cKYPE.jpg",
    "tmdbPersonId": 18056,
    "birthday": "1956-01-01",
    "placeOfBirth": "Isahaya, Japan",
    "bio": "Kōji Hashimoto (橋本 広司, Hashimoto Kōji; born 1 January 1956), known professionally as Kōji Yakusho (役所 広司, Yakusho Kōji), is a Japanese actor. He is known internationally for his starring roles in Shall We Dance? (1996), Cure (1997), 13 Assassins (2010), The Third Murder (2017), The Blood of Wolves (2018), Under the Open Sky (2020) and The Days (2023). For his performance in Perfect Days (2023), he was awarded the Best Actor award at the 76th Cannes Film Festival.\n\nEarly life and education:\n\nYakusho was born in Isahaya, Nagasaki, the youngest of five brothers. After graduation from Nagasaki Prefectural High School of Technology in 1974, he worked at the Chiyoda municipal ward office, or kuyakusho, in Tokyo, from which he later took his stage name.\n\nCareer:\n\nIn 1976, he saw a production of Maxim Gorky's The Lower Depths (Played by Tatsuya Nakadai) and was inspired, first to watch, and then later to take part in, as many plays as possible.\nIn the spring of 1978 he auditioned for Tatsuya Nakadai's the Mumeijuku (Studio for Unknown Performers) acting studio, and was one of four chosen out of 800 applicants.\nIn 1983, he landed the role of Oda Nobunaga in the year-long NHK drama Tokugawa Ieyasu and was catapulted to fame. He also appeared in a TV version of Miyamoto Musashi from 1984 to 1985. For several years, he played Kuji Shinnosuke (or \"Sengoku\"), one of the title characters in the jidaigeki Sanbiki ga Kiru!. He played a major character in Juzo Itami's 1986 Tampopo.\nIn 1988, he was given a special award for work in cinema by the Japanese Minister of Education, Science, Sports and Culture and continued to appear in films and in a number of TV shows through the '90s.\nIn 1996 and 1997, Yakusho enjoyed several major successes. The Eel, directed by Shohei Imamura, in which he played the eel-loving lead, won the Palme d'Or at the 1997 Cannes Film Festival. Lawrence Van Gelder in the New York Times called his performance \"unerring.\" Lost Paradise, about a double-suicide, was second only to Princess Mononoke at the Japanese box office.\n\nInternational breakthrough: Shall We Dance?:\n\nShall We Dance? was such a major hit in Japan that it inspired a domestic dance craze. Ballroom groups and dance schools multiplied in the country after the film's release, and people who previously would never admit to taking lessons announced that they did with pride. Director Masayuki Suo said of his lead, who until that point was known mostly for playing good-looking samurai, \"we thought he could play this overworked, tired Japanese businessman, and he did.... He pulled everything off and took his dance training so seriously.\"\nThe film also was one of Japan's highest-grossing movies outside the country. It earned $9.5 million in the US and inspired a remake starring Jennifer Lopez and Richard Gere, with Gere playing Yakusho's role.",
    "aliases": [
      "koji yakusho"
    ],
    "featured": false,
    "gender": 2,
    "tags": [
      "Chính kịch",
      "Tội phạm"
    ]
  },
  {
    "slug": "tony-jaa",
    "name": "Tony Jaa",
    "englishName": "Tony Jaa",
    "country": "Thái Lan 🇹🇭",
    "countryCode": "th",
    "gender": 2,
    "tags": [
      "Võ thuật",
      "Hành động",
      "Hollywood"
    ],
    "roles": "Vua Muay Thái • Ong Bak • Fast & Furious 7",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/wsGEaIscm7y0nvJK39rR6SnkuLr.jpg",
    "tmdbPersonId": 57207,
    "birthday": "1976-02-05",
    "placeOfBirth": "Surin, Thailand",
    "bio": "Tatchakorn Yeerum (tiếng Thái: ทัชชกร ยีรัมย์) hay Tony Jaa, Jaa Panom (tên cũ: Panom Yeerum – พนม ยีรัมย์ [pʰanom jiːram]; sinh ngày 5 tháng 2 năm 1976) là một diễn viên, võ sĩ, chuyên viên giáo dục thể chất, chỉ đạo hành động, diễn viên đóng thế, giám đốc, và tu sĩ Phật giáo người Thái Lan. Anh là người Thái gốc Khmer sinh ra ở tỉnh Surin, Isan, Thái Lan. Một số bộ phim mà anh đã tham gia có thể kể đến như: Ong-Bak: Muay Thai Warrior, Tom-Yum-Goong (cũng gọi là Warrior King hay The Protector) Ong-Bak 2, Ong-Bak 3, Fast & Furious 7 và xXx: Return of Xander Cage.\n\nTiểu sử:\n\nTony Jaa lớn lên ở một khu vực nông thôn, cách 200 km với thủ đô Bangkok. Anh đã xem các phim của Lý Tiểu Long, Thành Long, Tim Hannibal, Vince Lam và Lý Liên Kiệt tại hội chợ, đền thờ, là nguồn cảm hứng để anh tìm hiểu võ thuật. Anh lấy cảm hứng từ họ trong khi anh đang làm công việc hoặc chơi với bạn bè, anh bắt chước các đòn võ đã nhìn thấy, thực hành trên cánh đồng lúa của bố mình.\nBố của Jaa là một võ sĩ Bokator môn võ được gìn giữ lâu đời của người Khmer, ông đã truyền dạy võ thuật cho anh khi anh mới 10 tuổi. Môn võ truyền thống này đối với anh là cả cuộc sống, đến nỗi anh đã từng dọa sẽ tự tử nếu bố anh không đưa anh đến Khon Kaen để bái võ sư Panna Rittikrai làm sư phụ. Khi anh 15 tuổi, Panna trở thành sư phụ của anh.\nKhi Jaa 21 tuổi, sư phụ Panna khuyên anh theo học võ thuật ở Đại học Mahamarakam, nổi tiếng với những môn võ phổ biến nhất thế giới. Đây là nơi mà Jaa làm quen với những môn võ Judo, Aikido, Taekwondo.\nJaa bắt đầu sự nghiệp điện ảnh với vai trò diễn viên đóng thế các pha mạo hiểm trong nhóm của Panna, có tên Muay Thai Stunt. Anh đã tham gia rất nhiều bộ phim hành động dưới sự dẫn dắt của sư phụ Panna.\nSau khi theo học môn võ cổ truyền Bokator, tiền thân của môn võ Muay Thái ngày nay, Panna và Jaa cùng nhau thực hiện một bộ phim ngắn về môn võ này với sự giúp đỡ của Đại sư phụ Mark Harris. Phim ngắn này đã gây ấn tượng mạnh với đạo diễn, nhà sản xuất nổi tiếng Prachya Pinkaew.\nĐây là tiền đề để Jaa đóng chính trong bộ phim Ong-Bak: Muay Thai Warrior (2003). Vai diễn trong phim đánh dấu bước đột phá trong sự nghiệp diễn viên của anh. Trong phim anh vào vai Ting, chàng thanh niên có sứ mệnh truy tìm đầu tượng Phật của ngôi làng (được gọi là Ong-Bak). Cuộc phiêu lưu lên thủ đô Bangkok khiến anh phải đối mặt với nhiều khó khăn thử thách trong thế giới tội phạm nơi đây. Với những cảnh hành động trong phim, anh đã tự thực hiện các cảnh mạo hiểm mà không cần sự trợ giúp của máy móc hay kỹ xảo nào. Bộ phim khiến nhiều lần anh bị chấn thương nặng. Đây cũng là một trong những tác phẩm thành công nhất của điện ảnh Thái Lan tính đến thời điểm hiện tại.\nSau thành công của bộ phim Ong-Bak: Muay Thai Warrior, Jaa tiếp tục được mời đóng vai chính trong bộ phim bom tấn Tom-Yum-Goong, ra rạp vào tháng 8 năm 2005 (tựa Mỹ là The Protector). Đây là bộ phim hành động lấy môn quyền Thái làm nền tảng. Tom-Yum-Goong là bộ phim Thái Lan thu về nhiều lợi nhuận nhất tại Bắc Mỹ.",
    "aliases": [
      "tony jaa",
      "ong bak"
    ],
    "featured": true
  },
  {
    "slug": "mario-maurer",
    "name": "Mario Maurer",
    "englishName": "Mario Maurer",
    "country": "Thái Lan 🇹🇭",
    "countryCode": "th",
    "gender": 2,
    "tags": [
      "Hài",
      "Tình cảm",
      "Kinh dị"
    ],
    "roles": "Tình Người Duyên Ma (Pee Mak)",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/wbBpsHWCgey3VsWw0GAAWrsYxc0.jpg",
    "tmdbPersonId": 226564,
    "birthday": "1988-12-04",
    "placeOfBirth": "Bangkok, Thailand",
    "bio": "Mario Maurer (tiếng Thái: มาริโอ้ เมาเร่อ; phát âm tiếng Thái: [māːrīʔôː māw.rɤ̂ː]; phát âm tiếng Đức: [ˈmaːʁio ˈmaʊ̯ʁɐ], sinh ngày 4 tháng 12 năm 1988) là nam diễn viên và người mẫu Thái Lan, anh có cha là người Đức và mẹ là người Thái gốc Hoa.\nAnh trở nên nổi tiếng qua các vai chính trong phim The Love of Siam năm 2007 và cơn sốt First Love năm 2010. Maurer cũng là nam diễn viên chính trong bộ phim điện ảnh có doanh thu lớn nhất từ trước tới nay của Thái Lan là Pee Mak, đóng cặp với Davika Hoorne. Anh còn là thành viên trong nhóm có tên gọi 4+1 Channel 3 Superstar cùng với Nadech Kugimiya, Prin Suparat, Pakorn Chatborirak và Phupoom Pongpanu.\n\nTiểu sử và học vấn:\n\nMario Maurer được sinh ra tại Bệnh viện Cơ Đốc giáo Bangkok ở Băng Cốc, Thái Lan. Mario mang hai dòng máu Đức và Hoa. Cha anh chọn một cái tên Ý cho anh vì ông có niềm đam mê với các dòng xe môtô của Ý.\nKhi Mario lớn lên, cha mẹ anh đã là chủ sở hữu vài trạm xăng, sau đó thành lập công ty tại tỉnh Nakhon Nayok chuyên sản xuất và xuất khẩu sản phẩm lăn khử mùi đến các quốc gia như Đức và Pháp. Maurer còn có một anh trai hơn mình 4 tuổi, sinh ra tại Đức.\nMario theo học Trường Công giáo St. Dominic Savio ở Băng Cốc. Sau đó anh tốt nghiệp trường Đại học Ramkhamhaeng chuyên ngành Nghệ thuật truyền thông và tiếp tục theo học Thạc sĩ chuyên ngành Truyền thông chính trị tại trường Đại học Krirk.\n\nSự nghiệp:\n\nNăm 16 tuổi, Maurer trở thành một người mẫu trong các quảng cáo, hình ảnh, và video âm nhạc.\n\nNăm 2007, anh đóng phim điện ảnh lần đầu tiên với vai Tong trong phim Rak Hang Siam của đạo diễn Chukiat Sakweerakul. Quảng cáo phim không nhấn mạnh khía cạnh đồng tính của bộ phim, nhưng được các nhà phê bình đón nhận nồng nhiệt. Maurer đã được đề cử giải \"Nam diễn viên phụ xuất sắc nhất\" cho vai diễn này tại \"Giải Điện ảnh châu Á\" nhưng không đạt. Anh đoạt giải \"Nam diễn viên xuất sắc nhất\" tại \"Giải Điện ảnh Thái Starpics\" và cũng được đề cử tại \"Giải Hội đồng Nhà phê bình Bangkok\" và \"Giải Star Entertainment\".\nĐạo diễn Bhandit Rittakol cũng đã mời anh đóng trong phim Boonchu 9, nhưng anh từ chối vì bận tham gia những hoạt động khác.\nnăm 2008, anh tham gia bộ phim Friendship của đạo diễn Chatchai Naksuriya. Trong phim, anh vào vai một học sinh lớp 12 vào năm 1983, đóng cặp với Apinya Sakuljaroensuk. Sau đó, anh tham gia bộ phim Roommate của đạo diễn Piti Jaturapat, được chuyển thể từ phim Mỹ năm 1994 tên là Threesome của Andrew Fleming.\nSong song với sự thành công ở lĩnh vực điện ảnh, năm 2011 Mario ký hợp đồng độc quyền với đài Channel 3, sau đó anh góp mặt trong nhiều tác phẩm truyền hình ăn khách và gặt hái nhiều giải thưởng.\nNăm 2016, anh trở thành CEO cho thương hiệu của mình là 8Deuce8 phổ biến rộng rãi tại Thái Lan và Trung Quốc.\nNăm 2019, bộ phim Thầy lang trúng mánh do Mario đóng chính cùng với Kimberly Ann Voltemas trở thành bộ phim truyền hình Thái Lan đầu tiên có mặt trên Netflix.",
    "aliases": [
      "mario maurer",
      "pee mak"
    ],
    "featured": true
  },
  {
    "slug": "baifern-pimchanok",
    "name": "Baifern Pimchanok",
    "englishName": "Pimchanok Luevisadpaibul",
    "country": "Thái Lan 🇹🇭",
    "countryCode": "th",
    "gender": 1,
    "tags": [
      "Tình cảm",
      "Chính kịch",
      "Hài"
    ],
    "roles": "Chiếc Lá Bay • Friend Zone",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/1dAa0G7gG3KbeF66HOof4DPXrpX.jpg",
    "tmdbPersonId": 127449,
    "birthday": "1992-09-30",
    "placeOfBirth": "Bangkok, Thailand",
    "bio": "Pimchanok Luevisadpaibul (tiếng Thái: พิมพ์ชนก ลือวิเศษไพบูลย์, sinh ngày 30 tháng 9 năm 1992), thường được biết đến với nghệ danh Baifern (ใบเฟิร์น), là một nữ diễn viên kiêm người mẫu người Thái gốc Hoa.\nCô nổi tiếng qua vai diễn Nam khi đóng cặp với nam diễn viên Mario Maurer trong bộ phim First Love. Bên cạnh đó, cô còn tham gia diễn xuất trong các bộ phim điện ảnh gồm Love Summer, Suddenly It's Magic, Cat A Wabb, Friend Zone, cùng các vai diễn trong những bộ phim truyền hình Lhong Fai và Chiếc lá cuốn bay. Cô tốt nghiệp trường Đại học Srinakharinwirot vào năm 2015.\n\nTiểu sử:\n\nBaifern sinh ngày 30 tháng 9 năm 1992 tại bệnh viện Vajira, Băng Cốc, Thái Lan. Cô là con cả trong một gia đình người Triều Châu. Họ của cô, Luevisadpaibul, bắt nguồn từ họ Lữ (呂)  trong tiếng Trung Quốc. Cha của cô làm kinh doanh xuất khẩu, mẹ là một nhân viên xã hội. Cô có một em trai. Khi còn nhỏ, cô học thể dục nhịp điệu và từng nhiều lần tranh huy chương đồng đội. Khi Baifern học lớp 6, cô được phát hiện bởi một đội  tìm kiếm diễn viên nhí tại sân tập. Vì vậy, cô đã quay quảng cáo cho một nhãn hiệu giày học sinh và bắt đầu bước chân vào làng giải trí lần đầu tiên.\nBaifern hoàn thành chương trình giáo dục tiểu học tại Trường Meen Prasat Wittaya và Trường Thep Aksorn. Tốt nghiệp trung học tại trường Nawaminthrachinuthit và trường dự bị Nomklao, cô sau đó nhận bằng cử nhân Khoa Mỹ thuật và Ứng dụng Biểu diễn tại Đại học Srinakharinwirot.\n\nSự nghiệp:\n\nNăm 2009, Baifern tham gia bộ phim đầu tiên là \"Ha Hua Chai Hiro\", chính thức tiến vào showbiz và ký hợp đồng với Channel 7 (Thái Lan). Năm 2010, cô vào vai nữ chính Nam trong tác phẩm điện ảnh First Love (phim Thái 2010) và trở nên nổi tiếng ở thời điểm đó. Cũng trong năm này, cô đã giành được giải Best Rising Actress (Film) tại lễ trao giải Top lần thứ 11 cho bộ phim này. Năm 2016, đài CH7 của Thái Lan đã đưa ra thông báo rằng hợp đồng giữa cô và đài sẽ hết hạn vào tháng 5. Sau 6 năm đầu quân cho CH7 và không đạt được thành công như mong đợi, Baifern Pimchanok quyết định không gia hạn hợp đồng, kết thúc hợp đồng với công ty vào năm 2016 và chính thức trở thành nghệ sĩ tự do.\nNăm 2017, Baifern đã trở lại đầy ngoạn mục với vai diễn Kankaew trong dự án truyền hình Lhong Fai 2017 của Đài One 31, vai diễn giúp cô gây ấn tượng mạnh trong lòng khán giả. Ở giai đoạn này, Baifern cũng được biết đến qua loạt các tác phẩm như: Slam Dance, Cưa đổ nàng ác ma, Beauty Boy...\nĐến tháng 3 năm 2019, Baifern Pimchanok với vai nữ chính trong Friend zone - Yêu nhầm bạn thân đã gây sốt màn ảnh rộng Thái Lan với doanh thu hơn 210 triệu baht (153 tỷ đồng). Chưa dừng lại, bộ phim như một \"hiện tượng\" ở các quốc gia thuộc khu vực Đông Nam Á. Tại thị trường Việt Nam, tác phẩm cũng nhanh chóng phá đảo phòng vé với doanh thu hơn 53 tỷ đồng, vượt mặt Thiên tài bất hảo - trở thành phim Thái có doanh thu cao nhất mọi thời đại tại phòng vé Việt Nam.",
    "aliases": [
      "baifern pimchanok",
      "baifern",
      "pimchanok luevisadpaibul"
    ],
    "featured": true
  },
  {
    "slug": "shah-rukh-khan",
    "name": "Shah Rukh Khan",
    "englishName": "Shah Rukh Khan",
    "country": "Ấn Độ 🇮🇳",
    "countryCode": "in",
    "gender": 2,
    "tags": [
      "Bollywood",
      "Tình cảm",
      "Hành động"
    ],
    "roles": "King Khan • Vua của Bollywood",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/gc3Ul6EtVYKgjBuYAaD8U2qIcSl.jpg",
    "tmdbPersonId": 35742,
    "birthday": "1965-11-02",
    "placeOfBirth": "New Delhi, Delhi, India",
    "bio": "Shah Rukh Khan, gọi tắt là SRK (tên khai sinh; Shahrukh Khan; sinh ngày 2 tháng 11 năm 1965), là diễn viên, nhà sản xuất và nhân vật truyền hình Ấn Độ. Được biết đến trên các phương tiện truyền thông như là \"Baadshah của Bollywood\", \"Vua của Bollywood\" hay \"Vua Khan\", Khan đã diễn xuất trong hơn 80 bộ phim tiếng Hindi.\n\nChú thích:",
    "aliases": [
      "shah rukh khan",
      "srk",
      "shahrukh khan"
    ],
    "featured": true
  },
  {
    "slug": "aamir-khan",
    "name": "Aamir Khan",
    "englishName": "Aamir Khan",
    "country": "Ấn Độ 🇮🇳",
    "countryCode": "in",
    "gender": 2,
    "tags": [
      "Bollywood",
      "Hài",
      "Chính kịch"
    ],
    "roles": "3 Chàng Ngốc (3 Idiots) • Dangal",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/6uiZSwi2kvd1jZ7X7Xz9W9VGuV4.jpg",
    "tmdbPersonId": 52763,
    "birthday": "1965-03-14",
    "placeOfBirth": "Mumbai, Maharashtra, India",
    "bio": "Aamir Khan (tiếng Hindi: आमिर खान, sinh ngày 14 tháng 3 năm 1965) là một nam diễn viên kiêm nhà làm phim người Ấn Độ. Ông được đánh giá là người tiên phong và là một trong những diễn viên hàng đầu của điện ảnh Bollywood.\nNgoài ra, ông còn là Đại sứ thiện chí UNICEF tại khu vực Nam Á cùng với Sachin Tendulkar.\n\nCác phim đã đóng:",
    "aliases": [
      "aamir khan",
      "3 idiots"
    ],
    "featured": true
  },
  {
    "slug": "salman-khan",
    "name": "Salman Khan",
    "englishName": "Salman Khan",
    "country": "Ấn Độ 🇮🇳",
    "countryCode": "in",
    "gender": 2,
    "tags": [
      "Bollywood",
      "Hành động",
      "Chính kịch"
    ],
    "roles": "Siêu sao hành động Bollywood • Tiger",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/gxKwCCcs777HzsXRpdGsBV87pXn.jpg",
    "tmdbPersonId": 42802,
    "birthday": "1965-12-27",
    "placeOfBirth": "Indore, Madhya Pradesh, India",
    "bio": "Salman Khan (phát âm: [səlma ː n xa ː n]; tên đầy đủ Abdul Rashid Salim Salman Khan sinh ngày 27 tháng 12 năm 1965), là diễn viên Ấn Độ, đóng trong hơn 80 bộ phim tiếng Hindi.\nCác phim tiêu biểu: Maine Pyar Kiya (1989), Saajan (1991), Hum Aapke Hain Koun..! (1994), Karan Arjun (1995), Judwaa (1997), Pyar Kiya To Darna Kya (1998), Biwi No.1 (1999), Kuch Kuch Hota Hai (1998), Hum Dil De Chuke Sanam (1999), Tere Naam (2003), Mujhse Shaadi Karogi (2004), No Entry (2005), Partner (2007), Wanted (2009), Dabangg (2010), Ready (2011) và Bodyguard (2011),...\n\nCác phim đã đóng:\n\nChú thích:",
    "aliases": [
      "salman khan"
    ],
    "featured": true
  },
  {
    "slug": "deepika-padukone",
    "name": "Deepika Padukone",
    "englishName": "Deepika Padukone",
    "country": "Ấn Độ 🇮🇳",
    "countryCode": "in",
    "gender": 1,
    "tags": [
      "Bollywood",
      "Chính kịch",
      "Hành động"
    ],
    "roles": "Nữ hoàng phòng vé Bollywood • Padmaavat",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/rzvvBQ0r6oiqDdzcsdTRB7jN4Rx.jpg",
    "tmdbPersonId": 53975,
    "birthday": "1986-01-05",
    "placeOfBirth": "Copenhagen, Denmark",
    "bio": "Deepika Padukone (sinh ngày 5 tháng 1 năm 1986) là một nữ diễn viên người Ấn Độ hoạt động chủ yếu tại ngành điện ảnh Bollywood. Là một trong những nữ diễn viên được trả cát-xê cao nhất Ấn Độ, Deepika đã giành được vô số giải thưởng cao quý, trong đó có ba giải Filmfare Awards. Cô có trong danh sách những nhân vật nổi tiếng nhất của quốc gia.\nDeepika Padukone là con gái của tay chơi cầu lông Prakash Padukone, sinh ra tại Copenhagen và lớn lên ở Bangalore. Ở độ tuổi thiếu niên, cô chơi cầu lông trong những trận vô địch quốc gia, nhưng sớm rời sự nghiệp thể thao và chuyển sang làm người mẫu.Cô sớm nhậm được đề cử cho vai diễn với tư cách diễn viên chính trong bộ phim bằng tiếng Kannada Aishwarya năm 2006. Vào năm 2007,Deepika đóng hai vai trong bộ phim Bollywood đầu tiên của cô, Om Shanti Om và giành được giải Filmfare cho nữ diễn viên xuất sắc nhất. Deepika nhận được khá nhiều lời khen ngợi từ những vai chính của cô trong Love Aaj Kal (2009) và Lafangey Parindey (2010), nhưng trái lại, những vai diễn của cô trong bộ phim hài Housefull (2010) và phim lãng mạn Bachna Ae Haseeno (2008) lại gặp phải nhiều nhận xét tiêu cực.\nBộ phim hài lãng mạn Cocktail (2012) đánh dấu bước ngoặt trong sự nghiệp của Deepika, nhận được lời khen ngợi và đề cử cho Nữ diễn viên xuất sắc nhất tại một số buổi lễ trao giải. Cô đã chứng tỏ bản thân trong phim hài lãng mạn Yeh Jawaani Hai Deewani (2013), Chennai Express (2013),Happy New Year (2014) và các bộ phim chính kịch lịch sử của Sanjay Leela Bhansali như Bajirao Mastani và Padmaavat (2018), tất cả đều được xếp hạng trong Danh sách những bộ phim Ấn Độ có thu nhập cao nhất mọi thời đại. Nhân vật Leela của Deepika Padukone dựa theo câu chuyện về nàng Juliet trong Goliyon Ki Rasleele Ram-Leela của Bhansali và vai diễn Piku, một cô kến trúc sư cứng đầu trong bộ phim cùng tên năm 2015.\n\nCác phim đã đóng:",
    "aliases": [
      "deepika padukone"
    ],
    "featured": true
  },
  {
    "slug": "priyanka-chopra",
    "name": "Priyanka Chopra",
    "englishName": "Priyanka Chopra",
    "country": "Ấn Độ 🇮🇳",
    "countryCode": "in",
    "gender": 1,
    "tags": [
      "Bollywood",
      "Hollywood",
      "Hành động"
    ],
    "roles": "Hoa hậu Thế giới • Ngôi sao quốc tế",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/hh48u9scic0nITGtzi9b6rJeAtT.jpg",
    "tmdbPersonId": 77234,
    "birthday": "1982-07-18",
    "placeOfBirth": "Jamshedpur, Jharkand, India",
    "bio": "Priyanka Chopra (phát âm [prɪˈjaːŋkaː ˈtʃoːpɽaː]; sinh ngày 18 tháng 7 năm 1982), còn được biết đến với nghệ danh Priyanka Chopra Jonas, là một nữ diễn viên người Ấn Độ. Là một trong những nữ diễn viên được trả lương cao nhất và nổi tiếng nhất Ấn Độ và từng là thí sinh đăng quang Hoa hậu Thế giới 2000, Chopra đã nhận được nhiều giải thưởng, bao gồm giải thưởng Phim ảnh Quốc gia và năm giải Filmfare. Năm 2016, Chính phủ Ấn Độ vinh danh cô với giải Padma Shri, giải thưởng dân sự cao thứ tư và tạp chí Time ghi tên cô là một trong 100 người có ảnh hưởng nhất thế giới.\nMặc dù Chopra ban đầu mong muốn học tập ngành kỹ thuật hàng không vũ trụ, cô đã chấp nhận lời mời gia nhập ngành công nghiệp điện ảnh Ấn Độ, là kết quả sau khi cô chiến thắng tại cuộc thi sắc đẹp, bộ phim Bollywood đầu tiên cô đóng là The Hero (2003). Cô đóng vai nữ chính trong bộ phim đạt doanh thu lớn Andaaz (2003) và Mujhse Shaadi Karogi (2004), và đã được ca ngợi vì vai diễn đột phá của cô trong phim giật gân ly kỳ Aitraaz năm 2004. Năm 2006, Chopra đã tự khẳng định cô là nữ diễn viên hàng đầu điện ảnh Ấn Độ với vai diễn trong các phim có doanh thu cao nhất là Krrish và Don.\nSau một giai đoạn thất bại ngắn ngủi, cô nhận được lời khen ngợi khi đóng vai một người mẫu gặp khó khăn trong phim chính kịch Fashion (2008), đưa cô chiến thắng giải Filmfare và Giải thưởng Phim ảnh Quốc gia dành cho nữ chính xuất sắc nhất. Chopra về sau giành được sự tán dương sâu rộng khi hóa thân vào một loạt nhân vật trong các phim Kaminey (2009), 7 Khoon Maaf (2011), Barfi! (2012), Mary Kom (2014), Dil Dhadakne Do (2015) và Bajirao Mastani (2015), tất cả đều nhận được nhiều giải thưởng và đề cử. Vào năm 2015, cô bắt đầu đóng vai Alex Parrish trong chuỗi phim giật gân ly kỳ Quantico của hãng phim ABC, trở thành người Nam Á đầu tiên đóng vai chính trong hệ thống phim truyền hình Mỹ.\nNgoài sự nghiệp diễn xuất, Chopra được ghi nhận cho công việc từ thiện. Cô đã cộng tác với UNICEF trong 10 năm qua và được bổ nhiệm làm Đại sứ thiện chí của UNICEF về Quyền trẻ em trong năm 2010 và 2016. Cô thúc đẩy các căn nguyên đa dạng như môi trường, sức khoẻ và giáo dục và quyền phụ nữ và đặc biệt nói về bình đẳng giới và nữ quyền. Cuộc sống ngoài màn ảnh của Chopra là chủ đề của phương tiện truyền thông đáng kể. Là một nghệ sĩ thu âm, cô đã phát hành ba đĩa đơn. Cô cũng là người sáng lập ra công ty sản xuất Purple Pebble Pictures, phát hành phim hài chính kịch Ventilator (2016) bằng tiếng Marathi.\n\nTiểu sử:\n\nPriyanka Chopra sinh ngày 18 tháng 7 năm 1982 tại Jamshedpur, Jharkhand, Ấn Độ. Cha mẹ của cô đều là bác sĩ. Cô còn có một em trai.\n\nCác cuộc thi sắc đẹp:\n\nPriyanka đoạt danh hiệu á hậu 1 tại hoa hậu Ấn Độ. Theo đó, cô đã lên đường tham dự cuộc thi Hoa hậu Thế giới năm 2000 được tổ chức tại Luân Đôn.\nTại cuộc thi Hoa hậu Thế giới, cô đã xuất sắc vượt qua 94 thí sinh khác để đăng quang danh hiệu Hoa hậu Thế giới 2000. Cô đã trở thành cô gái Ấn Độ thứ năm đoạt danh hiệu này và là hoa hậu Ấn Độ thứ hai liên tiếp giành danh hiệu Hoa hậu Thế giới (sau Yukta Mookhey năm 1999).",
    "aliases": [
      "priyanka chopra",
      "priyanka chopra jonas"
    ],
    "featured": true
  },
  {
    "slug": "akshay-kumar",
    "name": "Akshay Kumar",
    "englishName": "Akshay Kumar",
    "country": "Ấn Độ 🇮🇳",
    "countryCode": "in",
    "roles": "Ngôi sao võ thuật & hài kịch Ấn Độ",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/sR8nASRtTpiwXqkFHjG2jdRBZ7a.jpg",
    "tmdbPersonId": 35070,
    "birthday": "1967-09-09",
    "placeOfBirth": "New Delhi, India",
    "bio": "Akshay Kumar, tên chính thức Rajiv Hari Om Bhatia, sinh 9 tháng 9 năm 1967 là Diễn viên phim Ấn Độ, nhà sản xuất và võ sĩ, đã xuất hiện trong hơn một trăm bộ phim Tiếng Hinđi. Kumar chủ yếu đóng vai chính trong bộ phim hành động, ngoài ra có các vai diễn phim truyền hình, lãng mạn và hài hước. Housefull 2 (năm 2012) và Rathore Rowdy (2012) là hai phim thành công mới nhất của Kumar.\n\nCác phim đã đóng:\n\nTruyền hình:",
    "aliases": [
      "akshay kumar"
    ],
    "featured": false,
    "gender": 2,
    "tags": [
      "Bollywood",
      "Hành động",
      "Hài"
    ]
  },
  {
    "slug": "hrithik-roshan",
    "name": "Hrithik Roshan",
    "englishName": "Hrithik Roshan",
    "country": "Ấn Độ 🇮🇳",
    "countryCode": "in",
    "roles": "Nam thần điển trai số 1 Bollywood • Krrish",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/d7XGTvyYgmrsA05XOn1YtxYcuY1.jpg",
    "tmdbPersonId": 78749,
    "birthday": "1974-01-10",
    "placeOfBirth": "Mumbai, Maharashtra, India",
    "bio": "Hrithik Roshan ([ˈrɪt̪ʰɪk ˈroːʃən];sinh 10 tháng Giêng 1974), diễn viên điện ảnh Ấn Độ. Các phim tiêu biểu: Kaho Naa... Pyaar Hai (2000), Fiza, Mission Kashmir (2000), Kabhi Khushi Kabhie Gham... (2001), Koi... Mil Gaya (2003), Krrish (2006), Dhoom 2 (2006), Jodhaa Akbar (2008), Guzaarish (2010), Zindagi Na Milegi Dobara (2011), Agneepath (2012).\n\nCác phim đã đóng:",
    "aliases": [
      "hrithik roshan"
    ],
    "featured": false,
    "gender": 2,
    "tags": [
      "Bollywood",
      "Hành động",
      "Chính kịch"
    ]
  },
  {
    "slug": "ngo-thanh-van",
    "name": "Ngô Thanh Vân",
    "englishName": "Veronica Ngo",
    "country": "Việt Nam 🇻🇳",
    "countryCode": "vn",
    "gender": 1,
    "tags": [
      "Hành động",
      "Võ thuật",
      "Hollywood"
    ],
    "roles": "Đả nữ • Đạo diễn • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/scpUnMH2Rll9CD9lXQH9TaOOHTO.jpg",
    "tmdbPersonId": 91378,
    "birthday": "1979-02-26",
    "placeOfBirth": "Tra Vinh, Vietnam",
    "bio": "Ngô Thanh Vân (sinh ngày 26 tháng 2 năm 1979), hay còn được biết đến với nghệ danh Veronica Ngo, là một nữ diễn viên, ca sĩ, vũ công, người mẫu, nhà làm phim kiêm doanh nhân người Na Uy gốc Việt.\nCô bắt đầu nổi lên từ bộ phim Dòng máu anh hùng (2007) với vai Thúy, và ngay lập tức gắn với hình tượng đả nữ, sau đó tiếp tục tham gia hai dự án phim hành động lớn là Bẫy rồng (2009) và Lửa Phật (2013). Ngô Thanh Vân bắt đầu sự nghiệp sản xuất phim điện ảnh từ dự án Ngày nảy ngày nay (2015), mà trong đó cô có tham gia một vai. Ngoài các vai diễn trong nước, cô cũng có tham gia một số dự án phim quốc tế.\n\nTiểu sử và sự nghiệp:\n\nTrước 1999: Tiểu sử và thiếu thời:\n\nCô sinh ngày 26 tháng 2 năm 1979 tại xã Hòa Ân, huyện Cầu Kè, tỉnh Trà Vinh (nay là xã Cầu Kè, tỉnh Vĩnh Long), là con út trong một gia đình có 3 anh em: 2 anh trai (Ngô Phong, Ngô Vũ) và Ngô Thanh Vân. Khi lên 16 tuổi, cha mẹ ly hôn thì cô cùng mẹ định cư ở Na Uy và gặp được gia đình của ông Trygve Andersen (qua đời năm 2017) đã cưu mang mẹ con cô và nhận nuôi. Ngoài cha nuôi và cha ruột thì cô còn có một người cha dượng là người Na Uy.\n\n1999–2005: Bắt đầu với âm nhạc:\n\nNăm 1999, Ngô Thanh Vân trở về Việt Nam, và giành được ngôi Á hậu 2 trong cuộc thi Hoa hậu Phụ nữ Việt Nam qua ảnh do tạp chí Thế giới phụ nữ tổ chức năm 2000. Trong thời gian này, cô cùng với cựu người mẫu Trần Thanh Long (chồng cũ của người mẫu - diễn viên Anh Thư) trở thành đại sứ thương hiệu Yamaha Sirus trong giai đoạn từ 1999 đến 2001. Sau đó, cô bắt đầu sự nghiệp tại Việt Nam như một người mẫu ảnh cho các tạp chí, lịch, các bộ sưu tập thời trang,... Lúc này, cô có cơ hội đến gần điện ảnh, với vai chính trong phim Hương dẻ, phim điện ảnh truyền hình của HTV. Năm 2002, Ngô Thanh Vân bắt đầu bước vào sự nghiệp của một ca sĩ nhạc pop và ký hợp đồng với Trung tâm băng nhạc Rạng Đông, đồng thời là vũ công cho ca sĩ Minh Thuận qua MV Dẫu tình đã xa và Chia xa (lời Việt ca khúc \"Rất muốn rất muốn\" của Cổ Cự Cơ trong phim Tân dòng sông ly biệt) do ca sĩ Tuấn Hưng trình bày và là diễn viên phụ hoạ cho MV \"Ngọc Lan\" (sáng tác bởi Dương Thiệu Tước do ca sĩ Trần Thu Hà thể hiện). Tiếp đó, cô cùng Tuấn Hưng thu âm một album là Vườn tình nhân do hãng phim Phương Nam sản xuất. Cô cũng từng là thành viên của nhóm Tứ Ca Ngẫu Nhiên (1999 - 2003) cùng với Trịnh Kim Chi, Trương Ngọc Ánh, Minh Anh năm 2001 sau khi thành viên Chung Vũ Thanh Uyên rời nhóm.\nMột năm sau đó, 2003, với sự giúp đỡ của nhạc sĩ Quốc Bảo, Ngô Thanh Vân phát hành album đầu tiên, Thế giới trò chơi vào ngày 26 tháng 2, sinh nhật thứ 23 của cô do hãng phim Phương Nam thực hiện. Album này là thể loại pop-dance, với câu chuyện về \"NTV Virus\". Hai đoạn video nhạc được làm từ album này, bao gồm các bài hát \"Thế giới trò chơi\" (hát qua phần mềm Auto-Tune) và \"Ngày tươi sáng\" (một bản cover lại của JTL bài \"A Better Day\"), được đạo diễn Jackie Chen (một đạo diễn chuyên dựng các chương trình MTV) dàn dựng.",
    "aliases": [
      "ngô thanh vân",
      "veronica ngo",
      "ngo thanh van",
      "veronica ngô thanh vân",
      "ntv",
      "thanh van ngo"
    ],
    "featured": false
  },
  {
    "slug": "hua-vi-van",
    "name": "Hứa Vĩ Văn",
    "englishName": "Hua Vi Van",
    "country": "Việt Nam 🇻🇳",
    "countryCode": "vn",
    "gender": 2,
    "tags": [
      "Chính kịch",
      "Tình cảm",
      "Hài"
    ],
    "roles": "Diễn viên điện ảnh",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/9oCj3FvgkFwkNFYeSkRyMDKOi05.jpg",
    "tmdbPersonId": 1598145,
    "birthday": "1979-12-25",
    "placeOfBirth": "Ho Chi Minh City, Vietnam",
    "bio": "Hứa Vĩ Văn (sinh ngày 25 tháng 12 năm 1979) là một nam người mẫu, ca sĩ và diễn viên người Việt gốc Hoa. Anh bắt đầu sự nghiệp từ năm 16 tuổi với vai trò người mẫu, sau đó từng là thành viên nhóm nhạc GMC ở đầu thập niên 2000. Hiện tại Vĩ Văn hoạt động chủ yếu trong lĩnh vực phim truyền hình và điện ảnh.\nNhững bộ phim nổi bật của Hứa Vĩ Văn là Đam Mê, Giao Lộ Định Mệnh, phim truyền hình \"Lời Thú Nhận Của Eva\" và \"Thái Sư Trần Thủ Độ''. Vĩ Văn có mặt trong các phim điện ảnh đạt doanh thu cao và nhận được nhiều lời khen của giới chuyên môn như \"Thần Tượng\", \"Chàng Trai Năm Ấy\" và \"Em Là Bà Nội Của Anh\".\nTrong vai trò diễn viên, Hứa Vĩ Văn nhận được các giải thưởng quan trọng như Nam diễn viên phụ xuất sắc nhất tại Cánh Diều Vàng 2012 cho vai diễn trong phim Đam Mê, Nam diễn viên truyền hình được yêu thích nhất của HTV Awards 2015.\nHứa Vĩ Văn còn là MC trong nhiều sự kiện, chương trình truyền hình. Trong hai năm liên tiếp 2013 và 2014, anh được đề cử tại lễ trao giải Men of the Year của tạp chí Thể thao Văn Hóa & Đàn ông.\n\nTiểu sử:\n\nHứa Vĩ Văn sinh ngày 25 tháng 12 năm 1979 tại Chợ Lớn, Quận 5, Thành phố Hồ Chí Minh. Anh sinh ra trong một gia đình người gốc Hoa.\nTheo lời Vĩ Văn, trước khi kết hôn, ba mẹ anh xuất thân từ gia đình giàu có, nhưng sau khi kết hôn, họ không được hỗ trợ tài chính. Ba của Vĩ Văn phụ bán hàng cho ông nội từ sáng đến khuya, còn mẹ anh vun vén cho gia đình hai bên nội ngoại và mở quán ăn nhỏ. Từ nhỏ, vì ba mẹ bận rộn mưu sinh nên Vĩ Văn được giao chăm sóc em trai cho đến khi người em học tiểu học.\n\nSự nghiệp:\n\nThời niên thiếu và khởi nghiệp từ vai trò người mẫu:\n\nKhi còn nhỏ Hứa Vĩ Văn tham gia Nhà văn hóa thiếu nhi và bộc lộ năng khiếu nghệ thuật từ sớm. Năm 16 tuổi anh đoạt giải nhất trong cuộc thi nam sinh thanh lịch của trường PTTH Bùi Thị Xuân. Vào thời điểm đó, anh đang tham gia câu lạc bộ người mẫu Hoa Học Đường tại Nhà văn hóa Thanh Niên. Năm 2000, Vĩ Văn đoạt giải nhất cuộc thi thời trang xuân do Nhà văn hóa Thanh Niên tổ chức.\nNăm 2002, Vĩ Văn theo học tại trường Đại học Mỹ thuật Thành phố Hồ Chí Minh, đây cũng là thời điểm anh bắt đầu gia nhập làng giải trí. Cùng năm này, anh xuất hiện trong Quảng cáo Bột ngọt Ajinomoto. Năm 2003, Vĩ Văn đoạt giải Người mẫu được yêu thích nhất cùng với Hồ Ngọc Hà.\n\nCa hát và gia nhập nhóm nhạc GMC:",
    "aliases": [
      "hứa vĩ văn",
      "hua vi van",
      "mark hua"
    ],
    "featured": false
  },
  {
    "slug": "hong-anh",
    "name": "Hồng Ánh",
    "englishName": "Pham Thi Hong Anh",
    "country": "Việt Nam 🇻🇳",
    "countryCode": "vn",
    "gender": 1,
    "tags": [
      "Chính kịch",
      "Tình cảm"
    ],
    "roles": "Diễn viên • Đạo diễn",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/usUroq18HASSFlTh9NFfdWqQmwn.jpg",
    "tmdbPersonId": 84205,
    "birthday": "1960-02-03",
    "placeOfBirth": "Hong Kong, British Crown Colony [now China]",
    "bio": "Phạm Thị Hồng Ánh (sinh ngày 28 tháng 8 năm 1977) là một nữ diễn viên người Việt Nam. Cô từng giành được 1 số giải thưởng tại các kỳ Liên hoan phim cấp quốc gia cũng như quốc tế về diễn xuất.\nHồng Ánh bắt đầu sự nghiệp của mình trong bộ phim truyền hình Người đẹp Tây Đô năm 1995. Cô là người đầu tiên và duy nhất chinh phục cả ba hạng mục diễn viên triển vọng, nữ diễn viên chính xuất sắc, nữ diễn viên phụ xuất sắc của Liên hoan phim Việt Nam. Vai diễn thành công nhất của cô là Hạnh trong bộ phim chính kịch Trăng nơi đáy giếng (2007), bộ phim cũng đã giúp cô giành được hạng mục nữ diễn viên xuất sắc nhất tại giải thưởng Cánh diều vàng, Liên hoan phim Việt Nam tại Pháp và đặc biệt là Liên hoan phim Quốc tế Dubai.\n\nTiểu sử:\n\nHồng Ánh sinh tại Trà Vinh (nay là Vĩnh Long). Cô từng học múa và được chọn biểu diễn múa trên sân khấu lớn từ năm 14 tuổi. Sau đó, cô chuyển sang đóng phim.\n\nSự nghiệp:\n\n1995–1997: Những năm đầu sự nghiệp:\n\nNăm 1995, Hồng Ánh nhận giải người đẹp duyên dáng trong cuộc thi Diễn viên Điện ảnh triển vọng do Hội Điện ảnh Thành phố Hồ Chí Minh tổ chức. Đây cũng là dấu ấn đầu tiên của cô khi bước chân vào sự nghiệp diễn xuất chuyên nghiệp. Thời gian này, cô tham gia nhiều bộ phim truyền hình như Lựa chọn, Nàng Hương nhưng nổi bật nhất phải nhắc đến vai Bạch Vân trong phim Người đẹp Tây Đô (1995), vai diễn giúp cô nhận giải thưởng Diễn viên Truyền hình Triển vọng. Năm 1997, cô tham vào tác phẩm kinh điển Những nẻo đường phù sa cùng dàn diễn viên đình đám thời bấy giờ như Thiệu Ánh Dương, Quyền Linh, Diễm My 6x, Kiều Oanh,...\n\n1999–2003: Sự nghiệp thăng hoa cùng vô số giải thưởng:\n\nNăm 1999, cô làm người dẫn chương trình Tạp chí Văn Nghệ lúc 8h30 chủ nhật hàng tuần trên kênh HTV7. Và trong năm đó, vai diễn Tâm trong phim Cầu thang tối đã tạo nên bước ngoặc cho Hồng Ánh khi giúp cô mang về hai giải thưởng diễn viên triển vọng tại Liên hoan phim Việt Nam lần thứ 12 và nữ diễn viên điện ảnh - truyền hình của Giải Mai Vàng. Từ đây Hồng Ánh chính thức là cái tên được săn đón.\nCùng năm, cô tham gia bộ phim điện ảnh Đời cát, một trong những tác phẩm kinh điển nhất của Hồng Ánh. Tại Liên hoan phim châu Á - Thái Bình Dương, cô đã giành được giải thưởng tại hạng mục nữ diễn viên phụ xuất sắc nhất và đây cũng chính là giải thưởng quốc tế đầu tiên của Hồng Ánh.\nVào năm 2000, Hồng Ánh lần đầu tiên tham gia vào loạt phim Cổ tích Việt Nam, một chuỗi phim đình đám và kinh điển nhất thời bấy giờ với vai nàng Xuân Hương lém lỉnh, thông minh. Dù đạt được thành công từ sớm cũng không khiến Hồng Ánh ngủ quên trên chiến thắng của mình, cô tham gia bộ phim Thung lũng hoang vắng (2001) của đạo diễn NSND Phạm Huệ Giang, với vai diễn cô giáo Giao của mình, Hồng Ánh đã xuất sắc mang về giải thưởng nữ diễn viên xuất sắc nhất tại Liên hoan phim Việt Nam lần thứ 13.",
    "aliases": [
      "hồng ánh",
      "pham thi hong anh",
      "hong anh",
      "kara hui ying-hung",
      "惠英紅",
      "惠英红",
      "wai ying hung",
      "kara wei",
      "kara wai",
      "kara wai ying hung",
      "hui yinghong",
      "yinghong hui",
      "혜영홍",
      "kara hui",
      "huệ anh hồng",
      "kara wai ying-hung",
      "クララ・ワイ"
    ],
    "featured": false
  },
  {
    "slug": "huy-khanh",
    "name": "Huy Khánh",
    "englishName": "Huy Khanh",
    "country": "Việt Nam 🇻🇳",
    "countryCode": "vn",
    "gender": 2,
    "tags": [
      "Hài",
      "Tình cảm",
      "Chính kịch"
    ],
    "roles": "Diễn viên điện ảnh & truyền hình",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/6utMvZ1BlU3SK6HKeVqmIgIYghs.jpg",
    "tmdbPersonId": 1043247,
    "birthday": "1981-01-07",
    "placeOfBirth": " Milan, Italy",
    "bio": "Trần Phan Huy Khánh (sinh ngày 7 tháng 1 năm 1981), thường được biết đến với nghệ danh Huy Khánh, là một nam diễn viên kiêm người dẫn chương trình người Việt Nam.\n\nTiểu sử và sự nghiệp:\n\nHuy Khánh sinh ngày 7 tháng 1 năm 1981 tại Thành phố Hồ Chí Minh, có cha là người Việt còn mẹ là người Pháp. Anh tốt nghiệp trường Đại học Sân khấu – Điện ảnh Thành phố Hồ Chí Minh.\nHuy Khánh được khán giả biết đến rộng rãi lần đầu tiên qua bộ phim Dốc tình năm 2004 của đạo diễn Lưu Trọng Ninh qua vai Thái. Năm 2009, anh tham gia phim Chuyện tình xa xứ của đạo diễn Việt kiều Victor Vũ. Năm 2011, anh tiếp tục hợp tác với Victor Vũ khi đóng trong phim Cô dâu đại chiến.\nNăm 2012, anh là người dẫn chương trình cho mùa thứ tư của cuộc thi âm nhạc Vietnam Idol.\nNăm 2018, Huy Khánh tham gia phim truyền hình Nhà ông Hoàng có ma. Vai diễn Bùi Hoàng trong phim mang về cho anh một giải Ngôi Sao Xanh ở hạng mục Nam diễn viên xuất sắc nhất.\n\nĐời tư:\n\nHuy Khánh từng có quan hệ tình cảm với Tăng Thanh Hà, bạn diễn trong phim Dốc tình năm 2004. Tháng 8 năm 2005, anh kết hôn với nữ doanh nhân Lương Hoàng Anh. Hai người sinh được 1 con trai tên thân mật là Ghini trước khi ly hôn một thời gian sau đó. Năm 2012, Huy Khánh kết hôn với diễn viên Mạc Anh Thư. Họ đã sinh được 1 con gái là Trần Khánh Ngọc Uyên (tên ở nhà là Cát). Đầu 2025, cặp đôi xác nhận đã ly hôn từ cuối năm 2023 nhưng chưa công khai, cả hai vẫn giữ mối quan hệ tốt đẹp, cùng nuôi dạy con gái.",
    "aliases": [
      "huy khánh",
      "huy khanh",
      "trần phan huy khánh"
    ],
    "featured": false
  },
  {
    "slug": "dieu-nhi",
    "name": "Diệu Nhi",
    "englishName": "Dieu Nhi",
    "country": "Việt Nam 🇻🇳",
    "countryCode": "vn",
    "gender": 1,
    "tags": [
      "Hài",
      "Tình cảm"
    ],
    "roles": "Diễn viên hài • Điện ảnh",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/egzQEkov9l6qHSrwHGuddOrZbbQ.jpg",
    "tmdbPersonId": 1878202,
    "birthday": "1991-05-21",
    "placeOfBirth": "Binh Thuan province, Vietnam",
    "bio": "Trần Thị Diệu Nhi (sinh ngày 21 tháng 5 năm 1991), thường được biết đến với nghệ danh Diệu Nhi, là một nữ diễn viên, nghệ sĩ hài kiêm người dẫn chương trình truyền hình người Việt Nam.\nKhi còn là sinh viên của trường Đại học Sân khấu – Điện ảnh Thành phố Hồ Chí Minh, Nhi là diễn viên của Sân khấu kịch 5B (Sân khấu Thành phố Hồ Chí Minh) và tham gia vào vở Trò chơi của quỷ. Sau đó, năm 2011, cô chuyển sang Sân Khấu Thế Giới Trẻ và bắt đầu đi lên từ lĩnh vực sân khấu.\nNăm 2014, Nhi tham gia phim sitcom Chiến dịch chống ế của kênh YanTV với vai diễn Linh Đan.\n\nDiễn xuất:\n\nKịch:",
    "aliases": [
      "diệu nhi",
      "dieu nhi",
      "trần thị diệu nhi"
    ],
    "featured": false
  },
  {
    "slug": "anh-tu",
    "name": "Anh Tú",
    "englishName": "Anh Tu Atus",
    "country": "Việt Nam 🇻🇳",
    "countryCode": "vn",
    "gender": 2,
    "tags": [
      "Hài",
      "Tình cảm",
      "Chính kịch"
    ],
    "roles": "Diễn viên • Ca sĩ",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/shaY1dAn4o3P9qQTVg3J8DhWWlq.jpg",
    "tmdbPersonId": 5265949,
    "birthday": "1993-03-10",
    "placeOfBirth": "Hanoi, Vietnam",
    "bio": "Anh Tú có thể là:\n\nBùi Anh Tú, còn có nghệ danh là Anh Tú Atus (sinh 1993): ca sĩ, diễn viên người Việt Nam.\nLã Anh Tú (1950–2003): Ca sĩ hải ngoại.\nLê Anh Tú (sinh 1981): thế danh của Thích Minh Tuệ.\nLê Anh Tú (sinh 1985): Diễn viên Nhà hát Chèo Ninh Bình.\nNguyễn Anh Tú (Tú Dưa hay Mars Anh Tú) (sinh 1979): ca sĩ, cựu thành viên ban nhạc Quả Dưa Hấu.\nNguyễn Anh Tú (sinh 1992): ca sĩ, á quân Giọng hát Việt 2017, quán quân Ca sĩ mặt nạ 2023.\nNguyễn Anh Tú (sinh 1993): Diễn viên, quán quân Cười xuyên Việt 2016.\nNguyễn Phan Anh Tú (Anh Tú Wilson) (sinh 1998): diễn viên người Việt Nam.\nPhạm Anh Tú (1962–2018): Diễn viên kịch, nghệ sĩ nhân dân.\nTrần Anh Tú (sinh 1963): Uỷ viên Ban chấp hành Liên đoàn bóng đá Việt Nam (VFF), Ủy viên Ban Futsal và Bóng đá bãi biển Liên đoàn bóng đá châu Á (AFC), Chủ tịch Công ty Cổ phần Bóng đá chuyên nghiệp Việt Nam, Chủ tịch Câu lạc bộ bóng đá trong nhà Thái Sơn Nam.\nTrần Anh Tú: Nhạc công vĩ cầm.\nVương Anh Tú (sinh 1989): ca sĩ, nhạc sĩ người Việt Nam.",
    "aliases": [
      "anh tú",
      "anh tu atus",
      "anh tu",
      "bùi anh tú"
    ],
    "featured": false
  },
  {
    "slug": "quoc-truong",
    "name": "Quốc Trường",
    "englishName": "Quoc Truong",
    "country": "Việt Nam 🇻🇳",
    "countryCode": "vn",
    "gender": 2,
    "tags": [
      "Chính kịch",
      "Tình cảm"
    ],
    "roles": "Diễn viên truyền hình & điện ảnh",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/tB4IUYA06HhWWXdJUphRz6znW11.jpg",
    "tmdbPersonId": 2490946,
    "birthday": "1988-04-23",
    "placeOfBirth": "Cần Thơ, Việt Nam",
    "bio": "Quốc Trường (1952–2011) là một nghệ sĩ Trompette Việt Nam, ông còn là một nhạc sĩ sáng tác nhiều ca khúc nhạc nhẹ nổi tiếng được nhiều người biết đến ở thập niên 80 như: \"Hà Nội – những công trình\", \"Chớ có quên ngày hôm qua\", \"Những phút giây qua\", \"Hát cho mùa xuân tương lai\", \"Hoàng hôn\"...\n\nTiểu sử:\n\nÔng có tên thật là Nguyễn Quốc Trường, sinh ngày 27 tháng 12 năm 1952 tại Hà Nội. Cha ông là Nguyễn Văn Tư, là một trong những nhà giáo có tiếng ở Hà Nội đầu thế kỷ 20. Mẹ ông là nghệ sĩ Châu Loan, một nghệ sĩ ngâm thơ và ca Huế nổi tiếng, đã được nhà nước Việt Nam phong tặng danh hiệu Nghệ sĩ Nhân dân.\nTừ nhỏ, Quốc Trường hay theo mẹ đến Đài Tiếng nói Việt Nam nên sớm có được điều kiện tiếp xúc với âm nhạc. Tại đây, ông được lão nghệ sĩ kèn Trompette của dàn nhạc Đài Tiếng nói Việt Nam là Ngô Văn Sợi phát hiện ra khả năng âm nhạc và đã kèm cặp ông tại lớp thể nghiệm của Dàn nhạc Đài Tiếng nói Việt Nam. Năm 1968, ông được cử theo học tại Khoa kèn của lớp Chuyên gia Cộng hòa Liên bang Đức phối hợp với Trường âm nhạc quốc gia Việt Nam.\nTừ năm 1970, ông là thành viên chính thức của Dàn nhạc Đài Tiếng nói Việt Nam và trở thành nhạc công Trompette nắm giữ bè 1 của dàn nhạc trong 16 năm. Năm 1987, ông chuyển về làm việc tại Nhà hát ca múa nhạc Trung ương. Sau đó, từ một nhạc công Trompette, ông trở thành Nhạc trưởng, rồi Trưởng phòng Nghệ thuật, Trưởng đoàn ca nhạc của Nhà hát Nhạc nhẹ Việt Nam (Tiền thân là Nhà hát ca múa nhạc Trung ương).\nTrong suốt hơn 40 năm hoạt động nghệ thuật, ông còn thể hiện là một nhà hòa âm phối khí hàng đầu Việt Nam, góp phần không nhỏ vào thành công của Dàn nhạc Đài Tiếng nói Việt Nam, Dàn nhạc Đoàn ca nhạc nhẹ Trung ương. Ông từng tham gia biểu diễn và phối khí cho các dàn nhạc lớn như Dàn nhạc Liên đoàn Xiếc Việt Nam, Ban nhạc Jazz Sông Hồng, Dàn nhạc giao hưởng Nhà hát nhạc vũ kịch Việt Nam, Dàn nhạc giao hưởng Nhạc viện Hà Nội...\nTrong lĩnh vực sáng tác, Quốc Trường nổi tiếng với các bài hát viết về tuổi trẻ, tình yêu, Hà Nội như: \"Hát cho mùa xuân tương lai\", \"Chớ quên ngày hôm qua\", \"Hoàng hôn\", \"Những phút giây qua\"... Đặc biệt với bài hát \"Hà Nội những công trình\" được ông sáng tác tặng riêng cho người bạn gái và về sau trở thành người vợ của ông, đã được chọn là tác phẩm trong top 10 bài hát tiêu biểu 1000 năm Thăng Long – Hà Nội.\nTrong sự nghiệp đào tạo, ông luôn quan tâm đến thế hệ trẻ kế cận. Ngoài thời gian công tác tại Nhà hát Nhạc Nhẹ Việt Nam, ông thường xuyên tham gia giảng dạy tại Trường Đại học Văn hóa Nghệ thuật Quân đội, Trường Đại học Âm nhạc Quốc gia Việt Nam, Cung Thiếu nhi Hà Nội...\nDo những cống hiến của mình, cùng với tập thể nghệ sĩ Nhà hát Nhạc nhẹ Việt Nam, ông đã được nhà nước Việt Nam tặng thưởng nhiều bằng khen, nhiều huân chương, huy chương cao quý, các giải thưởng của Hội Nhạc sĩ Việt Nam, Bộ Văn hóa – Thông tin, các giải Vàng cho cá nhân, và các giải vàng với tư cách là người xây dựng nên các chương trình Âm nhạc lớn...",
    "aliases": [
      "quốc trường",
      "quoc truong",
      "nguyen quoc truong"
    ],
    "featured": false
  },
  {
    "slug": "phuong-anh-dao",
    "name": "Phương Anh Đào",
    "englishName": "Phuong Anh Dao",
    "country": "Việt Nam 🇻🇳",
    "countryCode": "vn",
    "gender": 1,
    "tags": [
      "Chính kịch",
      "Tình cảm",
      "Hài"
    ],
    "roles": "Nàng thơ điện ảnh • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/fQB9fzInrYp2PMkcu9Wcx5GLmYG.jpg",
    "tmdbPersonId": 2040628,
    "birthday": "1992-04-30",
    "placeOfBirth": "Cà Mau - Vietnam",
    "bio": "Đào Phương Anh Đào (sinh ngày 30 tháng 4 năm 1992), thường được biết đến với nghệ danh Phương Anh Đào, là một nữ diễn viên người Việt Nam. Năm 2018, vai diễn Nhật Hạ trong bộ phim Nhắm mắt thấy mùa hè giúp cô đoạt giải \"Nữ diễn viên chính xuất sắc\" tại Liên hoan phim quốc tế Hà Nội lần thứ 5. Cô cũng được biết tới khi đảm nhiệm vai nữ chính trong phim Mai (2024), bộ phim từng đạt doanh thu cao nhất lịch sử phòng vé Việt Nam.\n\nCuộc đời và sự nghiệp:\n\nPhương Anh Đào sinh ngày 30 tháng 4 năm 1992 trong một gia đình không ai theo nghệ thuật, bố mẹ làm tiểu thương ở thị trấn Gành Hào, huyện Đông Hải, tỉnh Minh Hải cũ (nay là xã Gánh Hào, tỉnh Cà Mau). Anh Đào được gia đình ủng hộ theo nghệ thuật, cô rời quê lên Thành phố Hồ Chí Minh đăng ký thi vào Trường Đại học Sân khấu – Điện ảnh. Năm 2008, cô đóng vai diễn đầu tiên là vai phụ Hoàng Su trong phim truyền hình Dòng sông định mệnh của đạo diễn Châu Huế. Năm 2014, Anh Đào đóng vai An Sa trong bộ phim sitcom Kim chi cà pháo nhưng không gây được dấu ấn.\nNăm 2018, Phương Anh Đào gây ấn tượng khi vào vai Nhật Hạ trong bộ phim Nhắm mắt thấy mùa hè ghi hình tại Nhật Bản, vai diễn này giúp Đào đoạt giải \"Nữ diễn viên chính xuất sắc nhất\" tại Liên hoan phim Quốc tế Hà Nội. Liên tiếp cô đảm nhận vai chính trong hai bộ phim Em gái mưa và Chàng vợ của em. Năm 2019, Đào vào vai Thanh trong phim kinh dị Cha ma. Năm 2020, cô vào vai Thu trong bộ phim điện ảnh Bằng chứng vô hình. Năm 2022, Phương Anh Đào thủ vai bác sĩ Phương Anh trong bộ phim kinh dị Vô diện sát nhân. Năm 2024, cô vào vai Mai trong phim điện ảnh cùng tên, vai diễn này giúp cô nhận về nhiều giải thưởng, bao gồm giải Diễn viên nữ chính xuất sắc nhất tại 2 lễ trao giải Liên hoan phim châu Á Đà Nẵng lần thứ 2 & Giải Cánh diều lần thứ 22, và 3 giải thưởng Nữ diễn viên chính xuất sắc nhất (Điện ảnh), Nữ diễn viên điện ảnh được yêu thích nhất, Cặp đôi được yêu thích nhất (cùng với Tuấn Trần) tại Giải thưởng Ngôi Sao Xanh lần thứ 11.\nNgoài tham gia các bộ phim, Anh Đào còn xuất hiện trong một số video âm nhạc.Năm 2016 cô góp mặt trong MV \"Ngốc\" của ca sĩ Hương Tràm. Năm 2019, cô lần đầu góp giọng cùng Đen Vâu trong ca khúc \"Lối nhỏ\", sau đó là \"Bài này chill phết\". Năm 2022, cô góp mặt trong MV \"Diễn viên tồi\" của Đen Vâu. Đây là lần thứ ba cô hợp tác cùng nam rapper này.\n\nDanh sách phim và chương trình:\n\n=",
    "aliases": [
      "phương anh đào",
      "phuong anh dao"
    ],
    "featured": false
  },
  {
    "slug": "kha-ngan",
    "name": "Khả Ngân",
    "englishName": "Kha Ngan",
    "country": "Việt Nam 🇻🇳",
    "countryCode": "vn",
    "gender": 1,
    "tags": [
      "Tình cảm",
      "Chính kịch"
    ],
    "roles": "Diễn viên truyền hình & điện ảnh",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/fhscwgCOfGDzzPkVH1IyVkSfjk0.jpg",
    "tmdbPersonId": 1924576,
    "birthday": "1997-07-31",
    "placeOfBirth": "Thành phố Hồ Chí Minh",
    "bio": "Trần Thị Kim Ngân (sinh ngày 31 tháng 7 năm 1997), thường được biết đến với nghệ danh Khả Ngân, là một nữ diễn viên kiêm người mẫu người Việt Nam.\n\nTiểu sử và sự nghiệp:\n\nKhả Ngân sinh ra và lớn lên tại Thành phố Hồ Chí Minh, cô được biết đến là người mẫu ảnh của nhiều hãng thời trang từ khi còn đi học. Cô đã đoạt Giải Nhì bơi lội quốc gia vào năm 2008. Cô còn được biết đến là 1 hot girl qua internet.\nNăm 2015, cô tham gia chương trình truyền hình thực tế Điệp vụ tuyệt mật và 1 TV show của Thái Lan, Turn On Beauty.\nNăm 2016, Khả Ngân tham gia chương trình Bước nhảy hoàn vũ mùa 7 và nhận được nhiều đánh giá tích cực từ ban giám khảo trước khi dừng chân ở liveshow 5.\nCũng trong năm này, vào tháng 11, cô trở thành đại sứ thương hiệu của cà phê Mr. Brown Coffee, thương hiệu thuộc sở hữu của King Car Group – tập đoàn đã chiếm lĩnh thị trường cà phê đóng lon tại Đài Loan.\nSang năm 2017, Khả Ngân tạm thời vắng bóng khỏi showbiz. Đến năm 2018, cô trở lại màn ảnh rộng với bộ phim điện ảnh 100 ngày bên em của đạo diễn Vũ Ngọc Phượng.",
    "aliases": [
      "khả ngân",
      "kha ngan",
      "ngân sushi",
      "trần thị kim ngân"
    ],
    "featured": false
  },
  {
    "slug": "quang-tuan",
    "name": "Quang Tuấn",
    "englishName": "Quang Tuan",
    "country": "Việt Nam 🇻🇳",
    "countryCode": "vn",
    "gender": 2,
    "tags": [
      "Kinh dị",
      "Chính kịch",
      "Tội phạm"
    ],
    "roles": "Diễn viên điện ảnh",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/phycXzKyBl7eKvO07vmnjvD94ej.jpg",
    "tmdbPersonId": 2413141,
    "birthday": "1985-03-14",
    "placeOfBirth": "Bà Rịa - Vũng Tàu, Việt Nam",
    "bio": "Ngô Quang Tuấn (sinh ngày 14 tháng 3 năm 1985), thường được biết đến với nghệ danh Quang Tuấn, là một nam diễn viên người Việt Nam.\n\nTiểu sử:\n\nQuang Tuấn sinh ngày 14 tháng 3 năm 1985 tại thị trấn Long Hải, huyện Long Đất, tỉnh Bà Rịa - Vũng Tàu (nay là xã Long Hải, Thành phố Hồ Chí Minh), quê gốc tại xã Trung Hải, huyện Gio Linh (nay là xã Bến Hải), tỉnh Quảng Trị.\n\nSự nghiệp:\n\nQuang Tuấn ban đầu theo học Quản trị kinh doanh tại trường Cao đẳng Kinh tế Đối ngoại. Cho đến khi một người bạn gợi ý thi vào trường Cao đẳng Sân khấu Điện ảnh Thành phố Hồ Chí Minh, anh quyết định dự thi và trúng tuyển. Hiện nay, anh đang làm việc tại sân khấu kịch Thế giới trẻ, vở kịch đầu tay của anh là Lầu hoang. Đầu năm 2012, anh nhận được huy chương Vàng của Liên hoan Sân khấu Kịch chuyên nghiệp toàn quốc, cùng giải thưởng Nam diễn viên trẻ xuất sắc nhất của Hội nghệ sĩ Việt Nam năm 2013 cho vai diễn Hai Đời trong vở Đời như ý.\nNăm 2006, Quang Tuấn được đạo diễn Phương Điền phát hiện và anh bắt đầu đóng phim truyền hình với bộ phim truyền hình Cải ơi đóng cùng nghệ sĩ Mạc Can. Năm 2013 và 2015, anh dành 2 giải Cánh Diều Vàng cho Diễn viên chính xuất sắc cho diễn xuất trong phim Khúc hát mặt trời và Thuyền giấy. Năm 2019, Quang Tuấn được nhân vai chính trong Thất sơn tâm linh bộ phim điện ảnh đầu tiên trong sự nghiệp của anh.\n\nĐời tư:\n\nQuang Tuấn và ca sĩ Linh Phi đóng chung bộ phim dài tập Kén rể. Cặp đôi đã tổ chức lễ cưới vào ngày 15 tháng 5 năm 2016 tại quê nhà Bà Rịa – Vũng Tàu và tổ chức tiệc cưới tại khách sạn trung tâm Thành phố Hồ Chí Minh vào ngày 18 tháng 5 năm 2016.\nHiện tại Linh Phi là quản lý của chồng.\n\nSự nghiệp diễn viên:",
    "aliases": [
      "quang tuấn",
      "quang tuan",
      "ngô quang tuấn"
    ],
    "featured": false
  },
  {
    "slug": "isaac",
    "name": "Isaac",
    "englishName": "Isaac Pham",
    "country": "Việt Nam 🇻🇳",
    "countryCode": "vn",
    "gender": 2,
    "tags": [
      "Hành động",
      "Tình cảm",
      "Hài"
    ],
    "roles": "Ca sĩ • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/2RVb2HyDHVg6wsCOO9cjeaE2232.jpg",
    "tmdbPersonId": 1667473,
    "birthday": "1988-06-13",
    "placeOfBirth": "Cần Thơ, Vietnam",
    "bio": "Isaac là một nhân vật quan trọng trong Do Thái giáo, Cơ Đốc giáo và Hồi giáo. Theo Kinh Thánh, Isaac là con trai của Abraham và Sarah, cha của Esau và Jacob. Thông qua Jacob, Isaac là tổ phụ của người Israel, sau này được biết đến là người Do Thái. Trong khi đó, người anh cùng cha khác mẹ của Isaac là Ishmael được coi là tổ phụ của người Ả Rập.\nSách chữ Nôm tiếng Việt soạn vào thế kỷ 17 gọi nhân vật này là Y Giác.\nTheo Cựu Ước thì Abraham vâng theo lệnh của Thiên Chúa, dâng con trai mình là Isaac làm sinh tế tại xứ Moriah, song một thiên sứ hiện ra ngăn cản người vì Chúa chỉ muốn thử thách đức tin của Abraham, nên ông giết một con cừu đực tìm thấy tại nơi ấy để làm sinh tế thay thế cho Isaac. Như là phần thưởng cho lòng tuân phục, Abraham lại nhận lãnh lời hứa dòng dõi ông sẽ \"nhiều như sao trên trời, đông như cát bờ biển\" và hưởng lấy sự phú cường (Sáng thế ký 22). Rồi thì ông quay về Beersheba. Sự kiện dâng Isaac làm sinh tế là một trong những hành động đạo đức khó khăn và đầy thách thức nhất đã được ghi lại trong Kinh Thánh.",
    "aliases": [
      "isaac",
      "isaac pham",
      "phạm lưu tuấn tài"
    ],
    "featured": false
  },
  {
    "slug": "jun-pham",
    "name": "Jun Phạm",
    "englishName": "Jun Pham",
    "country": "Việt Nam 🇻🇳",
    "countryCode": "vn",
    "gender": 2,
    "tags": [
      "Hài",
      "Tình cảm"
    ],
    "roles": "Diễn viên • Biên kịch • Ca sĩ",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/ymID7EAfhYsRILmFxqdFBttth3v.jpg",
    "tmdbPersonId": 1792864,
    "birthday": "1989-07-24",
    "placeOfBirth": "Ho Chi Minh City, Vietnam",
    "bio": "Phạm Duy Thuận (sinh ngày 24 tháng 7 năm 1989), thường được biết đến với nghệ danh Jun Phạm, là một nam ca sĩ, diễn viên, người dẫn chương trình truyền hình, nhạc sĩ kiêm nhà văn người Việt Nam. Anh là cựu thành viên của nhóm nhạc 365daband và hiện là thành viên của nhóm nhạc B.O.F.\n\nCuộc đời và sự nghiệp:\n\n1989–2010: Những năm đầu:\n\nJun Phạm sinh ra và lớn lên tại Thành phố Hồ Chí Minh. Khi học trung học phổ thông, Jun là người mẫu của báo Hoa Học Trò, thí sinh của cuộc thi \"Ngôi sao thời trang 2008\" (cùng với các thí sinh sau này là những nghệ sĩ như: Noo Phước Thịnh, Tường Vi, Sam) và đóng quảng cáo Coca-Cola năm 2008. Anh từng theo học Trường Đại học Kinh tế Thành phố Hồ Chí Minh, đến năm thứ 3 thì nghỉ học để tham gia nhóm 365. Jun Phạm mất mẹ năm 19 tuổi; điều này được anh chia sẻ trong chương trình Tôi tuổi teen và tập cuối cùng chương trình Ký ức vui vẻ mùa 3.\n\n2010–2016: Hoạt động cùng 365:\n\nNăm 2010, Ngô Thanh Vân thành lập nhóm nhạc 365 bao gồm Jun Phạm, Isaac, Will, S.T Sơn Thạch và Tronie Ngô. Anh và nhóm 365 ra mắt công chúng trong ca khúc \"Awakening\" vào ngày 16 tháng 12 năm 2010.\nNăm 2011, Jun cùng nhóm ra mắt hai mini album Valentine 2011, Baby Don't Cry và album The Love Box. Năm 2012, anh làm MC cho chương trình Miss Teen 2012. Năm 2013, anh ra mắt cuốn sách đầu tay mang tên Nếu như không thể nói nếu như. Năm 2014, Jun ra mắt cuốn sách thứ hai Có ai giữ giùm những lãng quên và làm biên kịch cho bộ phim điện ảnh Ngày nảy ngày nay. Năm 2015, Jun đảm nhận một vai phụ trong phim 12 chòm sao: Vẽ đường cho yêu chạy và bắt tay vào sự nghiệp ca sĩ solo với bài hát đầu tay Lonely. Năm 2016, Jun đóng vai Thuận Nô trong phim Tấm Cám: Chuyện chưa kể.\n\n2017–nay: Phát triển sự nghiệp:\n\nSau khi 365daband tan rã, Jun bắt đầu phát triển sự nghiệp cá nhân. Năm 2017, anh đoạt  quán quân cuộc thi Gương mặt thân quen và thể hiện ca khúc \"Tân thời\" cho phim Cô Ba Sài Gòn. Anh còn tham gia phim Cô gái đến từ hôm qua với vai diễn Hải và đoạt giải thưởng Ngôi Sao Xanh cho hạng mục \"Nam diễn viên điện ảnh được yêu thích nhất\". Năm 2018, Jun được giải Vàng Nhà biên kịch tài năng với tác phẩm Gia vị nhân gian, anh cũng đảm nhận 2 vai chính trong phim điện ảnh Về quê ăn Tết và 100 ngày bên em.\nNăm 2019, anh là thành viên chính của chương trình Chạy đi chờ chi. Jun còn cho ra mắt ca khúc Hai Bàn Tay. Cuối năm, Jun tiếp tục cho ra mắt hai ca khúc mới Đã từng là chúng ta  (OST Phượng khấu) và Đây là một bài hát vui (lấy cảm hứng dựa trên tiểu thuyết trào phúng Số Đỏ của nhà văn Vũ Trọng Phụng) với số lượng nghệ sĩ khách mời trong MV lên đến 13 người. Bên cạnh đó, anh tham gia chương trình Sao nhập ngũ 2019 và đạt giải nhất.\nNăm 2023, anh tham gia phim Nữ chủ chiếu trên VieON với vai Đông Quân. Anh tham gia hai chương trình truyền hình là Hay hay hên với vai trò người dẫn chương trình và La cà hát ca với vai trò thành viên chính.",
    "aliases": [
      "jun phạm",
      "jun pham",
      "phạm duy thuận"
    ],
    "featured": false
  },
  {
    "slug": "duong-tu",
    "name": "Dương Tử",
    "englishName": "Yang Zi",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "gender": 1,
    "tags": [
      "Cổ trang",
      "Tình cảm",
      "Chính kịch"
    ],
    "roles": "Tiểu hoa đán • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/rix91XOQ3xiNSLoWHXFnuklRxgi.jpg",
    "tmdbPersonId": 1696482,
    "birthday": "1992-11-06",
    "placeOfBirth": "Beijing, China",
    "bio": "Dương Tử (phồn thể: 楊紫, giản thể: 杨紫, sinh ngày 6 tháng 11 năm 1992) là một nữ diễn viên người Trung Quốc.  \nĐầu tháng 9/2016, Dương Tử được Tuần san giải trí Nam Đô bình chọn là 1 trong 4 tứ tiểu hoa đán thế hệ 9x (cùng với Châu Đông Vũ, Quan Hiểu Đồng, Trịnh Sảng).\nDương Tử vốn là một sao nhí nổi tiếng Trung Quốc, được chú ý với vai Hạ Tuyết trong bộ phim truyền hình Nhà có trai có gái. Sau này được công nhận hơn qua các vai diễn Hồ Tương Tương trong phim Chiến Trường Sa, Cẩm Mịch trong Hương mật tựa khói sương, Đồng Niên trong Thân ái, nhiệt ái và Khưu Oánh Oánh trong Hoan Lạc Tụng.\n\nTiểu sử:\n\nDương Tử sinh ra tại quận Phòng Sơn, Bắc Kinh, Trung Quốc với tên khai sinh là Dương Ni Áo (tiếng Trung: 杨旎奥, bính âm: Yáng Nǐào). Cha cô là ông Dương Vân Phi, một lính cứu hỏa, người làm công việc cứu hộ khẩn cấp và cứu trợ thảm họa. Mẹ cô là bà Mã Hải Yến. Ngay từ khi còn nhỏ, cha mẹ Dương Tử đã đi cùng cô đến nhiều buổi thử giọng khác nhau vì tình yêu của cô với diễn xuất. Cô có được vai chính đầu tiên trong sự nghiệp khi mới 6 tuổi. Dương Tử học tại trường tiểu học Hưng Thành Bắc Kinh ở quận Phòng Sơn và trường trung học số 55 Bắc Kinh ở quận Đông Thành. Năm 2010, cô được nhận vào Học viện Điện ảnh Bắc Kinh.",
    "aliases": [
      "dương tử",
      "yang zi",
      "duong tu",
      "andy",
      "杨旎奥",
      "zi yang",
      "yang niao",
      "yang ni ao",
      "andy yang",
      "ヤン・ズー",
      "ян ни ао",
      "یانگ زی"
    ],
    "featured": false
  },
  {
    "slug": "bach-loc",
    "name": "Bạch Lộc",
    "englishName": "Bai Lu",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "gender": 1,
    "tags": [
      "Cổ trang",
      "Tình cảm"
    ],
    "roles": "Diễn viên truyền hình",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/8vQfjg60RUkbIodw6FgrLteHBo7.jpg",
    "tmdbPersonId": 1879666,
    "birthday": "1994-09-23",
    "placeOfBirth": "Changzhou, Jiangsu Province, China",
    "bio": "Bạch Lộc (tiếng Trung: 白鹿; Bính âm: Bái lù), tên khai sinh là Bạch Mộng Nghiên (tiếng Trung: 白梦妍, sinh ngày 23 tháng 9 năm 1994), là một nữ diễn viên,người mẫu người Trung Quốc. Năm 2024, Bạch Lộc trở thành diễn viên cấp III quốc gia ở Trung Quốc đại lục.\nCô được khán giả biết đến rộng rãi qua các bộ phim Chiêu Diêu, Học Viện Quân Sự Liệt Hoả, Châu Sinh Như Cố, Trường Nguyệt Tẫn Minh, Dĩ Ái Vi Doanh, Ninh An Như Mộng, Bạch Nguyệt Phạn Tinh và Lâm Giang Tiên.\n\nTiểu sử:\n\nBạch Lộc sinh ngày 23 tháng 9 năm 1994 tại Thường Châu, Giang Tô. Từ nhỏ, Bạch Lộc đã tiếp xúc và yêu thích văn hóa Hàn Quốc. Năm 2012, Bạch Lộc đến Thượng Hải, tham gia đợt tuyển thực tập sinh hải ngoại của SM Entertainment, nhưng đã bị từ chối. Sau đó, Bạch Lộc nhận được lời mời và bắt đầu công việc làm mẫu ảnh song song với việc học. Từ 2013 đến 2016, Bạch Lộc làm mẫu ảnh cho các cửa hàng Taobao OLDTIMES, The Ninth Piece Of The Sea, các studio, nhiếp ảnh gia, chụp hình tạp chí, bìa sách, quay chụp quảng cáo, đồng thời tham gia một số phim ngắn mang phong cách duy mỹ của đạo diễn CatTree.\nBạch Lộc học khoa Tiếng Anh thương mại của Trường Kỹ Thuật Nghề - Du Lịch và Thương Mại Thường Châu và tốt nghiệp vào năm 2015. Trong thời gian đi học, cô nhiều lần đoạt danh hiệu học sinh ba tốt, đoàn viên ưu tú; được trao giải nhất cuộc thi viết văn Phong cách Văn Minh lần thứ ba của tỉnh Giang Tô. Tháng 7 năm 2016, Bạch Lộc ký hợp đồng với Hoan Ngu Ảnh Thị, chính thức gia nhập vòng giải trí, mở ra sự nghiệp diễn xuất. Ngày 18 tháng 7 cùng năm, MV Lưu Ngôn của Lục Hổ có sự góp mặt của Bạch Lộc ra mắt công chúng, được đánh dấu là tác phẩm đầu tiên của cô trong giới giải trí.",
    "aliases": [
      "bạch lộc",
      "bai lu",
      "bach loc",
      "白梦妍",
      "бай мэн янь",
      "bai meng yan",
      "بای لو",
      "بای‌لو",
      "bai mengyan"
    ],
    "featured": false
  },
  {
    "slug": "trieu-lo-tu",
    "name": "Triệu Lộ Tư",
    "englishName": "Zhao Lusi",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "gender": 1,
    "tags": [
      "Cổ trang",
      "Tình cảm",
      "Hài"
    ],
    "roles": "Mỹ nhân cổ trang • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/y82wmaDqTdXqvtasb4kxAIuT44U.jpg",
    "tmdbPersonId": 2049994,
    "birthday": "1998-11-09",
    "placeOfBirth": "Chengdu, Sichuan Province, China",
    "bio": "Triệu Lộ Tư  (giản thể: 赵露思; phồn thể: 趙露思; bính âm: Zhào Lùsī; sinh ngày 9 tháng 11 năm 1998) là một nữ diễn viên người Trung Quốc.\n\nSự nghiệp:\n\nTriệu Lộ Tư bắt đầu tham gia ngành công nghiệp giải trí Trung Quốc vào năm 2016 bằng việc đăng ký tham gia buổi tuyển chọn \"Super Girl\" của Đài Truyền hình Hồ Nam. Cùng năm, cô tham gia chương trình tạp kỹ khoa học viễn tưởng \"Cục Tình Báo Sao Hỏa mùa 2\" được phát sóng trên Youku.\nNăm 2017, cô tham gia bộ phim \"Phượng Tù Hoàng\", chính thức bước chân vào sự nghiệp diễn viên, tuy chỉ là vai diễn phụ nhưng cô được khán giả đặc biệt chú ý vì khả năng diễn xuất hết sức nổi bật của mình thậm chí lấn át dàn diễn viên chính Ngày 1 tháng 7 năm 2017, tham gia chương trình tạp kỹ khoa học viễn tưởng nổi tiếng nhất thế giới\"Cục tình báo sao Hỏa mùa 3\" được phát sóng trên Youku, sau đó, cô tham gia bộ phim điện ảnh cổ trang giả tưởng \"Tây Du chi Tịnh Đàn sứ giả\". Ngày 29 tháng 9, bộ phim điện ảnh \"Ban nhạc máy khâu\" có sự tham gia của Triệu Lộ Tư được phát sóng.\nNgày 23 tháng 4 năm 2018, bộ phim lãng mạn chủ đề ẩm thực \"Manh thê Thực Thần\" có cô tham gia được phát sóng trên Tencent Video. Ngày 25 tháng 4, cô đóng vai chính trong bộ phim lãng mạn \"Ôi, Hoàng đế bệ hạ của ta\", bộ phim đã được phát hành trên Tencent Video, đây là bộ phim đầu tiên cô tham gia đóng chính, đồng thời cô cũng thực hiện ca khúc \"Tựa như rơi vào biển tình\" cho bộ phim cùng với Cốc Gia Thành.\nNgày 12 tháng 1 năm 2019, cô đã giành được giải thưởng \"Diễn viên tiềm năng nhất thập kỉ (phim chiếu mạng)\" tại Liên hoan phim và truyền hình Kim Cốt Đóa lần thứ 3. Ngày 28 tháng 1, bộ phim \"Câu chuyện cảm động nhất\" do cô cùng với Vương Dĩ Luân đóng vai chính chính thức phát sóng. Ngày 14 tháng 2, bộ phim điện ảnh tình cảm đô thị \"Lam sắc sinh tử luyến\" do cô đóng vai chính được phát hành trên toàn quốc. Ngày 30 tháng 5, bộ phim giả tưởng \"Thanh Nang truyện\" do cô cùng với Lý Hoành Nghị đóng vai chính được phát sóng trên mọi nền tảng. Ngày 5 tháng 7, bộ phim cổ trang \"Thiên lôi nhất bộ chi Xuân hoa thu nguyệt\" do cô và Lý Hoành Nghị một lần nữa hợp tác đóng vai chính được phát sóng trên Youku. Ngày 8 tháng 11, tham gia chương trình tạp kỹ \"Real Actor\" được phát sóng trên Youku.\nNgày 19 tháng 3 năm 2020, bộ phim \"Tam thiên nha sát\" do cô và Trịnh Nghiệp Thành đóng vai chính được công chiếu Mango TV. Ngày 18 tháng 5, bộ phim tình cảm cổ trang \"Trần Thiên Thiên, ngày ấy bây giờ\" do cô đóng vai chính được phát sóng trên Tencent Video. Ngày 1 tháng 9, bộ phim hài lãng mạn \"Quốc Tử Giám có một nữ đệ tử\" do Triệu Lộ Tư đóng vai chính được phát sóng trên Tencent Video. Ngày 15 tháng 9, bộ phim tình cảm đô thị \"Yêu em từ dạ dày\" do cô đóng vai chính được phát sóng trên Tencent Video, đồng thời thể hiện ca khúc chủ đề \"Em thích anh\" cho bộ phim. Ngày 27 tháng 10, cùng với Dương Dương tham gia đóng vai chính trong bộ phim cổ trang \"Thả thí thiên hạ\".",
    "aliases": [
      "triệu lộ tư",
      "zhao lusi",
      "trieu lo tu",
      "zhao lu si",
      "짜오루스",
      "lusi zhao",
      "rosy zhao",
      "чжао лу сы",
      "ژائو لوسی"
    ],
    "featured": false
  },
  {
    "slug": "ngu-thu-han",
    "name": "Ngu Thư Hân",
    "englishName": "Esther Yu",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "gender": 1,
    "tags": [
      "Cổ trang",
      "Tình cảm",
      "Hài"
    ],
    "roles": "Diễn viên • Ca sĩ",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/xQ2Bur9AEy0IX3qHMvLbr7tmTyD.jpg",
    "tmdbPersonId": 2140103,
    "birthday": "1995-12-18",
    "placeOfBirth": "Shanghai, China",
    "bio": "Ngu Thư Hân (giản thể: 虞书欣; bính âm: Yú Shūxīn; tên tiếng Anh: Esther Yu; sinh ngày 18 tháng 12 năm 1995) là một nữ diễn viên và ca sĩ người Trung Quốc. Cô là cựu thành viên của nhóm nhạc nữ THE9. Ngu Thư Hân bắt đầu được chú ý qua các vai diễn trong Trạm kế tiếp là hạnh phúc (2020), Khúc biến tấu ánh trăng (2021), Thương Lan quyết (2022) và Vĩnh Dạ Tinh Hà (2024).\n\nTiểu sử:\n\nThông tin:\n\nNgu Thư Hân sinh ra tại Thượng Hải, Trung Quốc và là con một trong gia đình làm về kinh doanh, bất động sản. Bản thân cô cũng là cổ đông và chủ sở hữu của nhiều công ty lớn nhỏ tại Trung Quốc. Cô theo học tại học viện nghệ thuật LASALLE College of the Arts, và tốt nghiệp ngành Truyền thông & Công nghệ thời trang.\n\nSự nghiệp:\n\nNăm 2015, Ngu Thư Hân ra mắt với một vai phụ trong bộ phim cổ trang Tân Biên thành lãng tử,, chính thức bước chân vào showbiz.  Sau đó, cô đã nhận được sự chú ý khi góp mặt trong chương trình truyền hình thực tế Sinh viên năm nhất. Vào năm 2017, cô tiếp tục diễn vai phụ trong hai bộ phim Quân sư liên minh và Bình phàm tuế nguyệt.\nNăm 2018, Ngu Thư Hân đảm nhận vai chính đầu tiên của mình trong bộ phim tình cảm học đường Bạn thân mến. Năm 2019, cô đóng vai nữ chính Điền Tịnh Thực, một nữ minh tinh trong bộ phim hài lãng mạn Bạn trai vi diệu cúa tôi 2.\nNăm 2020, Ngu Thư Hân trở nên nổi tiếng và được công nhận với vai Thái Mẫn Mân, cô sinh viên dễ thương hoạt bát trong bộ phim tình cảm lãng mạn đình đám Trạm kế tiếp là hạnh phúc. Tiếp đó, Ngu Thư Hân cũng tham gia bộ phim Thiếu chủ, đi chậm thôi trong vai nữ chính Điền Tam Thất, một thiếu nữ hành nghề pháp y giỏi phá án.\nCô còn xuất hiện trong chương trình truyền hình thực tế sống còn Thanh xuân có bạn 2 và cuối cùng thành công ra mắt trong nhóm nhạc THE9. Cuối năm 2020, cô góp mặt với vai khách mời đặc biệt trong bộ phim Chuyện tình của thiếu gia và tôi.\nTháng 5 năm 2021, Ngu Thư Hân quay trở lại màn ảnh với vai nữ chính Sơ Lễ, một biên tập viên vừa mới tốt nghiệp trong bộ phim Khúc biến tấu ánh trăng. Ngày 5 tháng 12 năm 2021, nhóm nhạc nữ THE9 chính thức giải tán.\nTháng 8 năm 2022, cô đảm nhiệm vai nữ chính Hoa Lan Nhỏ trong bộ phim cổ trang tiên hiệp Thương Lan quyết-bộ phim đã làm mưa làm gió mùa hè năm đó, một bước đưa tên tuổi Ngu Thư Hân vụt sáng. Tháng 9 cùng năm, phim tình cảm đô thị Khu rừng nhỏ của hai người do cô hợp tác cùng Trương Bân Bân chính thức lên sóng.\nTháng 9 năm 2023, bộ phim cổ trang Vân chi vũ do Ngu Thư Hân đảm nhận vai nữ chính lên sóng trên nền tảng iQIYI.\nTháng 11 năm 2024, bộ phim Vĩnh Dạ Tinh Hà do Ngu Thư Hân diễn vai nữ chính chính thức lên sóng trên WeTV (Tencent Video), cô đảm nhận vai nữ chính Lăng Diệu Diệu (Lâm Ngu). Bộ phim đã tạo được độ hot lớn nhờ vào cốt truyện hấp dẫn và diễn xuất ấn tượng của dàn diễn viên chính.",
    "aliases": [
      "ngu thư hân",
      "esther yu",
      "ngu thu han",
      "yu shu xin",
      "shuxin yu"
    ],
    "featured": false
  },
  {
    "slug": "la-van-hi",
    "name": "La Vân Hi",
    "englishName": "Luo Yunxi",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "gender": 2,
    "tags": [
      "Cổ trang",
      "Tình cảm",
      "Võ thuật"
    ],
    "roles": "Nam thần cổ trang • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/5tVSpBy1IcnwaxPCUx1dZIGT5TP.jpg",
    "tmdbPersonId": 2085450,
    "birthday": "1988-07-28",
    "placeOfBirth": "Chengdu, Sichuan, China",
    "bio": "La Vân Hi (sinh ngày 28 tháng 7 năm 1988), tên thật là La Dực (tiếng Trung: 罗弋), tên tiếng Anh là Leo (Còn gọi là Leo Luo), là một ca sĩ, diễn viên người Trung Quốc.\nNăm 2010, La Vân Hi xuất đạo với thân phận là một trong 3 thành viên chính của nhóm nhạc nam JBOY3 . Năm 2015, bằng vai diễn \"Hà Dĩ Thâm thời niên thiếu\" trong bộ phim Bên Nhau Trọn Đời (tên tiếng Trung: 何以笙箫默), La Vân Hi lần đầu tiên bộc lộ tài năng về mặt diễn xuất, bắt đầu nhận được sự chú ý và độ thảo luận từ phía khán giả. Năm 2017, anh tham gia vào bộ phim Bác sĩ Nhi Khoa (tên tiếng Trung: 儿科医生) được phát sóng tại đài truyền hình Sơn Đông với vai nam chính \"Thân Hách\". Năm 2018, anh tham gia vào bộ phim tiên hiệp, huyền huyễn Hương Mật Tựa Khói Sương  (tên tiếng Trung: 香蜜沉沉燼如霜) với vai Dạ Thần Nhuận Ngọc. Diễn xuất của La Vân Hi trong bộ phim này đã thuyết phục người xem bởi nhan sắc thần tiên, thoát tục, khí chất và phong thái đĩnh đạc, điềm đạm nhưng lại rất bản lĩnh, mạnh mẽ. Đây cũng là vai diễn góp phần đưa tên tuổi của anh đến gần hơn với khán giả.\n\nTiểu sử:\n\nLa Vân Hi sinh ra ở thành phố Thành Đô, tỉnh Tứ Xuyên, Trung Quốc. Thành phố này được mệnh danh là Thiên Phủ Chi Quốc - đất nước thiên đường, hay thường được gọi là thành phố hạnh phúc nhất Trung Quốc. Anh xuất thân từ gia đình thư hương, cả bố và mẹ đều là giáo viên. Anh là con một không có anh chị em.\nBởi vì bố anh là giáo viên dạy múa, cho nên từ nhỏ La Vân Hi đã có niềm yêu thích đặc biệt với múa. Về sau anh chịu sự ảnh hưởng của bố mà bắt đầu học tập ballet. Năm 2003, La Vân Hi bằng tiết mục biến tấu \"Vương Tử Hồ Thiên Nga\" mà tiến vào chung kết giải múa đơn cúp học sinh lần thứ 7. Năm 2005, anh đồng thời trúng tuyển vào Học viện Vũ Đạo Bắc Kinh và Học viện Hý Kịch Thượng Hải, lựa chọn Học viện Hý Kịch Thượng Hải, khoa trình diễn ballet chuyên nghiệp để học tập. Anh có 11 năm theo học múa dân gian và múa ballet chuyên nghiệp, cho nên vào năm 2008, anh được đại diện Học viện Hý Kịch Thượng Hải tham dự giải thi đấu múa lần thứ 6 cúp Hoa Sen tại Trung Quốc. Anh tham gia biểu diễn bản giao hưởng ballet \"Khúc nhạc cuồng tưởng của Tchaikovsky\" do viện trưởng Trần Gia Niên biên đạo và một bài biểu diễn đơn ngẫu hứng \"Ngọn lửa thiêu đốt\". \"Khúc nhạc cuồng tưởng của Tchaikovsky\" đã đạt được thành tích 9.98 điểm, trở thành quán quân của mùa giải và thu về chiếc cúp Hoa Sen vàng.",
    "aliases": [
      "la vân hi",
      "luo yunxi",
      "la van hi",
      "luo yun xi",
      "leo",
      "luo yun-xi",
      "yunxi luo",
      "leo luo",
      "罗弋",
      "luo yi ",
      "لو یونشی",
      "لو یون‌شی"
    ],
    "featured": false
  },
  {
    "slug": "nham-gia-luan",
    "name": "Nhậm Gia Luân",
    "englishName": "Ren Jialun",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "gender": 2,
    "tags": [
      "Cổ trang",
      "Tình cảm",
      "Chính kịch"
    ],
    "roles": "Diễn viên cổ trang",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/5sBfnbHbTmNriFPGGD12mPpTNNO.jpg",
    "tmdbPersonId": 2084465,
    "birthday": "1989-04-11",
    "placeOfBirth": "Qingdao, Shandong Province, China",
    "bio": "Nhậm Gia Luân (tiếng Trung: 任嘉伦, tiếng Anh: Allen Ren) tên khai sinh Nhậm Quốc Siêu là diễn viên, ca sĩ người Trung Quốc. Anh được biết tới qua vai diễn Quảng Bình Vương Lý Thục trong phim Đại Đường vinh diệu.\n\nTiểu sử:\n\nNhậm Gia Luân xuất thân là vận động viên bóng bàn cùng khóa với Chu Du và Trương Kế Khoa. Tuy nhiên anh phải bỏ môn thể thao này vì chấn thương.\nNăm 2011 trở thành thực tập sinh tại Hàn Quốc từng đảm nhiệm vị trí đội trưởng, vũ đạo và rapper chính trong một nhóm nhạc hợp tác Trung-Hàn (Nhóm chưa debut).\n\nSự nghiệp:\n\nNăm 2014, trở về từ Hàn Quốc, đảm nhận vai chính đầu tiên trong sự nghiệp là \"Thông thiên Địch Nhân Kiệt\" vai Địch Nhân Kiệt, nhưng bộ phim bị trì hoãn và phát sóng năm 2017.\nNăm 2016, tham gia bộ phim truyền hình cổ trang \"Thanh Vân Chí\" vai Lục Vỹ. Cùng năm đó tham gia phim \"Long Châu Truyền Kỳ\" với vai khách mời. Năm 2017, Nhậm Gia Luân nổi lên nhờ bộ phim cổ trang \"Đại Đường Vinh Diệu\" với vai Quảng Bình Vương Lý Thục.\nNăm 2018, anh đóng vai chính trong bộ phim tình cảm thanh xuân thần thoại \"Thiên Kê Chi Bạch Xà Truyền Thuyết\" vai Hứa Tuyên, Tử Tuyên.\nNăm 2019, anh đóng vai chính trong bộ phim truyền hình \"Cẩm Y Chi Hạ\" vai Lục Dịch và vai chính phim cổ trang ''Mộ Bạch Thủ'' vai Lâm Kính, Na Lam Nhạc\nNăm 2021, anh đóng vai chính trong bộ phim tình cảm, lãng mạn \"Tiểu thư quạ đen và tiên sinh thằn lằn\" vai Cố Xuyên.\nNăm 2021, anh đóng vai chính trong bộ phim \"Không Nói Tạm Biệt vai Mục Thanh (Lưu Viễn Văn).\nNăm 2021, anh đóng vai nam chính Châu Sinh Thần trong 2 bộ phim \"Châu Sinh Như Cố\" (Tên cũ Trường An Như Cố) và \"Một Đời Một Kiếp\", cả 2 phim được chuyển thể từ bộ tiểu thuyết \"Cốt cách mỹ nhân\" của Mặc Bảo Phi Bảo.\nNăm 2022, Nhậm Gia Luân xuất hiện với vai nam chính Trường Ý trong phim \"Ngự Giao Ký\", gồm hai phần là \"Dữ Quân Sơ Tương Thức\" và \"Kháp Tự Cố Nhân Quy\", được cải biên từ tiểu thuyết \"Ngự Yêu\" của Cửu Lộ Phi Hương.\nNăm 2022, Nhậm Gia Luân với vai diễn người lính cứu hoả Lý Khê Thành trong bộ phim truyền hình cứu hỏa đô thị \"Lam Diễm Đột Kích\" đã chính thức ra mắt tại Truyền hình vệ tinh Giang Tô. Là bộ phim truyền hình tập trung vào đề tài phòng cháy chữa cháy sẽ giúp khán giả có cái nhìn tích cực về cuộc sống và sự nghiệp, đồng thời hướng công chúng chú ý đến những vất vả và nỗ lực đằng sau của những người lính cứu hỏa.\nTháng 9 năm 2022, Nhậm Gia Luân tiếp tục xuất hiện trong bộ phim Thỉnh Quân kể về câu chuyện tình yêu dở khóc dở cười của tướng quân ngàn năm Lục Viêm do Nhậm Gia Luân đóng với sức mạnh thần bí vô tình quen biết với một nữ trại chủ, mở ra câu chuyện về mối tình duyên ngàn năm.\nNăm 2023, bộ phim Mộ Sắc Tâm Ước do Nhậm Gia Luân thủ vai là một nhà biên kịch trẻ tuổi, tính cách vui vẻ, nói nhiều, thỉnh thoảng chill chill bằng những điệu nhảy và cực kỳ nhập tâm, thích hóa thân vào nhân vật trong truyện của chính mình lên sóng tại Tencent. Bộ phim được cải biên từ tiểu thuyết \"Hẹn ước hoàng hôn\".",
    "aliases": [
      "nhậm gia luân",
      "ren jialun",
      "nham gia luan",
      "ren jia lun",
      " 任嘉伦",
      "jialun ren",
      "任嘉倫",
      "allen ren",
      "ren guo chao",
      "任国超",
      "เหรินเจียหลุน",
      "رن جیالون",
      "жэнь цзялунь",
      "ren guochao",
      "prince",
      "leader",
      "жэнь го чао"
    ],
    "featured": false
  },
  {
    "slug": "cung-tuan",
    "name": "Cung Tuấn",
    "englishName": "Gong Jun",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "gender": 2,
    "tags": [
      "Cổ trang",
      "Tình cảm"
    ],
    "roles": "Diễn viên truyền hình",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/4KInYhdUoeV7Pd6eMQGcrhQVOWC.jpg",
    "tmdbPersonId": 1820070,
    "birthday": "1992-11-29",
    "placeOfBirth": "Chengdu, Sichuan, China",
    "bio": "Cung Tuấn (tiếng Trung: 龚俊; bính âm: Gōngjùn; tiếng Anh: Simon Gong, sinh ngày 29 tháng 11 năm 1992) là một nam diễn viên người Trung Quốc. Anh được biết đến nhiều nhất với vai diễn Ôn Khách Hành trong bộ phim Sơn Hà Lệnh (2021).\n\nTiểu sử:\n\n\"Tôi không phải sinh ra đã biết đóng phim, cần phải nghiền ngẫm thật nhiều và học hỏi thêm nhiều hơn nữa. Trong diễn xuất mình đang theo, tất nhiên sẽ có những ước muốn nhỏ thuộc về riêng mình. Tôi muốn được mọi người công nhận, cho nên phải làm tốt mọi việc cùng một lúc, đây cũng là một quá trình đi lên hoàn thiện.\"\nCung Tuấn sinh ra và lớn lên ở Thành Đô, Tứ Xuyên, Trung Quốc. Mối nhân duyên của Cung Tuấn đối với diễn xuất bắt nguồn từ những người bạn cùng lớp khi họ đang học diễn xuất, anh tò mò và bắt đầu tìm hiểu, từ đó quyết tâm đến Bắc Kinh để theo đuổi giấc mơ diễn xuất.\nVào năm 2015, Cung Tuấn xuất hiện lần đầu trong webdrama cổ trang Đao Kiếm Liễu Loạn.\nNăm 2017, đóng vai chính trong bộ phim hài hành động Thịnh Thế. Sau đó, được biết đến nhiều hơn với vai Thập Nhất hoàng tử trong bộ phim lịch sử giả tưởng Túy Linh Lung. Cùng năm, ra mắt màn ảnh rộng trong bộ phim hồi hộp giả tưởng Rebirth Partner.\nNăm 2018, Cung Tuấn đóng vai chính trong bộ phim truyền hình tiên hiệp Chỉ Tiêm Thiếu Niên. Cùng năm, được chọn vào bộ phim dành cho giới trẻ Vừa Lúc Em Tỏa Sáng.\nNăm 2019, đóng vai chính trong bộ phim cổ trang lãng mạn Thiên Kim Háo Sắc, tiếp theo là bộ phim giả tưởng lãng mạn Cô Gái Nhìn Thấy Mùi Hương.\nNăm 2020, Cung Tuấn đóng nam chính trong bộ phim tình cảm thanh xuân Gửi Thời Mỹ Mãn Ngọt Ngào Của Chúng Ta, dựa trên cuốn tiểu thuyết cùng tên, thuộc series Gửi thời thanh xuân của tác giả Triệu Kiền Kiền.\nTháng 3 năm 2021, bộ phim giang hồ võ hiệp Sơn Hà Lệnh (chuyển thể từ tiểu thuyết đam mỹ Thiên Nhai Khách của Priest) phát sóng độc quyền trên nền tảng Youku, Cung Tuấn đảm nhận vai Ôn Khách Hành, Cốc chủ Quỷ cốc. Với nội dung hấp dẫn, chế tác tốt, kịch bản ổn định, bộ phim đạt thành công ngoài mong đợi, giúp đưa tên tuổi Cung Tuấn cũng như dàn diễn viên đến gần hơn với công chúng.\n\"Ý nghĩa của nhân vật không phải do tôi trao cho cậu ấy, mà sự tồn tại của chính cậu ấy mới thật sự là ý nghĩa, diễn viên cũng chỉ là một trong những <vật dẫn> của nhân vật.\"\n\nPhim tham gia:",
    "aliases": [
      "cung tuấn",
      "gong jun",
      "cung tuan",
      "simon gong",
      "공준",
      "龔俊",
      "гун цзюнь",
      "龚俊",
      "گونگ جون"
    ],
    "featured": false
  },
  {
    "slug": "vuong-hac-de",
    "name": "Vương Hạc Đệ",
    "englishName": "Dylan Wang",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "gender": 2,
    "tags": [
      "Cổ trang",
      "Tình cảm"
    ],
    "roles": "Diễn viên • Ngôi sao thế hệ mới",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/7YITQE9XpeaOIWJsV6TTzaPilSW.jpg",
    "tmdbPersonId": 2050456,
    "birthday": "1998-12-20",
    "placeOfBirth": "Leshan, Sichuan Province, China",
    "bio": "Vương Hạc Đệ (tiếng Trung: 王鹤棣; bính âm: Wáng Hè Dì; sinh ngày 20 tháng 12 năm 1998) là một diễn viên và ca sĩ người Trung Quốc. Anh được biết đến với vai diễn đầu tay Đạo Minh Tự trong bộ phim Vườn sao băng (2018), và vai diễn đột phá Đông Phương Thanh Thương trong Thương Lan quyết (2022).\n\nTiểu sử:\n\nVương Hạc Đệ sinh ngày 20 tháng 12 năm 1998 tại Lạc Sơn, Tứ Xuyên, trong một gia đình mà cha mẹ làm việc tại một nhà máy dược phẩm địa phương. Sau đó, gia đình anh mở một quán bán đồ chiên xiên. Từ nhỏ, Vương Hạc Đệ đã có niềm đam mê với bóng rổ và thần tượng LeBron James. Năm 14 tuổi, anh chuyển đến Thành Đô để theo học tại một trường trung học dạy nghề và sau đó là Học viện Hàng không Tây Nam Tứ Xuyên. Trong thời gian học, anh đã trở thành người mẫu cho các áp phích tuyển sinh của chương trình đào tạo tiếp viên hàng không của trường. Năm 2016, anh giành giải quán quân tại cuộc thi Tài Năng Thanh Xuân của các trường đại học ở Tứ Xuyên, đánh dấu bước ngoặt đầu tiên trong sự nghiệp giải trí của mình.\nAnh từng là tiếp viên hàng không cấp 16, và là người mẫu trên áp phích nhập học của Học viện hàng không Tây Nam Tứ Xuyên. Trước khi ra mắt trong giới giải trí, anh cũng đã trở thành người phát ngôn hình ảnh cho các tiếp viên hàng không.\n\nSự nghiệp:\n\nNăm 2016, Vương Hạc Đệ giành giải quán quân chung cuộc tại Sichuan Campus Red Festival (四川校园红人盛典), một lễ hội được tài trợ bởi các trường đại học/ cao đẳng, và chính thức bước chân vào làng giải trí.\nVào tháng 6 năm 2017, Vương Hạc Đệ tham gia chương trình Siêu thứ nguyên thần tượng của Youku và trở thành người chiến thắng cuối cùng.\nVương Hạc Đệ trở nên nổi tiếng với vai chính đầu tiên Đạo Minh Tự trong bộ phim Tân vườn sao băng năm 2018. Tháng 1 năm 2019, Vương Hạc Đệ đóng vai nam chính của Tương dạ 2. Bộ phim lên sóng vào tháng 1 năm 2020. Tháng 6 năm 2019, anh tiếp tục tham gia bộ phim Liên đại Tây Nam của chúng ta.\nTháng 3 năm 2021, Vương Hạc Đệ đóng cùng Tần Lam trong bộ phim Cuộc sống lý trí. Tháng 5 cùng năm, anh diễn vai nam chính của bộ phim Ngộ Long. Năm 2022, ngoài vai diễn Đông Phương Thanh Thương trong Thương Lan quyết giúp anh đạt được sự chú ý rộng rãi, anh còn tham gia các chương trình tạp kỹ như 50km Đào Hoa Ổ và Xin Chào Thứ 7. Cuối năm, anh ra mắt thương hiệu thời trang đường phố của riêng mình mang tên D.DESIRABLE.\nNăm 2023, anh xuất hiện trong một số bộ phim truyền hình như Phù Đồ duyên, Hôm nay phải cố lên (phim hài tình huống nơi công sở), và Dĩ Ái Vi Doanh (phim tình cảm đô thị). Đầu năm 2024, Vương Hạc Đệ tham gia NBA All-Star Celebrity Game và hoàn thành các dự án như Đại Phung Đả Canh Nhân và Hắc Dạ Cáo Bạch. Cùng năm, anh nhận vai chính đầu tiên trong một bộ phim điện ảnh, tác phẩm khoa học viễn tưởng Per Aspera Ad Astra.\n\nPhim:\n\nĐiện ảnh:",
    "aliases": [
      "vương hạc đệ",
      "dylan wang",
      "vuong hac de",
      "wang he di",
      "wang hedi",
      "didi",
      " hedi wang"
    ],
    "featured": false
  },
  {
    "slug": "ngo-loi",
    "name": "Ngô Lỗi",
    "englishName": "Leo Wu",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "gender": 2,
    "tags": [
      "Cổ trang",
      "Hành động",
      "Tình cảm"
    ],
    "roles": "Em trai quốc dân • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/43fYrqW26tisHBblj9lazersTdr.jpg",
    "tmdbPersonId": 1438264,
    "birthday": "1999-12-26",
    "placeOfBirth": "Shanghai, China",
    "bio": "Ngô Lỗi (giản thể: 吴磊; phồn thể: 吳磊, sinh ngày 26 tháng 12 năm 1999) là một nam diễn viên Trung Quốc. Anh được biết đến với biệt danh \"Em trai quốc dân\" (tiếng Trung: 国民弟弟) ở Trung Quốc.\nNgô Lỗi xếp thứ 63 trong Danh sách 100 ngôi sao nổi tiếng Trung Quốc theo Forbes vào năm 2017, thứ 29 vào năm 2019 và thứ 47 vào năm 2020.\n\nTiểu sử & Giáo dục:\n\nNgô Lỗi sinh ra tại Thượng Hải, Trung Quốc có quê gốc là thành phố Quảng An, tỉnh Tứ Xuyên. Anh lớn lên ở Thành Đô, theo học trường trung học cơ sở Liewu ở Thành Đô. Năm 2018, Ngô Lỗi trúng tuyển vào Học viện Điện ảnh Bắc Kinh với tổng điểm 456 trong kỳ thi tuyển sinh đại học, đạt vị trí thủ khoa toàn quốc. Ngày 14 tháng 9 năm 2021, khi Ngô Lỗi sắp tốt nghiệp năm cuối đã phát biểu với tư cách là đại diện của Học viện.\n\nSự nghiệp:\n\n2006–2012: Sự khởi đầu:\n\nNăm 2002, Ngô Lỗi xuất hiện trong quảng cáo của thương hiệu thực phẩm chức năng Huang Jin Da Dang, và tham gia hơn 50 quảng cáo trong hai năm tiếp theo. Ngô Lỗi ra mắt với tư cách diễn viên trong bộ phim truyền hình Phong thần bảng: Phượng minh Kỳ sơn với vai Na Tra.\nNgô Lỗi bắt đầu được chú ý nhờ vai diễn trong các bộ phim truyền hình dành cho trẻ em như Nhà có người ngoài hành tinh (2009) và Nhóc tỳ Mã Tiểu Khiêu (2010), mà anh đã giành được giải \"Diễn viên nhí xuất sắc\" tại Giải Phi thiên lần thứ 28. Anh nâng tầm danh tiếng với vai diễn trong bộ phim truyền hình võ thuật Tự cổ anh hùng xuất thiếu niên (2012).\n\n2014 – nay: Sự nổi tiếng ngày càng tăng và chuyển sang các vai chính:\n\nNăm 2014, Ngô Lỗi góp mặt trong bộ phim truyền hình kiếm hiệp Thần điêu đại hiệp (2014) do Vu Chính sản xuất và nhận được nhiều lời khen ngợi cho vai diễn Dương Quá thời trẻ.\nNăm 2015, Ngô Lỗi vào vai Lý Tiêu Dao trong web drama Thiên Tiêu Quái Kiếm (2015) và xác nhận quay video quảng bá cho tựa game cùng tên. Bộ phim đạt được hơn 300 triệu lượt xem và trở thành đề tài bàn luận sôi nổi trên mạng. Sau đó, nhờ việc hai bộ phim Thiếu nữ toàn phong (2015) và bộ phim truyền hình võ hiệp Lang Nha Bảng (2015) nhận được sự đón nhận nồng nhiệt, khiến anh ngày càng được công nhận.",
    "aliases": [
      "ngô lỗi",
      "leo wu",
      "ngo loi",
      "吴磊",
      "吳磊",
      "wú lěi",
      "wu lei",
      "leo",
      "leilei",
      "lei wu",
      "у лэй",
      "лэй шао",
      "lei shao",
      "磊少",
      "лео у",
      "لئو وو",
      "لیو وو",
      "อู๋ เหล่ย"
    ],
    "featured": false
  },
  {
    "slug": "dich-duong-thien-ti",
    "name": "Dịch Dương Thiên Tỉ",
    "englishName": "Jackson Yee",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "gender": 2,
    "tags": [
      "Chính kịch",
      "Tội phạm",
      "Hành động"
    ],
    "roles": "Ngôi sao điện ảnh • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/jbsqJKOzY8M5RisSX5A6tRm1H4O.jpg",
    "tmdbPersonId": 2223265,
    "birthday": "2000-11-28",
    "placeOfBirth": "Huaihua, Hunan, China",
    "bio": "Dịch Dương Thiên Tỉ (tiếng Trung: 易烊千玺, sinh ngày 28 tháng 11 năm 2000), là một diễn viên, ca sĩ và vũ công người Trung Quốc, thành viên nhóm nhạc thần tượng Trung Quốc TFBOYS từ năm 2013. Dịch Dương Thiên Tỉ xếp thứ nhất trong BXH ngôi sao có giá trị thương mại cao nhất năm 2019 do Sina thống kê và đứng đầu trong Danh sách 100 người nổi tiếng Trung Quốc liên tiếp hai năm 2020 và 2021 do Forbes bình chọn. Anh chiến thắng hạng mục Nam diễn viên chính xuất sắc nhất tại Giải Kim Kê (2025) và giải điện ảnh Bách Hoa (2026) nhờ vai Lưu Xuân Hòa trong phim điện ảnh Tôi nho nhỏ.\n\nTiểu sử:\n\nDịch Dương Thiên Tỉ sinh ngày 28 tháng 11 năm 2000 tại thành phố Hoài Hóa, tỉnh Hồ Nam, Trung Quốc.\nTừ nhỏ, anh được mẹ cho đi học các lớp nghệ thuật, từng xuất hiện trong một số chương trình truyền hình và quảng cáo. Lúc 5 tuổi đã bắt đầu luyện vũ đạo và thư pháp, thành thạo múa dân tộc, nhảy latin, street dance và từng đạt được nhiều giải thưởng.\nNăm 2018, Thiên Tỉ đỗ thủ khoa chuyên ngành biểu diễn điện ảnh và truyền hình của Học viện Hí Kịch Trung ương.\n\nSự nghiệp:\n\n2005 - 2012: Khởi đầu sự nghiệp:\n\nThiên Tỉ xuất hiện trong một số chương trình khác nhau từ năm 2005 đến năm 2008: Vào tháng 11 năm 2005, Thiên Tỉ tham gia chương trình Doanh trại huấn luyện tài nghệ của Đài Truyền hình Bắc Kinh, đạt giải quán quân của tuần. Vào tháng 5 năm 2007, anh tham dự chương trình Cây trí tuệ của Đài truyền hình Trung ương, nhận vai trò thầy giáo nhỏ. Tháng 7, tham dự quay chương trình Ngôi sao bát khu - Tiểu quỷ đương gia của Đài truyền hình Bắc Kinh, nhận vai trò khách quý được mời tới nhà.\nVào tháng 2 năm 2008, anh tham gia ghi hình tiết mục tối Tôi và Bắc Kinh cùng mỉm cười của Đài truyền hình Trung ương. Tháng 7, anh tham dự chương trình Trên đường trưởng thành. Tháng 8, anh tham dự Thiếu niên ngời sáng của Đài truyền hình Sơn Tây, đạt giải quán quân.\nVào ngày 8 tháng 8 năm 2009, anh tham dự chương trình Trên đường trưởng thành, biểu diễn ca khúc \"Bắc Kinh đón chào bạn\" và \"Tôi tin tưởng\". Cùng năm, Thiên Tỉ trở thành thành viên của nhóm Fashion Youngsters. Anh rời nhóm vào năm 2011.\nVào ngày 10 tháng 02 năm 2010, ở chương trình Khiêu chiến 60 giây, anh vượt qua bốn thử thách liên tiếp, thắng được 8000 NDT cho quỹ \"Giấc mộng\" dành cho trẻ em miền núi. Cùng năm, Thiên Tỉ tham gia diễn một đoạn ngắn trong bộ phim truyền hình Iron Pear.\nVào tháng 3 năm 2012, Thiên Tỉ tham gia chương trình tài năng thực tế Up Young của Đài truyền hình Hồ Nam và lọt vào top 100. Anh thu hút được sự chú ý của TF Entertainment và được mời thử giọng với công ty. Trước khi ra mắt cùng TFBOYS, Thiên Tỉ đã phát hành đĩa đơn đầu tiên \"Mơ về toà nhà cao chọc trời\". Anh cũng tham gia diễn xuất trong một số bộ phim ngắn và xuất hiện trong video âm nhạc \"Father\" của Chang Hohsuan.\n\n2013 - 2016: TFBOYS & Các hoạt động solo:",
    "aliases": [
      "dịch dương thiên tỉ",
      "jackson yee",
      "dich duong thien ti",
      "yi yangqianxi ",
      "jackson yi",
      "이양천새",
      "อี้หยางเชียนซี ",
      "イー・ヤンチェンシー",
      "ジャクソン・イー",
      "四字",
      "جکسون یی",
      "qianxi",
      "千玺",
      "джексон и"
    ],
    "featured": false
  },
  {
    "slug": "chu-nhat-long",
    "name": "Chu Nhất Long",
    "englishName": "Zhu Yilong",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "gender": 2,
    "tags": [
      "Chính kịch",
      "Tội phạm",
      "Kinh dị"
    ],
    "roles": "Ảnh đế • Diễn viên điện ảnh",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/tdm21vg4E7ubhd429UT1UpPpFGo.jpg",
    "tmdbPersonId": 1743471,
    "birthday": "1988-04-16",
    "placeOfBirth": "Wuhan, Hubei Province, China",
    "bio": "Chu Nhất Long (giản thể: 朱一龙; phồn thể: 朱一龍; bính âm: Zhū Yīlóng, sinh ngày 16 tháng 4 năm 1988) là một nam diễn viên người Trung Quốc. Anh tốt nghiệp khoa diễn xuất của Học viện Điện ảnh Bắc Kinh khóa 2006 (tốt nghiệp năm 2010). Anh được biết đến với các vai diễn trong phim truyền hình Tình định tam sinh (2014), Tân Tiêu Thập Nhất Lang (2016), Tân biên thành lãng tử (2016), Trấn Hồn (2018), Minh Lan Truyện (2018), Trùng Khởi Chi Cực Hải Thính Lôi (2020), Kẻ phản nghịch (2021).\n\nSự nghiệp:\n\n2009 - 2013: Khởi đầu:\n\nAnh ra mắt trong bộ phim Tái sinh duyên vào năm 2009. Sau đó, anh tham gia vào một chuỗi phim điện ảnh \"Nhi nữ truyền kỳ\" như: Tân nương bị đánh cắp, Ngôi nhà màu đỏ, Huyết Ngọc Chú,... Một trong những vai diễn đáng chú ý nhất trong sự nghiệp đầu tiên của anh là Chu Thường Tuân trong loạt phim Đại Minh Tần Phi; Tướng quân Quân Thực trong Đại Minh cung truyền kỳ, cũng như đóng vai một anh hùng dân tộc trong bộ phim chiến tranh Phong vũ phạm tịnh sơn.\n\n2014 - 2017: Phát triển:\n\nNăm 2014, anh lần đầu tiên được công nhận cho vai diễn trong bộ phim tình cảm dân quốc Tình định tam sinh với vai diễn hào môn thiếu gia Trì Thuỵ, đã mang lại cho anh giải thưởng \"Nam diễn viên được mong đợi nhất\" tại Lễ trao giải Đông phương Giải thưởng Ảnh hưởng Châu Á.\nNăm 2015, anh được công nhận nhiều hơn sau khi đóng vai Doanh Tắc trong bộ phim cổ trang nổi tiếng Mị Nguyệt Truyện.\nTháng 2/2016, anh góp mặt trong bộ phim truyền hình võ thuật Tân Tiêu Thập Nhất Lang, dựa trên cuốn tiểu thuyết cùng tên của Cổ Long. Anh đóng vai phản diện chính, Liên Thành Bích. Diễn xuất của anh đã mang lại cho anh giải thưởng Nam diễn viên phụ xuất sắc nhất tại Lễ trao giải TVS. Tháng 7, anh tham gia một bộ phim khác chuyển thể từ tiểu thuyết của Cổ Long - Tân Biên thành lãng tử. Và cũng nhờ Phó Hồng Tuyết trong bộ phim này cũng giúp anh được biết đến rộng rãi hơn.\nNgày 24/10/2016, anh thành lập Studio Thượng Hải – Phòng công tác Văn hóa Điện ảnh Truyền hình Chu Nhất Long (ngày 17/04/2019, đổi tên thành Studio Thượng Hải - Phòng công tác Văn hoá Điện ảnh Truyền hình Giản Đồ), là doanh nghiệp tư nhân do anh là người đại diện pháp luật.\nNgày 22/02/2017, anh thành lập Studio Đông Dương – Phòng công tác Văn hóa Điện ảnh Truyền hình Chu Nhất Long tại thành phố Đông Dương, Kim Hoa, tỉnh Chiết Giang, là doanh nghiệp tư nhân do anh là người đại diện pháp luật.\nNăm 2017, anh đóng nam chính trong bộ phim truyền hình Ngự tỷ trở về, cùng An Dĩ Hiên. Cùng năm, anh đóng vai phụ trong bộ phim điện ảnh Mật chiến bên cạnh Quách Phú Thành.\n\n2018 - 2020: Bứt phá Truyền hình:",
    "aliases": [
      "chu nhất long",
      "zhu yilong",
      "chu nhat long",
      "yilong zhu ",
      "朱一龙",
      "龙哥",
      "zhu yi long",
      "拢龙",
      "朱一龍",
      "zhu yi-long",
      "чжу и лун"
    ],
    "featured": false
  },
  {
    "slug": "truong-nhuoc-quan",
    "name": "Trương Nhược Quân",
    "englishName": "Zhang Ruoyun",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "gender": 2,
    "tags": [
      "Cổ trang",
      "Chính kịch",
      "Tội phạm"
    ],
    "roles": "Nam thần thực lực • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/dnNTcRc58ikoJ0JihisgXYTwr75.jpg",
    "tmdbPersonId": 1675905,
    "birthday": "1988-08-24",
    "placeOfBirth": "Beijing, China",
    "bio": "Trương Nhược Quân (giản thể: 张若昀; phồn thể: 張若昀; bính âm: Zhāng Ruòyún, sinh ngày 24 tháng 8 năm 1988) là một nam diễn viên người Trung Quốc. Anh tốt nghiệp Học viện Điện ảnh Bắc Kinh năm 2007.\n\nSự nghiệp:\n\n2004–2014: Khởi đầu:\n\nTrương Nhược Quân bắt đầu sự nghiệp diễn xuất của mình vào năm 2004, đóng vai phiên bản trẻ hơn của nam nhân vật chính trong The Sea's Promise. Anh lần đầu tiên được chú ý với vai diễn trong Snow Leopard (2010) và loạt phim đồng hành của nó, Black Fox (2011). Anh đã giành được giải thưởng Nam diễn viên mới được yêu thích nhất năm 2010 cho màn trình diễn trong Snow Leopard. Trương Nhược Quân đảm nhận vai chính đầu tiên trong bộ phim chiến tranh Sharp Sword.\nNăm 2014, anh đóng vai chính trong Tân tuyết báo, và đoạt giải Nam diễn viên chính xuất sắc tại Giải thưởng Phim truyền hình Trung Quốc.\n\n2015 – nay: Độ nổi tiếng ngày càng tăng:\n\nNăm 2015, Trương Nhược Quân đóng vai chính trong web drama Pháp sư Vô Tâm. Bộ phim nổi tiếng ở cả Trung Quốc và Đài Loan, đồng thời giúp anh được công nhận nhiều hơn trong khu vực. Sau đó, Trương Nhược Quân đóng vai chính trong bộ phim tình cảm Mười lăm năm chờ đợi chim di trú và các bộ phim truyền hình giả tưởng Cửu châu: Thiên Không thành và Truyền thuyết Thanh Khâu Hồ.\nNăm 2016, anh đóng vai phụ trong bộ phim truyền hình gián điệp ăn khách Ma Tước. Sự nổi tiếng của bộ phim đã đưa anh trở nên phổ biến rộng rãi, và anh đã giành được giải thưởng Nam diễn viên được yêu thích nhất tại Giải thưởng Phim truyền hình Trung Quốc. Sau đó, anh đóng chính cho Web drama Pháp y Tần Minh. Bộ phim đã thu được hơn 1,5 tỷ lượt xem trên Sohu TV và nhận được nhiều lời khen ngợi về cốt truyện cũng như diễn xuất của anh ấy. Cùng năm, Trương Nhược Quân đóng vai chính trong phim điện ảnh đầu tiên của mình, Bầu Trời Máu Lửa cùng Ngô Ngạn Tổ, Trương Tịnh Sơ.\nVào năm 2017, anh được chọn vào vai chính là Hoắc Khứ Bệnh trong bộ phim cổ trang cùng tên. Cùng năm, anh đóng vai chính trong bộ phim truyền hình Trung Quốc Dear Them làm lại từ bộ phim truyền hình Hàn Quốc Dear My Friends (Tình Bạn Tuổi Xế Chiều). Năm này, Trương Nhược Quân xếp thứ 94 trong danh sách Danh sách 100 ngôi sao nổi tiếng Trung Quốc theo Forbes.\nNăm 2018, anh đóng vai chính trong bộ phim hài lãng mạn Thuyết tiến hóa tình yêu.\nNăm 2019, anh đóng vai chính trong bộ phim gián điệp Kinh Trập, phần tiếp theo của bộ phim ăn khách năm 2016 Ma Tước. Sau đó anh đóng vai nam chính trong bộ phim lịch sử Khánh Dư Niên dựa trên tiểu thuyết cùng tên của Miêu Nị. Bộ phim nhận được đánh giá rất tích cực và trở thành \"bom tấn truyền hình\" năm đó.\nNăm 2020, Trương Nhược Quân được chọn tham gia bộ phim phá án Bằng chứng hoàn hảo. Cùng năm, anh tái hợp với biên kịch Vương Quyện của Khánh Dư Niên trong bộ phim truyền hình võ hiệp Tuyết Trung Hãn Đao Hành. Anh đứng thứ 37 trong danh sách Danh sách 100 ngôi sao nổi tiếng Trung Quốc theo Forbes 2020.",
    "aliases": [
      "trương nhược quân",
      "zhang ruoyun",
      "truong nhuoc quan",
      "张若昀",
      "zhang dede",
      "ruoyun zhang",
      "zhang ruo yun",
      "張若昀"
    ],
    "featured": false
  },
  {
    "slug": "ho-ca",
    "name": "Hồ Ca",
    "englishName": "Hu Ge",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "gender": 2,
    "tags": [
      "Cổ trang",
      "Chính kịch",
      "Võ thuật"
    ],
    "roles": "Thánh kiếm hiệp • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/vmNDYhGMFReeHGqbTwFcFgAq9Ep.jpg",
    "tmdbPersonId": 1106514,
    "birthday": "1982-09-20",
    "placeOfBirth": "Shanghai, China",
    "bio": "Hồ Ca (sinh ngày 20 tháng 9 năm 1982) là nam diễn viên, ca sĩ người Trung Quốc. Khi còn học tại Học viện Hí kịch Thượng Hải, anh được mời tham gia diễn xuất trong Tiên kiếm kỳ hiệp (2005) với vai chính là Lý Tiêu Dao. Vào tháng 9 năm 2012, anh được đề cử hạng mục giải Nghệ sĩ mới tại giải Hoa Đỉnh lần thứ 31 cho vai diễn Lâm Giác Dân trong phim điện ảnh chính kịch Cách mạng Tân Hợi. Vai diễn Mai Trường Tô trong phim truyền hình Lang Gia Bảng (2015) đã giúp anh trở thành Nam diễn viên chính xuất sắc nhất của Giải Kim Ưng và Giải Bạch Ngọc Lan. Hiện nay, anh đang giữ chức vụ Phó Chủ nhiệm Uỷ ban Tuyên truyền Trung ương Đồng minh Dân chủ Trung Quốc.\n\nSự nghiệp:\n\nBước đầu sự nghiệp:\n\nHồ Ca sinh ra tại Thượng Hải vào ngày 20 tháng 9 năm 1982. Anh bắt đầu được đào tạo và rèn luyện diễn xuất tại Trường sân khấu nghệ thuật Tiểu Minh Tinh. Hồ Ca đã theo học trường tiểu học Hướng Dương (1989 - 1994) và trường cao trung Thượng Hải đệ nhị (1994 - 2001) nổi tiếng nghiêm khắc và sát sao.\nNăm 14 tuổi, Hồ Ca bắt đầu làm dẫn chương trình cho chương trình truyền hình có tên Dương Quang Thiếu Niên trên kênh giáo dục của đài truyền hình Thượng Hải.\nNăm 2001, Hồ Ca đỗ vào hai trường học viện nghệ thuật danh giá là Học viện Hý kịch trung ương và Học viện Hý kịch Thượng Hải và quyết định theo học tại Học viện Hý kịch Thượng Hải vì niềm đam mê diễn xuất.\n\n2002 - 2006: Bắt đầu nổi tiếng\nKhi đang học đại học, theo lời giới thiệu của bạn học, anh đã kí hợp đồng với công ty giải trí Thượng Hải Đường Nhân. Sau đó anh bắt đầu xuất hiện trên màn ảnh bằng một vai phụ trong phim điện ảnh Giả trang không cảm giác .\nHồ Ca trở nên nổi tiếng khi đảm nhận vai chính Lý Tiêu Dao trong Tiên kiếm kỳ hiệp 2005 (đóng cặp với Lưu Diệc Phi) . Anh đoạt giải Nghệ sĩ mới xuất sắc nhất và Diễn viên triển vọng tại Tinh quang đại điển 2006 .\nSau Tiên kiếm kỳ hiệp, Hồ Ca tham gia rất nhiều phim truyền hình, đặc biệt là thể loại võ hiệp cổ trang như Thiên ngoại phi tiên 2006 (đóng cặp với Lâm Y Thần), Thiếu niên Dương gia tướng . Hồ Ca nhanh chóng trở thành trụ cột chính của Thượng Hải Đường Nhân. Anh đóng vai chính Đổng Vĩnh trong phim Thiên ngoại phi tiên,. trình bày hai bài hát Sau khi trời sáng và Ánh trăng cho bộ phim.\nVào tháng 10 năm 2006, Hồ Ca với tư cách ca sĩ phát hành album đầu tay Trân trọng với ba ca khúc \nNăm 2006, anh vào vai Quách Tĩnh trong Anh hùng xạ điêu, bộ phim được chuyển thể từ tác phẩm cùng tên của nhà văn Kim Dung. Phim đang quay dang dở thì bị tạm dừng do Hồ Ca bị tai nạn giao thông phải khâu 100 mũi trên khuôn mặt cuối tháng 8 năm 2006.\n\n2008 - 2012: Trở lại sau tai nạn và tiếp tục thành công:",
    "aliases": [
      "hồ ca",
      "hu ge",
      "ho ca",
      "胡歌",
      "ge hu",
      "dahu",
      "humao",
      "hu xiaobai",
      "laohu",
      "maomao",
      "maoge",
      "gege",
      "hu ke",
      "hú gē",
      "호가",
      "老胡",
      "胡柯",
      "هو گه"
    ],
    "featured": false
  },
  {
    "slug": "chau-tan",
    "name": "Châu Tấn",
    "englishName": "Zhou Xun",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "gender": 1,
    "tags": [
      "Chính kịch",
      "Cổ trang",
      "Tình cảm"
    ],
    "roles": "Đại hoa đán • Tam Kim Ảnh Hậu",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/gRn6nBL4LKedAZd02Zrnk3MCz7l.jpg",
    "tmdbPersonId": 71057,
    "birthday": "1974-10-18",
    "placeOfBirth": "Quzhou, Zhejiang Province, China",
    "bio": "Châu Tấn (tiếng Trung: 周迅, tiếng Anh: Zhou Xun, sinh ngày 18 tháng 10 năm 1974), là một nữ diễn viên kiêm ca sĩ người Trung Quốc. Cô là một trong Tứ Đại Hoa Đán của Trung Quốc vào đầu thập niên 2000, cùng với Chương Tử Di, Từ Tịnh Lôi và Triệu Vy.\n\nĐời tư:\n\nChâu Tấn kết hôn với nam diễn viên người Mỹ gốc Hoa là Archie Kao (Cao Thánh Viễn) (anh từng đóng series Power Rangers Lost Galaxy năm 1999) vào ngày 16 tháng 7 năm 2014 tổ chức ngay trong đêm nhạc từ thiện của cô ở Hàng Châu, Trung Quốc. Năm 2020, cả hai xác nhận ly hôn vì không tìm được tiếng nói chung trong chuyện tình cảm và con cái sau này.",
    "aliases": [
      "châu tấn",
      "zhou xun",
      "chau tan",
      "ジョウ・シュン",
      "周米卡",
      "ژو شون"
    ],
    "featured": false
  },
  {
    "slug": "ton-le",
    "name": "Tôn Lệ",
    "englishName": "Sun Li",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "gender": 1,
    "tags": [
      "Cổ trang",
      "Chính kịch"
    ],
    "roles": "Nữ hoàng truyền hình • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/pQUNr8JcoJ8x1hWQuFAcFfQJZxa.jpg",
    "tmdbPersonId": 52898,
    "birthday": "1982-09-26",
    "placeOfBirth": "Shanghai, China",
    "bio": "Tôn Lệ (tiếng Trung: 孙俪, sinh ngày 26 tháng 9 năm 1982) là một nữ diễn viên kiêm ca sĩ người Trung Quốc. Năm 2018, cô trở thành nữ diễn viên Trung Quốc trẻ tuổi nhất giành được ba giải thưởng truyền hình lớn nhất tại Trung Quốc, bao gồm giải Phi thiên, giải Bạch Ngọc Lan và giải Kim Ưng.\n\nTiểu sử:\n\nTôn Lệ sinh ngày 26 tháng 9 năm 1982 tại Thượng Hải, Trung Quốc, trong một gia đình không có truyền thống làm nghệ thuật. Năm cô 12 tuổi, bố bỏ mẹ con cô để lấy người phụ nữ khác, cuộc sống thiếu vắng người đàn ông trụ cột khiến 2 mẹ con gặp nhiều vất vả, thường xuyên dời chỗ ở vì không đủ tiền thuê nhà. Được phát hiện tài năng nhảy múa từ nhỏ, Tôn Lệ cho đi học tại lớp năng khiếu nghệ thuật và được đi biểu diễn cả trong và ngoài nước. Cô có một em gái cùng cha khác mẹ là diễn viên Tôn Diễm, kém cô 19 tuổi.\n\nSự nghiệp:\n\nNăm 11 tuổi, cô tham gia lưu diễn tại Anh, Mỹ, Nhật Bản, nhờ tài năng vũ đạo của mình đã giúp Tôn Lệ lọt vào mắt xanh của đạo diễn phim Tân dòng sông ly biệt với một vai diễn nhỏ trong đội múa của Lục Y Bình. Sau đó cô học tại đoàn Đoàn văn công Cảnh bị Thượng Hải. Năm 1998, cô đạt giải ba trong hội diễn văn nghệ toàn quân Trung Quốc cùng danh hiệu \"Quân nhân ưu tú\". Đến năm 2000, Tôn Lệ vào học trường nghệ thuật Ngân Đô Thượng Hải. Tại đây cô đạt giải nhì cuộc thi múa toàn quốc giải Kim Tinh.\nNăm 2001, tại Singapore, cô tham gia chương trình tìm kiếm tài năng Star Search của hãng truyền thông MediaCorp. Cô đạt thành tích cao, nhận được sự ưu ái và đánh giá cao của giám khảo Lưu Đức Hoa, sau đó trở thành diễn viên hàng đầu của công ty Hairun Media. Năm 2003, biên kịch Lữ Hải Nham (侣海岩) tuyển chọn cô cho vai chính trong bộ phim truyền hình dài tập Ngọc Quan Âm của ông.\nNăm 2005, Tôn Lệ lần đầu đóng chung với Đặng Siêu trong bộ phim truyền hình Hạnh phúc như hoa. Năm 2006, cô phát hành album ca nhạc đầu tay Tình như không khí. Khoảng thời gian sau đó cô đoạt giải Diễn viên mới Xuất sắc trong Giải Bách Hoa lần 28 cho vai diễn trong bộ phim điện ảnh Hoắc Nguyên Giáp và Bến Thượng Hải.\nNăm 2008, Tôn Lệ tham gia phim điện ảnh Họa bì, giành được đề cử Nữ diễn viên phụ xuất sắc tại Giải Kim Kê và Kim Tượng. Cùng năm, cô đóng vai chính trong phim truyền hình dài tập Ngọt ngào cùng với Đặng Siêu, bộ phim lọt top 10 phim hay nhất năm. Đồng thời cô phát hành Album nhạc thứ hai \"Giấc mơ nhỏ\". Năm 2009, Tôn Lệ tham gia bộ phim Iron Road dành hai giải Diễn viên nữ xuất sắc tại giải thưởng Roma FictionFest lần thứ 2 và giải thưởng Gemini lần 25.\nNăm 2012, nhờ vai chính trong phim truyền hình Chân Hoàn truyện, Tôn Lệ được đề cử Nữ diễn viên xuất sắc tại giải thưởng Giải Emmy quốc tế. Cùng năm cô tham gia phần hai của Họa bì và bộ phim Quan Vân Trường của Chung Tử Đan. Năm 2013, cô dành giải Nữ diễn viên chính xuất sắc tại Giải Bạch Ngọc Lan lần thứ 20 và nữ diễn viên được khán giả yêu thích nhất tại Giải Kim Ưng cho vai diễn chính trong bộ phim truyền hình đô thị Lạt mụ chính truyện.",
    "aliases": [
      "tôn lệ",
      "sun li",
      "ton le",
      "孙俪",
      "betty sun li",
      "susan sun li",
      "betty sun",
      "tôn lệ ",
      "손려",
      "сунь ли",
      "li sun",
      "孫儷"
    ],
    "featured": false
  },
  {
    "slug": "truong-dich",
    "name": "Trương Dịch",
    "englishName": "Zhang Yi",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "gender": 2,
    "tags": [
      "Chính kịch",
      "Tội phạm",
      "Hành động"
    ],
    "roles": "Ảnh đế thực lực • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/l34U9AP3AegNzvogW2rYs0H5DOG.jpg",
    "tmdbPersonId": 146098,
    "birthday": "1978-02-17",
    "placeOfBirth": "Harbin, Heilongjiang, China",
    "bio": "Trương Dịch (giản thể: 张译; phồn thể: 張譯; bính âm: Zhāng Yì; sinh ngày 17 tháng 2 năm 1978) là nam diễn viên điện ảnh và truyền hình Đại lục Trung Quốc. Ông từng phục vụ chín năm trong quân đội với vai trò diễn viên của Đoàn kịch Chiến Hữu thuộc Quân khu Bắc Kinh trước khi chuyển sang hoạt động chuyên nghiệp, và được Nhà nước Trung Quốc phong danh hiệu Diễn viên cấp Nhất.\nTrương Dịch được khán giả biết đến rộng rãi qua vai lớp trưởng Sử Kim trong phim truyền hình Sĩ binh đột kích (2006), và được xem là một trong những nam diễn viên thực lực hàng đầu của truyền hình Trung Quốc. Ông từng bốn lần đoạt các giải thưởng điện ảnh – truyền hình lớn nhất của Trung Quốc: Giải Kim Kê, Giải Bách Hoa, Giải Hoa Biểu và Giải Bạch Ngọc Lan.\n\nTiểu sử:\n\nTrương Dịch sinh ngày 17 tháng 2 năm 1978 tại thành phố Cáp Nhĩ Tân, tỉnh Hắc Long Giang, trong một gia đình giáo viên. Cha ông là người yêu văn nghệ, nhờ đó ông sớm tiếp xúc với sân khấu. Năm 1994, ông hai lần dự thi vào Học viện Phát thanh Bắc Kinh nhưng đều không trúng tuyển, sau đó phải làm nhiều nghề khác nhau để mưu sinh.\nNăm 1996, ông tự túc theo học tại Nhà hát Thoại kịch Cáp Nhĩ Tân. Năm 1997, ông lần lượt ứng tuyển vào Đại học Nghệ thuật Quân đội Giải phóng Nhân dân Trung Quốc, khoa Biểu diễn của Học viện Điện ảnh Bắc Kinh và Học viện Hí kịch Thượng Hải, nhưng tất cả đều không đỗ. Cùng năm, ông trúng tuyển vào khoa chính trị của Đoàn kịch Chiến Hữu thuộc Quân khu Bắc Kinh. Trong suốt thời gian ở đoàn kịch, ông đi \"chạy đoàn\" suốt bốn năm mà không nhận được vai diễn nào; sau đó ông đảm nhiệm nhiều công việc hậu trường như biên tập phim, trợ lý sản xuất, người dẫn chương trình và diễn viên lồng tiếng.\nÔng xem đạo diễn Khang Hồng Lôi là \"người dẫn đường\" cho sự nghiệp mình. Năm 2005, ông tham gia phim truyền hình Dân công do Khang Hồng Lôi đạo diễn; qua nhà sản xuất của bộ phim này, ông gặp đạo diễn Hồ Mai và được tham gia Kiều gia đại viện.\nNăm 2006, ông xuất ngũ. Cùng năm, vai lớp trưởng Sử Kim trong Sĩ binh đột kích của Khang Hồng Lôi đưa tên tuổi ông đến với đông đảo khán giả.",
    "aliases": [
      "trương dịch",
      "zhang yi",
      "truong dich",
      "張譯 ",
      "cheung yik",
      "张译",
      " trương dịch",
      "ژانگ یی"
    ],
    "featured": false
  },
  {
    "slug": "loi-giai-am",
    "name": "Lôi Giai Âm",
    "englishName": "Lei Jiayin",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "gender": 2,
    "tags": [
      "Chính kịch",
      "Hài",
      "Cổ trang"
    ],
    "roles": "Thị đế • Diễn viên điện ảnh",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/wjDzXeAycQj01k40oXigRgJCPRr.jpg",
    "tmdbPersonId": 1724403,
    "birthday": "1983-08-29",
    "placeOfBirth": "Anshan, Liaoning, China",
    "bio": "Lei Jiayin (Chinese: 雷佳音; pinyin: Léi Jiāyīn; born August 29, 1983) is a Chinese actor best known for his roles in the films Guns and Roses (2012), How Long Will I Love U (2018), A Writer's Odyssey (2021), Full River Red (2023), and YOLO (2024), as well as the television series The First Half of My Life (2017), The Longest Day in Chang'an (2019), and A Lifelong Journey (2022).\nLei ranked 62nd on Forbes China Celebrity 100 list in 2019, and 61st in 2020.\n\nEarly life:\n\nLei Jiayin was born in Tiedong District, Anshan, Liaoning, China. He dropped out of school when he was in junior high. Later, Lei Jiayin went to Shenyang for an interview to take part in the model examination upon his mother's suggestion. While he was waiting for the interview, actor Lv Xiaohe took a fancy to him and suggested that he learn acting. In 2002, Lei Jiayin was admitted to Shanghai Theatre Academy with his results ranked second nationwide. In 2006, Lei entered the Shanghai Dramatic Arts Center.\n\nCareer:\n\n2004–2010: Beginning:\n\nIn 2004, Lei Jiayin acted in the costume comedy drama  Pretty Girls in Jianghu, which was his first time to act in the TV series, thus officially entering the entertainment industry.\nIn 2007, Lei starred in the family drama Lost. In the same year, he starred alongside Guo Jingfei in the wuxia comedy theater play My Own Swordsman.\nIn 2009, Lei made his big screen debut in the movie 1977 College Entrance Examination. Later, he starred alongside Yao Chen in the romantic comedy Days with the Air Hostess. In the same year, he starred in the workplace comedy Go Lala Go. In addition, he also co-starred with Yao Chen in the theater play Go Lala Go.\nIn 2010, he acted in the theater play 21 Karat directed by He Nian, and 12 Angry Men adapted from the American film of the same name. In the same year, he starred in the romance comedy Princess Single Blind Date in Mind.\n\n2011–2015: Rising popularity:\n\nIn 2011, Lei starred in the highly popular family drama Home Temptation.\nIn the same year, Lei starred in the revolutionary drama Borrow Gun.\nHe won the most promising newcomer award of the 15th Zolin Drama Arts Awards.\nIn 2012, Lei starred in the action comedy Guns and Roses, which was his first leading role in a film. He won the Best Actor Award in the 11th Changchun Film Festival, and the Best New Actor in the 7th Chinese Young Generation Film Forum Awards for his performance.\nIn the same year, Lei acted in the family drama Mother-in-Law is Here, and\nfamily comedy Baby.\nHe won the Best New Actor award at the 3rd LeTV Awards.\nIn 2013, Lei starred alongside Tong Liya in the urban melodrama Weaning, which was his first time using a dialect in a television series.\nIn 2015, Lei starred alongside Yuan Shanshan in the family drama The Nanny Man. In the same year, he starred in crime suspense film Memento Mori, where he played a lawyer.\n\n2017–present: Breakthrough and continued success:",
    "aliases": [
      "lôi giai âm",
      "lei jiayin",
      "loi giai am",
      "雷佳音",
      "lei jia yin",
      "雷子(昵称)",
      "jiayin lei",
      "لی جیاین"
    ],
    "featured": false
  },
  {
    "slug": "tran-triet-vien",
    "name": "Trần Triết Viễn",
    "englishName": "Chen Zheyuan",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "gender": 2,
    "tags": [
      "Tình cảm",
      "Cổ trang",
      "Hài"
    ],
    "roles": "Nam thần thanh xuân • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/uOEqq05ghCxZXn7w92nriHu0T5A.jpg",
    "tmdbPersonId": 2439184,
    "birthday": "1996-10-29",
    "placeOfBirth": "Shenzhen, Guangdong, China",
    "bio": "Trần Triết Viễn  (tiếng Trung: 陈哲远; bính âm: Chén Zhéyuǎn) là một nam diễn viên người Trung Quốc. Anh được biết đến với vai Giang Tiểu Ngư trong Tân tuyệt đại song kiêu (2020), vai Châu Tư Việt trong Bí mật nơi góc tối (2021) và vai Đoàn Gia Hứa trong Vụng trộm không thể giấu (2023).\n\nTiểu sử:\n\nNăm 2015, Trần Triết Viễn tham gia chương trình thần tượng Lưu Hành Chi Vương, sau đó gia nhập nhóm nhạc nam Mr. BIO.\nNăm 2017, Trần Triết Viễn lần đầu tiên tham gia diễn xuất trong bộ phim thanh xuân Bí Quả, dựa trên tiểu thuyết của Nhiêu Tuyết Mạn.\nNăm 2018, Trần Triết Viễn đóng vai chính trong bộ phim truyền hình võ hiệp giả tưởng Thục Sơn Chiến Kỷ 2 và phim hài Tổ Tông Thân Yêu Của Tôi. Cùng năm, anh xuất hiện trên màn ảnh rộng trong bộ phim hài Miss Puff.\nNăm 2020, Trần Triết Viễn được khán giả biết đến sau khi tham gia bộ phim truyền hình võ hiệp Tân Tuyệt Đại Song Kiêu, dựa trên tiểu thuyết Tuyệt Đại Song Kiêu của Cổ Long. Anh được khen ngợi khi thể hiện nhân vật chính Giang Tiểu Ngư. Sau đó, anh tiếp tục tham gia các dự án phim cổ trang Phượng Lệ Cửu Thiên, webdrama trinh thám Thám Tử Phố Tàu 3, các phim cổ trang Thanh Trâm Hành và Phong Hoả Lưu Kim (được chuyển thể từ tiểu thuyết Sát Phá Lang của Priest).\nNăm 2021, Trần Triết Viễn gây ấn tượng với dự án phim thanh xuân chuyển thể Bí Mật Nơi Góc Tối đóng cùng Từ Mộng Khiết. Anh cũng đóng vai chính trong bộ phim lãng mạn giả tưởng Bạn Trai Phản Diện Của Tôi cùng với Thẩm Nguyệt năm 2022, giúp anh được công nhận về diễn xuất nhiều hơn.\nNăm 2023, Trần Triết Viễn đảm nhận vai nam chính trong dự án ngôn tình chuyển thể Vụng Trộm Không Thể Giấu, đóng cùng Triệu Lộ Tư. Bộ phim đã được phát sóng trên Netflix ở 190 quốc gia, trong đó hình ảnh và diễn xuất ấn tượng của anh trong vai Đoàn Gia Hứa nhận được phản hồi tích cực.\nNăm 2024, bộ phim Tiên Kiếm Kỳ Hiệp 4 được phát sóng độc quyền trên nền tảng iQIYI, Trần Triết Viễn vào vai nam chính Vân Thiên Hà. Bộ phim được chuyển thể dựa trên loạt trò chơi điện tử nổi tiếng và thu hút 800 triệu lượt xem trong 6 tháng đầu tiên phát sóng. Cùng năm, bộ phim truyền hình Đêm Tối và Bình Minh do anh đóng chính cùng Nhiếp Viễn và Hình Phi được phát sóng độc quyền trên IQIYI và CCTV-8, đạt tỷ suất người xem cao nhất là 3,6397%, tổng số lượt xem trong ngày vượt hơn 100 triệu, tổng lượt xem tích lũy là 1,249 tỷ trên các nền tảng trong thời gian phát sóng.\nNăm 2025, các bộ phim Cây Ô Liu Màu Trắng do Trần Triết Viễn đóng chính cùng Lương Khiết, Nhất Tiếu Tùy Ca đóng chính cùng Lý Thấm lần lượt được phát sóng trên nền tảng iQIYI.",
    "aliases": [
      "trần triết viễn",
      "chen zheyuan",
      "tran triet vien",
      "陈哲远",
      "chen zhe-yuan",
      "zheyuan chen",
      "chen zhe yuan",
      "陳哲遠",
      "чэнь чжэ юань",
      "چن ژه یوان"
    ],
    "featured": false
  },
  {
    "slug": "truong-gia-huy",
    "name": "Trương Gia Huy",
    "englishName": "Nick Cheung",
    "country": "Hồng Kông 🇭🇰",
    "countryCode": "hk",
    "gender": 2,
    "tags": [
      "Hành động",
      "Tội phạm",
      "Chính kịch"
    ],
    "roles": "Ảnh đế • Diễn viên điện ảnh",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/yjjSMT1bCX7vlJMVt2BiPVwOATo.jpg",
    "tmdbPersonId": 72731,
    "birthday": "1967-12-02",
    "placeOfBirth": "Hong Kong, China",
    "bio": "Trương Gia Huy (sinh ngày 2 tháng 12 năm 1964) là một nam diễn viên người Hồng Kông. Ông từng là diễn viên độc quyền của hãng TVB.\n\nDanh sách phim:\n\nPhim truyền hình:\n\nHãng Phim ATV_Ngân Hồ Về Đêm - Silver Tycoon - Vai - Diêu Quốc Nhân\nĐiêu Hùng Tranh Bịp - Nhất Đen Nhì Đỏ VIII - Who Is Winner 8 - Vai - Dương Ngọc Mai\nNgôi nhà rùng rợn - ATV năm 1995 (phim nhiều phần)\nHãng PhimTVB_Chân Mạng Thiên Sư - Triumph Over Evil 1997 - Vai - Trương Chấn Thiên\nVề Với Nhân Gian - A Smiling Ghost Story 1999 - Vai - Phương Chí Long\nTrò Chơi May Rủi - Game Of Deceit 1999 - Vai - Dư Trung Chánh\nKhoảnh Khắc Tuyệt Vời - Moments Of Endearment 1999 - Vai - Trần Hữu Sung\nBốn Chàng Tài Tử – Legendary Four Aces 2000 - Vai - Đường Bá Hổ\nCảnh Sát Hình Sự - Law Enforcers 2001 - Vai - Chu Gia Vinh\nMong Manh Cuộc Tình - Ups And Downs On The Sea Of Love 2004 - Vai - Điền Vỹ Thần Jason\nĐột Phá Cuối Cùng - The Last Breakthrough 2005 - Vai - Vương Phủ Phân Albert\nBí mật của trái tim - Thiên Địa Hào Tình - Secret Of The Heart - 1998 - Vai - Cam Lượng Hoành",
    "aliases": [
      "trương gia huy",
      "nick cheung",
      "truong gia huy",
      "jiahui zhang",
      "fung fai cheung",
      "渣渣辉",
      "نیک چیانگ کا-فای",
      "nick cheung ka-fai",
      " cheung ka-fai",
      "张家辉",
      "張家輝"
    ],
    "featured": false
  },
  {
    "slug": "quach-phu-thanh",
    "name": "Quách Phú Thành",
    "englishName": "Aaron Kwok",
    "country": "Hồng Kông 🇭🇰",
    "countryCode": "hk",
    "gender": 2,
    "tags": [
      "Hành động",
      "Tội phạm",
      "Chính kịch"
    ],
    "roles": "Thiên vương • Diễn viên điện ảnh",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/loXwVtS8N0Wrnpx2oRAPMGPLs0n.jpg",
    "tmdbPersonId": 21908,
    "birthday": "1965-10-26",
    "placeOfBirth": "Hong Kong, British Crown Colony [now China]",
    "bio": "Quách Phú Thành (tiếng Trung: 郭富城, tiếng Anh: Aaron Kwok Fu Shing, sinh ngày 26 tháng 10 năm 1965) là một ca sĩ, vũ công và diễn viên người Hồng Kông. Hoạt động từ những năm 1980, Quách Phú Thành được xem là một trong \"Tứ đại thiên vương\" của Hồng Kông. Được mệnh danh là \"Vũ vương\", vũ điệu trên sân khấu của Quách Phú Thành chịu ảnh hưởng của cố nghệ sĩ người Mỹ Michael Jackson. Ông đã phát hành hơn 30 album phòng thu bằng tiếng Quảng Đông và Quan Thoại, hầu hết thuộc thể loại dance-pop, với các yếu tố rock, R & B, soul, electronic và âm nhạc truyền thống Trung Quốc.\nSong song với sự nghiệp âm nhạc của mình, Quách Phú Thành bắt đầu sự nghiệp diễn viên với vai diễn trong bộ phim truyền hình TVB Thành Cát Tư Hãn (1987), Thái Bình Thiên Quốc (1988), Người đàn ông đến từ Quảng Đông (1991), Heartstrings (1994) và Trận chiến tham ô (1996). Anh đã được công nhận rộng rãi với bộ phim Thần Điêu Hiệp Lữ (1991), và được đề cử Giải thưởng Điện ảnh Hồng Kông cho Nam diễn viên phụ xuất sắc nhất, trước khi đóng vai chính trong một loạt bộ phim thành công phòng vé như Trường học bá vương (1993), Trận chiến lôi đình (2000), Tam nhân cách (2005), Phụ tử (2006), Đạp huyết tầm mai (2015) và Phi vụ tiền giả (2018).\n\nTiểu sử:\n\nQuách Phú Thành tốt nghiệp trường trung học liên cấp St. John's Co-education College tại Hồng Kông. Sau khi hoàn thành bậc trung học, ông làm nhân viên cấp thấp tại King Fook Gold & Jewellery Co. Ltd. Cha của ông là chủ một cửa hàng bán lẻ vàng quy mô nhỏ, mong muốn con trai tích lũy kinh nghiệm trong lĩnh vực kinh doanh này với định hướng sau này sẽ tiếp quản việc kinh doanh của gia đình.\nNếu không có một người anh trai đứng ra tiếp quản cửa hàng vàng, cha của Quách Phú Thành có lẽ đã không đồng ý cho ông gia nhập ngành giải trí. Năm 1984, Quách Phú Thành bị sa thải vì nghỉ việc kéo dài (do nghỉ ốm) sau khi bị chấn thương cơ bàn chân trong một lần thử thực hiện động tác xoạc chân tại một bữa tiệc.\nNăm 1991, anh trai của Quách Phú Thành, Kwok Fu-kun, bị bắn chết bên ngoài rạp Sunbeam Theatre ở North Point khi đang truy đuổi những tên cướp có vũ trang đã đột nhập và cướp cửa hàng trang sức Marble Street của ông.\n\nSự nghiệp:\n\nNhững năm đầu sự nghiệp:",
    "aliases": [
      "quách phú thành",
      "aaron kwok",
      "quach phu thanh",
      "aaron kwok fu-sing",
      "aaron kwok fu-shing",
      "郭富城",
      "guo fu-cheng",
      "곽부성",
      "kwok fu-shing",
      "آرون کووک"
    ],
    "featured": false
  },
  {
    "slug": "truong-hoc-huu",
    "name": "Trương Học Hữu",
    "englishName": "Jacky Cheung",
    "country": "Hồng Kông 🇭🇰",
    "countryCode": "hk",
    "gender": 2,
    "tags": [
      "Chính kịch",
      "Hành động",
      "Hài"
    ],
    "roles": "Ca thần • Diễn viên điện ảnh",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/eoh2sI1IBYmQSuIapr32EUbl3Nw.jpg",
    "tmdbPersonId": 25245,
    "birthday": "1961-07-10",
    "placeOfBirth": "Hong Kong, British Crown Colony [now China]",
    "bio": "Trương Học Hữu (sinh ngày 10 tháng 7 năm 1961) là một nam ca sĩ và diễn viên người Hồng Kông. Được mệnh danh là \"Ca Thần\", ông  là nghệ sĩ âm nhạc bán chạy nhất mọi thời đại tại Đài Loan và Hồng Kông, với doanh số hơn 60 triệu bản thu âm trên toàn cầu. Học Hữu đã thắng giải thưởng Âm nhạc Thế giới cho \"Nghệ sĩ châu Á bán chạy nhất\", giải Billboard cho \"Ca sĩ châu Á được yêu thích nhất\", và Kỷ lục Guinness thế giới cho lượng người xem hòa nhạc lớn nhất trong 12 tháng với hơn 2 triệu khán giả tham dự. Năm 1999, Học Hữu được Liên đoàn người trẻ tuổi Toàn cầu vinh danh là một trong 10 người trẻ xuất sắc của thế giới. Được biết đến với giọng hát truyền cảm, ông được gọi là một Thiên Vương của dòng nhạc Cantopop, và là một biểu tượng văn hóa đại chúng của Hồng Kông. \n\nSự nghiệp và cuộc sống riêng tư:\n\nBiểu tượng lớn của nền nghệ thuật châu Á:\n\nNăm 1984, Học Hữu vượt qua 10.000 thí sinh giành giải nhất trong cuộc thi tiếng hát không chuyên với bài hát \"Fatherland\". Sau đó không lâu, ông được công ty thu âm PolyGram ngỏ lời kí kết hợp đồng. Người thầy đã dẫn dắt và giới thiệu Học Hữu đến với công chúng là ca sĩ Đàm Vịnh Lân. Kể từ đó đến nay, Học Hữu đã phát hành 57 album, và tất cả đều trở thành những album tiêu biểu cho âm nhạc Hoa ngữ.\nVới doanh số hơn 60 triệu bản thu âm toàn cầu, Học Hữu là nghệ sĩ nhạc Hoa bán đĩa chạy nhất và là một trong những nghệ sĩ bán đĩa chạy nhất thế giới. Ông có lượng tiêu thụ đĩa nhạc đứng đầu ở cả hai quốc gia là Hồng Kông và Đài Loan. Tại Đài Loan, Học Hữu là nghệ sĩ duy nhất có 3 album vượt mốc 1 triệu bản, bao gồm: The Goodbye Kiss (1993), True Love Compilation (1995) và  How Could I Forget You? (1996). Album The Goodbye Kiss (1993) đã bán được hơn 5 triệu bản trên toàn châu Á chỉ trong năm đầu phát hành và là một trong những album bán chạy nhất mọi thời đại.\nNăm 1995, Trương Họᴄ Hữu trở thành ᴄa ѕĩ trẻ ᴄhâu Á ᴄó album bán ᴄhạу nhất toàn ᴄầu. Với ѕố lượng album bán ra nhiều thứ 2 thế giới ᴄhỉ ѕau Miᴄhael Jaᴄkѕon.\nHai chuyến lưu diễn toàn cầu mang tên \"Năm của Trương Học Hữu\" (2007) và \"Trương Học Hữu: 1/2 thế kỉ\" (2010) là hai tour diễn thành công nhất lịch sử bởi một nghệ sĩ nhạc Hoa. Trong đó, chuyến lưu diễn năm 2010 đã được sách kỉ lục Guinness thế giới công nhận là chuyến lưu diễn thu hút được nhiều khán giả nhất trong 12 tháng, với 2,048,553 vé tiêu thụ.\nHọc Hữu cũng tham gia vào lĩnh vực phim ảnh với các bộ phim nổi tiếng như: Hoàng Phi Hồng (1991), Thiện nữ u hồn (1991) và Hào môn dạ yến (1991)... Khả năng diễn xuất của anh đã được đánh giá cao bởi giới chuyên môn.\nThành công trong sự nghiệp âm nhạc và điện ảnh đã khiến cho Học Hữu được coi là một trong những biểu tượng đại chúng của Hồng Kông. Năm 1994, tạp chí Billboard đã vinh danh ông là nghệ sĩ nổi tiếng nhất châu Á. Liên tiếp trong hai năm 1995 và 1996, Học Hữu đã thắng Giải thưởng Âm nhạc Thế giới ở hạng mục \"Nghệ sĩ nhạc Hoa ngữ có doanh số bán đĩa nhiều nhất\".",
    "aliases": [
      "trương học hữu",
      "jacky cheung",
      "truong hoc huu",
      "張學友",
      "张学友",
      "jacky cheung hok-yau",
      " cheung hok-yau",
      "جکی چیانگ",
      "جکی چونگ هوک-یاو"
    ],
    "featured": false
  },
  {
    "slug": "le-minh",
    "name": "Lê Minh",
    "englishName": "Leon Lai",
    "country": "Hồng Kông 🇭🇰",
    "countryCode": "hk",
    "gender": 2,
    "tags": [
      "Tình cảm",
      "Hành động",
      "Chính kịch"
    ],
    "roles": "Thiên vương • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/muGAHc7aIQZQ5HwldoJElqz4dZx.jpg",
    "tmdbPersonId": 66761,
    "birthday": "1966-12-11",
    "placeOfBirth": "Beijing, China",
    "bio": "Lê Minh (tiếng Trung: 黎明, tiếng Anh: Leon Lai; sinh ngày 11 tháng 12 năm 1966) là một nam diễn viên kiêm ca sĩ người Hồng Kông. Ông là một trong Tứ đại Thiên vương Hồng Kông  thập niên 90 với danh xưng Vương tử cùng với Lưu Đức Hoa, Trương Học Hữu và Quách Phú Thành. Ông từng là gương mặt nổi bật của nền Điện ảnh Hồng Kông.\n\nTiểu sử:\n\nLê Minh sinh ra tại Bắc Kinh, Trung Quốc trong gia đình người Khách Gia quê gốc ở huyện Mai Châu, Quảng Đông. Cha mẹ ly dị năm anh lên 4. Từ đó anh sống với cha là Lê Tân Sinh, một người Malaysia gốc Hoa đã di cư sang Hồng Kông từ thời cách mạng văn hóa Trung Quốc.\nNăm 15 tuổi, anh theo học trường King's Way Princeton College tại Anh. Năm 1984, anh quay trở về Hồng Kông năm 18 tuổi.\n\nSự nghiệp:\n\nThời kỳ đầu:\n\nBan đầu, Lê Minh làm nhân viên tiếp thị cho một công ty điện thoại di động. Sau khi đạt giải ba trong cuộc thi ca hát Tài Hoa Tân Tú, anh nhận được khóa huấn luyện ca hát của Dai Si Zong (戴思聰). Cũng trong năm đó, anh ký hợp đồng nghệ sĩ với Capital Artists. Lê Minh đã không phát hành bất cứ album nào trong vòng 4 năm. Vì vậy, thầy dạy nhạc của anh, ông Dai đã sắp xếp cho anh ký hợp đồng với hãng Polygram, sau này là Universal Music.\n\nCa nhạc:\n\nKhi gia nhập Polygram, Lê Minh đã phát hành album đầu tiên \"Leon\" và album tiếp theo là \"Tương phùng dưới mưa\". Album đầu tiên của anh nhận được giải thưởng album vàng. Sau khi hoạt động vài năm tại Polygram, anh đã ký một hợp đồng mới với hãng Sony Music vào ngày 23 tháng 3 năm 1998.\nCùng với Trương Học Hữu, Lưu Đức Hoa và Quách Phú Thành, Lê Minh là một trong 4 ca sĩ nổi tiếng nhất trong những năm 1990, khi đó giới truyền thông gọi họ là Tứ Đại Thiên Vương của làng nhạc Canto Pop.\nThời gian đầu khi khởi nghiệp, Lê Minh chủ yếu hát nhạc cantopop (nhạc pop bằng tiếng Quảng Đông), nhưng sau đó do ảnh hưởng bởi nhà sản xuất Mark Lui, anh đã mở rộng thể loại nhạc bao gồm những bài hát điện tử phổ biến với những video ca nhạc hấp dẫn. Năm 1990, anh đã đạt giải thưởng đầu tiên 1990 Jade Solid Gold Top 10 Awards và1990 RTHK Top 10 Gold Songs Awards. Sau đó, anh tiếp tục dành giải thưởng \"Nam ca sĩ nổi tiếng nhất\" vào năm 1993 và 1995 của giải thưởng Giai điệu vàng của TVB. Năm 1996, anh cộng tác với nhà nhạc sĩ kiêm nhà sản xuất người Canada gốc Li–băng Steve Barakatt trong album \"Feel\". Hai năm sau, vào năm 1998, anh đã trở thành ca sĩ Hồng Kong đầu tiên lọt vào bảng xếp hạng Top 10 K-pop chart với bài hát \"After loving you\". Năm 1999, anh tuyên bố anh sẽ không nhận thêm bất cứ giải thưởng nào nữa tại Hồng Kông.\nNăm 2002, anh được chọn để hát ca khúc \"Charged up\", bài hát chủ đề cổ vũ cho đội Trung Quốc tại Vòng chung kết bóng đá thế giới năm 2002... Năm 2004, anh trở thành ca sĩ Hồng Kong đầu tiên đại diện cho lãnh thổ tham dự Asia Song Festival lần đầu tiên được tổ chức ở Hàn Quốc.\nLê Minh được lựa chọn là đại sự của Thế vận hội mùa đông lần thứ 6 được tổ chức ở Trường Xuân vào năm 2007.",
    "aliases": [
      "lê minh",
      "leon lai",
      "le minh",
      "leon lai ming",
      "黎明"
    ],
    "featured": false
  },
  {
    "slug": "truong-man-ngoc",
    "name": "Trương Mạn Ngọc",
    "englishName": "Maggie Cheung",
    "country": "Hồng Kông 🇭🇰",
    "countryCode": "hk",
    "gender": 1,
    "tags": [
      "Chính kịch",
      "Tình cảm",
      "Võ thuật"
    ],
    "roles": "Huyền thoại điện ảnh • Ảnh Hậu",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/hre6xmoDbh67YN7wR5nhUazPTlb.jpg",
    "tmdbPersonId": 1338,
    "birthday": "1964-09-20",
    "placeOfBirth": "Hong Kong, British Crown Colony",
    "bio": "Trương Mạn Ngọc (tiếng Trung: 張曼玉, tiếng Anh: Maggie Cheung Man-yuk, sinh ngày 20 tháng 9 năm 1964) là một cựu nữ diễn viên người Hồng Kông. Bà được xem là một trong những nữ diễn viên thành công và có tầm ảnh hưởng quốc tế nhất lịch sử điện ảnh Trung Quốc. Trương Mạn Ngọc là nữ diễn viên người châu Á đầu tiên giành giải nữ diễn viên xuất sắc tại Liên hoan phim Cannes. Bên cạnh đó, bà còn là người giữ kỷ lục về số lần được trao giải Nữ diễn viên chính xuất sắc nhất tại giải thưởng Điện ảnh Hồng Kông (5 lần) và giải Kim Mã (5 lần), cùng với giải Kim Mã cho nữ diễn viên phụ xuất sắc nhất năm 1990. Trên bình diện quốc tế, bà nổi tiếng với giải Gấu Bạc cho Center Stage (1991) và là nữ diễn viên châu Á duy nhất từng giành giải Nữ diễn viên chính tại hai trong ba liên hoan phim lớn của châu Âu.\nTrương Mạn Ngọc bắt đầu nổi tiếng vào thập niên 1980, được biết đến rộng rãi thông qua loạt phim Câu chuyện cảnh sát hợp tác với Thành Long. Sau đó, bà nhanh chóng chuyển từ các vai hành động và hài thương mại sang các vai diễn chính kịch, tham gia các bộ phim như Vượng Giác Ca môn (1988), A Phi chính truyện (1990), Irma Vep (1996) và Điềm mật mật (1996). Bước đột phá quốc tế của bà đến từ bộ phim Tâm trạng khi yêu (2000) của Vương Gia Vệ, tác phẩm không chỉ mang lại danh tiếng toàn cầu mà còn nhận được sự tán dương rộng rãi, xếp thứ năm trong danh sách 100 phim vĩ đại nhất lịch sử điện ảnh do tạp chí Sight & Sound công bố năm 2022. Trang Entertainment Weekly từng đưa danh sách “51 màn trình diễn kinh điển bị Oscar bỏ qua” trong lịch sử 86 năm của giải thưởng này, và vai diễn của cô trong Tâm trạng khi yêu là một trong hai màn trình diễn châu Á xuất hiện trong danh sách.\nTừ cuối thập niên 2000, Trương Mạn Ngọc dần rút lui khỏi diễn xuất, chỉ thỉnh thoảng xuất hiện tại các liên hoan phim, sự kiện thời trang và các buổi lễ trong ngành công nghiệp điện ảnh. Bên cạnh diễn xuất, bà tham gia một số hoạt động sáng tạo và từ thiện có chọn lọc, bao gồm vai trò đại sứ của UNICEF.",
    "aliases": [
      "trương mạn ngọc",
      "maggie cheung",
      "truong man ngoc",
      "張曼玉",
      "张曼玉",
      "maggie cheung man-yuk",
      "cheung man-yuk",
      "مگی چونگ"
    ],
    "featured": false
  },
  {
    "slug": "quan-chi-lam",
    "name": "Quan Chi Lâm",
    "englishName": "Rosamund Kwan",
    "country": "Hồng Kông 🇭🇰",
    "countryCode": "hk",
    "gender": 1,
    "tags": [
      "Võ thuật",
      "Hài",
      "Hành động"
    ],
    "roles": "Đệ nhất mỹ nhân • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/pbHKTJaOzFVTD1HNOnPD0RyLMlK.jpg",
    "tmdbPersonId": 65987,
    "birthday": "1962-09-24",
    "placeOfBirth": "Hong Kong, China",
    "bio": "Quan Gia Tuệ với nghệ danh Quan Chi Lâm (tiếng Anh: Rosamund Kwan; sinh ngày 18 tháng 10 năm 1958) là một nữ diễn viên Hồng Kông. Trong sự nghiệp kéo dài từ năm 1982 đến năm 2004, cô được biết tới nhiều nhất qua vai Dì Mười Ba (Thập Tam Muội) trong loạt phim võ thuật xoay quanh cuộc đời của võ sư Hoàng Phi Hồng.\n\nTiểu sử:\n\nQuan Chi Lâm sinh tại Hồng Kông trong một gia đình có truyền thống điện ảnh. Cha mẹ cô là Quan Sơn và Trương Băng Thiến đều là diễn viên nổi tiếng của hãng phim Thiệu Thị.\nSau khi tốt nghiệp trường trung học Maryknoll Convent, Quan Chi Lâm bắt đầu sự nghiệp điện ảnh vào năm 1982 với vai diễn trong bộ phim Tái kiến giang hồ (再見江湖) với Châu Nhuận Phát. Năm 1985, cô được mời tham gia bộ phim Hạ nhật phúc tinh (夏日福星) của bộ ba Thành Long, Nguyên Bưu, và Hồng Kim Bảo. Chi Lâm còn đóng cặp với Thành Long trong hai bộ phim khác là Long huynh hổ đệ (龍兄虎弟) năm 1986 và Kế hoạch A phần II (A計劃續集) năm 1987.\nNăm 1991, Quan Chi Lâm được đạo diễn Từ Khắc chọn vào vai nữ chính Thập Tam Muội trong phim Hoàng Phi Hồng nói về cuộc đời của vị võ sư nổi tiếng Hoàng Phi Hồng. Sau khi công chiếu, Hoàng Phi Hồng đã đạt được thành công lớn và được xem là bộ phim xuất sắc của thể loại phim võ thuật Hồng Kông. Vai Dì Mười Ba cũng là vai diễn đáng chú ý nhất của Chi Lâm, cô còn tiếp tục thủ vai này bên cạnh Lý Liên Kiệt trong các phần tiếp theo của loạt phim là Hoàng Phi Hồng 2: Nam nhi đương tự cường (黃飛鴻之二男兒當自強) năm 1992, Hoàng Phi Hồng 3: Sư vương tranh bá (黃飛鴻之三獅王爭霸) năm 1993 và Hoàng Phi Hồng: Tây vực hùng sư (黃飛鴻之西域雄獅) năm 1997.\nChi Lâm còn tham gia phim Hoàng Phi Hồng 5: Long thành tiêm bá (黃飛鴻之五龍城殲霸) năm 1995. Ngoài loạt phim Hoàng Phi Hồng, cô còn đóng chung với Lý Liên Kiệt trong Tiếu ngạo giang hồ: Đông Phương Bất Bại năm 1992. Sau vai diễn Dì Mười Ba, Chi Lâm dần rút khỏi làng điện ảnh và đến năm 2007 thì cô chính thức tuyên bố ngừng đóng phim.\n\nSự nghiệp điện ảnh:",
    "aliases": [
      "quan chi lâm",
      "rosamund kwan",
      "quan chi lam",
      "rosamund kwan chi-lam\t",
      "關之琳",
      "关之琳",
      "chi-lam kwan",
      "kwan chi-lam",
      "관지림",
      "กวนจือหลิน",
      "رزاموند کوان چی-لام"
    ],
    "featured": false
  },
  {
    "slug": "vuong-to-hien",
    "name": "Vương Tổ Hiền",
    "englishName": "Joey Wong",
    "country": "Hồng Kông 🇭🇰",
    "countryCode": "hk",
    "gender": 1,
    "tags": [
      "Cổ trang",
      "Kinh dị",
      "Tình cảm"
    ],
    "roles": "Ngọc nữ điện ảnh • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/czi7jy9VnrEmrJTE9oVUJRgDsY.jpg",
    "tmdbPersonId": 68557,
    "birthday": "1967-01-31",
    "placeOfBirth": "Taipei, Taiwan",
    "bio": "Vương Tổ Hiền (chữ Hán: 王祖賢, sinh ngày 31 tháng 1 năm 1967) là nữ diễn viên, ca sĩ người Đài Loan thành danh ở Hồng Kông nổi tiếng thập niên 1980 và 1990. Cô là một trong Tứ đại hoa đán của điện ảnh Hồng Kông thập niên 1980 bên cạnh Trương Mạn Ngọc, Quan Chi Lâm, Chung Sở Hồng. Cô còn được mệnh danh là Đệ nhất mỹ nhân châu Á.\n\nTiểu sử:\n\nVương Tổ Hiền sinh ngày 31 tháng 1 năm 1967 là cô con gái của 1 gia đình danh giá, cô có một anh trai, một em trai và một em gái. Ông nội Vương Quốc Phiên là nhà sử học nổi tiếng của Đài Loan và từng gia nhập quân đội, cha cô là Vương Diệu Hoàng là tuyển thủ bóng rổ quốc gia của Đài Loan.\nThời niên thiếu cô học tập và lớn lên ở Đài Bắc, thời con đi học Vương Tổ Hiền rất có năng khiếu trong lĩnh vực thể thao và gia đình cũng khuyến khích cô trở thành một cầu thủ bóng rổ chuyên nghiệp khi cô mười bốn tuổi. Sau khi tốt nghiệp Trung học, Vương Tổ Hiền không theo định hướng của bố mẹ mà quyết tâm theo đuổi nghệ thuật. Cô đăng ký theo học diễn xuất ở trường Cao đẳng Nghệ thuật Quốc Quang. Với khuôn mặt xinh đẹp, chiều cao được thừa hưởng từ bố, Vương Tổ Hiền sớm chạm ngõ showbiz với vai trò người mẫu.\nNăm 1982, khi mới 15 tuổi, Vương Tổ Hiền được nhãn hàng thể thao nổi tiếng Adidas mời đóng quảng cáo.\nNăm 1984, Vương Tổ Hiền chính thức gia nhập Cbiz khi đóng vai chính trong bộ phim điện ảnh đầu tay \"Năm nay ven hồ sẽ rất lạnh\" do đạo diễn Đài Loan nổi tiếng Diệp Kim Cam sản xuất và được đề cử danh hiệu Nữ diễn viên chính xuất sắc nhất tại giải thưởng Kim Mã. Tại lễ trao giải, Vương Tổ Hiền nhận được sự quan tâm đặc biệt của Công ty điện ảnh Thiệu Thị và được ký hợp đồng 8 năm với mức giá cao ngất ngưởng 250 nghìn tệ (826 triệu) trong khi ở Đại Lục. Từ đó, Vương Tổ Hiền đã có được rất nhiều cơ hội, được hợp tác với những đạo diễn, diễn viên nổi tiếng trong mảng điện ảnh như Từ Khắc, Vương Gia Vệ, Trương Quốc Vinh, Lương Triều Vỹ, Lưu Đức Hoa, Châu Nhuận Phát, Lương Gia Huy,Trương Học Hữu, Thành Long, Lâm Thanh Hà, Trương Mạn Ngọc, ...\nNăm 1987, vai diễn kinh điển Nhiếp Tiểu Thiện trong phim \"Thiến nữ u hồn\" đóng cùng tài tử Trương Quốc Vinh đã khiến cho sự nghiệp của Vương Tổ Hiền đạt đến đỉnh cao khi trở thành một thần tượng điện ảnh ở các nước Nhật Bản, Hàn Quốc và các quốc gia Châu Á khác, cũng từ đó cô trở thành \"nàng thơ\" của đạo diễn Từ Khắc khi xuất hiện trong hơn 10 tác phẩm phim của ông. Nhờ bộ phim này, Vương Tổ Hiền đã được đề cử cho giải \"Nữ diễn viên chính xuất sắc nhất\" của giải Kim Tượng.\nNăm 1987 - 2003, 16 năm ở đỉnh cao sự nghiệp, Vương Tổ Hiền đã để lại những dấu ấn khó quên trên màn ảnh. Xuất hiện trong các tác phẩm điện ảnh với những vai diễn quyến rũ, ma mị như:Âm Dương Pháp Vương, Tiếu Ngạo Giang Hồ, Thanh Xà, Đông Tà Tây Độc, Thiên Địa Huyền Môn, Hồn Ma A Anh, Tiên trong Tranh,...Vương Tổ Hiền đã gây bão không chỉ ở Đài Loan mà còn cả ở Nhật Bản và Hàn Quốc. Cũng nhờ thế mà cô đã trở thành nữ diễn viên được yêu thích nhất ở nước ngoài và được mệnh danh là \"Đệ nhất mỹ nhân Châu Á\".",
    "aliases": [
      "vương tổ hiền",
      "joey wong",
      "vuong to hien",
      "joey wong cho-yin",
      "王祖賢",
      "joey wang",
      "왕조현",
      "王祖贤",
      "wang zuxian",
      "joi wang",
      "wang tsu-hsien",
      "wang ju-hsien",
      "wang hsu-hsien",
      "joney wang ",
      "جویی وونگ چو-یین"
    ],
    "featured": false
  },
  {
    "slug": "lam-thanh-ha",
    "name": "Lâm Thanh Hà",
    "englishName": "Brigitte Lin",
    "country": "Hồng Kông 🇭🇰",
    "countryCode": "hk",
    "gender": 1,
    "tags": [
      "Võ thuật",
      "Cổ trang",
      "Chính kịch"
    ],
    "roles": "Đông Phương Bất Bại • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/8Nq6F8bPy1HUHl4HkNIF0YGW1xD.jpg",
    "tmdbPersonId": 56830,
    "birthday": "1954-11-03",
    "placeOfBirth": "Taipei, Taiwan",
    "bio": "Lâm Thanh Hà (tiếng Trung: 林青霞; bính âm: Lín Qīngxiá; tiếng Anh: Brigitte Lin Ching-Hsia, sinh ngày 3 tháng 11 năm 1954) là nữ diễn viên người Đài Loan. Được xem là một biểu tượng màn ảnh Hoa ngữ, bà đóng vai trò quan trọng trong sự phát triển của nền điện ảnh Đài Loan với hàng loạt vai nữ chính trong các bộ phim tình cảm thập niên 1970. Sau đó, bà chuyển sang hoạt động tại Hồng Kông và gặt hái thành công vang dội nhờ những vai diễn phi giới tính trong dòng phim kiếm hiệp.\nSau khi kết hôn vào năm 1994, Lâm Thanh Hà rút lui khỏi làng điện ảnh và chuyển sang sự nghiệp viết văn từ những năm 2000. Đến nay, bà đã xuất bản bốn tập tản văn. Năm 2023, bà được trao Giải Thành tựu trọn đời tại Giải Kim Mã lần thứ 60, nhằm ghi nhận những đóng góp to lớn cho điện ảnh Hoa ngữ.\n\nTiểu sử:\n\nLâm Thanh Hà sinh tại Gia Nghĩa, Đài Loan, trong một gia đình ngoại tỉnh nhân (waishengren) có nguồn gốc từ miền đông tỉnh Sơn Đông. Cha mẹ bà di cư đến Đài Loan cùng làn sóng rút lui của Quốc Dân Đảng vào năm 1949. Bà có một chị gái và một em trai. Năm 1972, sau khi tốt nghiệp trường trung học nữ sinh và đang chuẩn bị thi đại học, Lâm Thanh Hà tình cờ được một nhà sản xuất phim phát hiện trên đường phố Đài Bắc, mở ra cơ duyên bước chân vào làng giải trí. Bà ra mắt màn ảnh với bộ phim Outside the Window (1973), chuyển thể từ tiểu thuyết của Quỳnh Dao. Tác phẩm nhanh chóng đưa Lâm Thanh Hà trở thành ngôi sao hàng đầu. Cùng với Lâm Phượng Kiều, Tần Tường Lâm và Tần Hán, bà được xưng tụng là \"Nhị Tần Nhị Lâm\" – biệt danh dành cho bốn ngôi sao thống trị dòng phim tình cảm chuyển thể từ tiểu thuyết Quỳnh Dao trong thập niên 1970, vốn làm mưa làm gió tại phòng vé Đài Loan. Đến năm 1976, Lâm Thanh Hà chính thức gia nhập công ty sản xuất phim của Quỳnh Dao, tiếp tục khẳng định vị thế là một trong những minh tinh nổi bật nhất của điện ảnh Hoa ngữ.\n\nSự nghiệp:\n\nNăm 1972, khi mới 17 tuổi, Lâm Thanh Hà được đạo diễn Tống Tân Thọ phát hiện và mời đến để ký hợp đồng đóng phim Song Ngoại, chuyển thể từ tiểu thuyết cùng tên của Quỳnh Dao.\nThập niên 1970, Thanh Hà xuất hiện trong rất nhiều bộ phim tình cảm của Đài Loan, và những bộ phim này hầu hết đều dựa trên những cuốn tiểu thuyết của Quỳnh Dao.\nSự nổi tiếng trên màn bạc của Thanh Hà đi liền với những rắc rối trong đời tư. Bà vướng vào mối quan hệ tay ba với hai ngôi sao Tần Hán và Tần Tường Lâm, trong đó Tần Hán lúc này đã là người có gia đình và hai con. Vì những tai tiếng này mà công chúng Đài Loan bắt đầu lạnh nhạt với các bộ phim của Thanh Hà.\n\nTrở thành diễn viên hàng đầu Hồng Kông:",
    "aliases": [
      "lâm thanh hà",
      "brigitte lin",
      "lam thanh ha",
      "venus lin",
      "lam ching-ha",
      "lin ching-ha",
      "lin ching-tsia",
      "lam cheng-ha",
      "lin chin-hsia",
      "林青霞",
      "lin ching hsia",
      "임청하",
      "หลินชิงเสีย",
      "brigitte lin ching-hsia",
      "brigette lin",
      "ling ching-tsia",
      "lin ching-shya",
      "lin cheng-hsia",
      "ブリジット・リン",
      "lín qīngxiá",
      "بریژیت لین چینگ-شیا"
    ],
    "featured": false
  },
  {
    "slug": "luong-gia-huy",
    "name": "Lương Gia Huy",
    "englishName": "Tony Leung Ka-fai",
    "country": "Hồng Kông 🇭🇰",
    "countryCode": "hk",
    "gender": 2,
    "tags": [
      "Chính kịch",
      "Tội phạm",
      "Hài"
    ],
    "roles": "Thiên tài diễn xuất • Ảnh đế",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/sPDShFDtDx1pMNwHEx14o4WHrEH.jpg",
    "tmdbPersonId": 56861,
    "birthday": "1958-02-01",
    "placeOfBirth": "Hong Kong, China",
    "bio": "Lương Gia Huy (phồn thể: 梁家輝; giản thể: 梁家辉; bính âm: Liáng Jiāhuī; tên tiếng Anh: Tony Leung Ka-fai; sinh ngày 1 tháng 2 năm 1958) là một diễn viên điện ảnh gạo cội người Hồng Kông.\nTên tiếng Anh của ông là Tony Leung, và để phân biệt với Lương Triều Vỹ, người ta thường gọi ông bằng biệt danh \"Tony Lớn\" (Big Tony).\n\nSự nghiệp:\n\nNăm 1981, Lương Gia Huy đăng ký vào học viện đài TVB, trở thành học viên khóa này cùng lớp với Lưu Đức Hoa, người được xem là một diễn viên kỳ cựu của điện ảnh Hồng Kông với hơn 20 năm diễn xuất. Ông được đánh giá là phù hợp với những phim tình cảm. \nLương từng năm lần giành được giải Ảnh đế Kim Tượng (1984, 1993, 2006, 2013 và 2026). Ông cũng là diễn viên duy nhất nhận giải thưởng này ở 5 thập niên khác nhau.\nNăm 1992, ông cùng nữ diễn viên Jane March đến Việt Nam để thực hiện cảnh quay cho bộ phim Người tình (L'Amant) của đạo diễn Jean-Jacques Annaud. Đây cũng là bộ phim đưa tên tuổi của Lương đến Hollywood, tại đây tuy không được hâm mộ như Thành Long nhưng khả năng diễn xuất đa dạng của ông luôn được khẳng định. Sau khi phim được ra mắt, nhiều người đã ca ngợi Lương Gia Huy lúc bấy giờ là \"người Hồng Kông gợi tình nhất trên màn ảnh\". Mặc dù phim vướng phải nhiều tranh cãi xoay quanh giữa nội dung và tuổi tác của hai diễn viên chính, ông đã tạo được tiếng vang tới khán giả ngoại quốc.\nNăm 2002, ông đóng chung với Củng Lợi trong phim Chuyến tàu của Châu Ngư (Zhou Yu's train), sau đó còn tham gia nhiều phim trong và ngoài nước như Thần thoại, Lạc lối ở Bắc Kinh,...\nNăm 2007, ông đoạt giải Nam diễn viên phụ xuất sắc nhất tại Giải Kim Mã với phim The Drummer.\n\nĐời tư:\n\nLương Gia Huy đã kết hôn với vợ là Giang Gia Nhiên vào năm 1987. Họ có với nhau một cặp sinh đôi, \"Nikki\" Lương Tịnh Hy và \"Chloe\" Lương Dĩnh Thần, vào năm 1992. Cả hai cô con gái đều đã kết hôn và sinh con, với Nikkie kết hôn vào Tháng Mười hai Năm 2024 và Chloe kết hôn vào Tháng sáu Năm 2023. Cả hai cô con gái thường xuyên góp mặt trong các sự kiện có cha mình tham gia và thường xuyên đăng tải các hình ảnh bên cha mình trên mạng xã hội.\n\nPhim đã tham gia:",
    "aliases": [
      "lương gia huy",
      "tony leung ka-fai",
      "luong gia huy",
      "ka fai leung",
      "tony leung",
      "jia-hui liang",
      "เหลียงเจียฮุย",
      "leung ka-fai",
      "leung ka fai tony"
    ],
    "featured": false
  },
  {
    "slug": "nham-dat-hoa",
    "name": "Nhậm Đạt Hoa",
    "englishName": "Simon Yam",
    "country": "Hồng Kông 🇭🇰",
    "countryCode": "hk",
    "gender": 2,
    "tags": [
      "Tội phạm",
      "Hành động",
      "Chính kịch"
    ],
    "roles": "Ông trùm màn ảnh • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/eilxjMhfobctnzZ0kBcFmnqtFyd.jpg",
    "tmdbPersonId": 20519,
    "birthday": "1955-03-19",
    "placeOfBirth": "Hong Kong, China",
    "bio": "Nhậm Đạt Hoa (tiếng Anh: Simon Yam, sinh ngày 19 tháng 3 năm 1955) là một nam diễn viên người Hồng Kông.\n\nSự nghiệp:\n\nNhậm Đạt Hoa khởi nghiệp người mẫu trước khi dấn thân làm diễn viên vào giữa thập niên 1970. Sau đó ông ký hợp đồng với kênh truyền hình TVB của Hồng Kông, diễn trong một số bộ phim truyền hình trước khi chuyển sang đóng điện ảnh vào năm 1987. Anh trai ông là Nhậm Đạt Vinh, nguyên Phó ủy viên Cảnh sát Hồng Kông đã nghỉ hưu.\nNăm 1989, ông đóng trong bộ phim Bloodfight do Hồng Kông và Nhật Bản hợp tác sản xuất. Đây là phim đầu tiên của Hồng Kông có ngôn ngữ bằng tiếng Anh trong suốt cả phim. Năm 1992, ông nhận được lời khen của giới phê bình nhờ vai diễn Phán quan điên cuồng trong phim hình sự Hiệp đạo Cao Phi, trong phim ông có một trận chiến đẫm máu với nhân vật do Châu Nhuận Phát thủ vai. Năm 1993, ông thủ vai \"Dhalsim\" trong phim hài-hành động Bá vương học hiệu siêu cấp, một bản giễu nhại Street Fighter do Vương Tinh làm đạo diễn. Năm 1996, ông nhận vai Tưởng Thiên Sinh, thủ lĩnh của nhóm Hội Tam Hoàng Hung Nô trong ba phần đầu tiên của loạt phim điện ảnh Người trong giang hồ.\nNăm 2000, ông thủ vai Tướng thần, tổ tiên của tất cả ma cà rồng trong phim truyền hình Trưởng thám cương thi 2, do đài ATV sản xuất. Năm 2003, ông có bộ phim đóng đầu tay ở Hollywood trong Lara Croft: Tomb Raider – The Cradle of Life với vai trùm tội phạm Chen Lo.\nNăm 2013, Nhậm đạo diễn bộ phim đầu tiên, nằm trong bộ phim kinh dị tuyển tập Liệt hệ quỷ Lý Bích Hoa 1. Tháng 2 năm 2021, ông, Lương Triều Vỹ và Lưu Đức Hoa hợp tác trong một dự án phim hành động mang tên Goldfinger, do Điện ảnh Anh Hoàng (Emperor Motion Pictures) và các đối tác Trung Quốc đại lục tài trợ, với kinh phí ước tính khoảng 30,8 triệu USD (200 triệu đôla Hồng Kông).\n\nĐời tư:\n\nÔng kết hôn với người vợ đầu Hạ Thụy Ý từ năm 1981 đến 1986. Năm 1997, ông kết hôn với người mẫu Kỳ Kỳ. Cô sinh ra ở Thượng Hải nhưng lớn lên ở Áo. Họ có một con gái tên Ella. Ngày 20 tháng 7 năm 2019, ông bị đâm dao tại một sự kiện quảng cáo ở Trung Quốc. Ông bị thương nhẹ và quản lý của ông chia sẻ: \"Ông ấy bị đâm vào vùng bụng và một vết cắt ở tay phải.\" Sau đó ông trải qua một ca phẫu thuật nhỏ ở Trung Sơn và đã bình phục. Ông yêu thích việc đầu tư bất động sản ở Hồng Kông.",
    "aliases": [
      "nhậm đạt hoa",
      "simon yam",
      "nham dat hoa",
      "simon yam tat-wah",
      "ren da-hua",
      "yam tat-wah",
      "ren dahua",
      "سایمون یام",
      "سیمون یام",
      "саймон ям",
      "рен да-хуа",
      "рен дахуа",
      "саймон ям тат-ва",
      "任达华",
      "任達華"
    ],
    "featured": false
  },
  {
    "slug": "huynh-tong-trach",
    "name": "Huỳnh Tông Trạch",
    "englishName": "Bosco Wong",
    "country": "Hồng Kông 🇭🇰",
    "countryCode": "hk",
    "gender": 2,
    "tags": [
      "TVB",
      "Tội phạm",
      "Hành động"
    ],
    "roles": "Tiểu sinh TVB • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/o6RGUQXQRobk2PhoTc6zqpOC9yr.jpg",
    "tmdbPersonId": 144586,
    "birthday": "1980-12-13",
    "placeOfBirth": "Hong Kong, China",
    "bio": "Huỳnh Tông Trạch (tiếng Anh: Bosco Wong, sinh ngày 13 tháng 12 năm 1980 tại Hồng Kông thuộc Anh) là một nam diễn viên kiêm ca sĩ người Hồng Kông. Anh từng là diễn viên độc quyền của đài truyền hình TVB.\nAnh nổi tiếng từ bộ phim truyền hình hiện đại Bao la vùng trời năm 2003. Một số tác phẩm truyền hình tiêu biểu của anh có thể kể đến Mẹ chồng nàng dâu (2005), Cạm bẫy (2006), Tiềm hành truy kích (2011), Vẫn cứ thích em (2015) và loạt phim Phi hổ cực chiến. Anh cũng tham gia các phim điện ảnh như Bước Ngoặc 2 (2011), Anh em có nhau/Đàn ông không thể nghèo (2014) và Hình cảnh huynh đệ (2016). Huỳnh Tông Trạch giành chiến thắng tại hạng mục Nam diễn viên chính xuất sắc tại Giải thưởng thường niên TVB 2025 nhờ vai Cổ Triệu Hoa trong phim Nữ hoàng tin tức 2.\n\nTiểu sử và sự nghiệp:\n\nHuỳnh Tông Trạch sinh ngày 13 tháng 12 năm 1980 tại Hồng Kông. Anh từng học trường Tiểu học Ng Wah Catholic Primary School (1992) ở trường tiểu học, và trường Trung học The Church of Christ in China Kei Heep Secondary School (1999).\nSau một thời gian hoạt động trong ngành giải trí, anh lấn sân sang kinh doanh từ năm 2014.\n\n1998–2005: Khởi đầu sự nghiệp và đột phá:\n\nHuỳnh Tông Trạch gia nhập làng giải trí vào năm 1998 trong một quảng cáo trà chanh cùng Trương Bá Chi. Khi ấy, bề ngoài và diễn xuất của anh chưa thực sự gây ấn tượng với khán giả. Bên cạnh đó, vì muốn hoàn tất việc học nên anh đã gác lại không ít cơ hội xuất hiện trên truyền hình. Ngay sau khi tốt nghiệp Trung học phổ thông, Huỳnh Tông Trạch đến TVB làm việc ở tuổi 19. Trong mấy năm đầu ở TVB, Huỳnh Tông Trạch khởi đầu bằng việc dẫn chương trình cho một số show của TVB cũng như đóng vai nhỏ trong một vài phim của TVB.\nHuỳnh Tông Trạch có màn ra mắt chính thức trong phim Đội cứu hoả anh hùng 2 (2002). Sau đó, anh được chọn tham gia bộ phim cổ trang Thanh đao công lý (2003) và bộ phim dành cho lứa tuổi mới lớn Khát vọng tuổi trẻ (2003). Anh trở nên nổi tiếng với vai diễn viên phi công Chris Tạ Lập Hào trong bộ phim bom tấn năm 2003 Bao la vùng trời. Sau đó, anh đóng vai chính là trong bộ phim hành động truyền kỳ Khí phách Hoàng Phi Hồng năm 2004.\nNăm 2005, anh đóng vai chính Ninh Mậu Xuân cùng với Uông Minh Thuyên và Hồ Hạnh Nhi trong bộ phim hài cổ trang Mẹ chồng nàng dâu và giành được giải Nam diễn viên tiến bộ nhất tại Giải thưởng thường niên TVB năm đó.\n\n2006–2017: Thành công tại TVB:",
    "aliases": [
      "huỳnh tông trạch",
      "bosco wong",
      "huynh tong trach",
      "wong chung-chak"
    ],
    "featured": false
  },
  {
    "slug": "xa-thi-man",
    "name": "Xa Thi Mạn",
    "englishName": "Charmaine Sheh",
    "country": "Hồng Kông 🇭🇰",
    "countryCode": "hk",
    "gender": 1,
    "tags": [
      "TVB",
      "Cổ trang",
      "Chính kịch"
    ],
    "roles": "Nhất tỷ TVB • Thị Hậu",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/nacsBV6rdWH3rTy5cZpiwb9luFB.jpg",
    "tmdbPersonId": 123643,
    "birthday": "1975-05-28",
    "placeOfBirth": "Hong Kong, China",
    "bio": "Xa Thi Mạn (phiên âm chính xác là Xà Thi Mạn, tiếng Trung: 佘詩曼, tiếng Anh: Charmaine Sheh Sze-man; sinh ngày 28 tháng 5 năm 1975) là một nữ diễn viên người Hồng Kông. Cô từng là diễn viên độc quyền của hãng TVB.\n\nTiểu sử và sự nghiệp:\n\nXa Thi Mạn lúc nhỏ học trường nữ sinh Hiệp Ân, cho đến năm lớp 11 mới đi du học Thụy Sĩ chuyên ngành quản lý khách sạn tại Học viện Quản trị Khách sạn Quốc tế Thụy Sĩ và tốt nghiệp vào năm 1994. Trước đây Xa Thi Mạn từng có ý định làm giáo viên mầm non vì cô rất thích trẻ em, nhưng mẹ đã khuyên cô đi thi Hoa hậu Hồng Kông 1997 và đạt danh hiệu Á hậu 2. Với danh hiệu này, cô đại diện cho Hồng Kông tại cuộc thi Hoa hậu Quốc tế nhưng không đạt thành tích.\nTháng 10 năm 1997, Xa Thi Mạn gia nhập TVB. Do Xa Thi Mạn không phải xuất thân từ lớp đào tạo cũng chưa từng trải qua bất kì sự huấn luyện nào về diễn xuất nên TVB đã sắp xếp cho cô tham gia bộ phim Long hổ tranh hùng để rèn luyện về mặt diễn xuất. Hoàn thành vai diễn trong Long hổ tranh hùng, Xa Thi Mạn chính thức tham gia phim Tuyết sơn phi hồ. Lúc đó diễn xuất còn non nớt, Xa Thi Mạn đã nhận không ít lời phê bình về giọng nói nhút nhát và diễn xuất cứng đơ. Thời ấy, Xa Thi Mạn thường bị gắn mác \"bình hoa di động\".\nĐể khắc phục về tiếng nói lẫn diễn xuất của mình, Xa Thi Mạn ngày đêm khổ luyện, mỗi ngày cô lấy báo ra tập đọc và tỉ mỉ cố gắng tập diễn xuất, thậm chí có ngày cô chỉ ngủ một tiếng đồng hồ. Tính kiên trì của cô là do hoàn cảnh thời thơ ấu tạo nên. Xa Thi Mạn mồ côi cha vào năm cô 5 tuổi sau một vụ tai nạn giao thông. Mẹ cô phải nuôi lớn ba đứa con, lại phải giải quyết những vấn đề của công ty mậu dịch xuất khẩu mà chồng bà để lại nên cuộc sống vô cùng khó khăn. Mãi cho đến khi nhận được tiền bảo hiểm, tình hình kinh tế của gia đình mới có thể cải thiện. Giai đoạn đó đã để lại dấu ấn sâu sắc trong tâm trí Xa Thi Mạn. Từ đó, dù gặp bất kì hoàn cảnh khó khăn đến mấy cô cũng đối mặt với tinh thần không bao giờ nói hai từ \"thất bại\". Nhờ vậy, Xa Thi Mạn đã khắc phục được những vấn đề này và đã tạo ra một bước đột phá trong bộ phim Đường về hạnh phúc.\nVới việc tham gia nhiều bộ phim như Bích Huyết Kiếm, Tân Ỷ Thiên Đồ Long Ký, Hương Đồng Gió Nội, Trường Bình Công Chúa,... đặc biệt là Thâm Cung Nội Chiến đã giúp Xa Thi Mạn khẳng định diễn xuất của mình. Hàng loạt tác phẩm được đầu tư với kinh phí cao và đạt được những thành công rực rỡ như Thâm cung nội chiến, Phụng hoàng lâu, Cung tâm kế, Công chúa giá đáo.\nNăm 2006, Xa Thi Mạn đoạt hai giải Nữ diễn viên chính xuất sắc nhất và Nhân vật truyền hình nữ được yêu thích nhất tại Giải thưởng thường niên TVB với các vai diễn trong Phụng Hoàng Lâu.\nXa Thi Mạn là nữ diễn viên truyền hình Hồng Kông đầu tiên lọt vào bán kết hạng mục Nữ diễn viên chính xuất sắc nhất tại Giải Emmy Quốc tế lần thứ 35 vào năm 2007. Năm 2011, cô được trao giải Nữ diễn viên chính xuất sắc nhất tại Giải thưởng Truyền hình Châu Á với vai diễn Công chúa Chiêu Dương trong Công chúa giá đáo.",
    "aliases": [
      "xa thi mạn",
      "charmaine sheh",
      "xa thi man",
      "佘詩曼",
      "佘诗曼",
      "charmaine sheh sze-man",
      " sheh sze-man",
      "she shiman",
      "شارمین شه سی-مان",
      "she shi man"
    ],
    "featured": false
  },
  {
    "slug": "park-bo-gum",
    "name": "Park Bo-gum",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 2,
    "tags": [
      "K-Drama",
      "Tình cảm",
      "Chính kịch"
    ],
    "roles": "Diễn viên truyền hình & điện ảnh",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/iQHhzpJnxPAeZetNLJPr3gTs1rE.jpg",
    "tmdbPersonId": 587634,
    "birthday": "1993-06-16",
    "placeOfBirth": "Seoul, South Korea",
    "bio": "Park Bo-gum (Hangul: 박보검; chữ Hán: 朴寶劍; Hán-Việt: Phác Bảo Kiếm; sinh ngày 16 tháng 6 năm 1993) là một nam diễn viên và ca sĩ người Hàn Quốc. Anh được công nhận với nhiều vai diễn khác nhau trong điện ảnh và truyền hình, đáng chú ý là luật sư tâm thần trong Xin chào Quái vật (2015), thiên tài chơi cờ vây trong Hồi đáp 1988 (2015), Thái tử Joseon trong Mây hoạ ánh trăng (2016), thanh niên tự do đem lòng yêu một người phụ nữ lớn tuổi hơn trong Gặp gỡ (2018), và một người mẫu vượt qua nhiều trở ngại để trở thành một diễn viên thành công trong Ký sự thanh xuân (2020).\nPark Bo-gum là nghệ sĩ trẻ nhất được Gallup Korea bầu chọn là Nam diễn viên của năm. Anh cũng là diễn viên đầu tiên từng đứng đầu danh sách Những người nổi tiếng quyền lực nhất Hàn Quốc của Forbes Korea.\n\nTiểu sử và học vấn:\n\nPark Bo-gum sinh ngày 16 tháng 6 năm 1993 tại Seoul, Hàn Quốc. Anh là con út trong gia đình có ba anh chị em. Tên “Bo-gum” của anh mang ý nghĩa “một điều tốt đẹp sẽ đến đúng thời điểm” trong tiếng Hàn, đồng thời có nghĩa là “thanh kiếm báu” trong tiếng Trung. Mẹ của Park Bo-gum qua đời khi anh đang học lớp 4. Anh hiện sinh sống cùng cha và các anh chị tại khu vực Mok-dong, Seoul.\nPark Bo-gum bắt đầu học piano từ năm 5 tuổi và ban đầu mong muốn trở thành ca sĩ kiêm nhạc sĩ. Trong thời gian học trung học cơ sở tại trường Mokdong ở Seoul, anh từng là thành viên của đội tuyển bơi lội của trường.\nKhi học lớp 11, do hoàn cảnh kinh tế gia đình gặp khó khăn, Park Bo-gum nhận thấy bản thân cần có trách nhiệm hơn với gia đình. Anh gửi một đoạn video ghi lại cảnh hát và chơi piano của mình đến một số công ty giải trí, sau đó nhận được nhiều lời mời tuyển dụng. Anh trở thành thực tập sinh tại SidusHQ với định hướng phát triển sự nghiệp ca sĩ. Tuy nhiên, theo đề xuất từ công ty, anh chuyển hướng sang lĩnh vực diễn xuất.\nSau khi tốt nghiệp trường trung học Shinmok vào năm 2012, Park Bo-gum theo học ngành Sân khấu Nhạc kịch tại Myongji University từ tháng 3 năm 2014. Năm 2015, anh đại diện cho trường tham gia chương trình giao lưu văn hóa quốc tế tại các thành phố thuộc Anh, Pháp, Ý và Thụy Sĩ. Anh tốt nghiệp và nhận bằng Cử nhân vào tháng 2 năm 2018. Sau khi hoàn thành nghĩa vụ quân sự vào ngày 30 tháng 4 năm 2022, Park Bo-gum tiếp tục theo học chương trình Thạc sĩ chuyên ngành Âm nhạc tại Đại học Sangmyung.\nVề hoạt động trên mạng xã hội, Park Bo-gum từng thường xuyên sử dụng tài khoản X (@BOGUMMY). Ngoài ra, anh cũng sở hữu tài khoản Weibo nhưng không thường xuyên cập nhật. Hiện tại, Park Bo-gum hoạt động dưới sự quản lý của The Black Label.\n\nNhân cách:",
    "aliases": [
      "park bo-gum",
      "park bo gum",
      "park bo-geom",
      "樸寶劍",
      "پارک بو گوم",
      "پارک بوگوم",
      "پارک بو-گوم"
    ],
    "featured": false
  },
  {
    "slug": "ji-chang-wook",
    "name": "Ji Chang-wook",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 2,
    "tags": [
      "K-Drama",
      "Hành động",
      "Tình cảm"
    ],
    "roles": "Nam thần hành động • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/sBmHrO5Tn27Ot5hy0yAKniROmNb.jpg",
    "tmdbPersonId": 1253391,
    "birthday": "1987-07-05",
    "placeOfBirth": "Anyang, Gyeonggi, South Korea",
    "bio": "Đây là một tên người Triều Tiên, họ là Ji.\n\nJi Chang-wook (tiếng Hàn: 지창욱; sinh ngày 5 tháng 7 năm 1987) là một nam diễn viên, người mẫu người Hàn Quốc. Khởi nghiệp là một diễn viên nhạc kịch, anh được khán giả biết đến qua vai diễn trong bộ phim Cười lên Dong-hae, một trong những tác phẩm ăn khách nhất tại Hàn Quốc trong nửa đầu năm 2011 với chỉ số rating đạt tới 41%. Thế nhưng, vai diễn Hoàng đế Ta-hwan trong Hoàng hậu Ki mới chính là bệ phóng đưa Ji Chang-wook lên đỉnh cao sự nghiệp và trở thành ngôi sao hạng A của nền điện ảnh Hàn Quốc nói riêng và châu Á nói chung với nhiều giải thưởng lớn cùng lời đánh giá cao tới từ giới chuyên môn. Các tác phẩm nổi bật của Chang-wook như: Chiến binh Baek Dong-soo (2011), Hoàng hậu Ki (2013 - 2014), Cứu thế (2014 - 2015), The K2 (2016), Đối tác bất ngờ (2017), Nhẹ nhàng tan chảy (2019), Cửa hàng tiện lợi Saet Byul (2020), Tình yêu chốn đô thị (2020 - 2021), Thanh âm của phép thuật (2022), và Nói cho tôi điều ước của bạn (2022).\n\nSự nghiệp:\n\n2006 - 2009: Khởi đầu sự nghiệp:\n\nJi Chang-wook bắt đầu sự nghiệp của mình trong sân khấu nhạc kịch. Anh xuất hiện lần đầu trên màn ảnh trong bộ phim Days... năm 2006 và có một vai nhỏ trong You Stole My Heart.  Anh chính thức ra mắt vào năm 2008 qua bộ phim, Sleeping Beauty.\nNăm 2009, anh xuất hiện trong My Too Perfect Sons, vào vai cậu em út nhút nhát, người phải nuôi con gái của người bạn thân nhất khi mới 20 tuổi. Bộ phim gia đình cuối tuần nhận được rating trên 40%. Sau đó anh đảm nhận một vai phụ trong bộ phim hài hành động Hero.\n\n2010 - 2012: Tên tuổi đang ngày càng được biết đến rộng rãi:\n\nNăm 2010, Ji Chang-wook được chọn vào vai chính đầu tiên trong bộ phim truyền hình hàng ngày dài 159 tập, Cười lên Dong-hae, đóng vai một vận động viên trượt băng tốc độ đường ngắn người Mỹ gốc Hàn. Cười lên Dong-hae đứng đầu bảng xếp hạng trong 15 tuần liên tiếp và anh được trao giải \"Nam diễn viên chính xuất sắc nhất trong phim truyền hình hàng ngày\" tại KBS Drama Awards.\nSau đó anh đóng vai chính trong loạt phim hành động lịch sử năm 2011, Chiến binh Baek Dong-soo (2011). Được chuyển thể từ manhwa của Lee Jae-heon, Honorable Baek Dong-soo , đây là câu chuyện gốc về kiếm sĩ thời Joseon, Baek Dong-soo, kể về những năm đầu đời của anh cho đến khi âm mưu chính trị tạo ra sự cạnh tranh với kẻ thù từ bạn thân thời thơ ấu của anh. Bộ phim đứng đầu khung giờ chiếu trong 13 tuần và Chang-wook đã nhận được \"Giải thưởng Ngôi sao mới\" tại SBS Drama Awards. Cuối năm đó, anh đóng vai chính trong bộ phim truyền hình cáp Tiệm rau của anh chàng độc thân dựa trên câu chuyện có thật về Lee Young-seok, một chàng trai trẻ đã biến cửa hàng rau nhỏ rộng 350 mét vuông vào năm 1998 thành chuỗi cửa hàng nhượng quyền toàn quốc với 33 cửa hàng.\nTrong vai phản diện đầu tiên trong bộ phim tình cảm, Năm ngón tay (2012), Ji Chang-wook vào vai một nghệ sĩ piano ghen tị với năng khiếu âm nhạc bẩm sinh của anh trai mình.",
    "aliases": [
      "ji chang-wook",
      "ji chang wook",
      "ji changwook"
    ],
    "featured": false
  },
  {
    "slug": "lee-dong-wook",
    "name": "Lee Dong-wook",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 2,
    "tags": [
      "K-Drama",
      "Tình cảm",
      "Kinh dị"
    ],
    "roles": "Thần Chết • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/khwUahjzIHFlrxYeKQAWrbWqsL6.jpg",
    "tmdbPersonId": 1238592,
    "birthday": "1981-11-06",
    "placeOfBirth": "Seoul, South Korea",
    "bio": "Đây là một tên người Triều Tiên, họ là Lee.\n\nLee Dong-wook (Hangul: 이동욱, Hanja: 李棟旭, Hán-Việt: Lý Đông Húc, sinh ngày 6 tháng 11 năm 1981) là một nam diễn viên, người mẫu và người dẫn chương trình truyền hình người Hàn Quốc. Anh được khán giả biết đến với các vai chính trong các bộ phim truyền hình Cô em họ bất đắc dĩ (2005), Scent of a Woman (2011), Ông hoàng khách sạn (2014), Bubble gum (2015),Yêu tinh (2016), Sinh mệnh (2018), Chạm vào tim em (2019) và Bạn trai tôi là Hồ Ly (2020), Người hùng điên rồ (2021).\n\nSự nghiệp:\n\nLee Dong-wook bắt đầu sự nghiệp diễn xuất vào năm 1999, tiếp tục với những vai diễn đơn thuần cho đến khi trở thành ngôi sao với vai chính trong phim truyền hình lãng mạn Cô em họ bất đắc dĩ vào năm 2005. Bộ phim không những phổ biến với khán giả trong nước mà còn ở nước ngoài, đặc biệt là ở châu Á và khu vực Đông Nam Á. Sau đó anh tiếp tục thủ vai chính trong phim truyền hình hình sự, bí ẩn La Dolce Vita (2008), tâm lý, hài hước Partner (2009), tình cảm Scent of a Woman (2011), Wild Romance (2012), cổ trang Kẻ trốn chạy của Joseon (2013) và phim truyền hình dài tập Ông hoàng khách sạn.\nTháng 11 năm 2011, Lee Dong-wook ký hợp đồng với công ty giải trí King Kong Entertainment.\nDong-wook cùng với nghệ sĩ hài Shin Dong-yup trở thành MC mới của talk show Strong Heart từ tháng 4 năm 2012 đến tháng 1 năm 2013. Anh cũng xuất hiện vào mùa 1 và 2 của Roomate.\nVào năm 2016, Lee Dong-wook xác nhận tham gia phim truyền hình viễn tưởng-lãng mạn Yêu tinh cùng với Gong Yoo, phát sóng vào tháng 12 đến tháng 2 năm 2017. Anh đóng vai Thần Chết. Bộ phim thành công vang dội, là một trong những bộ phim có rating cao nhất trong lịch sử truyền hình đài cáp.\nNăm 2018, Lee Dong-wook đóng vai chính trong bộ phim y khoa Life, anh đóng vai một bác sĩ làm việc tại Khoa ER.\nĐến năm 2020, anh đã tiếp tục tạo nên tiếng vang lớn khi tham gia bộ phim Bạn trai tôi là Hồ Ly khi đóng vai chính là hồ ly chín đuôi Lee Yeon.\nNgoài sự nghiệp diễn xuất, năm 2013, Lee Dong-wook đã ký hợp đồng quảng cáo với thương hiệu nước xả vải Downy và đã xuất hiện trong quảng cáo nước xả vải Downy Huyền Bí.\n\nĐời tư:\n\nAnh nhập ngũ vào tháng 8 năm 2009 và xuất ngũ vào tháng 6 năm 2011.",
    "aliases": [
      "lee dong-wook",
      "lee dong wook",
      "lee dongwook",
      "이동욱",
      "dong-wook lee",
      "李栋旭",
      "лі дон ук",
      "لی دونگ ووک",
      "ли донук",
      "ли дон ук",
      "ли дон-ук",
      "лі дон-ук",
      "لي دونغ-ووك"
    ],
    "featured": false
  },
  {
    "slug": "park-min-young",
    "name": "Park Min-young",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 1,
    "tags": [
      "K-Drama",
      "Tình cảm",
      "Hài"
    ],
    "roles": "Nữ hoàng phim hài tình cảm",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/5Op0Gx0DULFLHtGdWVdqnYdwkAS.jpg",
    "tmdbPersonId": 1234603,
    "birthday": "1986-03-04",
    "placeOfBirth": "Seoul, South Korea",
    "bio": "Park Min-young (tiếng Hàn: 박민영, sinh ngày 4 tháng 3 năm 1986) là nữ diễn viên và người mẫu Hàn Quốc. Cô được biết đến nhiều nhất và trở nên nổi tiếng khắp châu Á với vai chính trong các phim truyền hình Sungkyunkwan Scandal (2010) và City Hunter (2011).. Park Min-young còn gây ấn tượng với vai chính đầu tay trong phim điện ảnh thuộc thể loại tâm linh \"The Cat\".\nNăm 2018 Park Min-young đạt được nhiều thành công khi đóng vai nữ chính trong bộ phim Thư ký Kim sao thế?. \nHiện nay cô là một trong những nữ diễn viên nổi tiếng và được yêu thích nhất Hàn Quốc.",
    "aliases": [
      "park min-young",
      "park min young",
      "min-young park",
      "朴敏英",
      "παρκ μιν-γιουνγκ",
      "пак мин-ён",
      "پارک مین یونگ",
      "rachel park min young",
      "rachel park"
    ],
    "featured": false
  },
  {
    "slug": "kim-tae-ri",
    "name": "Kim Tae-ri",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 1,
    "tags": [
      "Chính kịch",
      "K-Drama",
      "Tình cảm"
    ],
    "roles": "Nàng thơ điện ảnh • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/gFofVUeVlIvBJMUv7maHQwWdfsk.jpg",
    "tmdbPersonId": 1537768,
    "birthday": "1990-04-24",
    "placeOfBirth": "Seoul, South Korea",
    "bio": "Đây là một tên người Triều Tiên, họ là Kim.\n\nKim Tae-ri (tiếng Hàn: 김태리; sinh ngày 24 tháng 4 năm 1990) là một nữ diễn viên người Hàn Quốc. Cô được biết đến qua việc thể hiện những vai chính trong các bộ phim bao gồm vai diễn Nam Sook-hee trong The Handmaiden (2016), vai diễn Go Ae-shin trong Quý ngài Ánh dương (2018), và vai diễn Na Hee-do trong Tuổi hai lăm, tuổi hai mốt (2022).\n\nTiểu sử:\n\nKim Tae-ri sinh ngày 24 tháng 4 năm 1990 tại Seoul. Cô có một người anh trai lớn hơn hai tuổi tên là Kim Hye-yeon. Hai anh em cô được bà nội nuôi dạy từ khi còn nhỏ do cha mẹ quá bận rộn với công việc. Ban đầu, mẹ cô muốn đặt tên cho cô là \"Tae-jeong\" vì bà ấy muốn con gái mình sau này trở thành một chính trị gia, nhưng cha cô đã đổi sang thành Tae-ri khi kê giấy khai sinh cho cô.  Cô chia sẻ rằng: ý nghĩa của cái tên mà cha cô đặt là khi cô được sinh ra, một bông hoa lê đã nở rộ thật đẹp trong xóm.\nSau khi tốt nghiệp trường Trung học nữ Youngshin, cô theo học ngành truyền thông báo chí tại Đại học Kyung Hee và cô đã tốt nghiệp với tấm bằng cử nhân.\n\nSự nghiệp:\n\nKim Tae-ri bắt đầu sự nghiệp diễn xuất của mình bằng cách tham gia vào một vài vở kịch nhỏ và tham gia vào một vài quảng cáo CF nhỏ nhờ sở hữu ngoại hình xinh xắn. Vào năm 2015, khi tham gia buổi casting cho bộ phim The Handmaiden của đạo diễn lừng danh Park Chan-wook cô đã đánh bại 1.600 thí sinh để có được vai diễn nữ chính đầu tiên trên màn ảnh rộng, diễn xuất bên cạnh những tên tuổi lớn Kim Min-hee, Ha Jung-woo, Jo Jin-woong. Đạo diễn Park đã không tiếc lời ca ngợi cô: \"Cô ấy là tân binh nhưng sở hữu một diễn xuất tự tin như một diễn viên chuyên nghiệp\". Bộ phim đã mang về cho Kim Tae-ri nhiều đề cử và giải thưởng danh giá. Cô đã chiến thắng 8/10 đề cử liên tục từ năm 2016 đến 2017. Ngoài ra, Bộ phim The Handmaiden của đạo diễn Park Chan-wook còn vinh dự được mời đi tranh giải Cành Cọ Vàng tại Cannes và diễn xuất của Kim Tae-ri được nhiều nhà phê bình đánh giá rất cao. Năm 2018, The Handmaiden còn xuất sắc trở thành \"Phim nước ngoài hay nhất\" tại Giải thưởng viện Hàn Lâm Anh Quốc (BAFTA), được xem như Oscar của nước Anh.\nThừa thắng xông lên, năm 2017, Kim Tae-ri xuất hiện trong bộ phim mang đề tài chính trị 1987: When the Day Comes bên cạnh các bậc tiền bối tên tuổi như Kim Yoon-seok, Ha Jung-woo, Yoo Hae-jin và lập nhiều kỷ lục phòng vé. Bộ phim được vinh danh ở nhiều giải thưởng và được Tổng Thống Hàn Quốc khen ngợi. Năm 2018, Kim Tae-ri tiếp tục xuất hiện vào vai chính của bộ phim Little Forest. Vai chính Hye-won đã giúp cô chiến thắng ở hạng mục \"Diễn viên nữ xuất sắc nhất\" năm 2018 của giải thưởng 18th Director'c Cut Awards, giải thưởng Hiệp hội đạo diễn Hàn Quốc bình chọn. Cùng năm đó, cô chào sân lần đầu trên màn ảnh nhỏ trong bộ phim cổ trang Quý ngài Ánh dương, được chấp bút bởi biên kịch vàng Kim Eun-sook. Quý ngài Ánh dương liên tục lập kỷ lục rating, diễn xuất của cô nhận được nhiều lời khen ngợi từ khán giả cũng như giới chuyên môn.",
    "aliases": [
      "kim tae-ri",
      "kim tae ri",
      "tae ri kim",
      "gim tae-ri",
      "kim t'ae-ri"
    ],
    "featured": false
  },
  {
    "slug": "han-hyo-joo",
    "name": "Han Hyo-joo",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 1,
    "tags": [
      "K-Drama",
      "Hành động",
      "Tình cảm"
    ],
    "roles": "Mỹ nhân nụ cười • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/4E7NuJsR7AnMYAefFSHkj4cftdf.jpg",
    "tmdbPersonId": 240145,
    "birthday": "1987-02-22",
    "placeOfBirth": "Cheongju, North Chungcheong, South Korea",
    "bio": "Han Hyo-joo (sinh ngày 22 tháng 2 năm 1987) là một nữ diễn viên nổi tiếng người Hàn Quốc, được biết đến qua các tác phẩm Iljimae (2008), Người Thừa Kế Sáng Giá (2009), Dong Yi (2010),  Always (2011), Love 911 (2012), Cold Eyes (2013), The Beauty Inside (2015), Hai Thế Giới (2016), Hạnh Phúc: Chung Cư Có Độc (2021) và Moving (2023). Năm 2010, cô thắng giải Daesang của đài MBC với bộ phim truyền hình Dong Yi. Cũng với Dong Yi, Han Hyo Joo xuất sắc giành được danh hiệu Thị Hậu - Nữ diễn viên chính xuất sắc nhất (Truyền hình) tại Giải thưởng Nghệ thuật Baeksang lần thứ 47 vào năm 2011 khi mới 24 tuổi. Năm 2013, cô đã đạt được giải thưởng danh giá Nữ diễn viên chính xuất sắc nhất tại Giải thưởng Điện ảnh Rồng Xanh lần thứ 34 với vai diễn trong bộ phim điện ảnh Cold Eyes (2013) khi tuổi đời còn rất trẻ.\n\nCuộc đời:\n\nHan Hyo Joo sinh ra và lớn lên tại Cheongju, tỉnh Bắc Chungcheong. Mẹ cô từng là giáo viên tiểu học trước khi trở thành thanh tra công trường. Cha cô từng là sĩ quan không quân. Lúc bé, Han Hyo Joo giỏi thể thao, đặc biệt là điền kinh. Năm hai trung học, cô chuyển đến Seoul một mình và theo học trường Trung học Bulgok, bất chấp sự phản đối gay gắt của cha. Sau đó cô theo học tại trường Đại học Dongguk - Khoa Sân khấu điện ảnh.\n\nSự nghiệp:\n\n2003 – 2006: Khởi đầu:\n\nHan Hyo Joo được phát hiện qua một cuộc thi sắc đẹp thiếu niên, tổ chức bởi tập đoàn thực phẩm Binggrae vào năm 2003. Cô bắt đầu sự nghiệp diễn xuất với phim sitcom Nonstop 5 (2005) và phim điện ảnh hài My Boss, My Teacher (2006). Tên tuổi của Han Hyo Joo càng thêm nổi tiếng kể từ sau vai chính đầu tiên trong bộ phim truyền hình Điệu Valse Mùa Xuân (Spring Waltz) năm 2006, phim thứ tư và cũng là phim cuối cùng trong loạt phim tình yêu bốn mùa của đạo diễn nổi tiếng Yoon Seok Ho..\nCũng trong năm 2006, cô được đảm nhận vai chính đầu tiên trên màn ảnh rộng trong bộ phim độc lập kinh phí thấp Ad-lib Night của đạo diễn Lee Yoon Ki. Phim đã được chọn trình chiếu tại Liên hoan phim quốc tế Berlin lần thứ 57. Ở tác phẩm điện ảnh đầu tay này, Han Hyo Joo đã nhận được giải thưởng Nữ diễn viên mới xuất sắc nhất tại Giải thưởng Hiệp hội phê bình phim Hàn Quốc lần thứ 26 và giải thưởng Nữ diễn viên xuất sắc nhất tại Liên hoan phim quốc tế Singapore lần thứ 20.\n\n2007 – 2010: Vai diễn đột phá và gặt hái danh tiếng tầm quốc tế:",
    "aliases": [
      "han hyo-joo",
      "han hyo joo",
      "한효주",
      "hyo-ju han ",
      "han  hyo-ju ",
      "hyo-joo han",
      "han hyo ju",
      "韓孝周",
      "ハン・ヒョジュ",
      "韩孝周",
      "هان هیۆ جو",
      "韩孝珠",
      "هان هیو جو"
    ],
    "featured": false
  },
  {
    "slug": "lee-do-hyun",
    "name": "Lee Do-hyun",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 2,
    "tags": [
      "K-Drama",
      "Chính kịch",
      "Kinh dị"
    ],
    "roles": "Tân binh quái vật • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/8LhhJWLGCoOPt5ygpDlrmfr1VOm.jpg",
    "tmdbPersonId": 2341408,
    "birthday": "1995-04-11",
    "placeOfBirth": "Goyang, Gyeonggi, South Korea",
    "bio": "Lee Do-hyun (tiếng Hàn: 이도현, sinh ngày 11 tháng 04 năm 1995) tên thật là Lim Dong-hyun (tiếng Hàn: 임동현), là một nam diễn viên người Hàn Quốc. Bắt đầu sự nghiệp vào năm 2017 với vai Lee Joon-ho (lúc trẻ), đến nay, anh đã góp mặt trong một số bộ phim truyền hình Hotel Del Luna (2019), Trở lại tuổi 18 (2020), Sweet Home: Thế giới ma quái (2020-hiện tại), Tuổi trẻ của tháng Năm (2021), Vinh quang trong thù hận (2022–2023), và Người mẹ tồi của tôi (2023), cũng như bộ phim điện ảnh Exhuma: Quật mộ trùng ma (2024).\n\nSự nghiệp:\n\n2017 - 2021: Ra mắt và để lại dấu ấn nhanh chóng chỉ sau 2 năm:\n\nLee Do-hyun ra mắt vào năm 2017 trong bộ phim hài đen mang tên Prison Playbook, thủ vai nhân vật Jung Kyung-ho lúc nhỏ.\nVào năm 2018, Dohyun được thủ vai thành viên của câu lạc bộ đua thuyền - bạn thân của nhân vật nam chính, trong bộ phim truyền hình lãng mạn Vẫn mãi tuổi 17. Với sự diễn xuất này, anh đã được đề cử hạng mục \"Nhân vật của năm\" tại Giải thưởng phim truyền hình SBS 2018 cùng với Ahn Hyo-seop và Jo Hyun-sik. Ba diễn viên này đã trình diễn ca khúc One Candle của g.o.d tại lễ trao giải. Cùng năm đó, Do-hyun xuất hiện trong phim Cô tiên dọn dẹp, với vai em trai của nữ chính và là một vận động viên Taekwondo triển vọng.\nVào năm 2019, Do-hyun tham gia vào bộ phim truyền hình Khách sạn ma quái nắm giữ tỉ suất người xem cao nhất trên sóng truyền hình cáp. Anh còn xuất hiện đặc biệt trong phim The Great Show của đài tvN. Do-hyun đóng vai chính trong Scouting Report, bộ phim thứ năm trong mùa thứ 10 của KBS Drama Special, giúp anh chiến thắng giải \"Diễn viên xuất sắc trong một bộ phim ngắn/đặc biệt\" tại KBS Drama Awards lần thứ 33.\nVào năm 2020, Do-hyun đóng vai chính trong bộ phim hài lãng mạn Trở lại tuổi 18, dựa trên bộ phim Mỹ Trở lại tuổi 17, bản sao của Zac Efron và tạo được tiếng vang lớn với diễn xuất của mình. Anh nhận được giải thưởng Nam diễn viên mới xuất sắc nhất tại Giải thưởng nghệ thuật Baeksang lần thứ 57. Cuối năm 2020, anh vào vai Lee Eun-hyuk trong bộ phim kinh dị Sweet Home: Thế giới ma quái của Netflix, chuyển thể từ webtoon cùng tên bộ phim nhận được sự chú ý lớn với mức đầu tư lên đến 56 tỷ đồng một tập.\nNăm 2021, một năm được cho là rất thành công của Do-hyun khi anh nhận được liên tiếp nhiều giải thưởng. Đầu năm 2021 Do-hyun xuất hiện trong bộ phim Beyond Evil, thủ vai Lee Dong Sik thời trẻ mà diễn viên Shin Ha Kyun thủ vai chính. Bộ phim trở thành tác phẩm xuất sắc nhất tại giải thưởng nghệ thuật Baeksang lần thứ 51 cùng với nhiều đề cử và giải thưởng. Cùng năm, anh tham gia đóng vai chính trong bộ phim truyền hình 12 tập Tuổi trẻ của tháng Năm của đài KBS2, một bộ phim lấy bối cảnh cuộc nổi dậy Gwangju năm 1980. Nhờ vai diễn này mà anh được gắn biệt danh \"Ông hoàng melo thế hệ mới\" bởi sự thành công trong lần đầu thử sức với thể loại Melodrama. Bộ phim đem đến cho Lee Do Hyun nhiều giải thưởng, trong đó có giải thưởng Nam diễn viên xuất sắc nhất tại KBS Drama Awards.",
    "aliases": [
      "lee do-hyun",
      "lee do hyun",
      "이도현",
      "李到晛",
      "lim dong-hyun",
      "임동현",
      "لی دو هیون",
      "لی دوهیون",
      "ли до хён",
      "ли до-хён",
      "لي دو -هيون"
    ],
    "featured": false
  },
  {
    "slug": "choi-min-sik",
    "name": "Choi Min-sik",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 2,
    "tags": [
      "Chính kịch",
      "Tội phạm",
      "Kinh dị"
    ],
    "roles": "Huyền thoại điện ảnh • Ảnh đế",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/sd7gIA6nEkq6zumkDCfxSE0YSSV.jpg",
    "tmdbPersonId": 64880,
    "birthday": "1962-01-22",
    "placeOfBirth": "Seoul, South Korea",
    "bio": "Choi Min-sik (tiếng Hàn: 최민식; sinh ngày 30 tháng 5 năm 1962) là một diễn viên Hàn Quốc. Nổi tiếng với những màn trình diễn giàu nội lực và khả năng biến hóa đa dạng, ông lần đầu được chú ý qua loạt phim truyền hình The Moon of Seoul (1994). Bước đột phá trong sự nghiệp điện ảnh của ông đến với Shiri (1999), bộ phim giúp Choi Min-sik trở thành một diễn viên hàng đầu. Tuy nhiên, chính vai diễn trong Oldboy (2003) đã đưa tên tuổi ông lên tầm biểu tượng, củng cố vị thế là một trong những diễn viên vĩ đại nhất của điện ảnh Hàn Quốc. Màn thể hiện của ông nhận được đánh giá cao từ giới phê bình và mang về giải nam diễn viên chính xuất sắc tại Giải thưởng Nghệ thuật Baeksang, Giải Rồng Xanh và Giải Đại Chung.\nChoi Min-sik tục góp mặt trong nhiều tác phẩm điện ảnh nổi bật như Người đẹp báo thù (2005), Ác quỷ đội lốt (2010), Găng-tơ vô danh (2012), Thế giới mới (2013), và Đại thủy chiến (2014), bộ phim trở thành tác phẩm có doanh thu cao nhất lịch sử điện ảnh Hàn Quốc. Với vai diễn trong phim này, ông giành giải Grand Prize tại Giải thưởng Nghệ thuật Baeksang lần thứ 51.\nNăm 2014, Choi bắt đầu mở rộng tầm ảnh hưởng tại Hollywood với vai diễn trong Lucy (2014). Cùng năm, ông được Gallup Korea vinh danh là Diễn viên điện ảnh của năm. Sau đó, ông tiếp tục hoạt động tích cực trong điện ảnh Hàn Quốc với các tác phẩm như Forbidden Dream (2019) và Quật mộ trùng ma (2024). Ông cũng trở lại truyền hình với Big Bet (2022), đánh dấu lần đầu tham gia phim truyền hình sau hơn hai thập kỷ.\n\nTiểu sử:\n\nChoi sinh ngày 30 tháng 5 năm 1962 tại Ihwa-dong, quận Jongno, Seoul, Hàn Quốc. Khi học lớp 3 tiểu học, ông được chẩn đoán mắc bệnh lao và được cho rằng khó có khả năng chữa khỏi. Tuy nhiên, ông cho biết đã hồi phục sức khỏe sau một tháng ở tại một ngôi chùa Phật giáo trên núi.\nTrong năm cuối trung học tại Trường Trung học Daeil ở Seoul, Choi bắt đầu tham gia diễn xuất với vai trò nghiên cứu sinh tại một đoàn kịch. Ông chịu ảnh hưởng sâu sắc từ các bộ phim của đạo diễn Ha Gil-jong và ban đầu mong muốn trở thành đạo diễn. Sau khi tốt nghiệp trung học, ông theo học Khoa Sân khấu và Điện ảnh tại Đại học Dongguk vào năm 1982. Trong quá trình học, ông dần chuyển hướng sự nghiệp sang diễn xuất dưới sự hướng dẫn của giáo sư Ahn Min-soo, người mà ông luôn kính trọng.\n\nSự nghiệp:\n\n1982–1993: Khởi đầu sự nghiệp:",
    "aliases": [
      "choi min-sik",
      "choi min sik",
      "choi min-shik",
      "min-sik choi",
      "choe min-sik",
      "choe min-shik"
    ],
    "featured": false
  },
  {
    "slug": "hwang-jung-min",
    "name": "Hwang Jung-min",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 2,
    "tags": [
      "Chính kịch",
      "Tội phạm",
      "Hành động"
    ],
    "roles": "Bảo chứng phòng vé • Ảnh đế",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/hKF1uh0iEfuZlBE79CXPw415qyn.jpg",
    "tmdbPersonId": 68903,
    "birthday": "1970-09-01",
    "placeOfBirth": "Masan, South Gyeongsang, South Korea",
    "bio": "Hwang Jung-min là một trong những \"ông hoàng phòng vé\" quyền lực nhất lịch sử điện ảnh Hàn Quốc với tổng lượng vé bán ra vượt hơn 100 triệu vé. Các kiệt tác tiêu biểu của ông gồm Ode to My Father, Veteran, The Wailing, The Spy Gone North và 12.12: The Day.",
    "aliases": [
      "hwang jung-min",
      "hwang jung min",
      "hwang jeong-min"
    ],
    "featured": false
  },
  {
    "slug": "ha-jung-woo",
    "name": "Ha Jung-woo",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 2,
    "tags": [
      "Chính kịch",
      "Tội phạm",
      "Hành động"
    ],
    "roles": "Ảnh đế phòng vé • Đạo diễn",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/9KINm0XIwbt4Qql4oZX55krzKxg.jpg",
    "tmdbPersonId": 75913,
    "birthday": "1978-03-11",
    "placeOfBirth": "Seoul, South Korea",
    "bio": "Đây là một tên người Triều Tiên, họ là Ha.\n\nHa Jung-woo (lúc nhỏ là Kim Sung-hoon sinh ngày 11 tháng 3 năm 1978) là một diễn viên Hàn Quốc. Anh nghiên cứu lĩnh vực sân khấu ở Đại học Chung-Ang, và sau vài năm tham gia những vai nhỏ và thành phần phụ, anh đã được cast vào vai chính đầu tiên của mình trong một bộ phim độc lập với kinh phí thấp The Unforgiven (2005), đạo diễn bởi người bạn của anh Yoon Jong-bin. Tiếp theo đó là bộ phimTime (2006) của Kim Ki-duk, và Never Forever (2007) cùng với Vera Farmiga. Thế nhưng, bộ phim có vai trò đột phá giúp Ha Jung-woo trở thành ngôi sao là series phim kinh dị The Chaser của Na Hong-jin (2008). Được biết đến là có khả năng thu hút lời khen của giới phê bình cũng như thành công về thương mại, Ha Jung-woo nhanh chóng trở thành diễn viên hàng đầu được yêu cầu nhiều nhất vào thế hệ của anh trong điện ảnh Hàn Quốc, giới thiệu sự linh hoạt của anh trong phim đường My Dear Enemy (2008), phim thể thao Take Off (2009), phim truyền hình tội phạm The Yellow Sea (2010), phim xã hội đen Nameless Gangster (2012), phim hài lãng mạn Love Fiction (2012), phim diệp viên kinh dị The Berlin File (2013), và phim hành động kinh dị The Terror Live (2013). Anh đã ra mắt sự nghiệp đạo diễn của mình thông qua bộ phim hài Fasten Your Seatbelt (2013).\n\nThời thơ ấu:\n\nSinh ra là Kim Sung-hoon, Ha Jung-woo xuất thân từ một gia đình có nghiệp diễn xuất. Ba của anh Kim Yong-gun là một diễn viên kì cựu nổi tiếng đã từng xuất hiện trong nhiều phim điện ảnh và series phim truyền hình trong khi em trai của anh Kim Young-hoon (nghệ danh: Cha Hyun-woo) là một diễn viên đầy khát khao và tham vọng. Ha Jung-woo đã từng chia sẻ rằng kể từ khi còn 4 hoặc 5 tuổi, anh đã ước mơ được trở thành một diễn viên giống như ba của mình. Trước khi vào đại học, anh đã tham gia vào một viện diễn xuất tư nhân và trong một khoảng thời gian anh đã được diễn viên Lee Beom-soo hướng dẫn. Sau đó anh theo học đại học Chung-Ang chuyên ngành sân khấu.\nNăm 1998, Ha Jung-woo bắt đầu nghĩa vụ quân sự của mình, làm việc tại Khoa Quan hệ công chúng lực lượng vũ trang. Anh mang kinh nghiệm diễn xuất của mình để sử dụng tốt trong thời gian này, xuất hiện trong 10 bộ phim quảng cáo cho quân đội.",
    "aliases": [
      "ha jung-woo",
      "ha jung woo",
      "ha jeong-woo",
      "jung-woo ha",
      "김성훈",
      "kim sung-hoon",
      "ха чон-у"
    ],
    "featured": false
  },
  {
    "slug": "park-eun-bin",
    "name": "Park Eun-bin",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 1,
    "tags": [
      "K-Drama",
      "Chính kịch",
      "Tình cảm"
    ],
    "roles": "Nữ luật sư kỳ lạ • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/2PqeVq0KV1pEUgeeSquk2ljfMR0.jpg",
    "tmdbPersonId": 1134684,
    "birthday": "1992-09-04",
    "placeOfBirth": "Songpa, Seoul, South Korea",
    "bio": "Đây là một tên người Triều Tiên, họ là Park.\n\nPark Eun-bin (tiếng Hàn: 박은빈; sinh ngày 4 tháng 9 năm 1992) là một nữ diễn viên người Hàn Quốc. Cô khởi đầu sự nghiệp diễn xuất của mình với tư cách là một diễn viên nhí trước khi đảm nhiệm vai chính đầu tiên trong bộ phim tình cảm lãng mạn Operation Proposal vào năm 2012.\n\nSự nghiệp:\n\nPark Eun-bin tham gia diễn xuất khi mới 5 tuổi và đã đóng nhiều phim truyền hình với tư cách là một nữ diễn viên nhí và hóa thân thành nhiều nhân vật khác nhau. Cô đóng vai chính đầu tiên trong bộ phim lãng mạn du hành vượt thời gian Operation Proposal (2012).\nSau Operation Proposal, Park Eun-bin quay trở lại với các vai phụ cho đến khi cô tiếp tục được đảm nhiệm vai chính trong loạt phim nói về một nhóm phụ nữ trẻ đầu những năm 20, Hello, My Twenties! và phần tiếp theo của nó.\nTừ năm 2017 trở đi, Park Eun-bin đã đóng vai chính trong nhiều bộ phim truyền hình. Năm 2017, cô được chọn tham gia bộ phim Tội phạm pháp luật Judge vs. Judge, tiếp theo là phim kinh dị The Ghost Detective vào năm 2018.\nPark Eun-bin đã nhận được chuỗi thành công nhất định trong sự nghiệp của mình tiêu biểu nhất là bộ phim Hot Stove League 2019-2020. Bộ phim đã đạt được mức rating cao nhất là hơn 20% sau khi bắt đầu với 3% và đã giành được giải phim truyền hình xuất sắc nhất trong số nhiều đề cử khác tại Lễ trao giải Baeksang Arts Awards lần thứ 56.\nNăm 2020, Park Eun-bin đã tham gia bộ phim tình cảm âm nhạc Anh có thích Brahms?. Vai diễn này đòi hỏi cô phải thể hiện khả năng chơi violin.\nNăm 2021, trở lại màn ảnh nhỏ, Park Eun-bin hóa thân vào vai diễn khó nhằn Lee Hwi trong Luyến mộ. Bộ phim đã nhận được rất nhiều tình cảm của người hâm mộ không chỉ tại Hàn Quốc mà còn trên toàn thế giới. Trên nền tảng Netflix, bộ phim lọt Top Trending ở nhiều quốc gia không chỉ tại Châu Á mà còn ở nhiều nước Phương Tây, góp phần đưa thể loại phim cổ trang Hàn Quốc đến gần hơn với khán giả thế giới. Thứ hạng cao nhất trên Bảng xếp hạng Netflix Toàn cầu mà bộ phim đạt được là Top 4. Đây là bộ phim cổ trang đầu tiên đạt được thứ hạng cao như vậy trên Netflix. Tại Hàn Quốc, trên đài phát sóng trực tiếp KBS2, bộ phim ghi nhận rating tập cuối lên tới 12,1%, lọt Top 2 Những bộ phim có rating trung bình cao nhất năm 2021 của đài truyền hình KBS2 và Top 12 Những bộ phim truyền hình Hàn Quốc có rating cao nhất năm 2021. Với thành công của bộ phim, Park Eun-bin nhận được giải thưởng Nữ diễn viên xuất sắc nhất, Nữ diễn viên được yêu thích nhất, Cặp đôi đẹp nhất tại Lễ trao giải KBS Drama Awards 2021.\nNăm 2022, Park Eun-bin tái xuất với vai nữ chính Woo Young Woo trong Nữ luật sư kì lạ Woo Young Woo. Dự án ban đầu không được khán giả kì vọng nhiều, nhưng với sự đầu tư chỉn chu, nội dung sâu sắc và nhân văn, bộ phim đã trở thành hiện tượng truyền hình 2022, lọt top 10 phim truyền hình đạt tỷ suất người xem cao nhất lịch sử đài cáp với rating tập cuối là 17,5%.",
    "aliases": [
      "park eun-bin",
      "park eun bin",
      "박은빈",
      "朴恩斌",
      "パク・ウンビン",
      "پارک اون بین"
    ],
    "featured": false
  },
  {
    "slug": "bae-suzy",
    "name": "Bae Suzy",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 1,
    "tags": [
      "K-Drama",
      "Tình cảm",
      "Chính kịch"
    ],
    "roles": "Tình đầu quốc dân • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/39x6Dc4ELZxHbxCuOM0ddbwKh3F.jpg",
    "tmdbPersonId": 1014784,
    "birthday": "1994-10-10",
    "placeOfBirth": "Gwangju, South Korea",
    "bio": "Đây là một tên người Triều Tiên, họ là Bae.\n\nBae Soo-ji (Hangul: 배수지, Hanja: 裵秀智, Romaja: baesuji, Hán-Việt: Bùi Tú Trí, sinh ngày 10 tháng 10 năm 1994), thường được biết đến với nghệ danh Bae Suzy (đồng âm với tên của cô), hay đơn giản hơn là Suzy (Hangul: 수지, Romaja: suji), là một nữ ca sĩ và diễn viên người Hàn Quốc. Cô là cựu thành viên của nhóm nhạc nữ Miss A thuộc JYP Entertainment, hiện nay cô thuộc quản lý của Management SOOP, cô còn được biết đến với biệt hiệu \"Tình đầu quốc dân\" ở Hàn Quốc.\nNgày 27 tháng 12 năm 2017, JYP Entertainment thông báo Miss A chính thức tan rã sau 7 năm hoạt động. Kể từ năm 2018 Suzy và các thành viên bắt đầu sự nghiệp hoạt động cá nhân. Tháng 3 năm 2019, hợp đồng của Suzy và JYP Entertainment kết thúc, cô quyết định rời công ty sau 9 năm gắn bó. Ngày 8 tháng 4 cùng năm, Suzy gia nhập Management SOOP với tư cách là diễn viên để tập trung sự nghiệp vào diễn xuất.\n\nTiểu sử:\n\nSuzy sinh ra ở Quận Bắc, Gwangju, Hàn Quốc vào ngày 10 tháng 10 năm 1994. Cha cô là Bae Wan Young và mẹ là Jeong Hyun Sook; cô có một chị gái, Su-bin, và một em trai, Sang-moon. Cô đã theo học Trường Trung học Biểu diễn Nghệ thuật Seoul. Trước khi ra mắt, cô từng làm người mẫu của một trang web bán hàng online. Năm 2009, cô thử giọng tại cuộc thi Superstar K của Mnet và vượt qua các vòng sơ khảo nhưng cuối cùng cô đã bị loại. Tuy nhiên, cô nhận được sự chú ý của một người chiêu mộ từ công ty JYP Entertainment và nhanh chóng trở thành một thực tập sinh. Sau một năm được đào tạo, cô được kết hợp với thành viên Fei và Jia. Sau đó Min được thêm vào nhóm, cả bốn debut với tên gọi Miss A.\n\nSự nghiệp:\n\nRa mắt với Miss A:\n\nVào tháng 3 năm 2010, Suzy tham gia cùng 2 thành viên khác Fei và Jia tạo thành nhóm Miss A. Bộ ba bắt đầu hoạt động quảng bá chính thức đầu tiên của họ ở Trung Quốc như là một nhóm bằng cách hợp tác với tập đoàn Samsung Electronics tại Trung Quốc. Nhóm đã phát hành một bài hát được sử dụng cho quảng cáo Samsung Beat Festival tên là \"Love Again\". Bài hát được viết bởi nhà soạn nhạc Hàn Quốc Super Changddai, và video âm nhạc được đạo diễn bởi Hong Won Ki. Thành viên thứ tư tham gia vào nhóm là Min.\nCác thành viên cuối cùng cũng ra mắt vào tháng 7 năm 2010 do JYP Entertainment quản lý, với đĩa đơn \"Bad Girl Good Girl\". Chỉ sau 22 ngày từ khi ra mắt bài hát đã đứng đầu hàng loạt các BXH âm nhạc nổi tiếng. Sau những thành công đầu tiên, nhóm đã trở lại trong tháng 10 với một ca khúc chủ đề mới \"Breathe\" từ đĩa đơn thứ hai Step Up.\nNhóm đã trở lại vào tháng 7 năm 2011 với việc phát hành album phòng thu đầu tiên của họ là A Class với ca khúc chủ đề \"Good Bye Baby\". Nhóm đã tổ chức sân khấu tạm biệt vào đầu tháng 9 sau khi chứng kiến thành công lớn vang dội album và ca khúc chủ đề của họ. Sau đó họ tập trung vào các hoạt động ở nước ngoài, bao gồm cả việc ra mắt tại Trung Quốc.\nVào tháng 2 năm 2012, họ đã trở lại với phong cách mới qua ca khúc \"Touch\". Trong quý cuối năm 2012, họ đã phát hành mini album \"Independent Women\".",
    "aliases": [
      "bae suzy",
      "수지",
      "배수지",
      "bae su-zy",
      "suzy bae ",
      "bae su-ji",
      "bae soo-ji",
      "裴秀智",
      "ペ・スジ",
      "به سوزی",
      "пе су джі",
      "пе су-джі"
    ],
    "featured": false
  },
  {
    "slug": "jung-hae-in",
    "name": "Jung Hae-in",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 2,
    "tags": [
      "K-Drama",
      "Tình cảm",
      "Hành động"
    ],
    "roles": "Nam thần màn ảnh • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/7ZMUHR2q0XTWMxuqijWSVfWQv14.jpg",
    "tmdbPersonId": 1470763,
    "birthday": "1988-04-01",
    "placeOfBirth": "Seoul, South Korea",
    "bio": "Đây là một tên người Triều Tiên, họ là Jung.\n\nJung Hae-in (tiếng Hàn: 정해인; sinh ngày 1 tháng 4, 1988) là một diễn viên người Hàn Quốc. Anh bắt đầu được chú ý qua các vai phụ trong các bộ phim truyền hình Khi nàng say giấc (2017) và Nhật ký trong tù (2017–2018). Sau đó, anh đảm nhận vai chính trong các phim truyền hình như Chị đẹp mua cơm ngon cho tôi (2018), Một đêm xuân (2019), Truy bắt lính đào ngũ (2021–2023), Hoa tuyết điểm (2021–2022), và Con trai bạn mẹ (2024). Ngoài truyền hình, Jung Hae-in cũng tham gia các bộ phim điện ảnh như Giai điệu tình yêu (2019), Trẻ trâu khởi nghiệp (2019) và Đố anh còng được tôi (2024).\n\nTiểu sử:\n\nJung Hae In sinh ngày 1 tháng 4 năm 1988 tại phường Seongbuk-dong, Seoul. Sau đó anh cùng gia đình từng có thời gian dài sinh sống ở Daebang-dong, quận Dongjak-gu ở Seoul, Hàn Quốc. Tôn giáo của anh là Công giáo, tên rửa tội của anh là Paul, hay còn gọi là Jimmy.\n\nGia đình:\n\nJung Hae-in sinh ra trong một gia đình có bốn thành viên. Cha anh, Jung Sang Jin, là bác sĩ nhãn khoa và từng công tác tại Bệnh viện Đại học Y Hàn Quốc, đồng thời tham gia điều hành một cơ sở y tế tại Ansan, tỉnh Gyeonggi-do. Mẹ anh là Kang Yu Mi, làm việc trong lĩnh vực y khoa. Anh có một em trai sinh năm 1995 tên Jung Hae Joon. Ngoài ra, có thông tin cho rằng Jung Hae-in là hậu duệ đời thứ sáu của học giả thời Joseon Jeong Yak-yong, một học giả và nhà cải cách nổi tiếng thời kỳ Joseon.\n\nHọc vấn:\n\nJung Hae-in theo học tại Trường Tiểu học Singil, Trường Trung học cơ sở Seongnam và Trường Trung học Kỹ thuật Yeongdeungpo ở Seoul. Ban đầu, anh có dự định theo học ngành công nghệ sinh học. Trong thời gian trung học, anh đồng thời chuẩn bị cho cả định hướng khoa học tự nhiên và lĩnh vực truyền thông. Sau đó, anh theo học tại Đại học Pyeongtaek, chuyên ngành Phát thanh – Truyền hình và Giải trí, đồng thời tham gia các hoạt động nghệ thuật và sân khấu trong thời gian học tập.\n\nNhập ngũ:\n\nNgay từ khi học năm nhất đại học, Jung Hae In đã bén duyên với con đường nghệ thuật. Tuy nhiên, anh lại quyết định nhập ngũ hai năm và đó cũng là thời gian giúp anh quyết định đi theo sự nghiệp diễn xuất như một mục tiêu lâu dài. Jung Hae In nhập ngũ năm 21 tuổi, xuất ngũ năm 23 tuổi với tư cách là một trung sĩ Quân đội Đại Hàn Dân Quốc và anh ấy đã ký hợp đồng với công ty chủ quản hiện tại của mình - FNC Entertainment ngay sau khi hoàn thành nghĩa vụ quân sự và tốt nghiệp đại học.\n\nSự nghiệp:\n\nKhởi đầu:",
    "aliases": [
      "jung hae-in",
      "jung hae in",
      "jeong hae-in",
      "جونگ هائه این",
      "чон хе-ін",
      "هاي إن"
    ],
    "featured": false
  },
  {
    "slug": "ahn-hyo-seop",
    "name": "Ahn Hyo-seop",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 2,
    "tags": [
      "K-Drama",
      "Tình cảm",
      "Hài"
    ],
    "roles": "Tổng tài màn ảnh • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/hVnKQ5WO8MGFrm6ShPmL90NZloV.jpg",
    "tmdbPersonId": 1571598,
    "birthday": "1995-04-17",
    "placeOfBirth": "Seoul, South Korea",
    "bio": "Đây là một tên người Triều Tiên, họ là Ahn.\n\nAhn Hyo-seop (Hangul: 안효섭; sinh ngày 17 tháng 4 năm 1995), tên tiếng Anh là Paul Ahn, là một nam diễn viên và ca sĩ người Hàn Quốc (với quốc tịch Canada). Anh là diễn viên trực thuộc bởi công ty The Present. Anh ra mắt với tư cách là một diễn viên năm vào năm 2015 và đã gây ấn tượng mạnh mẽ với các vai diễn trong các bộ phim truyền hình Hàn Quốc Vẫn mãi tuổi 17 (2018), Viên đá bí ẩn (2019), Người thầy y đức 2 (2020), Hong Cheon Gi (2021), Hẹn hò chốn công sở (2022), Người thầy y đức 3 (2023), Thời gian gọi tên em (2023).\n\nCuộc sống:\n\nAhn Hyo-seop sinh ngày 17 tháng 4 năm 1995 ở Seoul, Hàn Quốc. Gia đình anh chuyển sang định cư tại Toronto, Canada khi anh 7 tuổi và sau đó anh quay trở lại Hàn Quốc một mình năm 17 tuổi để theo đuổi niềm đam mê nghệ thuật\nAnh tốt nghiệp Đại học Quốc dân Hàn Quốc, chuyên ngành Kinh doanh quốc tế.\nBên cạnh tiếng Hàn, Ahn Hyo-seop còn có thể sử dụng tiếng Anh trôi chảy. Anh còn có năng khiếu piano, violin, bóng rổ, tennis và một số môn thể thao khác.\n\nSự nghiệp:\n\nTrong thời gian ở Hàn Quốc, anh đã được chiêu mộ bởi công ty giải trí hàng đầu JYP Entertainment và trải qua quá trình training để ra mắt cùng Got7. Tuy nhiên, anh đã không thể debut vì thiếu sót một số kĩ năng và chiều cao quá chênh lệch.\nNgày 1 tháng 10 năm 2015, công ty giải trí Starhaus đã thành lập nhóm nhạc dự án One O One, với đĩa đơn mang tên \"Love You\". Các thành viên cùng nhóm bao gồm Kwak Si Yang, Song Won Suk và Kwon Do Kyun.\nCùng năm đó, anh cũng có vai diễn đầu tay trong bộ phim Splash Splash Love và trở thành thành viên trong chương trình truyền hình âm nhạc thực tế Always Cantare. Anh bắt đầu được biết đến nhiều hơn khi tham gia đóng chính trong Queen of the Ring, My Father is Strange, Vẫn mãi tuổi 17 và Top Management. Năm 2019, anh cùng Park Bo-young trở thành cặp đôi màn ảnh trong bộ phim viễn tưởng lãng mạn Viên đá bí ẩn. Đầu năm 2020, anh đã cho thấy sự thể hiện cực kỳ cuốn hút của mình với vai diễn một bác sĩ trẻ tài năng nhưng luôn mạnh mẽ và chính trực vì trải qua những biến cố gia đình từ nhỏ, ở series phim Người thầy y đức 2, đóng cặp với nữ diễn viên Lee Sung-kyung.\n\nĐiện ảnh và truyền hình:\n\nPhim:",
    "aliases": [
      "ahn hyo-seop",
      "ahn hyo seop",
      "paul ahn",
      "ahn hyoseop",
      "ahn hyo seob",
      "ahn paul",
      "آن هیو سئوپ",
      "آن هیو-سوپ",
      "安孝燮"
    ],
    "featured": false
  },
  {
    "slug": "kim-go-eun",
    "name": "Kim Go-eun",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 1,
    "tags": [
      "K-Drama",
      "Kinh dị",
      "Tình cảm"
    ],
    "roles": "Nữ diễn viên thực lực • Ảnh Hậu",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/p7wuD6eX0YcZ5LXWhx0XjvEYZKz.jpg",
    "tmdbPersonId": 1067849,
    "birthday": "1991-07-02",
    "placeOfBirth": "Seoul, South Korea",
    "bio": "Đây là một tên người Triều Tiên, họ là Kim.\n\nKim Go-Eun (tiếng Hàn: 김고은; sinh ngày 2 tháng 7 năm 1991) là nữ diễn viên và người mẫu người Hàn Quốc. Cô bắt đầu sự nghiệp diễn xuất với bộ phim A Muse (2012) và tiếp tục xuất hiện trong bộ phim tội phạm kinh dị Monster (2014) và Coin Locker Girl (2015). Sau đó, Go-eun tiếp nhận vai nữ chính trong hai bộ phim truyền hình phát sóng trên kênh tvN là Bẫy tình yêu (2016) và Yêu tinh (2016–17). \nTrong sự nghiệp diễn xuất của mình, Kim Go-eun đã nhận được nhiều giải thưởng, trong đó đáng chú ý nhất là Giải thưởng điện ảnh Blue Dragon cho nữ diễn viên mới xuất sắc nhất, Giải thưởng Nghệ thuật Baeksang cho nữ diễn viên mới xuất sắc nhất (phim truyền hình), Giải thưởng Phim truyền hình Rồng Xanh cho nữ diễn viên chính xuất sắc nhất và mới đây là Giải thưởng Nghệ thuật Baeksang cho nữ diễn viên chính xuất sắc nhất (mảng điện ảnh).\n\nTiểu sử:\n\nNăm 1994, khi Go-eun mới 3 tuổi, cô cùng gia đình chuyển đến sinh sống tại thủ đô Bắc Kinh, Trung Quốc và sinh sống tại đây trong suốt hơn 10 năm. Khi quay trở lại Hàn Quốc, cô chia sẻ rằng bản thân mình thực sự đã rất sốc với môi trường sống thay đổi và tính cạnh tranh khắc nghiệt tại quê hương, những trải nghiệm mới đó khác hẳn với những năm tháng ở nước ngoài của cô, ngoại cảnh chính là thứ đã gây tác động mạnh mẽ nhất tới tính cách của Go-eun sau này. Và cũng vì cảm nhận được điều đó mà đạo diễn phim A Muse - nhà sản xuất Jung Ji-woo đã giao vai nữ chính trong tác phẩm của mình cho Go-eun: \"Cô ấy có một sự tò mò và lòng can đảm bẩm sinh. Cô ấy mạnh mẽ ở khía cạnh không bao giờ bị ngoại lực tác động dễ dàng, và cô ấy cũng không đi theo những lối mòn được định hướng sẵn chỉ vì mọi người xung quanh ai cũng làm vậy\" – ông chia sẻ.\nCô cũng chia sẻ thêm rằng, bản thân mình là một fan nhiệt thành, rất thích và đã xem đi xem lại nhiều lần tác phẩm Together (2002) của đạo diễn, nhà sản xuất phim người Trung Quốc Trần Khải Ca và lần nào cũng khóc, kể từ đó, Kim Go-eun quyết định nung nấu ước mơ trở thành một nhà biên kịch phim. Tuy nhiên, cơ duyên lại mang cô đến với sân khấu điện ảnh. Cô theo học và tốt nghiệp trường Đại học Nghệ thuật Quốc gia Hàn Quốc. Ngoài tiếng Hàn là ngôn ngữ mẹ đẻ, cô còn thông thạo tiếng Trung do đã sinh sống nhiều năm ở Trung Quốc.\n\nCuộc sống cá nhân:\n\nVào tháng 08 năm 2016, đại diện của Kim Go-eun xác nhận rằng cô đang hẹn hò với nam tài tử Shin Ha-kyun. Tuy nhiên, cả hai đã xác nhận chia tay vào tháng 2 năm 2017 với lý do lịch trình bận rộn và tiếp tục giữ mối quan hệ bạn bè, tiền bối – hậu bối.",
    "aliases": [
      "kim go-eun",
      "kim go eun",
      "김고은",
      "kim ko-eun",
      "kim goeun",
      "金高銀",
      "キム・ゴウン",
      "کیم گو اون",
      "ким го ын",
      "ким гоын",
      "ким го-ын",
      "кім ко-ин"
    ],
    "featured": false
  },
  {
    "slug": "kim-seon-ho",
    "name": "Kim Seon-ho",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 2,
    "tags": [
      "K-Drama",
      "Tình cảm",
      "Hành động"
    ],
    "roles": "Tổ trưởng Hong • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/qG8QeXHCn3iAJxeUCsPswM3Zw5l.jpg",
    "tmdbPersonId": 1863349,
    "birthday": "1986-05-08",
    "placeOfBirth": "Seoul, South Korea",
    "bio": "Kim Seon-ho (tiếng Hàn: 김선호; sinh ngày 8 tháng 5 năm 1986) là một nam diễn viên người Hàn Quốc.\n\nSự nghiệp:\n\n2009–2016: Sân khấu kịch:\n\nSau khi tốt nghiệp trung học, Kim Seon-ho theo học tại Học viện Nghệ thuật Seoul, anh tốt nghiệp bằng đại học ngành Phát thanh và Giải trí. Khi còn học đại học, anh tham gia một nhóm kịch và bắt đầu đóng kịch. Vai diễn đầu tiên của anh là trong New Boeing Boeing (chuyển thể từ vở kịch cùng tên của Pháp) vào năm 2009, năm 2013 anh đã tái hiện lại vai diễn của mình. Anh đã đạt được một vài thành tựu nhỏ khi xuất hiện trong vở kịch nổi tiếng Daehakro (có thể so sánh với Off-Broadway), sau đó lần lượt là Rooftop House Cat và Goal of Love, cả hai đều là phim hài lãng mạn. Anh tiếp tục thể hiện các vai diễn đa dạng hơn và được giới phê bình đánh giá cao như True West và Kiss of the Spider Woman vào năm 2015, và Closer vào năm 2016.\n\n2017–2019: Ra mắt màn ảnh:\n\nNăm 2016, nhà sản xuất Lee Eun Jin tình cờ xem được vở kịch của Kim Seon-ho, ông quyết định chon anh vào đóng vai nam phụ Sun Sang-tae cho bộ phim truyền hình Sếp Kim đại tài, bộ phim được công chiếu từ ngày 25 tháng 1 năm 2017 vào khung giờ 22:00 (KTS) trên Korean Broadcasting System 2 và đạt được thành công với mức tỷ suất người xem cao nhất đạt 18,4% và tỷ suất người xem trung bình đạt 15,9%.\nThành công của Sếp Kim đại tài đã góp phần gây dựng tên tuổi của nam diễn viên trong làng giải trí xứ Hàn, từ đây anh bắt đầu nhận được nhiều lời mời tham gia các bộ phim hơn. Cùng năm, anh được giới thiệu thử vai Oh Jin-kyu cho bộ phim Thiên hạ đệ nhất giao hàng của đạo diễn Jeon Woo-sung. Bộ phim được công chiếu vào ngày 23 tháng 9 cùng năm, mặc dù không đạt mức tỷ suất người xem cao nhưng bộ phim đánh dấu lần đầu anh xuất hiện trong tuyến nhân vật chính. Cuối năm 2017, anh tham gia vào bộ phim truyền hình hài hành động Cặp đôi cảnh sát của đạo diễn Oh Hyun Jong, trong phim anh vào một tên lừa đảo khét tiếng. Bộ phim mang về cho Kim Seon-ho 3 đề cử và chiến thắng 2 giải thưởng tại Giải thưởng phim truyền hình MBC 2017. Trong khoảng thời gian bộ phim phát sóng, anh quay trở lại sân khấu vào vai Valentin trong vở kịch Kiss of the Spider Woman, vai diễn mà anh đã thể hiện vào năm 2015.\nNăm 2018, anh tham gia thử vai cho bộ phim truyền hình Lang quân 100 ngày của vị đạo diễn Lee Jong Jae. Ngày 21 tháng 3 cùng năm, Kim Seon-ho chính thức đóng vai Jung Je-yoon, đồng thời gia nhập đoàn phim. Bộ phim chính thức phát sóng trên Television Network (tvN) vào ngày 10 tháng 9 cùng năm và đạt được thành công vang dội trong nước và trên khắp Châu Á, với mức tỷ suất người xem cao nhất đạt 14,412% và tỷ suất người xem trung bình đạt 9,013%, đưa bộ phim trở thành một trong những phim có tỷ suất người xem cao nhất trong lịch sử truyền hình cáp Hàn Quốc. Tháng 9 cùng năm, Kim Seon-ho ký hợp đồng độc quyền với công ty giải trí Salt Entertainment sau khi hết hạn hợp đồng với công ty cũ, về chung công ty với nhiều ngôi sao như Park Shin-hye, Kim Ji-won, Kim Joo-Hun.",
    "aliases": [
      "kim seon-ho",
      "kim seon ho",
      "김선호 ",
      "kim sun-ho",
      "金宣虎",
      "คิม ซ็อน-โฮ",
      "کیم سئون هو"
    ],
    "featured": false
  },
  {
    "slug": "wi-ha-joon",
    "name": "Wi Ha-joon",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 2,
    "tags": [
      "K-Drama",
      "Hành động",
      "Tội phạm"
    ],
    "roles": "Cảnh sát Squid Game • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/tEZuIaMESdBw4LfNq3vshGR4VlP.jpg",
    "tmdbPersonId": 1557181,
    "birthday": "1991-08-05",
    "placeOfBirth": "Wando, South Jeolla, South Korea",
    "bio": "Wi Ha-joon (tên thật Wi Hyun-yi; sinh ngày 5 tháng 8 năm 1991) là một diễn viên, người mẫu người Hàn Quốc. Anh được biết đến rộng rãi nhất qua vai diễn trong Trò chơi con mực (2021). Các bộ phim nổi bật khác của anh là Gonjiam: Bệnh viện ma ám (2018), Chị đẹp mua cơm ngon cho tôi (2018), Phụ lục tình yêu (2019), Trở lại tuổi 18 (2020), Nửa đêm (2021) và Người hùng điên rồ (2021–2022).\n\nĐời tư:\n\nWi Ha-joon sinh ngày 5 tháng 8 năm 1991 ở xã Soan, huyện Wando, tỉnh Jeolla Nam, với tên thật là Wi Hyun-yi. Anh là em út trong gia đình với một chị gái và một anh trai. Anh người duy nhất sống với bố mẹ, chị gái anh đi du học khi còn nhỏ và sống ở Úc còn anh phải xa anh trai khi mới 5 tuổi. Anh đã tốt nghiệp khoa Sân khấu và Điện ảnh tại đại học Sungkyul ở thành phố Anyang, tỉnh Gyeonggi.\nAnh đã từng tham gia và là trưởng câu lạc bộ nhảy ở trường cấp hai với mơ ước trở thành một nghệ sĩ giải trí. Ban đầu anh muốn trở thành một thần tượng nên đã đến Tokyo vào năm thứ 3 trung học và thử giọng cho SM Entertainment cũng như JYP Entertainment. Sau khi vượt qua vòng đầu tiên của SM, anh đã tham gia một bài kiểm tra camera nhưng không may đã bị từ chối. Sau đó, anh đăng ký vào một học viện diễn xuất và chuẩn bị cho kỳ thi tuyển sinh khoa sân khấu và điện ảnh để trở thành một diễn viên thực thụ. Có vài hình ảnh cho thấy anh từng xuất hiện trong các buổi diễn nhạc kịch trước khi trở thành diễn viên thực thụ.\nSau khi thử giọng nhưng không thành công, anh chỉ học được một học kỳ. Tháng 11 năm 2011, anh nhập ngũ vào Đơn vị Không quân 709, thực hiện nghĩa vụ quân sự trong Đội xung kích Cảnh sát Phòng Không và được bổ nhiệm lên trung sĩ trong khoảng thời gian 6 năm dự bị.\n\nĐiện ảnh:\n\nPhim:",
    "aliases": [
      "wi ha-joon",
      "wi ha joon",
      "wee ha-jun",
      "hwe ha joon",
      "hwi ha joon",
      "wi hyun-yi"
    ],
    "featured": false
  },
  {
    "slug": "byeon-woo-seok",
    "name": "Byeon Woo-seok",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "gender": 2,
    "tags": [
      "K-Drama",
      "Tình cảm"
    ],
    "roles": "Ngôi sao thế hệ mới • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/iACGQCFJZUMsy4ywEzNiPokXFB9.jpg",
    "tmdbPersonId": 2117890,
    "birthday": "1991-10-31",
    "placeOfBirth": "Bucheon, Gyeonggi, South Korea",
    "bio": "Đây là một tên người Triều Tiên, họ là Byeon.\n\nByeon Woo-seok (tiếng Hàn: 변우석; sinh ngày 31 tháng 10 năm 1991) là nam diễn viên và người mẫu người Hàn Quốc. Anh được biết đến với các vai diễn trong Cõng anh mà chạy (2024), Cô nàng mạnh mẽ Gang Namsoon (2023),  Hoa phái đảng: Sở công tác hôn nhân Joseon (2019), Ký sự thanh xuân (2020) và Hoa nở nhớ trăng (2021–22).\n\nDanh sách phim tham gia:",
    "aliases": [
      "byeon woo-seok",
      "byeon woo seok",
      "byun woo-suk",
      "边佑锡",
      "byeon u seok",
      "邊佑錫",
      "بیون وو-سوک"
    ],
    "featured": false
  },
  {
    "slug": "shun-oguri",
    "name": "Shun Oguri",
    "country": "Nhật Bản 🇯🇵",
    "countryCode": "jp",
    "gender": 2,
    "tags": [
      "Hành động",
      "Chính kịch",
      "Anime"
    ],
    "roles": "Nam thần Crows Zero • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/4tfrhvqp3IGHPATor0lYE9X9UD3.jpg",
    "tmdbPersonId": 46364,
    "birthday": "1982-12-26",
    "placeOfBirth": "Tokyo, Japan",
    "bio": "Shun Oguri là một trong những nam tài tử quyền lực và nổi tiếng nhất của nền điện ảnh Nhật Bản. Anh gắn liền với tuổi thơ của hàng triệu khán giả qua các vai diễn kinh điển như Genji trong Crows Zero, Hanazawa Rui trong Hana Yori Dango, Gintama và Godzilla vs. Kong.",
    "aliases": [
      "shun oguri"
    ],
    "featured": false
  },
  {
    "slug": "kento-yamazaki",
    "name": "Kento Yamazaki",
    "country": "Nhật Bản 🇯🇵",
    "countryCode": "jp",
    "gender": 2,
    "tags": [
      "Anime",
      "Hành động",
      "Tình cảm"
    ],
    "roles": "Hoàng tử live-action • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/q1kbO8PIDpSumj4VwREouAUtPh5.jpg",
    "tmdbPersonId": 1177942,
    "birthday": "1994-09-07",
    "placeOfBirth": "Itabashi, Tokyo, Japan",
    "bio": "Kento Yamazaki được mệnh danh là \"Hoàng tử live-action\" của Nhật Bản nhờ khả năng hóa thân xuất sắc vào các nhân vật anime/manga. Tên tuổi anh vươn tầm thế giới qua loạt phim sinh tồn Alice in Borderland (Thế Giới Không Lối Thoát), Kingdom và Your Lie in April.",
    "aliases": [
      "kento yamazaki",
      "ヤマザキ ケント",
      "yamazaki kento",
      "کنتو یامازاکی"
    ],
    "featured": false
  },
  {
    "slug": "ryo-yoshizawa",
    "name": "Ryo Yoshizawa",
    "country": "Nhật Bản 🇯🇵",
    "countryCode": "jp",
    "gender": 2,
    "tags": [
      "Anime",
      "Chính kịch",
      "Hành động"
    ],
    "roles": "Nam thần live-action • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/5M0Bk6ix0yNP1iuut3a1BKt3RyH.jpg",
    "tmdbPersonId": 1149341,
    "birthday": "1994-02-01",
    "placeOfBirth": "Tokyo, Japan",
    "bio": "Ryo Yoshizawa là nam diễn viên Nhật Bản sở hữu gương mặt hoàn hảo và tài năng diễn xuất được công nhận rộng rãi. Anh ghi dấu ấn qua vai Sougo Okita trong Gintama, Mikey trong Tokyo Revengers và vai Doanh Chính trong loạt phim bom tấn Kingdom.",
    "aliases": [
      "ryo yoshizawa",
      "ryô yoshizawa",
      "ryō yoshizawa",
      "ryou yoshizawa"
    ],
    "featured": false
  },
  {
    "slug": "masaki-suda",
    "name": "Masaki Suda",
    "country": "Nhật Bản 🇯🇵",
    "countryCode": "jp",
    "gender": 2,
    "tags": [
      "Chính kịch",
      "Tình cảm",
      "Hài"
    ],
    "roles": "Tài tử biến hóa • Diễn viên & Ca sĩ",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/g7gXu0bE9jZ5LHjSqn1zHdNtiA1.jpg",
    "tmdbPersonId": 585211,
    "birthday": "1993-02-21",
    "placeOfBirth": "Osaka, Japan",
    "bio": "Masaki Suda là nam diễn viên kiêm nhạc sĩ tài hoa bậc nhất của thế hệ trẻ Nhật Bản, từng đoạt giải Viện Hàn lâm Nhật Bản danh giá. Anh ghi dấu ấn trong Kamen Rider W, Death Note: Light Up the New World, Gintama và chuyện tình kinh điển Loved Like a Flower Bouquet.",
    "aliases": [
      "masaki suda",
      "菅田 将暉",
      "菅田 将晖",
      "菅生 大将",
      "taishō sugou",
      "taishou sugou",
      "taishō sugō",
      "taisho sugo"
    ],
    "featured": false
  },
  {
    "slug": "satomi-ishihara",
    "name": "Satomi Ishihara",
    "country": "Nhật Bản 🇯🇵",
    "countryCode": "jp",
    "gender": 1,
    "tags": [
      "Tình cảm",
      "Chính kịch",
      "Hài"
    ],
    "roles": "Ngọc nữ truyền hình Nhật Bản",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/gFBK1fHFLA8qJvSohrfXuuOflwu.jpg",
    "tmdbPersonId": 224664,
    "birthday": "1986-12-24",
    "placeOfBirth": " Tokyo, Japan",
    "bio": "Satomi Ishihara là một trong những nữ diễn viên được yêu mến và có tầm ảnh hưởng lớn nhất tại Nhật Bản. Cô ghi dấu ấn sâu đậm qua các bộ phim truyền hình ăn khách như Rich Man, Poor Woman, 5-ji Kara 9-ji Made (Nhà Sư Khi Yêu), Unnatural và phim điện ảnh Shin Godzilla.",
    "aliases": [
      "satomi ishihara",
      "石原里美",
      "이시하라 사토미",
      "ساتومی ایشی هارا"
    ],
    "featured": false
  },
  {
    "slug": "suzu-hirose",
    "name": "Suzu Hirose",
    "country": "Nhật Bản 🇯🇵",
    "countryCode": "jp",
    "gender": 1,
    "tags": [
      "Chính kịch",
      "Tình cảm",
      "Anime"
    ],
    "roles": "Nàng thơ điện ảnh • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/2QPyHhJQ0BY7GEsH3L5g8DhxPTQ.jpg",
    "tmdbPersonId": 1454976,
    "birthday": "1998-06-19",
    "placeOfBirth": "Shimizu, Shizuoka, Japan",
    "bio": "Suzu Hirose là \"nàng thơ điện ảnh\" thế hệ mới của Nhật Bản, tỏa sáng trong kiệt tác Our Little Sister của đạo diễn Kore-eda tại LHP Cannes. Cô tiếp tục khẳng định tài năng qua loạt phim chuyển thể Chihayafuru, The Third Murder và Wandering.",
    "aliases": [
      "suzu hirose",
      "広瀬 すず",
      "ซูสุ ฮิโรเสะ",
      "سوزو هیروسه"
    ],
    "featured": false
  },
  {
    "slug": "kenichi-matsuyama",
    "name": "Kenichi Matsuyama",
    "country": "Nhật Bản 🇯🇵",
    "countryCode": "jp",
    "gender": 2,
    "tags": [
      "Anime",
      "Chính kịch",
      "Kinh dị"
    ],
    "roles": "Tài tử Death Note • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/sMrWJWLM5xJVtHfSqxArh5k61PS.jpg",
    "tmdbPersonId": 79037,
    "birthday": "1985-03-05",
    "placeOfBirth": "Mutsu, Aomori, Japan",
    "bio": "Kenichi Matsuyama là nam diễn viên thực lực nổi tiếng toàn thế giới qua vai diễn biểu tượng thám tử L trong bản chuyển thể điện ảnh Death Note (2006). Ngoài ra, anh còn đóng chính trong chuyển thể văn học Rừng Na Uy (Norwegian Wood) của Haruki Murakami và phim Gantz.",
    "aliases": [
      "kenichi matsuyama",
      "мацуяма кэнъити",
      "ken'ichi matsuyama",
      "마츠야마 켄이치",
      "matsuyama kenichi"
    ],
    "featured": false
  },
  {
    "slug": "nana-komatsu",
    "name": "Nana Komatsu",
    "country": "Nhật Bản 🇯🇵",
    "countryCode": "jp",
    "gender": 1,
    "tags": [
      "Tình cảm",
      "Chính kịch"
    ],
    "roles": "Nàng thơ điện ảnh • Người mẫu",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/74WvpjdZkE5kYSEHwG9E4f0gVKk.jpg",
    "tmdbPersonId": 1287268,
    "birthday": "1996-02-16",
    "placeOfBirth": "Tokyo, Japan",
    "bio": "Nana Komatsu là nữ diễn viên kiêm người mẫu nổi tiếng với nét đẹp ma mị và phong cách cuốn hút đặc trưng. Cô khẳng định tên tuổi qua The World of Kanako, My Tomorrow, Your Yesterday, Drowning Love, Silence của Martin Scorsese và The Last 10 Years.",
    "aliases": [
      "nana komatsu",
      "นานะ โคมัตสึ",
      "โคมัตสึ นานะ",
      "小松 菜奈",
      "نانا کوماتسو"
    ],
    "featured": false
  },
  {
    "slug": "minami-hamabe",
    "name": "Minami Hamabe",
    "country": "Nhật Bản 🇯🇵",
    "countryCode": "jp",
    "gender": 1,
    "tags": [
      "Anime",
      "Tình cảm",
      "Hành động"
    ],
    "roles": "Mỹ nhân thế hệ mới • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/eQN8N2chINckvQDiNqzDXI0v9vN.jpg",
    "tmdbPersonId": 1516266,
    "birthday": "2000-08-29",
    "placeOfBirth": "Ishikawa, Japan",
    "bio": "Minami Hamabe là một trong những nữ diễn viên trẻ sáng giá nhất của xứ sở hoa anh đào. Cô lấy đi nước mắt của triệu khán giả qua Let Me Eat Your Pancreas (Tớ Muốn Ăn Tụy Của Cậu), Kakegurui, Shin Kamen Rider và bom tấn đoạt giải Oscar Godzilla Minus One (2023).",
    "aliases": [
      "minami hamabe",
      "滨边美波",
      "하마베 미나미",
      "濱邊美波",
      "مینامی هامابه"
    ],
    "featured": false
  },
  {
    "slug": "tatsuya-fujiwara",
    "name": "Tatsuya Fujiwara",
    "country": "Nhật Bản 🇯🇵",
    "countryCode": "jp",
    "gender": 2,
    "tags": [
      "Anime",
      "Kinh dị",
      "Hành động"
    ],
    "roles": "Ông hoàng phim sinh tồn • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/lxPjnmbu3DyoEioVPfuY75fKoQL.jpg",
    "tmdbPersonId": 31078,
    "birthday": "1982-05-15",
    "placeOfBirth": "Saitama, Japan",
    "bio": "Tatsuya Fujiwara là nam diễn viên kịch nghệ và điện ảnh gạo cội của Nhật Bản, được mệnh danh là \"ông hoàng của những vai diễn sinh tồn và tâm lý cực đoan\". Anh nổi tiếng toàn cầu với vai Shuya Nanahara trong kiệt tác Battle Royale, Yagami Light trong Death Note và Kaiji.",
    "aliases": [
      "tatsuya fujiwara",
      "藤原龍也",
      "藤原龙也",
      "후지와라 타츠야",
      "تاتسویا فوجیوارا"
    ],
    "featured": false
  },
  {
    "slug": "sunny-suwanmethanont",
    "name": "Sunny Suwanmethanont",
    "country": "Thái Lan 🇹🇭",
    "countryCode": "th",
    "gender": 2,
    "tags": [
      "Hài",
      "Tình cảm",
      "Chính kịch"
    ],
    "roles": "Ông hoàng phim hài • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/8Nlfyrhcwan9A4UYw249R7KP4JI.jpg",
    "tmdbPersonId": 1094679,
    "birthday": "1981-05-18",
    "placeOfBirth": "Thailand",
    "bio": "Sunny Suwanmethanont là \"ông hoàng phim hài lãng mạn\" hàng đầu của điện ảnh Thái Lan. Anh sở hữu nét diễn hài hước tự nhiên đầy duyên dáng qua các bộ phim gây sốt phòng vé khắp Đông Nam Á như I Fine..Thank You..Love You, Heart Attack, Ông Anh Trời Đánh (Brother of the Year) và Happy Old Year.",
    "aliases": [
      "sunny suwanmethanont",
      "ซันนี่ สุวรรณเมธานนท์",
      "sunny suwanmaythanon"
    ],
    "featured": false
  },
  {
    "slug": "nadech-kugimiya",
    "name": "Nadech Kugimiya",
    "country": "Thái Lan 🇹🇭",
    "countryCode": "th",
    "gender": 2,
    "tags": [
      "Tình cảm",
      "Hành động",
      "Hài"
    ],
    "roles": "Nam thần số 1 Thái Lan • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/w58HrktpHZ7UVGY5SKoJxFkitCy.jpg",
    "tmdbPersonId": 1197012,
    "birthday": "1991-12-17",
    "placeOfBirth": "Khon Kaen, Thailand",
    "bio": "Nadech Kugimiya (tiếng Thái: ณเดชน์ คูกิมิยะ, phiên âm: Na-đét Khu-ki-mi-da, sinh ngày 17 tháng 12 năm 1991) còn có nghệ danh là Barry (แบร์รี), là một diễn viên và người mẫu người Thái Lan. Anh nổi tiếng với các vai diễn trong Duang Jai Akkanee (2010), Game Rai Game Rak (2011), Hoàng hôn ở Chaophraya (2013), The Rising Sun Series (2014), Leh Lub Salub Rarng (2017) và Likit Ruk (2018).\n\nTiểu sử và học vấn:\n\nNadech có tên khai sinh là Chonlathit Yodprathum, sinh ngày 17 tháng 12 năm 1991 ở tỉnh Khon Kaen, Thái Lan. Cha của anh là người Áo và mẹ là người Thái Lan. Do cha mẹ anh ly dị từ khi anh còn nhỏ nên anh được nuôi dưỡng bởi dì ruột Sudarat Kugimiya, là một người điều hành một doanh nghiệp tư nhân và người chồng người Nhật Bản tên là Yoshio Kugimiya, là một kỹ sư điện làm việc tại Băng Cốc nên anh lấy họ là Kugimiya nhằm tỏ lòng biết ơn đến ông. Anh thông thạo tiếng Thái, tiếng Isan, tiếng Anh. Anh có thể nắm được một ít tiếng Nhật nhưng không thạo ngôn ngữ này. Biệt danh \"Barry\" của anh xuất phát từ biệt danh ban đầu là \"Brand\".\nAnh tốt nghiệp Cử nhân Đại học Rangsit, ngành Nghệ thuật truyền thông năm 2015 và sau đó tốt nghiệp Thạc sĩ cùng chuyên ngành vào tháng 5, năm 2020.\nNadech sống cùng khu với Sukollawat Kanarot (Weir), một diễn viên và người mẫu Thái Lan và được phát hiện bởi người quản lý của Weir.\n\nSự nghiệp:\n\nNadech bắt đầu sự nghiệp người mẫu từ năm mười bảy tuổi. Năm 2010, anh đóng phim truyền hình đầu tiên với vai chính Nawa Gamtornpuwanat trong phim Ngao Rak Luang Jai. Anh trở nên nổi tiếng sau vai diễn Fai Akkanee Adisuan trong phim Duang Jai Akkanee và vai Saichon / Charles Makovich trong Game Rai Game Rak, đóng cặp cùng Urassaya Sperbund (Yaya). Anh cũng là thành viên của nhóm \"4+1 Channel 3 Superstar\" cùng với Mario Maurer, Prin Suparat, Pakorn Chatborirak, và Phupoom Pongpanu. Anh ký hợp đồng độc quyền với đài Channel 3. Người quản lý của anh tên là Suphachai Srivijit.\nNadech Kugimiya là cái tên bảo chứng rating cho những bộ phim mà anh tham gia. Liên tiếp những bộ phim như Trang trại tình yêu (Duang Jai Akkanee), Trò chơi tình yêu (Game Rai Game Rak), Series Ánh dương tình yêu (Roy Ruk Hak Liam Tawan / Roy Fun Tawan Duerd), Sự hoán đổi diệu kỳ (Leh Lub Salub Rarng), Duyên trời định (Likit Ruk) đều trở thành những bộ phim ăn khách và có rating cao ngất ngưởng trên màn ảnh nhỏ. Ngoài ra hai bộ phim điện ảnh mà anh tham gia là Hoàng hôn ở Chaophraya (Koo Gum) và Nữ thần rắn 2 (Nakee 2) đều là những tác phẩm thắng lớn trên địa hạt màn ảnh rộng. Quả thật nếu nói về công việc diễn xuất, nếu Nadech nhận khó tính thứ 2 sẽ hiếm có ai nhận mình số 1 trong làng giải trí Thái. Chính anh đã chia sẻ rằng: \"Lúc đóng phim tôi sẽ tham khảo ý kiến của đạo diễn và những người xung quanh. Tôi ít khi xem phim của bản thân mình đóng, vì sẽ nhận ra những khuyết điểm của bản thân nhiều hơn bất kỳ ai. Vì thế lúc làm việc, tôi luôn xác định rõ mục tiêu của mình. Vậy nên nếu làm không hết mình, thì chính tôi sẽ tự biết kết quả như thế nào\".",
    "aliases": [
      "nadech kugimiya",
      "barry",
      "ณเดชน์ คูกิมิยะ",
      "барри надет кугимия",
      "纳得克·库吉米亚"
    ],
    "featured": false
  },
  {
    "slug": "yaya-urassaya",
    "name": "Urassaya Sperbund (Yaya)",
    "englishName": "Urassaya Sperbund",
    "country": "Thái Lan 🇹🇭",
    "countryCode": "th",
    "gender": 1,
    "tags": [
      "Tình cảm",
      "Hài",
      "Chính kịch"
    ],
    "roles": "Ngọc nữ màn ảnh Thái Lan",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/eLm2TfDTd3AQ2zFCXM4ymjsPi0S.jpg",
    "tmdbPersonId": 1259367,
    "birthday": "1993-03-18",
    "placeOfBirth": "Pattaya, Chonburi, Thailand",
    "bio": "Urassaya Sperbund (tiếng Thái: อุรัสยา เสปอร์บันด์, phiên âm: U-lát-xa-da Xa-bơ-ban, sinh ngày 18 tháng 3 năm 1993) còn có nghệ danh là Yaya, là một nữ diễn viên và người mẫu người Thái Lan gốc Na Uy. Cô được biết đến qua các vai diễn trong Trang trại tình yêu (2010), Trò chơi tình yêu (2011), Trái tim người thừa kế (2012), Sóng gió cuộc đời (2017)  và Duyên trời định (2018), Thước vải se duyên (2022)...\n\nTiểu sử và học vấn:\n\nUrassaya Sperbund (Yaya) sinh ngày 18 tháng 3 năm 1993 tại Pattaya, Thái Lan, có mẹ là người Thái Lan, bố là người Na Uy. Cô có một người chị tên là Cattreya. Cha cô tên Sigood Sperbund, người Na Uy, là cố vấn đầu tư và người môi giới trên thị trường chứng khoán. Mẹ cô, bà Urai Sperbund làm việc trong nhà hàng.\nCô thông thạo tiếng Thái và tiếng Anh. Cô biết một số cụm từ bằng tiếng Pháp, tiếng Tây Ban Nha và tiếng Na Uy, nhưng cô không thông thạo bất kỳ ngôn ngữ nào trong số này.\nSperbund theo học trường quốc tế Regents International School Pattaya khi vào tiểu học và bậc THCS trước khi chuyển sang trường Bangkok Pattana. Cô tốt nghiệp Đại học Chulalongkorn với bằng Cử nhân Ngôn ngữ và Văn hóa vào năm 2015.\n\nSự nghiệp:\n\nSperbund đã ổn định hơn nữa khả năng diễn xuất và vị trí của cô trong ngành công nghiệp giải trí với những vai diễn trong nhiều bộ phim truyền hình.\nCô là gương mặt đại diện cho các thương hiệu nổi tiếng bao gồm Maybelline, Pantene và Uniqlo.\nSperbund là nữ diễn viên Thái Lan đầu tiên nhận được danh hiệu \"Friend of Louis Vuitton\" và trở thành người nổi tiếng đầu tiên của Thái Lan xuất hiện trên tạp chí Vogue Mỹ.\n\nĐời tư:\n\nUrassaya gặp nam diễn viên người Thái Lan Nadech Kugimiya trong khi quay phim Duang Jai Akkanee vào năm 2010. Mối quan hệ của họ được đưa tin trên các phương tiện truyền thông với nhiều suy đoán khác nhau, nhưng cặp đôi này từ chối nói về điều đó trước công chúng. Cho đến concert The Real Nadech năm 2019, Nadech đã tuyên bố Yaya là bạn gái của mình. Trong một cuộc phỏng vấn vào tháng 11 năm 2022 với tờ The Standard Pop, Urassaya cho biết, \"Thực ra, chúng tôi chưa bao giờ yêu cầu nhau trở thành bạn trai - bạn gái. Chúng tôi đã tự hỏi, 'Khi nào thì chúng ta nên tính là ngày đầu tiên?' Và tôi nghĩ đó là trong quá trình quay Torranee Ni Nee Krai Krong.\" Họ đã đính hôn vào tháng 6 năm 2023, khi đó Nadech đã cầu hôn Yaya ở Italy. Yaya và Nadech đã kết hôn năm 2026 với lễ cưới ở Khon Kaen quê nhà Nadech (17/4/2026) và lễ cưới ở Oslo (Na Uy) ngày 22/5/2026\n\nCác phim đã tham gia:",
    "aliases": [
      "urassaya sperbund (yaya)",
      "urassaya sperbund",
      "yaya urassaya",
      "ญาญ่า ",
      "yaya",
      "яя"
    ],
    "featured": false
  },
  {
    "slug": "mark-prin",
    "name": "Mark Prin Suparat",
    "englishName": "Prin Suparat",
    "country": "Thái Lan 🇹🇭",
    "countryCode": "th",
    "gender": 2,
    "tags": [
      "Tình cảm",
      "Hành động"
    ],
    "roles": "Nam thần đài CH3 • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/lo6zChxhJrIGYaSZV46IG1K98Rw.jpg",
    "tmdbPersonId": 1256327,
    "birthday": "1990-03-19",
    "placeOfBirth": "Chiang Mai, Thailand",
    "bio": "Prin Suparat (tiếng Thái: ปริญ สุภารัตน์, sinh ngày 19 tháng 3 năm 1990), được biết đến với nghệ danh Mark Prin, là nam diễn viên và người mẫu Thái Lan. Anh hiện là diễn viên độc quyền của Channel 3. Anh là thành viên của nhóm 4+1 Channel 3 Superstar cùng với Mario Maurer, Nadech Kugimiya, Pakorn Chatborirak và Phupoom Pongpanu. Anh được biết đến qua các vai diễn trong Trí thức trùm xó bếp (2012), Hai thế giới một tình yêu (2014), Sóng gió cuộc đời (2017), Chuyện tình bậc đế vương (2017), Yêu thầm anh xã (2020), Miễn bầu trời còn có mặt trời (2020)...\n\nTiểu sử và học vấn:\n\nSuparat sinh ra ở tỉnh Chiang Mai với cha mẹ là người Thái gốc Hoa. Anh lớn lên ở Lampang. Sự nghiệp của anh trong lĩnh vực giải trí và diễn xuất bắt đầu sau khi anh được một người quản lý làm việc ở Channel 3 phát hiện.\nAnh theo học khoa Du lịch và Khách sạn tại Đại học Rangsit với học bổng thể thao, nhưng sau đó chuyển sang khoa Quản trị Kinh doanh, chuyên ngành Marketing. Anh có đai đen Judo (hạng trung) và ở trong đội Judo của đại học Rangsit.\n\nĐời tư:\n\nVào ngày 17 tháng 4 năm 2022, anh và bạn gái 9 năm Kimberley Anne Woltemas đã đính hôn và tổ chức đám cưới vào ngày 14 tháng 9 năm 2023.\n\nCác phim đã tham gia:",
    "aliases": [
      "mark prin suparat",
      "prin suparat",
      "mark prin",
      "หมาก ปริญ สุภารัตน์",
      "марк прин супарат",
      "پرین سوپارات"
    ],
    "featured": false
  },
  {
    "slug": "bella-ranee",
    "name": "Bella Ranee Campen",
    "englishName": "Ranee Campen",
    "country": "Thái Lan 🇹🇭",
    "countryCode": "th",
    "gender": 1,
    "tags": [
      "Cổ trang",
      "Tình cảm",
      "Hài"
    ],
    "roles": "Nữ hoàng truyền hình Thái Lan",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/p2mHicig9Obk6InadpCmdxFIMpj.jpg",
    "tmdbPersonId": 1070805,
    "birthday": "1989-12-24",
    "placeOfBirth": "Bangkok, Thailand",
    "bio": "Ranee Campen (tiếng Thái: ราณี แคมเปน; sinh ngày 24 tháng 12 năm 1989), nghệ danh Bella, là một nữ diễn viên người Thái Lan gốc Anh. Cô được biết đến qua các vai diễn trong Trò đùa của thượng đế (2013), Bác sĩ Puttipat (2013), Lửa tình Chimplee (2014), Cô vợ mẫu mực (2016), Ngọn lửa đức hạnh (2017), Ngược dòng thời gian để yêu anh (2018), Lồng nghiệp chướng (2019)...\n\nTiểu sử và học vấn:\n\nBella sinh ngày 24 tháng 12 năm 1989 (Phật Lịch 2532) tại Băng Cốc, Thái Lan. Cô có bố người Anh là Arnold Campen, mẹ người Thái là Pranee Campen và là con một trong gia đình.\nBella tốt nghiệp trường Trung học Sarawithaya. Cô tốt nghiệp Cử nhân loại xuất sắc chuyên ngành Báo chí và Truyền thông đại chúng tại Đại học Thammasat với điểm số ấn tượng - GPA 3.85. Năm 2015, cô tốt nghiệp Thạc sĩ cùng chuyên ngành với điểm số GPA 3.5. Ngoài thành tích học tập đáng nể, cô còn thường xuyên tham gia các hoạt động ngoại khóa như làm hoạt náo viên, tham gia đội cổ vũ, đội trống, đội văn nghệ...\n\nSự nghiệp:\n\nBella bắt đầu sự nghiệp giải trí của mình với tư cách là người mẫu quảng cáo. Sau khoảng mười quảng cáo, cô đã kí hợp đồng và trở thành diễn viên độc quyền của đài Channel 3 vào năm 2011.\nNăm 2013, Bella có vai chính đầu tiên và đề cử đầu tiên cho bộ phim Trò đùa của thượng đế, bộ phim đạt tỉ suất người xem cao thứ 5 trong số tất cả các bộ phim truyền hình khung giờ vàng được chiếu trên Channel 3 trong năm đó.\nSau khi Bác sĩ Puttipat được phát sóng, nó đã trở thành bộ phim được tìm kiếm nhiều nhất trên Google Thái Lan và xếp thứ 4 về tỉ suất người xem các bộ phim truyền hình khung giờ vàng năm 2013. Hơn nữa, nhờ những cảnh tình cảm lãng mạn của họ trong bộ phim, Bella và James Jirayu Tangsrisuk đã giành giải \"Fantasy Couple of the Year\" tại lễ trao giải Kerd Award 2.0. Cùng năm đó, Bella đóng vai chính thứ hai là một quý cô thanh lịch trong một bộ phim cổ trang từng đoạt giải thưởng, Đứa con của nô lệ. Kể từ đó, Bella đã chứng minh bản thân là một nữ diễn viên có thực lực, đặc biệt là trong các bộ phim truyền hình dài tập.\nNăm 2014, cô vào vai \"Nuernang\", một vũ công truyền thống thành đạt trong phim truyền hình Lửa tình Chimplee.\nNăm 2016, cô tái ngộ với Jirayu Tangsrisuk trong phim Cô vợ mẫu mực. Bộ phim đạt tỉ suất người xem cao thứ 2 năm 2016 của đài Channel 3.\nNăm 2017, cô cùng với tài tử Nawat Kulrattanarak tham gia bộ phim tâm lý đầy phức tạp Ngọn lửa đức hạnh. Bộ phim đạt tỉ suất người xem cao nhất năm 2017 của đài Channel 3.\nNăm 2018, cô tham gia bộ phim hài cổ trang xuyên không Ngược dòng thời gian để yêu anh với Thanawat Wattanaputi. Khi bộ phim đang phát sóng, bộ phim tạo được hiệu ứng rất mạnh mẽ không chỉ trên truyền hình mà còn trên diễn đàn cộng đồng mạng, cũng như quảng bá du lịch Thái Lan. Tỉ suất người xem trung bình mỗi tập lên đến 12.86% và kết thúc với tỉ suất 18.6% trên toàn quốc.",
    "aliases": [
      "bella ranee campen",
      "ranee campen",
      "bella ranee",
      "ราณี แคมเปญ",
      "ราณี เบลล่า",
      "ranee campain",
      "เบลล่า แคมเปน",
      "bella campen",
      "ราณี แคมเปน",
      "белла рани кампен",
      "เบลล่า ราณี แคมเปน",
      "bella vanita",
      "белла ванита",
      "เบลล่า ราณี",
      "ranee kampen",
      "рани кампен",
      "bella (เบลล่า)",
      "ベラ"
    ],
    "featured": false
  },
  {
    "slug": "tor-thanapob",
    "name": "Tor Thanapob",
    "englishName": "Thanapob Leeratanakachorn",
    "country": "Thái Lan 🇹🇭",
    "countryCode": "th",
    "gender": 2,
    "tags": [
      "Chính kịch",
      "Tình cảm",
      "Hành động"
    ],
    "roles": "Nam thần Tuổi Nổi Loạn • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/zZCYpbtAe4axyySy0TYS8eICujw.jpg",
    "tmdbPersonId": 1536085,
    "birthday": "1994-02-14",
    "placeOfBirth": "Bangkok, Thailand",
    "bio": "Thanapob Leeratanakachorn  (Thai: ธนภพ ลีรัตนขจร, RTGS: Thanaphop Liratanakhachon; born 14 February 1994), nicknamed Tor (Thai: ต่อ), is a Chinese-Thai actor and singer. His most notable dramas and films are Hormones: The Series (2013), May Who? (2015), Project S: The Series (2017), In Family We Trust (2018), Man of Vengeance (2019), The Last Promise (2020), and The Giver (2022). He is a former member of the Thai boy group Nine by Nine.\n\nPersonal life and education:\n\nThanapob was born on 14 February 1994, and is the youngest child of three in a Thai Chinese family. His Chinese surname is Lee(李). He is the son of Chatchawan and Areeya Leeratanakachorn and has two brothers. He studied at Adventist Ekamai School and graduated at Kasetsart University, with Bachelor of Science degree in Packaging Technology under Department of Packaging and Materials Technology, Faculty of Agro-Industry.\n\nCareer:\n\nThanapob started his career by performing in music videos like \"It's Time to Listen\" by Da-Endorphine.  His debut as a television actor was in the Club Friday: The Series episode \"Once in Memory.\" (2012).  In 2013, Thanapob joined Nadao Bangkok and was cast in the popular Thai TV show, Hormones: The Series directed by Songyos Sugmakanan, playing the role of Phai. His role in Hormones became his first notable role and gained him the popularity.\nHis film debut came with the mystery thriller film The Swimmers (2014) with Hormones cast members, Supassara Thanachat and Chutavuth Pattarakampol. He received the Silver Doll Award for Outstanding Male Rising Star at the 30th Surasawadee Royal Award for playing the role of Tan. He was cast for several series and films afterwards such as Club Friday: The Series (Season 5) (2014), Club Friday The Series Season 5: Secret of Classroom 6/3 (2015), Love o-net (2015), and Stupid Cupid The Series (2015). He appeared for his third film May Who? (2015) and played a main role with Sutatta Udomsilp and Thiti Mahayotaruk. He was nominated for the Best Supporting Actor Award at the 25th Suphannahong National Film Awards for playing the role of Fame.\nFrom 2016 to 2017, Thanapob starred in several television series such as I See You, O-Negative, and The Cupid's Series: Kamathep Parbman. He also took on the role of Gym, an autistic badminton athlete in the Project S: The Series – Side by Side (2017). He received overall positive acclaim for his performance and won him the Best Actor Award at the 9th Nataraj Awards in 2018.\nThanapob debuted as one of the members of the Thai boy group Nine by Nine, a special by 4nologue and Nadao Bangkok in 2018. As an actor, Thanapob said that he struggled in dancing at first due to his minimal skills and uncomfortable feeling because of his height and limbs. As they underwent months of intensive training he felt his improvement because of his co-members' inputs and encouragement from their fans.",
    "aliases": [
      "tor thanapob",
      "thanapob leeratanakachorn",
      "타나폽 리라따나카쫀",
      "ต่อ ธนภพ ลีรัตนขจร",
      "тор танапоп лиратанакатжон",
      "tor thanapob leeratanakachorn",
      "تاناپوب لی‌راتاناکاچورن",
      "thanapob leeratanakajorn"
    ],
    "featured": false
  },
  {
    "slug": "nonkul-chanon",
    "name": "Nonkul Chanon",
    "englishName": "Chanon Santinatornkul",
    "country": "Thái Lan 🇹🇭",
    "countryCode": "th",
    "gender": 2,
    "tags": [
      "Chính kịch",
      "Hài",
      "Tình cảm"
    ],
    "roles": "Thiên tài Bad Genius • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/osG0qvkXtpO0DPiZKlSllAVjTlE.jpg",
    "tmdbPersonId": 1353678,
    "birthday": "1996-06-06",
    "placeOfBirth": "Bangkok, Thailand",
    "bio": "Chanon Santinatornkul (tiếng Thái: ชานน สันตินธรกุล, sinh ngày 6 tháng 6 năm 1996) còn có nghệ danh là Non (นน) hoặc Nonkul (นนกุล), là một diễn viên và người mẫu người Thái Lan. Anh được biết đến nhiều nhất qua vai Bank trong Thiên tài bất hảo (2017), vai Due trong Dì ơi, đừng có bồ (2019).\n\nTiểu sử và học vấn:\n\nChanon sinh ngày 6 tháng 6 năm 1996 tại Băng Cốc, Thái Lan.\nAnh tốt nghiệp trường Cao đẳng Cơ Đốc giáo Băng Cốc, và hoàn thành bằng Cử nhân ngành Sản xuất phim tại trường Cao đẳng Quốc tế Đại học Mahidol.\nAnh là người theo đạo Cơ Đốc. Sở thích lúc rảnh rỗi của anh là tập luyện, trong một bài phỏng vấn năm 2015, anh nói sẽ dành 6 ngày 1 tuần để tập gym nếu có thời gian.\n\nSự nghiệp:\n\nChanon xuất hiện lần đầu trong bộ phim đồng tính nam lãng mạn năm 2014 Love's Coming với một vai phụ, mặc dù vai diễn đầu tiên của anh là trong bộ phim Patcha is Sexy, một bộ phim ngắn được đạo diễn bởi Nawapol Thamrongrattanarit phục vụ chiến dịch Young Love, đây là một chiến dịch về sức khỏe sinh sản được tài trợ bởi Bộ Y tế Công cộng Thái Lan.\nNăm 2015, anh xuất hiện trong phần tiếp theo của bộ phim mang tên Love Love You và phim Keetarajanipon, một tuyển tập phim tôn vinh Đức vua Bhumibol Adulyadej, trước khi tham gia Nadao Bangkok, một công ty quản lý tài năng và là công ty con của GTH (bây giờ là GDH 559). Anh trở nên nổi tiếng với vai Net, một nhân vật nhỏ trong bộ phim truyền hình đình đám Tuổi nổi loạn. Sau đó anh xuất hiện trong một số bộ phim truyền hình khác, anh cũng làm một số công việc của người mẫu và xuất hiện trong nhiều quảng cáo trên truyền hình.\nVai Bank trong bộ phim ăn khách năm 2017 mang tên Thiên tài bất hảo đã đưa tên tuổi Chanon vươn ra quốc tế, đặc biệt là tại Trung Quốc. Sau đó anh xuất hiện trong bộ phim truyền hình Trung Quốc tên là Gió lớn thổi qua.\nAnh đã không gia hạn hợp đồng với Nadao Bangkok khi nó hết hạn vào năm 2018, và hiện đang là diễn viên tự do.\nNăm 2021, Chanon trở lại với vai diễn Korn, đóng cặp với Pimchanok Leuwisedpaiboon (Baifern) trong bộ phim 46 ngày phá nát đám cưới.\n\nCác phim đã tham gia:",
    "aliases": [
      "nonkul chanon",
      "chanon santinatornkul",
      "non chanon santinatornkul",
      "查农·桑提纳同库",
      "nonkul chanon santinatornkul",
      "นนกุล ชานน สันตินธรกุล",
      "ノンクン"
    ],
    "featured": false
  },
  {
    "slug": "prabhas",
    "name": "Prabhas",
    "country": "Ấn Độ 🇮🇳",
    "countryCode": "in",
    "gender": 2,
    "tags": [
      "Bollywood",
      "Hành động",
      "Chính kịch"
    ],
    "roles": "Baahubali • Siêu sao Ấn Độ",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/u6RVP8ukgLaymeoi5VmX0JRAcCn.jpg",
    "tmdbPersonId": 237045,
    "birthday": "1979-10-23",
    "placeOfBirth": "Chennai, Tamil Nadu, India",
    "bio": "Prabhas là siêu sao điện ảnh hàng đầu của nền điện ảnh Ấn Độ. Anh tạo nên cột mốc lịch sử toàn cầu khi đóng chính trong siêu bom tấn sử thi hai phần Baahubali: The Beginning và Baahubali 2: The Conclusion, cùng Salaar và Kalki 2898 AD.",
    "aliases": [
      "prabhas",
      " \tvenkata satyanarayana prabhas raju uppalapati"
    ],
    "featured": false
  },
  {
    "slug": "ram-charan",
    "name": "Ram Charan",
    "country": "Ấn Độ 🇮🇳",
    "countryCode": "in",
    "gender": 2,
    "tags": [
      "Bollywood",
      "Hành động",
      "Chính kịch"
    ],
    "roles": "Siêu sao RRR • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/twGqYUCR0Yh33j3TcgRTZRBRhTd.jpg",
    "tmdbPersonId": 147023,
    "birthday": "1985-03-27",
    "placeOfBirth": "Madras, Tamil Nadu, India",
    "bio": "Ram Charan là nam tài tử quyền lực của điện ảnh Telugu và Ấn Độ. Anh gây sốt toàn cầu với màn trình diễn phi thường vai Alluri Sitarama Raju trong siêu phẩm đoạt giải Oscar RRR (2022) của đạo diễn S. S. Rajamouli, cùng Magadheera và Rangasthalam.",
    "aliases": [
      "ram charan",
      "konidela ram charan teja"
    ],
    "featured": false
  },
  {
    "slug": "jr-ntr",
    "name": "N. T. Rama Rao Jr.",
    "country": "Ấn Độ 🇮🇳",
    "countryCode": "in",
    "gender": 2,
    "tags": [
      "Bollywood",
      "Hành động",
      "Chính kịch"
    ],
    "roles": "Siêu sao RRR • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/5ycQgZ3SPUa12bq0yn1jpToBq9X.jpg",
    "tmdbPersonId": 148037,
    "birthday": "1983-05-20",
    "placeOfBirth": "Hyderabad, Andhra Pradesh, India",
    "bio": "N. T. Rama Rao Jr. (Jr. NTR) là một trong những siêu sao có lượng người hâm mộ đông đảo nhất điện ảnh Ấn Độ. Vai diễn Komaram Bheem trong hiện tượng điện ảnh toàn cầu RRR (2022) đã mang tên tuổi anh đến với khán giả quốc tế, cùng các bom tấn Aravinda Sametha và Devara.",
    "aliases": [
      "n. t. rama rao jr.",
      "jr ntr",
      " junior n.t.r.",
      "n.t.r. jr. ",
      "nandamuri taraka ramarao jr."
    ],
    "featured": false
  },
  {
    "slug": "allu-arjun",
    "name": "Allu Arjun",
    "country": "Ấn Độ 🇮🇳",
    "countryCode": "in",
    "gender": 2,
    "tags": [
      "Bollywood",
      "Hành động",
      "Chính kịch"
    ],
    "roles": "Biểu tượng phong cách • Pushpa",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/wHr3bKhYpiDiYVMZLZqebeauEVw.jpg",
    "tmdbPersonId": 108215,
    "birthday": "1982-04-08",
    "placeOfBirth": "Chennai, Tamil Nadu, India",
    "bio": "Allu Arjun là nam diễn viên đoạt giải Điện ảnh Quốc gia Ấn Độ, nổi tiếng với phong cách nhảy điêu luyện và sức hút màn ảnh đặc biệt. Anh tạo nên cơn sốt văn hóa đại chúng với bom tấn hành động Pushpa: The Rise (2021) và Pushpa 2: The Rule.",
    "aliases": [
      "allu arjun",
      "bunny"
    ],
    "featured": false
  },
  {
    "slug": "ranbir-kapoor",
    "name": "Ranbir Kapoor",
    "country": "Ấn Độ 🇮🇳",
    "countryCode": "in",
    "gender": 2,
    "tags": [
      "Bollywood",
      "Chính kịch",
      "Hành động"
    ],
    "roles": "Tài tử Bollywood • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/a5xWgKh7f4XofIl7ZwisxOi616K.jpg",
    "tmdbPersonId": 85034,
    "birthday": "1982-09-28",
    "placeOfBirth": "Mumbai, Maharashtra, India",
    "bio": "Ranbir Kapoor là nam diễn viên thực lực xuất thân từ gia tộc điện ảnh Kapoor danh giá của Bollywood. Anh khẳng định tài năng qua các tác phẩm được giới phê bình tán dương như Rockstar, Barfi!, Sanju, Brahmāstra và hiện tượng phòng vé Animal (2023).",
    "aliases": [
      "ranbir kapoor"
    ],
    "featured": false
  },
  {
    "slug": "ranveer-singh",
    "name": "Ranveer Singh",
    "country": "Ấn Độ 🇮🇳",
    "countryCode": "in",
    "gender": 2,
    "tags": [
      "Bollywood",
      "Hành động",
      "Chính kịch"
    ],
    "roles": "Ngôi sao nhiệt huyết • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/sRiwLmhduFghJo8U2coUafnDD4C.jpg",
    "tmdbPersonId": 224223,
    "birthday": "1985-07-06",
    "placeOfBirth": "Mumbai, Maharashtra, India",
    "bio": "Ranveer Singh là một trong những ngôi sao điện ảnh năng lượng và táo bạo nhất của Bollywood. Anh ghi dấu ấn đậm nét qua các thiên anh hùng ca sử thi của đạo diễn Sanjay Leela Bhansali như Goliyon Ki Raasleela Ram-Leela, Bajirao Mastani, Padmaavat và Gully Boy.",
    "aliases": [
      "ranveer singh",
      " \tranveer singh bhavnani",
      "ранвир сингх",
      "رانویر سینگ"
    ],
    "featured": false
  },
  {
    "slug": "amitabh-bachchan",
    "name": "Amitabh Bachchan",
    "country": "Ấn Độ 🇮🇳",
    "countryCode": "in",
    "gender": 2,
    "tags": [
      "Bollywood",
      "Chính kịch",
      "Tội phạm"
    ],
    "roles": "Đại thụ điện ảnh Ấn Độ",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/u69PvpWqGkywSm0YjFiw77j9eqS.jpg",
    "tmdbPersonId": 35780,
    "birthday": "1942-10-11",
    "placeOfBirth": "Allahabad, Uttar Pradesh, India",
    "bio": "Amitabh Bachchan (sinh 11 tháng 10 năm 1942), tên đầy đủ Amitabh Harivansh Bachchan, là một diễn viên điện ảnh Ấn Độ, đã xuất hiện trong hơn 180 bộ phim trong sự nghiệp kéo dài hơn bốn thập kỷ. Bachchan đã giành được rất nhiều giải thưởng lớn trong sự nghiệp của mình, trong đó có ba giải thưởng phim quốc gia Nam diễn viên xuất sắc nhất - một kỷ lục mà ông chia sẻ với Kamal Hassan và Mammootty và mười bốn giải thưởng Filmfare. Ông còn là một ca sĩ, nhà sản xuất phim và chương trình truyền hình.\n\nCác phim đã đóng:",
    "aliases": [
      "amitabh bachchan",
      "amitabh harivansh rai bachchan",
      "big b",
      "padmashree amitabh bachchan",
      "shri amitabh bachchan"
    ],
    "featured": false
  },
  {
    "slug": "tom-hardy",
    "name": "Tom Hardy",
    "country": "Mỹ / Anh 🇺🇸🇬🇧",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Hành động",
      "Marvel"
    ],
    "roles": "Tài tử điện ảnh • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/d81K0RH8UX7tZj49tZaQhZ9ewH.jpg",
    "tmdbPersonId": 2524,
    "birthday": "1977-09-15",
    "placeOfBirth": "Hammersmith, London, England, UK",
    "bio": "Edward Thomas \"Tom\" Hardy (CBE, sinh ngày 15 tháng 9 năm 1977) là một diễn viên, nhà sản xuất, nhà biên kịch và cựu người mẫu người Anh. Sau khi học diễn xuất tại Trung tâm Kịch nghệ London, anh đã có bộ phim đầu tay trong Black Hawk Down (2001) của Ridley Scott . Kể từ đó, anh đã được đề cử giải Oscar cho Nam diễn viên phụ xuất sắc nhất , hai giải Phim do các nhà phê bình lựa chọn và hai giải Phim của Viện hàn lâm Anh quốc , nhận giải Ngôi sao đang lên BAFTA năm 2011 .\nHardy cũng đã xuất hiện trong các bộ phim như Star Trek: Nemesis (2002), RocknRolla (2008), Bronson (2008), Warrior (2011), Tinker Tailor Soldier Spy (2011), Lawless (2012), This Means War (2012) , Locke (2013), The Drop (2014) và The Revenant (2015), mà anh ấy đã nhận được đề cử cho Giải thưởng Viện hàn lâm. Năm 2015, anh thể hiện vai \"Mad\" Max Rockatansky trong Mad Max: Fury Road và cả hai anh em sinh đôi Kray trong Legend. Anh ấy đã xuất hiện trong ba bộ phim của Christopher Nolan: Inception (2010) trong vai Eames, The Dark Knight Rises (2012) trong vai Bane, và Dunkirk (2017) trong vai phi công chiến đấu RAF. Anh đóng vai cả Eddie Brock và Venom trong bộ phim phản anh hùng Venom (2018) và phần tiếp theo của nó là Venom: Let There Be Carnage (2021).\nCác vai diễn trên truyền hình của Hardy bao gồm mini-series phim chiến tranh của HBO Band of Brothers (2001), mini-series phim lịch sử BBC The Virgin Queen (2005), Bill Sikes trong mini-series của BBC Oliver Twist (2007), Heathcliff trong ITV ' s Wuthering Heights (2009), loạt phim truyền hình The Take (2009) của Sky 1 , và vai Alfie Solomons trong phim truyền hình tội phạm lịch sử Peaky Blinders (2014 – nay) của BBC. Anh ấy đã tạo ra, đồng sản xuất và đảm nhận vai chính trong loạt phim viễn tưởng lịch sử tám phần Taboo(2017) trên BBC One và FX .  Năm 2020, anh cũng đóng góp công việc tường thuật cho kho tài liệu Amazon All or Nothing: Tottenham Hotspur .\nHardy đã biểu diễn trên cả hai sân khấu của Anh và Mỹ. Anh đã được đề cử Giải thưởng Laurence Olivier cho Người mới triển vọng nhất cho vai diễn Skank trong bộ phim In Arabia We'd All Be Kings (2003), và được trao Giải thưởng Evening Standard Theatre Award năm 2003 cho Diễn viên mới mới xuất sắc cho màn trình diễn của anh ấy trong cả hai Trong Arabia We'd All Be Kings và Blood, trong đó anh ấy đóng vai Luca. Anh tham gia sản xuất The Man of Mode (2007) và nhận được nhiều đánh giá tích cực cho vai diễn trong vở The Long Red Road (2010). Hardy tích cực hoạt động từ thiện và là đại sứ cho Prince's Trust . Anh ấy đã được bổ nhiệm làm CBE trong Danh hiệu Sinh nhật 2018 cho các dịch vụ đóng phim truyền hình.\n\nThời thơ ấu:\n\nHardy sinh ra tại Hammersmith, London, là đứa con duy nhất của Anne (née Barrett) và Edward \"Chips\" Hardy. Anh lớn lên tại East Sheen, London. Mẹ anh là họa sĩ sinh ra trong gia đình gốc Ireland,  còn bố anh viết truyện hài và tiểu thuyết. Hardy theo học tại trường Tower House và Reed's, rồi đến trường Richmond Drama, và sau cùng là Drama Centre London.",
    "aliases": [
      "tom hardy",
      "edward thomas hardy"
    ],
    "featured": false
  },
  {
    "slug": "joaquin-phoenix",
    "name": "Joaquin Phoenix",
    "country": "Mỹ / Anh 🇺🇸🇬🇧",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Chính kịch",
      "DC"
    ],
    "roles": "Joker • Chủ nhân giải Oscar",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/u38k3hQBDwNX0VA22aQceDp9Iyv.jpg",
    "tmdbPersonId": 73421,
    "birthday": "1974-10-28",
    "placeOfBirth": "San Juan, Puerto Rico",
    "bio": "Joaquin Rafael Phoenix (; nhũ danh Botttom; sinh ngày 28 tháng 10 năm 1974) là một diễn viên, nhà sản xuất, và nhà hoạt động vì quyền động vật người Mỹ. Ông thường vào vai những nhân vật có nội tâm đen tối và tiêu cực trong các phim điện ảnh độc lập và đã nhận được nhiều giải thưởng, bao gồm một giải Oscar, một giải BAFTA, một giải Grammy và hai giải Quả cầu vàng. Năm 2020, ông được The New York Times xếp hạng 12 trong danh sách 25 diễn viên vĩ đại nhất thế kỷ 21. Ông được đánh giá là một trong những nam diễn viên có thực lực diễn xuất hàng đầu Hollywood và Thế giới hiện nay\nSinh ra ở Puerto Rico và lớn lên tại Los Angeles và Florida, Phoenix bắt đầu sự nghiệp diễn xuất của mình từ đầu thập niên 1980 với các vai diễn trong các bộ phim truyền hình cùng người anh trai River Phoenix. Vai diễn chính đầu tiên của anh ở lĩnh vực điện ảnh là thuộc hai dự án SpaceCamp (1986) và Parenthood (1989). Trong khoảng thời gian đó, anh được ghi danh dưới cái tên Leaf Phoenix. Phoenix sử dụng lại tên khai sinh của mình từ đầu những năm 1990 và nhận được sự đánh giá cao của giới phê bình cho các vai diễn phụ trong phim điện ảnh hài chính kịch To Die For (1995) và phim lịch sử Quills (2000). Anh nhận được nhiều lời khen ngợi từ giới chuyên môn, với đề cử giải Oscar và giải Quả cầu vàng đầu tiên cho Nam diễn viên phụ xuất sắc nhất nhờ vai diễn Commodus trong bộ phim lịch sử Gladiator (2000). Phoenix cũng gặt hái nhiều thành công với hai phim kinh dị Signs (2002) và The Village (2004), bộ phim lịch sử Hotel Rwanda (2004), cũng như giành được một giải Grammy, một giải Quả cầu vàng và một đề cử giải Oscar cho Nam diễn viên chính xuất sắc nhất nhờ vai diễn nhạc sĩ Johnny Cash trong bộ phim tiểu sử Walk the Line (2005). Phoenix tiếp tục nhận được sự hoan nghênh từ giới phê bình sau khi thủ vai trong hai phim điện ảnh của đạo diễn James Grey là bộ phim hành động We Own the Night (2007) và bộ phim chín kịch lãng mạn Two Lovers (2008), trước khi quyết định tạm ngừng sự nghiệp diễn xuất.\nNăm 2010, Phoenix trở lại với sự nghiệp diễn xuất và tiếp tục nhận được những đánh giá tích cực từ giới chuyên môn. Anh thủ vai chính trong tác phẩm tâm lý The Master (2012), giành được Cúp Volpi cho Nam diễn viên chính xuất sắc nhất cũng như nhận được đề cử giải Oscar thứ ba trong sự nghiệp. Anh cũng nhận được đề cử Quả cầu vàng cho vai diễn trong bộ phim tình cảm Her (2013) và tác phẩm châm biếm tội phạm Inherent Vice (2014), đồng thời giành giải Nam diễn viên chính xuất sắc nhất của Liên hoan phim Cannes cho vai diễn trong phim điện ảnh giật gân tâm lý You Were Never Really Here (2017). Phoenix đạt được thành công quốc tế và giành được một giải Oscar, giải BAFTA, giải thưởng của Hiệp hội Diễn viên Màn ảnh và một giải Quả cầu vàng cho vai chính trong tác phẩm tâm lý tội phạm Joker (2019).\nNgoài việc là diễn viên, Phoenix còn là một nhà hoạt động vì quyền động vật.",
    "aliases": [
      "joaquin phoenix",
      "leaf phoenix",
      "joaquin rafael bottom",
      "joaquin rafael phoenix ",
      "leaf rafael phoenix",
      "vakīns rafaels fīnikss",
      "hoakins fīnikss"
    ],
    "featured": false
  },
  {
    "slug": "timothee-chalamet",
    "name": "Timothée Chalamet",
    "country": "Mỹ / Anh 🇺🇸🇬🇧",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Chính kịch",
      "Tình cảm"
    ],
    "roles": "Hoàng tử Dune • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/dFxpwRpmzpVfP1zjluH68DeQhyj.jpg",
    "tmdbPersonId": 1190668,
    "birthday": "1995-12-27",
    "placeOfBirth": "Manhattan, New York City, New York, USA",
    "bio": "Timothée Hal Chalamet (; sinh ngày 27 tháng 12 năm 1995) là nam diễn viên người Mỹ gốc Pháp. Chalamet bắt đầu sự nghiệp diễn xuất của mình bằng những bộ phim ngắn trước khi xuất hiện trong phim truyền hình Tổ quốc (2012). Anh lần đầu ra mắt với vai trò diễn viên điện ảnh bằng vai phụ trong Men, Women & Children (2014) và trong phim khoa học viễn tưởng Hố đen tử thần (2014).\nNăm 2017, Chalamet được công nhận rộng rãi với vai chính trong bộ phim điện ảnh lãng mạn của đạo diễn Luca Guadagnino Call Me by Your Name. Màn thể hiện trong Call Me by Your Name mang về cho anh một đề cử giải Oscar, giúp anh trở thành người trẻ tuổi thứ ba được Viện Hàn lâm đề cử cho hạng mục Nam diễn viên chính xuất sắc nhất, đồng thời cũng là người trẻ tuổi nhất kể từ năm 1939. Chalamet sau đó có một số vai phụ tiêu biểu trong phim tuổi mới lớn Lady Bird: Tuổi nổi loạn (2017), phim Viễn Tây Hostiles (2017) và đặc biệt là vai diễn thiếu niên nghiện ngập Nic Sheff trong Beautiful Boy (2018) giúp anh được đề cử giải BAFTA cho Nam diễn viên phụ xuất sắc nhất. Năm 2019, Chalamet vào vai chính trong các phim chính kịch cổ trang Quốc vương và Những người phụ nữ bé nhỏ. Năm 2021, anh đóng chính trong nhiều bộ phim của các đạo diễn tên tuổi như vai Paul Atreides trong phim sử thi khoa học viễn tưởng Dune: Hành tinh cát của Denis Villeneuve, The French Dispatch của Wes Anderson và Đừng nhìn lên của Adam McKay.\nTrên sân khấu, Chalamet đã đóng vai chính trong vở kịch tự truyện Prodigal Son (2016) và được đề cử Giải Liên đoàn kịch Hoa Kỳ cho Màn trình diễn xuất sắc, giành được Giải Lucille Lortel cho Nam diễn viên chính sân khấu xuất sắc nhất.\n\nCuộc đời và sự nghiệp:\n\nChalamet sinh ra ở quận Manhattan, thành phố New York và lớn lên tại vùng ngoại ô Hell's Kitchen. Mẹ của anh, Nicole Flender, một nhà môi giới bất động sản, là cựu vũ công của nhà hát Broadway, còn cha anh, Marc Chalamet, là biên tập viên của UNICEF. Chalamet có một người chị gái tên Pauline (sinh năm 1992), là diễn viên hiện đang sinh sống ở Paris. Anh có người cậu là nhà làm phim Rodman Flender và người dì là biên kịch, nhà sản xuất truyền hình Amy Lippman. Ông ngoại của Chalamet, Harold Flender, từng là một biên kịch, còn bà ngoại anh, Enid Flender, cũng là cựu vũ công Broadway giống như mẹ anh.",
    "aliases": [
      "timothée chalamet",
      "timothee chalamet",
      "timothée hal chalamet"
    ],
    "featured": false
  },
  {
    "slug": "zendaya",
    "name": "Zendaya",
    "country": "Mỹ / Anh 🇺🇸🇬🇧",
    "countryCode": "us_uk",
    "gender": 1,
    "tags": [
      "Hollywood",
      "Marvel",
      "Chính kịch"
    ],
    "roles": "Biểu tượng thế hệ mới • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/1qup8tSt95HLbcy2c2xrx4iJNxv.jpg",
    "tmdbPersonId": 505710,
    "birthday": "1996-09-01",
    "placeOfBirth": "Oakland, California, USA",
    "bio": "Zendaya Maree Stoermer Coleman (sinh ngày 1 tháng 9 năm 1996 tại Oakland, California, Hoa Kỳ), hay được biết đến rộng rãi là Zendaya, là nữ diễn viên, ca sĩ kiêm người mẫu người Mỹ. Cô bắt đầu sự nghiệp nghệ thuật của mình bằng việc làm người mẫu nhí và nhảy phụ họa, trước khi nhận được nhiều sự quan tâm của công chúng với vai diễn Rocky Blue trong sitcom Shake It Up của kênh Disney Channel (2010-2013). Năm 2013, Zendaya tham dự chương trình truyền hình Dancing with the Stars mùa thứ 16. Từ năm 2015 tới năm 2018, cô đồng sản xuất và đảm nhận vai diễn chính K.C Cooper trong sitcom K.C Undercover của kênh Disney. Năm 2017 là năm đột phá của cô sau khi đảm nhận Mary \"MJ\" Janes trong phim Spider-Man: Homecoming thuộc Vũ trụ Điện ảnh Marvel và vai Anne Wheeler trong bộ phim nhạc kịch The Greatest Showman\nCô bắt đầu sự nghiệp ca hát độc lập bằng việc ra đĩa đơn \"Swag It Out\" và \"Watch Me\" vào năm 2011, và cũng hợp tác với Bella Thorne. Cô ký hợp đồng với hãng đĩa Hollywood Records vào năm 2012, không lâu sau đó cô ra đĩa đơn \"Replay\", đạt thứ hạng 40 trên bảng xếp hạng Billboard Hot 100 ở Mỹ. Album phòng thu mang chính tên cô (2013) đạt thứ hạng 51 trên bảng xếp hạng Billboard 200 sau khi ra mắt.\n\nThời thơ ấu:\n\nZendaya sinh ngày 1 tháng 9 năm 1996 ở Oakland, California và là con một của bà Claire Maries (nhũ danh Stoermer) và ông Kazember Ajamu (tên cũ là Samuel David Coleman). Cô có năm người anh chị em cùng cha khác mẹ. Cha của cô là người Mỹ gốc Phi, người gốc Arkansas, trong khi mẹ của cô có gốc Đức và Scotland. Zendaya từng nói rằng tên của mình có nghĩa là \"cảm ơn\" trong ngôn ngữ Bantu của tộc người Shona ở Zimbabwe. Cô cũng tham gia đội nhạc kịch thuộc Nhà hát California Shakespeare ở Orinda, California nơi mà mẹ cô đã từng làm quản lý và huấn luyện các học sinh theo chương trình đặc biệt của nhà hát. Cô cũng tham gia quá trình sản xuất ở nhà hát trong lúc tham gia theo học ở Trường nghệ thuật Oakland, và đảm nhận vai Little Ti Moune trong vở Once on This Island ở Berkeley Playhouse, và đột phá với vai diễn \"nam\" Joe trong vở Caroline và vai Change trong vở Palo Alto.\nZendaya cũng theo học nhảy 3 năm trong một nhóm nhảy tên Future Shock Oakland. Nhóm nhảy trình diễn hip-hop và điệu hula khi cô lên 8.\nCô cũng theo học chương trình CalShakes ở Nhà hát American Conservatory. Những vai diễn hay của cô cũng bao gồm vở kịch Richard III của William Shakespeare, vai trong Twelfth Night và As You Like It.\n\nSự nghiệp:\n\n2009-14: Shake It Up và Dancing with the Stars:",
    "aliases": [
      "zendaya",
      "zendaya coleman",
      "zendaya maree stoermer coleman",
      "zendaya maree holland"
    ],
    "featured": false
  },
  {
    "slug": "florence-pugh",
    "name": "Florence Pugh",
    "country": "Mỹ / Anh 🇺🇸🇬🇧",
    "countryCode": "us_uk",
    "gender": 1,
    "tags": [
      "Hollywood",
      "Marvel",
      "Chính kịch"
    ],
    "roles": "Nữ diễn viên thực lực • Oscar",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/ejgQXt1fAvPueAvacDsGwG00aA.jpg",
    "tmdbPersonId": 1373737,
    "birthday": "1996-01-03",
    "placeOfBirth": "Oxford, Oxfordshire, England UK",
    "bio": "Florence Pugh ( PEW; sinh ngày 3 tháng 1 năm 1996) là một nữ diễn viên người Anh. Bắt đầu tham gia diễn xuất vào năm 2014 trong bộ phim truyền hình The Falling, Pugh đã được công nhận vào năm 2016 với vai chính cô dâu trẻ bạo lực trong bộ phim truyền hình độc lập Lady Macbeth và sau đó nhận được nhiều lời khen ngợi cho vai chính trong miniseries 2018 The Little Drummer Girl.\nBước đột phá quốc tế của Pugh đến vào năm 2019 với vai diễn đô vật chuyên nghiệp Paige trong bộ phim thể thao tiểu sử Fighting with My Family, một phụ nữ Mỹ chán nản trong phim kinh dị Midsommar và Amy March trong bộ phim Little Women. Cuối cùng, cô đã nhận được đề cử cho Giải thưởng Viện hàn lâm và Giải thưởng BAFTA. Cô đã được trao giải Trophée Chopard tại Liên hoan phim Cannes 2019. \nNăm 2021, cô đóng vai chính Yelena Belova / Black Widow trong bộ phim siêu anh hùng Black Widow của Vũ trụ Điện ảnh Marvel và miniseries Hawkeye trên Disney+. Sang những năm tiếp theo, cô tham gia lồng tiếng nhân vật Goldilocks trong Mèo đi hia: Điều ước cuối cùng (2022), đồng thời còn tham gia diễn xuất trong một số tác phẩm khác như The Wonder (2022), Em yêu đừng sợ (2022), Oppenheimer (2023), và Dune: Hành tinh cát – Phần 2 (2024).\n\nThời thơ ấu:\n\nFlorence Pugh sinh năm 1996 ở Oxford. Cha cô, Clinton Pugh, là một chủ nhà hàng, còn mẹ cô, Deborah, là một vũ công kiêm giáo viên dạy nhảy. Gia đình Pugh có 4 anh chị em, anh trai cô là nhạc sĩ - diễn viên Toby Sebastian, chị gái cô là diễn viên Arabella Gibbins và em gái út là Rafaela \"Raffie\" Pugh từng tham gia diễn xuất.\nKhi còn nhỏ, cô mắc chứng mềm khí phế quản (một bệnh về khí quản gây ra các vấn đề hô hấp) nên thường xuyên phải nhập viện. Gia đình cô chuyển đến Manilva ở Tây Ban Nha khi Pugh ba tuổi, hy vọng rằng thời tiết ấm áp sẽ cải thiện sức khỏe của cô. Họ sống ở đó cho đến năm cô sáu tuổi thì chuyển về Oxford.\nCô từng học tại hai trường: Trường Wychwood và Trường St Edward, Oxford. Song, cô không thích cách hai trường không ủng hộ tham vọng diễn xuất của mình.\n\nSự nghiệp:\n\nCác vai diễn ban đầu (2014–2018):",
    "aliases": [
      "florence pugh",
      "florence rose c. m. pugh",
      "florence rose pugh",
      "florence rose clara madeleine pugh",
      "flossie rose"
    ],
    "featured": false
  },
  {
    "slug": "pedro-pascal",
    "name": "Pedro Pascal",
    "country": "Mỹ / Anh 🇺🇸🇬🇧",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Hành động",
      "Chính kịch"
    ],
    "roles": "The Last of Us • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/oKcMbVn0NJTNzQt0ClKKvVXkm60.jpg",
    "tmdbPersonId": 1253360,
    "birthday": "1975-04-02",
    "placeOfBirth": "Santiago, Chile",
    "bio": "José Pedro Balmaceda Pascal (sinh ngày 2 tháng 4 năm 1975, nghệ danh: Pedro Pascal) là nam diễn viên người Mỹ gốc Chile. Trong sự nghiệp của mình, anh đã từng tham gia nhiều phim với các vai phụ, năm 2014, anh nổi tiếng với vai Oberyn Martell trong mùa thứ tư của sê-ri truyền hình Game of Thrones của đài HBO. Sau đó anh tham gia phim Narcos của Netflix với vai Javier Peña. Các phim điện ảnh khác mà anh đã tham gia có thể kể đến như: The Great Wall (2016), Kingsman: The Golden Circle (2017), The Equalizer 2 (2018) và Triple Frontier (2019).\nCác vai Din Djarin trong The Mandalorian (2019–nay, Disney+) và Joel Miller trong The Last of Us (2023–nay, HBO) tiếp tục giúp cho nam diễn viên nổi tiếng toàn cầu. Vai Joel Miller mang về cho anh nhiều giải thưởng, bao gồm một giải Nghiệp đoàn diễn viên màn ảnh và một đề cử giải Quả cầu vàng. Ngoài ra anh cũng góp mặt trong các phim We Can Be Heroes (2020), Strange Way of Life (2023), The Wild Robot (2024). Các phim kinh phí lớn mà anh tham gia là Wonder Woman 1984 (2020) và Gladiator II (2024).\nỞ lĩnh vực sân khấu, anh tham gia từ năm 1999, vở kịch Broadway đầu tiên mà anh tham gia là King Lear năm 2019, vai Edmund. Năm 2023, tờ Time liệt kê anh trong danh sách 100 người có tầm ảnh hưởng nhất thế giới.\n\nTiểu sử:\n\nJosé Pedro Balmaceda Pascal sinh ngày 2 tháng 4 năm 1975 tại thành phố Santiago, Chile. Cha mẹ anh là Verónica Pascal Ureta, một bác sĩ tâm lý học trẻ em, và José Balmaceda Riera, làm nghề bác sĩ phụ sản. Bà nội anh sinh ra ở Palma de Mallorca, Tây Ban Nha. Anh có một chị gái tên Javiera, một em trai tên Nicolás và một em gái là nữ diễn viên chuyển giới Lux Pascal.\nKhi anh được chín tháng tuổi thì cả gia đình đi tị nạn chính trị ở đại sứ quán Venezuela tại Santiago và sau đó sang Đan Mạch. Cuối cùng, gia đình tới Mỹ và sống ở thành phố San Antonio, Texas, năm anh 11 tuổi, cả nhà chuyển tới quận Cam, California. Năm 1995, cha mẹ anh quay lại Chile để nuôi hai em.\nAnh từng theo học diễn xuất tại trường Nghệ thuật quận Cam, tốt nghiệp năm 1993, sau đó học trường Nghệ thuật Tisch của Đại học New York, tốt nghiệp năm 1997. Sau khi mẹ mất, nam diễn viên dùng tên họ Pascal làm nghệ danh để tưởng nhớ bà.\n\nĐời tư:\n\nPascal thành thạo tiếng Anh và tiếng Tây Ban Nha. Anh là bạn thân với nữ diễn viên Sarah Paulson kể từ khi chuyển tới New York năm 1993.\nNam diễn viên ủng hộ em gái Lux Pascal sau khi cô công khai chuyển giới, cũng như quyền LGBT nói chung.",
    "aliases": [
      "pedro pascal",
      "alexander pascal",
      "pedro balmaceda",
      "josé pedro balmaceda pascal",
      "pablo pascal"
    ],
    "featured": false
  },
  {
    "slug": "chris-pratt",
    "name": "Chris Pratt",
    "country": "Mỹ / Anh 🇺🇸🇬🇧",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Marvel",
      "Hành động"
    ],
    "roles": "Star-Lord • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/cRH6HPAQ98PlOwwEvhYO4CM9lwu.jpg",
    "tmdbPersonId": 73457,
    "birthday": "1979-06-21",
    "placeOfBirth": "Virginia, Minnesota, USA",
    "bio": "Christopher Michael Pratt (sinh ngày 21 tháng 6 năm 1979) là một diễn viên người Mỹ, được biết đến bởi những vai diễn trên truyền hình, bao gồm Bright Abbott trong Everwood, và Andy Dwyer trong Parks and Recreation. Khởi nghiệp diễn xuất từ những vai phụ trong các phim chính thống như Wanted, Bride Wars, Jennifer's Body, Moneyball, What's Your Number?, The Five-Year Engagement, Zero Dark Thirty, Movie 43, Delivery Man và Her trước khi được giao đóng vai chính vào năm 2014 trong The Lego Movie và Guardians of the Galaxy. Anh cũng đã xuất hiện trong Jurassic World, phần tiếp theo của Công viên kỷ Jura.\nVào năm 2015, tạp chí Time đã ghi tên anh 1 trong số 100 người có tầm ảnh hưởng nhất thế giới.\n\nTiểu sử:\n\nChris Pratt sinh ngày 21 tháng 6 năm 1979 tại Virginia, Minnesota, mẹ là Kathy (nhũ danh Indahl) làm việc cho siêu thị Safeway, và bố là Dan Pratt làm việc tại một mỏ vàng và sau này làm nghề sửa chữa nhà, đã qua đời vào tháng 6 năm 2014. Pratt lớn lên ở Lake Stevens, Washington, nơi anh từng đoạt giải 5 cuộc thi đấu vật khi còn là học sinh trung học.\nPratt bỏ học cao đẳng cộng đồng sau một học kỳ, sau đó anh làm nhân viên bán phiếu giảm giá và vũ công thoát y vào ban ngày, đêm về thì anh thành kẻ vô gia cư ở Maui, ngủ trong xe và lều trên bãi biển. Pratt kể với The Independent, \"Thật tuyệt khi trở thành người vô gia cư. Chúng tôi chỉ nhậu nhẹt, hút cỏ và làm việc vài giờ, chỉ đủ để mua khí đốt, thực phẩm và bộ đồ câu cá.\" Pratt nhớ lại anh đã từng nghe album 2001 của Dr. Dre hằng ngày cho đến khi anh thuộc lòng từng lời ca trong đó. Vài năm sau anh đã có thể giả giọng Eminem trong ca khúc \"Forgot About Dre\" một cách ứng khẩu trong suốt một buổi phỏng vấn.\n\nSự nghiệp:\n\nĐời tư:\n\nPratt gặp nữ Diễn viên Anna Faris trong bộ phim Take Me Home Tonight vào năm 2007. Hai năm sau họ đính hôn, và sau đó tổ chức hôn lễ tại Bali vào ngày 9 tháng 7 năm 2009. Tháng 8 năm 2012, cả hai có con trai đầu lòng Jack. Tuy nhiên, cả hai đã ly hôn vào năm 2017. Anh công khai hẹn hò với nhà văn Katherine Schwarzenegger vào ngày 13 tháng 12 năm 2018, đính hôn 1 tháng sau đó và hôn lễ được tổ chức ở ở Montecito, California ngày 10 tháng 6 năm 2019. Năm 2020, họ có con trai đầu lòng. Tháng 5 năm 2022, họ đã có con gái thứ hai.\nVào ngày 4 tháng 10 năm 2021, Chris Pratt đảm nhiệm làm voice actor mới của tựa game Friday Night Funkin (Tabi mod) thay thế cho diễn viên giọng cũ (Cougar MacDowall), về cuộc đời quá khứ của nhân vật Bạn trai cũ (Tabi Ex Boyfriend), thông báo trên Twitter.\n\nDanh sách phim tham gia:\n\nGhi chú\n\nPhim:\n\nTruyền hình:\n\nVideo game:\n\nChú thích:",
    "aliases": [
      "chris pratt",
      "christopher michael pratt"
    ],
    "featured": false
  },
  {
    "slug": "samuel-l-jackson",
    "name": "Samuel L. Jackson",
    "country": "Mỹ / Anh 🇺🇸🇬🇧",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Marvel",
      "Hành động"
    ],
    "roles": "Huyền thoại điện ảnh • Nick Fury",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/AiAYAqwpM5xmiFrAIeQvUXDCVvo.jpg",
    "tmdbPersonId": 2231,
    "birthday": "1948-12-21",
    "placeOfBirth": "Washington, D.C., USA",
    "bio": "Samuel Leroy Jackson (sinh ngày 21 tháng 12 năm 1948) là một nam diễn viên người Mỹ. Ông từng có một số vai diễn nhỏ trong phim Goodfellas trước khi gặp \"người thầy\" của mình là  Morgan Freeman và đạo diễn Spike Lee. Sau khi giành được lời khen ngợi cho vai diễn trong Jungle Fever năm 1991, ông tiếp tục xuất hiện trong các bộ phim như Patriot Games, Amos & Andrew, True Romance và Công viên kỷ Jura. Năm 1994, ông đã đóng Jules Winnfield trong phim Pulp Fiction và diễn xuất của ông đã nhận được sự hoan nghênh cũng như nhiều đề cử trao giải.\nĐến nay Samuel L. Jackson đã xuất hiện trên 100 bộ phim, trong đó có Die Hard with a Vengeance, The 51st State, Jackie Brown, Unbreakable, Gia đình siêu nhân, Black Snake Moan, Shaft, Rắn độc trên không, Django Unchained, bộ ba phần trước của Chiến tranh giữa các vì sao, bên cạnh đó là các vai diễn nhỏ trong Kill Bill phần 2 và Inglourious Basterds của Quentin Tarantino.\nÔng đã đóng Nick Fury trong Iron Man, Iron Man 2, Thor, Captain America: Kẻ báo thù đầu tiên, và Marvel's The Avengers, năm trong số các phim chuyển thể của Marvel Cinematic Universe và ông đã lồng tiếng nhân vật Frank Tenpenny trong tựa game cướp đường phố Grand Theft Auto: San Andreas. Nhiều vai diễn của Jackson đã khiến ông là một trong những diễn viên bội thu nhất từ phòng vé. Trong suốt sự nghiệp của mình, Jackson đã giành được vô số giải thưởng và được nhắc đến trong nhiều phương tiện truyền thông khác nhau, trong các phim, truyền hình dài kỳ và các bài hát. Năm 1980, ông đã kết hôn với LaTanya Richardson, hai người có với nhau một con gái Zoe.\nVào tháng 10 năm 2011, Jackson đã vượt qua Frank Welker để trở thành diễn viên điện ảnh có doanh thu cao nhất mọi thời đại.\n\nThuở nhỏ:\n\nJackson được sinh ra ở Washington, D.C. và lớn lên ở Chattanooga, Tennessee, là người con duy nhất của ông Roy Henry Jackson và Elizabeth Harriett (nhũ danh Montgomery). Cha ông sống xa nhà, ở Kansas City, Missouri và sau đó thì chết do chứng nghiện rượu. Jackson chỉ gặp cha mình hai lần trong đời. Jackson được nuôi dưỡng bởi mẹ, người từng là một công nhân nhà máy và sau đó làm cho một bệnh viện tâm thần, và cùng với ông bà ngoại trong một đại gia đình. Theo như kết quả phân tích DNA, Jackson có một phần nguồn gốc là người Benga ở Gabon, và ông đã trở thành công dân nhập tịch của Gabon vào năm 2019. Jackson từng theo học một số trường tách biệt  và tốt nghiệp trường Trung học Riverside ở Chattanooga. Ông chơi kèn , kèn piccolo , kèn trumpet và sáo Pháp trong dàn nhạc của trường. Jackson từng mắc chứng nói lắp trong thời thơ ấu và học cách \"giả làm người khác không nói lắp\". Đến tận bây giờ, ông vẫn sử dụng từ \"mofo\" để vượt qua một khối giọng nói. Ông vẫn có những ngày mà mình nói lắp. Ban đầu ông từng có ý định theo học ngành sinh vật biển nên ông theo học tại Đại học Morehouse ở Atlanta, Georgia.",
    "aliases": [
      "samuel l. jackson",
      "samuel l jackson",
      "samuel leroy jackson"
    ],
    "featured": false
  },
  {
    "slug": "willem-dafoe",
    "name": "Willem Dafoe",
    "country": "Mỹ / Anh 🇺🇸🇬🇧",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Marvel",
      "Chính kịch"
    ],
    "roles": "Bậc thầy phản diện • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/ui8e4sgZAwMPi3hzEO53jyBJF9B.jpg",
    "tmdbPersonId": 5293,
    "birthday": "1955-07-22",
    "placeOfBirth": "Appleton, Wisconsin, USA",
    "bio": "William J. \"Willem\" Dafoe (sinh ngày 22 tháng 7 năm 1955) là một diễn viên người Mỹ. Ông là người nhận được nhiều giải thưởng khác nhau, bao gồm cả Cúp Volpi cho Nam diễn viên chính xuất sắc nhất, ngoài ra còn nhận được đề cử cho bốn giải Oscar, bốn giải Screen Actors Guild, ba giải Quả cầu vàng và một giải thưởng Điện ảnh của Viện Hàn lâm Anh. Ông cũng được biết đến với những lần cộng tác thường xuyên với các nhà làm phim Paul Schrader, Abel Ferrara, Lars von Trier, Julian Schnabel và Wes Anderson.\nDafoe là thành viên ban đầu của công ty rạp hát thực nghiệm The Wooster Group. Anh có bộ phim đầu tay là Heaven's Gate (1980), nhưng đã bị sa thải trong quá trình sản xuất. Ông có vai chính đầu tiên trong bộ phim về người đi xe đạp ngoài vòng pháp luật The Loveless (1982) và sau đó đóng vai phản diện chính trong Streets of Fire (1984) và To Live and Die in LA (1985). Anh nhận được đề cử Giải Oscar đầu tiên (Nam diễn viên phụ xuất sắc nhất) cho vai diễn Trung sĩ Elias Grodin trong bộ phim chiến tranh Platoon (1986) của Oliver Stone. Năm 1988, Dafoe đóng vai Chúa Jesus trong The Last Temptation of Christ của Martin Scorsese và đóng chính trong Mississippi Burning, cả hai đều gây tranh cãi.\nSau khi nhận được đề cử giải Oscar lần thứ hai (Nam diễn viên phụ xuất sắc nhất) cho vai Max Schreck trong Shadow of the Vampire (2000), Dafoe đã đóng vai siêu ác nhân Norman Osborn / Green Goblin trong bộ phim siêu anh hùng Spider-Man (2002), một vai diễn mà ông đã tái hiện trong các phần tiếp theo của nó Spider-Man 2 (2004) và Spider-Man 3 (2007), và bộ phim thuộc Vũ trụ Điện ảnh Marvel (MCU) Spider-Man: No Way Home (2021) đã mang về cho ông ấy Kỷ lục Guinness Thế giới cho \"sự nghiệp lâu nhất với tư cách là người đóng vai một nhân vật Marvel\" (cùng với Tobey Maguire). Ông cũng thể hiện các nhân vật phản diện trong Once Upon a Time in Mexico (2003) và XXX: State of the Union (2005), cũng như Carson Clay trong bộ phim Mr Bean's Holiday (2007). Năm 2009, ông đóng vai chính trong bộ phim thử nghiệm Antichrist, một trong ba bộ phim của anh với Lars von Trier. Dafoe sau đó xuất hiện trong The Fault in Our Stars, John Wick, The Grand Budapest Hotel (tất cả trong năm 2014), The Great Wall (2016), Murder on the Orient Express (2017), The Florida Project (2017) (mà ông ấy đã nhận được của mình đề cử giải Oscar lần thứ ba ở hạng mục Nam diễn viên phụ xuất sắc nhất) và The Lighthouse (2019). Anh đóng vai Nuidis Vulko trong các bộ phim thuộc Vũ trụ Mở rộng DC (DCEU) Aquaman (2018) và Zack Snyder's Justice League (2021) và Aquaman and the Lost Kingdom (2022).\nDafoe đã đóng vai một số nhân vật có thực, bao gồm T. S. Eliot trong Tom & Viv (1994), Pier Paolo Pasolini trong Pasolini (2014), Vincent van Gogh trong At Eternity's Gate (2018) (nhờ đó anh nhận được đề cử Oscar cho Nam diễn viên chính xuất sắc nhất, đầu tiên của anh ấy trong hạng mục đó), và Leonhard Seppala ở Togo (2019).\n\nĐầu đời và giáo dục:",
    "aliases": [
      "willem dafoe",
      "william dafoe, jr.",
      "william j. dafoe",
      "william james dafoe"
    ],
    "featured": false
  },
  {
    "slug": "jake-gyllenhaal",
    "name": "Jake Gyllenhaal",
    "country": "Mỹ / Anh 🇺🇸🇬🇧",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Hành động",
      "Chính kịch"
    ],
    "roles": "Tài tử thực lực • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/ct2Gh2sJSxd4yaMrSsqSt1HpIC3.jpg",
    "tmdbPersonId": 131,
    "birthday": "1980-12-19",
    "placeOfBirth": "Los Angeles, California, USA",
    "bio": "Jacob Benjamin Gyllenhaal (; tiếng Thụy Điển: [ˈjʏ̂lːɛnˌhɑːl]; sinh ngày 19 tháng 12 năm 1980) là một nam diễn viên người Mỹ đã có sự nghiệp trải dài hơn ba mươi năm với nhiều đóng góp trên cả lĩnh vực điện ảnh và sân khấu. Sinh ra trong gia đình Gyllenhaal, anh là con trai của đạo diễn Stephen Gyllenhaal và nhà biên kịch Naomi Foner, cũng như là em trai của nữ diễn viên Maggie Gyllenhaal. Gyllenhaal bắt đầu diễn xuất từ khi còn nhỏ trong City Slickers (1991), tiếp theo là các vai diễn trong A Dangerous Woman (1993) và Homegrown (1998) đều do cha mình đạo diễn. Sự nghiệp của anh bứt phá với vai diễn Homer Hickam trong October Sky (1999) và màn hóa thân thành một cậu bé gặp vấn đề về thần kinh trong Donnie Darko (2001).\nGyllenhaal góp mặt trong bộ phim khoa học giả tưởng thảm họa The Day After Tomorrow (2004) với vai một sinh viên mắc kẹt trong một trận đại hồng thủy do sự mát dần toàn cầu. Anh thủ vai Jack Twist trong bộ phim tình cảm chính kịch Chuyện tình sau núi (2005) của Lý An, giành giải BAFTA cho nam diễn viên phụ xuất sắc nhất và được đề cử giải Oscar cho cùng hạng mục. Tiếp theo, anh thủ vai chính trong phim giật gân Zodiac (2007), phim hài tình cảm Love and Other Drugs (2010) và phim khoa học giả tưởng Mật mã gốc (2011). Vai diễn của Gyllenhaal trong hai tác phẩm giật gân Lần theo dấu vết (2013) và Enemy (2013) của Denis Villeneuve được giới chuyên môn tán dương nhiệt liệt. Anh được đề cử giải BAFTA cho nam diễn viên chính xuất sắc nhất nhờ diễn xuất trong vai một nhà báo thao túng trong Kẻ săn tin đen (2014) và một tác giả nổi loạn trong Nocturnal Animals (2016). Tác phẩm có doanh thu cao nhất của Gyllenhaal là bộ phim siêu anh hùng thuộc Vũ trụ Điện ảnh Marvel, Người Nhện xa nhà (2019), trong đó anh thủ vai phản diện Quentin Beck / Mysterio. Ngoài ra, anh còn xuất hiện trong các phim Wildlife (2018), Bức họa ma quái (2019), The Guilty (2021) và Xe cấp cứu (2022).\nTrên sân khấu, Gyllenhaal đã góp mặt trong vở kịch This Is Our Youth tại West End và nhạc kịch Sunday in the Park with George tại Broadway, cùng với các vở Constellations và Sea Wall/A Life. Vai diễn trong vở Sea Wall/A Life đã mang về cho anh giải Tony cho nam diễn viên chính xuất sắc nhất thể loại kịch. Ngoài diễn xuất, Gyllenhaal còn sôi nổi với các vấn đề chính trị và xã hội.\n\nĐầu đời:",
    "aliases": [
      "jake gyllenhaal",
      "jacob benjamin gyllenhaal",
      "ジェイク・ジレンホール"
    ],
    "featured": false
  },
  {
    "slug": "ryan-gosling",
    "name": "Ryan Gosling",
    "country": "Mỹ / Anh 🇺🇸🇬🇧",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Chính kịch",
      "Tình cảm"
    ],
    "roles": "Tài tử La La Land • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/lyUyVARQKhGxaxy0FbPJCQRpiaW.jpg",
    "tmdbPersonId": 30614,
    "birthday": "1980-11-12",
    "placeOfBirth": "London, Ontario, Canada",
    "bio": "Ryan Thomas Gosling (sinh ngày 12 tháng 11 năm 1980) là một diễn viên và nhạc sĩ người Canada. Anh từng là diễn viên nhí xuất hiện trong Mickey Mouse Club của Disney Channel (1993–95) và tiếp tục xuất hiện trên nhiều chương trình giải trí dành cho gia đình, bao gồm Are You Afraid of the Dark? (1995) và Goosebumps (1996). Anh vào vai Sean Hanlon trong loạt phim truyền hình Breaker High (1997–98) và góp mặt trong Young Hercules (1998–99). Vai diễn chính đầu tiên của anh là một người Do Thái trong The Believer (2001); Gosling sau đó đóng trong nhiều phim độc lập như Murder by Numbers (2002), The Slaughter Rule (2002) và The United States of Leland (2003).\nGosling tiếp cận tầng lớp khán giả đại chúng khi vào vai chính trong The Notebook (2004). Vai diễn một giáo viên nghiện ma túy của anh trong Half Nelson (2006) được đề cử cho giải Oscar, còn vai diễn trong Lars and the Real Girl (2007) cũng mang về cho Gosling đề cử giải Quả cầu vàng thứ hai. Năm 2011, Gosling góp mặt trong tác phẩm hài chính kịch lãng mạn Crazy, Stupid, Love, phim chính kịch chính trị The Ides of March và phim hành động Drive. Năm 2013, anh tham gia diễn xuất trong phim tội phạm Gangster Squad, phim chính kịch The Place Beyond the Pines và Only God Forgives. Tác phẩm đạo diễn đầu tay của Gosling, Lost River ra mắt năm 2014 những không nhận được nhiều đánh giá tích cựu từ giới chuyên môn. Anh góp mặt trong dàn diễn viên của The Big Short (2015), tác phẩm giành đề cử giải Oscar cho Phim hay nhất và Những kẻ khờ mộng mơ (2016), giúp anh giành chiến thắng giải Quả cầu vàng cho Nam diễn viên phim ca nhạc hoặc phim hài xuất sắc nhất. Nhiều lời tán dương khác cũng dành cho tác phẩm khoa học viễn tưởng Tội phạm nhân bản 2049 (2017) và phim tiểu sử Bước chân đầu tiên (2018) mà anh đóng vai chính.\nBan nhạc của Gosling, Dead Man's Bones phát hành album đầu tay cùng tên và lưu diễn tại Bắc Mỹ năm 2009. Anh là người đồng sở hữu Tagine, một nhà hàng thức ăn Morocco tại Beverly Hills, California. Anh cũng ủng hộ tổ chức PETA, Invisible Children và Enough Project, đến thăm Chad, Uganda và miền Đông Congo để gây nhận thức của cộng đồng về xung đột lãnh thổ. Gosling đã tham gia vào các nỗ lực thúc đẩy hòa bình ở châu Phi trong hơn một thập kỷ. Anh có mối quan hệ với nữ diễn viên người Mỹ Eva Mendes từ năm 2011 và họ có hai con gái.",
    "aliases": [
      "ryan gosling",
      "ryan thomas gosling",
      "literally me"
    ],
    "featured": false
  },
  {
    "slug": "emma-stone",
    "name": "Emma Stone",
    "country": "Mỹ / Anh 🇺🇸🇬🇧",
    "countryCode": "us_uk",
    "gender": 1,
    "tags": [
      "Hollywood",
      "Hài",
      "Chính kịch"
    ],
    "roles": "Chủ nhân 2 giải Oscar • Nữ diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/cZ8a3QvAnj2cgcgVL6g4XaqPzpL.jpg",
    "tmdbPersonId": 54693,
    "birthday": "1988-11-06",
    "placeOfBirth": "Scottsdale, Arizona, USA",
    "bio": "Emily Jean \"Emma\" Stone (sinh ngày 6 tháng 11 năm 1988) là một nữ diễn viên người Mỹ. Được đánh giá là một trong những nữ diễn viên Hollywood xuất sắc nhất trong thế hệ của mình, Stone đã nhận được nhiều giải thưởng trong suốt sự nghiệp của mình, bao gồm hai giải Oscar, hai giải thưởng Điện ảnh Viện Hàn lâm Vương quốc Liên hiệp Anh, hai giải Quả cầu vàng và ba giải Nghiệp đoàn diễn viên màn ảnh. Cô từng xuất hiện trên Forbes Celebrity 100 vào năm 2013 và Time 100 vào năm 2017.\nSinh ra và lớn lên tại Scottsdale, Arizona, Stone bắt đầu diễn xuất từ khi còn nhỏ, trong vở kịch The Wind in the Willows năm 2000. Ở tuổi thiếu niên, cô dời đến Los Angeles cùng mẹ và lần đầu xuất hiện trên truyền hình trong The New Partridge Family (2004). Dù vậy, đài VH1 không chọn phát sóng chương trình truyền hình thực tế này. Sau nhiều vai phụ, cô giành giải Young Hollywood cho phim đầu tay Superbad (2007) và thu hút sự chú ý tích cực của công chúng trong Zombieland (2009).\nPhim hài dành cho thanh thiếu niên Easy A (2010) là vai chính diện đầu tiên của Stone, giúp cô giành đề cử cho giải BAFTA Rising Star và giải Quả cầu vàng cho nữ diễn viên phim ca nhạc hoặc phim hài xuất sắc nhất. Sau đó, cô góp mặt trong phim đạt thành công thương mại Crazy, Stupid, Love (2011) và vai phụ trong tác phẩm chính kịch được khen ngợi Người giúp việc (2011). Stone thu hút sự chú ý rộng rãi khi vào vai Gwen Stacy trong phim anh hùng Người Nhện: Siêu nhện tái xuất (2012) và phần tiếp theo năm 2014. Cô giành đề cử giải Oscar cho nữ diễn viên phụ xuất sắc nhất với vai diễn của một cô gái nghiện ma túy đang phục hồi trong phim hài đen Birdman (2014). Cô lần đầu tham gia vở nhạc kịch Broadway Cabaret (2014–2015). Năm 2016, cô vào vai Mia Dolan trong tác phẩm nhạc kịch Những kẻ khờ mộng mơ, mang về cho cô một giải Quả cầu vàng và giải Oscar cho nữ diễn viên chính xuất sắc nhất.\nNgoài sự nghiệp diễn xuất, cô còn quảng bá nhiều sự kiện xã hội, bao gồm nâng cao nhận thức cộng đồng về căn bệnh ung thư vú.\n\nTuổi thơ:\n\nStone sinh ra tại Scottsdale, tiểu bang Arizona, là con gái của Krista (née Yeager), một người nội trợ, và Jeff Stone, một kĩ sư thầu. Cô còn có một người em trai kém cô 2 tuổi. Ông nội của Stone (họ trước đây là \"Sten\") là người gốc Thụy Điển, và khi nhập cư sang Mỹ đã đổi họ sang \"Stone\" cũng như dòng dõi chủ yếu sinh sống tại Pennsylvania.\n\nKhi còn là một đứa trẻ sơ sinh, Stone đã đau bụng và khóc rất nhiều, việc đó khiến cô bị nổi các nốt sần và nơ vằn trên dây thanh quản từ khi còn nhỏ. Stone đã mô tả giọng mình là \"ồm\" và \"sếp\" khi lớn lên. Cô đã học tại Trường Tiểu học Sequoya và tiếp đó là Trường Trung học Cocopah từ lớp 6. Stone bị hoảng loạn tâm lí khi còn nhỏ, cô nói rằng việc đó đã làm giảm kỹ năng xã hội của cô. Cô đã trải qua nhiều liệu pháp nhưng cô nói rằng việc sự tham gia của cô trong các vở kịch sân khấu địa phương đã giúp chữa chứng bệnh này. Cô nhớ lại:",
    "aliases": [
      "emma stone",
      "emily jean stone",
      "emily stone",
      "riley stone"
    ],
    "featured": false
  },
  {
    "slug": "emily-blunt",
    "name": "Emily Blunt",
    "country": "Mỹ / Anh 🇺🇸🇬🇧",
    "countryCode": "us_uk",
    "gender": 1,
    "tags": [
      "Hollywood",
      "Hành động",
      "Chính kịch"
    ],
    "roles": "Nữ minh tinh người Anh",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/5nCSG5TL1bP1geD8aaBfaLnLLCD.jpg",
    "tmdbPersonId": 5081,
    "birthday": "1983-02-23",
    "placeOfBirth": "Wandsworth, London, England, UK",
    "bio": "Emily Olivia Laura Blunt (sinh ngày 23 tháng 2 năm 1983) là một nữ diễn viên người Anh. Cô là chủ nhân của nhiều giải thưởng gồm một giải Quả cầu vàng và một giải SAG, kèm theo nhiều đề cử gồm một đề cử giải Oscar và bốn đề cử giải BAFTA. Forbes đã xếp hạng cô là một trong những nữ diễn viên có thù lao cao nhất thế giới năm 2020.\nBlunt bắt đầu sự nghiệp diễn xuất vào năm 2011 trong vở kịch The Royal Family và qua vai diễn Catherine Howard trong loạt phim truyền hình ngắn Henry VIII (2003). Bộ phim điện ảnh đầu tiên mà cô tham gia là My Summer of Love (2004). Đến năm 2006, Blunt có hai vai diễn đột phá trong phim truyền hình Gideon's Daughter và phim điện ảnh Yêu nữ thích hàng hiệu. Bộ phim truyền hình Gideon's Daughter đã giúp cô thắng giải Quả cầu vàng cho nữ diễn viên truyền hình phụ xuất sắc nhất. Danh tiếng của cô ngày càng tăng cao với những vai chính trong bộ phim tiểu sử The Young Victoria (2009), bộ phim hài lãng mạn Salmon Fishing in the Yemen (2011), các bộ phim khoa học viễn tưởng Bản đồ định mệnh (2011), Looper (2012) và Cuộc chiến luân hồi (2014), và phim nhạc kịch Khu rừng cổ tích (2014).\nBlunt nhận được nhiều lời khen ngợi nhờ hóa thân vào vai một đặc vụ FBI nguyên tắc trong bộ phim hình sự Ranh giới (2015), một kẻ nghiện rượu trong bộ phim tâm lý giật gân Cô gái trên tàu (2016), và một người mẹ với khả năng sinh tồn trong bộ phim kinh dị của chồng cô, John Krasinski, Vùng đất câm lặng (2018), vai diễn đã mang về cho cô một giải SAG dành cho Nữ diễn viên phụ xuất sắc. Sau đó, cô đã góp mặt trong phần hậu truyện Mary Poppins trở lại (2018) và Vùng đất câm lặng: Phần II (2021), bộ phim phiêu lưu kỳ ảo Jungle Cruise (2021), và loạt phim truyền hình ngắn mô phỏng miền Viễn Tây, The English (2022). Màn hóa thân của cô trong vai Katherine Oppenheimer trong bộ phim tiểu sử giật gân của Christopher Nolan, Oppenheimer (2023) đã giành về cho cô một đề cử giải Oscar cho nữ diễn viên phụ xuất sắc nhất.\nBlunt đã làm việc với Viện Nói lắp Hoa Kỳ từ năm 2006 để giúp trẻ em khắc phục tình trạng nói lắp thông qua các nguồn tài liệu giáo dục và nâng cao nhận thức về thực tế của tình trạng này. Cô nằm trong ban giám đốc của viện và tổ chức một buổi tiệc để gây quỹ học bổng trị liệu ngôn ngữ cho trẻ em và người lớn.\n\nThời thơ ấu:",
    "aliases": [
      "emily blunt",
      "emily olivia laura blunt"
    ],
    "featured": false
  },
  {
    "slug": "idris-elba",
    "name": "Idris Elba",
    "country": "Mỹ / Anh 🇺🇸🇬🇧",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Hành động",
      "Marvel"
    ],
    "roles": "Tài tử hành động người Anh",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/be1bVF7qGX91a6c5WeRPs5pKXln.jpg",
    "tmdbPersonId": 17605,
    "birthday": "1972-09-06",
    "placeOfBirth": "Hackney, London, England, UK",
    "bio": "Idrissa Akuna Elba  ( IH-driss; sinh ngày 6 tháng 9 năm 1972) là nam diễn viên, ca sĩ, DJ người Anh. Trong sự nghiệp của mình, ông đã nhận được một giải Quả cầu vàng, đề cử ba giải BAFTA, sáu giải Primetime Emmy. Năm 2016, ông lọt vào danh sách Những người có ảnh hưởng nhất thế giới Time 100.\nElba từng học diễn xuất tại sân khấu National Youth Music Theatre, Luân Đôn. Ông được biết tới rộng rãi qua các vai Stringer Bell trong The Wire của HBO (2002–2004) và John Luther trong Luther (2010–2019, BBC One). Vai Luther mang về cho ông một giải Quả cầu vàng cho Nam chính xuất sắc nhất trong phim truyền hình/phim ngắn, bốn đề cử Primetime Emmy cho Nam chính nổi bật trong phim điện ảnh/phim truyền hình ngắn. Ông cũng có một đề cử Emmy cho vai khách mời trong The Big C (2011) và vai chính trong Hijack (2024). Elba cũng nổi tiếng với vai phụ Charles Miner trong sitcom The Office (2009, đài NBC).\nỞ lĩnh vực điện ảnh, ông tham gia Beasts of No Nation (2015) và nhận được một giải SAG cho nam diễn viên phụ xuất sắc nhất, các đề cử giải BAFTA cho nam diễn viên phụ xuất sắc nhất và Quả cầu vàng. Ông từng thủ vai Nelson Mandela trong Mandela: Long Walk to Freedom (2013) và nhận được một đề cử giải Quả cầu vàng cho Nam chính điện ảnh xuất sắc nhất phim chính kịch. Các phim khác mà ông đã góp mặt là American Gangster (2007), Obsessed (2009), Prometheus (2012), Pacific Rim (2013), Star Trek Beyond (2016), Molly's Game (2017), The Dark Tower (2017), Fast & Furious: Hobbs & Shaw (2019), và The Harder They Fall (2021).",
    "aliases": [
      "idris elba",
      "idrissa akuna elba ",
      "sir idris elba",
      "sir idrissa akuna elba"
    ],
    "featured": false
  },
  {
    "slug": "jason-momoa",
    "name": "Jason Momoa",
    "country": "Mỹ / Anh 🇺🇸🇬🇧",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "DC",
      "Hành động"
    ],
    "roles": "Aquaman • Siêu sao hành động",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/3troAR6QbSb6nUFMDu61YCCWLKa.jpg",
    "tmdbPersonId": 117642,
    "birthday": "1979-08-01",
    "placeOfBirth": "Honolulu, Hawaii, USA",
    "bio": "Joseph Jason Namakaeha Momoa (sinh ngày 1 tháng 8 năm 1979) là nam diễn viên, đạo diễn và nhà sản xuất phim người Mỹ.\nJason Momoa đóng nhiều vai diễn siêu anh hùng trong vũ trụ DC Mở rộng DC Extended Universe, bắt đầu từ năm 2016 với vai thủy thần Aquaman trong Batman v Superman: Dawn of Justice, Justice League và Aquaman. Trước đó, Jason Momoa từng vào vai Ronon Dex trong sê-ri phim viễn tưởng Stargate Atlantis (2004–2009), Khal Drogo trong Game of Thrones (2011–2012) hay Declan Harp trong Frontier (2016–nay).\nRoad to Paloma là bộ phim đầu tiên mà Jason Momoa làm giám đốc sản xuất kiêm biên kịch, anh cũng tham gia đóng vai chính trong bộ phim này, được phát hành ngày 11 tháng 7 năm 2014.\n\nThời thơ ấu:\n\nMomoa sinh năm 1979 ở Honolulu, Hawaii. Anh là con một của bà Coni Lemke, một nhiếp ảnh gia, và ông Joseph Momoa, một họa sĩ. Anh lớn lên ở Norwalk, Iowa, Hoa Kỳ cùng với mẹ của mình. Cha anh người gốc Hawaii còn mẹ anh gốc Đức.\n\nSự nghiệp:\n\nNăm 1998, Momoa được khuyến khích đi theo sự nghiệp người mẫu bởi nhà thiết kế quốc tế Takeo Kikuchi. Sau đó một năm, anh chiến thắng giải Người mẫu Hawaii của năm tại sự kiện cuộc thi người mẫu Hawaii dành cho thiếu niên. Năm 19 tuổi, Momoa bắt đầu làm việc bán thời gian tại một của hàng ván lướt trước khi anh tham gia loạt phim truyền hình hành động tên Baywatch Hawaii, lúc đó Momoa đóng vai Jason Lane\nNgoài những lần xuất hiện trong các loạt sê ri phim như North Shore (2004 - 2005), Johnson Family vacation (2004) và Stargate: Atlantis (2005 - 2009), Momoa còn được được chọn vào vai Roman trong bốn tập của loạt phim truyền hình hài kịch The Game (2009). Anh đóng vai nhân vật chính trong Conan the Barbarian (2011), tái hiện lại bộ phim Crazy Horse (1982), khi đó là vai diễn của diễn viên nổi tiếng Arnold Schwarzenegger. Momoa đã nhận được vai diễn Khal Drogo trong Trò chơi vương quyền của HBO thông qua buổi thử giọng, khi đó anh biểu diễn một điệu nhảy Haka, một trong nhiều điệu nhảy Māori đáng sợ thường được sử dụng để tôn vinh cuộc sống.\nMomoa đạo diễn đồng thời là đồng sáng tác trong phim Road to Paloma (2014), một bộ phim kinh dị của phim truyền hình Mỹ, kết hợp với hai nhà biên kịch Jonathan Hirschbein và Robert Homer Mollohan. Phim có sự tham gia của Momoa, Sarah Shahi,,Lisa Bonet Michael Raymond-James và Wes Studi. Phim được công chiếu tại Liên hoan phim Sarasota 2014 vào tháng 4 năm 2014.Bộ phim được công chiếu và phát hành vào ngày 15 tháng 7 năm 2014, tại Thành phố New York và Los Angeles và một bản phát hành VOD.",
    "aliases": [
      "jason momoa",
      "joseph jason namakaeha momoa",
      "jason mamoa"
    ],
    "featured": false
  },
  {
    "slug": "vin-diesel",
    "name": "Vin Diesel",
    "country": "Mỹ / Anh 🇺🇸🇬🇧",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Hành động",
      "Marvel"
    ],
    "roles": "Dominic Toretto • Fast & Furious",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/tEoUF0RJqHnskmBOJiDEQhyN7Ok.jpg",
    "tmdbPersonId": 12835,
    "birthday": "1967-07-18",
    "placeOfBirth": "Alameda County, California, USA",
    "bio": "Vin Diesel (tên khai sinh là Mark Sinclair hay Mark Vincent; sinh ngày 18 tháng 7 năm 1967) , là một diễn viên và nhà sản xuất người Mỹ. Là một trong những nam diễn viên có doanh thu cao nhất thế giới, anh được biết đến với vai Dominic Toretto trong loạt phim Fast & Furious.\nDiesel bắt đầu sự nghiệp của mình vào năm 1990 nhưng chật vật để giành được các vai diễn cho đến khi anh viết kịch bản, đạo diễn, sản xuất và đóng vai chính trong bộ phim ngắn Multi-Facial (1995). Điều này thu hút sự chú ý của Steven Spielberg, người đang phát triển Saving Private Ryan (1998), và viết lại các yếu tố của bộ phim để cho phép Diesel xuất hiện trong một vai phụ. Diesel sau đó đã lồng tiếng cho nhân vật chính trong The Iron Giant (1999) trong khi nổi danh như một ngôi sao hành động sau khi gây ấn tượng với loạt phim Fast & Furious, XXX và The Chronicles of Riddick.\nDiesel đóng vai Groot trong các bộ phim siêu anh hùng của Vũ trụ Điện ảnh Marvel, xuất hiện trong Guardians of the Galaxy (2014), Guardians of the Galaxy Vol. 2 (2017), Avengers: Infinity War (2018), Avengers: Endgame (2019) và Thor: Love and Thunder (2022) sắp tới. Anh cũng đóng vai Groot trong bộ phim hoạt hình Ralph Breaks the Internet (2018). Diesel cũng đã giành được thành công về mặt thương mại trong các thể loại khác, chẳng hạn như trong bộ phim hài The Pacifier (2005), trong khi màn trình diễn của anh trong Find Me Guilty (2006) được khen ngợi. Diesel miêu tả Bloodshot chuyển thể từ phim siêu anh hùng vào năm 2020, và dự kiến sẽ xuất hiện trong các phim Avatar sắp tới.\nAnh thành lập công ty sản xuất One Race Films, nơi anh cũng là nhà sản xuất hoặc điều hành sản xuất cho những chiếc xe ngôi sao của mình. Diesel cũng thành lập hãng thu âm Racetrack Records và nhà phát triển trò chơi điện tử Tigon Studios, cung cấp khả năng ghi lại chuyển động và giọng nói của anh ấy cho tất cả các bản phát hành của Tigon.\n\nThời niên thiếu:",
    "aliases": [
      "vin diesel",
      "mark sinclair"
    ],
    "featured": false
  },
  {
    "slug": "tom-holland",
    "name": "Tom Holland",
    "country": "Mỹ / Anh 🇺🇸🇬🇧",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "Marvel",
      "Hành động"
    ],
    "roles": "Người Nhện Spider-Man • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/xKBAaPIa1c7tzZD3Y0MhBLv4hPE.jpg",
    "tmdbPersonId": 1136406,
    "birthday": "1996-06-01",
    "placeOfBirth": "Kingston upon Thames, London, England, UK",
    "bio": "Thomas Stanley Holland (sinh ngày 1 tháng 6 năm 1996) là một nam diễn viên, vũ công người Anh. Tom Holland tốt nghiệp trường BRIT ở London, anh bắt đầu sự nghiệp diễn xuất của mình trên sân khấu với vai chính trong Billy Elliot the Musical ở West End từ năm 2008 đến năm 2010. Anh bắt đầu được khán giả biết đến với vai chính trong bộ phim thảm họa Thảm họa sóng thần (2012), anh nhận được nhân Giải thưởng của Hội phê bình Điện ảnh Luân Đôn dành cho Diễn viên trẻ người Anh của năm.\nTom Holland đã trở thành ngôi sao điện ảnh khi anh đóng vai Peter Parker / Người Nhện trong các bộ phim siêu anh hùng của Vũ trụ Điện ảnh Marvel qua các bộ phim Đội trưởng Mỹ: Nội chiến siêu anh hùng (2016), Người Nhện: Trở về nhà (2017), Biệt đội siêu anh hùng: Cuộc chiến vô cực (2018), Biệt đội siêu anh hùng: Hồi kết (2019), Người Nhện: Xa nhà (2019), Người Nhện: Không còn nhà (2021), Người Nhện: Khởi đầu mới (2026). Năm 2017, chàng trai 20 tuổi Holland đã trở thành người nhận Giải BAFTA cho Ngôi sao mới nổi trẻ tuổi nhất.\n\nĐầu đời và giáo dục:\n\nHolland được sinh ra ở Kingston upon Thames, London, con của bà Nicola Elizabeth (nhũ danh Frost), là một nhiếp ảnh gia, và ông Dominic Holland, là một diễn viên hài và là một người viết truyện. Anh có ba anh em, cặp song sinh Sam và Harry, kém Holland ba tuổi, sau này xuất hiện trong bộ phim Diana (2013) và Paddy, kém Holland 8 tuổi. Ông bà nội của anh được sinh ra trên đảo Isle of Man và Ireland.\nHolland học tại Donhead, một trường trung học cho Công giáo La Mã ở Wimbledon, Tây Nam Luân Đôn, sau đó là trường Cao đẳng Wimbledon, một trường trung học Công giáo Rôma được trợ giúp tự nguyện (cũng ở Wimbledon) cho đến tháng 12 năm 2012. Tháng 12 năm 2012, Holland đã được theo học tại Trường Nghệ thuật Biểu diễn và Công nghệ BRIT. \n\nSự nghiệp:\n\nNhà hát:\n\nHolland bắt đầu học nhảy tại một lớp hip hop ở Nifty Feet Dance School, Wimbledon. Khả năng của anh đã được phát hiện bởi biên đạo múa Lynne Page (người là cộng sự của Peter Darling, biên đạo múa của Billy Elliot và Billy Elliot the Musical khi anh biểu diễn với lớp học nhảy của mình tại Lễ hội Múa Richmond năm 2006.\nSau 8 lần thử giọng và hai năm huấn luyện, vào ngày 28 tháng 6 năm 2008, Holland đã ra mắt West End trong Billy Elliot The Musical với Michael, người bạn thân nhất của Billy. Anh đã có màn trình diễn đầu tiên của mình trong vai trò mở màn vào ngày 8 tháng 9 năm 2008 và nhận được phản hồi tích cực.\nTháng 9 năm 2008, Holland (cùng với Tanner Pflueger) xuất hiện trên chương trình tin tức trên kênh FIVE và đã có buổi phỏng vấn lần đầu tiên trên truyền hình. Năm sau, anh được tham gia chương trình ITV1 The Feel Good Factor. Tại buổi chiếu ra mắt vào ngày 31 tháng 1, anh và Billy Elliots, Tanner Pflueger và Layton Williams, đã biểu diễn một phiên bản Angry Dance của Billy Elliot the Musical, sau đó Holland được phỏng vấn bởi Myleene Klass.",
    "aliases": [
      "tom holland",
      "thomas stanley holland",
      "thomas holland"
    ],
    "featured": false
  },
  {
    "slug": "henry-cavill",
    "name": "Henry Cavill",
    "country": "Mỹ / Anh 🇺🇸🇬🇧",
    "countryCode": "us_uk",
    "gender": 2,
    "tags": [
      "Hollywood",
      "DC",
      "Hành động"
    ],
    "roles": "Superman • The Witcher",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/kN3A5oLgtKYAxa9lAkpsIGYKYVo.jpg",
    "tmdbPersonId": 73968,
    "birthday": "1983-05-05",
    "placeOfBirth": "St. Helier, Jersey, Channel Islands",
    "bio": "Henry William Dalgliesh Cavill (; sinh ngày 5 tháng 5 năm 1983) là một diễn viên người Anh. Anh được biết đến với vai diễn Charles Brandon trong The Tudors (2007–2010) của Showtime, nhân vật Superman (Siêu Nhân) của DC Comics trong Vũ trụ Mở rộng DC, Geralt of Rivia trong loạt phim giả tưởng The Witcher (2019–nay) của Netflix, cũng như Sherlock Holmes trong phim Enola Holmes của Netflix (2020). Cavill bắt đầu sự nghiệp của mình với các vai diễn trong các bộ phim chuyển thể The Count of Monte Cristo (2002) và I Capture the Castle (2003). Sau đó, anh đóng các vai phụ trong một số phim truyền hình, bao gồm The Inspector Lynley Mysteries của BBC, Midsomer Murders của ITV và The Tudors của Showtime. Anh đã xuất hiện trong các bộ phim studio khác, chẳng hạn như Tristan & Isolde (2006), Stardust (2007), Immortals (2011) và Sand Castle (2017).\nCavill đã được quốc tế công nhận với vai diễn Superman trong các phim siêu anh hùng của Vũ trụ Mở rộng DC Man of Steel (2013), Batman v Superman: Dawn of Justice (2016), Justice League (2017) và Zack Snyder's Justice League (2021). Anh cũng đóng vai chính trong các bộ phim điệp viên The Man from U.N.C.L.E. (2015) và Mission: Impossible - Fallout (2018).\n\nĐầu đời:\n\nCavill chào đời ở đảo Jersey thuộc Quần đảo Eo Biển, là người thứ tư trong năm người con trai. Mẹ anh, Marianne, làm thư ký ở một ngân hàng, và bố anh, Colin, là một nhà môi giới chứng khoán. Anh được giáo dục tại trường St. Michael's ở Saint Saviour, Jersey trước khi vào trường Stowe, một trường nội trú ở Stowe, nước Anh. Anh bắt đầu việc diễn xuất qua các vở kịch ở trường và từng nói rằng nếu không trở thành diễn viên, anh sẽ gia nhập quân đội hoặc vào đại học để học về lịch sử cổ đại, cụ thể là Ai Cập học.\nTrong thời gian ở Stowe, Cavill được dịp gặp gỡ nam diễn viên Russell Crowe. Crowe đến ngôi trường để quay những cảnh của bộ phim Proof of Life. Cavill lúc đó được đóng vai phụ, và nhân cơ hội để nhờ Crowe cho lời khuyên về sự nghiệp diễn xuất. Sau này, Cavill và Crowe đã làm việc chung trong bộ phim Man of Steel.\n\nSự nghiệp:\n\nĐời tư:\n\nNgày 4 tháng 5 năm 2011, bạn gái của Cavill, một vận động viên cưỡi ngựa vượt chướng ngại vật có tên Ellen Whitaker, công bố tin hai người đã đính hôn. Ngày 18 tháng 8 năm 2012, cặp đôi đã chia tay. Cavill bắt đầu hẹn hò với nữ diễn viên và cựu võ sĩ người Mỹ Gina Carano từ tháng 9 năm 2012. Tháng 7 năm 2013, Cavill hẹn hò với nữ diễn viên Kaley Cuoco và chia tay nhau chỉ ít tuần sau đó.\nTrong một lần phỏng vấn với TV Guide và một bài báo mạng bởi Daily Record, Cavill chia sẻ anh từng bị bắt nạt vì quá béo khi còn nhỏ. Tuy nhiên, Cavill cho biết mình không để bụng về những kẻ bắt nạt đó.",
    "aliases": [
      "henry cavill",
      "henry william dalgliesh cavill"
    ],
    "featured": false
  },
  {
    "slug": "truong-quoc-vinh",
    "name": "Trương Quốc Vinh",
    "englishName": "Leslie Cheung",
    "country": "Hồng Kông 🇭🇰",
    "countryCode": "hk",
    "gender": 2,
    "tags": [
      "Chính kịch",
      "Tình cảm",
      "Võ thuật"
    ],
    "roles": "Huyền thoại điện ảnh & âm nhạc",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/xdSUevukGCrayOdLd4Kd6YSJnKR.jpg",
    "tmdbPersonId": 69637,
    "birthday": "1956-09-12",
    "deathday": "2003-04-01",
    "placeOfBirth": "Hong Kong",
    "bio": "Trương Phát Tông (giản thể: 张发宗; phồn thể: 張發宗; tiếng Anh: Cheung Fat-chung), thường được biết đến với nghệ danh Trương Quốc Vinh (giản thể: 张国荣; phồn thể: 張國榮, tiếng Anh: Leslie Cheung Kwok-wing, 12 tháng 9 năm 1956 – 1 tháng 4 năm 2003), là một cố nam ca sĩ kiêm diễn viên người Hồng Kông. Với sự nghiệp trải dài 26 năm, Trương Quốc Vinh đã phát hành khoảng 40 album và tham gia diễn xuất trong khoảng 60 bộ phim. Được đánh giá là một trong những nghệ sĩ Hồng Kông vĩ đại nhất mọi thời đại, ông là ca sĩ tiên phong và là người định hình bản sắc cho dòng nhạc Cantopop trong suốt thập niên 1980. Bên cạnh sự nghiệp âm nhạc, Trương Quốc Vinh còn là một biểu tượng của nền điện ảnh Hoa ngữ; nhiều bộ phim mà ông tham gia diễn xuất như Xuân quang xạ tiết (1997), Bá vương biệt Cơ (1993) và A Phi chính truyện (1990) đã trở thành những tác phẩm kinh điển. Ông cũng là một trong số ít ngôi sao châu Á công khai đóng các vai diễn đồng tính nam, tích cực tham gia các hoạt động giành quyền lợi cho cộng đồng LGBT.\nSinh ra tại Cửu Long, Hồng Kông, Trương Quốc Vinh sớm sang Anh du học từ năm 12 tuổi. Ông trở về Hồng Kông rồi bước chân vào làng giải trí vào năm 1977, sau khi giành giải nhì một cuộc thi âm nhạc. Sự nghiệp âm nhạc của ông thuở ban đầu không mấy thuận lợi và chỉ bắt đầu khởi sắc khi ông phát hành album Gió tiếp tục thổi vào năm 1982. Năm 1984, ông cho ra mắt ca khúc \"Monica\", một trong những tác phẩm tiêu biểu nhất lịch sử âm nhạc đại chúng Hồng Kông. Năm 1987, album Summer Romance của ông trở thành album bán chạy nhất năm ở Hồng Kông với hơn 700 nghìn bản tiêu thụ. Ở lĩnh vực điện ảnh, Trương Quốc Vinh ghi những dấu ấn đầu tiên với các vai diễn trong Liệt hỏa thanh xuân (1982) và Anh hùng bản sắc (1986).\nSau khi tạm ngừng ca hát vào năm 1989, Trương Quốc Vinh tập trung cho sự nghiệp diễn xuất và gặt hái được nhiều thành tích trong những năm 1990. Đặc biệt, vai diễn nghệ sĩ kinh kịch Trình Điệp Y trong Bá vương biệt Cơ (1993) đã đưa tên tuổi của ông đến với khán giả phương Tây, là nét tô điểm đậm nhất cho thành công ở lĩnh vực điện ảnh của mình. Năm 1995, Trương Quốc Vinh trở lại với ngành công nghiệp âm nhạc, một năm sau, phát hành album Hồng nhận được sự tán dương nhiệt liệt. Ông đã nhảy lầu tự sát từ tầng 24 khách sạn Mandarin Oriental, khu Trung Hoàn, Hồng Kông vào ngày 1 tháng 4 năm 2003, sau khi phải chịu ảnh hưởng từ căn bệnh trầm cảm lâu năm của mình.",
    "aliases": [
      "trương quốc vinh",
      "truong quoc vinh",
      "leslie cheung",
      "cheung kwok-wing",
      "zhang guorong",
      "ca ca",
      "ca ca trương quốc vinh",
      "張國榮"
    ],
    "featured": false
  }
];

export function getActorBySlug(slug: string): ActorCatalogItem | undefined {
  return ACTORS_CATALOG.find((a) => a.slug === slug);
}

export function getAllCatalogActors(): ActorCatalogItem[] {
  return ACTORS_CATALOG;
}
