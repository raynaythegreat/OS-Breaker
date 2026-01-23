import { NextRequest, NextResponse } from "next/server";
import { RenderService } from "@/services/render";

export const dynamic = "force-dynamic";

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

    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw && /^\d+$/.test(limitRaw) ? Math.min(5000, Math.max(1, Number(limitRaw))) : 2000;

    const render = new RenderService(renderApiKey);
    const text = await render.getDeploymentLogs(id, limit);

    return NextResponse.json({
      text,
      logsCount: text.split("\n").filter(line => line.trim()).length
    });
  } catch (error) {
    console.error("Failed to get Render deployment logs:", error);
    return NextResponse.json(
      { text: "", logsCount: 0, error: error instanceof Error ? error.message : "Failed to get deployment logs" },
      { status: 200 }
    );
  }
}
