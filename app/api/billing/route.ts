import { NextResponse } from "next/server";
import { getRuntimeEnv } from "@/lib/runtime";

export const dynamic = "force-dynamic";

type Provider =
  | "claude"
  | "openai"
  | "groq"
  | "openrouter"
  | "ollama"
  | "rtrvr"
  | "fireworks";

type ProviderBilling = {
  configured: boolean;
  currency: "USD";
  remainingUsd: number | null;
  limitUsd: number | null;
  usedUsd: number | null;
  refreshedAt: number;
  source: string | null;
  error: string | null;
};

type BillingState = Record<Provider, ProviderBilling>;

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function clampNonNegative(value: number | null): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value)) return null;
  return Math.max(0, value);
}

function getUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getCurrentMonthRangeUtc(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  return { startDate: getUtcDateString(start), endDate: getUtcDateString(end) };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOpenAIBilling(apiKey: string): Promise<Omit<ProviderBilling, "configured">> {
  const refreshedAt = Date.now();
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const range = getCurrentMonthRangeUtc();

  // Preferred (accurate) approach: subscription limit + month-to-date usage.
  try {
    const [subscriptionRes, usageRes] = await Promise.all([
      fetchWithTimeout("https://api.openai.com/dashboard/billing/subscription", { headers }, 8000),
      fetchWithTimeout(
        `https://api.openai.com/dashboard/billing/usage?start_date=${range.startDate}&end_date=${range.endDate}`,
        { headers },
        8000
      ),
    ]);

    if (!subscriptionRes.ok) {
      const text = await subscriptionRes.text().catch(() => "");
      throw new Error(text || `OpenAI billing subscription HTTP ${subscriptionRes.status}`);
    }
    if (!usageRes.ok) {
      const text = await usageRes.text().catch(() => "");
      throw new Error(text || `OpenAI billing usage HTTP ${usageRes.status}`);
    }

    const subscription = (await subscriptionRes.json()) as any;
    const usage = (await usageRes.json()) as any;

    const limitUsd =
      toNumber(subscription?.hard_limit_usd) ??
      toNumber(subscription?.system_hard_limit_usd) ??
      null;

    const totalUsageCents = toNumber(usage?.total_usage);
    const usedUsd = totalUsageCents != null ? totalUsageCents / 100 : null;
    const remainingUsd =
      limitUsd != null && usedUsd != null ? clampNonNegative(limitUsd - usedUsd) : null;

    return {
      currency: "USD",
      remainingUsd,
      limitUsd,
      usedUsd: usedUsd != null ? clampNonNegative(usedUsd) : null,
      refreshedAt,
      source: "openai:dashboard/billing",
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch OpenAI billing";

    // Fallback (may only work for grant-based accounts).
    try {
      const creditRes = await fetchWithTimeout(
        "https://api.openai.com/dashboard/billing/credit_grants",
        { headers },
        8000
      );
      if (!creditRes.ok) {
        const text = await creditRes.text().catch(() => "");
        throw new Error(text || `OpenAI credit grants HTTP ${creditRes.status}`);
      }
      const credits = (await creditRes.json()) as any;
      const remainingUsd = clampNonNegative(toNumber(credits?.total_available));
      const usedUsd = clampNonNegative(toNumber(credits?.total_used));
      const limitUsd = clampNonNegative(toNumber(credits?.total_granted));
      return {
        currency: "USD",
        remainingUsd,
        limitUsd,
        usedUsd,
        refreshedAt,
        source: "openai:credit_grants",
        error: null,
      };
    } catch (fallbackError) {
      const fallbackMessage =
        fallbackError instanceof Error ? fallbackError.message : "Failed to fetch OpenAI credits";
      return {
        currency: "USD",
        remainingUsd: null,
        limitUsd: null,
        usedUsd: null,
        refreshedAt,
        source: null,
        error: `${message}; ${fallbackMessage}`,
      };
    }
  }
}

async function fetchOpenRouterBilling(apiKey: string): Promise<Omit<ProviderBilling, "configured">> {
  const refreshedAt = Date.now();
  try {
    const response = await fetchWithTimeout("https://openrouter.ai/api/v1/auth/key", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    }, 8000);

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || `OpenRouter HTTP ${response.status}`);
    }

    const json = (await response.json()) as any;
    const data = json?.data ?? json;

    const credits = clampNonNegative(toNumber(data?.credits));
    const limitUsd = clampNonNegative(toNumber(data?.limit));
    const usedUsd = clampNonNegative(toNumber(data?.usage));

    let remainingUsd = credits;
    let source: string | null = credits != null ? "openrouter:credits" : null;

    if (remainingUsd == null && limitUsd != null && usedUsd != null) {
      remainingUsd = clampNonNegative(limitUsd - usedUsd);
      source = "openrouter:limit-usage";
    }

    return {
      currency: "USD",
      remainingUsd,
      limitUsd,
      usedUsd,
      refreshedAt,
      source,
      error: null,
    };
  } catch (error) {
    return {
      currency: "USD",
      remainingUsd: null,
      limitUsd: null,
      usedUsd: null,
      refreshedAt,
      source: null,
      error: error instanceof Error ? error.message : "Failed to fetch OpenRouter billing",
    };
  }
}

