export interface VercelProject {
  id: string;
  name: string;
  framework: string | null;
  createdAt: number;
  updatedAt: number;
  latestDeployments?: VercelDeployment[];
}

export interface VercelDeployment {
  id: string;
  url: string;
  name: string;
  state: "QUEUED" | "BUILDING" | "READY" | "ERROR" | "CANCELED";
  createdAt: number;
  target: "production" | "preview" | null;
  inspectorUrl?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export interface VercelDeployResult {
  projectId: string;
  projectName: string;
  deploymentId: string;
  url: string;
  status: string;
  inspectorUrl?: string;
}

export interface VercelDomain {
  name: string;
  apexName: string;
  projectId: string;
  verified: boolean;
}
