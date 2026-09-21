// scripts/test-intent-understanding.mjs
import { analyzeUserPrompt } from "../src/app/api/ai-concierge/aiAnalyzer.ts";
import { resolveConcepts } from "../src/app/api/ai-concierge/conceptRegistry.ts";
import { resolveCharacter, resolveActorSlug, resolveCountrySlug, resolveGenreSlug } from "../src/app/api/ai-concierge/taxonomy.ts";

const TEST_CASES = [
  // 1. Entity
  {
    category: "Entity",
    query: "Superman",
    verify: (parsed) => {
      const isSuperman = parsed?.character === "Superman" || parsed?.franchises?.includes("Superman");
      const notTokusatsu = !parsed?.concepts?.includes("japanese_tokusatsu");
      return { pass: isSuperman && notTokusatsu, details: `character=${parsed?.character}, franchises=${parsed?.franchises}` };
    },
  },
  {
    category: "Entity",
    query: "Batman",
    verify: (parsed) => {
      const isBatman = parsed?.character === "Batman" || parsed?.franchises?.includes("Batman");
      return { pass: Boolean(isBatman), details: `character=${parsed?.character}, franchises=${parsed?.franchises}` };
    },
  },
  {
    category: "Entity",
    query: "Kamen Rider",
    verify: (parsed) => {
      const isKR = parsed?.franchises?.some(f => f.toLowerCase().includes("kamen rider")) || parsed?.concepts?.includes("japanese_tokusatsu") || parsed?.character === "Kamen Rider";
      return { pass: Boolean(isKR), details: `franchises=${parsed?.franchises}, concepts=${parsed?.concepts}` };
    },
  },
  {
    category: "Entity",
    query: "Ultraman",
    verify: (parsed) => {
      const isUltra = parsed?.franchises?.some(f => f.toLowerCase().includes("ultraman")) || parsed?.concepts?.includes("japanese_tokusatsu") || parsed?.character === "Ultraman";
      return { pass: Boolean(isUltra), details: `franchises=${parsed?.franchises}, concepts=${parsed?.concepts}` };
    },
  },

  // 2. Semantic Concept
  {
    category: "Semantic Concept",
    query: "phim về siêu nhân nhật bản",
    verify: (parsed) => {
      const isJapan = parsed?.countries?.some(c => c.toLowerCase().includes("nhật") || c.toLowerCase().includes("japan"));
      const isTokusatsu = parsed?.concepts?.includes("japanese_tokusatsu") || parsed?.themes?.some(t => t.toLowerCase().includes("tokusatsu") || t.toLowerCase().includes("siêu nhân"));
      const notSuperman = parsed?.character !== "Superman" && !parsed?.franchises?.includes("Superman");
      return { pass: isJapan && isTokusatsu && notSuperman, details: `countries=${parsed?.countries}, concepts=${parsed?.concepts}, character=${parsed?.character}` };
    },
  },
  {
    category: "Semantic Concept",
    query: "anh hùng biến hình nhật",
    verify: (parsed) => {
      const isJapan = parsed?.countries?.some(c => c.toLowerCase().includes("nhật") || c.toLowerCase().includes("japan"));
      const isTokusatsu = parsed?.concepts?.includes("japanese_tokusatsu") || parsed?.themes?.some(t => t.toLowerCase().includes("tokusatsu") || t.toLowerCase().includes("biến hình"));
      return { pass: isJapan && isTokusatsu, details: `countries=${parsed?.countries}, concepts=${parsed?.concepts}` };
    },
  },
  {
    category: "Semantic Concept",
    query: "tokusatsu",
    verify: (parsed) => {
      const isTokusatsu = parsed?.concepts?.includes("japanese_tokusatsu") || parsed?.themes?.some(t => t.toLowerCase().includes("tokusatsu"));
      return { pass: Boolean(isTokusatsu), details: `concepts=${parsed?.concepts}, themes=${parsed?.themes}` };
    },
  },
  {
    category: "Semantic Concept",
    query: "phim quái vật Nhật",
    verify: (parsed) => {
      const isJapan = parsed?.countries?.some(c => c.toLowerCase().includes("nhật") || c.toLowerCase().includes("japan"));
      return { pass: Boolean(isJapan), details: `countries=${parsed?.countries}, themes=${parsed?.themes}` };
    },
  },

  // 3. Person
  {
    category: "Person",
    query: "phim Thành Long",
    verify: (parsed) => {
      const hasJackie = parsed?.people?.some(p => p.name.toLowerCase().includes("thành long") || p.name.toLowerCase().includes("jackie")) || parsed?.actor?.toLowerCase().includes("thành long");
      return { pass: Boolean(hasJackie), details: `people=${JSON.stringify(parsed?.people)}, actor=${parsed?.actor}` };
    },
  },
  {
    category: "Person",
    query: "phim có Châu Tinh Trì",
    verify: (parsed) => {
      const hasStephen = parsed?.people?.some(p => p.name.toLowerCase().includes("châu tinh trì") || p.name.toLowerCase().includes("stephen")) || parsed?.actor?.toLowerCase().includes("châu tinh trì");
      return { pass: Boolean(hasStephen), details: `people=${JSON.stringify(parsed?.people)}, actor=${parsed?.actor}` };
    },
  },

  // 4. Combined
  {
    category: "Combined",
    query: "phim hành động Hàn Quốc có Lee Byung-hun sau 2018",
    verify: (parsed) => {
      const hasAction = parsed?.genres?.some(g => g.toLowerCase().includes("hành động") || g.toLowerCase().includes("action"));
      const hasKorea = parsed?.countries?.some(c => c.toLowerCase().includes("hàn") || c.toLowerCase().includes("korea"));
      const hasActor = parsed?.people?.some(p => p.name.toLowerCase().includes("lee byung")) || parsed?.actor?.toLowerCase().includes("lee byung");
      const hasYear = (parsed?.yearRange?.from && parsed.yearRange.from >= 2018) || (parsed?.years?.from && parsed.years.from >= 2018);
      return { pass: hasAction && hasKorea && hasActor && hasYear, details: `genres=${parsed?.genres}, countries=${parsed?.countries}, people=${JSON.stringify(parsed?.people)}, yearRange=${JSON.stringify(parsed?.yearRange || parsed?.years)}` };
    },
  },
  {
    category: "Combined",
    query: "phim hài Trung Quốc có Châu Tinh Trì",
    verify: (parsed) => {
      const hasComedy = parsed?.genres?.some(g => g.toLowerCase().includes("hài") || g.toLowerCase().includes("comedy"));
      const hasChina = parsed?.countries?.some(c => c.toLowerCase().includes("trung") || c.toLowerCase().includes("china") || c.toLowerCase().includes("hồng kông"));
      const hasStephen = parsed?.people?.some(p => p.name.toLowerCase().includes("châu tinh trì") || p.name.toLowerCase().includes("stephen")) || parsed?.actor?.toLowerCase().includes("châu tinh trì");
      return { pass: hasComedy && hasChina && hasStephen, details: `genres=${parsed?.genres}, countries=${parsed?.countries}, people=${JSON.stringify(parsed?.people)}` };
    },
  },

  // 5. Ambiguous
  {
    category: "Ambiguous",
    query: "phim về người nhện",
    verify: (parsed) => {
      const isSpiderman = parsed?.franchises?.some(f => f.toLowerCase().includes("spider") || f.toLowerCase().includes("nhện")) || parsed?.character?.toLowerCase().includes("spider") || parsed?.character?.toLowerCase().includes("nhện");
      return { pass: Boolean(isSpiderman), details: `franchises=${parsed?.franchises}, character=${parsed?.character}` };
    },
  },

  // 6. Negative / Disambiguation
  {
    category: "Negative/Disambiguation",
    query: "Superman",
    verify: (parsed) => {
      const notTokusatsu = !parsed?.concepts?.includes("japanese_tokusatsu");
      const isSuperman = parsed?.character === "Superman" || parsed?.franchises?.includes("Superman");
      return { pass: notTokusatsu && isSuperman, details: `concepts=${parsed?.concepts}, character=${parsed?.character}` };
    },
  },
  {
    category: "Negative/Disambiguation",
    query: "siêu nhân Nhật Bản",
    verify: (parsed) => {
      const notSuperman = parsed?.character !== "Superman" && !parsed?.franchises?.includes("Superman");
      const isJapan = parsed?.countries?.some(c => c.toLowerCase().includes("nhật") || c.toLowerCase().includes("japan"));
      return { pass: notSuperman && isJapan, details: `character=${parsed?.character}, franchises=${parsed?.franchises}, countries=${parsed?.countries}` };
    },
  },
  {
    category: "Negative/Disambiguation",
    query: "phim giống John Wick nhưng không phải John Wick",
    verify: (parsed) => {
      const hasExclude = parsed?.exclude?.titles?.some(t => t.toLowerCase().includes("john wick")) || parsed?.excluded_titles?.some(t => t.toLowerCase().includes("john wick"));
      const hasTheme = parsed?.themes?.length > 0 || parsed?.keywords?.length > 0;
      return { pass: Boolean(hasExclude && hasTheme), details: `exclude=${JSON.stringify(parsed?.exclude)}, themes=${parsed?.themes}` };
    },
  },
];

async function runTests() {
  console.log("===============================================================");
  console.log("AI CONCIERGE INTENT EXTRACTION & UNDERSTANDING REGRESSION SUITE");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  for (const tc of TEST_CASES) {
    const t0 = performance.now();
    try {
      const { parsed, provider } = await analyzeUserPrompt(tc.query);
      const latency = Math.round(performance.now() - t0);
      const result = tc.verify(parsed);

      if (result.pass) {
        passed++;
        console.log(`✅ [PASS] [${tc.category}] "${tc.query}" (${latency}ms - ${provider})`);
        console.log(`   Details: ${result.details}\n`);
      } else {
        failed++;
        console.log(`❌ [FAIL] [${tc.category}] "${tc.query}" (${latency}ms - ${provider})`);
        console.log(`   Details: ${result.details}`);
        console.log(`   Full Parsed: ${JSON.stringify(parsed, null, 2)}\n`);
      }
    } catch (err) {
      failed++;
      console.log(`❌ [ERROR] [${tc.category}] "${tc.query}": ${err.message}\n`);
    }
  }

  console.log("===============================================================");
  console.log(`RESULTS: ${passed}/${TEST_CASES.length} PASSED, ${failed} FAILED`);
  console.log("===============================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
