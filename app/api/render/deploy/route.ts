import { NextRequest, NextResponse } from "next/server";
import { RenderService } from "@/services/render";
import { GitHubService } from "@/services/github";

interface EnvironmentVariable {
  key: string;
  value: string;
}

function normalizeRootDirectory(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  let normalized = trimmed.replace(/^\.\/+/, "").replace(/^\/+/, "").replace(/\/+$/, "");
  if (normalized === "." || normalized === "/") normalized = "";
  return normalized;
}

async function detectFramework(repository: string, rootDirectory?: string): Promise<string | undefined> {
  try {
    const [owner, repo] = repository.split("/");
    const github = new GitHubService();
    const normalizedRoot = normalizeRootDirectory(rootDirectory);
    const packageJsonPath = normalizedRoot ? `${normalizedRoot}/package.json` : "package.json";

    const packageJson = await github.getFileContent(owner, repo, packageJsonPath);
    const pkg = JSON.parse(packageJson);
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

    if (deps.next) return "nextjs";
    if (deps.react && deps["react-scripts"]) return "create-react-app";
    if (deps.react && deps.vite) return "vite";
    if (deps.vue && deps["@vue/cli-service"]) return "vue";
    if (deps.nuxt) return "nuxt";
    if (deps.gatsby) return "gatsby";
    if (deps.svelte) return "svelte";
    if (deps["@sveltejs/kit"]) return "sveltekit";
    if (deps["@angular/core"]) return "angular";
    if (deps.astro) return "astro";
    if (deps.remix) return "remix";
    if (deps.express) return "node";
    return undefined;
  } catch (error) {
    console.error("Failed to detect framework:", error);
    return undefined;
  }
}

function defaultCommandsForFramework(framework?: string): { buildCommand: string; startCommand: string } {
  const fw = (framework || "").toLowerCase();
  if (fw === "nextjs" || fw === "next") {
    return {
      buildCommand: "npm ci && npm run build",
      startCommand: "npm run start -- -p $PORT",
    };
  }

  return {
    buildCommand: "npm ci && npm run build",
    startCommand: "npm run start",
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const {
      repository,
      serviceName,
      branch,
      environmentVariables,
      rootDirectory,
      buildCommand,
      startCommand,
      autoDetectFramework = true,
      framework,
    } = (body || {}) as Record<string, unknown>;

    if (typeof repository !== "string" || !repository.trim()) {
      return NextResponse.json({ error: "Repository is required" }, { status: 400 });
    }

    const repoFullName = repository.trim();
    const inferredServiceName = typeof serviceName === "string" && serviceName.trim()
      ? serviceName.trim()
      : repoFullName.split("/")[1] || repoFullName;
    const resolvedBranch = typeof branch === "string" && branch.trim() ? branch.trim() : "main";
    const normalizedRoot = normalizeRootDirectory(rootDirectory);

    let detectedFramework = typeof framework === "string" && framework.trim() ? framework.trim() : undefined;
    if (!detectedFramework && autoDetectFramework) {
      detectedFramework = await detectFramework(repoFullName, normalizedRoot || undefined);
    }

    const defaults = defaultCommandsForFramework(detectedFramework);
    const resolvedBuildCommand = typeof buildCommand === "string" && buildCommand.trim() ? buildCommand.trim() : defaults.buildCommand;
    const resolvedStartCommand = typeof startCommand === "string" && startCommand.trim() ? startCommand.trim() : defaults.startCommand;

    const envs: EnvironmentVariable[] = Array.isArray(environmentVariables)
      ? (environmentVariables as unknown[])
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const key = typeof (item as any).key === "string" ? (item as any).key.trim() : "";
            if (!key) return null;
            const value = typeof (item as any).value === "string" ? (item as any).value : "";
            return { key, value };
          })
          .filter(Boolean) as EnvironmentVariable[]
      : [];

    const render = new RenderService();
    const result = await render.deployFromGitHub({
      serviceName: inferredServiceName,
      repository: repoFullName,
      branch: resolvedBranch,
      rootDirectory: normalizedRoot || undefined,
      environmentVariables: envs.length > 0 ? envs : undefined,
      buildCommand: resolvedBuildCommand,
      startCommand: resolvedStartCommand,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to deploy to Render:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to deploy to Render" },
      { status: 500 }
    );
  }
}

