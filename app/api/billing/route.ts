import { NextResponse } from "next/server";
import { getRuntimeEnv } from "@/lib/runtime";

export const dynamic = "force-dynamic";

type ProviderBilling = {
  configured: boolean;
  currency: string;
  remainingUsd: number | null;
  limitUsd: number | null;
  usedUsd: number | null;
  refreshedAt: number;
  error: string | null;
};

async function fetchOpenAIBilling(apiKey: string): Promise<ProviderBilling> {
  const refreshedAt = Date.now();
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  try {
    const usageRes = await fetch(
      `https://api.openai.com/dashboard/billing/usage?start_date=${new Date().toISOString().slice(0, 10)}&end_date=${new Date().toISOString().slice(0, 10)}`,
      { headers }
    );
    const subRes = await fetch("https://api.openai.com/dashboard/billing/subscription", { headers });

    if (!usageRes.ok || !subRes.ok) throw new Error("Failed to fetch OpenAI billing");

    const usage = await usageRes.json();
    const sub = await subRes.json();

    return {
      configured: true,
      currency: "USD",
      remainingUsd: sub.hard_limit_usd - (usage.total_usage / 100),
      limitUsd: sub.hard_limit_usd,
      usedUsd: usage.total_usage / 100,
      refreshedAt,
      error: null,
    };
  } catch (err: any) {
    return { configured: true, currency: "USD", remainingUsd: null, limitUsd: null, usedUsd: null, refreshedAt, error: err.message };
  }
}

async function fetchOpenRouterBilling(apiKey: string): Promise<ProviderBilling> {
  const refreshedAt = Date.now();
  try {
    const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error("Failed to fetch OpenRouter credits");
    const data = await res.json();
    return {
      configured: true,
      currency: "USD",
      remainingUsd: data.data.usage,
      limitUsd: data.data.limit,
      usedUsd: data.data.usage,
      refreshedAt,
      error: null,
    };
  } catch (err: any) {
    return { configured: true, currency: "USD", remainingUsd: null, limitUsd: null, usedUsd: null, refreshedAt, error: err.message };
  }
}

export async function GET() {
  const env = getRuntimeEnv();
  const results: Record<string, ProviderBilling> = {};

  if (process.env.OPENAI_API_KEY) {
    results.openai = await fetchOpenAIBilling(process.env.OPENAI_API_KEY);
  } else {
    results.openai = { configured: false, currency: "USD", remainingUsd: null, limitUsd: null, usedUsd: null, refreshedAt: Date.now(), error: null };
  }

  if (process.env.OPENROUTER_API_KEY) {
    results.openrouter = await fetchOpenRouterBilling(process.env.OPENROUTER_API_KEY);
  } else {
    results.openrouter = { configured: false, currency: "USD", remainingUsd: null, limitUsd: null, usedUsd: null, refreshedAt: Date.now(), error: null };
  }

  return NextResponse.json(results);
}