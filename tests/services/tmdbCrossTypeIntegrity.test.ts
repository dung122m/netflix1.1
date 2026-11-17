import test from "node:test";
import assert from "node:assert/strict";
import { getTmdbMovieCredits, searchTmdbPosterByTitle } from "@/services/tmdbService";
import { queryMoviesByActor } from "@/services/aiActorService";

test("TMDb ID Namespace isolation: TV 337958 must not return Australian movie cast", async () => {
  const credits = await getTmdbMovieCredits("337958", "tv");
  const hasAustralian = credits.some((c) =>
    c.name.toLowerCase().includes("caton") || c.name.toLowerCase().includes("weaver")
  );
  assert.equal(hasAustralian, false, "Should not return Australian cast from movie 337958 for TV show 337958");
});

test("TMDb ID Namespace isolation: TV 333093 must not return Egyptian movie cast", async () => {
  const credits = await getTmdbMovieCredits("333093", "tv");
  const hasEgyptian = credits.some((c) =>
    c.name.toLowerCase().includes("yaseen") || c.name.toLowerCase().includes("henedi")
  );
  assert.equal(hasEgyptian, false, "Should not return Egyptian cast from movie 333093 for TV show 333093");
});

test("Poster hijacking protection: Foreign film 'Hamlet' must not match Vietnamese title with expectedCountry='VN'", async () => {
  const poster = await searchTmdbPosterByTitle("Hamlet", 2026, "movie", undefined, "VN");
  assert.equal(poster.posterUrl, null, "Should reject foreign English Hamlet poster when expecting Vietnamese movie");
});

test("Poster stub protection: 'Xóm Nhỏ' 2026 must reject unverified TMDb stub 339621", async () => {
  const poster = await searchTmdbPosterByTitle("Xóm Nhỏ", 2026, "series", undefined, "VN");
  assert.equal(Boolean(poster.posterUrl?.includes("bA5NTUg4c1G7xi256yzBcQJaHgD")), false, "Should not return Hamlet poster for Xom Nho");
  assert.equal(poster.posterUrl, null, "Should return null so official upstream poster is retained");
});

test("Dynamic actor filmography: Tran Thanh and Truong Giang must return films without hardcoding", async () => {
  const ttMovies = await queryMoviesByActor("Trấn Thành", ["Trấn Thành", "Tran Thanh", "Huỳnh Trấn Thành"]);
  assert.ok(ttMovies.length > 0, "Trấn Thành should have at least 1 movie");

  const tgMovies = await queryMoviesByActor("Trường Giang", ["Trường Giang", "Truong Giang", "Võ Vũ Trường Giang"]);
  assert.ok(tgMovies.length > 0, "Trường Giang should have at least 1 movie");
});
