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
    "bio": "Lý Hải là đạo diễn, diễn viên kiêm nhà sản xuất phim tài hoa của điện ảnh Việt Nam. Anh là người sáng lập thương hiệu điện ảnh Lật Mặt - loạt phim hành động, hài kịch ăn khách bậc nhất lịch sử phòng vé Việt.",
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
    "bio": "Hoài Linh là danh hài, nghệ sĩ ưu tú gạo cội của sân khấu và điện ảnh Việt Nam. Với lối diễn xuất dân dã, dí dỏm và chiều sâu cảm xúc, ông đã góp mặt trong hàng loạt tác phẩm được đông đảo khán giả yêu mến như Nhà có 5 nàng tiên, Dạ cổ hoài lang.",
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
    "bio": "Kaity Nguyễn là nữ diễn viên điện ảnh tài năng người Mỹ gốc Việt. Cô vụt sáng thành sao với vai chính trong Em chưa 18, sau đó tiếp tục khẳng định năng lực diễn xuất qua Tiệc trăng máu, Gái già lắm chiêu V và Người vợ cuối cùng.",
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
    "bio": "Kiều Minh Tuấn là nam diễn viên điện ảnh nổi tiếng của Việt Nam với phong cách diễn xuất tự nhiên và đa dạng. Anh ghi dấu ấn qua các tác phẩm ăn khách như Em chưa 18, Chị Mười Ba, Tiệc trăng máu và Nghề siêu dễ.",
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
    "bio": "Thu Trang là nữ diễn viên hài, nhà sản xuất phim hàng đầu Việt Nam, được mệnh danh là 'Hoa hậu hài'. Cô thành công rực rỡ với chuỗi phim Chị Mười Ba, Tiệc trăng máu, Nghề siêu dễ và Con Nhót mót chồng.",
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
    "bio": "Việt Hương là nữ nghệ sĩ hài kiêm diễn viên điện ảnh kỳ cựu của Việt Nam. Cô được yêu thích qua các vai diễn đa tính cách, từ hài hước đến tâm lý sâu sắc trong Nhà có 5 nàng tiên, Em là bà nội của anh và Ma Da.",
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
    "bio": "Tuấn Trần là nam diễn viên điện ảnh trẻ thực lực của Việt Nam. Anh khẳng định vị trí ngôi sao phòng vé qua vai Quắn trong Bố già và vai Sâu trong bộ phim Mai của đạo diễn Trấn Thành, đoạt nhiều giải thưởng danh giá.",
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
    "bio": "Miu Lê là nữ ca sĩ kiêm diễn viên điện ảnh tài sắc của Việt Nam. Cô để lại dấu ấn đậm nét qua vai chính trong siêu phẩm Em là bà nội của anh, Bạn gái tôi là sếp và Cô gái đến từ hôm qua.",
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
    "bio": "Lý Liên Kiệt là nhà vô địch wushu kiêm huyền thoại võ thuật điện ảnh thế giới. Ông đưa văn hóa võ thuật Trung Hoa vươn tầm quốc tế qua Hoàng Phi Hồng, Thiếu Lâm Tự, Tinh Võ Anh Hùng và Vũ khí tối thượng 4.",
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
    "bio": "Triệu Lệ Dĩnh là nữ diễn viên truyền hình hàng đầu Trung Quốc, được mệnh danh là 'Nữ hoàng rating'. Cô nổi tiếng qua hàng loạt bom tấn cổ trang và hiện đại như Hoa Thiên Cốt, Sở Kiều truyện, Minh Lan truyện và Dữ phượng hành.",
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
    "bio": "Dương Mịch là một trong tứ tiểu hoa đán nổi tiếng nhất của màn ảnh Trung Quốc. Cô ghi dấu ấn sâu đậm qua các bộ phim truyền hình đình đám như Cung tỏa tâm ngọc, Tam sinh tam thế thập lý đào hoa và Hộc Châu phu nhân.",
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
    "bio": "Tiêu Chiến là nam diễn viên, ca sĩ thần tượng nổi tiếng hàng đầu Trung Quốc. Anh trở thành hiện tượng toàn châu Á với vai Ngụy Vô Tiện trong Trần Tình Lệnh, sau đó tiếp tục thành công với Đấu La Đại Lục và Ngọc Cốt Dao.",
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
    "bio": "Vương Nhất Bác là nam diễn viên, ca sĩ đa tài người Trung Quốc. Anh nổi danh khắp châu Á qua vai Lam Vong Cơ trong Trần Tình Lệnh và các phim điện ảnh chất lượng như Vô Danh, Trường Không Chi Vương.",
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
    "bio": "Địch Lệ Nhiệt Ba là nữ diễn viên nổi bật thuộc thế hệ hoa đán 9x của Trung Quốc với nhan sắc lai Tây ấn tượng. Cô nổi tiếng qua Tam sinh tam thế chẩm thượng thư, Em là niềm kiêu hãnh của anh và Ngự giao ký.",
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
    "bio": "Dương Dương là nam diễn viên nổi tiếng của màn ảnh Hoa ngữ với ngoại hình điển trai và phong độ ổn định. Anh ghi dấu ấn qua Yêu em từ cái nhìn đầu tiên, Toàn chức cao thủ, Em là niềm kiêu hãnh của anh và Thả thí thiên hạ.",
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
    "bio": "Lưu Đức Hoa là một trong Tứ Đại Thiên Vương huyền thoại của làng giải trí Hồng Kông. Anh là biểu tượng bất hủ của điện ảnh châu Á với hàng trăm vai diễn kinh điển trong Vô gian đạo, Thần bài và Tân Thiếu Lâm Tự.",
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
    "bio": "Cổ Thiên Lạc là nam diễn viên, nhà sản xuất phim quyền lực của điện ảnh Hồng Kông. Anh nổi tiếng từ thời TVB với Thần điêu đại hiệp, Cỗ máy thời gian và hàng loạt bom tấn hành động hình sự Sát Phá Lang, Đội chống tham nhũng.",
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
    "bio": "Song Kang-ho là một nam diễn viên nổi tiếng người Hàn Quốc.",
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
    "bio": "Lee Byung-hun là một trong những nam diễn viên hàng đầu của điện ảnh và truyền hình Hàn Quốc. Anh ghi dấu ấn sâu đậm qua nhiều tác phẩm nổi tiếng như Mr. Sunshine, Squid Game, I Saw the Devil cùng các bom tấn Hollywood như G.I. Joe và Red 2. Anh từng giành nhiều giải thưởng nghệ thuật danh giá Baeksang và Grand Bell.",
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
    "bio": "Gong Yoo là nam diễn viên điện ảnh và truyền hình xuất sắc hàng đầu Hàn Quốc. Anh ghi dấu ấn bất hủ qua siêu phẩm truyền hình Yêu tinh (Goblin), bom tấn điện ảnh Chuyến tàu sinh tử (Train to Busan) và Tiệm cà phê hoàng tử.",
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
    "bio": "Lee Jung-jae là nam diễn viên và đạo diễn kỳ cựu của Hàn Quốc. Anh trở thành ngôi sao quốc tế vang danh qua vai chính Seong Gi-hun trong hiện tượng toàn cầu Squid Game, mang về giải Primetime Emmy danh giá. Trước đó, anh nổi danh qua loạt phim điện ảnh kinh điển như New World, The Thieves, Assassination và Hunt.",
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
    "bio": "Hyun Bin là nam diễn viên hàng đầu của làn sóng Hallyu Hàn Quốc. Anh nổi tiếng toàn châu Á qua các bộ phim truyền hình đình đám như Secret Garden, Crash Landing on You và Memories of the Alhambra. Trong mảng điện ảnh, anh ghi dấu ấn với các tác phẩm hành động ăn khách như Confidential Assignment và The Point Men.",
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
    "bio": "Kim Soo-hyun là một trong những nam diễn viên truyền hình được trả thù lao cao nhất và được yêu mến nhất tại Hàn Quốc. Tên tuổi của anh gắn liền với các siêu phẩm châu Á như My Love from the Star, The Moon Embracing the Sun, It's Okay to Not Be Okay và Queen of Tears. Anh sở hữu nhiều giải thưởng Baeksang danh giá.",
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
    "bio": "Jun Ji-hyun (Gianna Jun) là một trong những nữ diễn viên mang tính biểu tượng nhất của điện ảnh và truyền hình Hàn Quốc. Cô vụt sáng thành sao hạng A nhờ bộ phim hài lãng mạn kinh điển My Sassy Girl và tiếp tục khẳng định vị thế với My Love from the Star, Legend of the Blue Sea cùng bom tấn Assassination.",
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
    "bio": "Song Hye-kyo là minh tinh biểu tượng của làn sóng Hallyu Hàn Quốc suốt hơn hai thập kỷ. Cô chinh phục khán giả châu Á qua Trái tim mùa thu, Ngôi nhà hạnh phúc, Hậu duệ mặt trời và siêu phẩm báo thù The Glory.",
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
    "bio": "Park Seo-joon là nam diễn viên truyền hình và điện ảnh hàng đầu Hàn Quốc. Anh nổi tiếng toàn cầu qua các bộ phim ăn khách như Thư ký Kim sao thế?, Tầng lớp Itaewon, Kill Me Heal Me và xuất hiện trong phim đoạt giải Oscar Ký sinh trùng (Parasite).",
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
    "bio": "Lee Min-ho là một trong những ngôi sao Hallyu nổi tiếng nhất châu Á và thế giới. Tên tuổi anh gắn liền với các hiện tượng truyền hình như Vườn sao băng (Boys Over Flowers), Thợ săn thành phố (City Hunter), Người thừa kế và Quân vương bất diệt.",
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
    "bio": "Han So-hee là nữ diễn viên nổi bật của màn ảnh Hàn Quốc với vẻ đẹp cá tính và khả năng biến hóa đa dạng. Cô nổi tiếng qua Thế giới hôn nhân, Dẫu biết (Nevertheless), My Name và Sinh vật Gyeongseong.",
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
    "bio": "Song Kang là nam diễn viên trẻ nổi bật của màn ảnh Hàn Quốc, được mệnh danh là 'con cưng Netflix'. Anh tạo tiếng vang lớn qua các loạt phim ăn khách như Love Alarm, Sweet Home, Nevertheless, Navillera và My Demon. Khả năng biến hóa đa dạng từ lãng mạn đến giật gân giúp anh thu hút lượng lớn người hâm mộ quốc tế.",
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
    "bio": "Cha Eun-woo là nam ca sĩ kiêm diễn viên nổi tiếng người Hàn Quốc, thành viên nhóm Astro. Anh được mệnh danh là 'gương mặt thiên tài' và ghi dấu ấn qua Người đẹp Gangnam (My ID is Gangnam Beauty), Vẻ đẹp đích thực (True Beauty).",
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
    "bio": "Lee Jong-suk là nam diễn viên thực lực hàng đầu của màn ảnh Hàn Quốc. Anh sở hữu hàng loạt tác phẩm đình đám đạt rating cao như Đôi tai ngoại cảm (I Can Hear Your Voice), Pinocchio, W - Hai thế giới và Big Mouth.",
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
    "bio": "Tom Hanks là một trong những nam diễn viên xuất sắc và được kính trọng nhất trong lịch sử điện ảnh thế giới. Ông từng đoạt hai giải Oscar Nam diễn viên chính xuất sắc nhất liên tiếp qua Philadelphia (1993) và Forrest Gump (1994). Tên tuổi ông gắn liền với nhiều tác phẩm kinh điển như Saving Private Ryan, Cast Away và loạt phim hoạt hình Toy Story.",
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
    "bio": "Leonardo DiCaprio là nam diễn viên kiêm nhà sản xuất phim người Mỹ từng đoạt giải Oscar và nhiều giải Quả cầu vàng. Anh nổi tiếng toàn cầu sau bom tấn Titanic (1997) và ghi dấu ấn sâu sắc qua sự hợp tác cùng đạo diễn Martin Scorsese trong Gangs of New York, The Aviator, The Departed, The Wolf of Wall Street cùng đỉnh cao The Revenant.",
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
    "bio": "Brad Pitt là một trong những tài tử điện ảnh nổi tiếng và quyền lực nhất Hollywood. Anh từng đoạt hai giải Oscar ở cả vai trò diễn viên và nhà sản xuất phim. Sự nghiệp của anh nổi bật với các tác phẩm đình đám như Fight Club, Se7en, Ocean's Eleven, Inglourious Basterds và Once Upon a Time in Hollywood.",
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
    "bio": "Tom Cruise là một trong những siêu sao hành động vĩ đại nhất lịch sử điện ảnh Hollywood với các kỷ lục phòng vé toàn cầu. Anh được biết đến nhiều nhất qua loạt phim bom tấn Mission: Impossible, Top Gun: Maverick, Minority Report và Jerry Maguire. Anh nổi tiếng với việc tự mình thực hiện hầu hết các cảnh hành động nguy hiểm không cần người đóng thế.",
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
    "bio": "Johnny Depp là nam diễn viên tài hoa người Mỹ nổi tiếng với khả năng hóa thân thành những nhân vật độc đáo, kỳ dị và giàu cá tính. Vai diễn thuyền trưởng Jack Sparrow trong loạt bom tấn Pirates of the Caribbean đã trở thành biểu tượng điện ảnh toàn cầu. Anh cũng gắn bó với đạo diễn Tim Burton qua các tác phẩm Edward Scissorhands, Sweeney Todd và Alice in Wonderland.",
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
    "bio": "Denzel Washington là nam diễn viên gạo cội từng 2 lần đoạt giải Oscar. Ông là biểu tượng của tài năng diễn xuất và sự đĩnh đạc qua Training Day, Glory, Malcolm X và loạt phim hành động The Equalizer.",
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
    "bio": "Keanu Reeves là nam diễn viên người Canada được đông đảo khán giả thế giới yêu mến nhờ phong thái khiêm nhường cùng sự nghiệp hành động lẫy lừng. Anh là linh hồn của hai thương hiệu điện ảnh mang tính biểu tượng văn hóa đại chúng: The Matrix (vai Neo) và John Wick. Ngoài ra, anh còn ghi dấu ấn trong Speed, Constantine và Point Break.",
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
    "bio": "Will Smith là nam diễn viên đoạt giải Oscar kiêm ngôi sao giải trí đa tài hàng đầu nước Mỹ. Anh thành công rực rỡ qua Men in Black, Ngày độc lập (Independence Day), I Am Legend và King Richard.",
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
    "bio": "Christian Bale là nam diễn viên người Anh từng đoạt giải Oscar, nổi tiếng với phương pháp diễn xuất nhập tâm triệt để và khả năng biến đổi ngoại hình phi thường vì vai diễn. Anh được đông đảo công chúng nhớ đến với vai Batman / Bruce Wayne trong bộ ba The Dark Knight của Christopher Nolan, cùng các màn trình diễn xuất sắc trong American Psycho, The Fighter và Ford v Ferrari.",
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
    "bio": "Jason Statham là ngôi sao hành động cự phách người Anh với các pha cận chiến mãn nhãn. Anh là gương mặt quen thuộc qua Người vận chuyển (The Transporter), Kẻ lập dị (Crank), The Expendables và Fast & Furious.",
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
    "bio": "Dwayne Johnson ('The Rock') là cựu đô vật WWE kiêm ngôi sao hành động có doanh thu phòng vé cao nhất thế giới. Anh là trụ cột của loạt phim Fast & Furious, Jumanji, Moana và Black Adam.",
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
    "bio": "Ryan Reynolds là nam diễn viên, nhà sản xuất kiêm doanh nhân người Canada nổi danh với nét duyên dáng hài hước đặc trưng. Anh gặt hái thành công vang dội toàn cầu qua vai diễn siêu anh hùng phá cách Deadpool trong vũ trụ điện ảnh Marvel. Ngoài ra, anh còn ghi điểm qua các tựa phim ăn khách như Free Guy, Red Notice và The Proposal.",
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
    "bio": "Chris Hemsworth là nam tài tử người Úc nổi tiếng khắp thế giới qua vai Thần Sấm Thor trong Vũ trụ Điện ảnh Marvel (MCU). Bên cạnh thành công rực rỡ với Marvel, anh còn khẳng định vị thế ngôi sao hành động hạng A qua loạt phim Extraction đình đám trên Netflix, bom tấn Rush, Snow White and the Huntsman và Furiosa: A Mad Max Saga.",
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
    "bio": "Chris Evans là nam diễn viên người Mỹ đã khắc họa thành công nhân vật biểu tượng Captain America (Steve Rogers) trong Vũ trụ Điện ảnh Marvel suốt một thập kỷ. Sau khi khép lại hành trình cùng MCU, anh tiếp tục thể hiện tài năng qua các tác phẩm đa dạng như Knives Out, Defending Jacob, Snowpiercer và Ghosted.",
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
    "bio": "Robert Downey Jr. là nam diễn viên người Mỹ từng đoạt giải Oscar, được xem là biểu tượng mở màn và dẫn dắt sự bùng nổ của Vũ trụ Điện ảnh Marvel với vai Tony Stark / Iron Man. Anh cũng gặt hái thành công rực rỡ qua hình tượng thám tử Sherlock Holmes của Guy Ritchie và tượng vàng Oscar qua vai Lewis Strauss trong bom tấn Oppenheimer (2023).",
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
    "bio": "Scarlett Johansson là một trong những nữ diễn viên có doanh thu phòng vé cao nhất mọi thời đại và từng nhận được hai đề cử Oscar cùng một năm. Cô nổi tiếng toàn cầu với vai diễn Natasha Romanoff / Black Widow trong Vũ trụ Điện ảnh Marvel, đồng thời khẳng định tài năng diễn xuất thượng thừa qua Lost in Translation, Her, Marriage Story và Jojo Rabbit.",
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
    "bio": "Angelina Jolie là một trong những biểu tượng nữ quyền và minh tinh nổi tiếng nhất thế giới. Cô đoạt giải Oscar và ghi dấu ấn bất hủ qua Lara Croft: Tomb Raider, Ông bà Smith (Mr. & Mrs. Smith) và Tiên Hắc Ám (Maleficent).",
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
    "bio": "Anne Hathaway là nữ diễn viên người Mỹ từng đoạt giải Oscar, giải Quả cầu vàng và giải Emmy. Cô nổi danh từ các bộ phim thanh xuân lãng mạn như The Princess Diaries, The Devil Wears Prada rồi vươn lên đỉnh cao nghệ thuật với vai Fantine trong Les Misérables, Catwoman trong The Dark Knight Rises và nữ khoa học gia trong Interstellar.",
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
    "bio": "Christopher Nolan là một trong những đạo diễn, nhà biên kịch và nhà sản xuất phim xuất sắc và có tầm ảnh hưởng lớn nhất thế kỷ 21. Các tác phẩm của ông kết hợp hoàn hảo giữa tính nghệ thuật hàn lâm và trải nghiệm điện ảnh choáng ngợp, tiêu biểu như The Dark Knight Trilogy, Inception, Interstellar, Dunkirk và kiệt tác đoạt 7 giải Oscar Oppenheimer.",
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
    "bio": "Cillian Murphy là nam diễn viên tài năng người Ireland từng đoạt giải Oscar Nam diễn viên chính xuất sắc nhất qua vai nhà vật lý J. Robert Oppenheimer trong bom tấn Oppenheimer (2023). Anh còn ghi dấu ấn bất hủ trên màn ảnh nhỏ qua vai thủ lĩnh Thomas Shelby trong loạt phim truyền hình Peaky Blinders cùng các phim điện ảnh 28 Days Later, Inception và Dunkirk.",
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
    "bio": "Margot Robbie là nữ diễn viên kiêm nhà sản xuất phim tài năng người Úc, từng nhận nhiều đề cử giải Oscar và BAFTA. Cô gây ấn tượng mạnh qua The Wolf of Wall Street, tạo nên cơn sốt toàn cầu với vai Harley Quinn trong vũ trụ DC và tỏa sáng rực rỡ với cương vị sản xuất lẫn đóng chính trong hiện tượng phòng vé Barbie (2023).",
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
    "bio": "Daniel Craig là nam diễn viên người Anh nổi tiếng khắp thế giới nhờ 15 năm đảm nhận vai điệp viên huyền thoại James Bond (007) qua 5 phần phim từ Casino Royale (2006) đến No Time to Die (2021). Sau khi hoàn thành vai 007, anh tiếp tục gặt hái thành công lớn với vai thám tử Benoit Blanc trong loạt phim trinh thám Knives Out và Glass Onion.",
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
    "bio": "Hugh Jackman là nam diễn viên, ca sĩ và vũ công tài hoa người Úc từng nhận đề cử giải Oscar và thắng giải Tony, Emmy. Anh được đông đảo người hâm mộ toàn cầu tôn vinh qua 24 năm hóa thân thành dị nhân Wolverine / Logan trong loạt phim X-Men và Deadpool & Wolverine, cùng các tác phẩm âm nhạc, chính kịch kinh điển như The Greatest Showman, Les Misérables và The Prestige.",
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
    "bio": "Benedict Cumberbatch là nam diễn viên người Anh xuất chúng từng nhận nhiều đề cử Oscar và đoạt các giải thưởng Emmy, BAFTA. Anh vụt sáng với vai thám tử Sherlock Holmes thời hiện đại trong loạt phim truyền hình Sherlock của BBC và gia nhập Vũ trụ Điện ảnh Marvel với vai Phù thủy Tối thượng Doctor Strange. Anh cũng thể hiện khả năng diễn xuất đỉnh cao trong The Imitation Game và The Power of the Dog.",
    "aliases": [
      "benedict cumberbatch",
      "doctor strange",
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
    "bio": "Liam Neeson là nam diễn viên gạo cội người Bắc Ireland từng được đề cử giải Oscar cho vai chính Oskar Schindler trong kiệt tác Schindler's List của Steven Spielberg. Ở giai đoạn sau của sự nghiệp, ông tái định hình hình tượng thành ngôi sao hành động báo thù hàng đầu thế giới qua thương hiệu Taken, cùng các bộ phim nổi tiếng như Batman Begins, Star Wars: Episode I và Non-Stop.",
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
    "bio": "Emma Watson là nữ diễn viên và nhà hoạt động xã hội người Anh, nổi tiếng toàn cầu từ tuổi thiếu niên qua vai phù thủy thông minh Hermione Granger trong trọn bộ 8 phần phim Harry Potter. Sau loạt phim phù thủy, cô tiếp tục khẳng định tên tuổi qua các tác phẩm thành công như The Perks of Being a Wallflower, Beauty and the Beast và Little Women.",
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
    "bio": "Morgan Freeman là nam diễn viên huyền thoại đoạt giải Oscar với chất giọng truyền cảm nổi tiếng bậc nhất thế giới. Ông góp mặt trong các kiệt tác bất hủ như The Shawshank Redemption, Se7en và bộ ba The Dark Knight.",
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
    "bio": "Robert De Niro là một trong những huyền thoại vĩ đại nhất của lịch sử điện ảnh thế giới với hai tượng vàng Oscar danh giá. Sự nghiệp lừng lẫy của ông gắn liền với phong cách diễn xuất nhập tâm trong các tuyệt phẩm tội phạm và chính kịch như The Godfather Part II, Taxi Driver, Raging Bull, Goodfellas, Heat, The Irishman và Killers of the Flower Moon.",
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
    "bio": "Al Pacino là tượng đài diễn xuất của nền điện ảnh Mỹ, chủ nhân của bộ ba giải thưởng nghệ thuật danh giá Triple Crown of Acting (Oscar, Emmy, Tony). Ông ghi dấu ấn bất hủ trong lịch sử văn hóa đại chúng qua vai Michael Corleone trong bộ ba The Godfather, gã trùm Tony Montana trong Scarface cùng các tác phẩm kinh điển Dog Day Afternoon, Serpico, Scent of a Woman và Heat.",
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
    "bio": "Matt Damon là nam diễn viên, nhà biên kịch kiêm nhà sản xuất phim người Mỹ từng đoạt giải Oscar cho Kịch bản gốc xuất sắc nhất với Good Will Hunting (1997). Anh là ngôi sao dẫn dắt thương hiệu điệp viên hành động Jason Bourne, đồng thời đóng chính trong hàng loạt tác phẩm đình đám như Saving Private Ryan, The Departed, The Martian, Interstellar và Oppenheimer.",
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
    "bio": "Ben Affleck là nam diễn viên, nhà biên kịch kiêm đạo diễn người Mỹ từng đoạt hai giải Oscar (với Good Will Hunting và Argo). Anh đảm nhận vai diễn siêu anh hùng Batman / Bruce Wayne trong Vũ trụ Điện ảnh DC (DCEU), đồng thời đạo diễn và đóng chính trong nhiều tác phẩm giật gân chất lượng cao như The Town, Gone Girl và Air.",
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
    "bio": "Jennifer Lawrence là nữ diễn viên đoạt giải Oscar trẻ tuổi hàng đầu của Hollywood. Cô là ngôi sao của chuỗi phim Đấu trường sinh tử (The Hunger Games), loạt phim X-Men và tác phẩm Silver Linings Playbook.",
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
    "bio": "Natalie Portman là nữ minh tinh đoạt giải Oscar người Mỹ gốc Israel. Cô ghi dấu ấn huyền thoại từ nhỏ qua Léon: The Professional, ba phần tiền truyện Star Wars, Black Swan và vai Jane Foster trong Thor của Marvel.",
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
    "bio": "Sandra Bullock là một trong những minh tinh Hollywood được mến mộ nhất và từng là nữ diễn viên có thu nhập cao nhất thế giới. Cô đoạt giải Oscar Nữ diễn viên chính xuất sắc nhất cho vai diễn trong The Blind Side (2009). Cô sở hữu gia tài phim ảnh phong phú từ hành động kinh điển Speed, hài hước Miss Congeniality cho đến kiệt tác không gian Gravity và hiện tượng Bird Box.",
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
    "bio": "Meryl Streep được tôn vinh là nữ diễn viên vĩ đại nhất trong lịch sử điện ảnh hiện đại với kỷ lục 21 lần đề cử Oscar (3 lần chiến thắng). Bà chinh phục khán giả qua Kramer vs. Kramer, The Devil Wears Prada và The Iron Lady.",
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
    "bio": "Tom Hiddleston là nam diễn viên người Anh được mến mộ trên toàn cầu qua vai diễn Thần Lừa Lọc Loki trong Vũ trụ Điện ảnh Marvel và loạt phim truyền hình Loki trên Disney+. Anh cũng được đánh giá rất cao trên sân khấu kịch nghệ và các tác phẩm điện ảnh, truyền hình chất lượng như The Night Manager, Crimson Peak và Kong: Skull Island.",
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
    "bio": "Hugh Grant là nam tài tử người Anh từng đoạt giải Quả cầu vàng và BAFTA, được mệnh danh là 'ông hoàng phim hài lãng mạn' thập niên 1990 và 2000. Tên tuổi của anh gắn liền với các tác phẩm kinh điển như Four Weddings and a Funeral, Notting Hill, Love Actually và Bridget Jones's Diary. Những năm gần đây, anh chuyển mình ấn tượng qua Paddington 2, The Gentlemen và Wonka.",
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
    "bio": "Colin Firth là nam diễn viên kỳ cựu người Anh từng đoạt giải Oscar, Quả cầu vàng và ba giải BAFTA. Ông chạm tới đỉnh cao sự nghiệp với vai Vua George VI trong The King's Speech (2010), đồng thời được công chúng yêu mến qua vai quý tộc Darcy trong Pride and Prejudice, loạt phim tình cảm Bridget Jones và siêu điệp viên Harry Hart trong Kingsman: The Secret Service.",
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
    "bio": "Gary Oldman là nam diễn viên bậc thầy về khả năng biến hóa người Anh, từng đoạt giải Oscar. Ông nổi tiếng qua vai Sirius Black trong Harry Potter, Thanh tra Gordon trong The Dark Knight và Thủ tướng Winston Churchill trong Darkest Hour.",
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
    "bio": "Keira Knightley là nữ diễn viên tài sắc người Anh từng hai lần nhận đề cử giải Oscar. Cô nổi danh toàn cầu qua vai Elizabeth Swann trong loạt phim bom tấn Pirates of the Caribbean và trở thành gương mặt tiêu biểu của dòng phim chuyển thể lịch sử qua Pride & Prejudice, Atonement, Anna Karenina cùng The Imitation Game.",
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
    "bio": "Ken Watanabe là một trong những diễn viên Nhật Bản kỳ cựu và thành công nhất tại Hollywood. Ông từng nhận đề cử giải Oscar cho Nam diễn viên phụ xuất sắc nhất qua The Last Samurai, đồng thời tham gia các bom tấn như Inception, Batman Begins và Godzilla.",
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
    "bio": "Hiroyuki Sanada là diễn viên kiêm võ sĩ huyền thoại của điện ảnh Nhật Bản và Hollywood. Ông giành giải Emmy lịch sử qua vai chính trong loạt phim Shōgun (2024), đồng thời góp mặt trong The Last Samurai, Avengers: Endgame và John Wick 4.",
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
    "bio": "Takuya Kimura là nam ca sĩ kiêm diễn viên huyền thoại của Nhật Bản, được xem là một trong những biểu tượng văn hóa đại chúng có sức ảnh hưởng sâu rộng nhất châu Á. Anh liên tục xác lập kỷ lục tỷ suất người xem truyền hình qua các bộ phim kinh điển như Long Vacation, Love Generation, HERO và Good Luck!!. Trong điện ảnh, anh ghi dấu ấn với 2046 của Vương Gia Vệ và Howl's Moving Castle.",
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
    "bio": "Hayao Miyazaki là đạo diễn, họa sĩ hoạt hình và nhà đồng sáng lập huyền thoại của Studio Ghibli. Ông được tôn vinh là một trong những nhà làm phim hoạt hình vĩ đại nhất lịch sử nhân loại với các kiệt tác lay động triệu con tim như Spirited Away, My Neighbor Totoro, Princess Mononoke, Howl's Moving Castle và The Boy and the Heron, từng đoạt hai giải Oscar cho Phim hoạt hình hay nhất.",
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
    "bio": "Makoto Shinkai là đạo diễn, nhà biên kịch và nhà làm phim hoạt hình đương đại hàng đầu Nhật Bản, được mệnh danh là 'phù thủy của những nỗi buồn và ánh sáng'. Ông tạo nên bước ngoặt lịch sử phòng vé thế giới với kiệt tác Your Name (2016), tiếp nối thành công rực rỡ qua 5 Centimeters per Second, Weathering with You và Suzume.",
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
    "bio": "Koji Yakusho là một trong những nam diễn viên điện ảnh vĩ đại nhất Nhật Bản. Ông đã đoạt giải Nam diễn viên xuất sắc nhất tại Liên hoan phim Cannes 2023 cho vai diễn trong Perfect Days của đạo diễn Wim Wenders. Xuyên suốt sự nghiệp hơn 4 thập kỷ, ông tỏa sáng trong nhiều kiệt tác như Shall We Dance?, Cure, The Eel, Babel và 13 Assassins.",
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
    "bio": "Tony Jaa là võ sĩ muay Thái kiêm ngôi sao hành động huyền thoại của điện ảnh Thái Lan. Anh đưa điện ảnh võ thuật Thái Lan vươn tầm thế giới qua sê-ri Ong-Bak, Tom-Yum-Goong và các phim Hollywood như Fast & Furious 7.",
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
    "bio": "Mario Maurer là nam diễn viên, người mẫu nổi tiếng mang hai dòng máu Thái - Đức. Anh là hoàng tử phòng vé Thái Lan qua các kiệt tác tình cảm và kinh dị hài như The Love of Siam, A Little Thing Called Love và Tình người duyên ma (Pee Mak).",
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
    "bio": "Baifern Pimchanok là nữ minh tinh hàng đầu của làng giải trí Thái Lan với nhan sắc rực rỡ và diễn xuất thuyết phục. Cô nổi tiếng khắp châu Á qua Mối tình đầu (A Little Thing Called Love), Chiếc lá cuốn bay và Yêu nhầm bạn thân (Friend Zone).",
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
    "bio": "Shah Rukh Khan là 'Vua của Bollywood' (King Khan), một trong những ngôi sao điện ảnh vĩ đại và quyền lực nhất thế giới. Ông là biểu tượng văn hóa toàn cầu qua kiệt tác Dilwale Dulhania Le Jayenge, My Name Is Khan, Pathaan và Jawan.",
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
    "bio": "Aamir Khan là diễn viên, đạo diễn và nhà sản xuất phim huyền thoại của điện ảnh Ấn Độ. Được mệnh danh là 'Quý ông hoàn hảo', ông vang danh thế giới qua các tác phẩm kinh điển như Ba chàng ngốc (3 Idiots), PK, Cậu bé đặc biệt và Dangal.",
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
    "bio": "Salman Khan là một trong 'Ba vị Khan' thống trị phòng vé Bollywood suốt ba thập kỷ. Với phong cách hành động mạnh mẽ và lôi cuốn, ông sở hữu hàng loạt bom tấn phá kỷ lục doanh thu như Dabangg, Bajrangi Bhaijaan và Sultan.",
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
    "bio": "Deepika Padukone là một trong những nữ minh tinh được trả cát-xê cao nhất và quyền lực nhất điện ảnh Ấn Độ. Cô ghi dấu ấn qua các siêu phẩm như Om Shanti Om, Padmaavat, Bajirao Mastani và bom tấn Hollywood xXx: Return of Xander Cage.",
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
    "bio": "Priyanka Chopra là Hoa hậu Thế giới 2000, nữ diễn viên hàng đầu của Bollywood và ngôi sao quốc tế tại Hollywood. Cô thành công qua sê-ri truyền hình Quantico của Mỹ, phim điện ảnh Baywatch, Matrix Resurrections và Citadel.",
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
    "bio": "Akshay Kumar là một trong những ngôi sao điện ảnh tài năng, sung sức và có doanh thu cao nhất của nền điện ảnh Bollywood (Ấn Độ). Với sự nghiệp hơn 100 bộ phim, anh ghi dấu ấn đậm nét qua các thể loại hành động mạo hiểm, hài kịch duyên dáng và các phim chính kịch xã hội ý nghĩa như Airlift, Rustom, Pad Man, Toilet: Ek Prem Katha và loạt phim Khiladi.",
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
    "bio": "Hrithik Roshan là một trong những nam tài tử hàng đầu và vũ công xuất sắc nhất của nền điện ảnh Bollywood. Anh nổi tiếng với ngoại hình cuốn hút cùng khả năng diễn xuất đa tài, từng đoạt 6 giải Filmfare. Các tác phẩm tiêu biểu của anh bao gồm Kaho Naa... Pyaar Hai, Kabhi Khushi Kabhie Gham, Koi... Mil Gaya, Dhoom 2, Jodhaa Akbar, Super 30 và bom tấn hành động War.",
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
    "bio": "Ngô Thanh Vân (Veronica Ngo) là nữ diễn viên, ca sĩ kiêm đạo diễn, nhà sản xuất phim hàng đầu Việt Nam, được mệnh danh là \"Đả nữ màn ảnh Việt\". Cô khẳng định tên tuổi qua Dòng Máu Anh Hùng, Bẫy Rồng, Hai Phượng, đồng thời tham gia nhiều dự án bom tấn quốc tế như Star Wars: The Last Jedi, Bright và The Old Guard.",
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
    "bio": "Hứa Vĩ Văn là nam diễn viên điện ảnh và truyền hình kỳ cựu của Việt Nam, được khán giả yêu mến nhờ vẻ ngoài lịch lãm và nét diễn điềm đạm. Anh góp mặt trong nhiều tác phẩm điện ảnh ăn khách như Em Là Bà Nội Của Anh, Tiệc Trăng Máu, Chàng Trai Năm Ấy và Nghề Siêu Dễ.",
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
    "bio": "Hồng Ánh là một trong những nữ diễn viên xuất sắc và giàu thành tựu nhất của điện ảnh Việt Nam đương đại với nhiều giải thưởng Cánh Diều Vàng và Bông Sen Vàng. Các tác phẩm tiêu biểu của cô gồm Đời Cát, Người Đàn Bà Mộng Du, Trăng Nơi Đáy Giếng, Tháng Năm Rực Rỡ và Tiệc Trăng Máu.",
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
    "bio": "Huy Khánh là nam diễn viên kiêm người dẫn chương trình quen thuộc của màn ảnh Việt Nam. Anh nổi tiếng từ bộ phim Dốc Tình và sau đó liên tục ghi dấu ấn trong nhiều dự án điện ảnh hài hước, lãng mạn như Cô Dâu Đại Chiến, Em Chưa 18, Lật Mặt và Tiệc Trăng Máu.",
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
    "bio": "Diệu Nhi là nữ diễn viên hài hước, tài năng và duyên dáng của sân khấu kịch lẫn điện ảnh Việt Nam. Cô gặt hái nhiều thành công qua các bộ phim điện ảnh ăn khách như Gái Già Lắm Chiêu, Vu Quy Đại Náo, Bẫy Ngọt Ngào, Chị Mười Ba và Gặp Lại Chị Bầu.",
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
    "bio": "Bùi Anh Tú (Anh Tú Atus) là nam diễn viên kiêm ca sĩ điển trai của làng giải trí Việt Nam. Anh được khán giả yêu thích qua loạt phim điện ảnh hài hước, thanh xuân như Siêu Lừa Gặp Siêu Lầy, Cua Lại Vợ Bầu và Gặp Lại Chị Bầu cùng nhiều dự án truyền hình nổi tiếng.",
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
    "bio": "Quốc Trường là nam diễn viên thực lực người Cần Thơ, tạo nên cơn sốt trên màn ảnh nhỏ với vai Vũ trong hiện tượng truyền hình Về Nhà Đi Con. Trong điện ảnh, anh tiếp tục khẳng định bản lĩnh qua các vai diễn phức tạp trong Đôi Mắt Âm Dương và Bẫy Ngọt Ngào.",
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
    "bio": "Phương Anh Đào là ngọc nữ thực lực của điện ảnh Việt Nam, nổi tiếng với khả năng diễn xuất biến hóa nội tâm sâu sắc. Tên tuổi của cô gắn liền với các tác phẩm đình đám như Nhắm Mắt Thấy Mùa Hè, Chàng Vợ Của Em, Bằng Chứng Vô Hình, Tro Tàn Rực Rỡ và bom tấn phòng vé Mai.",
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
    "bio": "Khả Ngân là nữ diễn viên tài sắc của màn ảnh Việt Nam, khởi đầu từ hình tượng hot girl thể thao trước khi khẳng định tài năng diễn xuất. Cô ghi dấu ấn mạnh mẽ qua bản làm lại Hậu Duệ Mặt Trời (Việt Nam), 100 Ngày Bên Em, 11 Tháng 5 Ngày và Gia Đình Mình Vui Bất Thình Lình.",
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
    "bio": "Quang Tuấn là nam diễn viên tài năng từng nhiều lần đoạt giải Cánh Diều Vàng ở cả mảng truyền hình và kịch nói. Anh được mệnh danh là gương mặt vàng của dòng phim kinh dị, giật gân Việt Nam qua Thất Sơn Tâm Linh, Thiên Thần Hộ Mệnh, Bóng Đè và Tết Ở Làng Địa Ngục.",
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
    "bio": "Isaac (Phạm Lưu Tuấn Tài) là cựu trưởng nhóm nhạc 365daband và là một trong những nghệ sĩ đa tài của showbiz Việt. Ở lĩnh vực điện ảnh, anh nhận được nhiều lời khen ngợi qua các vai diễn nổi bật trong Tấm Cám: Chuyện Chưa Kể, Song Lang và Anh Trai Yêu Quái.",
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
    "bio": "Jun Phạm (Phạm Duy Thuận) là nam ca sĩ, diễn viên kiêm biên kịch tài hoa của Việt Nam. Anh ghi dấu ấn qua nét diễn duyên dáng trong các bộ phim Cô Gái Đến Từ Hôm Qua, Về Quê Ăn Tết, 100 Ngày Bên Em và Gạo Nếp Gạo Tẻ.",
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
    "bio": "Dương Tử (Yang Zi) là một trong những tiểu hoa đán 9X hàng đầu và có sức ảnh hưởng bậc nhất của truyền hình Trung Quốc. Cô là bảo chứng rating qua hàng loạt siêu phẩm như Hương Mật Tựa Khói Sương, Cá Mực Hầm Mật, Trầm Vụn Hương Phai và Trường Tương Tư.",
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
    "bio": "Bạch Lộc (Bai Lu) là nữ diễn viên nổi tiếng của màn ảnh Hoa ngữ với khả năng nhập vai linh hoạt từ cổ trang đến hiện đại. Tên tuổi cô gắn liền với các bộ phim đình đám như Chiêu Diêu, Nửa Là Đường Mật Nửa Là Đau Thương, Châu Sinh Như Cố, Trường Nguyệt Tẫn Minh và Ninh An Như Mộng.",
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
    "bio": "Triệu Lộ Tư (Zhao Lusi) là nữ diễn viên thế hệ mới được mệnh danh là \"nữ hoàng phim chiếu mạng\" của Trung Quốc. Cô sở hữu lượng fan hùng hậu qua các bộ phim gây bão châu Á như Trần Thiên Thiên Trong Lời Đồn, Tinh Hán Xán Lạn, Thả Thí Thiên Hạ và Vụng Trộm Không Thể Giấu.",
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
    "bio": "Ngu Thư Hân (Esther Yu) là nữ diễn viên kiêm cựu thành viên nhóm nhạc THE9, nổi tiếng với nét dễ thương và phong cách độc đáo. Cô vụt sáng thành sao hạng A nhờ vai Tiểu Lan Hoa trong siêu phẩm cổ trang Thương Lan Quyết và tiếp tục tỏa sáng qua Vân Chi Vũ, Khu Rừng Nhỏ Của Hai Người.",
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
    "bio": "La Vân Hi (Luo Yunxi) là nam diễn viên kiêm ca sĩ người Trung Quốc, được xưng tụng là một trong những \"mỹ nam cổ trang\" xuất sắc nhất màn ảnh. Anh ghi dấu ấn sâu đậm qua vai Nhuận Ngọc trong Hương Mật Tựa Khói Sương, Nửa Là Đường Mật Nửa Là Đau Thương và Trường Nguyệt Tẫn Minh.",
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
    "bio": "Nhậm Gia Luân (Ren Jialun / Allen Ren) là nam diễn viên thực lực nổi tiếng với khả năng diễn xuất ánh mắt truyền cảm. Anh gặt hái thành công vang dội qua loạt phim cổ trang đình đám như Cẩm Y Chi Hạ, Châu Sinh Như Cố, Ngự Giao Ký và Thỉnh Quân.",
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
    "bio": "Cung Tuấn (Gong Jun / Simon Gong) là nam diễn viên và người mẫu Trung Quốc. Anh trở thành hiện tượng bùng nổ trên toàn châu Á qua vai diễn Ôn Khách Hành trong bộ phim kiếm hiệp Sơn Hà Lệnh (2021) và tiếp tục đóng chính trong An Lạc Truyện, Hồ Yêu Tiểu Hồng Nương.",
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
    "bio": "Vương Hạc Đệ (Dylan Wang) là nam diễn viên trẻ nổi bật của Trung Quốc, khởi đầu sự nghiệp với vai Đạo Minh Tự trong Tân Vườn Sao Băng (2018). Anh bước lên đỉnh cao sự nghiệp với vai Ma tôn Đông Phương Thanh Thương trong hiện tượng cổ trang Thương Lan Quyết và Dĩ Ái Vi Doanh.",
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
    "bio": "Ngô Lỗi (Leo Wu) là sao nhí nổi tiếng trưởng thành thành nam thần thực lực của điện ảnh và truyền hình Trung Quốc. Anh được đông đảo khán giả yêu mến qua các vai diễn trong Lang Nha Bảng, Đấu Phá Thương Khung, Trường Ca Hành, Tinh Hán Xán Lạn và Tình Yêu Thôi Mà.",
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
    "bio": "Dịch Dương Thiên Tỉ (Jackson Yee) là thành viên nhóm nhạc TFBoys và là gương mặt trẻ xuất chúng nhất của điện ảnh Trung Quốc hiện nay. Anh nhận được vô số lời khen ngợi và đề cử Ảnh đế danh giá qua Em Của Thời Niên Thiếu, Tặng Bạn Một Đóa Hoa Nhỏ Màu Đỏ, Hồ Trường Tân và Mãn Giang Hồng.",
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
    "bio": "Chu Nhất Long (Zhu Yilong) là nam diễn viên thực lực hàng đầu Trung Quốc, chủ nhân tượng vàng Ảnh đế Kim Kê. Tên tuổi anh gắn liền với tác phẩm Trấn Hồn, Minh Lan Truyện và đỉnh cao điện ảnh Nhân Sinh Đại Sự cùng phim trinh thám giật gân Cô Gái Mất Tích.",
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
    "bio": "Trương Nhược Quân (Zhang Ruoyun) là nam diễn viên truyền hình thực lực được đánh giá rất cao tại Trung Quốc. Anh là linh hồn của loạt phim quyền mưu cổ trang kinh điển Khánh Dư Niên, cùng các tác phẩm xuất sắc khác như Pháp Y Tần Minh, Tuyết Trung Hãn Đao Hành và Đại Minh Dưới Kính Hiển Vọng.",
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
    "bio": "Hồ Ca (Hu Ge) là tượng đài nam diễn viên truyền hình Trung Quốc, được xưng tụng là \"thánh phim tiên hiệp\". Anh khắc sâu hình tượng qua Tiên Kiếm Kỳ Hiệp, Thần Thoại, Kẻ Ngụy Trang, kiệt tác Lang Nha Bảng (vai Mai Trường Tô) và Phồn Hoa của đạo diễn Vương Gia Vệ.",
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
    "bio": "Châu Tấn (Zhou Xun) là một trong Tứ Đại Hoa Đán và là nữ diễn viên đầu tiên trong lịch sử đạt danh hiệu Tam Kim Ảnh Hậu (Kim Mã, Kim Tượng, Kim Kê). Tài năng diễn xuất thiên bẩm của cô tỏa sáng qua Họa Bì, Anh Hùng Xạ Điêu, Như Ý Truyện và Phong Thanh.",
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
    "bio": "Tôn Lệ (Sun Li / Betty Sun) là \"nữ hoàng truyền hình\" của Trung Quốc và là chủ nhân của danh hiệu Đại Mãn Quán truyền hình (Phi Thiên, Bạch Ngọc Lan, Kim Ưng). Cô ghi dấu ấn vĩ đại qua vai Chân Hoàn trong Hậu Cung Chân Hoàn Truyện, Mị Nguyệt Truyện và phim điện ảnh Vô Ảnh của Trương Nghệ Mưu.",
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
    "bio": "Trương Dịch (Zhang Yi) là nam diễn viên thực lực kỳ cựu của điện ảnh Trung Quốc, chủ nhân của cả hai giải thưởng Ảnh đế Kim Kê và Bách Hoa. Anh ghi dấu ấn qua Điệp Vụ Biển Đỏ, Bát Bách, Một Giây của Trương Nghệ Mưu và hiện tượng truyền hình Cuồng Phong.",
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
    "bio": "Lôi Giai Âm (Lei Jiayin) là nam diễn viên truyền hình và điện ảnh được kính trọng của Trung Quốc. Anh nổi bật qua các vai diễn có chiều sâu tâm lý trong Trường An 12 Canh Giờ, Nửa Đời Trước Của Tôi, Ám Sát Tiểu Thuyết Gia và Điều Thứ 20.",
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
    "bio": "Trần Triết Viễn (Chen Zheyuan) là nam diễn viên trẻ đang lên của màn ảnh Hoa ngữ. Anh chiếm trọn cảm tình của khán giả qua các bộ phim thanh xuân và cổ trang như Bí Mật Nơi Góc Tối, Tân Tuyệt Đại Song Kiêu, Vụng Trộm Không Thể Giấu (vai Đoàn Gia Hứa) và Tiên Kiếm 4.",
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
    "bio": "Trương Gia Huy (Nick Cheung) là nam diễn viên kiêm đạo diễn thực lực xuất chúng của điện ảnh Hồng Kông, hai lần đoạt giải Nam diễn viên chính xuất sắc nhất tại Giải thưởng Điện ảnh Hồng Kông (Kim Tượng) qua Kẻ Chỉ Điểm và Unbeatable.",
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
    "bio": "Quách Phú Thành (Aaron Kwok) là một trong \"Tứ Đại Thiên Vương\" huyền thoại của Hồng Kông. Ở lĩnh vực điện ảnh, anh từng hai lần liên tiếp đoạt giải Ảnh đế Kim Mã và một giải Kim Tượng qua các bom tấn Tam Xoa Khẩu, Phụ Tử, Hàn Chiến và Vô Song.",
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
    "bio": "Trương Học Hữu (Jacky Cheung) là một trong \"Tứ Đại Thiên Vương\", được tôn vinh là \"Ca Thần\" của làng nhạc Hoa ngữ. Trong sự nghiệp diễn xuất, anh ghi dấu ấn sâu sắc qua Vượng Giác Ca Môn của Vương Gia Vệ, Thiện Nữ U Hồn, Tiếu Ngạo Giang Hồ và Nếu Như Yêu.",
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
    "bio": "Lê Minh (Leon Lai) là thành viên của \"Tứ Đại Thiên Vương\" Hồng Kông, nổi tiếng với nét thư sinh lịch lãm. Anh giành giải Ảnh đế Kim Mã qua phim Three: Going Home và ghi dấu ấn bất hủ trong kiệt tác lãng mạn Điềm Mật Mật (Comrades: Almost a Love Story) cùng Trương Mạn Ngọc.",
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
    "bio": "Trương Mạn Ngọc (Maggie Cheung) là nữ diễn viên vĩ đại bậc nhất lịch sử điện ảnh châu Á, giữ kỷ lục 5 lần đoạt giải Kim Tượng và từng đoạt giải Nữ diễn viên xuất sắc nhất tại cả LHP Cannes lẫn Berlin qua Tâm Trạng Khi Yêu (In the Mood for Love), Điềm Mật Mật và Clean.",
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
    "bio": "Quan Chi Lâm (Rosamund Kwan) từng được mệnh danh là \"Đệ nhất mỹ nhân Hồng Kông\" trong thời kỳ hoàng kim của điện ảnh xứ Cảng Thơm. Vai diễn Dì Mười Ba (Thập Tam Muội) trong loạt phim Hoàng Phi Hồng đóng cùng Lý Liên Kiệt đã trở thành biểu tượng kinh điển.",
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
    "bio": "Vương Tổ Hiền (Joey Wong) là một trong những nữ thần nhan sắc huyền thoại của điện ảnh Hồng Kông và châu Á thập niên 1980–1990. Hình tượng nàng ma nữ Nhiếp Tiểu Thiến trong kiệt tác Thiện Nữ U Hồn và Bạch Xà trong Thanh Xà đã đi vào lịch sử điện ảnh.",
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
    "bio": "Lâm Thanh Hà (Brigitte Lin) là tượng đài điện ảnh vô tiền khoáng hậu của màn ảnh Hoa ngữ. Vai diễn Đông Phương Bất Bại trong Tiếu Ngạo Giang Hồ: Đông Phương Bất Bại (1992) của Từ Khắc cùng các kiệt tác Trùng Khánh Sâm Lâm, Đông Tà Tây Độc đã đưa tên tuổi bà trở thành huyền thoại.",
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
    "bio": "Lương Gia Huy (Tony Leung Ka-fai) là \"tắc kè hoa\" diễn xuất của điện ảnh Hồng Kông với 4 lần đoạt giải Ảnh đế Kim Tượng. Ông gây tiếng vang toàn cầu qua bộ phim kinh điển Người Tình (L'Amant) của đạo diễn Jean-Jacques Annaud, cùng Xã Hội Đen và Hàn Chiến.",
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
    "bio": "Nhậm Đạt Hoa (Simon Yam) là nam diễn viên kỳ cựu với hơn 200 bộ phim điện ảnh và truyền hình. Ông đoạt giải Ảnh đế Kim Tượng cho vai diễn trong Tuế Nguyệt Thần Trộm (Echoes of the Rainbow) và là gương mặt quen thuộc trong các tuyệt phẩm tội phạm của Đỗ Kỳ Phong như Election, PTU.",
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
    "bio": "Huỳnh Tông Trạch (Bosco Wong) là một trong những \"Ngũ Đại Tiểu Sinh\" đình đám của đài TVB Hồng Kông. Anh được khán giả hâm mộ cuồng nhiệt qua các tác phẩm truyền hình kinh điển như Mẹ Chồng Khó Tính, Sóng Gió Gia Tộc, Tiềm Hành Truy Kích (vai Co Què) và Phi Hổ.",
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
    "bio": "Xa Thi Mạn (Charmaine Sheh) là \"Nhất Tỷ\" lừng danh của đài TVB và là nữ diễn viên đầu tiên ba lần đoạt giải Thị Hậu TVB. Cô ghi dấu ấn qua Thâm Cung Nội Chiến, Bằng Chứng Thép II, Cung Tâm Kế, Diên Hi Công Lược (vai Kế Hoàng hậu) và Nữ Hoàng Tin Tức.",
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
    "bio": "Park Bo-gum là nam diễn viên hàng đầu của làn sóng Hallyu, được công chúng yêu mến nhờ tài năng diễn xuất và nhân cách mẫu mực. Anh tạo nên cơn sốt qua Reply 1988 (vai kỳ thủ Choi Taek), Mây Họa Ánh Trăng, Encounter và Record of Youth.",
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
    "bio": "Ji Chang-wook là nam thần hành động kiêm diễn viên lãng mạn hàng đầu Hàn Quốc. Tên tuổi anh vang danh khắp châu Á qua Cười Lên Dong-hae, Hoàng Hậu Ki, Healer, The K2, Đối Tác Đáng Ngờ và Chàng Trọng Án (The Worst of Evil).",
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
    "bio": "Lee Dong-wook là nam tài tử kỳ cựu nổi tiếng với vẻ ngoài quyến rũ không tuổi của màn ảnh Hàn. Anh ghi dấu ấn sâu đậm qua My Girl, vai Thần Chết trong hiện tượng Goblin (Yêu Tinh), Bạn Cùng Phòng Của Tôi Là Gumiho, Strangers from Hell và Cửa Hàng Sát Thủ (A Shop for Killers).",
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
    "bio": "Park Min-young là \"nữ hoàng rom-com\" được yêu thích bậc nhất tại Hàn Quốc và quốc tế. Cô sở hữu hàng loạt siêu phẩm truyền hình như Chuyện Tình Sungkyunkwan, City Hunter, Healer, Thư Ký Kim Sao Thế? và Cô Đi Mà Lấy Chồng Tôi (Marry My Husband).",
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
    "bio": "Kim Tae-ri là nữ diễn viên thực lực xuất sắc của điện ảnh và truyền hình Hàn Quốc. Cô vụt sáng từ kiệt tác The Handmaiden của Park Chan-wook và liên tiếp gặt hái thành công qua Mr. Sunshine, Tuổi 25 Tuổi 21 (Twenty-Five Twenty-One), Ác Quỷ (Revenant) và Jeongnyeon.",
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
    "bio": "Han Hyo-joo là nữ diễn viên tài sắc vẹn toàn, được mệnh danh là \"mỹ nhân có nụ cười đẹp nhất Hàn Quốc\". Cô tỏa sáng qua các phim kinh điển Dong Yi, Người Thừa Kế Sáng Giá, W: Two Worlds, Cold Eyes, The Beauty Inside và bom tấn siêu anh hùng Moving (2023).",
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
    "bio": "Lee Do-hyun là một trong những nam diễn viên trẻ tài năng nhất của màn ảnh xứ kim chi. Anh được giới phê bình ca ngợi qua Hotel Del Luna, 18 Again, Sweet Home, The Glory, Người Mẹ Tồi Của Tôi (The Good Bad Mother) và bom tấn phòng vé Exhuma (Quật Mộ Trùng Ma).",
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
    "bio": "Choi Min-sik là tượng đài diễn xuất vĩ đại bậc nhất của điện ảnh Hàn Quốc và thế giới. Vai diễn Oh Dae-su trong kiệt tác Oldboy (2003) của Park Chan-wook đã trở thành huyền thoại. Ông còn lập kỷ lục phòng vé lịch sử với Đại Thủy Chiến (The Admiral: Roaring Currents), I Saw the Devil, New World và Exhuma.",
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
    "bio": "Ha Jung-woo là nam diễn viên kiêm đạo diễn hàng đầu của điện ảnh Hàn Quốc, nổi tiếng với phong cách diễn xuất chân thực đến nghẹt thở. Các tác phẩm kinh điển của anh gồm The Chaser, The Yellow Sea, The Handmaiden, The Terror Live và loạt bom tấn Thử Thách Thần Chết (Along with the Gods).",
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
    "bio": "Park Eun-bin là nữ diễn viên thực lực xuất sắc bắt đầu sự nghiệp từ năm 4 tuổi và đoạt giải Daesang danh giá tại Baeksang Arts Awards. Cô tạo nên hiện tượng toàn cầu với vai luật sư tự kỷ Woo Young-woo trong Nữ Luật Sư Kỳ Lạ Woo Young-woo và Luyến Mộ (The King's Affection).",
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
    "bio": "Bae Suzy là cựu thành viên nhóm nhạc miss A và là nữ diễn viên được mệnh danh là \"Tình đầu quốc dân\" của Hàn Quốc. Cô khẳng định tài năng qua các bộ phim ăn khách Dream High, Architecture 101, Khi Nàng Say Giấc, Vagabond, Start-Up, Anna và Doona!.",
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
    "bio": "Jung Hae-in là nam diễn viên được đông đảo khán giả yêu mến nhờ nụ cười ấm áp và tài năng diễn xuất đa dạng. Tên tuổi anh gắn liền với Chị Đẹp Mua Cơm Ngon Cho Tôi, Đêm Xuân, loạt phim quân đội D.P., Snowdrop và Chuyện Tình Tình Cũ (Love Next Door).",
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
    "bio": "Ahn Hyo-seop là nam diễn viên mang hai dòng máu Hàn - Canada, nổi tiếng với chiều cao nổi bật và ngoại hình cuốn hút. Anh tạo nên cơn sốt toàn cầu qua vai \"tổng tài chim thủy tổ\" trong Hẹn Hò Chốn Công Sở (Business Proposal), Người Thầy Y Đức (phần 2, 3) và Thời Gian Gọi Tên Em.",
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
    "bio": "Kim Go-eun là nữ diễn viên thực lực tiêu biểu của điện ảnh Hàn Quốc, vụt sáng từ phim A Muse (2012). Cô chiếm trọn trái tim người hâm mộ toàn cầu qua vai \"cô dâu yêu tinh\" trong Goblin, Quân Vương Bất Diệt, Yumi's Cells, Little Women và đỉnh cao phim kinh dị Exhuma (2024).",
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
    "bio": "Kim Seon-ho là nam diễn viên xuất thân từ sân khấu kịch, sở hữu nụ cười má lúm đồng tiền duyên dáng. Anh trở thành hiện tượng châu Á với vai \"bé ngoan\" Han Ji-pyeong trong Start-Up, Tổ trưởng Hong trong Hometown Cha-Cha-Cha và vai sát thủ trong The Childe.",
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
    "bio": "Wi Ha-joon là nam diễn viên sở hữu ngoại hình nam tính cùng phong cách hành động mạnh mẽ. Anh nổi tiếng toàn cầu sau vai chàng cảnh sát ngầm trong hiện tượng Squid Game (Trò Chơi Con Mực), Bad and Crazy, Little Women và The Worst of Evil.",
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
    "bio": "Byeon Woo-seok là nam diễn viên kiêm người mẫu Hàn Quốc tạo nên cơn sốt bùng nổ khắp châu Á với vai nam chính Ryu Sun-jae trong bộ phim thanh xuân xuyên không Cõng Anh Mà Chạy (Lovely Runner, 2024). Trước đó, anh ghi dấu ấn trong Cô Gái Thế Kỷ 20 và Cô Nàng Mạnh Mẽ Gang Nam-soon.",
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
    "bio": "Nadech Kugimiya là nam siêu sao hàng đầu của làng giải trí Thái Lan, liên tục đứng đầu các bảng xếp hạng nghệ sĩ được yêu thích nhất. Anh ghi dấu ấn qua Hoàng Hôn Trên Sông Chao Phraya, Lừa Đểu Gặp Lừa Đảo (The Con-Heartist) và bom tấn kinh dị phòng vé Tee Yod (Quỷ Ăn Tạng).",
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
    "bio": "Urassaya Sperbund (Yaya) là ngọc nữ lai hai dòng máu Thái - Na Uy, biểu tượng sắc đẹp và thời trang hàng đầu Thái Lan. Cô khẳng định tài năng diễn xuất qua Trò Chơi Tình Yêu, Sóng Gió Cuộc Đời, Ông Anh Trời Đánh, Nakee 2 và Fast & Feel Love.",
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
    "bio": "Mark Prin (Prin Suparat) là nam diễn viên trụ cột của đài CH3 Thái Lan với lượng người hâm mộ đông đảo khắp châu Á. Các tác phẩm nổi bật của anh gồm Sóng Gió Cuộc Đời (Kluen Cheewit), Yêu Thầm Anh Xã (My Husband in Law) và Trò Chơi Săn Lùng Kẻ Ác.",
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
    "bio": "Bella Ranee Campen là nữ diễn viên truyền hình quyền lực bậc nhất Thái Lan. Cô tạo nên cơn sốt lịch sử văn hóa với vai Karakade trong siêu phẩm Ngược Dòng Thời Gian Để Yêu Anh (Love Destiny) và bản điện ảnh Ngược Dòng Thời Gian Để Yêu Anh Movie cùng phim Lồng Nghiệp Chướng.",
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
    "bio": "Thanapob Leeratanakachorn (Tor Thanapob) là nam diễn viên thực lực xuất sắc của Thái Lan, vụt sáng từ vai Phai trong loạt phim Tuổi Nổi Loạn (Hormones). Anh khẳng định tài năng đỉnh cao qua Con Tim Sắt Đá (Hua Jai Sila), Biến Cố Gia Tộc và phim điện ảnh One for the Road của Vương Gia Vệ sản xuất.",
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
    "bio": "Chanon Santinatornkul (Nonkul) là nam diễn viên trẻ nổi tiếng khắp thế giới qua vai thiên tài Bank trong hiện tượng điện ảnh Bad Genius (Thiên Tài Bất Hảo, 2017). Anh cũng tham gia nhiều dự án phim tại Trung Quốc và Thái Lan như Ngược Dòng Thời Gian Để Yêu Anh Movie và Find Yourself.",
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
    "bio": "Amitabh Bachchan là đại thụ vĩ đại nhất của lịch sử điện ảnh Ấn Độ, được tôn vinh là \"Ngôi sao của thiên niên kỷ\". Với sự nghiệp hơn nửa thế kỷ và hơn 200 bộ phim, ông là biểu tượng văn hóa với các kiệt tác Sholay, Deewaar, Black, Paa, Piku và Kalki 2898 AD.",
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
    "bio": "Tom Hardy là nam diễn viên người Anh xuất chúng từng nhận đề cử giải Oscar, nổi tiếng với phong thái phong trần và diễn xuất mãnh liệt. Anh ghi dấu ấn sâu đậm qua Inception, The Dark Knight Rises (vai Bane), Mad Max: Fury Road, The Revenant, Venom và Peaky Blinders.",
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
    "bio": "Joaquin Phoenix là một trong những nam diễn viên vĩ đại nhất của điện ảnh đương đại, chủ nhân tượng vàng Oscar Nam diễn viên chính xuất sắc nhất cho vai Arthur Fleck trong Joker (2019). Anh còn tỏa sáng trong Gladiator, Walk the Line, The Master, Her và Napoleon.",
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
    "bio": "Timothée Chalamet là biểu tượng điện ảnh thế hệ mới của Hollywood, từng nhận đề cử Oscar từ năm 22 tuổi qua Call Me by Your Name. Anh dẫn dắt hai bom tấn tỷ đô toàn cầu là loạt phim sử thi viễn tưởng Dune (vai Paul Atreides) và Wonka (2023).",
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
    "bio": "Zendaya là nữ diễn viên kiêm ca sĩ người Mỹ từng hai lần đoạt giải Primetime Emmy danh giá cho vai Rue trong Euphoria. Cô là ngôi sao của bộ ba bom tấn Spider-Man (vai MJ) thuộc MCU, The Greatest Showman, siêu phẩm Dune và Challengers (2024).",
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
    "bio": "Florence Pugh là nữ diễn viên tài năng người Anh từng nhận đề cử Oscar cho Little Women (2019). Cô ghi dấu ấn mạnh mẽ qua phim kinh dị Midsommar, Black Widow (vai Yelena Belova) trong vũ trụ Marvel, Oppenheimer và Dune: Part Two.",
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
    "bio": "Pedro Pascal là nam tài tử được mến mộ khắp thế giới qua các vai diễn mang tính biểu tượng trong Game of Thrones (vai Oberyn Martell), Narcos (vai Javier Peña), The Mandalorian (vai Din Djarin) và The Last of Us (vai Joel Miller) cùng Gladiator II.",
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
    "bio": "Chris Pratt là ngôi sao bảo chứng phòng vé toàn cầu của Hollywood. Anh là linh hồn của biệt đội Guardians of the Galaxy (vai Peter Quill / Star-Lord) thuộc Marvel và loạt bom tấn Jurassic World (vai Owen Grady) cùng lồng tiếng cho The Super Mario Bros. Movie.",
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
    "bio": "Samuel L. Jackson là huyền thoại điện ảnh Mỹ và là một trong những diễn viên có tổng doanh thu phim cao nhất mọi thời đại. Ông ghi dấu ấn bất hủ qua Pulp Fiction, vai giám đốc Nick Fury kết nối Vũ trụ Điện ảnh Marvel, Django Unchained, Star Wars và The Hateful Eight.",
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
    "bio": "Willem Dafoe là một trong những nam diễn viên xuất sắc nhất của điện ảnh thế giới với 4 lần nhận đề cử giải Oscar. Ông được đông đảo công chúng nhớ đến với vai phản diện kinh điển Green Goblin trong Spider-Man, cùng The Florida Project, The Lighthouse và Poor Things.",
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
    "bio": "Jake Gyllenhaal là nam diễn viên thực lực người Mỹ từng nhận đề cử giải Oscar và đoạt giải BAFTA. Sự nghiệp của anh nổi bật với các tác phẩm như Brokeback Mountain, Donnie Darko, Prisoners, Nightcrawler, Spider-Man: Far From Home (vai Mysterio) và Road House.",
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
    "bio": "Ryan Gosling là nam tài tử người Canada ba lần nhận đề cử giải Oscar, nổi tiếng với sự quyến rũ và biến hóa tài tình. Tên tuổi anh gắn liền với The Notebook, Drive, La La Land, Blade Runner 2049, vai Ken trong hiện tượng Barbie (2023) và The Fall Guy.",
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
    "bio": "Emma Stone là một trong những nữ diễn viên xuất sắc nhất thế hệ của mình, chủ nhân của hai tượng vàng Oscar Nữ diễn viên chính xuất sắc nhất cho La La Land (2016) và Poor Things (2023). Cô còn tỏa sáng qua Easy A, Birdman, Cruella và The Favourite.",
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
    "bio": "Emily Blunt là nữ minh tinh tài năng người Anh từng đoạt giải Quả cầu vàng, BAFTA và nhận đề cử Oscar. Cô gây ấn tượng mạnh mẽ qua The Devil Wears Prada, Edge of Tomorrow, Sicario, A Quiet Place (Vùng Đất Câm Lặng) và vai Kitty Oppenheimer trong Oppenheimer.",
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
    "bio": "Idris Elba là nam diễn viên kiêm nhà sản xuất người Anh từng đoạt giải Quả cầu vàng. Anh nổi tiếng qua vai thanh tra John Luther trong loạt phim Luther, Stringer Bell trong The Wire, Heimdall trong Vũ trụ Điện ảnh Marvel, Pacific Rim và The Suicide Squad.",
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
    "bio": "Jason Momoa là nam tài tử người Mỹ sở hữu thể hình vạm vỡ và phong thái phong trần đầy lôi cuốn. Anh được biết đến rộng rãi qua vai Khal Drogo trong Game of Thrones, siêu anh hùng Aquaman trong Vũ trụ DC, Dune và vai phản diện trong Fast X.",
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
    "bio": "Vin Diesel là một trong những ngôi sao hành động nổi tiếng nhất thế giới với tư cách diễn viên kiêm nhà sản xuất linh hồn của thương hiệu tỷ đô Fast & Furious (vai Dominic Toretto). Anh cũng là người lồng tiếng cho Groot trong Vũ trụ Điện ảnh Marvel và loạt phim xXx, Riddick.",
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
    "bio": "Tom Holland là nam diễn viên người Anh nổi tiếng khắp hành tinh với vai Peter Parker / Spider-Man trong Vũ trụ Điện ảnh Marvel qua bộ ba bom tấn Homecoming, Far From Home và No Way Home (doanh thu gần 2 tỷ USD), cùng các phim Uncharted và The Crowded Room.",
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
    "bio": "Henry Cavill là nam tài tử người Anh được hàng triệu khán giả yêu mến nhờ hình tượng siêu anh hùng Superman (Clark Kent) trong Man of Steel và Justice League của DC, thợ săn quái vật Geralt of Rivia trong The Witcher và điệp viên August Walker trong Mission: Impossible - Fallout.",
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
    "bio": "Trương Quốc Vinh (Leslie Cheung) là một trong những huyền thoại vĩ đại và có tầm ảnh hưởng sâu sắc nhất của nền nghệ thuật châu Á. Ông để lại di sản điện ảnh bất hủ qua các kiệt tác Bá Vương Biệt Cơ (Farewell My Concubine), A Phi Chính Truyện, Xuân Quang Xạ Tiết (Happy Together) và Thiện Nữ U Hồn.",
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

export function getAllCatalogActors(): ActorCatalogItem[] {
  return ACTORS_CATALOG;
}

export function getActorBySlug(slug?: string): ActorCatalogItem | undefined {
  if (!slug) return undefined;
  const clean = slug.toLowerCase().trim();
  return ACTORS_CATALOG.find((a) => a.slug === clean || a.aliases.includes(clean));
}

export function getActorsByCountryCode(code: string): ActorCatalogItem[] {
  return ACTORS_CATALOG.filter((a) => a.countryCode === code);
}

export function getFeaturedActors(): ActorCatalogItem[] {
  return ACTORS_CATALOG.filter((a) => a.featured);
}
