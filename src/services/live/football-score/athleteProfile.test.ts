import { test, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getAthleteProfile,
  clearAthleteProfileCache,
  isPermittedOpenLicense,
} from "./athleteProfile";

describe("Athlete Profile Service & Security Audit", () => {
  it("rejects invalid athlete IDs gracefully and prevents injection", async () => {
    // Empty ID
    const res1 = await getAthleteProfile("");
    assert.strictEqual(res1, null);

    // Path traversal / Malicious characters
    const res2 = await getAthleteProfile("../../../etc/passwd");
    assert.strictEqual(res2, null);

    // Spaces and punctuation
    const res3 = await getAthleteProfile("invalid id with spaces!");
    assert.strictEqual(res3, null);

    // Overly long ID (> 64 characters)
    const longId = "a".repeat(65);
    const res4 = await getAthleteProfile(longId);
    assert.strictEqual(res4, null);

    // SPARQL injection string
    const res5 = await getAthleteProfile('12345" . ?x ?y ?z . } #');
    assert.strictEqual(res5, null);
  });

  it("strictly validates and rejects non-free or ambiguous licenses", () => {
    // Approved open licenses
    assert.strictEqual(isPermittedOpenLicense("CC BY-SA 3.0"), true);
    assert.strictEqual(isPermittedOpenLicense("CC BY 4.0"), true);
    assert.strictEqual(isPermittedOpenLicense("CC0"), true);
    assert.strictEqual(isPermittedOpenLicense("Public domain"), true);
    assert.strictEqual(isPermittedOpenLicense("Creative Commons Attribution-Share Alike 2.0"), true);
    assert.strictEqual(isPermittedOpenLicense("GFDL"), true);

    // Prohibited / closed licenses
    assert.strictEqual(isPermittedOpenLicense("All Rights Reserved"), false);
    assert.strictEqual(isPermittedOpenLicense("Fair Use"), false);
    assert.strictEqual(isPermittedOpenLicense("Copyrighted free use"), false);
    assert.strictEqual(isPermittedOpenLicense("CC-BY-NC 4.0"), false); // Non-commercial restricted
    assert.strictEqual(isPermittedOpenLicense(""), false);
    assert.strictEqual(isPermittedOpenLicense(undefined), false);
  });

  it("preserves ESPN photo as primary source and does not overwrite", async () => {
    clearAthleteProfileCache();

    // Sébastian Breza (ID 252607) has an ESPN headshot
    const p = await getAthleteProfile("252607", "Sébastian Breza");
    assert.ok(p !== null, "Profile should be found");
    assert.strictEqual(p?.id, "252607");
    assert.strictEqual(p?.photoSource, "espn", "Photo source must remain espn");
    assert.ok(
      p?.photoUrl?.includes("espncdn.com"),
      "Photo URL must come from ESPN CDN, not overwritten by third party"
    );
    assert.strictEqual(p?.provenance?.source, "espn-core");
    assert.strictEqual(p?.citizenship, "Canada");
  });

  it("enriches missing ESPN photo with verified Wikimedia Commons portrait", async () => {
    clearAthleteProfileCache();

    // Robert Lewandowski (ID 125824) has no ESPN summary photo, but has P3681 on Wikidata
    const p = await getAthleteProfile("125824", "Robert Lewandowski");
    assert.ok(p !== null, "Profile should be found");
    assert.strictEqual(p?.id, "125824");
    assert.strictEqual(p?.citizenship, "Poland");
    assert.ok(p?.dateOfBirth?.startsWith("1988"), "Birth year must be 1988");

    // Photo must be verified from Wikimedia Commons with open license
    assert.strictEqual(p?.photoSource, "wikimedia");
    assert.ok(
      p?.photoUrl?.startsWith("https://upload.wikimedia.org/") || p?.photoUrl?.startsWith("https://thumb.wikimedia.org/"),
      "Must be wikimedia.org HTTPS",
    );
    assert.ok(isPermittedOpenLicense(p?.photoLicense), "License must be approved open license");
    assert.strictEqual(p?.provenance?.source, "espn-wikidata-hybrid");
  });

  it("deduplicates in-flight requests and avoids cross-pollination between different IDs", async () => {
    clearAthleteProfileCache();

    // Call concurrently for same athlete (125824) AND a different athlete (252607)
    const [p1, p2, p3, otherPlayer] = await Promise.all([
      getAthleteProfile("125824", "Robert Lewandowski"),
      getAthleteProfile("125824", "Robert Lewandowski"),
      getAthleteProfile("125824", "Robert Lewandowski"),
      getAthleteProfile("252607", "Sébastian Breza"),
    ]);

    assert.strictEqual(p1?.id, "125824");
    assert.strictEqual(p1, p2, "p1 and p2 must refer to the exact same cached object");
    assert.strictEqual(p2, p3, "p2 and p3 must refer to the exact same cached object");

    // Verify no cross-pollination
    assert.strictEqual(otherPlayer?.id, "252607");
    assert.notStrictEqual(p1?.id, otherPlayer?.id);
    assert.strictEqual(otherPlayer?.displayName, "Sébastian Breza");
  });

  it("handles non-existent athlete ID gracefully without throwing or creating ghost records", async () => {
    clearAthleteProfileCache();
    const res = await getAthleteProfile("999999999999");
    assert.strictEqual(res, null, "Must return null for non-existent athlete");
  });
});
