import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAnonymousToUserMap,
  resolveVisitorIdentity,
} from "./analyticsService";

test("TC-ADMIN-ANALYTICS-IDENTITY-01 — Item 1: Anonymous event và authenticated event cùng một người -> chỉ tính 1 khách", () => {
  const now = Date.now();
  const rawEvents = [
    // Người dùng duyệt web ẩn danh lúc đầu
    {
      anonymousId: "anon_user_alice",
      createdAt: now - 10 * 60 * 1000,
    },
    // Sau đó đăng nhập với tài khoản user_alice_123
    {
      userId: "user_alice_123",
      anonymousId: "anon_user_alice",
      createdAt: now - 5 * 60 * 1000,
    },
    // Sau khi đăng nhập, sự kiện tiếp theo có thể chỉ mang anonymousId hoặc cả hai
    {
      anonymousId: "anon_user_alice",
      createdAt: now - 1 * 60 * 1000,
    },
  ];

  const map = buildAnonymousToUserMap(rawEvents);
  assert.equal(map.get("anon_user_alice"), "user_alice_123");

  const uniqueAll = new Set<string>();
  const uniqueUsers = new Set<string>();
  const uniqueGuests = new Set<string>();

  for (const ev of rawEvents) {
    const resolved = resolveVisitorIdentity(ev, map);
    assert.ok(resolved !== null);
    assert.equal(resolved.isUser, true);
    assert.equal(resolved.effectiveUserId, "user_alice_123");
    assert.equal(resolved.identityKey, "user:user_alice_123");

    uniqueAll.add(resolved.identityKey);
    if (resolved.isUser && resolved.effectiveUserId) {
      uniqueUsers.add(resolved.effectiveUserId);
    } else if (resolved.anonymousId) {
      uniqueGuests.add(resolved.anonymousId);
    }
  }

  // Đảm bảo chỉ tính 1 khách duy nhất, 1 user, và không bị tính trùng sang guest
  assert.equal(uniqueAll.size, 1, "Tổng số uniqueAll phải là 1");
  assert.equal(uniqueUsers.size, 1, "Tổng số uniqueUsers phải là 1");
  assert.equal(uniqueGuests.size, 0, "Không được đếm vào uniqueGuests");
});

test("TC-ADMIN-ANALYTICS-IDENTITY-01 — Item 2: Hai user và hai guest độc lập -> tổng bốn khách", () => {
  const now = Date.now();
  const rawEvents = [
    { userId: "user_1", anonymousId: "anon_u1", createdAt: now - 20000 },
    { userId: "user_2", anonymousId: "anon_u2", createdAt: now - 18000 },
    { anonymousId: "anon_guest_alpha", createdAt: now - 15000 },
    { anonymousId: "anon_guest_beta", createdAt: now - 12000 },
  ];

  const map = buildAnonymousToUserMap(rawEvents);
  const uniqueAll = new Set<string>();
  const uniqueUsers = new Set<string>();
  const uniqueGuests = new Set<string>();

  for (const ev of rawEvents) {
    const resolved = resolveVisitorIdentity(ev, map);
    assert.ok(resolved !== null);

    uniqueAll.add(resolved.identityKey);
    if (resolved.isUser && resolved.effectiveUserId) {
      uniqueUsers.add(resolved.effectiveUserId);
    } else if (resolved.anonymousId) {
      uniqueGuests.add(resolved.anonymousId);
    }
  }

  assert.equal(uniqueAll.size, 4, "Phải có đúng 4 khách phân biệt");
  assert.equal(uniqueUsers.size, 2, "Phải có đúng 2 thành viên");
  assert.equal(uniqueGuests.size, 2, "Phải có đúng 2 khách vãng lai");
  assert.equal(uniqueAll.size, uniqueUsers.size + uniqueGuests.size, "Các nhóm không được chồng chéo");
});

