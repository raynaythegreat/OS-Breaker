import axios, { AxiosInstance } from "axios";
import { VercelDeployResult, VercelDeployment, VercelProject } from "@/types/vercel.types";
import { GitHubService } from "@/services/github";

function formatAxiosError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;
    if (typeof data === "string") {
      return status ? `${status}: ${data}` : data;
    }
    if (data?.error?.message) {
      return status ? `${status}: ${data.error.message}` : data.error.message;
    }
    if (data?.message) {
      return status ? `${status}: ${data.message}` : data.message;
    }
    if (status) {
      return `HTTP ${status}`;
    }
  }
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePositiveInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  return null;
}

function extractRepoIdFromProject(project: Record<string, unknown>): number | null {
  const topLevel = parsePositiveInt((project as any).repoId);
  if (topLevel) return topLevel;

  const link = (project as any).link;
  if (isPlainObject(link)) {
    const repoId = parsePositiveInt((link as any).repoId);
    if (repoId) return repoId;
  }

  const gitRepository = (project as any).gitRepository;
  if (isPlainObject(gitRepository)) {
    const repoId = parsePositiveInt((gitRepository as any).repoId);
    if (repoId) return repoId;
  }

  const gitRepo = (project as any).gitRepo;
  if (isPlainObject(gitRepo)) {
    const repoId = parsePositiveInt((gitRepo as any).repoId);
    if (repoId) return repoId;
  }

  return null;
}

function normalizeProjectName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function mapProject(project: Record<string, unknown>): VercelProject {
  return {
    id: project.id as string,
    name: project.name as string,
    framework: (project.framework as string) || null,
    createdAt: project.createdAt as number,
    updatedAt: project.updatedAt as number,
  };
}

function mapDeployment(deployment: Record<string, unknown>): VercelDeployment {
  const stateValue =
    (typeof deployment.state === "string" ? deployment.state : undefined) ||
    (typeof deployment.readyState === "string" ? deployment.readyState : undefined) ||
    "QUEUED";

  const errorCode =
    (typeof deployment.errorCode === "string" ? deployment.errorCode : null) ||
    (typeof (deployment as any).error?.code === "string" ? (deployment as any).error.code : null);

  const errorMessage =
    (typeof deployment.errorMessage === "string" ? deployment.errorMessage : null) ||
    (typeof (deployment as any).error?.message === "string" ? (deployment as any).error.message : null);

  return {
    id: deployment.id as string,
    url: deployment.url as string,
    name: deployment.name as string,
    state: stateValue as VercelDeployment["state"],
    createdAt: deployment.createdAt as number,
    target: deployment.target as VercelDeployment["target"],
    inspectorUrl: deployment.inspectorUrl as string | undefined,
    errorCode,
    errorMessage,
  };
}

type VercelEnvVar = {
  id: string;
  key: string;
  target: string[];
};

function mapEnvVar(env: Record<string, unknown>): VercelEnvVar | null {
  const id = typeof env.id === "string" ? env.id : null;
  const key = typeof env.key === "string" ? env.key : null;
  const rawTarget = (env as any).target;
  const target = Array.isArray(rawTarget) ? rawTarget.filter((t: unknown): t is string => typeof t === "string") : [];
  if (!id || !key) return null;
  return { id, key, target };
}

export class VercelService {
  private client: AxiosInstance;
  private teamId?: string;

