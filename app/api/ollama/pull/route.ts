import { NextResponse } from "next/server";
import { getRuntimeEnv } from "@/lib/runtime";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
  if (octets.some((num) => !Number.isFinite(num) || num < 0 || num > 255)) return false;

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

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const rawName = typeof body?.name === "string" ? body.name : "";
  const name = rawName.trim();

  if (!name) {
    return NextResponse.json({ error: "Model name is required." }, { status: 400 });
  }

  const { onCloud } = getRuntimeEnv();
  const baseUrl =
    process.env.OLLAMA_BASE_URL ||
    process.env.NEXT_PUBLIC_OLLAMA_BASE_URL ||
    (!onCloud ? "http://localhost:11434" : "");
  const apiKey = process.env.OLLAMA_API_KEY;
  const cfAccessClientId = process.env.OLLAMA_CF_ACCESS_CLIENT_ID;
  const cfAccessClientSecret = process.env.OLLAMA_CF_ACCESS_CLIENT_SECRET;

  if (!baseUrl) {
    return NextResponse.json(
      {
        error: "Ollama is not configured. Set OLLAMA_BASE_URL (or NEXT_PUBLIC_OLLAMA_BASE_URL).",
      },
      { status: 400 }
    );
  }

  const normalizedBase = baseUrl.trim().replace(/\/+$/, "");
  if (onCloud && isUnreachableFromVercel(normalizedBase)) {
    return NextResponse.json(
      {
        error:
          "Set OLLAMA_BASE_URL to your public tunnel (ngrok/Cloudflare); localhost/private network is unreachable from a cloud deployment.",
      },
      { status: 400 }
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    ...(cfAccessClientId && cfAccessClientSecret
      ? {
          "CF-Access-Client-Id": cfAccessClientId,
          "CF-Access-Client-Secret": cfAccessClientSecret,
        }
      : {}),
    ...(isNgrokHost(normalizedBase) ? { "ngrok-skip-browser-warning": "true" } : {}),
  };

  const response = await fetch(`${normalizedBase}/api/pull`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name, stream: true }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return NextResponse.json({ error: text || `Ollama pull failed (HTTP ${response.status}).` }, { status: 502 });
  }

  if (!response.body) {
    return NextResponse.json({ error: "Ollama pull started, but no response stream was available." }, { status: 502 });
  }

  return new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
