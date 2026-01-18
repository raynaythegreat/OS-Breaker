import { NextRequest, NextResponse } from "next/server";
import { GitHubService } from "@/services/github";

export const dynamic = "force-dynamic";

interface RepoNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: RepoNode[];
}

function dirname(path: string) {
  const index = path.lastIndexOf("/");
  return index === -1 ? "" : path.slice(0, index);
}

function normalizeRootDirectory(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  let normalized = trimmed.replace(/^\.\/+/, "").replace(/^\/+/, "").replace(/\/+$/, "");
  if (normalized === "." || normalized === "/") normalized = "";
  return normalized;
}

function scoreRootDirectory(dir: string) {
  if (!dir) return 0;
  const lower = dir.toLowerCase();
  let score = 100 + dir.split("/").length * 10;
  if (lower.includes("apps/web")) score -= 50;
  if (lower.includes("apps/site")) score -= 45;
  if (lower.includes("apps/app")) score -= 40;
  if (lower.endsWith("/web")) score -= 20;
  if (lower.endsWith("/frontend")) score -= 15;
  if (lower.endsWith("/client")) score -= 10;
  if (lower.endsWith("/site")) score -= 10;
  return score;
}

function walk(nodes: RepoNode[], onFile: (node: RepoNode) => void) {
  for (const node of nodes) {
    if (node.type === "file") onFile(node);
    if (node.children) walk(node.children, onFile);
  }
}

function detectFrameworkFromPackageJson(pkg: any): string | null {
  const deps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
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
  return null;
}

function pickRecommendedProvider(signals: {
  hasVercelConfig: boolean;
  hasRenderConfig: boolean;
  framework: string | null;
  hasWebSockets: boolean;
  hasBackgroundJobs: boolean;
}): { provider: "vercel" | "render"; reasons: string[] } {
  const reasons: string[] = [];

  if (signals.hasWebSockets) {
    reasons.push("WebSocket/real-time dependencies detected (better fit for a long-running service).");
    return { provider: "render", reasons };
  }

  if (signals.hasBackgroundJobs) {
    reasons.push("Background job/queue dependencies detected (better fit for a long-running service).");
    return { provider: "render", reasons };
  }

  if (signals.hasRenderConfig && !signals.hasVercelConfig) {
    reasons.push("Render configuration detected in the repo.");
    return { provider: "render", reasons };
  }

  if (signals.hasVercelConfig && !signals.hasRenderConfig) {
    reasons.push("Vercel configuration detected in the repo.");
    return { provider: "vercel", reasons };
  }

  if (signals.framework === "nextjs") {
    reasons.push("Next.js detected (Vercel is the most seamless default).");
    return { provider: "vercel", reasons };
  }

  if (signals.framework === "node") {
    reasons.push("Node/Express detected (Render is a strong default for server apps).");
    return { provider: "render", reasons };
  }

  reasons.push("Defaulting to Vercel for simple frontends and SSR.");
  return { provider: "vercel", reasons };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const repository = typeof body?.repository === "string" ? body.repository.trim() : "";

    if (!repository || !/^[^/]+\/[^/]+$/.test(repository)) {
      return NextResponse.json({ error: "Repository must be in the form owner/repo" }, { status: 400 });
    }

    const [owner, repo] = repository.split("/");
    const github = new GitHubService();

    const structure = (await github.getRepoStructure(owner, repo, "", 6)) as RepoNode[];

    const filePaths = new Set<string>();
    const packageJsonRoots: string[] = [];

    walk(structure, (node) => {
      filePaths.add(node.path);
      if (node.name === "package.json") {
        packageJsonRoots.push(normalizeRootDirectory(dirname(node.path)));
      }
    });

    const uniqueRoots = Array.from(new Set(packageJsonRoots));
    uniqueRoots.sort((a, b) => scoreRootDirectory(a) - scoreRootDirectory(b));
    const rootDirectory = uniqueRoots.length > 0 ? uniqueRoots[0] : "";

    let pkg: any = null;
    try {
      const packageJsonPath = rootDirectory ? `${rootDirectory}/package.json` : "package.json";
      const raw = await github.getFileContent(owner, repo, packageJsonPath);
      pkg = JSON.parse(raw);
    } catch {
      pkg = null;
    }

    const deps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
    const framework = detectFrameworkFromPackageJson(pkg);

    const hasWebSockets = Boolean(deps.ws || deps["socket.io"] || deps["socket.io-client"] || deps["@fastify/websocket"]);
    const hasBackgroundJobs = Boolean(deps.bull || deps.bullmq || deps.agenda || deps.bree || deps["node-cron"]);

    const hasVercelConfig = filePaths.has("vercel.json") || filePaths.has(".vercel/project.json");
    const hasRenderConfig = filePaths.has("render.yaml") || filePaths.has("render.yml");

    const recommendation = pickRecommendedProvider({
      hasVercelConfig,
      hasRenderConfig,
      framework,
      hasWebSockets,
      hasBackgroundJobs,
    });

    return NextResponse.json({
      repository,
      recommendedProvider: recommendation.provider,
      reasons: recommendation.reasons,
      signals: {
        framework,
        rootDirectory: rootDirectory || null,
        hasVercelConfig,
        hasRenderConfig,
        hasWebSockets,
        hasBackgroundJobs,
      },
    });
  } catch (error) {
    console.error("Failed to build deployment recommendation:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to recommend deployment provider" },
      { status: 500 }
    );
  }
}

