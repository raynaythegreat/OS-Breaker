import { NextRequest, NextResponse } from "next/server";

// This is a simulated list of models available through OpenCode Zen.
// In a real scenario, this would be fetched from the OpenCode Zen API.
const OPENCODE_ZEN_MODELS = {
  free: [
    { id: "opencodezen:grok-code", name: "Grok Code", description: "Free (xAI)", tier: "free" },
    { id: "opencodezen:minimax-m2.1-free", name: "MiniMax M2.1", description: "Free (MiniMax)", tier: "free" },
  ],
  premium: [
    // OpenAI
    { id: "opencodezen:gpt-4o", name: "GPT-4o", description: "via OpenCode Zen", tier: "premium" },
    { id: "opencodezen:gpt-4-turbo", name: "GPT-4 Turbo", description: "via OpenCode Zen", tier: "premium" },
    // Anthropic
    { id: "opencodezen:claude-3.5-sonnet", name: "Claude 3.5 Sonnet", description: "via OpenCode Zen", tier: "premium" },
    { id: "opencodezen:claude-3-opus", name: "Claude 3 Opus", description: "via OpenCode Zen", tier: "premium" },
    // Gemini
    { id: "opencodezen:gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "via OpenCode Zen", tier: "premium" },
    { id: "opencodezen:gemini-1.5-flash", name: "Gemini 1.5 Flash", description: "via OpenCode Zen", tier: "premium" },
  ]
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const headerKey = request.headers.get("x-opencode-key");
  const apiKey = headerKey || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null) || process.env.OPENCODE_API_KEY;

  // If an API key is provided, we assume the user has access to premium models.
  // Otherwise, we only return the free models.
  const models = apiKey 
    ? [...OPENCODE_ZEN_MODELS.premium, ...OPENCODE_ZEN_MODELS.free] 
    : OPENCODE_ZEN_MODELS.free;

  // Sort models alphabetically by name
  models.sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ models });
}
