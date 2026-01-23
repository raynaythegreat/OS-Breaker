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

// GET - Get relevant files for context
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { owner, repo } = await params;
    const token = getGitHubToken(request);
    if (!token) {
      return NextResponse.json(
        { error: "GitHub token not provided. Please configure it in Settings." },
        { status: 401 }
      );
    }

    const github = new GitHubService(token);
    const files = await github.getRelevantFiles(owner, repo);
    return NextResponse.json({ files });
  } catch (error) {
    console.error("Failed to get files:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get files" },
      { status: 500 }
    );
  }
}

// POST - Create or update file
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { owner, repo } = await params;
    const body = await request.json();
    const { path, content, message, branch } = body;

    if (!path || content === undefined || !message) {
      return NextResponse.json(
        { error: "Path, content, and message are required" },
        { status: 400 }
      );
    }

    const token = getGitHubToken(request);
    if (!token) {
      return NextResponse.json(
        { error: "GitHub token not provided. Please configure it in Settings." },
        { status: 401 }
      );
    }

    const github = new GitHubService(token);
    await github.createOrUpdateFile(owner, repo, {
      path,
      content,
      message,
      branch,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update file:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update file" },
      { status: 500 }
    );
  }
}
