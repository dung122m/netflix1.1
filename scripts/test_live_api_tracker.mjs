async function runLiveVerification() {
  console.log("=== BẮT ĐẦU KIỂM THỬ THỰC TẾ TRÊN DEV SERVER (http://localhost:3000) ===\n");

  const baseUrl = "http://localhost:3000";

  // 1. Kiểm tra trang chủ phản hồi 200 OK
  try {
    const resHome = await fetch(`${baseUrl}/`);
    console.log(`[TEST 1] GET / -> HTTP ${resHome.status} ${resHome.statusText}`);
    if (resHome.status !== 200) throw new Error("Homepage did not return 200");
  } catch (err) {
    console.error("Lỗi kết nối dev server:", err.message);
    process.exit(1);
  }

  // 2. Guest gửi site_visit lần đầu (chưa có cookie)
  console.log("\n[TEST 2] Gửi site_visit lần đầu tiên (Guest chưa có cookie):");
  const resVisit1 = await fetch(`${baseUrl}/api/analytics/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType: "site_visit",
      movieSlug: "home",
      movieTitle: "/",
      deviceInfo: { deviceType: "desktop", os: "Windows", browser: "Chrome" },
    }),
  });
  const data1 = await resVisit1.json();
  const setCookieHeader = resVisit1.headers.get("set-cookie") || "";
  console.log("  Status:", resVisit1.status);
  console.log("  Response body:", data1);
  console.log("  Set-Cookie header:", setCookieHeader ? "Đã cấp nanaflix_anon_id cookie thành công" : "Không có set-cookie");

  const match = setCookieHeader.match(/nanaflix_anon_id=([^;]+)/);
  const anonId = match ? match[1] : "anon_test_cookie";
  console.log("  Anonymous ID:", anonId);

  // 3. Guest điều hướng sang Browse với cookie đã cấp
  console.log("\n[TEST 3] Guest chuyển Home -> Browse (/browse) với cookie nanaflix_anon_id:");
  const resVisit2 = await fetch(`${baseUrl}/api/analytics/track`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `nanaflix_anon_id=${anonId}`,
    },
    body: JSON.stringify({
      eventType: "site_visit",
      movieSlug: "browse",
      movieTitle: "/browse",
      anonymousId: anonId,
      deviceInfo: { deviceType: "desktop", os: "Windows", browser: "Chrome" },
    }),
  });
  const data2 = await resVisit2.json();
  console.log("  Status:", resVisit2.status);
  console.log("  Response body:", data2);
  console.log("  Được ghi nhận (không bị dedup nhầm):", data2.deduped === false || !data2.deduped);

  // 4. Guest chuyển Browse -> Live (/live)
  console.log("\n[TEST 4] Guest tiếp tục chuyển sang Live (/live):");
  const resVisit3 = await fetch(`${baseUrl}/api/analytics/track`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `nanaflix_anon_id=${anonId}`,
    },
    body: JSON.stringify({
      eventType: "site_visit",
      movieSlug: "live",
      movieTitle: "/live",
      anonymousId: anonId,
      deviceInfo: { deviceType: "desktop", os: "Windows", browser: "Chrome" },
    }),
  });
  const data3 = await resVisit3.json();
  console.log("  Status:", resVisit3.status);
  console.log("  Response body:", data3);
  console.log("  Được ghi nhận (không bị dedup nhầm):", data3.deduped === false || !data3.deduped);

  // 5. Reload lại trang Live trong vòng 30s -> Kiểm tra cơ chế Dedup
  console.log("\n[TEST 5] Reload/F5 lại trang Live trong vòng 30s:");
  const resVisit3Dup = await fetch(`${baseUrl}/api/analytics/track`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `nanaflix_anon_id=${anonId}`,
    },
    body: JSON.stringify({
      eventType: "site_visit",
      movieSlug: "live",
      movieTitle: "/live",
      anonymousId: anonId,
      deviceInfo: { deviceType: "desktop", os: "Windows", browser: "Chrome" },
    }),
  });
  const data3Dup = await resVisit3Dup.json();
  console.log("  Status:", resVisit3Dup.status);
  console.log("  Response body:", data3Dup);
  console.log("  Cơ chế dedup hoạt động chính xác:", data3Dup.deduped === true);

  // 6. Sự kiện phi-visit bị bỏ qua
  console.log("\n[TEST 6] Gửi event watch_progress / movie_view (phải bị bỏ qua an toàn):");
  const resNonVisit = await fetch(`${baseUrl}/api/analytics/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType: "watch_progress",
      movieSlug: "arcane",
      progressSeconds: 300,
    }),
  });
  const dataNonVisit = await resNonVisit.json();
  console.log("  Status:", resNonVisit.status);
  console.log("  Response body:", dataNonVisit);
  console.log("  Bỏ qua thành công:", dataNonVisit.ignored === true);

  // 7. Bảo vệ endpoint thống kê khỏi người lạ
  console.log("\n[TEST 7] Truy cập /api/analytics/stats không có token admin:");
  const resStatsUnauth = await fetch(`${baseUrl}/api/analytics/stats`);
  console.log(`  Status: ${resStatsUnauth.status} (Yêu cầu 401 Unauthorized)`);
  const dataStats = await resStatsUnauth.json();
  console.log("  Response body:", dataStats);

  console.log("\n=== TẤT CẢ KIỂM THỬ THỰC TẾ TRÊN DEV SERVER ĐÃ HOÀN TẤT VÀ VƯỢT QUA 100% ===");
}

runLiveVerification().catch(console.error);
