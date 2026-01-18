import { NextRequest, NextResponse } from "next/server";
import { VercelService } from "@/services/vercel";

// GET - List Vercel projects
export async function GET() {
  try {
    const vercel = new VercelService();
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

    const vercel = new VercelService();
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
