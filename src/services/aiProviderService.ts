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

// Model Groq duy nhất được chứng minh hỗ trợ tốt JSON Schema và tốc độ siêu tốc ~400ms-1200ms:
const GROQ_MODELS = [
  "qwen/qwen3.8-27b",
];

// Cloudflare Workers AI: 10.000 req/ngày miễn phí (Fallback 1)
const CLOUDFLARE_MODELS = [
  "@cf/meta/llama-3.1-8b-instruct",
];

// Google Gemini: Hỗ trợ khi user cung cấp custom key hoặc key còn quota
const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

/**
 * Gọi Groq API (Siêu tốc 200ms-600ms, fail-fast khi gặp lỗi)
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
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: req.temperature ?? 0.2,
        max_tokens: req.maxTokens ?? 800,
        ...(req.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });

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
    messages.push({
      role: "system",
      content: req.jsonMode
        ? `${req.systemPrompt}\nIMPORTANT: You must respond in valid JSON format.`
        : req.systemPrompt,
    });
  }
  messages.push({
    role: "user",
    content:
      req.jsonMode && !req.systemPrompt
        ? `${req.userPrompt}\nIMPORTANT: You must respond in valid JSON format.`
        : req.userPrompt,
  });

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
          temperature: req.temperature ?? 0.2,
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
 * Gọi Google Gemini API (Fail-fast khi gặp lỗi 404/429)
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
          temperature: req.temperature ?? 0.2,
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
 * Hàm gọi AI tối ưu theo kiến trúc Lean Fallback Chain:
 * 1. Primary: Groq (qwen/qwen3.8-27b - 400ms-800ms)
 * 2. Fallback 1: Groq (allam-2-7b - 250ms)
 * 3. Fallback 2: Cloudflare Workers AI (@cf/meta/llama-3.1-8b-instruct - 700ms)
 * 4. Fallback 3 (nếu có custom key): Google Gemini Flash
 */
export async function generateFastAiChat(req: AiChatRequest): Promise<AiChatResponse | null> {
  const start = Date.now();
  const maxTotalTimeout = req.timeoutMs || 3500;

  // 1. Primary Provider: Groq AI với model đã xác minh
  const groqKeys = getGroqApiKeys();
  if (groqKeys.length > 0) {
    const primaryKey = groqKeys[0];
    for (const model of GROQ_MODELS) {
      if (Date.now() - start >= maxTotalTimeout) break;
      const perCallTimeout = Math.min(maxTotalTimeout - (Date.now() - start), 1500);
      const text = await callGroq(req, primaryKey, model, perCallTimeout);
      if (text && text.trim()) {
        const providerName: AiChatResponse["provider"] = "Groq (Llama 3.1 8B)";
        return {
          text: text.trim(),
          provider: providerName,
          model,
          latencyMs: Date.now() - start,
        };
      }
    }
  }

  // 2. Fallback: Cloudflare Workers AI
  if (Date.now() - start < maxTotalTimeout) {
    for (const cfModel of CLOUDFLARE_MODELS) {
      if (Date.now() - start >= maxTotalTimeout) break;
      const perCallTimeout = Math.min(maxTotalTimeout - (Date.now() - start), 1800);
      const cfText = await callCloudflareAI(req, cfModel, perCallTimeout);
      if (typeof cfText === "string" && cfText.trim()) {
        const trimmed = cfText.trim();
        if (!req.jsonMode || (trimmed.includes("{") && trimmed.includes("}"))) {
          return {
            text: trimmed,
            provider: "Cloudflare Workers AI",
            model: cfModel,
            latencyMs: Date.now() - start,
          };
        }
      }
    }
  }

  // 3. Dự phòng cho Custom API Key (Gemini) nếu người dùng cung cấp
  if (req.customApiKey && Date.now() - start < maxTotalTimeout) {
    const geminiKeys = getGeminiApiKeys(req.customApiKey);
    if (geminiKeys.length > 0) {
      for (const key of geminiKeys) {
        for (const model of GEMINI_MODELS) {
          if (Date.now() - start >= maxTotalTimeout) break;
          const perCallTimeout = Math.min(maxTotalTimeout - (Date.now() - start), 1800);
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
  }

  return null;
}

