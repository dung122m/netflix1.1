/* eslint-disable @typescript-eslint/no-explicit-any */
// Mock window and localStorage for node:test environment BEFORE imports
const storage: Record<string, string> = {};
const listeners: Record<string, Array<(...args: any[]) => void>> = {};

// @ts-expect-error test mock
globalThis.window = {
  addEventListener: (event: string, cb: any) => {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(cb);
  },
  removeEventListener: (event: string, cb: any) => {
    if (listeners[event]) {
      listeners[event] = listeners[event].filter((f) => f !== cb);
    }
  },
  dispatchEvent: (event: any) => {
    const type = event.type || event;
    if (listeners[type]) {
      listeners[type].forEach((cb) => cb(event));
    }
    return true;
  },
};

// @ts-expect-error test mock
globalThis.CustomEvent = class CustomEvent {
  type: string;
  detail: any;
  constructor(type: string, params?: { detail?: any }) {
    this.type = type;
    this.detail = params?.detail;
  }
};

// @ts-expect-error test mock
globalThis.localStorage = {
  getItem: (key: string) => storage[key] || null,
  setItem: (key: string, val: string) => { storage[key] = String(val); },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
};

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  saveWatchHistory,
  saveWatchProgress,
  getWatchHistory,
  setWatchHistoryFromSync,
  getEpisodeProgress,
  getAllEpisodeProgress,
  invalidateMemoryWatchHistory,
  MAX_HISTORY_STORAGE_ITEMS,
} from "./watchHistory";
import { isContinueWatchingItem } from "@/components/ContinueWatchingRow";

