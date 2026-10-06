import test from "node:test";
import assert from "node:assert/strict";
import {
  parseBioContent,
  splitBlockIntoNaturalParagraphs,
  splitIntoSentences,
} from "./bioFormatter";

test("splitIntoSentences protects abbreviations and numbers", () => {
  const text =
    "Nghệ sĩ Hoài Linh sinh tại Cam Ranh, sau đó học tại TP.HCM (nay là TP. HCM). Ông nhận danh hiệu NSƯT vào năm 2015. Doanh thu phim đạt 25.5 tỷ đồng.";
  const sentences = splitIntoSentences(text);
  assert.equal(sentences.length, 3);
  assert.match(sentences[0], /TP\.HCM/);
  assert.match(sentences[1], /NSƯT/);
  assert.match(sentences[2], /25\.5/);
});

test("Short biography is kept intact without forced splitting", () => {
  const shortBio =
    "Huỳnh Trấn Thành, thường được biết đến với nghệ danh Trấn Thành, là một nam diễn viên, MC người Việt Nam.";
  const result = parseBioContent(shortBio);
  assert.equal(result.leadParagraph, shortBio);
  assert.equal(result.sections.length, 0);
});

test("Hoài Linh biography with newline formatting produces 3-6 natural topic paragraphs", () => {
  const hoaiLinhBio = `Võ Nguyễn Hoài Linh (sinh ngày 18 tháng 12 năm 1969 tại Khánh Hòa), thường được biết đến với nghệ danh Hoài Linh, là một nam diễn viên kiêm nghệ sĩ hài người Việt Nam. Ông là một trong những diễn viên hài nổi bật nhất thập niên 2000 và 2010 tại Việt Nam, và là chủ nhân của giải Mai Vàng. Năm 2015, ông trở thành nghệ sĩ hải ngoại đầu tiên được phong tặng danh hiệu Nghệ sĩ Ưu tú.

Tiểu sử và sự nghiệp:

Hoài Linh sinh ngày 18 tháng 12 năm 1969 tại Cam Ranh, Khánh Hòa trong một gia đình Công giáo có tất cả 6 người con gồm 3 nam, 3 nữ, và anh là con thứ 3 và là con trai trưởng trong gia đình. Cha mẹ anh quê ở Đại Lộc, Quảng Nam (nay là xã Đại Lộc, thành phố Đà Nẵng). Ngoài một người chị cả đã có gia đình còn ở lại Việt Nam, gia đình anh đã sang Hoa Kỳ theo diện HO vào năm 1995 vì trước đó cha anh, ông Võ Tòa, phục vụ trong Lực lượng đặc biệt Việt Nam Cộng hòa với chức vụ Đại úy, bị tù cải tạo 6 năm tại Biên Hòa, cho đến năm 1982 mới được tha về. Mẹ anh, bà Nguyễn Thị Lệ Phương, điều hành một nhà hộ sinh tư ở Cam Ranh.
Hoài Linh sống ở Cam Ranh đến năm 1975 sau đó theo gia đình di tản đến Dầu Giây, Đồng Nai, anh học hết bậc trung học ở trường phổ thông trung học Thống Nhất A (huyện Trảng Bom; nay là phường Trảng Bom, tỉnh Đồng Nai). Vào năm 1988, gia đình anh trở về Cam Ranh để lo thủ tục xin hoàn lại nhà cửa bị tịch thu, sau đó vào Thành phố Hồ Chí Minh năm 1992 cho đến ngày sang Hoa Kỳ cuối năm 1993. Trong thời gian này, Hoài Linh gia nhập đoàn ca múa nhạc Ponaga, sau đó theo học tại trường múa chuyên tu (tu nghiệp chuyên môn) cho đến năm 1994 lại quay về với đoàn múa.
Khi Hoài Linh có ý định theo múa, gia đình ông đã không đồng ý và tìm cách ngăn cản vì cha mẹ ông muốn anh theo ngành sư phạm nhưng vì vấn đề lý lịch nên không thành. Trong thời gian cộng tác với đoàn múa Ponaga, anh đã đi lưu diễn khắp các tỉnh miền Trung và một số tỉnh miền Nam.
Vũ sư Đặng Hùng là người đã dạy anh về bộ môn múa trong khi về dân ca thì ông tự học. Vào năm 1991, ông tham dự cuộc thi Những giọng hát hay tại Nha Trang và được giải thưởng. Tại Nha Trang, ông gặp Thanh Lộc (một diễn viên của ban kịch tỉnh Khánh Hòa mới giải tán, gia nhập đoàn Ponaga), mời ông phối hợp để làm một cặp hài diễn chung trong chương trình của đoàn. Hoài Linh vui vẻ nhận lời, hai người diễn thử và có kết quả tốt. Rồi từ đó anh chính thức bước vào lĩnh vực hài kịch. Lần diễn đầu tiên tại Diên Khánh với màn Tô Ánh Nguyệt tân thời với Thanh Lộc.
Hoài Linh còn có một năng khiếu đặc biệt khác là nói được nhiều giọng địa phương Việt Nam. Do khi di tản đến Long Khánh, ông đã có dịp nói chuyện với rất nhiều người đến từ các miền khác nhau, nhờ vậy nên Hoài Linh dễ thu nhập được để bắt chước được giọng của nhiều miền trong khi thường ngày anh vẫn nói giọng Quảng Nam với gia đình.
Ngoài khả năng về múa, hát dân ca, diễn hài, Hoài Linh còn hát được cả tân nhạc.`;

  const result = parseBioContent(hoaiLinhBio);
  assert.ok(result.leadParagraph);
  assert.equal(result.sections.length, 1);
  assert.equal(result.sections[0].heading, "Tiểu sử và sự nghiệp");
  assert.ok(result.sections[0].paragraphs.length >= 3 && result.sections[0].paragraphs.length <= 6);

  // Total paragraphs (lead + section paragraphs)
  const totalParas = 1 + result.sections[0].paragraphs.length;
  assert.ok(totalParas >= 4 && totalParas <= 7);
});

