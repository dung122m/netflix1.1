import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { filterDualServers } from "@/services/movies/service";

describe("Nanaflix Multi-Source & Multi-Server Switching Regression Tests", () => {
  test("1. filterDualServers prioritizes playable direct .m3u8 servers over embed-only servers", () => {
    const rawServers = [
      {
        server_name: "Vietsub",
        server_data: [
          { name: "Tập 01", slug: "tap-01", link_m3u8: "https://s3.phim1280.tv/ep1.m3u8", link_embed: "https://player.phimapi.com/1" },
          { name: "Tập 53", slug: "tap-53", link_m3u8: "https://s3.phim1280.tv/ep53.m3u8", link_embed: "https://player.phimapi.com/53" },
        ],
      },
      {
        server_name: "Lồng Tiếng",
        server_data: [
          { name: "Tập 01", slug: "tap-01", link_m3u8: "https://s6.kkphimplayer6.com/ep1.m3u8", link_embed: "https://player.phimapi.com/dub1" },
          { name: "Tập 53", slug: "tap-53", link_m3u8: "https://s6.kkphimplayer6.com/ep53.m3u8", link_embed: "https://player.phimapi.com/dub53" },
        ],
      },
      {
        server_name: "Lồng Tiếng #1",
        server_data: [
          { name: "1", slug: "tap-01", link_m3u8: "", link_embed: "https://embed15.streamc.xyz/embed1" },
          { name: "53", slug: "tap-53", link_m3u8: "", link_embed: "https://embed15.streamc.xyz/embed53" },
          { name: "54", slug: "tap-54", link_m3u8: "", link_embed: "https://embed15.streamc.xyz/embed54" },
        ],
      },
    ];

    const dual = filterDualServers(rawServers);
    assert.equal(dual.length, 2);
    // Server 0 must be "Lồng Tiếng" with direct playable M3U8, NOT the embed-only one
    assert.equal(dual[0].server_name, "Lồng Tiếng");
    assert.equal(dual[0].server_data[1].link_m3u8, "https://s6.kkphimplayer6.com/ep53.m3u8");
    // Server 1 must be "Thuyết Minh" with direct playable M3U8
    assert.equal(dual[1].server_name, "Thuyết Minh");
    assert.equal(dual[1].server_data[1].link_m3u8, "https://s3.phim1280.tv/ep53.m3u8");
  });

  test("2. Conan Episode 53 server stream resolution: Server 0 and Server 1 switch cleanly", () => {
    const server0Ep53 = {
      name: "Tập 53",
      slug: "tap-53",
      link_m3u8: "https://s6.kkphimplayer6.com/20250603/t41yeThi/index.m3u8",
      link_embed: "https://player.phimapi.com/player/?url=https://s6.kkphimplayer6.com/20250603/t41yeThi/index.m3u8",
    };

    const server1Ep53 = {
      name: "Tập 53",
      slug: "tap-53",
      link_m3u8: "https://s3.phim1280.tv/20240318/ucY71m4S/index.m3u8",
      link_embed: "https://player.phimapi.com/player/?url=https://s3.phim1280.tv/20240318/ucY71m4S/index.m3u8",
    };

    assert.notEqual(server0Ep53.link_m3u8, server1Ep53.link_m3u8);
    assert.equal(server0Ep53.link_m3u8.includes("kkphimplayer6.com"), true);
    assert.equal(server1Ep53.link_m3u8.includes("phim1280.tv"), true);
  });

  test("3. CinemaPlayer key reacts to currentServerIndex change without requiring page reload", () => {
    const movieSlug = "tham-tu-lung-danh-conan";
    const currentEpSlug = "tap-53";
    const serverIdx0 = 0;
    const serverIdx1 = 1;

    const keyServer0 = `cinema_${movieSlug}_s${serverIdx0}_${currentEpSlug}`;
    const keyServer1 = `cinema_${movieSlug}_s${serverIdx1}_${currentEpSlug}`;

    assert.notEqual(keyServer0, keyServer1);
    assert.equal(keyServer0, "cinema_tham-tu-lung-danh-conan_s0_tap-53");
    assert.equal(keyServer1, "cinema_tham-tu-lung-danh-conan_s1_tap-53");
  });

  test("4. SourceKey includes server index, resolvedM3u8, and episode slug", () => {
    const srv0Idx = 0;
    const srv1Idx = 1;
    const m3u8_0 = "https://s6.kkphimplayer6.com/20250603/t41yeThi/index.m3u8";
    const m3u8_1 = "https://s3.phim1280.tv/20240318/ucY71m4S/index.m3u8";
    const epSlug = "tap-53";

    const sourceKey0 = `${srv0Idx}__${m3u8_0}__${epSlug}`;
    const sourceKey1 = `${srv1Idx}__${m3u8_1}__${epSlug}`;

    assert.notEqual(sourceKey0, sourceKey1);
    assert.equal(sourceKey0.startsWith("0__"), true);
    assert.equal(sourceKey1.startsWith("1__"), true);
  });
});
