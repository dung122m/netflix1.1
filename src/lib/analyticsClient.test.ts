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

test("Identity prioritization: Authenticated user vs Unauthenticated guest", () => {
  // Case 1: Authenticated user
  const authPayload = {
    eventType: "movie_view" as const,
    movieSlug: "hoan-chau-cach-cach",
    userId: "usr_dung_tran_123",
    anonymousId: "anon_97ac11247e90c461",
  };

  const resolvedAuthUser = authPayload.userId?.trim() || undefined;
  const resolvedAuthAnon = resolvedAuthUser ? "" : (authPayload.anonymousId?.trim() || "anon_unknown");
  const authViewerKey = resolvedAuthUser || resolvedAuthAnon;

  assert.equal(resolvedAuthUser, "usr_dung_tran_123");
  assert.equal(resolvedAuthAnon, "");
  assert.equal(authViewerKey, "usr_dung_tran_123");

  // Case 2: Unauthenticated guest
  const guestPayload = {
    eventType: "movie_view" as const,
    movieSlug: "hoan-chau-cach-cach",
    userId: undefined,
    anonymousId: "anon_97ac11247e90c461",
  };

  const resolvedGuestUser = (guestPayload.userId as string | undefined)?.trim() || undefined;
  const resolvedGuestAnon = resolvedGuestUser ? "" : (guestPayload.anonymousId?.trim() || "anon_unknown");
  const guestViewerKey = resolvedGuestUser || resolvedGuestAnon;

  assert.equal(resolvedGuestUser, undefined);
  assert.equal(resolvedGuestAnon, "anon_97ac11247e90c461");
  assert.equal(guestViewerKey, "anon_97ac11247e90c461");
});
