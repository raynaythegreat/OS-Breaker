import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { getRuntimeEnv } from "@/lib/runtime";

export const dynamic = 'force-dynamic';

// Helper function to get API keys from headers or environment
function getApiKeyFromRequest(request: NextRequest, provider: string): string | null {
  const headerName = `X-API-Key-${provider.charAt(0).toUpperCase() + provider.slice(1)}`;
  const headerToken = request.headers.get(headerName);
  if (headerToken && headerToken.trim()) {
    return headerToken.trim();
  }
  
  // Map provider names to environment variable names
  const envMap: Record<string, string> = {
    anthropic: 'CLAUDE_API_KEY',
    claude: 'CLAUDE_API_KEY',
    openai: 'OPENAI_API_KEY',
    gemini: 'GEMINI_API_KEY',
    groq: 'GROQ_API_KEY',
    openrouter: 'OPENROUTER_API_KEY',
    ollama: 'OLLAMA_API_KEY',
    opencodezen: 'OPENCODE_API_KEY',
    fireworks: 'FIREWORKS_API_KEY',
    mistral: 'MISTRAL_API_KEY',
    zai: 'ZAI_API_KEY', // Legacy name, also check ZHIPU_API_KEY below
  };
  
  const envName = envMap[provider];
  if (envName) {
    const envValue = process.env[envName] || process.env[`NEXT_PUBLIC_${envName}`];
    if (envValue && envValue.trim()) {
      return envValue.trim();
    }
  }

  // Special handling: Z.ai supports both ZAI_API_KEY and ZHIPU_API_KEY
  if (provider === 'zai') {
    const zhipuKey = process.env.ZHIPU_API_KEY || process.env.NEXT_PUBLIC_ZHIPU_API_KEY;
    if (zhipuKey && zhipuKey.trim()) {
      return zhipuKey.trim();
    }
  }

  return null;
}

const SYSTEM_PROMPT = `You are OS Athena, an expert AI assistant specialized in web development. You help users plan, build, and deploy web applications directly to their GitHub repositories.

**IMPORTANT: When working with a selected GitHub repository, your FILE CHANGES can be applied/committed via the app after the user clicks Apply. Deployments are manual. Write complete, production-ready code.**

**DEPLOYMENT PROVIDERS (Vercel + Render):**
- This app can deploy repos to **Vercel** or **Render**. When users ask about deployment, recommend the best default:
  - Prefer **Vercel** for Next.js and typical frontend/SSR apps (fastest, most seamless for Next.js).
  - Prefer **Render** for long-running servers (WebSockets), background jobs/queues, or when a persistent service is needed.
- When telling users where to set secrets, say **"your hosting environment variables (Vercel or Render) or .env.local"** (don’t assume Vercel-only).

When working with a GitHub repository:
1. First, analyze the repository structure to understand the project architecture
2. Review existing code patterns, dependencies, and frameworks in use
3. Provide specific, actionable improvements that match the project's style
4. Consider best practices for the detected framework (React, Next.js, Vue, etc.)
5. Write COMPLETE files - never use placeholders, ellipses (...), or "rest of code" comments
6. Include proper error handling, TypeScript types, and accessibility features
7. Ensure all dependencies are compatible with the existing package.json

**WORKFLOW (Save tokens + avoid unwanted commits):**
When the user is working with a selected GitHub repository AND asks for code changes ("fix", "add", "update", "implement", "change", "refactor", "create"):
1) Respond with a clear PLAN first (no code, no FILE CHANGES). Include:
   - Goals
   - Steps
   - Files you expect to touch
   - Any assumptions / questions
2) Ask the user to confirm before you generate the actual patch.
3) ONLY after the user explicitly confirms (e.g. "proceed", "generate file changes", "yes do it"), you may output a FILE CHANGES section.

You can help with:
- Creating and improving landing pages
- Building full-stack web applications and SaaS products
- Writing React/Next.js/Vue/Svelte components
- Styling with Tailwind CSS, styled-components, or plain CSS
- Backend API development (REST, GraphQL, tRPC)
- Database schema design (Prisma, Drizzle, SQL)
- Authentication and authorization
- Deployment configurations and environment variables
- Performance optimization and SEO

**FILE CHANGES FORMAT:**
When the user asks to create or update files in the selected repository, end your response with a FILE CHANGES section using this exact format:

Commit message: <descriptive commit message>
Branch: <branch name, optional - defaults to main/default branch>
FILE: path/to/file.ext
\`\`\`language
<COMPLETE file contents - NO placeholders or ellipses>
\`\`\`

FILE: another/file.ext
\`\`\`language
<COMPLETE file contents>
\`\`\`

**CRITICAL RULES:**
- For repo changes: ALWAYS send a PLAN first and wait for explicit confirmation before generating FILE CHANGES.
- Only include FILE CHANGES after the user explicitly confirms they want you to proceed.
- The FILE CHANGES section must be plain text (no bullet points, numbering, or extra indentation)
- ALWAYS provide COMPLETE file contents - never use "...", "// rest of code", or similar placeholders
- Use full file contents (not diffs/patches) and keep file paths repo-relative
- If a file is too long, break the functionality into smaller files
- Match the existing code style and formatting of the project
- Test-worthy code: write as if it will be immediately deployed to production
- Include necessary imports, exports, and all function/component implementations

When the user selects a repository, you'll receive:
- Repository structure (file tree)
- Key files and their contents
Use this context to ensure your changes integrate seamlessly with the existing codebase.`;

