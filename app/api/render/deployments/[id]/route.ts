import { NextRequest, NextResponse } from "next/server";
import { RenderService } from "@/services/render";

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

// Helper function to get Render API key from headers or environment
function getRenderApiKey(request: NextRequest): string | null {
  // Try custom header first (from client-side SecureStorage)
  const headerToken = request.headers.get("X-API-Key-Render");
  if (headerToken && headerToken.trim()) {
    return headerToken;
  }

  // Fall back to environment variable (for CLI/production builds)
  return process.env.RENDER_API_KEY || null;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Deployment ID is required" }, { status: 400 });
    }

    const renderApiKey = getRenderApiKey(request);
    if (!renderApiKey) {
      return NextResponse.json(
        { error: "Render API key not provided. Please configure it in Settings." },
        { status: 401 }
      );
    }

    const render = new RenderService(renderApiKey);
    const deployment = await render.getDeploy(id);

    if (!deployment) {
      return NextResponse.json({ error: "Deployment not found" }, { status: 404 });
    }

    return NextResponse.json({ deployment });
  } catch (error) {
    console.error("Failed to get Render deployment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get deployment" },
      { status: 500 }
    );
  }
}

