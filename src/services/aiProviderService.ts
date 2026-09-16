import { GoogleGenAI, ThinkingLevel } from "@google/genai";

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
 * Lấy danh sách Gemini API Keys từ biến môi trường & custom key (chỉ giữ các key chuẩn bắt đầu bằng AIza)
 */
function getGeminiApiKeys(customKey?: string): string[] {
  const envKey = process.env.GEMINI_API_KEY || "";
  const list = envKey
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 5);

  return Array.from(
    new Set([customKey?.trim(), ...list].filter((k): k is string => Boolean(k && k.length > 5 && k.startsWith("AIza"))))
  );
}

// Các model chính thức đang hoạt động ổn định trên Groq (Ưu tiên Llama 3.1 8B siêu tốc ~150ms)
const GROQ_MODELS = [
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "deepseek-r1-distill-llama-70b",
];

const CLOUDFLARE_MODELS = [
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/meta/llama-3-8b-instruct",
];

const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest",
  "gemini-2.5-flash",
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
 * Gọi Cloudflare Workers AI LLM (10,000 Neurons/ngày Free, Serverless Edge)
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
    if (typeof result?.choices?.[0]?.message?.content === "string") return result.choices[0].message.content;
    if (typeof result === "string") return result;
    return null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

/**
 * Gọi Google Gemini API (Nếu có key chuẩn)
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

  const ai = new GoogleGenAI({ apiKey, vertexai: false });
  const is25 = model.includes("2.5") || model.includes("3.5");

  try {
    const res = await Promise.race([
      ai.models.generateContent({
        model,
        contents: fullPrompt,
        config: {
          ...(req.jsonMode ? { responseMimeType: "application/json" } : {}),
          temperature: req.temperature ?? 0.35,
          maxOutputTokens: req.maxTokens ?? 700,
          ...(is25
            ? { thinkingConfig: { thinkingBudget: 0 } }
            : { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }),
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${model} timeout ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);

    const text = typeof res.text === "string" ? res.text : null;
    return text;
  } catch {
    return null;
  }
}

/**
 * Hàm gọi AI tối ưu 3 lớp (3-tier High Availability):
 * 1. Ưu tiên Groq Llama 3.1 8B / 3.3 70B (Siêu nhanh 150ms - 300ms)
 * 2. Fallback Cloudflare Workers AI (Edge toàn cầu)
 * 3. Fallback Google Gemini Flash
 */
export async function generateFastAiChat(req: AiChatRequest): Promise<AiChatResponse | null> {
  const start = Date.now();
  const maxTotalTimeout = req.timeoutMs || 4000;

  // 1. THỬ GROQ NẾU CÓ GROQ_API_KEY
  const groqKeys = getGroqApiKeys();
  if (groqKeys.length > 0) {
    for (const key of groqKeys) {
      for (const model of GROQ_MODELS) {
        if (Date.now() - start >= maxTotalTimeout) break;
        const perCallTimeout = Math.min(maxTotalTimeout - (Date.now() - start), 1800);
        const text = await callGroq(req, key, model, perCallTimeout);
        if (text && text.trim()) {
          const providerName: AiChatResponse["provider"] = model.includes("70b")
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

  // 2. DỰ PHÒNG CLOUDFLARE WORKERS AI (Nhanh và không bị rate limit)
  for (const cfModel of CLOUDFLARE_MODELS) {
    if (Date.now() - start >= maxTotalTimeout) break;
    const perCallTimeout = Math.min(maxTotalTimeout - (Date.now() - start), 1800);
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

  // 3. DỰ PHÒNG GOOGLE GEMINI (CHỈ KHI CÓ KEY AI STUDIO HỢP LỆ)
  const geminiKeys = getGeminiApiKeys(req.customApiKey);
  if (geminiKeys.length > 0) {
    for (const key of geminiKeys) {
      for (const model of GEMINI_MODELS) {
        if (Date.now() - start >= maxTotalTimeout) break;
        const perCallTimeout = Math.min(maxTotalTimeout - (Date.now() - start), 2000);
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

  return null;
}
