import { NextRequest, NextResponse } from "next/server";
import { buildChatApiHeaders } from "@/lib/chatHeaders";

export const dynamic = 'force-dynamic';

interface MistralModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface MistralModelsResponse {
  data: MistralModel[];
}

const FALLBACK_MISTRAL_MODELS = [
  { id: "mistral-large-latest", name: "Mistral Large", description: "Top-tier reasoning" },
  { id: "mistral-medium-latest", name: "Mistral Medium", description: "Balanced performance" },
  { id: "mistral-small-latest", name: "Mistral Small", description: "Fast & efficient" },
  { id: "codestral-latest", name: "Codestral", description: "Code specialist" },
] as const;

const RECOMMENDED_CODE_MODELS = ["codestral-latest", "mistral-large-latest"];

function buildFallbackModels() {
  return FALLBACK_MISTRAL_MODELS.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    recommendedForCode: RECOMMENDED_CODE_MODELS.includes(m.id),
  }));
}

export async function GET(request: NextRequest) {
  const headers = await buildChatApiHeaders();
  const apiKey = headers['X-API-Key-Mistral'] ||
    process.env.MISTRAL_API_KEY || process.env.NEXT_PUBLIC_MISTRAL_API_KEY;
  const warning =
    !process.env.MISTRAL_API_KEY && process.env.NEXT_PUBLIC_MISTRAL_API_KEY
      ? "NEXT_PUBLIC_MISTRAL_API_KEY is set; move it to MISTRAL_API_KEY to avoid exposing your key to the browser."
      : null;

  if (!apiKey || !apiKey.trim()) {
    return NextResponse.json(
      { success: true, models: buildFallbackModels(), error: "MISTRAL_API_KEY is not configured.", warning },
      { status: 400 }
    );
  }

  try {
    const response = await fetch("https://api.mistral.ai/v1/models", {
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

    const data = (await response.json()) as MistralModelsResponse;
    const models = (data.data || [])
      .filter((model) => typeof model.id === "string")
      .map((model) => ({
        id: model.id,
        name: model.id,
        description: "Mistral",
        provider: 'mistral' as const,
        recommendedForCode: RECOMMENDED_CODE_MODELS.includes(model.id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      models,
      warning
    });
  } catch (error) {
    console.error('Mistral models fetch error:', error);
    return NextResponse.json(
      {
        success: true,
        models: buildFallbackModels(),
        error: error instanceof Error ? error.message : "Failed to load Mistral models",
        warning,
      },
      { status: 500 }
    );
  }
}