function makeEmptyBilling(configured: boolean): ProviderBilling {
  return {
    configured,
    currency: "USD",
    remainingUsd: null,
    limitUsd: null,
    usedUsd: null,
    refreshedAt: Date.now(),
    source: null,
    error: null,
  };
}

export async function GET() {
  const { onCloud } = getRuntimeEnv();
  const ollamaBaseUrl =
    process.env.OLLAMA_BASE_URL ||
    process.env.NEXT_PUBLIC_OLLAMA_BASE_URL ||
    (!onCloud ? "http://localhost:11434" : null);

  const openrouterApiKey = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;

  const billing: BillingState = {
    claude: {
      ...makeEmptyBilling(Boolean(process.env.CLAUDE_API_KEY)),
      error: Boolean(process.env.CLAUDE_API_KEY) ? "Claude billing data is not available via API in this app." : null,
    },
    openai: makeEmptyBilling(Boolean(process.env.OPENAI_API_KEY)),
    groq: {
      ...makeEmptyBilling(Boolean(groqApiKey)),
      error: Boolean(groqApiKey)
        ? "Groq billing is not exposed as USD; using rate limits from response headers."
        : null,
    },
    openrouter: makeEmptyBilling(Boolean(openrouterApiKey)),
    ollama: {
      ...makeEmptyBilling(Boolean(ollamaBaseUrl || process.env.OLLAMA_API_KEY)),
      currency: "USD",
      remainingUsd: 0,
      limitUsd: null,
      usedUsd: null,
      source: "local",
      error: null,
    },
    rtrvr: makeEmptyBilling(Boolean(process.env.RTRVR_API_KEY)),
    fireworks: {
      ...makeEmptyBilling(
        Boolean(
          process.env.FIREWORKS_API_KEY || process.env.FIREWORKS_IMAGE_API_KEY,
        ),
      ),
      error:
        Boolean(
          process.env.FIREWORKS_API_KEY || process.env.FIREWORKS_IMAGE_API_KEY,
        )
          ? "Fireworks billing data is not available via API in this app."
          : null,
    },
  };

  if (process.env.OPENAI_API_KEY) {
    const openai = await fetchOpenAIBilling(process.env.OPENAI_API_KEY);
    billing.openai = { configured: true, ...openai };
  }

  if (openrouterApiKey) {
    const openrouter = await fetchOpenRouterBilling(openrouterApiKey);
    billing.openrouter = { configured: true, ...openrouter };
  }

  return NextResponse.json({ billing });
}
