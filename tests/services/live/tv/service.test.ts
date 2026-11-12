import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { liveTvService, type TvChannel } from "@/services/live/tv/service";
import { buildTvCandidateUrls, TV_STREAM_PROXY_ENDPOINT } from "@/services/live/tv/streamUrlHelper";

describe("Live TV Service & Stream URL Candidate Guards", () => {
  it("filters tokenless fptplay URLs from M3U ingestion and verified channels", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () =>
        new Response(
          [
            "#EXTM3U",
            '#EXTINF:-1 group-title="KÊNH TEST",Dead FPTPlay 53',
            "https://live.fptplay53.net/live/media/test/live247-hls-avc/master.m3u8",
            '#EXTINF:-1 group-title="KÊNH TEST",Dead Vips FPTPlay',
            "https://vips-livecdn.fptplay.net/live/media/test/master.m3u8",
            '#EXTINF:-1 group-title="KÊNH TEST",Live Test Channel',
            "https://example-live.cdn.invalid/live/test/master.m3u8",
          ].join("\n"),
          { status: 200, headers: { "Content-Type": "text/plain" } },
        );

      const data = await liveTvService.fetchAndCacheTvChannels();
      const tokenlessFpt = data.channels.filter(
        (ch) =>
          /(?:vips-livecdn\.fptplay\.net|fptplay\d*\.(?:net|vn))/i.test(ch.url) &&
          !ch.url.includes("token="),
      );

      assert.equal(tokenlessFpt.length, 0);
      assert.ok(data.channels.some((ch) => ch.name === "Live Test Channel"));
      assert.equal(
        data.channels.some((ch) => ch.name === "Dead FPTPlay 53"),
        false,
      );
      assert.equal(
        data.channels.some((ch) => ch.name === "Dead Vips FPTPlay"),
        false,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("builds direct primary for VTV Digital and proxied primary for vnns.net", () => {
    const vtvChannel: TvChannel = {
      id: "vtv3-hd",
      name: "VTV3 HD",
      logo: "https://media.nanaflix.asia/tv-channels/vtv3.png",
      url: "https://vtvgolivepre-vtv02.vtvdigital.vn/hls/vtv/live/vtv3/free/master.m3u8",
      fallbackUrl: "https://1011154949.vnns.net/CDN-FPT02/VTV3-HD-1080p/playlist.m3u8",
      category: "Kênh VTV",
      quality: "FHD 1080p",
    };

    const candidates = buildTvCandidateUrls(vtvChannel);
    assert.equal(
      candidates[0],
      "https://vtvgolivepre-vtv02.vtvdigital.vn/hls/vtv/live/vtv3/free/master.m3u8",
    );
    assert.equal(
      candidates[1],
      `${TV_STREAM_PROXY_ENDPOINT}?url=${encodeURIComponent(
        "https://1011154949.vnns.net/CDN-FPT02/VTV3-HD-1080p/playlist.m3u8",
      )}`,
    );
  });
});

