import { NextRequest, NextResponse } from "next/server";
import { GitHubService } from "@/services/github";

interface Params {
  params: Promise<{ owner: string; repo: string }>;
}

// GET - Get repository structure
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { owner, repo } = await params;
    const { searchParams } = new URL(request.url);
    const depth = parseInt(searchParams.get("depth") || "3", 10);
    const format = searchParams.get("format") || "tree";

    const github = new GitHubService();

    if (format === "text") {
      const structureText = await github.getRepoStructureAsText(owner, repo, depth);
      return NextResponse.json({ structure: structureText });
    }

    const structure = await github.getRepoStructure(owner, repo, "", depth);
    return NextResponse.json({ structure });
  } catch (error) {
    console.error("Failed to get repo structure:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get repository structure" },
      { status: 500 }
    );
  }
}
