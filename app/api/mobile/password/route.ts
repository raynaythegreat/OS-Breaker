import { NextRequest, NextResponse } from "next/server";
import { VercelService } from "@/services/vercel";
import { getServerApiKeyFromRequest } from "@/lib/serverKeys";

export const dynamic = 'force-dynamic';

function isLocalhostRequest(request: NextRequest): boolean {
  const host = request.headers.get("host") || "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("0.0.0.0");
}

export async function POST(request: NextRequest) {
  if (!isLocalhostRequest(request)) {
    return NextResponse.json(
      { error: "Password change only allowed from localhost" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const { newPassword, projectName } = body;

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 4) {
    return NextResponse.json(
      { error: "New password is required (minimum 4 characters)" },
      { status: 400 }
    );
  }

  try {
    // Client must provide projectName if they want to sync to Vercel
    if (projectName) {
      const vercelKey = getServerApiKeyFromRequest(request, 'vercel');

      if (vercelKey) {
        const vercel = new VercelService(vercelKey);

        await vercel.updateProjectEnvironmentVariables(
          projectName,
          [{
            key: 'MOBILE_PASSWORD',
            value: newPassword,
            target: ['production', 'preview']
          }]
        );

        console.log('Mobile password synced to Vercel:', projectName);
      } else {
        console.warn('Cannot sync to Vercel - no Vercel API key');
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated on server. Client should update local storage.'
    });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update password'
      },
      { status: 500 }
    );
  }
}
