export interface AiChatRequest {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  customApiKey?: string;
  timeoutMs?: number;
}

export interface AiChatResponse {
  text: string;
  provider: "Groq (Llama 3.1 8B)" | "Groq (Llama 3.3 70B)" | "Cloudflare Workers AI" | "Google Gemini Flash" | "Nana AI Fallback";
  model: string;
  latencyMs: number;
}

/**
 * Lấy danh sách Groq API Keys từ biến môi trường
 */
function getGroqApiKeys(): string[] {
  const envKey = process.env.GROQ_API_KEY || "";
  return envKey
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 5);
}

/**
 * Lấy danh sách Gemini API Keys từ biến môi trường & custom key
 */
function getGeminiApiKeys(customKey?: string): string[] {
  const envKey = process.env.GEMINI_API_KEY || "";
  const list = envKey
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 5);

  return Array.from(
    new Set([customKey?.trim(), ...list].filter((k): k is string => Boolean(k && k.length > 5)))
  );
}

// Các model Groq sắp xếp theo thứ tự hạn mức cao nhất trước:
// 1. allam-2-7b: 7.000 req/ngày (7K)
// 2. qwen/qwen3.8-27b: 1.000 req/ngày (1K)
// 3. openai/gpt-oss-120b: 1.000 req/ngày (1K)
// 4. groq/compound-mini: 250 req/ngày
const GROQ_MODELS = [
  "allam-2-7b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
  "groq/compound-mini",
];

// Cloudflare Workers AI: 10.000 req/ngày hoàn toàn miễn phí
const CLOUDFLARE_MODELS = [
  "@cf/meta/llama-3.2-3b-instruct",
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/meta/llama-3.2-1b-instruct",
  "@cf/mistral/mistral-7b-instruct-v0.1",
  "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
];

// Google Gemini: 4 keys xoay vòng = 6.000 req/ngày (chỉ dùng model 3.6-flash đang hoạt động)
const GEMINI_MODELS = [
  "gemini-3.6-flash",
];

/**
 * Gọi Groq API (Siêu tốc 150ms-300ms, tự động giải cứu khi gặp lỗi)
 */
async function callGroq(
  req: AiChatRequest,
  apiKey: string,
  model: string,
  timeoutMs: number
): Promise<string | null> {
  const systemContent = req.systemPrompt || "";
  const userContent = req.userPrompt;

  const messages = [];
  if (systemContent) {
    messages.push({
      role: "system",
      content: req.jsonMode
        ? `${systemContent}\nIMPORTANT: You must respond in valid JSON format.`
        : systemContent,
    });
  }
  messages.push({
    role: "user",
    content:
      req.jsonMode && !systemContent
        ? `${userContent}\nIMPORTANT: You must respond in valid JSON format.`
        : userContent,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: req.temperature ?? 0.3,
        max_tokens: req.maxTokens ?? 800,
        ...(req.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });

    // Nếu gặp lỗi 400 JSON validation, tự động retry một lần ngay lập tức
    if (res.status === 400 && req.jsonMode) {
      res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: req.temperature ?? 0.3,
          max_tokens: req.maxTokens ?? 800,
        }),
        signal: controller.signal,
      });
    }

    clearTimeout(timeout);
    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === "string" ? content : null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

/**
 * Gọi Cloudflare Workers AI (10,000 req/ngày hoàn toàn miễn phí)
 */
async function callCloudflareAI(
  req: AiChatRequest,
  model: string,
  timeoutMs: number
): Promise<string | null> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !apiToken) return null;

  const messages = [];
  if (req.systemPrompt) {
    messages.push({ role: "system", content: req.systemPrompt });
  }
  messages.push({ role: "user", content: req.userPrompt });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages,
          temperature: req.temperature ?? 0.35,
          max_tokens: req.maxTokens ?? 700,
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);
    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const result = data?.result;
    if (typeof result?.response === "string") return result.response;
    if (typeof result?.response === "object" && result?.response !== null) {
      return JSON.stringify(result.response);
    }
    if (typeof result?.choices?.[0]?.message?.content === "string") return result.choices[0].message.content;
    if (typeof result === "string") return result;
    if (typeof result === "object" && result !== null) {
      return JSON.stringify(result);
    }
    return null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

/**
 * Gọi Google Gemini API (Hỗ trợ REST API & Gemini 3.6 Flash)
 */
