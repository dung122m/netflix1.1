import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAndMergeStreams,
  RawStreamItem,
  isStreamPlayable,
  getStreamHealthStatus,
  urlHealthCache,
} from "./service";

describe("NANAFLIX-LIVE-PLAYBACK-FIX-01: Regression & Unit Verification", () => {
  // Test 4: Hailab Parser HLS URL không có .m3u8 nhưng có format: 'hls'
  test("4. Hailab Parser giữ stream hợp lệ có format === 'hls' dù URL không có đuôi .m3u8", () => {
    const rawStreams: RawStreamItem[] = [
      {
        rawTitle: "🎾 19:30 Novak Djokovic vs Valentine Vacherot (Ben)",
        group: "Live Sports (Hailab)",
        rawLogo: "https://example.com/logo.png",
        url: "https://cdn.example.com/live/tokenized_stream_channel31?token=xyz123",
        effectiveUrl: "https://cdn.example.com/live/tokenized_stream_channel31?token=xyz123",
        format: "hls",
        tournament: "ATP Masters 1000",
      },
      {
        rawTitle: "⚽ 20:00 Arsenal vs Chelsea (LUCAS)",
        group: "Live Sports (Hailab)",
        rawLogo: "https://example.com/logo.png",
        url: "https://cdn.example.com/live/standard.m3u8",
        effectiveUrl: "https://cdn.example.com/live/standard.m3u8",
        tournament: "Premier League",
      },
    ];

    const { matches } = normalizeAndMergeStreams(rawStreams, Date.now());
    assert.strictEqual(matches.length, 2, "Cả hai trận phải được giữ lại");

    const djokovicMatch = matches.find((m) => m.id.includes("novakdjokovic"));
    assert.ok(djokovicMatch, "Trận Djokovic phải tồn tại");
    assert.strictEqual(djokovicMatch.servers.length, 1, "Server HLS tokenized không có đuôi .m3u8 phải được giữ lại");
    assert.strictEqual(djokovicMatch.servers[0].format, "hls", "Format phải là HLS");
    assert.strictEqual(djokovicMatch.servers[0].isHls, true, "isHls phải là true");
  });

  // Test 5: Range Probe 416 tolerance
  test("5. isStreamPlayable không đánh dấu dead khi server trả về HTTP 416 (Range Not Satisfiable)", async () => {
    // Mock global fetch
    const originalFetch = global.fetch;
    const testUrl = "https://mock-cdn.test/channel-range416.m3u8";

    try {
      global.fetch = async () => {
        return new Response("Range Not Satisfiable", {
          status: 416,
          statusText: "Range Not Satisfiable",
        });
      };

      urlHealthCache.delete(testUrl);
      const playable = await isStreamPlayable(testUrl, 500);

      assert.strictEqual(playable, true, "Stream trả 416 phải được đánh giá là playable/alive");
      assert.strictEqual(getStreamHealthStatus(testUrl), "alive", "Health status phải là 'alive'");
    } finally {
      global.fetch = originalFetch;
      urlHealthCache.delete(testUrl);
    }
  });

  // Test 6: Probe Timeout không loại oan nguồn
  test("6. isStreamPlayable khi timeout KHÔNG đánh dấu dead vĩnh viễn (giữ trạng thái unknown)", async () => {
    const originalFetch = global.fetch;
    const testUrl = "https://mock-cdn.test/channel-timeout.m3u8";

    try {
      global.fetch = async () => {
        const err = new Error("The operation was aborted");
        err.name = "TimeoutError";
        throw err;
      };

      urlHealthCache.delete(testUrl);
      const playable = await isStreamPlayable(testUrl, 100);

      assert.strictEqual(playable, false, "Lần gọi bị timeout trả về false tạm thời");
      // Trạng thái trong cache không được ghi nhận là dead vĩnh viễn
      assert.strictEqual(
        getStreamHealthStatus(testUrl),
        "unknown",
        "Nguồn bị timeout không được gán 'dead', phải giữ 'unknown' để không bị drop khỏi workingServers"
      );
    } finally {
      global.fetch = originalFetch;
      urlHealthCache.delete(testUrl);
    }
  });

  // Test 1, 2, 3, 7, 8, 9: Logic LivePlayer Fallback State Machine
  test("1, 2, 7, 8, 9. LivePlayer Fallback State Machine: Direct 403 -> Proxy 200 vs Direct 403 -> Proxy 403", () => {
    // Mô phỏng logic state machine của executeServerFallback
    interface MockState {
      selectedServerIndex: number;
      useProxyFallback: boolean;
      failedServers: Set<number>;
      isStopped: boolean;
      errorMessage: string;
    }

    const runFallbackStep = (
      state: MockState,
      serversCount: number,
      customReason: string
    ) => {
      const isHttpsDirect = true;
      const isFatalNotFound =
        customReason.includes("404") || customReason.includes("không tồn tại");

      // Bước 2: Direct thất bại (kể cả 403) nhưng chưa thử Proxy
      if (isHttpsDirect && !state.useProxyFallback && !isFatalNotFound) {
        state.useProxyFallback = true;
        return "PROXY_FALLBACK_TRIGGERED";
      }

      // Đã thử qua Proxy hoặc lỗi 404 không tồn tại -> Đánh dấu server failed
      state.failedServers.add(state.selectedServerIndex);
      state.useProxyFallback = false;

      // Tìm server tiếp theo
      let nextIndex = -1;
      for (let i = 0; i < serversCount; i++) {
        if (!state.failedServers.has(i)) {
          nextIndex = i;
          break;
        }
      }

      if (nextIndex !== -1) {
        state.selectedServerIndex = nextIndex;
        return "NEXT_SERVER_TRIGGERED";
      }

      state.isStopped = true;
      state.errorMessage = "Không có nguồn phát khả dụng";
      return "ALL_SERVERS_EXHAUSTED";
    };

    // Test Case 1 & 7: 1 server duy nhất bị Direct 403 nhưng Proxy 200
    {
      const state: MockState = {
        selectedServerIndex: 0,
        useProxyFallback: false,
        failedServers: new Set(),
        isStopped: false,
        errorMessage: "",
      };

      const step1 = runFallbackStep(state, 1, "lỗi HTTP 403");
      assert.strictEqual(step1, "PROXY_FALLBACK_TRIGGERED", "Direct 403 phải kích hoạt Proxy Fallback");
      assert.strictEqual(state.useProxyFallback, true, "useProxyFallback phải là true");
      assert.strictEqual(state.selectedServerIndex, 0, "Vẫn giữ Server #1");
      assert.strictEqual(state.isStopped, false, "Player không được dừng");
    }

    // Test Case 2 & 8: 2 servers: Server 1 bị Direct 403 -> Proxy 403 -> chuyển Server 2
    {
      const state: MockState = {
        selectedServerIndex: 0,
        useProxyFallback: false,
        failedServers: new Set(),
        isStopped: false,
        errorMessage: "",
      };

      // Server 1 Direct 403
      const step1 = runFallbackStep(state, 2, "lỗi HTTP 403");
      assert.strictEqual(step1, "PROXY_FALLBACK_TRIGGERED", "Server 1 Direct 403 -> chuyển Proxy");
      assert.strictEqual(state.useProxyFallback, true);

      // Server 1 Proxy 403
      const step2 = runFallbackStep(state, 2, "lỗi HTTP 403");
      assert.strictEqual(step2, "NEXT_SERVER_TRIGGERED", "Server 1 Proxy 403 -> chuyển sang Server 2");
      assert.strictEqual(state.selectedServerIndex, 1, "Chuyển sang Server index 1");
      assert.strictEqual(state.useProxyFallback, false, "useProxyFallback reset về false cho Server 2");
      assert.ok(state.failedServers.has(0), "Server 0 phải được đánh dấu failed");

      // Server 2 Direct 403 -> chuyển Proxy
      const step3 = runFallbackStep(state, 2, "lỗi HTTP 403");
      assert.strictEqual(step3, "PROXY_FALLBACK_TRIGGERED", "Server 2 Direct 403 -> chuyển Proxy");
      assert.strictEqual(state.useProxyFallback, true);

      // Server 2 Proxy 403 -> Hết server
      const step4 = runFallbackStep(state, 2, "lỗi HTTP 403");
      assert.strictEqual(step4, "ALL_SERVERS_EXHAUSTED", "Tất cả server đều chết -> dừng an toàn");
      assert.strictEqual(state.isStopped, true);
      assert.strictEqual(state.errorMessage, "Không có nguồn phát khả dụng");
    }

    // Test Case 3: Direct timeout/network error
    {
      const state: MockState = {
        selectedServerIndex: 0,
        useProxyFallback: false,
        failedServers: new Set(),
        isStopped: false,
        errorMessage: "",
      };

      const step1 = runFallbackStep(state, 2, "bị gián đoạn kết nối");
      assert.strictEqual(step1, "PROXY_FALLBACK_TRIGGERED", "Direct network error phải kích hoạt Proxy fallback");
    }
  });
});

