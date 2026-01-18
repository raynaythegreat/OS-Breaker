import { NextRequest, NextResponse } from "next/server";
import { RenderService } from "@/services/render";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Deployment ID is required" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw && /^\d+$/.test(limitRaw) ? Math.min(5000, Math.max(1, Number(limitRaw))) : 2000;

    const render = new RenderService();
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
