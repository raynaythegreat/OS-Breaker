import axios, { AxiosInstance } from "axios";
import type { RenderDeploy, RenderDeployResult, RenderOwner, RenderServiceInfo } from "@/types/render.types";

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

function normalizeServiceName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function repoToHttpsUrl(repository: string): string {
  const trimmed = repository.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://github.com/${trimmed.replace(/^\/+/, "").replace(/\.git$/, "")}`;
}

function renderDashboardUrl(serviceType: string, serviceId: string): { dashboardUrl: string | null; logsUrl: string | null } {
  if (!serviceId) return { dashboardUrl: null, logsUrl: null };
  const type = serviceType === "static_site" ? "static" : "web";
  const base = `https://dashboard.render.com/${type}/${serviceId}`;
  return { dashboardUrl: base, logsUrl: `${base}/logs` };
}

function extractServiceObject(raw: unknown): Record<string, unknown> | null {
  if (!isPlainObject(raw)) return null;
  if (isPlainObject((raw as any).service)) return (raw as any).service as Record<string, unknown>;
  return raw;
}

function extractDeployObject(raw: unknown): Record<string, unknown> | null {
  if (!isPlainObject(raw)) return null;
  if (isPlainObject((raw as any).deploy)) return (raw as any).deploy as Record<string, unknown>;
  return raw;
}

function extractOwnerObject(raw: unknown): Record<string, unknown> | null {
  if (!isPlainObject(raw)) return null;
  if (isPlainObject((raw as any).owner)) return (raw as any).owner as Record<string, unknown>;
  return raw;
}

function mapOwner(raw: unknown): RenderOwner | null {
  const owner = extractOwnerObject(raw);
  if (!owner) return null;
  const id = typeof owner.id === "string" ? owner.id : null;
  if (!id) return null;
  return {
    id,
    name: typeof owner.name === "string" ? owner.name : null,
    type: typeof owner.type === "string" ? owner.type : null,
  };
}

function mapService(raw: unknown): RenderServiceInfo | null {
  const service = extractServiceObject(raw);
  if (!service) return null;
  const id = typeof service.id === "string" ? service.id : null;
  const name = typeof service.name === "string" ? service.name : null;
  const type = typeof service.type === "string" ? service.type : "web_service";
  if (!id || !name) return null;

  const details = isPlainObject((service as any).serviceDetails) ? ((service as any).serviceDetails as Record<string, unknown>) : null;
  const url =
    (details && typeof (details as any).url === "string" ? ((details as any).url as string) : null) ||
    (typeof (service as any).url === "string" ? ((service as any).url as string) : null);

  const dashboard = renderDashboardUrl(type, id);

  return {
    id,
    name,
    type,
    repo: typeof (service as any).repo === "string" ? ((service as any).repo as string) : null,
    branch: typeof (service as any).branch === "string" ? ((service as any).branch as string) : null,
    createdAt: typeof (service as any).createdAt === "string" ? ((service as any).createdAt as string) : null,
    updatedAt: typeof (service as any).updatedAt === "string" ? ((service as any).updatedAt as string) : null,
    url: url ? (url.startsWith("http") ? url : `https://${url}`) : null,
    dashboardUrl: dashboard.dashboardUrl,
    logsUrl: dashboard.logsUrl,
  };
}

function mapDeploy(raw: unknown, serviceType = "web_service"): RenderDeploy | null {
  const deploy = extractDeployObject(raw);
  if (!deploy) return null;
  const id = typeof deploy.id === "string" ? deploy.id : null;
  const serviceId = typeof (deploy as any).serviceId === "string" ? ((deploy as any).serviceId as string) : null;
  const status = typeof (deploy as any).status === "string" ? ((deploy as any).status as string) : null;
  if (!id || !serviceId || !status) return null;

  const dashboard = renderDashboardUrl(serviceType, serviceId);

  return {
    id,
    serviceId,
    status,
    createdAt: typeof (deploy as any).createdAt === "string" ? ((deploy as any).createdAt as string) : null,
    finishedAt: typeof (deploy as any).finishedAt === "string" ? ((deploy as any).finishedAt as string) : null,
    commit: typeof (deploy as any).commit === "string" ? ((deploy as any).commit as string) : null,
    dashboardUrl: dashboard.dashboardUrl,
    logsUrl: dashboard.logsUrl,
  };
}

export class RenderService {
  private client: AxiosInstance;

