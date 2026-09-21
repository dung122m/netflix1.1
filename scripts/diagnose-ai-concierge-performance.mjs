// scripts/diagnose-ai-concierge-performance.mjs
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const BENCHMARK_QUERIES = [
  // Entity
  { category: "Entity", prompt: "Superman" },
  { category: "Entity", prompt: "Batman" },
  { category: "Entity", prompt: "Kamen Rider" },
  { category: "Entity", prompt: "Ultraman" },

  // Semantic
  { category: "Semantic", prompt: "phim về siêu nhân nhật bản" },
  { category: "Semantic", prompt: "anh hùng biến hình nhật" },
  { category: "Semantic", prompt: "tokusatsu" },
  { category: "Semantic", prompt: "phim kiểu Kamen Rider" },
  { category: "Semantic", prompt: "5 anh em siêu nhân" },
  { category: "Semantic", prompt: "siêu nhân Gao" },
  { category: "Semantic", prompt: "phim quái vật Nhật" },
  { category: "Semantic", prompt: "phim võ thuật Hồng Kông" },
  { category: "Semantic", prompt: "phim cảnh sát phá án" },

  // Person
  { category: "Person", prompt: "phim Thành Long" },
  { category: "Person", prompt: "phim có Châu Tinh Trì" },

  // Combined
  { category: "Combined", prompt: "phim hành động Hàn Quốc sau 2020" },
  { category: "Combined", prompt: "phim hài Trung Quốc có Châu Tinh Trì" },
  { category: "Combined", prompt: "phim giống John Wick nhưng không phải John Wick" },

  // Ambiguous
  { category: "Ambiguous", prompt: "phim về người nhện" },
];

async function testSingle(prompt) {
  const t0 = performance.now();
  const res = await fetch("http://localhost:3000/api/ai-concierge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, clearCache: true }),
  });
  const totalMs = Math.round(performance.now() - t0);
  if (!res.ok) {
    return { prompt, error: true, status: res.status, totalMs };
  }
  const data = await res.json();
  return {
    prompt,
    totalMs,
    aiMs: data.timing?.aiMs || 0,
    searchMs: data.timing?.searchMs || 0,
    moviesCount: data.movies?.length || 0,
    provider: data.provider,
    mood: data.mood,
    firstTitles: data.movies?.slice(0, 3).map(m => m.title).join(", "),
  };
}

async function run() {
  console.log("==========================================================================================");
  console.log("AI CONCIERGE PERFORMANCE & QUALITY BENCHMARK");
  console.log("==========================================================================================\n");

  const results = [];

  for (const q of BENCHMARK_QUERIES) {
    const r = await testSingle(q.prompt);
    results.push({ ...r, category: q.category });
    console.log(`[${q.category}] "${q.prompt}" -> Total: ${r.totalMs}ms | AI: ${r.aiMs}ms | Search: ${r.searchMs}ms | Cards: ${r.moviesCount} (${r.provider})`);
  }

  console.log("\n==========================================================================================");
  console.log("BENCHMARK TABLE");
  console.log("==========================================================================================");
  console.log("| Query | Category | Total (ms) | LLM (ms) | Search (ms) | Movies | Provider |");
  console.log("| :--- | :--- | ---: | ---: | ---: | ---: | :--- |");
  for (const r of results) {
    console.log(`| ${r.prompt} | ${r.category} | ${r.totalMs} | ${r.aiMs} | ${r.searchMs} | ${r.moviesCount} | ${r.provider} |`);
  }

  const totals = results.map(r => r.totalMs).filter(Boolean);
  const ais = results.map(r => r.aiMs).filter(Boolean);
  const searches = results.map(r => r.searchMs).filter(Boolean);

  const avg = (arr) => Math.round(arr.reduce((a, b) => a + b, 0) / (arr.length || 1));
  const median = (arr) => {
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 !== 0 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
  };

  console.log("\n==========================================================================================");
  console.log("METRICS SUMMARY");
  console.log("==========================================================================================");
  console.log(`TOTAL LATENCY:  Avg = ${avg(totals)}ms | Median = ${median(totals)}ms | Min = ${Math.min(...totals)}ms | Max = ${Math.max(...totals)}ms`);
  console.log(`LLM LATENCY:    Avg = ${avg(ais)}ms | Median = ${median(ais)}ms | Min = ${Math.min(...ais)}ms | Max = ${Math.max(...ais)}ms`);
  console.log(`SEARCH LATENCY: Avg = ${avg(searches)}ms | Median = ${median(searches)}ms | Min = ${Math.min(...searches)}ms | Max = ${Math.max(...searches)}ms`);
}

run();
