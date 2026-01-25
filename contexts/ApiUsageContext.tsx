"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

type Provider =
  | "claude"
  | "openai"
  | "groq"
  | "openrouter"
  | "ollama"
  | "gemini"
  | "opencodezen"
  | "fireworks"
  | "mistral"
  | "perplexity"
  | "zai";

interface UsageRecord {
  provider: Provider;
  model: string;
  timestamp: number;
  tokens?: {
    input?: number;
    output?: number;
  };
}

interface ProviderUsage {
  today: number;
  thisWeek: number;
  thisMonth: number;
  lastRequest?: number;
}

interface ApiUsageState {
  claude: ProviderUsage;
  openai: ProviderUsage;
  gemini: ProviderUsage;
  groq: ProviderUsage;
  openrouter: ProviderUsage;
  ollama: ProviderUsage;
  opencodezen: ProviderUsage;
  fireworks: ProviderUsage;
  mistral: ProviderUsage;
  perplexity: ProviderUsage;
  zai: ProviderUsage;
}

interface ApiLimits {
  claude: { daily: number; weekly: number; note: string };
  openai: { daily: number; weekly: number; note: string };
  gemini: { daily: number; weekly: number; note: string };
  groq: { daily: number; weekly: number; note: string };
  openrouter: { daily: number; weekly: number; note: string };
  ollama: { daily: number; weekly: number; note: string };
  opencodezen: { daily: number; weekly: number; note: string };
  fireworks: { daily: number; weekly: number; note: string };
  mistral: { daily: number; weekly: number; note: string };
  perplexity: { daily: number; weekly: number; note: string };
  zai: { daily: number; weekly: number; note: string };
}

interface ProviderBilling {
  configured: boolean;
  currency: "USD";
  remainingUsd: number | null;
  limitUsd: number | null;
  usedUsd: number | null;
  refreshedAt: number;
  source: string | null;
  error: string | null;
}

type BillingState = Record<Provider, ProviderBilling>;

interface RateLimitBucket {
  limit: number | null;
  remaining: number | null;
  resetAt: number | null;
}

interface ProviderRateLimit {
  requests: RateLimitBucket;
  tokens: RateLimitBucket;
  updatedAt: number;
  source: string | null;
}

type RateLimitsState = Record<Provider, ProviderRateLimit>;

interface ApiUsageContextValue {
  usage: ApiUsageState;
  limits: ApiLimits;
  billing: BillingState;
  rateLimits: RateLimitsState;
  recordUsage: (
    provider: Provider,
    model: string,
    tokens?: { input?: number; output?: number },
  ) => void;
  getProviderUsage: (provider: Provider) => ProviderUsage;
  updateRateLimit: (
    provider: Provider,
    next: Partial<ProviderRateLimit>,
  ) => void;
  refreshBilling: () => Promise<void>;
  resetUsage: () => void;
}

const STORAGE_KEY = "athena-api-usage";

const DEFAULT_LIMITS: ApiLimits = {
  claude: {
    daily: Infinity,
    weekly: Infinity,
    note: "Paid API - budget varies by plan",
  },
  openai: {
    daily: Infinity,
    weekly: Infinity,
    note: "Paid API - budget varies by plan",
  },
  gemini: {
    daily: Infinity,
    weekly: Infinity,
    note: "Paid API - budget varies by plan",
  },
  groq: {
    daily: Infinity,
    weekly: Infinity,
    note: "Free tier: rate limits vary by plan (tracked live when you use Groq)",
  },
  openrouter: {
    daily: Infinity,
    weekly: Infinity,
    note: "Paid/free via OpenRouter - check your credits",
  },
  ollama: {
    daily: Infinity,
    weekly: Infinity,
    note: "Local - unlimited (depends on your hardware)",
  },
  opencodezen: {
    daily: Infinity,
    weekly: Infinity,
    note: "OpenCode Zen free tier - usage varies by model",
  },
  fireworks: {
    daily: Infinity,
    weekly: Infinity,
    note: "Fireworks paid API - budget varies by plan",
  },
  mistral: {
    daily: Infinity,
    weekly: Infinity,
    note: "Paid API - budget varies by plan",
  },
  perplexity: {
    daily: Infinity,
    weekly: Infinity,
    note: "Paid API - online search models",
  },
  zai: {
    daily: Infinity,
    weekly: Infinity,
    note: "Paid API - GLM flagship models",
  },
};

