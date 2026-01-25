import { NextRequest, NextResponse } from "next/server";
import { buildChatApiHeaders } from "@/lib/chatHeaders";
import { VercelService } from "@/services/vercel";
import { GitHubService } from "@/services/github";
import { NgrokService } from "@/services/ngrok";
import { getServerApiKey } from "@/lib/serverKeys";

export const dynamic = 'force-dynamic';

function isLocalhostRequest(request: NextRequest): boolean {
  const host = request.headers.get("host") || "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("0.0.0.0");
}

export async function POST(request: NextRequest) {
  if (!isLocalhostRequest(request)) {
    return NextResponse.json(
      { error: "Mobile deployment only allowed from localhost" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { repository, password, branch = 'main' } = body;

    if (!repository || typeof repository !== 'string' || !repository.trim()) {
      return NextResponse.json(
        { error: "Repository is required (format: owner/repo)" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 4) {
      return NextResponse.json(
        { error: "Password is required (minimum 4 characters)" },
        { status: 400 }
      );
    }

    const ownerRepo = repository.trim();
    if (!/^[^/]+\/[^/]+$/.test(ownerRepo)) {
      return NextResponse.json(
        { error: "Invalid repository format. Expected: owner/repo (e.g., yourusername/os-athena-mobile)" },
        { status: 400 }
      );
    }

    const [owner, repo] = ownerRepo.split('/');

    const headers = await buildChatApiHeaders();

    const ngrokKey = getServerApiKey('ngrok', headers);
    const vercelKey = getServerApiKey('vercel', headers);
    const githubToken = getServerApiKey('github', headers);

    if (!ngrokKey || !vercelKey || !githubToken) {
      return NextResponse.json(
        { error: "Missing required API keys (ngrok, vercel, github)" },
        { status: 400 }
      );
    }

    const deploymentKey = `mobile:${Date.now()}`;
    let createdTunnelId: string | null = null;

    try {
      const ngrok = new NgrokService(ngrokKey);

      const tunnel = await ngrok.createTunnel({
        port: 3456,
        proto: 'http'
      });

      createdTunnelId = tunnel.id;

      const github = new GitHubService(githubToken);
      const repoData = await github.getRepository(owner, repo);

      if (!repoData) {
        await ngrok.deleteTunnel(tunnel.id);
        return NextResponse.json(
          { error: "Repository not found. Check the owner/repo format." },
          { status: 404 }
        );
      }

      const vercel = new VercelService(vercelKey);

      const deployment = await vercel.deployFromGitHub({
        projectName: 'os-athena-mobile',
        repository: ownerRepo,
        branch,
        environmentVariables: [
          {
            key: 'OS_PUBLIC_URL',
            value: tunnel.public_url,
            target: ['production', 'preview']
          },
          {
            key: 'MOBILE_PASSWORD',
            value: password,
            target: ['production', 'preview']
          },
          {
            key: 'OS_REMOTE_MODE',
            value: 'true',
            target: ['production', 'preview']
          },
          {
            key: 'NGROK_TUNNEL_ID',
            value: tunnel.id,
            target: ['production', 'preview']
          }
        ]
      });

      // Note: Password storage is handled by client
      // Server cannot save to SecureStorage (browser-only)

      return NextResponse.json({
        success: true,
        tunnel: {
          id: tunnel.id,
          public_url: tunnel.public_url
        },
        deployment: {
          url: deployment.url,
          deploymentId: deployment.deploymentId
        },
        mobileUrl: deployment.url
      }, {
        headers: {
          'x-mobile-deployment-id': tunnel.id,
          'x-mobile-public-url': tunnel.public_url,
          'x-mobile-url': deployment.url,
          'x-mobile-active': 'true'
        }
      });
    } catch (error) {
      console.error('Mobile deployment error:', error);

      if (createdTunnelId) {
        try {
          const ngrok = new NgrokService(ngrokKey);
          await ngrok.deleteTunnel(createdTunnelId);
          console.log(`Cleaned up tunnel ${createdTunnelId} after deployment failure`);
        } catch (tunnelError) {
          console.error('Failed to cleanup tunnel after deployment error:', tunnelError);
        }
      }

      let errorMessage = 'Deployment failed';
      if (error instanceof Error) {
        errorMessage = error.message;

        if (errorMessage.includes('401') || errorMessage.includes('403')) {
          errorMessage = 'Authentication failed. Check your Vercel, GitHub, and ngrok API keys.';
        } else if (errorMessage.includes('404')) {
          errorMessage = 'Repository not found or Vercel project not accessible.';
        } else if (errorMessage.includes('repoId') || errorMessage.includes('repo')) {
          errorMessage = 'Could not resolve GitHub repository. Ensure it exists and is connected to Vercel.';
        }
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
    } catch (error) {
      console.error('Request processing error:', error);
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'Request processing failed'
        },
        { status: 500 }
      );
    }
}
