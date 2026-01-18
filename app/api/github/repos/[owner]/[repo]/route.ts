import { NextRequest, NextResponse } from "next/server";
import { GitHubService } from "@/services/github";

interface Params {
  params: Promise<{ owner: string; repo: string }>;
}

// GET - Get repository details
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { owner, repo } = await params;
    const github = new GitHubService();
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

    const github = new GitHubService();
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
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { owner, repo } = await params;
    const github = new GitHubService();
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