const MODE_PROMPTS = {
  plan: `\n\n## MODE: PLAN\nYou are in PLAN mode. Respond with a structured "Plan of Record" that includes:\n- Goals\n- Approach\n- Step-by-step tasks\n- Files to touch\n- Risks/unknowns\n- Validation checklist\nFinish by asking for confirmation before generating code or FILE CHANGES.`,
  build: `\n\n## MODE: BUILD\nYou are in BUILD mode. Provide a concise execution plan (3-6 bullets) and then implement. If the user requests code changes, you may include FILE CHANGES immediately after the plan (no extra confirmation required). Keep the plan tight and focus on production-ready output.`,
} as const;

// Model configurations
const MODEL_CONFIG: Record<
  string,
  {
    provider:
      | "claude"
      | "openai"
      | "openrouter"
      | "ollama"
      | "groq"
      | "gemini"
      | "opencodezen"
      | "fireworks"
      | "mistral"
      | "zai";
    apiModel: string;
  }
> = {
  // Claude models
  "claude-opus-4-20250514": { provider: "claude", apiModel: "claude-opus-4-20250514" },
  "claude-sonnet-4-20250514": {
    provider: "claude",
    apiModel: "claude-sonnet-4-20250514",
  },
  "claude-sonnet-4.5": { provider: "claude", apiModel: "claude-sonnet-4.5" },
  "claude-3.5-sonnet-20241022": {
    provider: "claude",
    apiModel: "claude-3-5-sonnet-20241022",
  },
  "claude-3.5-haiku-20240307": {
    provider: "claude",
    apiModel: "claude-3-5-haiku-20240307",
  },

  // OpenAI models
  "gpt-5.1": { provider: "openai", apiModel: "gpt-5.1" },
  "gpt-5.2": { provider: "openai", apiModel: "gpt-5.2" },
  "gpt-4o": { provider: "openai", apiModel: "gpt-4o" },
  "gpt-4o-mini": { provider: "openai", apiModel: "gpt-4o-mini" },
  "gpt-4-turbo": { provider: "openai", apiModel: "gpt-4-turbo" },
  o1: { provider: "openai", apiModel: "o1" },
  "o1-mini": { provider: "openai", apiModel: "o1-mini" },

  // Google Gemini models (via Google API)
  "gemini-2.0-flash-exp": {
    provider: "gemini",
    apiModel: "gemini-2.0-flash-exp",
  },
  "gemini-1.5-pro": { provider: "gemini", apiModel: "gemini-1.5-pro" },
  "gemini-pro": { provider: "gemini", apiModel: "gemini-pro" },
  "gemini-pro-vision": { provider: "gemini", apiModel: "gemini-pro-vision" },

  // Mistral
  "mistral-large-latest": { provider: "mistral", apiModel: "mistral-large-latest" },
  "mistral-medium-latest": { provider: "mistral", apiModel: "mistral-medium-latest" },

  // Fireworks
  "accounts/fireworks/models/llama-v3p3-70b-instruct": {
    provider: "fireworks",
    apiModel: "accounts/fireworks/models/llama-v3p3-70b-instruct",
  },
  "accounts/fireworks/models/llama-v3p1-70b-instruct": {
    provider: "fireworks",
    apiModel: "accounts/fireworks/models/llama-v3p1-70b-instruct",
  },
  "accounts/fireworks/models/llama-v3p1-8b-instruct": {
    provider: "fireworks",
    apiModel: "accounts/fireworks/models/llama-v3p1-8b-instruct",
  },
  "accounts/fireworks/models/qwen2p5-72b-instruct": {
    provider: "fireworks",
    apiModel: "accounts/fireworks/models/qwen2p5-72b-instruct",
  },

  // Z.ai
  "glm-4.7": {
    provider: "zai",
    apiModel: "glm-4.7",
  },
  "glm-4.6v": {
    provider: "zai",
    apiModel: "glm-4.6v",
  },

  // OpenCode Zen models
  "opencode-gpt-4": { provider: "opencodezen", apiModel: "gpt-4" },
  "opencode-gpt-4-turbo": { provider: "opencodezen", apiModel: "gpt-4-turbo" },
  "opencode-gpt-3.5-turbo": { provider: "opencodezen", apiModel: "gpt-3.5-turbo" },
  "opencode-o1": { provider: "opencodezen", apiModel: "o1" },
  "opencode-o1-mini": { provider: "opencodezen", apiModel: "o1-mini" },
};

const MODEL_PROVIDERS = [
  "claude",
  "openai",
  "openrouter",
  "ollama",
  "groq",
  "gemini",
  "opencodezen",
  "fireworks",
  "mistral",
  "zai",
] as const;
type ModelProvider = (typeof MODEL_PROVIDERS)[number];

