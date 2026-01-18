import { NextRequest, NextResponse } from "next/server";
import { GitHubService } from "@/services/github";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ owner: string; repo: string }>;
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

    const github = new GitHubService();
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

