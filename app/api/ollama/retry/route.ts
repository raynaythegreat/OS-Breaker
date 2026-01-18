import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs";
import { getRuntimeEnv } from "@/lib/runtime";
import { createSubprocessEnv, resolveCommand } from "@/lib/command";

export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);

async function runCommand(command: string, args: string[], timeoutMs = 5000) {
  const resolved = resolveCommand(command) || command;
  try {
    const result = await execFileAsync(resolved, args, {
      timeout: timeoutMs,
      env: createSubprocessEnv(),
    });
    return { ok: true as const, stdout: result.stdout?.toString?.() ?? "", stderr: result.stderr?.toString?.() ?? "" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Command failed";
    return { ok: false as const, stdout: "", stderr: message };
  }
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

function isLocalHostRequest(request: NextRequest) {
  const host = request.headers.get("host") || "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("0.0.0.0");
}

export async function POST(request: NextRequest) {
  const { onCloud } = getRuntimeEnv();
  if (onCloud) {
    return NextResponse.json(
      { ok: false, error: "This action can only run on your local Mac (not on a cloud deployment)." },
      { status: 200 }
    );
  }

  if (!isLocalHostRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "This endpoint is only available from localhost." },
      { status: 403 }
    );
  }

  if (process.platform !== "darwin") {
    return NextResponse.json(
      { ok: false, error: "This helper is only supported on macOS." },
      { status: 200 }
    );
  }

  const uid = typeof process.getuid === "function" ? process.getuid() : null;
  const homeDir = process.env.HOME || null;

  const label = "com.aiagentweeb.cloudflared-ollama";
  const plistPath = homeDir
    ? path.join(homeDir, "Library", "LaunchAgents", "com.aiagentweeb.cloudflared-ollama.plist")
    : null;

  const attempted: { ollama: boolean; cloudflared: boolean } = { ollama: false, cloudflared: false };
  const logs: string[] = [];

  if (uid != null) {
    attempted.ollama = true;
    logs.push("Starting Ollama via launchctl…");
    await runCommand("launchctl", ["kickstart", "-k", `gui/${uid}/homebrew.mxcl.ollama`]);
    await runCommand("launchctl", ["kickstart", "-k", `gui/${uid}/com.ollama.ollama`]);
    await runCommand("open", ["-gja", "Ollama"]);
  } else {
    logs.push("Unable to determine UID; skipping launchctl kickstart for Ollama.");
  }

  if (uid != null && plistPath && fs.existsSync(plistPath)) {
    attempted.cloudflared = true;
    logs.push("Starting Cloudflare Tunnel (cloudflared) via LaunchAgent…");
    await runCommand("launchctl", ["bootstrap", `gui/${uid}`, plistPath]);
    await runCommand("launchctl", ["enable", `gui/${uid}/${label}`]);
    await runCommand("launchctl", ["kickstart", "-k", `gui/${uid}/${label}`]);
  } else {
    logs.push("Cloudflared LaunchAgent not found; skipping cloudflared start.");
  }

  const ollamaHealthUrl = "http://127.0.0.1:11434/api/tags";
  let ollamaReachable = false;
  logs.push("Checking Ollama health…");
  for (let i = 0; i < 10; i += 1) {
    try {
      const res = await fetchWithTimeout(ollamaHealthUrl, 2000);
      if (res.ok) {
        ollamaReachable = true;
        break;
      }
    } catch {
      // keep trying
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  let cloudflaredRunning: boolean | null = null;
  if (uid != null) {
    const printed = await runCommand("launchctl", ["print", `gui/${uid}/${label}`], 5000);
    cloudflaredRunning = printed.ok ? /state\s*=\s*running/i.test(printed.stdout) : false;
  }

  return NextResponse.json({
    ok: ollamaReachable,
    attempted,
    ollamaReachable,
    cloudflaredRunning,
    logs,
  });
}
