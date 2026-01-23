import { NextRequest, NextResponse } from "next/server";
import { GitHubService } from "@/services/github";

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ owner: string; repo: string }>;
}

// Helper function to get GitHub token from headers or environment
function getGitHubToken(request: NextRequest): string | null {
  const headerToken = request.headers.get("X-API-Key-GitHub");
  if (headerToken && headerToken.trim()) {
    return headerToken;
  }
  return process.env.GITHUB_TOKEN || null;
}

// GET - Get repository details
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
    const repository = await github.getRepository(owner, repo);
    return NextResponse.json({ repo: repository });
  } catch (error) {
    console.error("Failed to get repo:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get repository" },
      { status: 500 }
    );
  }
}

// PATCH - Update repository
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { owner, repo } = await params;
    const body = await request.json();
    const { name, description, isPrivate } = body;

    const token = getGitHubToken(request);
    if (!token) {
      return NextResponse.json(
        { error: "GitHub token not provided. Please configure it in Settings." },
        { status: 401 }
      );
    }

    const github = new GitHubService(token);
    const repository = await github.updateRepository(owner, repo, {
      name,
      description,
      private: isPrivate,
    });

    return NextResponse.json({ repo: repository });
  } catch (error) {
    console.error("Failed to update repo:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update repository" },
      { status: 500 }
    );
  }
}

// DELETE - Delete repository
export async function DELETE(request: NextRequest, { params }: Params) {
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
    await github.deleteRepository(owner, repo);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete repo:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete repository" },
      { status: 500 }
    );
  }
}
