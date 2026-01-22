import { z } from "zod";

const NonEmptyString = z.string().trim().min(1);

export const RuntimeEnvSchema = z.object({
  // App auth
  APP_PASSWORD: z.string().optional(),

  // LLM provider keys (hosted mode)
  CLAUDE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),

  // Fireworks
  FIREWORKS_API_KEY: z.string().optional(),
  FIREWORKS_IMAGE_API_KEY: z.string().optional(),
  FIREWORKS_BASE_URL: z.string().optional(),
  FIREWORKS_CHAT_MODELS: z.string().optional(),

  // Ollama
  OLLAMA_BASE_URL: z.string().optional(),

  // GitHub
  GITHUB_TOKEN: z.string().optional(),

  // Render/Vercel (optional; used by deployment features)
  VERCEL_TOKEN: z.string().optional(),
  VERCEL_TEAM_ID: z.string().optional(),
  RENDER_API_KEY: z.string().optional(),

  // Optional feature flags
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),

  // Public (Next.js) - keep in mind these end up client-side if used
  NEXT_PUBLIC_APP_NAME: z.string().optional()
});

export type RuntimeEnv = z.infer<typeof RuntimeEnvSchema>;

export const ProviderKeySummarySchema = z.object({
  configured: z.boolean(),
  source: z.enum(["env", "local", "none"]).default("none")
});

export type ProviderKeySummary = z.infer<typeof ProviderKeySummarySchema>;

export const DiagnosticsSummarySchema = z.object({
  runtime: z.object({
    nodeEnv: z.string().default("production"),
    platformHint: z.enum(["web", "desktop"]).default("web")
  }),
  providers: z.object({
    anthropic: ProviderKeySummarySchema,
    openai: ProviderKeySummarySchema,
    groq: ProviderKeySummarySchema,
    openrouter: ProviderKeySummarySchema,
    fireworks: ProviderKeySummarySchema,
    ollama: z.object({
      baseUrl: z.string().nullable().default(null),
      reachable: z.boolean().nullable().default(null)
    })
  }),
  meta: z.object({
    refreshedAt: z.number()
  })
});

export type DiagnosticsSummary = z.infer<typeof DiagnosticsSummarySchema>;

export function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

export function coerceBoolean(value: unknown, defaultValue = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    if (["1", "true", "yes", "y", "on"].includes(lower)) return true;
    if (["0", "false", "no", "n", "off"].includes(lower)) return false;
  }
  return defaultValue;
}

export function nonEmpty(value: string | undefined | null): string | null {
  const v = (value ?? "").trim();
  return v ? v : null;
}

export function parseCsv(value: string | undefined): string[] {
  const raw = value?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const DocsLinks = {
  openai: "https://platform.openai.com/api-keys",
  anthropic: "https://console.anthropic.com/settings/keys",
  groq: "https://console.groq.com/keys",
  openrouter: "https://openrouter.ai/keys",
  fireworks: "https://fireworks.ai/account/api-keys",
  ollama: "https://ollama.com/download"
} as const;

export const EnvVarNames = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  groq: "GROQ_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  fireworks: "FIREWORKS_API_KEY",
  ollamaBaseUrl: "OLLAMA_BASE_URL"
} as const;