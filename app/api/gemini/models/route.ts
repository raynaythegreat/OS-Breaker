import { NextRequest, NextResponse } from "next/server";
import { buildChatApiHeaders } from "@/lib/chatHeaders";

export const dynamic = 'force-dynamic';

interface ModelOption {
  id: string;
  name: string;
  description: string;
  provider: 'gemini';
  recommendedForCode?: boolean;
}

interface GeminiModel {
  name: string;
  displayName: string;
  description: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  supportedGenerationMethods: string[];
  temperature: number;
  maxTemperature: number;
  topP: number;
  topK: number;
}

const FALLBACK_GEMINI_MODELS = [
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", description: "Fast & efficient" },
  { id: "gemini-1.5-flash-8b", name: "Gemini 1.5 Flash 8B", description: "Lightweight" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "High capability" },
  { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash", description: "Advanced Flash model" },
  { id: "gemini-3.0-flash-exp", name: "Gemini 3.0 Flash", description: "Latest Flash model" },
] as const;

const RECOMMENDED_CODE_MODELS = ["gemini-1.5-pro", "gemini-2.0-flash-exp"];

function buildFallbackModels() {
  return FALLBACK_GEMINI_MODELS.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    recommendedForCode: RECOMMENDED_CODE_MODELS.includes(m.id),
  }));
}

export async function GET(request: NextRequest) {
  const headers = await buildChatApiHeaders();
  const apiKey = headers['X-API-Key-Gemini'] ||
    process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const warning =
    !process.env.GEMINI_API_KEY && process.env.NEXT_PUBLIC_GEMINI_API_KEY
      ? "NEXT_PUBLIC_GEMINI_API_KEY is set; move it to GEMINI_API_KEY to avoid exposing your key to the browser."
      : null;

  if (!apiKey || !apiKey.trim()) {
    return NextResponse.json(
      { models: buildFallbackModels(), error: "GEMINI_API_KEY is not configured.", warning },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const models = (data.models || [])
      .filter((model: GeminiModel) => {
        const name = model.name || "";
        return name.includes("chat") || name.includes("flash") || name.includes("pro");
      })
      .map((model: GeminiModel) => ({
        id: model.name,
        name: model.displayName || model.name,
        description: "Gemini",
        provider: 'gemini' as const,
        recommendedForCode: RECOMMENDED_CODE_MODELS.includes(model.name),
      }))
      .sort((a: ModelOption, b: ModelOption) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      models,
      warning
    });
  } catch (error) {
    console.error('Gemini models fetch error:', error);
    return NextResponse.json(
      {
        models: buildFallbackModels(),
        error: error instanceof Error ? error.message : "Failed to load Gemini models",
        warning,
      },
      { status: 500 }
    );
  }
}
