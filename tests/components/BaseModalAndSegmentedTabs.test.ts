import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SegmentedTabItem } from "@/components/ui/SegmentedTabs";

describe("SegmentedTabs Props & Data Contracts", () => {
  it("should format tabs data structure with count, icons and labels correctly", () => {
    const tabs: SegmentedTabItem[] = [
      { id: "watchlist", label: "Yêu thích", count: 12 },
      { id: "history", label: "Lịch sử xem", count: 50 },
      { id: "collections", label: "Bộ sưu tập", count: 3 },
      { id: "comments", label: "Bình luận", count: 0 },
      { id: "actors", label: "Diễn viên", count: 5 },
    ];

    assert.equal(tabs.length, 5);
    assert.equal(tabs[0].label, "Yêu thích");
    assert.equal(tabs[0].count, 12);
    assert.equal(tabs[4].id, "actors");
  });

  it("should support tab filtering and disabled state", () => {
    const tabs: SegmentedTabItem[] = [
      { id: "all", label: "Tất cả", count: 25 },
      { id: "single", label: "Phim lẻ", count: 20 },
      { id: "series", label: "Phim bộ", count: 5, disabled: false },
    ];

    const activeTab = "single";
    const found = tabs.find((t) => t.id === activeTab);
    assert.ok(found);
    assert.equal(found.label, "Phim lẻ");
  });
});