test("Hoài Linh biography as single continuous string (no newlines) splits into 3-6 natural paragraphs", () => {
  const hoaiLinhContinuous = `Võ Nguyễn Hoài Linh (sinh ngày 18 tháng 12 năm 1969 tại Khánh Hòa), thường được biết đến với nghệ danh Hoài Linh, là một nam diễn viên kiêm nghệ sĩ hài người Việt Nam. Ông là một trong những diễn viên hài nổi bật nhất thập niên 2000 và 2010 tại Việt Nam, và là chủ nhân của giải Mai Vàng. Năm 2015, ông trở thành nghệ sĩ hải ngoại đầu tiên được phong tặng danh hiệu Nghệ sĩ Ưu tú. Hoài Linh sinh ngày 18 tháng 12 năm 1969 tại Cam Ranh, Khánh Hòa trong một gia đình Công giáo có tất cả 6 người con gồm 3 nam, 3 nữ, và anh là con thứ 3 và là con trai trưởng trong gia đình. Cha mẹ anh quê ở Đại Lộc, Quảng Nam. Ngoài một người chị cả đã có gia đình còn ở lại Việt Nam, gia đình anh đã sang Hoa Kỳ theo diện HO vào năm 1995. Hoài Linh sống ở Cam Ranh đến năm 1975 sau đó theo gia đình di tản đến Dầu Giây, Đồng Nai. Vào năm 1988, gia đình anh trở về Cam Ranh để lo thủ tục xin hoàn lại nhà cửa bị tịch thu, sau đó vào Thành phố Hồ Chí Minh năm 1992. Trong thời gian này, Hoài Linh gia nhập đoàn ca múa nhạc Ponaga. Vũ sư Đặng Hùng là người đã dạy anh về bộ môn múa trong khi về dân ca thì ông tự học. Vào năm 1991, ông tham dự cuộc thi Những giọng hát hay tại Nha Trang và được giải thưởng. Tại Nha Trang, ông gặp Thanh Lộc, rồi từ đó anh chính thức bước vào lĩnh vực hài kịch. Ngoài khả năng về múa, hát dân ca, diễn hài, Hoài Linh còn hát được cả tân nhạc.`;

  const result = parseBioContent(hoaiLinhContinuous);
  assert.ok(result.leadParagraph);
  const totalParas = 1 + (result.sections[0]?.paragraphs?.length || 0);
  assert.ok(totalParas >= 3 && totalParas <= 6, `Expected 3-6 paragraphs, got ${totalParas}`);
});

