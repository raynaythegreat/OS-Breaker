import { NextRequest, NextResponse } from 'next/server';

const GITHUB_REPO_OWNER = 'raynaythegreat';
const GITHUB_REPO_NAME = 'AI-Gatekeep';

async function fetchLatestRelease(): Promise<any> {
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return response.json();
  } catch (error) {
    console.error('Failed to fetch latest release:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const release = await fetchLatestRelease();
  if (!release) {
    return NextResponse.json({ error: 'Failed to fetch release information' }, { status: 500 });
  }
  return NextResponse.json(release);
}