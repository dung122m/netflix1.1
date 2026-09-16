import { NextResponse } from "next/server";
import { generateFastAiChat } from "@/services/aiProviderService";
import { generateGeminiEmbedding } from "@/services/aiVectorService";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    status: "checking",
  };

  // 1. Kiểm tra Cloudflare Workers AI (Vector Embedding)
  const cfStart = Date.now();
  let cfEmbeddingStatus = "failed";
  let cfDimensions = 0;
  try {
    const vector = await generateGeminiEmbedding("phim hành động kịch tính");
    if (vector && vector.length > 0) {
      cfEmbeddingStatus = "success";
      cfDimensions = vector.length;
    }
  } catch (err) {
    cfEmbeddingStatus = `error: ${err instanceof Error ? err.message : String(err)}`;
  }
  const cfLatencyMs = Date.now() - cfStart;

  // 2. Kiểm tra Groq Cloud & Cloudflare LLM (Fast AI Chat)
  const llmStart = Date.now();
  let llmStatus = "failed";
  let llmProvider = "none";
  let llmModel = "none";
  let sampleReply = "";
  try {
    const aiRes = await generateFastAiChat({
      systemPrompt: "Bạn là trợ lý AI. Hãy trả lời cực ngắn gọn dưới 10 từ.",
      userPrompt: "Chào bạn, hãy giới thiệu bạn là ai.",
      temperature: 0.2,
      maxTokens: 50,
    });
    if (aiRes && aiRes.text) {
      llmStatus = "success";
      llmProvider = aiRes.provider;
      llmModel = aiRes.model;
      sampleReply = aiRes.text;
    }
  } catch (err) {
    llmStatus = `error: ${err instanceof Error ? err.message : String(err)}`;
  }
  const llmLatencyMs = Date.now() - llmStart;

  results.status = cfEmbeddingStatus === "success" && llmStatus === "success" ? "HEALTHY" : "DEGRADED";
  results.tests = {
    vectorEmbedding: {
      provider: "Cloudflare Workers AI (@cf/baai/bge-base-en-v1.5)",
      status: cfEmbeddingStatus,
      dimensions: cfDimensions,
      latencyMs: cfLatencyMs,
    },
    chatGeneration: {
      activeProvider: llmProvider,
      model: llmModel,
      status: llmStatus,
      sampleReply,
      latencyMs: llmLatencyMs,
    },
  };

  return NextResponse.json(results, { status: 200 });
}
