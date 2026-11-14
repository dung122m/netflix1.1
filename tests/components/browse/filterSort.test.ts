import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  unpackSort,
  packSort,
  getSortDisplayLabel,
  SORT_FIELDS,
  SORT_OPTIONS,
} from "@/components/browse/filterConstants";

describe("Browse Filter Sort — Option 1 Streaming Clean 4-Item Tests", () => {
  it("1. SORT_OPTIONS contains exactly the 4 Netflix/Apple TV+ core criteria", () => {
    assert.equal(SORT_OPTIONS.length, 4);
    assert.deepEqual(
      SORT_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
      [
        { label: "Mới cập nhật", value: "latest" },
        { label: "Xem nhiều nhất", value: "views" },
        { label: "Điểm đánh giá cao", value: "rating" },
        { label: "Năm phát hành mới", value: "year" },
      ]
    );
  });

  it("2. unpackSort correctly parses all valid sort strings into field and direction", () => {
    assert.deepEqual(unpackSort("latest"), { field: "latest", direction: "desc" });
    assert.deepEqual(unpackSort("oldest"), { field: "latest", direction: "asc" });

    assert.deepEqual(unpackSort("views"), { field: "views", direction: "desc" });
    assert.deepEqual(unpackSort("views-asc"), { field: "views", direction: "asc" });

    assert.deepEqual(unpackSort("rating"), { field: "rating", direction: "desc" });
    assert.deepEqual(unpackSort("rating-asc"), { field: "rating", direction: "asc" });

    assert.deepEqual(unpackSort("year"), { field: "year", direction: "desc" });
    assert.deepEqual(unpackSort("year-asc"), { field: "year", direction: "asc" });

    // Fallbacks
    assert.deepEqual(unpackSort(""), { field: "latest", direction: "desc" });
    assert.deepEqual(unpackSort(undefined), { field: "latest", direction: "desc" });
    assert.deepEqual(unpackSort("unknown-value"), { field: "latest", direction: "desc" });
  });

  it("3. packSort correctly encodes field and direction into canonical URL query values", () => {
    assert.equal(packSort("latest", "desc"), "latest");
    assert.equal(packSort("latest", "asc"), "oldest");

    assert.equal(packSort("views", "desc"), "views");
    assert.equal(packSort("views", "asc"), "views-asc");

    assert.equal(packSort("rating", "desc"), "rating");
    assert.equal(packSort("rating", "asc"), "rating-asc");

    assert.equal(packSort("year", "desc"), "year");
    assert.equal(packSort("year", "asc"), "year-asc");
  });

  it("4. unpackSort and packSort are symmetric roundtrips", () => {
    const testCases: Array<{ field: "latest" | "views" | "rating" | "year"; direction: "desc" | "asc" }> = [
      { field: "latest", direction: "desc" },
      { field: "latest", direction: "asc" },
      { field: "views", direction: "desc" },
      { field: "views", direction: "asc" },
      { field: "rating", direction: "desc" },
      { field: "rating", direction: "asc" },
      { field: "year", direction: "desc" },
      { field: "year", direction: "asc" },
    ];

    for (const tc of testCases) {
      const packed = packSort(tc.field, tc.direction);
      const unpacked = unpackSort(packed);
      assert.deepEqual(unpacked, tc);
    }
  });

  it("5. getSortDisplayLabel produces user-friendly labels matching SORT_OPTIONS", () => {
    const l1 = getSortDisplayLabel("year");
    assert.equal(l1.directionLabel, "Năm phát hành mới");

    const l2 = getSortDisplayLabel("views");
    assert.equal(l2.directionLabel, "Xem nhiều nhất");

    const l3 = getSortDisplayLabel("rating");
    assert.equal(l3.directionLabel, "Điểm đánh giá cao");

    const l4 = getSortDisplayLabel("latest");
    assert.equal(l4.directionLabel, "Mới cập nhật");
  });

  it("6. SORT_FIELDS contains exactly 4 canonical fields with valid icons and labels", () => {
    assert.equal(SORT_FIELDS.length, 4);
    const fields = SORT_FIELDS.map((f) => f.field);
    assert.deepEqual(fields, ["latest", "views", "rating", "year"]);
  });
});