function parseUrl(value: string): URL | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed);
  } catch {
    try {
      return new URL(`http://${trimmed}`);
    } catch {
      return null;
    }
  }
}

function isPrivateIpv4(hostname: string): boolean {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const octets = match.slice(1).map((part) => Number(part));
  if (octets.some((num) => !Number.isFinite(num) || num < 0 || num > 255))
    return false;

  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function isUnreachableFromVercel(urlOrHost: string): boolean {
  const parsed = parseUrl(urlOrHost);
  const hostname = (parsed?.hostname || urlOrHost).trim().toLowerCase();
  if (!hostname) return false;
  if (hostname === "localhost") return true;
  if (hostname === "::1") return true;
  if (hostname.endsWith(".local")) return true;
  return isPrivateIpv4(hostname);
}

function isNgrokHost(urlOrHost: string): boolean {
  const parsed = parseUrl(urlOrHost);
  const hostname = (parsed?.hostname || urlOrHost).trim().toLowerCase();
  if (!hostname) return false;
  return hostname.includes("ngrok");
}

function parseModelPrefix(
  value: unknown,
): { provider: ModelProvider; model: string } | null {
  if (typeof value !== "string") return null;
  const [prefix, ...rest] = value.split(":");
  if (!MODEL_PROVIDERS.includes(prefix as ModelProvider)) return null;
  const model = rest.join(":").trim();
  if (!model) return null;
  return { provider: prefix as ModelProvider, model };
}

const OPENROUTER_FREE_FALLBACK_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/devstral-2512:free",
  "deepseek/deepseek-r1-0528:free",
  "tngtech/deepseek-r1t-chimera:free",
  "google/gemma-3-27b-it:free",
  "qwen/qwen3-coder:free",
  "xiaomi/mimo-v2-flash:free",
  "allenai/molmo-2-8b:free",
] as const;

function getErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const status = (error as any).status ?? (error as any).response?.status;
  return typeof status === "number" ? status : null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "Request failed";
}

function shouldFallbackOpenRouter(error: unknown): boolean {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error);

  if (status === 404) return true;
  if (status === 429) return true;
  if (/\b429\b/.test(message)) return true;
  if (/no endpoints found/i.test(message)) return true;
  if (/rate-?limited|too many requests/i.test(message)) return true;

  return false;
}

function formatOpenRouterError(error: unknown): string {
  const message = getErrorMessage(error);
  const status = getErrorStatus(error);

  if (
    /free model publication/i.test(message) ||
    /openrouter\.ai\/settings\/privacy/i.test(message)
  ) {
    return [
      "OpenRouter free models are blocked by your privacy settings.",
      "Enable “Free model publication” at https://openrouter.ai/settings/privacy and try again.",
    ].join(" ");
  }

  if (
    status === 429 ||
    /\b429\b/.test(message) ||
    /rate-?limited|too many requests/i.test(message)
  ) {
    return "OpenRouter free models are temporarily rate-limited. Try again in a minute or switch models.";
  }

  return message;
}

type ChatAttachmentPayload =
  | {
      kind: "image";
      name: string;
      mimeType: string;
      dataUrl: string;
    }
  | {
      kind: "text";
      name: string;
      mimeType: string;
      content: string;
      truncated: boolean;
    }
  | {
      kind: "binary";
      name: string;
      mimeType: string;
      size: number;
    };

type NormalizedAttachment =
  | {
      kind: "image";
      name: string;
      mimeType: string;
      dataUrl: string;
      base64: string;
    }
  | {
      kind: "text";
      name: string;
      mimeType: string;
      content: string;
      truncated: boolean;
    }
  | {
      kind: "binary";
      name: string;
      mimeType: string;
      size: number;
    };

const MAX_ATTACHMENTS = 5;
const MAX_TEXT_CHARS = 60000;
const MAX_IMAGE_DATA_URL_CHARS = 5_000_000;

function resolveAppUrl(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured && configured.trim()) return configured.trim();

  if (process.env.VERCEL_URL) {
    const url = process.env.VERCEL_URL.trim();
    if (url) return url.startsWith("http") ? url : `https://${url}`;
  }

  const origin = request.headers.get("origin");
  if (origin) return origin;

  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) return `${proto}://${host}`;

  return "http://localhost:1998";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeAttachments(value: unknown): NormalizedAttachment[] {
  if (!Array.isArray(value)) return [];

  const normalized: NormalizedAttachment[] = [];
  for (const raw of value.slice(0, MAX_ATTACHMENTS)) {
    if (!isPlainObject(raw)) continue;

    const kind = raw.kind;
    const name =
      typeof raw.name === "string" && raw.name.trim()
        ? raw.name.trim().slice(0, 200)
        : "attachment";
    const mimeType =
      typeof raw.mimeType === "string" && raw.mimeType.trim()
        ? raw.mimeType.trim().slice(0, 200)
        : "application/octet-stream";

    if (kind === "image") {
      const dataUrl = typeof raw.dataUrl === "string" ? raw.dataUrl : "";
      if (!dataUrl || dataUrl.length > MAX_IMAGE_DATA_URL_CHARS) continue;
      const match = dataUrl.match(/^data:([^;]+);base64,([a-z0-9+/=]+)$/i);
      if (!match) continue;
      const dataMimeType = match[1]?.trim() || mimeType;
      const base64 = match[2] || "";
      if (!dataMimeType.startsWith("image/")) continue;
      if (!base64) continue;

      normalized.push({
        kind: "image",
        name,
        mimeType: dataMimeType,
        dataUrl,
        base64,
      });
      continue;
    }

    if (kind === "text") {
      const contentRaw = typeof raw.content === "string" ? raw.content : "";
      const content =
        contentRaw.length > MAX_TEXT_CHARS
          ? contentRaw.slice(0, MAX_TEXT_CHARS)
          : contentRaw;
      const truncated =
        Boolean(raw.truncated) || contentRaw.length > MAX_TEXT_CHARS;
      normalized.push({
        kind: "text",
        name,
        mimeType,
        content,
        truncated,
      });
      continue;
    }

    if (kind === "binary") {
      const size =
        typeof raw.size === "number" && Number.isFinite(raw.size)
          ? Math.max(0, raw.size)
          : 0;
      normalized.push({ kind: "binary", name, mimeType, size });
      continue;
    }
  }

  return normalized;
}

