import { NextRequest, NextResponse } from "next/server";
import { VercelService } from "@/services/vercel";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Deployment ID is required" }, { status: 400 });
    }

    const vercel = new VercelService();
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

