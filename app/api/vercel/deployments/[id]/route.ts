import { NextRequest, NextResponse } from "next/server";
import { VercelService } from "@/services/vercel";

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

// Helper function to get Vercel token from headers or environment
function getVercelToken(request: NextRequest): string | null {
  // Try custom header first (from client-side SecureStorage)
  const headerToken = request.headers.get("X-API-Key-Vercel");
  if (headerToken && headerToken.trim()) {
    return headerToken;
  }

  // Fall back to environment variable (for CLI/production builds)
  return process.env.VERCEL_TOKEN || null;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Deployment ID is required" }, { status: 400 });
    }

    const vercelToken = getVercelToken(request);
    if (!vercelToken) {
      return NextResponse.json(
        { error: "Vercel token not provided. Please configure it in Settings." },
        { status: 401 }
      );
    }

    const vercel = new VercelService(vercelToken);
    const deployment = await vercel.getDeployment(id);

    if (!deployment) {
      return NextResponse.json({ error: "Deployment not found" }, { status: 404 });
    }

    return NextResponse.json({ deployment });
  } catch (error) {
    console.error("Failed to get deployment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get deployment" },
      { status: 500 }
    );
  }
}

