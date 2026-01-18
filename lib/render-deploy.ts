import type { RenderDeploy, RenderDeployResult } from "@/types/render.types";

export interface RenderEnvironmentVariable {
  key: string;
  value: string;
}

export interface RenderDeployRequestBody {
  repository: string;
  serviceName?: string;
  branch?: string;
  environmentVariables?: RenderEnvironmentVariable[];
  rootDirectory?: string;
  buildCommand?: string;
  startCommand?: string;
  framework?: string;
  autoDetectFramework?: boolean;
}

export interface RenderDeployStrategy {
  key: string;
  label: string;
  body: RenderDeployRequestBody;
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

function isTerminalDeployStatus(status: string): boolean {
  const value = status.trim().toLowerCase();
  if (!value) return false;
  if (value === "live" || value === "succeeded" || value === "success" || value === "deployed") return true;
  if (value.includes("fail")) return true;
  if (value.includes("cancel")) return true;
  return false;
}

export async function startRenderDeploy(
  body: RenderDeployRequestBody,
  options: { signal?: AbortSignal } = {}
): Promise<RenderDeployResult> {
  const response = await fetch("/api/render/deploy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: options.signal,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.error) {
    throw new Error(data?.error || "Deployment failed");
  }
  return data as RenderDeployResult;
}

export async function getRenderDeployment(
  deployId: string,
  options: { signal?: AbortSignal } = {}
): Promise<RenderDeploy> {
  const response = await fetch(`/api/render/deployments/${encodeURIComponent(deployId)}`, {
    method: "GET",
    signal: options.signal,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.error) {
    throw new Error(data?.error || "Failed to load deployment");
  }
  return data.deployment as RenderDeploy;
}

export async function waitForRenderDeployment(
  deployId: string,
  options: {
    signal?: AbortSignal;
    timeoutMs?: number;
    pollIntervalMs?: number;
    onUpdate?: (deployment: RenderDeploy) => void;
  } = {}
): Promise<RenderDeploy> {
  const timeoutMs = options.timeoutMs ?? 10 * 60 * 1000;
  const pollIntervalMs = options.pollIntervalMs ?? 3000;
  const start = Date.now();

  while (true) {
    const deployment = await getRenderDeployment(deployId, { signal: options.signal });
    options.onUpdate?.(deployment);

    if (isTerminalDeployStatus(deployment.status)) {
      return deployment;
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for Render deployment");
    }

    await sleep(pollIntervalMs, options.signal);
  }
}

export function buildRenderDeployStrategies(params: {
  repository: string;
  serviceName: string;
  branch: string;
  environmentVariables?: RenderEnvironmentVariable[];
  rootDirectory?: string;
  rootDirectoryCandidates?: string[];
  buildCommand?: string;
  startCommand?: string;
  framework?: string;
}): RenderDeployStrategy[] {
  const normalizedRootDirectory = normalizeRootDirectory(params.rootDirectory);

  const baseBody: RenderDeployRequestBody = {
    repository: params.repository,
    serviceName: params.serviceName,
    branch: params.branch,
    environmentVariables: params.environmentVariables,
    rootDirectory: normalizedRootDirectory || undefined,
    buildCommand: params.buildCommand,
    startCommand: params.startCommand,
    framework: params.framework,
    autoDetectFramework: true,
  };

  const strategies: RenderDeployStrategy[] = [
    {
      key: "default",
      label: normalizedRootDirectory ? `Default (root: ${normalizedRootDirectory})` : "Default",
      body: baseBody,
    },
  ];

  if (baseBody.rootDirectory) {
    strategies.push({
      key: "no-root-dir",
      label: "No root directory override",
      body: { ...baseBody, rootDirectory: undefined },
    });
  }

  const candidates = uniqueStrings((params.rootDirectoryCandidates || []).map(normalizeRootDirectory));
  for (const candidate of candidates) {
    if (candidate === normalizedRootDirectory) continue;
    const label = candidate ? `Try root directory: ${candidate}` : "Try root directory: (repo root)";
    strategies.push({
      key: `root:${candidate || "root"}`,
      label,
      body: { ...baseBody, rootDirectory: candidate || undefined },
    });
  }

  strategies.push({
    key: "minimal",
    label: "Minimal settings",
    body: {
      repository: params.repository,
      serviceName: params.serviceName,
      branch: params.branch,
      environmentVariables: params.environmentVariables?.slice(0, 10),
      autoDetectFramework: true,
    },
  });

  const deduped: RenderDeployStrategy[] = [];
  const seen = new Set<string>();
  for (const strategy of strategies) {
    const key = `${strategy.key}:${JSON.stringify(strategy.body)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(strategy);
  }

  return deduped.slice(0, 8);
}

