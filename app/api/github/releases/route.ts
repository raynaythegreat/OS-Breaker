import { NextRequest, NextResponse } from 'next/server';

const GITHUB_REPO_OWNER = 'raynaythegreat';
const GITHUB_REPO_NAME = 'AI-Gatekeep';

async function fetchLatestRelease(): Promise<{
  release: any | null;
  error?: string;
  status: number;
}> {
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (response.status === 404) {
      return { release: null, error: 'No releases found', status: 404 };
    }

    if (!response.ok) {
      const message = await response.text().catch(() => '');
      return {
        release: null,
        error: message || `HTTP ${response.status}`,
        status: response.status,
      };
    }

    const release = await response.json();
    return { release, status: response.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Fetch failed';
    console.error('Failed to fetch latest release:', message);
    return { release: null, error: message, status: 502 };
  }
}

export async function GET(request: NextRequest) {
  const result = await fetchLatestRelease();
  if (!result.release) {
    const status = result.status === 404 ? 200 : 502;
    return NextResponse.json(
      { release: null, error: result.error || 'Failed to fetch release information' },
      { status },
    );
  }
  return NextResponse.json(result.release);
}