  constructor(apiToken?: string, teamId?: string) {
    const token = apiToken || process.env.VERCEL_TOKEN;
    if (!token) {
      throw new Error("Vercel API token not provided");
    }

    this.teamId = teamId || process.env.VERCEL_TEAM_ID;

    this.client = axios.create({
      baseURL: "https://api.vercel.com",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  }

  private async request<T>(options: {
    method: "get" | "post" | "delete" | "patch";
    path: string;
    params?: Record<string, unknown>;
    data?: Record<string, unknown>;
  }): Promise<T> {
    try {
      const params = {
        ...(options.params || {}),
        ...(this.teamId ? { teamId: this.teamId } : {}),
      };
      const response = await this.client.request<T>({
        method: options.method,
        url: options.path,
        params,
        data: options.data,
      });
      return response.data;
    } catch (error: unknown) {
      throw new Error(`Vercel API error: ${formatAxiosError(error)}`);
    }
  }

  async listProjects(): Promise<VercelProject[]> {
    const data = await this.request<{ projects: Record<string, unknown>[] }>({
      method: "get",
      path: "/v9/projects",
    });
    return (data.projects || []).map(mapProject);
  }

  async getProject(projectName: string): Promise<VercelProject | null> {
    try {
      const data = await this.request<Record<string, unknown>>({
        method: "get",
        path: `/v9/projects/${projectName}`,
      });
      return mapProject(data);
    } catch {
      return null;
    }
  }

  async createProject(params: {
    name: string;
    repository: string;
    framework?: string;
  }): Promise<VercelProject> {
    const normalizedName = normalizeProjectName(params.name);
    const data = await this.request<Record<string, unknown>>({
      method: "post",
      path: "/v9/projects",
      data: {
        name: normalizedName,
        ...(params.framework ? { framework: params.framework } : {}),
        gitRepository: {
          type: "github",
          repo: params.repository,
        },
      },
    });
    return mapProject(data);
  }

  async deleteProject(projectName: string): Promise<void> {
    await this.request({
      method: "delete",
      path: `/v9/projects/${projectName}`,
    });
  }

  private async resolveGitHubRepoId(params: { projectName?: string; repository: string }): Promise<number | null> {
    const normalizedProjectName = params.projectName ? normalizeProjectName(params.projectName) : "";
    if (normalizedProjectName) {
      try {
        const project = await this.request<Record<string, unknown>>({
          method: "get",
          path: `/v9/projects/${normalizedProjectName}`,
        });
        const repoId = extractRepoIdFromProject(project);
        if (repoId) return repoId;
      } catch {
        // ignore and fall back
      }
    }

    const [owner, repo] = params.repository.split("/");
    if (!owner || !repo) return null;

    try {
      const github = new GitHubService();
      const repoInfo = await github.getRepository(owner, repo);
      return parsePositiveInt(repoInfo.id);
    } catch {
      return null;
    }
  }

  private async createDeployment(params: {
    projectName: string;
    repository: string;
    branch: string;
    environmentVariables?: Array<{ key: string; value: string; target?: string[] }>;
    framework?: string;
    buildCommand?: string;
    installCommand?: string;
    outputDirectory?: string;
    rootDirectory?: string;
  }): Promise<VercelDeployment> {
    const repoId = await this.resolveGitHubRepoId({
      projectName: params.projectName,
      repository: params.repository,
    });
    if (!repoId) {
      throw new Error(
        `Unable to resolve GitHub repoId for ${params.repository}. Ensure GITHUB_TOKEN is set and the repo is connected to Vercel.`
      );
    }

    const deploymentData: Record<string, unknown> = {
      name: params.projectName,
      target: "production",
      gitSource: {
        type: "github",
        repoId,
        ref: params.branch,
      },
      projectSettings: {
        framework: params.framework || null,
        ...(params.buildCommand ? { buildCommand: params.buildCommand } : {}),
        ...(params.installCommand ? { installCommand: params.installCommand } : {}),
        ...(params.outputDirectory ? { outputDirectory: params.outputDirectory } : {}),
        ...(params.rootDirectory ? { rootDirectory: params.rootDirectory } : {}),
      },
    };

    // Note: Environment variables should be set on the project level (via updateProjectEnvironmentVariables)
    // not on individual deployments when using v13 API. The deployment will automatically use project env vars.

    const data = await this.request<Record<string, unknown>>({
      method: "post",
      path: "/v13/deployments",
      data: deploymentData,
    });
    return mapDeployment(data);
  }

  async getDeployments(projectName: string, limit = 10): Promise<VercelDeployment[]> {
    const project = await this.getProject(projectName);
    if (!project) return [];

    const data = await this.request<{ deployments: Record<string, unknown>[] }>({
      method: "get",
      path: "/v6/deployments",
      params: { projectId: project.id, limit },
    });
    return (data.deployments || []).map(mapDeployment);
  }

  async getDeployment(deploymentId: string): Promise<VercelDeployment | null> {
    try {
      const data = await this.request<Record<string, unknown>>({
        method: "get",
        path: `/v13/deployments/${encodeURIComponent(deploymentId)}`,
      });
      return mapDeployment(data);
    } catch {
      return null;
    }
  }

  async getDeploymentEvents(deploymentId: string, limit = 2000): Promise<unknown> {
    const encoded = encodeURIComponent(deploymentId);
    try {
      return await this.request<unknown>({
        method: "get",
        path: `/v2/deployments/${encoded}/events`,
        params: { limit },
      });
    } catch {
      return await this.request<unknown>({
        method: "get",
        path: `/v13/deployments/${encoded}/events`,
        params: { limit },
      });
    }
  }

  async updateProjectEnvironmentVariables(
    projectName: string,
    environmentVariables: Array<{ key: string; value: string; target?: string[] }>
  ): Promise<void> {
    const desired = new Map<
      string,
      { key: string; value: string; target: string[] }
    >();
    for (const envVar of environmentVariables) {
      const key = typeof envVar.key === "string" ? envVar.key.trim() : "";
      if (!key) continue;
      const value = typeof envVar.value === "string" ? envVar.value : "";
      desired.set(key, {
        key,
        value,
        target: Array.isArray(envVar.target) && envVar.target.length > 0
          ? envVar.target
          : ["production", "preview", "development"],
      });
    }

    if (desired.size === 0) return;

    const desiredVars = Array.from(desired.values());

    let mapped: VercelEnvVar[] = [];
    try {
      const existing = await this.request<{ envs?: Record<string, unknown>[] }>({
        method: "get",
        path: `/v10/projects/${projectName}/env`,
      });
      const envs = Array.isArray(existing.envs) ? existing.envs : [];
      mapped = envs.map(mapEnvVar).filter(Boolean) as VercelEnvVar[];
    } catch {
      mapped = [];
    }

    const idsByKey = mapped.reduce((acc, env) => {
      const list = acc.get(env.key) || [];
      list.push(env.id);
      acc.set(env.key, list);
      return acc;
    }, new Map<string, string[]>());

    for (const [key, ids] of Array.from(idsByKey.entries())) {
      if (!desired.has(key)) continue;
      for (const id of ids) {
        try {
          await this.request({
            method: "delete",
            path: `/v10/projects/${projectName}/env/${encodeURIComponent(id)}`,
          });
        } catch {
          // ignore and continue
        }
      }
    }

    for (const envVar of desiredVars) {
      // Ensure target is always an array with at least one element
      const targets = Array.isArray(envVar.target) && envVar.target.length > 0
        ? envVar.target
        : ["production", "preview", "development"];

      await this.request({
        method: "post",
        path: `/v10/projects/${projectName}/env`,
        data: {
          key: envVar.key,
          value: envVar.value,
          type: "encrypted",
          target: targets,
        },
      });
    }
  }

  async deployFromGitHub(params: {
    projectName: string;
    repository: string;
    branch?: string;
    environmentVariables?: Array<{ key: string; value: string; target?: string[] }>;
    framework?: string;
    buildCommand?: string;
    installCommand?: string;
    outputDirectory?: string;
    rootDirectory?: string;
    skipEnvUpdate?: boolean;
  }): Promise<VercelDeployResult> {
    const normalizedName = normalizeProjectName(params.projectName);
    const branch = params.branch || "main";

    let project = await this.getProject(normalizedName);
    if (!project) {
      project = await this.createProject({
        name: normalizedName,
        repository: params.repository,
        framework: params.framework,
      });
    }

    // Update project environment variables if provided and not skipped
    if (!params.skipEnvUpdate && params.environmentVariables && params.environmentVariables.length > 0) {
      try {
        await this.updateProjectEnvironmentVariables(normalizedName, params.environmentVariables);
      } catch (error) {
        console.error("Failed to update environment variables:", error);
        // Continue with deployment even if env vars fail
      }
    }

    const deployment = await this.createDeployment({
      projectName: project.name,
      repository: params.repository,
      branch,
      environmentVariables: params.environmentVariables,
      framework: params.framework,
      buildCommand: params.buildCommand,
      installCommand: params.installCommand,
      outputDirectory: params.outputDirectory,
      rootDirectory: params.rootDirectory,
    });

    const url = deployment.url.startsWith("http")
      ? deployment.url
      : `https://${deployment.url}`;

    return {
      projectId: project.id,
      projectName: project.name,
      deploymentId: deployment.id,
      url,
      status: deployment.state,
      inspectorUrl: deployment.inspectorUrl,
    };
  }

  async validateToken(): Promise<boolean> {
    try {
      await this.listProjects();
      return true;
    } catch {
      return false;
    }
  }
}
