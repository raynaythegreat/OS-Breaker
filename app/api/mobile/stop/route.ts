import { NextRequest, NextResponse } from "next/server";
import { NgrokService } from "@/services/ngrok";
import { getServerApiKeyFromRequest } from "@/lib/serverKeys";

export const dynamic = 'force-dynamic';

function isLocalhostRequest(request: NextRequest): boolean {
  const host = request.headers.get("host") || "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("0.0.0.0");
}

export async function POST(request: NextRequest) {
  if (!isLocalhostRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized - stop deployment only allowed from localhost" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { tunnelId } = body;

    if (!tunnelId) {
      return NextResponse.json({
        success: true,
        message: 'No tunnel ID provided - client should clear localStorage'
      });
    }

    // Actually delete the tunnel from ngrok
    const ngrokKey = getServerApiKeyFromRequest(request, 'ngrok');

    if (ngrokKey) {
      try {
        const ngrok = new NgrokService(ngrokKey);
        await ngrok.deleteTunnel(tunnelId);
        console.log(`Successfully deleted tunnel ${tunnelId} from ngrok`);
      } catch (error) {
        console.error(`Failed to delete tunnel ${tunnelId}:`, error);
        // Continue anyway - tunnel might already be deleted
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Mobile deployment stopped and tunnel deleted'
    });
  } catch (error) {
    console.error('Stop deployment error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to stop deployment'
      },
      { status: 500 }
    );
  }
}
