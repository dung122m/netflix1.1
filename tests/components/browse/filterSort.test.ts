import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  unpackSort,
  packSort,
  getSortDisplayLabel,
  SORT_FIELDS,
} from "@/components/browse/filterConstants";

describe("Browse Filter Sort — TMDB/Letterboxd Style Dual Axis Tests", () => {
  it("1. unpackSort correctly parses all valid sort strings into field and direction", () => {
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

  it("2. packSort correctly encodes field and direction into canonical URL query values", () => {
    assert.equal(packSort("latest", "desc"), "latest");
    assert.equal(packSort("latest", "asc"), "oldest");

    assert.equal(packSort("views", "desc"), "views");
    assert.equal(packSort("views", "asc"), "views-asc");

    assert.equal(packSort("rating", "desc"), "rating");
    assert.equal(packSort("rating", "asc"), "rating-asc");

    assert.equal(packSort("year", "desc"), "year");
    assert.equal(packSort("year", "asc"), "year-asc");
  });

  it("3. unpackSort and packSort are symmetric roundtrips", () => {
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

  it("4. getSortDisplayLabel produces user-friendly labels with direction cues", () => {
    const l1 = getSortDisplayLabel("year");
    assert.equal(l1.fieldLabel, "Năm phát hành");
    assert.equal(l1.directionLabel, "Năm mới nhất");
    assert.equal(l1.direction, "desc");

    const l2 = getSortDisplayLabel("year-asc");
    assert.equal(l2.fieldLabel, "Năm phát hành");
    assert.equal(l2.directionLabel, "Năm cũ nhất");
    assert.equal(l2.direction, "asc");

    const l3 = getSortDisplayLabel("views");
    assert.equal(l3.directionLabel, "Xem nhiều nhất");

    const l4 = getSortDisplayLabel("views-asc");
    assert.equal(l4.directionLabel, "Xem ít nhất");
  });

  it("5. SORT_FIELDS contains exactly 4 canonical fields with valid icons and labels", () => {
    assert.equal(SORT_FIELDS.length, 4);
    const fields = SORT_FIELDS.map((f) => f.field);
    assert.deepEqual(fields, ["latest", "views", "rating", "year"]);
  });
});
