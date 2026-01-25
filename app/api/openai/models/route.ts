import { NextRequest, NextResponse } from "next/server";
import { buildChatApiHeaders } from "@/lib/chatHeaders";

export const dynamic = 'force-dynamic';

interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface OpenAIModelsResponse {
  data: OpenAIModel[];
}

const FALLBACK_OPENAI_MODELS = [
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", description: "High capability" },
  { id: "gpt-4o", name: "GPT-4o", description: "Latest flagship" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "Fast & affordable" },
  { id: "gpt-5.1", name: "GPT-5.1", description: "Next-gen GPT" },
  { id: "gpt-5.2", name: "GPT-5.2", description: "Newest GPT flagship" },
  { id: "o1", name: "o1", description: "Reasoning model" },
  { id: "o1-mini", name: "o1 Mini", description: "Fast reasoning" },
] as const;

const RECOMMENDED_CODE_MODELS = ["gpt-4o", "gpt-4-turbo", "o1"];

const NON_CHAT_MODEL_HINTS = [
  "davinci",
  "babbage",
  "curie",
  "ada",
  "text-embedding",
  "whisper",
  "tts",
  "dall-e",
  "image",
];

function isLikelyChatModel(modelId: string): boolean {
  const lower = modelId.toLowerCase();
  return !NON_CHAT_MODEL_HINTS.some((needle) => lower.includes(needle));
}

function buildFallbackModels() {
  return FALLBACK_OPENAI_MODELS.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    recommendedForCode: RECOMMENDED_CODE_MODELS.includes(m.id),
  }));
}

export async function GET(request: NextRequest) {
  const headers = await buildChatApiHeaders();
  const apiKey = headers['X-API-Key-OpenAI'] ||
    process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  const warning =
    !process.env.OPENAI_API_KEY && process.env.NEXT_PUBLIC_OPENAI_API_KEY
      ? "NEXT_PUBLIC_OPENAI_API_KEY is set; move it to OPENAI_API_KEY to avoid exposing your key to the browser."
      : null;

  if (!apiKey || !apiKey.trim()) {
    return NextResponse.json(
      { models: buildFallbackModels(), error: "OPENAI_API_KEY is not configured.", warning },
      { status: 400 }
    );
  }

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
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

    const data = (await response.json()) as OpenAIModelsResponse;
    const models = (data.data || [])
      .filter((model) => typeof model.id === "string")
      .filter((model) => isLikelyChatModel(model.id))
      .map((model) => ({
        id: model.id,
        name: model.id,
        description: "OpenAI",
        provider: 'openai' as const,
        recommendedForCode: RECOMMENDED_CODE_MODELS.includes(model.id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      models,
      warning
    });
  } catch (error) {
    console.error('OpenAI models fetch error:', error);
    return NextResponse.json(
      {
        models: buildFallbackModels(),
        error: error instanceof Error ? error.message : "Failed to load OpenAI models",
        warning,
      },
      { status: 500 }
    );
  }
}
