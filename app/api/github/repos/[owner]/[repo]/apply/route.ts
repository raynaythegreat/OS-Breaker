import { NextRequest, NextResponse } from "next/server";
import { GitHubService } from "@/services/github";
import { badRequest, internalError, ok } from "@/lib/apiResponse";

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ owner: string; repo: string }>;
}

type ApplyBody = {
  message?: unknown;
  branch?: unknown;
  files?: unknown;
};

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

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { owner, repo } = await params;
    const body = (await request.json().catch(() => null)) as ApplyBody | null;

    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const branch = typeof body?.branch === "string" ? body.branch.trim() : undefined;
    const filesRaw = body?.files;

    if (!message) {
      return badRequest("Commit message is required");
    }

    if (!Array.isArray(filesRaw) || filesRaw.length === 0) {
      return badRequest("At least one file is required");
    }

    const normalizedFiles = filesRaw.map((file: { path?: unknown; content?: unknown }) => ({
      path: typeof file.path === "string" ? file.path : "",
      content: typeof file.content === "string" ? file.content : ""
    }));

    if (normalizedFiles.some((f) => !f.path)) {
      return badRequest("Each file must include a valid path");
    }

    const token = getGitHubToken(request);
    if (!token) {
      return NextResponse.json(
        { error: "GitHub token not provided. Please configure it in Settings." },
        { status: 401 }
      );
    }

    const github = new GitHubService(token);
    const result = await github.commitFiles(owner, repo, {
      message,
      branch,
      files: normalizedFiles
    });

    return ok({ success: true, ...result });
  } catch (error) {
    console.error("Failed to apply changes:", error instanceof Error ? error.message : error);
    return internalError(error instanceof Error ? error.message : "Failed to apply changes");
  }
}