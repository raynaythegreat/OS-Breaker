import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { VercelService } from "@/services/vercel";
import { getRuntimeEnv } from "@/lib/runtime";
import { createSubprocessEnv, resolveCommand } from "@/lib/command";
import { ensureNgrokTunnel } from "@/lib/ngrok";

export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);

function isLocalHostRequest(request: NextRequest) {
  const host = request.headers.get("host") || "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("0.0.0.0");
}


function parseGitHubRepo(remoteUrl: string): string | null {
  const trimmed = remoteUrl.trim();
  if (!trimmed) return null;

  const normalize = (value: string) => value.replace(/\.git$/, "").replace(/^\/+/, "");

  if (trimmed.startsWith("git@github.com:")) {
    return normalize(trimmed.slice("git@github.com:".length));
  }

  const sshPrefix = "ssh://git@github.com/";
  if (trimmed.startsWith(sshPrefix)) {
    return normalize(trimmed.slice(sshPrefix.length));
  }

  const httpsPrefix = "https://github.com/";
  if (trimmed.startsWith(httpsPrefix)) {
    return normalize(trimmed.slice(httpsPrefix.length));
  }

  const httpsWwwPrefix = "https://www.github.com/";
  if (trimmed.startsWith(httpsWwwPrefix)) {
    return normalize(trimmed.slice(httpsWwwPrefix.length));
  }

  return null;
}

async function detectRepositoryFromGit(): Promise<string | null> {
  const gitPath = resolveCommand("git");
  if (!gitPath) return null;
  try {
    const result = await execFileAsync(gitPath, ["config", "--get", "remote.origin.url"], {
      timeout: 2000,
      env: createSubprocessEnv(),
    });
    const parsed = parseGitHubRepo(result.stdout?.toString?.() ?? "");
    return parsed;
  } catch {
    return null;
  }
}

async function detectBranchFromGit(): Promise<string | null> {
  const gitPath = resolveCommand("git");
  if (!gitPath) return null;
  try {
    const result = await execFileAsync(gitPath, ["rev-parse", "--abbrev-ref", "HEAD"], {
      timeout: 2000,
      env: createSubprocessEnv(),
    });
    const name = (result.stdout?.toString?.() ?? "").trim();
    return name ? name : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const { onCloud } = getRuntimeEnv();
  if (onCloud) {
    return NextResponse.json(
      { ok: false, error: "This action can only run on your local machine (not on a cloud deployment)." },
      { status: 200 }
    );
  }

  if (!isLocalHostRequest(request)) {
    return NextResponse.json({ ok: false, error: "This endpoint is only available from localhost." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { repository?: unknown; projectName?: unknown; branch?: unknown; targets?: unknown }
    | null;

  const repositoryFromBody = typeof body?.repository === "string" ? body.repository.trim() : "";
  const repositoryFromEnv = (process.env.AI_AGENT_WEEB_REPOSITORY || "").trim();
  const repositoryFromGit = await detectRepositoryFromGit();
  const repository = repositoryFromBody || repositoryFromEnv || repositoryFromGit || "";

  if (!repository || !/^[^/]+\/[^/]+$/.test(repository)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Unable to detect your GitHub repository. Provide { repository: \"owner/repo\" } or set AI_AGENT_WEEB_REPOSITORY in .env.local.",
      },
      { status: 400 }
    );
  }

  const projectNameFromBody = typeof body?.projectName === "string" ? body.projectName.trim() : "";
  const projectNameFromEnv = (process.env.AI_AGENT_WEEB_VERCEL_PROJECT || "").trim();
  const projectName = projectNameFromBody || projectNameFromEnv || repository.split("/")[1];

  const branchFromBody = typeof body?.branch === "string" ? body.branch.trim() : "";
  const branchFromGit = await detectBranchFromGit();
  const branch = branchFromBody || branchFromGit || "main";

  const targets = Array.isArray(body?.targets)
    ? (body?.targets as unknown[])
        .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
        .map((t) => t.trim())
    : ["production", "preview"];

  const port = 11434;
  const ngrok = await ensureNgrokTunnel(port);
  if (!ngrok.publicUrl) {
    return NextResponse.json(
      { ok: false, error: ngrok.error || "Failed to start ngrok", started: ngrok.started, port },
      { status: 200 }
    );
  }

  try {
    const vercel = new VercelService();
    
    // Update the environment variable without triggering a deployment
    await vercel.updateProjectEnvironmentVariables(projectName, [
        {
          key: "OLLAMA_BASE_URL",
          value: ngrok.publicUrl!,
          target: targets,
        },
    ]);

    return NextResponse.json({
      ok: true,
      repository,
      branch,
      projectName,
      deploymentId: null,
      url: null,
      inspectorUrl: null,
      message: "OLLAMA_BASE_URL updated. Please redeploy manually to apply changes.",
      ngrok: {
        publicUrl: ngrok.publicUrl,
        started: ngrok.started,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to sync ngrok to Vercel",
        ngrok: {
          publicUrl: ngrok.publicUrl,
          started: ngrok.started,
        },
      },
      { status: 200 }
    );
  }
}
