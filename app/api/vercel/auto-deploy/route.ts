import { NextRequest, NextResponse } from "next/server";
import { VercelService } from "@/services/vercel";

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

    const projectName = repository.split("/")[1];
    const vercel = new VercelService();

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
