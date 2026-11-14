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
  getFavoriteActors,
  isFavoriteActor,
  addFavoriteActor,
  removeFavoriteActor,
  toggleFavoriteActor,
  clearFavoriteActors,
  subscribeToFavoriteActors,
} from "@/lib/favoriteActors";

describe("Nanaflix Favorite Actors Store Tests", () => {
  beforeEach(() => {
    clearFavoriteActors();
    Object.keys(storage).forEach((k) => delete storage[k]);
  });

  it("should start with an empty list", () => {
    const list = getFavoriteActors();
    assert.deepEqual(list, []);
    assert.equal(isFavoriteActor("thu-ky"), false);
  });

  it("should add an actor to favorites", () => {
    addFavoriteActor({
      id: 21911,
      name: "Thư Kỳ",
      slug: "21911-thu-ky",
      avatarUrl: "https://image.tmdb.org/t/p/w500/shu_qi.jpg",
      country: "Đài Loan",
      totalMovies: 38,
    });

    const list = getFavoriteActors();
    assert.equal(list.length, 1);
    assert.equal(list[0].name, "Thư Kỳ");
    assert.equal(list[0].id, 21911);
    assert.equal(isFavoriteActor(21911), true);
    assert.equal(isFavoriteActor("21911-thu-ky"), true);
    assert.equal(isFavoriteActor("21911"), true);
  });

  it("should not duplicate when adding same actor twice", () => {
    addFavoriteActor({
      id: "hu-ke",
      name: "Hồ Ca",
      slug: "hu-ke",
    });
    addFavoriteActor({
      id: "hu-ke",
      name: "Hồ Ca",
      slug: "hu-ke",
    });

    const list = getFavoriteActors();
    assert.equal(list.length, 1);
  });

  it("should toggle favorite actor state correctly", () => {
    const actor = {
      id: 1234,
      name: "Cổ Thiên Lạc",
      slug: "co-thien-lac",
    };

    // First toggle: added -> returns true
    const added = toggleFavoriteActor(actor);
    assert.equal(added, true);
    assert.equal(isFavoriteActor(1234), true);

    // Second toggle: removed -> returns false
    const removed = toggleFavoriteActor(actor);
    assert.equal(removed, false);
    assert.equal(isFavoriteActor(1234), false);
    assert.equal(getFavoriteActors().length, 0);
  });

  it("should remove actor by ID or slug", () => {
    addFavoriteActor({
      id: 101,
      name: "Châu Tinh Trì",
      slug: "chau-tinh-tri",
    });
    addFavoriteActor({
      id: 102,
      name: "Lương Triều Vỹ",
      slug: "luong-trieu-vy",
    });

    assert.equal(getFavoriteActors().length, 2);

    // Remove by slug
    removeFavoriteActor("chau-tinh-tri");
    assert.equal(isFavoriteActor("chau-tinh-tri"), false);
    assert.equal(isFavoriteActor(101), false);
    assert.equal(getFavoriteActors().length, 1);

    // Remove by id
    removeFavoriteActor(102);
    assert.equal(isFavoriteActor(102), false);
    assert.equal(getFavoriteActors().length, 0);
  });

  it("should clear all favorite actors", () => {
    addFavoriteActor({ id: 1, name: "Actor A", slug: "actor-a" });
    addFavoriteActor({ id: 2, name: "Actor B", slug: "actor-b" });
    assert.equal(getFavoriteActors().length, 2);

    clearFavoriteActors();
    assert.equal(getFavoriteActors().length, 0);
    assert.equal(isFavoriteActor(1), false);
    assert.equal(isFavoriteActor(2), false);
  });

  it("should notify subscribers when favorite actors change", () => {
    let callCount = 0;
    let latestList: any[] = [];

    const unsubscribe = subscribeToFavoriteActors((actors) => {
      callCount++;
      latestList = actors;
    });

    addFavoriteActor({ id: 99, name: "Triệu Lệ Dĩnh", slug: "trieu-le-dinh" });
    assert.equal(callCount, 1);
    assert.equal(latestList.length, 1);
    assert.equal(latestList[0].name, "Triệu Lệ Dĩnh");

    unsubscribe();
    addFavoriteActor({ id: 100, name: "Dương Mịch", slug: "duong-mich" });
    // Subscriber was unsubscribed, count remains 1
    assert.equal(callCount, 1);
  });
});