function findLastUserMessageIndex(messages: Array<{ role: string }>) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") return i;
  }
  return -1;
}

function formatTextAttachment(
  attachment: Extract<NormalizedAttachment, { kind: "text" }>,
) {
  const header = `Attached file: ${attachment.name} (${attachment.mimeType})${attachment.truncated ? " [truncated]" : ""}`;
  return `${header}\n\n\`\`\`\n${attachment.content}\n\`\`\``;
}

function formatBinaryAttachment(
  attachment: Extract<NormalizedAttachment, { kind: "binary" }>,
) {
  return `Attached file: ${attachment.name} (${attachment.mimeType}, ${attachment.size} bytes). Binary content not included.`;
}

function buildOpenAICompatibleMessages(
  contextPrompt: string,
  messages: Array<{ role: string; content: string }>,
  attachments: NormalizedAttachment[],
) {
  const out: any[] = [
    { role: "system", content: contextPrompt },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  if (attachments.length === 0) return out;

  const userIndex = findLastUserMessageIndex(out);
  if (userIndex === -1) return out;

  const target = out[userIndex];
  const originalText = typeof target.content === "string" ? target.content : "";

  const parts: any[] = [];
  if (originalText) {
    parts.push({ type: "text", text: originalText });
  }

  for (const attachment of attachments) {
    if (attachment.kind === "image") {
      parts.push({ type: "text", text: `Image: ${attachment.name}` });
      parts.push({ type: "image_url", image_url: { url: attachment.dataUrl } });
    } else if (attachment.kind === "text") {
      parts.push({ type: "text", text: formatTextAttachment(attachment) });
    } else {
      parts.push({ type: "text", text: formatBinaryAttachment(attachment) });
    }
  }

  out[userIndex] = {
    ...target,
    content:
      parts.length > 0 ? parts : [{ type: "text", text: originalText || "" }],
  };
  return out;
}

function buildAnthropicMessages(
  messages: Array<{ role: string; content: string }>,
  attachments: NormalizedAttachment[],
) {
  const out: any[] = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  if (attachments.length === 0) return out;

  const userIndex = findLastUserMessageIndex(out);
  if (userIndex === -1) return out;

  const target = out[userIndex];
  const originalText = typeof target.content === "string" ? target.content : "";

  const blocks: any[] = [];
  if (originalText) {
    blocks.push({ type: "text", text: originalText });
  } else {
    blocks.push({ type: "text", text: "User sent attachments:" });
  }

  for (const attachment of attachments) {
    if (attachment.kind === "image") {
      blocks.push({ type: "text", text: `Image: ${attachment.name}` });
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: attachment.mimeType,
          data: attachment.base64,
        },
      });
    } else if (attachment.kind === "text") {
      blocks.push({ type: "text", text: formatTextAttachment(attachment) });
    } else {
      blocks.push({ type: "text", text: formatBinaryAttachment(attachment) });
    }
  }

  out[userIndex] = { ...target, content: blocks };
  return out;
}

