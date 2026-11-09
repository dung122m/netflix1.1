import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getLiveAssetR2Key,
  getSyncedLiveAssetUrl,
  processLiveMatchesR2Logos,
} from "./r2LiveAssetSync";

describe("R2 Live Asset Auto-Sync & Deduplication", () => {
  it("generates deterministic hash keys for external logo URLs", () => {
    const url = "https://imgts.sportpulseapiz.com/football/team/965mkyh7z0jrlgw/image/small";
    const key1 = getLiveAssetR2Key(url, "team");
    const key2 = getLiveAssetR2Key(url, "team");
    assert.equal(key1, key2);
    assert.match(key1, /^live-assets\/team\/[a-f0-9]{16}\.png$/);
  });

  it("recognizes existing R2 URLs without mutating or downloading", () => {
    const r2Url = "https://media.nanaflix.asia/tv-channels/vtv1.png";
    const res = getSyncedLiveAssetUrl(r2Url);
    assert.equal(res, r2Url);
  });

  it("preserves non-URL or empty logos safely", () => {
    assert.equal(getSyncedLiveAssetUrl(""), null);
    assert.equal(getSyncedLiveAssetUrl(null), null);
    assert.equal(getSyncedLiveAssetUrl(undefined), null);
  });

  it("processes matches array, rewriting known logos and queueing unknown without throwing", () => {
    const matches = [
      {
        homeLogo: "https://media.nanaflix.asia/tv-channels/vtv1.png",
        awayLogo: "https://imgts.sportpulseapiz.com/football/team/965mkyh7z0jrlgw/image/small",
        sport: "football",
      },
      {
        homeLogo: "",
        awayLogo: undefined,
        sport: "tennis",
      },
    ];

    const processed = processLiveMatchesR2Logos(matches);
    assert.equal(processed.length, 2);
    assert.equal(processed[0].homeLogo, "https://media.nanaflix.asia/tv-channels/vtv1.png");
    assert.equal(processed[0].awayLogo, "https://imgts.sportpulseapiz.com/football/team/965mkyh7z0jrlgw/image/small");
  });
});