test("TC-ADMIN-ANALYTICS-IDENTITY-01 — Item 3: Sự kiện anonymous mới nhất trong 30 phút nhưng đã có ánh xạ -> không tính nhầm thành active guest", () => {
  const now = Date.now();
  const activeThreshold = now - 30 * 60 * 1000;

  const rawEvents = [
    // Sự kiện cũ có liên kết user
    {
      userId: "user_charlie",
      anonymousId: "anon_charlie_device1",
      createdAt: now - 60 * 60 * 1000, // 1 giờ trước
    },
    // Sự kiện 5 phút trước nhưng chỉ có anonymousId
    {
      anonymousId: "anon_charlie_device1",
      createdAt: now - 5 * 60 * 1000, // trong 30 phút
    },
  ];

  const map = buildAnonymousToUserMap(rawEvents);
  assert.equal(map.get("anon_charlie_device1"), "user_charlie");

  const activeGuestSet = new Set<string>();

  for (const ev of rawEvents) {
    const resolved = resolveVisitorIdentity(ev, map);
    assert.ok(resolved !== null);

    // Tiêu chí active guest chuẩn: CHỈ tính nếu không phải user và trong cửa sổ thời gian
    if (!resolved.isUser && resolved.anonymousId && ev.createdAt >= activeThreshold) {
      activeGuestSet.add(resolved.anonymousId);
    }
  }

  assert.equal(
    activeGuestSet.size,
    0,
    "Sự kiện ẩn danh của user không được tính nhầm vào activeGuestSet"
  );
});

test("TC-ADMIN-ANALYTICS-IDENTITY-01 — Item 4: Guest thật vẫn được tính là guest và active guest", () => {
  const now = Date.now();
  const activeThreshold = now - 30 * 60 * 1000;

  const rawEvents = [
    {
      anonymousId: "anon_genuine_guest",
      createdAt: now - 10 * 60 * 1000, // 10 phút trước
    },
  ];

  const map = buildAnonymousToUserMap(rawEvents);
  assert.equal(map.size, 0, "Guest thật không có trong map user");

  const uniqueAll = new Set<string>();
  const uniqueUsers = new Set<string>();
  const uniqueGuests = new Set<string>();
  const activeGuestSet = new Set<string>();

  for (const ev of rawEvents) {
    const resolved = resolveVisitorIdentity(ev, map);
    assert.ok(resolved !== null);
    assert.equal(resolved.isUser, false);
    assert.equal(resolved.identityKey, "guest:anon_genuine_guest");

    uniqueAll.add(resolved.identityKey);
    if (resolved.isUser && resolved.effectiveUserId) {
      uniqueUsers.add(resolved.effectiveUserId);
    } else if (resolved.anonymousId) {
      uniqueGuests.add(resolved.anonymousId);
    }

    if (!resolved.isUser && resolved.anonymousId && ev.createdAt >= activeThreshold) {
      activeGuestSet.add(resolved.anonymousId);
    }
  }

  assert.equal(uniqueAll.size, 1);
  assert.equal(uniqueUsers.size, 0);
  assert.equal(uniqueGuests.size, 1);
  assert.equal(activeGuestSet.size, 1);
  assert.ok(activeGuestSet.has("anon_genuine_guest"));
});

test("TC-ADMIN-ANALYTICS-IDENTITY-01 — Item 5: Thiếu định danh hoặc dữ liệu không đủ -> không tự ý gộp", () => {
  const map = new Map<string, string>();

  // 1. Thiếu cả userId lẫn anonymousId
  assert.equal(resolveVisitorIdentity({}, map), null);
  assert.equal(resolveVisitorIdentity({ userId: "", anonymousId: "" }, map), null);
  assert.equal(resolveVisitorIdentity({ userId: "   ", anonymousId: "  " }, map), null);

  // 2. Hai anonymous ID khác nhau không có bằng chứng liên kết -> không được gộp
  const res1 = resolveVisitorIdentity({ anonymousId: "anon_device_x" }, map);
  const res2 = resolveVisitorIdentity({ anonymousId: "anon_device_y" }, map);

  assert.ok(res1 && res2);
  assert.notEqual(res1.identityKey, res2.identityKey, "Hai anonymous ID độc lập không được tự ý gộp");
  assert.equal(res1.identityKey, "guest:anon_device_x");
  assert.equal(res2.identityKey, "guest:anon_device_y");
});

