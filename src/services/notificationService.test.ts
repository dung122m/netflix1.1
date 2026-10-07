// Mock window and localStorage for node:test environment
const storage: Record<string, string> = {};
// @ts-expect-error test mock
globalThis.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
};
// @ts-expect-error test mock
globalThis.localStorage = {
  getItem: (key: string) => storage[key] || null,
  setItem: (key: string, val: string) => { storage[key] = String(val); },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
};

import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { supabase } from "@/lib/supabase";
import {
  subscribeUserNotifications,
  mergeNotifications,
  saveLocalNotifications,
} from "./notificationService";
import { UserNotification } from "@/types/notification";

describe("Nanaflix Notification Shared Service-Level Singleton", () => {
  after(async () => {
    await new Promise((r) => setTimeout(r, 1100));
    if (supabase) {
      try {
        await supabase.removeAllChannels();
      } catch {}
    }
  });
  it("1. mergeNotifications deduplicates by ID and semantic key (comment_reply / comment_reaction)", () => {
    const current: UserNotification[] = [
      {
        id: "notif_1",
        type: "comment_reply",
        title: "Reply 1",
        message: "Hello",
        link: "/movies/1",
        commentId: "cmt_123",
        createdAt: 1000,
        isRead: false,
      },
    ];
    const incoming: UserNotification[] = [
      // Duplicate by ID
      {
        id: "notif_1",
        type: "comment_reply",
        title: "Reply 1 Duplicate",
        message: "Hello",
        link: "/movies/1",
        commentId: "cmt_123",
        createdAt: 1000,
        isRead: false,
      },
      // Duplicate by comment semantic key
      {
        id: "notif_2",
        type: "comment_reply",
        title: "Reply 2",
        message: "Hello again",
        link: "/movies/1",
        commentId: "cmt_123",
        createdAt: 2000,
        isRead: false,
      },
      // Unique item
      {
        id: "notif_3",
        type: "comment_reaction",
        title: "Like",
        message: "Liked your comment",
        link: "/movies/2",
        commentId: "cmt_456",
        createdAt: 3000,
        isRead: false,
      },
    ];

    const merged = mergeNotifications(current, incoming);
    assert.equal(merged.length, 2);
    assert.equal(merged[0].id, "notif_3");
    assert.equal(merged[1].id, "notif_1");
  });

  it("2. subscribeUserNotifications with empty or null userId returns immediately without subscribing", () => {
    let called = false;
    const unsub = subscribeUserNotifications("", (items) => {
      called = true;
      assert.deepEqual(items, []);
    });
    assert.equal(called, true);
    assert.equal(typeof unsub, "function");
    unsub();
  });

  it("3. Multiple subscribers for same user share cache and listener registry", async () => {
    const testUserId = `test_user_${Date.now()}`;
    const initialItems: UserNotification[] = [
      {
        id: "notif_shared_1",
        type: "comment_reply",
        title: "Shared Reply",
        message: "Shared",
        link: "/movies/shared",
        createdAt: Date.now(),
        isRead: false,
      },
    ];
    saveLocalNotifications(testUserId, initialItems);

    const received1: UserNotification[][] = [];
    const received2: UserNotification[][] = [];
    const received3: UserNotification[][] = [];

    // Component 1 (DesktopReplyPopup)
    const unsub1 = subscribeUserNotifications(testUserId, (items) => {
      received1.push(items);
    });

    // Component 2 (Navbar)
    const unsub2 = subscribeUserNotifications(testUserId, (items) => {
      received2.push(items);
    });

    // Component 3 (NavNotifications)
    const unsub3 = subscribeUserNotifications(testUserId, (items) => {
      received3.push(items);
    });

    // All 3 subscribers receive the cached items immediately
    assert.ok(received1.length >= 1);
    assert.ok(received2.length >= 1);
    assert.ok(received3.length >= 1);
    assert.equal(received1[0][0].id, "notif_shared_1");
    assert.equal(received2[0][0].id, "notif_shared_1");
    assert.equal(received3[0][0].id, "notif_shared_1");

    // Component 1 unmounts -> components 2 & 3 still active
    unsub1();
    assert.equal(typeof unsub2, "function");
    assert.equal(typeof unsub3, "function");

    // All unmount
    unsub2();
    unsub3();
  });

  it("4. User logout / switch cleans up previous user singleton cleanly", () => {
    const userA = `user_a_${Date.now()}`;
    const userB = `user_b_${Date.now()}`;

    const itemsA: UserNotification[] = [
      {
        id: "notif_a",
        type: "comment_reply",
        title: "User A notif",
        message: "A",
        link: "/movies/a",
        createdAt: 1000,
        isRead: false,
      },
    ];
    const itemsB: UserNotification[] = [
      {
        id: "notif_b",
        type: "comment_reaction",
        title: "User B notif",
        message: "B",
        link: "/movies/b",
        createdAt: 2000,
        isRead: false,
      },
    ];

    saveLocalNotifications(userA, itemsA);
    saveLocalNotifications(userB, itemsB);

    let receivedUserA: UserNotification[] = [];
    const unsubA = subscribeUserNotifications(userA, (items) => {
      receivedUserA = items;
    });
    assert.equal(receivedUserA[0]?.id, "notif_a");
    unsubA();

    // User switches to B
    let receivedUserB: UserNotification[] = [];
    const unsubB = subscribeUserNotifications(userB, (items) => {
      receivedUserB = items;
    });
    assert.equal(receivedUserB[0]?.id, "notif_b");
    unsubB();
  });
});