test("Thái Hòa long continuous biography produces natural structured paragraphs", () => {
  const thaiHoaBio = `Hồ Thái Hòa, thường được biết đến với nghệ danh Thái Hòa (sinh ngày 10 tháng 8 năm 1974), là một nam diễn viên người Việt Nam. Nổi tiếng nhờ khả năng biến hóa thần sầu trong từng vai diễn, anh được đánh giá là một trong những diễn viên Việt Nam xuất sắc nhất trong thế hệ của mình. Thái Hòa sinh ngày 10 tháng 8 năm 1974 tại tại xóm Lò Heo, gần chợ Bà Chiểu. Gia đình không có ai theo nghệ thuật, nhưng do đam mê, anh thi vào Trường đại học Sân khấu - Điện ảnh TP.HCM để làm diễn viên hài. Những năm 2000, Thái Hòa trở thành gương mặt tiêu biểu trên các sân khấu hài kịch và cả chính kịch. Không chỉ dừng lại ở vai trò diễn viên, anh còn bộc lộ tài năng trong việc dàn dựng và viết kịch bản, là cha đẻ của Người vợ ma và Quả tim máu. Tuy nhiên chỉ khi đến với điện ảnh, cái tên Thái Hoà mới vụt sáng thành sao và phủ sóng rộng khắp qua Để Mai tính, Long Ruồi, Tèo em. Năm 2021, anh tiếp tục gây chú ý qua vai người anh cả tảo tần trong phim truyền hình Cây táo nở hoa. Năm 2023, anh đoạt hai danh hiệu Nam diễn viên chính xuất sắc điện ảnh (Con Nhót mót chồng) lẫn truyền hình (Mẹ Rơm) tại giải Cánh Diều. Về đời tư, sau cuộc hôn nhân đầu với diễn viên Cát Phượng, anh hiện đang có cuộc sống bình yên, kín tiếng bên vợ và các con.`;

  const result = parseBioContent(thaiHoaBio);
  assert.ok(result.leadParagraph);
  const totalParas = 1 + (result.sections[0]?.paragraphs?.length || 0);
  assert.ok(totalParas >= 3 && totalParas <= 6, `Expected 3-6 paragraphs, got ${totalParas}`);
});

test("Matt Damon biography with English text and references cleans and formats properly", () => {
  const mattDamonBio = `Matthew Paige Damon (born October 8, 1970) is an American actor, film producer, and screenwriter. Ranked among Forbes' most bankable stars, the films in which he has appeared have collectively grossed over $3.88 billion at the North American box office. Damon began his acting career by appearing in high school theater productions. He made his professional acting debut in the film Mystic Pizza (1988). He came to prominence in 1997 when he and Ben Affleck wrote and starred in Good Will Hunting, which won them the Academy and Golden Globe awards for Best Screenplay and earned Damon a nomination for the Academy Award for Best Actor. He continued to garner praise from critics for his roles in Saving Private Ryan (1998), The Talented Mr. Ripley (1999), Dogma (1999), Syriana (2005), and The Departed (2006). Damon is also known for his starring role as Jason Bourne in the Bourne franchise (2002–2016) and as a con man in the Ocean's Trilogy (2001–2007). For his supporting role as the rugby player Francois Pienaar in Invictus (2009) and his leading role as an astronaut stranded on Mars in The Martian (2015), Damon received Academy Award nominations for Best Supporting Actor and Best Actor, respectively. In addition to acting, Damon has performed voice-over work in animated films and documentaries and has established two production companies with Affleck. He has also been involved in charitable work.

References:
1. Biography details...`;

  const result = parseBioContent(mattDamonBio);
  assert.ok(result.leadParagraph);
  const totalParas = 1 + (result.sections[0]?.paragraphs?.length || 0);
  assert.ok(totalParas >= 3 && totalParas <= 6, `Expected 3-6 paragraphs, got ${totalParas}`);
  // References should be stripped
  const allText = (result.leadParagraph || "") + (result.sections[0]?.paragraphs?.join(" ") || "");
  assert.ok(!allText.includes("Biography details..."));
});

test("100% content preservation guarantee: no word or letter is paraphrased/lost", () => {
  const sample =
    "Nghệ sĩ Hoài Linh sinh tại Cam Ranh. Vào năm 1988, gia đình trở về Cam Ranh. Vũ sư Đặng Hùng là người dạy múa. Ngoài khả năng về múa, ông còn hát tốt.";
  const result = parseBioContent(sample);
  const reconstructed = [
    result.leadParagraph,
    ...(result.sections[0]?.paragraphs || []),
  ].filter(Boolean).join(" ");

  // Verify all words exist in same sequence
  const origWords = sample.split(/\s+/);
  const reconWords = reconstructed.split(/\s+/);
  assert.deepEqual(origWords, reconWords);
});
