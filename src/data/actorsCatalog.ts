export interface ActorCatalogItem {
  slug: string;
  name: string;
  englishName?: string;
  country: string;
  countryCode: "vn" | "hk" | "cn" | "kr" | "jp" | "th" | "us_uk" | "in";
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
    "roles": "Danh hài • Diễn viên • MC",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/tOAkgIMbNHmTnXuz4EHnqBmALk1.jpg",
    "tmdbPersonId": 1674570,
    "bio": "Võ Vũ Trường Giang, được biết đến với nghệ danh Trường Giang, là một nam diễn viên, nghệ sĩ hài, nhạc sĩ kiêm người dẫn chương trình truyền hình người Việt Nam.",
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
    "roles": "Ông hoàng phòng vé • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/lKtQkjmtIkzbVdFrLhDCqCP1Cjc.jpg",
    "tmdbPersonId": 1157996,
    "birthday": "1974-08-10",
    "placeOfBirth": "Saigon, Vietnam",
    "bio": "Hồ Thái Hòa, thường được biết đến với nghệ danh Thái Hòa, là một nam diễn viên người Việt Nam. Nổi tiếng nhờ khả năng biến hóa thần sầu trong từng vai diễn, anh được đánh giá là một trong những diễn viên Việt Nam xuất sắc nhất trong thế hệ của mình.",
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
    "roles": "Ngọc nữ điện ảnh • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/ypwd4glGKnAoiLMWH0DuxDkPvKE.jpg",
    "tmdbPersonId": 1386822,
    "birthday": "1990-04-04",
    "placeOfBirth": "Ho Chi Minh City, Vietnam",
    "bio": "Ninh Dương Lan Ngọc là một nữ diễn viên người Việt Nam. Cô được đánh giá là một trong những nữ diễn viên Việt Nam xuất sắc nhất trong thế hệ của mình, cô bắt đầu được biết đến qua vai diễn Nương trong bộ phim Cánh đồng bất tận.",
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
    "roles": "Đạo diễn franchise Lật Mặt • Ca sĩ",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/qmPEmGwDEINEoiQywHuGR0dCz0A.jpg",
    "tmdbPersonId": 1675405,
    "birthday": "1968-09-28",
    "placeOfBirth": " Vietnam",
    "bio": "Nguyễn Văn Hải, thường được biết đến với nghệ danh Lý Hải, là một nam ca sĩ, diễn viên, doanh nhân kiêm nhà làm phim người Việt Nam. Bước chân vào lĩnh vực ca hát từ năm 1993, song tên tuổi của ông chỉ thật sự thành danh khi cho ra đời chuỗi album ca nhạc phim Trọn đời bên em vào năm 2001. Thành công của loạt album này đã giúp ông xây dựng thành công thương hiệu cho riêng mình và trở thành một trong những nam ca sĩ ăn khách nhất thời điểm bấy giờ, đặc biệt là đối với khán giả miền Tây Nam Bộ. Với sở trường trình bày những ca khúc thuộc thể loại nhạc trẻ và nhạc Hoa lời Việt bằng giai điệu và ca từ đơn giản, ông từng được mệnh danh là \"Ngôi sao ca nhạc bình dân\".",
    "aliases": [
      "lý hải",
      "ly hai",
      "dao dien ly hai",
      "lat mat",
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
    "roles": "Nghệ sĩ ưu tú • Danh hài gạo cội",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/sUTrL2w0i1ctXc8LNZnmetQz8e4.jpg",
    "tmdbPersonId": 1260871,
    "birthday": "1969-12-18",
    "bio": "Võ Nguyễn Hoài Linh, thường được biết đến với nghệ danh Hoài Linh, là một nam diễn viên kiêm nghệ sĩ hài người Việt Nam. Ông là một trong những diễn viên hài nổi bật nhất thập niên 2000 và 2010 tại Việt Nam, và là chủ nhân của giải Mai Vàng. Năm 2015, ông trở thành nghệ sĩ hải ngoại đầu tiên được phong tặng danh hiệu Nghệ sĩ Ưu tú.",
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
    "roles": "Diễn viên điện ảnh xuất sắc",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/n78QM4icCLlhWLBn1eXhRSX21Lg.jpg",
    "tmdbPersonId": 1841663,
    "placeOfBirth": "Ho Chi Minh City, Vietnam",
    "bio": "Nguyễn Ngọc Bình An, thường được biết đến với nghệ danh Kaity Nguyễn, là một nữ diễn viên kiêm người mẫu người Mỹ gốc Việt hiện đang hoạt động tại Việt Nam. Cô trở nên nổi tiếng với vai diễn Linh Đan trong bộ phim Em chưa 18 (2017).",
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
    "roles": "Diễn viên điện ảnh",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/8htmGyEcsF9ClSHEkpQJWkHB7lL.jpg",
    "tmdbPersonId": 1330249,
    "birthday": "1988-02-26",
    "placeOfBirth": "Bà Rịa - Vũng Tàu, Việt Nam",
    "bio": "Kiều Minh Tuấn là một nam diễn viên người Việt Nam.",
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
    "roles": "Hoa hậu hài • Nhà sản xuất",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/2CjKnc69UGBfmrQ5pW9YkrCoslR.jpg",
    "tmdbPersonId": 1841829,
    "birthday": "1984-01-01",
    "placeOfBirth": "Ho Chi Minh City, Vietnam",
    "bio": "Trần Ngọc Thu Trang, thường được biết đến với nghệ danh Thu Trang, là một nữ diễn viên kiêm nhà sản xuất phim người Việt Nam. Cô được biết đến qua các vai diễn từ các bộ phim như Em là bà nội của anh, 798Mười, Tiệc trăng máu, Gia đình là số 1 và Thập Tam Muội.",
    "aliases": [
      "thu trang",
      "hoa hau hai thu trang",
      "chi muoi ba"
    ],
    "featured": false
  },
  {
    "slug": "viet-huong",
    "name": "Việt Hương",
    "englishName": "Việt Hương",
    "country": "Việt Nam 🇻🇳",
    "countryCode": "vn",
    "roles": "Danh hài • Nữ nghệ sĩ nổi tiếng",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/9v9E5OM91kILN7zkkE2pBSRNHbZ.jpg",
    "tmdbPersonId": 1594383,
    "birthday": "1976-10-15",
    "placeOfBirth": "Saigon, Vietnam",
    "bio": "Lê Thị Bằng Hương thường được biết đến với nghệ danh Việt Hương là nữ đạo diễn âm nhạc và phim tài liệu người Việt Nam. Bà hiện là Phó Chủ tịch Hội Điện ảnh Hà Nội.",
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
    "roles": "Nam diễn viên Bố Già • Mai • Đất Rừng Phương Nam",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/6ruyYz6Lah3UYSuFYCR02jsAGRW.jpg",
    "tmdbPersonId": 2012866,
    "birthday": "1992-11-20",
    "placeOfBirth": "Ho Chi Minh City, Vietnam",
    "bio": "Trần Duy Tuấn, thường được biết đến với nghệ danh Tuấn Trần, là một nam diễn viên kiêm người mẫu người Việt Nam.",
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
    "roles": "Em Là Bà Nội Của Anh • Cô Gái Đến Từ Hôm Qua",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/wX94axgpRMiP5dwYcPJMDepSutk.jpg",
    "tmdbPersonId": 1259011,
    "birthday": "1991-07-05",
    "placeOfBirth": "Saigon, Vietnam",
    "bio": "Lê Ánh Nhật, thường được biết đến với nghệ danh Miu Lê, là một nữ ca sĩ kiêm diễn viên người Việt Nam. Cô bắt đầu sự nghiệp với vai trò diễn viên qua bộ phim truyền hình Những thiên thần áo trắng (2009) của đạo diễn Lê Hoàng, sau đó chuyển hướng sang ca hát và ghi dấu ấn bằng các bản hit như \"Giả vờ nhưng em yêu anh\", \"Yêu một người có lẽ\", \"Gác lại âu lo\", và đặc biệt là \"Vì mẹ anh bắt chia tay\" (2022) – ca khúc đạt vị trí số một trên bảng xếp hạng YouTube Top Trending Việt Nam và vượt 130 triệu lượt xem.",
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
    "roles": "Vua Kungfu • Hoàng Phi Hồng",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/c4s8INzU0ZAujCQ1YmphCmcsNzl.jpg",
    "tmdbPersonId": 1336,
    "birthday": "1963-04-26",
    "placeOfBirth": "Beijing, China",
    "bio": "Lý Liên Kiệt là một nam diễn viên võ thuật nổi tiếng người Trung Quốc, ngoài ra ông còn là nhà sản xuất, nhà hoạt động từ thiện. Cho đến nay ông được mọi người biết đến qua hai vai diễn chính cùng tên trong hai bộ phim Hoàng Phi Hồng và Hoắc Nguyên Giáp, các vai diễn trong phim Anh hùng, Long môn phi giáp, Đầu danh trạng, Truyền thuyết Bạch Xà và Hoa Mộc Lan.",
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
    "featured": true
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
    "featured": true
  },
  {
    "slug": "trieu-le-dinh",
    "name": "Triệu Lệ Dĩnh",
    "englishName": "Zanilia Zhao",
    "country": "Trung Quốc 🇨🇳",
    "countryCode": "cn",
    "roles": "Nữ hoàng rating • Sở Kiều Truyện",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/kaVjQKPCrhTBlPGlyvbkCfq2TP5.jpg",
    "tmdbPersonId": 1260868,
    "birthday": "1987-10-16",
    "placeOfBirth": "中国, 河北, 廊坊",
    "bio": "Triệu Lệ Dĩnh là một nữ diễn viên người Trung Quốc.",
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
    "roles": "Tam Sinh Tam Thế • Nữ hoàng cổ trang",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/x5EsYXKH2Kdc6QPYhoaSoAsnsjw.jpg",
    "tmdbPersonId": 572043,
    "birthday": "1986-09-12",
    "placeOfBirth": "Beijing, China",
    "bio": "Dương Mịch là một nữ diễn viên, người mẫu, ca sĩ và nhà sản xuất phim người Trung Quốc. Năm 2011, cô tham gia các phim truyền hình ăn khách như Cung toả tâm ngọc và phim điện ảnh Cô đảo kinh hoàng và nhanh chóng nổi tiếng, lấn sân sang nhiều lĩnh vực đầu tư và sản xuất phim truyền hình.",
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
    "roles": "Trần Tình Lệnh • Đỉnh lưu C-Biz",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/468n73j2sSJIbfZvsIZvDpvUaS8.jpg",
    "tmdbPersonId": 2084790,
    "birthday": "1991-10-05",
    "placeOfBirth": "Chongqing, China",
    "bio": "Tiêu Chiến là một diễn viên và ca sĩ người Trung Quốc. Tiêu Chiến bắt đầu bước chân vào làng giải trí khi tham gia chương trình sống còn thần tượng X-Fire và ra mắt với tư cách là thành viên của nhóm nhạc XNINE. Anh ấy bắt đầu sự nghiệp diễn xuất của mình vào năm 2016 và kể từ đó đã giành được sự chú ý rộng rãi với các bộ phim truyền hình của mình, bao gồm Trần Tình Lệnh (2019), Khánh Dư Niên (2019), Lang Điện Hạ (2020) và Đấu La Đại Lục (2021).",
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
    "roles": "Vô Danh • Nhiệt Liệt • Đỉnh lưu",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/5akr656RvJX8hl1pa1qZckfiQeF.jpg",
    "tmdbPersonId": 1594612,
    "birthday": "1997-08-05",
    "placeOfBirth": "Luoyang, Henan, China",
    "bio": "Vương Nhất Bác là một ca sĩ, diễn viên, người dẫn chương trình và tay đua motor chuyên nghiệp người Trung Quốc. Anh là thành viên của nhóm nhạc nam Hàn-Trung UNIQ. Theo truyền thông Trung Quốc, anh hiện là một trong những ngôi sao có giá trị thương mại cao nhất tại Trung Quốc và cũng là một trong những lưu lượng hàng đầu được đánh giá cao, sở hữu nhiều tác phẩm phim ảnh nổi tiếng và âm nhạc ấn tượng.",
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
    "roles": "Mỹ nhân Tân Cương • Em Là Niềm Kiêu Hãnh Của Anh",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/vrgYSOBnySesIUS5XvyjSYz7qZ0.jpg",
    "tmdbPersonId": 1557698,
    "birthday": "1992-06-03",
    "placeOfBirth": "Urumqi, Xinjiang, China",
    "bio": "Địch-Lệ-Nhiệt-Ba Địch-Lực-Mộc-Lạp-Đề, thường được gọi tắt là Địch Lệ Nhiệt Ba hoặc Nhiệt Ba, là một nữ diễn viên, ca sĩ và người mẫu người Trung Quốc. Cô là người dân tộc Duy Ngô Nhĩ đến từ Ürümqi, Tân Cương.",
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
    "roles": "Yêu Em Từ Cái Nhìn Đầu Tiên",
    "tmdbPersonId": 1876614,
    "bio": "Dương Dương là một nam diễn viên Trung Quốc. Anh được khán giả biết đến với vai diễn Tào Thực trong phim truyền hình Tân Lạc Thần. Năm 2008, anh được chọn vào vai Giả Bảo Ngọc trong phim Tân Hồng Lâu Mộng (2010). Năm 2015, anh gây ấn tượng với nhiều vai diễn: sư huynh Taekwondo Cố Nhược Bạch với nhiệt huyết tuổi trẻ, một Trương Khởi Linh lạnh lùng hết lòng vì bạn, hóa thân thành Vô Tình lạnh nhạt với trái tim chung của Tân thiếu niên tứ đại danh bổ, Hứa Dực nổi loạn cùng chuyện tình buồn với Ba Lạp và Lý Nhĩ. Năm 2016, Dương Dương sắm vai Tiêu Nại trong Yêu em từ cái nhìn đầu tiên (2016). Và mới đây nhất là Thả Thí Thiên Hạ vai Hắc Phong Tức/Phong Lan Tức (2022). Hiện tại, Dương Dương được đánh giá là nam diễn viên trẻ đầy triển vọng của nền điện ảnh Trung Quốc và Châu Á. ...",
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
    "roles": "Vua hài võ thuật • Huyền thoại điện ảnh",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/nraZoTzwJQPHspAVsKfgl3RXKKa.jpg",
    "tmdbPersonId": 18897,
    "birthday": "1954-04-07",
    "placeOfBirth": "Victoria Peak, Hong Kong",
    "bio": "Phòng Sĩ Long, tên khai sinh là Trần Cảng Sinh, hay thường được biết đến với nghệ danh Thành Long, là một nam diễn viên, chỉ đạo võ thuật kiêm nhà làm phim người Hồng Kông. Được mệnh danh là \"vua hành động của châu Á\", ông được đánh giá là một trong những nhân vật điện ảnh nổi tiếng và có tầm ảnh hưởng nhất trên toàn thế giới.",
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
    "featured": true
  },
  {
    "slug": "chau-tinh-tri",
    "name": "Châu Tinh Trì",
    "englishName": "Stephen Chow",
    "country": "Hồng Kông 🇭🇰",
    "countryCode": "hk",
    "roles": "Vua Hài Kịch • Đạo diễn điện ảnh",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/j5DWs54BGZfp92G43c9OyHPvkNG.jpg",
    "tmdbPersonId": 57607,
    "birthday": "1962-06-22",
    "placeOfBirth": "Hong Kong, British Crown Colony [now China]",
    "bio": "Châu Tinh Trì là một nam nhà làm phim, cựu diễn viên kiêm nghệ sĩ hài người Hồng Kông. Được mệnh danh là \"vua hài châu Á\", ông được đánh giá là một trong những diễn viên hài vĩ đại nhất mọi thời đại của điện ảnh Hồng Kông.",
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
    "bio": "Chân Tử Đan là một nam diễn viên, võ sư, chỉ đạo võ thuật kiêm nhà làm phim người Hồng Kông. Ông nổi tiếng trên màn ảnh truyền hình và màn ảnh rộng qua những vai diễn có sử dụng võ thuật, và là một trong những ngôi sao võ thuật hàng đầu châu Á lẫn cả Hollywood.",
    "aliases": [
      "chân tử đan",
      "chan tu dan",
      "donnie yen",
      "diep van"
    ],
    "featured": true
  },
  {
    "slug": "luu-duc-hoa",
    "name": "Lưu Đức Hoa",
    "englishName": "Andy Lau",
    "country": "Hồng Kông 🇭🇰",
    "countryCode": "hk",
    "roles": "Tứ Đại Thiên Vương • Vô Gian Đạo",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/z9R2yerjfgxwDWIH8sjiS0hhcre.jpg",
    "tmdbPersonId": 25246,
    "birthday": "1961-09-27",
    "placeOfBirth": "Tai Po, Hong Kong, China",
    "bio": "Lưu Đức Hoa, là một nam diễn viên kiêm ca sĩ nổi tiếng người Hồng Kông. Ông được vinh danh là một trong \"Ngũ Đại Hổ Tướng\" của đài TVB thập niên 1980 và là một trong \"Tứ Đại Thiên Vương\" của làng giải trí Hồng Kông thập niên 1990.",
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
    "bio": "Lương Triều Vỹ là một diễn viên người Hồng Kông. Ông là nam diễn viên Hồng Kông đầu tiên giành giải Nam diễn viên xuất sắc nhất tại Liên hoan phim Cannes với bộ phim Tâm trạng khi yêu (2000), và hiện đang giữ kỷ lục về số lần chiến thắng giải Nam diễn viên chính xuất sắc nhất tại cả Giải thưởng Điện ảnh Hồng Kông lẫn Giải Kim Mã.",
    "aliases": [
      "lương triều vỹ",
      "luong trieu vy",
      "tony leung",
      "tony leung chiu-wai"
    ],
    "featured": true
  },
  {
    "slug": "co-thien-lac",
    "name": "Cổ Thiên Lạc",
    "englishName": "Louis Koo",
    "country": "Hồng Kông 🇭🇰",
    "countryCode": "hk",
    "roles": "Thần Điêu Đại Hiệp • Chủ tịch Hiệp hội Điện ảnh HK",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/yQuDBTzm7xWlJICNvl20OmcJP80.jpg",
    "tmdbPersonId": 78875,
    "birthday": "1970-10-21",
    "placeOfBirth": "Hong Kong, British Crown Colony [now China]",
    "bio": "Cổ Thiên Lạc là một nam diễn viên, ca sĩ, nhà sản xuất điện ảnh kiêm doanh nhân người Hồng Kông. Anh từng là gương mặt nổi bật và diễn viên chủ chốt của đài truyền hình TVB.",
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
    "bio": "Tạ Đình Phong là một nam ca sĩ, nhạc sĩ, diễn viên, kiêm đầu bếp người Hồng Kông.",
    "aliases": [
      "tạ đình phong",
      "ta dinh phong",
      "nicholas tse"
    ],
    "featured": false
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
    "bio": "Song Kang-ho là một nam diễn viên nổi tiếng người Hàn Quốc.",
    "aliases": [
      "song kang-ho",
      "song kang ho"
    ],
    "featured": true
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
    "aliases": [
      "lee byung-hun",
      "lee byung hun"
    ],
    "featured": true
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
    "featured": true
  },
  {
    "slug": "gong-yoo",
    "name": "Gong Yoo",
    "englishName": "Gong Yoo",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "roles": "Yêu Tinh Goblin • Train to Busan",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/ocGoFb6TrK3uWGXt4WnuibUG1vD.jpg",
    "tmdbPersonId": 150903,
    "birthday": "1979-07-10",
    "placeOfBirth": "Busan, South Korea",
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
    "aliases": [
      "lee jung-jae",
      "lee jung jae"
    ],
    "featured": true
  },
  {
    "slug": "hyun-bin",
    "name": "Hyun Bin",
    "englishName": "Hyun Bin",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "roles": "Hạ Cánh Nơi Anh (Crash Landing on You)",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/JQFzhO9j8HRiyr7leGPj6cqhvM.jpg",
    "tmdbPersonId": 544107,
    "birthday": "1982-09-25",
    "placeOfBirth": "Seoul, South Korea",
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
    "roles": "Hậu Duệ Mặt Trời • Vincenzo",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/kgjb5OppOVTh5tz3hhnfDVnTvDv.jpg",
    "tmdbPersonId": 150698,
    "birthday": "1985-09-19",
    "placeOfBirth": "Daejeon, South Korea",
    "bio": "Song Joong-ki (Hangul: 송중기; sinh ngày 19 tháng 9 năm 1985) là một nam diễn viên người Hàn Quốc. Anh nổi danh từ bộ phim truyền hình cổ trang Sungkyunkwan Scandal (2010) và chương trình giải trí Running Man với vai trò là một thành viên cố định ban đầu.",
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
    "roles": "Nữ Hoàng Nước Mắt • Vì Sao Đưa Anh Tới",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/vrSb5qYUzHX4Sifbc8PKR7j9Y6I.jpg",
    "tmdbPersonId": 4301482,
    "birthday": "1985-12-21",
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
    "aliases": [
      "jun ji-hyun",
      "jun ji hyun",
      "gianna jun"
    ],
    "featured": true
  },
  {
    "slug": "kim-ji-won",
    "name": "Kim Ji-won",
    "englishName": "Kim Ji-won",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
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
    "roles": "The Glory • Hậu Duệ Mặt Trời",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/tlAX3f82Mf5h0rznpVBVK7nD2om.jpg",
    "tmdbPersonId": 74421,
    "birthday": "1981-11-22",
    "placeOfBirth": "Daegu, South Korea",
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
    "roles": "Tầng Lớp Itaewon • Thư Ký Kim",
    "tmdbPersonId": 4006357,
    "birthday": "1974-01-19",
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
    "roles": "Vườn Sao Băng • Quân Vương Bất Diệt",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/iqopuz6cKuRZRUPZQrj7lFZcWWb.jpg",
    "tmdbPersonId": 1245104,
    "birthday": "1987-06-22",
    "placeOfBirth": "Seoul, South Korea",
    "bio": "Lee Min-ho là một nam diễn viên kiêm người mẫu người Hàn Quốc. Anh được biết đến với các vai diễn trong các bộ phim truyền hình Vườn sao băng (2009), Thợ săn thành phố (2011), Những người thừa kế (2013), Huyền thoại biển xanh (2016) và Quân vương bất diệt (2020).",
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
    "aliases": [
      "iu (lee ji-eun)",
      "iu lee ji eun",
      "iu",
      "lee ji-eun",
      "lee ji eun"
    ],
    "featured": true
  },
  {
    "slug": "han-so-hee",
    "name": "Han So-hee",
    "englishName": "Han So-hee",
    "country": "Hàn Quốc 🇰🇷",
    "countryCode": "kr",
    "roles": "Sinh Vật Gyeongseong • Thế Giới Hôn Nhân",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/8IvEOnqMjqJWcci3z44haH38Ee8.jpg",
    "tmdbPersonId": 2112859,
    "birthday": "1993-11-18",
    "placeOfBirth": "Ulsan, South Korea",
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
    "roles": "Chàng Quỷ Của Tôi (My Demon) • Sweet Home",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/83fLAMMb1LGT8YZ4dgRI0fti3az.jpg",
    "tmdbPersonId": 1878952,
    "birthday": "1994-04-23",
    "placeOfBirth": "Suwon, Gyeonggi, South Korea",
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
    "roles": "Vẻ Đẹp Đích Thực (True Beauty)",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/kZUO2s2ZsBRYZ8acu0wMzlGHpRS.jpg",
    "tmdbPersonId": 1604826,
    "birthday": "1997-03-30",
    "placeOfBirth": "Gunpo, Gyeonggi, South Korea",
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
    "roles": "Big Mouth • Khi Nàng Say Giấc",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/eW73DbmKQrqb6xDC52oMbVehw6G.jpg",
    "tmdbPersonId": 1095818,
    "birthday": "1989-09-14",
    "placeOfBirth": "Suwon, Gyeonggi, South Korea",
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
    "roles": "Huyền thoại điện ảnh • 2 giải Oscar",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/oFvZoKI6lvU03n4YoNGAll9rkas.jpg",
    "tmdbPersonId": 31,
    "birthday": "1956-07-09",
    "placeOfBirth": "Concord, California, USA",
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
    "roles": "Nam diễn viên xuất sắc • Oscar",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/wo2hJpn04vbtmh0B9utCFdsQhxM.jpg",
    "tmdbPersonId": 6193,
    "birthday": "1974-11-11",
    "placeOfBirth": "Los Angeles, California, USA",
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
    "roles": "Tài tử Hollywood • Nhà sản xuất",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/ajNaPmXVVMJFg9GWmu6MJzTaXdV.jpg",
    "tmdbPersonId": 287,
    "birthday": "1963-12-18",
    "placeOfBirth": "Shawnee, Oklahoma, USA",
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
    "roles": "Siêu sao hành động • Mission Impossible",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/maf8PhSvDCdEwjEMbYfGpojR5RP.jpg",
    "tmdbPersonId": 500,
    "birthday": "1962-07-03",
    "placeOfBirth": "Syracuse, New York, USA",
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
    "roles": "Thuyền trưởng Jack Sparrow • Diễn viên",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/k2xt6EUxQDwYRKIyI4IBdZxfs8n.jpg",
    "tmdbPersonId": 85,
    "birthday": "1963-06-09",
    "placeOfBirth": "Owensboro, Kentucky, USA ",
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
    "roles": "Tượng đài diễn xuất • 2 giải Oscar",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/jj2Gcobpopokal0YstuCQW0ldJ4.jpg",
    "tmdbPersonId": 5292,
    "birthday": "1954-12-28",
    "placeOfBirth": "Mount Vernon, New York, USA",
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
    "roles": "Sát thủ John Wick • The Matrix",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/8RZLOyYGsoRe9p44q3xin9QkMHv.jpg",
    "tmdbPersonId": 6384,
    "birthday": "1964-09-02",
    "placeOfBirth": "Beirut, Lebanon",
    "aliases": [
      "keanu reeves",
      "john wick"
    ],
    "featured": true
  },
  {
    "slug": "will-smith",
    "name": "Will Smith",
    "englishName": "Will Smith",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "roles": "Ngôi sao Men in Black • I Am Legend",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/8TlKqbXYgHmmaEoPBJ7djJ8Rxxa.jpg",
    "tmdbPersonId": 2888,
    "birthday": "1968-09-25",
    "placeOfBirth": "Philadelphia, Pennsylvania, USA",
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
    "roles": "Kỵ sĩ bóng đêm Batman • Diễn xuất biến hóa",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/7Pxez9J8fuPd2Mn9kex13YALrCQ.jpg",
    "tmdbPersonId": 3894,
    "birthday": "1974-01-30",
    "placeOfBirth": "Haverfordwest, Pembrokeshire, Wales, UK",
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
    "roles": "Ngôi sao hành động Người vận chuyển",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/8l6lmrmKFDvhDjMJPj6tBpJdhaA.jpg",
    "tmdbPersonId": 976,
    "birthday": "1967-07-26",
    "placeOfBirth": "Shirebrook, Derbyshire, England, UK",
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
    "roles": "The Rock • Ông hoàng phòng vé",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/5QApZVV8FUFlVxQpIK3Ew6cqotq.jpg",
    "tmdbPersonId": 18918,
    "birthday": "1972-05-02",
    "placeOfBirth": "Hayward, California, USA",
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
    "roles": "Deadpool • Nam thần hài hước",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/trzgptffGvAlAT6MEu01fz47cLW.jpg",
    "tmdbPersonId": 10859,
    "birthday": "1976-10-23",
    "placeOfBirth": "Vancouver, British Columbia, Canada",
    "aliases": [
      "ryan reynolds",
      "deadpool"
    ],
    "featured": true
  },
  {
    "slug": "chris-hemsworth",
    "name": "Chris Hemsworth",
    "englishName": "Chris Hemsworth",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "roles": "Thần Sấm Thor • Vũ trụ Marvel",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/piQGdoIQOF3C1EI5cbYZLAW1gfj.jpg",
    "tmdbPersonId": 74568,
    "birthday": "1983-08-11",
    "placeOfBirth": "Melbourne, Victoria, Australia",
    "aliases": [
      "chris hemsworth",
      "thor"
    ],
    "featured": true
  },
  {
    "slug": "chris-evans",
    "name": "Chris Evans",
    "englishName": "Chris Evans",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "roles": "Captain America • Đội trưởng Mỹ",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/3bOGNsHlrswhyW79uvIHH1V43JI.jpg",
    "tmdbPersonId": 16828,
    "birthday": "1981-06-13",
    "placeOfBirth": "Boston, Massachusetts, USA",
    "aliases": [
      "chris evans",
      "captain america"
    ],
    "featured": true
  },
  {
    "slug": "robert-downey-jr",
    "name": "Robert Downey Jr.",
    "englishName": "Robert Downey Jr.",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "roles": "Iron Man • Huyền thoại MCU",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/5qHNjhtjMD4YWH3UP0rm4tKwxCL.jpg",
    "tmdbPersonId": 3223,
    "birthday": "1965-04-04",
    "placeOfBirth": "New York City, New York, USA",
    "aliases": [
      "robert downey jr.",
      "robert downey jr",
      "iron man",
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
    "roles": "Góa phụ đen Black Widow • Minh tinh",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/tgxYh3jMs5bY2Ub4d2dcp9iaz1R.jpg",
    "tmdbPersonId": 1245,
    "birthday": "1984-11-22",
    "placeOfBirth": "New York City, New York, USA",
    "aliases": [
      "scarlett johansson",
      "black widow"
    ],
    "featured": true
  },
  {
    "slug": "angelina-jolie",
    "name": "Angelina Jolie",
    "englishName": "Angelina Jolie",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "roles": "Đả nữ Maleficent • Biểu tượng quyến rũ",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/bXNxIKcJ5cNNW8QFrBPWcfTSu9x.jpg",
    "tmdbPersonId": 11701,
    "birthday": "1975-06-04",
    "placeOfBirth": "Los Angeles, California, USA ",
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
    "roles": "Interstellar • Les Misérables",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/nbccV2pMoyLTCeg5DQip24Eq0Jp.jpg",
    "tmdbPersonId": 1813,
    "birthday": "1982-11-12",
    "placeOfBirth": "Brooklyn, New York City, New York, USA",
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
    "aliases": [
      "christopher nolan",
      "dao dien nolan"
    ],
    "featured": true
  },
  {
    "slug": "cillian-murphy",
    "name": "Cillian Murphy",
    "englishName": "Cillian Murphy",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "roles": "Oppenheimer • Peaky Blinders",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/2lKs67r7FI4bPu0AXxMUJZxmUXn.jpg",
    "tmdbPersonId": 2037,
    "birthday": "1976-05-25",
    "placeOfBirth": "Douglas, Cork, Ireland",
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
    "roles": "Barbie • Harley Quinn",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/8LqG2N6j98lFGMpuYsRUAhOunSd.jpg",
    "tmdbPersonId": 234352,
    "birthday": "1990-07-02",
    "placeOfBirth": "Dalby, Queensland, Australia",
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
    "aliases": [
      "daniel craig",
      "james bond"
    ],
    "featured": true
  },
  {
    "slug": "hugh-jackman",
    "name": "Hugh Jackman",
    "englishName": "Hugh Jackman",
    "country": "Anh / Úc 🇦🇺",
    "countryCode": "us_uk",
    "roles": "Người Sói Wolverine • The Greatest Showman",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/oX6CpXmnXCHLyqsa4NEed1DZAKx.jpg",
    "tmdbPersonId": 6968,
    "birthday": "1968-10-12",
    "placeOfBirth": "Sydney, New South Wales, Australia",
    "aliases": [
      "hugh jackman",
      "wolverine"
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
    "aliases": [
      "benedict cumberbatch",
      "doctor strange",
      "sherlock"
    ],
    "featured": true
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
    "aliases": [
      "liam neeson",
      "taken"
    ],
    "featured": true
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
    "aliases": [
      "emma watson",
      "hermione"
    ],
    "featured": true
  },
  {
    "slug": "morgan-freeman",
    "name": "Morgan Freeman",
    "englishName": "Morgan Freeman",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "roles": "Huyền thoại giọng đọc & điện ảnh",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/905k0RFzH0Kd6gx8oSxRdnr6FL.jpg",
    "tmdbPersonId": 192,
    "birthday": "1937-06-01",
    "placeOfBirth": "Memphis, Tennessee, USA",
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
    "aliases": [
      "robert de niro"
    ],
    "featured": false
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
    "aliases": [
      "al pacino"
    ],
    "featured": false
  },
  {
    "slug": "matt-damon",
    "name": "Matt Damon",
    "englishName": "Matt Damon",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "roles": "Điệp viên Jason Bourne • Biên kịch",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/aCvBXTAR9B1qRjIRzMBYhhbm1fR.jpg",
    "tmdbPersonId": 1892,
    "birthday": "1970-10-08",
    "placeOfBirth": "Boston, Massachusetts, USA",
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
    "aliases": [
      "ben affleck"
    ],
    "featured": false
  },
  {
    "slug": "jennifer-lawrence",
    "name": "Jennifer Lawrence",
    "englishName": "Jennifer Lawrence",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "roles": "The Hunger Games • Nữ diễn viên Oscar",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/k6CsASaySnS3ag0Y2Ns2vqPahVn.jpg",
    "tmdbPersonId": 72129,
    "birthday": "1990-08-15",
    "placeOfBirth": "Indian Hills, Kentucky, USA",
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
    "roles": "Thiên nga đen Black Swan • Oscar",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/edPU5HxncLWa1YkgRPNkSd68ONG.jpg",
    "tmdbPersonId": 524,
    "birthday": "1981-06-09",
    "placeOfBirth": "Jerusalem, Israel",
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
    "aliases": [
      "sandra bullock"
    ],
    "featured": false
  },
  {
    "slug": "meryl-streep",
    "name": "Meryl Streep",
    "englishName": "Meryl Streep",
    "country": "Âu Mỹ 🇺🇸",
    "countryCode": "us_uk",
    "roles": "3 tượng vàng Oscar • Huyền thoại diễn xuất",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/emAAzyK1rJ6aiMi0wsWYp51EC3h.jpg",
    "tmdbPersonId": 5064,
    "birthday": "1949-06-22",
    "placeOfBirth": "Summit, New Jersey, USA",
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
    "aliases": [
      "tom hiddleston",
      "loki"
    ],
    "featured": false
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
    "aliases": [
      "hugh grant"
    ],
    "featured": false
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
    "aliases": [
      "colin firth",
      "kingsman"
    ],
    "featured": false
  },
  {
    "slug": "gary-oldman",
    "name": "Gary Oldman",
    "englishName": "Gary Oldman",
    "country": "Anh Quốc 🇬🇧",
    "countryCode": "us_uk",
    "roles": "Sirius Black • Nam diễn viên Oscar",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/yhaSM5habNNI1Tf4ALRwRk3VvSZ.jpg",
    "tmdbPersonId": 64,
    "birthday": "1958-03-21",
    "placeOfBirth": "London, England, UK",
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
    "aliases": [
      "keira knightley"
    ],
    "featured": false
  },
  {
    "slug": "ken-watanabe",
    "name": "Ken Watanabe",
    "englishName": "Ken Watanabe",
    "country": "Nhật Bản 🇯🇵",
    "countryCode": "jp",
    "roles": "Võ Sĩ Đạo Cuối Cùng • Inception",
    "tmdbPersonId": 1357546,
    "placeOfBirth": "Koide, Niigata, Japan",
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
    "roles": "Shōgun • John Wick 4 • Mortal Kombat",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/SOwDxhGnRccP2lAtssQ7TxCzOe.jpg",
    "tmdbPersonId": 9195,
    "birthday": "1960-10-12",
    "placeOfBirth": "Shinagawa, Tokyo, Japan",
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
    "aliases": [
      "takuya kimura",
      "kimutaku"
    ],
    "featured": true
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
    "aliases": [
      "hayao miyazaki",
      "ghibli"
    ],
    "featured": true
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
    "aliases": [
      "makoto shinkai"
    ],
    "featured": true
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
    "aliases": [
      "koji yakusho"
    ],
    "featured": false
  },
  {
    "slug": "tony-jaa",
    "name": "Tony Jaa",
    "englishName": "Tony Jaa",
    "country": "Thái Lan 🇹🇭",
    "countryCode": "th",
    "roles": "Vua Muay Thái • Ong Bak • Fast & Furious 7",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/wsGEaIscm7y0nvJK39rR6SnkuLr.jpg",
    "tmdbPersonId": 57207,
    "birthday": "1976-02-05",
    "placeOfBirth": "Surin, Thailand",
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
    "roles": "Tình Người Duyên Ma (Pee Mak)",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/wbBpsHWCgey3VsWw0GAAWrsYxc0.jpg",
    "tmdbPersonId": 226564,
    "birthday": "1988-12-04",
    "placeOfBirth": "Bangkok, Thailand",
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
    "roles": "Chiếc Lá Bay • Friend Zone",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/1dAa0G7gG3KbeF66HOof4DPXrpX.jpg",
    "tmdbPersonId": 127449,
    "birthday": "1992-09-30",
    "placeOfBirth": "Bangkok, Thailand",
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
    "roles": "King Khan • Vua của Bollywood",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/gc3Ul6EtVYKgjBuYAaD8U2qIcSl.jpg",
    "tmdbPersonId": 35742,
    "birthday": "1965-11-02",
    "placeOfBirth": "New Delhi, Delhi, India",
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
    "roles": "3 Chàng Ngốc (3 Idiots) • Dangal",
    "tmdbPersonId": 3802097,
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
    "roles": "Siêu sao hành động Bollywood • Tiger",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/gxKwCCcs777HzsXRpdGsBV87pXn.jpg",
    "tmdbPersonId": 42802,
    "birthday": "1965-12-27",
    "placeOfBirth": "Indore, Madhya Pradesh, India",
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
    "roles": "Nữ hoàng phòng vé Bollywood • Padmaavat",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/rzvvBQ0r6oiqDdzcsdTRB7jN4Rx.jpg",
    "tmdbPersonId": 53975,
    "birthday": "1986-01-05",
    "placeOfBirth": "Copenhagen, Denmark",
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
    "roles": "Hoa hậu Thế giới • Ngôi sao quốc tế",
    "avatarUrl": "https://image.tmdb.org/t/p/w500/hh48u9scic0nITGtzi9b6rJeAtT.jpg",
    "tmdbPersonId": 77234,
    "birthday": "1982-07-18",
    "placeOfBirth": "Jamshedpur, Jharkand, India",
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
    "aliases": [
      "akshay kumar"
    ],
    "featured": false
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
    "aliases": [
      "hrithik roshan"
    ],
    "featured": false
  }
];

export function getActorBySlug(slug: string): ActorCatalogItem | undefined {
  if (!slug) return undefined;
  const cleanSlug = slug.toLowerCase().trim();
  return ACTORS_CATALOG.find(
    (a) =>
      a.slug === cleanSlug ||
      a.name.toLowerCase() === cleanSlug ||
      (a.englishName && a.englishName.toLowerCase() === cleanSlug) ||
      a.aliases.some((alias) => alias.toLowerCase() === cleanSlug)
  );
}

export function getAllCatalogActors(): ActorCatalogItem[] {
  return ACTORS_CATALOG;
}
