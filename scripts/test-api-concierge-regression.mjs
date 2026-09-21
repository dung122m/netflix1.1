// scripts/test-api-concierge-regression.mjs

const QUERIES = [
  // 1. Entity
  { category: "Entity", prompt: "Superman", check: (res) => res.movies.some(m => m.title.toLowerCase().includes("superman") || (m.reason && m.reason.toLowerCase().includes("superman"))) || res.mood.toLowerCase().includes("superman") },
  { category: "Entity", prompt: "Batman", check: (res) => res.movies.some(m => m.title.toLowerCase().includes("batman") || m.title.toLowerCase().includes("người dơi") || m.title.toLowerCase().includes("kỵ sĩ bóng đêm")) || res.mood.toLowerCase().includes("batman") || res.mood.toLowerCase().includes("người dơi") },
  { category: "Entity", prompt: "Kamen Rider", check: (res) => res.movies.some(m => m.title.toLowerCase().includes("kamen rider") || m.title.toLowerCase().includes("rider")) || res.mood.toLowerCase().includes("kamen") },
  { category: "Entity", prompt: "Ultraman", check: (res) => res.movies.some(m => m.title.toLowerCase().includes("ultraman") || m.title.toLowerCase().includes("siêu nhân điện quang")) || res.mood.toLowerCase().includes("ultra") },

  // 2. Semantic Concept
  { category: "Semantic Concept", prompt: "phim về siêu nhân nhật bản", check: (res) => !res.movies.some(m => m.title.toLowerCase().includes("superman")) && (res.movies.some(m => m.country?.includes("Nhật") || m.title.toLowerCase().includes("kamen") || m.title.toLowerCase().includes("sentai") || m.title.toLowerCase().includes("ultraman") || m.title.toLowerCase().includes("ranger") || m.title.toLowerCase().includes("siêu nhân") || m.title.toLowerCase().includes("godzilla")) || res.mood.toLowerCase().includes("nhật") || res.mood.toLowerCase().includes("tokusatsu") || res.mood.toLowerCase().includes("siêu nhân")) },
  { category: "Semantic Concept", prompt: "anh hùng biến hình nhật", check: (res) => !res.movies.some(m => m.title.toLowerCase().includes("superman")) && (res.movies.some(m => m.country?.includes("Nhật") || m.title.toLowerCase().includes("kamen") || m.title.toLowerCase().includes("sentai") || m.title.toLowerCase().includes("ultraman") || m.title.toLowerCase().includes("siêu nhân")) || res.mood.toLowerCase().includes("nhật") || res.mood.toLowerCase().includes("biến hình") || res.mood.toLowerCase().includes("tokusatsu")) },
  { category: "Semantic Concept", prompt: "tokusatsu", check: (res) => res.movies.some(m => m.country?.includes("Nhật") || m.title.toLowerCase().includes("kamen") || m.title.toLowerCase().includes("ultraman") || m.title.toLowerCase().includes("sentai") || m.title.toLowerCase().includes("godzilla")) || res.mood.toLowerCase().includes("tokusatsu") },
  { category: "Semantic Concept", prompt: "phim kiểu Kamen Rider", check: (res) => res.movies.some(m => m.title.toLowerCase().includes("kamen") || m.title.toLowerCase().includes("rider") || m.title.toLowerCase().includes("ultraman") || m.title.toLowerCase().includes("sentai")) || res.mood.toLowerCase().includes("kamen") || res.mood.toLowerCase().includes("tokusatsu") },
  { category: "Semantic Concept", prompt: "5 anh em siêu nhân", check: (res) => !res.movies.some(m => m.title.toLowerCase().includes("superman")) && (res.movies.some(m => m.title.toLowerCase().includes("sentai") || m.title.toLowerCase().includes("ranger") || m.title.toLowerCase().includes("gaoranger") || m.title.toLowerCase().includes("siêu nhân")) || res.mood.toLowerCase().includes("siêu nhân") || res.mood.toLowerCase().includes("sentai")) },
  { category: "Semantic Concept", prompt: "siêu nhân Gao", check: (res) => !res.movies.some(m => m.title.toLowerCase().includes("superman")) && (res.movies.some(m => m.title.toLowerCase().includes("gao") || m.title.toLowerCase().includes("sentai") || m.title.toLowerCase().includes("siêu nhân")) || res.mood.toLowerCase().includes("gao") || res.mood.toLowerCase().includes("siêu nhân")) },
  { category: "Semantic Concept", prompt: "phim quái vật Nhật", check: (res) => res.movies.some(m => m.country?.includes("Nhật") || m.title.toLowerCase().includes("godzilla") || m.title.toLowerCase().includes("quái vật") || m.title.toLowerCase().includes("monster") || m.title.toLowerCase().includes("shin")) || res.mood.toLowerCase().includes("quái vật") || res.mood.toLowerCase().includes("nhật") },
  { category: "Semantic Concept", prompt: "phim võ thuật Hồng Kông", check: (res) => res.movies.some(m => m.country?.includes("Hồng Kông") || m.country?.includes("Trung Quốc") || m.category?.includes("Võ Thuật") || m.title.toLowerCase().includes("diệp vấn") || m.title.toLowerCase().includes("hoàng phi hồng") || m.title.toLowerCase().includes("tinh võ")) || res.mood.toLowerCase().includes("võ thuật") || res.mood.toLowerCase().includes("hồng kông") },
  { category: "Semantic Concept", prompt: "phim cảnh sát phá án", check: (res) => res.movies.some(m => m.category?.includes("Hình Sự") || m.category?.includes("Hành Động") || m.title.toLowerCase().includes("cảnh sát") || m.title.toLowerCase().includes("phá án") || m.title.toLowerCase().includes("thanh tra") || m.title.toLowerCase().includes("điều tra") || m.title.toLowerCase().includes("bằng chứng thép") || m.title.toLowerCase().includes("đội chống tham nhũng")) || res.mood.toLowerCase().includes("cảnh sát") || res.mood.toLowerCase().includes("phá án") || res.mood.toLowerCase().includes("hình sự") },

  // 3. Person
  { category: "Person", prompt: "phim Thành Long", check: (res) => res.movies.some(m => m.actors?.some(a => a.toLowerCase().includes("thành long") || a.toLowerCase().includes("jackie")) || m.title.toLowerCase().includes("câu chuyện cảnh sát") || m.title.toLowerCase().includes("giờ cao điểm") || m.title.toLowerCase().includes("túy quyền")) || res.mood.toLowerCase().includes("thành long") },
  { category: "Person", prompt: "phim có Châu Tinh Trì", check: (res) => res.movies.some(m => m.actors?.some(a => a.toLowerCase().includes("châu tinh trì") || a.toLowerCase().includes("stephen")) || m.title.toLowerCase().includes("tuyệt đỉnh kungfu") || m.title.toLowerCase().includes("đội bóng thiếu lâm") || m.title.toLowerCase().includes("thần bài") || m.title.toLowerCase().includes("vua hài kịch") || m.title.toLowerCase().includes("mỹ nhân ngư")) || res.mood.toLowerCase().includes("châu tinh trì") },

  // 4. Combined
  { category: "Combined", prompt: "phim hành động Hàn Quốc sau 2020", check: (res) => res.movies.some(m => m.country?.includes("Hàn Quốc") && (Number(m.year) >= 2020 || !m.year)) || res.mood.toLowerCase().includes("hàn quốc") },
  { category: "Combined", prompt: "phim hài Trung Quốc có Châu Tinh Trì", check: (res) => res.movies.some(m => (m.country?.includes("Trung Quốc") || m.country?.includes("Hồng Kông")) && (m.actors?.some(a => a.toLowerCase().includes("châu tinh trì") || a.toLowerCase().includes("stephen")) || m.title.toLowerCase().includes("châu tinh trì") || m.title.toLowerCase().includes("kungfu") || m.title.toLowerCase().includes("thiếu lâm"))) || res.mood.toLowerCase().includes("châu tinh trì") },

  // 5. Ambiguous
  { category: "Ambiguous", prompt: "phim về người nhện", check: (res) => res.movies.some(m => m.title.toLowerCase().includes("người nhện") || m.title.toLowerCase().includes("spider") || m.title.toLowerCase().includes("venom")) || res.mood.toLowerCase().includes("người nhện") || res.mood.toLowerCase().includes("spider") },

  // 6. Negative / Disambiguation
  { category: "Negative/Disambiguation", prompt: "phim giống John Wick nhưng không phải John Wick", check: (res) => !res.movies.some(m => m.title.toLowerCase() === "john wick" || m.title.toLowerCase() === "sát thủ john wick" || m.slug.startsWith("john-wick") || m.slug.startsWith("sat-thu-john-wick")) && (res.movies.length > 0 || res.mood.length > 0) },
];

