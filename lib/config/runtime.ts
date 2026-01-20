import { z } from "zod";
import {
  RuntimeEnvSchema,
  type RuntimeEnv,
  type ProviderKeySummary,
  nonEmpty,
} from "./schema";

const RuntimeInfoSchema = z.object({
  appName: z.string().default("GateKeep"),
  version: z.string().default("0.0.0"),
  nodeEnv: z.string().optional(),
  updates: z
    .object({
      owner: z.string().default("raynaythegreat"),
      repo: z.string().default("AI-Gatekeep"),
    })
    .default({ owner: "raynaythegreat", repo: "AI-Gatekeep" }),
});

export type RuntimeInfo = z.infer<typeof RuntimeInfoSchema>;

export function getRuntimeInfo(): RuntimeInfo {
  // In Next.js, we can rely on NEXT_PUBLIC_* on the client and process.env on the server.
  // Version comes from package.json via NEXT_PUBLIC_APP_VERSION (set in next.config.js or env),
  // with a safe fallback.
  const parsed = RuntimeInfoSchema.safeParse({
    appName: process.env.NEXT_PUBLIC_APP_NAME || "GateKeep",
    version: process.env.NEXT_PUBLIC_APP_VERSION || process.env.npm_package_version || "0.0.0",
    nodeEnv: process.env.NODE_ENV,
    updates: {
      owner: process.env.NEXT_PUBLIC_UPDATES_OWNER || "raynaythegreat",
      repo: process.env.NEXT_PUBLIC_UPDATES_REPO || "AI-Gatekeep",
    },
  });

  if (parsed.success) return parsed.data;

  return {
    appName: "GateKeep",
    version: process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0",
    nodeEnv: process.env.NODE_ENV,
    updates: {
      owner: process.env.NEXT_PUBLIC_UPDATES_OWNER || "raynaythegreat",
      repo: process.env.NEXT_PUBLIC_UPDATES_REPO || "AI-Gatekeep",
    },
  };
}

export function getRuntimeEnv(): RuntimeEnv {
  const parsed = RuntimeEnvSchema.safeParse(process.env);
  if (parsed.success) return parsed.data;
  return {};
}

function hasEnvValue(name: string): boolean {
  return Boolean(nonEmpty(process.env[name]));
}

function summarizeFromEnv(names: string[]): ProviderKeySummary {
  const configured = names.some((name) => hasEnvValue(name));
  return {
    configured,
    source: configured ? "env" : "none",
  };
}

export function summarizeProvidersFromEnv() {
  return {
    anthropic: summarizeFromEnv(["CLAUDE_API_KEY", "ANTHROPIC_API_KEY"]),
    openai: summarizeFromEnv(["OPENAI_API_KEY"]),
    groq: summarizeFromEnv(["GROQ_API_KEY", "NEXT_PUBLIC_GROQ_API_KEY"]),
    openrouter: summarizeFromEnv([
      "OPENROUTER_API_KEY",
      "NEXT_PUBLIC_OPENROUTER_API_KEY",
    ]),
    fireworks: summarizeFromEnv(["FIREWORKS_API_KEY", "FIREWORKS_IMAGE_API_KEY"]),
  };
}

export function getOllamaBaseUrl(): string | null {
  const configured =
    nonEmpty(process.env.OLLAMA_BASE_URL) ||
    nonEmpty(process.env.NEXT_PUBLIC_OLLAMA_BASE_URL);
  if (configured) return configured;

  const onVercel = process.env.VERCEL === "1";
  const onRender =
    process.env.RENDER === "true" ||
    (typeof process.env.RENDER_SERVICE_ID === "string" &&
      process.env.RENDER_SERVICE_ID.trim().length > 0);
  return onVercel || onRender ? null : "http://localhost:11434";
}

function isDesktopFlag(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (["desktop", "app", "electron", "tauri"].includes(normalized)) return true;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  return false;
}

export function getPlatformHint(): "web" | "desktop" {
  const explicit =
    process.env.GATEKEEP_PLATFORM ||
    process.env.NEXT_PUBLIC_GATEKEEP_PLATFORM ||
    process.env.APP_PLATFORM ||
    process.env.NEXT_PUBLIC_APP_PLATFORM ||
    process.env.PLATFORM ||
    process.env.NEXT_PUBLIC_PLATFORM ||
    process.env.GATEKEEP_DESKTOP ||
    process.env.NEXT_PUBLIC_GATEKEEP_DESKTOP ||
    process.env.DESKTOP_APP ||
    process.env.NEXT_PUBLIC_DESKTOP_APP;

  if (isDesktopFlag(explicit)) return "desktop";

  if (
    process.env.TAURI_PLATFORM ||
    process.env.TAURI_FAMILY ||
    process.env.ELECTRON_RUN_AS_NODE
  ) {
    return "desktop";
  }

  return "web";
}
