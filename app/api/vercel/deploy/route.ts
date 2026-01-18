import { NextRequest, NextResponse } from "next/server";
import { VercelService } from "@/services/vercel";
import { GitHubService } from "@/services/github";

interface EnvironmentVariable {
  key: string;
  value: string;
  target?: string[];
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

    // Try to read package.json
    const packageJson = await github.getFileContent(owner, repo, packageJsonPath);
    const pkg = JSON.parse(packageJson);

    // Check dependencies to detect framework
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (deps.next) return "nextjs";
    if (deps.react && deps["react-scripts"]) return "create-react-app";
    if (deps.react && deps.vite) return "vite";
    if (deps.vue && deps["@vue/cli-service"]) return "vue";
    if (deps.nuxt) return "nuxtjs";
    if (deps.gatsby) return "gatsby";
    if (deps.svelte) return "svelte";
    if (deps["@sveltejs/kit"]) return "sveltekit";
    if (deps["@angular/core"]) return "angular";
    if (deps.astro) return "astro";
    if (deps.remix) return "remix";

    return undefined;
  } catch (error) {
    console.error("Failed to detect framework:", error);
    return undefined;
  }
}

// Retry deployment with different strategies
async function retryDeploymentWithStrategies(
  vercel: VercelService,
  baseParams: {
    projectName: string;
    repository: string;
    branch: string;
    environmentVariables?: EnvironmentVariable[];
    framework?: string;
    buildCommand?: string;
    installCommand?: string;
    outputDirectory?: string;
    rootDirectory?: string;
  }
): Promise<any> {
  const strategies = [
    // Strategy 1: Try with detected/specified framework
    { ...baseParams },

    // Strategy 2: Try without framework specification (let Vercel auto-detect)
    { ...baseParams, framework: undefined },

    // Strategy 3: Try with simplified settings (no custom build commands)
    {
      ...baseParams,
      framework: undefined,
      buildCommand: undefined,
      installCommand: undefined,
      outputDirectory: undefined,
    },

    // Strategy 4: Minimal deployment (drop optional settings)
    {
      ...baseParams,
      framework: undefined,
      buildCommand: undefined,
      installCommand: undefined,
      outputDirectory: undefined,
      rootDirectory: undefined,
      environmentVariables: baseParams.environmentVariables?.slice(0, 10), // Limit env vars
    },
  ];

  let lastError: Error | null = null;

  for (let i = 0; i < strategies.length; i++) {
    try {
      console.log(`Attempting deployment strategy ${i + 1}/${strategies.length}`);
      const result = await vercel.deployFromGitHub(strategies[i]);
      console.log(`Strategy ${i + 1} succeeded!`);
      return { ...result, strategy: i + 1, retriesUsed: i };
    } catch (error) {
      console.error(`Strategy ${i + 1} failed:`, error);
      lastError = error as Error;

      // Wait a bit before retrying (exponential backoff)
      if (i < strategies.length - 1) {
        const waitTime = Math.min(1000 * Math.pow(2, i), 5000);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // All strategies failed
  throw new Error(
    `Deployment failed after ${strategies.length} attempts. Last error: ${lastError?.message || "Unknown error"}`
  );
}

// POST - Deploy to Vercel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      repository,
      projectName,
      branch,
      environmentVariables,
      framework,
      buildCommand,
      installCommand,
      outputDirectory,
      rootDirectory,
      autoDetectFramework = true,
      enableRetry = true,
    } = body;

    if (!repository) {
      return NextResponse.json(
        { error: "Repository is required" },
        { status: 400 }
      );
    }

    // Auto-detect framework if not provided and autoDetectFramework is true
    let detectedFramework = framework;
    if (!detectedFramework && autoDetectFramework) {
      detectedFramework = await detectFramework(repository, rootDirectory);
    }

    const vercel = new VercelService();
    const deployParams = {
      projectName: projectName || repository.split("/")[1],
      repository,
      branch: branch || "main",
      environmentVariables: environmentVariables as EnvironmentVariable[] | undefined,
      framework: detectedFramework,
      buildCommand,
      installCommand,
      outputDirectory,
      rootDirectory,
    };

    let result;

    if (enableRetry) {
      // Use retry mechanism
      result = await retryDeploymentWithStrategies(vercel, {
        projectName: deployParams.projectName,
        repository: deployParams.repository,
        branch: deployParams.branch,
        environmentVariables: deployParams.environmentVariables,
        framework: deployParams.framework,
        buildCommand: deployParams.buildCommand,
        installCommand: deployParams.installCommand,
        outputDirectory: deployParams.outputDirectory,
        rootDirectory: deployParams.rootDirectory,
      });
    } else {
      // Single attempt
      result = await vercel.deployFromGitHub(deployParams);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to deploy:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to deploy" },
      { status: 500 }
    );
  }
}
