import { NextRequest, NextResponse } from "next/server";
import { GitHubService } from "@/services/github";

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ owner: string; repo: string }>;
}

// Helper function to get GitHub token from headers or environment
function getGitHubToken(request: NextRequest): string | null {
  // Try custom header first (from client-side SecureStorage)
  const headerToken = request.headers.get("X-API-Key-GitHub");
  if (headerToken && headerToken.trim()) {
    return headerToken;
  }

  // Fall back to environment variable (for CLI/production builds)
  return process.env.GITHUB_TOKEN || null;
}

// GET - Get repository structure
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { owner, repo } = await params;
    const { searchParams } = new URL(request.url);
    const depth = parseInt(searchParams.get("depth") || "3", 10);
    const format = searchParams.get("format") || "tree";

    const token = getGitHubToken(request);
    if (!token) {
      return NextResponse.json(
        { error: "GitHub token not provided. Please configure it in Settings." },
        { status: 401 }
      );
    }

    const github = new GitHubService(token);

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
