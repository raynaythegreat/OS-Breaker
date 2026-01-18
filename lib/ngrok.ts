import { spawn } from "node:child_process";
import { createSubprocessEnv, resolveCommand } from "@/lib/command";

type NgrokTunnel = {
  public_url?: unknown;
  proto?: unknown;
  config?: { addr?: unknown } | null;
};

function extractTunnelUrl(tunnels: NgrokTunnel[], port: number): string | null {
  const candidates = tunnels
    .filter(
      (tunnel) =>
        typeof tunnel.public_url === "string" &&
        tunnel.public_url.startsWith("http"),
    )
    .filter((tunnel) =>
      typeof tunnel.proto === "string" ? tunnel.proto === "https" : true,
    );

  const portString = String(port);
  const matchesPort = (tunnel: NgrokTunnel) => {
    const addr = tunnel.config?.addr;
    if (typeof addr !== "string") return false;
    if (addr.trim() === portString) return true;
    return addr.includes(`:${portString}`) || addr.includes(`/${portString}`);
  };

  const best = candidates.find(matchesPort) || candidates[0];
  return best && typeof best.public_url === "string" ? best.public_url : null;
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timeout);
  }
}

export async function getNgrokPublicUrl(
  port: number,
  timeoutMs = 1000,
): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(
      "http://127.0.0.1:4040/api/tunnels",
      timeoutMs,
    );
    if (!response.ok) return null;
    const data = (await response.json().catch(() => null)) as {
      tunnels?: unknown;
    } | null;
    const tunnels = Array.isArray(data?.tunnels)
      ? (data?.tunnels as NgrokTunnel[])
      : [];
    return extractTunnelUrl(tunnels, port);
  } catch {
    return null;
  }
}

export async function ensureNgrokTunnel(port: number): Promise<{
  publicUrl: string | null;
  started: boolean;
  error?: string;
}> {
  const existing = await getNgrokPublicUrl(port);
  if (existing) return { publicUrl: existing, started: false };

  const ngrokPath = resolveCommand("ngrok");
  if (!ngrokPath) {
    return {
      publicUrl: null,
      started: false,
      error:
        "ngrok CLI not found. Install ngrok and ensure it is available (common paths: /usr/local/bin/ngrok or /opt/homebrew/bin/ngrok).",
    };
  }

  try {
    const child = spawn(
      ngrokPath,
      ["http", String(port), "--log=stdout", "--log-format=json"],
      {
        detached: true,
        stdio: "ignore",
        env: createSubprocessEnv(),
      },
    );
    child.unref();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start ngrok";
    return { publicUrl: null, started: false, error: message };
  }

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const url = await getNgrokPublicUrl(port);
    if (url) return { publicUrl: url, started: true };
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return {
    publicUrl: null,
    started: true,
    error:
      "ngrok started but no tunnel URL was found. Open ngrok and confirm it is exposing port 11434 (and that the local API is available on 127.0.0.1:4040).",
  };
}
