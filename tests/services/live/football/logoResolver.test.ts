import test from "node:test";
import assert from "node:assert/strict";
import { resolveTeamIdentity } from "@/lib/sports/logoResolver";
import { ensureR2ManifestLoaded, getR2TeamLogoUrl, getR2AssetUrl } from "@/lib/r2Manifest";

test("R2 Assets Manifest & Logo Resolver dynamic offload invariant tests", async (t) => {
  await ensureR2ManifestLoaded();

  await t.test("1. Arsenal resolves R2 logo from dynamic manifest", () => {
    const res = resolveTeamIdentity("Arsenal");
    assert.equal(res.name, "Arsenal");
    assert.ok(res.logo && res.logo.includes("media.nanaflix.asia/teams/football/arsenal.png"));
  });

  await t.test("2. Manchester United resolves R2 logo", () => {
    const res = resolveTeamIdentity("Manchester United");
    assert.ok(res.logo && res.logo.includes("media.nanaflix.asia/teams/football/manchesterunited.png"));
  });

  await t.test("3. Esports team T1 resolves R2 logo", () => {
    const res = resolveTeamIdentity("T1", "esports");
    assert.ok(res.logo && res.logo.includes("media.nanaflix.asia/teams/esports/t1.png"));
  });

  await t.test("4. getR2TeamLogoUrl resolves basketball or football correctly", () => {
    const logo = getR2TeamLogoUrl("Liverpool", "football");
    assert.ok(logo && logo.includes("media.nanaflix.asia/teams/football/liverpool.png"));
  });

  await t.test("5. getR2AssetUrl returns R2 CDN URL for valid asset", () => {
    const url = getR2AssetUrl("teams/esports/faker.png") || getR2AssetUrl("teams/esports/t1.png");
    assert.ok(url && url.startsWith("https://media.nanaflix.asia/"));
  });
});
