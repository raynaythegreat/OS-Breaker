import { NextRequest, NextResponse } from "next/server";
import { GitHubService } from "@/services/github";

interface Params {
  params: Promise<{ owner: string; repo: string }>;
}

// GET - Get relevant files for context
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { owner, repo } = await params;
    const github = new GitHubService();
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

    const github = new GitHubService();
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
