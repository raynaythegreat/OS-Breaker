import { NextRequest, NextResponse } from "next/server";
import { buildChatApiHeaders } from "@/lib/chatHeaders";

export const dynamic = 'force-dynamic';

interface PerplexityModel {
  id: string;
  name: {
    content: string;
  }
  context_length: number;
  created_at: string;
}

interface PerplexityModelsResponse {
  models: PerplexityModel[];
}

const FALLBACK_PERPLEXITY_MODELS = [
  { id: "llama-3.1-sonar-large-128k-online", name: "Sonar Large Online", description: "With web search" },
  { id: "llama-3.1-sonar-small-128k-online", name: "Sonar Small Online", description: "Fast with search" },
  { id: "llama-3.1-sonar-large-128k-chat", name: "Sonar Large Chat", description: "Without search" },
] as const;

const RECOMMENDED_CODE_MODELS = ["llama-3.1-sonar-large-128k-online", "llama-3.1-sonar-large-128k-chat"];

function buildFallbackModels() {
  return FALLBACK_PERPLEXITY_MODELS.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    recommendedForCode: RECOMMENDED_CODE_MODELS.includes(m.id),
  }));
}

export async function GET(request: NextRequest) {
  const headers = await buildChatApiHeaders();
  const apiKey = headers['X-API-Key-Perplexity'] ||
    process.env.PERPLEXITY_API_KEY || process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY;
  const warning =
    !process.env.PERPLEXITY_API_KEY && process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY
      ? "NEXT_PUBLIC_PERPLEXITY_API_KEY is set; move it to PERPLEXITY_API_KEY to avoid exposing your key to the browser."
      : null;

  if (!apiKey || !apiKey.trim()) {
    return NextResponse.json(
      { models: buildFallbackModels(), error: "PERPLEXITY_API_KEY is not configured.", warning },
      { status: 400 }
    );
  }

  try {
    const response = await fetch("https://api.perplexity.ai/v1/models", {
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

    const data = (await response.json()) as PerplexityModelsResponse;
    const models = (data.models || [])
      .filter((model) => typeof model.id === "string")
      .map((model) => ({
        id: model.id,
        name: model.name.content || model.id,
        description: "Perplexity",
        provider: 'perplexity' as const,
        recommendedForCode: RECOMMENDED_CODE_MODELS.includes(model.id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      models,
      warning
    });
  } catch (error) {
    console.error('Perplexity models fetch error:', error);
    return NextResponse.json(
      {
        models: buildFallbackModels(),
        error: error instanceof Error ? error.message : "Failed to load Perplexity models",
        warning,
      },
      { status: 500 }
    );
  }
}
