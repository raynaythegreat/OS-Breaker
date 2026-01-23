import { NextRequest, NextResponse } from "next/server";
import { GitHubService } from "@/services/github";

export const dynamic = "force-dynamic";

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

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { owner, repo } = await params;
    const body = (await request.json().catch(() => null)) as
      | { name?: unknown; description?: unknown; isPrivate?: unknown; private?: unknown }
      | null;

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : undefined;
    const isPrivate =
      typeof body?.isPrivate === "boolean"
        ? body.isPrivate
        : typeof body?.private === "boolean"
          ? body.private
          : undefined;

    if (!name) {
      return NextResponse.json({ error: "New repository name is required" }, { status: 400 });
    }

    const token = getGitHubToken(request);
    if (!token) {
      return NextResponse.json(
        { error: "GitHub token not provided. Please configure it in Settings." },
        { status: 401 }
      );
    }

    const github = new GitHubService(token);
    const copied = await github.copyRepositorySnapshot(owner, repo, {
      name,
      description,
      private: isPrivate,
    });

    return NextResponse.json({ repo: copied });
  } catch (error) {
    console.error("Failed to copy repo:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to copy repository" },
      { status: 500 }
    );
  }
}