async function runApiTests() {
  console.log("==========================================================================");
  console.log("TESTING AI CONCIERGE ENDPOINT (http://localhost:3000/api/ai-concierge)");
  console.log("==========================================================================\n");

  let passed = 0;
  let failed = 0;
  const latencies = [];

  for (let i = 0; i < QUERIES.length; i++) {
    const q = QUERIES[i];
    const t0 = performance.now();
    try {
      const res = await fetch("http://localhost:3000/api/ai-concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: q.prompt, clearCache: true }),
      });

      const latency = Math.round(performance.now() - t0);
      latencies.push(latency);

      if (!res.ok) {
        failed++;
        console.log(`❌ [FAIL HTTP ${res.status}] [${q.category}] "${q.prompt}" (${latency}ms)`);
        const errJson = await res.json().catch(() => ({}));
        console.log(`   Error: ${JSON.stringify(errJson)}\n`);
        continue;
      }

      const data = await res.json();
      const isOk = q.check(data);

      if (isOk) {
        passed++;
        console.log(`✅ [PASS] [${q.category}] "${q.prompt}" (${latency}ms - ${data.provider})`);
        console.log(`   Mood: ${data.mood}`);
        console.log(`   Movies (${data.movies.length}): ${data.movies.slice(0, 4).map(m => `"${m.title}" (${m.year || 'N/A'}, ${m.country || 'N/A'})`).join(", ")}`);
        console.log(`   Analysis: ${data.reply.slice(0, 120)}...\n`);
      } else {
        failed++;
        console.log(`❌ [FAIL CHECK] [${q.category}] "${q.prompt}" (${latency}ms - ${data.provider})`);
        console.log(`   Mood: ${data.mood}`);
        console.log(`   Movies (${data.movies.length}): ${data.movies.map(m => `"${m.title}" (${m.year || 'N/A'}, ${m.country || 'N/A'})`).join(", ")}`);
        console.log(`   Analysis: ${data.reply}\n`);
      }
    } catch (err) {
      failed++;
      console.log(`❌ [ERROR] [${q.category}] "${q.prompt}": ${err.message}\n`);
    }
  }

  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1));
  console.log("==========================================================================");
  console.log(`SUMMARY: ${passed}/${QUERIES.length} PASSED, ${failed} FAILED`);
  console.log(`AVERAGE LATENCY: ${avgLatency}ms (Min: ${Math.min(...latencies)}ms, Max: ${Math.max(...latencies)}ms)`);
  console.log("==========================================================================");
}

runApiTests();