const DEFAULT_USAGE: ProviderUsage = {
  today: 0,
  thisWeek: 0,
  thisMonth: 0,
  lastRequest: undefined,
};

const DEFAULT_STATE: ApiUsageState = {
  claude: { ...DEFAULT_USAGE },
  openai: { ...DEFAULT_USAGE },
  gemini: { ...DEFAULT_USAGE },
  groq: { ...DEFAULT_USAGE },
  openrouter: { ...DEFAULT_USAGE },
  ollama: { ...DEFAULT_USAGE },
  opencodezen: { ...DEFAULT_USAGE },
  fireworks: { ...DEFAULT_USAGE },
  mistral: { ...DEFAULT_USAGE },
  perplexity: { ...DEFAULT_USAGE },
  zai: { ...DEFAULT_USAGE },
};

const DEFAULT_BILLING: ProviderBilling = {
  configured: false,
  currency: "USD",
  remainingUsd: null,
  limitUsd: null,
  usedUsd: null,
  refreshedAt: 0,
  source: null,
  error: null,
};

const DEFAULT_BILLING_STATE: BillingState = {
  claude: { ...DEFAULT_BILLING },
  openai: { ...DEFAULT_BILLING },
  gemini: { ...DEFAULT_BILLING },
  groq: { ...DEFAULT_BILLING },
  openrouter: { ...DEFAULT_BILLING },
  ollama: {
    ...DEFAULT_BILLING,
    configured: true,
    remainingUsd: 0,
    source: "local",
  },
  opencodezen: { ...DEFAULT_BILLING },
  fireworks: { ...DEFAULT_BILLING },
  mistral: { ...DEFAULT_BILLING },
  perplexity: { ...DEFAULT_BILLING },
  zai: { ...DEFAULT_BILLING },
};

const DEFAULT_RATE_LIMIT_BUCKET: RateLimitBucket = {
  limit: null,
  remaining: null,
  resetAt: null,
};

const DEFAULT_PROVIDER_RATE_LIMIT: ProviderRateLimit = {
  requests: { ...DEFAULT_RATE_LIMIT_BUCKET },
  tokens: { ...DEFAULT_RATE_LIMIT_BUCKET },
  updatedAt: 0,
  source: null,
};

const DEFAULT_RATE_LIMITS_STATE: RateLimitsState = {
  claude: { ...DEFAULT_PROVIDER_RATE_LIMIT },
  openai: { ...DEFAULT_PROVIDER_RATE_LIMIT },
  gemini: { ...DEFAULT_PROVIDER_RATE_LIMIT },
  groq: { ...DEFAULT_PROVIDER_RATE_LIMIT },
  openrouter: { ...DEFAULT_PROVIDER_RATE_LIMIT },
  ollama: { ...DEFAULT_PROVIDER_RATE_LIMIT },
  opencodezen: { ...DEFAULT_PROVIDER_RATE_LIMIT },
  fireworks: { ...DEFAULT_PROVIDER_RATE_LIMIT },
  mistral: { ...DEFAULT_PROVIDER_RATE_LIMIT },
  perplexity: { ...DEFAULT_PROVIDER_RATE_LIMIT },
  zai: { ...DEFAULT_PROVIDER_RATE_LIMIT },
};

