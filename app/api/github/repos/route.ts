import { NextRequest, NextResponse } from "next/server";
import { GitHubService } from "@/services/github";

// GET - List repositories
export async function GET() {
  try {
    const github = new GitHubService();
    const repos = await github.listRepositories();
    return NextResponse.json({ repos });
  } catch (error) {
    console.error("Failed to list repos:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list repositories" },
      { status: 500 }
    );
  }
}

// POST - Create repository
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      isPrivate,
      private: legacyPrivate,
      autoInit,
      gitignoreTemplate,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Repository name is required" }, { status: 400 });
    }

    const github = new GitHubService();
    const repo = await github.createRepository({
      name,
      description,
      private: isPrivate ?? legacyPrivate,
      auto_init: autoInit ?? true,
      gitignore_template: gitignoreTemplate,
    });

    return NextResponse.json({ repo });
  } catch (error) {
    console.error("Failed to create repo:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create repository" },
      { status: 500 }
    );
  }
}
