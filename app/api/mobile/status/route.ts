import { NextRequest, NextResponse } from "next/server";
import { NgrokService } from "@/services/ngrok";
import { getServerApiKeyFromRequest } from "@/lib/serverKeys";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Read tunnel info from headers (sent by client)
  const deploymentId = request.headers.get('x-mobile-deployment-id');
  const publicUrl = request.headers.get('x-mobile-public-url');
  const mobileUrl = request.headers.get('x-mobile-url');
  const clientExpectsActive = request.headers.get('x-mobile-active') === 'true';

  // If no deployment ID, return inactive
  if (!deploymentId) {
    return NextResponse.json({
      active: false,
      url: null,
      id: null,
      verified: false,
      message: "No deployment ID provided"
    });
  }

  // Verify tunnel actually exists in ngrok
  try {
    const ngrokKey = getServerApiKeyFromRequest(request, 'ngrok');

    if (!ngrokKey) {
      // No ngrok key - can't verify, trust client
      return NextResponse.json({
        active: clientExpectsActive,
        url: publicUrl,
        id: deploymentId,
        mobileUrl: mobileUrl,
        verified: false,
        message: "Cannot verify - ngrok API key not configured"
      });
    }

    const ngrok = new NgrokService(ngrokKey);
    const tunnels = await ngrok.listTunnels();
    const tunnel = tunnels.find(t => t.id === deploymentId);

    if (tunnel) {
      // Tunnel exists and is active
      return NextResponse.json({
        active: true,
        url: tunnel.public_url,
        id: tunnel.id,
        mobileUrl: mobileUrl,
        verified: true,
        message: "Tunnel verified active"
      });
    } else {
      // Tunnel doesn't exist in ngrok
      return NextResponse.json({
        active: false,
        url: null,
        id: deploymentId,
        mobileUrl: null,
        verified: true,
        message: "Tunnel not found in ngrok - may have been deleted or expired"
      });
    }
  } catch (error) {
    console.error('Failed to verify tunnel status:', error);

    // Verification failed - trust client's claim
    return NextResponse.json({
      active: clientExpectsActive,
      url: publicUrl,
      id: deploymentId,
      mobileUrl: mobileUrl,
      verified: false,
      message: error instanceof Error ? error.message : "Verification failed"
    });
  }
}