function getStartOfDay(date: Date = new Date()): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getStartOfWeek(date: Date = new Date()): number {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getStartOfMonth(date: Date = new Date()): number {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const ApiUsageContext = createContext<ApiUsageContextValue | null>(null);

export function ApiUsageProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [usage, setUsage] = useState<ApiUsageState>(DEFAULT_STATE);
  const [billing, setBilling] = useState<BillingState>(DEFAULT_BILLING_STATE);
  const [rateLimits, setRateLimits] = useState<RateLimitsState>(
    DEFAULT_RATE_LIMITS_STATE,
  );

  // Load records from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Clean old records (older than 30 days)
          const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
          const filtered = parsed.filter(
            (r: UsageRecord) => r.timestamp && r.timestamp > thirtyDaysAgo,
          );
          setRecords(filtered);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save records to localStorage whenever they change
  useEffect(() => {
    if (records.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      } catch {
        // Ignore storage errors
      }
    }
  }, [records]);

  // Calculate usage stats from records
  useEffect(() => {
    const now = Date.now();
    const startOfToday = getStartOfDay();
    const startOfWeek = getStartOfWeek();
    const startOfMonth = getStartOfMonth();

    const newUsage: ApiUsageState = {
      claude: { today: 0, thisWeek: 0, thisMonth: 0 },
      openai: { today: 0, thisWeek: 0, thisMonth: 0 },
      gemini: { today: 0, thisWeek: 0, thisMonth: 0 },
      groq: { today: 0, thisWeek: 0, thisMonth: 0 },
      openrouter: { today: 0, thisWeek: 0, thisMonth: 0 },
      ollama: { today: 0, thisWeek: 0, thisMonth: 0 },
      opencodezen: { today: 0, thisWeek: 0, thisMonth: 0 },
      fireworks: { today: 0, thisWeek: 0, thisMonth: 0 },
      mistral: { today: 0, thisWeek: 0, thisMonth: 0 },
      perplexity: { today: 0, thisWeek: 0, thisMonth: 0 },
      zai: { today: 0, thisWeek: 0, thisMonth: 0 },
    };

    for (const record of records) {
      const provider = record.provider;
      if (!newUsage[provider]) continue;

      if (record.timestamp >= startOfMonth) {
        newUsage[provider].thisMonth += 1;
      }
      if (record.timestamp >= startOfWeek) {
        newUsage[provider].thisWeek += 1;
      }
      if (record.timestamp >= startOfToday) {
        newUsage[provider].today += 1;
      }

      // Track last request time
      if (
        !newUsage[provider].lastRequest ||
        record.timestamp > newUsage[provider].lastRequest!
      ) {
        newUsage[provider].lastRequest = record.timestamp;
      }
    }

    setUsage(newUsage);
  }, [records]);

  const refreshBilling = useCallback(async () => {
    try {
      const response = await fetch("/api/billing", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (data?.billing) {
        setBilling(data.billing as BillingState);
      }
    } catch {
      // Ignore billing fetch errors (e.g., offline)
    }
  }, []);

  useEffect(() => {
    void refreshBilling();
    const interval = setInterval(() => {
      void refreshBilling();
    }, 60_000);
    return () => clearInterval(interval);
  }, [refreshBilling]);

  const recordUsage = useCallback(
    (
      provider: Provider,
      model: string,
      tokens?: { input?: number; output?: number },
    ) => {
      const record: UsageRecord = {
        provider,
        model,
        timestamp: Date.now(),
        ...(tokens ? { tokens } : {}),
      };
      setRecords((prev) => [...prev, record]);
    },
    [],
  );

  const updateRateLimit = useCallback(
    (provider: Provider, next: Partial<ProviderRateLimit>) => {
      setRateLimits((prev) => {
        const current = prev[provider] || DEFAULT_PROVIDER_RATE_LIMIT;
        return {
          ...prev,
          [provider]: {
            ...current,
            ...next,
            requests: { ...current.requests, ...(next.requests || {}) },
            tokens: { ...current.tokens, ...(next.tokens || {}) },
          },
        };
      });
    },
    [],
  );

  const getProviderUsage = useCallback(
    (provider: Provider): ProviderUsage => {
      return usage[provider] || DEFAULT_USAGE;
    },
    [usage],
  );

  const resetUsage = useCallback(() => {
    setRecords([]);
    setUsage(DEFAULT_STATE);
    setRateLimits(DEFAULT_RATE_LIMITS_STATE);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  return (
    <ApiUsageContext.Provider
      value={{
        usage,
        limits: DEFAULT_LIMITS,
        billing,
        rateLimits,
        recordUsage,
        getProviderUsage,
        updateRateLimit,
        refreshBilling,
        resetUsage,
      }}
    >
      {children}
    </ApiUsageContext.Provider>
  );
}

export function useApiUsage() {
  const context = useContext(ApiUsageContext);
  if (!context) {
    throw new Error("useApiUsage must be used within an ApiUsageProvider");
  }
  return context;
}

export type {
  Provider,
  UsageRecord,
  ProviderUsage,
  ApiUsageState,
  ApiLimits,
  ProviderBilling,
  BillingState,
  RateLimitBucket,
  ProviderRateLimit,
  RateLimitsState,
};
