export interface RenderOwner {
  id: string;
  name: string | null;
  type: string | null;
}

export interface RenderServiceInfo {
  id: string;
  name: string;
  type: string;
  repo: string | null;
  branch: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  url: string | null;
  dashboardUrl: string | null;
  logsUrl: string | null;
}

export interface RenderDeploy {
  id: string;
  serviceId: string;
  status: string;
  createdAt: string | null;
  finishedAt: string | null;
  commit: string | null;
  dashboardUrl: string | null;
  logsUrl: string | null;
}

export interface RenderDeployResult {
  serviceId: string;
  serviceName: string;
  deployId: string;
  url: string | null;
  status: string;
  dashboardUrl: string | null;
  logsUrl: string | null;
}

