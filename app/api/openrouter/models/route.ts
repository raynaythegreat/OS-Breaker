import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface OpenRouterPricing {
  prompt?: string;
  completion?: string;
  request?: string;
}

interface OpenRouterModel {
  id: string;
  name?: string;
  description?: string;
  pricing?: OpenRouterPricing;
  context_length?: number;
}

interface OpenRouterModelsResponse {
  data?: OpenRouterModel[];
}

function buildShortDescription(_model: OpenRouterModel): string {
  return "Free";
}

function isFreeModel(model: OpenRouterModel): boolean {
  if (model.id.endsWith(":free")) return true;
  const pricing = model.pricing || {};
  return (
    pricing.prompt === "0" &&
    pricing.completion === "0" &&
    (pricing.request === undefined || pricing.request === "0")
  );
}

export async function GET() {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }

    const data = (await response.json()) as OpenRouterModelsResponse;
    const models = (data.data || [])
      .filter((model) => model && typeof model.id === "string")
      .filter(isFreeModel)
      .map((model) => ({
        id: model.id,
        name: model.name || model.id,
        description: buildShortDescription(model),
        contextLength: model.context_length ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ models });
  } catch (error) {
    return NextResponse.json(
      { models: [], error: error instanceof Error ? error.message : "Failed to load OpenRouter models" },
      { status: 200 }
    );
  }
}
