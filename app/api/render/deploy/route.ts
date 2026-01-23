import { NextRequest, NextResponse } from "next/server";
import { RenderService } from "@/services/render";
import { GitHubService } from "@/services/github";

export const dynamic = 'force-dynamic';

interface EnvironmentVariable {
  key: string;
  value: string;
}

// Helper function to get Render API key from headers or environment
function getRenderApiKey(request: NextRequest): string | null {
  // Try custom header first (from client-side SecureStorage)
  const headerToken = request.headers.get("X-API-Key-Render");
  if (headerToken && headerToken.trim()) {
    return headerToken;
  }

  // Fall back to environment variable (for CLI/production builds)
  return process.env.RENDER_API_KEY || null;
}

// Helper function to get GitHub token from headers or environment
function getGitHubToken(request: NextRequest): string | null {
  const headerToken = request.headers.get("X-API-Key-GitHub");
  if (headerToken && headerToken.trim()) {
    return headerToken;
  }
  return process.env.GITHUB_TOKEN || null;
}

function normalizeRootDirectory(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  let normalized = trimmed.replace(/^\.\/+/, "").replace(/^\/+/, "").replace(/\/+$/, "");
  if (normalized === "." || normalized === "/") normalized = "";
  return normalized;
}

async function detectFramework(repository: string, rootDirectory?: string, githubToken?: string): Promise<string | undefined> {
  try {
    const [owner, repo] = repository.split("/");
    const github = githubToken ? new GitHubService(githubToken) : new GitHubService();
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

    const renderApiKey = getRenderApiKey(request);
    if (!renderApiKey) {
      return NextResponse.json(
        { error: "Render API key not provided. Please configure it in Settings." },
        { status: 401 }
      );
    }

    const githubToken = getGitHubToken(request);

    const repoFullName = repository.trim();
    const inferredServiceName = typeof serviceName === "string" && serviceName.trim()
      ? serviceName.trim()
      : repoFullName.split("/")[1] || repoFullName;
    const resolvedBranch = typeof branch === "string" && branch.trim() ? branch.trim() : "main";
    const normalizedRoot = normalizeRootDirectory(rootDirectory);

    let detectedFramework = typeof framework === "string" && framework.trim() ? framework.trim() : undefined;
    if (!detectedFramework && autoDetectFramework) {
      detectedFramework = await detectFramework(repoFullName, normalizedRoot || undefined, githubToken || undefined);
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

    const render = new RenderService(renderApiKey);
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

