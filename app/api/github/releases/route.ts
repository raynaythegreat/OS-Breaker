import { NextResponse } from "next/server";
import { ok, internalError, badRequest } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

type ReleaseResponse = {
  tagName: string;
  name: string;
  url: string;
  publishedAt: string;
  prerelease: boolean;
};

function getRepoFromEnv() {
  // Default to this repository; allow override for forks/self-hosting.
  const owner = process.env.NEXT_PUBLIC_UPDATES_OWNER || "raynaythegreat";
  const repo = process.env.NEXT_PUBLIC_UPDATES_REPO || "AI-Gatekeep";
  return { owner, repo };
}

async function fetchLatestRelease(owner: string, repo: string): Promise<ReleaseResponse> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
    headers: {
      Accept: "application/vnd.github+json",
      // Optional: allow higher rate limits in hosted environments.
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `GitHub releases HTTP ${res.status}`);
  }

  const json = (await res.json()) as any;

  return {
    tagName: String(json.tag_name || ""),
    name: String(json.name || ""),
    url: String(json.html_url || ""),
    publishedAt: String(json.published_at || ""),
    prerelease: Boolean(json.prerelease),
  };
}

export async function GET(request: Request) {
  try {
    const { owner, repo } = getRepoFromEnv();

    if (!owner || !repo) {
      return badRequest("Updates repo not configured");
    }

    const latest = await fetchLatestRelease(owner, repo);
    return ok({ latest, owner, repo });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return internalError("Failed to fetch latest release", { message });
  }
}