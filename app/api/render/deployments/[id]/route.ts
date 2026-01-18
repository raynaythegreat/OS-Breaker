import { NextRequest, NextResponse } from "next/server";
import { RenderService } from "@/services/render";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Deployment ID is required" }, { status: 400 });
    }

    const render = new RenderService();
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

