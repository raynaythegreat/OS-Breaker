import { NextRequest, NextResponse } from "next/server";
import { buildChatApiHeaders } from "@/lib/chatHeaders";

export const dynamic = "force-dynamic";

type FireworksModel = {
  id: string;
  name?: string;
  description?: string;
};

type FireworksModelsResponse = {
  data?: FireworksModel[];
  models?: FireworksModel[];
};

const FALLBACK_MODELS: FireworksModel[] = [
  {
    id: "accounts/fireworks/models/llama-v3-70b-instruct",
    name: "Llama 3 70B Instruct",
    description: "Fireworks Llama 3 70B",
  },
  {
    id: "accounts/fireworks/models/llama-v3-8b-instruct",
    name: "Llama 3 8B Instruct",
    description: "Fireworks Llama 3 8B",
  },
  {
    id: "accounts/fireworks/models/mixtral-8x7b-instruct",
    name: "Mixtral 8x7B Instruct",
    description: "Fireworks Mixtral",
  },
  {
    id: "accounts/fireworks/models/qwen2-72b-instruct",
    name: "Qwen2 72B Instruct",
    description: "Fireworks Qwen2",
  },
];

function parseEnvList(value: string | undefined): FireworksModel[] {
  const raw = value?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((id) => ({ id, name: id, description: "Fireworks" }));
}

export async function GET(request: NextRequest) {
  const headers = await buildChatApiHeaders();
  const apiKey = headers['X-API-Key-Fireworks'] ||
    process.env.FIREWORKS_API_KEY || process.env.FIREWORKS_IMAGE_API_KEY;
  const baseUrl =
    process.env.FIREWORKS_BASE_URL?.trim() ||
    "https://api.fireworks.ai/inference/v1";
  const envModels = parseEnvList(process.env.FIREWORKS_CHAT_MODELS);

  if (envModels.length > 0) {
    return NextResponse.json({
      success: true,
      models: envModels.map((model) => ({
        id: model.id,
        name: model.name || model.id,
        description: model.description || "Fireworks",
        provider: 'fireworks' as const
      }))
    });
  }

  if (!apiKey || !apiKey.trim()) {
    return NextResponse.json({
      success: true,
      error: "Fireworks API key is not configured",
      models: FALLBACK_MODELS.map(model => ({
        id: model.id,
        name: model.name || model.id,
        description: model.description || "Fireworks",
        provider: 'fireworks' as const
      }))
    }, { status: 400 });
  }

  try {
    const url = new URL(
      "models",
      baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
    ).toString();
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || `HTTP ${response.status}`);
    }

    const data = (await response.json()) as FireworksModelsResponse;
    const list = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.models)
        ? data.models
        : [];
    const models = list
      .filter((model) => model && typeof model.id === "string")
      .map((model) => ({
        id: model.id,
        name: model.name || model.id,
        description: model.description || "Fireworks",
        provider: 'fireworks' as const
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (models.length === 0) {
      return NextResponse.json({
        success: true,
        models: FALLBACK_MODELS.map((model) => ({
          id: model.id,
          name: model.name || model.id,
          description: model.description || "Fireworks",
          provider: 'fireworks' as const
        }))
      });
    }

    return NextResponse.json({
      success: true,
      models
    });
  } catch (error) {
    console.error('Fireworks models fetch error:', error);
    return NextResponse.json(
      {
        success: true,
        models: FALLBACK_MODELS.map(model => ({
          id: model.id,
          name: model.name || model.id,
          description: model.description || "Fireworks",
          provider: 'fireworks' as const
        })),
        error: error instanceof Error
          ? error.message
          : "Failed to load Fireworks models",
      },
      { status: 500 }
    );
  }
}
