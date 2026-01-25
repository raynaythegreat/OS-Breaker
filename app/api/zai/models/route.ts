import { NextRequest, NextResponse } from "next/server";
import { buildChatApiHeaders } from "@/lib/chatHeaders";

export const dynamic = 'force-dynamic';

interface ZaiModel {
  id: string;
}

interface ZaiModelsResponse {
  data: ZaiModel[];
}

const FALLBACK_ZAI_MODELS = [
  { id: "glm-4.7", name: "GLM-4.7", description: "Flagship coding model" },
  { id: "glm-4.7-flash", name: "GLM-4.7-Flash", description: "Fast free coding model (30B MoE)" },
  { id: "glm-4.5-flash", name: "GLM-4.5-Flash", description: "Fast free reasoning model" },
  { id: "glm-4.6v", name: "GLM-4.6V", description: "Multimodal with vision" },
  { id: "glm-4.6v-flash", name: "GLM-4.6V-Flash", description: "Fast multimodal with vision" },
] as const;

const RECOMMENDED_CODE_MODELS = ["glm-4.7", "glm-4.7-flash", "glm-4.5-flash"];

function buildFallbackModels() {
  return FALLBACK_ZAI_MODELS.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    recommendedForCode: RECOMMENDED_CODE_MODELS.includes(m.id),
  }));
}

export async function GET(request: NextRequest) {
  const headers = await buildChatApiHeaders();
  const apiKey = headers['X-API-Key-Zai'] ||
    process.env.ZAI_API_KEY || process.env.NEXT_PUBLIC_ZAI_API_KEY;
  const warning =
    !process.env.ZAI_API_KEY && process.env.NEXT_PUBLIC_ZAI_API_KEY
      ? "NEXT_PUBLIC_ZAI_API_KEY is set; move it to ZAI_API_KEY to avoid exposing your key to the browser."
      : null;

  if (!apiKey || !apiKey.trim()) {
    return NextResponse.json(
      { success: true, models: buildFallbackModels(), error: "ZAI_API_KEY is not configured.", warning },
      { status: 200 }
    );
  }

  try {
    const response = await fetch("https://open.bigmodel.cn/api/paas/v4/models", {
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || `HTTP ${response.status}`);
    }

    const data = (await response.json()) as ZaiModelsResponse;
    const models = (data.data || [])
      .filter((model) => typeof model.id === "string")
      .map((model) => ({
        id: model.id,
        name: model.id,
        description: "Z.ai",
        provider: 'zai' as const,
        recommendedForCode: RECOMMENDED_CODE_MODELS.includes(model.id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      models,
      warning
    });
  } catch (error) {
    console.error('Z.ai models fetch error:', error);
    return NextResponse.json(
      {
        success: true,
        models: buildFallbackModels(),
        error: error instanceof Error ? error.message : "Failed to load Z.ai models",
        warning,
      },
      { status: 200 }
    );
  }
}
