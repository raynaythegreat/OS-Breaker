import { NextRequest, NextResponse } from "next/server";
import { VercelService } from "@/services/vercel";

export const dynamic = 'force-dynamic';

// Helper function to get Vercel token from headers or environment
function getVercelToken(request: NextRequest): string | null {
  // Try custom header first (from client-side SecureStorage)
  const headerToken = request.headers.get("X-API-Key-Vercel");
  if (headerToken && headerToken.trim()) {
    return headerToken;
  }

  // Fall back to environment variable (for CLI/production builds)
  return process.env.VERCEL_TOKEN || null;
}

// POST - Auto-deploy if project exists on Vercel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repository, branch } = body;

    if (!repository) {
      return NextResponse.json(
        { error: "Repository is required" },
        { status: 400 }
      );
    }

    const vercelToken = getVercelToken(request);
    if (!vercelToken) {
      return NextResponse.json(
        { error: "Vercel token not provided. Please configure it in Settings." },
        { status: 401 }
      );
    }

    const projectName = repository.split("/")[1];
    const vercel = new VercelService(vercelToken);

    // Check if project exists
    const existingProject = await vercel.getProject(projectName);

    // Project exists, trigger new deployment
    console.log(
      existingProject
        ? `Auto-deploying existing project: ${existingProject.name}`
        : `Auto-deploying new project: ${projectName}`
    );

    const result = await vercel.deployFromGitHub({
      projectName: existingProject?.name || projectName,
      repository,
      branch: branch || "main",
    });

    return NextResponse.json({
      deployed: true,
      autoDeployed: true,
      existed: Boolean(existingProject),
      ...result,
    });
  } catch (error) {
    console.error("Auto-deploy failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Auto-deploy failed",
        deployed: false,
      },
      { status: 500 }
    );
  }
}
