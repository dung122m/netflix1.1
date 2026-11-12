import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveDynamicSportsLogo,
  getCachedLogo,
  DYNAMIC_LOGO_CACHE,
} from "@/services/live/dynamicLogoService";
import { resolveTeamLogo, enrichMatchLogos } from "@/services/live/football-logo/service";

test("1. Xác minh logo T1, Gen.G và các đội tuyển Esports từ nguồn Wikimedia thực tế", async () => {
  const t1 = await resolveDynamicSportsLogo("T1", "esports");
  assert.ok(t1, "T1 logo must be found");
  assert.match(t1, /wikimedia\.org.*T1_logo\.svg/i);

  const geng = await resolveDynamicSportsLogo("Gen.G", "esports");
  assert.ok(geng, "Gen.G logo must be found");
  assert.match(geng, /wikimedia\.org.*Gen\.G_Logo\.svg/i);

  const dplus = await resolveDynamicSportsLogo("Dplus KIA", "esports");
  assert.ok(dplus, "Dplus KIA logo must be found");
  assert.match(dplus, /wikimedia\.org.*DPlus_KIA_Logo\.svg/i);

  const hle = await resolveDynamicSportsLogo("Hanwha Life Esports", "esports");
  assert.ok(hle, "Hanwha Life logo must be found");
  assert.match(hle, /wikimedia\.org.*Hanwha_Life/i);
});

test("2. Xác minh logo các CLB Basketball từ ESPN CDN chính thức", async () => {
  const lakers = await resolveDynamicSportsLogo("Lakers", "basketball");
  assert.ok(lakers, "Lakers logo must be found");
  assert.match(lakers, /espncdn\.com.*lal\.png/i);

  const warriors = await resolveDynamicSportsLogo("Golden State Warriors", "basketball");
  assert.ok(warriors, "Warriors logo must be found");
  assert.match(warriors, /espncdn\.com.*gs\.png/i);

  const celtics = await resolveDynamicSportsLogo("Boston Celtics", "basketball");
  assert.ok(celtics, "Celtics logo must be found");
  assert.match(celtics, /espncdn\.com.*bos\.png/i);

  const spurs = await resolveDynamicSportsLogo("San Antonio Spurs", "basketball");
  assert.ok(spurs, "Spurs logo must be found");
  assert.match(spurs, /espncdn\.com.*sa\.png/i);
  assert.match(spurs, /500-dark/i, "Spurs must use dark mode high contrast version");

  // NCAA basketball
  const alabama = await resolveDynamicSportsLogo("Alabama", "basketball");
  assert.ok(alabama, "Alabama NCAA logo must be found");
  assert.match(alabama, /espncdn\.com.*ncaa.*333\.png/i);
});

test("3. Xác minh logo giải đấu Tennis lớn từ Wikimedia chính thức", async () => {
  const ao = await resolveDynamicSportsLogo("Australian Open", "tennis");
  assert.ok(ao, "Australian Open logo must be found");
  assert.match(ao, /wikimedia\.org.*Australian_Open/i);

  const us = await resolveDynamicSportsLogo("US Open", "tennis");
  assert.ok(us, "US Open logo must be found");
  assert.match(us, /wikimedia\.org.*Usopen/i);
});

test("4. Kiểm tra nhiều đội xuất hiện cùng lúc (Batch concurrent enrichment)", async () => {
  const matches = [
    { team1: "T1", team2: "Gen.G", sport: "esports", homeLogo: "", awayLogo: "" },
    { team1: "Lakers", team2: "Golden State Warriors", sport: "basketball", homeLogo: "", awayLogo: "" },
    { team1: "Fnatic", team2: "G2 Esports", sport: "esports", homeLogo: "", awayLogo: "" },
  ];

  await enrichMatchLogos(matches);

  assert.ok(matches[0].homeLogo, "T1 homeLogo must be enriched");
  assert.ok(matches[0].awayLogo, "Gen.G awayLogo must be enriched");
  assert.ok(matches[1].homeLogo, "Lakers homeLogo must be enriched");
  assert.ok(matches[1].awayLogo, "Warriors awayLogo must be enriched");
  assert.ok(matches[2].homeLogo, "Fnatic homeLogo must be enriched");
  assert.ok(matches[2].awayLogo, "G2 awayLogo must be enriched");
});

test("5. Kiểm tra đội mới chưa có trong cache (Dynamic lookup & cache warming)", async () => {
  const newTeam = "Karmine Corp";
  const normKey = `esports:karminecorp`;
  
  // Xóa khỏi cache nếu có
  DYNAMIC_LOGO_CACHE.delete(normKey);
  assert.equal(getCachedLogo(normKey), null);

  const logo = await resolveTeamLogo(newTeam, "esports");
  assert.ok(logo, "Karmine Corp dynamic logo must be found");
  assert.match(logo, /(wikimedia\.org|media\.nanaflix\.asia).*karmine_?corp/i);

  // Xác minh cache đã được lưu
  const cachedAfter = getCachedLogo(normKey);
  assert.equal(cachedAfter, logo);
});

test("6. Kiểm tra đội không tồn tại / giả mạo -> Fallback trung tính (chuỗi rỗng)", async () => {
  const fakeTeam = "Fake Unknown Random Squad 123456";
  const result = await resolveTeamLogo(fakeTeam, "esports");
  assert.equal(result, "", "Fake / non-existent entity must return empty string (neutral fallback)");

  // Xác minh negative cache được lưu để chống spam network
  const cached = getCachedLogo(`esports:fakeunknownrandomsquad123456`);
  assert.equal(cached, "");
});

