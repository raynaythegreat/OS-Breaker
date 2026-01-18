import type { VercelDeployResult, VercelDeployment } from "@/types/vercel.types";

export interface VercelEnvironmentVariable {
  key: string;
  value: string;
  target?: string[];
}

export interface VercelDeployRequestBody {
  repository: string;
  projectName?: string;
  branch?: string;
  environmentVariables?: VercelEnvironmentVariable[];
  framework?: string;
  buildCommand?: string;
  installCommand?: string;
  outputDirectory?: string;
  rootDirectory?: string;
  autoDetectFramework?: boolean;
  enableRetry?: boolean;
}

export interface DeployStrategy {
  key: string;
  label: string;
  body: VercelDeployRequestBody;
}

interface GitHubRepoStructureNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: GitHubRepoStructureNode[];
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timeout = setTimeout(() => resolve(), ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}

function normalizeRootDirectory(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  let normalized = trimmed.replace(/^\.\/+/, "").replace(/^\/+/, "").replace(/\/+$/, "");
  if (normalized === "." || normalized === "/") normalized = "";
  return normalized;
}

function dirname(path: string) {
  const index = path.lastIndexOf("/");
  return index === -1 ? "" : path.slice(0, index);
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
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

export async function startVercelDeploy(
  body: VercelDeployRequestBody,
  options: { signal?: AbortSignal } = {}
): Promise<VercelDeployResult & { strategy?: number; retriesUsed?: number }> {
  const response = await fetch("/api/vercel/deploy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: options.signal,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.error) {
    throw new Error(data?.error || "Deployment failed");
  }
  return data as VercelDeployResult & { strategy?: number; retriesUsed?: number };
}

export async function getVercelDeployment(
  deploymentId: string,
  options: { signal?: AbortSignal } = {}
): Promise<VercelDeployment> {
  const response = await fetch(`/api/vercel/deployments/${encodeURIComponent(deploymentId)}`, {
    method: "GET",
    signal: options.signal,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.error) {
    throw new Error(data?.error || "Failed to load deployment");
  }
  return data.deployment as VercelDeployment;
}

export async function waitForVercelDeployment(
  deploymentId: string,
  options: {
    signal?: AbortSignal;
    timeoutMs?: number;
    pollIntervalMs?: number;
    onUpdate?: (deployment: VercelDeployment) => void;
  } = {}
): Promise<VercelDeployment> {
  const timeoutMs = options.timeoutMs ?? 6 * 60 * 1000;
  const pollIntervalMs = options.pollIntervalMs ?? 2500;
  const start = Date.now();

  while (true) {
    const deployment = await getVercelDeployment(deploymentId, { signal: options.signal });
    options.onUpdate?.(deployment);

    if (deployment.state === "READY" || deployment.state === "ERROR" || deployment.state === "CANCELED") {
      return deployment;
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for Vercel deployment");
    }

    await sleep(pollIntervalMs, options.signal);
  }
}

export async function getRepoRootDirectoryCandidates(
  repoFullName: string,
  options: { depth?: number; signal?: AbortSignal } = {}
): Promise<string[]> {
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) return [];

  const depth = options.depth ?? 6;
  const response = await fetch(`/api/github/repos/${owner}/${repo}/structure?depth=${depth}`, {
    method: "GET",
    signal: options.signal,
  });
  const data = await response.json().catch(() => null);
  const structure = (data?.structure || []) as GitHubRepoStructureNode[];
  if (!response.ok || data?.error || !Array.isArray(structure)) return [];

  const candidates: string[] = [];

  const walk = (nodes: GitHubRepoStructureNode[]) => {
    for (const node of nodes) {
      if (node.type === "file" && node.name === "package.json" && typeof node.path === "string") {
        candidates.push(normalizeRootDirectory(dirname(node.path)));
      }
      if (node.children && Array.isArray(node.children)) {
        walk(node.children);
      }
    }
  };

  walk(structure);

  const unique = uniqueStrings(candidates).filter((value) => value !== "node_modules");
  unique.sort((a, b) => scoreRootDirectory(a) - scoreRootDirectory(b));
  return unique;
}

export function buildVercelDeployStrategies(params: {
  repository: string;
  projectName: string;
  branch: string;
  environmentVariables?: VercelEnvironmentVariable[];
  framework?: string;
  buildCommand?: string;
  installCommand?: string;
  outputDirectory?: string;
  rootDirectory?: string;
  rootDirectoryCandidates?: string[];
}): DeployStrategy[] {
  const normalizedRootDirectory = normalizeRootDirectory(params.rootDirectory);

  const baseBody: VercelDeployRequestBody = {
    repository: params.repository,
    projectName: params.projectName,
    branch: params.branch,
    environmentVariables: params.environmentVariables,
    framework: params.framework,
    buildCommand: params.buildCommand,
    installCommand: params.installCommand,
    outputDirectory: params.outputDirectory,
    rootDirectory: normalizedRootDirectory || undefined,
    autoDetectFramework: true,
    enableRetry: true,
  };

  const strategies: DeployStrategy[] = [
    {
      key: "default",
      label: normalizedRootDirectory ? `Default (root: ${normalizedRootDirectory})` : "Default",
      body: baseBody,
    },
  ];

  if (baseBody.framework) {
    strategies.push({
      key: "no-framework",
      label: "Auto-detect framework",
      body: { ...baseBody, framework: undefined, autoDetectFramework: true },
    });
  }

  if (baseBody.rootDirectory) {
    strategies.push({
      key: "no-root-dir",
      label: "No root directory override",
      body: { ...baseBody, rootDirectory: undefined },
    });
  }

  const candidates = (params.rootDirectoryCandidates || []).map(normalizeRootDirectory);
  for (const candidate of candidates) {
    if (candidate === normalizedRootDirectory) continue;
    const label = candidate ? `Try root directory: ${candidate}` : "Try root directory: (repo root)";
    strategies.push({
      key: `root:${candidate || "root"}`,
      label,
      body: { ...baseBody, rootDirectory: candidate || undefined, autoDetectFramework: true, framework: undefined },
    });
  }

  strategies.push({
    key: "minimal",
    label: "Minimal settings",
    body: {
      repository: params.repository,
      projectName: params.projectName,
      branch: params.branch,
      environmentVariables: params.environmentVariables?.slice(0, 10),
      autoDetectFramework: true,
      enableRetry: true,
    },
  });

  const deduped: DeployStrategy[] = [];
  const seen = new Set<string>();
  for (const strategy of strategies) {
    const key = `${strategy.key}:${JSON.stringify(strategy.body)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(strategy);
  }

  return deduped.slice(0, 8);
}

