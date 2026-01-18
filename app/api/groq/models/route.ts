import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface GroqModel {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
}

interface GroqModelsResponse {
  data?: GroqModel[];
}

const FALLBACK_GROQ_MODELS = [
  { id: "llama-3.1-70b-versatile", name: "Llama 3.1 70B Versatile", description: "Fast, high quality" },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant", description: "Fast + cheap" },
  { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B 32k", description: "Long context" },
  { id: "gemma2-9b-it", name: "Gemma 2 9B IT", description: "Solid general chat" },
] as const;

function buildFallbackModels() {
  return FALLBACK_GROQ_MODELS.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
  }));
}

const NON_CHAT_MODEL_HINTS = [
  "whisper",
  "distil-whisper",
  "audio",
  "speech",
  "tts",
  "transcribe",
  "embedding",
];

function isLikelyChatModel(modelId: string): boolean {
  const lower = modelId.toLowerCase();
  return !NON_CHAT_MODEL_HINTS.some((needle) => lower.includes(needle));
}

export async function GET() {
  const apiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;
  const warning =
    !process.env.GROQ_API_KEY && process.env.NEXT_PUBLIC_GROQ_API_KEY
      ? "NEXT_PUBLIC_GROQ_API_KEY is set; move it to GROQ_API_KEY to avoid exposing your key to the browser."
      : null;

  if (!apiKey) {
    return NextResponse.json(
      { models: buildFallbackModels(), error: "GROQ_API_KEY is not configured.", warning },
      { status: 200 }
    );
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || `HTTP ${response.status}`);
    }

    const data = (await response.json()) as GroqModelsResponse;
    const models = (data.data || [])
      .filter((model) => model && typeof model.id === "string")
      .filter((model) => isLikelyChatModel(model.id))
      .map((model) => ({
        id: model.id,
        name: model.id,
        description: "Groq",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ models, warning });
  } catch (error) {
    return NextResponse.json(
      {
        models: buildFallbackModels(),
        error: error instanceof Error ? error.message : "Failed to load Groq models",
        warning,
      },
      { status: 200 }
    );
  }
}
