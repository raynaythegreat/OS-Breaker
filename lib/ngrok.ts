import { spawn } from "node:child_process";
import { createSubprocessEnv, resolveCommand } from "@/lib/command";
import { SecureStorage } from "@/lib/secureStorage";
import { NgrokService, NgrokCreateOptions, NgrokTunnel as ImportedNgrokTunnel } from "@/services/ngrok";

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

interface MobileDeploymentInfo {
  tunnelId?: string;
  publicUrl?: string;
  mobileUrl?: string;
  deploymentId?: string;
  createdAt?: string;
  activatedAt?: string;
}

function getMobileDeployment(): MobileDeploymentInfo | null {
  try {
    const stored = localStorage.getItem('mobile-deployment');
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function setMobileDeployment(info: MobileDeploymentInfo): void {
  localStorage.setItem('mobile-deployment', JSON.stringify(info));
}

export async function getMobileTunnelStatus(): Promise<{
  active: boolean;
  tunnelId?: string;
  publicUrl?: string;
  needsReactivation: boolean;
}> {
  const deployment = getMobileDeployment();
  if (!deployment || !deployment.tunnelId) {
    return { active: false, needsReactivation: false };
  }

  const apiKey = await SecureStorage.getKey('ngrok');
  if (!apiKey || !deployment.tunnelId) {
    return { active: false, needsReactivation: true, tunnelId: deployment.tunnelId };
  }

  try {
    const { NgrokService } = await import('@/services/ngrok');
    const ngrok = new NgrokService(apiKey);

    const tunnel = await ngrok.getTunnel(deployment.tunnelId);
    if (tunnel) {
      return {
        active: true,
        tunnelId: tunnel.id,
        publicUrl: tunnel.public_url,
        needsReactivation: false
      };
    }

    return { active: false, needsReactivation: true, tunnelId: deployment.tunnelId };
  } catch (error) {
    console.warn('Failed to check tunnel status:', error);
    return { active: false, needsReactivation: true, tunnelId: deployment.tunnelId };
  }
}

export async function ensureMobileTunnelActive(): Promise<{
  success: boolean;
  publicUrl?: string;
  tunnelId?: string;
  error?: string;
}> {
  const status = await getMobileTunnelStatus();

  if (status.active) {
    return {
      success: true,
      publicUrl: status.publicUrl,
      tunnelId: status.tunnelId
    };
  }

  const deployment = getMobileDeployment();
  if (!deployment?.tunnelId) {
    return {
      success: false,
      error: 'No mobile deployment configured'
    };
  }

  if (status.needsReactivation) {
    console.log('Mobile tunnel inactive, reactivating...');

    try {
      const apiKey = await SecureStorage.getKey('ngrok');
      if (!apiKey || apiKey.trim().length < 10) {
        return {
          success: false,
          error: 'Ngrok API key not configured'
        };
      }

      const { NgrokService } = await import('@/services/ngrok');
      const ngrok = new NgrokService(apiKey);

      const options: NgrokCreateOptions = {
        port: 3456,
        proto: 'http'
      };

      const tunnel = await ngrok.createTunnel(options);

      const updatedDeployment: MobileDeploymentInfo = {
        ...deployment,
        tunnelId: tunnel.id,
        publicUrl: tunnel.public_url,
        activatedAt: new Date().toISOString()
      };

      setMobileDeployment(updatedDeployment);

      console.log(`Mobile tunnel reactivated: ${tunnel.public_url}`);

      return {
        success: true,
        publicUrl: tunnel.public_url,
        tunnelId: tunnel.id
      };
    } catch (error) {
      console.error('Failed to reactivate mobile tunnel:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to reactivate tunnel';

      if (errorMessage.includes('Invalid') || errorMessage.includes('401')) {
        return {
          success: false,
          error: 'Invalid ngrok API key. Please check your ngrok API key in Settings.'
        };
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  return {
    success: false,
    error: 'Unknown tunnel state'
  };
}

export async function ensureNgrokTunnel(port: number): Promise<{
  publicUrl: string | null;
  started: boolean;
  error?: string;
}> {
  const apiKey = await SecureStorage.getKey('ngrok');
  if (apiKey) {
    try {
      const { NgrokService } = await import('@/services/ngrok');
      const ngrok = new NgrokService(apiKey);

      const tunnel = await ngrok.createTunnel({ port });
      return {
        publicUrl: tunnel.public_url,
        started: true
      };
    } catch (error) {
      console.warn('API tunnel failed, falling back to CLI:', error);
    }
  }

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
