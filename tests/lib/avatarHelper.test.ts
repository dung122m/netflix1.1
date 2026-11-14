import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getUploadedAvatarsHistory,
  saveUploadedAvatarToHistory,
  removeUploadedAvatarFromHistory,
} from "../../src/lib/avatarHelper.js";

// Mock localStorage for node test environment
class MockLocalStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

describe("avatarHelper uploaded avatar history", () => {
  beforeEach(() => {
    (globalThis as unknown as { window: unknown }).window = globalThis;
    (globalThis as unknown as { localStorage: MockLocalStorage }).localStorage = new MockLocalStorage();
  });

  it("should return empty array when no avatars uploaded", () => {
    const list = getUploadedAvatarsHistory("user_123");
    assert.deepEqual(list, []);
  });

  it("should save and retrieve uploaded avatars", () => {
    const url1 = "https://example.com/avatar1.jpg";
    const url2 = "https://example.com/avatar2.jpg";

    saveUploadedAvatarToHistory(url1, "user_123");
    const updated = saveUploadedAvatarToHistory(url2, "user_123");

    assert.deepEqual(updated, [url2, url1]);
    assert.deepEqual(getUploadedAvatarsHistory("user_123"), [url2, url1]);
  });

  it("should deduplicate and move latest avatar to front", () => {
    const url1 = "https://example.com/avatar1.jpg";
    const url2 = "https://example.com/avatar2.jpg";

    saveUploadedAvatarToHistory(url1, "user_123");
    saveUploadedAvatarToHistory(url2, "user_123");
    const result = saveUploadedAvatarToHistory(url1, "user_123");

    assert.deepEqual(result, [url1, url2]);
  });

  it("should isolate avatars between different users", () => {
    const url1 = "https://example.com/user1.jpg";
    const url2 = "https://example.com/user2.jpg";

    saveUploadedAvatarToHistory(url1, "user_1");
    saveUploadedAvatarToHistory(url2, "user_2");

    assert.deepEqual(getUploadedAvatarsHistory("user_1"), [url1]);
    assert.deepEqual(getUploadedAvatarsHistory("user_2"), [url2]);
  });

  it("should cap at maximum 8 avatars", () => {
    for (let i = 1; i <= 10; i++) {
      saveUploadedAvatarToHistory(`https://example.com/avatar${i}.jpg`, "user_cap");
    }
    const history = getUploadedAvatarsHistory("user_cap");
    assert.equal(history.length, 8);
    assert.equal(history[0], "https://example.com/avatar10.jpg");
    assert.equal(history[7], "https://example.com/avatar3.jpg");
  });

  it("should remove avatar from history", () => {
    const url1 = "https://example.com/a1.jpg";
    const url2 = "https://example.com/a2.jpg";

    saveUploadedAvatarToHistory(url1, "user_del");
    saveUploadedAvatarToHistory(url2, "user_del");

    const afterRemove = removeUploadedAvatarFromHistory(url1, "user_del");
    assert.deepEqual(afterRemove, [url2]);
    assert.deepEqual(getUploadedAvatarsHistory("user_del"), [url2]);
  });
});