function buildOllamaMessages(
  contextPrompt: string,
  messages: Array<{ role: string; content: string }>,
  attachments: NormalizedAttachment[],
) {
  const out: any[] = [
    { role: "system", content: contextPrompt },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
  ];

  if (attachments.length === 0) return out;

  const userIndex = findLastUserMessageIndex(out);
  if (userIndex === -1) return out;

  const target = out[userIndex];
  const originalText = typeof target.content === "string" ? target.content : "";

  let nextContent = originalText;
  const images: string[] = [];

  for (const attachment of attachments) {
    if (attachment.kind === "image") {
      images.push(attachment.base64);
      nextContent += `\n\n[Image: ${attachment.name}]`;
    } else if (attachment.kind === "text") {
      nextContent += `\n\n${formatTextAttachment(attachment)}`;
    } else {
      nextContent += `\n\n${formatBinaryAttachment(attachment)}`;
    }
  }

  out[userIndex] = {
    ...target,
    content: nextContent || "User sent attachments.",
    ...(images.length > 0 ? { images } : {}),
  };

  return out;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      messages,
      model,
      provider: requestedProvider,
      repoContext,
      attachments,
      mode,
      systemPrompt: customSystemPrompt,
      deploymentConfig,
    } = body;

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parsedModel = parseModelPrefix(model);
    const normalizedProvider = MODEL_PROVIDERS.includes(
      requestedProvider as ModelProvider,
    )
      ? (requestedProvider as ModelProvider)
      : null;
    const dynamicConfig = parsedModel
      ? { provider: parsedModel.provider, apiModel: parsedModel.model }
      : normalizedProvider && typeof model === "string"
        ? { provider: normalizedProvider, apiModel: model }
        : null;
    const modelConfig =
      MODEL_CONFIG[model] || dynamicConfig || MODEL_CONFIG["claude-sonnet-4"];
    const provider = modelConfig.provider;
    const apiModel = modelConfig.apiModel;

    // Debug logging
    console.log("[Chat API] Model routing:", {
      receivedModel: model,
      receivedProvider: requestedProvider,
      parsedModel,
      dynamicConfig,
      finalProvider: provider,
      finalApiModel: apiModel,
    });

    const openrouterApiKey = getApiKeyFromRequest(request, 'openrouter') ||
      process.env.OPENROUTER_API_KEY ||
      process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
    const groqApiKey = getApiKeyFromRequest(request, 'groq') ||
      process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;
    const fireworksApiKey = getApiKeyFromRequest(request, 'fireworks') ||
      process.env.FIREWORKS_API_KEY || process.env.FIREWORKS_IMAGE_API_KEY;
    const fireworksBaseUrl =
      process.env.FIREWORKS_CHAT_BASE_URL?.trim() ||
      process.env.FIREWORKS_BASE_URL?.trim() ||
      "https://api.fireworks.ai/inference/v1";
    const appUrl = resolveAppUrl(request);

    const rawProviderKey = {
      claude: getApiKeyFromRequest(request, 'claude') || getApiKeyFromRequest(request, 'anthropic') || process.env.CLAUDE_API_KEY,
      openai: getApiKeyFromRequest(request, 'openai') || process.env.OPENAI_API_KEY,
      gemini: getApiKeyFromRequest(request, 'gemini') || process.env.GEMINI_API_KEY,
      openrouter: openrouterApiKey,
      ollama: getApiKeyFromRequest(request, 'ollama') || process.env.OLLAMA_API_KEY,
      groq: groqApiKey,
      opencodezen: getApiKeyFromRequest(request, 'opencodezen') || process.env.OPENCODE_API_KEY,
      fireworks: fireworksApiKey,
      mistral: getApiKeyFromRequest(request, 'mistral') || process.env.MISTRAL_API_KEY,
      zai: getApiKeyFromRequest(request, 'zai'),
    }[provider];
    const providerKey =
      typeof rawProviderKey === "string" ? rawProviderKey.trim() : rawProviderKey;

    if (!providerKey && provider !== "ollama" && provider !== "zai") {
      const envHint =
        provider === "openrouter"
          ? "Set OPENROUTER_API_KEY (or NEXT_PUBLIC_OPENROUTER_API_KEY)."
          : provider === "groq"
            ? "Set GROQ_API_KEY (recommended) or NEXT_PUBLIC_GROQ_API_KEY."
            : provider === "gemini"
              ? "Set GEMINI_API_KEY in Settings or environment variables."
              : provider === "opencodezen"
                ? "Set OPENCODE_API_KEY."
                : provider === "fireworks"
                  ? "Set FIREWORKS_API_KEY."
                  : provider === "mistral"
                    ? "Set MISTRAL_API_KEY."
                    : "";
      return new Response(
        JSON.stringify({
          error: `${provider.toUpperCase()} API key is not configured${envHint ? ` ${envHint}` : ""}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Build context-aware system prompt
    let contextPrompt = SYSTEM_PROMPT;

    // Prepend custom system prompt if provided
    if (customSystemPrompt && typeof customSystemPrompt === 'string' && customSystemPrompt.trim()) {
      contextPrompt = `${customSystemPrompt.trim()}\n\n${contextPrompt}`;
    }

    const resolvedMode =
      mode === "plan" || mode === "build" ? (mode as keyof typeof MODE_PROMPTS) : null;

    // Add deployment configuration context
    if (deploymentConfig) {
      const configuredPlatforms: string[] = [];
      if (deploymentConfig.vercel?.configured) configuredPlatforms.push("Vercel");
      if (deploymentConfig.render?.configured) configuredPlatforms.push("Render");

      if (configuredPlatforms.length > 0) {
        contextPrompt += `\n\n## Available Deployment Platforms\n`;
        contextPrompt += `The following deployment platforms are configured: ${configuredPlatforms.join(", ")}.\n`;
        if (configuredPlatforms.length === 1) {
          contextPrompt += `When deployment is requested, use ${configuredPlatforms[0]} by default.\n`;
        } else {
          contextPrompt += `When deployment is requested, recommend the most suitable platform based on the project type, or ask the user if they have a preference.\n`;
        }
      }
    }

    if (repoContext) {
      contextPrompt += `\n\n## Current Repository Context\n`;
      contextPrompt += `Repository: ${repoContext.repoFullName}\n\n`;

      if (repoContext.structure) {
        contextPrompt += `### Repository Structure:\n\`\`\`\n${repoContext.structure}\n\`\`\`\n\n`;
      }

      if (repoContext.files && repoContext.files.length > 0) {
        contextPrompt += `### Key Files:\n`;
        for (const file of repoContext.files.slice(0, 10)) {
          contextPrompt += `\n#### ${file.path}\n\`\`\`\n${file.content.slice(0, 3000)}\n\`\`\`\n`;
        }
      }
    }

    if (resolvedMode) {
      contextPrompt += MODE_PROMPTS[resolvedMode];
    }

    const normalizedAttachments = normalizeAttachments(
      attachments as ChatAttachmentPayload[] | undefined,
    );

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (provider === "openrouter") {
            // OpenRouter API (OpenAI-compatible)
            const openrouter = new OpenAI({
              apiKey: openrouterApiKey,
              baseURL: "https://openrouter.ai/api/v1",
              defaultHeaders: {
                "HTTP-Referer": appUrl,
                "X-Title": "OS Athena",
              },
            });

            const openAIStyleMessages = buildOpenAICompatibleMessages(
              contextPrompt,
              messages,
              normalizedAttachments,
            );
            const modelsToTry = apiModel.endsWith(":free")
              ? Array.from(
                  new Set<string>([
                    apiModel,
                    ...OPENROUTER_FREE_FALLBACK_MODELS,
                  ]),
                )
              : [apiModel];

            let lastError: unknown = null;
            let streamedAnyContent = false;

            for (let attempt = 0; attempt < modelsToTry.length; attempt += 1) {
              const candidateModel = modelsToTry[attempt]!;

              try {
                const response = await openrouter.chat.completions.create({
                  model: candidateModel,
                  messages: openAIStyleMessages,
                  stream: true,
                });

                for await (const chunk of response) {
                  const content = chunk.choices[0]?.delta?.content;
                  if (content) {
                    streamedAnyContent = true;
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ type: "text", content })}\n\n`,
                      ),
                    );
                  }
                }

                lastError = null;
                break;
              } catch (error) {
                lastError = error;
                if (
                  !streamedAnyContent &&
                  attempt < modelsToTry.length - 1 &&
                  shouldFallbackOpenRouter(error)
                ) {
                  continue;
                }
              }
            }

            if (lastError) {
              throw new Error(formatOpenRouterError(lastError));
            }
          } else if (provider === "openai") {
            const openai = new OpenAI({
              apiKey: typeof providerKey === 'string' && providerKey.trim()
                ? providerKey.trim()
                : getApiKeyFromRequest(request, 'openai') || process.env.OPENAI_API_KEY,
            });

            const response = await openai.chat.completions.create({
              model: apiModel,
              messages: buildOpenAICompatibleMessages(
                contextPrompt,
                messages,
                normalizedAttachments,
              ),
              stream: true,
            });

            for await (const chunk of response) {
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "text", content })}\n\n`,
                  ),
                );
              }
            }
          } else if (provider === "fireworks") {
            const fireworks = new OpenAI({
              apiKey: (typeof providerKey === 'string' ? providerKey : undefined) as string | undefined,
              baseURL: fireworksBaseUrl,
            });

            const response = await fireworks.chat.completions.create({
              model: apiModel,
              messages: buildOpenAICompatibleMessages(
                contextPrompt,
                messages,
                normalizedAttachments,
              ),
              stream: true,
            });

            for await (const chunk of response) {
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "text", content })}\n\n`,
                  ),
                );
              }
            }
          } else if (provider === "groq") {
            const openAIStyleMessages = buildOpenAICompatibleMessages(
              contextPrompt,
              messages,
              normalizedAttachments.filter((a) => a.kind !== "image"),
            );

            const response = await fetch(
              "https://api.groq.com/openai/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${providerKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: apiModel,
                  messages: openAIStyleMessages,
                  stream: true,
                }),
              },
            );

            if (!response.ok || !response.body) {
              const text = await response.text().catch(() => "");
              throw new Error(
                text || `Groq request failed (HTTP ${response.status})`,
              );
            }

            const parseIntHeader = (name: string) => {
              const raw = response.headers.get(name);
              if (!raw) return null;
              const value = Number(raw);
              return Number.isFinite(value) ? value : null;
            };

            const parseResetSeconds = (raw: string | null) => {
              if (!raw) return null;
              const trimmed = raw.trim();
              if (!trimmed) return null;
              if (/^\d+(\.\d+)?$/.test(trimmed)) {
                const seconds = Number(trimmed);
                return Number.isFinite(seconds) ? seconds : null;
              }
              // Formats like "1m0s", "6s", "2h3m"
              const regex = /(\d+(?:\.\d+)?)(ms|s|m|h|d)/g;
              let match: RegExpExecArray | null;
              let totalSeconds = 0;
              while ((match = regex.exec(trimmed))) {
                const amount = Number(match[1]);
                const unit = match[2];
                if (!Number.isFinite(amount)) continue;
                if (unit === "ms") totalSeconds += amount / 1000;
                else if (unit === "s") totalSeconds += amount;
                else if (unit === "m") totalSeconds += amount * 60;
                else if (unit === "h") totalSeconds += amount * 3600;
                else if (unit === "d") totalSeconds += amount * 86400;
              }
              return totalSeconds > 0 ? totalSeconds : null;
            };

            const now = Date.now();
            const rateLimit = {
              requests: {
                limit: parseIntHeader("x-ratelimit-limit-requests"),
                remaining: parseIntHeader("x-ratelimit-remaining-requests"),
                resetAt: (() => {
                  const seconds = parseResetSeconds(
                    response.headers.get("x-ratelimit-reset-requests"),
                  );
                  return seconds != null ? now + seconds * 1000 : null;
                })(),
              },
              tokens: {
                limit: parseIntHeader("x-ratelimit-limit-tokens"),
                remaining: parseIntHeader("x-ratelimit-remaining-tokens"),
                resetAt: (() => {
                  const seconds = parseResetSeconds(
                    response.headers.get("x-ratelimit-reset-tokens"),
                  );
                  return seconds != null ? now + seconds * 1000 : null;
                })(),
              },
              updatedAt: now,
              source: "groq:headers",
            };

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "rate_limit", provider: "groq", rateLimit })}\n\n`,
              ),
            );

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });

              while (true) {
                const eventEnd = buffer.indexOf("\n\n");
                if (eventEnd === -1) break;

                const eventBlock = buffer.slice(0, eventEnd);
                buffer = buffer.slice(eventEnd + 2);

                const lines = eventBlock.split("\n");
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith("data:")) continue;
                  const payload = trimmed.slice(5).trimStart();
                  if (!payload) continue;
                  if (payload === "[DONE]") continue;

                  let data: any;
                  try {
                    data = JSON.parse(payload);
                  } catch {
                    continue;
                  }

                  const content = data?.choices?.[0]?.delta?.content;
                  if (typeof content === "string" && content) {
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ type: "text", content })}\n\n`,
                      ),
                    );
                  }
                }
              }
            }
          } else if (provider === "ollama") {
            const baseUrl =
              process.env.OLLAMA_BASE_URL ||
              process.env.NEXT_PUBLIC_OLLAMA_BASE_URL ||
              (!getRuntimeEnv().onCloud ? "http://localhost:11434" : "");
            const { onCloud } = getRuntimeEnv();
            if (!baseUrl) {
              throw new Error(
                "Ollama is not configured. Set OLLAMA_BASE_URL to your public tunnel (ngrok/Cloudflare) or a reachable endpoint.",
              );
            }
            const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, "");
            if (onCloud && isUnreachableFromVercel(normalizedBaseUrl)) {
              throw new Error(
                "Set OLLAMA_BASE_URL to your public tunnel (ngrok/Cloudflare); localhost/private network is unreachable from a cloud deployment.",
              );
            }
            const cfAccessClientId = process.env.OLLAMA_CF_ACCESS_CLIENT_ID;
            const cfAccessClientSecret =
              process.env.OLLAMA_CF_ACCESS_CLIENT_SECRET;
            const response = await fetch(`${normalizedBaseUrl}/api/chat`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(providerKey
                  ? { Authorization: `Bearer ${providerKey}` }
                  : {}),
                ...(cfAccessClientId && cfAccessClientSecret
                  ? {
                      "CF-Access-Client-Id": cfAccessClientId,
                      "CF-Access-Client-Secret": cfAccessClientSecret,
                    }
                  : {}),
                ...(isNgrokHost(normalizedBaseUrl)
                  ? { "ngrok-skip-browser-warning": "true" }
                  : {}),
              },
              body: JSON.stringify({
                model: apiModel,
                messages: buildOllamaMessages(
                  contextPrompt,
                  messages,
                  normalizedAttachments,
                ),
                stream: true,
              }),
            });

            if (!response.ok || !response.body) {
              const errorText = await response.text();
              throw new Error(errorText || "Ollama request failed");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                try {
                  const data = JSON.parse(trimmed);
                  if (data.error) {
                    throw new Error(data.error);
                  }
                  const content = data.message?.content;
                  if (content) {
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ type: "text", content })}\n\n`,
                      ),
                    );
                  }
                } catch (parseError) {
                  if (parseError instanceof Error) {
                    throw parseError;
                  }
                }
              }
            }
          } else if (provider === "opencodezen") {
            const openAIStyleMessages = buildOpenAICompatibleMessages(
              contextPrompt,
              messages,
              normalizedAttachments,
            );

            const response = await fetch(
              "https://opencode.ai/zen/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${providerKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: apiModel,
                  messages: openAIStyleMessages,
                  stream: true,
                }),
              },
            );

            if (!response.ok || !response.body) {
              const text = await response.text().catch(() => "");
              throw new Error(
                text || `OpenCode Zen request failed (HTTP ${response.status})`,
              );
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === "data: [DONE]") continue;
                if (trimmed.startsWith("data: ")) {
                  try {
                    const json = JSON.parse(trimmed.slice(6));
                    const content = json.choices?.[0]?.delta?.content;
                    if (content) {
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({ type: "text", content })}\n\n`,
                        ),
                      );
                    }
                  } catch {
                    // Skip malformed chunks
                  }
                }
              }
            }
          } else if (provider === "gemini") {
            const googleApiKey = process.env.GEMINI_API_KEY;
            if (!googleApiKey) {
              throw new Error("GEMINI_API_KEY is not configured");
            }

            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:streamGenerateContent?key=${googleApiKey}`;

            const geminiMessages = [
              { role: "user", parts: [{ text: contextPrompt }] },
              ...messages.map((m: { role: string; content: string }) => ({
                role: m.role === "user" ? "user" : "model",
                parts: [{ text: m.content }],
              })),
            ];

            const response = await fetch(geminiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: geminiMessages }),
            });

            if (!response.ok || !response.body) {
              const errorText = await response.text();
              throw new Error(errorText || "Gemini request failed");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });

              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                if (trimmed === "])") continue;

                try {
                  const data = JSON.parse(trimmed);
                  if (data.error) {
                    throw new Error(data.error.message || "Gemini error");
                  }
                  const candidates = data.candidates || [];
                  for (const candidate of candidates) {
                    const content = candidate.content?.parts?.[0]?.text;
                    if (content) {
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({ type: "text", content })}\n\n`,
                        ),
                      );
                    }
                  }
                } catch (parseError) {
                  // Ignore parsing errors for incomplete chunks
                }
              }
            }
          } else if (provider === "mistral") {
            const mistralApiKey = providerKey;
            if (!mistralApiKey) {
              throw new Error("MISTRAL_API_KEY is not configured");
            }

            const mistralUrl = "https://api.mistral.ai/v1/chat/completions";
            const mistralMessages = [
              { role: "system", content: contextPrompt },
              ...messages,
            ];

            const response = await fetch(mistralUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${mistralApiKey}`,
              },
              body: JSON.stringify({
                model: apiModel,
                messages: mistralMessages,
                stream: true,
              }),
            });

            if (!response.ok || !response.body) {
              const errorText = await response.text();
              throw new Error(errorText || "Mistral request failed");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n").filter((line) => line.trim());

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6);
                  if (data === "[DONE]") continue;

                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({ type: "text", content })}\n\n`,
                        ),
                      );
                    }
                  } catch (e) {
                    // Ignore parse errors
                  }
                }
              }
            }
          } else if (provider === "zai") {
            const zaiApiKey = providerKey;
            if (!zaiApiKey) {
              // Return a helpful error message
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "error",
                    error: "Z.ai API key is required to use GLM models. Please subscribe to GLM Coding Plan at https://z.ai/subscribe and add your API key in Settings to continue.",
                  })}\n\n`
                )
              );
              controller.close();
              return;
            }

            // Use Z.ai GLM Coding Plan endpoint (OpenAI-compatible)
            // Note: GLM Coding Plan uses a different endpoint than standard API
            const zai = new OpenAI({
              apiKey: zaiApiKey,
              baseURL: "https://api.z.ai/api/coding/paas/v4",
            });

            const response = await zai.chat.completions.create({
              model: apiModel,
              messages: buildOpenAICompatibleMessages(
                contextPrompt,
                messages,
                normalizedAttachments,
              ),
              stream: true,
            });

            try {
              for await (const chunk of response) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: "text", content })}\n\n`,
                    ),
                  );
                }
              }
            } catch (streamError) {
              // Log the actual error for debugging
              console.error("[Z.ai Streaming Error]:", {
                error: streamError,
                message: streamError instanceof Error ? streamError.message : String(streamError),
                stack: streamError instanceof Error ? streamError.stack : undefined,
                model: apiModel,
                baseURL: "https://open.bigmodel.cn/api/paas/v4"
              });

              // Send detailed error to client
              const errorMessage = streamError instanceof Error
                ? streamError.message
                : "Unknown streaming error";

              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: "error",
                error: `Z.ai streaming failed: ${errorMessage}`,
                details: errorMessage,
                suggestion: "Check your API key, model availability, and account quota at https://open.bigmodel.cn/usercenter/apikeys"
              })}\n\n`));

              controller.close();
              // Error is already handled and sent to client
            }
          } else {
            // Claude (Anthropic)
            const anthropic = new Anthropic({
              apiKey: typeof providerKey === 'string' && providerKey.trim()
                ? providerKey.trim()
                : getApiKeyFromRequest(request, 'claude') || getApiKeyFromRequest(request, 'anthropic') || process.env.CLAUDE_API_KEY,
            });

            const response = await anthropic.messages.stream({
              model: apiModel,
              max_tokens: 8192,
              system: contextPrompt,
              messages: buildAnthropicMessages(messages, normalizedAttachments),
            });

            for await (const event of response) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "text", content: event.delta.text })}\n\n`,
                  ),
                );
              }
            }
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`),
          );
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error: error instanceof Error ? error.message : "Stream failed",
              })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Chat failed",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
