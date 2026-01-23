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

// GET - List Vercel projects
export async function GET(request: NextRequest) {
  try {
    const vercelToken = getVercelToken(request);
    if (!vercelToken) {
      return NextResponse.json(
        { error: "Vercel token not provided. Please configure it in Settings." },
        { status: 401 }
      );
    }

    const vercel = new VercelService(vercelToken);
    const projects = await vercel.listProjects();
    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Failed to list projects:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list projects" },
      { status: 500 }
    );
  }
}

// DELETE - Delete Vercel project
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectName = searchParams.get("name");

    if (!projectName) {
      return NextResponse.json(
        { error: "Project name is required" },
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

    const vercel = new VercelService(vercelToken);
    await vercel.deleteProject(projectName);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete project:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete project" },
      { status: 500 }
    );
  }
}
