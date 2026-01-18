import { NextRequest, NextResponse } from "next/server";
import { GitHubService } from "@/services/github";

interface Params {
  params: Promise<{ owner: string; repo: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { owner, repo } = await params;
    const body = await request.json();
    const { message, branch, files } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Commit message is required" }, { status: 400 });
    }
    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "At least one file is required" }, { status: 400 });
    }

    const normalizedFiles = files.map((file: { path?: unknown; content?: unknown }) => ({
      path: typeof file.path === "string" ? file.path : "",
      content: typeof file.content === "string" ? file.content : "",
    }));

    const github = new GitHubService();
    const result = await github.commitFiles(owner, repo, {
      message,
      branch: typeof branch === "string" ? branch : undefined,
      files: normalizedFiles,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Failed to apply changes:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to apply changes" },
      { status: 500 }
    );
  }
}

