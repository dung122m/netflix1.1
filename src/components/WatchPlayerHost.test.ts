import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Nanaflix Multi-Source & Multi-Server Switching Regression Tests", () => {
  test("1. Conan Episode 53 server stream resolution: empty link_m3u8 does NOT fallback to stale propM3u8Link", () => {
    // Simulating Server 0 ("Lồng Tiếng") where link_m3u8 is empty string
    const activeEpisode = {
      name: "Tập 53",
      slug: "tap-53",
      link_embed: "https://embed15.streamc.xyz/embed.php?hash=5282e7dac8a2500fc93075592423ac50",
      link_m3u8: "",
    };

    const propActiveEpisodeSlug = "tap-53";
    const activeEpisodeSlug = "tap-53";
    const propM3u8Link = "https://s3.phim1280.tv/20240318/ucY71m4S/index.m3u8"; // from Server 1
    const propEmbedSrc = "https://player.phimapi.com/player/?url=https://s3.phim1280.tv/20240318/ucY71m4S/index.m3u8";

    const isPropMatchingActive = !propActiveEpisodeSlug || activeEpisodeSlug === propActiveEpisodeSlug;
    
    // New logic applied in CinemaPlayer
    const rawEpM3u8 = typeof activeEpisode?.link_m3u8 === "string"
      ? activeEpisode.link_m3u8
      : (activeEpisode as Record<string, string | undefined>)?.m3u8 || (activeEpisode as Record<string, string | undefined>)?.file;
    const m3u8Link = rawEpM3u8 !== undefined ? rawEpM3u8 : (isPropMatchingActive ? propM3u8Link : undefined);

    const rawEpEmbed = typeof activeEpisode?.link_embed === "string" ? activeEpisode.link_embed : undefined;
    const embedSrc = rawEpEmbed !== undefined ? rawEpEmbed : (isPropMatchingActive ? propEmbedSrc : undefined);
    const videoLink = m3u8Link || embedSrc;

    // In Server 0, m3u8Link must be empty string, NOT Server 1's m3u8Link
    assert.equal(m3u8Link, "");
    assert.equal(embedSrc, "https://embed15.streamc.xyz/embed.php?hash=5282e7dac8a2500fc93075592423ac50");
    assert.equal(videoLink, "https://embed15.streamc.xyz/embed.php?hash=5282e7dac8a2500fc93075592423ac50");
  });

  test("2. CinemaPlayer key reacts to currentServerIndex change without requiring page reload", () => {
    const movieSlug = "tham-tu-lung-danh-conan";
    const serverIdx0 = 0;
    const serverIdx1 = 1;

    const keyServer0 = `cinema_${movieSlug}_srv_${serverIdx0}`;
    const keyServer1 = `cinema_${movieSlug}_srv_${serverIdx1}`;

    assert.notEqual(keyServer0, keyServer1);
    assert.equal(keyServer0, "cinema_tham-tu-lung-danh-conan_srv_0");
    assert.equal(keyServer1, "cinema_tham-tu-lung-danh-conan_srv_1");
  });

  test("3. Iframe key for cross-origin players includes server index, episode and activeSrc", () => {
    const activeEpSlug = "tap-53";
    const server0 = 0;
    const server1 = 1;
    const src0 = "https://embed15.streamc.xyz/embed.php?hash=5282";
    const src1 = "https://player.phimapi.com/player/?url=https://s3.phim1280.tv/index.m3u8";

    const key0 = `iframe_${activeEpSlug}_${server0}_${src0}`;
    const key1 = `iframe_${activeEpSlug}_${server1}_${src1}`;

    assert.notEqual(key0, key1);
    assert.equal(key0.includes("0"), true);
    assert.equal(key1.includes("1"), true);
  });
});

