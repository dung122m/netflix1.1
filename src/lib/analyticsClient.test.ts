import test from "node:test";
import assert from "node:assert/strict";
import { isValidAnonymousId } from "./analyticsClient";

test("isValidAnonymousId correctly validates anonymous identity format", () => {
  // Valid IDs
  assert.equal(isValidAnonymousId("anon_12345678"), true);
  assert.equal(isValidAnonymousId("anon_ecdcff123456"), true);
  assert.equal(isValidAnonymousId("anon_a1b2c3d4e5f67890"), true);
  assert.equal(isValidAnonymousId("anon_97ac11247e90c461"), true);

  // Invalid IDs
  assert.equal(isValidAnonymousId(""), false);
  assert.equal(isValidAnonymousId(null), false);
  assert.equal(isValidAnonymousId(undefined), false);
  assert.equal(isValidAnonymousId("user_12345"), false);
  assert.equal(isValidAnonymousId("anon_12"), false); // too short (< 8 chars payload)
  assert.equal(isValidAnonymousId("anon_!@#$%^"), false); // invalid characters
  assert.equal(isValidAnonymousId(12345), false);
});
