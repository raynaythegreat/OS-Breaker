import { NextResponse } from "next/server";
import { ok } from "@/lib/apiResponse";
import { getOllamaBaseUrl, getPlatformHint, summarizeProvidersFromEnv } from "@/lib/runtime";
import { getRuntimeEnv } from "@/lib/runtime";
import { normalizeBaseUrl } from "@/lib/config/schema";

export const dynamic = "force-dynamic";

async function checkOllamaReachable(baseUrl: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const res = await fetch(`${normalizeBaseUrl(baseUrl)}/api/tags`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const env = getRuntimeEnv();
  const platformHint = getPlatformHint();

  const providers = summarizeProvidersFromEnv();
  const ollamaBaseUrl = getOllamaBaseUrl();
  const reachable = ollamaBaseUrl ? await checkOllamaReachable(ollamaBaseUrl) : null;

  const providersObj: Record<string, any> = {
    anthropic: providers.includes("claude") ? { configured: true, source: "env" } : { configured: false, source: "none" },
    openai: providers.includes("openai") ? { configured: true, source: "env" } : { configured: false, source: "none" },
    groq: providers.includes("groq") ? { configured: true, source: "env" } : { configured: false, source: "none" },
    openrouter: providers.includes("openrouter") ? { configured: true, source: "env" } : { configured: false, source: "none" },
    fireworks: providers.includes("fireworks") ? { configured: true, source: "env" } : { configured: false, source: "none" },
    ollama: {
      baseUrl: ollamaBaseUrl,
      reachable
    }
  };

  return ok({
    runtime: {
      nodeEnv: process.env.NODE_ENV ?? "production",
      platformHint,
      onCloud: env.onCloud,
      onVercel: env.onVercel,
      onRender: env.onRender
    },
    providers: providersObj,
    meta: {
      refreshedAt: Date.now()
    }
  });
}