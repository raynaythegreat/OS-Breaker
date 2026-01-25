import { NextRequest, NextResponse } from "next/server";
import { buildChatApiHeaders } from "@/lib/chatHeaders";

export const dynamic = 'force-dynamic';

interface ClaudeModel {
  id: string;
  object: string;
  created: number;
  name: string;
}

interface ClaudeModelsResponse {
  data: ClaudeModel[];
}

const FALLBACK_CLAUDE_MODELS = [
  { id: "claude-3.5-haiku", name: "Claude 3.5 Haiku", description: "Fast & efficient" },
  { id: "claude-3.5-sonnet", name: "Claude 3.5 Sonnet", description: "Great for code" },
  { id: "claude-opus-4", name: "Claude Opus 4", description: "Most capable" },
  { id: "claude-opus-4.5", name: "Claude Opus 4.5", description: "Latest Opus" },
  { id: "claude-sonnet-4", name: "Claude Sonnet 4", description: "Fast & smart" },
  { id: "claude-sonnet-4.5", name: "Claude Sonnet 4.5", description: "Newest Sonnet" },
] as const;

const RECOMMENDED_CODE_MODELS = ["claude-3.5-sonnet", "claude-sonnet-4", "claude-sonnet-4.5"];

function buildFallbackModels() {
  return FALLBACK_CLAUDE_MODELS.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    recommendedForCode: RECOMMENDED_CODE_MODELS.includes(m.id),
  }));
}

export async function GET(request: NextRequest) {
  const headers = await buildChatApiHeaders();
  const apiKey = headers['X-API-Key-Anthropic'] ||
    process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
  const warning =
    !process.env.ANTHROPIC_API_KEY && process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
      ? "NEXT_PUBLIC_ANTHROPIC_API_KEY is set; move it to ANTHROPIC_API_KEY to avoid exposing your key to the browser."
      : null;

  if (!apiKey || !apiKey.trim()) {
    return NextResponse.json(
      { models: buildFallbackModels(), error: "ANTHROPIC_API_KEY is not configured.", warning },
      { status: 400 }
    );
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey.trim(),
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || `HTTP ${response.status}`);
    }

    const data = (await response.json()) as ClaudeModelsResponse;
    const models = (data.data || [])
      .filter((model) => typeof model.id === "string")
      .map((model) => ({
        id: model.id,
        name: model.name || model.id,
        description: "Claude",
        provider: 'claude' as const,
        recommendedForCode: RECOMMENDED_CODE_MODELS.includes(model.id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      models,
      warning
    });
  } catch (error) {
    console.error('Claude models fetch error:', error);
    return NextResponse.json(
      {
        models: buildFallbackModels(),
        error: error instanceof Error ? error.message : "Failed to load Claude models",
        warning,
      },
      { status: 500 }
    );
  }
}
