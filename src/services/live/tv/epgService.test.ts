import test from "node:test";
import assert from "node:assert/strict";
import { normalizeChannelKey, parseXmltv, epgService } from "./epgService";

test("EPG Service: normalizeChannelKey canonical mapping", () => {
  assert.equal(normalizeChannelKey("VTV1 HD (Thời sự - Chính luận)"), "vtv1");
  assert.equal(normalizeChannelKey("vtv1-fhd"), "vtv1");
  assert.equal(normalizeChannelKey("VTV3 HD (Giải trí - Thể thao)"), "vtv3");
  assert.equal(normalizeChannelKey("HTV7 HD"), "htv7");
  assert.equal(normalizeChannelKey("Truyền hình Vĩnh Long 1"), "thvl1");
  assert.equal(normalizeChannelKey("THVL 2 HD"), "thvl2");
  assert.equal(normalizeChannelKey("Kênh QPVN HD"), "qpvn");
  assert.equal(normalizeChannelKey("VTC 14 HD"), "vtc14");
  assert.equal(normalizeChannelKey("ON Sports News HD"), "onsportsnews");
});

test("EPG Service: parseXmltv correctly parses XMLTV format", () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");

  const xmlSample = `<?xml version="1.0" encoding="UTF-8"?>
<tv>
  <programme start="${y}${m}${d}060000 +0700" stop="${y}${m}${d}070000 +0700" channel="vtv1hd">
    <title lang="vi">Chào buổi sáng</title>
    <desc lang="vi">Bản tin buổi sáng</desc>
  </programme>
  <programme start="${y}${m}${d}190000 +0700" stop="${y}${m}${d}194500 +0700" channel="vtv1hd">
    <title lang="vi">Thời sự 19h00</title>
    <desc lang="vi">Bản tin thời sự toàn cảnh</desc>
  </programme>
  <programme start="${y}${m}${d}200000 +0700" stop="${y}${m}${d}210000 +0700" channel="vtv3hd">
    <title lang="vi">Phim Giờ Vàng VTV3</title>
    <desc lang="vi">Phim truyền hình hấp dẫn</desc>
  </programme>
</tv>`;

  const parsed = parseXmltv(xmlSample);
  assert.ok(parsed["vtv1"], "vtv1 must be parsed");
  assert.ok(parsed["vtv3"], "vtv3 must be parsed");
  assert.equal(parsed["vtv1"].programs.length, 2);
  assert.equal(parsed["vtv1"].programs[1].title, "Thời sự 19h00");
  assert.equal(parsed["vtv1"].programs[1].start, "19:00");
  assert.equal(parsed["vtv1"].programs[1].end, "19:45");
});

test("EPG Service: getEpgData returns populated schedule", async () => {
  const data = await epgService.getEpgData();
  assert.ok(data, "EPG data must exist");
  assert.ok(typeof data === "object", "EPG data must be object");
  assert.ok(Object.keys(data).length > 0, "EPG data must contain channels");
  assert.ok(data["vtv1"], "VTV1 must have EPG schedule");
  assert.ok(data["vtv1"].programs.length > 0, "VTV1 must have program list");
});