async function callGemini(
  req: AiChatRequest,
  apiKey: string,
  model: string,
  timeoutMs: number
): Promise<string | null> {
  const fullPrompt = req.systemPrompt
    ? `${req.systemPrompt}\n\nNgười dùng: ${req.userPrompt}`
    : req.userPrompt;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          ...(req.jsonMode ? { responseMimeType: "application/json" } : {}),
          temperature: req.temperature ?? 0.3,
          maxOutputTokens: req.maxTokens ?? 800,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" ? text : null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

/**
 * Hàm gọi AI tối ưu theo thứ tự HẠN MỨC CAO NHẤT TRƯỚC (High Quota First):
 * 1. Cloudflare Workers AI (10.000 requests/ngày miễn phí)
 * 2. Google Gemini 3.6 Flash (4 keys xoay vòng = 6.000 requests/ngày)
 * 3. Groq allam-2-7b (7.000 requests/ngày) & qwen3.8 / gpt-oss-120b
 */
export async function generateFastAiChat(req: AiChatRequest): Promise<AiChatResponse | null> {
  const start = Date.now();
  const maxTotalTimeout = req.timeoutMs || 5000;

  // Chiến lược định tuyến thông minh (Smart Router):
  // A. Nếu là truy vấn cấu trúc JSON (jsonMode: true - như Phân tích Diễn viên, Tìm phim theo tâm trạng, Khớp gu xem phim):
  //    Ưu tiên Google Gemini 3.6 Flash & Groq (Qwen / GPT-OSS) vì có dữ liệu bách khoa toàn thư điện ảnh thế giới chính xác tuyệt đối và Native JSON mode.
  // B. Nếu là hội thoại văn bản tự nhiên (Chat với Nana AI, tóm tắt phim):
  //    Ưu tiên Cloudflare Workers AI (10.000 req/ngày miễn phí) để tiết kiệm quota.

  if (req.jsonMode) {
    // 1. Groq AI (Qwen 3.8 27B / GPT-OSS 120B / allam - Siêu tốc 600ms-1200ms, hỗ trợ chuẩn Native JSON Schema)
    const groqKeys = getGroqApiKeys();
    if (groqKeys.length > 0) {
      for (const key of groqKeys) {
        const jsonGroqModels = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "groq/compound-mini", "allam-2-7b"];
        for (const model of jsonGroqModels) {
          if (Date.now() - start >= maxTotalTimeout) break;
          const perCallTimeout = Math.min(maxTotalTimeout - (Date.now() - start), 3500);
          const text = await callGroq(req, key, model, perCallTimeout);
          if (text && text.trim()) {
            const providerName: AiChatResponse["provider"] = model.includes("70b") || model.includes("120b")
              ? "Groq (Llama 3.3 70B)"
              : "Groq (Llama 3.1 8B)";
            return {
              text: text.trim(),
              provider: providerName,
              model,
              latencyMs: Date.now() - start,
            };
          }
        }
      }
    }

    // 2. Google Gemini 3.6 Flash (Dự phòng khi Groq bận)
    const geminiKeys = getGeminiApiKeys(req.customApiKey);
    if (geminiKeys.length > 0) {
      for (const key of geminiKeys) {
        for (const model of GEMINI_MODELS) {
          if (Date.now() - start >= maxTotalTimeout) break;
          const perCallTimeout = Math.min(maxTotalTimeout - (Date.now() - start), 4000);
          const text = await callGemini(req, key, model, perCallTimeout);
          if (typeof text === "string" && text.trim()) {
            return {
              text: text.trim(),
              provider: "Google Gemini Flash",
              model,
              latencyMs: Date.now() - start,
            };
          }
        }
      }
    }

    // 3. Cloudflare Workers AI dự phòng cuối
    for (const cfModel of CLOUDFLARE_MODELS) {
      if (Date.now() - start >= maxTotalTimeout) break;
      const perCallTimeout = Math.min(maxTotalTimeout - (Date.now() - start), 2500);
      const cfText = await callCloudflareAI(req, cfModel, perCallTimeout);
      if (typeof cfText === "string" && cfText.trim()) {
        const trimmed = cfText.trim();
        if (trimmed.includes("{") && trimmed.includes("}")) {
          return {
            text: trimmed,
            provider: "Cloudflare Workers AI",
            model: cfModel,
            latencyMs: Date.now() - start,
          };
        }
      }
    }
  } else {
    // Với hội thoại thông thường: Ưu tiên Cloudflare Workers AI (10.000 req/ngày)
    for (const cfModel of CLOUDFLARE_MODELS) {
      if (Date.now() - start >= maxTotalTimeout) break;
      const perCallTimeout = Math.min(maxTotalTimeout - (Date.now() - start), 2000);
      const cfText = await callCloudflareAI(req, cfModel, perCallTimeout);
      if (typeof cfText === "string" && cfText.trim()) {
        return {
          text: cfText.trim(),
          provider: "Cloudflare Workers AI",
          model: cfModel,
          latencyMs: Date.now() - start,
        };
      }
    }

    // Tiếp theo: Google Gemini
    const geminiKeys = getGeminiApiKeys(req.customApiKey);
    if (geminiKeys.length > 0) {
      for (const key of geminiKeys) {
        for (const model of GEMINI_MODELS) {
          if (Date.now() - start >= maxTotalTimeout) break;
          const perCallTimeout = Math.min(maxTotalTimeout - (Date.now() - start), 2500);
          const text = await callGemini(req, key, model, perCallTimeout);
          if (typeof text === "string" && text.trim()) {
            return {
              text: text.trim(),
              provider: "Google Gemini Flash",
              model,
              latencyMs: Date.now() - start,
            };
          }
        }
      }
    }

    // Cuối cùng: Groq AI
    const groqKeys = getGroqApiKeys();
    if (groqKeys.length > 0) {
      for (const key of groqKeys) {
        for (const model of GROQ_MODELS) {
          if (Date.now() - start >= maxTotalTimeout) break;
          const perCallTimeout = Math.min(maxTotalTimeout - (Date.now() - start), 2500);
          const text = await callGroq(req, key, model, perCallTimeout);
          if (text && text.trim()) {
            const providerName: AiChatResponse["provider"] = model.includes("70b") || model.includes("120b")
              ? "Groq (Llama 3.3 70B)"
              : "Groq (Llama 3.1 8B)";
            return {
              text: text.trim(),
              provider: providerName,
              model,
              latencyMs: Date.now() - start,
            };
          }
        }
      }
    }
  }

  return null;
}