describe("Nanaflix Watch History — Regression & Invariant Tests", () => {
  beforeEach(() => {
    Object.keys(storage).forEach((k) => delete storage[k]);
    invalidateMemoryWatchHistory();
  });

  it("1. Lưu 50 phim: xác minh không còn cắt ở 20, lưu đủ 50 bản ghi", () => {
    for (let i = 1; i <= 50; i++) {
      saveWatchHistory({
        slug: `movie-${i}`,
        title: `Phim Số ${i}`,
        poster: `https://example.com/poster-${i}.jpg`,
        updatedAt: 1000 + i,
      });
    }

    const history = getWatchHistory();
    assert.equal(history.length, 50, "Lịch sử phải lưu đủ 50 phim, không bị cắt cụt ở 20");
    assert.equal(history[0].slug, "movie-50", "Phim vừa xem gần nhất phải nằm ở vị trí đầu tiên (MRU)");
    assert.equal(history[49].slug, "movie-1", "Phim xem sớm nhất phải nằm ở cuối danh sách");
  });

  it("2. MRU invariant: xem lại phim thứ 35, phim đó lên đầu, tổng số vẫn là 50 (không duplicate)", () => {
    for (let i = 1; i <= 50; i++) {
      saveWatchHistory({
        slug: `movie-${i}`,
        title: `Phim Số ${i}`,
        poster: `https://example.com/poster-${i}.jpg`,
        updatedAt: 1000 + i,
      });
    }

    // Xem lại movie-35 với tiến độ mới và thời điểm mới
    const targetSlug = "movie-35";
    saveWatchProgress(targetSlug, 1200, 7200, "tap-1");

    const history = getWatchHistory();
    assert.equal(history.length, 50, "Tổng số phim vẫn phải là 50 (không tạo duplicate)");
    assert.equal(history[0].slug, targetSlug, "Phim thứ 35 vừa xem lại phải được đưa lên đầu danh sách");
    assert.equal(history[0].progressSeconds, 1200, "Tiến độ xem của phim phải được cập nhật");
    assert.equal(history[0].episodeSlug, "tap-1", "Tập phim phải được cập nhật");

    // Đảm bảo movie-35 chỉ xuất hiện duy nhất 1 lần trong mảng
    const occurrences = history.filter((m) => m.slug === targetSlug);
    assert.equal(occurrences.length, 1, "Movie 35 chỉ được xuất hiện đúng 1 lần");
  });

  it("3. Tiến độ tập: chuyển từ tập 1 sang tập 2 mà tiến độ từng tập vẫn nguyên vẹn", () => {
    const slug = "series-test";

    // Xem tập 1: 500 giây / 2700 giây
    saveWatchProgress(slug, 500, 2700, "tap-1");
    assert.equal(getEpisodeProgress(slug, "tap-1"), 500);

    // Chuyển sang tập 2: 120 giây / 2700 giây
    saveWatchProgress(slug, 120, 2700, "tap-2");
    assert.equal(getEpisodeProgress(slug, "tap-2"), 120);

    // Kiểm tra tập 1 vẫn giữ nguyên 500 giây
    assert.equal(getEpisodeProgress(slug, "tap-1"), 500, "Tiến độ tập 1 phải được bảo toàn độc lập khi chuyển sang tập 2");

    // Xem cả bản đồ chi tiết
    const epMap = getAllEpisodeProgress();
    assert.ok(epMap[slug], "Phải có bản ghi cho series-test trong epMap");
    assert.equal(epMap[slug]["tap-1"].progressSeconds, 500);
    assert.equal(epMap[slug]["tap-2"].progressSeconds, 120);
  });

  it("4. Phim đạt 96%: không còn trong Tiếp tục xem nhưng vẫn còn trong Lịch sử xem", () => {
    // Phim A: xem 50% (1800s / 3600s) -> phải xuất hiện ở Tiếp tục xem
    const itemA = {
      slug: "movie-in-progress",
      title: "Đang xem dở",
      poster: "https://example.com/a.jpg",
      progressSeconds: 1800,
      durationSeconds: 3600,
      updatedAt: Date.now(),
    };
    saveWatchHistory(itemA);

    // Phim B: xem 96% (3456s / 3600s) -> >= 95%, loại khỏi Tiếp tục xem
    const itemB = {
      slug: "movie-completed",
      title: "Đã xem xong",
      poster: "https://example.com/b.jpg",
      progressSeconds: 3456,
      durationSeconds: 3600,
      updatedAt: Date.now() + 10,
    };
    saveWatchHistory(itemB);

    const history = getWatchHistory();
    assert.equal(history.length, 2, "Cả 2 phim đều phải có trong Lịch sử xem");

    // Kiểm tra isContinueWatchingItem
    assert.equal(isContinueWatchingItem(history[0]), false, "Phim đạt 96% phải trả về false cho isContinueWatchingItem");
    assert.equal(isContinueWatchingItem(history[1]), true, "Phim đạt 50% phải trả về true cho isContinueWatchingItem");

    const continueWatchingList = history.filter(isContinueWatchingItem);
    assert.equal(continueWatchingList.length, 1, "Hàng Tiếp tục xem chỉ hiển thị 1 phim đang xem dở");
    assert.equal(continueWatchingList[0].slug, "movie-in-progress");
  });

  it("5. History grid pagination: ban đầu hiển thị 20, nhấn xem thêm hiển thị 40 rồi 50", () => {
    const PAGE_SIZE = 20;
    // Tạo 50 bản ghi
    for (let i = 1; i <= 50; i++) {
      saveWatchHistory({
        slug: `grid-movie-${i}`,
        title: `Phim Grid ${i}`,
        poster: `https://example.com/poster-${i}.jpg`,
        updatedAt: 1000 + i,
      });
    }

    const history = getWatchHistory();
    assert.equal(history.length, 50);

    // Bước 1: Khởi tạo trang với visibleCount = 20
    let visibleCount = PAGE_SIZE;
    let displayed = history.slice(0, visibleCount);
    let hasMore = history.length > visibleCount;
    assert.equal(displayed.length, 20, "Ban đầu trang lịch sử chỉ hiển thị 20 card");
    assert.equal(hasMore, true, "Phải có nút xem thêm khi tổng số phim (50) > số hiển thị (20)");

    // Bước 2: Nhấn 'Xem thêm 20 phim' lần 1
    visibleCount += PAGE_SIZE;
    displayed = history.slice(0, visibleCount);
    hasMore = history.length > visibleCount;
    assert.equal(displayed.length, 40, "Sau khi nhấn xem thêm lần 1, hiển thị 40 card");
    assert.equal(hasMore, true, "Vẫn còn phim để xem thêm");

    // Bước 3: Nhấn 'Xem thêm 20 phim' lần 2
    visibleCount += PAGE_SIZE;
    displayed = history.slice(0, visibleCount);
    hasMore = history.length > visibleCount;
    assert.equal(displayed.length, 50, "Sau khi nhấn xem thêm lần 2, hiển thị trọn vẹn 50 card");
    assert.equal(hasMore, false, "Không còn nút xem thêm khi đã render toàn bộ 50 phim");
  });

  it("6. Tổng số phim phản ánh tổng lịch sử truy xuất (50), không phải số card đang hiển thị (20)", () => {
    for (let i = 1; i <= 50; i++) {
      saveWatchHistory({
        slug: `count-movie-${i}`,
        title: `Phim Count ${i}`,
        poster: `https://example.com/poster-${i}.jpg`,
        updatedAt: 1000 + i,
      });
    }

    const history = getWatchHistory();
    const visibleCount = 20;
    const displayed = history.slice(0, visibleCount);

    assert.equal(displayed.length, 20, "Số card render là 20");
    assert.equal(history.length, 50, "Header badge đếm tổng số phim phải là 50 chứ không phải 20");
  });

  it("7. Cloud sync: setWatchHistoryFromSync lưu trọn vẹn danh sách đến MAX_HISTORY_STORAGE_ITEMS (150)", () => {
    const cloudItems = [];
    for (let i = 1; i <= 150; i++) {
      cloudItems.push({
        slug: `cloud-movie-${i}`,
        title: `Cloud Movie ${i}`,
        poster: `https://example.com/cloud-${i}.jpg`,
        updatedAt: 5000 + i,
      });
    }

    setWatchHistoryFromSync(cloudItems);
    const stored = getWatchHistory();
    assert.equal(stored.length, 150, "setWatchHistoryFromSync phải lưu trọn vẹn 150 phim từ cloud, không cắt ở 20");
    assert.equal(stored[0].slug, "cloud-movie-150", "Sắp xếp theo updatedAt giảm dần");
    assert.equal(MAX_HISTORY_STORAGE_ITEMS, 150);
  });

  it("8. Cloud trả về rỗng và tài khoản mới: dọn sạch local history, không rò rỉ dữ liệu phiên trước", () => {
    // Phiên khách trước đó để lại 10 phim trong storage
    for (let i = 1; i <= 10; i++) {
      saveWatchHistory({
        slug: `guest-movie-${i}`,
        title: `Guest Movie ${i}`,
        poster: `https://example.com/guest-${i}.jpg`,
        updatedAt: 1000 + i,
      });
    }
    assert.equal(getWatchHistory().length, 10);

    // Khi người dùng mới đăng nhập với tài khoản mới tinh (cloud trả về rỗng []),
    // setWatchHistoryFromSync([]) dọn sạch local history để ngăn rò rỉ
    setWatchHistoryFromSync([]);
    assert.deepEqual(getWatchHistory(), [], "Lịch sử phải được dọn sạch về rỗng cho tài khoản mới");
  });

  it("9. Reload trang và khôi phục từ Storage: invalidateMemoryWatchHistory đọc lại đầy đủ", () => {
    for (let i = 1; i <= 45; i++) {
      saveWatchHistory({
        slug: `persist-movie-${i}`,
        title: `Persist Movie ${i}`,
        poster: `https://example.com/persist-${i}.jpg`,
        updatedAt: 2000 + i,
      });
    }

    // Mô phỏng reload trang: xóa biến bộ nhớ in-memory
    invalidateMemoryWatchHistory();

    const reloadedHistory = getWatchHistory();
    assert.equal(reloadedHistory.length, 45, "Sau khi reload trang, 45 bản ghi trong localStorage vẫn được đọc ra đầy đủ");
    assert.equal(reloadedHistory[0].slug, "persist-movie-45");
  });

  it("10. Series / Episode không tạo duplicate slug khi xem nhiều tập khác nhau", () => {
    const slug = "series-attack-on-titan";

    // Xem tập 1
    saveWatchProgress(slug, 300, 1440, "tap-1", { title: "Đại Chiến Titan", poster: "/aot.jpg" });
    // Xem tập 2
    saveWatchProgress(slug, 600, 1440, "tap-2", { title: "Đại Chiến Titan", poster: "/aot.jpg" });
    // Xem tập 3
    saveWatchProgress(slug, 900, 1440, "tap-3", { title: "Đại Chiến Titan", poster: "/aot.jpg" });

    const history = getWatchHistory();
    const seriesRecords = history.filter((m) => m.slug === slug);

    assert.equal(seriesRecords.length, 1, "Series chỉ được có 1 bản ghi duy nhất trong danh sách lịch sử tổng");
    assert.equal(seriesRecords[0].episodeSlug, "tap-3", "Bản ghi phải trỏ tới tập vừa xem gần nhất");
    assert.equal(seriesRecords[0].progressSeconds, 900);

    // Kiểm tra cả 3 tập đều lưu tiến độ riêng trong episode progress map
    assert.equal(getEpisodeProgress(slug, "tap-1"), 300);
    assert.equal(getEpisodeProgress(slug, "tap-2"), 600);
    assert.equal(getEpisodeProgress(slug, "tap-3"), 900);
  });
});
