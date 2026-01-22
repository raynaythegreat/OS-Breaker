import { z } from "zod";

const RuntimeInfoSchema = z.object({
  appName: z.string().default("OS Athena"),
  version: z.string().default("0.0.0"),
  nodeEnv: z.string().optional(),
  updates: z
    .object({
      owner: z.string().default("raynaythegreat"),
      repo: z.string().default("OS-Athena"),
    })
    .default({ owner: "raynaythegreat", repo: "OS-Athena" }),
});

export type RuntimeInfo = z.infer<typeof RuntimeInfoSchema>;

export function getRuntimeInfo(): RuntimeInfo {
  // In Next.js, we can rely on NEXT_PUBLIC_* on the client and process.env on the server.
  // Version comes from package.json via NEXT_PUBLIC_APP_VERSION (set in next.config.js or env),
  // with a safe fallback.
  const parsed = RuntimeInfoSchema.safeParse({
    appName: process.env.NEXT_PUBLIC_APP_NAME || "OS Athena",
    version: process.env.NEXT_PUBLIC_APP_VERSION || process.env.npm_package_version || "0.0.0",
    nodeEnv: process.env.NODE_ENV,
    updates: {
      owner: process.env.NEXT_PUBLIC_UPDATES_OWNER || "raynaythegreat",
      repo: process.env.NEXT_PUBLIC_UPDATES_REPO || "OS-Athena",
    },
  });

  if (parsed.success) return parsed.data;

  return {
    appName: "OS Athena",
    version: process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0",
    nodeEnv: process.env.NODE_ENV,
    updates: {
      owner: process.env.NEXT_PUBLIC_UPDATES_OWNER || "raynaythegreat",
      repo: process.env.NEXT_PUBLIC_UPDATES_REPO || "OS-Athena",
    },
  };
}

export function getOllamaBaseUrl(): string {
  return process.env.OLLAMA_BASE_URL || "http://localhost:11434";
}

export function getPlatformHint(): string {
  const platform = process.platform;
  if (platform === "linux") return "linux";
  if (platform === "darwin") return "macos";
  if (platform === "win32") return "windows";
  return "unknown";
}

export function summarizeProvidersFromEnv(): string[] {
  const providers: string[] = [];
  
  if (process.env.OPENAI_API_KEY) providers.push("openai");
  if (process.env.CLAUDE_API_KEY) providers.push("claude");
  if (process.env.GEMINI_API_KEY) providers.push("gemini");
  if (process.env.OPENROUTER_API_KEY) providers.push("openrouter");
  if (process.env.GROQ_API_KEY) providers.push("groq");
  if (process.env.FIREWORKS_API_KEY) providers.push("fireworks");
  if (process.env.OLLAMA_BASE_URL) providers.push("ollama");
  
  return providers;
}