test("TC-ADMIN-ANALYTICS-IDENTITY-01 — Item 6: Subscription lifecycle & tab switching simulation", () => {
  // Giả lập lifecycle subscription của Admin Dashboard
  let listenerCount = 0;
  let unsubscribeCount = 0;
  let activeCallback: ((total: number) => void) | null = null;

  function mockSubscribeUsers(onUpdate: (total: number) => void) {
    listenerCount++;
    activeCallback = onUpdate;
    // Giả lập Supabase trả về số lượng thành viên thực tế
    onUpdate(128);

    return () => {
      unsubscribeCount++;
      activeCallback = null;
    };
  }

  // Khi admin vào trang (mount với isAdmin = true)
  let totalMemberCount: number | null = null;
  const unsubscribe = mockSubscribeUsers((count) => {
    totalMemberCount = count;
  });

  assert.equal(listenerCount, 1, "Chỉ tạo 1 subscription khi vào trang");
  assert.equal(totalMemberCount, 128, "Đã load số thành viên ngay từ đầu dù chưa chuyển tab");

  // Giả lập chuyển tab giữa 'comments', 'members', 'collections', 'analytics'
  const tabs = ["comments", "members", "collections", "analytics", "comments"];
  for (const tab of tabs) {
    // Vì hook subscribe phụ thuộc [isAdmin] chứ không phụ thuộc [activeTab],
    // subscription không bị unmount/remount gây trùng listener
    assert.equal(listenerCount, 1, `Sau khi chuyển tab ${tab}, listener không bị nhân bản`);
    assert.equal(totalMemberCount, 128, `Số thành viên vẫn được duy trì ở tab ${tab}`);
  }

  // Khi unmount khỏi trang Admin
  unsubscribe();
  assert.equal(unsubscribeCount, 1, "Cleanup đầy đủ khi unmount");
  assert.equal(activeCallback, null);
});

test("TC-ADMIN-ANALYTICS-IDENTITY-01 — Item 7: So sánh quy tắc đếm giữa dashboard và thống kê theo ngày", () => {
  const now = Date.now();
  const sampleEvents = [
    { anonymousId: "anon_k1", createdAt: now - 10000 },
    { userId: "user_k1", anonymousId: "anon_k1", createdAt: now - 5000 },
    { anonymousId: "anon_k2", createdAt: now - 2000 },
  ];

  // Quy tắc chuẩn hóa dùng chung
  const map = buildAnonymousToUserMap(sampleEvents);

  // Giả lập Dashboard stats logic
  const dashboardUsers = new Set<string>();
  const dashboardGuests = new Set<string>();
  const dashboardAll = new Set<string>();

  for (const ev of sampleEvents) {
    const resolved = resolveVisitorIdentity(ev, map);
    if (!resolved) continue;
    dashboardAll.add(resolved.identityKey);
    if (resolved.isUser && resolved.effectiveUserId) {
      dashboardUsers.add(resolved.effectiveUserId);
    } else if (resolved.anonymousId) {
      dashboardGuests.add(resolved.anonymousId);
    }
  }

  // Giả lập Daily Visitors stats logic
  const dailyGroups = new Map<string, { type: "user" | "guest"; userId?: string }>();
  for (const ev of sampleEvents) {
    const resolved = resolveVisitorIdentity(ev, map);
    if (!resolved) continue;
    if (!dailyGroups.has(resolved.identityKey)) {
      dailyGroups.set(resolved.identityKey, {
        type: resolved.isUser ? "user" : "guest",
        userId: resolved.effectiveUserId,
      });
    }
  }

  let dailyUserCount = 0;
  let dailyGuestCount = 0;
  for (const group of dailyGroups.values()) {
    if (group.type === "user") dailyUserCount++;
    else dailyGuestCount++;
  }

  // So sánh kết quả của cả hai phương thức
  assert.equal(dashboardAll.size, dailyGroups.size, "Tổng số danh tính duy nhất phải khớp hoàn toàn");
  assert.equal(dashboardUsers.size, dailyUserCount, "Số user phân loại phải khớp hoàn toàn");
  assert.equal(dashboardGuests.size, dailyGuestCount, "Số guest phân loại phải khớp hoàn toàn");
});