  constructor(apiKey?: string) {
    const token = apiKey || process.env.RENDER_API_KEY;
    if (!token) {
      throw new Error("Render API key not provided");
    }

    this.client = axios.create({
      baseURL: "https://api.render.com/v1",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  }

  private async request<T>(options: {
    method: "get" | "post" | "delete" | "patch" | "put";
    path: string;
    params?: Record<string, unknown>;
    data?: unknown;
  }): Promise<T> {
    try {
      const response = await this.client.request<T>({
        method: options.method,
        url: options.path,
        params: options.params,
        data: options.data,
      });
      return response.data;
    } catch (error: unknown) {
      throw new Error(`Render API error: ${formatAxiosError(error)}`);
    }
  }

  async listOwners(): Promise<RenderOwner[]> {
    const data = await this.request<unknown>({
      method: "get",
      path: "/owners",
    });

    const items = Array.isArray(data)
      ? data
      : isPlainObject(data) && Array.isArray((data as any).owners)
        ? (data as any).owners
        : [];

    return items.map(mapOwner).filter(Boolean) as RenderOwner[];
  }

  private async resolveOwnerId(): Promise<string | null> {
    const fromEnv = typeof process.env.RENDER_OWNER_ID === "string" ? process.env.RENDER_OWNER_ID.trim() : "";
    if (fromEnv) return fromEnv;

    try {
      const owners = await this.listOwners();
      if (owners.length === 0) return null;
      // Prefer team owners when available, otherwise first owner.
      const team = owners.find((o) => (o.type || "").toLowerCase() === "team");
      return (team || owners[0]).id;
    } catch {
      return null;
    }
  }

  async listServices(limit = 200): Promise<RenderServiceInfo[]> {
    const data = await this.request<unknown>({
      method: "get",
      path: "/services",
      params: { limit },
    });

    const items = Array.isArray(data)
      ? data
      : isPlainObject(data) && Array.isArray((data as any).services)
        ? (data as any).services
        : [];

    return items.map(mapService).filter(Boolean) as RenderServiceInfo[];
  }

  async getService(serviceId: string): Promise<RenderServiceInfo | null> {
    try {
      const data = await this.request<unknown>({
        method: "get",
        path: `/services/${encodeURIComponent(serviceId)}`,
      });
      return mapService(data);
    } catch {
      return null;
    }
  }

  async findServiceByName(name: string): Promise<RenderServiceInfo | null> {
    const normalized = normalizeServiceName(name);
    if (!normalized) return null;
    const services = await this.listServices();
    return services.find((service) => service.name === normalized) || null;
  }

  async createWebService(params: {
    name: string;
    repository: string;
    branch: string;
    buildCommand: string;
    startCommand: string;
    rootDirectory?: string;
    envVars?: Array<{ key: string; value: string }>;
    autoDeploy?: boolean;
  }): Promise<RenderServiceInfo> {
    const ownerId = await this.resolveOwnerId();
    if (!ownerId) {
      throw new Error("Render ownerId not resolved. Set RENDER_OWNER_ID or ensure the API key can list owners.");
    }

    const normalizedName = normalizeServiceName(params.name);
    const repo = repoToHttpsUrl(params.repository);
    const plan = (process.env.RENDER_PLAN || "free").trim() || "free";
    const region = (process.env.RENDER_REGION || "oregon").trim() || "oregon";

    const payload: Record<string, unknown> = {
      type: "web_service",
      name: normalizedName,
      ownerId,
      repo,
      branch: params.branch,
      plan,
      region,
      buildCommand: params.buildCommand,
      startCommand: params.startCommand,
      autoDeploy: params.autoDeploy === false ? "no" : "yes",
      ...(params.rootDirectory ? { rootDir: params.rootDirectory } : {}),
      ...(params.envVars && params.envVars.length > 0 ? { envVars: params.envVars } : {}),
    };

    const data = await this.request<unknown>({
      method: "post",
      path: "/services",
      data: payload,
    });

    const mapped = mapService(data);
    if (!mapped) throw new Error("Unexpected Render create service response");
    return mapped;
  }

  async updateServiceSettings(
    serviceId: string,
    updates: {
      branch?: string;
      buildCommand?: string;
      startCommand?: string;
      rootDirectory?: string;
      autoDeploy?: boolean;
    }
  ): Promise<void> {
    const payload: Record<string, unknown> = {};
    if (updates.branch) payload.branch = updates.branch;
    if (updates.buildCommand) payload.buildCommand = updates.buildCommand;
    if (updates.startCommand) payload.startCommand = updates.startCommand;
    if (typeof updates.autoDeploy === "boolean") payload.autoDeploy = updates.autoDeploy ? "yes" : "no";
    if (typeof updates.rootDirectory === "string" && updates.rootDirectory.trim()) {
      payload.rootDir = updates.rootDirectory.trim();
    }
    if (Object.keys(payload).length === 0) return;

    await this.request({
      method: "patch",
      path: `/services/${encodeURIComponent(serviceId)}`,
      data: payload,
    });
  }

  async upsertEnvVars(serviceId: string, envVars: Array<{ key: string; value: string }>): Promise<void> {
    const desired = new Map<string, string>();
    for (const envVar of envVars) {
      const key = typeof envVar.key === "string" ? envVar.key.trim() : "";
      if (!key) continue;
      desired.set(key, typeof envVar.value === "string" ? envVar.value : "");
    }
    if (desired.size === 0) return;

    const payload = Array.from(desired.entries()).map(([key, value]) => ({ key, value }));

    await this.request({
      method: "put",
      path: `/services/${encodeURIComponent(serviceId)}/env-vars`,
      data: payload,
    });
  }

  async createDeploy(serviceId: string): Promise<RenderDeploy> {
    const data = await this.request<unknown>({
      method: "post",
      path: `/services/${encodeURIComponent(serviceId)}/deploys`,
      data: {},
    });

    const service = await this.getService(serviceId);
    const deploy = mapDeploy(data, service?.type || "web_service");
    if (!deploy) throw new Error("Unexpected Render create deploy response");
    return deploy;
  }

  async getDeploy(deployId: string): Promise<RenderDeploy | null> {
    try {
      const data = await this.request<unknown>({
        method: "get",
        path: `/deploys/${encodeURIComponent(deployId)}`,
      });

      const deploy = mapDeploy(data);
      return deploy;
    } catch {
      return null;
    }
  }

  async getDeploymentLogs(deployId: string, limit = 2000): Promise<string> {
    try {
      // First get the deploy to find the service ID
      const deploy = await this.getDeploy(deployId);
      if (!deploy || !deploy.serviceId) {
        return "";
      }

      // Fetch logs from the service
      const data = await this.request<unknown>({
        method: "get",
        path: `/services/${encodeURIComponent(deploy.serviceId)}/logs`,
        params: {
          limit,
          type: "build,deploy"
        },
      });

      // Extract log text from response
      if (Array.isArray(data)) {
        return data
          .map((entry: any) => {
            const timestamp = entry.timestamp || "";
            const message = entry.message || entry.text || "";
            return timestamp && message ? `[${timestamp}] ${message}` : message;
          })
          .filter(Boolean)
          .join("\n");
      }

      // Handle other response formats
      if (isPlainObject(data)) {
        const logs = (data as any).logs;
        if (Array.isArray(logs)) {
          return logs
            .map((entry: any) => {
              const timestamp = entry.timestamp || "";
              const message = entry.message || entry.text || "";
              return timestamp && message ? `[${timestamp}] ${message}` : message;
            })
            .filter(Boolean)
            .join("\n");
        }

        // If it's a plain text response
        if (typeof (data as any).text === "string") {
          return (data as any).text;
        }
      }

      return "";
    } catch (error) {
      console.error("Failed to fetch Render logs:", error);
      return "";
    }
  }

  async deployFromGitHub(params: {
    serviceName: string;
    repository: string;
    branch?: string;
    rootDirectory?: string;
    environmentVariables?: Array<{ key: string; value: string }>;
    buildCommand?: string;
    startCommand?: string;
    autoDeploy?: boolean;
  }): Promise<RenderDeployResult> {
    const branch = params.branch || "main";
    const normalizedName = normalizeServiceName(params.serviceName);

    let service = await this.findServiceByName(normalizedName);

    const buildCommand = params.buildCommand || "npm ci && npm run build";
    const startCommand = params.startCommand || "npm run start -- -p $PORT";

    if (!service) {
      service = await this.createWebService({
        name: normalizedName,
        repository: params.repository,
        branch,
        buildCommand,
        startCommand,
        rootDirectory: params.rootDirectory,
        envVars: params.environmentVariables,
        autoDeploy: params.autoDeploy,
      });
    } else {
      await this.updateServiceSettings(service.id, {
        branch,
        buildCommand: params.buildCommand,
        startCommand: params.startCommand,
        rootDirectory: params.rootDirectory,
        autoDeploy: params.autoDeploy,
      });
    }

    if (params.environmentVariables && params.environmentVariables.length > 0) {
      await this.upsertEnvVars(service.id, params.environmentVariables);
    }

    const deploy = await this.createDeploy(service.id);

    return {
      serviceId: service.id,
      serviceName: service.name,
      deployId: deploy.id,
      url: service.url,
      status: deploy.status,
      dashboardUrl: service.dashboardUrl,
      logsUrl: deploy.logsUrl || service.logsUrl,
    };
  }

  async validateToken(): Promise<boolean> {
    try {
      await this.listServices(1);
      return true;
    } catch {
      return false;
    }
  }
}

